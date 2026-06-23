# 2026-06-23 LV3 Loop - Subscription Capability UI Consumption

## Scope

- Loop type: normal LV3 immersive implementation/proof loop.
- Selected slice: `BFF-403b subscription capability UI consumption`.
- Last-two classification: prior loop was whole-product review and selected this source-backed implementation slice. This loop avoids docs-only proof and does not rerun BFF-403a as the main result.

## Candidate score

1. `BFF-403b subscription capability UI consumption` — 93/100. Connects workspace bootstrap, dashboard shell, navigation/render model, and sidebar UI to the server-owned subscription DTO; directly removes hardcoded/browser plan assumptions.
2. `BFF-402c/BFF-403c payment idempotency + plan-change persistence boundary` — 86/100. Higher release risk remains, but should follow after UI consumption so plan capability is not inferred client-side.
3. `Relationship confirmation advisor-state persistence` — 80/100. Strong LV3 client-to-graph value, but still requires product/schema choice and should not block the billing capability chain.

## Changes

- `src/app/(dashboard)/layout.tsx` now reads `buildBillingSubscriptionCapability(session)` server-side and injects the DTO into member/orgAdmin sidebar render models. If the read fails, render model explicitly records `session_plan_capability_fallback`.
- `/api/workspace/bootstrap` now passes the same `subscription` DTO into `buildWorkspaceBootstrapNavigation()`.
- `src/lib/navigation/workspace-sidebar.ts` now exposes `WorkspaceSubscriptionBoundary`, consumes `BillingSubscriptionCapabilityDto` for plan capability, AI quota, seats, collaborators, units, checkout disabled state, activation boundary, and no-provider/no-write safety flags.
- `RoleAwareSidebar` now renders a compact subscription boundary with testable hooks such as `data-subscription-source`, `data-checkout-status`, `data-browser-plan-assumptions-allowed`, and no-provider/no-write flags.
- Added `pnpm billing:subscription-ui-qa`.
- Updated `PLN-019`, `ACC-011`, `issue-question.md`, and `loop-state.json`.

## Validation

- PASS: `pnpm billing:subscription-ui-qa`
- PASS: `pnpm nav:sidebar-ui-qa`
- PASS: `pnpm nav:sidebar-renderer-contract-qa`
- PASS: `pnpm nav:workspace-bootstrap-qa`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
  - Exit code 0. Existing branch-wide warning remains in `scripts/public-status-degraded-qa.mjs` for unused `existsSync`; it is not from this loop.

## Evidence

- Reusable proof command: `pnpm billing:subscription-ui-qa`.
- Existing sidebar proof commands still pass after subscription DTO injection.
- Proof covers source/static UI consumption, explicit fallback source, no browser/localStorage/sessionStorage/cookie/URL plan assumptions, no provider call, no payment side effect, and no fake `AiUsageLog`.

## DB/Prisma

- No Prisma schema change.
- No `prisma db push`.
- Runtime layout may read the subscription capability repository; this is read-only. The targeted UI proof is source/static and does not require a live DB. Operator can still rerun `BILLING_SUBSCRIPTION_QA_BASE_URL=http://127.0.0.1:3058 pnpm billing:subscription-capability-qa` for authenticated 200 payload proof when DB is reachable.

## NANDA alignment

- No AI module, provider route, or AgentFacts manifest was modified.
- The slice preserves least-disclosure posture and does not publish/register any external agent capability.

## Git

- Local commit required after staging this loop's files only.
- push skipped by user instruction.

## Blockers

- Real plan-change persistence remains incomplete.
- Confirmed transaction/query-only activation proof remains incomplete.
- Ledger idempotency, refund/void/manual review, production ECPay env/callback-domain proof, and real payment enablement remain manual/provider blockers.

## Next Recommended Loop

Next normal loop should stay source-backed. Recommended slice: `BFF-402c/BFF-403c payment idempotency + plan-change persistence boundary`, limited to server-owned no-provider/no-payment contract and targeted QA. If schema/product choice blocks that slice, produce a short L4 blocker analysis and switch to another source-backed LV3 core-flow slice instead of collecting docs-only evidence.
