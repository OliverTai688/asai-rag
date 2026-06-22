# 2026-06-22 LV3 Loop - ITA-003j Route B Next-Turn Contract

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `ITA-003j Route B next-turn consumption / persisted role reply loop (guarded no-provider first)`.
- Strategic reason: the previous whole-product review identified the largest Route B gap as "persisted stage can accept advisor turns, but cannot yet produce the next character/narrator turn envelope."
- Anti-repetition: this round changed source/API/proof/manifest, not only docs.

## Candidate Score

1. `ITA-003j Route B next-turn contract` - 94/100. Connects persisted theater session, latest advisor group/private turn, and orchestration contract; produces a reviewable next-turn envelope; preserves no-provider/AiUsageLog guard.
2. `ITA-004c feedback persistence/UI` - 86/100. Good follow-up for session end coaching, but less directly fixes the live roleplay loop.
3. `ITA-005a objection/red-line source library` - 81/100. Valuable for richer theater behavior, but should follow the next-turn consumption shell.

## Changes

- Added `src/domains/theater/route-b-next-turn.ts`.
  - Consumes `RouteBSessionSnapshot`.
  - Finds latest advisor `GROUP` / `PRIVATE` turn.
  - Reuses `buildTheaterRouteBOrchestrationPlan()`.
  - Returns `TheaterRouteBNextTurnDraft` with selected speaker/addressee/visibility, guard evidence, state patch count, provider boundary, and blocked narrator states.
- Added `GET /api/theater/route-b/sessions/[sessionId]/next-turn`.
  - Uses `requireCurrentMember()` and `getRouteBSessionForMember()`.
  - Returns least-disclosure no-provider preview only.
- Added `pnpm theater:route-b-next-turn-dry-run`.
- Updated `asai.theater.route_b` AgentFacts-style manifest and registry QA owner/evidence requirements.
- Updated `PLN-015`, `ACC-006`, root `AGENTS.md`, and loop cadence state.

## Validation

- PASS `pnpm theater:route-b-next-turn-dry-run`
  - group turn selects next character and blocks consecutive focus speaker.
  - private addressee must answer.
  - no advisor / no character states become `NARRATOR` blocked drafts.
  - `providerCallAttempted=false`, `aiUsageLogWritten=false`, `writesConfirmedCrmFact=false`.
  - no email/phone/provider/private sentinel in output.
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `pnpm exec eslint src/domains/theater/route-b-next-turn.ts 'src/app/api/theater/route-b/sessions/[sessionId]/next-turn/route.ts' scripts/theater-route-b-next-turn-dry-run.ts`
- PASS `pnpm ai:bff-audit`
  - Note: audit still reports existing DB DNS warning: `ENOTFOUND db.wwocdcicvpmbdmqvskzi.supabase.co`.

## Evidence

- New proof command: `pnpm theater:route-b-next-turn-dry-run`.
- API route is compiled and member-scoped, but DB-backed live API evidence was not chased because the environment still shows the known Supabase DNS warning; this residual proof can be rerun by operator after DB/DNS recovers.

## DB/Prisma

- No Prisma schema change.
- No Prisma generate/validate required by schema.
- No DB write, no production write, no destructive operation.

## NANDA Alignment

- Updated `asai.theater.route_b` manifest version to `2026-06-22.ita-003j-next-turn-contract`.
- Added capability/action/endpoint/DTO/proof refs for `route-b-next-turn`.
- Registry readiness remains `internal-only`.
- External publication remains disabled.
- Provider posture remains deterministic no-provider for this endpoint; future live character text generation still requires success/error `AiUsageLog` proof.

## Git

- Branch: `codex/asai-lv3-automation`.
- Commit pending at report creation time.
- Push policy: push skipped by user instruction.

## Blockers

- Blocker type: environment/proof residual.
- DB-backed owner API live evidence is still gated by Supabase DNS availability. Since the source contract and no-provider proof are complete, do not spend another loop only collecting this evidence; rerun after connectivity returns.
- Live character text generation remains disabled until provider success/error `AiUsageLog` proof exists.

## Next Recommended Loop

`ITA-003k Route B next-turn UI consumption / advisor confirmation shell`: connect the new next-turn preview to `/theater/[sessionId]`, show selected speaker/addressee/visibility/guard evidence and blocked narrator states, keep generated character text disabled, and add a confirmation affordance for future provider-backed append.
