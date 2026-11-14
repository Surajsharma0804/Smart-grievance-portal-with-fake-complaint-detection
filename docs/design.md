# Design: Smart Grievance Redressal & Fake Complaint Detection System

> Revised research-backed design, 28 Oct 2026. Apply Section 16 as an architecture decision record where it clarifies or supersedes earlier implementation details.

Traces to `requirements.md`. Requirement IDs are cited as (FR-x) / (NFR-x).

## 1. Tech stack

The project uses **two frontends on purpose**, because each fits a different kind of user and each lets us apply one course properly.

| App | Technology | Used by | Why this one |
|---|---|---|---|
| `apps/web` | **Next.js (App Router)** + React + TypeScript (INT257) | Citizens and the public | SEO, shareable tracking links, server rendering, Server Actions for forms and uploads |
| `apps/admin` | **React + Vite + React Router** SPA (INT252) | Officers, reviewers, admins | Behind login, highly interactive, no SEO need, heavy client state |
| `apps/api` | Express 5 + BullMQ worker | Staff console, analysis pipeline | Long-running worker with CLIP loaded in memory does not belong in serverless handlers |
| `packages/domain` | Business rules, Zod-backed DTOs, Mongoose models (kept light: no BullMQ, no `sharp`) | Express (all complaint-domain writes); Next.js (types, DTOs, its own collections) | One copy of the rules: complaint creation, duplicate engine, trust scorer, router, state machine |
| `packages/shared` | Zod schemas, enums, types | Everything | One validation source for forms, actions, and API |

### Citizen portal (Next.js, INT257)

| Concern | Choice |
|---|---|
| Routing and rendering | App Router, layouts, route groups, SSR, SSG, ISR, Server and Client Components |
| Mutations | Server Actions with Zod, direct-to-storage uploads through presigned URLs, `useActionState`, `useOptimistic` |
| API | Route Handlers (REST, dynamic handlers, presign endpoint, one Edge runtime handler) |
| Auth | Signed httpOnly session cookie, `proxy.ts` (called middleware in older versions) for route protection, role checks in server code; login and registration call the Express API, which sets the cookie, and Next.js only verifies it |
| Database | Mongoose (an ODM, the document-database equivalent of an ORM) for the citizen-owned collections `savedAreas` and `notificationPrefs`, with full CRUD and a cached connection. Complaint data is read and written through the Express API |
| UI | Tailwind CSS, shadcn/ui, `next/image`, `next/dynamic`, Leaflet |
| i18n | `next-intl`, `/en` and `/hi` |
| Draft state | Zustand store for the report wizard |
| SEO and performance | Metadata API, sitemap, robots, Web Vitals reporting |
| Tests | Vitest, React Testing Library, Playwright |

### Staff console (React + Vite, INT252)

| Concern | Choice |
|---|---|
| Tooling | Vite, TypeScript, ESLint, feature-based folders, environment variables |
| Routing | React Router: nested and layout routes, dynamic routes, query params, protected routes, lazy routes |
| Styling | Tailwind CSS, responsive breakpoints, semantic HTML, accessibility |
| Server state | TanStack Query (caching, background refetch, optimistic updates) with Axios (interceptors for refresh) |
| Global state | **Context** (auth, theme, locale), **Redux Toolkit** (review workspace), **Zustand** (UI preferences) |
| Forms | Controlled forms with React Hook Form + Zod; uncontrolled search and file inputs with refs |
| Performance | `useMemo`, `useCallback`, `React.memo`, Profiler measurements |
| Custom hooks | `useDebounce`, `useSSE`, `useMediaQuery`, `useGeolocation` |
| Tests | Vitest, React Testing Library, MSW, `vitest-axe` |

### Backend, data, and AI

| Layer | Choice |
|---|---|
| API | Node 20+, Express 5, TypeScript, Zod, helmet, express-rate-limit, hpp, express-mongo-sanitize |
| DB | MongoDB 7 with `2dsphere` indexes |
| Queue | BullMQ + Redis (also pub/sub for status events) |
| Image | `sharp`, `exifr` |
| Embeddings | `ImageEmbedder` interface: local CLIP (`@huggingface/transformers`) for development, a remote embedding API for hosted production, and a caption-text fallback; the choice is made in spike S.1 |
| Vision-language model | Provider interface: Gemini default, Claude/OpenAI adapters, `MockProvider` for tests |
| Auth primitives | argon2id, signed JWT session in httpOnly cookies |
| Realtime | Server-Sent Events from the Express API with short-lived signed tokens, polling fallback (Vercel functions are a poor fit for long-lived streams) |
| Logging | pino, pino-http |
| Quality | ESLint, Prettier, Husky, lint-staged, commitlint, GitHub Actions |
| Ops | Vercel (Next.js and the built staff console), Render (API and worker), MongoDB Atlas, Cloudflare R2, Docker Compose for local development only |

Repo layout (npm workspaces):

