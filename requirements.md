# Requirements: Smart Grievance Redressal & Fake Complaint Detection System

> Revised research-backed specification, 28 Oct 2026. Original functional requirements remain the baseline; additional launch-safety requirements are appended below.

Working name: **Nagrik Setu** (rename freely).

## 1. Purpose

Citizens report civic problems with photos and a location. The system analyses each submission, flags duplicates and suspicious images, classifies the grievance, and routes it to the right department. Officers resolve it with photo proof, and citizens can track and reopen it.

Prior art reviewed and what we take from it:

| System | What it does well | What we borrow / improve |
|---|---|---|
| CPGRAMS / NextGen CPGRAMS (DARPG) | National portal; roadmap includes AI categorisation, intelligent routing, voice and chatbot, automated escalation, accessibility, AI check of resolution quality | AI categorisation and routing, escalation, multilingual, accessibility, resolution-quality check |
| Swachhata app (MoHUA / Janaagraha) | Photo + geo-tag complaint, auto-routing to municipal body, push status updates, upvote others' complaints, resolution photo, reopen if unsatisfied | Geo-tagged capture, upvote, resolution proof, reopen |
| Swachha App (West Bengal, 2026) | Complaint closes only after a geo-tagged resolution photo | Resolution photo must be geo-validated |
| Known weaknesses seen in these apps | Stale "nearby" lists, broken directions link, duplicates inflating workload, no authenticity check on images | Fresh nearby list, working map link, duplicate clustering, fake-image scoring |

## 2. Scope

**In scope (v1):** web app (responsive PWA), citizen / officer / department admin / super admin roles, image + location complaints, AI analysis pipeline, duplicate clustering, authenticity scoring, rule + AI routing, SLA and escalation, notifications, analytics dashboard, audit log, English + Hindi.

**Out of scope (v1):** native mobile apps, integration with the real CPGRAMS/state systems (design an adapter interface only), payments, reverse image search on the open web, video complaints, voice complaints (listed as a stretch goal).

## 3. Users and roles

| Role | Can do |
|---|---|
| Citizen | Register, submit and track own complaints, upvote nearby complaints, reopen, give feedback |
| Officer | See assigned complaints, update status, upload resolution photo, request reassignment |
| Department Admin | Manage officers of own department, reassign, view department analytics |
| Reviewer (Super Admin) | Review flagged / low-confidence complaints, override AI verdicts, manage departments, wards, categories, users, view audit log |

## 4. Functional requirements

Acceptance criteria use the form WHEN / THE SYSTEM SHALL.

### FR-1 Authentication and accounts
- FR-1.1 WHEN a user registers with name, email or phone, and password THE SYSTEM SHALL validate input, hash the password with argon2id, and create a citizen account.
- FR-1.2 WHEN a user logs in with correct credentials THE SYSTEM SHALL issue a short-lived access token and a rotating refresh token, both in httpOnly, secure, sameSite cookies.
- FR-1.3 WHEN a refresh token is reused after rotation THE SYSTEM SHALL revoke the whole token family.
- FR-1.4 WHEN login fails 5 times in 15 minutes for one account or IP THE SYSTEM SHALL temporarily block further attempts and log the event.
- FR-1.5 Role-based access control SHALL be enforced on every protected route and verified by tests for each role.
- FR-1.6 Email verification and password reset via expiring single-use tokens.

### FR-2 Complaint submission
- FR-2.1 A complaint SHALL contain: title, description (optional if image present), 1 to 4 images, location (lat, lng, accuracy, optional address and landmark), optional category chosen by the citizen, optional anonymous flag (hidden from public view, still known to admins).
- FR-2.2 WHEN the citizen uses in-app capture THE SYSTEM SHALL record device geolocation and capture time and mark the image source as `camera`; uploads from gallery SHALL be marked `gallery` and scored accordingly.
- FR-2.3 WHEN an image is uploaded THE SYSTEM SHALL accept it through a presigned URL that limits type and size (client compresses to at most 2 MB), then verify the real file type by magic bytes and decode it fully in the analysis worker, accept only JPEG / PNG / WebP / HEIC (converted), strip metadata from the public copy, and store the original privately. Invalid media SHALL move the complaint to review with a clear reason, never crash the pipeline.
- FR-2.4 WHEN the location is outside every configured ward / jurisdiction THE SYSTEM SHALL reject with a clear message.
- FR-2.5 The form SHALL allow a map pin adjustment, show GPS accuracy, and warn when accuracy is worse than 100 m.
- FR-2.6 The API SHALL return `202 Accepted` with a complaint ID immediately; analysis SHALL run asynchronously and the citizen SHALL see live status.
- FR-2.7 Submissions SHALL be idempotent through a client-generated key so double-taps do not create duplicates.

