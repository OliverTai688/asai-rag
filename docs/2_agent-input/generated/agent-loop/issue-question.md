# Agent Loop Issue Questions

Last updated: 2026-06-19

## 使用者決策

- 無新增。PIM-001 僅落地 domain contract / pure helper，不改 UX、DB、AI provider selection 或 production behavior。

## Production Approval

- 無新增。PIM-001 未改 Prisma schema、未執行 production DB mutation、未接 Realtime API。

## Operator 手動處理

- 無新增。

## Session / Seed Data / Env / External Service

- PIM-002 可在文字訪談模式先做 session-local proof，不需外部語音服務。
- PIM-005 / PIM-006 之後需要明確 DB target、Realtime session env 與 quota/session guard 才能做 integration proof。

## 已解決 / 不再阻擋

- 2026-06-19 resolved: PIM-001 已補上顧問陪談與劇場場域建構共用的 memory domain contract、retrieval scoring 與 correction/supersede helper；PIM-002 可直接接 API route。
