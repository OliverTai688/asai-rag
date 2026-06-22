# 2026-06-22 LV3 Loop — ITA-005b Route B Provider Prompt Context

## Scope

- Loop type: normal LV3 implementation/proof loop; cadence was not fifth-loop review (`normalLoopsSinceLastWholeProductReview=2` at start).
- Last two loops: ITA-004c L2 source implementation/proof; ITA-005a L2 source implementation/proof. Anti-repetition passed because this loop changes provider DTO/source and dry-run proof, not docs-only evidence.
- Selected slice: `ITA-005b Route B objection/red-line prompt integration`.

## Candidate Score

1. ITA-005b provider prompt context — 93: directly connects ITA-005a library into next-turn and feedback provider DTOs, while preserving no raw payload / no CRM fact / AiUsageLog gates.
2. ITA-003n live Route B provider wiring — 87: high product value but needs stricter provider/env and DB/browser proof.
3. Feedback review consumption by visit/interview prep — 84: useful cross-surface continuation, but should follow source-aligned provider prompt context.

## Changes

- Added `RouteBProviderPromptContext` with selected objection cues, all 18 red-line cues, severe/post-review ids, no legal advice, no confirmed CRM fact writes, and no-provider boundary.
- Wired `promptContext` into `TheaterRouteBNextTurnProviderInput` and `TheaterRouteBFeedbackProviderInput`.
- Expanded feedback provider review DTO with `redLineReview.allRules` so provider review sees all 18 red lines, not only the severe five.
- Added `pnpm theater:route-b-provider-prompt-context-dry-run` and expanded next-turn/feedback provider dry-runs.
- Updated Route B AgentFacts-style manifest and registry QA refs; readiness remains `internal-only`.
- Updated `AGENTS.md`, `PLN-015`, `ACC-006`, and `loop-state.json`.

## NANDA Alignment

- Added Route B capability/action `route-b-provider-prompt-context`.
- Added DTO refs/evidence refs for `RouteBProviderPromptContext`, `RouteBProviderPromptObjectionCue`, `RouteBProviderPromptRedLineCue`, `TheaterRouteBNextTurnProviderInput.promptContext`, and `TheaterRouteBFeedbackProviderInput.promptContext`.
- Registry readiness remains `internal-only`; external NANDA/public discovery/signing remain disabled and require operator approval.

## Validation

- PASS `pnpm theater:route-b-provider-prompt-context-dry-run`
- PASS `pnpm theater:route-b-next-turn-provider-dry-run`
- PASS `pnpm theater:route-b-feedback-provider-dry-run`
- PASS `pnpm theater:route-b-objection-red-line-library-dry-run`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm ai:bff-audit`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `git diff --check`

## DB/Prisma

- No Prisma/schema changes.
- No DB writes.
- No live OpenAI/Anthropic provider call; all provider proof used injected dry-run adapters. Success/error paths still require/write usage-log records in the contract.

## Evidence

- Source proof:
  - `src/domains/theater/route-b-provider-prompt-context.ts`
  - `src/domains/theater/route-b-next-turn-provider.ts`
  - `src/domains/theater/route-b-feedback-provider.ts`
- Dry-run proof:
  - `scripts/theater-route-b-provider-prompt-context-dry-run.ts`
  - `scripts/theater-route-b-next-turn-provider-dry-run.ts`
  - `scripts/theater-route-b-feedback-provider-dry-run.ts`
- If residual browser screenshots are desired, operator can self-run the next slice UI command instead of blocking this source slice.

## Git

- Start status included unrelated pre-existing changes in MAN docs, sidebar, AI meeting docs, and notes prototype; they were not touched for this slice and must not be staged with this loop.
- Push policy: push skipped by user instruction.

## Blockers

- Live Route B next-turn/feedback provider route wiring still needs explicit provider/runtime slice with success/error `AiUsageLog` proof.
- Immediate severe red-line UI/runtime warning preview is still missing.
- External NANDA registry publication remains unapproved.

## Next Recommended Loop

`ITA-005c Route B severe red-line runtime/UI preview`: surface provider prompt-context severe immediate rules in guarded runtime or Route B UI as advisor-visible warnings without provider calls, legal advice, confirmed CRM fact writes, or docs-only proof. If provider env is ready, alternate to `ITA-003n live Route B next-turn provider route wiring` with success/error `AiUsageLog` proof.
