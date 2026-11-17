import mongoose, { Schema, type Document, type Types } from 'mongoose';

export const ProjectStatus = {
  OPEN: 'OPEN',
  BIDDING: 'BIDDING',
  AWARDED: 'AWARDED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export interface IProject extends Document {
  _id: Types.ObjectId;
  complaintId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  address?: string;
  status: ProjectStatus;
  estimatedCost?: number;
  actualCost?: number;
  awardedTo?: Types.ObjectId; // Contractor _id
  startDate?: Date;
  completionDate?: Date;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    address: String,
    status: {
      type: String,
      required: true,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.OPEN,
    },
    estimatedCost: Number,
    actualCost: Number,
    awardedTo: { type: Schema.Types.ObjectId, ref: 'Contractor' },
    startDate: Date,
    completionDate: Date,
    deadline: Date,
  },
  { timestamps: true },
);

projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ complaintId: 1 });
projectSchema.index({ awardedTo: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
