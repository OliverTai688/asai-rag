# 2026-06-19 PIM-001 Memory Domain Contracts Report

## 本輪戰役

- Workstream: Realtime Voice x Park-style Interview Memory
- Batch / task: PIM-001 - Memory domain contracts + pure services
- 選擇原因: PIM-000 已完成架構登錄；PIM-001 是兩個 AI 訪談導入 Park-style memory loop 前的最低未完成依賴，且不需 DB / external service，可安全推進。

## 方法論來源

- Park et al. Generative Agents 架構採 `memory stream -> reflection -> planning`，本輪只落地 memory stream contract 與 retrieval/correction pure helper，尚未實作 reflection/planning route。
- 來源: https://arxiv.org/abs/2304.03442、https://dl.acm.org/doi/10.1145/3586183.3606763

## 實際完成內容

- 新增 `InterviewKind`、`InterviewModality`、`InterviewMemory`、`InterviewReflection`、`InterviewMicroPlan` 等 domain type。
- 新增 `src/domains/interview/memory.ts`，提供 memory candidate extraction、retrieval scoring、correction/supersede、confirmed fact 判斷與中文提示分類。
- 新增 `pnpm interview:memory-dry-run`，覆蓋顧問陪談 confirmed fact、劇場 inference、voice transcript unknown、correction/supersede、retrieval ranking。
- 同步 `AGENTS.md` 與 `PLN-018`，標記 PIM-001 完成並留下下一輪入口。

## 修改檔案

- `AGENTS.md`
- `package.json`
- `scripts/interview-memory-dry-run.mjs`
- `scripts/interview-memory-dry-run.ts`
- `src/domains/interview/index.ts`
- `src/domains/interview/memory.ts`
- `src/domains/interview/types.ts`
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-19_pim-001-memory-domain-contracts.md`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`

## DB / Prisma

- DB target 判斷: 本輪不需 DB；未讀取或輸出任何 secret。
- Schema 變更: 無。
- Prisma generate: 未執行，因未改 schema。
- Prisma db push: 未執行，因未改 schema。
- Seed/backfill: 無。
- Production migration approval: 本輪不需要。

## 驗收指令與結果

- `pnpm interview:memory-dry-run`: 通過。
- `pnpm exec tsc --noEmit --pretty false`: 通過。
- `pnpm lint:changed`: 通過。

## 失敗與修正

- 第一次 dry-run 發現中文「反對」中的單字「對」會被誤判為 confirmed hint。
- 修正: 將 confirmed hint 從單字「對」收斂為「是的 / 對的 / 確定 / 已確認」等更明確語句，避免 theater objection inference 被誤分類。

## 剩餘上線 blocker

- PIM-002 尚未將 `/api/ai/interview` 接上 memory extraction / retrieval。
- PIM-003 尚未將劇場場域建構訪綱接上 memory loop 與 build packet。
- PIM-006 才會進入 Prisma persistence；屆時需 DB target / schema migration strategy。
- Realtime voice shell、consent、fallback、session guard 尚未落地。

## 下一輪建議入口

- PIM-002: 顧問陪談 Park memory loop。先在文字訪談 route 接入 session-local memory stream、retrieval prompt partition 與 output supporting memory IDs，再做 Browser/API proof。
