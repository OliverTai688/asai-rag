# 2026-06-23 LV3 Loop - Billing ECPay Server Query Guarded Boundary

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Task level: L2 source/proof slice.
- Selected slice: `BFF-402f ECPay server query guarded boundary`.
- Goal: make `/api/billing/ecpay/query` expose a typed server-query boundary without enabling provider query, DB payment persistence, plan activation, real payment, refund/void, email, notification, or production payment readiness.

## Strategic Review

- Last two loop classification:
  - `2026-06-23_lv3-release-readiness-bff-gate-projection.md`: L2 implementation/proof.
  - `2026-06-23_lv3-whole-product-gap-review-release-readiness-bff.md`: L4 whole-product review.
- Anti-repetition rationale: this loop implements the source-backed BFF-402f slice recommended by BFF-404a. It changes domain DTOs, runtime QA scripts, and release-readiness source projection; docs are supporting artifacts, not the deliverable.

## Candidate Score

| Candidate | Score | Reason |
| --- | ---: | --- |
| `BFF-402f ECPay server query guarded boundary` | 94 | Highest remaining billing subgate after BFF-404a; source-backed; connects query route, ledger contract, release readiness, and overclaim prevention without provider/env dependency. |
| `BFF-402g PaymentTransaction persistence/upsert contract` | 89 | Next highest payment blocker, but safer after the query boundary clearly defines no raw payload/no activation semantics. |
| `Relationship confirmation advisor-state persistence` | 82 | Strong LV3 core-flow value, but still requires product/schema decision before persistence is safe. |

## Changes

- Added `EcpayServerQueryBoundaryDto` and `buildEcpayServerQueryBoundaryDto()` in `src/domains/subscription/ecpay.ts`.
- `DisabledEcpayQueryDto` now includes `serverQueryBoundary` with server-owned endpoint, browser query disabled, client-supplied organization/amount untrusted, `providerAttempted=false`, `confirmationReceived=false`, `paymentTransactionUpsertAttempted=false`, `organizationPlanUpdated=false`, and no fake `AiUsageLog`.
- Added `pnpm billing:ecpay-query-boundary-qa`.
- Extended ECPay disabled runtime QA and ledger QA to cover the new query boundary.
- Added release-readiness subgate `ecpay_server_query_guarded_boundary` as pass when source/proof exists; kept real `ecpay_server_query_confirmation` blocked/provider_env.
- Updated `PLN-019`, `ACC-011`, `issue-question.md`, and loop cadence state.

## Validation

- `pnpm billing:ecpay-query-boundary-qa`: pass.
- `BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3063 pnpm billing:ecpay-disabled-qa`: pass, 99/99 checks. Current DB auth path returned guarded `BILLING_ECPAY_AUTH_UNAVAILABLE`; provider was not contacted.
- `pnpm bff:release-readiness-qa`: pass.
- `pnpm billing:ledger-idempotency-qa`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass. Existing branch-wide warning remains in `scripts/public-status-degraded-qa.mjs`; no new error from this slice.

## Evidence

- Source/static proof verifies the query boundary contract, package script, owner docs, readiness subgate, and no provider/DB mutation sentinels.
- Runtime disabled proof verifies notify/checksum remains guarded-disabled and query auth-unavailable path fails closed with `providerAttempted=false`, no-store/request-id, and payment/private sentinel 0.
- Release-readiness proof verifies `ecpay_server_query_guarded_boundary` exists while `ecpay_server_query_confirmation`, `payment_transaction_persistence`, and `confirmed_activation` remain blocked.
- Residual DB-reachable runtime DTO proof is delegated to the operator if desired:

```bash
BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3063 pnpm billing:ecpay-disabled-qa
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

- Source gaps: real ECPay provider query response validation; real `PaymentTransaction` persistence/upsert; confirmed activation.
- Operator/environment gaps: production ECPay credentials/callback domain/live provider proof.
- Product/approval gaps: refund/void/destructive payment actions; relationship confirmation persistence model; external NANDA publication.

## Next Recommended Loop

Run source-backed `BFF-402g PaymentTransaction persistence/upsert contract`: define the server-owned upsert/persistence boundary from confirmed notify/query statuses, preserve no raw provider payload storage, no redirect/browser activation, no plan mutation before confirmed ledger, and no refund/void without explicit approval.
