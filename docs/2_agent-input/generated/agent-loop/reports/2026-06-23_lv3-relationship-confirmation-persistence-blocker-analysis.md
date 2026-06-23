# 2026-06-23 LV3 Relationship Confirmation Persistence Blocker Analysis

## Scope

- Automation: `10-agents-batch-task`
- Loop type: normal LV3 L4 architecture/blocker analysis with executable proof.
- Selected slice: `LV3-RELATIONSHIP-CONFIRMATION-PERSISTENCE-BLOCKER-ANALYSIS-001`
- Product boundary: advisor relationship-confirmation card state can be validated transiently before theater build, but durable refresh/new-context persistence still needs a product/schema choice.
- Push policy: `push skipped by user instruction`

## Strategic Review

- Cadence check: `normalLoopsSinceLastWholeProductReview=2`, so this was not the fifth-loop whole-product review.
- Last two loop classification:
  - `LV3-THEATER-MEETING-SIGNAL-RUNTIME-CONTEXT-001`: L2 source-backed implementation/proof.
  - `LV3-ROUTE-B-STAGE-MAP-ACCEPTANCE-RECONCILE-001`: L1/L2 executable proof and acceptance reconciliation.
- Anti-repetition rationale: this loop does not repeat stage-map reconciliation, browser screenshot collection, or another quiet evidence report. The same relationship-confirmation persistence blocker has appeared across multiple loops, so escalation to L4 blocker analysis is allowed by the loop rules.

## Candidate Score

| Candidate | Score | Reason |
| --- | ---: | --- |
| `LV3-RELATIONSHIP-CONFIRMATION-PERSISTENCE-IMPLEMENTATION-001` | 41/50 | Highest product value if Option A or B is chosen, but unsafe this round because implementing schema/storage would preselect an unresolved product decision. |
| `LV3-RELATIONSHIP-CONFIRMATION-PERSISTENCE-BLOCKER-ANALYSIS-001` | 38/50 | Selected. Converts the repeated blocker into a minimal A/B/C operator answer, updates issue-question, preserves existing no-DB source contract, and adds runnable blocker QA. |
| Next non-persistence LV3 source bridge | 32/50 | Safe fallback if persistence is explicitly deferred, but lower leverage until the core advisor-state decision is answered or deferred. |

## Root Cause

The current source contract already validates relationship confirmation state safely:

- `GET/POST /api/visits/[id]/relationship-confirmation-state` derives scope from current member + owner-scoped VisitPlan.
- The envelope only allows `cardId`, `state`, `updatedAt`, `sourceReferenceIds`, and `safeNoteSummary`.
- The route does not use Prisma persistence, does not call a provider, and does not write confirmed CRM facts.
- `storageDecision.selectedOption=null`, `currentPersistence=local-only-ui-state`, and `persistedToDatabase=false` are intentionally correct until a product/schema option is selected.

The blocker is not missing code coverage. It is a product/schema choice between whether this state should live with a VisitPlan JSON subdocument or a dedicated per-card table.

## Risk Tradeoffs

Option A: `visit-plan-json-subdocument`

- Best when the state only needs to reload with one preparation package.
- Lower implementation cost and simpler owner scope because state lives with VisitPlan.
- Weaker for queryability, per-card audit history, and high-churn updates.

Option B: `dedicated-relationship-confirmation-state-table`

- Best when future product needs per-card write isolation, auditability, or cross-preparation querying.
- Cleaner long-term boundary and easier per-card history.
- Requires new table/repository, migration/rollback proof, owner-scoped joins, and stronger DB/browser proof.

Option C: `defer-relationship-confirmation-persistence`

- Keeps the current safe transient boundary.
- Avoids accidental schema commitment while product direction is unclear.
- Means advisor selection state remains not durable across refresh/new-context; next loops must not claim persistence.

## Already-Tried Proof

