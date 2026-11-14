import { z } from 'zod';
import { CategoryCode, ComplaintStatus } from './enums';

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const registerSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(72),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// GeoJSON Point schema
// ---------------------------------------------------------------------------

/**
 * GeoJSON Point with coordinates in **[longitude, latitude]** order.
 * This follows the GeoJSON / MongoDB convention where the first element
 * is longitude (−180 … 180) and the second is latitude (−90 … 90).
 */
export const geoPointSchema = z
  .object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.number().min(-180).max(180), // longitude
      z.number().min(-90).max(90), // latitude
    ]),
  })
  .strict();

// ---------------------------------------------------------------------------
// Complaint schemas
// ---------------------------------------------------------------------------

const categoryCodeValues = Object.values(CategoryCode) as [string, ...string[]];

export const complaintCreateSchema = z
  .object({
    title: z.string().min(5).max(200),
    description: z.string().max(2000).optional(),
    location: geoPointSchema,
    accuracyM: z.number().optional(),
    address: z.string().optional(),
    landmark: z.string().optional(),
    mediaKeys: z.array(z.string()).min(1).max(4),
    citizenCategory: z.enum(categoryCodeValues).optional(),
    anonymous: z.boolean().default(false),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

const complaintStatusValues = Object.values(ComplaintStatus) as [
  string,
  ...string[],
];

export const complaintTransitionSchema = z
  .object({
    status: z.enum(complaintStatusValues),
    note: z.string().max(500).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Citizen-owned schemas (Saved Areas & Notification Preferences)
// ---------------------------------------------------------------------------

export const savedAreaCreateSchema = z
  .object({
    label: z.string().trim().min(1).max(50),
    center: geoPointSchema,
    radiusM: z.number().min(100).max(10000).default(1000),
    categories: z.array(z.string()).default([]),
  })
  .strict();

export const notificationPrefsSchema = z
  .object({
    channels: z.object({
      inApp: z.boolean().default(true),
      email: z.boolean().default(true),
    }),
    quietHours: z
      .object({
        enabled: z.boolean().default(false),
        start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('22:00'),
        end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('07:00'),
      })
      .optional(),
    language: z.enum(['en', 'hi']).default('en'),
  })
  .strict();

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GeoPoint = z.infer<typeof geoPointSchema>;
export type ComplaintCreateInput = z.infer<typeof complaintCreateSchema>;
export type ComplaintTransitionInput = z.infer<
  typeof complaintTransitionSchema
>;
export type SavedAreaCreateInput = z.infer<typeof savedAreaCreateSchema>;
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
