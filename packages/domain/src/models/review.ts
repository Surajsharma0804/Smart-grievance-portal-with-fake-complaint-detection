import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IReviewTask extends Document {
  _id: Types.ObjectId;
  complaintId: Types.ObjectId;
  reason: string;
  evidence: Record<string, unknown>;
  status: 'pending' | 'resolved';
  resolvedBy?: Types.ObjectId;
  resolution?: string;
  createdAt: Date;
}

const reviewTaskSchema = new Schema<IReviewTask>({
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
  reason: { type: String, required: true },
  evidence: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolution: String,
  createdAt: { type: Date, default: Date.now },
});

reviewTaskSchema.index({ status: 1, createdAt: -1 });

export const ReviewTask = mongoose.model<IReviewTask>('ReviewTask', reviewTaskSchema);

// --- Notification ---

export interface INotification extends Document {
  userId: Types.ObjectId;
  complaintId?: Types.ObjectId;
  type: string;
  payload: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint' },
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  readAt: Date,
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

// --- Appeal ---

export interface IAppeal extends Document {
  _id: Types.ObjectId;
  complaintId: Types.ObjectId;
  reporterId: Types.ObjectId;
  targetType: 'duplicate' | 'review';
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  decidedBy?: Types.ObjectId;
  decision?: string;
  createdAt: Date;
}

const appealSchema = new Schema<IAppeal>({
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
  reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['duplicate', 'review'], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  decision: String,
  createdAt: { type: Date, default: Date.now },
});

export const Appeal = mongoose.model<IAppeal>('Appeal', appealSchema);
