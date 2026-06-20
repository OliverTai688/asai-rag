# 2026-06-20 ASAI LV3 Loop - PIM-010 Interview Draft Writeback

## Scope

- Loop type: normal LV3 implementation / proof loop.
- Selected slice: `PIM-010 Interview -> VisitPlan / Theater draft writeback`.
- Goal: connect AI interview confirmation cards to persisted previsit package drafts and DB-backed Route B theater drafts without provider calls, raw transcript storage, or inference-to-CRM-fact leakage.

## Candidate Score

1. `PIM-010 Interview -> VisitPlan / Theater draft writeback` - 23/25. Connects AI interview, previsit, and Route B theater; reuses existing confirmation boundary; no schema/provider needed; directly closes the LV3 interview-to-workspace creation gap.
2. `BFF-203a SPIN source-truth hardening` - 21/25. Important source-truth blocker for `/spin/[sessionId]`, but must be handled carefully around the protected SPIN state machine.
3. `ITA-003f Route B provider orchestration` - 20/25. High immersive value, but requires explicit provider approval and success/error `AiUsageLog` proof before any real provider call.

## Changes

- Added draft writeback target type `VISIT_PLAN_DRAFT` / `THEATER_BUILD_DRAFT`.
- Extended interview writeback repository to create:
  - persisted `VisitPlan` draft with objectives, SPIN questions, objections, materials, facts / inferences / unknowns, and reasoning evidence.
  - DB-backed Route B theater session draft using Theater build packet / handoff boundary; unknowns become narrator questions and NPC count remains <= 4.
- Added high-sensitive draft gate: client/material with high sensitivity requires `draftApproval.reason` and `riskAccepted: true`.
- Updated `/interview` confirmation card panel with `建立準備包草稿` and `建立劇場草稿` actions plus navigation to the created draft.
- Added `pnpm interview:draft-writeback-qa` API / DB / browser proof.
- Fixed previsit detail render keys so repeated evidence references from draft-generated packages do not create React duplicate-key warnings.
- Updated `AGENTS.md`, `PLN-018`, loop state, and issue-question.

## Validation

- `DEMO_QA_BASE_URL=http://localhost:3031 pnpm interview:draft-writeback-qa` - PASS.
  - unauth writeback 401.
  - member creates client-bound interview session 201.
  - manager cannot write member-owned interview draft 404.
  - high-sensitive draft request without approval returns blocked result.
  - approved writeback creates one `VisitPlan` draft and one Route B theater session.
  - DB proof: `visitQuestionCount=4`, `theaterCharacterCount=1`, confirmed CRM fact writes `0`.
  - no raw private sentinel in draft writeback response.
  - no-provider proof: `AiUsageLog` count unchanged (`before=146`, `after=146` in final run).
  - browser proof: `/interview` -> confirmation card -> `建立準備包草稿` -> `/pre-visit/[id]`, no horizontal overflow, console clean.
- `DEMO_QA_BASE_URL=http://localhost:3031 pnpm interview:writeback-qa` - PASS.
- `pnpm exec tsc --noEmit --pretty false` - PASS.
- `pnpm lint:changed` - PASS.
- `git diff --check` - PASS.

## Evidence

- Browser screenshot: `docs/06_audits-and-reports/screenshots/pim/pim-010-draft-writeback/pim-010-visit-draft-desktop.png`.
- API / DB / no-provider evidence is in `pnpm interview:draft-writeback-qa` output.
- Regression evidence is in `pnpm interview:writeback-qa` output.

## DB / Prisma

- No Prisma schema change.
- No Prisma generate / db push.
- Development/demo proof created identifiable QA client, interview session, `VisitPlan`, Route B theater session, and interaction-event evidence through approved local/dev paths.
- No OpenAI/Anthropic provider calls in this slice; `AiUsageLog` unchanged proof included.

## Git

- Start status: branch `codex/asai-lv3-automation`, ahead of origin, with pre-existing unrelated changes in AI meeting / notes / sidebar docs and code.
- Commit: local commit will be created after validation; push skipped by user instruction.

## Blockers

- Remaining product blocker: `/spin/[sessionId]` still has mock outline / local seed source-truth gaps; next safe slice should harden BFF-203a while preserving the SPIN state machine.
- Provider blocker: Route B director/character/feedback and live Realtime provider proof still need explicit provider approval and success/error `AiUsageLog` evidence.
- Production blocker: build still has known Next/Turbopack Google Font path issue tracked in issue-question.

## Next Recommended Loop

Run `BFF-203a SPIN source-truth hardening`: audit and remove the remaining `/spin/[sessionId]` mock outline/local seed proof gap, protect the SPIN SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF state machine, and provide targeted API/browser proof.
