# Nagrik Setu (नागरिक सेतु) — Viva Defense & Architecture Guide

> Comprehensive preparation guide for academic viva, project presentations, and code review.
> Answers each core design decision in under a minute with exact file traceability.

---

## 1. Why two frontends, and why is Express still there?

* **Next.js Citizen Portal (`apps/web`):**
  * Built for the public and citizens where **SEO, initial page load speed, and diverse rendering strategies matter**.
  * Uses **SSG** for static educational pages (`/`, `/how-it-works`), **ISR** for public aggregate dashboards (`/stats`, `/departments`), and **SSR** for dynamic complaint tracking (`/track/[id]`) with dynamic OpenGraph meta tags.
  * Direct browser-to-storage uploads via presigned URLs prevent multi-megabyte image payloads from traversing web server lambdas.
* **Vite + React Staff Console (`apps/admin`):**
  * Built as a high-density, low-latency **Single Page Application (SPA)** mounted at `/staff`.
  * Municipal officers and reviewers stay logged in all day triaging queues, comparing side-by-side ELA overlays, and executing state transitions without full-page server roundtrips.
* **Why Express (`apps/api`):**
  * Operates as the **single authoritative domain boundary** for the grievance lifecycle.
  * Owns transactional operations: user authentication with JWT family rotation, outbox event dispatching, image verification, and audit logs.
  * Enforces the architectural rule: *Next.js only writes `savedAreas` and `notificationPrefs`*; all complaint mutations must pass through Express.

*Traceability:* `apps/web/next.config.ts`, `apps/api/src/app.ts`, `apps/admin/src/app/App.tsx`, `docs/design.md §16.1`

---

## 2. How does duplicate detection work, and why can location alone never merge two complaints?

* **Multi-Signal Scoring Pipeline (`packages/domain/src/services/duplicate-scorer.ts`):**
  $$\text{Score} = w_{\text{phash}} S_{\text{phash}} + w_{\text{embed}} S_{\text{embed}} + w_{\text{geo}} S_{\text{geo}} + w_{\text{cat}} S_{\text{cat}} + w_{\text{time}} S_{\text{time}}$$
  * **Perceptual Hashing:** DCT 64-bit pHash; Hamming distance $\le 6$ triggers an instant near-duplicate override.
  * **Visual Embedding:** Cosine similarity of feature vectors ($\ge 0.88$).
  * **Geospatial Proximity:** Haversine distance decay within ward boundaries (50m, 140m, 400m radius).
  * **Categorical & Temporal Match:** Same category + filed within a 30-day rolling window.
* **Why location alone can NEVER merge two complaints:**
  * Two completely distinct civic grievances often happen at the exact same geographic point (e.g. a broken streetlight right above a burst water pipe).
  * Even within the same category, two distinct potholes can exist 20 meters apart on opposite sides of an intersection.
  * Merging based solely on GPS would cause **destructive false-merges**, closing real citizen issues without actual physical redressal.

*Traceability:* `packages/domain/src/services/duplicate-scorer.ts`, `packages/domain/src/services/candidate-search.ts`, `scripts/eval.ts`

---

## 3. Why is ELA (Error Level Analysis) only a weak signal? What fake images would the system miss?

* **How ELA Works (`packages/domain/src/services/forensics.ts`):**
  * Recompresses the candidate image at 95% JPEG quality and computes the per-pixel absolute difference matrix against the original.
  * Areas spliced or digitally modified at different times/software show higher error variance than the rest of the image.
* **Why it is a weak signal:**
  * **Platform Recompression:** Messaging apps (WhatsApp, Telegram) recompress all images to 70–80% JPEG quality upon sending, flattening error levels and creating uniform noise across the entire image.
  * **Camera Variations:** High-ISO night photos have natural sensor noise that can trigger false ELA anomalies.
* **What fake images would the system miss:**
  * **Native Generative AI:** Images synthesized end-to-end by Midjourney, Flux, or DALL-E have uniform noise characteristics and zero splicing seams.
  * **Off-the-web Pristine Photos:** A genuine, unmodified photo of a pothole from a different city has authentic EXIF and zero ELA error, but is geographically false (caught instead by cross-referencing reverse image hashing and GPS).

