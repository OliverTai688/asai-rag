# 誠問 AI Issue-question Log v1.0

> 建立日期：2026-06-19  
> 狀態：進行中  
> 用途：紀錄每輪開發遇到的待討論問題、阻擋事件、決策與解決方式。若問題已解決，保留解法與日期。

---

## Open Issues

### IQ-001 - Auth provider 從 Supabase Auth 改為 Auth.js / NextAuth

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-001`、`LCH-002`、`LCH-005`、`LCH-006`、`LCH-008`
- 現況：
  - Operator 於 2026-06-19 提出改用「Next.js auth」方向。
  - 實作採 Auth.js / NextAuth，Supabase 保留作 Postgres，不再把 Supabase Auth public env 視為 LCH-001 主阻擋。
  - 已新增 `src/auth.ts` 與 `/api/auth/[...nextauth]`，`getAppSession()` 優先讀 Auth.js `auth()`。
- 解法：
  - 本機 demo credentials provider 僅在 `NODE_ENV !== "production"` 且 `ALLOW_DEV_AUTH_HEADER=true` 啟用。
  - Production 必須提供 `AUTH_SECRET` 與正式 provider/email/SSO 設定。
  - `pnpm demo:preflight` 仍會警告 Supabase public env placeholder；此警告不再阻擋 Auth.js 主登入，但若未來使用 Supabase client-side features，仍需另案處理。

### IQ-006 - Auth.js production provider / secret 尚未補齊

- 狀態：Open
- 發現日期：2026-06-19
- 影響 batch：`LCH-001`、`LCH-005`、`LCH-008`
- 現況：
  - `.env.example` 已新增 `AUTH_SECRET`。
  - 本機非 production 有 deterministic dev fallback；production 不應依賴 fallback。
  - 目前 provider 只有 local demo credentials，不能作正式登入。
- 需要使用者/operator 手動決策：
  - 產生 production `AUTH_SECRET`。
  - 決定正式登入 provider：Email magic link、Google/Microsoft OAuth、企業 SSO，或先以受控 demo credentials staging。
  - 設定 production callback URL / trust host / email sender。

### IQ-002 - Route guard 策略尚未定案

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-001`
- 背景：
  - `LCH-001` 需要 dashboard/member 未登入導 `/login`、org admin 套 owner/admin/manager guard、super admin platform-only。
  - Next 16 文件中 middleware 相關慣例已改為 `proxy` 文件路徑，若要新增全域攔截需先讀 `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` 與 file convention。
- 解法：
  - 採 C：page/layout guard + API policy 為主，proxy 暫不導入。
  - `(dashboard)/layout.tsx` 改為 server component，呼叫 `requireMemberRoute()`；現有互動 shell 移至 `src/components/layout/dashboard-shell.tsx`。
  - `/team` 改為 server wrapper 呼叫 `requireOrgAdminRoute()`，client UI 移至 `team-page-client.tsx`。
  - `/super-admin` 呼叫 `requirePlatformRoute()`，一般 app session 會導 `/super-admin/login`。
  - HTTP proof：無 session `/dashboard` 307 `/login`；`ALLOW_DEV_AUTH_HEADER=true` + demo member `/dashboard` 200；demo manager `/team` 200；demo member `/super-admin` 307 `/super-admin/login`。

### IQ-003 - Client portal session contract 尚未設計

- 狀態：Open
- 發現日期：2026-06-19
- 影響 batch：`LCH-006`
- 現況：
  - 已有 `getClientSession()` 函式，但目前刻意回 `null`，避免把 app membership 誤當 client identity。
  - Client portal 需要獨立 token/client-scoped session。
- 待討論：
  - Client login 是否用 Auth.js client user？
  - 還是第一版用 signed portal token + email OTP？
  - Client portal 是否要支援多報告、多顧問授權範圍？

### IQ-004 - 是否要安裝 `@supabase/ssr` / `@supabase/supabase-js`

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-001`
- 現況：
  - Auth provider 已改採 Auth.js / NextAuth。
  - Supabase SDK 不再是 LCH-001 的必要依賴；Supabase 保留為 Postgres runtime target。
- 解法：
  - 已安裝 `next-auth@beta`，不安裝 Supabase auth SDK。

### IQ-005 - Demo account email 文件與 seed 不一致

- 狀態：Open
- 發現日期：2026-06-19
- 現況：
  - `scripts/seed-demo.mjs` 實際 demo emails 是 `demo.member@asai.local`、`demo.manager@asai.local`、`demo.client@asai.local`。
  - 較早研究文件 `RES-009` 曾列 `demo.member@sincere-ai.test` 等 `.test` email。
- 影響：
  - 自動化驗收與人工測試可能拿錯帳號。
- 建議解法：
  - 以 seed script 為 runtime truth，後續更新研究/驗收文件，把 demo email 統一到 `@asai.local` 或正式決定一組 public demo domain。

### IQ-007 - LCH-002 寫入 proof 需要確認 DB target

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-002`、`LCH-005`
- 現況：
  - `.env` 指向遠端 Supabase Postgres。
  - `pnpm demo:preflight` 可確認 DB DNS/connection/tables 通過，也可從 `/api/clients` 讀到 demo seeded client `c_wang`。
  - Operator 於 2026-06-19 明確批准目前 Supabase target 可做 LCH demo/test 非破壞性寫入 proof。
  - 已完成 `POST /api/clients`、`PATCH /api/clients/[id]`、family/policy minimal route 的 build/type/lint proof。
