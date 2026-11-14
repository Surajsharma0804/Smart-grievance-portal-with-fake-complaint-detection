import { describe, it, expect } from 'vitest';
import { scoreCandidate, type DuplicateScorerConfig } from '../../src/services/duplicate-scorer';
import type { IComplaint, IMedia } from '../../src/models/complaint';
import { Types } from 'mongoose';

function mockMedia(overrides: Partial<IMedia> = {}): IMedia {
  return {
    _id: new Types.ObjectId(),
    kind: 'complaint',
    key: 'test.jpg',
    source: 'CAMERA' as any,
    ...overrides,
  };
}

function mockComplaint(overrides: Partial<IComplaint> = {}): IComplaint {
  return {
    _id: new Types.ObjectId(),
    publicId: 'NS-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    reporterId: new Types.ObjectId(),
    title: 'Pothole issue',
    location: {
      type: 'Point',
      coordinates: [76.7794, 30.7333], // [lng, lat]
    },
    media: [mockMedia()],
    category: 'ROADS' as any,
    ...overrides,
  } as unknown as IComplaint;
}

describe('duplicate-scorer', () => {
  const config: DuplicateScorerConfig = {
    dupHigh: 0.82,
    dupGrey: 0.65,
    radiusM: 150,
  };

  it('detects exact SHA-256 match from the same user as HIGH', () => {
    const reporterId = new Types.ObjectId();
    const sha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const target = mockComplaint({
      reporterId,
      media: [mockMedia({ sha256: sha })],
    });

    const candidate = mockComplaint({
      reporterId,
      media: [mockMedia({ sha256: sha })],
    });

    const result = scoreCandidate(target, candidate, 0.5, config);
    expect(result.exactMatch).toBeDefined();
    expect(result.exactMatch?.sameUser).toBe(true);
    expect(result.verdict).toBe('HIGH');
  });

  it('detects exact SHA-256 match from different user', () => {
    const sha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const target = mockComplaint({
      media: [mockMedia({ sha256: sha })],
    });

    const candidate = mockComplaint({
      media: [mockMedia({ sha256: sha })],
    });

    const result = scoreCandidate(target, candidate, 0.5, config);
    expect(result.exactMatch).toBeDefined();
    expect(result.exactMatch?.sameUser).toBe(false);
  });

  it('scores high when images have low pHash hamming distance and same location & category', () => {
    const target = mockComplaint({
      media: [mockMedia({ phash: '0000000000000000' })],
    });

    const candidate = mockComplaint({
      media: [mockMedia({ phash: '0000000000000001' })], // hamming distance 1 -> imageSim 1.0
    });

    const result = scoreCandidate(target, candidate, 0.9, config);
    expect(result.breakdown.imageSim).toBe(1);
    expect(result.breakdown.distScore).toBe(1);
    expect(result.breakdown.sameCat).toBe(1);
    expect(result.score).toBeGreaterThanOrEqual(config.dupHigh);
    expect(result.verdict).toBe('HIGH');
  });

  it('scores low when images are completely different even if close in distance', () => {
    const target = mockComplaint({
      media: [mockMedia({ phash: '0000000000000000' })],
    });

    // Hamming distance 64 -> imageSim 0
    const candidate = mockComplaint({
      media: [mockMedia({ phash: 'ffffffffffffffff' })],
    });

    const result = scoreCandidate(target, candidate, 0.1, config);
    expect(result.breakdown.imageSim).toBe(0);
    // Visual component is 0, so geo proximity alone cannot reach DUP_HIGH
    expect(result.score).toBeLessThan(config.dupHigh);
    expect(result.verdict).not.toBe('HIGH');
  });
});
