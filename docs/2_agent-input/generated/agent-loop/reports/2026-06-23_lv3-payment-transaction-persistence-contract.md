# 2026-06-23 LV3 Loop - PaymentTransaction Persistence Guarded Contract

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Task level: L2 source/proof slice.
- Selected slice: `BFF-402g PaymentTransaction persistence/upsert guarded contract`.
- Goal: make ECPay notify/query expose a typed `PaymentTransaction` persistence boundary without enabling DB upsert, provider query, order update, plan activation, production payment, refund, void, email, notification, or fake `AiUsageLog`.

## Strategic Review

- Last two loop classification:
  - `2026-06-23_lv3-billing-ecpay-server-query-boundary.md`: L2 implementation/proof.
  - `2026-06-23_lv3-release-readiness-bff-gate-projection.md`: L2 implementation/proof.
- Anti-repetition rationale: this is source-backed, not docs-only. It adds a new domain contract, ECPay DTO wiring, targeted QA, and release-readiness subgate semantics; docs/report are supporting evidence.

## Candidate Score

| Candidate | Score | Reason |
| --- | ---: | --- |
| `BFF-402g PaymentTransaction persistence/upsert guarded contract` | 94 | Highest remaining payment lifecycle source gap after server-query boundary; connects notify/query, ledger, readiness, and activation safety without provider/env dependency. |
| `BFF-402h confirmed activation guarded boundary` | 88 | Next highest safety gate, but should depend on a clear transaction persistence boundary first. |
| `Relationship confirmation advisor-state persistence` | 82 | Strong LV3 core-flow value, but still needs a product/schema decision before persistence is safe. |

## Changes

- Added `src/domains/subscription/payment-transaction-persistence.ts` with `asai.billing.payment_transaction_persistence.v1`.
- ECPay notify/query disabled DTOs now include `transactionPersistence`, proving unique scope, verified write preconditions, no DB upsert, no order update, no organization plan update, no raw provider payload/checksum/private storage, and no fake `AiUsageLog`.
- Added `pnpm billing:payment-transaction-persistence-qa`.
- Extended ECPay disabled runtime QA and ledger QA to assert the new persistence boundary.
- Added release-readiness subgate `payment_transaction_persistence_guarded_contract` as pass while keeping live `payment_transaction_persistence` blocked/db.
- Updated `PLN-019`, `ACC-011`, `issue-question.md`, and loop cadence state.

## Validation

- `pnpm billing:payment-transaction-persistence-qa`: pass.
- `BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3064 pnpm billing:ecpay-disabled-qa`: pass, 119/119 checks.
- `pnpm billing:ledger-idempotency-qa`: pass.
- `pnpm bff:release-readiness-qa`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass. Existing branch-wide warning remains in `scripts/public-status-degraded-qa.mjs`; no new error from this slice.
- `git diff --check`: pass.

## Evidence

- Static proof verifies the new persistence contract, ECPay DTO wiring, package script, release-readiness subgate, owner docs, and no DB/provider/private mutation sentinels.
- Runtime proof verifies notify valid/duplicate/tampered checksum paths remain disabled and include the `PaymentTransaction` persistence contract while writing no ledger, creating no transaction, updating no order, and activating no plan.
- Authenticated query still hit guarded `BILLING_ECPAY_AUTH_UNAVAILABLE` in the current environment; provider was not contacted. Operator can rerun this if DB auth is reachable:

```bash
BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3064 pnpm billing:ecpay-disabled-qa
```

## DB/Prisma

- No Prisma schema change.
- No `prisma generate`, `prisma validate`, or `db push`.
- No DB write, payment transaction upsert, order update, organization plan update, provider call, email, notification, refund, void, or real payment.

## NANDA Alignment

- No AI module, AI route, provider wrapper, or external registry surface was modified.
- No OpenAI/Anthropic provider call was added; `AiUsageLog` is explicitly not required for this no-provider ECPay boundary.
- External NANDA/third-party publication, signing, public discovery, and cross-org agent access remain blocked pending explicit operator approval.

## Git

- Branch: `codex/asai-lv3-automation`.
- Push: skipped by user instruction.

## Blockers

- Source gaps: real ECPay provider query response validation; live `PaymentTransaction` DB upsert/write; confirmed activation boundary.
- Operator/environment gaps: production ECPay credentials/callback domain/live provider proof.
- Product/approval gaps: refund/void/destructive payment actions; relationship confirmation persistence model; external NANDA publication.

## Next Recommended Loop

Run source-backed `BFF-402h confirmed activation guarded boundary`: define the server-owned activation precondition contract from confirmed transaction/query ledger status, block redirect/browser-only activation, keep live DB/provider proof blocked, and avoid production payment/refund/void/organization plan mutation.
