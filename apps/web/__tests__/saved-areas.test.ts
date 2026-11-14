import { describe, it, expect } from 'vitest';
import { savedAreaCreateSchema, notificationPrefsSchema } from '@nagrik-setu/shared';

describe('Saved Areas & Notification Preferences Schemas', () => {
  it('validates a valid saved area input', () => {
    const valid = {
      label: 'Home neighborhood',
      center: {
        type: 'Point' as const,
        coordinates: [77.209, 28.6139] as [number, number],
      },
      radiusM: 1000,
      categories: ['ROADS', 'SANITATION'],
    };

    const res = savedAreaCreateSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects coordinates out of bounds or negative radius', () => {
    const invalid = {
      label: 'Invalid Area',
      center: {
        type: 'Point' as const,
        coordinates: [190, 95] as [number, number], // invalid coords
      },
      radiusM: -50,
      categories: [],
    };

    const res = savedAreaCreateSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('validates notification preferences with quiet hours and language', () => {
    const valid = {
      channels: {
        inApp: true,
        email: false,
      },
      quietHours: {
        enabled: true,
        start: '23:00',
        end: '06:00',
      },
      language: 'hi' as const,
    };

    const res = notificationPrefsSchema.safeParse(valid);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.language).toBe('hi');
      expect(res.data.channels.inApp).toBe(true);
    }
  });

  it('enforces maximum label length of 50 characters', () => {
    const longLabel = 'A'.repeat(51);
    const res = savedAreaCreateSchema.safeParse({
      label: longLabel,
      center: {
        type: 'Point' as const,
        coordinates: [77.1, 28.5] as [number, number],
      },
      radiusM: 1000,
      categories: [],
    });

    expect(res.success).toBe(false);
  });
});
