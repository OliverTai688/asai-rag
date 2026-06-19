# 誠問 AI Role-aware Sidebar Navigation Research v1.0

> 建立日期：2026-06-19  
> 狀態：研究定稿，可轉成 sidebar / workspace bootstrap / route guard batch tasks  
> 範圍：研究登入後側邊欄如何依身份、權限、surface 與 plan capability 顯示不同項目，同時保留 AI-first 導覽心智。  
> 關聯文件：`RES-007_product-surface-and-admin-architecture-v1.0.md`、`RES-008_ai-first-sidebar-navigation-research-v1.0.md`、`RES-013_four-surface-launch-implementation-research-v1.0.md`、`ARC-006_role-permission-route-architecture-v1.0.md`、`PRD-003_multi-role-saas-product-spec-v1.0.md`。  
> 現況觀察來源：`src/components/layout/sidebar.tsx`、`src/app/api/org/*`、`src/app/(super-admin)/super-admin/page.tsx`、`PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`。

---

## 1. 研究結論

側邊欄項目確實應該因身份權限不同而不同，但不能只做「前端 hide/show」。誠問 AI 的 sidebar 應該被定義為 **role-aware navigation projection**：它是 server 已判斷出的 session、membership、surface、unit scope、plan capability 與 feature flag 的投影，而不是權限本身。

一句話原則：

> Sidebar 可以幫使用者看見自己可做的事，但不可被當成保護資料的唯一邊界。

建議採用三層模型：

1. **Surface 決定 sidebar 家族**：member admin、org admin、super admin、client portal 應有不同導覽集合，不應共享同一份平鋪清單。
2. **Role 決定 section 與 destination 可見性**：同在 app session 內，`MEMBER`、`COLLABORATOR`、`MANAGER`、`ORG_ADMIN`、`ORG_OWNER` 看到的「團隊與系統」不同。
3. **Capability 決定 action 是否可用**：plan、quota、feature flag、unit scope、demo mode 會讓某些項目 disable、顯示 upgrade hint，或移到 secondary menu。

對目前 `src/components/layout/sidebar.tsx` 的直接推論：

- `AI 工作台` 應保留為 member 主要入口，但 org manager 進入 org admin 時不應看到完整個人工作流同權重鋪開。
- `團隊管理`、`通訊處設定`、`個人設定` 不應對所有 membership 無差別顯示。
- `/team/settings` 應只對 `ORG_OWNER`、`ORG_ADMIN` 顯示為可操作；`MANAGER` 若可進，應是 scoped/read-only 或只看 unit coaching 設定。
- `SPIN 舊版` 是遷移期/內部相容入口，不應長期作為所有角色的主導覽項目；可用 feature flag 或 legacy access 控制。
- `問誠問 AI` 可以跨 member / org / super admin 存在，但每個 surface 的 assistant scope 不同，導覽文案可相同，資料邊界必須不同。

---

## 2. 為什麼 sidebar 需要 role-aware

### 2.1 使用者任務不同

同一個「登入後使用者」其實可能正在做不同工作：

| 使用者 | 主要問題 | Sidebar 應突出 |
| --- | --- | --- |
| 個人業務員 / member | 今天該跟進誰？我要怎麼準備、訪談、演練、出報告？ | 今日、AI 工作台、客戶工作 |
| Collaborator | 我被授權協作哪些客戶或報告？ | 被授權工作、AI 可用項、個人設定 |
| Manager | 誰需要輔導？哪個 unit 卡住？ | 團隊輔導、成員健康度、用量摘要 |
| Org admin / owner | 組織、席次、權限、品牌與用量怎麼管理？ | Org overview、成員、單位、設定、用量 |
| Platform support | 哪個租戶有問題？是否需要受控支援？ | Tenant health、support、audit、impersonation |
| Client user | 我的報告與待補資料在哪裡？ | 授權報告、預約、補資料、個人隱私 |

若所有人看到同一份 sidebar，會發生兩個問題：

- 一般 member 被管理項目干擾，誤以為自己應該能操作 org-wide 設定。
- Manager / admin 進入系統後仍被個人工作流主導，看不到「管理工作台」的任務心智。

### 2.2 權限邊界已經不只是一個 role

`ARC-006` 已把權限拆成 platform role、organization role、client role、front token access。這代表 sidebar 也不能只寫一個 `role === "admin"` 判斷。

至少需要考慮：

- session type：app / client / platform / token
- organization role：owner / admin / manager / member / collaborator
- unit scope：manager 是否只管理特定 unit
- plan capability：client portal、share branding、max units、AI quota
- feature flag：legacy SPIN、new interview、org admin beta、super admin support tools
- demo/staging mode：是否顯示 demo reset、pilot guidance、mock-only proof

