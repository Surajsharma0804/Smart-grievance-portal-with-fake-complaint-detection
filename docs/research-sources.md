# Research source register — Nagrik Setu
Reviewed: 28 October 2026

## Government / public-service references
- CPGRAMS: https://pgportal.gov.in/Home/
- DARPG Comprehensive Guidelines for Handling Public Grievances: https://www.darpg.gov.in/sites/default/files/Comprehensive_guidelines_for_handling_the_Public_Grievances.pdf
- PIB NextGen CPGRAMS announcement: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2296724&lang=1&reg=48
- Swachhata-MoHUA (Google Play): https://play.google.com/store/apps/details?id=com.ichangemycity.swachhbharat
- Janaagraha Swachhata Technology Platform: https://dev.janaagraha.org/work/swachhata-technology-platform/

## Technical / legal primary sources
- MeitY DPDP Rules 2025: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa
- Vercel limits: https://vercel.com/docs/limits
- Vercel Functions limitations: https://vercel.com/docs/functions/limitations
- Render background workers: https://render.com/docs/background-workers
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- MongoDB geospatial queries: https://www.mongodb.com/docs/manual/geospatial-queries/
- MongoDB 2dsphere indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- OWASP unrestricted file upload: https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload

## Interpretation limits
These references informed product requirements and architectural choices; they do not establish that Nagrik Setu is government-affiliated, legally compliant, secure, or production-ready. The DPDP Rules have staged commencement provisions and MeitY lists a corrigendum; check the current consolidated text and applicability before handling real personal data. Performance targets and AI evaluation thresholds are targets until measured in this repository.

## Verification log (28 Oct 2026)
Read directly from the vendor documentation: Vercel Functions request and response bodies are limited to 4.5 MB, and with Fluid compute invocations can run up to 300 s on Hobby; Render documents Free instances as not for production (15-minute idle spin-down, in-memory-only Free Key Value, no free background workers, possible suspension for high service-initiated traffic, SMTP ports blocked) and lists BullMQ as a supported Node.js queue framework. The remaining entries come from the research pack and were not independently re-read.
