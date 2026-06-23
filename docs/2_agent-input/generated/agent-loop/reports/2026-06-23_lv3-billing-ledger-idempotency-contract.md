# 2026-06-23 LV3 Loop - Billing Ledger Idempotency Contract

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `BFF-402d transaction ledger idempotency source contract`.
- Goal: make ECPay notify/query and plan-change activation point to one typed server-owned ledger idempotency contract without enabling provider calls, DB writes, redirect-only activation, organization plan mutation, refund/void, or raw payment payload storage.

## Candidate Score

1. `BFF-402d transaction ledger idempotency contract` - 94/100. Connects ECPay notify/query, plan-change activation, subscription capability, and release payment gates; source-backed and reviewable; no provider/env dependency.
2. `BFF-402e CheckMacValue validation / server-query guarded transition` - 88/100. High release value, but safer after the ledger uniqueness contract exists.
3. `Relationship confirmation persistence decision` - 80/100. Product-core value, but still needs schema/product choice and is less blocking than payment release hardening.

## Changes

- Added shared `BillingLedgerIdempotencyContractDto` in `src/domains/subscription/ledger.ts`.
- ECPay notify/query disabled DTOs now include a versioned ledger contract with server-owned uniqueness scope, duplicate-safe write plan, no raw provider/checksum storage, and no activation.
- Plan-change disabled DTO now references the shared ledger contract version/scope and accepted activation ledger statuses.
- Added `pnpm billing:ledger-idempotency-qa`.
- Updated ECPay and plan-change QA scripts to assert the ledger contract.
- Updated BFF plan, acceptance note, issue-question, and loop state.

## Validation

- PASS `pnpm billing:ledger-idempotency-qa`.
- PASS `pnpm billing:plan-change-boundary-qa`.
- PASS `BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3061 pnpm billing:ecpay-disabled-qa` - 73/73 checks.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed` - exit 0; one pre-existing warning remains in `scripts/public-status-degraded-qa.mjs`.

## Evidence

- Notify duplicate runtime proof now verifies `ledger.version=asai.billing.ledger_idempotency.v1`, `scope=organization_provider_merchant_trade_no`, `writePlan.dbWriteAttempted=false`, `duplicateWritePrevented=true`, `activationGate.organizationPlanUpdated=false`, and `dataBoundary.providerRawPayloadStored=false`.
- Query authenticated runtime proof still enters `BILLING_ECPAY_AUTH_UNAVAILABLE` when DB auth is unavailable; this is fail-closed and can be rerun by the operator with the same ECPay QA command when DB is reachable.
- No ECPay/OpenAI/Anthropic provider call was attempted. `AiUsageLog` is not required for this no-provider/static + disabled-route proof.

## DB/Prisma

- No Prisma schema change.
- No `prisma generate`, `prisma validate`, `db push`, or DB write.
- No production write, payment, refund, void, email, notification, or destructive action.

## Git

- Start status: branch `codex/asai-lv3-automation`, ahead of origin, with pre-existing unrelated changes in docs/sidebar/notes.
- This report is written before the local commit; final response records the actual commit hash.
- Push skipped by user instruction.

## Blockers

- Remaining payment blockers: real CheckMacValue validation, ECPay server query confirmation, actual `PaymentTransaction` persistence/upsert, confirmed transaction/query activation, production payment env/callback, and explicit approval for refund/void/destructive payment actions.
- Authenticated query disabled DTO runtime evidence depends on DB availability; operator can rerun `BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:<free-port> pnpm billing:ecpay-disabled-qa`.

## Next Recommended Loop

Source-backed `BFF-402e CheckMacValue validation and ECPay server-query confirmation guarded transition`: add server-only checksum canonicalization/validation or query adapter boundary without exposing HashKey/HashIV to the browser, storing raw provider payloads, enabling production payment, or activating org plans before confirmed ledger persistence/upsert exists.
