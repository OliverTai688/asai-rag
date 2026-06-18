# 誠問 AI 產品介面與管理架構研究 v1.0

> 研究日期：2026-06-18  
> 更新日期：2026-06-18  
> 範圍：整理誠問 AI 從一頁式官網、方案購買、登入分流，到系統內前台、member admin、org admin、super admin 的完整產品介面架構。  
> 關聯文件：`PRD-002_product-spec-v2.0.md`、`PLN-011_multi-tenant-launch-plan-v1.0.md`、`PLN-012_page-by-page-modern-ui-batch-tasks-v1.0.md`、`RES-005_interface-simplification-patterns-v1.0.md`、`RES-006_modern-minimal-web-design-principles-v1.0.md`、`RES-009_demo-account-and-mockdata-database-migration-v1.0.md`。
> 第二輪決策輸入：個人版可邀請少量協作者且上限由 super admin 控制；org manager 僅看彙總與輔導指標；通訊處品牌可出現在 share page；企業方案支援總公司/區部/通訊處多層級；super admin 需要 impersonation 並強制 audit log；付款採綠界；前台客戶頁未來支援個人/企業登入，super admin 使用獨立登入入口。

---

## 1. 研究結論

誠問 AI 不應只被視為一個 dashboard app。它應該被設計成兩段式 SaaS：

1. **商務前端與購買流程**：讓未登入訪客理解產品、比較方案、建立個人或企業帳號、完成訂閱或試用。
2. **登入後的多角色系統**：同一套核心資料與 AI 能力，依角色拆成前台頁面、member admin、org admin、super admin 四種操作面。

這個切分很重要，因為誠問 AI 的真實商業模型同時服務「個人業務員」與「通訊處/企業」。如果路由、權限與資訊架構只以單一 dashboard 思考，後續會遇到三個問題：

- 個人用戶與企業用戶的 onboarding、付款、資料歸屬會混在一起。
- 通訊處主管需要的管理、輔導、席次、用量控制無法自然長出來。
- 平台方自己的營運、稽核、客服、方案控管會被迫塞進一般使用者介面。

建議採用「一個產品、兩段入口、四層系統介面」作為後續 PRD 與實作真相源。

第二輪研究後，核心決策收斂如下：

- 個人版不是孤島，而是「personal organization」：可邀請少量協作者，但邀請上限由 super admin 的方案設定控制。
- Org manager 不看所有客戶明細，只看彙總、輔導、訓練與健康度指標；客戶明細仍由 member / owner policy 控制。
- 通訊處與企業可自訂品牌，並出現在 share page 與前台客戶頁。
- 企業方案必須支援多層級組織：總公司、區部、通訊處。
- Super admin 需要 impersonation，但必須走 reason、scope、expiry、audit log 與可追蹤 session。
- 付款預設採綠界，需支援一次性付款與訂閱/定期定額情境。
- 前台客戶頁未來不只 token access，也要支援個人/企業登入；super admin 登入入口與一般登入分離。
- 所有體驗範例資料都必須資料庫化：mockdata 只能作為 seed fixture，demo account 讀取 DB records，不再使用本地 mockdata 作為 runtime source。

---

## 2. 目標產品架構

### 2.1 第一部分：商務前端與購買流程

這一層服務未登入或尚未完成購買的使用者。目標不是呈現所有功能，而是回答三件事：

1. 誠問 AI 解決什麼保險銷售問題。
2. 個人版與企業版差在哪裡。
3. 使用者下一步應該試用、購買，還是聯絡導入。

建議介面：

| 介面 | 主要對象 | 核心任務 | 建議路由 |
| --- | --- | --- | --- |
| 一頁式介紹 | 未登入訪客、業務員、主管 | 理解價值、看案例、進入方案 | `/` |
| 方案與購買 | 個人業務員、通訊處決策者 | 比較 personal / team / enterprise | `/pricing` |
| 註冊分流 | 新用戶 | 選擇個人或企業 | `/signup` |
| 登入 | 已有帳號 | 進入對應工作區 | `/login` |
| 法務文件 | 購買前審查 | 隱私、條款、AI 免責 | `/privacy`、`/terms` |
| 客戶分享頁 | 被分享報告的客戶 | 查看報告、預約下一步 | `/share/[token]` |

### 2.2 中間層：登入、方案、工作區分流

中間層負責把商務承諾轉成系統狀態。它不是單一頁面，而是一組流程：

