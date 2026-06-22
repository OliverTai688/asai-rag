# 2026-06-22 LV3 ITA-003h Route B Orchestration Contract

## Scope

- Loop type: normal LV3 implementation/proof loop after one whole-product review.
- Selected slice: `ITA-003h Route B director/character orchestration contract (no-provider first)`.
- Anti-repetition: this is source-backed L2/L1 work, not docs-only proof. The preceding cadence review recommended this slice; this loop implements the domain contract and executable dry-run.

## Candidate Score

1. `ITA-003h Route B orchestration contract` - 93/100. Connects advisor turn, director directive, character input, private/group visibility, narrator unknowns, and persistence envelope without DB/provider dependency.
2. `AMM-005c runtime/browser proof` - 64/100. Valuable, but still dependent on DB/DNS stability; user prefers self-runnable residual evidence instead of repeated proof chasing.
3. `REL-004 relationship edge schema` - 61/100. Important for relationship graph maturity, but requires schema/operator path and is less immediately connected to the current theater runtime gap.

## Selected Slice

Implemented a no-provider Route B orchestration contract:

- `buildTheaterRouteBOrchestrationPlan()` converts latest advisor group/private turn into director input, speaker/addressee/visibility directive, character reply input, persistence envelope, narrator queue, and provider boundary.
- Named addressee must answer; non-addressed group turns avoid a character who already hit the consecutive speaker cap.
- Character input uses scoped history: group turns plus the selected character's private lane only; other private lanes and director-only turns stay hidden.
- Unknown narrator questions become `UNKNOWN` state proposals with `requiresConfirmation=true` and `writesConfirmedCrmFact=false`.
- Provider posture is explicit: `providerCallAttempted=false`, `aiUsageLogWritten=false`, future provider enablement requires success/error `AiUsageLog`.

## Changes

- Added `src/domains/theater/route-b-orchestration.ts`.
- Added `scripts/theater-route-b-orchestration-dry-run.ts`.
- Added `scripts/theater-route-b-orchestration-dry-run.mjs`.
- Added `pnpm theater:route-b-orchestration-dry-run`.
- Updated `src/domains/ai-protocol/manifest.ts` for `asai.theater.route_b` orchestration capability/action/DTO refs/proof command.
- Updated `scripts/ai-protocol-registry-qa.ts` to require the new Route B orchestration owner/evidence/proof refs.
- Updated `PLN-015`, `ACC-006`, and loop state.

## Validation

- PASS `pnpm theater:route-b-orchestration-dry-run`.
- PASS `pnpm theater:route-b-handoff-dry-run`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## Evidence

`pnpm theater:route-b-orchestration-dry-run` proves:

- selected group speaker: `character_spouse`;
- blocked consecutive speaker: `character_focus_lin`;
- private addressee speaker: `character_spouse`;
- group visible history count: 4;
- private visible history count: 4;
- narrator queue count: 4;
- state proposal count: 2;
- `providerCallAttempted=false`;
- `aiUsageLogWritten=false`;
- `writesConfirmedCrmFact=false`;
- no email/phone/raw provider/private sentinel.

## DB/Prisma

- No DB operation.
- No Prisma schema change.
- No provider call.
- No `AiUsageLog` row was written because this slice is explicitly no-provider; the contract requires success/error usage logging before provider enablement.

## NANDA Alignment

- Updated `asai.theater.route_b` internal AgentFacts-style manifest with orchestration capability/action/DTO refs and proof command.
- Readiness remains `internal-only`.
- No external NANDA registry publication, signing, public discovery, or cross-org agent access was attempted.

## Git

- Branch: `codex/asai-lv3-automation`.
- Push policy: push skipped by user instruction.
- Commit: pending at report creation.

## Blockers

- Route B live director/character/feedback provider path still needs success/error `AiUsageLog` proof before enablement.
- Runtime/BFF has not yet consumed the orchestration contract in persisted session turns.
- AMM-005c remains dependent on DB/DNS stability or a replacement development/staging DB URL.
- External NANDA/public registry publication remains blocked without operator approval.

## Next Recommended Loop

`ITA-003i Route B orchestration runtime integration (guarded no-provider)`: wire `buildTheaterRouteBOrchestrationPlan()` into a server-owned Route B runtime/BFF or persisted turn loop, return deterministic directive/input/envelope previews to the session surface, and prove owner/session/private scope, no fake usage, and safe state proposals before any live provider call.
