import { Router, type Request, type Response } from 'express';
import { complaintCreateSchema } from '@nagrik-setu/shared';
import {
  createComplaint,
  Complaint,
  toPublicDTO,
  toOwnerDTO,
} from '@nagrik-setu/domain';
import { parseCookies, requireAuth } from '../middleware/auth';

export const complaintRouter = Router();

const auth = [parseCookies, requireAuth] as const;

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

complaintRouter.get('/complaints/:publicId', ...auth, async (req: Request, res: Response) => {
  const complaint = await Complaint.findOne({ publicId: req.params.publicId });
  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    return;
  }

  const isOwner = complaint.reporterId.toString() === req.user!.sub;
  if (isOwner) {
    res.json({ complaint: toOwnerDTO(complaint) });
    return;
  }
  res.json({ complaint: toPublicDTO(complaint) });
});

complaintRouter.get('/complaints/nearby', ...auth, async (req: Request, res: Response) => {
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
