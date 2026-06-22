# 2026-06-22 LV3 Relationship Graph Prep Confirmation Cards

## Scope
- Loop type: LV3 normal implementation/proof loop, L2 source/proof slice.
- Selected slice: relationship graph -> preparation package advisor confirmation cards.
- Goal: turn existing relationship graph fact/inference/unknown labels into operable visit-prep cards so advisors can confirm roles, fields, and assumptions before SPIN/theater, without docs-only proof.

## Candidate Score
1. Relationship graph -> preparation package confirmation cards: 95/100. Connects CRM relationship graph, visit preparation, visible reasoning, and advisor confirmation controls; source-backed; no provider/DB/schema risk.
2. Disabled Route B compliance-review operator action shell: 86/100. Source-backed and safety valuable, but recent loops already advanced compliance review intake/queue and it is less central to the client -> graph -> prep core path.
3. AMM residual live evidence pass: 76/100. Useful but mostly proof collection; user prefers self-runnable residual evidence instead of spending a loop only gathering screenshots.

## Selected Slice
- Added deterministic relationship graph confirmation deck for `asai.visit.preparation_package`.
- Added preparation package UI panel that shows high-priority relationship graph cards and local advisor states: needs confirmation, confirmed in meeting, or ask in interview.
- The UI explicitly states local card state does not write confirmed CRM facts.

## Changes
- `src/domains/visit/relationship-confirmation.ts`
  - New `buildVisitRelationshipConfirmationDeck(client)` helper.
  - Converts `ClientRelationshipGraphReview` nodes/edges/suggested questions into `VisitRelationshipConfirmationCard` records.
  - Keeps fact/inference/unknown labels, source references, action prompts, priority, and guardrail booleans.
- `src/app/(dashboard)/pre-visit/[planId]/page.tsx`
  - Adds `RelationshipConfirmationPanel` beside Route B and evidence panels.
  - Adds local-only advisor state buttons; no API, provider, or CRM write.
- `scripts/visit-relationship-confirmation-dry-run.ts`
- `scripts/visit-relationship-confirmation-dry-run.mjs`
- `package.json`
  - Adds `pnpm visit:relationship-confirmation-dry-run`.
- `src/domains/ai-protocol/manifest.ts`
  - Adds AgentFacts-style capability/action/schema/proof refs for relationship graph confirmation cards.
- `scripts/ai-protocol-registry-qa.ts`
  - Adds static source-adoption requirements for the new helper, UI owner, and proof command.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - Cadence advanced to 4; next loop should run fifth-round whole-product gap review.

## Validation
- PASS `pnpm visit:relationship-confirmation-dry-run`
  - 8 cards generated.
  - Evidence statuses include inference and unknown.
  - Card kinds include person field, person role, and suggested question.
  - `providerCallAttempted=false`, `writesConfirmedCrmFact=false`.
  - Private email/phone sentinels did not appear in output.
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`

## Evidence
- Dry-run command for reviewer/self-run:
  - `pnpm visit:relationship-confirmation-dry-run`
- Registry proof command:
  - `pnpm ai:protocol-registry-qa`
- No browser-only screenshot proof was required for this narrow source/UI contract slice; reviewer can inspect `/pre-visit/[planId]` and run the dry-run above.

## DB/Prisma
- No Prisma schema changes.
- No Prisma generate/validate/db push.
- No DB writes, production writes, email, notification, payment, refund, or remote deletion.

## NANDA Alignment
- Updated `asai.visit.preparation_package` manifest version to `2026-06-22.relationship-graph-confirmation-cards`.
- Added capability/action `relationship-graph-prep-confirmation-cards`.
- Added DTO refs `ClientRelationshipGraphReview`, `VisitRelationshipConfirmationDeck`, `VisitRelationshipConfirmationCard.evidenceStatus`, and proof ref `VisitRelationshipConfirmationDeck.proof.writesConfirmedCrmFact=false`.
- Registry remains internal-only; no external NANDA publication, signing, public discovery, or cross-org access.

## Git
- Start status included pre-existing unrelated dirty files:
  - `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `src/components/layout/sidebar.tsx`
  - untracked AMM docs and `src/components/notes/`, `src/domains/note/`
- This loop should stage only relationship-confirmation, pre-visit page, scripts, package, manifest/registry QA, loop-state, and this report.
- Push status: push skipped by user instruction.

## Blockers
- No source blocker for this slice.
- External NANDA publication remains approval-blocked.
- Persisting advisor confirmation card outcomes into CRM/interview writeback remains a future writeback-boundary design decision.

## Next Recommended Loop
- Because `normalLoopsSinceLastWholeProductReview` is now 4, the next loop should run the fifth-round calibration:
  - Read `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`.
  - Reassess whole-product flow across client -> relationship graph -> prep -> theater -> interview writeback.
  - Prefer identifying the next source-backed implementation slice after the review rather than collecting residual evidence only.
