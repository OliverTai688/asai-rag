# 2026-06-20 - LV3 Route B Handoff Contract

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `TDF-005a Route B handoff packet and migration compatibility brief`.
- Goal: define the bridge from setup draft / `TheaterBuildPacket` into Route B scene, characters, director input, character input, private/group visibility, state patches, AiUsageLog strategy, and rollback boundary without touching Prisma schema or provider routes.

## Candidate Score

1. `TDF-005a Route B handoff packet and migration compatibility brief` - 19/20
   - Connects previsit/client/interview theater build packets to the future multi-character theater runtime.
   - Directly unblocks private/group chat and person-state update architecture.
   - Low DB risk because it is a pure contract + proof slice.
2. `PIM/ITA interview writeback -> theater build packet alignment` - 16/20
   - Strong cross-surface value for AI interview creation and refinement, but Route B still needed a stable theater consumption contract first.
3. `BFF-103b relationship graph edit/delete remote-confirmed write path` - 15/20
   - Important client -> relationship graph maturity, but lower leverage for the current theater-runtime blocker selected by the whole-product review.

## Changes

- Added `src/domains/theater/route-b-handoff.ts`.
  - Defines `TheaterRouteBHandoffPacket`, `TheaterRouteBScene`, `TheaterRouteBCharacter`, `TheaterRouteBVisibilityRule`, `TheaterRouteBStatePatch`, director input, character input, and AiUsage plan.
  - Enforces NPC cap 4, visibility scopes `GROUP` / `PRIVATE` / `DIRECTOR_ONLY` / `NARRATOR`, state patches requiring confirmation, and `writesConfirmedCrmFact=false`.
- Added `pnpm theater:route-b-handoff-dry-run`.
  - Proves focus client, NPC cap, unknown/inference boundaries, private history isolation, state patch safety, AiUsageLog requirements, rollback note, and no-provider/no-private-sentinel boundaries.
- Added `AUD-007_theater-route-b-handoff-compatibility-brief-v1.0.md`.
  - Documents legacy `personaType`, `tension`, `score` compatibility, Route B disabled rollback, and ITA-003 handoff boundaries.
- Updated `PLN-020`, `PLN-015`, `AGENTS.md`, docs index, package script, and loop state.

## Validation

- `pnpm theater:route-b-handoff-dry-run`: pass.
- `pnpm exec eslint src/domains/theater/route-b-handoff.ts scripts/theater-route-b-handoff-dry-run.ts scripts/theater-route-b-handoff-dry-run.mjs`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.
- `git diff --check`: pass.

## Evidence

- Dry-run printed 20 PASS checks:
  - focus client exists.
  - NPC count capped at Route B maximum.
  - extra NPC trimmed.
  - unknown gaps remain narrator questions.
  - persona hints preserve inference status.
  - group/private/director/narrator scopes exist.
  - Route B runtime disabled by default.
  - director/character/feedback calls require `AiUsageLog`.
  - character input sees group and own private thread only.
  - state patch requires confirmation and cannot write confirmed CRM fact.
  - handoff strings contain no email/phone/raw private sentinel.

## DB / Prisma

- No Prisma schema change.
- No Prisma command required.
- No DB write.
- No provider call; no `AiUsageLog` row required for this handoff builder. Runtime call plans explicitly require `AiUsageLog` for future director/character/feedback provider calls.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 10]`.
- Push: `push skipped by user instruction`.
- Commit hash: reported in final response after local commit.

## Blockers

- Remaining blocker type: Route B production runtime/schema not implemented.
- ITA-003 still needs Prisma migration review, DB rollback QA, director provider route, character provider route, feedback route, and success/error `AiUsageLog` proof.
- High-sensitive real client theater use still needs reason/risk boundary and audit when connected to runtime.

## Next Recommended Loop

- Recommended: `ITA-003a Route B schema/runtime migration draft using TDF-005a handoff contract`.
- Safer fallback: `TDF-006 cross-state theater QA` if the next loop should avoid schema changes.
