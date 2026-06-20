# 2026-06-20 LV3 Loop — BFF-203a SPIN Source-truth Hardening

## Scope

- 類型：normal LV3 implementation/proof loop（whole-product review 後第 2 輪）。
- Selected slice：`BFF-203a SPIN source-truth hardening`。
- 目標：保護 SPIN 狀態機，並把正式 `/spin` session / outline proof 從 mock/local seed 收斂到 member-scoped BFF + DB truth。

## Candidate Score

1. `BFF-203a SPIN source-truth hardening` — 22/25：直接移除 `/spin/[sessionId]` mock outline proof gap，連接 AI 了解客戶 -> 訪談大綱，且能用 API/browser/DB proof 驗收。
2. `ITA-003f Route B provider orchestration` — 20/25：沉浸感高，但需要 provider enable/usage proof approval；未獲明確 provider approval 時不作本輪首選。
3. `RAS-001 role-aware navigation contract / legacy SPIN visibility` — 17/25：能修正 `/interview` vs legacy `/spin` IA，但 source-truth proof 力道低於 BFF-203a。

## Changes

- 新增 deterministic SPIN outline helper：`src/domains/spin/outline.ts`。
- 新增 persisted SPIN BFF repository：`src/lib/spin/spin-session-repository.ts`。
- 新增 BFF routes：
  - `GET/POST /api/spin/sessions`
  - `GET/PATCH /api/spin/sessions/[sessionId]`
  - `POST /api/spin/sessions/[sessionId]/messages`
  - `POST /api/spin/sessions/[sessionId]/outline`
- `/spin` 正式 list/create 改用 `/api/clients` + `/api/spin/sessions`；Quickstart demo seed 保留但不作正式 proof。
- `/spin/[sessionId]` 改讀 BFF snapshot，訊息 / phase / mode / summary 同步回 BFF；`生成訪談大綱` 改走正式 outline BFF，不再呼叫 `/api/mock/ai/spin-outline`。
- `PATCH` server-side 限制 phase 只能同階、往下一階或完成，保護 `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF`。
- 新增 `pnpm spin:source-truth-qa`。
- 更新 `AGENTS.md`、`PLN-019`、`loop-state.json`、`issue-question.md`。

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `DEMO_QA_BASE_URL=http://127.0.0.1:3033 pnpm spin:source-truth-qa`
- PASS Browser proof：dev member one-click login -> completed SPIN BFF session -> 生成訪談大綱，sheet 含 QA stamp、console error 0、無水平 overflow。
- PASS `pnpm ai:bff-audit`

## Evidence

- API/DB proof session：`spin_573bf3889a4b4c54baf4e0e77475ae9f`
- Screenshot：`docs/06_audits-and-reports/screenshots/lv3-spin-source-truth/2026-06-20-spin-source-truth-outline.png`
- Source proof：`scripts/spin-source-truth-qa.mjs` 檢查 `/spin/[sessionId]` 不含 `/api/mock/ai/spin-outline`，且含 `/api/spin/sessions/${sessionId}/outline`。

## DB / Prisma

- Prisma schema：未改。
- `prisma db push`：未執行。
- DB 操作：QA 對 development/demo target 做非破壞性新增/更新，建立可辨識 demo/test `spin_sessions` 與 `spin_messages` proof；未刪除、未 reset、未做 production write。

## Provider / AiUsageLog

- 本 slice 的 new BFF / outline route 不呼叫 OpenAI/Anthropic provider。
- Outline response 與 QA 皆標示 no-provider proof；不需要新增 `AiUsageLog`。
- `pnpm ai:bff-audit` pass，既有 provider-ready routes 仍有 success/error `AiUsageLog` evidence。

## Git

- Push policy：`push skipped by user instruction`。
- Commit：待本輪 stage/commit 後填入 final。

## Blockers

- 無本 slice blocker。
- 剩餘 source-truth blocker：CRM related-list/archive/update、admin/pilot demo seed、notification reminder mock route。
- Provider blocker：Route B director/character/feedback live provider proof 仍需明確 provider enable approval 與 success/error `AiUsageLog` evidence。

## Next Recommended Loop

建議下一輪：`BFF-103c CRM related-list/archive/update source-truth`。目標是補齊 CRM detail/subpage 的 server-owned update/archive/related-list proof，保留 compliance fields；fallback：`RAS-001 role-aware navigation contract / legacy SPIN visibility`。
