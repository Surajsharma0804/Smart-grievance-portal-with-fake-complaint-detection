import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  action: string;
  entity: string;
  entityId: Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  requestId?: string;
  at: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  ip: String,
  requestId: String,
  at: { type: Date, default: Date.now },
});

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ actorId: 1, at: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
