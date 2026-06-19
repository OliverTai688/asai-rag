# Agent Loop Issue Questions

Last updated: 2026-06-20

## 使用者決策

- 2026-06-20 resolved: 使用者要求參考 NuvaClub automation，建立 ASAI 自動化。已定義 ASAI LV3 automation 目標為「架構、體驗、介面、容易操作簡約的沉浸式顧問系統成熟度」，不是自動宣稱 Level 3 public launch ready。
- 2026-06-20 resolved: ASAI LV3 目標流程定案為：新增客戶 -> 建立關係圖 -> 生成拜訪準備包 -> 檢視問題清單與推論依據 -> 從準備包建立劇場舞台 -> 劇場私聊/群聊/人物狀態更新 -> AI 訪談建立或補強客戶資料、準備包與劇場。
- 2026-06-20 resolved: 使用者要求「先不用 git push」。後續 ASAI LV3 automation 每輪仍需驗收、stage 與建立本地 commit，但不得 push；report/final 寫明 `push skipped by user instruction`。待使用者明確恢復 push 後再重新開啟。
- PIM-009 已完成 cross-mode QA 與 rollback note；尚未啟用 production recording 或 live Realtime provider proof。
- 2026-06-20 resolved: BFF-104a 已完成 Visit / Pre-visit server-owned workspace；`/pre-visit` list/detail/notes/create/update 改走 member-scoped BFF，`/api/ai/visit` 仍只負責 provider generation，deterministic save/update 另走 `/api/visits`。Proof 不呼叫 provider，僅做 demo `VisitPlan` 非破壞性新增/更新 evidence。
- 2026-06-20 resolved: TDF-004a 已完成 persisted visit package -> theater build 高敏感 gate；準備包來源審查顯示 known/inference/unknown，缺 reason/riskAccepted 會 blocked，approval 寫 `InteractionEvent` audit。Proof 不呼叫 provider；仍待 TDF-004b 補 `/theater` client selector 與越權 403 proof。

## Production Approval

- PIM-006 已改 Prisma schema 並對目前 `.env` development Supabase Postgres target 執行 additive `db push`；production schema migration 仍需明確 approval。
- 後續若要做 live Realtime provider proof，需要 operator 明確允許打外部 provider，並記錄 usage/cost evidence。

## Operator 手動處理

- Build blocker：`pnpm build` 目前卡在 Next/Turbopack Google Font path（`[next]/internal/font/google/*` / `@vercel/turbopack-next/internal/font/google/font`）。需另輪處理自託管字體或 Next 16 font build 設定後重跑 production build。

## Session / Seed Data / Env / External Service

- PIM-006 已 resolved；本輪 proof 使用 `ALLOW_DEV_AUTH_HEADER=true` 的 local dev server 與 demo member/manager header。
- PIM-008 已 resolved；browser writeback proof 使用 demo member header 與自動建立 demo client 完成。
- PIM-009 已 resolved；cross-mode QA 使用 local dev server、demo member/manager header、development Supabase DB proof 與 headless browser desktop/mobile proof 完成。
- 後續若要做真實 browser WebRTC/voice transport proof，需要可用 OpenAI Realtime model、前端 WebRTC client、麥克風 permission 測試條件與 usage/cost evidence。
- Production demo login runtime DB 已於 2026-06-19 resolved：Vercel Production `DATABASE_URL` 改為 Supabase shared transaction pooler，`DIRECT_URL` 改為 shared session pooler，redeploy `3DbtCFYPqQ99VcFvGEvrkbpoqzrB` 後正式 `/api/public/pricing` 200、`/api/share/demo-share-wang` 200、demo member one-click login 進 `/dashboard`。

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
- 2026-06-19 resolved: Production demo login blocker 已確認為 Vercel 使用 Supabase direct/dedicated DB host 造成 `P1001 DatabaseNotReachable`；已切到 shared IPv4 pooler 並 redeploy，正式 demo member 登入 proof 通過。
