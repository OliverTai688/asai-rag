# Agent Loop Issue Questions

Last updated: 2026-06-19

## 使用者決策

- 無新增。PIM-002 僅把顧問陪談文字模式接上 request-local Park memory loop，不改 DB schema、不啟用 raw audio、不改 production provider policy。

## Production Approval

- 無新增。PIM-002 未改 Prisma schema、未執行 production DB mutation、未接 Realtime API。

## Operator 手動處理

- 無新增。

## Session / Seed Data / Env / External Service

- PIM-003 可在文字/fixture 模式先做 Theater build packet proof，不需外部語音服務。
- PIM-005 / PIM-006 之後需要明確 DB target、Realtime session env 與 quota/session guard 才能做 integration proof。

## 已解決 / 不再阻擋

- 2026-06-19 resolved: PIM-001 已補上顧問陪談與劇場場域建構共用的 memory domain contract、retrieval scoring 與 correction/supersede helper；PIM-002 可直接接 API route。
- 2026-06-19 resolved: PIM-002 已讓 `/api/ai/interview` 與 `/api/ai/interview/outputs` 使用 request-local memory stream、retrieval partition、micro-plan 與 supporting memory IDs；PIM-003 可沿用同樣模式接劇場場域建構。
