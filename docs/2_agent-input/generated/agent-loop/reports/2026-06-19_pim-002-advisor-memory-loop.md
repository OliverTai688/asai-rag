# 2026-06-19 PIM-002 Advisor Memory Loop Report

## 本輪戰役

- Workstream: Realtime Voice x Park-style Interview Memory
- Batch / task: PIM-002 - 顧問陪談 Park memory loop
- 選擇原因: PIM-001 已完成 domain contract；PIM-002 是讓 `/interview` 實際不重問、能帶 memory evidence 的最低未完成依賴，且可先以文字模式完成，不需 DB / voice provider。

## 方法論來源

- Park et al. Generative Agents 使用 memory stream，並依 relevance、recency、importance 做 retrieval；本輪沿用該方法，加入 outline match 與 fact/inference/unknown 分區。
- OpenAI Structured Outputs 文件強調用 schema 穩定結構化輸出；本輪保留現有 JSON output parser，並 deterministic 附上 `memoryEvidence`，避免讓模型自行杜撰 evidence IDs。
- 來源: https://arxiv.org/abs/2304.03442、https://dl.acm.org/doi/10.1145/3586183.3606763、https://developers.openai.com/api/docs/guides/structured-outputs

## 實際完成內容

- 新增 `src/domains/interview/park-loop.ts`，從 request messages / knownMaterials 建立 session-local memory stream。
- `/api/ai/interview` 於 OpenAI call 前做 scoped retrieval，prompt 明確分 confirmed facts / inferences / unknowns，並產生 `InterviewMicroPlan`。
- `/api/ai/interview` 透過 `X-Interview-Micro-Plan` header 回傳 plan evidence；UI 顯示下一題、為什麼問與 supporting memory IDs。
- `/api/ai/interview/outputs` 消費相同 memory context，並在 response deterministic 附上 `memoryEvidence`，避免 output draft 只依 messages/materials。
- `persistInterviewTurnSuccess` / `persistInterviewOutputSuccess` metadata 加入 memory evidence / micro plan；既有 success/failure path 仍寫 `AiUsageLog`。
- 新增 `pnpm interview:park-loop-dry-run` 防回歸。

## 修改檔案

- `AGENTS.md`
- `package.json`
- `scripts/interview-park-loop-dry-run.mjs`
- `scripts/interview-park-loop-dry-run.ts`
- `src/app/(dashboard)/interview/page.tsx`
- `src/app/api/ai/interview/route.ts`
- `src/app/api/ai/interview/outputs/route.ts`
- `src/domains/interview/index.ts`
- `src/domains/interview/park-loop.ts`
- `src/domains/interview/types.ts`
- `src/lib/interview/interview-ai-repository.ts`
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/screenshots/pim/pim-002-interview-desktop.png`
- `docs/06_audits-and-reports/screenshots/pim/pim-002-interview-mobile.png`
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-19_pim-002-advisor-memory-loop.md`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`

## DB / Prisma

- DB target 判斷: 本輪不改 schema；實際 `/api/ai/interview` browser proof 使用現有 dev session 觸發既有 interaction/AiUsageLog persistence path。
- Schema 變更: 無。
- Prisma generate: `pnpm build` 內有執行 `prisma generate`，成功。
- Prisma db push: 未執行，因未改 schema。
- Seed/backfill: 無。
- Production migration approval: 本輪不需要。

## 驗收指令與結果

- `pnpm interview:park-loop-dry-run`: 通過。
- `pnpm interview:memory-dry-run`: 通過。
- `pnpm exec tsc --noEmit --pretty false`: 通過。
- `pnpm lint:changed`: 通過。
- `pnpm build`: 通過。
- Browser proof `/interview` desktop 1280x720: console error 0、無水平 overflow、可見 `AI 顧問陪談` 與 `下一題計畫`。
- Browser proof `/interview` mobile 390x844: console error 0、無水平 overflow、可見 `AI 顧問陪談` 與 `下一題計畫`。
- Browser interaction proof: 點擊開始陪談，送出合成回答「確定王大明是主要經濟支柱...不確定醫療險是否快到期」後，頁面顯示下一題計畫、why text、supporting memory IDs，且無 console error。

## 失敗與修正

- 互動 proof 初次定位「送出」按鈕時遇到頁面上有兩個同名按鈕（主訪談與 AI 助手）；修正 proof strategy，改 scope 到 `main form` 後成功。

## 剩餘上線 blocker

- PIM-003 尚未把劇場場域建構訪綱接上相同 memory loop 與 Theater build packet。
- PIM-006 尚未把 memory/turn/reflection persistence DB 化；目前 PIM-002 是 request-local/stateless memory loop。
- Voice shell / Realtime BFF / event mirror 仍未落地。

## 下一輪建議入口

- PIM-003: 劇場場域建構 Park memory loop。沿用 `park-loop.ts` pattern，為 `THEATER_FIELD_BUILD` 建立 build packet contract，嚴格分 confirmed / inference / unknown，避免 Theater Route B fact leakage。
