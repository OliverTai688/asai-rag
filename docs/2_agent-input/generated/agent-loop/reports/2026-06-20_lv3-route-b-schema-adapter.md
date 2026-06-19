# 2026-06-20 - LV3 Route B Schema Adapter

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `ITA-003a Route B additive schema and typed persistence adapter`.
- Goal: move the theater runtime from pure handoff contract toward a persistable Route B session/character/turn data shape without calling providers or pushing DB changes.

## Candidate Score

1. `ITA-003a Route B additive schema and typed persistence adapter` - 19/20
   - Connects preparation package/client theater build packets to the real private/group theater runtime.
   - Moves theater toward multi-character state, visibility scope, private chat, and safe person-state updates.
   - Keeps migration risk bounded: additive schema, local validate/generate only, no provider, no DB push.
2. `BFF-001 full-site data-source inventory and responsibility matrix` - 15/20
   - High platform safety value and no schema risk, but less direct than the Route B runtime blocker.
3. `PIM/BFF interview writeback -> VisitPlan/TheaterBuildDraft` - 14/20
   - Strong interview-to-workspace continuation, but it needs the Route B persistence target clarified first.

## Selected Slice

`ITA-003a Route B additive schema and typed persistence adapter`.

This loop did not call OpenAI/Anthropic and did not run `prisma db push`.

## Changes

- Added additive Route B Prisma schema:
  - `TheaterRouteBCharacterRole`.
  - `TheaterRouteBVisibilityScope`.
  - `TheaterCharacter`.
  - `TheaterSession.routeBEnabled`, `routeBSceneId`, `routeBSourcePacketId`, `sceneState`, `visibilityRules`.
  - `TheaterTurn.speakerCharacterId`, `addresseeCharacterId`, `visibilityScope`, `directorDirective`, `statePatches`.
- Preserved legacy `TheaterPersonaType`, `TheaterTurnRole`, `tension`, and `score` columns for compatibility; Route B adapter sets legacy `personaType`/`tension` as compatibility-only values.
- Added `src/lib/theater/route-b-session-repository.ts`.
  - Converts `TheaterRouteBHandoffPacket` into typed `TheaterSession`, `TheaterCharacter`, and opening `TheaterTurn` create payloads.
  - Provides turn payload helper for advisor/director/character/narrator turns.
  - Provides visibility helper proving group/private/director/narrator boundaries.
  - Provides an injected-client persistence adapter for a future DB-migrated runtime, without importing runtime Prisma in the dry-run path.
- Added `pnpm theater:route-b-schema-dry-run`.
- Updated `AGENTS.md`, `PLN-015`, `issue-question.md`, and `loop-state.json`.

## Validation

- `pnpm prisma:validate`: pass.
- `pnpm prisma:generate`: pass.
- `pnpm theater:route-b-schema-dry-run`: pass.
- `pnpm exec eslint src/lib/theater/route-b-session-repository.ts scripts/theater-route-b-schema-dry-run.ts scripts/theater-route-b-schema-dry-run.mjs`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- Final `pnpm lint:changed`: pass.
- Final `git diff --check`: pass.

## Evidence

`pnpm theater:route-b-schema-dry-run` final proof includes:

- Route B session payload stores scene/source packet id and can enable Route B only from enabled handoff.
- Legacy `personaType` remains compatibility-only; legacy tension is neutralized.
- Character payloads persist focus and NPC roles with exactly one focus character.
- Opening turn is director-only.
- Future director/character/feedback calls all require `AiUsageLog`.
- Character/advisor/director turns map to legacy turn roles only for compatibility.
- Group turn is visible to characters; private turn is visible only to speaker/addressee.
- Director-only and narrator state-patch turns are not character-visible by default.
- State patches cannot write confirmed CRM facts.
- Schema draft string values contain no email/phone/raw-private sentinel.

## DB / Prisma

- Prisma schema changed: yes, additive Route B schema only.
- Prisma validate/generate: pass.
- Prisma db push: not run.
- DB operations: none.
- Provider calls: none. No `AiUsageLog` row required for this deterministic no-provider proof; the Route B call plan and schema adapter preserve that future director/character/feedback provider calls require `AiUsageLog`.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 13]`.
- Local commit: created after final validation; final response records the commit hash.
- Push: `push skipped by user instruction`.

## Blockers

- Source blocker: Route B director provider route, character provider route, and feedback route are not implemented.
- Source/proof blocker: success/error runtime `AiUsageLog` proof for Route B provider calls is not implemented.
- Production approval blocker: production DB migration / db push remains approval-gated.
- Operator/environment blocker: `pnpm build` remains blocked by the known Next/Turbopack Google Font path issue.

## Next Recommended Loop

Cadence now reaches 4 normal loops since the last whole-product review. Next heartbeat should run:

`docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`

Suggested review focus: Route B schema adapter exists, but production runtime/provider proof and BFF-001 inventory need reprioritization before further implementation.
