# 誠問 AI Role, Permission, Route Architecture v1.0

> 建立日期：2026-06-18  
> 更新日期：2026-06-19  
> 狀態：v1.0  
> 適用範圍：Multi-role SaaS 的 route guard、角色、資料可見性、session 分離、impersonation audit、demo seed runtime 規則。  
> 產品依據：`PRD-003_multi-role-saas-product-spec-v1.0.md`。  
> 研究依據：`RES-007_product-surface-and-admin-architecture-v1.0.md`、`RES-009_demo-account-and-mockdata-database-migration-v1.0.md`。

---

## 1. Architecture Brief

**Surface scope**：marketing、front office、member admin、org admin、super admin。  
**Roles**：platform role、org role、client role、front token access。  
**Routes**：定義 `(auth)`、`(client-auth)`、`(member)`、`(org-admin)`、`(super-admin)` 的 guard。  
**Data visibility**：member 看 own/assigned data；manager 看 aggregate/coaching；client 看授權資料；super admin 預設看彙總與支援資訊。  
**Plan/billing impact**：plan config 控制 collaborator、seat、unit、AI quota、branding、client portal；綠界為第一 provider。  
**Demo data impact**：demo account 必須使用 DB records；mockdata 只能作 seed material。  
**Audit/security impact**：super admin impersonation 必須有 reason、scope、expiry、audit log。  
**Verification plan**：PSA 後續卡需用 `ACC-004` 檢查 route guard、data visibility、demo data 與 billing hard stop。

---

## 2. Role Model

角色分成四層，不用單一 enum 表達所有權限。

| 層級 | 建議 roles | 用途 |
| --- | --- | --- |
| Platform | `SUPER_ADMIN`、`SUPPORT`、`FINANCE` | 誠問 AI 內部平台管理 |
| Organization | `ORG_OWNER`、`ORG_ADMIN`、`MANAGER`、`MEMBER`、`COLLABORATOR` | 通訊處/企業/個人 organization 內權限 |
| Client | `CLIENT_OWNER`、`CLIENT_MEMBER` | 前台客戶登入 |
| Front token | `PUBLIC_TOKEN`、`CLIENT_VIEWER` | 短期 share/report access |

Role 優先順序：

1. Platform role 只在 super admin session 生效。
2. Organization role 只在選定 organization workspace 內生效。
3. Client role 只在 client portal session 生效。
4. Token access 不等於登入，不得升級成 CRM 權限。

---

## 3. Session Separation

必須分離三種 session：

| Session | 入口 | Cookie / guard | 可進 surface |
| --- | --- | --- | --- |
| App session | `/login`、`/signup`、`/invite/[token]` | app auth guard | member admin、org admin |
| Client session | `/client-login` | client auth guard | client portal |
| Platform session | `/super-admin/login` | platform auth guard | super admin |

規則：

- Super admin 不可使用一般 app session 進入平台後台。
- Client session 不可進入 member/org admin。
- Token access 不建立 app session。
- Logout 必須只清除對應 session，除非使用者選擇全登出。

---

## 4. Route Guard Matrix

| Route group | Auth | Allowed roles | Default redirect |
| --- | --- | --- | --- |
| `(marketing)` | none | public | 已登入可導向 workspace |
| `(auth)` | session-aware | public / invited user | 已登入依 default workspace 分流 |
| `(front-office)` `/share/[token]` | token guard | public token | invalid token -> 安全錯誤頁 |
| `(client-auth)` | client session | client roles | `/client-login` |
| `(member)` | app session | `ORG_OWNER`、`ORG_ADMIN`、`MANAGER`、`MEMBER`、`COLLABORATOR` | `/login` |
| `(member)` `/settings` | app session + membership | current member | `/login` |
| `(org-admin)` | app session + org role | `ORG_OWNER`、`ORG_ADMIN`、`MANAGER` | no access -> member dashboard |
| `(org-admin)` `/org/settings` or `/team/settings` | app session + org role | `ORG_OWNER`、`ORG_ADMIN`；`MANAGER` scoped read-only/limited write | no access -> member dashboard |
| `(super-admin)` | platform session | `SUPER_ADMIN`、scoped `SUPPORT`、`FINANCE` | `/super-admin/login` |

Manager 可進 org admin，但資料查詢必須套 aggregate policy。
`/settings` 與 `/org/settings` 必須分離：前者只處理 current member 的個人/profile/preferences，後者才處理 organization-wide members、units、branding、quota、client portal、billing visibility 與合規預設。

---

## 5. Data Visibility Rules

### 5.1 Member Admin

Member 預設可看：

- 自己 ownerId 的 clients、visit plans、SPIN sessions、Theater sessions、reports。
- 被 assignment/share policy 授權的 organization records。
- 自己的 AiUsageLog quota summary。
- 自己的 member settings：profile、notification、AI preferences、personal integrations、default workspace。

Member 不可看：

