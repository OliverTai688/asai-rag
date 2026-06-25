# LV3 REL-004 Formal RelationshipEdge Source-Only QA

Date: 2026-06-25T15:41:05Z  
Loop type: normal LV3 implementation/proof loop  
Selected slice: `REL-004 formal RelationshipEdge persistence proof convergence`  
Push: skipped by user instruction

## Scope

This loop adopted the formal `RelationshipEdge` source path already present in the dirty worktree and added a non-DB proof mode to the persistence QA script. It does not claim live HTTP/DB persistence proof; DB DNS still returns `ENOTFOUND`.

Last-two-loop classification:

- `2026-06-25_lv3-route-b-meeting-source-browser-harness.md`: L1 executable browser proof.
- `2026-06-25_lv3-whole-product-gap-review-after-route-b-source-and-edge-persistence.md`: scheduled L4 whole-product review.

Anti-repetition: this is a source-backed executable proof slice, not another docs-only review or stale shadow/no-schema proof.

## Candidate Score

1. REL-004 formal RelationshipEdge source-only proof convergence — 9.0/10. It validates formal schema/repository/route source and gives the next loop a runnable proof while DB DNS is unavailable.
2. Live HTTP `client:relationship-edge-persistence-qa` — 8.5/10 if DB recovers, but blocked now by `ENOTFOUND`.
3. Relationship confirmation durable policy — 8.0/10, high leverage but should follow formal edge proof or explicit product decision.

## Changes

- Added `--source-only` / `RELATIONSHIP_EDGE_PERSISTENCE_SOURCE_ONLY=1` mode to `scripts/client-relationship-edge-persistence-qa.mjs`.
- Source-only proof checks package script wiring, Prisma `RelationshipEdge` model/enums/indexes, `GET/POST /api/clients/[id]/relationship-edges`, server-derived session scope, repository authorization, org tenancy, `prisma.relationshipEdge` operations, shadow-backfill adoption, metadata allowlist, no private/contact/payment sentinel fields, no provider/fake `AiUsageLog`, and no confirmed CRM fact write.
- Updated `loop-state.json` and `issue-question.md` to mark source-only proof complete and live HTTP/DB proof still deferred.

## Validation

- PASS `git status --short --branch` at start.
- FAIL/blocked DB preflight: `DNS_FAIL ENOTFOUND`.
- PASS `pnpm prisma:validate`.
- PASS `pnpm prisma:generate`.
- PASS `pnpm client:relationship-edge-persistence-qa --source-only`.
- PASS `git diff --check`.
- PASS loop-state JSON parse.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed` with 0 errors and 1 pre-existing unrelated warning in `scripts/public-status-degraded-qa.mjs`.

## DB / Prisma

- Ran Prisma validate and generate because formal `RelationshipEdge` schema is part of the adopted source.
- Did not run `prisma db push`; DNS preflight for the configured Supabase host is still `ENOTFOUND`.
- No DB read/write by this loop.

## NANDA Alignment

No AI module, AI route, provider wrapper, or AgentFacts manifest was changed. No provider call was attempted; no `AiUsageLog` was required or faked. Existing AI registry readiness remains `internal-only`.

## Evidence

Primary proof:

`pnpm client:relationship-edge-persistence-qa --source-only`

Residual live proof delegated until DB/dev server recover:

`DEMO_QA_BASE_URL=http://127.0.0.1:<asai-port> pnpm client:relationship-edge-persistence-qa`

Do not claim this residual proof until it passes in the current environment.

## Git

Local commit created after validation. Push skipped by user instruction.

## Blockers

- Operator/environment: Supabase DB DNS `ENOTFOUND` blocks live HTTP/DB persistence proof.
- Source follow-up: persisted/formal edges still need consumption by relationship graph BFF/render boundaries before claiming full graph convergence.

## Next Recommended Loop

Re-check DB DNS. If recovered, run live `client:relationship-edge-persistence-qa` and then graph/cross-flow evidence. If DB remains unavailable, select a no-DB source-backed slice that wires formal edge readiness into relationship graph BFF/render boundaries without claiming live persistence proof.
