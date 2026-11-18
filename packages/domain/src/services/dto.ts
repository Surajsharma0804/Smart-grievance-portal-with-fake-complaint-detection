import type { IComplaint } from '../models/complaint';

/**
 * Public DTO - strips internal fields, hides anonymous reporter,
 * and rounds coordinates to reduce precision for public map display.
 */

export interface ComplaintPublicDTO {
  id: string;
  publicId: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  citizenCategory?: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  address?: string;
  landmark?: string;
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  statusHistory: Array<{
    from: string;
    to: string;
    at: string;
    note?: string;
  }>;
}

export interface ComplaintOwnerDTO extends ComplaintPublicDTO {
  anonymous: boolean;
  wardId?: string;
  departmentId?: string;
  assigneeId?: string;
  slaDueAt?: string;
  analysis?: {
    stage?: string;
  };
}

const COORDINATE_PRECISION = 3; // ~111m grid

function roundCoord(coord: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(coord * factor) / factor;
}

/**
 * Map a complaint to a public DTO.
 * Anonymous complaints exclude the reporter entirely.
 * Coordinates are rounded for location privacy on public maps.
 */
export function toPublicDTO(
  complaint: IComplaint,
  mediaUrlResolver?: (key: string) => string,
): ComplaintPublicDTO {
  const resolve = mediaUrlResolver ?? ((k: string) => `/api/media/${k}`);
  return {
    id: complaint._id.toString(),
    publicId: complaint.publicId,
    title: complaint.title,
    description: complaint.description,
    status: complaint.status,
    category: complaint.category,
    citizenCategory: complaint.citizenCategory,
    location: {
      type: 'Point',
      coordinates: [
        roundCoord(complaint.location.coordinates[0], COORDINATE_PRECISION),
        roundCoord(complaint.location.coordinates[1], COORDINATE_PRECISION),
      ],
    },
    address: complaint.address,
    landmark: complaint.landmark,
    mediaUrls: complaint.media
      .filter((m) => m.kind === 'complaint' && m.publicKey)
      .map((m) => resolve(m.publicKey!)),
    createdAt: complaint.createdAt.toISOString(),
    updatedAt: complaint.updatedAt.toISOString(),
    upvotes: complaint.upvotes,
    statusHistory: complaint.statusHistory.map((h) => ({
      from: h.from,
      to: h.to,
      at: h.at.toISOString(),
      note: h.note,
    })),
  };
}

/**
 * Map a complaint to an owner DTO (includes extra fields visible to the reporter).
 * Still excludes raw EXIF, embeddings, internal notes, and storage keys.
 */
export function toOwnerDTO(
  complaint: IComplaint,
  mediaUrlResolver?: (key: string) => string,
): ComplaintOwnerDTO {
  const base = toPublicDTO(complaint, mediaUrlResolver);
  return {
    ...base,
    // Owner sees their own media including those without publicKey
    mediaUrls: complaint.media
      .filter((m) => m.kind === 'complaint')
      .map((m) => (mediaUrlResolver ?? ((k: string) => `/api/media/${k}`))(m.publicKey ?? m.key)),
    anonymous: complaint.anonymous,
    wardId: complaint.wardId?.toString(),
    departmentId: complaint.departmentId?.toString(),
    assigneeId: complaint.assigneeId?.toString(),
    slaDueAt: complaint.slaDueAt?.toISOString(),
    analysis: complaint.analysis ? { stage: complaint.analysis.stage } : undefined,
  };
}

/** Fields that must NEVER appear in any public-facing response. */
const PRIVATE_FIELDS = [
  'reporterId',
  'refreshTokenFamily',
  'passwordHash',
  'embedding',
  'media.sha256',
  'media.phash',
  'media.dhash',
  'media.embedding',
  'media.exif',
  'media.key',
  'idempotencyKey',
  'analysis.vlm',
  'analysis.forensics',
  'analysis.dup',
  'analysis.trust',
] as const;

export { PRIVATE_FIELDS };
