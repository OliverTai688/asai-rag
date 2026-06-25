# 2026-06-25 LV3 REL-009 BFF-backed Relationship Map

## Scope
- Loop type: LV3 normal implementation/proof slice.
- Selected slice: REL-009 relationship graph BFF convergence for `/crm/[clientId]/relationships`.
- Goal: make the relationship graph page consume the server-owned relationship graph BFF as the primary truth source instead of letting the canvas and review rebuild separately on the client.

## Candidate score
1. REL-009 BFF-backed relationship map source convergence — 9.1/10
   - Connects client -> relationship graph with a server-owned BFF response and browser-verifiable source marker.
   - Directly closes the REL-009 dead-code/dual-source risk from PLN-024 / ACC-016.
   - Safe, reviewable, no schema/provider changes, and target proof already exists.
2. Relationship graph cold-start proof harness stability — 8.0/10
   - Improves release evidence reliability, but less user-visible than source convergence.
   - Can follow after BFF-backed page proof if cadence allows.
3. Theater stage-map acceptance reconcile — 7.2/10
   - Useful proof maintenance, but not as close to the current client -> graph core flow.
   - Existing theater dirty worktree increases collision risk.

## Changes
- `src/app/(dashboard)/crm/[clientId]/relationships/page.tsx`
  - Fetches `/api/clients/${clientId}/relationship-graph` with `cache: "no-store"`.
  - Uses BFF `ClientRelationshipGraphReview` as the main graph source and falls back to local builder only if the BFF request fails.
  - Adds `data-relationship-graph-source` and `data-relationship-graph-status` markers for browser/source proof.
- `src/components/crm/RelationshipMap.tsx`
  - Accepts optional `graphReview?: ClientRelationshipGraphReview`.
  - Rebuilds ReactFlow nodes/edges from the provided BFF graph so the canvas and source review share one payload.
- `scripts/client-relationship-graph-write-qa.mjs`
  - Verifies `source=bff status=ready` on initial render and after parent-create reload.
  - Adds static source proof that the page passes BFF graph review into `RelationshipMap`.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - Records REL-009 completion and moves cadence to 4 normal loops.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
  - Adds resolved REL-009 source/proof note.

## Validation
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
  - Exit 0 with one pre-existing warning in `scripts/public-status-degraded-qa.mjs`.
- PASS: `DEMO_QA_BASE_URL=http://localhost:3011 pnpm client:relationship-graph-write-qa`
  - First default `localhost:3000` attempt failed with 404 because port 3000 was serving another app. Dedicated repo dev server on 3011 passed.

## Evidence
- API proof:
  - `GET /api/clients/[id]/relationship-graph` returned 200.
  - BFF linked-client graph node is navigable only when readable.
  - BFF omits linked client email/phone sentinels.
- Browser proof:
  - Relationship map consumes BFF graph response: `source=bff status=ready`.
  - BFF-backed state remains ready after parent-create reload.
  - Desktop/mobile have no horizontal overflow.
  - Linked-client CRM navigation affordance renders with `/crm/[linkedClientId]`.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-parent-create.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-after-delete.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-mobile.png`
- No provider route invoked; no fake `AiUsageLog`.

## DB/Prisma
- Prisma schema/generate/db push: not run; no schema change.
- DB operation: non-destructive demo/test writes via existing QA script only (`POST /api/clients`, family-member create/update/delete against test data).
- No production write, no destructive DB operation, no email/notification/payment.

## Git
- Branch: `codex/asai-lv3-automation`
- Commit: pending local commit after this report update.
- Push: push skipped by user instruction.

## Blockers
- Remaining product/data-model blockers unchanged:
  - Formal `RelationshipEdge` durable table still needs operator approval or explicit defer.
  - Relationship confirmation persistence still needs A/B/C decision.
- Proof reliability note:
  - Port 3000 may point to another local app; use dedicated `DEMO_QA_BASE_URL` for future browser/API proof.

## Next Recommended Loop
- Cadence reached 4 normal loops since the last whole-product review.
- Next heartbeat should run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md` before selecting another implementation slice.