```text
Landing / Pricing
  -> Signup / Login
  -> 選擇帳號型態：個人 / 企業
  -> 建立 User
  -> 建立或加入 Organization
  -> 綁定 Plan / Trial / Seat
  -> 進入對應預設介面
```

建議規則：

- **個人註冊**：建立 `User` + personal `Organization`，預設角色 `OWNER`，進入 member admin 或前台工作台。
- **企業註冊**：建立 `User` + business `Organization`，預設角色 `ORG_OWNER`，進入 org admin onboarding。
- **受邀成員**：透過 invitation token 加入既有 org，依角色進入 member admin。
- **平台管理員**：不走一般 signup，透過內部名單或後台建立，進入 super admin。
- **體驗範例帳號**：建立受控 demo organization + demo users，所有範例客戶/報告/互動資料都 seed 到 DB，清空 browser storage 後仍可復原。

---

## 3. 第二部分：登入後四種系統介面

登入後的系統應拆成四種 surface。四者共享資料模型，但任務、權限、導航和預設首頁不同。

### 3.1 前台頁面 Front Office

前台頁面是「被服務者」或「對外互動者」看到的介面，不等於未登入官網。它可以包含公開分享頁、客戶報告頁、未來的客戶回覆/預約頁。

| 項目 | 建議 |
| --- | --- |
| 對象 | 客戶、被分享報告者、外部受邀填寫者 |
| 任務 | 查看報告、確認需求、預約、回覆補充資料 |
| 權限 | token-based 或極輕量驗證，不進入內部 CRM |
| 現況 | 已有 `/share/[token]` |
| 後續 | 可擴充 `/client-portal/[token]` 或 `/public/report/[token]` |

前台頁面要極簡、可信、mobile-first，並清楚標示顧問與通訊處品牌。它不能暴露內部 AI prompt、團隊績效、其他客戶資料。

第二輪決策後，前台頁面應支援兩種存取：

- **Token access**：短期分享報告、免登入閱讀、一次性互動。
- **Client login**：未來客戶可用個人/企業身份登入，查看歷史報告、預約、補資料、管理授權。

這代表 `/share/[token]` 是前台的第一階段，不是最終 client portal。

### 3.2 Member Admin 個人工作台

member admin 是業務員每天使用的核心工作區。它的主軸不是管理系統，而是完成個人銷售工作。

| 項目 | 建議 |
| --- | --- |
| 對象 | 個人業務員、通訊處成員 |
| 任務 | 管客戶、訪前規劃、SPIN、劇場演練、報告、追蹤 |
| 權限 | 看自己的資料；可看 org 允許共享的資料 |
| 現況 | 大多數 `/(dashboard)` 頁面屬於此層 |
| 建議路由 | `/app/*` 或保留 `/(dashboard)` 但語意上歸 member |

member admin 的首頁應是「今日決策台」，不是企業總覽。已完成的 modern UI workstream 大多可歸入這一層。

### 3.3 Org Admin 通訊處管理台

org admin 是通訊處主管、企業管理者使用的管理介面。它的核心問題是「誰需要輔導、資源怎麼分配、團隊是否有效使用」。

| 項目 | 建議 |
| --- | --- |
| 對象 | 通訊處主管、團隊 owner、訓練負責人 |
| 任務 | 成員管理、席次、團隊績效、AI 用量、輔導建議、報告稽核 |
| 權限 | 看 org 範圍彙總與輔導指標；不預設看 member 客戶明細 |
| 現況 | `/team` 有雛形；尚未成為完整 org admin |
| 建議路由 | `/org/*` 或 `/admin/org/*` |

org admin 不應只是 member dashboard 加排行榜。它需要自己的資訊架構：成員、團隊漏斗、訓練、用量、設定、合規。

已決策：org manager 只看彙總與輔導指標。若未來需要看個別客戶，必須是明確授權情境，例如 member 主動分享、案件輔導、合規抽查，且需留下 audit event。

### 3.4 Super Admin 平台管理台

super admin 是誠問 AI 團隊自己的系統後台，用於營運與風險控制。它不服務一般用戶，也不應和 org admin 混在一起。

| 項目 | 建議 |
| --- | --- |
| 對象 | 誠問 AI 營運、客服、財務、系統管理者 |
| 任務 | 租戶管理、方案控管、用量/成本、AI usage log、客服支援、風險稽核 |
| 權限 | 平台級；需高強度 audit log、最小權限與 impersonation 控制 |
| 現況 | 已有 `/(admin)/admin` 雛形 |
| 建議路由 | `/super-admin/*` 或保留 `/(admin)/admin` 但明確命名 |

