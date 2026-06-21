# 2026-06-21 LV3 BFF-304a Platform Session / Audit Proof

## Scope
- Type: normal LV3 implementation/proof loop, loop 1/4 after the scheduled whole-product review.
- Selected slice: `BFF-304a platform session separation + metadata/audit proof`.
- Goal: close platform BFF session boundary, metadata-only platform reads, sensitive-read `AuditLog` proof id, break-glass/impersonation validation, and release-readiness BFF gate projection.
- Not included: production impersonation enablement, real payment/email/notification, external registry publication, provider-backed RAG/Route B, destructive DB operation, or the untracked AI meeting / notes prototype.

## Candidate Score
1. `BFF-304a platform session separation + metadata/audit proof` - 94/100: highest remaining release-facing authz/audit gap after BFF-303; unlocks credible release-readiness aggregation.
2. `BFF-305a public status and CTA availability proof` - 84/100: important public-safe boundary, but lower risk than platform break-glass and sensitive-read audit.
3. `BFF-401a checkout disabled/sandbox server-payload proof` - 81/100: high payment risk, but production credentials remain approval-gated; safe disabled/sandbox proof should follow.

## Last-two Classification / Anti-repetition
- Previous loop: scheduled whole-product gap review, L4 documentation/review.
- Loop before that: BFF-303a client portal BFF proof, L2 source/proof.
- This loop is L2 source/proof and not repetitive: it implements the selected BFF-304a frontier from the review, rather than another review or client-portal extension.

## Changes
- Added `scripts/bff-platform-qa.mjs` and `pnpm bff:platform-qa`.
- `IMPERSONATED_READ` proof now returns response-visible `audit.id` and `createdAt`.
- Release-readiness now includes `bff_surface_gates` control and `bffGates` surface projection. It marks `platform_bff=pass`, `public_bff=warning`, and `billing_bff=blocked` so platform proof cannot be overread as public launch readiness.
- Updated `demo-release-readiness-qa` to assert the BFF surface gate.
- Marked BFF-304 complete in `AGENTS.md` and `PLN-019`.
- Updated `loop-state.json` to normal loop count `1` and next recommended slice `BFF-305a public status and CTA availability proof`.

## API / DB Proof
- `pnpm bff:platform-qa`: pass.
- Session separation:
  - unauth `/api/platform/organizations`: 403.
  - member app session: 403.
  - manager/org app session: 403.
  - valid client portal token: 403.
- Platform success:
  - organizations/detail/AI usage/audit logs/release-readiness: 200.
  - default responses are metadata/aggregate only; private sentinel check passed.
- Sensitive-read audit:
  - impersonation missing reason 400, expiry too long 403, start 201.
  - impersonated read proof 200 and response audit id `cmqn5z93200064e61t27hvjqe`; `IMPERSONATED_READ` audit count `0->1`.
- Break-glass:
  - missing reason 400, missing risk acceptance 400, expiry too long 403.
  - support break-glass 201 and response audit id `cmqn5zdum00084e61cu7pyin8`; `BREAK_GLASS` audit count `0->1`.
  - response declares counts-only proof and `rawPayloadReturned=false`.
- No-provider proof: `AiUsageLog` count `150->150`.

## Validation
- `node --check scripts/bff-platform-qa.mjs`: pass.
- `pnpm bff:platform-qa`: pass.
- `node --check scripts/demo-release-readiness-qa.mjs`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.

## DB / Prisma
- Prisma schema unchanged.
- No Prisma validate/generate/db push.
- DB proof added identifiable demo/test report/share and platform audit evidence only.
- No provider call; no production write; no destructive DB operation.

## Files Changed
- `AGENTS.md`
- `package.json`
- `scripts/bff-platform-qa.mjs`
- `scripts/demo-release-readiness-qa.mjs`
- `src/lib/platform/platform-impersonation-repository.ts`
- `src/lib/platform/platform-release-readiness-repository.ts`
- `docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-21_lv3-bff-304a-platform-session-audit-proof.md`

## Git
- Local commit required after validation.
- Push skipped by user instruction.

## Remaining Blockers
- Source/proof: BFF-305 public status/CTA and BFF-401/402 billing checkout/notification gates remain open.
- Operator/product: production payment/email/notification/provider approvals, live platform/staging auth matrix, external registry publication/signing/public discovery, client-user OTP/Auth.js decision.
- Schema/operator: full relationship graph edge model still approval-gated.

## Next Recommended Loop
Run `BFF-305a public status and CTA availability proof`.

Suggested prompt:
> Execute BFF-305a only. Add or harden a public-safe status/CTA BFF that reports maintenance, AI availability, checkout availability, and public CTA posture without exposing private plan cost, provider config, secrets, internal billing state, payment data, raw provider payload, or tenant/client data. Prove pricing/status/CTA consistency with API/browser proof and keep checkout disabled/sandbox only until explicit payment approval.

push skipped by user instruction
