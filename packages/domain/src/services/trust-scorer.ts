/**
 * Trust scoring system from design.md §6.
 * Start at 100, subtract penalties, floor 0.
 * Verdict bands: >=70 pass, 40-69 review, <40 review+high priority.
 */
import type { ExifSummary } from './exif';
import { hasEditingSoftware } from './exif';
import type { VlmResult } from './ai-provider';
import type { ForensicsResult } from './forensics';
import { haversineDistance } from './geo';

export interface TrustSignal {
  signal: string;
  value: number | string | boolean;
  penalty: number;
  reason: string;
}

export interface TrustResult {
  score: number;
  signals: TrustSignal[];
  verdict: 'PASS' | 'REVIEW' | 'REVIEW_HIGH';
}

export interface TrustInput {
  /** EXIF summary for each image */
  exifSummaries: ExifSummary[];
  /** Claimed location [lng, lat] */
  claimedLocation: { lat: number; lng: number };
  /** Image source (CAMERA or GALLERY) */
  source: string;
  /** VLM analysis result */
  vlmResult?: VlmResult;
  /** Forensics result */
  forensicsResult?: ForensicsResult;
  /** Whether cross-user perceptual match was found (Hamming <=6) */
  crossUserMatch?: boolean;
  /** Reporter's prior confirmed-fake count */
  priorFakeCount?: number;
  /** Number of complaints by this user in the last 10 minutes */
  recentComplaintCount?: number;
}

export interface TrustConfig {
  passThreshold: number;    // default 70
  reviewThreshold: number;  // default 40
  gpsDistanceThresholdM: number;  // default 500
  elaRegionRatioThreshold: number;  // default 3.0
  staleHours: number;       // default 72
}

const DEFAULT_CONFIG: TrustConfig = {
  passThreshold: 70,
  reviewThreshold: 40,
  gpsDistanceThresholdM: 500,
  elaRegionRatioThreshold: 3.0,
  staleHours: 72,
};

/**
 * Compute trust score from all available signals.
 */