super admin 對資料的查看要遵守最小必要原則。保險客戶資料與 AI 對話內容屬高敏感內容，後台應優先提供彙總、事件、成本與支援工具，而不是任意瀏覽所有客戶內容。

已決策：super admin 需要 impersonation。這不是一般登入，而是平台支援/除錯能力，必須具備 reason、目標 org/member、時間限制、可用範圍、開始/結束事件、操作事件與事後稽核。

---

## 4. 四介面的功能責任矩陣

每個功能都要思考四種介面的關係，而不是只做 member 版本。以下是建議矩陣：

| 功能 | 前台頁面 | Member Admin | Org Admin | Super Admin |
| --- | --- | --- | --- | --- |
| Landing / pricing | 看介紹、選方案 | 已登入後可升級 | 可導入企業方案 | 管方案與定價實驗 |
| Auth / onboarding | 接受邀請、登入前台或開啟分享 | 個人 onboarding、建立示範資料 | 建 org、邀成員、設定預設 | 獨立登入、協助帳號、停權、查事件 |
| CRM 客戶 | 只看被授權內容 | 管自己的客戶與跟進 | 看團隊客戶分布、合規狀態與輔導摘要，不看明細 | 只做支援/稽核，不預設瀏覽 |
| SPIN | 不可見 | 建立與執行 SPIN session | 看完成率、品質趨勢、輔導缺口 | 看用量、錯誤、成本、濫用 |
| 劇場 Theater | 不可見 | 個人演練與回饋 | 看成員演練頻率與弱項 | 管 persona template、成本與失敗率 |
| 訪前規劃 | 可接收會前資料摘要 | 建立準備包與拜訪紀錄 | 看拜訪節奏與團隊 pipeline | 看 API 成本與任務健康度 |
| 報告 | 查看被分享報告、預約、登入後看歷史授權報告 | 生成、編輯、分享、追蹤 | 看報告產出量與合規摘要 | 管分享風險、token 事件 |
| Team | 不可見 | 看自己與團隊中必要上下文 | 成員、排行榜、輔導、權限 | 看租戶層使用健康度 |
| Billing | 付款或升級入口 | 個人訂閱、發票、少量協作者上限 | 席次、企業方案、綠界付款 | 方案、邀請上限、折扣、退款、授權 |
| Settings | 隱私偏好 | 個人資料、通知、AI 偏好 | org profile、成員、權限、資料政策 | global config、feature flags |
| AiUsageLog | 不可見 | 可看自己的 quota | 看 org 用量與剩餘額度 | 看全平台成本、模型、錯誤 |
| Demo seed / mockdata | 可登入 client demo portal 看授權範例 | 使用 DB demo records 體驗完整流程 | 看 demo aggregate，不看 member 明細 | 管 demo scenario、reset、seed version |

---

## 5. 建議資訊架構與路由

現況路由已經有 `(public)`、`(dashboard)`、`(admin)` 的雛形。下一步可先在產品語意上定義清楚，再決定是否實際遷移路由。

### 5.1 建議 route groups

```text
src/app/
  (marketing)/
    page.tsx                 # /
    pricing/page.tsx         # /pricing
    privacy/page.tsx
    terms/page.tsx

  (auth)/
    login/page.tsx
    signup/page.tsx
    onboarding/page.tsx
    invite/[token]/page.tsx

  (client-auth)/
    client-login/page.tsx
    client-portal/page.tsx

  (front-office)/
    share/[token]/page.tsx   # /share/[token]
    client/[token]/page.tsx  # future

  (member)/
    dashboard/page.tsx
    crm/*
    spin/*
    theater/*
    pre-visit/*
    reports/*
    settings/page.tsx

  (org-admin)/
    org/page.tsx
    org/units/page.tsx
    org/members/page.tsx
    org/coaching/page.tsx
    org/usage/page.tsx
    org/billing/page.tsx
    org/settings/page.tsx

  (super-admin)/
    super-admin/login/page.tsx
    super-admin/page.tsx
    super-admin/organizations/page.tsx
    super-admin/users/page.tsx
    super-admin/billing/page.tsx
    super-admin/ai-usage/page.tsx
    super-admin/impersonation/page.tsx
    super-admin/audit-log/page.tsx
```

