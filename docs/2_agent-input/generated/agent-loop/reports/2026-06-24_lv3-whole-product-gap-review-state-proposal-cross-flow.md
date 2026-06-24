# 2026-06-24 LV3 Whole-product Gap Review - State Proposal Cross-flow

## Scope

- Type: scheduled fifth-loop whole-product calibration.
- Trigger: `cadenceReview.normalLoopsSinceLastWholeProductReview=4`, so this loop used `lv3-whole-product-gap-review-loop.md`.
- Goal: re-rank the immersive advisor workflow after `ITA/AMM-003r` closed the Route B state proposal cross-flow proof.
- Push: push skipped by user instruction.

## What Changed Since The Last Review

- Last review selected `ITA-003o` because theater state proposals were persisted but not yet reusable by advisor surfaces.
- Four normal loops since then closed the chain:
  - `ITA-003o`: Route B state proposals -> visit preparation advisor context.
  - `ITA/AMM-003p`: Route B state proposals -> AI Meeting notes context.
  - `ITA/AMM-003q`: Route B state proposals -> AI Meeting writeback preview context.
  - `ITA/AMM-003r`: one cross-flow proof command for theater -> visit prep -> AI Meeting notes -> writeback preview.
- This review is not duplicate work because the old selected fallback is now resolved; the new highest non-blocked gap moved earlier in the flow to family/person metadata inside the relationship graph.

## Candidate Score

1. `REL-006 family/person metadata profile boundary` - 29/30, selected next source slice.
   - Severity 2, leverage 3: the target LV3 flow requires each relationship person to carry job/title, annual income, status, relationship context, and unknown/inference labels.
   - Current source already exposes these fields for the primary client, but family members still render job/income/status as `UNKNOWN`; `FamilyMember.metadata` exists, so a no-schema allowlist can move this forward without REL-004 approval.
   - Unlocks client -> relationship graph -> preparation package -> theater stage quality without provider calls, schema changes, or confirmed CRM fact writes.

2. `AMM-006c state proposal writeback-candidate boundary` - 27/30, safe second choice.
   - Severity 2, leverage 3: `ITA/AMM-003q` reaches writeback preview, but theater-derived state proposals are not yet first-class advisor-review candidates in the meeting writeback card model.
   - This would connect theater -> AI Meeting -> task/insight writeback while preserving existing `requiresConfirmation=true`, no confirmed CRM fact for inference, and sensitive reason/riskAccepted gates.
   - It is source-backed and no-schema, but it sits downstream of the relationship-person metadata gap.

3. Formal `REL-004 RelationshipEdge` table - 26/30, still blocked.
   - Severity 2, leverage 3: durable multi-edge graph writes/backfill remain the clean long-term model.
   - REL-004a-g already proved no-schema shadow and downstream consumers; remaining value requires additive Prisma schema/migration/rollback plus development/staging DB proof.
   - Blocker type: operator approval/schema.

## Six Frames

- Advisor workflow/onboarding: relationship graph can start from a client and feed prep/theater, but non-client people still look underspecified because job/income/status are always unknown.
- Source-of-truth/BFF: `FamilyMember.metadata` exists in Prisma but is not yet an allowlisted DTO/write/read contract; REL-004 remains blocked by schema approval.
- AI reasoning/evidence: prep/theater/meeting now consume relationship and state proposal context with safe evidence labels; person metadata would reduce avoidable unknowns before AI generation.
- Theater/relationship immersion: Route B has source grounding, private/group turns, state proposals, feedback, red-line context, and state proposal cross-flow proof; durable relationship edits remain blocked.
- QA/compliance/release proof: source/static proof is strong for the recent bridge; next normal loop should include API/UI proof for no raw contact/private/provider leakage and no schema/provider/DB surprise.
- NANDA/AgentFacts: `asai.theater.route_b`, `asai.visit.preparation_package`, and `asai.meeting.prototype` carry the new cross-flow proof while remaining `internal-only`.

## Top 10 Gaps

