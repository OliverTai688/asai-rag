# LV3 Whole Product Gap Review — After Graph Polish / DB Regression

Date: 2026-06-25T13:42:16Z  
Loop type: L4 scheduled whole-product gap review, fifth-loop calibration  
Prompt: `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`  
Push: skipped by user instruction

## Scope

This review re-ranked the full ASAI LV3 immersive advisor-system flow after the recent relationship graph convergence/polish, Route B stage reconciliation, notes hub quarantine, and cross-flow harness hardening loops.

Target flow:

`new client -> relationship graph -> preparation package -> questions/evidence -> theater stage -> private/group theater + person state -> AI interview/meeting writeback`

This loop did not change product source code, schema, provider code, or UI runtime behavior. It updated loop state, issue-question blocker analysis, and this report.

## Strategic Review Gate

- Current main goal: keep the LV3 workflow moving toward an operable advisor system, not public launch readiness.
- Recent completed loops: notes hub source quarantine, Route B stage graph proof reconciliation, cross-flow harness hardening, REL-009 graph polish a11y/source guardrails.
- Current bottleneck: DB-backed runtime proof regressed from previously working Supabase DNS to `ENOTFOUND`, so full browser/API evidence is blocked by environment connectivity.
- Why this is not repetition: the previous whole-product review's top four gaps are now mostly resolved or reduced to a runtime proof blocker; this review reranks remaining gaps and prevents the next loop from re-reporting the same DB failure.
- Next product result: if DB remains down, progress a no-DB source-backed AMM/relationship/previsit bridge; if DB recovers, immediately close the live graph/cross-flow proof gap.

## Candidate Score

Scores use severity / leverage / dependency clarity on a 1-3 scale.

1. Runtime DB connectivity blocker analysis — 9/9
   - Severity 3: blocks full relationship graph polish proof and DB-backed cross-flow proof.
   - Leverage 3: unblocks multiple acceptance suites at once once environment recovers.
   - Dependency 3: root evidence is concrete (`ENOTFOUND`) and operator/env action is minimal.

2. AMM accepted-source quick-note/writeback bridge hardening — 8/9
   - Severity 2: AI interview/meeting-to-writeback is still the weakest creation/refinement entry after graph/previsit/theater work.
   - Leverage 3: connects AI meeting notes toward relationship/previsit/theater signals without requiring confirmed CRM fact writes.
   - Dependency 3: can be shaped as no-DB source/contract proof while DB is unavailable.

3. Relationship confirmation persistence decision — 8/9 but blocked
   - Severity 2: advisor confirmation state still cannot be honestly claimed durable across refresh/new context.
   - Leverage 3: affects preparation package reasoning trace, relationship signal confidence, and theater grounding.
   - Dependency 3: needs operator A/B/C product/schema decision before persistence implementation.

Selected slice for this loop: whole-product review plus DB runtime blocker analysis. The next implementation slice should be AMM/relationship/previsit bridge work if DB remains unavailable, or full DB-backed graph/cross-flow proof if DB recovers first.

## Six-Frame Review

1. Advisor workflow / onboarding
   - Stronger: client -> relationship graph now has BFF-backed render, linked-client navigation, parent/relation validation, and graph a11y/fallback contracts.
   - Gap: full clean-browser proof is blocked by DB DNS; relationship confirmation persistence still needs product/schema decision.

2. Source-of-truth / BFF
   - Stronger: dashboard, issues, reports, CRM lifecycle, relationship graph, visit/previsit, SPIN, team/org, and Route B surfaces have server-owned contracts or guarded source boundaries.
   - Gap: formal `RelationshipEdge` table and relationship confirmation durable state remain decision-gated; dirty untracked AMM notes prototypes must not be adopted accidentally as source.

3. AI reasoning / evidence
   - Stronger: preparation packages, meeting signals, Route B context, and quick-capture paths carry fact/inference/unknown and no-provider proof markers.
   - Gap: advisor-confirmed persistence for inferred relationship/question state is still intentionally disabled, so user-visible reasoning can be reviewed but not always carried forward durably.

4. Theater / relationship immersion
   - Stronger: Route B stage source reconciliation, private/group UI proof, state proposal shell, and relationship/meeting signal handoff contracts exist.
   - Gap: live provider-backed director/character/feedback orchestration still needs env-backed proof with `AiUsageLog`; relationship state changes remain proposal/preview unless a writeback policy is approved.

5. QA / compliance / release proof
   - Stronger: cross-flow harness now fails fast on wrong base URL and can run scoped/no-provider coverage; source-only fallback commands are explicit.
   - Gap: Supabase DB host currently returns DNS `ENOTFOUND`, so any DB-backed full proof would be false confidence until environment recovers.

6. NANDA / AgentFacts protocol
   - Stronger: registry/readiness QA passes; all 11 agents remain internal-only with least-disclosure disabled-publication posture.
   - Gap: external registry publication, signing, public discovery, and cross-org access remain paused by operator instruction and must not be represented as ready.

## Top 10 Gaps

1. Runtime DB DNS/connectivity regression
   - Type: environment / QA blocker
   - Evidence: `db.wwocdcicvpmbdmqvskzi.supabase.co` DNS lookup returns `ENOTFOUND`.
   - Impact: blocks full graph polish browser/API proof and DB-backed cross-flow proof.
   - Next: operator/env recovery, then rerun full graph polish QA and `lv3:cross-flow-no-provider-qa`.