### 5.2 是否要立刻改路由

不建議立刻做大規模 route migration。較好的順序是：

1. 先在文件中定義 surface 與權限語意。
2. 在現有 `/(dashboard)` 內完成 member/admin 頁面的 UI 與產品邊界。
3. 新增 auth / onboarding / org admin 時使用新語意路由。
4. 最後再評估是否遷移舊路由，並提供 redirect。

---

## 6. 權限與資料模型建議

### 6.1 角色模型

建議把角色分成 platform role 與 organization role，不要用一個 enum 解決所有情境。

| 層級 | 建議 enum | 說明 |
| --- | --- | --- |
| Platform role | `SUPER_ADMIN`、`SUPPORT`、`FINANCE` | 誠問 AI 內部人員 |
| Org role | `ORG_OWNER`、`ORG_ADMIN`、`MANAGER`、`MEMBER`、`COLLABORATOR` | 通訊處或企業內角色；個人版協作者使用受限角色 |
| Client role | `CLIENT_OWNER`、`CLIENT_MEMBER` | 前台客戶登入後角色 |
| Front access | `PUBLIC_TOKEN`、`CLIENT_VIEWER` | token 或輕量客戶存取 |

### 6.2 組織與個人帳號

個人版也應建立 personal organization，原因是：

- 資料模型一致，所有 client/report/session 都有 `organizationId`。
- 未來個人升級成團隊時，不需要搬資料。
- AI quota、billing、share token 都能以 org 為單位管理。
- 個人版協作者可用同一套 membership 與 invitation 模型，只是上限由方案設定控制。

```text
User
  -> OrganizationMember
    -> Organization
      -> Plan / Subscription
      -> Clients / Sessions / Reports / VisitPlans
```

### 6.3 最小權限原則

- Member 預設只看自己建立或被分派的資料。
- Manager 只看團隊彙總與輔導指標，不預設看個別客戶明細。
- Org owner/admin 可管理成員、席次、設定，但不一定能看所有敏感客戶內容。
- Super admin 預設看彙總與事件；查看敏感內容需 break-glass reason 與 audit log。

### 6.4 多層級企業組織

企業方案需支援「總公司 → 區部 → 通訊處」多層級。建議不要把每個層級都建成完全獨立 tenant，而是在 organization 內新增 unit tree：

```text
Organization: 富誠保經
  OrganizationUnit: 總公司
    OrganizationUnit: 北一區
      OrganizationUnit: 台北信義通訊處
      OrganizationUnit: 新北板橋通訊處
    OrganizationUnit: 中彰投區
      OrganizationUnit: 台中公益通訊處
```

建議規則：

- `Organization` 是合約、付款、資料隔離與 AI quota 的主要邊界。
- `OrganizationUnit` 是管理、報表、品牌與權限分派的內部層級。
- Member 可掛在一個 primary unit，也可有跨 unit 的管理範圍。
- Org manager 的報表只聚合其可管理 unit 範圍。
- 客戶、報告、SPIN、劇場資料仍保留 `organizationId`，必要時增加 `unitId` 供彙總。

### 6.5 方案限制與邀請上限

個人版允許邀請協作者，但上限由 super admin 設定。建議將限制放在 plan config，而不是寫死在程式碼：

| 設定 | 用途 |
| --- | --- |
| `maxMembers` | organization 總成員數上限 |
| `maxCollaborators` | personal organization 可邀請協作者數 |
| `maxUnits` | enterprise 可建立 unit 數 |
| `monthlyAiQuota` | AI 月用量 |
| `shareBrandingEnabled` | share page 是否可顯示自訂品牌 |
| `clientPortalEnabled` | 是否啟用前台客戶登入 |
| `impersonationAllowed` | 是否允許 support 角色 impersonate |

---

## 7. 購買與登入流程建議

### 7.1 個人版流程

```text
/pricing
  -> 選擇個人方案
  -> /signup?plan=personal
  -> 建立 User + personal Organization
  -> trial 或綠界付款
  -> seed 示範資料
  -> /dashboard
```

個人版第一天成功標準：完成第一個客戶、第一份訪前規劃或第一場劇場演練。

### 7.2 企業版流程

```text
/pricing
  -> 選擇企業/通訊處方案
  -> /signup?plan=team
  -> 建立 User + Organization
  -> 綠界付款或企業授權開通
  -> 設定總公司/區部/通訊處、席次、成員邀請
  -> /org/onboarding
  -> /org
```

