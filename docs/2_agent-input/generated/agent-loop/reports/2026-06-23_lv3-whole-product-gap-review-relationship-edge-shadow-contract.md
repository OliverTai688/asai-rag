# ASAI LV3 Whole-Product Gap Review — RelationshipEdge Shadow Contract

- Date: 2026-06-23T12:05:43Z
- Loop type: scheduled fifth-loop whole-product review
- Cadence: `normalLoopsSinceLastWholeProductReview` was 4, so this loop executed `lv3-whole-product-gap-review-loop.md` and reset the counter to 0.
- Product definition: LV3 means immersive advisor-system architecture, experience, interface, and operability maturity; this does not declare public launch readiness.

## Scope

Reviewed the target flow:

`client creation -> relationship graph -> preparation package -> reasoning/questions -> theater stage -> private/group theater updates -> AI interview writeback`

This loop did not implement product source code. It updated the relationship graph owner docs so the next normal loop can execute a source-backed, no-schema `REL-004a` slice instead of repeating a blocked schema migration plan.

## Anti-Duplicate Gate

Latest relevant completed loops:

- `2026-06-23_lv3-payment-transaction-upsert-boundary.md`: L2/L1 implementation/proof slice. Added guarded payment transaction upsert payload boundary and proof; live provider/payment activation remains operator/environment + production approval.
- `2026-06-23_lv3-relationship-confirmation-persistence-blocker-analysis.md`: L4 blocker analysis. Clarified relationship confirmation card persistence needs product/data-model decision A/B/C before durable advisor-state write.
- `2026-06-23_lv3-theater-meeting-signal-session-source.md`: L2 source/proof slice. Propagated meeting-derived relationship signal source grounding into Route B session snapshots.

Why this review is not duplicate:

- The prior whole-product review recommended meeting/theater runtime context work; that path has since been source-backed through BFF/UI/session-source proofs.
- Relationship confirmation persistence is already escalated as a product decision, so this review does not restate it as the next action.
- The highest remaining source gap is formal graph edge modeling. Because REL-004 is schema/migration-gated, this review added a narrower owner-doc slice: `REL-004a RelationshipEdge shadow contract + backfill dry-run`.

## Six-Frame Findings

1. Advisor workflow and onboarding: first-flow usability is much stronger after AI-first sidebar, pre-visit, theater, and AMM work. The main workflow weakness is that the relationship graph still behaves like a derived tree/network instead of a durable editable edge model.
2. Source-of-truth and BFF: family member writes and graph reads are server-owned, but formal relationship edges are still derived from `FamilyMember.parentMemberId + relation`. This is a source gap, not merely a screenshot gap.
3. AI reasoning and evidence: preparation/theater meeting-signal evidence is visible and safe, but relationship confirmation card state remains transient until the A/B/C persistence decision is made.
4. Theater/relationship immersion: Route B can consume meeting-derived relationship signals and safe stage grounding. It still cannot consume a first-class RelationshipEdge table with persistent tensions, unknowns, and role/tie semantics.
5. QA, compliance, release-proof: no new compliance weakening was found. Payment live activation and formal schema migration remain production/operator-gated; no destructive DB or remote operation was run.
6. NANDA / AgentFacts protocol: AI modules remain internal-only. Manifest/readiness posture is healthier after NAP work, but no external registry publication is approved.

## Top Gaps