---

## 3. 建議 Sidebar 家族

### 3.1 Member admin sidebar

適用角色：

- `ORG_OWNER`
- `ORG_ADMIN`
- `MANAGER`
- `MEMBER`
- `COLLABORATOR`

但可見項目需分層。

```text
今日
  總覽

AI 工作台
  問誠問 AI
  AI 了解客戶
  AI 劇場演練
  SPIN 舊版（legacy flag / 內部相容）

客戶工作
  客戶管理
  訪前規劃
  分析報告
  議題單

團隊與系統
  團隊管理（manager+ 或 plan/team capability）
  通訊處設定（owner/admin）
  個人設定（所有 app session）
```

Member admin 的主軸仍是 AI-first。即使 `ORG_OWNER` 也可以使用 member 工作台，因為 owner 可能同時是實際業務員；但 org-wide 管理項應該清楚降級為管理 section，不可喧賓奪主。

### 3.2 Org admin sidebar

適用角色：

- `ORG_OWNER`
- `ORG_ADMIN`
- `MANAGER`（scoped / limited）

```text
團隊總覽
  管理首頁
  輔導隊列
  成員健康度

組織管理
  成員與席次
  單位架構
  邀請與角色

AI 與用量
  AI 用量
  劇場/訪談覆蓋率
  報告產出摘要

設定
  通訊處設定
  品牌與客戶入口
  帳務與方案（owner/admin only）
```

Org admin sidebar 不應顯示 member 客戶明細入口作為主項目。若需要從團隊摘要 drill down，也必須只到 aggregate/coaching 層，不直接跳到 member 的客戶詳情。

### 3.3 Super admin sidebar

適用角色：

- `SUPER_ADMIN`
- scoped `SUPPORT`
- `FINANCE`

```text
平台總覽
  Tenant health
  異常與風險

營運管理
  Organizations
  Users / memberships
  Plans / feature flags
  Billing / ECPay reconciliation

AI 與成本
  AiUsageLog aggregate
  Model errors
  Provider status

支援與稽核
  Support cases
  Impersonation
  Break-glass audit
  Audit logs

平台設定
  Provider policy
  Support policy
```

Super admin sidebar 必須與一般 app session 分離。即使同一個人同時有 app role 與 platform role，也應透過獨立入口與明確視覺語境切換。

### 3.4 Client portal sidebar / bottom nav

適用角色：

- `CLIENT_OWNER`
- `CLIENT_MEMBER`
- token-scoped viewer

Client portal 不建議一開始使用完整 sidebar；mobile-first 底部導覽或簡短 top nav 更適合。

```text
報告
預約
補資料
隱私與授權
```

Front office / client portal 永遠不顯示 CRM、團隊、AI 內部評分、prompt、coaching note。

---

## 4. Role × Navigation Matrix

### 4.1 Member admin 現有項目建議

| Sidebar item | Collaborator | Member | Manager | Org admin | Org owner | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 總覽 | show | show | show | show | show | Dashboard 內容可依 role 顯示不同 panel |
| 問誠問 AI | show if AI enabled | show if AI enabled | show if AI enabled | show if AI enabled | show if AI enabled | Assistant scope 依 role 限制 |
| AI 了解客戶 `/interview` | show if canUseAiModule | show | show | show | show | 只可讀 own/assigned client data |
| SPIN 舊版 `/spin` | legacy flag | legacy flag | legacy flag | legacy flag | legacy flag | 遷移期入口，不建議全量常駐 |
| AI 劇場演練 `/theater` | show if canUseAiModule | show | show | show | show | 不改 Theater enum/scoring contract |
| 客戶管理 `/crm` | assigned only | show own/assigned | optional, own/assigned only | optional, own/assigned only | optional, own/assigned only | Manager 不因管理角色取得 member 客戶明細 |
| 訪前規劃 `/pre-visit` | assigned only | show | show | show | show | 同 client policy |
| 分析報告 `/reports` | assigned/shared only | show | show | show | show | Org aggregate 報告另走 org admin |
| 議題單 `/issues` | show | show | show | show | show | 可作跨角色作業入口 |
| 團隊管理 `/team` | hide | hide or teaser | show | show | show | Manager+；Personal plan 可隱藏或顯示升級 |
| 通訊處設定 `/team/settings` | hide | hide | scoped/read-only if needed | show | show | 寫入需 owner/admin |
| 個人設定 `/settings` | show | show | show | show | show | 僅 current member settings |

### 4.2 Org admin 項目建議

