# 2026-06-23 LV3 Confirmed Activation Guarded Contract

## Scope
- Loop type: normal LV3 implementation/proof loop.
- Selected slice: BFF-402h confirmed activation guarded boundary.
- Goal: make the payment lifecycle state explicit after PaymentTransaction persistence proof by adding a typed activation precondition contract that still blocks live organization plan mutation.

## Candidate score
1. BFF-402h confirmed activation guarded contract — 9/10.
   - Connects payment notification/query, ledger, PaymentTransaction persistence, release readiness, and subscription activation.
   - Source-backed and reviewable; avoids docs-only proof.
   - Clarifies the remaining blocker without enabling production payment.
2. BFF-402 live PaymentTransaction DB upsert proof — 7/10.
   - High release value, but depends on DB/provider confirmation path and would risk confusing guarded contract with live payment proof.
3. Whole-product gap review — 6/10.
   - Needed after this loop by cadence, but current loop still had a safe source-backed implementation slice available.

## Selected slice
BFF-402h: added `asai.billing.confirmed_activation.v1` to declare the prerequisites for activation:
- confirmed ledger
- PaymentTransaction persistence/write proof
- notify checksum validation
- server query confirmation
- no redirect/browser/localStorage/client-supplied plan activation

## Changes
- Added `src/domains/subscription/confirmed-activation.ts`.
- Wired `confirmedActivation` into ECPay notify/query disabled DTOs.
- Added `pnpm billing:confirmed-activation-qa`.
- Expanded `billing:ecpay-disabled-qa` runtime/static checks.
- Updated release readiness billing subgates with `confirmed_activation_guarded_contract` pass and kept live `confirmed_activation` blocked/source.
- Updated `PLN-019`, `ACC-011`, `issue-question.md`, and `loop-state.json`.

## Validation
- PASS `pnpm billing:confirmed-activation-qa`
- PASS `BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3065 pnpm billing:ecpay-disabled-qa` — 145/145 checks passed.
- PASS `pnpm billing:payment-transaction-persistence-qa`
- PASS `pnpm billing:ledger-idempotency-qa`
- PASS `pnpm bff:release-readiness-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed` — exit 0; warning only from existing diff scope.
- PASS `git diff --check`

## Evidence
- No ECPay provider call was attempted.
- No OpenAI/Anthropic call was made; `AiUsageLog` is not required for this no-provider path.
- No DB write, Prisma mutation, real payment, email, notification, refund, void, or organization plan mutation was attempted.
- Runtime notify proof now verifies the `confirmedActivation` contract in duplicate-safe disabled notification responses.
- Authenticated query DTO runtime proof is still safely deferred when DB auth is unavailable; operator can rerun the same ECPay QA command when DB is reachable.

## DB/Prisma
- No Prisma schema change.
- No `prisma:generate`, `prisma:validate`, db push, DB write, migration, destructive operation, or production write.

## Git
- Local commit pending at report creation.
- Push skipped by user instruction.

## Blockers
- Remaining blockers are provider_env/db/source/operator_approval:
  - real ECPay server query confirmation
  - live PaymentTransaction DB upsert/write
  - live `Organization.plan` mutation after confirmed transaction
  - production payment env/callback
  - refund/void/manual review approval

## Next Recommended Loop
Run scheduled whole-product gap review using `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`; cadence is now at four normal loops since the last review.
