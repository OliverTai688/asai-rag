# 2026-06-20 - LV3 Route B Runtime Gate

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `ITA-003b Route B deterministic runtime BFF gate`.
- Goal: add a reviewable Route B runtime boundary after the handoff/schema adapter, without calling providers or pushing DB changes.

## Candidate Score

1. `ITA-003b Route B deterministic runtime BFF gate` - 19/20
   - Connects previsit/client/interview theater build packets to the future multi-character theater runtime.
   - Moves theater toward private/group turns, director/character/feedback boundaries, and state patch safety.
   - Reduces AI cost/compliance risk by proving guarded-disabled/no-provider behavior and no fake `AiUsageLog`.
2. `BFF-001 full-site data-source inventory and responsibility matrix` - 17/20
   - Highest safe fallback if Route B DB target cannot be confirmed; exposes reports/issues/admin/local-store gaps.
3. `PIM/BFF writeback -> VisitPlanDraft` - 16/20
   - Strong interview-to-previsit continuation, but less urgent than establishing the Route B runtime boundary first.

## Selected Slice

`ITA-003b Route B deterministic runtime BFF gate`.

This loop intentionally did not run `prisma db push`, did not call OpenAI/Anthropic, and did not claim production multi-character Theater readiness.

## Changes

- Added `POST /api/theater/route-b/runtime`.
  - Authenticates with `requireCurrentMember()`.
  - Ignores client-provided org/user scope and builds draft scope from the server session.
  - `SESSION_DRAFT` returns a deterministic Route B session draft summary with no DB write.
  - `DIRECTOR`, `CHARACTER`, and `FEEDBACK` return `503 ROUTE_B_PROVIDER_DISABLED` while `ENABLE_ROUTE_B_THEATER_PROVIDER` is not enabled.
  - Response proves `providerCallAttempted=false`, `aiUsageLogWritten=false`, and `aiUsageLogRequiredWhenProviderEnabled=true`.
  - Runtime previews are count/shape-only and do not return raw character cards, raw private transcripts, or provider payloads.
- Added `pnpm theater:route-b-runtime-qa`.
  - Proves unauth 401, invalid handoff 400, session draft 200, director/character/feedback guarded-disabled 503.
  - Proves private turn visibility excludes third-party characters.
  - Proves state patches cannot write confirmed CRM facts.
  - Proves response contains no email/phone/raw private sentinel.
  - Proves `AiUsageLog` count remains unchanged for guarded-disabled/no-provider calls.
- Updated `AGENTS.md`, `PLN-015`, `issue-question.md`, `loop-state.json`, and `package.json`.

## Validation

- PASS `pnpm exec eslint src/app/api/theater/route-b/runtime/route.ts scripts/theater-route-b-runtime-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3020 pnpm theater:route-b-runtime-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `git diff --check`

## Evidence

`pnpm theater:route-b-runtime-qa` proof includes:

- unauth returns 401.
- invalid handoff returns 400.
- `SESSION_DRAFT` returns 200 dry-run ready.
- provider call attempted = false.
- fake `AiUsageLog` written = false.
- draft includes focus and NPC characters.
- private turn hidden from third-party character.
- state patches do not write confirmed CRM facts.
- director/character/feedback return guarded-disabled 503 while provider flag is off.
- character preview filters private history by addressee.
- feedback preview uses five qualitative perspectives.
- `AiUsageLog` THEATER count before/after unchanged.

## DB / Prisma

- Prisma schema changed: no.
- Prisma validate/generate/db push: not required.
- DB operations: read-only `AiUsageLog` count proof through QA script.
- Provider calls: none.
- `AiUsageLog`: no row required because no provider call was attempted; the route returns guarded-disabled before provider execution and explicitly preserves the future success/error `AiUsageLog` requirement.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 15]`.
- Local commit: pending until final validation.
- Push: `push skipped by user instruction`.

## Blockers

- Source/proof blocker: Route B persisted session read/write through actual DB migration still needs a safe target confirmation or dry-run fallback.
- Source blocker: Route B provider execution for director/character/feedback still not implemented.
- Source/UI blocker: `/theater/[sessionId]` still does not render Route B group/private/state-patch runtime.
- Production approval blocker: production schema migration remains approval-gated.
- Operator/environment blocker: `pnpm build` remains blocked by the known Next/Turbopack Google Font path issue.

## Next Recommended Loop

`ITA-003c Route B persisted session read/write proof` if DB target is confirmed as local/development/approved staging.

Fallback:

`BFF-001 Full-site data-source inventory and responsibility matrix`.
