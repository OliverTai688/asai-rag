# 2026-06-23 LV3 Relationship Confirmation Persistence Decision Contract

## Scope

- Loop type: normal LV3 implementation/proof loop, L2 source-backed contract fallback.
- Strategic gate: previous loop completed clean cross-flow no-provider proof; the remaining relationship confirmation persistence gap is a product/schema decision, not a missing screenshot.
- Selected slice: relationship confirmation card transient state -> explicit persistence decision contract -> self-runnable boundary proof.
- Anti-repetition: this loop changed source and executable QA instead of adding docs-only proof.

## Candidate Score

1. LV3-REL-DECISION-001 source-backed persistence decision contract — 91/100.
   - Directly addresses the recommended blocker without inventing an unapproved schema.
   - Connects preparation package confirmation cards, future refresh/new-context persistence, and theater handoff safety.
   - Produces a reviewable source contract and dry-run proof.
2. Implement actual RelationshipConfirmationState persistence — 82/100.
   - Higher product value, but unsafe without choosing VisitPlan JSON subdocument vs dedicated table.
   - Would require migration/rollback/API/browser proof after operator decision.
3. Repeat UI/browser evidence for existing transient boundary — 63/100.
   - Useful only as residual evidence; lower value and against the operator preference while source work remained available.

## Changes

- Added `VisitRelationshipConfirmationStatePersistenceOption` and two explicit candidates:
  - `visit-plan-json-subdocument`
  - `dedicated-relationship-confirmation-state-table`
- `VisitRelationshipConfirmationStateBoundary.storageDecision` now includes:
  - `decisionStatus=product_schema_decision_required`
  - `selectedOption=null`
  - shared allowlist / forbidden fields
  - candidate migration notes, rollback notes, tradeoffs, and proof command.
- Extended `pnpm visit:relationship-confirmation-state-boundary-dry-run` to fail if option ids, allowlist, forbidden fields, migration/rollback notes, or no-DB proof drift.
- Updated `asai.visit.preparation_package` AgentFacts-style manifest with the persistence decision contract.
- Updated loop-state and issue-question to record that this blocker now has source proof but still needs product/schema selection.

## Validation

- PASS `pnpm visit:relationship-confirmation-state-boundary-dry-run`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
  - Existing warning only: `scripts/public-status-degraded-qa.mjs` unused `existsSync`; not introduced or touched by this loop.
- PASS `git diff --check`

## Evidence

- Dry-run output includes both candidate options and still reports:
  - `currentPersistence=local-only-ui-state`
  - `decisionStatus=product_schema_decision_required`
  - `requiresProductDecision=true`
  - `providerCallAttempted=false`
  - `writesConfirmedCrmFact=false`
  - `persistedToDatabase=false`
- Residual live UI/API evidence can be self-run only if needed: start `pnpm dev`, then run `pnpm visit:relationship-confirmation-state-ui-qa`.

## DB / Prisma

- No Prisma schema change.
- No `prisma db push`.
- No DB write added.
- No OpenAI/Anthropic provider call; deterministic no-provider proof, so no `AiUsageLog` write required.

## NANDA Alignment

- Updated internal AgentFacts-style manifest for `asai.visit.preparation_package`.
- Added capability/action/evidence refs for `relationship-confirmation-persistence-decision-contract`.
- Registry readiness remains `internal-only`; no public discovery, external registry publication, signing, or cross-org access.

## Git

- Local commit to be created after staging this report and this loop's source/state files.
- Push skipped by user instruction.

## Blockers

- Relationship confirmation card refresh/new-context persistence still needs product/schema choice:
  - VisitPlan-owned JSON subdocument, or
  - dedicated `RelationshipConfirmationState` table.
- Until one option is chosen, `selectedOption=null` and `persistedToDatabase=false` are the correct runtime contract.

## Next Recommended Loop

- If operator chooses one persistence option, implement a small owner-scoped persistence slice with only `cardId/state/updatedAt/sourceReferenceIds/safeNoteSummary`, plus migration/rollback/API/browser proof.
- If no decision is available, pivot to another source-backed core bridge such as AI interview or AI meeting quick notes -> relationship graph / preparation writeback cards; do not repeat relationship persistence docs-only evidence.

push skipped by user instruction
