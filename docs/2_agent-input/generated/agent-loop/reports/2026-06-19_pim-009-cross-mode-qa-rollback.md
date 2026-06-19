# 2026-06-19 PIM-009 Cross-mode QA, Docs Sync, Rollback Notes

## 本輪戰役

- Workstream: Realtime Voice × Park-style Interview Memory
- Batch / task: PIM-009 - Cross-mode QA, docs sync, rollback notes
- 選擇原因: PIM-001 到 PIM-008 已完成 code path，但距離可交接仍缺一個跨模式 proof 與 rollback/production 邊界文件。這是目前 PIM workstream 最近上線阻擋的收尾卡。

## 方法論來源

- Park et al. `Generative Agents`：以 memory stream、reflection、planning 作為 agent 行為連續性的核心架構。
- NIST AI RMF：以可治理、可測試、可監控、可回滾的方式管理 AI 風險，不把單次 demo 成功等同 production readiness。
- OpenAI Realtime official docs：Realtime client secret / ephemeral token 應由 server mint，避免把 provider server API key 下放 browser；本輪僅驗證 BFF guard 與 shell，不宣稱 live provider ready。

Sources:
- https://arxiv.org/abs/2304.03442
- https://www.nist.gov/itl/ai-risk-management-framework
- https://developers.openai.com/api/docs/guides/realtime

## 實際完成內容

- 新增 `pnpm interview:cross-mode-qa`，串接既有 PIM proof：
  - advisor multi-turn memory loop
  - theater field build packet
  - voice transcript / correction memory
  - Realtime session BFF / event mirror guard
  - persistence stateless restore
  - reflection / planning
  - confirmation writeback boundary
  - desktop / mobile browser proof
  - org manager aggregate privacy proof
- 補 source-level checks：
  - `/interview` 包含 mic consent、permission denied / unsupported fallback、live transcript、correction UI。
  - org aggregate routes 不查 `InterviewSession` / `InterviewTurn` / `InterviewMemory` / `InterviewReflection`、不回 transcript/memory private payload。
- 更新 `PLN-018` 與 `AGENTS.md`，將 PIM-009 勾選完成。
- 在 `PLN-018` 補 rollback note：
  - voice provider disabled
  - memory persistence disabled
  - schema rollback / migration revert strategy
  - CRM writeback rollback
  - manager aggregate privacy rollback guard
- 更新 issue-question，將 PIM-009 標為 resolved，保留 live Realtime provider、raw audio retention、production migration approval 為後續手動事項。
- 本輪為避免既有 3000 dev server 未開 demo auth header 造成 browser/API false negative，已用 `ALLOW_DEV_AUTH_HEADER=true` 重新啟動本機 dev server 後驗收；未輸出任何 secret。

## 修改檔案

- `scripts/interview-cross-mode-qa.mjs`
- `scripts/interview-writeback-browser-qa.mjs`
- `package.json`
- `AGENTS.md`
- `src/app/(dashboard)/interview/page.tsx`
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/screenshots/pim/pim-008-writeback/pim-008-interview-desktop.png`
- `docs/06_audits-and-reports/screenshots/pim/pim-008-writeback/pim-008-interview-mobile.png`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-19_pim-009-cross-mode-qa-rollback.md`

## DB / Prisma 操作

- 是否修改 schema: 否
- 是否執行 generate: 否
- 是否執行 db push: 否
- DB target: 目前 `.env` development Supabase Postgres target 僅由既有 QA script 做非破壞性新增/讀取 proof；本輪沒有 schema mutation。
- 結果: 未做 schema/database mutation；production migration approval 仍未授權。

## 驗收指令與結果

- `pnpm interview:cross-mode-qa`: 通過
- `pnpm exec tsc --noEmit --pretty false`: 通過
- `pnpm run lint:changed`: 通過

Cross-mode QA 內含以下通過項：

- 顧問陪談文字模式 multi-turn proof：不重問 confirmed fact，micro-plan / output evidence 帶 supporting memory IDs。
- 劇場場域建構 proof：build packet 分 confirmed/inference/unknown，NPC <= 4，資料不足時轉 narrator questions。
- 語音 shell proof：mic consent、permission denied / unsupported fallback、correction UI source proof；voice memory dry-run 確認 uncertain transcript 為 unknown，correction supersedes prior memory。
- Persistence proof：DB-backed session/turn/memory/reflection 可由 stateless API snapshot 還原，等價於清空 browser storage 後恢復。
- Privacy proof：manager 不能讀 member private session；org coaching / AI usage aggregate endpoint 不回 transcript、memory text、client private sentinels。
- Writeback proof：inference checked 不會變 CRM fact；confirmed fact + approval 才建立 CRM candidate interaction event。

## 失敗與風險

- 無本輪驗收失敗。
- Live Realtime provider/WebRTC 仍未做 production proof；目前是 BFF dry-run guard + voice shell + event mirror proof。
- Raw audio retention 未批准，仍預設不保存。
- Production schema migration 尚未批准；PIM-006 development db push 不代表 production 可直接 mutate。

## 剩餘上線 blocker

- 需要 production migration approval 才能把 `InterviewSession` / `InterviewTurn` / `InterviewMemory` / `InterviewReflection` 推到 production。
- 需要 OpenAI Realtime model/provider/env、usage/cost evidence 與 mic permission 測試條件，才能宣稱中文即時語音 live provider ready。
- Raw audio retention 若要開啟，需 legal/compliance approval；預設不保存。
- Theater Route B 完整多角色 schema migration 仍屬 `PLN-015` / ITA workstream，不由 PIM-009 宣告完成。

## 下一輪建議入口

- 若繼續 PIM：做 live Realtime WebRTC client proof，但需要 provider/env/mic 條件。
- 若回到上線阻擋最短路徑：處理 production migration approval package 或進入 BFF-000/BFF 全站收斂，避免不同 surface 的資料與權限邊界不一致。
