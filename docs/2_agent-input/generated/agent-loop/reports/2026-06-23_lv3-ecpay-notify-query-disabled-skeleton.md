# 2026-06-23 LV3 Loop - ECPay Notify/Query Disabled Skeleton

## Scope

- Loop type: normal LV3 immersive implementation/proof loop.
- Selected slice: `BFF-402b ECPay notify/query/idempotency fail-closed skeleton`.
- Last-two classification: previous loops were L2 source/proof (`BFF-402a`, `BFF-305b`) after the latest L4 runtime proof gate. This loop stays source-backed and avoids docs-only proof.

## Candidate score

1. `BFF-402b ECPay notify/query/idempotency fail-closed skeleton` — 95/100. Removes the next payment launch overclaim risk by making callback/query fail closed without provider credentials, ledger writes, or plan activation.
2. `BFF-403 subscription capability BFF` — 86/100. Important for plan/quota/seat capability, but safer after callback/query routes no longer have a missing boundary.
3. `Relationship confirmation persistence boundary` — 84/100. High LV3 client-to-graph value, but still awaits the product/schema decision for VisitPlan JSON subdocument vs dedicated table.

## Changes

- Added `src/domains/subscription/ecpay.ts` with versioned disabled DTOs for ECPay notify and query boundaries.
- Added `POST /api/billing/ecpay/notify` that parses JSON or form-encoded provider-shaped notification payloads, validates input, and returns 503 `BILLING_ECPAY_NOTIFY_DISABLED`.
- Added `POST /api/billing/ecpay/query` that validates input before auth, requires current member session for server-owned query confirmation, and fails closed as `BILLING_ECPAY_AUTH_UNAVAILABLE` when auth DB is unreachable.
- Added `pnpm billing:ecpay-disabled-qa` for static/API proof.
- Updated BFF plan/acceptance notes, loop state, and issue-question.

## Validation

- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm billing:ecpay-disabled-qa`
  - 57/57 checks passed.
  - Source boundary proves no ECPay HashKey/HashIV/env access, no Prisma payment/order write, no fake payment-success copy, and no provider raw payload handling.
  - API proof covers notify invalid 400, notify form payload 503 disabled, duplicate notify 503 duplicate-safe/no-ledger/no-transaction/no-activation, query invalid 400, query unauth 401.
  - Current DB target returns Prisma `P1001 DatabaseNotReachable`; authenticated query path therefore proves 503 fail-closed auth unavailable with `providerAttempted=false`, no-store/request-id, and payment/private sentinel 0.
- PASS: `pnpm lint:changed`
  - Exit code 0. Existing branch-wide warning remains in `scripts/public-status-degraded-qa.mjs` for unused `existsSync`; it is not from this loop.

## Evidence

- Targeted command: `pnpm billing:ecpay-disabled-qa`
- Reusable QA script: `scripts/billing-ecpay-disabled-qa.mjs`
- No ECPay provider call, no DB write, no real payment, no refund/void, no notification/email, no fake `AiUsageLog`, no production checkout enablement.

## DB/Prisma

- No Prisma schema change.
- No `prisma db push`.
- No DB write performed by this slice.
- Query route may read current-member auth in a DB-reachable environment; when DB is unreachable it fails closed before any provider query attempt.

## NANDA alignment

- No AI module/provider route was modified, so no AgentFacts manifest change was required.
- The slice preserves least-disclosure and no-provider proof posture: no raw private transcript/provider payload, no external registry/public discovery, and no fake `AiUsageLog`.

## Git

- Local commit required after staging this loop's files only.
- Push skipped by user instruction.

## Blockers

- Full BFF-402 remains incomplete: real CheckMacValue validation, ECPay server query, transaction ledger persistence, refund/void/manual review, callback domain, provider env, and plan activation proof still need provider/DB/manual approval evidence.
- Current DB reachability still blocks authenticated disabled query DTO runtime proof; operator can rerun `pnpm billing:ecpay-disabled-qa` when DB is reachable.

## Next Recommended Loop

Run `BFF-403 subscription capability BFF` so workspace/bootstrap UI reads server-owned plan/quota/seat capability and checkout status. If ECPay test credentials/callback domain/DB are available first, run a narrow `BFF-402c ledger/idempotency contract` instead.