```
/
  apps/
    web/            Next.js citizen portal
    admin/          Vite + React staff console
    api/            Express staff API and analysis worker
  packages/
    domain/         Mongoose models and services used by web and api
    shared/         Zod schemas, enums, types, constants
  docs/             design notes, syllabus-mapping, evaluation report
  docker-compose.yml   local development stack
  render.yaml          Render service definitions
  vercel.json          Vercel configuration and rewrites
  README.md
```

## 2. Architecture

```
Browser
  │  one origin: https://<your-app>.vercel.app  (or your domain)
  ▼
Vercel
  ├─ /            Next.js citizen portal (server components, Server Actions, Route Handlers)
  ├─ /staff/*     Vite staff console, built and copied into apps/web/public/staff
  └─ /api/staff/* rewrite (proxy) ─► Render
                                      │
Render web service "api" (Express + BullMQ worker in one process, RUN_WORKER=1)
  ├─ staff REST API, SSE endpoint, HMAC-signed internal endpoints
  ├─ worker: ingest, hash, forensics, embedding, VLM, duplicates, trust, routing
  └─ Render Key Value (Redis, private network, queue only)

External: MongoDB Atlas (data) · Cloudflare R2 (images, presigned upload and download)
          · AI provider APIs · Sentry · uptime monitor
```

Citizen actions run through Next.js Server Actions/Route Handlers as a thin backend-for-frontend layer; authoritative writes go through the Express API and `packages/domain`. The API persists the complaint and a durable outbox event, then the worker dispatcher publishes analysis work to BullMQ/Redis. A reconciler recovers pending outbox items and stuck `SUBMITTED`/`ANALYZING` complaints. The Next.js app never talks to Redis and does not mutate complaint-domain collections; it owns only the citizen preference collections listed in §16.1. Images never pass through Vercel functions: the browser uploads compressed images straight to R2 using short-lived presigned URLs, and the Server Action sends only object keys to the API. Staff actions also go through Express. Status changes reach browsers through the API SSE endpoint using a one-use stream ticket (see §16.5); polling is the fallback.

The worker runs inside the API process on Render to keep the hosting bill small. The code supports splitting it into a separate Render background worker later (`RUN_WORKER=0` on the API, `1` on the worker).

## 3. Analysis pipeline

Each stage is a pure-ish function with typed input and output, tested alone. The orchestrator persists after every stage so a retry resumes rather than restarts.

1. **Ingest** — read the original from storage, decode with `sharp` (rejects corrupt files), auto-orient, produce a 1280 px public JPEG without metadata, and a 224 px thumbnail. (FR-2.3)
2. **Fingerprint** — SHA-256 of original bytes; pHash: resize to 32×32 grayscale, 2D DCT, take the top-left 8×8, threshold at median excluding DC, 64-bit value stored as 16 hex chars; dHash: 9×8 grayscale horizontal gradient. Hamming distance on XOR. (FR-3.1)
3. **Metadata** — `exifr` for GPS, DateTimeOriginal, Make, Model, Software. Normalise to a typed `ExifSummary`. (FR-3.2)
4. **Forensics** — ELA: recompress at JPEG quality 90, absolute difference, amplify; compute mean, std, and block-wise max of the difference. Report region variance ratio (max block mean / global mean). Noise check: Laplacian variance per block, flag blocks deviating more than 3 sigma. Output numbers plus a downscaled overlay PNG for reviewers. These are **indicators**, not verdicts. (FR-5.1, FR-5.5)
5. **Embedding** — through the `ImageEmbedder` interface: local CLIP (512-d, L2-normalised) in development, a remote multimodal embedding API when hosted, or a caption-only mode where the VLM caption is embedded as text and image similarity relies on pHash. Text embedding of title + description uses a text embedding model (multilingual if Hindi quality needs it). (FR-3.1)
6. **Vision-language analysis** — one call per complaint with up to 4 images. Prompt pins the schema (see §5.3). Temperature 0. Output validated by Zod, retry once, fall back. (FR-3.3, FR-3.4)
7. **Duplicate search** — see §4.
8. **Trust scoring** — see §6.
9. **Routing** — see §7.
10. **Notify** — write timeline event, push SSE event, queue email.

Concurrency: worker concurrency 2 by default, CLIP model loaded once per process and reused. Jobs have `attempts: 3`, exponential backoff, and move to a failed set that a reviewer sees as "analysis failed, route manually". (NFR-2)

## 4. Duplicate detection design

Candidate query (cheap, index-backed):

```js
Complaint.find({
  status: { $in: OPEN_STATES },
  createdAt: { $gte: now - windowDays },
  location: { $near: { $geometry: point, $maxDistance: radiusMeters } },
})
```

Then score each candidate in memory (N is small after the geo filter, so no vector database is required; this removes a hard dependency on Atlas):

```
imageSim  = max over image pairs of (1 - hamming(pHash)/64)
embedSim  = max cosine(imageEmbedding)
textSim   = cosine(textEmbedding)           // 0 if no text
distScore = 1 - distance/radius
sameCat   = category equal ? 1 : 0

dupScore  = 0.35*imageSim' + 0.30*embedSim' + 0.15*textSim + 0.10*distScore + 0.10*sameCat
```

