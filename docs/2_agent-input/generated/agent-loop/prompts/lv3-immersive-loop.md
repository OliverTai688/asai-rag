Read root `AGENTS.md` first. This repo's root `AGENTS.md` is the operational source of truth.
When this prompt conflicts with `AGENTS.md`, `AGENTS.md` wins.

Run one ASAI LV3 immersive advisor-system automation loop.

LV3 target for this automation:

- "新增客戶" should naturally continue into relationship graph building.
- Relationship graph nodes must support concise person context such as role, job, income range,
  current state, influence, relationship tension, and unknowns.
- The graph and client facts should generate a visit preparation package.
- The preparation package should feel like Codex-style multi-step generation: a visible staged
  process, a report, a question list, reasoning basis, confirmed facts, inferences, and unknowns.
- The advisor should be able to inspect how each question was inferred without exposing raw private
  provider payloads, secrets, cookies, or unnecessary private transcripts.
- The preparation package should launch an AI theater stage. The stage should be grounded in the
  client relationship graph and preparation package.
- Theater should support focus roles, group chat, private chat, and safe updates to a person's state
  that can change stage relationships without silently rewriting confirmed CRM facts.
- AI interview should be able to create or enrich client data, relationship graph, preparation
  package, and theater stage through confirmation/writeback cards.
- The interface should remain modern, minimal, low-noise, and easy to operate. Do not build a
  marketing page when a usable professional workflow is needed.

Important terminology:

- "LV3" here means architecture, experience, interface, and onboarding maturity for the immersive
  product workflow. It does not mean public production Level 3 release readiness unless the release
  hardening docs, acceptance gates, and operator approvals explicitly say so.

Cadence rule:

- Read `docs/2_agent-input/generated/agent-loop/loop-state.json` at the start of every loop.
- If `cadenceReview.normalLoopsSinceLastWholeProductReview` is 4 or more, run
  `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md` for this
  turn instead of a normal implementation/proof loop.
- If a critical auth, privacy, AI cost, data leak, compliance, or destructive-operation risk is
  currently broken in source, document why the review was deferred, fix/prove the critical slice,
  and keep the cadence counter unchanged.
- At the end of a normal implementation/proof loop, increment
  `normalLoopsSinceLastWholeProductReview` by 1.
- At the end of a whole-product review loop, reset it to 0 and record the review report path.

Required reading before source changes:

- `AGENTS.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
- Latest 5 reports under `docs/2_agent-input/generated/agent-loop/reports/`
- `docs/05_execution-plans/PLN-010_family-tree-multigenerational-expansion-plan-v1.0.md`
- `docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
- `docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md`
- `docs/05_execution-plans/PLN-020_theater-direct-field-guide-batch-tasks-v1.0.md`
- `docs/05_execution-plans/PLN-021_role-aware-sidebar-navigation-batch-tasks-v1.0.md`
- `docs/08_acceptance-and-qa/ACC-003_modern-ui-page-acceptance-framework-v1.0.md`
- `docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`
- `docs/08_acceptance-and-qa/ACC-010_realtime-voice-park-memory-interview-acceptance-framework-v1.0.md`
- `docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md`
- `docs/08_acceptance-and-qa/ACC-012_theater-direct-field-guide-acceptance-framework-v1.0.md`
- `package.json`
- `git status --short --branch`

Before editing Next.js code, read the relevant guide under `node_modules/next/dist/docs/`.

Use this scoring policy to choose exactly one reviewable slice.

Reward candidate slices:

- +7 connects two or more surfaces in the target workflow, such as client -> relationship graph,
  graph -> preparation package, preparation package -> theater, or interview -> confirmed writeback.
- +6 replaces local/mock/runtime-only product data with DB-backed, BFF-owned, session-scoped,
  organization-scoped behavior.
- +6 reduces privacy/compliance risk while preserving the immersive experience.
- +5 creates or improves the visible multi-step reasoning trace for preparation questions,
  including evidence labels, inference labels, unknown gaps, and advisor confirmation controls.