- 解法：
  - 後續循環可在目前 Supabase target 執行新增 demo/test client、family member、policy、AI output 等非破壞性寫入 proof。
  - 每次寫入需回報 created ids、proof commands、refresh/relogin 結果，並避免 secret/private payload 進入文件。
  - 授權不包含 drop/reset、清表、刪除遠端資料、真實金流/email/notification、停用 public-read、刪除 bucket object。

---

## Resolved Issues

### IQ-016 - LCH-004 Theater legacy route 缺 session/quota/usage guard

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-004`
- 背景：
  - `/api/ai/theater` 與 `/api/ai/theater/score` 原本直接信任前端 payload，沒有 current session、quota check、`AiUsageLog`、interaction evidence 或 production legacy gate。
  - Theater Route B 尚未完成，不能把 legacy Theater 說成 production-ready 新版劇場。
- 解法：
  - 兩條 route 改用 `requireCurrentMember()`，server 注入 current organization/user/unit。
  - 新增 Zod validation、`canUseAiModule(session, THEATER)`、success/failure `AiUsageLog` 與 success `InteractionEvent(type=THEATER)`。
  - Success path increment `Organization.monthlyAiUsed`。
  - 新增 production gate：未設定 `ENABLE_LEGACY_THEATER_DEMO=true` 時回 `503 THEATER_ROUTE_B_REQUIRED`。
  - API proof：`POST /api/ai/theater` 200、`POST /api/ai/theater/score` 200。
  - DB proof：`THEATER usage 0→2`、success usage `0→2`、THEATER interaction events `0→2`、monthly counter `3→5`。
  - Quota proof：character/score 皆回 `429 QUOTA_EXCEEDED`，THEATER usage 維持 `2`，counter 還原 `5`。
  - 剩餘：Route B 多角色/旁白 NPC/五視角新版劇場、director call、三 AI provider error-path 全覆蓋。

### IQ-015 - LCH-004 quota guard 需要真實 API proof

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-004`
- 背景：
  - `/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs` 已接 `canUseAiModule()`，但尚缺實際超限 proof。
  - 上線前需要確認 quota guard 發生在 provider call 前，避免超限仍產生成本。
- 解法：
  - 以 demo member default org `demo_org_asai_personal` 做可還原 proof。
  - 暫時將 `monthly_ai_used` 設為 `monthly_ai_quota=200` 後呼叫三條 AI route。
  - API proof：`/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs` 皆回 `429 QUOTA_EXCEEDED`。
  - DB proof：quota-blocked calls 前後 `AiUsageLog` count 維持 `CHAT=1`、`INTERVIEW=5`，確認 provider call 前阻擋。
  - Restore proof：測試後還原 `monthly_ai_used=3` 並二次查詢確認。
  - 剩餘：Theater Route B、quota UI proof、三 AI provider error-path 全覆蓋仍待後續 LCH-004。

### IQ-014 - LCH-004 interview agent 仍信任前端 scope 且缺 output evidence

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-004`
- 背景：
  - `/api/ai/interview` 與 `/api/ai/interview/outputs` 原本要求前端傳 `organizationId`，也可傳 `userId/unitId/clientId`，不符合 server session 為唯一 scope 真相源的上線規則。
  - 訪談回合與輸出草稿沒有 DB-backed evidence，demo relogin 與後續 org/super admin audit 無法追蹤。
- 解法：
  - 兩條 route 改用 `requireCurrentMember()` 注入 organization/user/unit，不再讀前端 `organizationId/userId`。
  - 新增 `src/lib/interview/interview-ai-repository.ts`，success path 寫 `InteractionEvent` 保存訪談回合與輸出草稿 metadata。
  - Success path 寫 `AiUsageLog` 並 increment organization `monthlyAiUsed`。
  - API proof：`POST /api/ai/interview` 200；`POST /api/ai/interview/outputs` 200。
  - DB proof：`INTERVIEW usage 3→5`、success usage `1→3`、interaction events `0→2`。
  - 剩餘：Theater Route B、三 AI error-path 全覆蓋與 quota 429 UI proof。

### IQ-013 - LCH-004 assistant chat 缺 usage/persistence

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-004`
- 背景：
  - `/api/ai/chat` 原本直接讀前端 body、呼叫 OpenAI 串流，沒有 session scope、`AiUsageLog`、conversation/message persistence，也不更新 quota counter。