2. Relationship confirmation persistence A/B/C decision
   - Type: product/schema blocker
   - Impact: preparation package confirmation cards remain transient.
   - Next: operator choose VisitPlan JSON subdocument, dedicated table, or explicit defer.

3. Formal relationship edge durability
   - Type: schema/product blocker
   - Impact: current graph/edge-shadow contracts work, but formal graph edge persistence remains unapproved.
   - Next: approve or defer `RelationshipEdge` migration with rollback/compatibility note.

4. AI meeting/interview writeback as creation/refinement entry
   - Type: source/proof gap
   - Impact: AMM and quick-capture bridges are guarded, but the whole flow from captured note to advisor-reviewed relationship/previsit/theater update still needs tighter source proof.
   - Next: no-DB source-backed bridge hardening while DB is unavailable.

5. Full live graph -> prep -> theater proof freshness
   - Type: QA proof gap
   - Impact: source pieces are strong, but current live end-to-end browser/API evidence cannot be refreshed under DB outage.
   - Next: rerun after DB recovers; do not claim live proof until then.

6. Route B provider-backed runtime
   - Type: provider/env proof gap
   - Impact: director/character/feedback remain guarded-disabled or deterministic unless live provider env and `AiUsageLog` success/error proof are completed.
   - Next: provider proof only after env is available and cost/usage evidence is captured.

7. Theater relationship state durability
   - Type: product/writeback policy gap
   - Impact: private/group theater can propose state changes, but durable graph/client updates remain intentionally blocked.
   - Next: define advisor approval and allowed write targets before persistence.

8. Dirty worktree prototype containment
   - Type: source hygiene / review risk
   - Impact: untracked AMM notes prototype files and unrelated dirty docs/schema must not be staged or treated as accepted source without a slice.
   - Next: keep staging narrow; adopt or quarantine prototypes through AMM-owned proof only.

9. Private beta / public launch evidence
   - Type: release readiness gap
   - Impact: LV3 product maturity is not equivalent to public launch readiness; payment/email/notification/provider env still need manual setup/proof.
   - Next: keep `ACC-014` gates separate from LV3 loop claims.

10. External protocol publication
   - Type: operator approval blocker
   - Impact: NANDA/AgentFacts stays internal-only by instruction.
   - Next: continue internal manifest proof; no external publication without explicit approval.

## Validation

- `git status --short --branch` at start: pass; branch `codex/asai-lv3-automation` ahead of origin with pre-existing dirty/untracked files outside this loop.
- DB DNS preflight: blocked as expected, `ENOTFOUND getaddrinfo ENOTFOUND db.wwocdcicvpmbdmqvskzi.supabase.co`.
- `pnpm ai:protocol-registry-qa`: pass; 11 agents, all internal-only.
- `pnpm ai:protocol-readiness-qa`: pass; HTTP API proof skipped because `DEMO_QA_BASE_URL` was not set; registry route has no Prisma/provider dependency.
- `RELATIONSHIP_GRAPH_POLISH_SOURCE_ONLY=1 DEMO_QA_BASE_URL=http://127.0.0.1:3000 pnpm client:relationship-graph-polish-qa`: pass; 9/9 source/no-provider checks.
- `git diff --check`: pass.
- `loop-state.json` parse check: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass with one pre-existing branch warning outside this loop (`scripts/public-status-degraded-qa.mjs` unused `existsSync` warning, exit code 0).

## DB / Prisma

No DB writes, no Prisma schema edits, no `prisma db push`, no migration, no production operation.

DB connectivity proof was intentionally read-only DNS preflight and failed with `ENOTFOUND`.

## AI / Provider / AiUsageLog

No OpenAI/Anthropic provider call was made. No fake `AiUsageLog` was written or required. Protocol QA confirms all AI capabilities remain internal-only and publication-disabled.

## NANDA Alignment

This review touched no AI route implementation. Alignment was verified through:

- `pnpm ai:protocol-registry-qa`
- `pnpm ai:protocol-readiness-qa`

All 11 agents remain `internal-only`; no agent claims `external-ready` or `external-registered`; public discovery, external publication, signing, and revocation remain disabled.

## Changes

- Updated `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Updated `docs/2_agent-input/generated/agent-loop/issue-question.md`
- Added this report

## Blockers

- Environment: Supabase DB host DNS currently returns `ENOTFOUND`.
- Product/schema: relationship confirmation persistence A/B/C remains open.
- Product/schema: formal `RelationshipEdge` durable table migration remains approval/defer gated.
- Operator policy: external NANDA publication remains paused.

## Next Recommended Loop

If DB remains unavailable, choose a no-DB source-backed implementation slice:

`AMM accepted-source quick-note/writeback bridge hardening -> relationship/previsit/theater review-context handoff`

Constraints:

- Use accepted source `/pre-visit/[planId]/notes` / `CLIENT_MEETING` boundaries only.
- Do not adopt untracked local note prototype as truth source.
- No confirmed CRM fact write, no relationship graph persistence, no provider call unless explicit gated path and `AiUsageLog` are included.
- Leave source-only or dry-run proof command.

If DB recovers first, run:

1. `DEMO_QA_BASE_URL=http://127.0.0.1:<asai-port> pnpm client:relationship-graph-polish-qa`
2. `DEMO_QA_BASE_URL=http://127.0.0.1:<asai-port> pnpm lv3:cross-flow-no-provider-qa`

Only then claim full live DB-backed graph/cross-flow proof.
