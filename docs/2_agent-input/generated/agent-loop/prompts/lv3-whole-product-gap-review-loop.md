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
- QA/evidence: API, DB, browser, mobile, no horizontal overflow, console error checks, deterministic
  acceptance scripts, report hygiene.

Gap classification:

- `ready`: implemented and proof exists.
- `source gap`: code/data contract missing or unsafe.
- `proof gap`: source likely exists but no trustworthy API/browser/DB proof.
- `operator/environment gap`: needs env, session, external provider, production approval, or seed.
- `product decision`: needs user/operator decision on UX, scope, compliance, or rollout boundary.

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
2. Pick the top 10 gaps by severity, leverage, and dependency order.
3. Convert the top gaps into next implementation/proof slices. Prefer updating existing PLN/ACC docs
   and `AGENTS.md` workstream state over creating new docs unless no owner exists.
4. Update `docs/2_agent-input/generated/agent-loop/loop-state.json`:
   - `cadenceReview.normalLoopsSinceLastWholeProductReview = 0`
   - `cadenceReview.lastWholeProductReviewAt`
   - `cadenceReview.lastWholeProductReviewReport`
   - `cadenceReview.nextRecommendedImplementationSlice`
5. Write a concise review report under `docs/2_agent-input/generated/agent-loop/reports/` named
   like `YYYY-MM-DD_lv3-whole-product-gap-review.md`.
6. Run `git diff --check`. If docs/source changed, still run `pnpm exec tsc --noEmit --pretty false`
   and `pnpm lint:changed` unless a clear environment blocker prevents them.
7. Stage only this review's related files, commit, and push the current branch.

Constraints:

- Do not make broad source changes during the review loop. This loop is for evaluation, research,
  prioritization, batch-task updates, and proof planning.
- Do not run production mutations, real email/notification, real payment/refund, Prisma reset/drop,
  destructive DB changes, or secret-bearing proof.
- Do not duplicate known reports. If a gap is already known, refine the source slice, owner doc,
  blocker type, or next acceptance proof.
- Keep output actionable: every top gap must name owner surface, blocker type, evidence, and next
  implementable slice.

Final response must include:

- Whether this was a scheduled fifth-loop review or manually triggered.
- Top 5 gaps with severity/leverage.
- Docs created/updated.
- Validation commands and pass/fail.
- Updated next implementation slice.
- Git status summary, commit hash, and push target, or exact commit/push blocker.
