/**
 * Candidate search for duplicate detection.
 * Uses $near query with status and time filters.
 */
import { Complaint, type IComplaint } from '../models/complaint';
import { ComplaintStatus } from '@nagrik-setu/shared';

const OPEN_STATES: ComplaintStatus[] = [
  ComplaintStatus.SUBMITTED,
  ComplaintStatus.ANALYZING,
  ComplaintStatus.ROUTED,
  ComplaintStatus.ASSIGNED,
  ComplaintStatus.IN_PROGRESS,
  ComplaintStatus.NEEDS_REVIEW,
  ComplaintStatus.REOPENED,
];

export interface CandidateSearchOpts {
  /** GeoJSON coordinates [lng, lat] */
  coordinates: [number, number];
  /** Search radius in meters */
  radiusM: number;
  /** Only consider complaints created within this many days */
  windowDays: number;
  /** Exclude this complaint ID from results */
  excludeId?: string;
  /** Maximum candidates to return */
  limit?: number;
}

/**
 * Find open complaint candidates near a location for duplicate checking.
 * Uses $near (requires 2dsphere index) with status and time filters.
 */
export async function findCandidates(opts: CandidateSearchOpts): Promise<IComplaint[]> {
  const cutoff = new Date(Date.now() - opts.windowDays * 24 * 60 * 60 * 1000);

  const query: Record<string, unknown> = {
    status: { $in: OPEN_STATES },
    createdAt: { $gte: cutoff },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: opts.coordinates,
        },
        $maxDistance: opts.radiusM,
      },
    },
  };

  if (opts.excludeId) {
    query['_id'] = { $ne: opts.excludeId };
  }

  return Complaint.find(query)
    .select('+media.embedding')
    .limit(opts.limit ?? 20)
    .exec();
}
