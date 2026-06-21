# 2026-06-21 LV3 AMM-005c Notes Compatibility Bridge

## Scope
- Loop type: LV3 normal implementation/proof loop.
- Selected slice: `AMM-005c notes/postVisitNotes compatibility bridge`.
- Goal: keep `/pre-visit/[planId]/notes` and legacy `postVisitNotes` usable while connecting the same visit plan to the accepted `CLIENT_MEETING` workspace, summary, and writeback UI.

## Candidate Score
1. `AMM-005c notes/postVisitNotes compatibility bridge` — 9/10. Highest user-facing split in the AMM flow; connects post-visit notes, meeting capture, latest summary, writeback confirmation, and quick-capture boundary across two core surfaces.
2. `REL-004 formal edge table schema` — 7/10. High product value for relationship graph formalization, but requires migration/rollback approval and DB proof.
3. `AMM-007 pgvector retrieval` — 6/10. Important for meeting memory quality, but requires Supabase extension/operator path and DB availability.

## Changes
- Added owner-scoped latest meeting lookup: `GET /api/ai/meeting/sessions?visitPlanId=...`.
- Added `findLatestMeetingSessionForMember()` to reuse the most recent owner-scoped `CLIENT_MEETING` for a visit plan without requiring raw session ID entry.
- Embedded `MeetingWorkspace` into `/pre-visit/[planId]/notes`, preserving legacy `postVisitNotes` save/read UI and quick-capture controls on the same page.
- Seeded meeting manual-note draft from processed post-visit notes text only; raw transcript/provider payload/private transcript storage remains blocked by existing guards.
- Added `pnpm meeting:notes-compat-qa` as a self-runnable browser/API/DB proof command.
- Updated AI Meeting AgentFacts-style manifest for the new capability, endpoint, action boundary, proof command, and NANDA least-disclosure notes.

## Validation
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.
- PASS: `node --check scripts/meeting-notes-compat-qa.mjs`.
- PASS: `pnpm ai:protocol-registry-qa`.
- PASS: `pnpm ai:bff-audit` overall route audit; DB summary warns on the same unreachable Supabase host.
- FAIL/BLOCKED: `DEMO_QA_BASE_URL=http://localhost:3001 pnpm meeting:notes-compat-qa` stopped before product flow with `getaddrinfo ENOTFOUND db.wwocdcicvpmbdmqvskzi.supabase.co`.

## Evidence
- Source proof: notes page now contains `notes-meeting-bridge`, `post-visit-notes-textarea`, `post-visit-notes-saved-state`, and embedded `MeetingWorkspace`.
- Route proof: `/api/ai/meeting/sessions` now supports no-provider GET latest-session lookup and POST create.
- Protocol proof: manifest still passes registry QA and AI route usage audit.
- Residual self-runnable proof once DB DNS recovers:
  - Start dev server, note port.
  - Run `DEMO_QA_BASE_URL=http://localhost:<port> pnpm meeting:notes-compat-qa`.
  - Expected coverage: owner save/read `postVisitNotes`, latest meeting lookup, new-context notes + summary reload, manager denial, raw provider sentinel 409/no echo, no-provider `AiUsageLog` unchanged, desktop/mobile no overflow and console error 0.

## DB/Prisma
- No schema change.
- No `prisma db push`.
- DB proof blocked because `.env` Supabase host `db.wwocdcicvpmbdmqvskzi.supabase.co` cannot resolve locally; `/api/public/status` returns 500 with Prisma P1001 for the same reason.

## NANDA Alignment
- Updated `asai.meeting.prototype` to version `2026-06-21.amm-005c-notes-compat`.
- Added capability `meeting-notes-compat-bridge`, endpoint `find-latest-meeting-session`, action `bridge-post-visit-notes-and-client-meeting`, and proof command `pnpm meeting:notes-compat-qa`.
- Registry state remains `internal-only`; no external publication, discovery endpoint, signing, or cross-org access was enabled.

## Git
- Local commit required after staging this loop only.
- Push status: push skipped by user instruction.

## Blockers
- Environment/DB blocker: Supabase database host DNS `ENOTFOUND`, also surfaced as Prisma P1001 from the dev server.
- Not a product decision blocker; it is an external availability/configuration issue.

## Next Recommended Loop
- If DB DNS resolves: rerun `pnpm meeting:notes-compat-qa` and mark AMM-005c Browser/API/DB proof complete.
- If DB remains blocked: switch to a no-DB source/contract fallback or L4 blocker analysis; do not spend another loop on docs-only evidence.
