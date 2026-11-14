# Tasks: Smart Grievance Redressal & Fake Complaint Detection System

> Revised delivery plan, 28 Oct 2026. Keep the existing ordered phases; added quality gates below are required before declaring completion.

Deadline: submit on **Thu 19 Nov 2026** (20 Nov is spare). Planning date: Wed 28 Oct. That is 23 days.

## How this plan works

The work is split into six phases. **Every phase ends with a demo gate**, a short list of things you can show working. A phase is finished only when its gate passes and the build is green, then you tag the release. If you run out of time, the last tagged release is still a complete, demonstrable project.

| Phase | Dates | Result at the end |
|---|---|---|
| 0 Risk spikes | 28 Oct (first day, may spill into the morning of 29 Oct) | Five risky pieces of the Vercel + Render setup proven in throwaway code |
| 1 Walking skeleton | 28 Oct to 1 Nov | Citizen submits and tracks complaints (no AI) |
| 2 AI core | 2 to 6 Nov | Duplicates, fake signals, categorisation, routing work |
| 3 Staff console | 7 to 11 Nov | Officers resolve, reviewers decide, admins manage |
| 4 Depth and syllabus | 12 to 13 Nov | Next.js features, optimistic UI, SEO, analytics |
| 5 Production release | 14 to 16 Nov | Live HTTPS deployment, CI/CD, monitoring, backups, load-test numbers, real-photo evaluation |
| 6 Freeze and viva | 17 to 19 Nov | Docs, report, demo, rehearsal, submit |

Tier tags: `MUST` (project is incomplete without it), `SHOULD` (strong value, finish if on schedule), `COULD` (first to cut).

### Checkpoints and the cut line
- At the end of each phase, compare against the date. If you are **more than one day behind**, drop `COULD` tasks from the current and later phases, then `SHOULD` tasks in later phases, in that order. Never drop a `MUST` to keep a `COULD`.
- Never start a phase on a red build.
- Cut order if time is tight: SLA escalation (6.3), retention jobs (7.9), Zustand in the staff console (8B.6; Zustand is still shown in the citizen wizard), Hindi beyond the main flow, heat map, Edge handler. Production tasks (Phase 5) and the MUST tasks are never cut: a smaller product that is live, monitored, and tested beats a bigger one that only runs on your laptop.
- Phase 6 is a freeze: no new features, only fixes for bugs found while rehearsing.

### Rules for every task
- A task is **done** only when its own tests pass, `npm run typecheck`, `npm run lint`, and the full test suite are green.
- If a check fails: read the error, find the root cause, fix, re-run. Do not skip, mute, or delete tests to pass.
- Tick the box and make one commit (`type(scope): message`) only after green.
- Task IDs are stable labels used by `requirements.md` and `syllabus-mapping.md`. Their order in this file is the build order, not the numeric order.
- `Refs` point to requirement IDs in `requirements.md`.

---

## Phase 0: Risk spikes

**Dates:** Wed 28 Oct, half a day, before Phase 1. Throwaway code in a `spikes/` folder that is deleted afterwards.

**Result:** the riskiest assumptions of the Vercel + Render setup are proven or replaced before any real work depends on them.

- [x] **S.1 Image embeddings under a 512 MB limit**: try local CLIP through `@huggingface/transformers` and measure RAM and time; also try one hosted multimodal embedding API and the caption-text fallback (embed the VLM caption). Check current free-tier limits of any API. Pick the production approach and record why. Local CLIP is expected to be too heavy for a 512 MB Render instance. `MUST`
- [x] **S.2 sharp ELA and pHash**: recompress, difference, DCT hash on a sample image with `limitInputPixels` set; measure peak memory for a 12 MP photo. `MUST`
- [x] **S.3 Vercel monorepo build**: deploy a hello-world Next.js app that imports `packages/shared` and the lightweight `packages/domain` contracts and connects to Atlas with a cached Mongoose connection to create, read, update, and delete a `savedAreas` document (the only collection Next.js writes); confirm the Vite build copied into `public/staff` loads at `/staff` with SPA fallback; confirm no BullMQ or complaint write service is bundled into the Next.js build; run a single-node MongoDB replica set locally and confirm a transaction works. `MUST`
- [x] **S.4 Cross-service plumbing**: from the Vercel app, (a) call an authenticated Express endpoint through a Vercel rewrite and check that cookies stay first-party, (b) obtain a one-use stream ticket by POST and open an SSE connection directly to Render with it, with CORS and a polling fallback, and confirm a reused or expired ticket is rejected, (c) save a complaint plus an outbox event in one transaction and see the dispatcher enqueue it. `MUST`
- [x] **S.5 Direct upload**: browser compresses a 6 MB photo, uploads it to R2 with a presigned URL (with CORS), and a Vercel Server Action receives only the key. Confirm a 6 MB file does not go through Vercel at all. `MUST`