If no image embedding is available (provider down or caption-only mode), drop `embedSim`, renormalise the remaining weights, and re-validate thresholds with `npm run eval`.

`imageSim'` and `embedSim'` are rescaled so that "unrelated" maps near 0 (e.g. pHash Hamming ≥ 20 → 0, ≤ 6 → 1). Thresholds in config: `DUP_HIGH = 0.82`, `DUP_GREY = 0.65`. Rules that override the score: exact SHA-256 match from the same user → block (FR-4.5); exact SHA-256 match from a different user → strong fake/reuse signal sent to review, not auto-merge.

Cluster model: `primaryId` on the duplicate points to the cluster head; head holds `clusterSize`, `reporters[]`. Priority = base severity + `min(2, floor(log2(clusterSize)))`. (FR-4.3, FR-4.6)

Different-but-same-place issues (two different potholes 40 m apart) are protected by requiring a visual component: geo proximity alone can never reach `DUP_HIGH`.

## 5. Data model (Mongoose)

### 5.1 Collections

**User**: `_id, name, email, phone?, passwordHash, role, departmentId?, wardIds[], emailVerifiedAt?, reputation{ confirmed, rejected, score }, suspendedUntil?, createdAt`. Index: `email` unique, `role`.

**Department**: `_id, code, name, categories[], defaultSlaHours, escalationChain[userId]`.

**Ward**: `_id, code, name, geometry (Polygon/MultiPolygon, 2dsphere), departmentOfficerPools{ departmentId → userId[] }`.

**Category**: `_id, code, label{en,hi}, departmentId, slaHours, keywords[]`.

**Complaint**:
```
_id, publicId (e.g. NS-2026-000123), reporterId, anonymous,
title, description, language,
location { type:'Point', coordinates:[lng,lat] }, accuracyM, address?, landmark?, wardId?,
media[ { _id, kind:'complaint'|'resolution', key, publicKey, thumbKey, sha256, phash, dhash,
         embedding:[Number] (select:false), exif, source:'camera'|'gallery', width, height } ],
citizenCategory?, category, subCategory?, severity, priority,
status, statusHistory[ { from,to,by,at,note } ],
departmentId?, assigneeId?, slaDueAt, escalationLevel,
analysis { stage, startedAt, finishedAt, vlm{...}, forensics{...}, dup{...}, trust{...}, modelVersions{} },
clusterId?, primaryId?, clusterSize, upvotes,
idempotencyKey, createdAt, updatedAt
```
Indexes: `location 2dsphere`; `{status:1, createdAt:-1}`; `{departmentId:1, status:1}`; `{reporterId:1, createdAt:-1}`; `{clusterId:1}`; unique `{reporterId:1, idempotencyKey:1}`; `media.sha256` multikey.

**Upvote**: `{complaintId, userId}` unique compound.
**OutboxEvent** (Express-owned): `{type, complaintId, payload, status: pending|dispatched, attempts, createdAt, dispatchedAt}`, written in the same transaction as the complaint.
**Appeal** (Express-owned): `{complaintId, reporterId, targetType: duplicate|review, reason, status, decidedBy, decision, createdAt}`.
**SavedArea** (Next.js-owned): `{userId, label, center (Point), radiusM, categories[]}`; at most 5 per user.
**NotificationPrefs** (Next.js-owned): `{userId, channels{inApp,email}, quietHours?, language}`.
**Notification**: `{userId, complaintId, type, payload, readAt, createdAt}`.
**AuditLog** (append-only; no update/delete routes): `{actorId, action, entity, entityId, before, after, ip, at}`.
**ReviewTask**: `{complaintId, reason, evidence, status, resolvedBy, resolution}`.

### 5.2 Why embeddings live on the media subdocument
They are read only by the worker and duplicate engine, are excluded by default (`select: false`), and never leave the server.

### 5.3 VLM response schema
```ts
const VlmResult = z.object({
  category: z.enum(CATEGORY_CODES),
  subCategory: z.string().max(60).optional(),
  severity: z.number().int().min(1).max(5),
  caption: z.string().max(200),
  textImageConsistency: z.number().min(0).max(1),
  flags: z.object({
    screenshot: z.boolean(), stockPhoto: z.boolean(),
    irrelevantImage: z.boolean(), faceProminent: z.boolean(),
    possiblyAiGenerated: z.boolean(),
  }),
  confidence: z.number().min(0).max(1),
});
```
The prompt includes the category list with one-line definitions and instructs the model to answer `Other` with low confidence rather than guess.

## 6. Trust scoring

Start at 100 and subtract penalties; floor 0. Every contribution is stored as `{signal, value, penalty, reason}`.

| Signal | Condition | Penalty |
|---|---|---|
| EXIF GPS mismatch | distance to claimed > 500 m | 30 (scaled up to 40 by distance) |
| EXIF time stale | capture older than 72 h | 15 |
| Editing software tag | Photoshop, GIMP, Snapseed, etc. | 15 |
| No EXIF, source gallery | missing | 5 |
| ELA / noise anomaly | region ratio above tuned threshold | 10 to 20 |
| Cross-user perceptual match | older complaint, different user, Hamming ≤ 6 | 40 |
| Text-image mismatch | consistency < 0.4 | 25 |
| Flags | screenshot 15, stock 30, AI-generated hint 15, irrelevant 30 | as listed |
| Reputation | prior confirmed-fake count | 5 per, max 20 |
| Burst | more than 5 complaints in 10 min | 15 |
| Bonus | `camera` source with fresh GPS within 50 m | +10 (cap 100) |

