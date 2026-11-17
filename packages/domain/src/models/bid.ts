import mongoose, { Schema, type Document, type Types } from 'mongoose';

export const BidStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type BidStatus = (typeof BidStatus)[keyof typeof BidStatus];

export interface IBid extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  contractorId: Types.ObjectId;
  amount: number;
  timeline: number; // days
  materials?: string;
  approach?: string;
  status: BidStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bidSchema = new Schema<IBid>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor', required: true },
    amount: { type: Number, required: true, min: 0 },
    timeline: { type: Number, required: true, min: 1 },
    materials: String,
    approach: { type: String, maxlength: 2000 },
    status: {
      type: String,
      required: true,
      enum: Object.values(BidStatus),
      default: BidStatus.PENDING,
    },
  },
  { timestamps: true },
);

bidSchema.index({ projectId: 1, contractorId: 1 }, { unique: true });
bidSchema.index({ contractorId: 1 });

export const Bid = mongoose.model<IBid>('Bid', bidSchema);
