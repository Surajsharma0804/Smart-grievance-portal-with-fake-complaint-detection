# Operational Runbook: Nagrik Setu

Operational procedures, incident management, secret rotation, and disaster recovery.

---

## 1. Deployment Procedures

### Production Architecture
- **Web App (`apps/web`) & Staff Console (`apps/admin`)**: Hosted on Vercel. Next.js App Router serves citizen routes; the built Vite bundle in `apps/web/public/staff` serves `/staff/*` with an SPA rewrite fallback.
- **API & Worker (`apps/api`)**: Deployed as an always-on web service on Render with Node.js 20+.
- **Database**: MongoDB Atlas M0/M10 cluster with TLS 1.3.
- **Media Storage**: Cloudflare R2 / S3-compatible bucket with signed URL policies.

### Local Staging Deployment
```bash
# 1. Install dependencies
npm ci

# 2. Seed database
npm run seed

# 3. Build all packages
npm run build

# 4. Start API server
npm run dev:api
```

---

## 2. Secret Rotation Protocol

Rotate secrets without downtime:

### JWT Access & Refresh Secrets
1. Generate new 32-character high-entropy secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `JWT_REFRESH_SECRET` and `JWT_ACCESS_SECRET` in environment variables.
3. Restart API service. Active sessions will re-authenticate via the refresh token endpoint or prompt a clean re-login.

### SSE Ticket Secret
1. Generate new ticket secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
2. Update `SSE_TICKET_SECRET`.
3. Client browser connections will re-request a stream ticket automatically on next reconnect cycle.

---

## 3. Database Backup & Disaster Recovery

### Automated Backup (`mongodump`)
```bash
# Dump the nagrik-setu database with archive compression
mongodump --uri="$MONGO_URI" --archive="backup-$(date +%Y%m%d-%H%M%S).gz" --gzip
```

### Recovery Drill (`mongorestore`)
```bash
# Restore archive into clean database
mongorestore --uri="$MONGO_URI" --drop --archive="backup-20261114-080000.gz" --gzip
```

**Verification Checklist:**
- [ ] Count user documents matches pre-backup total
- [ ] 2dsphere index on `Complaint.location` and `Ward.geometry` rebuilt automatically
- [ ] Authenticity audit logs intact

---

## 4. Platform Rollback Procedure

If a release introduces a regression:
1. Identify the previous stable commit on `main`.
2. Revert the commit or roll back via Git:
   ```bash
   git revert HEAD
   git push origin main
   ```
3. Vercel and Render CI/CD will automatically redeploy the previous stable build.

---

## 5. Common Failure Modes & Mitigations

### 1. Vision-Language Model (VLM) Provider Quota / Latency
- **Symptom**: Analysis pipeline experiences timeouts on image analysis.
- **Handling**: `analyzeWithRetry` retries once, then falls back to `fallbackVlmResult()`. The grievance is classified using the bilingual keyword classifier and routed to the `NEEDS_REVIEW` triage queue for human verification. Zero complaints are dropped.

### 2. High ELA Noise False Positives
- **Symptom**: Uncompressed screenshots or heavy compression artifacts trigger high region variance ratios.
- **Handling**: ELA results are purely informational indicators displayed on the Reviewer Workbench. They never alter citizen-facing status to "fake".
