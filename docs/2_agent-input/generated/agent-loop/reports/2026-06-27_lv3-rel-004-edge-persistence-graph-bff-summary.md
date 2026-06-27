# 2026-06-27 LV3 REL-004 Edge Persistence Graph BFF Summary

## Scope
- Loop type: normal LV3 implementation/proof loop (`normalLoopsSinceLastWholeProductReview=2` after this loop).
- Selected slice: formal `RelationshipEdge` persistence readiness -> relationship graph BFF boundary.
- Goal: consume the formal edge persistence source in `/api/clients/[id]/relationship-graph` without claiming live DB proof while DB DNS remains unavailable.

## Candidate Score
1. `REL-004 formal RelationshipEdge -> relationship graph BFF summary` — 9.1/10. Connects formal persisted edge source to the relationship graph surface; no DB write/provider call required; reduces ambiguity with explicit `READY/EMPTY/UNAVAILABLE` proof flags.
2. `REL-004 live HTTP/DB edge persistence proof` — 8.5/10 if DB recovered, but blocked this loop by DNS `ENOTFOUND`.
3. `relationship confirmation durable policy` — 8.0/10. Important writeback blocker, but should follow a clear graph-facing formal edge readiness boundary or a product schema decision.

## Selected Slice
- Added `edgePersistence` to `ClientRelationshipGraphResponse`.
- The summary queries `prisma.relationshipEdge.findMany` by `clientId` and `session.organization.id`, selecting only `type` and `factStatus`.
- The client-facing DTO exposes aggregate status/counts/proof only, not raw edge ids, metadata, backfill keys, source references, or CRM confirmation claims.

## Changes
- `src/lib/clients/relationship-graph-repository.ts`
  - Added `RelationshipEdgePersistenceBffSummary`.
  - Added formal edge aggregate count/status/proof helpers.
  - Added guarded unavailable fallback when the formal edge query is unavailable.
- `scripts/client-relationship-graph-qa.mjs`
  - Extended live relationship graph QA to assert the new `edgePersistence` boundary when DB proof can run.
- `scripts/client-relationship-edge-graph-bff-qa.mjs`
  - Added no-DB source proof for package wiring, BFF response shape, org-scoped query, safe aggregate payload, no writes, and no provider/fake `AiUsageLog`.
- `package.json`
  - Added `client:relationship-edge-graph-bff-qa`.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - Updated cadence counter and next recommended slice.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
  - Recorded the resolved source proof and remaining live DB blocker.

## Validation
- PASS `pnpm client:relationship-edge-graph-bff-qa`
- PASS `pnpm client:relationship-edge-persistence-qa --source-only`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed` (exit 0; one existing warning in `scripts/public-status-degraded-qa.mjs`)
- PASS `git diff --check`
- PASS loop-state JSON parse
- BLOCKED live HTTP/DB proof: DB DNS preflight returned `DNS_FAIL ENOTFOUND`.

## Evidence
- New self-runnable source proof: `pnpm client:relationship-edge-graph-bff-qa`
- Existing formal edge source proof retained: `pnpm client:relationship-edge-persistence-qa --source-only`
- Live proof commands to run after DB recovery:
  - `DEMO_QA_BASE_URL=http://127.0.0.1:<asai-port> pnpm client:relationship-edge-persistence-qa`
  - `DEMO_QA_BASE_URL=http://127.0.0.1:<asai-port> pnpm client:relationship-graph-qa`

## DB/Prisma
- No Prisma schema change.
- No `prisma generate`, `prisma db push`, DB write, provider call, or `AiUsageLog` write attempted.
- DB DNS remains unavailable: `db.wwocdcicvpmbdmqvskzi.supabase.co` -> `ENOTFOUND`.

## Git
- Local commit required after this report is staged.
- Push skipped by user instruction.

## Blockers
- Runtime/live-proof blocker: Supabase DB host DNS `ENOTFOUND`.
- Product/schema decision blocker remains for durable relationship confirmation card state; not touched this loop.

## Next Recommended Loop
- First re-check DB DNS. If recovered, run the live formal edge persistence proof and relationship graph live QA.
- If DB remains unavailable, implement the next no-DB source-backed graph render/UI affordance slice that visibly consumes `edgePersistence.status` without claiming live DB persistence proof.
