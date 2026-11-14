import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { Role, ComplaintStatus, CategoryCode } from '@nagrik-setu/shared';
import {
  ReviewTask,
  Complaint,
  AuditLog,
  transition,
  splitFromCluster,
  linkToCluster,
} from '@nagrik-setu/domain';
import { parseCookies, requireAuth, requireRole } from '../middleware/auth';

export const reviewRouter = Router();

const reviewerAuth = [
  parseCookies,
  requireAuth,
  requireRole(Role.REVIEWER, Role.DEPT_ADMIN),
] as const;

const staffReadAuth = [
  parseCookies,
  requireAuth,
  requireRole(Role.OFFICER, Role.REVIEWER, Role.DEPT_ADMIN),
] as const;

/**
 * GET /admin/review-tasks
 * List pending review tasks with populated complaint data.
 */
reviewRouter.get('/admin/review-tasks', ...staffReadAuth, async (req: Request, res: Response) => {
  const status = (req.query.status as string) || 'pending';
  const tasks = await ReviewTask.find({ status })
    .populate({
      path: 'complaintId',
      populate: [
        { path: 'wardId', select: 'name code' },
        { path: 'departmentId', select: 'name code' },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ tasks });
});

/**
 * POST /admin/review-tasks/:id/decide
 * Reviewer decision: APPROVE, REJECT, MERGE, REROUTE
 */
const decisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'MERGE', 'REROUTE']),
  reason: z.string().min(3).max(1000),
  // For MERGE: target complaint publicId or ObjectId to merge with
  mergeTargetId: z.string().optional(),
  // For REROUTE: new category
  newCategory: z.nativeEnum(CategoryCode).optional(),
});

reviewRouter.post('/admin/review-tasks/:id/decide', ...reviewerAuth, async (req: Request, res: Response) => {
  const { action, reason, mergeTargetId, newCategory } = decisionSchema.parse(req.body);
  const task = await ReviewTask.findById(req.params.id);

  if (!task) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review task not found' } });
    return;
  }

  const complaint = await Complaint.findById(task.complaintId);
  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Associated complaint not found' } });
    return;
  }

  const actorId = req.user!.sub;

  switch (action) {
    case 'APPROVE': {
      // Transition from NEEDS_REVIEW to ROUTED
      if (complaint.status === ComplaintStatus.NEEDS_REVIEW) {
        await transition(complaint, ComplaintStatus.ROUTED, actorId, `Approved by reviewer: ${reason}`);
      }
      break;
    }
    case 'REJECT': {
      // Close with rejection note
      if (complaint.status === ComplaintStatus.NEEDS_REVIEW) {
        // First transition to ROUTED or directly if allowed, or record rejection in history
        complaint.status = ComplaintStatus.CLOSED;
        complaint.statusHistory.push({
          from: ComplaintStatus.NEEDS_REVIEW,
          to: ComplaintStatus.CLOSED,
          by: actorId as any,
          at: new Date(),
          note: `Rejected by reviewer: ${reason}`,
        } as any);
        await complaint.save();
      }
      break;
    }
    case 'MERGE': {
      if (!mergeTargetId) {
        res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'mergeTargetId is required for MERGE action' },
        });
        return;
      }
      await linkToCluster(complaint._id, mergeTargetId);
      break;
    }
    case 'REROUTE': {
      if (!newCategory) {
        res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'newCategory is required for REROUTE action' },
        });
        return;
      }
      complaint.category = newCategory;
      await complaint.save();
      if (complaint.status === ComplaintStatus.NEEDS_REVIEW) {
        await transition(complaint, ComplaintStatus.ROUTED, actorId, `Rerouted to ${newCategory}: ${reason}`);
      }
      break;
    }
  }

  // Mark task as resolved
  task.status = 'resolved';
  task.resolvedBy = actorId as any;
  task.resolution = `${action}: ${reason}`;
  await task.save();

  // Audit log
  await AuditLog.create({
    actorId,
    action: `REVIEW_${action}`,
    entity: 'Complaint',
    entityId: complaint._id,
    before: { taskStatus: 'pending' },
    after: { taskStatus: 'resolved', resolution: task.resolution },
    ip: req.ip,
    requestId: (req as any).id,
    at: new Date(),
  });

  res.json({ success: true, task });
});

/**
 * POST /admin/clusters/:id/split
 * Split a complaint from its cluster, restoring it to NEEDS_REVIEW
 */
reviewRouter.post('/admin/clusters/:id/split', ...reviewerAuth, async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const complaintId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!complaintId) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Complaint ID is required' } });
    return;
  }
  try {
    await splitFromCluster(complaintId);

    await AuditLog.create({
      actorId: req.user!.sub,
      action: 'CLUSTER_SPLIT',
      entity: 'Complaint',
      entityId: complaintId,
      at: new Date(),
      ip: req.ip,
      requestId: (req as any).id,
    });

    res.json({ success: true, message: 'Complaint split from cluster' });
  } catch (err: unknown) {
    res.status(400).json({
      error: {
        code: 'SPLIT_FAILED',
        message: err instanceof Error ? err.message : 'Failed to split complaint from cluster',
      },
    });
  }
});