*Traceability:* `packages/domain/src/services/forensics.ts`, `packages/domain/src/services/trust-scorer.ts`

---

## 4. Why is nothing auto-rejected on authenticity alone?

* **Public Sector Governance Principle:**
  * Civic grievance portals are democratic citizen touchpoints. Auto-rejecting complaints based on probabilistic AI algorithms creates **algorithmic disenfranchisement**.
  * Citizens using older budget smartphones, screenshots of road damage, or compressed WhatsApp photos would be unfairly rejected.
* **Human-in-the-Loop Protocol:**
  * Suspect complaints (e.g. camera metadata mismatch, EXIF taken 300km away, or extreme ELA variance) are transitioned to `NEEDS_REVIEW`.
  * Public status reads **"Needs Verification"** (never "Fake" or "Rejected") to maintain dignity and trust.
  * Sent directly to the staff review workbench (`/staff/review`) where trained human municipal officers evaluate the evidence side-by-side before taking action.

*Traceability:* `packages/domain/src/services/trust-scorer.ts`, `apps/admin/src/app/App.tsx`, `docs/design.md §1`

---

## 5. Walk through what happens between pressing Submit and the officer seeing the complaint.

1. **Client Upload:** Browser requests a short-lived presigned upload URL from `/api/uploads/presign`, verifies magic bytes, and uploads binary directly to local storage / R2.
2. **Action Ingestion:** Citizen submits form to Next.js `submitComplaintAction`, which forwards payload with `mediaKeys` to Express `POST /complaints`.
3. **Database Transaction:** Express validates schema with Zod, checks ward intersection via MongoDB `$geoIntersects`, generates public ID (e.g. `NS-A1B2C3D4`), and saves the `Complaint` (`SUBMITTED`) and `OutboxEvent` in one atomic transaction.
4. **AI Orchestrator Pipeline (`runAnalysis`):**
   * *Stage 1 (Forensics):* Computes SHA-256, DCT pHash, dHash, extracts EXIF device/time/GPS, runs ELA analysis.
   * *Stage 2 (Vision Language Model):* VLM classifies category, severity (1–5), and extracts key visible entities.
   * *Stage 3 (Duplicate Search):* Queries nearby complaints within 500m using MongoDB `$near` 2dsphere index; computes multi-signal similarity scores.
   * *Stage 4 (Trust Scoring):* Compares claimed GPS vs EXIF GPS, checks editing software signatures, produces explainable trust score (0–100).
   * *Stage 5 (Routing & SLA):* Looks up ward department, assigns an SLA due date (e.g. 24h/48h/72h), and sets status to `ROUTED` or `ASSIGNED`.
5. **Staff Visibility:** The assigned municipal officer opens `/staff` and sees the grievance in their queue, prioritized by SLA deadline and cluster size.

*Traceability:* `packages/domain/src/services/analysis-orchestrator.ts`, `packages/domain/src/services/router.ts`, `apps/api/src/routes/complaints.ts`

---

## 6. Why SSR for tracking, ISR for stats, and CSR for the report form?

* **SSR for `/track/[id]`:**
  * Must reflect immediate status changes and timeline updates (e.g. when an officer marks progress).
  * Generates dynamic social OpenGraph metadata (`generateMetadata`) so citizens can share complaint links on WhatsApp.
  * Ensures privacy: server inspects auth cookies to decide whether to return `toOwnerDTO` (with private notes) or `toPublicDTO` (scrubbed).
* **ISR for `/stats` and `/departments`:**
  * Public aggregate data changes slowly but experiences high read traffic.
  * Revalidated in the background every 60 seconds (`revalidate = 60`), serving instantaneous static HTML from the CDN cache without hammering the database.
* **CSR for `/report`:**
  * Relies heavily on client device hardware APIs: HTML5 Geolocation (`navigator.geolocation`), file picker inputs, camera streams, and client-side image preview thumbnails.

