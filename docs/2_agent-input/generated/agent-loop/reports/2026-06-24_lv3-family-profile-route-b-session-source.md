# 2026-06-24 LV3 Family Profile Route B Session Source Grounding

## Scope

Normal LV3 implementation/proof loop. Selected one source-backed slice: carry `FamilyMember.metadata.profile` grounding from preparation/theater build into Route B session source grounding and stage readback. This is LV3 advisor-system maturity work, not public launch Level 3 readiness.

## Candidate score

1. REL-006c Family profile -> Route B session source grounding/readback: 30/30. Connects relationship graph/profile metadata -> preparation/theater build -> DB-backed Route B session/readback/stage UI, follows REL-004e and meeting-signal source-grounding patterns, and stays no-schema/no-provider/no confirmed fact write.
2. Advisor UI editor for family profile metadata: 25/30. Useful for data entry, but more UI-local and less cross-surface than session grounding.
3. Formal `RelationshipEdge` table migration: 24/30 value, blocked. Higher strategic value, but still needs additive schema/migration/rollback approval.

## Selected slice

REL-006c: `FamilyMember.metadata.profile` -> Route B session `sourceGrounding.familyProfiles`, with BFF-safe summary, session draft/readback preservation, stage source panel, and AgentFacts-style manifest refs.

## Changes

- Added `TheaterRouteBFamilyProfileGroundingSummary` / builder / sanitizer in `src/domains/theater/route-b-handoff.ts`.
- `/theater/build` now converts `family_profile_field=true` stage fields into Route B handoff `familyProfiles` source grounding.
- `/theater/[sessionId]` now displays `data-route-b-family-profile-source-grounding` with field/member/status/source-count and no-write/no-raw boundaries.
- Updated Route B schema dry-run to prove session `sceneState`/metadata carries safe family profile grounding without source reference ids.
- Added `pnpm theater:family-profile-session-source-qa`.
- Updated AgentFacts manifest and registry QA refs; status remains `internal-only`.
- Updated `AGENTS.md`, `PLN-024`, `ACC-016`, `issue-question.md`, and `loop-state.json`.

## Validation

- PASS `pnpm theater:family-profile-session-source-qa`
- PASS `pnpm theater:relationship-edge-shadow-session-source-qa`
- PASS `pnpm theater:meeting-signal-session-source-qa`
- PASS `pnpm visit:family-profile-theater-handoff-qa`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm visit:theater-handoff-dry-run`
- PASS `pnpm theater:route-b-handoff-dry-run`
- PASS `pnpm theater:route-b-schema-dry-run`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed` (exit 0; existing warning in `scripts/public-status-degraded-qa.mjs`, not touched by this slice)

## Evidence

New QA proves the build -> handoff -> session snapshot -> UI panel -> manifest path includes family profile grounding and excludes raw metadata, source reference ids, raw provider payload, raw private transcript, relationship graph writes, VisitPlan writes, confirmed CRM fact writes, provider calls, and fake `AiUsageLog`.

NANDA alignment: Route B AgentFacts-style manifest now declares `route-b-family-profile-source-grounding`, `TheaterRouteBScene.sourceGrounding.familyProfiles`, `RouteBFamilyProfileGroundingPanel`, and proof command `pnpm theater:family-profile-session-source-qa`. Registry readiness remains `internal-only`; no external registry publication, signing, public discovery, or cross-org access was attempted.

## DB/Prisma

No Prisma schema change. No `prisma generate`, no `prisma db push`, no production write, no destructive DB operation. The only persistence proof is dry-run payload construction for Route B session `sceneState`/metadata.

## Git

Push skipped by user instruction. Local commit pending after final validation.

## Blockers

- Formal `RelationshipEdge` table remains blocked on additive schema/migration/rollback approval.
- Relationship confirmation card refresh/new-context persistence remains blocked on product/schema A/B/C decision.
- Live provider Route B roleplay still requires provider env/runtime proof; this slice is deterministic no-provider.

## Next Recommended Loop

If no REL-004 approval and no relationship confirmation persistence decision arrives, do one more no-schema cross-surface slice: either add a compact advisor UI editor for family member profile metadata, or carry `sourceGrounding.familyProfiles` into Route B next-turn/provider prompt or feedback review context with least-disclosure runtime proof.

push skipped by user instruction
