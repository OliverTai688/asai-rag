Read root `AGENTS.md` first. This repo's root `AGENTS.md` is the operational source of truth.
When this prompt conflicts with `AGENTS.md`, `AGENTS.md` wins.

Run a whole-product ASAI LV3 gap review. This prompt is used every fifth automation loop so the
automation does not over-optimize small local slices while missing the end-to-end immersive advisor
workflow.

Review target:

新增客戶 -> 建立關係圖 -> 生成拜訪準備包 -> 檢視問題清單與推論依據 -> 從準備包建立劇場舞台
-> 在劇場中私聊/群聊/調整人物狀態 -> 透過 AI 訪談建立或補強客戶資料、準備包、劇場。

Read first:

- `AGENTS.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
- Latest reports under `docs/2_agent-input/generated/agent-loop/reports/`
- Current execution plans under `docs/05_execution-plans/`
- Current acceptance docs under `docs/08_acceptance-and-qa/`
- Current audits/reports under `docs/06_audits-and-reports/`
- Current research/design docs under `docs/07_research-and-design/`
- `package.json`
- `git status --short --branch`

If the review depends on modern provider/framework/security/AI/browser behavior, use current primary
sources:

- For Next.js or React behavior, read the relevant files under `node_modules/next/dist/docs/` first.
- For OpenAI API behavior, use official OpenAI documentation.
- For browser/security/privacy/payment/email/provider behavior, prefer official docs or standards.
- Record source links, retrieved date, repo impact, and confidence in the review report when web
  research is used.

Evaluation scope:

- Client creation: clean entry, server-owned data, compliance fields, no raw-ID workflow, mobile.
- Relationship graph: person metadata, relationship types, unknown/inference labels, edit safety,
  family/beneficiary/business-role distinctions, graph usability.
- Visit preparation package: multi-step generation, evidence labels, question rationale, unknowns,
  policy/client/relationship/memory inputs, advisor confirmation, report export/share boundary.
- AI interview: text/voice fallback, memory persistence, reflection/planning, confirmation/writeback,
  ability to create/enrich client, graph, preparation package, and theater stage.
- Theater: stage creation from graph/package, focus roles, NPC limits, private/group chat, person
  state updates, relationship changes, scoring/feedback migration constraints, rollback notes.
- Navigation/onboarding: AI-first sidebar, role-aware surfaces, low-noise UI, empty/loading/error
  states, no training-document dependency for first successful flow.
- BFF/security/privacy: session ownership, organization/unit scope, client portal boundaries,
  `AiUsageLog`, audit reasons, no private field leakage, no raw provider/cookie/secret evidence.
- NANDA / AgentFacts protocol readiness: every AI module has an internal AgentFacts-style manifest,
  declared capabilities, input/output schema, endpoint/action contract, auth/session scope, data class
  boundary, quota/cost policy, `AiUsageLog` policy, and registry readiness state.
- QA/evidence: API, DB, browser, mobile, no horizontal overflow, console error checks, deterministic
  acceptance scripts, report hygiene.

Gap classification:

- `ready`: implemented and proof exists.
- `source gap`: code/data contract missing or unsafe.
- `proof gap`: source likely exists but no trustworthy API/browser/DB proof.
- `operator/environment gap`: needs env, session, external provider, production approval, or seed.
- `product decision`: needs user/operator decision on UX, scope, compliance, or rollout boundary.

Anti-duplicate review gate:

- Read the latest 3-5 loop reports before ranking gaps.
- For each top gap, state whether it is new, changed, still blocked, or resolved since the prior review.
- Do not write another same-shape review for a known blocker unless the report adds one of these:
  a sharper root cause, a safer fallback, a narrower acceptance proof, a new owner doc, or a concrete
  operator action.
- If the same blocker appears in two consecutive reviews, promote it to an L4 blocker analysis with:
  root cause, affected acceptance items, already-tried proof, safe no-blocker fallback, and the smallest
  external action needed.
- If the review would only restate existing docs, stop and recommend the next L2 implementation/proof
  slice or L4 blocker analysis instead.

Six-frame review lens:

Use these six frames on every whole-product gap review and on any quiet continuation loop where
there is no immediate user-notification value but development can safely continue:

1. Advisor workflow and onboarding frame: first successful flow, clean-state usability, mobile,
   no raw-ID workflow, obvious next action, and professional low-noise interface.
2. Source-of-truth and BFF frame: server-owned contracts, session/org/unit scope, DB persistence,
   local/mock/runtime-only truth, DTO boundaries, and writeback ownership.
3. AI reasoning and evidence frame: multi-step generation, facts/inferences/unknowns, question
   rationale, provider-safe inputs, `AiUsageLog`, quota/cost posture, and no raw provider payload.
4. Theater/relationship immersion frame: relationship graph, preparation package, interview memory,
   stage map, focus roles, private/group chat, person state updates, and rollback/safety boundaries.
5. QA, compliance, and release-proof frame: API/browser/DB/mobile proof, console/overflow checks,
   compliance fields, authz boundaries, production approval, build blockers, and evidence hygiene.
6. NANDA / AgentFacts protocol frame: agent-like AI modules must be discoverable internally,
   capability-described, least-disclosure, versioned, adapter-ready, and explicitly marked as
   `internal-only`, `registry-draft`, `external-ready`, or `external-registered`.

For each top gap, record which frame found it, which owner doc should carry it, what evidence already
exists, what evidence is missing, and the smallest next implementation/proof slice.

Score each gap:

- Severity 3: compliance/privacy/data leak/destructive operation/AI cost/authz/core workflow break.
- Severity 2: broken immersive workflow, confusing professional UI, missing server contract, or
  proof cannot be trusted.
- Severity 1: local UI polish, copy, screenshots, or non-blocking workflow weakness.
- Leverage 3: unlocks multiple target-flow steps or removes repeated automation blockers.
- Leverage 2: improves one LV3-critical flow.
- Leverage 1: useful but localized.

Task:

1. Inventory the target flow and classify each step.
2. Run the anti-duplicate review gate above and record what changed since the last review.
3. Review the target flow through all six frames above, then pick the top 10 gaps by severity,
   leverage, and dependency order.
4. Convert the top gaps into next implementation/proof slices. Prefer updating existing PLN/ACC docs
   and `AGENTS.md` workstream state over creating new docs unless no owner exists.
   The recommended next slice should be source-backed whenever safe: product/API/domain/UI code,
   repository/BFF contracts, executable QA scripts, or tests that prove runtime behavior. Do not convert
   a known gap into only docs, checklist sync, report writing, or proof-plan work when a safe L2
   implementation or executable L1 proof can move the product forward.
5. Convert newly discovered gaps into the relevant owner docs:
   - `RES-` for research/design/system understanding gaps.
   - `PLN-` for executable batch-task gaps.
   - `ACC-` for acceptance/proof gaps.
   - `AUD-` or report docs for source audits and evidence inventory.
   - `issue-question.md` only for real operator decisions, approvals, sessions, env, production
     approval, or external-service blockers.
6. Update `docs/2_agent-input/generated/agent-loop/loop-state.json`:
   - `cadenceReview.normalLoopsSinceLastWholeProductReview = 0`
   - `cadenceReview.lastWholeProductReviewAt`
   - `cadenceReview.lastWholeProductReviewReport`
   - `cadenceReview.nextRecommendedImplementationSlice`
7. Write a concise review report under `docs/2_agent-input/generated/agent-loop/reports/` named
   like `YYYY-MM-DD_lv3-whole-product-gap-review.md`.
8. Run `git diff --check`. If docs/source changed, still run `pnpm exec tsc --noEmit --pretty false`
   and `pnpm lint:changed` unless a clear environment blocker prevents them.
9. Stage only this review's related files and commit locally. Do not push while the 2026-06-20 user
   instruction "先不用 git push" is active. In the report and final response, write `push skipped by
   user instruction`. Resume pushing only after the user explicitly restores push.

Constraints:

- Do not make broad source changes during the review loop. This loop is for evaluation, research,
  prioritization, batch-task updates, and proof planning.
- Because this prompt is a scheduled review, docs-only output is allowed here. However, it must point
  the next normal loop at a source-backed implementation/proof slice unless every safe source path is
  blocked and the report explicitly records the blocker root cause and smallest unblock action.
- For evidence planning, distinguish mandatory proof from residual evidence the user can verify by
  running one command or checking one local surface. Do not let residual screenshot/checklist collection
  block the review; record the exact self-runnable command/URL/checklist instead. This cannot replace
  proof for authz/privacy boundaries, provider `AiUsageLog`, DB safety, production approvals, or changed
  source behavior.
- Do not run production mutations, real email/notification, real payment/refund, Prisma reset/drop,
  destructive DB changes, or secret-bearing proof.
- Do not duplicate known reports. If a gap is already known, refine the source slice, owner doc,
  blocker type, or next acceptance proof.
- Keep output actionable: every top gap must name owner surface, blocker type, evidence, and next
  implementable slice.

Final response must include:

- Whether this was a scheduled fifth-loop review, manually triggered review, or quiet continuation
  six-frame gap-research documentation loop.
- What changed since the last review and why this report is not duplicate work.
- The six frames used and the main gap surfaced by each.
- NANDA / AgentFacts protocol readiness summary for ASAI AI modules if any AI workstream is active.
- Top 5 gaps with severity/leverage.
- Docs created/updated.
- Validation commands and pass/fail.
- Residual evidence delegated to the user, if any, with exact command/URL/checklist.
- Updated next implementation slice.
- Git status summary, commit hash, and push target; while push is paused, write `push skipped by user
  instruction`. If commit fails, include the exact commit blocker.