| Item | Manager | Org admin | Org owner | Notes |
| --- | --- | --- | --- | --- |
| 管理首頁 | show scoped | show | show | aggregate only |
| 輔導隊列 | show scoped | show | show | 不顯示客戶明細 |
| 成員健康度 | show scoped | show | show | 可看 role、unit、last active |
| 成員與席次 | read scoped | show/write | show/write | manager 不改 seat/role |
| 單位架構 | read scoped | show/write | show/write | enterprise capability |
| 邀請與角色 | hide or request | show/write | show/write | server 重檢 plan limit |
| AI 用量 | unit aggregate | org aggregate | org aggregate | 不顯示 raw prompt |
| 品牌與客戶入口 | hide/read | show/write | show/write | plan capability 控制 |
| 帳務與方案 | hide | optional read | show/write | finance role 可另定 |

### 4.3 Super admin 項目建議

| Item | Support | Finance | Super admin | Notes |
| --- | --- | --- | --- | --- |
| Tenant health | show | show billing slice | show | 預設 metadata |
| Organizations | show support fields | show billing fields | show | 敏感內容需 break-glass |
| Plans / feature flags | read | read billing config | write | plan update 必須 audit |
| Billing / reconciliation | hide/read | show/write scoped | show/write | 綠界 callback/reconcile |
| AiUsageLog aggregate | show | show cost | show | 不顯示 prompt body |
| Impersonation | scoped with reason | hide | show | 必須 reason/scope/expiry |
| Break-glass audit | show own/support | read | show | 高敏感 |

---

## 5. 顯示策略：hide、disable、teaser、switch

不是所有不可用項目都應該直接隱藏。建議四種策略：

| 策略 | 使用時機 | 例子 |
| --- | --- | --- |
| Hide | 使用者不應知道或不應誤觸 | Super admin、break-glass、其他 member 客戶明細 |
| Disable | 使用者有概念但暫不可操作 | AI quota 用完、功能維護中 |
| Teaser / upgrade | plan 未開但商業上可升級 | client portal、share branding、enterprise units |
| Surface switch | 使用者有另一個工作身份 | `前往通訊處管理`、`前往平台後台` |

具體建議：

- `通訊處設定` 對一般 member 應 hide，不做 disable；因為它不是 member 當下工作。
- `團隊管理` 對 personal plan owner 可以 teaser，但對 collaborator hide。
- `SPIN 舊版` 應用 feature flag hide，避免新使用者困惑。
- `super admin` 不應出現在 member sidebar；如果同一人有 platform role，使用 account menu 或獨立 `/super-admin/login` 入口切換。
- Plan 限制只能影響 UI 提示，server 仍必須重檢。

---

## 6. 實作架構建議

### 6.1 建立 server-side navigation manifest

不建議在 client component 內硬編所有權限。建議建立一個可測試的 manifest + resolver：

```text
src/lib/navigation/sidebar-manifest.ts
src/lib/navigation/sidebar-policy.ts
src/app/api/workspace/bootstrap/route.ts
```

Resolver input：

```ts
type SidebarContext = {
  sessionType: "app" | "client" | "platform";
  organizationRole?: "ORG_OWNER" | "ORG_ADMIN" | "MANAGER" | "MEMBER" | "COLLABORATOR";
  platformRole?: "SUPER_ADMIN" | "SUPPORT" | "FINANCE";
  clientRole?: "CLIENT_OWNER" | "CLIENT_MEMBER";
  managedUnitIds?: string[];
  planCapabilities: {
    aiEnabled: boolean;
    clientPortalEnabled: boolean;
    shareBrandingEnabled: boolean;
    orgAdminEnabled: boolean;
    maxUnits: number;
  };
  featureFlags: {
    legacySpinNav: boolean;
    interviewEnabled: boolean;
    theaterEnabled: boolean;
    orgAdminBeta: boolean;
  };
  isDemo: boolean;
};
```

Resolver output：

```ts
type SidebarSection = {
  id: string;
  label: string;
  items: Array<{
    id: string;
    label: string;
    href?: string;
    action?: "openAssistant" | "switchSurface";
    icon: string;
    visible: boolean;
    disabled?: boolean;
    reason?: string;
    badge?: "beta" | "legacy" | "upgrade";
    ariaLabel: string;
  }>;
};
```

前端只負責 rendering、active state、tooltip、mobile drawer，不負責推導權限。

### 6.2 Workspace bootstrap 應回傳 navigation

`/api/workspace/bootstrap` 應回傳：

- current user
- current organization
- membership / role
- plan capabilities
- feature flags
- sidebar sections
- default surface redirect

這樣可以避免每個 layout/page 重複推導，也能讓 browser QA 直接檢查不同 demo account 的導覽差異。

### 6.3 Route guard 與 sidebar policy 必須共用能力判斷

Sidebar 顯示邏輯應與 route guard 共用 policy helper，例如：

