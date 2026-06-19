# 誠問 AI Multi-role SaaS Architecture Acceptance Framework v1.0

> 建立日期：2026-06-18  
> 適用範圍：`PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md` 的多角色 SaaS 架構任務。  
> 關聯研究：`RES-007_product-surface-and-admin-architecture-v1.0.md`、`RES-009_demo-account-and-mockdata-database-migration-v1.0.md`。

---

## 1. 驗收目標

每張 PSA 卡完成時，必須同時滿足：

1. **Surface 清楚**：front office、member admin、org admin、super admin 的任務與資料邊界不混用。
2. **權限安全**：manager 只看彙總與輔導指標；super admin 需獨立 session；impersonation 必須可稽核。
3. **商務閉環**：personal/team/enterprise、協作者上限、unit 層級、綠界付款、client portal 都能接到 plan config。
4. **資料真實性**：體驗範例資料是 DB demo records，不是 runtime 本地 mockdata。
5. **工程可落地**：route、schema、service、UI 或文件都能被下一張卡接續，不留下只有概念的描述。

---

## 2. Architecture Brief 驗收

每張 PSA 卡實作前，agent 必須先產出 architecture brief，至少包含：

- **Surface scope**：本卡影響哪些 surface：marketing、front office、member admin、org admin、super admin。
- **Roles**：涉及 platform role、org role、client role、front token access 哪些角色。
- **Routes**：新增、修改或保護的 routes。
- **Data visibility**：哪些資料可見、哪些資料不可見，尤其是客戶明細、保單、AI prompt、對話全文。
- **Plan/billing impact**：是否影響 plan config、協作者上限、seat、AI quota、綠界付款。
- **Demo data impact**：是否影響 demo accounts、seed fixtures、`isDemo` records、mock route quarantine、localStorage removal。
- **Audit/security impact**：是否需要 AuditLog、impersonationSessionId、break-glass reason、rate limit。
- **Verification plan**：本卡會跑哪些指令、檢查哪些頁面或資料邊界。

若未產出 brief，卡不得標完成。

---

## 3. Surface Acceptance Checklist

- [ ] Marketing / commerce 不依賴登入即可理解產品與方案。
- [ ] Front office 不暴露內部 CRM、團隊績效、AI prompt、其他客戶資料。
- [ ] Member admin 預設只呈現自己的客戶、拜訪、SPIN、劇場、報告與任務。
- [ ] Org admin 只呈現彙總、輔導、訓練、unit/member health、AI 用量，不呈現 member 客戶明細。
- [ ] Super admin 與一般 app 分離登入、分離 guard、分離 navigation。
- [ ] 每個新增 route 有明確 allowed roles 與 unauthenticated redirect。

---

## 4. Permission Acceptance Checklist

- [ ] 個人版 organization 可邀請協作者，但受 `maxCollaborators` 或同等 plan config 限制。
- [ ] 超過協作者/席次/unit 上限時，server-side 也拒絕，不只前端 disable。
- [ ] Org manager 看不到客戶姓名、保單明細、SPIN 對話全文、Theater 逐字稿，除非有明確授權與 audit。
- [ ] Client user/token 只能看被授權的報告、預約、回覆或補件資料。
- [ ] Super admin 查看敏感內容需 reason；support impersonation 需 scope 與 expiry。
- [ ] service_role、admin key、payment secret 不出現在前端 bundle。

---

## 5. Data Model Acceptance Checklist

- [ ] 所有 business records 保持 `organizationId` 隔離。
- [ ] Enterprise 多層級用 `OrganizationUnit` 或同等 unit tree 表達，不把每個層級拆成不相關 tenant。
- [ ] 需要 unit 報表或 share branding 的資料具備 unit 關聯或可推導的 fallback。
- [ ] Plan 能力由 config 控制，不硬編碼 personal/team/enterprise 限制。
- [ ] Billing 欄位 provider-neutral，不再把 Stripe/ECPay 等 provider 名稱寫死在核心 organization 欄位。
- [ ] Impersonation 與 AuditLog 可關聯，事後能查 actor、target、reason、scope、time window。

---

## 6. Billing Acceptance Checklist

- [ ] 綠界付款流程有 order create、return/notification、query/reconcile 的狀態設計。
- [ ] 付款成功不只信任前端 redirect。
- [ ] Payment transaction raw payload 存 server-side，不暴露給一般使用者。
- [ ] Subscription/order 狀態能連動 plan、seat、AI quota、branding、client portal。
- [ ] 付款失敗、取消、退款、續約失敗有明確狀態與 UI 恢復路徑。

---

## 7. Demo Data Acceptance Checklist

- [ ] Runtime UI/page/service 不 import `src/domains/*/mocks.ts` 作為業務資料來源。
- [ ] Zustand/localStorage 只保存 UI state，不保存 client/report/session/visit/theater 作為 canonical business data。
- [ ] `/api/mock/*` 不被 production UI 呼叫；若保留，需 dev/test guard。
- [ ] Demo member account 清空 browser storage 後重新登入，仍可看到完整範例資料。
- [ ] Demo organization、users、clients、policies、visit plans、SPIN sessions、Theater sessions、reports、shares、events 都可在 DB 查到。
- [ ] Demo records 有 `organizationId`，並以 `isDemo`、scenario、seedKey 或同等機制可辨識與重置。
- [ ] Demo reset 只刪 demo records，不刪真實資料。
- [ ] AiUsageLog 仍記錄 demo AI calls；若為 seeded/mock output，可使用 `provider=MOCK`，但必須寫入 DB。

---

## 8. UI Acceptance Checklist

若 PSA 卡包含 UI，除本框架外仍需符合 `ACC-003`：

- [ ] 每個 surface 的首頁回答自己的主問題，不共用同一套 dashboard 文案。
- [ ] Org admin 第一屏回答「誰需要輔導、下一步是什麼」。
- [ ] Super admin 第一屏回答「平台今天有什麼風險或異常」。
- [ ] Client-facing 頁面 mobile-first、可信、品牌可見但不干擾合規免責。
- [ ] icon-only button 有 `aria-label` 與 tooltip。
- [ ] desktop/mobile 無水平 overflow、文字擠壓或互相遮擋。

---

## 9. Verification

每張卡完成前：

- [ ] 跑 `pnpm lint:changed`。
- [ ] 動到 Prisma schema 才跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [ ] 若改 route/layout/middleware/session，附上相關 Next.js docs 已讀章節或簡短註記。
- [ ] 若改 UI，使用瀏覽器檢查 desktop 與 mobile viewport；重要頁面保存截圖。
- [ ] 若改 auth/permission/billing/audit，至少補一個可重複驗證的測試、script、mock scenario 或 QA checklist。
- [ ] 若改 demo seed/mockdata/runtime data source，至少補一個從空 browser storage 登入 demo account 的 QA checklist。

---

## 10. Hard Stop Conditions

以下任一情況發生，卡不得標完成：

- Org manager 可以直接瀏覽所有 member 客戶明細。
- Super admin impersonation 沒有 reason、expiry 或 audit trail。
- Client/front office 可以看到內部 CRM、其他客戶資料或團隊績效。
- Payment callback 只靠前端 redirect 判斷付款成功。
- Plan limits 只在前端限制，server-side 可繞過。
- Production runtime 仍依賴本地 mockdata 或 localStorage business persistence。
- Production UI 呼叫 `/api/mock/*` 作為業務資料來源。
- Demo account 無法在清空 browser storage 後恢復完整範例資料。
- 刪除或 optional 化 client/policy 合規欄位。
- 改壞 SPIN 狀態機或 Theater persona enum。
