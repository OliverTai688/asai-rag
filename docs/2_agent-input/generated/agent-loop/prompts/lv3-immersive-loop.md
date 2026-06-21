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

Strategic review and anti-repetition gate:

- Before choosing a slice, read the latest 3-5 loop reports and classify the last two completed loops
  as implementation, proof, research translation, documentation/checklist, or blocker review.
- If the last two loops were mostly documentation/checklist/proof-plan/evidence-report work, this loop
  must not choose another same-type quiet documentation slice. Choose an L2 implementation/proof slice,
  an L3 research-to-implementation translation, or an L4 blocker analysis/unblock plan instead.
- Normal loops must not be docs-only when a safe source-backed implementation slice or executable proof
  slice exists. "Source-backed" means the loop changes product/API/domain/UI code, repository/BFF
  contracts, executable QA scripts, or tests that validate runtime behavior. Updating docs, reports,
  checklists, or proof plans may accompany the slice, but cannot be the whole slice merely because it is
  easy or low-risk.
- A documentation-only loop is allowed only for a scheduled whole-product review, an explicit user
  request for documentation, an L4 repeated-blocker analysis, or a true no-safe-source condition. In
  that case it must directly unblock a named acceptance item and leave a runnable proof command or exact
  next implementation prompt.
- A proof-only loop is acceptable only when it runs or creates executable proof against real source/API/DB/
  browser behavior. Static source audits and reports are supporting evidence, not a substitute for
  runnable proof when runtime proof is safe.
- Self-runnable residual evidence handoff: after the selected slice has its mandatory validation and
  targeted proof, do not keep looping only to collect extra evidence that the user can verify by running
  one clearly named command or checking one clearly named local surface. Record the command/surface and
  tell the user to review it themselves. This handoff cannot replace proof for changed source behavior,
  authz/privacy boundaries, provider success/error `AiUsageLog`, DB safety, production approvals, or any
  claim that would otherwise be unverifiable.
- Every selected slice must map to at least one product capability, research hypothesis, acceptance item,
  roadmap item, or issue-question entry. If no such mapping exists, downgrade it to L0 hygiene and skip it
  unless no higher-value safe work exists.
- When the same DB/auth/env/provider blocker appears twice, stop repeating proof plans and produce a
  blocker analysis with root cause, affected acceptance items, already-tried proof, safe fallback, and the
  smallest operator action needed.

Task levels:

- L0 hygiene: typo, formatting, stale checklist sync. Use only when no higher-value safe task exists.
- L1 proof: static proof, contract test, source audit, build/tsc/lint evidence, or recovery proof plan.
- L2 implementation slice: small API/BFF/UI/domain change that creates or improves product behavior.
- L3 research translation: convert research into data model, UI flow, API contract, prototype, test, or
  acceptance criteria.
- L4 architecture/blocker review: repeated blocker or cross-workstream decision analysis with unblock plan.

NANDA / AgentFacts protocol alignment:

- Treat every ASAI AI module as an agent-like capability that should become internally describable,
  verifiable, and eventually registerable using a NANDA / AgentFacts-style manifest.
- If the selected slice touches any AI route, provider wrapper, assistant action, interview workflow,
  theater runtime, SPIN AI, visit/report AI, RAG, or AI registry/readiness surface, include a `NANDA
  alignment` section in the report.
- The `NANDA alignment` section must state:
  - agent/module id and owner surface;
  - capabilities and endpoints/actions touched;
  - input/output schema or DTO boundary;
  - auth/session scope and data classes;
  - quota/cost and `AiUsageLog` policy;
  - current registry readiness: `internal-only`, `registry-draft`, `external-ready`, or
    `external-registered`;
  - what still blocks external NANDA/third-party registry publication.
- Do not perform external registry publication, signing, public discovery endpoint exposure, or
  cross-organization agent access without explicit operator approval. Until then, only implement internal
  manifests, static schema proof, adapter contracts, and local QA.

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

Quiet continuation rule:

- Heartbeat turns should not end as `DONT_NOTIFY` merely because there is no new human decision,
  no urgent blocker, or no user-facing notification value.
- If there is no immediate notification value but development can safely continue, first choose the
  highest-scoring safe L2 implementation slice or executable L1 proof slice. Do not downgrade to
  docs-only quiet research while source-backed work can still move the product forward.
- Run a quiet gap-research documentation loop only when no safe source-backed or executable proof slice
  is available, when the cadence rule requires whole-product review, or when the same blocker needs an
  L4 root-cause/unblock analysis.
- Do not run quiet gap-research documentation loops twice in a row unless the second loop converts the
  prior finding into a concrete L2/L3 implementation/proof slice or an L4 blocker analysis.