- 其他 member 客戶明細，除非有明確授權。
- Org-wide raw AI prompt 或 Theater transcript。
- Organization-wide settings，例如 branding、billing、unit policy、client portal、org AI quota；這些必須走 org admin policy。

### 5.2 Org Admin

Org admin/manager 預設可看：

- member / unit aggregate。
- coaching score、training need、usage trend。
- seat、invite、unit、plan 與 quota 設定。
- organization settings：members/seats、unit tree、branding、client portal、share branding、AI quota、合規預設。Manager 只能在授權 unit scope 內看或改允許項目。

Org admin/manager 不可看：

- member 客戶姓名與保單明細。
- SPIN 對話全文。
- Theater 逐字稿。
- Report 全文，除非合規抽查或 member 主動授權，且需 audit。
- member private settings，例如個人通知、私人整合 token、個人 AI 偏好。

### 5.3 Front Office / Client Portal

Client 可看：

- 被授權的 report/share。
- 自己的預約、回覆、補件資料。
- 顧問/organization/unit 品牌資訊。

Client 不可看：

- 內部 CRM。
- 其他客戶資料。
- 團隊績效。
- AI prompt、內部評分、coaching note。

### 5.4 Super Admin

Super admin 預設可看：

- organization、user、subscription、billing、AiUsageLog aggregate。
- error/event/audit。
- support metadata。

查看敏感業務內容需：

- break-glass reason。
- scope。
- expiry。
- AuditLog。
- 若 impersonation，需 impersonation session。

---

## 6. Organization Unit Architecture

Enterprise 多層級用 `OrganizationUnit` 表達：

```text
Organization
  -> HEADQUARTERS
    -> REGION
      -> BRANCH
```

規則：

- `Organization` 是租戶、付款、資料隔離、AI quota 的主邊界。
- `OrganizationUnit` 是管理、報表、品牌、輔導範圍。
- Business records 保留 `organizationId`；需要報表/品牌時加 `unitId` 或可推導 unit。
- Manager 的 query 必須限制在可管理 unit scope，且只回傳 aggregate。

---

## 7. Plan Config Architecture

Plan 能力由 config 控制，不硬編碼在 UI。

必要欄位：

| 欄位 | 用途 |
| --- | --- |
| `maxMembers` | organization 總成員上限 |
| `maxCollaborators` | personal organization 協作者上限 |
| `maxUnits` | enterprise unit 上限 |
| `monthlyAiQuota` | AI 月用量 |
| `shareBrandingEnabled` | 是否允許 share branding |
| `clientPortalEnabled` | 是否啟用 client portal |
| `impersonationAllowed` | 是否允許 support impersonation |

Server-side 必須重檢 plan limits；前端 disable 不足以作為權限。

---

## 8. Billing Provider Rule

第一版 payment provider 為綠界，但資料模型必須 provider-neutral。

禁止：

- 在核心 organization 欄位新增新的 provider-specific 欄位。
- 只靠前端 redirect 判斷付款成功。
- 將 raw payment payload 暴露給一般使用者。

必備：

- order create。
- notification/return handling。
- query/reconcile。
- payment/subscription status state machine。
- plan config activation。

---

## 9. Impersonation and Audit

Impersonation session 必須包含：

- `actorUserId`
- `targetUserId` 或 target organization scope
- `targetOrgId`
- `reason`
- `scope`
- `startsAt`
- `expiresAt`
- `endedAt`

AuditLog 必須記錄：

- actor。
- target。
- action。
- resource type/id。
- before/after metadata where safe。
- `impersonationSessionId`。
- ip/user agent hash where applicable。

Hard stop：

- 無 reason 不可 impersonate。
- 無 expiry 不可 impersonate。
- support role 不可永久接管帳號。
- impersonation 操作不可無痕。

---

## 10. Demo Data Runtime Rule

Mockdata is seed material, not runtime data.

規則：

- Production UI/page/service 不得 import `src/domains/*/mocks.ts` 作為業務資料來源。
- Zustand/localStorage 只保存 UI state，不保存 business canonical data。
- `/api/mock/*` 不得被 production UI 呼叫作為資料來源。
- Demo account 必須從 DB 讀取 `isDemo` records。
- 清空 browser storage 後，demo account 仍可完整體驗。
- Demo reset 只刪 demo records，不刪真實資料。
- Demo AI output 若為 seeded/mock，也必須寫入 DB；可標 `AiProvider.MOCK`。

---

## 11. Hard Stop Conditions

以下狀況不得合併：

- Org manager 可直接瀏覽所有 member 客戶明細。
- Client/front office 可看到內部 CRM 或團隊績效。
- Super admin impersonation 沒有 reason、expiry、audit trail。
- Plan limits 只在前端檢查。
- Payment callback 只信任前端 redirect。
- Production runtime 仍依賴本地 mockdata 或 localStorage business persistence。
- 改壞 SPIN `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF` 狀態機。
- 改壞 Theater persona enum。
- 刪除或 optional 化合規欄位。