**Gate:** all five work and their findings are written to `docs/decisions.md`. If one fails, the replacement is chosen now.

---

## Phase 1: Walking skeleton, no AI yet

**Dates:** Wed 28 Oct to Sun 1 Nov (5 days)

**Result:** A citizen can register, log in, submit a complaint with photos and GPS, and track it. Data is stored, images are validated, wards are seeded.

- [x] **0.1 Monorepo scaffold** `MUST`: npm workspaces (`apps/web` Next.js citizen portal, `apps/admin` Vite React staff console, `apps/api` Express, `packages/shared` schemas, `packages/domain` models and services), TypeScript strict, shared tsconfig base, ESLint + Prettier, Husky + lint-staged + commitlint, `.editorconfig`, `.gitignore`, `.env.example`.
  Test: `npm run typecheck && npm run lint` pass on empty projects. Refs: NFR-8
- [x] **0.2 Local development stack** `MUST`: Docker Compose with a single-node MongoDB replica set (needed for transactions), redis, and api (with worker) for local development, plus a script that runs the web and admin dev servers; Next.js rewrites `/api/staff` to the local API so the browser sees one origin. Production does not use Compose.
  Test: script that waits for `/health` returns 200. Refs: NFR-10
- [x] **0.3 Config module** `MUST`: Zod-validated env loader that fails fast with a readable message.
  Test: unit tests for missing, malformed, and valid env. Refs: NFR-3
- [x] **0.4 Shared package** `MUST`: enums (roles, statuses, category codes), state-transition table, Zod schemas for auth and complaint payloads.
  Test: transition table unit tests (every valid and a sample of invalid transitions). Refs: FR-7.1
- [x] **0.5 API skeleton** `MUST`: Express 5 app factory, pino-http with request IDs, helmet, cors, hpp, mongo-sanitize, central error handler producing the standard error format, `/health` and `/ready`.
  Test: Supertest for 404, validation error shape, health. Refs: NFR-3, NFR-7
- [x] **1.1 User model + register/login service** `MUST` (in `packages/domain`, used by Next.js and Express): argon2id, Zod validation, access and refresh cookies, rotation with token-family revocation on reuse.
  Test: register, duplicate email, wrong password, token rotation, reuse detection. Refs: FR-1.1 to FR-1.3
- [x] **1.3 RBAC middleware** `MUST`: `requireRole(...)`, ownership checks helper.
  Test: matrix test: every protected route × every role returns expected 401/403/200. Refs: FR-1.5
- [x] **2.1 Department, Category, Ward models** `MUST` with `2dsphere` index on ward geometry; seed script with 3 sample wards (GeoJSON), 8+ departments, categories with bilingual labels and SLAs.
  Test: seed is idempotent; point-in-ward query returns the right ward. Refs: FR-6.1, FR-2.4
- [x] **3.1 Storage adapter** `MUST`: interface with presigned PUT and GET URLs (type and size constrained, short expiry), local-disk driver for development, S3-compatible driver (R2) for production, both behind the same contract tests.
  Test: put/get/delete, traversal attempts rejected. Refs: FR-2.3
- [x] **3.2 Media intake** `MUST`: presign endpoint, post-upload verification (HEAD size and type), worker-side magic-byte check and full decode, `sharp` re-encode with `limitInputPixels`, HEIC to JPEG, orientation fix, public copy without metadata, thumbnail, private original, clear failure reasons.
  Test: fixtures for valid JPEG/PNG/WebP, fake extension, corrupt file, oversized, polyglot (JPEG with appended script), EXIF GPS stripped from public copy. Refs: FR-2.3
- [x] **7.2 Complaint creation service** `MUST` (`packages/domain`): Zod validation, ward check, idempotency key; the complaint and its outbox event are written in one transaction. Exposed as an Express endpoint that the Next.js Server Action in 8A.4 calls.
  Test: success, no image and no text rejected, 5 images rejected, outside ward rejected, repeat key returns same complaint, rate limit. Refs: FR-2.1 to FR-2.7
