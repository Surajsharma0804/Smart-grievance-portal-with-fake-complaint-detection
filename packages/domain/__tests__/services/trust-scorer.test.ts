import { describe, it, expect } from 'vitest';
import { computeTrustScore, type TrustInput } from '../../src/services/trust-scorer';

function baseTrustInput(overrides: Partial<TrustInput> = {}): TrustInput {
  return {
    exifSummaries: [],
    claimedLocation: { lat: 30.7333, lng: 76.7794 },
    source: 'GALLERY',
    ...overrides,
  };
}

describe('trust-scorer', () => {
  it('returns 100 with no signals (clean complaint with camera source)', () => {
    const result = computeTrustScore(baseTrustInput({ source: 'CAMERA' }));
    expect(result.score).toBe(100);
    expect(result.verdict).toBe('PASS');
  });

  it('penalizes gallery source with no EXIF (5 penalty)', () => {
    const result = computeTrustScore(baseTrustInput({ source: 'GALLERY' }));
    expect(result.score).toBe(95);
    expect(result.verdict).toBe('PASS');
  });

  it('penalizes EXIF GPS mismatch (30+ penalty)', () => {
    const result = computeTrustScore(baseTrustInput({
      exifSummaries: [{ gps: { lat: 28.6139, lng: 77.2090 } }], // Delhi, far from Chandigarh
    }));
    expect(result.score).toBeLessThanOrEqual(70);
    const signal = result.signals.find((s) => s.signal === 'EXIF_GPS_MISMATCH');
    expect(signal).toBeDefined();
    expect(signal!.penalty).toBeGreaterThanOrEqual(30);
  });

  it('penalizes stale EXIF time (15 penalty)', () => {
    const staleTime = new Date(Date.now() - 100 * 60 * 60 * 1000); // 100 hours ago
    const result = computeTrustScore(baseTrustInput({
      exifSummaries: [{ captureTime: staleTime }],
    }));
    expect(result.score).toBe(85); // 100 - 15 (stale time), captureTime counts as EXIF
    expect(result.signals.some((s) => s.signal === 'EXIF_TIME_STALE')).toBe(true);
  });

  it('penalizes editing software (15 penalty)', () => {
    const result = computeTrustScore(baseTrustInput({
      exifSummaries: [{ software: 'Adobe Photoshop 2024' }],
    }));
    expect(result.score).toBe(80); // 100 - 5 (no exif gallery) - 15 (editing software)
    expect(result.signals.some((s) => s.signal === 'EDITING_SOFTWARE')).toBe(true);
  });

  it('penalizes no EXIF with gallery source (5 penalty)', () => {
    const result = computeTrustScore(baseTrustInput({ source: 'GALLERY' }));
    expect(result.score).toBe(95);
  });

  it('applies camera bonus (+10) with fresh GPS within 50m', () => {
    const result = computeTrustScore(baseTrustInput({
      source: 'CAMERA',
      exifSummaries: [{ gps: { lat: 30.7333, lng: 76.7794 } }],
    }));
    expect(result.score).toBe(100); // 100 - 0 + 10 capped at 100
    const bonus = result.signals.find((s) => s.signal === 'CAMERA_BONUS');
    expect(bonus).toBeDefined();
  });

  it('penalizes cross-user perceptual match (40 penalty)', () => {
    const result = computeTrustScore(baseTrustInput({
      crossUserMatch: true,
    }));
    expect(result.score).toBeLessThanOrEqual(60);
    expect(result.verdict).toBe('REVIEW');
  });

  it('penalizes text-image mismatch (25 penalty)', () => {
    const result = computeTrustScore(baseTrustInput({
      vlmResult: {
        category: 'ROADS',
        severity: 3,
        caption: 'test',
        textImageConsistency: 0.2,
        flags: { screenshot: false, stockPhoto: false, irrelevantImage: false, faceProminent: false, possiblyAiGenerated: false },
        confidence: 0.8,
      },
    }));
    expect(result.score).toBeLessThanOrEqual(80);
    expect(result.signals.some((s) => s.signal === 'TEXT_IMAGE_MISMATCH')).toBe(true);
  });

  it('penalizes screenshot flag (15 penalty)', () => {
    const result = computeTrustScore(baseTrustInput({
      vlmResult: {
        category: 'ROADS',
        severity: 3,
        caption: 'test',
        textImageConsistency: 0.8,
        flags: { screenshot: true, stockPhoto: false, irrelevantImage: false, faceProminent: false, possiblyAiGenerated: false },
        confidence: 0.8,
      },
    }));
    expect(result.signals.some((s) => s.signal === 'FLAG_SCREENSHOT')).toBe(true);
  });

  it('penalizes burst complaints (15 penalty)', () => {
    const result = computeTrustScore(baseTrustInput({
      recentComplaintCount: 7,
    }));
    expect(result.score).toBe(80); // 100 - 5 (no exif gallery) - 15 (burst)
    expect(result.signals.some((s) => s.signal === 'BURST')).toBe(true);
  });

  it('score floors at 0 with many penalties', () => {
    const result = computeTrustScore(baseTrustInput({
      crossUserMatch: true,
      recentComplaintCount: 8,
      priorFakeCount: 5,
      exifSummaries: [{ software: 'Adobe Photoshop', gps: { lat: 28.6, lng: 77.2 } }],
      vlmResult: {
        category: 'ROADS',
        severity: 3,
        caption: 'test',
        textImageConsistency: 0.1,
        flags: { screenshot: true, stockPhoto: true, irrelevantImage: true, faceProminent: false, possiblyAiGenerated: true },
        confidence: 0.8,
      },
    }));
    expect(result.score).toBe(0);
    expect(result.verdict).toBe('REVIEW_HIGH');
  });

  it('verdict is REVIEW_HIGH when score < 40', () => {
    const result = computeTrustScore(baseTrustInput({
      crossUserMatch: true,
      priorFakeCount: 4,
    }));
    expect(result.score).toBeLessThan(40);
    expect(result.verdict).toBe('REVIEW_HIGH');
  });
});