- `pnpm visit:relationship-confirmation-state-boundary-dry-run`
- `pnpm visit:relationship-confirmation-state-ui-qa`
- `pnpm visit:relationship-confirmation-dry-run`
- `pnpm visit:theater-handoff-dry-run`
- `pnpm ai:protocol-registry-qa`
- Previous decision-contract report: `docs/2_agent-input/generated/agent-loop/reports/2026-06-23_lv3-relationship-confirmation-persistence-decision-contract.md`

## Minimal Operator Answer

Answer exactly one:

- Option A: `visit-plan-json-subdocument`
- Option B: `dedicated-relationship-confirmation-state-table`
- Option C: `defer-relationship-confirmation-persistence`

Until A or B is selected, implementation must keep `selectedOption=null`, `persistedToDatabase=false`, no migration, no DB write, no CRM fact write, and no claim that advisor relationship-confirmation selection reloads across contexts.

## Changes

- Added `pnpm visit:relationship-confirmation-persistence-blocker-qa`.
- Updated `issue-question.md` with the A/B/C minimal operator answer and current no-persistence boundary.
- Updated `loop-state.json` cadence to 3 and changed the next recommendation to implementation only after Option A or B is answered; otherwise choose another source-backed LV3 bridge.
- Added this report.

## Validation

- PASS `pnpm visit:relationship-confirmation-persistence-blocker-qa`
- PASS `pnpm visit:relationship-confirmation-state-boundary-dry-run`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
  - Note: the command reports one pre-existing warning in `scripts/public-status-degraded-qa.mjs` for an unused `existsSync` import; it exited 0 with no errors.
- PASS `git diff --check`

## Evidence

- The blocker QA checks `issue-question.md`, `loop-state.json`, this report, package script registration, source boundary markers, owner-scoped route markers, no direct Prisma persistence, no fake `AiUsageLog`, and the prior decision-contract report.
- Residual live UI/API evidence is not required for this L4 blocker analysis; if desired, it remains self-runnable with `pnpm visit:relationship-confirmation-state-ui-qa`.

## NANDA Alignment

- Touched AI-adjacent visit preparation workflow documentation and proof, but did not change provider behavior or external registry posture.
- Agent/module id: `asai.visit.preparation_package`.
- Owner surface: visit preparation package and pre-visit theater build boundary.
- Action/endpoint involved: `relationship-confirmation-persistence-decision-contract`, `relationship-confirmation-card-state-boundary`, `/api/visits/[id]/relationship-confirmation-state`.
- DTO boundary: `VisitRelationshipConfirmationStateBoundary` and `VisitRelationshipConfirmationStatePersistenceOption`.
- Auth/session scope: app member; current member + owner-scoped VisitPlan.
- Data classes: client facts/inferences/unknowns and advisor confirmation state envelope only.
- Quota/cost and `AiUsageLog`: deterministic no-provider proof; no provider call and no fake usage log.
- Registry readiness: `internal-only`; no external NANDA/AgentFacts publication, public discovery, signing, or cross-org access.

## DB and Prisma

- DB writes: none.
- Prisma schema/generate/validate/db push: none.
- Provider calls: none.
- `AiUsageLog`: no new log expected because no provider call occurred.

## Git

- Start status had unrelated dirty files in manual docs, sidebar, meeting module docs, notes components, and note domain. They were not modified for this slice.
- This loop should stage only `package.json`, `scripts/visit-relationship-confirmation-persistence-blocker-qa.mjs`, `issue-question.md`, `loop-state.json`, and this report.
- Push skipped by user instruction.

## Blockers

- `Product decision`: choose Option A, Option B, or Option C.
- `Production approval`: no production DB migration or external registry publication is approved by this blocker analysis.

## Next Recommended Loop

If Option A or B is answered, run `LV3-RELATIONSHIP-CONFIRMATION-PERSISTENCE-IMPLEMENTATION-001` and implement only the chosen owner-scoped persistence slice with migration/rollback/API/UI/DB proof.

If Option C is answered or no answer is available, stop repeating persistence blocker docs and choose the next safe source-backed LV3 bridge outside this blocker.
