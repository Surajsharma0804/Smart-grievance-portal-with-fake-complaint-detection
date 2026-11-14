/**
 * Duplicate scoring using multi-signal formula from design.md §4.
 *
 * dupScore = 0.35*imageSim' + 0.30*embedSim' + 0.15*textSim + 0.10*distScore + 0.10*sameCat
 */
import { hammingDistance } from './hashing';
import { cosineSimilarity } from './embedding';
import { haversineDistance, coordsToLatLng } from './geo';
import type { IComplaint, IMedia } from '../models/complaint';

export interface DuplicateScore {
  candidateId: string;
  candidatePublicId: string;
  score: number;
  breakdown: {
    imageSim: number;
    embedSim: number;
    textSim: number;
    distScore: number;
    sameCat: number;
  };
  verdict: 'HIGH' | 'GREY' | 'NONE';
  /** Exact SHA-256 match details */
  exactMatch?: { sameUser: boolean; sha256: string };
}

export interface DuplicateScorerConfig {
  dupHigh: number;     // default 0.82
  dupGrey: number;     // default 0.65
  radiusM: number;     // search radius for distance scoring
}

const DEFAULT_CONFIG: DuplicateScorerConfig = {
  dupHigh: 0.82,
  dupGrey: 0.65,
  radiusM: 150,
};

/**
 * Rescale pHash image similarity: Hamming >= 20 -> 0, <= 6 -> 1, linear between.
 */
function rescaleImageSim(hamming: number): number {
  if (hamming <= 6) return 1;
  if (hamming >= 20) return 0;
  return 1 - (hamming - 6) / (20 - 6);
}

/**
 * Compute the best image similarity between two sets of media using pHash.
 */
function bestImageSimilarity(mediaA: IMedia[], mediaB: IMedia[]): number {
  let bestSim = 0;
  for (const a of mediaA) {
    if (!a.phash) continue;
    for (const b of mediaB) {
      if (!b.phash) continue;
      const hamming = hammingDistance(a.phash, b.phash);
      const sim = rescaleImageSim(hamming);
      bestSim = Math.max(bestSim, sim);
    }
  }
  return bestSim;
}

/**
 * Compute the best embedding similarity between two sets of media.
 */
function bestEmbedSimilarity(mediaA: IMedia[], mediaB: IMedia[]): number | null {
  let bestSim = -1;
  let hasEmbeddings = false;
  for (const a of mediaA) {
    if (!a.embedding?.length) continue;
    hasEmbeddings = true;
    for (const b of mediaB) {
      if (!b.embedding?.length) continue;
      const sim = cosineSimilarity(a.embedding, b.embedding);
      bestSim = Math.max(bestSim, sim);
    }
  }
  return hasEmbeddings && bestSim >= 0 ? bestSim : null;
}

/**
 * Check for exact SHA-256 matches between two complaints.
 */
function findExactMatch(
  mediaA: IMedia[],
  mediaB: IMedia[],
  reporterIdA: string,
  reporterIdB: string,
): DuplicateScore['exactMatch'] | undefined {
  for (const a of mediaA) {
    if (!a.sha256) continue;
    for (const b of mediaB) {
      if (b.sha256 === a.sha256) {
        return {
          sameUser: reporterIdA === reporterIdB,
          sha256: a.sha256,
        };
      }
    }
  }
  return undefined;
}

/**
 * Score a single candidate complaint against the target complaint.
 */
export function scoreCandidate(
  target: IComplaint,
  candidate: IComplaint,
  textSim: number,
  config: DuplicateScorerConfig = DEFAULT_CONFIG,
): DuplicateScore {
  // Image similarity (pHash-based)
  const imageSim = bestImageSimilarity(target.media, candidate.media);

  // Embedding similarity
  const embedSimRaw = bestEmbedSimilarity(target.media, candidate.media);

  // Distance score
  const targetCoords = coordsToLatLng(target.location.coordinates);
  const candidateCoords = coordsToLatLng(candidate.location.coordinates);
  const distance = haversineDistance(targetCoords, candidateCoords);
  const distScore = Math.max(0, 1 - distance / config.radiusM);

  // Category match
  const sameCat = target.category && candidate.category && target.category === candidate.category ? 1 : 0;

  // Weighted score
  let score: number;
  const breakdown = {
    imageSim,
    embedSim: embedSimRaw ?? 0,
    textSim,
    distScore,
    sameCat,
  };

  if (embedSimRaw !== null) {
    // Full formula
    score = 0.35 * imageSim + 0.30 * embedSimRaw + 0.15 * textSim + 0.10 * distScore + 0.10 * sameCat;
  } else {
    // Renormalize without embedSim: 0.35 + 0.15 + 0.10 + 0.10 = 0.70
    // Scale: imageSim 0.50, textSim 0.214, distScore 0.143, sameCat 0.143
    score = (0.35 * imageSim + 0.15 * textSim + 0.10 * distScore + 0.10 * sameCat) / 0.70;
  }

  // Check for exact match overrides
  const exactMatch = findExactMatch(
    target.media,
    candidate.media,
    target.reporterId.toString(),
    candidate.reporterId.toString(),
  );

  // Determine verdict
  let verdict: 'HIGH' | 'GREY' | 'NONE';
  if (exactMatch?.sameUser) {
    verdict = 'HIGH'; // Same user exact copy -> block (handled by caller)
  } else if (score >= config.dupHigh) {
    verdict = 'HIGH';
  } else if (score >= config.dupGrey) {
    verdict = 'GREY';
  } else {
    verdict = 'NONE';
  }

  return {
    candidateId: candidate._id.toString(),
    candidatePublicId: candidate.publicId,
    score,
    breakdown,
    verdict,
    exactMatch,
  };
}

/**
 * Score all candidates and return sorted by score descending.
 */
export function scoreCandidates(
  target: IComplaint,
  candidates: IComplaint[],
  textSim: number,
  config?: DuplicateScorerConfig,
): DuplicateScore[] {
  return candidates
    .map((c) => scoreCandidate(target, c, textSim, config))
    .sort((a, b) => b.score - a.score);
}
