# 2026-06-23 LV3 Loop - Subscription Capability BFF

## Scope

- Loop type: normal LV3 immersive implementation/proof loop.
- Selected slice: `BFF-403a subscription capability read BFF`.
- Last-two classification: previous loops were L2 source/proof (`BFF-402b`, `BFF-402a`). This loop stays source-backed and avoids docs-only proof.

## Candidate score

1. `BFF-403 subscription capability BFF` — 94/100. Connects billing/session/bootstrap capability with plan/quota/seat usage and prevents browser-side plan assumptions before payment activation is real.
2. `Relationship confirmation persistence boundary` — 84/100. High LV3 client-to-graph value, but still awaits product/schema choice for VisitPlan JSON subdocument vs dedicated table.
3. `BFF-402c real ECPay ledger/idempotency contract` — 76/100. High release value, but current DB/provider/callback proof remains blocked; unsafe to implement live ledger activation without provider/env readiness.

## Changes

- Added `BillingSubscriptionCapabilityDto` in `src/domains/subscription/capability.ts`.
- Added read-only repository `src/lib/billing/subscription-capability-repository.ts` for current plan provider presence, active/pending seats, collaborators, units, and AI quota usage.
- Added `GET /api/billing/subscription` with current-member auth, shared private JSON response, and DB-unavailable fail-closed response.
- Added the same `subscription` contract to `/api/workspace/bootstrap`.
- Added `pnpm billing:subscription-capability-qa` for source/API guarded proof.
- Updated `PLN-019`, `ACC-011`, `issue-question.md`, and `loop-state.json`.

## Validation

- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `BILLING_SUBSCRIPTION_QA_BASE_URL=http://127.0.0.1:3058 pnpm billing:subscription-capability-qa`
  - Static proof covers versioned DTO, checkout disabled status, activation boundary, no provider credentials/raw payload/payment token, no fake `AiUsageLog`, and no DB write.
  - API proof covers unauth 401, shared auth error kind, no-store/request-id.
  - Current DB target returns Prisma `P1001 DatabaseNotReachable`; authenticated runtime therefore proves 503 `BILLING_SUBSCRIPTION_UNAVAILABLE`, `providerAttempted=false`, no-store, and payment/private sentinel 0.
- PASS: `pnpm lint:changed`
  - Exit code 0. Existing branch-wide warning remains in `scripts/public-status-degraded-qa.mjs` for unused `existsSync`; it is not from this loop.

## Evidence

- Targeted command: `BILLING_SUBSCRIPTION_QA_BASE_URL=http://127.0.0.1:3058 pnpm billing:subscription-capability-qa`
- Reusable QA script: `scripts/billing-subscription-capability-qa.mjs`
- No ECPay provider call, no OpenAI/Anthropic provider call, no DB write, no real payment, no notification/email, no fake `AiUsageLog`, and no production checkout/plan activation.

## DB/Prisma

- No Prisma schema change.
- No `prisma db push`.
- Repository uses read-only org/member/unit queries. Runtime proof hit DB unavailable fallback, so authenticated 200 + bootstrap payload proof can be rerun by operator with the same command when DB is reachable.

## NANDA alignment

- No AI module/provider route was modified, so no AgentFacts manifest change was required.
- The slice preserves least-disclosure/no-provider posture and does not publish or register any external agent capability.

## Git

- Local commit required after staging this loop's files only.
- Push skipped by user instruction.

## Blockers

- BFF-403 is only partially complete: org/member UI still needs to consume the `subscription` DTO where billing capability is shown.
- Real plan-change persistence, confirmed transaction/query activation, ledger idempotency, refund/void/manual review, production payment env, and callback-domain proof remain unresolved.
- Current DB reachability blocks authenticated 200 subscription/bootstrap runtime proof; operator can rerun the QA command when DB is reachable.

## Next Recommended Loop

Cadence counter is now 4. Next loop should run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md` before more narrow implementation.
