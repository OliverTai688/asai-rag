# 2026-06-21 LV3 BFF-401a Checkout Disabled/Sandbox Server-Payload Proof

## Scope
- Type: normal LV3 implementation/proof loop, loop 4/4 after the scheduled whole-product review.
- Selected slice: `BFF-401a checkout disabled/sandbox server-payload proof`.
- Goal: establish a server-owned billing checkout contract that fails closed until payment callback/query/idempotency proof is complete.
- Not included: real payment, ECPay redirect, server notification/query confirmation, pending order write, subscription activation, real email, real notification, provider call, refund/void, external registry publication, or production payment enablement.

## Candidate Score
1. `BFF-401a checkout disabled/sandbox server-payload proof` - 92/100: follows loop-state recommendation, closes the next public/billing release gate, changes source/API/QA, and proves no payment secret or raw payload leakage.
2. `BFF-402 notification/query/idempotency` - 84/100: highest remaining billing risk, but should follow the disabled checkout contract and requires a broader transaction lifecycle slice.
3. `AMM formal adoption baseline` - 78/100: valuable user-approved product direction, but lower release-risk leverage than billing BFF and currently has unrelated prototype files in the worktree.

## Last-two Classification / Anti-repetition
- Previous loop: `BFF-305a`, L2 source/API/DB/browser proof.
- Loop before that: quiet `BFF-305` gap research, docs/research-to-executable mapping.
- This loop is L2 implementation/proof and is not docs-only. It adds runtime API, server repository, typed DTO, and executable API/DB proof.

## Changes
- Added `src/domains/subscription/checkout.ts` with versioned checkout input and disabled DTO contract.
- Added `src/lib/billing/checkout-repository.ts` to build fail-closed checkout posture from server session and platform settings.
- Added `POST /api/billing/checkout`, authenticated with `requireCurrentMember()`.
- Added `scripts/billing-checkout-qa.mjs` and `pnpm billing:checkout-qa`.
- Updated release-readiness billing BFF gate to warning when checkout disabled proof exists, while keeping notification/query/idempotency blocked.
- Updated `AGENTS.md`, `PLN-019`, and `ACC-011` with BFF-401a completion/evidence.

## Evidence
- `BILLING_CHECKOUT_QA_BASE_URL=http://127.0.0.1:3046 pnpm billing:checkout-qa`: pass.
- API/DB proof covered:
  - unauth checkout 401.
  - non-self-serve `FREE` plan 400.
  - `PRO` checkout 503 disabled.
  - private no-store and request id headers.
  - versioned contract `asai.billing.checkout.v1`.
  - provider declared as ECPay without credentials.
  - no provider attempt.
  - no redirect payload.
  - no order insert and no transaction insert, counts `0->0`.
  - production payment disabled.
  - redirect-only activation disabled.
  - browser checksum generation not allowed.
  - HashKey / HashIV / CheckMacValue / provider raw payload / card / payment token / private env sentinel 0.

## Validation
- `node --check scripts/billing-checkout-qa.mjs`: pass.
- `BILLING_CHECKOUT_QA_BASE_URL=http://127.0.0.1:3046 pnpm billing:checkout-qa`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `git diff --check`: pass.
- `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8'))"`: pass.
- `pnpm lint:changed`: pass.

## DB / Prisma
- Prisma schema unchanged.
- No Prisma validate/generate/db push required.
- DB read proof only: counted `subscription_orders` and `payment_transactions` before/after disabled checkout.
- No DB write, no production write, no payment activation, no provider call.
- No OpenAI/Anthropic call; no `AiUsageLog` expected or required.

## NANDA Alignment
- No AI module, AI route, provider wrapper, assistant action, interview workflow, theater runtime, SPIN AI, visit/report AI, RAG, or AI registry surface changed.
- External NANDA / third-party registry publication remains not approved.

## Git
- Local commit required after validation.
- Push skipped by user instruction.
- Unrelated pre-existing dirty files were intentionally left unstaged.

## Remaining Blockers
- Source/proof: `BFF-402` notification/query/idempotency, duplicate notify handling, and true sandbox/production checkout remain open.
- Operator/environment: ECPay credentials, callback domain, email/notification provider env, and production payment enablement require manual settings plus targeted proof.
- Production approval: real payment/refund/void/destructive DB/remote deletion remain separately approval-gated.

## Next Recommended Loop
Cadence is now 4/4, so the next loop should run the scheduled whole-product review prompt:

> Execute the LV3 whole-product gap review loop. Re-score the core flow from client creation through relationship graph, preparation package, theater stage, group/private interaction, state proposals, and AI interview/writeback. Include billing/public/platform gate status after BFF-305a and BFF-401a, then choose the next highest-leverage source/proof slice for the following normal loop.

push skipped by user instruction