- A quiet gap-research documentation loop is not a broad implementation loop. It studies the next
  LV3 gap through the six frames below, then turns the finding into the smallest useful doc update
  or new owner doc:
  1. Advisor workflow and onboarding frame: does the next advisor action feel obvious, minimal,
     and professional from a clean state?
  2. Source-of-truth and BFF frame: is the workflow grounded in server-owned, session-scoped,
     organization-scoped data rather than local/mock/runtime-only state?
  3. AI reasoning and evidence frame: are facts, inferences, unknowns, question rationale,
     provider boundaries, and `AiUsageLog` posture explicit?
  4. Theater/relationship immersion frame: does the client graph, preparation package, interview
     memory, and theater stage form one operable environment with safe state-change boundaries?
  5. QA, compliance, and release-proof frame: is there trustworthy API/browser/DB/mobile evidence,
     no raw private payload leakage, and no blocked production approval disguised as completion?
  6. NANDA / AgentFacts protocol frame: is the touched AI module internally describable, capability
     declared, adapter-ready, least-disclosure, versioned, and assigned a registry readiness state?
- Prefer updating an existing `RES-`, `PLN-`, `ACC-`, `AUD-`, `AGENTS.md`, `issue-question.md`, or
  loop report owner over creating a new doc. Create a new doc only when no owner exists.
- Convert each gap into an implementable next slice with owner file, blocker type, acceptance proof,
  and a suggested prompt for the next automation loop.
- Quiet gap-research loops still obey the normal loop closure rules: update `loop-state.json`, write
  a concise report, run required validation, stage only related files, commit locally, and do not push
  while the 2026-06-20 "先不用 git push" instruction is active.

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

- +8 changes source code, BFF/API/domain/UI behavior, executable QA scripts, or tests in a way that
  proves real runtime behavior instead of only writing docs.
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
- -8 chooses a docs-only, checklist-only, report-only, or proof-plan-only slice while a safe
  source-backed implementation or executable proof slice is available.

Task:

1. Check cadence. If this is the fifth loop, run the whole-product review prompt.
2. Run the strategic review and anti-repetition gate above. Record the last-two-loop classification and
   why the selected slice is not duplicate work.
3. If this is a heartbeat/continuation turn with no new human decision or immediate notification
   value, but safe work remains, still prefer source-backed L2 implementation or executable L1 proof.
   Use the quiet gap-research documentation loop only under the no-safe-source / cadence-review /
   repeated-blocker exceptions above.
4. Score the top 3 available implementation/proof slices using the reward/penalty policy. Include docs
   or reports as supporting artifacts, not as the selected normal-loop deliverable, unless an exception
   explicitly applies.
5. Pick the highest-scoring slice that can be completed safely in one increment.
6. Implement, prove, or document only that slice.
7. Preserve repo architecture: domain logic in `src/domains`, BFF/API in `src/app/api`, UI through
   client-safe DTOs, Prisma through repository/server helpers, Zustand only for UI state/cache.
8. Do not trust client-provided `organizationId`, `ownerId`, `userId`, `unitId`, plan, amount, AI
   module entitlement, or theater/client ownership.
9. If schema changes are needed, run `pnpm prisma:validate`, `pnpm prisma:generate`, and only run
   db push when the DB target and `AGENTS.md` approval boundary allow it.
10. Always run `pnpm exec tsc --noEmit --pretty false`.
11. Always run `pnpm lint:changed`.
12. Run targeted QA for the selected slice, such as `pnpm interview:cross-mode-qa`,
    `pnpm demo:three-ai-turn-usage-qa`, `pnpm demo:ai-generation-qa`, `pnpm ai:usage-audit`,
    API proof, DB proof, and/or browser proof.
    If only residual, self-runnable evidence remains after mandatory proof passes, stop collecting it and
    hand the exact command/URL/checklist to the user instead of blocking the loop.
13. Update `docs/2_agent-input/generated/agent-loop/loop-state.json`.
14. Write a concise report under `docs/2_agent-input/generated/agent-loop/reports/`.
15. Update `docs/2_agent-input/generated/agent-loop/issue-question.md` only for real decisions,
    approvals, sessions, seed data, env, or external-service blockers.
16. Stage only this loop's related files and commit locally with a clear message. Do not push while
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
- If it was a quiet gap-research documentation loop, name that explicitly and list the six frames
  used.
- Last-two-loop classification, task level, and anti-repetition rationale.
- Selected slice and top-3 score rationale.
- `NANDA alignment` if any AI module, route, provider wrapper, or agent-like workflow was touched.
- Files changed and evidence/report paths.
- Commands run and exact pass/fail result.
- Any residual evidence intentionally delegated to the user, with the exact command/URL/checklist to run.
- DB/Prisma operations and target, if any.
- Git status summary, commit hash, and push target; while push is paused, write `push skipped by user
  instruction`. If commit fails, include the exact commit blocker.
- Remaining blocker type: source, operator/environment, product decision, or production approval.
- Recommended next prompt for the following automation loop.
