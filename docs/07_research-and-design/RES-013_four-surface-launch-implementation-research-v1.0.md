# 誠問 AI Four-surface Launch Implementation Research v1.0

> 建立日期：2026-06-18  
> 更新日期：2026-06-19  
> 狀態：研究定稿，可轉成 `PLN` batch tasks  
> 前置文件：`RES-012_launch-readiness-gap-research-v1.0.md`、`ARC-006_role-permission-route-architecture-v1.0.md`、`ACC-005_cross-surface-responsibility-matrix-v1.0.md`  
> 問題：若以 front office、member admin、org admin、super admin 四種介面思考，剛剛的上線缺口落到實作時要怎麼做？

---

## 1. 結論

上線缺口不能用「補幾個頁面」處理。真正要落地的是四個 surface 的邊界：

1. Front office：公開頁、購買流程、分享頁、客戶登入。重點是 public/token/client session，不可進入內部資料。
2. Member admin：顧問自己的工作台。重點是 own/assigned business records，可新增、可用 AI、可保存，並有 member settings 管理個人/工作區偏好。
3. Org admin：通訊處/企業主管台。重點是 aggregate/coaching/unit scope，不看 member 客戶明細，並有 org settings 管理 organization 層級設定。
4. Super admin：平台營運後台。重點是 tenant、plan、billing、AI cost、audit、impersonation，不預設看敏感內容。

實作上應採「同一資料模型，不同 API 邊界」：

- Member admin 使用 detail APIs。
- Org admin 使用 aggregate APIs。
- Front office 使用 token/client-scoped APIs。
- Super admin 使用 platform APIs，敏感讀取需 audit/break-glass。

最近可行目標仍是 `RES-012` 定義的 Level 1 受控 Staging Demo：三個 AI 可跑、可新增資料、demo account 可登入並從 DB 讀取、每次 AI call 寫 `AiUsageLog`。

---

## 2. 四個 Surface 的最小上線定義

| Surface | 使用者 | 入口 | 最小上線能力 | 不可做 |
| --- | --- | --- | --- | --- |
| Front office | 未登入訪客、報告收件客戶、client user | `/`、`/pricing`、`/share/[token]`、`/client-login` | 看介紹/方案、開報告分享、client login 後看授權資料、顯示 org/unit branding | 不可進 dashboard、不可看內部 CRM、不可看團隊績效 |
| Member admin | 顧問、個人版 owner、collaborator | `/dashboard`、`/crm`、`/interview`、`/theater`、`/reports`、`/settings` | 新增客戶、跑三個 AI、建立訪前準備、報告分享、看自己的 usage、管理 member settings | 不可看其他 member 客戶明細，除非有明確授權；不可改 organization-wide policy |
| Org admin | org owner/admin/manager | `/team` 或未來 `/org`、`/org/settings` | 看 unit/member aggregate、coaching queue、seat/invite、AI usage、準備/演練覆蓋率、管理 org settings | 不可看客戶姓名、保單明細、SPIN/Theater 逐字稿；manager 不可越權改 plan/billing |
| Super admin | platform super admin/support/finance | `/super-admin` | 管 tenant、plan config、billing、AI cost、support/audit、impersonation | 不可無 reason 讀敏感內容；不可無 audit impersonate |

### 2.1 Settings 分層原則

`member settings` 與 `org settings` 必須分離。

| 設定頁 | 建議 route | 設定範圍 | 角色 |
| --- | --- | --- | --- |
| Member settings | `/settings` | 個人資料、通知、AI 偏好、個人整合、自己的預設工作區、個人版 collaborator 入口 | member/collaborator/owner |
| Org settings | `/org/settings` 或 `/team/settings` | organization profile、unit tree、members/seats、roles/invites、branding、client portal、share branding、AI quota、合規設定、billing visibility | owner/admin；manager 只可看或操作授權範圍 |
| Super admin settings | `/super-admin/settings` 或 platform settings section | 全平台 plan config、billing provider、feature flags、support policy、impersonation policy | platform super admin/support/finance by permission |

拆分理由：

- `/settings` 不應讓一般 member 誤改 organization-wide branding、quota、billing 或 unit policy。
- `/org/settings` 不應顯示 member 的個人通知、個人 AI 偏好或私人整合 token。
- Personal plan 的 owner 可能同時是 member 與 org owner；UI 可導向同一人，但 API policy 仍要分層。

---

## 3. 實作總原則

### 3.1 不信任前端傳入的 scope

