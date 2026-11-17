import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IContractor extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyName: string;
  licenseNumber: string;
  specializations: string[];
  experience: number; // years
  verified: boolean;
  rating: number;
  totalProjects: number;
  completedProjects: number;
  bio?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contractorSchema = new Schema<IContractor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, minlength: 2, maxlength: 200 },
    licenseNumber: { type: String, required: true },
    specializations: [{ type: String }],
    experience: { type: Number, default: 0, min: 0 },
    verified: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalProjects: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    bio: { type: String, maxlength: 1000 },
    phone: String,
    address: String,
  },
  { timestamps: true },
);

contractorSchema.index({ verified: 1, rating: -1 });
contractorSchema.index({ specializations: 1 });

export const Contractor = mongoose.model<IContractor>('Contractor', contractorSchema);
