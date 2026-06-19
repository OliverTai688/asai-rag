# 誠問 AI Launch Readiness Gap Research v1.0

> 建立日期：2026-06-18  
> 更新日期：2026-06-19  
> 狀態：研究定稿，可轉成 `PLN` batch tasks  
> 問題：目前開發狀態是否可直接上線？距離「至少三個 AI 可正常使用、資料可正常新增、可提供體驗帳號」還差什麼？

---

## 1. 結論

目前**不建議直接正式上線給外部真實用戶**。

比較準確的判斷是：誠問 AI 已經接近「可受控展示 / staging demo」階段，但還不是「可公開註冊、可收費、可讓顧問放真實客戶資料」的 production 階段。

若上線目標降為「受控體驗帳號 + demo data + 3 個 AI 模組可跑 + 不承諾正式資料服務」，可以在較短時間內收斂；若目標是「真實客戶資料、跨裝置保存、多人/企業權限、可收費」，仍需補完 auth、資料 API、AI usage/quota、demo relogin QA、權限隔離與監控。

---

## 2. 目前可用與不可用的事實

### 2.1 已具備

- Next.js app、dashboard UI、AI-first sidebar、modern UI 多數頁面已完成。
- Prisma schema 已有多租戶核心模型：`Organization`、`User`、`OrganizationMember`、`Client`、`VisitPlan`、`SpinSession`、`TheaterSession`、`Report`、`ReportShare`、`AiUsageLog`。
- `pnpm prisma db push --accept-data-loss`、`pnpm demo:preflight`、`pnpm demo:seed:reset` 曾通過，DB seed foundation 已可用。
- demo seed 已建立 `demo_org_asai_personal` 與 member/manager/collaborator/client 等 demo users 的 DB records。
- `Interview` AI route 已補 `AiUsageLog`，並用 `demo_org_asai_personal` 驗證 `/api/ai/interview/outputs` 成功回 200，`AiUsageLog` count 2 -> 3。
- `pnpm lint:changed`、`pnpm exec tsc --noEmit --pretty false`、`pnpm prisma:validate` 最近一次通過。

### 2.2 仍不可直接正式上線的原因

- 尚未有正式 auth/session guard：`/login`、`/signup` 等 surface 有骨架，但還沒有完整 Supabase Auth session、middleware、role guard。
- 多數業務資料的 runtime 仍由前端 Zustand/store 驅動，缺少正式 `/api/clients`、`/api/visit-plans`、`/api/spin-sessions`、`/api/theater-sessions`、`/api/reports` CRUD。
- 清空 browser storage 後，用 demo account 重新登入仍看到完整 DB-backed 範例資料這項尚未驗收。
- 現有多數 OpenAI routes 尚未寫 `AiUsageLog`，與 hard rule #4 不一致。
- AI quota / rate limit 尚未落地；公開使用會有成本暴衝風險。
- Theater 正處於 Route B 決策後、尚未 migration 的狀態；舊版 Theater 可跑，但不是已決策的新產品型態。
- Org admin / super admin 的權限隔離、impersonation audit、ECPay billing 仍未閉環。
- 尚未有 production monitoring、error tracking、backup/rollback playbook、法律文件與 AI 免責上線檢查。

---

## 3. 三個 AI 最小上線判斷

產品導覽已把三個核心 AI 定為：

1. `問誠問 AI`：全域助理 / 導航 / 工作副駕駛
2. `AI 了解客戶`：訪談/顧問陪談，未來取代或包住 SPIN
3. `AI 劇場演練`：情境演練、多角色 NPC、回饋

### 3.1 問誠問 AI

現況：
- `/api/ai/chat` 會呼叫 OpenAI streaming。
- 可以根據頁面 context 回應並輸出 tool commands。

缺口：
- 沒有 `AiUsageLog`。
- 沒有 auth/org context。
- 沒有從 DB 拉取真實客戶/任務/報告脈絡。
- 沒有 conversation persistence 到 `AssistantConversation` / `AssistantMessage`。

MVP 上線條件：
- request body 必帶 `organizationId` / `userId`，由 session 取得，不信任前端自由傳入。
- 每次 OpenAI call 寫 `AiUsageLog`。
- 對話紀錄寫 DB，至少保存最近 N 則。
- tool commands 有 allowlist，不允許任意路徑或危險操作。
- quota 超限回 429，UI 顯示升級或稍後再試。

### 3.2 AI 了解客戶

現況：
- `/api/ai/interview` streaming route 已建立。
- `/api/ai/interview/outputs` 已可產出客戶輪廓表、對話準備卡、SPIN/PQ 候選、Issue Readiness、合規提醒。
- 成功與錯誤路徑已有 `AiUsageLog`，且已驗證 DB 實際寫入。

缺口：
- `/interview` 頁面按鈕層成功生成仍需 Browser QA 截圖與 console 驗證。
- `InterviewSession` 尚未 DB persistence；目前 M1 是 pure TS/store foundation。
- 客戶資料模式與確認卡寫回尚未完成。
- 真實客戶高敏感資料 reason/risk consent 尚未落地。

