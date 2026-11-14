import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { Role } from '@nagrik-setu/shared';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  departmentId?: Types.ObjectId;
  wardIds: Types.ObjectId[];
  emailVerifiedAt?: Date;
  reputation: {
    confirmed: number;
    rejected: number;
    score: number;
  };
  suspendedUntil?: Date;
  refreshTokenFamily?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: Object.values(Role),
      default: Role.CITIZEN,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    wardIds: [{ type: Schema.Types.ObjectId, ref: 'Ward' }],
    emailVerifiedAt: { type: Date },
    reputation: {
      confirmed: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      score: { type: Number, default: 100 },
    },
    suspendedUntil: { type: Date },
    refreshTokenFamily: { type: String, select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