export function computeTrustScore(
  input: TrustInput,
  config: TrustConfig = DEFAULT_CONFIG,
): TrustResult {
  const signals: TrustSignal[] = [];

  // 1. EXIF GPS mismatch (30-40 penalty)
  for (const exif of input.exifSummaries) {
    if (exif.gps) {
      const distance = haversineDistance(exif.gps, input.claimedLocation);
      if (distance > config.gpsDistanceThresholdM) {
        const penalty = Math.min(40, 30 + Math.floor((distance - 500) / 1000) * 2);
        signals.push({
          signal: 'EXIF_GPS_MISMATCH',
          value: Math.round(distance),
          penalty,
          reason: `EXIF GPS is ${Math.round(distance)}m from claimed location`,
        });
      }
    }
  }

  // 2. EXIF time stale (15 penalty)
  for (const exif of input.exifSummaries) {
    if (exif.captureTime) {
      const ageMs = Date.now() - exif.captureTime.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours > config.staleHours) {
        signals.push({
          signal: 'EXIF_TIME_STALE',
          value: Math.round(ageHours),
          penalty: 15,
          reason: `Capture ${Math.round(ageHours)} hours old (threshold: ${config.staleHours}h)`,
        });
        break; // only penalize once
      }
    }
  }

  // 3. Editing software tag (15 penalty)
  for (const exif of input.exifSummaries) {
    if (hasEditingSoftware(exif)) {
      signals.push({
        signal: 'EDITING_SOFTWARE',
        value: exif.software ?? 'unknown',
        penalty: 15,
        reason: `Editing software detected: ${exif.software}`,
      });
      break; // only penalize once
    }
  }

  // 4. No EXIF + gallery source (5 penalty)
  if (input.source === 'GALLERY') {
    const hasAnyExif = input.exifSummaries.some(
      (e) => e.gps || e.captureTime || e.make || e.model,
    );
    if (!hasAnyExif) {
      signals.push({
        signal: 'NO_EXIF_GALLERY',
        value: true,
        penalty: 5,
        reason: 'No EXIF metadata and image sourced from gallery',
      });
    }
  }

  // 5. ELA / noise anomaly (10-20 penalty)
  if (input.forensicsResult) {
    const ratio = input.forensicsResult.ela.regionVarianceRatio;
    if (ratio > config.elaRegionRatioThreshold) {
      const penalty = Math.min(20, 10 + Math.floor((ratio - config.elaRegionRatioThreshold) * 5));
      signals.push({
        signal: 'ELA_ANOMALY',
        value: ratio.toFixed(2),
        penalty,
        reason: `ELA region variance ratio ${ratio.toFixed(2)} exceeds threshold ${config.elaRegionRatioThreshold}`,
      });
    }
  }

  // 6. Cross-user perceptual match (40 penalty)
  if (input.crossUserMatch) {
    signals.push({
      signal: 'CROSS_USER_MATCH',
      value: true,
      penalty: 40,
      reason: 'Image perceptually matches another user\'s complaint (Hamming <= 6)',
    });
  }

  // 7. Text-image mismatch (25 penalty)
  if (input.vlmResult && input.vlmResult.textImageConsistency < 0.4) {
    signals.push({
      signal: 'TEXT_IMAGE_MISMATCH',
      value: input.vlmResult.textImageConsistency,
      penalty: 25,
      reason: `Text-image consistency ${input.vlmResult.textImageConsistency} below 0.4`,
    });
  }

  // 8. VLM flags
  if (input.vlmResult?.flags) {
    const f = input.vlmResult.flags;
    if (f.screenshot) {
      signals.push({ signal: 'FLAG_SCREENSHOT', value: true, penalty: 15, reason: 'Image appears to be a screenshot' });
    }
    if (f.stockPhoto) {
      signals.push({ signal: 'FLAG_STOCK_PHOTO', value: true, penalty: 30, reason: 'Image appears to be a stock photo' });
    }
    if (f.possiblyAiGenerated) {
      signals.push({ signal: 'FLAG_AI_GENERATED', value: true, penalty: 15, reason: 'Image may be AI-generated' });
    }
    if (f.irrelevantImage) {
      signals.push({ signal: 'FLAG_IRRELEVANT', value: true, penalty: 30, reason: 'Image appears unrelated to the complaint' });
    }
  }

  // 9. Reputation (5 per prior fake, max 20)
  if (input.priorFakeCount && input.priorFakeCount > 0) {
    const penalty = Math.min(20, input.priorFakeCount * 5);
    signals.push({
      signal: 'REPUTATION',
      value: input.priorFakeCount,
      penalty,
      reason: `${input.priorFakeCount} prior confirmed-fake complaint(s)`,
    });
  }

  // 10. Burst (15 penalty)
  if (input.recentComplaintCount && input.recentComplaintCount > 5) {
    signals.push({
      signal: 'BURST',
      value: input.recentComplaintCount,
      penalty: 15,
      reason: `${input.recentComplaintCount} complaints in last 10 minutes`,
    });
  }

  // 11. Camera source bonus (+10, cap 100)
  let bonus = 0;
  if (input.source === 'CAMERA') {
    const hasFreshGps = input.exifSummaries.some((e) => {
      if (!e.gps) return false;
      const dist = haversineDistance(e.gps, input.claimedLocation);
      return dist <= 50;
    });
    if (hasFreshGps) {
      bonus = 10;
      signals.push({
        signal: 'CAMERA_BONUS',
        value: true,
        penalty: -10,
        reason: 'Camera source with fresh GPS within 50m - bonus applied',
      });
    }
  }

  // Compute final score
  const totalPenalty = signals
    .filter((s) => s.signal !== 'CAMERA_BONUS')
    .reduce((sum, s) => sum + s.penalty, 0);

  const score = Math.max(0, Math.min(100, 100 - totalPenalty + bonus));

  // Determine verdict
  let verdict: 'PASS' | 'REVIEW' | 'REVIEW_HIGH';
  if (score >= config.passThreshold) {
    verdict = 'PASS';
  } else if (score >= config.reviewThreshold) {
    verdict = 'REVIEW';
  } else {
    verdict = 'REVIEW_HIGH';
  }

  return { score, signals, verdict };
}
