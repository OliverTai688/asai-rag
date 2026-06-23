# 2026-06-23 LV3 Loop - Billing ECPay CheckMacValue Validation

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `BFF-402e server-only CheckMacValue validation boundary`.
- Goal: implement ECPay notification checksum canonicalization/verification behind a server-only boundary while keeping payment notification guarded-disabled: no provider query, no DB write, no transaction/order mutation, no plan activation, no raw checksum/provider payload storage.

## Candidate Score

1. `BFF-402e server-only CheckMacValue validation boundary` - 95/100. Directly resolves the next payment release blocker, connects notify, ledger, and future query confirmation, and is source/API proofable without real payment enablement.
2. `BFF-402f ECPay server-query adapter boundary` - 89/100. High release value, but depends on a trusted checksum boundary first.
3. `PaymentTransaction persistence/upsert contract` - 84/100. Important for activation, but higher DB/schema blast radius than checksum validation and safer after query/checksum contracts are stable.

## Changes

- Added `src/domains/subscription/ecpay-checkmac.ts` with `asai.billing.ecpay.checkmac.v1`, ECPay-compatible SHA256 canonicalization, timing-safe comparison, and least-disclosure validation DTO.
- Updated ECPay notify disabled DTO to include `checkMacValidation`; valid checksum can be reported as verified, but notification remains 503 guarded-disabled and activation remains blocked.
- Updated `/api/billing/ecpay/notify` to read `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` only on the server route and pass them into the disabled DTO builder.
- Added `pnpm billing:ecpay-checkmac-qa`.
- Extended `pnpm billing:ecpay-disabled-qa` to run a valid checksum, duplicate valid checksum, and tampered checksum through the local route.
- Updated BFF plan, acceptance evidence, issue-question, and loop cadence state.

## Validation

- PASS `pnpm billing:ecpay-checkmac-qa`.
- PASS `BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3062 pnpm billing:ecpay-disabled-qa` - 99/99 checks.
- PASS `pnpm billing:ledger-idempotency-qa`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed` - exit 0; one pre-existing warning remains in `scripts/public-status-degraded-qa.mjs`.

## Evidence

- Valid notify checksum: `checkMacValueVerified=true`, `checkMacValidation.status=verified`, no raw checksum echo, no HashKey/HashIV returned.
- Duplicate valid notify: duplicate-safe disabled posture remains no ledger write, no transaction creation, no order update, no activation.
- Tampered checksum: `checkMacValidation.status=invalid`, still returns guarded-disabled 503 and no ledger/provider/activation action.
- ECPay source reference used: official All-In-One checksum mechanism requires excluding `CheckMacValue`, sorting fields, sandwiching with HashKey/HashIV, URL encoding, lowercasing, SHA256, uppercasing, and merchant-side verification: https://developers.ecpay.com.tw/16623/
- No ECPay/OpenAI/Anthropic provider call was attempted. `AiUsageLog` is not required for this local crypto + guarded-disabled no-provider proof.

## DB/Prisma

- No Prisma schema change.
- No `prisma generate`, `prisma validate`, `db push`, or DB write.
- No production write, payment, refund, void, email, notification, or destructive action.

## Git

- Start status: branch `codex/asai-lv3-automation`, ahead of origin, with pre-existing unrelated changes in docs/sidebar/notes.
- This report is written before the local commit; final response records the actual commit hash.
- Push skipped by user instruction.

## Blockers

- Remaining payment blockers: ECPay server query confirmation, real `PaymentTransaction` persistence/upsert, confirmed transaction/query activation, production payment env/callback, and explicit approval for refund/void/destructive payment actions.
- Query authenticated runtime proof still reached DB-unavailable fallback in `pnpm billing:ecpay-disabled-qa`; this is fail-closed and can be rerun by the operator when DB is reachable.

## Next Recommended Loop

Cadence counter is now 4, so the next loop should run scheduled whole-product gap review via `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`. The review should treat checksum validation as resolved and choose the next implementation slice among server query confirmation, transaction persistence/upsert, or confirmed activation boundaries.