API 可以接受 `clientId`、`reportId`、`token`，但 `organizationId`、`userId`、role、unit scope 必須由 server session 推導。

錯誤示範：

```text
POST /api/clients { organizationId: "..." }
```

正確方向：

```text
session -> currentUser -> currentMembership -> organizationId/unit scope -> policy check -> write
```

### 3.2 用 API 邊界切權限，不用 UI 隱藏切權限

- Member detail API 回傳客戶明細。
- Org aggregate API 只回傳彙總。
- Super admin support API 預設只回傳 tenant metadata。
- Break-glass API 才能回傳敏感內容，且必須寫 audit。

### 3.3 Store 只做 cache/UI state

Zustand store 不再是 business source of truth。它只能保存：

- sidebar open/collapsed
- current filter/tab/sort
- local draft before submit
- optimistic cache with server sync

客戶、訪談、劇場、報告、分享、AI usage 的真相源都必須是 DB。

---

## 4. Route 與 Guard 實作藍圖

### 4.1 Route grouping

建議逐步整理為下列邊界。現有 route 可先不大搬家，但 guard 與 API 必須先照這個邊界做。

| Surface | 現有/目標 route | Session guard | Default redirect |
| --- | --- | --- | --- |
| Marketing | `/`、`/pricing` | public | 已登入 app user 可導 `/dashboard` |
| Share token | `/share/[token]` | token guard | invalid token -> safe error |
| Client auth/portal | `/client-login`、future `/client` | client session | no session -> `/client-login` |
| Member admin | current `(dashboard)` routes including `/settings` | app session + membership | no session -> `/login` |
| Org admin | current `/team` 或 future `/org` / `/org/settings` | app session + owner/admin/manager | no role -> `/dashboard` |
| Super admin | `/super-admin` | platform session + platform role | no platform session -> `/super-admin/login` |

### 4.2 Guard helpers

建議建立 shared server helpers：

```text
src/lib/auth/session.ts
  getAppSession()
  getClientSession()
  getPlatformSession()

src/lib/auth/current-workspace.ts
  requireCurrentMember()
  requireOrgAdmin()
  requirePlatformUser()
  requireClientPortalUser()

src/lib/auth/policies.ts
  canReadClientDetail()
  canWriteClient()
  canReadOrgAggregate()
  canUseAiModule()
  canBreakGlass()
```

上線前最小要求：

- `/dashboard/*` 無 app session 不能進。
- `/team` 需要 owner/admin/manager，但 query 只能 aggregate。
- `/settings` 只能改 current user/member-scoped preferences；若要改 org-wide settings，必須轉 `/org/settings` 並重新跑 org admin policy。
- `/org/settings` 需要 owner/admin；manager 只能進入 read-only 或 scoped subsections，例如 coaching/unit scope，不可改 billing/plan。
- `/super-admin/*` 不接受一般 app session。
- `/share/[token]` 不建立 app 權限，只給 token scope。

---

## 5. API 邊界設計

### 5.1 Member admin APIs

Member admin 是「可新增與操作」的主介面。

| API | 用途 | 權限 |
| --- | --- | --- |
| `GET /api/workspace/bootstrap` | 登入後載入 workspace、role、plan、quota、feature flags | app session |
| `GET/POST /api/clients` | 客戶列表、新增客戶 | member own/assigned |
| `GET/PATCH /api/clients/[id]` | 客戶詳情更新 | owner/assigned/admin policy |
| `POST /api/clients/[id]/policies` | 新增保單 | same client policy |
| `POST /api/visit-plans` | 建立準備包 | member |
| `POST /api/interview-sessions` | 建立訪談 session | member |
| `POST /api/theater-sessions` | 建立劇場 session | member |
| `POST /api/reports` | 建立報告 | member |
| `POST /api/report-shares` | 建立分享 token | report owner |
| `GET/PATCH /api/member/settings` | 個人設定、AI 偏好、通知、預設 workspace | current member |
| `GET /api/member/usage` | 個人 AI usage 與 quota 摘要 | current member |

實作注意：

- `Client` 寫入時不得省略合規欄位：`complianceChecklist`、`sensitivityLevel` / `sensitivity`、`kycStatus` 對應 contract 要保留。
- `ownerId` 預設 current user。
- `organizationId` 來自 membership。
- `unitId` 來自 member primary unit 或 request 選擇後 server 驗證。

### 5.2 Org admin APIs

Org admin 是「看彙總與輔導」的介面，不應重用 member detail API。

