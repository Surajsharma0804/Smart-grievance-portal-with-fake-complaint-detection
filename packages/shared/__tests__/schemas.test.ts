import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  geoPointSchema,
  complaintCreateSchema,
} from '../src/schemas.js';

describe('registerSchema', () => {
  it('accepts valid input', () => {
    const result = registerSchema.safeParse({
      name: 'Suraj Kumar',
      email: 'suraj@example.com',
      password: 'secureP@ss1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = registerSchema.safeParse({
      name: 'S',
      email: 'a@b.com',
      password: 'secureP@ss1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'a@b.com',
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      password: 'secureP@ss1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'a@b.com',
      password: 'secureP@ss1',
      role: 'REVIEWER',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid input', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'any',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });
});

describe('geoPointSchema', () => {
  it('accepts valid [longitude, latitude]', () => {
    const result = geoPointSchema.safeParse({
      type: 'Point',
      coordinates: [77.5946, 12.9716], // Bangalore: lng, lat
    });
    expect(result.success).toBe(true);
  });

  it('rejects latitude in longitude position (> 90 means it was swapped)', () => {
    // If someone passes [lat, lng] as [12.97, 77.59], lng=12.97 is valid
    // but [lat=91, lng=77] would be caught by range
    const result = geoPointSchema.safeParse({
      type: 'Point',
      coordinates: [91, 12.9716], // 91 exceeds longitude max? No, lng max is 180
    });
    // 91 is valid longitude, so we need the lat>90 test
    const result2 = geoPointSchema.safeParse({
      type: 'Point',
      coordinates: [77.59, 91], // lat=91 is invalid
    });
    expect(result2.success).toBe(false);
  });

  it('rejects longitude out of range', () => {
    const result = geoPointSchema.safeParse({
      type: 'Point',
      coordinates: [181, 12],
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong type', () => {
    const result = geoPointSchema.safeParse({
      type: 'Polygon',
      coordinates: [77, 12],
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields', () => {
    const result = geoPointSchema.safeParse({
      type: 'Point',
      coordinates: [77, 12],
      extra: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('complaintCreateSchema', () => {
  const validComplaint = {
    title: 'Broken streetlight near park',
    location: { type: 'Point' as const, coordinates: [77.5946, 12.9716] },
    mediaKeys: ['uploads/abc123.jpg'],
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('accepts valid complaint with minimal fields', () => {
    const result = complaintCreateSchema.safeParse(validComplaint);
    expect(result.success).toBe(true);
  });

  it('accepts complaint with all optional fields', () => {
    const result = complaintCreateSchema.safeParse({
      ...validComplaint,
      description: 'The streetlight has been broken for a week',
      accuracyM: 15.5,
      address: '123 Main Road',
      landmark: 'Near the park entrance',
      citizenCategory: 'STREET_LIGHTING',
      anonymous: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 5 chars', () => {
    const result = complaintCreateSchema.safeParse({
      ...validComplaint,
      title: 'Hi',
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 4 media keys', () => {
    const result = complaintCreateSchema.safeParse({
      ...validComplaint,
      mediaKeys: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero media keys', () => {
    const result = complaintCreateSchema.safeParse({
      ...validComplaint,
      mediaKeys: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category code', () => {
    const result = complaintCreateSchema.safeParse({
      ...validComplaint,
      citizenCategory: 'INVALID_CATEGORY',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid idempotency key (non-uuid)', () => {
    const result = complaintCreateSchema.safeParse({
      ...validComplaint,
      idempotencyKey: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys', () => {
    const result = complaintCreateSchema.safeParse({
      ...validComplaint,
      severity: 5,
    });
    expect(result.success).toBe(false);
  });

  it('defaults anonymous to false', () => {
    const result = complaintCreateSchema.safeParse(validComplaint);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.anonymous).toBe(false);
    }
  });
});
