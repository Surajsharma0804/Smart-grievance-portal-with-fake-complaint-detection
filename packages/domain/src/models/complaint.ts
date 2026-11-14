import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { ComplaintStatus, CategoryCode, MediaSource, AnalysisStage } from '@nagrik-setu/shared';

export interface IMedia {
  _id: Types.ObjectId;
  kind: 'complaint' | 'resolution';
  key: string;
  publicKey?: string;
  thumbKey?: string;
  sha256?: string;
  phash?: string;
  dhash?: string;
  /** Image embedding vector, excluded from queries by default. */
  embedding?: number[];
  exif?: {
    gps?: { lat: number; lng: number };
    captureTime?: Date;
    make?: string;
    model?: string;
    software?: string;
  };
  source: MediaSource;
  width?: number;
  height?: number;
}

const mediaSchema = new Schema<IMedia>(
  {
    kind: { type: String, required: true, enum: ['complaint', 'resolution'] },
    key: { type: String, required: true },
    publicKey: String,
    thumbKey: String,
    sha256: String,
    phash: String,
    dhash: String,
    embedding: { type: [Number], select: false },
    exif: {
      gps: {
        lat: Number,
        lng: Number,
      },
      captureTime: Date,
      make: String,
      model: String,
      software: String,
    },
    source: { type: String, required: true, enum: Object.values(MediaSource) },
    width: Number,
    height: Number,
  },
  { _id: true },
);

export interface IStatusHistoryEntry {
  from: ComplaintStatus;
  to: ComplaintStatus;
  by: Types.ObjectId;
  at: Date;
  note?: string;
}

export interface IComplaint extends Document {
  _id: Types.ObjectId;
  publicId: string;
  reporterId: Types.ObjectId;
  anonymous: boolean;
  title: string;
  description?: string;
  language?: string;
  /** GeoJSON Point — coordinates in [longitude, latitude] order. */
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  accuracyM?: number;
  address?: string;
  landmark?: string;
  wardId?: Types.ObjectId;
  media: IMedia[];
  citizenCategory?: CategoryCode;
  category?: CategoryCode;
  subCategory?: string;
  severity?: number;
  priority?: number;
  status: ComplaintStatus;
  statusHistory: IStatusHistoryEntry[];
  departmentId?: Types.ObjectId;
  assigneeId?: Types.ObjectId;
  slaDueAt?: Date;
  escalationLevel: number;
  analysis?: {
    stage: AnalysisStage;
    startedAt?: Date;
    finishedAt?: Date;
    vlm?: Record<string, unknown>;
    forensics?: Record<string, unknown>;
    dup?: Record<string, unknown>;
    trust?: Record<string, unknown>;
    modelVersions?: Record<string, string>;
  };
  clusterId?: Types.ObjectId;
  primaryId?: Types.ObjectId;
  clusterSize: number;
  upvotes: number;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new Schema<IComplaint>(
  {
    publicId: { type: String, required: true, unique: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    anonymous: { type: Boolean, default: false },
    title: { type: String, required: true, minlength: 5, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    language: String,
    location: {
      type: { type: String, required: true, enum: ['Point'] },
      // GeoJSON: [longitude, latitude]
      coordinates: { type: [Number], required: true },
    },
    accuracyM: Number,
    address: String,
    landmark: String,
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    media: [mediaSchema],
    citizenCategory: { type: String, enum: Object.values(CategoryCode) },
    category: { type: String, enum: Object.values(CategoryCode) },
    subCategory: String,
    severity: { type: Number, min: 1, max: 5 },
    priority: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: Object.values(ComplaintStatus),
      default: ComplaintStatus.SUBMITTED,
    },
    statusHistory: [
      {
        from: { type: String, enum: Object.values(ComplaintStatus) },
        to: { type: String, enum: Object.values(ComplaintStatus) },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    slaDueAt: Date,
    escalationLevel: { type: Number, default: 0 },
    analysis: {
      stage: { type: String, enum: Object.values(AnalysisStage) },
      startedAt: Date,
      finishedAt: Date,
      vlm: Schema.Types.Mixed,
      forensics: Schema.Types.Mixed,
      dup: Schema.Types.Mixed,
      trust: Schema.Types.Mixed,
      modelVersions: Schema.Types.Mixed,
    },
    clusterId: { type: Schema.Types.ObjectId },
    primaryId: { type: Schema.Types.ObjectId, ref: 'Complaint' },
    clusterSize: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0 },
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true },
);

// Indexes (design.md §5.1)
complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ departmentId: 1, status: 1 });
complaintSchema.index({ reporterId: 1, createdAt: -1 });
complaintSchema.index({ clusterId: 1 });
complaintSchema.index({ reporterId: 1, idempotencyKey: 1 }, { unique: true });
complaintSchema.index({ 'media.sha256': 1 });

export const Complaint = mongoose.model<IComplaint>('Complaint', complaintSchema);
