# 2026-06-20 LV3 Visit Package To Theater Handoff

## Scope

Normal LV3 implementation/proof loop.

Selected slice: `lv3-previsit-to-theater-stage`.

This slice creates the source-level handoff from a visit preparation package to a theater setup
draft. It reuses the existing `TheaterBuildPacket` / `/theater/build` contract and does not start
Theater Route B migration.

## Candidate Score

1. `lv3-previsit-to-theater-stage`: 16
   - +7 connects preparation package to theater.
   - +5 moves theater toward a stage grounded in client graph/package evidence while preserving
     fact/inference/unknown boundaries.
   - +4 adds source-level proof for a LV3-critical path.
   - No provider call, no production mutation, no Theater enum/scoring migration.
2. `lv3-client-to-relationship-graph`: 11
   - +7 connects client creation to relationship graph.
   - +4 would improve onboarding/no raw-ID operation, but it needs broader CRM UI/BFF scope than this
     loop.
3. `lv3-interview-to-workspace-creation`: 10
   - +7 connects interview to workspace creation/writeback.
   - +3 documentation/proof value, but PIM writeback is already covered and the next missing link was
     package-to-theater handoff.

## Changes

- Added `src/domains/theater/visit-handoff.ts`.
  - Converts `Client` + `VisitPlan` + preparation-question reasoning evidence into known materials
    for `buildTheaterFieldBuildContext`.
  - Preserves `FACT` / `INFERENCE` / `UNKNOWN` labels from client profile, relationship graph,
    policies, visit objectives, SPIN question reasoning, objections, visit materials, and compliance
    gaps.
  - Blocks highly sensitive clients without `reason` + `riskAccepted`; blocked packets set
    `canStartSimulation=false`.
  - Scrubs email/phone-like values from generated handoff materials.
- Added `pnpm visit:theater-handoff-dry-run`.
- Updated TDF docs/AGENTS with a partial progress note; TDF-004 remains incomplete because the
  member-scoped BFF/API/browser gate is not yet implemented.
- Updated `loop-state.json` cadence counter from 1 to 2 and the next recommended slice.

## Validation

- PASS: `pnpm visit:theater-handoff-dry-run`
  - READY packet, 35 known materials, NPC 4, relationships 7, confirmed facts 18, inferences 13,
    unknowns 4.
  - High-sensitivity without approval: `BLOCKED_SENSITIVE`.
  - High-sensitivity with `reason` + `riskAccepted`: `READY`.
- PASS: `pnpm visit:reasoning-dry-run`
  - Evidence sources: `ai_tag`, `client_profile`, `policy`, `relationship_graph`, `unknown`,
    `visit_purpose`.
  - Evidence statuses: `confirmed`, `inference`, `unknown`.
- PASS: `pnpm interview:theater-build-dry-run`
  - Existing TheaterBuildPacket contract still produces READY and NEEDS_MORE_INFO paths.
- PASS: `git diff --check`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
- PASS: `pnpm exec eslint src/domains/theater/visit-handoff.ts scripts/visit-theater-handoff-dry-run.ts scripts/visit-theater-handoff-dry-run.mjs`

## Evidence

- Source proof: `pnpm visit:theater-handoff-dry-run`.
  - Expected to prove READY handoff, NPC <= 4, relationship/policy/objective/question evidence,
    unknown preservation, high-sensitivity blocking, and no email/phone leakage.

## DB / Prisma

- Schema changed: no.
- Prisma validate/generate: not required.
- db push: not run.
- Provider calls: none.
- AiUsageLog: no new usage rows required because this is a pure deterministic no-provider proof.

## Git

- Local commit required.
- Push target: `push skipped by user instruction`.

## Blockers

- Source blocker remaining: TDF-004 still needs member-scoped BFF/API proof and browser launch flow.
- Product/Route B blocker remaining: full multi-character theater, private/group chat, director
  routing, and qualitative feedback remain in ITA-003/ITA-006.

## Next Recommended Loop

Continue `lv3-previsit-to-theater-stage` by wiring the pre-visit preparation package UI/BFF launch
path to `/theater/build` using the new handoff contract, or score it against
`lv3-client-to-relationship-graph` if the next loop needs a lower-risk CRM slice.
