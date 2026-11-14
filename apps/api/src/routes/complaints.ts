import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { complaintCreateSchema, ComplaintStatus } from '@nagrik-setu/shared';
import {
  createComplaint,
  Complaint,
  Upvote,
  Appeal,
  ReviewTask,
  transition,
  toPublicDTO,
  toOwnerDTO,
  type IComplaint,
} from '@nagrik-setu/domain';
import { parseCookies, requireAuth, optionalAuth } from '../middleware/auth';

export const complaintRouter = Router();

const auth = [parseCookies, requireAuth] as const;
const optAuth = [parseCookies, optionalAuth] as const;

complaintRouter.post('/complaints', ...auth, async (req: Request, res: Response) => {
  const input = complaintCreateSchema.parse(req.body);
  const complaint = await createComplaint({
    input,
    reporterId: req.user!.sub,
  });
  res.status(201).json({ complaint: toOwnerDTO(complaint) });
});

complaintRouter.get('/complaints/mine', ...auth, async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [complaints, total] = await Promise.all([
    Complaint.find({ reporterId: req.user!.sub })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments({ reporterId: req.user!.sub }),
  ]);

  res.json({
    complaints: complaints.map((c) => toOwnerDTO(c)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

complaintRouter.get('/complaints/:publicId', ...optAuth, async (req: Request, res: Response) => {
  const complaint = await Complaint.findOne({ publicId: req.params.publicId });
  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    return;
  }

  const isOwner = req.user ? complaint.reporterId.toString() === req.user.sub : false;
  if (isOwner) {
    res.json({ complaint: toOwnerDTO(complaint) });
    return;
  }
  res.json({ complaint: toPublicDTO(complaint) });
});

complaintRouter.get('/complaints/nearby', ...optAuth, async (req: Request, res: Response) => {
  const lng = Number(req.query.lng);
  const lat = Number(req.query.lat);
  const radiusM = Math.min(5000, Math.max(100, Number(req.query.radius) || 1000));

  if (isNaN(lng) || isNaN(lat)) {
    res.status(422).json({ error: { code: 'VALIDATION', message: 'lng and lat are required' } });
    return;
  }

  const complaints = await Complaint.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusM,
      },
    },
    anonymous: { $ne: true },
  })
    .limit(50)
    .select('-media.embedding');

  res.json({
    complaints: complaints.map((c) => toPublicDTO(c)),
  });
});

// ---------------------------------------------------------------------------
// Upvotes
// ---------------------------------------------------------------------------

complaintRouter.post('/complaints/:publicId/upvote', ...auth, async (req: Request, res: Response) => {
  const complaint = await Complaint.findOne({ publicId: req.params.publicId });
  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    return;
  }
  if (complaint.reporterId.toString() === req.user!.sub) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'You cannot upvote your own complaint' } });
    return;
  }

  const existing = await Upvote.findOne({ complaintId: complaint._id, userId: req.user!.sub });
  if (existing) {
    await Upvote.deleteOne({ _id: existing._id });
    complaint.upvotes = Math.max(0, (complaint.upvotes || 1) - 1);
    await complaint.save();
    res.json({ upvoted: false, upvotes: complaint.upvotes });
    return;
  }

  await Upvote.create({ complaintId: complaint._id, userId: req.user!.sub });
  complaint.upvotes = (complaint.upvotes || 0) + 1;
  await complaint.save();
  res.json({ upvoted: true, upvotes: complaint.upvotes });
});

// ---------------------------------------------------------------------------
// Reopen
// ---------------------------------------------------------------------------

const reopenSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

complaintRouter.post('/complaints/:publicId/reopen', ...auth, async (req: Request, res: Response) => {
  const { reason } = reopenSchema.parse(req.body);
  const complaint = await Complaint.findOne({ publicId: req.params.publicId });
  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    return;
  }
  if (complaint.reporterId.toString() !== req.user!.sub) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the reporter can reopen this grievance' } });
    return;
  }
  if (complaint.status !== ComplaintStatus.RESOLVED) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Only resolved grievances can be reopened' } });
    return;
  }

  // 7-day limit
  const resolvedEntry = [...complaint.statusHistory].reverse().find((h) => h.to === ComplaintStatus.RESOLVED);
  const resolvedAt = resolvedEntry ? new Date(resolvedEntry.at).getTime() : complaint.updatedAt.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - resolvedAt > sevenDaysMs) {
    res.status(400).json({ error: { code: 'EXPIRED', message: 'Grievance can only be reopened within 7 days of resolution' } });
    return;
  }

  await transition(complaint, ComplaintStatus.REOPENED, req.user!.sub, reason);
  res.json({ complaint: toOwnerDTO(complaint) });
});

// ---------------------------------------------------------------------------
// Citizen Satisfaction Feedback
// ---------------------------------------------------------------------------

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

complaintRouter.post('/complaints/:publicId/feedback', ...auth, async (req: Request, res: Response) => {
  const { rating, comment } = feedbackSchema.parse(req.body);
  const complaint = await Complaint.findOne({ publicId: req.params.publicId });
  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    return;
  }
  if (complaint.reporterId.toString() !== req.user!.sub) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the reporter can submit feedback' } });
    return;
  }
  if (complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.CLOSED) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Feedback can only be submitted on resolved complaints' } });
    return;
  }

  complaint.statusHistory.push({
    from: complaint.status,
    to: complaint.status,
    by: req.user!.sub,
    at: new Date(),
    note: `Citizen Feedback: Rating ${rating}/5${comment ? ` - "${comment}"` : ''}`,
  } as unknown as IComplaint['statusHistory'][0]);

  await complaint.save();
  res.json({ success: true, rating, comment });
});

// ---------------------------------------------------------------------------
// Citizen Appeal
// ---------------------------------------------------------------------------

const appealSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

complaintRouter.post('/complaints/:publicId/appeal', ...auth, async (req: Request, res: Response) => {
  const { reason } = appealSchema.parse(req.body);
  const complaint = await Complaint.findOne({ publicId: req.params.publicId });
  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    return;
  }
  if (complaint.reporterId.toString() !== req.user!.sub) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the reporter can appeal this grievance' } });
    return;
  }
  if (
    complaint.status !== ComplaintStatus.LINKED_DUPLICATE &&
    complaint.status !== ComplaintStatus.NEEDS_REVIEW
  ) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Appeals can only be submitted for duplicate-linked or flagged grievances',
      },
    });
    return;
  }

  const appeal = await Appeal.create({
    complaintId: complaint._id,
    reporterId: req.user!.sub,
    targetType: complaint.status === ComplaintStatus.LINKED_DUPLICATE ? 'duplicate' : 'review',
    reason,
    status: 'pending',
  });

  await ReviewTask.create({
    complaintId: complaint._id,
    reason: `CITIZEN_APPEAL: ${reason.slice(0, 100)}`,
    evidence: { appealId: appeal._id, reporterReason: reason },
    status: 'pending',
  });

  res.status(201).json({ success: true, appealId: appeal._id });
});
