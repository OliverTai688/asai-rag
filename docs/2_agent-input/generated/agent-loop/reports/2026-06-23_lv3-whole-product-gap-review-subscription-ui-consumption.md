# 2026-06-23 LV3 Whole-product Gap Review - Subscription UI Consumption

## Scope

- Loop type: L4 scheduled fifth-loop whole-product review.
- Cadence trigger: `normalLoopsSinceLastWholeProductReview=4`, so this loop used `lv3-whole-product-gap-review-loop.md`.
- User preference applied: avoid docs-only proof when safe source work exists; this review resets cadence but points the next normal loop to a source/UI implementation slice.
- Push policy: push skipped by user instruction.

## Recent Progress

- Previous whole-product review top blockers were public degraded-mode runtime and notification BFF alignment.
- Since then, source/proof loops completed `BFF-305b`, `BFF-402a`, `BFF-402b`, and `BFF-403a`.
- `BFF-403a` added read-only subscription capability DTO, `/api/billing/subscription`, and workspace bootstrap `subscription`; proof is guarded and DB-unavailable fail-closed.
- Route B stage map source already exists in `/theater/[sessionId]`; it is no longer accurate to select a broad "create stage map" rework as the next top slice.

## Candidate Score

| Candidate | Score | Reason |
| --- | ---: | --- |
| `BFF-403b subscription capability UI consumption` | 8.4 | High release and UX leverage: server DTO exists but org/member UI and render models still rely on `session.planCapability` or plan assumptions. Safe source slice, no provider/payment write needed, directly completes the next BFF-403 acceptance boundary. |
| `Relationship confirmation advisor-state persistence decision` | 7.8 | Strong LV3 product-core leverage from previsit relationship cards into theater handoff, but it is a product/schema decision: VisitPlan JSON subdocument vs dedicated table/migration. Should not block BFF-403b. |
| `BFF-404 release readiness BFF gate` | 7.5 | Valuable release evidence layer, but depends on BFF-403 consumption and still must mark ECPay activation/ledger/env as blocked. Better after BFF-403b closes the capability consumption gap. |

Selected next normal source slice: `BFF-403b subscription capability UI consumption`.

## Six-frame Review

1. Advisor workflow / onboarding: billing and plan affordances should read as server-owned capability, not UI optimism. This keeps advisor/admin actions understandable and prevents "clickable but unavailable" plan surfaces.
2. Source-of-truth / BFF: `/api/billing/subscription` and workspace bootstrap now provide versioned DTOs. Remaining gap is consumption by UI/render models.
3. AI reasoning / evidence: no AI provider calls are needed. NANDA posture remains internal-only; no external registry or public discovery publication.
4. Theater / relationship immersion: Route B stage map exists and should not be reselected as a broad implementation. Relationship confirmation persistence remains a separate decision before durable advisor-state writeback.
5. QA / compliance / release proof: next slice must prove unavailable/read-only/no-provider/no-payment/no-activation. Operator may rerun BFF-403a DB-authenticated proof when DB is reachable, but that is residual evidence, not the next implementation.
6. Interface maturity: org/member plan surfaces should show disabled/unavailable states from server DTO, reducing hardcoded capability drift.

## Changes

- Updated `loop-state.json` cadence counter to `0`, last review report path, and next recommended source slice.
- Added `BFF-403b` owner-doc guidance to `PLN-019`.
- Added acceptance gates for `BFF-403b` in `ACC-011`.

## Validation

- `git diff --check`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass with one existing warning in `scripts/public-status-degraded-qa.mjs` (`existsSync` unused); not introduced by this review slice.
- No DB/Prisma operation planned for this review.
- No provider call, no payment call, no email/notification, no production write.

## NANDA Alignment

- This loop did not change AI modules.
- Current posture remains internal manifest / registry-readiness only; external NANDA/third-party publication, signing, public discovery endpoint, and cross-org agent access remain unapproved.
- Next BFF-403b slice should not modify AI provider behavior; if it touches AI quota display, it must consume server capability and keep `AiUsageLog` policy unchanged.

## Blockers

- Product/schema decision: relationship confirmation advisor-state durability still needs VisitPlan JSON subdocument vs dedicated table/migration decision.
- Provider/env/manual blocker: real ECPay activation, CheckMacValue validation, server query, ledger idempotency, callback domain, refund/void/manual review.
- Release sequencing blocker: BFF-404 should follow BFF-403b, not precede it.

## Next Recommended Loop

Run source-backed `BFF-403b subscription capability UI consumption`: update org/member UI and navigation/render models to consume the server `subscription` DTO, add targeted UI/static/API proof, then run `pnpm exec tsc --noEmit --pretty false` and `pnpm lint:changed`. Do not spend the next loop on docs-only evidence or residual DB-authenticated BFF-403a proof.
