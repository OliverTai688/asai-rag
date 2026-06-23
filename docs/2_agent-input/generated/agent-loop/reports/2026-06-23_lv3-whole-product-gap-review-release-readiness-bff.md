# 2026-06-23 LV3 Whole-Product Gap Review - Release Readiness BFF

## Scope

- Type: scheduled fifth-loop whole-product gap review.
- Cadence reason: `normalLoopsSinceLastWholeProductReview=4`; this round used `lv3-whole-product-gap-review-loop.md`.
- Whole-product goal: keep ASAI LV3 focused on product architecture, immersive advisor experience, interface operability, and safety. This does not claim public launch Level 3 readiness.
- Recent frontier: the last four normal loops closed source-backed billing/subscription slices (`BFF-402d`, `BFF-402e`, `BFF-403a`, `BFF-403b`). The frontier has moved from "prove disabled billing pieces individually" to "make readiness aggregation honest and machine-checkable."

## Candidate Score

| Candidate | Score | Reason |
| --- | ---: | --- |
| `BFF-404a release readiness BFF gate projection` | 94 | Highest leverage after four billing/source slices: it connects platform readiness, billing lifecycle, AI usage/audit, public/member/org/platform BFF surfaces, and prevents overclaiming launch readiness. Source-backed and reviewable. |
| `BFF-402f ECPay server query / PaymentTransaction persistence boundary` | 88 | Highest payment severity, but narrower. Still important, yet likely needs DB/provider/env proof and risks another payment tunnel before the product-level gate can explain blockers clearly. |
| `Relationship confirmation advisor-state persistence decision` | 82 | Closest to core immersive workflow, but currently a product/schema decision blocker; unsafe to implement as a source slice without choosing canonical persistence semantics. |

## Top Product Gaps

| Gap | Type | Severity | Leverage | Notes |
| --- | --- | ---: | ---: | --- |
| Release readiness still treats billing as a coarse `warning/blocked` surface | source/proof gap | 3 | 3 | Needs BFF-404a subgates to show completed guarded-disabled boundaries vs real provider/DB/operator blockers. |
| ECPay server query confirmation | source/provider/env gap | 3 | 3 | Still blocked after CheckMacValue validation; must not be represented as pass. |
| Real `PaymentTransaction` persistence/upsert | source/DB gap | 3 | 3 | Ledger idempotency contract exists, but real transaction rows remain unimplemented/unproven. |
| Confirmed transaction/query activation | source/product safety gap | 3 | 3 | Plan activation must only occur from confirmed provider/query paths. |
| Refund/void/manual review workflow | operator/product gap | 3 | 2 | Destructive payment actions still require explicit approval. |
| Relationship confirmation advisor-state persistence | product/schema gap | 2 | 3 | AI interview/writeback can propose updates, but long-lived confirmation state still needs a chosen persistence model. |
| AI Meeting / notes registry inventory staleness | source/docs gap | 2 | 2 | `AUD-008` still references `asai.meeting.prototype`; accepted AMM surfaces should later be reconciled into internal manifests. |
| Production auth/email/notification/env controls | operator gap | 3 | 2 | Code may be implemented, but live enablement remains operator-controlled. |
| External NANDA registry publication | operator gap | 2 | 2 | All AI modules stay `internal-only`; public discovery/signing requires explicit approval. |
| Full browser release smoke | proof gap | 2 | 2 | Existing command is self-runnable; next source slice should hand off residual `demo:release-readiness-qa` instead of over-collecting screenshots. |

## Selected Slice

Selected next normal-loop slice: `BFF-404a release readiness BFF gate projection`.

Why now:

- It is not docs-only: the next loop should update `/api/platform/release-readiness`, release-readiness repository projection, and targeted QA.
- It connects more than one core release surface: platform BFF, public/member/org/client portal BFF inventory, AI usage readiness, billing lifecycle, and sentinel/privacy proof.
- It keeps blocked payment work visible without claiming production payment readiness.

## Changes

- Added `BFF-404a` to `PLN-019` with source/proof expectations for billing subgates inside release readiness.
- Added `BFF-404a` acceptance criteria to `ACC-011`.
- Reset cadence in `loop-state.json` and set next implementation recommendation to `BFF-404a`.
- No `issue-question.md` update: no new operator decision was introduced; existing payment, NANDA, and relationship-confirmation blockers remain valid.

## Validation

- `git diff --check`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.

## Evidence

- Owner docs now point next implementation to a source-backed release readiness slice instead of rerun-only proof.
- Residual browser/full-smoke evidence can be run by operator after the source slice with:

```bash
DEMO_QA_BASE_URL=http://localhost:3000 pnpm demo:release-readiness-qa
```

## DB/Prisma

- No DB write.
- No Prisma schema change.
- No provider call.
- No `AiUsageLog` required because this was a no-provider review/doc alignment round.

## Git

- Branch: `codex/asai-lv3-automation`.
- Push: skipped by user instruction.

## Blockers

- Source gaps: BFF-404a readiness subgate projection; BFF-402 real query/transaction/activation implementation.
- Product/schema gaps: relationship confirmation advisor-state persistence.
- Operator gaps: production payment env/callback, refund/void/manual review, production auth/email/notification, external NANDA publication.

## Next Recommended Loop

Run source-backed `BFF-404a release readiness BFF gate projection`: update release-readiness repository/DTO and QA so billing BFF readiness is decomposed into proven guarded-disabled subgates and explicitly blocked provider/DB/operator subgates. Do not use docs-only evidence or a script rerun as the main outcome.
