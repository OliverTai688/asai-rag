# 誠問 AI Issue-question Log v1.0

> 建立日期：2026-06-19  
> 狀態：進行中  
> 用途：紀錄每輪開發遇到的待討論問題、阻擋事件、決策與解決方式。若問題已解決，保留解法與日期。

---

## Open Issues

### IQ-027 - Org settings 必須和 member settings 分離，且 manager 只能 read-only

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-007`
- 背景：
  - `LCH-003` 已把 `/settings` 收斂為 member private preferences。
  - `LCH-007` 仍缺 org-wide settings；若沿用 member settings 或直接回 organization/member 原始資料，會讓 org admin surface 混入私人偏好、客戶明細、provider id 或 report/transcript 內容。
  - Manager 需要檢視通訊處政策與輔導相關設定，但不應能修改 organization-wide policy。
- 解法：
  - 新增 `src/lib/org-settings/org-settings-repository.ts`，使用 `Organization.settings Json?` 建立 safe org settings contract，不動 Prisma schema。
  - 新增 `GET/PATCH /api/org/settings`；GET 允許 OWNER/ADMIN/MANAGER 讀取 safe DTO，PATCH 只允許 OWNER/ADMIN。
  - PATCH 必填 `reason`，寫 `AuditLog(resourceType=ORG_SETTINGS)`；response 不回 provider customer/subscription id。
  - 新增 `/team/settings` surface；manager browser QA 顯示 read-only notice 且 save button disabled。
  - Proof：`pnpm demo:org-settings-qa` 通過；manager GET 200/read-only、manager PATCH 403、owner PATCH 200、AuditLog 0→1、private/client forbidden field names 0、DB seeded client/policy/report sentinels 0。
  - Browser proof：`pnpm demo:org-settings-browser-qa` 通過；desktop/mobile console error 0、無水平 overflow，截圖保存於 `docs/06_audits-and-reports/screenshots/launch-readiness/lch-007/`。

### IQ-026 - Org invites 必須套 collaborator/seat limit 且不得寄真 email

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-007`
- 背景：
  - 個人版允許邀請協作者，但上限由 super admin `PlanConfig.maxCollaborators` 控制。
  - 邀請流程若只靠前端限制，會被繞過；若在 demo/proof 階段寄真 email，會造成外部副作用。
- 解法：
  - 新增 `POST /api/org/invites`，只有 OWNER/ADMIN 可寫，MANAGER 403。
  - Invite input 必填 `reason` 與 `riskAccepted=true`；建立或重送 pending `OrganizationMember(status=INVITED)`。
  - Server-side 套 `PlanConfig.maxCollaborators` / `maxMembers`；pending invite 也計入 usage。
  - Response 只回 masked email，delivery 固定 `not_sent`；本輪不寄真 email。
  - 寫 `AuditLog(resourceType=ORG_INVITE)`，metadata 只含 email hash、masked email、role、unit、limit decision。
  - Proof：`pnpm demo:org-invites-qa` 通過；manager POST 403、owner collaborator invite 201、AuditLog > 0、overflow collaborator 403 `MAX_COLLABORATORS_REACHED`、membership count 不變、response 不回 raw invited email。

### IQ-025 - Org units API 需要支援多層級但必須套 PlanConfig.maxUnits

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-007`
- 背景：
  - 企業方案需要 HQ/region/branch 多層級；org admin surface 需要讀取 unit tree 並建立新單位。
  - 但 unit 建立不得只靠前端限制，必須在 server 端套 `PlanConfig.maxUnits`，且 manager 只能讀 aggregate，不可管理 unit。
- 解法：
  - 新增 `GET /api/org/units`，回 active units、planUsage、permissions 與 unit aggregate counts。
  - 新增 `POST /api/org/units`，僅 OWNER/ADMIN 可用，並驗證 input、parent hierarchy、single HQ rule、slug conflict、`PlanConfig.maxUnits`。
  - Proof：`pnpm demo:org-units-qa` 通過；demo manager GET 200、manager POST 403 `ORG_UNITS_WRITE_FORBIDDEN`；idempotent demo owner POST 因 STARTER `maxUnits=1` 且 activeUnits=2 回 `MAX_UNITS_REACHED`，unit count 2→2。
  - Privacy proof：units response forbidden client/private field names 0、DB seeded client/policy/report sentinels 0。
  - 注意：QA 會 idempotent upsert `demo.owner@asai.local` 與 OWNER membership 作為 demo/test proof account；這是非破壞性 demo seed。

### IQ-024 - Org coaching/AI usage API 只能回 aggregate，不得暴露 AI 原文或 request internals

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-007`
- 背景：
  - Org admin 需要 coaching 與 AI usage surface，回答「誰需要輔導、卡在哪、AI 用量是否異常」。
  - Manager/org admin 不得因此取得 member 客戶明細、report body、SPIN/Theater transcript、AI requestId 或 error 原文。