```text
canAccessMemberRoute()
canAccessOrgAdmin()
canManageOrgSettings()
canReadOrgAggregate()
canUseAiModule()
canAccessPlatformTool()
```

避免出現：

- sidebar 顯示了項目，但點進去 403。
- sidebar 隱藏了項目，但手打 URL 可以進入。
- manager 在 UI 中看不到客戶明細，但 API 仍回傳明細。

---

## 7. UX 原則

### 7.1 不要讓「角色切換」變成迷路

若一個使用者同時是業務員與主管，建議保留明確 surface switch：

```text
Member sidebar:
  團隊與系統
    前往通訊處管理

Org sidebar:
  個人工作
    回到顧問工作台
```

但兩個 sidebar 不應混成同一長清單。混在一起會讓 member 工作與 org 管理彼此搶層級。

### 7.2 可見文案要講任務，不講權限

不建議在 sidebar label 寫 `Org Admin`、`Manager Only`。使用者文案應是：

- `通訊處管理`
- `成員與席次`
- `輔導隊列`
- `AI 用量`

權限限制放在 tooltip、empty state、403 頁與設定頁說明。

### 7.3 Empty state 比硬 403 更重要

對可預期但暫無資料的項目，例如 team plan 還沒邀請成員，應顯示 empty state；對無權限項目才 403。

例：

- Org owner 點 `成員與席次`，但沒有成員：顯示邀請 CTA。
- Member 手打 `/team/settings`：導回 `/dashboard` 或顯示無權限頁。
- Manager 點 scoped `輔導隊列`，但目前沒有 unit：顯示「尚未指派管理範圍」。

---

## 8. Acceptance Criteria 建議

轉成 batch task 時，至少驗收以下情境：

- Member 帳號只看到 member 工作流，不看到通訊處設定。
- Org owner/admin 可看到 team/org management，但 member 工作台仍可使用。
- Manager 看到 scoped org admin 項目，但不能看到 billing/plan write action。
- Collaborator 只看到授權工作與個人設定，不看到團隊管理。
- Super admin 從獨立入口進入，看到 platform sidebar，不混入 member sidebar。
- Client portal 不顯示內部 CRM、團隊、AI 評分、prompt 或 coaching。
- 手打 URL 的 route guard 與 sidebar 可見性一致。
- Plan capability off 時，sidebar 使用 hide/disable/upgrade 策略一致，server 仍拒絕越權操作。
- `問誠問 AI` 在不同 surface 可見時，assistant scope 不跨越該 surface 的資料邊界。
- Mobile drawer 第一屏仍優先顯示該角色最重要的工作群組。

---

## 9. 建議後續 Batch

### Batch RAS-001 — Role-aware navigation contract

- [ ] 建立 sidebar navigation contract，定義 section、item、action、badge、disabled reason。
- [ ] 對齊 `ARC-006` role model 與 `RES-008` AI-first naming。
- [ ] 寫出 member / org / platform / client 四套 sidebar manifest。
- [ ] 不改 route guard、不改 business data。

### Batch RAS-002 — Server-side sidebar resolver

- [ ] 建立 `resolveSidebarSections(context)`。
- [ ] 加入 unit tests 覆蓋 collaborator/member/manager/org admin/org owner/platform/client。
- [ ] 將 plan capabilities / feature flags 納入 resolver input。
- [ ] 不在 client component 內硬寫 role 判斷。

### Batch RAS-003 — Workspace bootstrap integration

- [ ] `/api/workspace/bootstrap` 回傳 navigation sections。
- [ ] Dashboard layout 使用 bootstrap navigation rendering。
- [ ] 手打 URL route guard 與 navigation policy 共用 helper。
- [ ] Browser QA 覆蓋 desktop/mobile drawer。

### Batch RAS-004 — Surface switch and legacy SPIN cleanup

- [ ] 為同時具備 member/org 權限的使用者提供清楚 surface switch。
- [ ] `SPIN 舊版` 改由 legacy feature flag 控制。
- [ ] `問誠問 AI` 在 member/org/platform scope 顯示一致但資料邊界不同。
- [ ] 更新 `RES-008` / `PLN-014` 或新增對應 PLN。

---

## 10. 本研究的硬邊界

- 不改 SPIN 狀態機。
- 不改 Theater enum / scoring contract。
- 不刪 client/policy 合規欄位。
- 不把 sidebar hide/show 當成唯一權限控制。
- 不讓 org manager 預設看到 member 客戶明細、保單明細、SPIN 對話全文或 Theater 逐字稿。
- 不讓 super admin 用一般 app session 進入平台後台。
- 不讓 client portal 取得內部 CRM 或團隊資料。
