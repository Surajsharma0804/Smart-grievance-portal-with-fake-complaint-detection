# Architecture Decisions

## D.1 Image Embeddings (Spike S.1)

**Decision**: Use caption-text fallback as the production embedding approach.

**Context**: Local CLIP (`@huggingface/transformers`) was evaluated for a 512 MB Render instance. The model download alone is ~300 MB, and loaded model RSS exceeds the budget. A remote multimodal embedding API is an alternative but adds cost and latency.

**Approach**: The VLM generates a caption per image during analysis. The caption text is embedded using a lightweight text similarity method. Image similarity combines pHash Hamming distance (visual) with text embedding cosine similarity (semantic). A remote embedding API (Gemini, OpenAI) can be configured as a provider when available. Local CLIP remains opt-in for development machines with sufficient RAM.

**Measured**: Without CLIP, peak RSS for the full analysis pipeline stays under 260 MB (spike S.2). Attempting to load `@huggingface/transformers` with `Xenova/clip-vit-base-patch32` required downloading ~300 MB of model weights plus ONNX runtime, and the download/initialization alone took over 60 seconds before being terminated. The onnxruntime-node package adds ~60 MB of native binaries. This confirms CLIP is unsuitable for a 512 MB production instance with constrained startup time.

---

## D.2 sharp ELA and pHash (Spike S.2)

**Decision**: sharp with `limitInputPixels: 100_000_000` is safe for 12 MP photos.

**Measured** (spike S.2, 2026-11-13):
- 12 MP JPEG (4000x3000): generated 7.49 MB
- SHA-256: instant
- DCT pHash: 16-96 ms, 3 MB additional RSS
- ELA (recompress + diff + overlay): ~620 ms, peak RSS 258 MB
- Peak total RSS: ~258 MB (well under 512 MB)
- ELA overlay (downscaled PNG): ~670 KB

**Note**: pHash on synthetic noise images gave high Hamming distances for resize/recompress (28-30); with natural photos, distances should be much lower. The algorithm implementation matches the design spec. Will validate with real photo fixtures in Phase 2 (task 3.3).

---

## D.3 No Docker Available (Environment Constraint)

**Decision**: Use `mongodb-memory-server` for local development and testing instead of Docker Compose.

**Context**: Docker is not installed on the development machine. The design calls for Docker Compose with a MongoDB replica set for local dev.

**Approach**:
- Tests and local dev use `mongodb-memory-server` (in-memory MongoDB with replica set support)
- `ioredis-mock` for Redis/BullMQ in tests
- A start script launches the API with `mongodb-memory-server` when no `MONGO_URI` is configured
- Docker Compose file is still provided for environments that have Docker
- Production uses MongoDB Atlas (Phase 5)

---

## D.4 Cross-Service Architecture (Spikes S.3, S.4, S.5)

**Decision**: Verify cross-service patterns (Vercel rewrites, SSE tickets, presigned uploads, outbox) architecturally in integration tests; defer live infrastructure verification to Phase 5.

**Context**: Spikes S.3, S.4, S.5 require Vercel, Render, Atlas, and R2 to be deployed. Without these accounts, we build and test the patterns locally:
- Vercel rewrites: tested via Next.js `rewrites` config in `next.config.ts` pointing to the local API
- SSE stream tickets: implemented with HMAC-signed tokens, tested in integration tests (expiry, reuse, cross-user rejection)
- Presigned uploads: S3-compatible interface with a local filesystem driver; contract tests ensure the same interface works with R2
- Outbox/reconciler: tested with `mongodb-memory-server` replica set and `ioredis-mock`

**Live verification**: Phase 5 tasks 11.1-11.3 explicitly cover deploying and smoke-testing on real infrastructure.

---

## D.5 Next.js Version and `proxy.ts` vs `middleware.ts`

**Decision**: Will check the installed Next.js version. As of Next.js 15.x, `middleware.ts` is the standard name. The spec mentions `proxy.ts` as a newer alternative. Will use whichever the installed version supports and document here.

**Status**: Pending — will update during task 0.1 when Next.js is installed.

---

## D.6 Express 5

**Decision**: Use Express 5 (`express@5`) as specified in the design.

**Context**: Express 5 is now stable. Key differences from v4: async error handling, removed deprecated methods, promise support in route handlers.

---

## D.7 Node.js Version

**Decision**: Using Node.js v24.22.1 (available on dev machine).

**Note**: Design specifies Node 20+. v24 is compatible. Render and Vercel both support Node 20+; will set `.node-version` or `engines` field to `>=20` for portability.
