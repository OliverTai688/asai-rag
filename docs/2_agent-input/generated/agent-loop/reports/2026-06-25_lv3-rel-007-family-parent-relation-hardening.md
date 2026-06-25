# 2026-06-25 LV3 REL-007 Family Parent/Relation Hardening

## Scope
- Loop type: LV3 normal implementation/proof loop, L2 source slice + L1 executable proof.
- Selected slice: `REL-007 family-member parent/relation integrity hardening`.
- Strategic review: previous loop was L4/L3 whole-product review; the loop before that was L2 Route B render harness proof. This loop is not docs/checklist repetition: it changes family-member API/domain behavior and updates DB-backed write QA.
- Goal connection: strengthens client -> relationship graph source integrity before relationship graph is used by preparation package and theater.

## Candidate Score
1. `REL-007 family-member parent/relation integrity hardening` — 9.4/10. Source-backed, unblocked, closes a real edge-case gap: dangling/cross-client parent IDs and arbitrary relation strings could distort graph generation.
2. Cross-flow cold-start harness reliability — 8.3/10. Useful release evidence, but warmed full cross-flow already passed; lower product-source impact.
3. Theater stage-map reconcile QA update — 7.5/10. Helpful proof maintenance, but live Route B session UI proof already passed.

## Changes
- Added shared relation normalization helpers in `src/domains/client/types.ts`.
- `POST /api/clients/[id]/family-members` now rejects dangling/cross-client `parentMemberId` with `FAMILY_MEMBER_PARENT_NOT_FOUND`.
- Family-member create/update now normalize relation aliases before persistence; unsupported relation labels become explicit `其他`.
- Relationship graph, edge-shadow, and relationship map UI now consume normalized generation lookup.
- `pnpm client:relationship-graph-write-qa` now proves missing parent, cross-client parent, valid parent persistence, alias normalization, unsupported-relation normalization, existing patch cycle/self-parent guards, and browser write proof.

## Validation
- PASS: `git diff --check`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
  - Existing warning only: `scripts/public-status-degraded-qa.mjs` unused `existsSync`.
- PASS: `DEMO_QA_BASE_URL=http://127.0.0.1:3068 pnpm client:relationship-graph-write-qa`
- PASS: `pnpm client:relationship-edge-shadow-qa`
- PARTIAL/INTERRUPTED: `DEMO_QA_BASE_URL=http://127.0.0.1:3068 pnpm client:relationship-graph-qa`
  - API phase reached DB-backed 401/201/404/200/403 requests in dev-server trace.
  - Playwright browser phase stayed silent for roughly five minutes and was interrupted with exit code 130.
  - Treated as proof-harness stability follow-up, not a source regression.

## Evidence
- Write QA verified:
  - missing `name` -> 400
  - dangling `parentMemberId` -> 400 `FAMILY_MEMBER_PARENT_NOT_FOUND`
  - cross-client parent -> 400 `FAMILY_MEMBER_PARENT_NOT_FOUND`
  - valid parent persisted in returned DTO
  - `爸爸` persisted as `父`
  - `乾親` persisted as `其他`
  - self-parent/cycle guards still pass on PATCH
  - desktop/mobile write UI proof passed with no provider route invoked
- Edge-shadow QA still produced deterministic draft edge summary without client-facing server-only draft payload.

## DB/Prisma
- No schema change.
- No `prisma:generate`, no `prisma db push`, no destructive DB operation.
- Non-destructive demo/dev writes were performed by QA scripts against the current `.env` Supabase/dev target under existing operator allowance.
- No OpenAI/Anthropic provider route was invoked; no `AiUsageLog` write was needed or faked.

## NANDA Alignment
- No AI module/provider capability was changed in this slice.
- The relationship source contract is safer for downstream AI modules because unsupported relation labels now become explicit unknown/social relation context instead of implicit same-generation inference.
- Registry/public AgentFacts publication remains blocked without operator approval.

## Git
- Branch: `codex/asai-lv3-automation`
- Commit: pending at report write time.
- Push: `push skipped by user instruction`.
- Note: `AGENTS.md` and `PLN-024` were already dirty before this loop, so this loop did not stage checkbox edits there to avoid mixing unrelated worktree changes.

## Blockers
- Formal `RelationshipEdge` table/migration still needs operator approval before durable edge writes/backfill.
- Relationship confirmation persistence still needs A/B/C product/data-model decision.
- `pnpm client:relationship-graph-qa` browser phase needs proof-harness reliability repair.
- Cross-flow cold-start wrapper still has first-status compile/timeout reliability gap.
- Theater stage-map reconcile script has stale expectations against newer component extraction.

## Next Recommended Loop
- If staying source-backed: run `REL-008 linkedClientId cross-client relationship network` to connect family members to existing client records without schema churn, with BFF/UI proof and no confirmed CRM fact rewrite.
- If release evidence is higher priority: repair the relationship graph / cross-flow Playwright cold-start proof harness before adding new surface.

