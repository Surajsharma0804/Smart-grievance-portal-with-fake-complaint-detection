import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { CategoryCode } from '@nagrik-setu/shared';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  code: string;
  label: { en: string; hi: string };
  departmentId: Types.ObjectId;
  slaHours: number;
  keywords: string[];
}

const categorySchema = new Schema<ICategory>({
  code: {
    type: String,
    required: true,
    unique: true,
    enum: Object.values(CategoryCode),
  },
  label: {
    en: { type: String, required: true },
    hi: { type: String, required: true },
  },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  slaHours: { type: Number, required: true },
  keywords: [{ type: String }],
});

export const Category = mongoose.model<ICategory>('Category', categorySchema);
