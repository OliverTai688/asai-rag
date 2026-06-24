# 2026-06-25 LV3 Client Route B Session Source Consumption

## Scope
- Loop type: L2 implementation/proof slice.
- Selected slice: `LV3-TDF-004h client-built session source review -> advisor-visible/session consumption proof`.
- Goal: connect the previous no-provider `ClientRouteBSessionSourceReview.sessionSourceReview` payload to an advisor-visible Route B stage/source panel consumption contract, without DB writes, provider calls, source-grounding persistence claims, or confirmed CRM fact writes.
- Strategic note: DB DNS still returns `ENOTFOUND`, so live DB-backed cross-flow proof remains deferred. This loop avoids repeating a blocker report by adding a source-backed deterministic consumption boundary.

## Candidate Score
- 9.1/10 `LV3-TDF-004h`: best unblocked slice. It connects client/family profile source grounding -> session source review -> advisor-visible Route B stage source panel contract and is fully deterministic.
- 9.4/10 live DB-backed `lv3:cross-flow-no-provider-qa`: highest product evidence value, but blocked by Supabase host DNS `ENOTFOUND`.
- 8.3/10 Relationship confirmation/RelationshipEdge persistence: high value, but still requires operator A/B/C or schema approval before durable writes.

## Changes
- Added `src/domains/theater/client-route-b-session-source-consumption.ts`.
  - New `buildClientRouteBSessionSourceConsumption()` maps a safe `ClientRouteBSessionSourceReview` into `RouteBSessionSourceReviewConsumption`.
  - Consumption target: `/theater/[sessionId]`, `RouteBSessionSnapshot.scene.sourceGrounding`, and existing stage data hook `data-route-b-family-profile-source-grounding`.
  - Output keeps safe counts/previews only: character/member/field/unknown counts and FACT/INFERENCE/UNKNOWN counts; raw source reference IDs, raw metadata, provider payloads, private transcript, and contact sentinels stay out.
- Added `scripts/theater-client-route-b-session-source-consumption-dry-run.ts` and `.mjs`.
- Added package script `pnpm theater:client-route-b-session-source-consumption-dry-run`.
- Updated internal AgentFacts-style metadata for `asai.theater.route_b`.
  - Version: `2026-06-25.client-route-b-session-source-consumption`.
  - Added capability/action/evidence for `route-b-client-session-source-consumption`.
  - Added owner refs and proof command to manifest and registry QA expectations.
- Updated loop state and issue-question with completion and next recommended slice.

## Validation
- PASS: `pnpm theater:client-route-b-session-source-consumption-dry-run`
  - `READY_FOR_ADVISOR_SOURCE_REVIEW`
  - destination surface `/theater/[sessionId]`
  - stage data attribute `data-route-b-family-profile-source-grounding`
  - source counts: 3 characters, 3 family profile members, 12 fields, 3 unknowns
  - fact status counts: FACT 6 / INFERENCE 3 / UNKNOWN 3
  - high-sensitive path remains `BLOCKED_SENSITIVE` with 0 advisor-visible panels
  - no provider, no DB, no source-grounding persistence, no raw references, no raw metadata, no client/profile/policy/confirmed CRM fact writes
- PASS: `pnpm theater:client-route-b-session-source-review-dry-run`
- PASS: `pnpm ai:protocol-registry-qa`
- PASS: `pnpm ai:bff-audit`
  - Overall pass; DB summary remains warn: `ENOTFOUND db.wwocdcicvpmbdmqvskzi.supabase.co`.
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
  - Exit 0; still reports an existing warning in `scripts/public-status-degraded-qa.mjs` for unused `existsSync`.

## DB/Prisma
- No Prisma schema change.
- No Prisma generate / validate / db push.
- No DB write attempted.
- DB DNS preflight still blocked: `db.wwocdcicvpmbdmqvskzi.supabase.co` -> `ENOTFOUND`.

## NANDA Alignment
- Updated `asai.theater.route_b` internal AgentFacts-style manifest with capability, action, input/output refs, owner refs, evidence refs, and proof command for client-built session source consumption.
- Registry readiness remains `internal-only`; no external NANDA / third-party registry publication, signing, public discovery, or cross-org agent access.
- New proof remains deterministic no-provider. Future OpenAI/Anthropic provider enablement still requires `AiUsageLog` success/error evidence before any provider path is accepted.

## Git
- Branch: `codex/asai-lv3-automation`.
- Commit: pending.
- Push: push skipped by user instruction.

## Blockers
- Environment blocker: Supabase DB host DNS remains `ENOTFOUND`, blocking full live DB-backed `pnpm lv3:cross-flow-no-provider-qa`.
- Product/schema blockers unchanged:
  - Relationship confirmation persistence needs A/B/C decision.
  - Formal `RelationshipEdge` table migration needs explicit approval.
- No blocker for this deterministic source-backed slice.

## Next Recommended Loop
- First re-check DB DNS.
- If DB is restored, run full live DB-backed `DEMO_QA_BASE_URL=http://127.0.0.1:<free-port> pnpm lv3:cross-flow-no-provider-qa`.
- If DB remains unavailable and no operator decision arrives, select `LV3-TDF-004i client-built source consumption -> deterministic Route B stage adapter/browser fixture proof`.
- Push remains skipped by user instruction.
