# Agent Loop Issue Questions

Last updated: 2026-06-19

## 使用者決策

- 無新增。PIM-009 已完成 cross-mode QA 與 rollback note；尚未啟用 production recording 或 live Realtime provider proof。

## Production Approval

- PIM-006 已改 Prisma schema 並對目前 `.env` development Supabase Postgres target 執行 additive `db push`；production schema migration 仍需明確 approval。
- 後續若要做 live Realtime provider proof，需要 operator 明確允許打外部 provider，並記錄 usage/cost evidence。

## Operator 手動處理

- Production demo login hotfix：operator 已確認有 `AUTH_SECRET`；本輪定位為正式 DB-backed runtime path 失敗。部署本 commit 後需重測 `/api/public/pricing`、`/api/share/demo-share-wang`、demo one-click login。若仍 500，請檢查 Vercel Production env 是否有可用 runtime DB URL（`DATABASE_URL`、`POSTGRES_PRISMA_URL`、`POSTGRES_URL`、`DIRECT_URL`、`POSTGRES_URL_NON_POOLING`），並確認設定後已 redeploy。
- Build blocker：`pnpm build` 目前卡在 Next/Turbopack Google Font path（`[next]/internal/font/google/*` / `@vercel/turbopack-next/internal/font/google/font`）。需另輪處理自託管字體或 Next 16 font build 設定後重跑 production build。

## Session / Seed Data / Env / External Service

- PIM-006 已 resolved；本輪 proof 使用 `ALLOW_DEV_AUTH_HEADER=true` 的 local dev server 與 demo member/manager header。
- PIM-008 已 resolved；browser writeback proof 使用 demo member header 與自動建立 demo client 完成。
- PIM-009 已 resolved；cross-mode QA 使用 local dev server、demo member/manager header、development Supabase DB proof 與 headless browser desktop/mobile proof 完成。
- 後續若要做真實 browser WebRTC/voice transport proof，需要可用 OpenAI Realtime model、前端 WebRTC client、麥克風 permission 測試條件與 usage/cost evidence。
- Production demo login：read-only DB proof 確認目前 Supabase target 內 demo users / password hashes / memberships 正常；正式站部署前 `/api/public/pricing` 與 `/api/share/demo-share-wang` 仍 500，demo credentials callback 仍 `302 /api/auth/error?error=Configuration`。

## 已解決 / 不再阻擋

- 2026-06-19 resolved: PIM-001 已補上顧問陪談與劇場場域建構共用的 memory domain contract、retrieval scoring 與 correction/supersede helper；PIM-002 可直接接 API route。
- 2026-06-19 resolved: PIM-002 已讓 `/api/ai/interview` 與 `/api/ai/interview/outputs` 使用 request-local memory stream、retrieval partition、micro-plan 與 supporting memory IDs；PIM-003 可沿用同樣模式接劇場場域建構。
- 2026-06-19 resolved: PIM-003 已新增 Theater field build outline、Park memory reflection 與 `TheaterBuildPacket` builder；fixture proof 已確認 NPC <= 4、資料不足回補問、推論不會寫入 confirmed facts。PIM-004 可接中文語音 UX shell。
- 2026-06-19 resolved: PIM-004 已完成 `/interview` 中文語音 UX shell、mic consent、live stage、transcript correction placeholder、memory rail、文字 fallback 與中文 IME composition guard；PIM-005 可接 Realtime session BFF。
- 2026-06-19 resolved: PIM-005 已新增 authenticated Realtime session BFF、quota guard、short-lived client secret production path、non-production dry-run proof、event mirror allowlist、raw-audio/secret reject、final transcript memory extraction 與 usage/session marker；PIM-006 可接 Prisma persistence。
- 2026-06-19 resolved: PIM-006 已新增 `InterviewSession` / `InterviewTurn` / `InterviewMemory` / `InterviewReflection` schema、owner-scoped repository / BFF routes、development db push 與 `pnpm interview:persistence-qa`；proof 確認清空 browser storage 等價的 stateless API read 可恢復 session/memory/reflection，manager 不能讀 member 私有逐字稿/記憶。PIM-007 可接 reflection/planning service。
- 2026-06-19 resolved: PIM-007 已新增 deterministic reflection/planning service、generated reflection BFF、plan BFF 與 `pnpm interview:reflection-planning-qa`；proof 確認 confirmed facts / inferred patterns / unknowns 分流、supporting memory IDs 保留、plan 優先追問 unknown、不重問 confirmed fact，且 manager 不能從 member 私有記憶生成 plan。PIM-008 可接 confirmation card / CRM writeback boundary。
- 2026-06-19 resolved: PIM-008 已新增 confirmation card / CRM writeback boundary、`GET/POST /api/ai/interview/sessions/[sessionId]/writebacks`、`pnpm interview:writeback-qa` 與 `pnpm interview:writeback-browser-qa`；proof 確認 confirmed fact + checked + 高敏感 approval 才建立 CRM candidate interaction event，inference checked 只保存為 interview insight 且 DB metadata 證明 inference CRM fact = 0，unknown 轉 follow-up task。PIM-009 可接 cross-mode QA 與 rollback notes。
- 2026-06-19 resolved: PIM-009 已新增 `pnpm interview:cross-mode-qa`，串接 advisor/theater/voice/persistence/reflection/writeback/browser/privacy proof；並在 `PLN-018` 補 voice provider disabled、memory persistence disabled、schema rollback、CRM writeback rollback 與 manager aggregate privacy rollback note。PIM workstream 第一階段可交接；剩餘為 live Realtime provider proof、raw audio retention approval 與 production migration approval。