| API | 用途 | 回傳內容 |
| --- | --- | --- |
| `GET /api/org/overview` | 首頁摘要 | unit/member health、今日輔導隊列、usage summary |
| `GET /api/org/members` | 成員管理 | member metadata、role、seat、unit、last active |
| `GET /api/org/coaching` | 輔導指標 | 完成率、卡關階段、常見異議、訓練建議 |
| `GET /api/org/ai-usage` | AI 用量 | module/member/unit aggregate |
| `POST /api/org/invites` | 邀請成員 | server-side plan limit check |
| `GET/POST /api/org/units` | unit tree | HQ/region/branch metadata |
| `GET/PATCH /api/org/settings` | organization profile、branding、client portal、compliance defaults | owner/admin；manager scoped read-only |
| `GET/PATCH /api/org/billing-settings` | billing contact、invoice metadata、plan capability view | owner/admin；finance if later added |

Org admin response 禁止欄位：

- client name
- phone/email
- policy number
- report body
- SPIN transcript
- Theater transcript/private chat

若真的需要稽核抽查，應另走 super admin 或 owner break-glass flow。

Org settings response 禁止把 member private settings 混入，例如個人通知、個人 OAuth token、個人 AI prompt preference。

### 5.3 Front office APIs

Front office 是 public/token/client-scoped。

| API | 用途 | 權限 |
| --- | --- | --- |
| `GET /api/public/pricing` | 讀方案與能力 | public |
| `POST /api/checkout/ecpay` | 建立綠界訂單 | app session 或 signup pending session |
| `GET /api/share/[token]` | 讀分享報告 | token scope |
| `POST /api/share/[token]/events` | 寫分享事件 | token scope |
| `GET /api/client-portal/bootstrap` | client portal 首頁 | client session |
| `POST /api/client-portal/responses` | 客戶補資料/回覆 | client session + authorized client |

分享頁實作規則：

- token lookup 只回 client-safe sections。
- org/unit branding 可顯示。
- compliance disclaimer 必須可見。
- tracking event 要 hash IP/user-agent，不存裸敏感資訊。

### 5.4 Super admin APIs

Super admin 是平台營運，不是「萬能明細後門」。

| API | 用途 | 必要 audit |
| --- | --- | --- |
| `GET /api/platform/organizations` | tenant list / health | low |
| `GET /api/platform/organizations/[id]` | tenant summary | low/medium |
| `PATCH /api/platform/plan-configs/[plan]` | 改方案能力 | `PLAN_UPDATE` |
| `GET /api/platform/ai-usage` | 跨租戶 AI cost | low |
| `POST /api/platform/impersonation` | 開始 impersonation | `IMPERSONATION_START` + reason + expiry |
| `POST /api/platform/break-glass` | 查敏感內容 | `BREAK_GLASS` + reason |
| `GET /api/platform/audit-logs` | 稽核查詢 | low/medium |
| `GET/POST /api/platform/billing/reconcile` | 綠界 reconciliation | `BILLING_UPDATE` |
| `GET/PATCH /api/platform/settings` | platform feature flags、provider policy、support policy | `SUPPORT_NOTE` 或 `PLAN_UPDATE` by field |

實作注意：

- platform session 必須獨立於 app session。
- support role 預設不能改 billing/plan。
- impersonation session 必須有 scope、expiresAt、endedAt。
- 被 impersonate 的操作需帶 `impersonationSessionId` 寫 audit。

---

## 6. 三個 AI 的四面實作方式

### 6.1 問誠問 AI

| Surface | 實作 |
| --- | --- |
| Front office | 不提供完整助理；最多 public FAQ 或 pricing assistant，不讀內部資料 |
| Member admin | 可用全域 assistant，讀 current route + own/assigned data summary |
| Org admin | 可問團隊彙總、coaching、AI usage，但不能展開客戶明細 |
| Super admin | 可問 tenant health、billing、error、AI cost，不讀敏感業務內容 |

API 實作：

- `/api/ai/chat` 改為 session-scoped。
- 建立 `AssistantConversation`、`AssistantMessage` persistence。
- tool commands allowlist by surface。
- 寫 `AiUsageLog`。
- AI context builder 按 surface 產生不同資料摘要。
- Member settings 可控制個人 AI 偏好，例如語氣、預設客戶摘要粒度；org settings 可控制 organization-wide AI quota、可用模組與合規提醒強度。兩者衝突時，以 org policy 為上限。

### 6.2 AI 顧問陪談