| Rank | Gap | Classification | Sev | Lev | Status Since Prior Review | Owner / Next Slice |
|---|---|---:|---:|---:|---|---|
| 1 | Relationship graph lacks formal edge contract/table | source gap + schema approval blocker | 2 | 3 | Changed: no-schema graph proof is complete, so next useful step is migration-ready contract proof | `REL-004a` in `AGENTS.md`, `PLN-024`, `ACC-016` |
| 2 | Relationship confirmation card durable persistence | product decision | 2 | 3 | Still blocked, but now sharply scoped to A/B/C and allowlist | `issue-question.md`; implement only after operator decision |
| 3 | Payment live activation / provider callback proof | operator/environment + production approval | 3 | 2 | Changed: source upsert boundary exists, live env/prod callback still blocked | `PLN-019` / `ACC-011`; not LV3 immersive next slice |
| 4 | AMM pgvector cross-meeting retrieval | operator/environment + product visibility decision | 2 | 2 | Still blocked by Supabase pgvector and member-private vs org-shared visibility | `PLN-023`; fallback lexical memory remains acceptable |
| 5 | NANDA external registry readiness | production/external approval | 2 | 2 | Still internal-only by policy; no publication approval | `AUD-008` / NAP workstream |
| 6 | Relationship graph -> theater durable state update writeback | source gap blocked by edge model + confirmation persistence | 2 | 3 | Changed: stage-only meeting signals work; durable CRM graph updates still intentionally absent | After `REL-004a` and persistence decision |
| 7 | Clean full-flow proof freshness after payment/meeting/theater changes | proof gap | 1 | 2 | Existing cross-flow proof is repaired; can be self-run after source slices | `pnpm lv3:cross-flow-no-provider-qa` |
| 8 | AI Meeting formal vs prototype working tree hygiene | proof/process gap | 1 | 1 | Formal AMM source is stable; unrelated local prototype files remain uncommitted and untouched | Ignore unless user asks cleanup |
| 9 | Public launch readiness declaration | production approval gap | 3 | 1 | Still not claimed; LV3 product maturity is not public launch readiness | Release hardening docs |
| 10 | External provider live proof evidence aggregation | operator/environment gap | 2 | 1 | Live provider proof approved in principle; every provider call still requires `AiUsageLog` | Per-module AI QA |

## Candidate Score

1. `REL-004a RelationshipEdge shadow contract + backfill dry-run` — score 24. Connects client -> relationship graph -> preparation/theater, avoids schema approval, creates source/QA next step, reduces repeated REL-004 blocker churn.
2. Relationship confirmation persistence implementation — score 20 but blocked. High leverage, but cannot safely choose until operator selects VisitPlan JSON subdocument vs dedicated table vs defer.
3. Payment live activation proof — score 18 but blocked/outside core immersive next step. Higher severity, but depends on provider/prod env and approval; last loop already improved source boundary.

Selected review outcome: add `REL-004a` to the relationship graph owner docs as the next normal-loop implementation/proof slice.

## Owner Docs Updated

- `AGENTS.md`: Relationship Network Graph workstream now includes `REL-004a` and updated blockers.
- `docs/05_execution-plans/PLN-024_relationship-network-graph-batch-tasks-v1.0.md`: added `REL-004a` batch tasks.
- `docs/08_acceptance-and-qa/ACC-016_relationship-network-graph-acceptance-framework-v1.0.md`: added REL-004a D0 acceptance before REL-004 schema persistence.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence and pointed next loop at REL-004a.

No `issue-question.md` change: the existing relationship confirmation persistence A/B/C decision remains current; REL-004a intentionally avoids new operator approval.

## NANDA Alignment

No AI route/provider/module source changed in this review, so no `AiUsageLog` write was required and no external registry work was performed. Active AI modules remain `internal-only`; external NANDA / third-party registry publication still requires explicit operator approval.

## Validation

- `git diff --check`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass with 0 errors / 1 pre-existing warning (`scripts/public-status-degraded-qa.mjs` unused `existsSync`). The warning is outside this review slice and did not fail the diff-scoped gate.

## Evidence

Mandatory evidence for this review is owner-doc conversion plus repo validation. Residual graph proof can be self-run after the next source slice using:

- `pnpm client:relationship-graph-qa`
- `pnpm client:relationship-graph-polish-qa`
- Next loop should add and run `pnpm client:relationship-edge-shadow-qa`

## DB / Prisma

No Prisma schema change, no Prisma generate, no db push, no DB write, no production write, no destructive operation.

## Git

Local commit created after this report write; see final response for commit hash. Push remains skipped by user instruction.

## Blockers

- Product decision: relationship confirmation card persistence still needs A/B/C selection.
- Operator/environment: REL-004 formal schema migration still needs DB target and migration/rollback approval.
- Production approval: payment live activation, real callbacks, refund/void/manual review remain outside this loop.
- External approval: NANDA external publication remains unapproved.

## Next Recommended Loop

Run a normal LV3 source-backed loop for:

`REL-004a relationship-edge shadow contract + backfill dry-run`

Suggested prompt:

> Implement REL-004a. Define a server-only RelationshipEdgeDraft/backfill DTO, add an idempotent no-schema dry-run from FamilyMember data, enforce safe metadata allowlist, add `pnpm client:relationship-edge-shadow-qa`, run tsc/lint, and do not run Prisma migration/db write until REL-004 migration approval is explicit.

push skipped by user instruction
