# 2026-06-23 LV3 Relationship Edge Shadow BFF Summary

## Scope

- Loop type: L2 implementation + L1 source/proof.
- Selected slice: REL-004b `RelationshipEdge` shadow BFF summary.
- Goal: move the no-schema relationship edge shadow contract one step closer to the core flow by exposing a BFF-safe summary through `/api/clients/[id]/relationship-graph`, without formal schema migration, DB writes, provider calls, or client-facing draft-edge payload.

## Candidate score

1. REL-004b no-schema edge-shadow BFF summary — 27/30: connects client relationship graph to downstream prep/theater readiness, adds source+BFF+QA proof, preserves approval boundary, no schema/DB/provider.
2. Relationship confirmation persistence — 20/30: high product value, but still blocked by Option A/B/C product decision for persistence target.
3. Formal REL-004 `RelationshipEdge` schema — 18/30: highest eventual architecture value, but requires explicit additive schema + migration/rollback + DB proof approval.

## Changes

- Added `RelationshipEdgeShadowBffSummary` and `toRelationshipEdgeShadowBffSummary(...)` so full `RelationshipEdgeDraft` remains server-side while BFF can expose counts, warning codes, and proof flags.
- Added `edgeShadow` to `ClientRelationshipGraphResponse` via the existing current-member scoped relationship graph repository.
- Updated `client:relationship-graph-qa` assertions to check the API contract when full runtime/browser proof is run.
- Added `client:relationship-edge-shadow-bff-qa` for server-free source-level BFF proof.
- Updated REL-004b task/evidence in `AGENTS.md`, `PLN-024`, `ACC-016`, and loop cadence state.

## Validation

- PASS `pnpm client:relationship-edge-shadow-qa`
- PASS `pnpm client:relationship-edge-shadow-bff-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed` (existing warning only: `scripts/public-status-degraded-qa.mjs` unused `existsSync`, not this loop)
- PASS `pnpm exec eslint scripts/client-relationship-edge-shadow-bff-qa.mjs`
- PASS `git diff --check`

## Evidence

- Edge shadow dry-run output: 9 deterministic draft edges, duplicateDraftIds 0, warnings `UNSUPPORTED_ROOT_RELATION` and `MISSING_PARENT_MEMBER`.
- BFF summary proof: `clientFacingDraftEdgesReturned=false`, `formalSchemaApproved=false`, and no `draftEdges` / draft ids / source or target node ids / metadata / client id in summary payload.
- Runtime/browser residual evidence can be collected by running `pnpm client:relationship-graph-qa`; the script now includes edgeShadow API assertions.

## DB/Prisma

- No Prisma schema change.
- No `prisma generate`, `prisma validate`, migration, `db push`, DB write, provider call, email, notification, payment, refund, or remote deletion.

## Git

- Local commit is required after validation.
- Push skipped by user instruction.

## Blockers

- Formal REL-004 schema/table remains blocked until operator explicitly approves additive Prisma schema, migration/rollback note, and allowed DB target proof.
- Relationship confirmation persistence remains blocked by product decision A/B/C.

## Next Recommended Loop

- If approval is granted: implement formal REL-004 schema/migration with rollback and DB proof.
- If approval is still absent: consume `edgeShadow` summary in a no-schema previsit/theater readiness bridge, or implement relationship confirmation persistence after A/B/C decision.
