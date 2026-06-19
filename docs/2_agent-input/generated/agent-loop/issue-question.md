# Agent Loop Issue Questions

Last updated: 2026-06-19

## 使用者決策

- 無新增。PIM-004 僅完成 `/interview` 中文語音 UX shell 與文字 fallback，不啟用 production Realtime、不保存 raw audio、不改 provider policy。

## Production Approval

- 無新增。PIM-004 未改 Prisma schema、未執行 production DB mutation、未接 Realtime API。

## Operator 手動處理

- 無新增。

## Session / Seed Data / Env / External Service

- PIM-005 需要 OpenAI Realtime 或等價 provider env、ephemeral session policy、quota/session guard 與 usage evidence 規則，才能做 integration proof。
- PIM-006 需要明確 DB target 與 schema/db push approval，才能做 persistence proof。

## 已解決 / 不再阻擋

- 2026-06-19 resolved: PIM-001 已補上顧問陪談與劇場場域建構共用的 memory domain contract、retrieval scoring 與 correction/supersede helper；PIM-002 可直接接 API route。
- 2026-06-19 resolved: PIM-002 已讓 `/api/ai/interview` 與 `/api/ai/interview/outputs` 使用 request-local memory stream、retrieval partition、micro-plan 與 supporting memory IDs；PIM-003 可沿用同樣模式接劇場場域建構。
- 2026-06-19 resolved: PIM-003 已新增 Theater field build outline、Park memory reflection 與 `TheaterBuildPacket` builder；fixture proof 已確認 NPC <= 4、資料不足回補問、推論不會寫入 confirmed facts。PIM-004 可接中文語音 UX shell。
- 2026-06-19 resolved: PIM-004 已完成 `/interview` 中文語音 UX shell、mic consent、live stage、transcript correction placeholder、memory rail、文字 fallback 與中文 IME composition guard；PIM-005 可接 Realtime session BFF。
