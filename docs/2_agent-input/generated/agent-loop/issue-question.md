# Agent Loop Issue Questions

Last updated: 2026-06-19

## 使用者決策

- 無新增。PIM-005 已完成 Realtime session BFF 與 event mirror 的安全邊界；尚未啟用 production recording 或 CRM writeback。

## Production Approval

- 無新增。PIM-005 未改 Prisma schema、未執行 production DB mutation、未執行 production/live OpenAI Realtime provider call。
- 後續若要做 live Realtime provider proof，需要 operator 明確允許打外部 provider，並記錄 usage/cost evidence。

## Operator 手動處理

- 無新增。

## Session / Seed Data / Env / External Service

- PIM-006 需要明確 DB target 與 schema/db push approval，才能做 persistence proof。
- PIM-007/PIM-008 若要做真實 browser WebRTC/voice transport proof，需要可用 OpenAI Realtime model、前端 WebRTC client、麥克風 permission 測試條件與 usage/cost evidence。

## 已解決 / 不再阻擋

- 2026-06-19 resolved: PIM-001 已補上顧問陪談與劇場場域建構共用的 memory domain contract、retrieval scoring 與 correction/supersede helper；PIM-002 可直接接 API route。
- 2026-06-19 resolved: PIM-002 已讓 `/api/ai/interview` 與 `/api/ai/interview/outputs` 使用 request-local memory stream、retrieval partition、micro-plan 與 supporting memory IDs；PIM-003 可沿用同樣模式接劇場場域建構。
- 2026-06-19 resolved: PIM-003 已新增 Theater field build outline、Park memory reflection 與 `TheaterBuildPacket` builder；fixture proof 已確認 NPC <= 4、資料不足回補問、推論不會寫入 confirmed facts。PIM-004 可接中文語音 UX shell。
- 2026-06-19 resolved: PIM-004 已完成 `/interview` 中文語音 UX shell、mic consent、live stage、transcript correction placeholder、memory rail、文字 fallback 與中文 IME composition guard；PIM-005 可接 Realtime session BFF。
- 2026-06-19 resolved: PIM-005 已新增 authenticated Realtime session BFF、quota guard、short-lived client secret production path、non-production dry-run proof、event mirror allowlist、raw-audio/secret reject、final transcript memory extraction 與 usage/session marker；PIM-006 可接 Prisma persistence。