### FR-3 AI image and text analysis
- FR-3.1 For each image THE SYSTEM SHALL compute: SHA-256, 64-bit perceptual hash (DCT pHash), difference hash, and an image embedding vector.
- FR-3.2 THE SYSTEM SHALL extract EXIF (capture time, GPS, device make/model, software tag) when present.
- FR-3.3 THE SYSTEM SHALL call a vision-language model with a strict JSON schema to obtain: category, sub-category, severity (1 to 5), one-line caption, text-to-image consistency (0 to 1), flags (`screenshot`, `stock_photo`, `indoor_irrelevant`, `person_face_prominent`, `possibly_ai_generated`), and a model confidence (0 to 1).
- FR-3.4 WHEN the model output fails schema validation THE SYSTEM SHALL retry once, then fall back to the text-only classifier, then to manual triage. It SHALL never crash the pipeline.
- FR-3.5 THE SYSTEM SHALL support Hindi and English descriptions.
- FR-3.6 AI provider SHALL be behind an interface so it can be swapped (Gemini, Claude, OpenAI, local) without touching business logic; a deterministic mock provider SHALL exist for tests.

### FR-4 Duplicate detection
- FR-4.1 THE SYSTEM SHALL search for candidates within a configurable radius (default 150 m) and time window (default 30 days) using a geospatial index, restricted to open complaints.
- FR-4.2 Among candidates THE SYSTEM SHALL compare: exact SHA-256 match, pHash Hamming distance, embedding cosine similarity, text embedding similarity, and category equality.
- FR-4.3 WHEN the combined duplicate score is at or above the high threshold THE SYSTEM SHALL link the new complaint to the primary one as a cluster member and notify the citizen; the primary complaint's priority SHALL increase with cluster size.
- FR-4.4 WHEN the score is in the grey band THE SYSTEM SHALL send it to the review queue with the candidate side by side.
- FR-4.5 WHEN the same user submits an exact byte-identical image twice THE SYSTEM SHALL block the second and explain why.
- FR-4.6 Officers SHALL see one work item per cluster, not one per duplicate.
- FR-4.7 A reviewer SHALL be able to split a wrongly merged cluster.

### FR-5 Fake and manipulated complaint detection
- FR-5.1 THE SYSTEM SHALL compute an **authenticity score (0 to 100)** from weighted signals, each stored with its raw value and reason so the result is explainable:
  - GPS in EXIF versus claimed location distance
  - EXIF capture time versus submission time
  - Editing-software tag, missing or stripped EXIF (weak signal alone)
  - Error Level Analysis map statistics and local noise inconsistency (weak to moderate signal)
  - Perceptual match to an older complaint from a different user (strong)
  - VLM text-to-image mismatch and the `screenshot`, `stock_photo`, `possibly_ai_generated` flags
  - Image source (`camera` higher trust than `gallery`)
  - Submitter reputation and submission burst rate
- FR-5.2 THE SYSTEM SHALL NOT auto-reject on authenticity alone except for exact duplicate abuse (FR-4.5). Low scores SHALL route to human review with the evidence shown.
- FR-5.3 Users with repeated confirmed-fake complaints SHALL be rate-limited, then suspended after reviewer action. Every penalty SHALL be reversible and audited.
- FR-5.4 The UI SHALL describe results as "needs verification" and never as "fake" to the citizen.
- FR-5.5 THE SYSTEM SHALL document that ELA and AI-generation hints produce false positives and are never used alone.