Verdict bands (config): `≥ 70` pass, `40 to 69` needs review, `< 40` needs review with high priority. Nothing is auto-rejected (FR-5.2). Weights are constants in one file with unit tests, so tuning is a one-line change plus an updated evaluation run.

## 7. Routing algorithm

```
1. wardId  = Ward.findOne({ geometry: { $geoIntersects: { $geometry: point } } })   // none → reject (FR-2.4)
2. aiCat   = vlm.category, aiConf = vlm.confidence
3. if citizenCategory and agrees with aiCat           → category = aiCat
   if aiConf ≥ 0.75                                   → category = aiCat
   if aiConf < 0.6 or strong disagreement             → triage queue (FR-6.3)
   else                                               → category = citizenCategory
4. dept    = Category(category).departmentId
5. officer = least open complaints among ward pool of dept (tie → oldest last assignment)
6. slaDueAt = now + Category.slaHours (halved for severity ≥ 4)
```
Department and ward lookups are cached in memory with a short TTL and invalidated on admin edits.

## 8. State machine

```
SUBMITTED → ANALYZING → ROUTED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                  │          ▲                                │
                  ├→ NEEDS_REVIEW ──(reviewer)───────────────┘→ REOPENED → ASSIGNED
                  └→ LINKED_DUPLICATE
```
Transitions are declared in a table `{from: [allowed to]}` in `shared`, enforced by one `transition()` service that also writes `statusHistory` and an audit entry. No route changes `status` directly.

## 9. API surface (REST, prefix `/api/v1`)

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | /auth/register, /auth/login, /auth/refresh, /auth/logout | public | rate limited |
| POST | /auth/verify-email, /auth/forgot, /auth/reset | public | |
| GET | /me | any | |
| POST | /complaints | citizen | multipart, idempotency key header, returns 202 |
| GET | /complaints/mine | citizen | paginated |
| GET | /complaints/:publicId | owner / assigned / admin | includes timeline |
| GET | /complaints/nearby?lat&lng&radius | any auth | non-anonymous, open only |
| POST | /complaints/:id/upvote | citizen | |
| POST | /complaints/:id/reopen, /feedback | owner | |
| GET | /officer/queue | officer | clusters, sorted by priority and SLA |
| POST | /complaints/:id/status | officer | transition with note |
| POST | /complaints/:id/resolve | officer | multipart resolution photo |
| GET | /admin/review-tasks | reviewer | |
| POST | /admin/review-tasks/:id/decide | reviewer | approve, reject, merge, reroute |
| POST | /admin/clusters/:id/split | reviewer | |
| CRUD | /admin/departments, /categories, /wards, /users | admin | |
| GET | /analytics/summary, /analytics/heatmap | dept admin / reviewer | |
| GET | /events | any auth | SSE stream |
| GET | /health, /ready | public | |

The table is the logical API. Citizen operations are exposed by Next.js (Server Actions and Route Handlers) and staff operations by Express, both calling `packages/domain`.

Error format: `{ error: { code, message, details? , requestId } }`. Zod errors map to 422.

## 10. Frontend design

### 10.1 Citizen portal (Next.js)

Rendering strategy, chosen per route and explained in the viva:

| Route | Strategy | Reason |
|---|---|---|
| `/[locale]` landing, `/[locale]/how-it-works` | SSG | Static, instant |
| `/[locale]/stats` (public city statistics) | ISR, `revalidate: 60`, plus on-demand `revalidateTag` after status changes | Fresh enough, cheap |
| `/[locale]/departments` | ISR | Rarely changes |
| `/[locale]/track/[id]` | SSR with `generateMetadata`, plus a client island for live SSE updates | Shareable link, live status |
| `/[locale]/report` | CSR wizard (camera, geolocation, IndexedDB draft) with a Server Action submit | Needs browser APIs |
| `/[locale]/nearby` | Parallel routes `@map` and `@list`; intercepting route `(.)complaint/[id]` opens a modal over the map, full page on direct visit | Showcases parallel and intercepting routes |
| `/[locale]/my` | Server Component, cache tags, loading UI | Authenticated, per-user |

Other pieces: route groups `(public)` and `(citizen)`, `loading.tsx`, `error.tsx`, `not-found.tsx` at each level, `proxy.ts` for session redirects and locale handling, `next/image` for thumbnails, `next/dynamic` with `ssr: false` for Leaflet.

Server Actions (all validated with the shared Zod schemas): `submitComplaint` (receives object keys of images already uploaded to storage), `upvoteComplaint` (with `useOptimistic`), `submitFeedback`, `reopenComplaint`, `login`, `register`. Each of these calls the Express API. `saveArea` and `updateNotificationPrefs` are the exceptions: they write the Next.js-owned collections directly with Mongoose.