- +5 moves theater toward a real stage environment grounded in relationship graph data, including
  focus roles, private/group conversation boundaries, state changes, and rollback/compatibility notes.
- +4 makes the workflow dramatically easier to operate with fewer choices, no raw-ID workflow,
  better mobile layout, clearer empty/loading/error states, and accessible controls.
- +4 adds API/browser/DB proof for an already implemented LV3-critical path.
- +3 updates batch tasks, issue-question, acceptance docs, or reports so the next automation loop
  can safely continue.

Penalize candidate slices:

- -7 deletes or weakens compliance fields, breaks the SPIN state machine, or changes protected
  Theater enum/scoring contracts outside the approved ITA Route B scope.
- -7 calls OpenAI/Anthropic without AiUsageLog or an explicit no-provider/guarded-disabled proof.
- -6 mixes unrelated workstreams into a broad refactor.
- -6 requires production DB mutation, real email/notification, real payment/refund, secret-bearing
  proof, or destructive remote changes.
- -5 depends on missing operator approval/session/env when another safe source slice is available.
- -5 only polishes UI copy or screenshots without connecting the LV3 workflow, BFF boundary, or proof.
- -5 uses mock success as proof of a real AI, DB, auth, theater, or client workflow.

Task:

1. Check cadence. If this is the fifth loop, run the whole-product review prompt.
2. Score the top 3 available implementation/proof slices using the reward/penalty policy.
3. Pick the highest-scoring slice that can be completed safely in one increment.
4. Implement or prove only that slice.
5. Preserve repo architecture: domain logic in `src/domains`, BFF/API in `src/app/api`, UI through
   client-safe DTOs, Prisma through repository/server helpers, Zustand only for UI state/cache.
6. Do not trust client-provided `organizationId`, `ownerId`, `userId`, `unitId`, plan, amount, AI
   module entitlement, or theater/client ownership.
7. If schema changes are needed, run `pnpm prisma:validate`, `pnpm prisma:generate`, and only run
   db push when the DB target and `AGENTS.md` approval boundary allow it.
8. Always run `pnpm exec tsc --noEmit --pretty false`.
9. Always run `pnpm lint:changed`.
10. Run targeted QA for the selected slice, such as `pnpm interview:cross-mode-qa`,
    `pnpm demo:three-ai-turn-usage-qa`, `pnpm demo:ai-generation-qa`, `pnpm ai:usage-audit`,
    API proof, DB proof, and/or browser proof.
11. Update `docs/2_agent-input/generated/agent-loop/loop-state.json`.
12. Write a concise report under `docs/2_agent-input/generated/agent-loop/reports/`.
13. Update `docs/2_agent-input/generated/agent-loop/issue-question.md` only for real decisions,
    approvals, sessions, seed data, env, or external-service blockers.
14. Stage only this loop's related files and commit locally with a clear message. Do not push while
    the 2026-06-20 user instruction "先不用 git push" is active. In the report and final response,
    write `push skipped by user instruction` instead of a push target. Resume pushing only after the
    user explicitly restores push.

Stop immediately and report if:

- A product/security/compliance decision is needed.
- Proof requires operator-owned env/session/write approval not currently available.
- Validation fails and the failure cannot be safely fixed within the chosen slice.
- The next fix would require a broad refactor outside the selected slice.
- The user asks for `STOP_AND_REPORT`, `暫停回報`, `停下來給報告`, or equivalent.

Final response must include:

- Whether this was a normal LV3 implementation/proof loop or a whole-product review loop.
- Selected slice and top-3 score rationale.
- Files changed and evidence/report paths.
- Commands run and exact pass/fail result.
- DB/Prisma operations and target, if any.
- Git status summary, commit hash, and push target; while push is paused, write `push skipped by user
  instruction`. If commit fails, include the exact commit blocker.
- Remaining blocker type: source, operator/environment, product decision, or production approval.
- Recommended next prompt for the following automation loop.