### FR-6 Classification and routing
- FR-6.1 A configurable taxonomy SHALL map category to department and default SLA (seeded: Sanitation and Solid Waste, Roads and Potholes, Water Supply and Sewerage, Electricity, Street Lighting, Traffic and Parking, Parks and Horticulture, Public Health, Stray Animals, Encroachment, Other).
- FR-6.2 Routing SHALL combine: AI category (with confidence), citizen-chosen category, and ward polygon lookup (`$geoIntersects`) to pick department and ward-level officer pool.
- FR-6.3 WHEN AI confidence is below the threshold or AI and citizen category disagree strongly THE SYSTEM SHALL route to the triage queue instead of guessing.
- FR-6.4 Officer assignment SHALL use least-open-workload within the ward.
- FR-6.5 A reviewer or department admin SHALL be able to reassign; every reassignment SHALL record who, when, and why.

### FR-7 Lifecycle, SLA and escalation
- FR-7.1 States: `SUBMITTED → ANALYZING → (NEEDS_REVIEW | ROUTED) → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`, plus `REOPENED` and `LINKED_DUPLICATE`. Invalid transitions SHALL be rejected.
- FR-7.2 WHEN an officer resolves a complaint THE SYSTEM SHALL require a resolution photo with location within 200 m of the complaint (configurable) and run the same authenticity checks on it.
- FR-7.3 WHEN an SLA is breached THE SYSTEM SHALL escalate to the department admin, then to the reviewer, with notification at each level.
- FR-7.4 Citizen SHALL be able to confirm or reopen within 7 days; unreopened resolved complaints auto-close.
- FR-7.5 A resolution-quality check SHALL compare before and after images using the VLM and flag "unrelated resolution photo" for review.

### FR-8 Citizen experience
- FR-8.1 Track by complaint ID with a timeline of every status change.
- FR-8.2 Public nearby map of non-anonymous open complaints with upvote ("I face this too"); one upvote per user per complaint.
- FR-8.3 Notifications in-app (SSE) and by email; SMS/push as pluggable adapters.
- FR-8.4 Feedback rating after closure.
- FR-8.5 English and Hindi UI, switchable at runtime.
- FR-8.6 Citizens SHALL be able to save up to 5 areas (centre and radius) and set notification channels and categories; the system SHALL notify them of new public complaints in those areas, subject to the privacy rules in FR-11.

### FR-9 Admin and analytics
- FR-9.1 Review queue showing image, EXIF, ELA overlay, duplicate candidates, score breakdown, and approve / reject / merge / reroute actions.
- FR-9.2 Dashboards: volume by category and ward, average resolution time, SLA compliance, duplicate rate, flagged rate, reviewer overrides (to measure AI quality).
- FR-9.3 Heat map of complaint density.
- FR-9.4 Immutable audit log of all privileged actions and AI decisions.
- FR-9.5 CSV export for reviewers.

## 5. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 Performance | Complaint POST returns in under 1.5 s p95 for 4 images on a normal connection (excluding upload time); full analysis completes under 30 s p95; list endpoints under 300 ms p95 with indexes |
| NFR-2 Reliability | Pipeline jobs idempotent, retried with backoff, dead-letter queue, no lost complaints on restart |
| NFR-3 Security | OWASP ASVS L2 mindset: helmet, strict CORS, rate limits, Zod validation on every input, NoSQL-injection sanitising, upload hardening, no secrets in repo, dependency audit clean of high/critical |
| NFR-4 Privacy | Design toward the principles of India's DPDP Act 2023 and the DPDP Rules 2025 (staged commencement; no compliance claim, synthetic data only, qualified legal review before any real-data launch): consent notice, purpose limitation, data minimisation, retention policy, user data export and deletion, EXIF GPS stripped from public copies, anonymous mode honoured |
| NFR-5 Accessibility | WCAG 2.1 AA: keyboard navigation, labels, contrast, alt text, reduced motion |
| NFR-6 Usability | Works on low-end Android and slow networks: client-side image compression, PWA offline draft, initial JS budget set and checked in the build for the citizen submit route (target under 200 KB gzipped) |
| NFR-7 Observability | Structured logs (pino) with request IDs, health and readiness endpoints, pipeline metrics |
| NFR-8 Maintainability | TypeScript strict, ESLint + Prettier, conventional commits, at least 80% line coverage on services and utils, README with one-command setup |
| NFR-9 Fairness and explainability | Every AI decision stores inputs, outputs, model version, and reasons; human override always possible |
| NFR-10 Portability | Runs locally with Docker Compose; no paid service required for development (mock AI provider, local storage) |
| NFR-11 Academic coverage | Every topic in the INT252 and INT257 syllabi that fits the domain is implemented in a named feature and listed in `docs/syllabus-mapping.md` with real file paths |
| NFR-12 Production readiness | Runs on a public HTTPS URL (Vercel for the web apps, Render for API and worker); deployed automatically only after CI passes; rollback tested; health and readiness checks; encrypted, tested backups; secrets only in platform environment settings; documented runbook |
| NFR-13 Operational visibility | Errors reach Sentry with request IDs; uptime monitor on `/ready`; queue depth and analysis-time metrics; load-test numbers (p95 latency, throughput, queue drain time) recorded |
| NFR-14 Honest scope | The product is an independent portfolio project, not affiliated with any government body; it uses no real citizen data; README states limitations of the fake-image signals |

