# TOZON CRM — 360° Storage Security Gate (READ-ONLY findings)

## Observed on 2026-10-15

Project: tozon-crm. Bucket `panoramas-360` exists, is **public**, limit 50 MiB, accepts image/jpeg, image/png, image/webp.

Storage policy `Allow All Visual Storage Objects` applies to `storage.objects` for role `public`, command `ALL`, and covers **three** buckets: `3d-models`, `panoramas-360`, `project-media`. Table privileges for `anon` and `authenticated` include SELECT/INSERT/UPDATE/DELETE. This is a potential unauthorized write/delete exposure, not merely a draft visibility issue.

Production already contains an active SHOWROOM tour and two panoramas. Do not alter them or break their URLs.

## Safe migration proposal (NOT APPLIED)

1. Inventory all storage consumers for each of the three buckets; identify any direct browser uploads using anon/authenticated keys and verify that any signed-upload URL is created by a trusted backend with role authorization.
2. Create a new **private** bucket for unpublished AI panorama drafts, e.g. `panoramas-360-drafts`, with a backend-only signed-upload and signed-read flow. Do not use public object URLs. Confirm server code uses the new bucket for draft writes and reads before migration.
3. Replace the shared `ALL` policy with bucket-scoped policies only after auditing all consumers; preserve required read access to existing published panorama URLs and existing unrelated buckets. Deny direct anonymous write/update/delete to panorama objects. Check all relevant policies and grants together (RLS policies combine permissively).
4. Verify as anon and authenticated: unauthorized upload, overwrite and delete are denied; authorized admin signed upload succeeds; unpublished read without signed URL fails; published showroom still loads.
5. Back up policy definitions, capture rollback SQL and require explicit approval for production DDL or storage migration.

## Release gates

- CI: `npx vitest run src/features/tour360/services/tour360Api.test.js` and `npm run build` (GitHub Actions run 38634611783 succeeded).
- Browser: panorama 2:1 preview and WebGL fallback on a test file.
- E2E: authorized signed upload -> object exists -> panorama row exists -> read URL -> viewer rotates; repeat with unauthorized account (must fail).
- Security: existing production tour 24 and panoramas 53/54 remain unchanged.

No schema changes, policy changes, uploads or production deploy were performed in this assessment.
