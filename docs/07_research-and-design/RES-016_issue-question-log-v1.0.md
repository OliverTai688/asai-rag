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
