# 2026-06-22 LV3 Loop Report - ITA-003n Route B next-turn provider route

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `ITA-003n live Route B next-turn provider route wiring`.
- Goal: move Route B next-turn from injected provider contract proof into an owner-scoped provider-candidate API and `/theater/[sessionId]` advisor confirmation gate.
- Push policy: push skipped by user instruction.

## Candidate Score

1. `ITA-003n live Route B next-turn provider route wiring` - 94/100. Highest leverage for the theater surface because it connects persisted Route B session truth, prompt-context source library, provider execution, THEATER `AiUsageLog`, and append confirmation.
2. `ITA-005d severe red-line action workflow` - 88/100. Strong compliance/operability follow-up, but it needs a real candidate/action surface to build on.
3. `ITA/AMM feedback-to-prep consumption bridge` - 84/100. Useful cross-surface follow-through, but lower priority until generated theater turns are available.

## Changes

- Added `POST /api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate`.
- The route reads owner-scoped `RouteBSessionSnapshot`, derives next-turn draft server-side, injects `RouteBProviderPromptContext`, and calls OpenAI JSON mode only after auth/session/quota/key/input guards pass.
- Success path writes THEATER/OpenAI `AiUsageLog` and monthly usage before returning a safe append candidate with `usageLogId`.
- Provider/schema error path writes sanitized THEATER/OpenAI `AiUsageLog` error before returning a safe error response.
- Guard paths remain no-provider/no-fake-usage/no-append.
- `/theater/[sessionId]` now has a provider candidate generation action and keeps append confirmation gated until candidate safety flags plus `usageLogId` exist.
- AgentFacts manifest, registry QA, and AI usage route audit now include the provider-candidate capability, endpoint, DTO/evidence refs, owner source, and proof command.

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `pnpm theater:route-b-next-turn-provider-route-qa`
- PASS `pnpm theater:route-b-provider-prompt-context-dry-run`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm ai:bff-audit`
- PASS `git diff --check`

## Evidence

- `pnpm theater:route-b-next-turn-provider-route-qa` proves 32 source contract checks: owner scope, server-side draft, quota/key gates, OpenAI JSON mode, schema validation, contract reuse, success/error `AiUsageLog`, no append in provider route, UI candidate safety gating, and manifest/audit refs.
- `pnpm ai:bff-audit` now discovers 31 AI routes and includes `/api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate` with auth, quota, provider call, success usage, and error usage evidence.
- Remaining browser screenshot or cost-incurring manual click proof can be operator-run from a dev Route B session; it should not consume the next automation loop unless source behavior changes.

## DB/Prisma

- No Prisma schema change.
- No `prisma db push`.
- No production/destructive write.
- `ai:bff-audit` read current monthly `AiUsageLog` summary only.

## NANDA Alignment

- Updated `asai.theater.route_b` internal AgentFacts-style manifest with `route-b-next-turn-provider-candidate` capability/action/endpoint refs.
- Registry readiness remains `internal-only`; no external NANDA publication, public discovery, signing, or cross-org agent access was started.
- Least-disclosure posture preserved: no raw provider payload, raw private transcript, direct private dialog, policy/contact secret, token, OTP, or payment data in route response or evidence.

## Git

- Branch: `codex/asai-lv3-automation`.
- Commit: local commit created after this report write; see final response / `git log -1`.
- Push: skipped by user instruction.

## Blockers

- No blocker for source-backed Route B next-turn provider route wiring.
- Residual browser/cost-click proof is self-runnable once dev server, auth session, Route B session, and provider key are available.
- Remaining product gap: severe red-line preview is still watchlist-only and lacks action workflow.

## Next Recommended Loop

Run `ITA-005d Route B severe red-line action workflow`: turn the severe red-line preview into advisor action cards with evidence-needed / not-applicable / escalate states, keep legal advice and confirmed CRM writes out of scope, and prove no raw private/provider/contact/policy sentinel leakage.