## 6. Constraints and assumptions
- Stack is MERN in TypeScript with two React frontends: a Next.js citizen portal and a React + Vite staff console, plus an Express API and worker, MongoDB, and Redis for the job queue.
- The project must visibly use the topics of the INT252 (React) and INT257 (Next.js) syllabi; `docs/syllabus-mapping.md` lists each topic, where it is used, and the file that shows it.
- Hosting: Vercel (Next.js and staff console), Render (API and worker), MongoDB Atlas, Cloudflare R2. Free tiers are used where they are adequate; the API runs on an always-on paid instance because free Render services sleep.
- Free-tier friendly in development: AI provider key is optional in dev (mock provider), required for real analysis.
- Data ownership: Express owns all complaint-domain collections and is the only writer; the Next.js portal owns only `savedAreas` and `notificationPrefs` (see `design.md` §16.1).
- Maps use OpenStreetMap tiles with Leaflet (no paid key).
- Ward boundaries are seeded sample GeoJSON; real boundaries are imported by admin.

## 7. Success metrics (for demo and evaluation)
- On a labelled test set of 60 synthetic cases (exact copies, resized, cropped, recompressed, mirrored, edited, unrelated), duplicate recall at least 90% and false-merge rate under 5%.
- Category accuracy at least 85% on a 100-image sample using the real provider; the test report SHALL be committed.
- Zero failing tests, lint, or type errors on main.
- Median time from submission to routed under 20 s.

## 8. Risks
| Risk | Mitigation |
|---|---|
| False "fake" flags hurt honest citizens | Human review, soft language, explainable score, appeal path |
| VLM outage or quota | Provider interface, retry, fallback to text classifier, triage queue |
| Vision model hallucination | Strict schema, confidence thresholds, reviewer override tracking |
| Adversarial editing beats ELA | ELA is one weak signal; combine with geo/time/duplicate/VLM; be honest in docs |
| Privacy of photos with faces or plates | Face/plate flag, private originals, blur option (stretch) |


## 9. Additional launch-safety acceptance criteria

These criteria extend the existing FR/NFR list and must be included in the implementation traceability table.

### FR-10 Trust, appeals and safe AI
- FR-10.1 Every authenticity signal shall store the raw observation, scoring contribution, reason, algorithm/model version, and timestamp.
- FR-10.2 Reviewers shall be able to override any AI recommendation with a required reason; the original result remains in the audit history.
- FR-10.3 A citizen must be able to challenge a duplicate link or a review decision without losing the original complaint ID or timeline.
- FR-10.4 A model/provider outage, timeout, malformed response, or quota error shall never erase or silently discard a complaint; the complaint remains visible and can be manually triaged.
- FR-10.5 The system shall not infer malicious intent solely from gallery uploads, missing EXIF, image editing, ELA, AI-generation hints, account age, or reputation.
- FR-10.6 Model output and user-supplied text/images shall be treated as untrusted input. The model cannot trigger privileged actions, change roles, or bypass server-side validation.

