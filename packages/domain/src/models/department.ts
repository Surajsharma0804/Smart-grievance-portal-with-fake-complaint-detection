import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  code: string;
  name: string;
  categories: string[];
  defaultSlaHours: number;
  escalationChain: Types.ObjectId[];
}

const departmentSchema = new Schema<IDepartment>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  categories: [{ type: String }],
  defaultSlaHours: { type: Number, required: true, default: 48 },
  escalationChain: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