企業版第一天成功標準：建立 org、邀請至少一位 member、主管看到團隊導入進度。

### 7.3 邀請成員流程

```text
Org Admin 邀請
  -> Email / link token
  -> /invite/[token]
  -> 註冊或登入
  -> 加入 org
  -> /dashboard
```

受邀成員不應看到 pricing 決策；他們的重點是快速進入工作。

### 7.4 綠界付款流程

已決策：付款一開始採綠界。綠界官方文件提供全方位金流 API，支援導轉至綠界付款頁；官方也提供信用卡定期定額 API，適合訂閱與固定扣款需求。

建議第一版採「站外導轉付款 + webhook/ReturnURL 同步狀態」：

```text
/pricing
  -> 建立 Checkout / SubscriptionOrder
  -> POST 建立綠界訂單
  -> 導轉綠界付款頁
  -> ReturnURL / OrderResultURL 接收結果
  -> 更新 SubscriptionOrder
  -> 啟用 Organization plan / quota / seat limit
```

設計注意：

- schema 目前有 `stripeCustomerId`、`stripeSubscriptionId`，後續應改為 payment-provider-neutral，例如 `paymentProvider`、`providerCustomerId`、`providerSubscriptionId`。
- 綠界交易資料不要散落在 organization 欄位，應放在 `SubscriptionOrder`、`PaymentTransaction` 或 billing domain。
- 付款成功後不直接信任前端 redirect，必須以 server-to-server notification 或查詢結果為準。
- 個人方案可走定期定額；企業方案可先支援綠界付款後由 super admin 授權/調整席次。

---

## 8. 各介面的首頁工作

| Surface | 首頁應回答的問題 | 第一個主 CTA |
| --- | --- | --- |
| Marketing | 這產品是否值得我試？ | 開始試用 / 查看方案 |
| Front Office | 這份報告對我有什麼結論？下一步是什麼？ | 預約 / 回覆需求 / 登入客戶頁 |
| Member Admin | 今天我最該跟進誰？ | 開始拜訪規劃 |
| Org Admin | 誰需要輔導？團隊哪裡卡住？ | 指派輔導 / 邀請成員 |
| Super Admin | 平台今天有什麼風險或異常？ | 查看異常 / 處理工單 |

這能避免不同介面長得像同一個 dashboard，只是資料不同。

---

## 9. 與現況的差距

### 9.1 已有基礎

- `/` 與 `/pricing` 已可承接一頁式介紹與方案頁。
- `/share/[token]` 已是前台頁面的第一個實例。
- `/(dashboard)` 已承接 member admin 大部分工作流。
- `/team` 可演化為 org admin 的輔導/團隊決策頁。
- `/(admin)/admin` 可演化為 super admin。
- `PLN-011` 已提出多租戶、auth、billing、quota 的技術方向。

### 9.2 主要缺口

| 缺口 | 影響 | 建議處理 |
| --- | --- | --- |
| Auth 尚未落地 | 無法區分個人、企業、平台管理員 | 先實作 auth + org membership |
| Org admin 尚未獨立 | 主管管理能力不足 | 將 `/team` 擴成 `/org` 系列 |
| Super admin 邊界不明 | 平台營運與一般 admin 混淆 | 明確命名與權限隔離 |
| Billing / plan 不完整 | 商務入口無法閉環 | personal/team plan 先文件化，再接綠界 |
| schema 仍有 Stripe 命名 | 付款 provider 綁死，與決策不符 | 改成 payment-provider-neutral 欄位 |
| 前台頁面只有 share | 客戶互動閉環不足 | 擴充預約、回覆、補件與客戶登入 |
| 權限矩陣未定 | 每頁功能容易越權 | 為每個 route 定義 allowed roles |
| 企業多層級未建模 | 總公司/區部/通訊處無法管理 | 新增 OrganizationUnit tree |
| Impersonation 未設計 | 客服除錯與資安稽核衝突 | 新增 impersonation session + audit log |
| Runtime 仍有 mockdata/localStorage | 無法驗證真實權限、分享、追蹤、跨裝置體驗 | 依 `RES-009` 建立 DB demo seed，production runtime 禁用本地 mockdata |

---

## 10. 分階段落地建議

### Phase 1 - 文件與產品邊界

- 將本研究轉成 PRD 或 ARC：定義 surface、role、route、權限矩陣。
- 在 `AGENTS.md` 新增「Product Surface Architecture」或「Multi-role SaaS Architecture」workstream。
- 為 MM-012 的 pilot/settings/admin surfaces 補入四介面分層要求。

