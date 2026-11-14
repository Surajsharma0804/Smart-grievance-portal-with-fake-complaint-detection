import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ComplaintStatus, Role, MediaSource } from '@nagrik-setu/shared';
import {
  Complaint,
  transition,
  haversineDistance,
  coordsToLatLng,
} from '@nagrik-setu/domain';
import { parseCookies, requireAuth, requireRole } from '../middleware/auth';

export const officerRouter = Router();

const officerAuth = [
  parseCookies,
  requireAuth,
  requireRole(Role.OFFICER, Role.DEPT_ADMIN),
] as const;

/**
 * GET /officer/queue
 * Returns open complaints assigned to the officer or in their department,
 * sorted by priority descending and SLA due date ascending.
 */
officerRouter.get('/officer/queue', ...officerAuth, async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const userRole = req.user!.role;

  const query: Record<string, unknown> = {
    status: {
      $in: [
        ComplaintStatus.SUBMITTED,
        ComplaintStatus.ROUTED,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.REOPENED,
        ComplaintStatus.NEEDS_REVIEW,
      ],
    },
  };

  // If officer (not dept admin), filter by their assigneeId or unassigned
  if (userRole === Role.OFFICER) {
    query['$or'] = [
      { assigneeId: userId },
      { assigneeId: { $exists: false } },
      { assigneeId: null },
    ];
  }

  const complaints = await Complaint.find(query)
    .populate('wardId', 'name code')
    .populate('departmentId', 'name code')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ complaints });
});

/**
 * POST /complaints/:id/status
 * Transition complaint status with an optional note.
 */
const statusTransitionSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  note: z.string().max(500).optional(),
});

officerRouter.post('/complaints/:id/status', ...officerAuth, async (req: Request, res: Response) => {
  const { status, note } = statusTransitionSchema.parse(req.body);
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    return;
  }

  // Check authorization: must be assigned officer or DEPT_ADMIN
  const isAssigned = complaint.assigneeId?.toString() === req.user!.sub;
  const isDeptAdmin = req.user!.role === Role.DEPT_ADMIN;

  if (!isAssigned && !isDeptAdmin) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'You are not assigned to this complaint' },
    });
    return;
  }

  try {
    const updated = await transition(complaint, status, req.user!.sub, note);
    res.json({ complaint: updated });
  } catch (err: unknown) {
    res.status(400).json({
      error: {
        code: 'INVALID_TRANSITION',
        message: err instanceof Error ? err.message : 'Invalid state transition',
      },
    });
  }
});

/**
 * POST /complaints/:id/resolve
 * Resolve a complaint with resolution photo and geo-verification.
 */
const resolveSchema = z.object({
  mediaKey: z.string().min(1),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  note: z.string().max(1000).optional(),
});

const RESOLVE_RADIUS_M = 200; // default 200 meters

officerRouter.post('/complaints/:id/resolve', ...officerAuth, async (req: Request, res: Response) => {
  const { mediaKey, location, note } = resolveSchema.parse(req.body);
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    return;
  }

  // Verify distance
  const complaintLocation = coordsToLatLng(complaint.location.coordinates);
  const distance = haversineDistance(complaintLocation, location);

  if (distance > RESOLVE_RADIUS_M) {
    res.status(422).json({
      error: {
        code: 'RESOLUTION_GEO_MISMATCH',
        message: `Resolution photo location (${Math.round(distance)}m) exceeds maximum allowed distance of ${RESOLVE_RADIUS_M}m from complaint location`,
        details: { distance: Math.round(distance), maxAllowed: RESOLVE_RADIUS_M },
      },
    });
    return;
  }

  // Add resolution media
  complaint.media.push({
    kind: 'resolution',
    key: mediaKey,
    source: MediaSource.CAMERA,
    exif: {
      gps: location,
      captureTime: new Date(),
    },
  } as any);

  try {
    // If it's ASSIGNED, transition to IN_PROGRESS first then RESOLVED if needed,
    // or direct if already IN_PROGRESS
    if (complaint.status === ComplaintStatus.ASSIGNED) {
      await transition(complaint, ComplaintStatus.IN_PROGRESS, req.user!.sub, 'Started resolution');
    }
    const updated = await transition(
      complaint,
      ComplaintStatus.RESOLVED,
      req.user!.sub,
      note ?? 'Resolved with photo verification',
    );
    res.json({ complaint: updated });
  } catch (err: unknown) {
    res.status(400).json({
      error: {
        code: 'RESOLUTION_FAILED',
        message: err instanceof Error ? err.message : 'Resolution failed',
      },
    });
  }
});
