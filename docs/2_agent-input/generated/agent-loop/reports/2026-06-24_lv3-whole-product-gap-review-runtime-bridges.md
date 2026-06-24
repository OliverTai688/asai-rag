# 2026-06-24 LV3 Whole-product Gap Review - Runtime Bridges

## Scope

- Type: scheduled fifth-loop whole-product calibration.
- Trigger: `cadenceReview.normalLoopsSinceLastWholeProductReview=4`, so this loop used `lv3-whole-product-gap-review-loop.md`.
- Goal: re-rank LV3 immersive advisor-system gaps after REL-004e/f/g and meeting-signal runtime grounding, without spending a loop on residual screenshots the operator can self-run.

## Recent Loop Context

- Previous fifth-loop review selected REL-004e because Route B session source grounding was still incomplete.
- Four normal loops since then closed:
  - `REL-004e`: RelationshipEdge shadow -> Route B session source grounding/readback.
  - `REL-004f`: RelationshipEdge shadow -> next-turn/provider runtime grounding.
  - `REL-004g`: RelationshipEdge shadow -> feedback review/provider grounding.
  - Meeting-derived relationship signals -> Route B next-turn/provider/UI runtime acceptance.
- Result: the old source/runtime bridge gap is no longer the top implementation target.

## Candidate Score

1. Formal `REL-004` RelationshipEdge table - 29/30, blocked.
   - Highest product impact: turns graph candidates into durable editable edges.
   - Connects relationship graph, preparation package, theater, and future writeback.
   - Blocked by operator approval for additive Prisma schema, migration/rollback, and development/staging DB proof.

2. Relationship confirmation persistence A/B/C - 28/30, blocked.
   - Highest advisor UX impact: preserves confirmation choices across refresh/new context.
   - Connects preparation package, theater build guard, and future writeback cards.
   - Blocked by product/data-model decision: A `visit-plan-json-subdocument`, B dedicated table, or C defer persistence.

3. `ITA-003o` Route B state proposal -> downstream advisor context bridge - 26/30, selected fallback.
   - Source-backed, no-schema, reviewable, and can proceed while the two durable-persistence decisions are blocked.
   - Connects theater private/group interaction and person-state proposals back into visit preparation or AI meeting notes.
   - Keeps `requiresConfirmation=true`, `writesConfirmedCrmFact=false`, no provider call, no fake `AiUsageLog`, and no relationship graph/VisitPlan/confirmed CRM fact write.

## Top Gaps

1. Formal RelationshipEdge table remains the largest durable source gap, but requires approval.
2. Relationship confirmation persistence remains a product/data-model decision, not a proof gap.
3. Route B `sceneState.statePatches` / turn `statePatches` are persisted in theater but not yet a general downstream advisor-context surface.
4. Theater-derived relationship changes still cannot write durable graph edges without formal RelationshipEdge approval.
5. AMM pgvector retrieval remains an operator/env path; current deterministic memory path is acceptable but not scalable retrieval.
6. AMM owner-doc drift around AMM-005c is resolved this loop; AMM-005c should not be selected again as an open gap.
7. External NANDA / AgentFacts registry publication remains intentionally unapproved.
8. Live provider click/cost screenshots and broad browser proof can be self-run where source/runtime proof already exists.
9. Production payment/email/notification activation remains outside LV3 product maturity and still needs manual env/provider setup.
10. Cross-flow proof freshness is useful, but should not displace source-backed bridge work unless release evidence is explicitly requested.

## Six Frames

- Advisor workflow: the next practical value is either durable graph/confirmation state or routing theater state proposals back into prep/meeting context.
- Source/BFF: no-schema runtime bridges are now strong; formal edge and confirmation persistence are blocked by decisions.
- AI reasoning/evidence: runtime provider contexts now receive safe relationship/meeting grounding; state proposals still need downstream evidence cards.
- Theater/relationship immersion: Route B supports private/group turns, state patches, feedback, and grounding, but state proposal handoff is still incomplete.
- QA/compliance: no raw transcript/provider/contact/policy leakage; residual screenshot/cost proof is self-runnable and should not dominate loops.
- NANDA: internal AgentFacts-style manifests stay `internal-only`; no external publication or signed discovery endpoint is approved.

## Changes

- Updated `AGENTS.md` and `PLN-023` to reflect AMM-005c notes/postVisitNotes compatibility proof as completed on 2026-06-23.
- Added the next safe no-schema implementation target to `AGENTS.md`, `PLN-015`, and `ACC-006`: `ITA-003o Route B state proposal -> downstream advisor context bridge`.
- Updated `issue-question.md` to clarify that formal RelationshipEdge and relationship confirmation persistence remain decision/approval blockers, not proof gaps.
- Updated `loop-state.json` cadence back to `normalLoopsSinceLastWholeProductReview=0`.

## Validation

- `git diff --check -- <this-loop-files>`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass / exit 0. It reported one existing warning in `scripts/public-status-degraded-qa.mjs` (`existsSync` unused), unrelated to this loop's staged files.

## Evidence

- Owner-doc/state evidence updated in this report and `loop-state.json`.
- Residual self-runnable commands for operator:
  - `pnpm lv3:cross-flow-no-provider-qa`
  - `DEMO_QA_BASE_URL=http://localhost:3000 pnpm meeting:notes-compat-qa`
  - `pnpm theater:route-b-persistence-qa`

## DB/Prisma

- No DB writes.
- No Prisma schema change.
- No provider call.
- No `src/generated` changes.

## Git

- Local commit: created after report finalization; exact hash is reported in the loop final response.
- Push: skipped by user instruction.

## Blockers

- Product/schema: formal `RelationshipEdge` table approval, migration/rollback, DB proof.
- Product/data-model: relationship confirmation persistence A/B/C answer.
- Operator/env: AMM pgvector extension/index path.
- External publication: NANDA/third-party registry remains unapproved.

## Next Recommended Loop

If no approval/decision arrives, implement `ITA-003o Route B state proposal -> downstream advisor context bridge` as a source-backed no-schema slice. It should consume owner-scoped Route B state proposals and expose them as visit preparation or AI meeting notes advisor-context cards, without provider calls, fake usage logs, graph writes, VisitPlan writes, or confirmed CRM fact writes.

push skipped by user instruction