MVP 上線條件：
- 至少支援獨立模式 DB persistence：session、answers、materials、output draft。
- 生成準備卡可保存、編輯、重新開啟。
- fact / inference / unknown 顯示與寫回規則清楚。
- 高敏感客戶只在 owner reason + risk consent 後可用。

### 3.3 AI 劇場演練

現況：
- `/api/ai/theater` 與 `/api/ai/theater/score` 可呼叫 OpenAI。
- 舊 Theater UI/flow 已有，但仍是 legacy persona/tension/score 型態。

缺口：
- 沒有 `AiUsageLog`。
- session/turns 沒有正式 DB-backed runtime。
- 已決策新版 Theater Route B：Big Five + 多角色 + 旁白 NPC + 群/私聊 + 五視角質化回饋，尚未 migration。
- 舊版 scoring JSON 不符合新版「不打分、五視角質化回饋」方向。

MVP 上線條件：
- 若要符合新產品承諾，必須先完成 ITA-003/ITA-004 的 Route B 最小版。
- Theater session、turns、feedback 寫 DB。
- 每次 director/character/feedback AI call 寫 `AiUsageLog`。
- 旁白 NPC 只詢問缺口，不杜撰 facts；使用者補充需標 `fact/inference/unknown`。
- Org manager 只看匯總與輔導指標，不看逐字稿與客戶明細。

---

## 4. 資料新增最小上線範圍

若要讓體驗帳號「像真的產品」，至少要讓下列資料能新增、保存、重新登入後仍存在：

| 資料 | 最小 API | 為什麼必要 | 上線狀態 |
| --- | --- | --- | --- |
| Client | `/api/clients` | CRM 是所有 AI 的資料源 | 未完成 |
| FamilyMember / Policy / ComplianceChecklist | `/api/clients/[id]/...` | 保險情境與合規欄位 | 未完成 |
| InterviewSession | `/api/interview-sessions` | 顧問陪談產出要可回看 | 未完成 |
| TheaterSession / TheaterTurn | `/api/theater-sessions` | 劇場演練要可保存與輔導 | 未完成 |
| VisitPlan | `/api/visit-plans` | 準備包要可帶去拜訪 | 未完成 |
| Report / ReportShare | `/api/reports`、`/api/share` | 對外分享與追蹤 | 未完成 |
| MemberSettings | `/api/member/settings` | 顧問個人資料、通知、AI 偏好、個人整合與預設 workspace | 未完成 |
| OrgSettings | `/api/org/settings` | 通訊處/企業 members、unit、branding、client portal、AI quota、合規預設 | 未完成 |
| AiUsageLog | route 內部寫入 | 成本、quota、稽核 | Interview 已部分完成，其餘未完成 |

最小原則：
- Zustand 只作 UI cache，不作 business source of truth。
- `src/domains/*/mocks.ts` 只能當 seed fixture，不可被 production runtime import。
- 每筆 business record 都必須有 `organizationId`。
- Org manager 查詢只能走 aggregate endpoint，不能重用 member detail endpoint。
- Member settings 與 org settings 必須分離：`/settings` 不可改 org-wide policy，`/org/settings` 不可讀 member private preferences。

---

## 5. 體驗帳號最小上線範圍

### 5.1 可以提供的體驗帳號層級

建議先提供三種：

1. `demo.member@...`：顧問視角，可看 demo 客戶、跑三個 AI、建立資料。
2. `demo.manager@...`：通訊處主管視角，只看匯總與輔導指標。
3. `demo.client@...`：客戶入口視角，只看被分享的報告/準備資料。

Super admin staging account 可保留內部測試，不建議給外部體驗。

### 5.2 體驗帳號必須通過的 QA

- 清空 browser storage。
- 使用 demo member 登入。
- 客戶、保單、訪前準備、SPIN/Interview、Theater、Report 都從 DB 出現。
- 新增一筆客戶，刷新頁面仍存在。
- 生成一次 AI 了解客戶輸出，刷新頁面仍存在。
- 生成一次 Theater 演練，刷新頁面仍存在。
- 分享報告 token 可開啟，並寫入 share event。
- demo manager 登入時只看到 aggregate，不看到 member 客戶明細。
- demo client 登入時不能進 dashboard。

---

## 6. 上線分級建議

### Level 0：本機/內部展示

可以做到：
- 使用 seeded demo data。
- 由內部人員用固定環境展示。
- OpenAI key 可用，部分 AI 可跑。

不應宣稱：
- 不可宣稱正式帳號系統完成。
- 不可宣稱資料已完整 DB-backed。
- 不可讓外部輸入真實客戶資料。

### Level 1：受控 Staging Demo

最低條件：
- Supabase Auth 可登入。
- demo member account 可完整看到 DB seed data。
- 至少三個 AI route 可跑且寫 `AiUsageLog`。
- 新增 client / visit plan / interview output / theater session 可保存。
- mock API 在 production-like env 關閉。
- staging access 有密碼或 allowlist。

這是目前最合理的下一個上線目標。

