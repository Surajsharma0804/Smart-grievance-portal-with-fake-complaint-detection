import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IOutboxEvent extends Document {
  _id: Types.ObjectId;
  type: string;
  complaintId: Types.ObjectId;
  payload: Record<string, unknown>;
  status: 'pending' | 'dispatched';
  attempts: number;
  createdAt: Date;
  dispatchedAt?: Date;
}

const outboxEventSchema = new Schema<IOutboxEvent>({
  type: { type: String, required: true },
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'dispatched'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  dispatchedAt: Date,
});

outboxEventSchema.index({ status: 1, createdAt: 1 });

export const OutboxEvent = mongoose.model<IOutboxEvent>('OutboxEvent', outboxEventSchema);
