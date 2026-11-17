// Models
export { User, type IUser } from './models/user';
export { Department, type IDepartment } from './models/department';
export { Category, type ICategory } from './models/category';
export { Ward, type IWard } from './models/ward';
export { Complaint, type IComplaint, type IMedia, type IStatusHistoryEntry } from './models/complaint';
export { OutboxEvent, type IOutboxEvent } from './models/outbox-event';
export { Upvote, type IUpvote } from './models/upvote';
export { AuditLog, type IAuditLog } from './models/audit-log';
export { ReviewTask, type IReviewTask, Notification, type INotification, Appeal, type IAppeal } from './models/review';
export { Contractor, type IContractor } from './models/contractor';
export { Project, type IProject, ProjectStatus } from './models/project';
export { Bid, type IBid, BidStatus } from './models/bid';

// Services — Auth
export * as authService from './services/auth';
export type { TokenPair, AuthConfig, AccessPayload } from './services/auth';

// Services — Storage
export { LocalDiskDriver, type StorageDriver, type PresignedUrl } from './services/storage';

// Services — Complaint lifecycle
export { createComplaint, type CreateComplaintOpts } from './services/complaint';
export { transition } from './services/transition';
export { findWardForPoint } from './services/ward';
export { toPublicDTO, toOwnerDTO, PRIVATE_FIELDS, type ComplaintPublicDTO, type ComplaintOwnerDTO } from './services/dto';
export { seed, seedDemoUsers } from './services/seed';

// Services — Media
export {
  validatePresignRequest,
  generatePresignedUrls,
  detectMimeFromMagicBytes,
  verifyUpload,
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_SIZE,
  type PresignRequest,
  type PresignResult,
  type VerifyResult,
} from './services/media';

// Services — AI Core
export { sha256, pHash, dHash, hammingDistance } from './services/hashing';
export { extractExif, hasEditingSoftware, EDITING_SOFTWARE, type ExifSummary } from './services/exif';
export { analyzeELA, type ForensicsResult } from './services/forensics';
export { haversineDistance, geoPoint, isWithinRadius, coordsToLatLng } from './services/geo';
export {
  vlmResultSchema,
  type VlmResult,
  type AIProvider,
  type AnalysisContext as AIAnalysisContext,
  MockProvider,
  buildPrompt,
  parseVlmResponse,
  fallbackVlmResult,
  analyzeWithRetry,
} from './services/ai-provider';
export { classifyByKeywords } from './services/text-classifier';
export {
  type ImageEmbedder,
  l2Normalize,
  cosineSimilarity,
  StubEmbedder,
  simpleTextEmbedding,
} from './services/embedding';
export { findCandidates, type CandidateSearchOpts } from './services/candidate-search';
export { scoreCandidate, scoreCandidates, type DuplicateScore, type DuplicateScorerConfig } from './services/duplicate-scorer';
export { linkToCluster, splitFromCluster, computeClusterPriority } from './services/cluster';
export { computeTrustScore, type TrustSignal, type TrustResult, type TrustInput, type TrustConfig } from './services/trust-scorer';
export { routeComplaint, type RoutingResult, type RoutingInput } from './services/router';
export { runAnalysis, type OrchestratorConfig } from './services/analysis-orchestrator';
