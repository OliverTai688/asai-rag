# 誠問 AI Multi-role SaaS 產品規格 v1.0

> 建立日期：2026-06-18  
> 狀態：v1.0  
> 適用範圍：誠問 AI 從商務前端、登入分流，到 front office、member admin、org admin、super admin 的多角色 SaaS 產品規格。  
> 研究依據：`RES-007_product-surface-and-admin-architecture-v1.0.md`、`RES-009_demo-account-and-mockdata-database-migration-v1.0.md`。  
> 架構依據：`ARC-006_role-permission-route-architecture-v1.0.md`。

---

## 1. 產品目標

誠問 AI 下一階段不再只是單一 dashboard app，而是一套可對外銷售、可支援個人業務員與多層級企業/通訊處的保險銷售智能 SaaS。

本 PRD 的產品目標：

1. 建立完整商務入口：一頁式介紹、方案購買、登入/註冊、個人/企業分流。
2. 建立四種登入後 surface：front office、member admin、org admin、super admin。
3. 支援 personal、team、enterprise 三種方案路徑。
4. 將體驗範例從本地 mockdata 轉為資料庫 demo account。
5. 讓每個核心功能都能回答：客戶看到什麼、業務員做什麼、主管管理什麼、平台方稽核什麼。

---

## 2. Hard Decisions

以下決策為後續開發硬規則：

- 個人版可邀請少量協作者，但上限由 super admin 的 plan config 控制。
- Org manager 只看彙總與輔導指標，不看 member 客戶明細、保單明細、SPIN 對話全文或 Theater 逐字稿。
- 通訊處/企業品牌可出現在 share page 與 client portal，但只能作小面積 accent，且不得遮蔽誠問 AI 免責與合規資訊。
- 企業方案支援多層級：總公司、區部、通訊處。
- Super admin 需要 impersonation，但必須具備 reason、scope、expiry 與 audit log。
- 付款 provider 第一版採綠界；內部 billing model 必須 provider-neutral。
- 前台客戶頁未來支援個人/企業登入；super admin 使用獨立登入入口。
- Mockdata 只能作為 seed material，不可作為 production runtime data source。

---

## 3. Product Surfaces

| Surface | 主要對象 | 首頁問題 | 主要 CTA |
| --- | --- | --- | --- |
| Marketing / Commerce | 未登入訪客、採購決策者 | 這產品是否值得試用或購買？ | 開始試用 / 查看方案 |
| Front Office | 客戶、被分享報告者 | 這份報告結論是什麼？下一步是什麼？ | 預約 / 回覆 / 登入客戶頁 |
| Member Admin | 個人業務員、通訊處成員 | 今天最該跟進誰？ | 開始拜訪規劃 |
| Org Admin | 主管、訓練負責人 | 誰需要輔導？團隊哪裡卡住？ | 指派輔導 / 邀請成員 |
| Super Admin | 誠問 AI 營運/客服/財務 | 平台今天有什麼風險或異常？ | 查看異常 / 處理工單 |

---

## 4. Plans and Packaging

### 4.1 Personal

對象：個人業務員、獨立顧問。

必備能力：

- 個人 dashboard、CRM、訪前規劃、SPIN、Theater、Reports、Share。
- personal organization，預設 owner 為註冊者。
- 可邀請少量 collaborator，數量由 `PlanConfig.maxCollaborators` 控制。
- AI quota、share branding、client portal 是否開啟皆由 plan config 控制。
- 可載入 demo seed data。

成功標準：新用戶第一天可完成一位客戶的訪前規劃或一場 Theater 演練。

### 4.2 Team

對象：小型通訊處、業務團隊。

必備能力：

- 包含 personal 所有 member 工作流。
- Org admin 可管理成員、席次、AI 用量、訓練與輔導 queue。
- Manager 只看彙總與輔導指標。
- Share page 可套 organization branding。
- 可建立 demo manager/member account。

成功標準：主管可在 10 秒內看出誰需要輔導與下一步。

### 4.3 Enterprise

對象：大型保經代、保險公司、跨區通訊處。

必備能力：

- 支援 OrganizationUnit：總公司、區部、通訊處。
- Unit-scoped manager visibility。
- Unit branding fallback 到 organization branding。
- 可設定 plan config：`maxMembers`、`maxUnits`、AI quota、branding、client portal。
- Super admin 可管理授權、付款、impersonation 與 audit。