### Level 2：Private Beta

最低條件：
- 真實 user/org onboarding。
- 每個 org 資料隔離。
- AI quota / rate limit。
- 基礎 audit log。
- 錯誤監控與備份。
- 隱私政策、服務條款、AI 免責。
- Org manager aggregate-only 已驗證。

### Level 3：正式公開上線

最低條件：
- Billing/ECPay test/full flow 完成。
- Super admin + impersonation audit。
- 資安/個資/合規 review。
- Production migration/rollback plan。
- 客服與 incident response 流程。

---

## 7. 最小可上線 Batch Plan

### Batch LCH-001 - Launch Truth Audit

- [ ] 用目前程式重跑 `pnpm lint:changed`、`pnpm exec tsc --noEmit --pretty false`、`pnpm prisma:validate`。
- [ ] 重跑 `pnpm demo:preflight`、`pnpm demo:seed:reset`、`pnpm demo:runtime-audit`。
- [ ] 建立三 AI route 實測紀錄：assistant、interview、theater。
- [ ] 建立資料新增實測紀錄：client、visit plan、interview output、theater session、report share。

### Batch LCH-002 - Auth + Demo Account Gate

- [ ] 完成 Supabase Auth client/server/middleware。
- [ ] demo member / manager / client 可登入。
- [ ] route guard 分開 dashboard、client portal、super admin。
- [ ] 清空 browser storage 後重新登入仍看到 DB demo data。
- [ ] staging access 由 operator 提供 cookie/password/allowlist。

### Batch LCH-003 - Three AI Production Minimum

- [ ] `/api/ai/chat` 寫 `AiUsageLog`、綁 session org/user、保存 conversation。
- [ ] `/api/ai/interview` 與 `/outputs` 保存 session/material/output draft。
- [ ] Theater Route B 最小版完成，或明確標示 legacy theater 僅供 demo，不作正式新產品承諾。
- [ ] 三個 AI 都有 quota/rate limit。
- [ ] 三個 AI 都有 success/error Browser QA。

### Batch LCH-004 - DB-backed CRUD Minimum

- [ ] `/api/clients` CRUD。
- [ ] `/api/visit-plans` CRUD。
- [ ] `/api/interview-sessions` CRUD。
- [ ] `/api/theater-sessions` CRUD。
- [ ] `/api/reports` + `/api/report-shares`。
- [ ] `/api/member/settings`：member 個人設定與 workspace preferences。
- [ ] `/api/org/settings`：org-wide settings，含 members/unit/branding/client portal/quota/compliance defaults。
- [ ] Zustand 改為 cache-first，不再當資料真相源。

### Batch LCH-005 - Demo Experience QA

- [ ] demo member 完成「新增客戶 -> 訪談 -> 劇場 -> 報告分享」路徑。
- [ ] demo manager 完成 aggregate-only QA。
- [ ] demo client 完成 client portal/share page QA。
- [ ] mobile/desktop smoke test。
- [ ] console error、horizontal overflow、unhandled API error 都為 0。

### Batch LCH-006 - Production Readiness

- [ ] Sentry 或等價錯誤監控。
- [ ] DB backup/restore 與 migration rollback note。
- [ ] OpenAI cost alert。
- [ ] Privacy / Terms / AI disclaimer。
- [ ] ECPay test flow；正式收費開關預設關閉。

---

## 8. Operator 手動事項

- 提供 Supabase Auth 正式 env：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。
- 確認 staging domain / callback URL。
- 提供 staging access policy：密碼、cookie、basic auth 或 IP allowlist。
- 提供 ECPay 測試 MerchantID / HashKey / HashIV / callback domain。
- 決定三 AI MVP 是否以「Assistant + Interview + Theater Route B」為準；若 Theater Route B 來不及，需明確允許 legacy Theater 只作 demo。
- 決定體驗帳號是否可使用真 OpenAI quota，或需要限制 demo account 每日上限。

---

## 9. 風險摘要

最高風險不是 UI，而是資料與權限：

- 若沒有 auth/route guard，上線後任何人可能直接進 dashboard/admin。
- 若沒有 DB-backed CRUD，使用者資料會因清快取或換裝置消失。
- 若沒有 `AiUsageLog`/quota，OpenAI 成本不可控且違反本 repo hard rule。
- 若 manager endpoint 沒切 aggregate-only，會違反已決策的 org admin 可見性邊界。
- 若 Theater Route B 沒做 migration note，會讓舊版 score/tension 與新版五視角產品承諾衝突。

---

## 10. 建議

下一步不要直接衝 production。建議以 **Level 1：受控 Staging Demo** 為最近目標，先讓三個 AI、DB 新增、demo account 形成閉環。完成後再進 Private Beta。

最小成功定義：

> 一個 demo member 清空 browser storage 後登入，仍可看到 DB seed data；新增客戶後刷新仍存在；能使用問誠問 AI、AI 了解客戶、AI 劇場演練三個 AI；每次 AI 呼叫都寫 `AiUsageLog`；demo manager 只能看匯總；demo client 只能看自己的分享頁。
