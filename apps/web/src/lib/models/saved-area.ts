import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ISavedArea extends Document {
  userId: string;
  label: string;
  center: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  radiusM: number;
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SavedAreaSchema = new Schema<ISavedArea>(
  {
    userId: { type: String, required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 50 },
    center: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords: number[]) =>
            coords.length === 2 &&
            coords[0]! >= -180 &&
            coords[0]! <= 180 &&
            coords[1]! >= -90 &&
            coords[1]! <= 90,
          message: 'Coordinates must be [longitude (-180..180), latitude (-90..90)]',
        },
      },
    },
    radiusM: { type: Number, required: true, min: 100, max: 10000, default: 1000 },
    categories: { type: [String], default: [] },
  },
  {
    timestamps: true,
    collection: 'savedAreas',
  },
);

SavedAreaSchema.index({ center: '2dsphere' });
SavedAreaSchema.index({ userId: 1, label: 1 });

export const SavedArea: Model<ISavedArea> =
  mongoose.models.SavedArea || mongoose.model<ISavedArea>('SavedArea', SavedAreaSchema);