- 解法：
  - 新增 `GET /api/org/coaching`，只回 completion rate、stuck stage aggregate、theater persona load、member coaching aggregate 與 recommendation focus。
  - 新增 `GET /api/org/ai-usage`，只回 current-month module/provider/member/unit aggregate requests、tokens、estimated cost、average latency 與 module error count。
  - 兩個 route 都使用 `requireOrgAdmin()` 與 `canReadOrgAggregate()`；MANAGER 若有 managed unit scope，會套用 unit scope。
  - Proof：`pnpm demo:org-coaching-ai-usage-qa` 通過；demo manager 兩 API 皆 200、scope role `MANAGER`、aggregate structures 存在、forbidden client/private field names 0、DB seeded client/policy/report/message/AI sentinels 0。
  - Regression proof：`pnpm demo:org-members-qa` 通過，上一輪 org members aggregate contract 未回歸。
  - 注意：dev QA 必須用 `ALLOW_DEV_AUTH_HEADER=true pnpm dev`，未開時 401 是預期 guard。

### IQ-023 - Org members API 需要 member metadata 但不得回客戶明細

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-007`
- 背景：
  - Org admin 需要成員管理 API，提供 member role、seat、unit、last active 與 aggregate metrics。
  - Manager/org admin 不得因此取得 member 的客戶姓名、phone/email、policy number、report body、SPIN/Theater transcript，也不得讀 member private settings。
- 解法：
  - 新增 `GET /api/org/members`，使用 `requireOrgAdmin()` 與 `canReadOrgAggregate()`。
  - Response 只回 member metadata、seat timestamps、primary/managed units 與 aggregate counts。
  - 不回 user email、member settings、client rows、policy/report/SPIN/Theater 明細。
  - Proof：`pnpm demo:org-members-qa` 通過；demo manager 200、scope role `MANAGER`、members/units/totals 存在、forbidden client/private field names 0、DB seeded client/policy/report sentinels 0。
  - Regression proof：`pnpm demo:manager-aggregate-qa` 通過，`/api/org/overview` 與 manager-owned `/api/clients` 未回歸。
  - 注意：dev QA 必須用 `ALLOW_DEV_AUTH_HEADER=true pnpm dev`，未開時 401 是預期 guard。

### IQ-022 - LCH-006 expired token 與完整 browser QA matrix

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-006`
- 背景：
  - LCH-006 已完成 share lookup、client portal session、public pricing、client-login cookie handoff，但仍缺 expired token proof 與 desktop/mobile browser matrix。
  - 上線前必須證明 invalid/expired token 不會讀取報告、不會寫事件、不會建立 client session，也不能進 member workspace。
- 解法：
  - `pnpm share:token-qa` 與 `pnpm client-portal:qa` 會 idempotent upsert `demo-share-wang-expired`，固定 `is_demo=true`、`demo_seed_key=quickstart-insurance-advisor:share:wang:expired:v1`。
  - Share proof：expired GET 404、event POST 404、access count 不增加、ShareEvent 不增加。
  - Client portal proof：expired session POST 404、bootstrap 401、workspace 401。
  - Browser proof：desktop 1440x1000 與 mobile 390x844 覆蓋 authorized share、invalid share、expired share、client login；全部 console error 0、無水平 overflow。
  - `AGENTS.md` / `PLN-017` 已將 LCH-006 QA 與 lint checkbox 標記完成。
  - 剩餘：正式 client-user email/OTP/Auth.js、專用 client portal UI route、ECPay checkout 屬後續 Level 3+ 或 billing workstream，不再阻擋 LCH-006 最小閉環。

### IQ-021 - Client login 需要 token-to-cookie handoff 且不得進 member workspace

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-006`
- 背景：
  - `/client-login` 原本只有入口 skeleton，demo client 無法把 share token 轉成可重用的 client portal session。
  - Client session 必須與 member/org workspace session 隔離，不能因 cookie 存在就進入 `/api/workspace/bootstrap`。
- 解法：
  - 新增 `POST /api/client-portal/session`，驗證 DB `ReportShare` token 後寫入 httpOnly `asai_client_share_token` cookie。
  - 新增 `DELETE /api/client-portal/session` 清除 cookie。
  - `/client-login?token=demo-share-wang` 可預填 token，送出後建立 client session。
  - Proof：`pnpm client-portal:qa` 通過；session POST 200、Set-Cookie 含 HttpOnly/SameSite=Lax、cookie bootstrap 200、cookie 打 `/api/workspace/bootstrap` 401、invalid session token 404、unsafe payload count 0。
  - Browser smoke：`/client-login?token=demo-share-wang` token 預填、主要 CTA 存在、console error 0、無水平 overflow。
  - 2026-06-19 追加完成 expired token proof 與完整 browser QA matrix。
  - 剩餘：正式 client-user email/OTP/Auth.js 長期登入。

### IQ-020 - Public pricing 需要 DB-backed plan capability 且不得誤啟用付款

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-006`
- 背景：
  - 前台 pricing 需要能讀 super admin / DB controlled plan capability，例如 `maxCollaborators`、`maxUnits`、`monthlyAiQuota`。
  - ECPay 尚未完成正式 checkout notification/query proof，不能讓前台 API 暗示可正式收款。