| Surface | 實作 |
| --- | --- |
| Front office | 不直接開放；client portal 只可回答補資料問題 |
| Member admin | 建立/保存 `InterviewSession`、answers、materials、output draft |
| Org admin | 只看 Issue Readiness aggregate、訓練缺口、使用量 |
| Super admin | 看用量/錯誤；敏感內容需 break-glass |

API 實作：

- 新增 DB models 或用 existing extensible table 承接 `InterviewSession`。若新增 schema，需 `prisma:validate`、`prisma:generate`、migration note。
- `/api/ai/interview` streaming route 保留，但 session/org/user 由 server guard 注入。
- `/api/ai/interview/outputs` output draft 寫 DB。
- fact/inference/unknown 必須在 output schema 中可追蹤。
- 高敏感客戶需 reason + risk consent。

### 6.3 AI 劇場演練

| Surface | 實作 |
| --- | --- |
| Front office | 不開放演練；只可能看到正式報告輸出 |
| Member admin | 建立 Theater Route B session，多角色、旁白 NPC、群/私聊、五視角回饋 |
| Org admin | 看演練完成率、常見異議、coaching queue，不看逐字稿 |
| Super admin | 看用量/錯誤/audit；必要時 break-glass |

API 實作：

- 完成 Theater Route B schema/migration：characters、turns、visibility scope、feedback。
- 取消新版主流程對 legacy tension/score 的依賴。
- 旁白 NPC 只在缺資料時提問，使用者可略過或補充，補充內容標 `fact/inference/unknown`。
- 每次 director/character/feedback call 都寫 `AiUsageLog`。
- Org admin aggregate 從 metadata/feedback summary 產生，不讀 transcript。

---

## 7. Demo Account 實作方式

### 7.1 Seed 與 Auth 對接

目前 seed 已建立 DB users，例如：

- `demo_user_member`
- `demo_user_manager`
- `demo_user_collaborator`
- `demo_user_client`
- organization `demo_org_asai_personal`

下一步需要把這些 DB users 連到 Supabase Auth：

```text
Supabase auth user id
  -> users.supabase_auth_id
  -> organization_members
  -> current workspace
```

### 7.2 Demo relogin QA

受控 staging demo 必須通過：

1. 清空 browser storage。
2. 用 demo member 登入。
3. `/api/workspace/bootstrap` 回 `demo_org_asai_personal`。
4. 客戶、訪前、訪談、劇場、報告從 DB 讀取。
5. 新增一筆 client，刷新後仍存在。
6. 跑三個 AI，`AiUsageLog` 增加。
7. demo manager 登入，只看到 aggregate。
8. demo client 登入，只看到 authorized share/client portal。

---

## 8. 資料新增流程的實作切法

### 8.1 新增客戶

```text
Member UI
  -> POST /api/clients
  -> requireCurrentMember()
  -> validate plan/status
  -> create Client + ComplianceChecklist
  -> return client detail
  -> store cache update
```

必要欄位：

- name
- status
- sensitivity
- `ComplianceChecklist.kycStatus`
- `ComplianceChecklist.missingItems`
- organizationId from session
- ownerId from session

### 8.2 建立訪談準備

```text
Member UI
  -> POST /api/interview-sessions
  -> optional clientId policy check
  -> create session
  -> /api/ai/interview stream
  -> save answers/materials
  -> /api/ai/interview/outputs
  -> save output draft
```

### 8.3 建立劇場演練

```text
Member UI
  -> POST /api/theater-sessions
  -> choose independent/client-context
  -> if sensitive client: reason + consent
  -> director call
  -> character calls
  -> save turns/visibility
  -> feedback calls
  -> save qualitative feedback
```

### 8.4 建立報告與分享

```text
Member UI
  -> POST /api/reports
  -> create internal/client sections
  -> POST /api/report-shares
  -> token
  -> /share/[token]
  -> GET /api/share/[token]
  -> POST /api/share/[token]/events
```

---

## 9. 實作順序建議

### Slice 1 - Session and workspace foundation

- Supabase Auth env。
- `getAppSession()`、`requireCurrentMember()`。
- `/api/workspace/bootstrap`。
- dashboard guard。
- demo member relogin。

完成後才能正式做 DB-backed runtime。

### Slice 2 - Member CRUD foundation

- `/api/clients`。
- `/api/visit-plans`。
- `/api/member/settings`。
- store 改 cache-first。
- 清 localStorage 後可讀 DB。

這是「資料能正常新增」的最小垂直切片。

### Slice 3 - Three AI production minimum

