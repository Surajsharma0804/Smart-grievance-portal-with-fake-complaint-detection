/**
 * Routing algorithm from design.md §7.
 * Ward lookup, category decision, officer assignment, SLA computation.
 */
import { Complaint, type IComplaint } from '../models/complaint';
import { Category } from '../models/category';
import { Ward } from '../models/ward';
import { User } from '../models/user';
import type { VlmResult } from './ai-provider';
import { ComplaintStatus, CategoryCode, Role } from '@nagrik-setu/shared';
import type { Types } from 'mongoose';

export interface RoutingResult {
  wardId: Types.ObjectId;
  category: CategoryCode;
  departmentId: Types.ObjectId;
  assigneeId?: Types.ObjectId;
  slaDueAt: Date;
  status: typeof ComplaintStatus.ROUTED | typeof ComplaintStatus.NEEDS_REVIEW;
  needsReviewReason?: string;
}

export interface RoutingInput {
  complaint: IComplaint;
  vlmResult?: VlmResult;
  fromFallback?: boolean;
}

/**
 * Route a complaint: determine category, department, officer, and SLA.
 */
export async function routeComplaint(input: RoutingInput): Promise<RoutingResult> {
  const { complaint, vlmResult, fromFallback } = input;

  // 1. Ward lookup (should already be set, but verify)
  let wardId = complaint.wardId;
  if (!wardId) {
    const [lng, lat] = complaint.location.coordinates;
    const ward = await Ward.findOne({
      geometry: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
        },
      },
    });
    if (!ward) {
      return {
        wardId: complaint.wardId!,
        category: CategoryCode.OTHER,
        departmentId: complaint.departmentId!,
        slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: ComplaintStatus.NEEDS_REVIEW,
        needsReviewReason: 'Location outside all known wards',
      };
    }
    wardId = ward._id;
  }

  // 2. Category decision
  const aiCat = vlmResult?.category as CategoryCode | undefined;
  const aiConf = vlmResult?.confidence ?? 0;
  const citizenCat = complaint.citizenCategory;

  let category: CategoryCode;
  let needsReview = false;
  let reviewReason: string | undefined;

  if (fromFallback || !vlmResult) {
    // No VLM result - use citizen category or triage
    category = citizenCat ?? CategoryCode.OTHER;
    needsReview = true;
    reviewReason = 'AI analysis unavailable - manual categorization required';
  } else if (citizenCat && aiCat === citizenCat) {
    // Citizen and AI agree
    category = aiCat;
  } else if (aiConf >= 0.75) {
    // AI is confident
    category = aiCat ?? CategoryCode.OTHER;
  } else if (aiConf < 0.6) {
    // Low confidence - triage
    category = citizenCat ?? aiCat ?? CategoryCode.OTHER;
    needsReview = true;
    reviewReason = `Low AI confidence (${aiConf.toFixed(2)}) - needs manual review`;
  } else {
    // Medium confidence but disagrees with citizen - use citizen's choice
    category = citizenCat ?? aiCat ?? CategoryCode.OTHER;
  }

  // 3. Find department
  const categoryDoc = await Category.findOne({ code: category });
  const departmentId = categoryDoc?.departmentId ?? complaint.departmentId;

  if (!departmentId) {
    return {
      wardId,
      category,
      departmentId: complaint.departmentId!,
      slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: ComplaintStatus.NEEDS_REVIEW,
      needsReviewReason: 'No department found for category',
    };
  }

  // 4. Officer assignment (least workload in ward pool)
  const officers = await User.find({
    role: Role.OFFICER,
    departmentId,
  });

  let assigneeId: Types.ObjectId | undefined;
  if (officers.length > 0) {
    // Count open complaints per officer
    const counts = await Promise.all(
      officers.map(async (officer) => {
        const count = await Complaint.countDocuments({
          assigneeId: officer._id,
          status: { $in: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS] },
        });
        return { officerId: officer._id, count };
      }),
    );

    // Pick the one with least open complaints
    counts.sort((a, b) => a.count - b.count);
    assigneeId = counts[0]?.officerId;
  }

  // 5. SLA computation
  const slaHours = categoryDoc?.slaHours ?? 48;
  const severity = vlmResult?.severity ?? complaint.severity ?? 3;
  const effectiveSla = severity >= 4 ? slaHours / 2 : slaHours;
  const slaDueAt = new Date(Date.now() + effectiveSla * 60 * 60 * 1000);

  return {
    wardId,
    category,
    departmentId,
    assigneeId,
    slaDueAt,
    status: needsReview ? ComplaintStatus.NEEDS_REVIEW : ComplaintStatus.ROUTED,
    needsReviewReason: reviewReason,
  };
}
