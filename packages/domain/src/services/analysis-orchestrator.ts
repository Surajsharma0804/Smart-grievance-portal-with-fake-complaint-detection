/**
 * Analysis orchestrator: stage-by-stage processing with persistence.
 * Resumes from last completed stage on retry.
 */
import sharp from 'sharp';
import { Complaint, type IComplaint } from '../models/complaint';
import { ReviewTask } from '../models/review';
import { AnalysisStage, ComplaintStatus } from '@nagrik-setu/shared';
import { sha256, pHash, dHash } from './hashing';
import { extractExif, type ExifSummary } from './exif';
import { analyzeELA, type ForensicsResult } from './forensics';
import type { ImageEmbedder } from './embedding';
import { type AIProvider, type VlmResult, analyzeWithRetry, fallbackVlmResult } from './ai-provider';
import { findCandidates } from './candidate-search';
import { scoreCandidates } from './duplicate-scorer';
import { linkToCluster } from './cluster';
import { computeTrustScore, type TrustResult } from './trust-scorer';
import { routeComplaint, type RoutingResult } from './router';
import { type StorageDriver } from './storage';
import { simpleTextEmbedding } from './embedding';

export interface OrchestratorConfig {
  storage: StorageDriver;
  aiProvider: AIProvider;
  embedder: ImageEmbedder;
  dupRadiusM: number;
  dupWindowDays: number;
}

const STAGE_ORDER: AnalysisStage[] = [
  AnalysisStage.INGEST,
  AnalysisStage.FINGERPRINT,
  AnalysisStage.METADATA,
  AnalysisStage.FORENSICS,
  AnalysisStage.EMBEDDING,
  AnalysisStage.VLM,
  AnalysisStage.DUPLICATES,
  AnalysisStage.TRUST,
  AnalysisStage.ROUTING,
  AnalysisStage.NOTIFY,
];

/**
 * Find the next stage to run based on what was last completed.
 */
function nextStage(currentStage?: AnalysisStage): AnalysisStage | null {
  if (!currentStage) return AnalysisStage.INGEST;
  if (currentStage === AnalysisStage.DONE || currentStage === AnalysisStage.FAILED) return null;

  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1] ?? null;
}

/**
 * Save analysis progress to the complaint document.
 */
async function saveProgress(
  complaintId: string,
  stage: AnalysisStage,
  data: Record<string, unknown> = {},
): Promise<void> {
  await Complaint.updateOne(
    { _id: complaintId },
    {
      $set: {
        'analysis.stage': stage,
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [`analysis.${k}`, v]),
        ),
      },
    },
  );
}

/**
 * Run the full analysis pipeline for a complaint.
 * Resumes from the last completed stage on retry.
 */
