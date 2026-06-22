# 2026-06-22 LV3 whole-product gap review after relationship cards

## Scope

- Loop type: scheduled fifth-loop whole-product calibration.
- Cadence trigger: `normalLoopsSinceLastWholeProductReview=4`, so this loop used `lv3-whole-product-gap-review-loop.md` instead of selecting another normal implementation slice.
- Not a public launch readiness claim. LV3 here remains architecture, experience, interface, and operable immersive advisor-system maturity.
- Push remains paused by user instruction.

## Strategic review

Recent loops were not repetitive docs/proof:

1. `ITA-005k` completed disabled/no-provider compliance-review intake.
2. `ITA-005l` completed disabled/no-provider compliance-review queue.
3. `AMM quick-note intake` completed owner-scoped meeting quick-note intake and notes-page sync action.
4. `Relationship graph -> preparation package confirmation cards` completed deterministic relationship confirmation cards in the previsit surface.

The previous whole-product review after notes-hub quarantine pointed to compliance intake; that was implemented, followed by queue, meeting notes, and relationship-card source slices. The current bottleneck moved from compliance queueing to cross-surface grounding: the relationship confirmation cards now exist in the preparation package, but theater handoff does not yet carry that confirmation deck into the AI theater stage.

## Candidate score

1. Scheduled fifth-loop whole-product review: 9.6 / 10. Required by cadence, prevents repeating narrow slices, and updates the next source-backed target after four implementation loops.
2. `ITA-RCG-001 relationship confirmation deck -> Route B theater handoff grounding`: 9.3 / 10. Highest leverage next source slice because it connects preparation package -> theater stage without DB/provider risk.
3. Relationship confirmation card-state persistence/writeback: 8.5 / 10. Important, but should follow handoff grounding because persistence needs a narrower allowlist and UX decision for refresh/new-context behavior.

## Six-frame gaps

1. Advisor workflow / onboarding: the advisor can now review relationship cards in the preparation package, but clicking into theater does not make it obvious that the same unknowns/inferences travel into the stage.
2. Source-of-truth / BFF: `buildVisitRelationshipConfirmationDeck()` is currently consumed by the previsit UI and dry-run proof; Route B handoff still uses family/policy/question evidence without the new confirmation-card deck.
3. AI reasoning / evidence: preparation questions carry fact/inference/unknown reasoning, but relationship confirmation prompts are not yet represented as theater known materials or narrator follow-ups.
4. Theater / relationship immersion: Route B has group/private turns, stage map, red-line feedback, provider candidate logging, and compliance queueing; it still needs the freshly added relationship confirmation cards as stage grounding.
5. QA / compliance: current proof is strong for no-provider source slices. Remaining browser-only screenshots or self-runnable residual checks should be handed to the operator instead of consuming a loop.
6. NANDA / AgentFacts: AI modules remain `internal-only`, which is correct. The next slice should add or reuse manifest refs for the handoff action without claiming external registry readiness.

## Top gaps

1. High / high leverage: Relationship confirmation deck is not included in Route B theater handoff. Next source slice should add this without provider or DB writes.
2. High / medium leverage: Advisor-selected card states are local-only. Later slice should persist safe card id/state/evidence refs if refresh/new-context behavior becomes required.
3. Medium / high leverage: REL-004 edge table remains schema/operator gated; current graph still relies on derived family/social edges.
4. Medium / medium leverage: AMM residual compatibility proof can be self-run with `pnpm meeting:notes-compat-qa`; do not spend an automation loop only collecting screenshots.
5. Medium / compliance gated: Formal compliance workflow, real notification, legal review routing, and external NANDA publication still require explicit approval.

## Selected slice

Selected this loop: scheduled whole-product calibration.

Next implementation slice: `ITA-RCG-001 relationship confirmation deck -> Route B theater handoff grounding`.

Expected source work:

- Include `buildVisitRelationshipConfirmationDeck()` safe card output in visit -> theater handoff `knownMaterials`, `sourceSummary`, narrator questions, or equivalent DTO.
- Preserve card id, person label, relationship context, question/rationale, evidence refs, and `fact` / `inference` / `unknown` labels.
- Keep no-provider/no fake `AiUsageLog`, no DB/schema writes, no confirmed CRM fact writeback, and no raw private/provider payload.

## Changes

- Updated `loop-state.json` cadence counter to 0 and pointed the next loop at `ITA-RCG-001`.
- Added a concise whole-product review note and scope note to `PLN-015`.
- Added `ACC-006` section 6.13 for relationship confirmation deck -> theater handoff acceptance.
- Added this report.

## NANDA alignment

- No external registry publication was attempted.
- Current readiness remains `internal-only`.
- Next slice should keep the same least-disclosure posture and, if manifest refs change, add only internal action/DTO/evidence refs for the theater handoff grounding capability.

## Validation

- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.
- PASS: `git diff --check`.
- Targeted source proof was not run because this was the scheduled whole-product calibration; next source loop should run `pnpm visit:relationship-confirmation-dry-run` and `pnpm visit:theater-handoff-dry-run`.

## Evidence

- Source audit: `src/domains/theater/visit-handoff.ts` includes visit question/family/policy evidence but not the new relationship confirmation deck.
- Existing proof commands available for next source slice: `pnpm visit:relationship-confirmation-dry-run` and `pnpm visit:theater-handoff-dry-run`.
- Residual self-run evidence accepted by user: `pnpm meeting:notes-compat-qa`.

## DB / Prisma

- No DB writes.
- No Prisma schema changes.
- No provider calls.

## Git

- Start status contained pre-existing unrelated dirty/untracked files; they were not touched or staged.
- Local commit is created after validation by the automation loop; see final response for hash.
- Push skipped by user instruction.

## Blockers

- Operator approval remains required for external NANDA publication, real notification/compliance workflow, pgvector enablement, destructive DB operations, production writes, and any real payment/refund/email operation.
- `REL-004` relationship edge persistence remains schema/operator scoped.

## Next recommended loop

Run a normal source-backed loop for `ITA-RCG-001 relationship confirmation deck -> Route B theater handoff grounding`; do not use the next loop for docs-only proof or residual screenshots.
