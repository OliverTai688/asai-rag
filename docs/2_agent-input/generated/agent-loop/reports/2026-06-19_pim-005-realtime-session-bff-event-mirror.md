# Agent Loop Report — PIM-005 Realtime Session BFF + Event Mirror

Date: 2026-06-19

## 本輪戰役名稱

Realtime Voice × Park-style Interview Memory — PIM-005 Realtime session BFF + event mirror

## 選擇原因

PIM-004 已完成 `/interview` 中文語音 UX shell 與 text fallback；下一個最低未完成且最接近「中文即時語音訪談」上線阻擋的切片，是建立 authenticated Realtime session BFF、quota guard、short-lived client secret policy 與 event mirror，讓語音 transcript 可以進入既有 Park memory pipeline。

## 方法論研究摘要

- OpenAI Realtime GA client secrets API 指出 client secrets 是可交給 web/mobile client 的短效 token，用來避免主 API key 外流，且可設定 TTL 與 session configuration。來源：https://developers.openai.com/api/reference/python/resources/realtime/subresources/client_secrets/methods/create/
- OpenAI Realtime WebSocket guide 指出 server-to-server 可用標準 API key，但 browser/mobile client 建議使用 WebRTC；Realtime session 由 client-sent events 與 server-sent events 組成。來源：https://developers.openai.com/api/docs/guides/realtime-websocket
- Next.js 16 route handler docs 指出 `app` 目錄中的 `route.ts` 使用 Web `Request` / `Response` API，且 POST route handler 不會被快取。來源：`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`

## 對應 batch / task

- `AGENTS.md` → Batch PIM-005
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md` → Batch PIM-005
- 驗收：`docs/08_acceptance-and-qa/ACC-010_realtime-voice-park-memory-interview-acceptance-framework-v1.0.md`

## 實際完成內容

- 新增 `POST /api/ai/interview/realtime-session`。
  - 使用 `requireCurrentMember()` 推導 organization/member/unit。
  - 使用 `canUseAiModule(session, AiModule.INTERVIEW)` 做 quota guard；quota exceeded 時回 429，不 mint token。
  - Production path 呼叫 OpenAI `/v1/realtime/client_secrets` mint short-lived client secret，不回傳 server API key。
  - Non-production dry-run path 用於 unauth/member/quota/no-leak API proof，不打 production Realtime。
  - 成功/失敗寫 `AiUsageLog` marker；provider usage/cost 不足時不偽造 cost。
- 新增 `POST /api/ai/interview/realtime-events`。
  - 只接受 `FINAL_TRANSCRIPT`、`ASSISTANT_TRANSCRIPT`、`INTERRUPT`、`CORRECTION`、`CONFIRMATION`。
  - 拒收 token、cookie、OpenAI key、client secret、raw audio、audio base64、PCM/blob/buffer/file data 欄位。
  - Final transcript 進 `createMemoryCandidatesFromTurn()`，產生 `VOICE_TRANSCRIPT` memory candidate；raw audio 預設不保存。
  - Event mirror 寫 `AiUsageLog` marker 作 event proof，不把 transcript 持久化為 DB record；DB persistence 保留給 PIM-006。
- 新增 shared helper `src/lib/interview/realtime-bff.ts`，集中管理 client secret sanitize、event violation scan、memory candidate mirror 與 server secret leak check。
- 新增 `pnpm interview:realtime-bff-qa`，覆蓋 pure helper 與 localhost API proof。
- 更新 `pnpm ai:usage-audit` manifest，納入兩條 Realtime route 的 auth/quota/usage posture。

## 修改檔案

- `src/lib/interview/realtime-bff.ts`
- `src/app/api/ai/interview/realtime-session/route.ts`
- `src/app/api/ai/interview/realtime-events/route.ts`
- `scripts/interview-realtime-bff-qa.ts`
- `scripts/interview-realtime-bff-qa.mjs`
- `scripts/ai-usage-route-audit.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-19_pim-005-realtime-session-bff-event-mirror.md`

## DB / Prisma 操作

- DB target 判斷：本輪未修改 schema；API proof 使用現有 development/demo session header 與現有 DB session lookup。
- Schema 變更摘要：無。
- Prisma generate 結果：`pnpm build` 依既有 script 執行 `prisma generate`，成功。
- db push 結果：未執行。
- Seed/backfill 結果：未執行。
- Production migration approval：不需要。

## 驗收指令與結果

- `pnpm interview:realtime-bff-qa`：通過。
  - helper sanitize OpenAI client secret response：pass。
  - no server API key leak：pass。
  - non-production dry-run client secret：pass。
  - reject secret/raw-audio event payload fields：pass。
  - final transcript -> voice transcript memory candidate：pass。
  - realtime session unauth 401：pass。
  - member dry-run 200：pass。
  - quota exceeded 429 且不 mint realtime token：pass。
  - event mirror 200：pass。
  - event mirror rejects raw audio payload：pass。
- `pnpm interview:memory-dry-run`：通過。
- `pnpm interview:park-loop-dry-run`：通過。
- `pnpm interview:theater-build-dry-run`：通過。
- `pnpm ai:usage-audit`：通過；新 Realtime routes 無 source gaps。
- `pnpm exec tsc --noEmit --pretty false`：通過。
- `pnpm run lint:changed`：通過。
- `pnpm build`：通過；Next build 列出 `/api/ai/interview/realtime-session` 與 `/api/ai/interview/realtime-events`。

## 失敗與風險

- 無驗收失敗。
- 本輪未執行 production/live OpenAI Realtime session mint；production provider path 以 source/build proof 驗證，API proof 使用 non-production dry-run。
- PIM-005 不做 server WebSocket relay、不啟 production recording、不把 transcript 寫入 Prisma；這些仍留給後續 voice transport / PIM-006。

## 剩餘上線 blocker

- PIM-006：Prisma persistence for turns/memory/reflection，需要 DB target、schema migration/db push 與 recovery proof。
- PIM-007/PIM-008：Realtime client transport、transcript correction/confirmation card 與 CRM writeback boundary 尚未完成。
- Production live Realtime proof 仍需要 operator 明確允許打外部 provider 並記錄 usage/cost evidence。

## 下一輪建議入口

PIM-006 — Prisma persistence for turns/memory/reflection。先做 schema/repository/DTO，再做 idempotent migration/backfill、db push 與重新登入/清空 browser storage 後可恢復的 API proof。
