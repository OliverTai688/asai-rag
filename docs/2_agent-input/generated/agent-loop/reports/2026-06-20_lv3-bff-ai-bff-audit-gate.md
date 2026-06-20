# 2026-06-20 LV3 BFF AI BFF Audit Gate

## Scope

- 本輪類型：ASAI LV3 normal implementation/proof loop。
- Selected slice：BFF-201 AI BFF audit gate。
- 目標：把 `/api/ai/*` 與 `/api/rag` 從 provider-only audit 擴充為 full AI namespace BFF audit gate，先確認 route coverage、session/quota/input/usage/no-provider posture，再進 BFF-202/203/204/205。
- Push policy：依使用者 2026-06-20 指示，本輪只建立本地 commit，`push skipped by user instruction`。

## Candidate Score

1. BFF-201 AI BFF audit gate：20/25。降低 AI cost/privacy/compliance risk，建立所有 AI namespace route 的 proof gate，且不呼叫 provider、不碰 SPIN/Theater protected logic。
2. BFF-203 SPIN AI hardening：18/25。能處理 SPIN mock/source blocker，但應先有 fresh audit baseline，且 SPIN 狀態機受保護、風險較高。
3. BFF-202 Visit/report AI hardening：17/25。貼近拜訪準備包與報告生成，但需先確認 visit/report provider route 與其他 AI routes 的完整 audit coverage。

## Changes

- `scripts/ai-usage-route-audit.mjs` 改成自動 discovery + manifest gate。
- 新增 `pnpm ai:bff-audit` alias，與 `pnpm ai:usage-audit` 執行同一 gate。
- `AUD-005_ai-usage-route-audit-v1.0.md` 更新為 v1.1，列出 22 條 `/api/ai/*` + `/api/rag` route 的 coverage matrix。
- 同步 `AGENTS.md`、`PLN-019`、`loop-state.json`、`issue-question.md`。
- 新增本 report。

## Validation

- PASS `pnpm ai:bff-audit`：overall `pass`、22/22 route covered、13 provider-ready、9 no-provider/guarded/deterministic、routesWithGaps `[]`。
- PASS `pnpm ai:usage-audit`：同一 audit gate，overall `pass`，DB aggregate status `pass`。
- PASS `pnpm exec tsc --noEmit --pretty false`。
- PASS `pnpm lint:changed`。
- PASS `git diff --check` after removing AUD trailing whitespace.

## Evidence

- Route discovery proof：`/api/ai/chat`、interview family routes、report、spin、theater、visit、`/api/rag` all listed in manifest and discovered from filesystem.
- Provider proof：13 OpenAI-facing routes have `requireCurrentMember()`、`canUseAiModule()`、input limit evidence and success/error `AiUsageLog` evidence.
- No-provider proof：8 deterministic interview session/reflection/plan/writeback routes have session/input boundaries and no OpenAI/Anthropic provider call detected.
- Guarded-disabled proof：`/api/rag` remains `RAG_DISABLED_FOR_PRIVATE_BETA` / `disabled_guarded` / `providerAttempted=false`; no fake usage while disabled.
- DB aggregate evidence from `ai_usage_logs` current month: `CHAT`、`INTERVIEW`、`THEATER`、`VISIT` OpenAI rows counted without raw provider payload or private transcript.

## DB / Prisma

- Prisma schema/generate/db push：未執行，無 schema change。
- DB 操作：read-only aggregate query against `ai_usage_logs`; no insert/update/delete.
- Provider：未呼叫 OpenAI/Anthropic；本輪 proof 是 source audit + DB aggregate read。

## Git

- Local commit required after final validation.
- Push：`push skipped by user instruction`。

## Blockers

- Source blockers：SPIN UI/source still has mock outline/local seed concerns; CRM BFF completion remains partial; admin/pilot seed and notification mock success remain production-adjacent blockers.
- Operator/environment blockers：Route B provider/live Realtime provider proof requires explicit provider/cost approval; production build font blocker remains separate.
- Product decision blockers：interview-to-previsit/theater draft confirmation boundary、role-aware legacy SPIN exposure、beta scope/legal packet。

## Next Recommended Loop

Run the scheduled fifth-loop whole-product gap review because `normalLoopsSinceLastWholeProductReview` is now 4:

`docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`