Route Handlers: `GET /api/public/stats`, `GET/PATCH /api/complaints/[id]` (dynamic), `POST /api/uploads/presign` (returns presigned upload URLs with size and type limits), `POST /api/revalidate` (secret protected), and `GET /api/geo/reverse` on the **Edge runtime** (stateless reverse geocoding with caching headers).

### 10.2 Staff console (React + Vite)

Feature-based folders:

```
src/
  app/            router, providers, store setup
  features/
    auth/  queue/  review/  complaints/  admin/  analytics/
      components/  hooks/  api/  schemas/  routes.tsx
  components/     shared UI (DataTable, Modal, StatusBadge, Field)
  hooks/          useDebounce, useSSE, useMediaQuery, useGeolocation
  lib/            axios instance, query client, utils
```

Routes: `/staff/login`, then a protected layout route with nested children: `queue`, `queue/:clusterId`, `review`, `review/:taskId`, `admin/departments`, `admin/categories`, `admin/wards`, `admin/users`, `analytics`. Filters live in query parameters. Each feature route is lazy loaded.

### 10.3 State management: where each tool is used

| Kind of state | Tool | Where |
|---|---|---|
| Local UI state | `useState`, `useReducer` | Modals, form steps, toggles |
| Cross-cutting, rarely changing | Context | Auth user, theme, locale (staff console) |
| Complex workflow state | Redux Toolkit slice with selectors and an async thunk | Review workspace: selected cluster, evidence view mode, decision draft, undo |
| Lightweight global preferences | Zustand with `persist` | Staff: sidebar, table density, saved filters. Citizen: report wizard draft |
| Server state | TanStack Query | All fetched lists and details, with cache and background refetch |

Rule of thumb written into the README: data from the server goes in Query, never copied into Redux; Redux only holds decisions the user is composing.

### 10.4 Shared UI conventions
Every screen has loading, empty, and error states. English and Hindi strings in locale files. Large touch targets, visible focus, semantic HTML, labels on every control. Components that render lists of 100+ rows use `React.memo`, `useMemo`, and stable callbacks, with a Profiler measurement recorded in `docs/`.

## 11. Security design (NFR-3, NFR-4)
- Cookies: `httpOnly`, `secure` in prod, `sameSite=lax`; CSRF protected for state-changing requests with a double-submit token header. Vercel serves Next.js and the staff console and proxies `/api/staff/*` to Render with a rewrite, so the browser sees one origin and cookies stay first-party. If a custom domain is used, cookies may instead be scoped to the parent domain.
- Upload hardening: client-side compression, presigned PUT URLs that fix content type and maximum size and expire in minutes, random object keys, verification after upload (HEAD size and type), magic-byte check and full decode in the worker, re-encode through `sharp` (kills polyglots and embedded payloads), originals private, public copies served through signed URLs.
- Rate limits: auth 5 per 15 min, complaints 10 per hour per user, global per IP.
- Mongo sanitising, Zod strict objects (unknown keys rejected), pagination caps.
- Secrets via env with a Zod-validated config module that fails fast on boot.
- Privacy: public images and API responses never expose EXIF GPS, reporter identity for anonymous complaints, or other users' emails. Retention job deletes originals of closed complaints after the configured period.
- Audit log is append-only at the service layer; DB user for the app has no delete rights on that collection in the Docker setup.

## 12. Testing strategy

| Level | Tooling | What |
|---|---|---|
| Unit | Vitest | pHash/dHash, Hamming, ELA stats, EXIF mapping, trust scorer, router, state machine, geo helpers |
| Integration | Vitest + Supertest + mongodb-memory-server + ioredis-mock | Each endpoint per role, auth flows, upload validation, duplicate search with real `2dsphere` queries, idempotency |
| Pipeline | Vitest | Full pipeline with `MockProvider`; failure injection (provider timeout, invalid JSON, corrupt image) |
| Image fixtures | Generated at test time with `sharp` | original, resized, recompressed, cropped 10%, mirrored, brightness-shifted, region-pasted (splice), unrelated |
| Frontend | Vitest + RTL + MSW + vitest-axe | Both apps: components, forms, role guards, i18n, a11y; Server Actions unit tested with mocked domain services; server components covered by Playwright |
| E2E | Playwright | Citizen submits → sees duplicate linking → officer resolves → citizen reopens; reviewer queue |
| Evaluation | script `npm run eval` | Computes duplicate recall / false-merge and writes `docs/evaluation.md` |
| Static | tsc, ESLint, `npm audit --omit=dev` | CI gates |

CI gate order: install → typecheck → lint → unit → integration → build → e2e. A failure at any gate blocks merge.

## 13. Configuration (env)
`NEXT_PUBLIC_APP_URL, API_BASE_URL, SESSION_VERIFY_SECRET, SSE_TICKET_SECRET, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, EMBEDDING_PROVIDER, RUN_WORKER, SENTRY_DSN, MONGO_URI, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, STORAGE_DRIVER, STORAGE_PATH, AI_PROVIDER (mock|gemini|claude|openai), AI_API_KEY, DUP_RADIUS_M, DUP_WINDOW_DAYS, DUP_HIGH, DUP_GREY, TRUST_PASS, TRUST_REVIEW, RESOLVE_RADIUS_M, CLIENT_ORIGIN`. All validated at boot.