- [x] **7.3 Read services and endpoints** `MUST`: mine, by publicId, nearby (anonymous and PII hidden) all as Express endpoints (Next.js server components call them with the user's session); pagination caps.
  Test: authorization and privacy assertions per role; anonymous reporter never exposed. Refs: FR-8.1, FR-8.2, NFR-4
- [x] **7.12 Public DTO allowlists and location privacy** `MUST`: allowlisted DTO mappers for every public response and export (no raw EXIF, storage keys, reporter IDs, embeddings, or internal notes), public map coordinates rounded to a grid or jittered, anonymous complaints excluded from public lists.
  Test: snapshot tests for every public DTO plus a test that fails if any private field appears; a coordinate-order test that fails if latitude and longitude are swapped. Refs: FR-11.1, FR-11.2, FR-8.2
- [x] **8A.1 App scaffold** `MUST`: App Router structure, route groups `(public)` and `(citizen)`, nested layouts, `loading.tsx`, `error.tsx`, `not-found.tsx`, Tailwind, shadcn/ui.
  Test: RTL for layouts; Playwright confirms navigation and error pages. Refs: NFR-5
- [x] **8A.2 Authentication and RBAC** `MUST`: login and register Server Actions with Zod that call the Express auth endpoints (Express sets the signed httpOnly session cookie and Next.js only verifies it), `proxy.ts` for route protection and locale, role checks in server code (never only in the proxy).
  Test: logged-out redirect, wrong-role denial, session expiry, tampered cookie rejected. Refs: FR-1
- [x] **8A.4 Report flow** `MUST`: client wizard (camera, gallery, compression, geolocation, map pin), Zustand draft store with IndexedDB persistence, direct upload of compressed images to storage through presigned URLs, `submitComplaint` Server Action with Zod that receives object keys, idempotency key, `useActionState` for errors.
  Test: step validation, geolocation denied path, upload validation errors surfaced, double-submit creates one complaint. Refs: FR-2
- [x] **8A.5 Tracking page** `MUST`: `/track/[id]` SSR, `generateMetadata`, timeline, duplicate banner with "needs verification" wording, client island using SSE from the API with polling fallback and cleanup.
  Test: all statuses render, metadata correct, live update arrives. Refs: FR-8.1, FR-5.4
- [x] **8A.9 Database integration** `MUST`: Mongoose connection (cached, small pool) for the Next.js-owned collections `savedAreas` and `notificationPrefs`: create, read, update, delete through Server Actions and a Route Handler, Zod validation, validated env, a saved-areas page, and a `no-restricted-imports` lint rule that stops Next.js server code importing complaint write services.
  Test: integration tests against the memory server for all four CRUD operations and the per-user limit; lint rule fails on a forbidden import. Refs: FR-8.6
  Test: integration tests against memory server through the same services the actions call. Refs: NFR-3

**Demo gate for this phase (all must be true):**
- [x] Fresh `docker compose up` starts everything and `/health` is green
- [x] Register, log in, and log out in the browser
- [x] Submit a complaint with a photo, GPS, and a pin on the map; invalid and oversized files are rejected with clear messages
- [x] Tracking page shows the complaint and its first timeline entry; a different user cannot open it
- [x] typecheck, lint, and all tests green. Tag `v0.1`

## Phase 2: AI core (the heart of the project)

**Dates:** Mon 2 Nov to Fri 6 Nov (5 days)

**Result:** Every submitted complaint is analysed in the background: fingerprinted, checked for duplicates and manipulation signals, categorised, scored, and routed.

- [x] **3.3 Image fixture generator** `MUST` for tests: original, resized, recompressed, cropped, mirrored, brightness-shifted, spliced, unrelated, with and without EXIF (write EXIF with `piexifjs` or equivalent in test helper).
  Test: generator is deterministic. Refs: design §12
- [x] **4.1 Hashing** `MUST`: SHA-256, DCT pHash, dHash, Hamming distance.
  Test: identical → 0; resized/recompressed ≤ 6; mirrored and unrelated ≥ 20; known vector check against a hand-computed small case. Refs: FR-3.1
- [x] **4.2 EXIF summary** `MUST`: normalise GPS, time, device, software; handle missing and malformed EXIF.
  Test: fixtures with and without fields. Refs: FR-3.2
- [x] **4.3 Forensics** `MUST`: ELA stats, region ratio, noise-block anomaly, overlay generator.
  Test: spliced fixture scores above original fixtures on average; assert relative ordering, not absolute magic numbers; overlay dimensions correct. Refs: FR-5.1
- [x] **4.4 Embedding service** `MUST`: `ImageEmbedder` interface with local CLIP, remote API, and caption-only implementations, chosen by `EMBEDDING_PROVIDER`; L2 normalisation, cosine helper, test stub.
  Test: normalised length ≈ 1; same image cosine ≈ 1; unrelated lower than similar; duplicate scoring still works when the embedder is unavailable (weights renormalised). Real-model and real-API tests are opt-in. Refs: FR-3.1
- [x] **4.5 AI provider interface + MockProvider + Gemini adapter** `MUST`: prompt builder, strict Zod parsing, retry once, timeout, typed errors.
  Test: valid JSON, invalid JSON then valid, invalid twice → fallback error, timeout. Real adapter tested with recorded fixtures (no network in CI). Refs: FR-3.3 to FR-3.6
- [x] **4.6 Text-only fallback classifier** `MUST` (keyword and embedding based) used when the VLM fails.
  Test: Hindi and English samples map to expected categories. Refs: FR-3.4, FR-3.5
- [x] **4.7 Geo helpers** `MUST`: haversine, GeoJSON builders, radius checks.
  Test: known city-pair distances within tolerance. Refs: FR-5.1
- [x] **5.1 Candidate search** `MUST`: `$near` query with status and time filters.
  Test: with real `2dsphere` index in memory-server, items at 50 m, 140 m, 400 m, closed, and old. Refs: FR-4.1
- [x] **5.2 Duplicate scorer** `MUST`: formula and rescaling from `design.md` §4, override rules, thresholds from config.
  Test: table-driven cases: exact copy, resized, cropped, mirrored, different pothole 40 m away (must not reach high), same user identical bytes (blocked). Refs: FR-4.2 to FR-4.5
- [x] **5.3 Cluster service** `MUST`: link, priority bump, split.
  Test: cluster size changes priority; split restores both complaints independently. Refs: FR-4.3, FR-4.6, FR-4.7
- [x] **5.4 Trust scorer** `MUST`: signals table with explainable output.
  Test: each signal alone, combinations, floor and cap, bonus for camera source. Refs: FR-5.1 to FR-5.4
- [x] **6.1 Router** `MUST`: ward lookup, category decision rules, officer assignment, SLA computation.
  Test: confident AI, disagreement, low confidence → triage, no ward → reject, severity halves SLA, least-workload assignment. Refs: FR-6.2 to FR-6.4
- [x] **6.2 Transition service** `MUST` using the shared table; writes history and audit.
  Test: every illegal transition rejected, every legal one recorded. Refs: FR-7.1
- [x] **7.1 Analysis orchestrator and worker** `MUST`: stage-by-stage persistence, resume on retry, idempotent, DLQ handling. Runs inside the API process when `RUN_WORKER=1`. The outbox dispatcher publishes pending events to BullMQ, and a reconciler re-enqueues anything stuck in `SUBMITTED` or `ANALYZING`; Redis loss must not lose a complaint.
  Test: full run with MockProvider; kill after stage 3 and resume; poison job lands in failed set and creates a review task. Refs: NFR-2, FR-3.4
- [x] **5.5 Evaluation script** `MUST` `npm run eval`: builds the synthetic labelled set, runs the engines, prints recall / false-merge, writes `docs/evaluation.md`.
  Test: script runs end to end; thresholds from requirements §7 asserted in a test. Tune weights if not met, re-run. Refs: §7

**Demo gate for this phase (all must be true):**
- [x] Submit the same photo from two accounts: the second is linked to the first as a duplicate
- [x] Submit a resized or cropped copy: still linked; a different pothole nearby: not linked
- [x] A photo whose EXIF location is far from the claimed one lands in NEEDS_REVIEW with the reason listed
- [x] A normal complaint is categorised, assigned to a department and officer, and gets an SLA due time
- [x] Provider failure (mock set to fail) still routes the complaint to triage and loses nothing
- [x] `npm run eval` prints duplicate recall and false-merge numbers. Tag `v0.2`

## Phase 3: Staff console and complaint lifecycle

**Dates:** Sat 7 Nov to Wed 11 Nov (5 days)

**Result:** Officers resolve complaints, reviewers decide flagged ones, admins manage data. This is the React + Vite console (INT252).

- [x] **2.2 Admin CRUD** `MUST` for departments, categories, wards, users with audit logging.
  Test: per-role access, audit entries created. Refs: FR-9.4
- [x] **2.3 Audit log service** `SHOULD`: append-only writer, no update/delete exposed.
  Test: attempts to modify through the service API are impossible (type-level and runtime). Refs: FR-9.4
- [x] **6.4 Resolution flow** `MUST`: photo required, geo within radius, run authenticity checks, before/after VLM comparison, reopen and auto-close after 7 days.
  Test: far-away photo rejected, unrelated photo flagged, reopen path, auto-close job. Refs: FR-7.2, FR-7.4, FR-7.5
- [x] **7.5 Officer endpoints** `MUST`: status update, resolve.
  Test: only assigned officer or department admin; invalid transitions rejected. Refs: FR-7.1, FR-7.2
- [x] **7.6 Review queue endpoints** `MUST`: list, decide (approve, reject, merge, reroute), split cluster.
  Test: decision changes status, penalties applied and reversible, audit written. Refs: FR-9.1, FR-5.3
- [x] **7.11 Appeals and challenges** `SHOULD`: a citizen can challenge a duplicate link or a review decision; the original complaint ID and timeline are preserved; the appeal appears in the reviewer queue and the decision is audited with a reason.
  Test: appeal creates a review task, timeline intact, audit entry present. Refs: FR-10.2, FR-10.3
- [x] **7.7 Events and notifications** `SHOULD`: Redis pub/sub events, email adapter, unread API; one SSE endpoint on the API using one-use stream tickets (about 30 seconds, bound to the user, obtained by an authenticated POST, redacted from logs) and a CORS allowlist, used by citizens and staff, with a polling fallback.
  Test: event received after status change, no cross-user leaks. Refs: FR-8.3
- [x] **8B.1 Vite setup** `MUST`: TypeScript, Tailwind, ESLint, environment variables, feature-based folder structure, base path `/staff/`.
  Test: build succeeds, env typing checked. Refs: NFR-8
- [x] **8B.2 Routing** `MUST`: nested and layout routes, dynamic routes (`queue/:clusterId`), query-param filters, protected routes with role checks, lazy-loaded feature routes.
  Test: RTL with memory router for guards, params, redirects, 404. Refs: FR-1.5
- [x] **8B.3 Context and HTTP layer** `MUST`: Auth, Theme, and Locale contexts; Axios instance with refresh interceptor and error normalisation.
  Test: MSW for 401 then refresh then retry; failed refresh logs out. Refs: FR-1.2
- [x] **8B.4 Server state with TanStack Query** `MUST`: officer queue, complaint detail, review tasks; caching, background refetch, optimistic status updates, reusable loading, error, and empty components.
  Test: cache hit, refetch on focus, rollback on failed mutation. Refs: FR-6, FR-7
- [x] **8B.5 Redux Toolkit review workspace** `MUST`: slice for selected cluster, evidence view mode, decision draft and undo; selectors; an async thunk that submits the decision.
  Test: reducer and selector unit tests; thunk success and failure. Refs: FR-9.1
- [x] **8B.7 Forms and validation** `MUST`: controlled admin forms (departments, categories, users, wards) with React Hook Form + Zod and dynamic errors; uncontrolled search box and GeoJSON file input using refs.
  Test: invalid, valid, and server-error submissions; accessibility labels and error association. Refs: FR-9, NFR-5
- [x] **8B.8 Reusable components and performance** `MUST`: DataTable with composition (`Table.Header`, `Table.Row`), Modal, StatusBadge; `React.memo`, `useMemo`, `useCallback` on large lists; before/after Profiler numbers saved in `docs/`.
  Test: render-count assertions on memoised rows. Refs: NFR-1
- [ ] **8B.9 Custom hooks** `SHOULD`: `useDebounce`, `useSSE` (with cleanup and reconnect), `useMediaQuery`, `useGeolocation`.
  Test: fake timers, cleanup on unmount, no leaked listeners. Refs: FR-8.3
- [x] **8B.10 Analytics and review UI** `MUST`: charts, heat map, ELA overlay toggle, side-by-side compare, score breakdown, decision buttons.
  Test: renders empty and populated data; decision payloads. Refs: FR-9.1 to FR-9.3

**Demo gate for this phase (all must be true):**
- [x] Officer logs in at `/staff`, sees clusters sorted by priority and SLA, and resolves one with a geo-checked photo
- [x] Reviewer opens a flagged complaint, sees evidence and score breakdown, approves, rejects, or merges
- [x] Admin creates a department, a category, and a user; every action appears in the audit log
- [x] Citizen sees the status change on the tracking page
- [x] Route guards work for all four roles
- [x] Appeal flow works end to end (if 7.11 is in scope). Tag `v0.3`

## Phase 4: Citizen portal depth and remaining syllabus topics

**Dates:** Thu 12 Nov to Fri 13 Nov (2 days)

**Result:** Next.js rendering strategies, route features, optimistic UI, SEO, analytics, and Hindi support.

- [x] **8A.1b Internationalization** `SHOULD`: `next-intl` with `/en` and `/hi` route prefixes, locale files, language switch, `proxy.ts` locale handling. Hindi can start with the report flow and tracking page only.
  Test: RTL for language switch; Playwright confirms `/hi` routes render Hindi strings. Refs: FR-8.5
- [x] **8A.3 Rendering strategies** `MUST`: SSG for landing and how-it-works, ISR for `/stats` and `/departments`, on-demand revalidation through `POST /api/revalidate` and `revalidateTag`.
  Test: build output shows the expected static/ISR markers; revalidation route rejects without the secret; data refreshes after revalidation. Refs: FR-9.2
- [x] **8A.6 Nearby with parallel and intercepting routes** `MUST`: `@map` and `@list` slots, `(.)complaint/[id]` modal over the map, full page on direct load, Leaflet via `next/dynamic` (`ssr: false`).
  Test: Playwright checks modal on soft navigation and full page on refresh. Refs: FR-8.2
- [x] **8A.7 Mutations and optimistic UI** `MUST`: upvote with `useOptimistic` and rollback, feedback and reopen Server Actions, cache tag invalidation.
  Test: optimistic state, rollback on failure, one upvote per user. Refs: FR-8.2, FR-7.4, FR-8.4
- [x] **8A.8 Route Handlers** `MUST`: `GET /api/public/stats`, dynamic `GET/PATCH /api/complaints/[id]`, `POST /api/uploads/presign`, Edge runtime `GET /api/geo/reverse` with caching headers.
  Test: each HTTP method and status code, auth on protected handlers, edge handler runs without Node-only imports. Refs: FR-8.3
- [x] **8A.10 Performance and SEO** `MUST`: `next/image` for thumbnails, Metadata API on public pages, sitemap and robots, `next/dynamic` for heavy parts, Web Vitals reporting.
  Test: build script checks route sizes against the budget; Lighthouse run recorded in `docs/`. Refs: NFR-6
- [x] **7.4 Upvote, reopen, feedback endpoints** `SHOULD`: Express endpoints called by the Server Actions in 8A.7.
  Test: one upvote per user, owner-only reopen within 7 days. Refs: FR-8.2, FR-7.4, FR-8.4
- [x] **7.8 Analytics endpoints** `SHOULD`: summary, heatmap grid, CSV export.
  Test: aggregations against seeded data with known answers. Refs: FR-9.2, FR-9.3, FR-9.5
- [ ] **8B.6 Zustand UI store** `COULD`: sidebar, table density, saved filters with `persist`.
  Test: persistence and reset. Refs: NFR-6
- [ ] **8B.11 Accessibility pass** `SHOULD`: semantic landmarks, keyboard flow, focus management, `vitest-axe` on main screens.
  Test: zero axe violations. Refs: NFR-5
- [ ] **6.3 SLA and escalation job** `COULD`: BullMQ repeatable job escalates overdue complaints one level at a time.
  Test: fake clock moves past SLA, escalation level increments, notifications queued, no double escalation. Refs: FR-7.3

**Demo gate for this phase (all must be true):**
- [x] Static, ISR, and SSR pages visibly differ in the production build output
- [x] Nearby page shows map and list as parallel routes and opens a complaint modal through an intercepting route
- [x] Upvote updates instantly and rolls back on failure
- [x] Public stats page, tracking page metadata, and sitemap work
- [x] `/hi` routes work for the main citizen flow
- [x] `docs/syllabus-mapping.md` has file paths for everything finished so far. Tag `v0.4`

## Phase 5: Production release

**Dates:** Sat 14 Nov to Mon 16 Nov (3 days)

**Result:** the system runs live on Vercel and Render, is deployed by CI/CD, monitored, backed up, load-tested, and evaluated on real photos.

- [x] **0.6 CI workflow** `MUST`: GitHub Actions running the gate order from `design.md` §12.
  Test: workflow lints with `actionlint` if available; local `npm run ci` runs the same chain. Refs: NFR-8
- [ ] **1.2 Brute-force protection** `SHOULD`: Redis-backed rate limit and temporary lockout.
  Test: 6th attempt blocked, unblocks after window (fake timers). Refs: FR-1.4
- [ ] **1.4 Email verification and password reset** `SHOULD`: single-use expiring tokens, mail adapter with console/file transport in dev.
  Test: token expiry, reuse, tamper. Refs: FR-1.6
- [x] **1.5 CSRF double-submit token** `MUST` for state-changing requests.
  Test: missing/mismatched token rejected. Refs: NFR-3
- [ ] **7.9 Retention and privacy jobs** `SHOULD`: delete originals after retention, user data export and delete.
  Test: fake clock; deleted data is gone from storage and DB. Refs: NFR-4
- [x] **7.10 Security sweep** `MUST`: confirm every route has validation, rate limit, and auth; add a test that enumerates registered routes and fails if any lacks a declared policy.
  Refs: NFR-3
- [x] **8A.11 Testing overview** `SHOULD`: unit tests for Server Actions (mocked services), RTL for client components, Playwright happy paths.
  Refs: NFR-8
- [x] **8A.12 Production build and deployment** `MUST`: `next build`, environment configuration per stage, error logging (pino on server, `error.tsx` reporting hook), deployment guide.
  Test: production build deployed to a Vercel preview and smoke tested. Refs: NFR-7
- [x] **8B.12 Debugging and deployment** `MUST`: React DevTools and Profiler findings written up, production build optimisation, env configuration, static build copied into the Next.js `public/staff` folder and served at `/staff` on Vercel with an SPA fallback rewrite.
  Test: built app smoke tested on a Vercel preview deployment. Refs: NFR-7
- [ ] **9.1 Playwright scenarios** `MUST`: (a) citizen submits, officer resolves with photo, citizen reopens; (b) two citizens submit same photo → second linked as duplicate; (c) suspicious image goes to the review queue, reviewer approves; (d) role isolation.
  Test: all pass headless against the local stack with MockProvider. Refs: all
- [ ] **9.2 Failure drills** `SHOULD`: provider down, Redis restart, Mongo restart, corrupt upload, huge payload.
  Test: automated where possible; document results. Refs: NFR-2
- [ ] **9.3 Load test** `MUST`: 50 concurrent submissions, record p95 and queue drain time in `docs/evaluation.md`.
  Refs: NFR-1
- [ ] **9.4 Dependency and secret audit** `MUST`: `npm audit --omit=dev`, secret scan, fix high/critical.
  Refs: NFR-3
- [ ] **9.5 Real-provider evaluation** `MUST`: run category accuracy on a 100-image sample with the real provider, commit the report; adjust prompt and thresholds if below target, re-run.
  Refs: §7

- [ ] **11.1 Hosting setup**: Vercel project for `apps/web` (build copies `apps/admin` into `public/staff`), Render paid always-on web service for the API and worker (Render documents Free instances as not for production) plus a Render Key Value instance (the Free one is in-memory only; the outbox makes that survivable), Atlas cluster and user, R2 bucket with CORS, environment variables on each platform, regions chosen close together, `render.yaml` and `vercel.json` committed. `MUST`
  Test: live HTTPS URLs work; a complaint submitted on production reaches ROUTED; cold start behaviour measured and written down. Refs: NFR-12
- [ ] **11.2 CI/CD**: GitHub Actions runs typecheck, lint, tests, build; Render deploys only after CI passes and Vercel production deploys only from `main` after checks; rollback to the previous deploy practised once on each platform. `MUST`
  Test: a deliberately failing commit does not reach production; a good commit does; rollback drill recorded. Refs: NFR-12
- [ ] **11.3 Production storage**: R2 driver verified against the real bucket with presigned upload and download, private originals, lifecycle rule for abandoned uploads. `MUST`
  Test: contract tests against the real bucket in a one-off run; no public listing; expired presign rejected. Refs: NFR-4
- [ ] **11.4 Observability**: pino JSON logs with request IDs (viewed in Render and Vercel logs), Sentry for web, admin, and API, queue depth and analysis-time metrics exposed on a protected endpoint, external uptime monitor on `/ready` and the home page with alerts. `MUST`
  Test: trigger an error and see it in Sentry with the request ID; stop the worker (or block the queue) and see the alert fire. Refs: NFR-7, NFR-13
- [ ] **11.5 Backups and restore drill**: scheduled GitHub Actions job runs `mongodump`, encrypts it, stores it in R2 with retention; restore into a clean database and verify counts. `MUST`
  Test: restore log saved to `docs/runbook.md`. Refs: NFR-12
- [ ] **11.6 Production security**: security headers and CSP in `next.config` and `helmet`, secrets only in platform environment settings (none in git history, scan with gitleaks), least-privilege Atlas user with TLS, session and stream-ticket secrets rotated once as a drill, Dependabot enabled, `npm audit` clean of high and critical, cookie flags verified in production. `MUST`
  Test: security-header scan and an OWASP ZAP baseline scan against the live site; results and fixes recorded. Refs: NFR-3
- [ ] **11.7 Demo data and safe public mode**: seeded demo accounts per role, sample complaints using your own photos, per-IP rate limits, upload limits, and a scheduled job that resets demo data nightly. `MUST`
  Test: a public visitor can try the full flow without breaking it. Refs: NFR-12
- [x] **11.8 Runbook and architecture decisions**: `docs/runbook.md` (deploy, rollback, restore, rotate secrets, common failures, cold start behaviour) and short ADRs for the main choices (two frontends, direct uploads, no vector DB, human review over auto-reject, worker in the API process). `SHOULD`
- [x] **11.9 Resume assets**: README with live URL, architecture diagram, 60-second demo GIF, screenshots, measured numbers from 9.3 and 9.5 only, honest limitations section, and a CI status badge. `MUST`

**Demo gate for this phase (all must be true):**
- [ ] The public HTTPS URL works from your phone on mobile data and a second person can use it
- [ ] A push to `main` deploys automatically after CI passes; a broken commit does not; rollback tested on Vercel and Render
- [ ] Backup restored into a clean database successfully; cold-start behaviour documented
- [ ] Sentry receives a test error; uptime monitor is green
- [ ] Load test and real-photo evaluation numbers are in `docs/evaluation.md`, including failures
- [ ] Playwright scenarios pass against the local stack and a smoke run passes against production
- [ ] No high or critical audit findings; no secrets in git history. Tag `v1.0-rc`

## Phase 6: Freeze, documentation, demo, viva

**Dates:** Tue 17 Nov to Thu 19 Nov (3 days). Fri 20 Nov is spare, not planned work.

**Result:** No new features. Fix only bugs found in rehearsal.

- [x] **10.1 README** `MUST`: what it is, architecture picture, one-command setup, env table, how to run tests, how the AI pipeline works, known limitations (ELA false positives, VLM errors, privacy notes).
- [x] **10.2 Seed demo data and a scripted demo** `MUST` (users for each role, sample complaints, sample images).
- [x] **10.3 Final full-pipeline run** `MUST`: fresh clone → `docker compose up` → seed → all test suites → build → e2e. Everything green. Update `docs/evaluation.md` with final numbers.

**Demo gate for this phase (all must be true):**
- [x] Clean-clone run of the full pipeline passes
- [x] `docs/syllabus-mapping.md` complete with real file paths and honest N/A entries
- [x] Every item under 'Release quality gates' is ticked with evidence (command output, report, or screenshot)
- [x] README lets a stranger understand the project in two minutes and run it locally in ten; live URL included
- [x] Project report, architecture diagram, and screenshots ready
- [x] 5-minute demo script rehearsed twice; viva questions rehearsed (see end of this file). Submit on 19 Nov

---

## Definition of done (project)
All `MUST` tasks ticked; the app is live on HTTPS with CI/CD, monitoring, and a tested restore; CI green on a clean clone; coverage of at least 80% on services and utils; evaluation numbers reported honestly, including failures; no TODO or FIXME without an issue reference; no unused dependencies, dead code, or commented-out blocks; `docs/syllabus-mapping.md` complete.

## Viva questions to rehearse (answer each in under a minute)
1. Why two frontends, and why is Express still there?
2. How does duplicate detection work, and why can location alone never merge two complaints?
3. Why is ELA only a weak signal? What fake images would your system miss?
4. Why is nothing auto-rejected on authenticity alone?
5. Walk through what happens between pressing Submit and the officer seeing the complaint.
6. Why SSR for tracking, ISR for stats, and CSR for the report form?
7. Where do Context, Redux Toolkit, Zustand, and React Query each apply, and why not just one?
8. How is authorization enforced, and why is the proxy not enough?
9. How did you test the AI parts without calling a real model?
10. What are the known limitations and what would you do with another month?



## Release quality gates (all must pass before v1.0)

These gates supplement the task-specific tests above and are mandatory before calling the project ready.

### Security/privacy gate
- [ ] Role × endpoint × ownership/department authorization matrix passes.
- [ ] Anonymous identity is absent from public DTOs, logs, CSVs, notifications and public map results.
- [ ] CSRF/origin protections, refresh-token reuse revocation, brute-force limits, IDOR, NoSQL injection, XSS and mass-assignment tests pass.
- [ ] Upload pipeline rejects spoofed types, malformed files, oversized images and pixel bombs; public derivatives have no EXIF; originals remain private.
- [ ] Presigned upload URL expiry, object-key ownership, allowed method and size are tested.
- [ ] AI output cannot cause privileged actions or bypass domain validation; provider failure preserves the complaint.
- [ ] Reviewer override, merge/split, reassignment, suspension and export actions are audited with actor, reason and correlation ID.

### Reliability gate
- [ ] Kill the worker during processing and demonstrate safe resume without duplicate side effects.
- [ ] Replay the outbox/reconcile job and demonstrate no lost or duplicated complaint.
- [ ] Demonstrate retry/backoff, terminal failure visibility, dead-letter handling and a recovery runbook.
- [ ] Restore a backup into a clean environment and verify a sample of records and media references.
- [ ] Exercise the platform rollback procedure and record evidence.

### AI evaluation gate
- [ ] Report duplicate precision, recall, false-merge rate and per-transformation results (exact, resize, recompress, crop, mirror, edit, unrelated).
- [ ] Report classification accuracy and a confusion matrix on a labelled dataset; disclose sample size, categories, provider/model version and limitations.
- [ ] Track review rate and reviewer overrides. Do not tune thresholds only to the test fixtures; keep a held-out evaluation subset.
- [ ] Include Hindi and English text cases, malformed model responses, provider timeout/quota failure and no-image/text-only fallback.
- [ ] Never claim AI authenticity detection proves a photo is genuine or fake.

### Accessibility, usability and performance gate
- [ ] Core report/track/reopen flows work at mobile widths and slow-network simulation.
- [ ] Keyboard-only navigation, visible focus, labels, contrast, reduced motion and accessible error announcements are checked.
- [ ] Measure initial JavaScript budget from build output.
- [ ] Load test with a documented dataset and concurrency; report p50/p95, throughput, queue drain time, worker memory and failure rate.
- [ ] Verify map coordinate order with a test designed to fail if latitude and longitude are swapped.

### Scope and date management
The existing 19 Nov 2026 deadline is aggressive for a solo developer and the proposed two-frontend architecture. Keep the two frontends only because both are explicitly required; do not expand into native mobile apps, microservices, Kubernetes, open-web reverse image search or custom model training. If more than one day behind, cut `COULD` then `SHOULD` items as the plan says, but never cut core authorization, upload safety, human review, recovery or the final deployment/verification gates.

