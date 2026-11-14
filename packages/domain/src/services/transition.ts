import { type ComplaintStatus, canTransition, Errors } from '@nagrik-setu/shared';
import type { IComplaint } from '../models/complaint';
import { AuditLog } from '../models/audit-log';
import type { Types } from 'mongoose';

/**
 * Single authoritative function for complaint state transitions.
 * No route or service should set `status` directly — always go through here.
 */
export async function transition(
  complaint: IComplaint,
  to: ComplaintStatus,
  by: Types.ObjectId | string,
  note?: string,
): Promise<IComplaint> {
  const from = complaint.status;
  if (!canTransition(from, to)) {
    throw Errors.validation(`Cannot transition from ${from} to ${to}`);
  }

  complaint.status = to;
  complaint.statusHistory.push({
    from,
    to,
    by: typeof by === 'string' ? by : by,
    at: new Date(),
    note,
  } as IComplaint['statusHistory'][0]);

  await complaint.save();

  await AuditLog.create({
    action: 'STATUS_CHANGE',
    actorId: by,
    entity: 'Complaint',
    entityId: complaint._id,
    before: { status: from },
    after: { status: to, note },
  });

  return complaint;
}
