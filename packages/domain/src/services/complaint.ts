import { randomBytes } from 'node:crypto';
import {
  type ComplaintCreateInput,
  ComplaintStatus,
  MediaSource,
} from '@nagrik-setu/shared';
import { Complaint, type IComplaint } from '../models/complaint.js';
import { OutboxEvent } from '../models/outbox-event.js';
import { Ward } from '../models/ward.js';
import type { Types } from 'mongoose';

function genPublicId(): string {
  // 10 character alphanumeric ID: NS-XXXXXXXX
  return 'NS-' + randomBytes(4).toString('hex').toUpperCase();
}

export interface CreateComplaintOpts {
  input: ComplaintCreateInput;
  reporterId: Types.ObjectId | string;
}

export async function createComplaint(opts: CreateComplaintOpts): Promise<IComplaint> {
  const { input, reporterId } = opts;

  // Idempotency: return existing complaint if same reporter + key
  const existing = await Complaint.findOne({
    reporterId,
    idempotencyKey: input.idempotencyKey,
  });
  if (existing) return existing;

  // Ward lookup
  const [lng, lat] = input.location.coordinates;
  const ward = await Ward.findOne({
    geometry: {
      $geoIntersects: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
      },
    },
  });

  const complaint = await Complaint.create({
    publicId: genPublicId(),
    reporterId,
    anonymous: input.anonymous,
    title: input.title,
    description: input.description,
    location: input.location,
    accuracyM: input.accuracyM,
    address: input.address,
    landmark: input.landmark,
    wardId: ward?._id,
    media: input.mediaKeys.map((key) => ({
      kind: 'complaint' as const,
      key,
      source: MediaSource.GALLERY,
    })),
    citizenCategory: input.citizenCategory,
    status: ComplaintStatus.SUBMITTED,
    statusHistory: [{
      from: ComplaintStatus.SUBMITTED,
      to: ComplaintStatus.SUBMITTED,
      by: reporterId,
      at: new Date(),
      note: 'Complaint submitted',
    }],
    idempotencyKey: input.idempotencyKey,
  });

  // Outbox event for the analysis pipeline
  await OutboxEvent.create({
    type: 'COMPLAINT_CREATED',
    complaintId: complaint._id,
    payload: { publicId: complaint.publicId },
  });

  return complaint;
}