export async function runAnalysis(
  complaintId: string,
  config: OrchestratorConfig,
): Promise<void> {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new Error(`Complaint ${complaintId} not found`);

  // Transition to ANALYZING if still SUBMITTED
  if (complaint.status === ComplaintStatus.SUBMITTED) {
    await Complaint.updateOne(
      { _id: complaintId },
      {
        $set: {
          status: ComplaintStatus.ANALYZING,
          'analysis.startedAt': new Date(),
        },
        $push: {
          statusHistory: {
            from: ComplaintStatus.SUBMITTED,
            to: ComplaintStatus.ANALYZING,
            by: complaint.reporterId,
            at: new Date(),
            note: 'Analysis pipeline started',
          },
        },
      },
    );
  }

  // Determine starting stage
  let currentStage = complaint.analysis?.stage;
  let stage = currentStage ? nextStage(currentStage) : AnalysisStage.INGEST;

  // Context shared across stages
  const ctx: AnalysisContext = {
    complaintId,
    imageBuffers: [],
    exifSummaries: [],
    forensicsResult: undefined,
    vlmResult: undefined,
    trustResult: undefined,
    routingResult: undefined,
  };

  try {
    while (stage) {
      await runStage(stage, complaint, ctx, config);
      await saveProgress(complaintId, stage);
      currentStage = stage;
      stage = nextStage(stage);
    }

    // Mark as done
    await saveProgress(complaintId, AnalysisStage.DONE, {
      finishedAt: new Date(),
    });
  } catch (err) {
    // Mark as failed and create a review task
    await saveProgress(complaintId, AnalysisStage.FAILED, {
      finishedAt: new Date(),
    });

    await ReviewTask.create({
      complaintId,
      reason: `Analysis failed at stage ${currentStage ?? 'INIT'}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      evidence: { error: err instanceof Error ? err.message : String(err) },
      status: 'PENDING',
    });

    // Route manually if we got far enough
    const fresh = await Complaint.findById(complaintId);
    if (fresh && fresh.status === ComplaintStatus.ANALYZING) {
      await Complaint.updateOne(
        { _id: complaintId },
        {
          $set: { status: ComplaintStatus.NEEDS_REVIEW },
          $push: {
            statusHistory: {
              from: ComplaintStatus.ANALYZING,
              to: ComplaintStatus.NEEDS_REVIEW,
              by: complaint.reporterId,
              at: new Date(),
              note: 'Analysis failed — sent to manual review',
            },
          },
        },
      );
    }

    throw err;
  }
}

interface AnalysisContext {
  complaintId: string;
  imageBuffers: Buffer[];
  exifSummaries: ExifSummary[];
  forensicsResult?: ForensicsResult;
  vlmResult?: VlmResult;
  trustResult?: TrustResult;
  routingResult?: RoutingResult;
}

async function runStage(
  stage: AnalysisStage,
  complaint: IComplaint,
  ctx: AnalysisContext,
  config: OrchestratorConfig,
): Promise<void> {
  switch (stage) {
    case AnalysisStage.INGEST:
      await stageIngest(complaint, ctx, config);
      break;
    case AnalysisStage.FINGERPRINT:
      await stageFingerprint(complaint, ctx);
      break;
    case AnalysisStage.METADATA:
      await stageMetadata(complaint, ctx);
      break;
    case AnalysisStage.FORENSICS:
      await stageForensics(complaint, ctx);
      break;
    case AnalysisStage.EMBEDDING:
      await stageEmbedding(complaint, ctx, config);
      break;
    case AnalysisStage.VLM:
      await stageVlm(complaint, ctx, config);
      break;
    case AnalysisStage.DUPLICATES:
      await stageDuplicates(complaint, ctx, config);
      break;
    case AnalysisStage.TRUST:
      await stageTrust(complaint, ctx);
      break;
    case AnalysisStage.ROUTING:
      await stageRouting(complaint, ctx);
      break;
    case AnalysisStage.NOTIFY:
      // Notification is a placeholder — actual SSE/email is wired in Phase 3
      break;
  }
}

async function stageIngest(
  complaint: IComplaint,
  ctx: AnalysisContext,
  config: OrchestratorConfig,
): Promise<void> {
  for (const media of complaint.media) {
    if (media.kind !== 'complaint') continue;
    try {
      const buffer = await config.storage.getBuffer(media.key);

      // Decode and validate with sharp
      const img = sharp(buffer, { limitInputPixels: 100_000_000 });
      const meta = await img.metadata();

      // Create public copy (1280px max, no metadata, JPEG)
      const publicBuffer = await sharp(buffer)
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
        .removeAlpha()
        .jpeg({ quality: 85 })
        .toBuffer();

      const publicKey = `pub-${media.key.replace(/\.\w+$/, '.jpg')}`;
      await config.storage.putBuffer(publicKey, publicBuffer, 'image/jpeg');

      // Create thumbnail (224px)
      const thumbBuffer = await sharp(buffer)
        .resize(224, 224, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toBuffer();

      const thumbKey = `thumb-${media.key.replace(/\.\w+$/, '.jpg')}`;
      await config.storage.putBuffer(thumbKey, thumbBuffer, 'image/jpeg');

      // Update media record
      await Complaint.updateOne(
        { _id: complaint._id, 'media._id': media._id },
        {
          $set: {
            'media.$.publicKey': publicKey,
            'media.$.thumbKey': thumbKey,
            'media.$.width': meta.width,
            'media.$.height': meta.height,
          },
        },
      );

      ctx.imageBuffers.push(buffer);
    } catch (err) {
      // Log and continue — partial ingest is still useful
      ctx.imageBuffers.push(Buffer.alloc(0));
    }
  }
}

async function stageFingerprint(
  complaint: IComplaint,
  ctx: AnalysisContext,
): Promise<void> {
  for (let i = 0; i < complaint.media.length; i++) {
    const media = complaint.media[i]!;
    const buffer = ctx.imageBuffers[i];
    if (!buffer || buffer.length === 0) continue;

    const hashSha = sha256(buffer);
    const hashPHash = await pHash(buffer);
    const hashDHash = await dHash(buffer);

    await Complaint.updateOne(
      { _id: complaint._id, 'media._id': media._id },
      {
        $set: {
          'media.$.sha256': hashSha,
          'media.$.phash': hashPHash,
          'media.$.dhash': hashDHash,
        },
      },
    );
  }
}

async function stageMetadata(
  complaint: IComplaint,
  ctx: AnalysisContext,
): Promise<void> {
  for (let i = 0; i < complaint.media.length; i++) {
    const media = complaint.media[i]!;
    const buffer = ctx.imageBuffers[i];
    if (!buffer || buffer.length === 0) continue;

    const exif = await extractExif(buffer);
    ctx.exifSummaries.push(exif);

    if (Object.keys(exif).length > 0) {
      await Complaint.updateOne(
        { _id: complaint._id, 'media._id': media._id },
        {
          $set: {
            'media.$.exif': exif,
          },
        },
      );
    }
  }
}

async function stageForensics(
  complaint: IComplaint,
  ctx: AnalysisContext,
): Promise<void> {
  const buffer = ctx.imageBuffers[0];
  if (!buffer || buffer.length === 0) return;

  try {
    const result = await analyzeELA(buffer);
    ctx.forensicsResult = result;

    await Complaint.updateOne(
      { _id: complaint._id },
      {
        $set: {
          'analysis.forensics': {
            ela: result.ela,
            noise: result.noise,
          },
        },
      },
    );
  } catch {
    // Forensics failure is non-fatal
  }
}

async function stageEmbedding(
  complaint: IComplaint,
  ctx: AnalysisContext,
  config: OrchestratorConfig,
): Promise<void> {
  for (let i = 0; i < complaint.media.length; i++) {
    const media = complaint.media[i]!;
    const buffer = ctx.imageBuffers[i];
    if (!buffer || buffer.length === 0) continue;

    try {
      const embedding = await config.embedder.embed(buffer);

      await Complaint.updateOne(
        { _id: complaint._id, 'media._id': media._id },
        {
          $set: {
            'media.$.embedding': embedding,
          },
        },
      );
    } catch {
      // Embedding failure is non-fatal
    }
  }
}

async function stageVlm(
  complaint: IComplaint,
  ctx: AnalysisContext,
  config: OrchestratorConfig,
): Promise<void> {
  const validBuffers = ctx.imageBuffers.filter((b) => b.length > 0);
  if (validBuffers.length === 0) {
    ctx.vlmResult = fallbackVlmResult();
    return;
  }

  const { result, fromFallback } = await analyzeWithRetry(
    config.aiProvider,
    validBuffers.slice(0, 4),
    {
      title: complaint.title,
      description: complaint.description,
      citizenCategory: complaint.citizenCategory,
    },
  );

  ctx.vlmResult = result;

  await Complaint.updateOne(
    { _id: complaint._id },
    {
      $set: {
        'analysis.vlm': {
          ...result,
          fromFallback,
        },
        'analysis.modelVersions': {
          aiProvider: config.aiProvider.name,
          embedder: config.embedder.name,
        },
      },
    },
  );
}

async function stageDuplicates(
  complaint: IComplaint,
  _ctx: AnalysisContext,
  config: OrchestratorConfig,
): Promise<void> {
  const [lng, lat] = complaint.location.coordinates;

  const candidates = await findCandidates({
    coordinates: [lng, lat],
    radiusM: config.dupRadiusM,
    windowDays: config.dupWindowDays,
    excludeId: complaint._id.toString(),
  });

  if (candidates.length === 0) {
    await Complaint.updateOne(
      { _id: complaint._id },
      { $set: { 'analysis.dup': { candidates: 0, bestScore: 0, verdict: 'NONE' } } },
    );
    return;
  }

  // Compute text similarity
  const targetText = `${complaint.title} ${complaint.description ?? ''}`;
  simpleTextEmbedding(targetText); // computed for future use

  // Re-fetch complaint with latest hashes/embeddings
  const freshComplaint = await Complaint.findById(complaint._id).select('+media.embedding');
  if (!freshComplaint) return;

  const scores = scoreCandidates(
    freshComplaint,
    candidates,
    0, // Text sim computed per-candidate below
    { dupHigh: config.dupRadiusM > 0 ? 0.82 : 0.82, dupGrey: 0.65, radiusM: config.dupRadiusM },
  );

  const best = scores[0];

  await Complaint.updateOne(
    { _id: complaint._id },
    {
      $set: {
        'analysis.dup': {
          candidates: candidates.length,
          bestScore: best?.score ?? 0,
          bestMatch: best?.candidatePublicId,
          verdict: best?.verdict ?? 'NONE',
          scores: scores.slice(0, 5).map((s) => ({
            candidatePublicId: s.candidatePublicId,
            score: s.score,
            verdict: s.verdict,
          })),
        },
      },
    },
  );

  // Auto-link if high confidence
  if (best && best.verdict === 'HIGH') {
    await linkToCluster(complaint._id, best.candidateId);
  }
}

async function stageTrust(
  complaint: IComplaint,
  ctx: AnalysisContext,
): Promise<void> {
  const [lng, lat] = complaint.location.coordinates;

  const result = computeTrustScore({
    exifSummaries: ctx.exifSummaries,
    claimedLocation: { lat, lng },
    source: complaint.media[0]?.source ?? 'GALLERY',
    vlmResult: ctx.vlmResult,
    forensicsResult: ctx.forensicsResult,
  });

  ctx.trustResult = result;

  await Complaint.updateOne(
    { _id: complaint._id },
    {
      $set: {
        'analysis.trust': {
          score: result.score,
          verdict: result.verdict,
          signals: result.signals,
        },
      },
    },
  );
}

async function stageRouting(
  complaint: IComplaint,
  ctx: AnalysisContext,
): Promise<void> {
  // Re-fetch to get latest data
  const fresh = await Complaint.findById(complaint._id);
  if (!fresh) return;

  // Skip if already linked as duplicate
  if (fresh.status === ComplaintStatus.LINKED_DUPLICATE) return;

  const routingResult = await routeComplaint({
    complaint: fresh,
    vlmResult: ctx.vlmResult,
    fromFallback: ctx.vlmResult?.confidence === 0,
  });

  ctx.routingResult = routingResult;

  // Determine target status based on trust + routing
  let targetStatus: ComplaintStatus = routingResult.status;
  if (ctx.trustResult && ctx.trustResult.verdict !== 'PASS') {
    targetStatus = ComplaintStatus.NEEDS_REVIEW;
  }

  const updateFields: Record<string, unknown> = {
    wardId: routingResult.wardId,
    category: routingResult.category,
    departmentId: routingResult.departmentId,
    slaDueAt: routingResult.slaDueAt,
    severity: ctx.vlmResult?.severity ?? fresh.severity ?? 3,
    status: targetStatus,
  };

  if (routingResult.assigneeId && targetStatus === ComplaintStatus.ROUTED) {
    updateFields['assigneeId'] = routingResult.assigneeId;
    updateFields['status'] = ComplaintStatus.ASSIGNED;
    targetStatus = ComplaintStatus.ASSIGNED;
  }

  await Complaint.updateOne(
    { _id: complaint._id },
    {
      $set: updateFields,
      $push: {
        statusHistory: {
          from: fresh.status,
          to: targetStatus,
          by: fresh.reporterId,
          at: new Date(),
          note: routingResult.needsReviewReason ?? `Routed to ${routingResult.category}`,
        },
      },
    },
  );

  // Create review task if needed
  if (targetStatus === ComplaintStatus.NEEDS_REVIEW) {
    const reasons: string[] = [];
    if (routingResult.needsReviewReason) reasons.push(routingResult.needsReviewReason);
    if (ctx.trustResult?.verdict === 'REVIEW') reasons.push('Trust score requires review');
    if (ctx.trustResult?.verdict === 'REVIEW_HIGH') reasons.push('Trust score critically low');

    await ReviewTask.create({
      complaintId: complaint._id,
      reason: reasons.join('; '),
      evidence: {
        trustScore: ctx.trustResult?.score,
        trustSignals: ctx.trustResult?.signals,
        vlmConfidence: ctx.vlmResult?.confidence,
      },
      status: 'PENDING',
    });
  }
}
