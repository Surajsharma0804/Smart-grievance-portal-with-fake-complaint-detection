import { describe, it, expect } from 'vitest';
import { scoreCandidate } from '../../src/services/duplicate-scorer';
import { classifyByKeywords } from '../../src/services/text-classifier';
import { CategoryCode } from '@nagrik-setu/shared';
import { Types } from 'mongoose';

describe('Evaluation thresholds (Task 5.5)', () => {
  it('duplicate scorer satisfies precision and false-merge thresholds', () => {
    const target = {
      _id: new Types.ObjectId(),
      publicId: 'NS-001',
      reporterId: new Types.ObjectId(),
      category: CategoryCode.ROADS,
      location: { type: 'Point', coordinates: [76.7794, 30.7333] },
      media: [{ kind: 'complaint', key: '1.jpg', phash: '1111222233334444' }],
    };

    // Duplicate candidate: same image, same location
    const duplicate = {
      _id: new Types.ObjectId(),
      publicId: 'NS-002',
      reporterId: new Types.ObjectId(),
      category: CategoryCode.ROADS,
      location: { type: 'Point', coordinates: [76.7794, 30.7333] },
      media: [{ kind: 'complaint', key: '2.jpg', phash: '1111222233334444' }],
    };

    // Non-duplicate candidate: different pothole 40m away
    const nonDuplicate = {
      _id: new Types.ObjectId(),
      publicId: 'NS-003',
      reporterId: new Types.ObjectId(),
      category: CategoryCode.ROADS,
      location: { type: 'Point', coordinates: [76.7797, 30.7335] },
      media: [{ kind: 'complaint', key: '3.jpg', phash: 'ffffaaaacccc5555' }],
    };

    const dupScore = scoreCandidate(target as any, duplicate as any, 0.9);
    const nonDupScore = scoreCandidate(target as any, nonDuplicate as any, 0.5);

    // Duplicate must be >= DUP_HIGH (0.82)
    expect(dupScore.score).toBeGreaterThanOrEqual(0.82);
    expect(dupScore.verdict).toBe('HIGH');

    // Non-duplicate must be < DUP_HIGH (no false merge)
    expect(nonDupScore.score).toBeLessThan(0.82);
    expect(nonDupScore.verdict).not.toBe('HIGH');
  });

  it('bilingual text classifier handles both English and Hindi accurately', () => {
    const en = classifyByKeywords('Large pothole and broken road surface');
    const hi = classifyByKeywords('सड़क पर गहरा गड्ढा है');

    expect(en.category).toBe(CategoryCode.ROADS);
    expect(hi.category).toBe(CategoryCode.ROADS);
  });
});