*Traceability:* `apps/web/src/app/(citizen)/track/[id]/page.tsx`, `apps/web/src/app/(public)/stats/page.tsx`, `apps/web/src/app/(citizen)/report/page.tsx`

---

## 7. Where do Context, Redux Toolkit, Zustand, and React Query each apply?

| Tool | Where it is Used | Why it was Chosen |
|---|---|---|
| **Context API** | `AuthContext` in `apps/admin` | Global auth state, user identity, and role-based route guards across the app tree. |
| **TanStack Query** | Officer & Admin Queue in `apps/admin` | Caching server state, automatic refetching on window focus, loading/error boundary handling. |
| **Redux Toolkit** | Review Workbench in `apps/admin` | Complex client-side state: multi-photo candidate comparisons, ELA diff toggling, draft decisions with undo/redo. |
| **Zustand** | Report Wizard in `apps/web` | Lightweight, decoupled client-side form state persisted to IndexedDB across browser reloads. |

*Traceability:* `apps/admin/src/app/App.tsx`, `apps/web/src/app/(citizen)/report/page.tsx`, `docs/syllabus-mapping.md`

---

## 8. How is authorization enforced, and why is the proxy not enough?

* **Why Next.js Proxy/Middleware is Not Enough:**
  * Middleware runs at the edge/routing layer and only inspects cookie presence for redirects.
  * It cannot verify database-level permissions or protect against direct API calls, curl scripts, or malicious HTTP headers.
* **Defense-in-Depth Layering:**
  1. **Route Middleware (`apps/api/src/middleware/auth.ts`):** Cryptographically verifies JWT signatures, extracts subject, checks role allowlists (`requireRole(Role.OFFICER, Role.DEPT_ADMIN)`).
  2. **Service Ownership Checks:** In `/complaints/:publicId`, the route checks `complaint.reporterId === req.user.sub`.
  3. **Lint Guard (`no-restricted-imports`):** Enforces at build-time that Next.js server code cannot import direct domain mutation services (`createComplaint`, `transition`).

*Traceability:* `apps/api/src/middleware/auth.ts`, `apps/web/.eslintrc.json`, `apps/api/src/routes/admin.ts`

---

## 9. How did you test the AI parts without calling a real model?

* **Dependency Inversion with `AIProvider` Interface:**
  * Defined clean contracts: `AIProvider.analyze(context): Promise<VlmResult>`.
  * `MockProvider` and `StubEmbedder` return deterministic classifications and normalized vectors for tests.
* **Synthetic Transformation Matrix (`packages/domain/__tests__/services/duplicate-scorer.test.ts`):**
  * Generated programmatically transformed test fixtures: exact duplicates, resized, 90° rotated, recompressed, cropped, and unrelated samples.
* **Benefits:**
  * Full test suite of **187 tests runs in under 7 seconds**.
  * Zero test fragility from network flakes, quota limits, or API bills.
  * 100% reproducible benchmark evaluation metrics (`npm run eval`).

*Traceability:* `packages/domain/src/services/ai-provider.ts`, `packages/domain/src/services/embedding.ts`, `scripts/eval.ts`

---

## 10. What are the known limitations and what would you do with another month?

* **Current Known Limitations:**
  * **Social Media Compression:** ELA can yield inconclusive results on heavily compressed images from WhatsApp/Telegram.
  * **Free-Tier Memory Limits:** Local CLIP embedding requires 512MB+ RAM; system uses stub/caption embedding fallbacks on low-tier instances.
  * **Single-Region Storage:** Local storage driver used in dev; production R2 driver requires bucket CORS configuration.
* **If Given Another Month:**
  * **Mobile Native App (React Native):** Hardware-attested camera capture using device secure enclave to guarantee photo capture timestamp and location.
  * **Satellite Image Verification:** Automated cross-referencing with municipal GIS satellite layers to verify road condition anomalies.
  * **Real-time WebSockets / Push Notifications:** Replacing polling/SSE tickets with full-duplex WebSockets for instantaneous officer dispatch.

*Traceability:* `docs/runbook.md §7`, `docs/evaluation.md`, `README.md`
