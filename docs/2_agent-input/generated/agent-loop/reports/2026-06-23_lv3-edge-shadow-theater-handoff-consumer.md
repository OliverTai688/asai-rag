# 2026-06-23 LV3 Edge Shadow Theater Handoff Consumer

## Scope

- Loop type: L2 implementation + L1 executable proof.
- Selected slice: REL-004c `edgeShadow` summary -> preparation/theater handoff consumer.
- Goal: let the preparation-package-to-theater handoff consume the no-schema RelationshipEdge shadow summary as edge-model readiness evidence, without exposing server-only draft edges or writing relationship facts.

## Last Two Loops

- Previous loop: REL-004b BFF summary, L2 implementation + L1 source proof.
- Prior loop: REL-004a shadow contract, L2 implementation + L1 executable proof.
- Anti-repetition: this loop is not another BFF summary wrapper. It consumes the already-created safe summary in the next core surface, `buildVisitTheaterHandoff()`, and adds executable handoff proof.

## Candidate score

1. REL-004c edgeShadow -> theater handoff consumer — 28/30: connects relationship graph -> preparation package -> theater, keeps schema/DB/provider untouched, adds executable proof, and narrows formal REL-004 blocker impact.
2. Relationship confirmation persistence — 20/30: high value, but still blocked by A/B/C persistence decision.
3. Formal REL-004 `RelationshipEdge` schema — 18/30: high architecture value, but blocked by explicit schema/migration/DB approval.

## Changes

- `buildVisitTheaterHandoff()` now derives a `relationshipEdgeShadow` summary from the client on the server/domain path.
- Handoff `sourceSummary` now includes `sourceCounts.relationshipEdgeShadowCandidates` and `evidenceSummary.relationshipEdgeShadow`.
- Theater `knownMaterials` now includes `relationship_edge_shadow_summary=true` with candidate counts, type/status counts, warning codes, and approval/writeback proof flags only.
- Handoff warnings/missing now state formal `RelationshipEdge` schema is not approved and theater may only use the safe summary.
- `visit:theater-handoff-dry-run` now asserts edgeShadow summary, no draft-edge internals, no DB/provider/writeback, and unsupported relation warning handling.
- REL-004c status/evidence added to `AGENTS.md`, `PLN-024`, and `ACC-016`.

## Validation

- PASS `pnpm visit:theater-handoff-dry-run`
- PASS `pnpm client:relationship-edge-shadow-bff-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed` (existing warning only: `scripts/public-status-degraded-qa.mjs` unused `existsSync`, not this loop)
- PASS `git diff --check`

## Evidence

- Handoff proof output: 5 edge candidates, `UNSUPPORTED_ROOT_RELATION` warning, `relationshipEdgeShadow` in source summary.
- Safety flags: `schemaChanged=false`, `databaseWriteAttempted=false`, `providerCallAttempted=false`, `clientFacingDraftEdgesReturned=false`, `formalSchemaApproved=false`.
- Handoff proof confirmed no `draftEdges`, draft id, source/target node id, source refs, metadata, private contact, policy sentinel, raw provider payload, or secret in the serialized handoff output.

## DB/Prisma

- No Prisma schema change.
- No `prisma validate`, `prisma generate`, migration, `db push`, DB write, provider call, email, notification, payment, refund, or remote deletion.

## Git

- Local commit required after validation.
- Push skipped by user instruction.

## Blockers

- Formal REL-004 `RelationshipEdge` table remains blocked by explicit schema/migration/DB approval.
- Relationship confirmation persistence remains blocked by A/B/C product decision.

## Next Recommended Loop

- If schema approval is granted: implement formal REL-004 migration and DB proof.
- If approval is still absent: add a no-schema UI/session-source consumer that displays edgeShadow readiness in previsit/theater surfaces, or implement relationship confirmation persistence after A/B/C decision.

push skipped by user instruction
