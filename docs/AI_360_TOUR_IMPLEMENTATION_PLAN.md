# TOZON CRM — AI 360° Tour Foundation

Status: design only; not deployed. Pilot: Block A, type 6, 81.18 m². Style: modern comfort. Rooms: living room, bedroom, kitchen, bathroom, hallway, subject to plan verification.

## Confirmed repository facts
- React/Vite frontend includes three.js, @react-three/fiber, @react-three/drei and Konva dependencies.
- Backend is Express and has Supabase and OpenAI SDK dependencies.
- This document does not assert that an image-to-360 generator or functioning panorama viewer already exists.

## Delivery gates
1. Locate current plan editor, apartment detail, existing 360 viewer and asset upload/storage integration; diagnose black screen by checking network errors, empty image URL, texture load and WebGL fallback.
2. Implement manual equirectangular JPG/WebP panorama upload and preview, with 2:1 ratio validation, MIME and file-size validation, and a user-friendly empty state. A 2:1 image alone is not proof of valid spherical projection.
3. Store private drafts and approved public assets separately, use signed URLs or controlled public delivery. Link tours to immutable layout IDs, not apartment area or display names.
4. Add rooms, scene records, hotspots, draft/approved/published states and audit trail. Use least-privilege backend APIs; never expose AI provider keys to the browser.
5. Pilot AI plan parsing with manual wall/door/window confirmation. Generate reference interiors first; then produce genuinely spherical images using validated 3D geometry/rendering or a tested provider. Do not treat a perspective still or simple outpainting as a valid panorama.
6. QA: full 360×180 coverage, seamless horizontal seam, correct doors/windows, mouse/touch drag, mobile, fullscreen, broken image fallback, no regression in deals/contracts/payments.
7. Measure AI cost per accepted room, provider errors, regeneration count and publication approvals before expanding to other layouts.

## Rollout safety
No schema migrations, production data edits, external AI spending or deployment before independent review. Keep feature behind a flag. Run build/tests and preview smoke tests before a controlled release.
