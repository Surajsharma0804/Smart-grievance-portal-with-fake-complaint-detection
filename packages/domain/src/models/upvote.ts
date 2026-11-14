import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IUpvote extends Document {
  complaintId: Types.ObjectId;
  userId: Types.ObjectId;
}

const upvoteSchema = new Schema<IUpvote>({
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

upvoteSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

export const Upvote = mongoose.model<IUpvote>('Upvote', upvoteSchema);