### FR-11 Privacy and operational controls
- FR-11.1 Public responses and exports shall use allowlisted DTOs; raw EXIF, private storage keys, reporter identifiers, internal notes, and embeddings are never returned to the public client.
- FR-11.2 Public map coordinates shall be precision-reduced or jittered where exact location could reveal a person's home, sensitive facility, or other private information; exact coordinates remain role-restricted.
- FR-11.3 Image access shall use short-lived signed URLs or an authenticated media endpoint. Private originals must never be placed in a public bucket.
- FR-11.4 Admins shall be able to configure retention periods and execute auditable deletion/anonymisation workflows; legal holds and audit retention rules must be documented.
- FR-11.5 Every privileged action and reviewer override shall have actor, timestamp, target, reason, request/correlation ID, and before/after summary where appropriate.
- FR-11.6 The system shall have a documented incident response checklist, backup restore drill, dependency/security scan, and a tested rollback procedure.

### FR-12 Reliability and accessibility
- FR-12.1 Complaint creation and queue scheduling shall be resilient to process restarts. Use a durable outbox/reconciliation pattern or an equivalently tested atomic enqueue strategy.
- FR-12.2 Retries shall be idempotent; terminal failures shall be visible in a reviewer queue and observable through metrics.
- FR-12.3 Core citizen journeys shall pass keyboard-only, screen-reader-label, contrast, focus, reduced-motion, and responsive-layout checks.
- FR-12.4 The submission form shall preserve a local draft when practical, clearly explain denied geolocation and offline states, and never imply that a draft was submitted when it was not.

## 10. Research sources and evidence boundaries

See the source register in `design.md`. This prototype must not claim government affiliation, formal DPDP compliance, forensic certainty, or measured performance unless the relevant audit/test was actually performed. DPDP Rules 2025 have staged commencement provisions and may have corrigenda; check the official MeitY source and obtain qualified legal review before processing real citizens' data.

## 11. Research validation and source register (reviewed 28 Oct 2026)

This specification is informed by official government/product documentation and primary technical documentation. These sources support the product direction; they do **not** prove that this prototype is government-approved or production-certified.

### Public-service workflow references
- CPGRAMS portal: https://pgportal.gov.in/Home/ — registration IDs, tracking, feedback/appeal, role-based handling.
- DARPG public grievance guidelines: https://www.darpg.gov.in/sites/default/files/Comprehensive_guidelines_for_handling_the_Public_Grievances.pdf — grievance workflow, responsible-authority routing, escalation and feedback.
- NextGen CPGRAMS announcement (PIB): https://www.pib.gov.in/PressReleasePage.aspx?PRID=2296724&lang=1&reg=48 — announced direction includes AI categorisation/routing, multilingual access, escalation and resolution-quality checks. Treat announced features as roadmap statements, not proof that every feature is live.
- Swachhata-MoHUA listing: https://play.google.com/store/apps/details?id=com.ichangemycity.swachhbharat — photo/location complaint submission, civic-body routing, upvotes, status notifications and resolution images.
- Janaagraha Swachhata Technology Platform: https://dev.janaagraha.org/work/swachhata-technology-platform/ — citizen participation, officer workflow, proof of work and dashboards.

### Primary technical and legal references
- DPDP Rules, 2025 (MeitY): https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa — implementation has a staged commencement schedule; verify the applicable provisions and latest corrigenda before any real-data launch.
- Vercel limits: https://vercel.com/docs/limits and https://vercel.com/docs/functions/limitations — deployment and function constraints can change; verify current plan limits before release.
- Render background workers: https://render.com/docs/background-workers — supports moving asynchronous processing out of request paths.
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/ — direct browser-to-object-store upload pattern; presigned URLs are bearer tokens and must be short-lived.
- MongoDB geospatial queries: https://www.mongodb.com/docs/manual/geospatial-queries/ and https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/ — GeoJSON order is `[longitude, latitude]`; use a `2dsphere` index for distance and polygon operations.
- OWASP unrestricted file upload guidance: https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload — extension/MIME checks alone are insufficient; verify bytes, decode safely, bound resource use, and keep originals private.

### Product decisions informed by the research
1. Model the citizen journey around registration ID, timeline, feedback/reopen/appeal, and transparent status—not just a form.
2. Keep image upload direct to object storage; never proxy large image bytes through a serverless frontend function.
3. Use geospatial indexes and test coordinate order explicitly.
4. Treat duplicate detection and authenticity analysis as review-supporting evidence, not a citizen-punishment engine.
5. Build accessibility, language switching, privacy notices, data retention/export/deletion, and auditability into the acceptance tests.
6. The product is a portfolio prototype, not a government portal, and must use synthetic/demo data only.