### Phase 2 - Auth 與個人/企業分流

- 新增 `/login`、`/signup`、`/onboarding`。
- 新增 super admin 獨立登入入口，例如 `/super-admin/login`。
- 註冊時選 personal / team。
- 個人版與企業版都建立 organization。
- 將登入後 redirect 依角色分流到 `/dashboard` 或 `/org`。
- 客戶前台登入另設 `/client-login` 或 client portal auth，不與 member dashboard 混用。

### Phase 2.5 - Demo Account 與 mockdata 資料庫化

- 將 `src/domains/*/mocks.ts`、inline mock、`/api/mock/*` 盤點為 seed material。
- 建立 demo organization 與 demo users：member、manager、client portal、staging super admin。
- 將範例客戶、保單、合規、拜訪、SPIN、劇場、報告、分享、互動事件 seed 到 DB。
- Runtime UI/service 不再從本地 mockdata 或 localStorage 讀取 business data。
- 清空 browser storage 後，demo account 仍可完整體驗。

### Phase 3 - Org Admin 最小可用

- 將 `/team` 重構為 org admin 首頁或新增 `/org`。
- 做成「誰需要輔導、下一步是什麼」的管理決策台。
- 補成員邀請、席次、AI 用量、團隊訓練四個最小模組。
- 補 OrganizationUnit，先支援三層：總公司、區部、通訊處。
- 報表只能呈現彙總與輔導指標，不顯示客戶明細。

### Phase 4 - Super Admin 最小可用

- 明確建立 platform-only guard。
- 提供 organizations、users、subscriptions、ai usage、audit log。
- 敏感資料查看需 reason + audit event。
- 提供 impersonation：選 org/member、填 reason、設定 expiry、限制 scope、全程 audit。
- 提供 plan config：控制 personal collaborator 上限、seat、AI quota、branding、client portal。

### Phase 5 - 前台客戶互動擴充

- 在 `/share/[token]` 之外增加客戶可執行動作：預約、回覆、確認收到。
- 新增客戶登入/企業客戶登入的 client portal 模型。
- 不把客戶帶入內部 dashboard。
- 所有 token access 都要有到期、撤回與追蹤。

### Phase 6 - 綠界付款與方案閉環

- 建立 payment-provider-neutral billing schema。
- 實作綠界訂單建立、付款結果通知、訂單查詢與訂閱狀態同步。
- 將付款狀態連動 plan config、seat limit、AI quota、branding capability。
- 建立付款失敗、續約失敗、取消訂閱與退款的狀態機。

---

## 11. 後續文件建議

建議新增三份文件承接本研究：

1. **PRD - Multi-role SaaS Product Spec**：定義 personal、team、enterprise 的產品與商務差異。
2. **ARC - Role, Permission, Route Architecture**：定義 route guard、角色、資料可見性、audit。
3. **PLN - Auth, Billing, Admin Surfaces Batch Tasks**：把 auth、org admin、super admin 拆成可執行 batch cards。

---

## 12. 第二輪已決策項目

| 問題 | 決策 | 對產品/技術的影響 |
| --- | --- | --- |
| 個人版是否可邀請協作者 | 可以，但邀請上限由 super admin 設定 | personal org 也使用 invitation/membership；plan config 需有 `maxCollaborators` |
| Org manager 是否可看 member 客戶明細 | 不可，只看彙總與輔導指標 | org admin 報表需做 aggregation；客戶明細需 member/owner 授權 |
| 通訊處品牌是否出現在 share page | 可以 | Organization/Unit 需有 logo、brand color、display name；share page 讀取品牌設定 |
| 企業是否支援多層級 | 是，總公司/區部/通訊處 | 需 OrganizationUnit tree 與 unit-scoped reporting |
| Super admin 是否需要 impersonation | 需要 | 需 impersonation session、reason、expiry、scope、audit log |
| 付款 provider | 綠界 | billing schema 需 provider-neutral；實作 ECPay order/notification/query |
| 前台客戶頁是否只用 token | 不只 token，未來支援個人/企業登入 | 需 client portal auth；super admin 使用獨立登入入口 |

---

## 13. 執行導向的資料模型補強

以下不是最終 Prisma schema，而是下一份 ARC/PLN 應承接的資料模型方向。

### 13.1 OrganizationUnit