成功標準：總公司可用同一 organization 管理多層級 unit，但資料仍由 `organizationId` 隔離。

---

## 5. Core Workflows

### 5.1 Signup and Workspace Selection

```text
Landing / Pricing
  -> Signup
  -> 選 personal / team / enterprise
  -> 建立 User
  -> 建立或加入 Organization
  -> 綁定 Plan / Trial / Seat
  -> 依 role redirect
```

Redirect 規則：

- member / collaborator -> member admin
- org owner / org admin / manager -> org admin
- client user -> client portal
- platform role -> super admin

### 5.2 Demo Account

Demo account 是真實資料庫帳號，不是 mock mode。

必備條件：

- demo member、demo manager、demo client portal、staging demo super admin。
- 所有 demo records 有 `organizationId` 與 `isDemo` 或 seed scenario metadata。
- 清空 browser storage 後登入 demo account，資料仍可完整復原。
- `/api/mock/*` 不可作為 production runtime data source。

### 5.3 Org Admin Coaching

Org admin 首頁必須顯示：

- 需要輔導的人。
- 卡住的原因：SPIN 完成率、Theater 弱項、拜訪節奏、報告產出、AI 用量。
- 建議下一步：指派輔導、安排訓練、邀請成員、檢查用量。

禁止顯示：

- member 客戶姓名明細。
- 保單明細。
- SPIN 對話全文。
- Theater 逐字稿。

### 5.4 Front Office / Client Portal

Front office 初期以 `/share/[token]` 為主，後續擴充 client login。

客戶可做：

- 查看授權報告。
- 預約下一步。
- 回覆需求。
- 補資料。

客戶不可做：

- 進入內部 CRM。
- 查看其他客戶。
- 查看團隊績效。
- 查看 AI prompt 或內部評分。

### 5.5 Super Admin and Impersonation

Super admin 必須與一般 app session 分離。

Impersonation 必備條件：

- actor、target org/member。
- reason。
- scope。
- expiry。
- start/end event。
- 操作 audit log。

Support 不可無痕接管帳號，不可永久 impersonate。

---

## 6. Functional Responsibility Matrix

| 功能 | Front Office | Member Admin | Org Admin | Super Admin |
| --- | --- | --- | --- | --- |
| CRM | 只看被授權資料 | 管自己的客戶 | 看彙總與輔導摘要 | 支援/稽核，不預設瀏覽 |
| SPIN | 不可見 | 建立與執行 session | 看完成率與弱項 | 看用量、錯誤、成本 |
| Theater | 不可見 | 個人演練與回饋 | 看弱項趨勢 | 管成本、persona template |
| Visit | 可接收會前摘要 | 建立準備包 | 看拜訪節奏 | 看 API 健康度 |
| Reports | 看授權報告 | 生成、編輯、分享 | 看產出量與合規摘要 | 管分享風險 |
| Billing | 付款/升級入口 | 個人訂閱 | 席次與企業付款 | 方案、折扣、退款 |
| Demo seed | 看授權 demo 報告 | 體驗 DB demo data | 看 demo aggregate | 管 scenario/reset |
| AiUsageLog | 不可見 | 看個人 quota | 看 org 用量 | 看全平台成本 |

---

## 7. Non-goals

- 本 PRD 不要求立即搬移所有現有 routes。
- 本 PRD 不實作 auth provider。
- 本 PRD 不實作綠界 API。
- 本 PRD 不改 SPIN 狀態機。
- 本 PRD 不改 Theater persona enum。
- 本 PRD 不刪除或 optional 化合規欄位。

---

## 8. Acceptance Criteria

- 每個 surface 有清楚首頁任務與主 CTA。
- 每個核心功能都能映射到 front office、member admin、org admin、super admin 的責任矩陣。
- Manager visibility 明確限制在彙總與輔導指標。
- Personal collaborator 上限由 plan config 控制。
- Enterprise unit hierarchy 支援總公司、區部、通訊處。
- Super admin impersonation 具 reason、scope、expiry、audit。
- Demo account 讀取 DB records，不依賴本地 mockdata。
- 綠界是第一版 payment provider，但 billing model 不綁死 provider。
