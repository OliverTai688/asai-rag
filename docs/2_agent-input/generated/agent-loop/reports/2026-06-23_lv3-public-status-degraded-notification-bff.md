# 2026-06-23 LV3 Public Status Degraded + Notification BFF

## Scope
- Loop type: normal LV3 implementation/proof loop, L2 source-backed slice.
- Anti-repetition: previous loop was L4 whole-product runtime proof gate; this loop implements the named source fix instead of adding docs-only proof.
- Selected slice: BFF-305b public status degraded fallback + notification BFF alignment.

## Candidate score
1. BFF-305b public status degraded fallback + notification BFF alignment — 96/100. Directly fixes the runtime gate found by whole-product review, connects public status/pricing/pages and app-shell notification calls, and is safe without provider/DB writes.
2. Relationship confirmation advisor-state persistence — 84/100. High LV3 value, but still needs the VisitPlan JSON subdocument vs dedicated table product/schema decision.
3. Residual AMM/live cross-flow evidence — 76/100. Useful, but mostly residual environment-backed proof; operator can self-run once DB/pooler context is ready.

## Changes
- Added DB-unavailable degraded mode to `getPublicStatus()` with `source=degraded_local`, `dbAvailable=false`, `degradedReason=database_unavailable`, and fail-closed checkout/payment/provider AI/lead persistence posture.
- Aligned public pricing with status degraded mode so fallback plans and CTA remain consistent instead of masking disabled checkout/lead state.
- Added `/api/bff/notifications` with explicit disabled/no-delivery DTO; it fixes clean proof 404 without fake real notification delivery.
- Added `pnpm public:status-degraded-qa` targeted proof for invalid DB URL, status/pricing/page consistency, notification no-delivery, and private sentinel checks.
- Updated BFF-305b plan/acceptance notes, issue-question, and loop-state.

## Validation
- PASS `pnpm public:status-degraded-qa` — 39/39 checks passed with invalid DB URL.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.
- Full `pnpm lv3:cross-flow-no-provider-qa` was not rerun because BFF-305b has an equivalent targeted degraded-mode proof and remaining DB-backed proof can be self-run when desired.

## Evidence
- `GET /api/public/status` returns 200 with `source=degraded_local`, `dbAvailable=false`, `degradedReason=database_unavailable`.
- Checkout, production payment, public AI availability, lead endpoint, and lead persistence are disabled in degraded mode.
- `GET /api/public/pricing` returns fallback plans and CTA/lead posture consistent with public status.
- `GET /api/bff/notifications` returns 200, empty notifications, `realNotificationSent=false`, and `triggersExternalNotification=false`.
- Landing and pricing pages render without 500 under invalid DB URL; status/pricing/notification responses passed private sentinel checks.

## DB/Prisma
- No schema changes.
- No Prisma generate/db push.
- No DB writes. QA intentionally used an invalid DB URL to prove safe degraded behavior.
- No OpenAI/Anthropic provider calls; no `AiUsageLog` required for this no-provider slice.

## NANDA alignment
- No external registry publication or discovery endpoint was added.
- Public status continues to keep external registry posture at `not_public_discovery`.
- This loop improved least-disclosure operational evidence by exposing only public-safe degraded flags, not DB host, provider raw config, tenant/client/payment data, or secrets.

## Git
- Commit pending at report creation time.
- Push skipped by user instruction.

## Blockers
- Product/schema decision remains for relationship confirmation persistence: VisitPlan JSON subdocument vs dedicated table.
- Full DB-backed cross-flow proof can be run by operator with `pnpm lv3:cross-flow-no-provider-qa` when DB/pooler environment is desired.
- Real notification/payment/email delivery, external NANDA/public registry publication, destructive DB operations, and production writes still require explicit approval and env setup.

## Next Recommended Loop
- Prefer `BFF-402a notification disabled boundary / visit reminder mock-success replacement`: replace any remaining notification mock-success route with a no-provider/no-delivery contract, keep real delivery disabled, and add targeted proof for no fake notification success.