## 14. Stretch goals
Voice complaint (Web Speech API), face/number-plate blur on public copies, WhatsApp intake via webhook, C2PA manifest reading for provenance, real DARPG/CPGRAMS adapter.

## 15. Production deployment (Vercel + Render)

| Piece | Service | Notes |
|---|---|---|
| Citizen portal and staff console | **Vercel** | One project. The Vite build is copied into `apps/web/public/staff`; an SPA fallback rewrite serves `/staff/*`. Rewrite `/api/staff/*` to the Render API. Set the function region close to the API. |
| API and worker | **Render** web service | Express plus BullMQ worker in one process. Use a paid always-on instance: free instances sleep after 15 minutes and take 30 to 60 seconds to wake, which breaks background jobs and looks bad in a demo. |
| Queue | **Render Key Value** (Redis) | Private network only, used by the API process. Treat it as disposable; the reconcile job rebuilds the queue from MongoDB. |
| Database | **MongoDB Atlas** | Free M0 tier is enough for a portfolio. Dedicated least-privilege user, TLS, strong password. PaaS outbound IPs are not fixed, so network access is broad; credentials and TLS are the protection. |
| Images | **Cloudflare R2** (or any S3-compatible bucket) | Private bucket, presigned upload and download, CORS limited to the app origin. |
| Errors | **Sentry** | Next.js, staff console, Express. |
| Uptime | External monitor (UptimeRobot, Better Stack, or similar) | Checks `/ready` on the API and the Vercel home page. |
| Backups | Scheduled **GitHub Actions** job | `mongodump`, encrypted, stored in R2. Do not rely on free-tier backups. Restore drill documented. |
| CI/CD | GitHub Actions + platform auto-deploy | CI must pass before Vercel and Render deploy. Rollback uses each platform's previous-deploy rollback. |

Constraints these platforms impose, and how the design handles them:

| Constraint | Handling |
|---|---|
| Vercel Function request and response bodies are limited to 4.5 MB, and invocations are time-limited (docs checked 28 Oct 2026: Hobby up to 300 s) | Direct-to-storage uploads with client compression; no long-lived streams from Vercel, SSE comes from the API |
| Vercel functions cannot reach Render's private Redis | Vercel never uses Redis; complaint writes go to Express, which stores an outbox event that a dispatcher and reconciler turn into queue jobs |
| Serverless MongoDB connections multiply | Cached global connection, small pool, light domain package |
| Render 512 MB RAM on Starter | Image embeddings through an API or caption mode, `sharp` with input pixel limits and concurrency 1, worker concurrency 1 |
| Render Free instances are documented by Render as not for production use: web services spin down after 15 minutes idle (about a minute to wake), Free Key Value is in-memory only and loses data on restart, Free services may be suspended for high service-initiated traffic (external DB, APIs, object storage), outbound SMTP ports are blocked, and background workers have no free plan | Use a paid always-on web service for the API and worker, send email through an HTTP email API instead of SMTP, treat Key Value as disposable and rely on the outbox/reconciler, and say in the README which plans are used |
| Vercel Hobby plan is for non-commercial use | Fine for a portfolio; move to a paid plan if the project is ever used commercially |
| Pricing and limits change | Re-check the Vercel, Render, Atlas, and R2 pricing pages before committing |

Region: choose one region for Render, Atlas, R2 hints, and Vercel functions that is close to your users (for India, Singapore is the nearest common option for Render; check what each provider offers).

Rough monthly cost: Render Starter API about 7 USD, everything else on free tiers or a few dollars for a domain. Confirm current prices.


## 16. Research-validated architecture amendments

These decisions resolve implementation risks in the initial draft. They take precedence over conflicting implementation details in this document where needed to preserve security and data consistency.

### 16.1 Single authoritative write path
- **All authoritative state changes go through the Express API and `packages/domain`.** Next.js Server Actions and Route Handlers are thin backend-for-frontend adapters that validate inputs and call the API; they do not mutate complaint-domain collections. This avoids two independently deployed writers, divergent authorization, and split audit behavior.
- **Collection ownership (single writer per collection).** Express owns users and sessions, complaints, media, analysis results, clusters, upvotes, appeals, review tasks, notifications, audit log, and the outbox. Next.js owns only `savedAreas` and `notificationPrefs`, which exist so that the citizen portal performs real Mongoose CRUD without a second writer on the complaint data. Express and the worker may read Next-owned collections (for example to notify watchers of an area) but never write them. A lint rule (`no-restricted-imports`) stops Next.js server code from importing complaint write services.
- Keep business rules in `packages/domain`; API routes and Next.js actions are transport adapters only.
- For complaint creation, persist the complaint and an outbox event in the same MongoDB transaction where the deployment supports it. A dispatcher publishes the event to BullMQ/Redis and marks the outbox item delivered. If transactions are unavailable in the selected local setup, use a tested reconciliation protocol with idempotency keys and an explicit documented limitation.
- Redis/BullMQ is a delivery mechanism, not the source of truth. The complaint and its analysis stage must remain durable in MongoDB. A scheduled reconciler recovers pending outbox/jobs.

