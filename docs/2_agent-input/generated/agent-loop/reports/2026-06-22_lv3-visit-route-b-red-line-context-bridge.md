# 2026-06-22 LV3 Visit Route B Red-line Context Bridge

## Scope

- Loop type: normal LV3 implementation/proof loop (`normalLoopsSinceLastWholeProductReview=0` at start).
- Anti-repetition gate: previous loop was scheduled L4 whole-product review; this loop returned to L2 source/domain/proof work instead of docs-only proof.
- Selected slice: `ITA/AMM-005g` visit preparation first downstream consumer for Route B red-line action context.
- Boundary: domain/evidence bridge only. This does not yet wire production visit-prep BFF/UI automatic loading from persisted theater feedback review.
- Push policy: push skipped by user instruction.

## Candidate Score

1. `ITA/AMM-005g visit preparation red-line context bridge` - 94/100.
   - Highest leverage because it connects Route B feedback/action state to the next advisor artifact while avoiding unrelated dirty notes prototype files.
2. `AI meeting notes red-line consumer` - 86/100.
   - Strong product fit, but current notes/AMM prototype files are dirty and need explicit audit/adoption before touching.
3. `Formal compliance workflow / notification routing` - 78/100.
   - Important but still approval-bound; real notification, legal findings, and compliance ops persistence remain out of scope.

## Selected Slice

Implemented a visit-domain bridge that consumes server-owned `TheaterRouteBFeedbackReview.redLineFindings.actionContext` and turns severe red-line action state into visit question evidence:

- `ESCALATE` and `EVIDENCE_NEEDED` become `VisitQuestionEvidence.source=theater_route_b_red_line` with `unknown` status.
- P/I/N reasoning can include the advisor caution and confirmation prompt.
- S questions remain focused on current-state discovery so red-line context does not dominate the opening.
- Output flags remain no legal advice, no formal finding, no provider call, no notification, and no confirmed CRM fact write.

## Changes

- Added `src/domains/visit/route-b-red-line-context.ts`.
- Extended `src/domains/visit/reasoning.ts` and `src/domains/visit/types.ts` for optional Route B red-line evidence.
- Extended `src/domains/visit/ai-evidence-dto.ts` source union for downstream evidence summaries.
- Added `scripts/visit-route-b-red-line-context-dry-run.ts/.mjs` and `pnpm visit:route-b-red-line-context-dry-run`.
- Updated `asai.visit.preparation_package` AgentFacts-style manifest and registry QA requirements.
- Updated `ACC-006` section 6.10 and `PLN-015` with the verified domain bridge and remaining BFF/UI/notes gaps.
- Updated `loop-state.json` cadence to `1` and next recommended slice.

## Validation

- PASS `pnpm visit:route-b-red-line-context-dry-run`.
- PASS `pnpm visit:reasoning-dry-run`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm ai:bff-audit`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.
- PASS `git diff --check`.

## Evidence

- New dry-run checks 22 assertions:
  - source action id is `route-b-red-line-action-feedback-consumption`;
  - downstream action id is `route-b-red-line-action-visit-prep-consumption`;
  - context item count is 5;
  - escalation count is 1;
  - evidence-needed count is 1;
  - P/I/N question ids consume the context;
  - provider call attempted is false;
  - `AiUsageLog` is not faked;
  - confirmed CRM fact write and notification are false;
  - private/contact/provider/policy sentinels are not returned.

## NANDA Alignment

- Updated active downstream module: `asai.visit.preparation_package`.
- Added capability/action/DTO/evidence refs for Route B red-line action context consumption.
- Registry readiness remains `internal-only`; no external publication, signing, public discovery, or cross-org access was started.
- No provider call was added in this slice, so no new `AiUsageLog` row is required.

## DB / Prisma

- No Prisma schema change.
- No `prisma db push`.
- No DB write.
- `pnpm ai:bff-audit` read existing `AiUsageLog` summary only.

## Git

- Start status included unrelated dirty files in docs manual/index, sidebar, AMM/notes docs, and notes prototype paths. They were not touched or staged by this loop.
- Local commit is created after this report is staged; final response records the hash.
- push skipped by user instruction.

## Blockers

- Source/product: production visit-prep BFF/UI still does not automatically load persisted theater feedback review via owner-scoped route/session join.
- Worktree hygiene: current AI Meeting / notes prototype files remain dirty and must be explicitly audited/adopted before using notes as the second consumer.
- Approval: formal compliance workflow, real notifications, live detection, confirmed CRM fact writes, and external registry publication remain unapproved/out of scope.

## Next Recommended Loop

Run a source-backed downstream continuation:

1. Wire visit preparation BFF/UI to load owner-scoped persisted theater feedback review into the new domain bridge without raw session/person id entry; or
2. Explicitly audit/adopt the dirty AI Meeting notes prototype, then make meeting notes the second consumer of Route B red-line action context.

If only visual/dev-server confirmation remains, ask the operator to run it locally instead of spending an automation loop on docs-only evidence.