```prisma
model OrganizationUnit {
  id             String  @id @default(cuid())
  organizationId String
  parentUnitId   String?
  name           String
  type           OrganizationUnitType // HEADQUARTERS, REGION, BRANCH
  logoUrl        String?
  brandColor     String?
  settings       Json?
}
```

### 13.2 PlanConfig

```prisma
model PlanConfig {
  id                   String @id @default(cuid())
  code                 String @unique
  name                 String
  maxMembers           Int
  maxCollaborators     Int
  maxUnits             Int
  monthlyAiQuota       Int
  shareBrandingEnabled Boolean
  clientPortalEnabled  Boolean
}
```

### 13.3 Billing Provider Neutralization

```prisma
model PaymentAccount {
  id                 String @id @default(cuid())
  organizationId     String
  provider           PaymentProvider // ECPAY
  providerCustomerId String?
  metadata           Json?
}

model PaymentTransaction {
  id                 String @id @default(cuid())
  organizationId     String
  provider           PaymentProvider
  merchantTradeNo    String
  amount             Decimal
  status             PaymentStatus
  rawPayload         Json?
}
```

### 13.4 ImpersonationSession

```prisma
model ImpersonationSession {
  id                String @id @default(cuid())
  actorUserId       String
  targetUserId      String?
  targetOrgId       String
  reason            String
  scope             Json
  startsAt          DateTime
  expiresAt         DateTime
  endedAt           DateTime?
}
```

所有 impersonation 期間的讀寫操作都應落 `AuditLog`，並標示 `impersonationSessionId`。

---

## 14. 執行導向的 route guard 規則

| Route group | Auth guard | Allowed roles | Redirect |
| --- | --- | --- | --- |
| `(marketing)` | none | public | 已登入可進 dashboard/org |
| `(auth)` | none/session-aware | public | 已登入依 default workspace 分流 |
| `(front-office)` share token | token guard | public token | token invalid 顯示安全錯誤頁 |
| `(client-auth)` | client session | client users | `/client-login` |
| `(member)` | app session | org member/collaborator | `/login` |
| `(org-admin)` | app session + org role | org owner/admin/manager | `/dashboard` 或 no access |
| `(super-admin)` | platform session | super admin/support/finance | `/super-admin/login` |

Super admin 的登入 cookie/session 應與一般 app session 分開，避免一般使用者登入態被誤判成平台管理員。

---

## 15. Org Admin 指標邊界

因已決策 manager 只看彙總與輔導指標，org admin 的核心資料應長這樣：

| 指標 | 可見層級 | 不可見內容 |
| --- | --- | --- |
| 成員活躍度 | member / unit aggregate | 客戶姓名與對話全文 |
| SPIN 完成率 | member / unit aggregate | 單一客戶 SPIN 明細 |
| 劇場弱項 | member / unit aggregate | 原始演練逐字稿，除非 member 分享 |
| 報告產出量 | member / unit aggregate | 報告全文，除非合規抽查授權 |
| 客戶跟進健康度 | count / status / aging | 客戶個資與保單細節 |
| AI 用量 | member / module aggregate | prompt 全文預設不可見 |

Org admin 的頁面設計因此應以 coaching list、unit heatmap、usage trend、member readiness 為主，不是 CRM super-view。

---

## 16. Share Page 與品牌規則

通訊處可自訂品牌出現在 share page，但要避免破壞可信度與合規：

- 顯示 `OrganizationUnit` 或 `Organization` 的 logo、display name、顧問名稱。
- brand color 只能作為小面積 accent，不取代系統的可讀性 token。
- 報告頁需保留誠問 AI 產出/輔助標示與免責聲明。
- 若 member 屬於 unit，優先顯示 unit 品牌；若沒有 unit 品牌，回退 organization 品牌。
- Super admin 可關閉某 org 的 share branding，以處理違規品牌素材。

---

## 17. 綠界研究摘錄

本文件只做產品與架構層研究，不直接定義完整綠界串接參數。已確認方向：

- 綠界官方 Developers 站提供 API 技術文件總覽，包含金流等服務。
- 綠界全方位金流 API 支援多種支付方式，且典型流程會導轉到綠界付款頁。
- 綠界信用卡定期定額 API 適合訂閱服務與固定扣款需求。

因此，誠問 AI 第一版 billing 可以採綠界作為 payment provider，但內部資料模型應保持 provider-neutral，避免未來更換或增加付款方式時重構核心 org/subscription。

