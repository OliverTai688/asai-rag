# Agent Loop Issue Questions

Last updated: 2026-06-19

## 使用者決策

- 無新增。PIM-007 已完成 reflection/planning service 與 BFF proof；尚未啟用 production recording 或 CRM writeback。

## Production Approval

- PIM-006 已改 Prisma schema 並對目前 `.env` development Supabase Postgres target 執行 additive `db push`；production schema migration 仍需明確 approval。
- 後續若要做 live Realtime provider proof，需要 operator 明確允許打外部 provider，並記錄 usage/cost evidence。

## Operator 手動處理

- 無新增。

## Session / Seed Data / Env / External Service

- PIM-006 已 resolved；本輪 proof 使用 `ALLOW_DEV_AUTH_HEADER=true` 的 local dev server 與 demo member/manager header。
- PIM-008 若要做真實 browser writeback proof，需要 member session、可寫入的 demo client，以及確認 card 的 UI 測試條件。
- 後續若要做真實 browser WebRTC/voice transport proof，需要可用 OpenAI Realtime model、前端 WebRTC client、麥克風 permission 測試條件與 usage/cost evidence。

## 已解決 / 不再阻擋

- 2026-06-19 resolved: PIM-001 已補上顧問陪談與劇場場域建構共用的 memory domain contract、retrieval scoring 與 correction/supersede helper；PIM-002 可直接接 API route。
- 2026-06-19 resolved: PIM-002 已讓 `/api/ai/interview` 與 `/api/ai/interview/outputs` 使用 request-local memory stream、retrieval partition、micro-plan 與 supporting memory IDs；PIM-003 可沿用同樣模式接劇場場域建構。
- 2026-06-19 resolved: PIM-003 已新增 Theater field build outline、Park memory reflection 與 `TheaterBuildPacket` builder；fixture proof 已確認 NPC <= 4、資料不足回補問、推論不會寫入 confirmed facts。PIM-004 可接中文語音 UX shell。
- 2026-06-19 resolved: PIM-004 已完成 `/interview` 中文語音 UX shell、mic consent、live stage、transcript correction placeholder、memory rail、文字 fallback 與中文 IME composition guard；PIM-005 可接 Realtime session BFF。
- 2026-06-19 resolved: PIM-005 已新增 authenticated Realtime session BFF、quota guard、short-lived client secret production path、non-production dry-run proof、event mirror allowlist、raw-audio/secret reject、final transcript memory extraction 與 usage/session marker；PIM-006 可接 Prisma persistence。
- 2026-06-19 resolved: PIM-006 已新增 `InterviewSession` / `InterviewTurn` / `InterviewMemory` / `InterviewReflection` schema、owner-scoped repository / BFF routes、development db push 與 `pnpm interview:persistence-qa`；proof 確認清空 browser storage 等價的 stateless API read 可恢復 session/memory/reflection，manager 不能讀 member 私有逐字稿/記憶。PIM-007 可接 reflection/planning service。
- 2026-06-19 resolved: PIM-007 已新增 deterministic reflection/planning service、generated reflection BFF、plan BFF 與 `pnpm interview:reflection-planning-qa`；proof 確認 confirmed facts / inferred patterns / unknowns 分流、supporting memory IDs 保留、plan 優先追問 unknown、不重問 confirmed fact，且 manager 不能從 member 私有記憶生成 plan。PIM-008 可接 confirmation card / CRM writeback boundary。
