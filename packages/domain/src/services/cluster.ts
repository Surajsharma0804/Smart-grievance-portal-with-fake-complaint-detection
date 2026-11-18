/**
 * Cluster service for duplicate complaint management.
 * Links complaints to cluster heads, manages priority, supports split.
 */
import { Complaint } from '../models/complaint';
import { ComplaintStatus } from '@nagrik-setu/shared';
import type { Types } from 'mongoose';

/**
 * Link a complaint to a cluster head (existing complaint).
 * Updates clusterSize on the head and sets primaryId/clusterId on the duplicate.
 */
export async function linkToCluster(
  duplicateId: Types.ObjectId | string,
  headId: Types.ObjectId | string,
): Promise<void> {
  const head = await Complaint.findById(headId);
  if (!head) throw new Error('Cluster head not found');

  const dup = await Complaint.findById(duplicateId);
  if (!dup) throw new Error('Duplicate complaint not found');

  // Use head's own _id as the clusterId
  const clusterId = head.clusterId ?? head._id;

  // Update head
  await Complaint.updateOne(
    { _id: head._id },
    {
      $set: { clusterId },
      $inc: { clusterSize: 1 },
    },
  );

  // Update duplicate
  await Complaint.updateOne(
    { _id: dup._id },
    {
      $set: {
        clusterId,
        primaryId: head._id,
        status: ComplaintStatus.LINKED_DUPLICATE,
      },
      $push: {
        statusHistory: {
          from: dup.status,
          to: ComplaintStatus.LINKED_DUPLICATE,
          by: dup.reporterId,
          at: new Date(),
          note: `Linked as duplicate of ${head.publicId}`,
        },
      },
    },
  );

  // Update priority on head based on cluster size
  const updatedHead = await Complaint.findById(head._id);
  if (updatedHead) {
    const newPriority = computeClusterPriority(
      updatedHead.severity ?? 3,
      updatedHead.clusterSize,
    );
    await Complaint.updateOne({ _id: head._id }, { $set: { priority: newPriority } });
  }
}

/**
 * Split a complaint from its cluster, restoring it as independent.
 */
export async function splitFromCluster(
  complaintId: Types.ObjectId | string,
): Promise<void> {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new Error('Complaint not found');
  if (!complaint.primaryId) throw new Error('Complaint is not part of a cluster');

  const headId = complaint.primaryId;

  // Remove cluster association from the complaint
  await Complaint.updateOne(
    { _id: complaint._id },
    {
      $unset: { clusterId: 1, primaryId: 1 },
      $set: {
        status: ComplaintStatus.NEEDS_REVIEW,
        clusterSize: 0,
      },
      $push: {
        statusHistory: {
          from: complaint.status,
          to: ComplaintStatus.NEEDS_REVIEW,
          by: complaint.reporterId,
          at: new Date(),
          note: 'Split from cluster - returned to review',
        },
      },
    },
  );

  // Decrement cluster size on head
  await Complaint.updateOne(
    { _id: headId },
    { $inc: { clusterSize: -1 } },
  );

  // Update priority on head
  const head = await Complaint.findById(headId);
  if (head) {
    const newPriority = computeClusterPriority(
      head.severity ?? 3,
      head.clusterSize,
    );
    await Complaint.updateOne({ _id: head._id }, { $set: { priority: newPriority } });
  }
}

/**
 * Compute priority from severity and cluster size.
 * priority = baseSeverity + min(2, floor(log2(clusterSize)))
 */
export function computeClusterPriority(severity: number, clusterSize: number): number {
  const clusterBonus = clusterSize > 0 ? Math.min(2, Math.floor(Math.log2(clusterSize))) : 0;
  return severity + clusterBonus;
}
