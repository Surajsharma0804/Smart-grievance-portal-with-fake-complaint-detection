import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IWard extends Document {
  _id: Types.ObjectId;
  code: string;
  name: string;
  /** GeoJSON Polygon or MultiPolygon with 2dsphere index. */
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  /** Maps department ID to an array of officer user IDs in this ward. */
  departmentOfficerPools: Map<string, Types.ObjectId[]>;
}

const wardSchema = new Schema<IWard>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  geometry: {
    type: { type: String, required: true, enum: ['Polygon', 'MultiPolygon'] },
    coordinates: { type: Schema.Types.Mixed, required: true },
  },
  departmentOfficerPools: {
    type: Map,
    of: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    default: new Map(),
  },
});

wardSchema.index({ geometry: '2dsphere' });

export const Ward = mongoose.model<IWard>('Ward', wardSchema);
