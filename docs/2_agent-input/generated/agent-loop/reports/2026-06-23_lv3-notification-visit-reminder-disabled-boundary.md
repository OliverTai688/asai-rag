# 2026-06-23 LV3 Loop - Notification Visit Reminder Disabled Boundary

## Scope

- Loop type: normal LV3 immersive implementation/proof loop.
- Selected slice: `BFF-402a notification disabled boundary / visit reminder mock-success replacement`.
- Last-two classification: previous loop was L2 source/proof (`BFF-305b`), prior loop was L4 whole-product runtime proof gate. This loop is not docs-only and continues release-hardening source work.

## Candidate score

1. `BFF-402a notification disabled boundary / visit reminder mock-success replacement` — 94/100. Removes a production-facing fake success route, connects pre-visit reminder UX, notification posture, and BFF acceptance proof without enabling real email/provider delivery.
2. `BFF-402b ECPay notify/query/idempotency fail-closed skeleton` — 86/100. Strong release-hardening value, but broader payment-provider surface and better after adjacent notification mock success is removed.
3. `Relationship confirmation persistence boundary` — 84/100. High LV3 flow value, but still needs product/schema decision for VisitPlan JSON subdocument vs dedicated table.

## Changes

- Replaced `/api/notifications/visit-reminder` mock email success with shared input validation, current-member auth, and a 503 guarded-disabled/no-delivery contract.
- Added a versioned visit-reminder disabled DTO in `src/domains/notifications/bff.ts` with `providerAttempted=false`, `jobQueued=false`, `realEmailSent=false`, `realNotificationSent=false`, `mockSuccess=false`, no DB write, and no `AiUsageLog` requirement because no provider is called.
- Added fail-closed handling for auth DB outage: `VISIT_REMINDER_AUTH_UNAVAILABLE`, status 503, `providerAttempted=false`.
- Added `pnpm notification:visit-reminder-disabled-qa`.
- Updated BFF plan/acceptance notes, loop state, and issue-question.

## Validation

- PASS: `pnpm notification:visit-reminder-disabled-qa`
  - Source proves mock success strings/provider names are absent.
  - API proves unauth 401 and invalid payload 400.
  - Current DB target returns Prisma `P1001 DatabaseNotReachable`, so the authenticated path proved 503 fail-closed auth unavailable, no provider attempt, no-store/request-id, and private sentinel 0.
  - Authenticated disabled DTO runtime proof is deferred to rerun the same command when DB is reachable.
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
  - Exit code 0. Existing branch-wide warning remains in `scripts/public-status-degraded-qa.mjs` for unused `existsSync`; it is not from this loop.

## Evidence

- Targeted command: `pnpm notification:visit-reminder-disabled-qa`
- Added reusable QA script: `scripts/notification-visit-reminder-disabled-qa.mjs`
- No provider call, no real email, no real notification, no queue, no payment, no raw private/provider payload.

## DB/Prisma

- No Prisma schema change.
- No `prisma db push`.
- No DB write performed by this slice.
- Runtime QA encountered existing Supabase DB reachability blocker (`P1001 DatabaseNotReachable`) and verified fail-closed behavior instead of fake delivery success.

## NANDA alignment

- No AI module or provider route was modified, so no AgentFacts manifest change was required.
- The slice preserves least-disclosure and no-provider proof posture: no raw private transcript/provider payload, no external registry/public discovery, and no fake `AiUsageLog`.

## Git

- Local commit required after staging this loop's files only.
- Push skipped by user instruction.

## Blockers

- Real notification/email delivery remains blocked by manual provider/env setup, sender policy, job queue, idempotency, and production proof.
- Authenticated disabled DTO live runtime proof requires DB reachable; operator can rerun `pnpm notification:visit-reminder-disabled-qa`.
- Full BFF-402 ECPay notify/query/idempotency remains open.

## Next Recommended Loop

Run `BFF-402b ECPay notify/query/idempotency fail-closed skeleton` as a source-backed release-hardening slice, unless relationship confirmation persistence product/schema decision is made first.