1. Family/person metadata boundary for relationship graph: source gap, new/changed. Owner: REL/CRM relationship graph. Evidence: `relationship-graph.ts` renders family job/income/status as `UNKNOWN`; `FamilyMember.metadata` exists. Missing: allowlisted metadata schema, BFF update/read DTO, UI/API proof.
2. Meeting state proposal writeback-candidate boundary: source gap, changed. Owner: AMM writeback. Evidence: `ITA/AMM-003q/r` preview exists. Missing: conversion into advisor-review cards without confirmed fact writes.
3. Formal `RelationshipEdge` persistence: operator/schema gap, still blocked. Owner: REL-004. Evidence: REL-004a-g no-schema proofs. Missing: approval, migration/rollback, DB proof.
4. Relationship confirmation persistence: product decision, still blocked. Owner: Visit/preparation confirmation. Evidence: transient boundary proof. Missing: A/B/C product answer.
5. AMM pgvector retrieval: operator/environment gap, still blocked. Owner: AMM-007. Evidence: deterministic lexical memory path. Missing: Supabase pgvector/index enablement and embedding write proof.
6. Live provider evidence for some Route B feedback/director paths: proof gap/operator-env. Owner: ITA Route B. Evidence: provider contracts and guarded routes. Missing: live provider cost/success-error proof where product requires it.
7. Clean first-run browser proof after newest cross-flow: residual proof gap. Owner: LV3 cross-flow QA. Evidence: executable static proof. Missing: optional operator-run browser checklist; not blocking source work.
8. External NANDA publication: external approval gap, intentionally paused. Owner: NAP. Evidence: internal manifests/adapters. Missing: explicit approval, signing, public discovery, cross-org policy.
9. Production payment/email/notification enablement: external/manual env gap. Owner: BFF/manual-setting. Evidence: guarded disabled contracts. Missing: provider env/callback and explicit high-risk approvals.
10. Untracked notes/research artifacts in worktree: hygiene/ownership gap. Owner: operator or future selected AMM/notes slice. Evidence: dirty worktree. Missing: explicit adoption or ignore; not staged by this loop.

## Owner Doc Updates

- Added `REL-006` to `AGENTS.md` and `PLN-024` as the next no-schema relationship-person metadata slice.
- Added `ACC-016` acceptance criteria for `REL-006`.
- Updated `issue-question.md` to distinguish the new safe source slice from the two recurring blockers.
- Updated `loop-state.json` cadence back to 0 and pointed the next normal loop at `REL-006`.

## Validation

- PASS: `pnpm lv3:route-b-state-proposal-cross-flow-qa` (83 checks; no provider, no DB, no browser, no relationship graph/VisitPlan/confirmed CRM fact writes).
- PASS: `pnpm ai:protocol-registry-qa` (all 11 manifests remain `internal-only`; no external-ready/external-registered claim).
- PASS: `git diff --check`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed` (exit 0; existing warning remains in unrelated `scripts/public-status-degraded-qa.mjs`).

## DB/Prisma

- No DB writes.
- No Prisma schema change.
- No Prisma generate/validate/db push.
- No provider call.
- No `src/generated` changes.

## NANDA Alignment

- No manifest source was changed in this review loop.
- Latest evidence from `ITA/AMM-003r` remains the active proof: `asai.theater.route_b`, `asai.visit.preparation_package`, and `asai.meeting.prototype` all reference the cross-flow proof and remain `internal-only`.
- No external registry publication, public discovery endpoint, signing, credentialing, or cross-org agent access was attempted.

## Residual Self-runnable Evidence

- Re-run the closed state proposal path: `pnpm lv3:route-b-state-proposal-cross-flow-qa`.
- Re-run internal registry proof: `pnpm ai:protocol-registry-qa`.
- If a browser smoke is desired after a dev server starts: inspect `/crm/[clientId]/relationships`, `/pre-visit/[planId]`, `/pre-visit/[planId]/notes`, and `/theater/[sessionId]` for no horizontal overflow and no console errors.

## Blockers

- Product/schema: formal `RelationshipEdge` table approval, migration/rollback, DB proof.
- Product/data-model: relationship confirmation persistence A/B/C answer.
- Operator/env: AMM pgvector extension/index path.
- External publication: NANDA/third-party registry remains unapproved.
- Worktree hygiene: unrelated dirty/untracked files remain intentionally unstaged.

## Next Recommended Loop

Implement `REL-006 family/person metadata profile boundary` as a source-backed no-schema slice:

- Define an allowlisted `FamilyMember.metadata.profile` contract for job/title, annual income or dependency, person status/decision role, relationship context, fact status, and source refs.
- Extend BFF read/update DTOs without exposing email/phone/raw transcript/provider payload/policy number.
- Update relationship graph source review to show known family metadata and shrink avoidable unknown counts.
- Add a proof command that verifies owner-scoped write/read, no Prisma schema change, no provider call, no fake `AiUsageLog`, no relationship/VisitPlan/confirmed CRM fact writes, and no private sentinel leakage.

push skipped by user instruction