### 16.2 Image evidence pipeline and storage boundaries
- The browser obtains a short-lived, single-object R2 presigned PUT URL from the API and uploads directly to R2. Use unpredictable object keys bound to the authenticated user and pending complaint; constrain expected size/type, expiry and allowed method. A presigned URL is a bearer capability: never log it, store it in analytics, or reuse it as a permanent media URL.
- A successful browser upload is not trusted evidence. The worker checks object size, magic bytes, decoder success, pixel dimensions and allowed format; re-encodes a public derivative without metadata; keeps the original private; and records processing failure as a reviewable state.
- Use a bounded image decoder (`sharp` with pixel limits), queue concurrency tuned to measured memory, and test decompression bombs, malformed files, fake extensions, polyglots and EXIF stripping.
- Do not use public image URLs as proof of identity or provenance. EXIF can be missing, forged, stripped or copied; camera capture metadata is supporting evidence only.

### 16.3 Duplicate and authenticity model
- Duplicate detection is a candidate-ranking system. Require a visual similarity signal before auto-linking; geographic proximity and category equality alone must never merge complaints. Grey-band matches go to human review.
- Keep exact-byte duplicates distinct from perceptual similarity: same-user exact re-upload may be blocked with an explanation; cross-user exact reuse is a strong review signal, not an automatic fraud verdict.
- Use versioned, configurable weights and thresholds, a labelled evaluation dataset, precision/recall/false-merge reporting, and reviewer override metrics. A target is not a result until `npm run eval` produces evidence.
- ELA, noise statistics, editing software tags, missing EXIF, gallery source and AI-generated-image hints have substantial false-positive/false-negative risks. They must not be used alone to reject, suspend or publicly label a citizen.
- Do not expose a numerical "trustworthiness" label to the public. Citizen wording is "needs verification" and provides a review/appeal path.

### 16.4 Geospatial correctness and privacy
- Store points as GeoJSON `Point` with `[longitude, latitude]`, use `2dsphere` indexes, and test for swapped coordinates.
- Validate that coordinates fall inside a configured jurisdiction polygon before routing. Seed polygons are explicitly synthetic and must be replaced before any real deployment.
- Public map results must omit anonymous complaints and must not expose precise sensitive coordinates. Use a configurable grid/jitter or rounded public coordinate, while officers with a legitimate assignment may see exact coordinates.
- Address text and landmarks are untrusted and should be escaped at output; do not call a geocoder with private data unless explicitly configured and disclosed.

### 16.5 Identity, sessions and authorization
- Prefer server-set `HttpOnly`, `Secure`, `SameSite` cookies, short-lived access sessions, rotating refresh tokens with reuse-family revocation, CSRF protection for cookie-authenticated mutations, strict origin checks, rate limits, and password hashing with Argon2id.
- Enforce authorization at the API/domain boundary on every read and write. Frontend route guards and Next.js `proxy.ts` are user-experience controls, not the security boundary.
- Avoid long-lived bearer tokens in URLs. Decision: the browser origin (Vercel) and the API origin (Render) differ unless a shared parent domain is configured, so third-party cookies cannot be relied on for SSE. Use a one-use stream ticket (valid about 30 seconds, bound to the user and stream) obtained through an authenticated POST via the rewrite, passed once in the SSE URL, and redacted from logs. If you later add a custom domain with `app.` and `api.` subdomains, cookie auth with strict origin checks becomes possible. Test that a stream cannot cross user boundaries and that a ticket cannot be reused.

### 16.6 Stack verdict and scope
The requested TypeScript MERN stack is appropriate for this portfolio build. The two-frontend design is justified only because the citizen portal intentionally demonstrates Next.js and the staff console intentionally demonstrates React + Vite. It is more complex than a single React app; do not add a third frontend, microservices, Kubernetes, or a vector database in v1.

Recommended stack:
- Citizen/PWA: Next.js App Router, React, TypeScript, Tailwind, accessible component primitives, `next-intl`, Leaflet.
- Staff console: React + Vite, TypeScript, React Router, TanStack Query for server state, React Hook Form + Zod.
- API: Express 5 + TypeScript, Zod at every boundary, centralized errors, pino structured logs.
- Persistence: MongoDB Atlas/MongoDB with Mongoose and `2dsphere` indexes.
- Jobs: BullMQ + Redis, with MongoDB as source of truth and an outbox/reconciler.
- Media: Cloudflare R2/S3-compatible adapter; local disk adapter only for local development.
- Image processing: `sharp`, `exifr`, cryptographic SHA-256, DCT pHash/dHash; embeddings via an interface selected only after a measured spike.
- Tests: Vitest, React Testing Library, Supertest, Playwright, MSW, deterministic mock AI provider, generated fixtures and fake timers.
- Operations: Docker Compose locally, GitHub Actions CI, Vercel frontend, Render API/worker, Sentry, uptime checks and tested encrypted backups.

