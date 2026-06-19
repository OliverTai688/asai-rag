# 2026-06-19 PIM-008 Confirmation Card + CRM Writeback Boundary

## 本輪戰役名稱

Realtime Voice x Park-style Interview Memory - PIM-008 confirmation card + CRM/writeback boundary.

## 選擇原因

PIM-007 已完成 reflection/planning service；最低未完成且最接近上線阻擋的是 PIM-008。若沒有 confirmation/writeback boundary，Park memory 的 confirmed / inference / unknown 仍可能在 UI 或後續服務中被誤用成 CRM fact。

## 對應 batch / task

- Workstream: Realtime Voice x Park-style Interview Memory
- Batch: PIM-008
- 依據文件:
  - `AGENTS.md`
  - `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
  - `docs/08_acceptance-and-qa/ACC-010_realtime-voice-park-memory-interview-acceptance-framework-v1.0.md`
  - `docs/02_architecture-and-rules/ARC-007_realtime-voice-and-park-memory-interview-architecture-v1.0.md`

## 方法論研究

- Park et al. Generative Agents: memory stream / reflection / planning 是控制層，不應直接當 truth layer 寫回 CRM。
- NIST AI RMF / GenAI governance direction: human review、traceability、record keeping 是高風險 AI output 落地前的必要控制。
- Prisma transaction docs: writeback candidate 與 interaction audit 應在同一 transaction 內完成，避免候選與稽核紀錄不一致。

## 實際完成內容

- 新增 `src/domains/interview/writeback-boundary.ts` pure service:
  - 將 reflection 轉成 confirmation candidates。
  - confirmed fact -> `CRM_CANDIDATE`，但只有 client-bound session 可選。
  - inference -> `INTERVIEW_INSIGHT`，永不作為 CRM fact。
  - unknown -> `FOLLOW_UP_TASK` 或 theater narrator question。
  - 高敏感文字需要 reason 或 `riskAccepted`，否則 blocked。
- 新增 `src/lib/interview/interview-writeback-repository.ts`:
  - `GET` preview 讀 owner-scoped session + latest reflection，必要時 deterministic build reflection。
  - `POST` save 重新在 server 端 evaluate candidates，不信任前端文字。
  - 所有可建立項目寫 `InteractionEvent` metadata；CRM candidate 只更新 `lastInteractionAt`，不直接改 Client fact 欄位。
- 新增 BFF route:
  - `GET /api/ai/interview/sessions/[sessionId]/writebacks`
  - `POST /api/ai/interview/sessions/[sessionId]/writebacks`
- `/interview` UI:
  - CRM 客戶 selector，避免 raw ID workflow。
  - 選客戶後建立 DB-backed interview session。
  - 回答送出時同步 append persisted turn/memory。
  - 新增段落確認卡，可產生候選、勾選/取消、高敏感理由/riskAccepted、保存並顯示 created/blocked result。
- Proof scripts:
  - `pnpm interview:writeback-qa`
  - `pnpm interview:writeback-browser-qa`

## 修改檔案

- `src/domains/interview/writeback-boundary.ts`
- `src/lib/interview/interview-writeback-repository.ts`
- `src/app/api/ai/interview/sessions/[sessionId]/writebacks/route.ts`
- `src/app/(dashboard)/interview/page.tsx`
- `scripts/interview-writeback-qa.mjs`
- `scripts/interview-writeback-browser-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`

## DB / Prisma 操作

- DB target 判斷: `.env` 指向 Supabase Postgres development target。
- Schema 變更: 無。
- Prisma generate: `pnpm build` 內執行成功。
- db push: 未執行，因本輪無 schema change。
- Seed/backfill: 未新增。
- DB write proof: `pnpm interview:writeback-qa` 透過 demo member 建立 demo client/session/turn/reflection/writeback event，並查 `interaction_events.metadata`:
  - CRM candidate count >= 1。
  - inference CRM fact count = 0。
  - follow-up task count >= 1。
- Production approval: PIM-006 schema production migration 仍需 approval；本輪無新增 production mutation。

## 驗收指令與結果

- `pnpm exec tsc --noEmit --pretty false` - pass
- Explicit ESLint:
  - `src/domains/interview/writeback-boundary.ts`
  - `src/lib/interview/interview-writeback-repository.ts`
  - `src/app/api/ai/interview/sessions/[sessionId]/writebacks/route.ts`
  - `src/app/(dashboard)/interview/page.tsx`
  - `scripts/interview-writeback-qa.mjs`
  - `scripts/interview-writeback-browser-qa.mjs`
  - pass
- `pnpm interview:writeback-qa` - pass
- `pnpm interview:writeback-browser-qa` - pass
- `pnpm interview:reflection-planning-qa` - pass
- `pnpm interview:persistence-qa` - pass
- `pnpm interview:realtime-bff-qa` - pass
- `pnpm interview:memory-dry-run` - pass
- `pnpm interview:park-loop-dry-run` - pass
- `pnpm interview:theater-build-dry-run` - pass
- `pnpm ai:usage-audit` - pass
- `pnpm run lint:changed` - pass
- `pnpm build` - pass

## Browser proof

- In-app Browser attempted `http://localhost:3000/interview`; unauthenticated browser was redirected to `/login`, so authenticated UI proof used headless Chromium with `x-asai-demo-user-email` demo header.
- Desktop proof:
  - client selector creates DB-backed session.
  - confirmation card renders CRM candidate.
  - checkbox can be checked.
  - save without high-sensitive approval is blocked.
  - reason/risk acceptance save creates interaction event.
  - no horizontal overflow.
- Mobile proof:
  - confirmation card renders.
  - no horizontal overflow.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/pim/pim-008-writeback/pim-008-interview-desktop.png`
  - `docs/06_audits-and-reports/screenshots/pim/pim-008-writeback/pim-008-interview-mobile.png`

## 失敗與風險

- In-app Browser cannot inject demo auth header for this protected route; headless Chromium was used for authenticated UI proof.
- `/interview` still keeps local Zustand interview UI state for visible chat flow while DB-backed session stores persisted turns/memory for confirmation card. PIM-009 should include cross-mode QA/rollback notes before declaring this fully release-ready.
- 本輪不宣稱 live WebRTC voice provider ready。

## 剩餘上線 blocker

- PIM-009 cross-mode QA, docs sync, rollback notes.
- Live Realtime provider browser proof with microphone/WebRTC and usage/cost evidence.
- PIM-006 production schema migration approval.

## 下一輪建議入口

PIM-009：把文字/語音 shell、顧問陪談、劇場場域建構、persistence、privacy、rollback note 做一次 cross-mode QA，補齊最後 release handoff。