- 解法：
  - `/api/ai/chat` 改用 `requireCurrentMember()`，server 注入 org/user/unit。
  - 使用 Zod 驗證 messages/context，工具 route context 只允許既有 route。
  - success stream 結束後寫 `AiUsageLog`、`AssistantConversation`、`AssistantMessage`，並 increment `Organization.monthlyAiUsed`。
  - API proof：demo member `POST /api/ai/chat` 200；DB proof `CHAT usage=1`、`assistant_conversations=1`、`assistant_messages=2`、`monthly_ai_used=1`。
  - 剩餘：interview/theater 與三 AI error-path 全覆蓋仍待後續 LCH-004。

### IQ-012 - LCH-003 member settings 與 org settings 分層落地

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-003`、`LCH-007`
- 背景：
  - 既有 `/settings` 命名為「系統設定」，且以 client-only 本機 state 呈現，容易和 org settings 混用。
  - 上線前必須確保 member admin 的私人偏好不修改 org-wide branding、billing、unit、client portal、quota 或 compliance policy。
- 解法：
  - 新增 `OrganizationMember.settings Json?`，明確把 member preferences 綁在 current membership。
  - 新增 `GET/PATCH /api/member/settings`，只透過 `requireCurrentMember()` 取得 session，不接受前端指定 org/user。
  - `/settings` 改為「個人設定」：profile、notifications、AI preferences、personal integrations、default workspace、personal collaborator policy entry。
  - sidebar `/settings` 改名「個人設定」，org settings 留待 `LCH-007` 的 `/org/settings` 或 `/team/settings`。
  - 驗收：Prisma validate/generate/db push、TypeScript、lint:changed、build、API persistence proof、desktop/mobile browser proof 均通過。

### IQ-011 - LCH-002 valid client write proof

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-002`、`LCH-005`
- 背景：
  - `LCH-002` 剩餘驗收是「新增 client 後刷新仍存在」。
  - Operator 已批准目前 Supabase target 可做 LCH demo/test 非破壞性寫入 proof。
- 解法：
  - 以 `ALLOW_DEV_AUTH_HEADER=true` + `x-asai-demo-user-email: demo.member@asai.local` 呼叫 `POST /api/clients`。
  - 建立 demo/test client `cmqjsnwbf00005061en7zsevh`（`LCH-002 測試客戶 20260619014910`）。
  - API proof：`POST /api/clients` 201；`GET /api/clients` 200 且 list 中找到 created client；`GET /api/clients/[id]` 200 且 detail match，`kycStatus=MISSING`。
  - 新增資料保留作 evidence；不執行遠端 delete/cleanup。

### IQ-010 - LCH-002 family/policy minimal write path 缺 server guard

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-002`
- 背景：
  - CRM relationships 與 policies subpages 已可從 `/api/clients/[id]` hydrate，但 family/policy 新增仍缺 server-side write path。
  - 在 DB target 未確認前，不能做 valid POST 寫入 proof；仍可補 source/build/API guard proof。
- 解法：
  - 新增 `POST /api/clients/[id]/family-members` 與 `POST /api/clients/[id]/policies`。
  - Repository 寫入前使用 current session + `canWriteClient()` 驗證 owner/member detail policy。
  - `clientService.createFamilyMemberRemote()` / `createPolicyRemote()` 成功後以完整 client DTO 更新 cache。
  - Relationships dialog child mode 已接 family member BFF。
  - 已驗收 401 unauth、400 invalid payload、build route list 與 dialog open browser proof；未對遠端 DB 做 valid write。

### IQ-009 - LCH-002 CRM detail 空 browser storage 直開頁面會缺 client cache

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-002`
- 背景：
  - Round 003 已讓 `/crm` list 走 DB-backed `/api/clients`。
  - 但 `/crm/[clientId]` layout 與多個 subpages 仍直接讀 local store；若使用者清空 browser storage 後直接開 detail URL，可能沒有 client cache。
- 解法：
  - 新增 `src/components/crm/use-client-record.ts`，以 `/api/clients/[id]` hydrate detail cache。
  - `src/domains/client/store.ts` 新增 `setClient()` upsert。
  - CRM detail layout、overview、policies、relationships、gap-analysis、reports 改用 `useClientRecord()`。
  - 新 browser context 直接開 `/crm/c_wang` 與主要子頁，皆可看到 DB seeded client；console error 0、無水平 overflow。

### IQ-008 - LCH-002 DB-backed client read path 已建立

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-002`
- 解法：
  - 已新增 `GET /api/clients` 與 `GET /api/clients/[id]`。
  - API 使用 `requireCurrentMember()` 從 server session 推導 current org/user。
  - Member 只能讀 current org 且 `ownerId === session.user.id` 的 detail。
  - 新 browser context + demo member header 可從 DB 看到 seeded client `王大明`，不依賴 browser localStorage。

### IQ-000 - Launch readiness batch tasks 已轉成可執行 workstream

- 狀態：Resolved
- 解決日期：2026-06-19
- 解法：
  - 已建立 `PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`。
  - 已在 `AGENTS.md` 新增 `Launch Readiness Implementation Batch Tasks`。
  - 後續每輪依 `LCH-001` 到 `LCH-009` 推進。
