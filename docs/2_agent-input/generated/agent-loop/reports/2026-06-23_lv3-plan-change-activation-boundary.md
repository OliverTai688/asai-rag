# 2026-06-23 LV3 Loop - Plan-Change Activation Boundary

## Scope

- Loop type: normal LV3 immersive implementation/proof loop.
- Selected slice: `BFF-402c/BFF-403c payment idempotency + plan-change activation boundary`.
- Last-two classification: previous loop implemented subscription capability UI consumption; this loop continues the billing/release hardening chain with source changes, not docs-only proof.

## Candidate Score

1. `BFF-402c/BFF-403c payment idempotency + plan-change activation boundary` — 94/100. Connects checkout, ECPay notify/query, subscription capability, and future plan-change persistence; blocks redirect/browser-only activation before real payment proof.
2. `BFF-402d transaction ledger idempotency persistence contract` — 88/100. Higher backend completeness value, but should follow after the activation boundary is explicit.
3. `Relationship confirmation advisor-state persistence` — 80/100. Strong LV3 client-to-graph value, but still needs product/schema choice and is less urgent than payment release hardening.

## Changes

- Added `src/domains/subscription/plan-change.ts` with versioned `BillingPlanChangeDisabledDto`.
- Added `POST /api/billing/plan-change`, which validates self-serve target plan, requires current member, and returns guarded-disabled 503 without provider calls, order writes, transaction writes, ledger writes, or plan mutation.
- Extended `BillingSubscriptionCapabilityDto` with `planChangeStatus`, exposing `/api/billing/plan-change` as disabled until server-signed checkout, CheckMacValue validation, query confirmation, ledger idempotency, and failure/refund/void manual-review proof exist.
- Added `pnpm billing:plan-change-boundary-qa` for source/static no-provider/no-write/no-private-sentinel proof, with optional runtime API proof when a dev server/session is available.
- Updated `loop-state.json` and `issue-question.md`.

## Validation

- PASS: `pnpm billing:plan-change-boundary-qa`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
  - Exit code 0. Existing branch-wide warning remains in `scripts/public-status-degraded-qa.mjs` for unused `existsSync`; it is not from this loop.

## Evidence

- Reusable proof command: `pnpm billing:plan-change-boundary-qa`.
- Optional runtime proof handoff: `BILLING_PLAN_CHANGE_QA_BASE_URL=http://127.0.0.1:<port> pnpm billing:plan-change-boundary-qa --api`.
- Proof covers no provider call, no ECPay credential/checksum handling, no order/transaction/ledger writes, no organization plan update, no redirect/browser-only activation, no raw provider/payment/private sentinel, and no fake `AiUsageLog`.

## DB/Prisma

- No Prisma schema change.
- No `prisma db push`.
- No DB write proof was attempted. The new route uses auth/session read only; if DB auth is unavailable it fails closed as `BILLING_PLAN_CHANGE_AUTH_UNAVAILABLE` with `providerAttempted=false`.

## NANDA Alignment

- No AI module, provider route, or AgentFacts manifest was modified.
- No OpenAI/Anthropic provider call was added; `AiUsageLog` is explicitly not required on this no-provider guarded-disabled path.

## Git

- Local commit required after staging this loop's files only.
- push skipped by user instruction.

## Blockers

- Real CheckMacValue validation remains incomplete.
- ECPay server query and confirmed transaction/query activation remain incomplete.
- Transaction ledger persistence/idempotent upsert remains incomplete.
- Production payment env/callback-domain proof remains incomplete.
- Refund/void/destructive payment actions still require separate explicit approval.

## Next Recommended Loop

Next normal loop should stay source-backed. Recommended slice: `BFF-402d transaction ledger idempotency persistence contract`, limited to server-owned ledger/idempotency behavior for confirmed notification/query without enabling provider calls, redirect-only activation, refund/void, or organization plan mutation. If live DB proof is unavailable, leave a static/domain proof plus a self-runnable API/DB command rather than returning to docs-only evidence.