- 解法：
  - 新增 `GET /api/public/pricing`，由 DB `PlanConfig` 產生 public-safe pricing DTO。
  - Response 只包含 plan display、feature、CTA 與 public capabilities；不回 private billing/env/provider payload。
  - `billing.provider=ECPAY` 且 `checkoutEnabled=false`，正式 checkout 仍需後續 ECPay server notification/query proof。
  - Proof：`pnpm public:pricing-qa` 通過；API 200、source=database、四方案能力上限與 DB 一致、private billing/env sentinels 0。

### IQ-019 - Share page 需要 DB-backed token lookup 與正式 tracking

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-006`
- 背景：
  - `/share/[token]` 原本從 client-side report store/local seed 查 token，並 fire-and-forget 呼叫 `/api/mock/track/[token]`。
  - 上一輪已證明 `/api/mock/*` 在 production-like runtime 會被 404 guard 擋住，因此 share tracking 需要正式 DB-backed route。
- 解法：
  - 新增 `GET /api/share/[token]`，只回 client-safe report sections、org/unit branding、CTA、portal scope；不回 internal sections、performance feedback、client PII、policy details。
  - 新增 `POST /api/share/[token]/events`，寫 `ShareEvent`，IP 只存 hash，payload 只保留 section/href/scrollDepth/label/source。
  - `/share/[token]` 改用 BFF fetch，不再依賴 local report store 或 `/api/mock/track`。
  - Proof：`pnpm share:token-qa` 對 `demo-share-wang` 通過；GET 200、invalid token 404、`ReportShare.access_count 0→1`、`ShareEvent 0→1`、unsafe private payload key count `0`。
  - Browser smoke：`/share/demo-share-wang` 顯示授權報告，console error 0，無水平 overflow。
  - 2026-06-19 追加完成 expired token proof 與完整 share/client portal browser QA。

### IQ-018 - Production-like runtime 不得依賴 `/api/mock/*`

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-005`、`LCH-009`
- 背景：
  - `LCH-005` 需要確認 demo/runtime 不會用 mock API 成功冒充正式驗收。
  - `LCH-009` 需要 production-like env 預設關閉 `/api/mock/*`，只保留 dev/test guard。
- 解法：
  - 新增 `pnpm mock:production-guard-qa`，在 production-like server 上實打所有現有 mock route。
  - Proof runtime：`ALLOW_MOCK_API=false pnpm start`。
  - Proof 結果：`/api/mock/ai/assistant`、`/api/mock/ai/spin-outline`、`/api/mock/ai/theater`、`/api/mock/ai/visit`、`/api/mock/track/demo-token` 全部回 `404 mock_api_disabled`。
  - 剩餘：`/share/[token]` 的 fire-and-forget mock tracking 需要在 `LCH-006` 以 `POST /api/share/[token]/events` 取代。

### IQ-017 - Demo manager aggregate-only 權限邊界需要實證

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-005`、`LCH-007`
- 背景：
  - 使用者已決策：org manager 只能看彙總與輔導指標，不看所有 member 的客戶明細。
  - `LCH-005` 需要 demo manager 實際登入/呼叫 API 後，只看到 aggregate/coaching/unit/member health。
  - `LCH-007` 尚缺 org aggregate API 起點。
- 解法：
  - 新增 `GET /api/org/overview`，使用 `requireOrgAdmin()` 與 `canReadOrgAggregate()`，由 server session 推導 org/role/unit scope。
  - Response 只包含 organization summary、scope、totals、coaching、unitHealth、memberHealth。
  - 新增 `pnpm demo:manager-aggregate-qa`，以 `demo.manager@asai.local` 呼叫 BFF，再以 DB demo clients/policies 產生 7 個 forbidden sentinels 檢查 response。
  - Proof 通過：overview 200，回傳 aggregate counts；未洩漏 client name/email/phone/occupation/notes/policy/product，且不含 `email`、`phone`、`annualIncome`、`notes`、`policies`、`familyMembers`、`clientSections`、`internalSections` 等 detail field names。
  - 同步確認 `/api/clients` 在 manager session 下不洩漏其他 member seeded client details。
  - 剩餘：`/api/org/members`、`/api/org/coaching`、`/api/org/ai-usage`、org settings 與 UI proof 仍待 `LCH-007`。

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

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-006`
- 現況：
  - 已有 `getClientSession()` 函式，且不能把 app membership 誤當 client identity。
  - Client portal 需要獨立 token/client-scoped session。
- 解法：
  - 第一版採 token-scoped contract：`getClientSession()` 從 `x-asai-client-token` header 或 `asai_client_share_token` cookie 驗證 DB `ReportShare`，取得 `shareId`、`reportId`、`clientId`、`organizationId`、`unitId`。
  - 新增 `GET /api/client-portal/bootstrap`，只回 client-safe authorized report sections、client display name、branding/portal/CTA/scope。
  - 新增 `POST /api/client-portal/responses`，支援客戶補資料、提問、預約意向，寫入 `InteractionEvent(type=TASK)` 並只保留 safe metadata。
  - Proof：`pnpm client-portal:qa` 通過；missing session 401、client token 打 `/api/workspace/bootstrap` 401、bootstrap 200、response 201、invalid type 400、`InteractionEvent` 0→1、unsafe payload key count 0。
  - 2026-06-19 追加完成 `/client-login` UI/cookie handoff：`POST /api/client-portal/session` 寫 httpOnly cookie，cookie bootstrap 200，cookie 打 member workspace 401。
  - 剩餘：長期 client login 是否採 Auth.js client user、email OTP 或 signed portal token + OTP，留給 Level 3+ 身分設計。

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

### IQ-019 - LCH-005 demo member write 與 AI output refresh proof 缺口

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-005`
- 背景：
  - LCH-005 不只需要讀 seed data，也要證明 demo member 能新增資料、產生 AI output，且刷新/重讀後仍存在。
- 解法：
  - 新增 `pnpm demo:member-write-qa`。
  - API proof：`POST /api/clients` 201，created client `cmqjwzrem0004ai619szx7z9p`。
  - Refresh proof：`GET /api/clients/[id]` 200，created client survives reread，`kycStatus=MISSING`。
  - AI output proof：`POST /api/ai/interview/outputs` 200，回傳 known facts、prep questions、issue readiness。
  - DB proof：created client count `1`；client-linked `InteractionEvent(type=VISIT)` count `1`；`INTERVIEW AiUsageLog 1→2`；`monthlyAiUsed 1→2`。
  - 剩餘：demo manager aggregate-only、demo client portal、mock API production-like guard、正式 Supabase/Auth.js login。

### IQ-018 - LCH-005 缺清空 browser storage 後的 demo relogin QA

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-005`
- 背景：
  - LCH-005 需要證明體驗帳號資料來自 DB seed，不依賴 browser localStorage。
  - 先前沒有可重跑的 browser QA script。
- 解法：
  - 新增 `pnpm demo:relogin-qa`，用 Playwright 新 context、demo auth header，清空 local/session storage 後巡檢主要 demo surfaces。
  - `pnpm demo:preflight` 通過。
  - `pnpm demo:seed:reset` 通過，重建 `quickstart-insurance-advisor` demo scenario。
  - `pnpm demo:relogin-qa` 通過：`/crm`、`/crm/c_wang`、`/pre-visit`、`/reports`、`/spin` 看到 `王大明`，`/theater` 看到 `AI 劇場演練`。
  - 截圖保存於 `docs/06_audits-and-reports/screenshots/launch-readiness/lch-005/`。
  - 剩餘：正式 Supabase/Auth.js login、demo manager aggregate-only、demo client portal、demo member AI output refresh proof。

### IQ-017 - LCH-004 三 AI provider error-path 尚未實證

- 狀態：Resolved
- 發現日期：2026-06-19
- 解決日期：2026-06-19
- 影響 batch：`LCH-004`
- 背景：
  - Chat、Interview、Theater 都已有 success path `AiUsageLog` proof，但 provider/key/runtime error 是否確實落 `AiUsageLog.error` 尚未實證。
  - `/api/ai/interview` 在 OpenAI stream 建立前失敗時，outer catch 原本沒有呼叫 `persistInterviewFailure()`。
- 解法：
  - 補 `/api/ai/interview` outer catch failure logging。
  - 以測試用無效 OpenAI key 啟動 dev server，呼叫 `/api/ai/chat`、`/api/ai/interview`、`/api/ai/theater`。
  - API proof：三條 route 皆回 500。
  - DB proof：`AiUsageLog.error` deltas `CHAT +1`、`INTERVIEW +1`、`THEATER +1`，latest logs 皆帶 `model=gpt-4o-mini`。
  - 剩餘：UI error state proof、Route B 新版 Theater 與 quota UI 全頁 proof。

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