Do not load local CLIP in a 512 MB production process unless a real spike demonstrates acceptable memory and latency. Start with a provider abstraction and a caption/text fallback; compare remote embedding cost, latency, privacy, rate limits and availability before selecting the production implementation. Keep all AI network calls opt-in in CI.

### 16.7 Non-negotiable security tests
- Role × endpoint authorization matrix, including ownership and department boundaries.
- Anonymous reporter privacy in every API DTO, log, CSV export, map result and notification.
- CSRF, refresh-token reuse, brute-force rate limit, session expiry, origin/CORS, NoSQL injection, XSS, IDOR and mass-assignment tests.
- Upload tests for spoofed MIME/extensions, oversized files, corrupt images, pixel bombs, metadata stripping, private originals and expired presigned URLs.
- Queue retry/idempotency, process-kill/resume, outbox replay, duplicate event and dead-letter behavior.
- Audit tamper prevention and reviewer override history.
- Restore from backup and rollback test, not just a backup job that exits successfully.

### 16.8 Performance budgets
Treat targets as hypotheses to measure on a named test environment:
- API complaint-create p95 under 1.5 s excluding direct upload time.
- Analysis completion p95 under 30 s for the defined synthetic workload.
- Indexed list endpoint p95 under 300 ms at a documented dataset size and concurrency.
- Citizen submit route initial JavaScript under 200 KB gzip, verified from the build artifact.
Record hardware/plan, region, dataset size, concurrency, sample count, warm/cold state and command used. Never report a target as achieved without test output.

### 16.9 UI design system and core screens
Use a calm, civic, high-trust visual language rather than a flashy AI dashboard. Make status, next action, department and due date more prominent than model scores.
- Citizen home: clear "Report a civic issue" primary action, track-by-ID, nearby issues, language switch and accessible help.
- Report wizard: location → evidence → details/category → review/consent → submit receipt; show GPS accuracy, pin adjustment, image previews, upload progress, retry and draft state.
- Tracking: complaint ID, human-readable timeline, assigned department, SLA/next update, duplicate cluster explanation, feedback/reopen/appeal.
- Staff queue: workload and SLA triage, filters, saved views, keyboard navigation, clear assignment and status.
- Reviewer workbench: original/public derivative side by side, EXIF summary, ELA overlay with caveat, duplicate candidates, per-signal explanations, model/version, approve/merge/split/reroute/override with required reason.
- Analytics: category/ward trends, SLA compliance, median and p95 resolution time, duplicate precision/false-merge rate, flag rate, reviewer override rate and confidence calibration.
- Mobile-first responsive design, English/Hindi locale files, WCAG 2.1 AA checks, reduced motion, readable contrast, no color-only status, no fabricated government logos/seals.

## 17. Source register and evidence boundaries

### Government and product workflow
- CPGRAMS: https://pgportal.gov.in/Home/
- DARPG Comprehensive Guidelines for Handling Public Grievances: https://www.darpg.gov.in/sites/default/files/Comprehensive_guidelines_for_handling_the_Public_Grievances.pdf
- PIB, NextGen CPGRAMS features and rollout direction: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2296724&lang=1&reg=48
- Swachhata-MoHUA: https://play.google.com/store/apps/details?id=com.ichangemycity.swachhbharat
- Janaagraha Swachhata Technology Platform: https://dev.janaagraha.org/work/swachhata-technology-platform/

### Technical and legal
- MeitY DPDP Rules 2025 and related documents: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa
- Vercel limits: https://vercel.com/docs/limits
- Vercel Functions limitations: https://vercel.com/docs/functions/limitations
- Render background workers: https://render.com/docs/background-workers
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- MongoDB geospatial queries: https://www.mongodb.com/docs/manual/geospatial-queries/
- MongoDB 2dsphere indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- OWASP unrestricted file upload: https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload

Research note: DPDP Rules 2025 include staged commencement provisions and MeitY lists a corrigendum. Verify the current consolidated text and applicability with qualified counsel before processing real personal data. This specification is not legal advice or a claim of compliance.

### Product decisions informed by the research (summary)
1. Model the citizen journey around registration ID, timeline, feedback/reopen/appeal, and transparent status—not just a form.
2. Keep image upload direct to object storage; never proxy large image bytes through a serverless frontend function.
3. Use geospatial indexes and test coordinate order explicitly.
4. Treat duplicate detection and authenticity analysis as review-supporting evidence, not a citizen-punishment engine.
5. Build accessibility, language switching, privacy notices, data retention/export/deletion, and auditability into the acceptance tests.
6. The product is a portfolio prototype, not a government portal, and must use synthetic/demo data only.


### Verification log (28 Oct 2026)
Checked directly against the vendor documentation: Vercel Functions limit request and response bodies to 4.5 MB and (with Fluid compute) allow up to 300 s on Hobby; Render documents Free instances as not for production, with 15-minute idle spin-down, an in-memory-only Free Key Value, and no free background workers, and lists BullMQ as a supported Node.js queue framework. Other sources in this register were taken from the research pack and have not been independently re-read.