來源：

- [ECPay Developers｜綠界科技 API 技術文件](https://developers.ecpay.com.tw/)
- [綠界全方位金流 API 技術文件](https://developers.ecpay.com.tw/2509/)
- [綠界信用卡定期定額 API](https://developers.ecpay.com.tw/2868/)

---

## 18. 建議下一輪 Batch Workstream

若要把本研究轉成 AGENTS.md 可執行 workstream，建議新增「Multi-role SaaS Architecture Batch Tasks」。初始卡片如下：

### Batch PSA-001 - PRD/ARC 定稿

- [ ] 產出 Multi-role SaaS PRD：personal、team、enterprise、client portal、super admin。
- [ ] 產出 Role/Permission/Route ARC：route guards、role matrix、manager visibility、impersonation audit。
- [ ] 更新文件索引與 AGENTS.md workstream。

### Batch PSA-002 - Auth Surface 分流

- [ ] 建立 `/login`、`/signup`、`/invite/[token]`、`/client-login`、`/super-admin/login` 的產品流程。
- [ ] 定義一般 app session、client session、platform session 的分離策略。
- [ ] 登入後依 role/default workspace redirect。

### Batch PSA-003 - Plan Config 與個人協作者

- [ ] 建立 plan config：`maxMembers`、`maxCollaborators`、`maxUnits`、AI quota、branding、client portal。
- [ ] 個人版 organization 支援邀請協作者，但依 super admin 設定限制上限。
- [ ] 超過上限時顯示升級或聯絡管理員流程。

### Batch PSA-004 - OrganizationUnit 多層級

- [ ] 新增總公司/區部/通訊處 unit tree 模型。
- [ ] 成員可指定 primary unit 與管理範圍。
- [ ] Org admin 報表依 unit scope 聚合。

### Batch PSA-005 - Demo Account 與 Mockdata 資料庫化

- [ ] 盤點所有 runtime mock/localStorage 資料來源。
- [ ] 將現有 mockdata 轉成 canonical demo seed fixtures，並寫入 DB demo organization。
- [ ] 建立 member、manager、client portal、staging super admin demo accounts。
- [ ] Runtime UI/service 不再依賴本地 mockdata 或 localStorage business persistence。
- [ ] 清空 browser storage 後，demo account 仍可完整體驗。

### Batch PSA-006 - Org Admin 輔導台

- [ ] `/org` 第一屏回答「誰需要輔導、下一步是什麼」。
- [ ] 只顯示彙總、輔導、訓練、AI 用量，不顯示 member 客戶明細。
- [ ] 補成員邀請、席次、unit filter、coaching queue。

### Batch PSA-007 - Share Branding 與 Client Portal

- [ ] Share page 讀取 organization/unit branding。
- [ ] Token access 保留，新增 client login / client portal 設計。
- [ ] 客戶可查看授權報告、預約、回覆、補資料。

### Batch PSA-008 - 綠界 Billing

- [ ] 將 Stripe 命名欄位改成 provider-neutral billing 模型。
- [ ] 實作綠界 checkout/order、notification、query、payment status。
- [ ] 付款狀態連動 plan config、seat limit、AI quota、branding。

### Batch PSA-009 - Super Admin 與 Impersonation

- [ ] 建立 platform-only super admin guard。
- [ ] 建立 impersonation session：reason、scope、expiry、target org/member。
- [ ] 所有 impersonation 操作寫 AuditLog，可搜尋、可匯出、可事後稽核。

### Batch PSA-010 - Cross-surface QA

- [ ] 每個核心功能補四介面責任：front office、member、org admin、super admin。
- [ ] 檢查 route guard、data visibility、demo account DB seed、mockdata runtime removal、empty/error/loading state。
- [ ] 補 desktop/mobile 截圖與 diff-scoped lint。

---

## 19. 本研究的核心決策

本研究建議將誠問 AI 的下一階段架構定義為：

```text
Marketing / Commerce
  -> Auth / Plan / Workspace Selection
  -> Front Office
  -> Member Admin
  -> Org Admin
  -> Super Admin
```

每個新功能都必須回答：

- 這個功能在前台頁面是否需要被看見？
- member 如何使用它完成個人工作？
- org admin 如何用它管理團隊與輔導？
- super admin 是否需要看它的用量、風險、成本或設定？

若四個問題沒有被回答，功能就還不是完整 SaaS 功能，只是單頁工具。