- `/api/ai/chat` 加 session scope、conversation DB、`AiUsageLog`。
- `/api/ai/interview` 保存 session/material/output。
- Theater Route B 最小版或明確 legacy demo gate。
- quota/rate limit。

這是「至少三個 AI 正常運作」的最小垂直切片。

### Slice 4 - Front office/client portal

- DB-backed share lookup。
- share events。
- client login bootstrap。
- client-safe report sections。
- org/unit branding。

這是「對外體驗」的最小垂直切片。

### Slice 5 - Org admin aggregate

- `/api/org/overview`。
- `/api/org/coaching`。
- `/api/org/ai-usage`。
- `/api/org/members`。
- `/api/org/settings`。
- unit scope filter。

這是「企業/通訊處可用」的最小垂直切片。

### Slice 6 - Super admin and production controls

- platform session。
- audit log middleware/helper。
- impersonation。
- plan config editor。
- AI cost monitor。
- ECPay reconciliation。

這是「正式上線營運」的最小垂直切片。

---

## 10. 驗收矩陣

| 驗收 | Front office | Member admin | Org admin | Super admin |
| --- | --- | --- | --- | --- |
| 未登入不可進內部 | share/pricing 可看 | dashboard redirect login | org redirect login | platform redirect login |
| Demo account | client sees share only | member sees DB seed and can add | manager sees aggregate only | staging-only |
| 客戶資料 | client-safe only | detail CRUD | aggregate only | break-glass only |
| 三 AI | no internal AI | assistant/interview/theater | aggregate assistant only | cost/support assistant only |
| AiUsageLog | no cost visible | own usage summary | unit/member aggregate | cross-tenant aggregate |
| 分享 | token/client scope | create/revoke token | aggregate share metrics | audit/share errors |
| 敏感資料 | no internal | reason/consent for high sensitivity | no detail | audited break-glass |
| Settings | client-facing preferences only if portal exists | `/settings` edits personal/member preferences only | `/org/settings` edits org profile, units, branding, members, quota within role | platform settings with audit |

---

## 11. 需要新增或調整的文件/計畫

已建立 `PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`，把本研究切成可執行 batch：

- LCH-001 session/workspace foundation
- LCH-002 DB-backed client CRUD
- LCH-003 member settings and workspace preferences
- LCH-004 three AI production minimum
- LCH-005 demo account relogin QA
- LCH-006 front office/share/client portal
- LCH-007 org admin aggregate and org settings APIs
- LCH-008 super admin/audit/impersonation
- LCH-009 production controls and release QA

`AGENTS.md` 已新增 `Launch Readiness Implementation Batch Tasks` workstream，引用 `RES-012`、本文件、`ARC-006`、`ACC-005`、`ACC-004`。

---

## 12. Open Questions

這些不是阻擋研究，但會影響實作優先順序：

1. 三個 AI 上線是否一定要是 `Assistant + Interview + Theater Route B`，或可用 legacy Theater 作 staging demo。
2. Demo account 是否要公開在 landing page，或只給受邀連結。
3. Org admin 第一版是否沿用 `/team`，或新增 `/org` route group。
4. Super admin 第一版是否只給內部 staging，不放 production。
5. AI quota 第一版用 DB counter 是否足夠，或需 Redis rate limit。
6. Client portal 第一版是否只看 report，或要包含補資料/預約回覆。

---

## 13. Implementation Risk Notes

- 最大風險是把 member detail API 重用給 org admin，導致主管看到客戶明細。
- 第二風險是把 `organizationId` 從前端傳入並信任，導致跨租戶資料寫入。
- 第三風險是先做 AI UI，卻沒有 `AiUsageLog`/quota，造成成本與硬規則問題。
- 第四風險是 demo seed 已存在，但 runtime 仍從 local cache/mock 讀，導致「看起來有 DB，實際不是 DB-backed」。
- 第五風險是 super admin impersonation 沒有 reason/expiry/audit，之後很難補稽核可信度。

---

## 14. 最短路徑判斷

若目標是最短時間提供可信 demo，建議先做：

```text
Auth + demo relogin
  -> Client CRUD DB-backed
  -> Assistant AiUsageLog/conversation
  -> Interview persistence
  -> Theater Route B minimum or legacy demo gate
  -> Share DB lookup
  -> Org aggregate smoke
```

這條路完成後，可對外說：

> 誠問 AI 目前提供受控 demo/private beta：資料存在資料庫，demo account 可重新登入，三個 AI 可使用並有用量紀錄，主管視角只看彙總，客戶視角只看授權內容。

在此之前，不建議宣稱正式 production ready。
