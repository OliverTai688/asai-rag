# 誠問 AI Role-aware Sidebar Navigation Acceptance Framework v1.0

> 建立日期：2026-06-19  
> 適用範圍：`PLN-021_role-aware-sidebar-navigation-batch-tasks-v1.0.md` 的 role-aware sidebar navigation 任務。  
> 關聯研究：`RES-020_role-aware-sidebar-navigation-research-v1.0.md`、`RES-008_ai-first-sidebar-navigation-research-v1.0.md`。  
> 關聯架構：`ARC-006_role-permission-route-architecture-v1.0.md`、`ACC-004_multi-role-saas-architecture-acceptance-framework-v1.0.md`。

---

## 1. 驗收目標

每張 RAS 卡完成時，必須同時滿足：

1. **Role-aware but server-safe**：sidebar 會依身份權限改變，但資料保護仍由 server policy / route guard / API guard 負責。
2. **Surface 清楚**：member admin、org admin、super admin、client portal 的導覽家族不同，不混成單一長清單。
3. **AI-first 不退化**：member sidebar 仍優先呈現 `問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`。
4. **權限不外溢**：manager 不因管理身份看到 member 客戶明細；client 不進 dashboard；super admin 不用一般 app session。
5. **可驗證**：每個 role/capability 變化都有 resolver test、script proof、Browser QA 或清楚的 blocker note。

---

## 2. Navigation Brief 驗收

每張 RAS 實作卡開始前，agent 必須產出 navigation brief，至少包含：

- **Surface scope**：member admin、org admin、super admin、client portal 哪些 surface 受影響。
- **Roles**：organization role、platform role、client role、token access 哪些角色受影響。
- **Routes**：新增、修改、保護或只改顯示的 routes。
- **Navigation change**：新增/隱藏/disable/teaser/surface switch 哪些 item。
- **Data visibility**：哪些資料可以看到，哪些資料仍不可見。
- **Plan/feature impact**：是否受 plan capability、AI quota、legacy SPIN flag、org admin beta、client portal flag 影響。
- **Verification plan**：會跑哪些命令、哪些 resolver cases、哪些 Browser/URL guard proof。

若未產出 brief，卡不得標完成。

---

## 3. Contract Acceptance Checklist

- [ ] Sidebar contract 能表達 section、link item、button action、surface switch、badge、disabled reason、aria label。
- [ ] Contract 不把權限寫死在 React component 內。
- [ ] Contract 能區分 `href` navigation 與 `openAssistant` 等 action。
- [ ] Contract 能標示 `legacy`、`beta`、`upgrade` 類型，不需用彩色大面積 UI 表達。
- [ ] Contract 能支援 collapsed/mobile tooltip 與 accessible name。
- [ ] Manifest 至少覆蓋 member、org admin、super admin、client portal 四套 sidebar 家族。

---

## 4. Role Visibility Acceptance Checklist

- [ ] Collaborator 只看到授權工作、可用 AI 項與個人設定，不看到團隊管理或通訊處設定。
- [ ] Member 看到今日、AI 工作台、客戶工作、個人設定；不看到 org-wide settings。
- [ ] Manager 可看到 scoped 團隊/輔導/aggregate 導覽，但不能看到 billing/plan write action。
- [ ] Org admin / owner 可看到成員、單位、邀請、品牌、用量、通訊處設定等 org admin 項目。
- [ ] Super admin / support / finance 從獨立 platform surface 看到平台導覽，不混入 member routes。
- [ ] Client portal/token viewer 不看到 CRM、team、AI prompt、coaching、內部設定。
- [ ] 同一使用者具備多種身份時，使用 surface switch，不把所有身份項目混成同一層。

---

## 5. Guard Alignment Acceptance Checklist

- [ ] Sidebar 顯示的每個 route 都有對應 route/API guard 或已註記為 pure client action。
- [ ] 手打 URL 不得取得比 sidebar 顯示更寬的權限。
- [ ] `/settings` 僅處理 current member settings；`/team/settings` 或 org settings 需 owner/admin，manager 只可 scoped/read-only。
- [ ] App session 不能進 super admin；platform session 不能自動變成 member data access。
- [ ] Client session/token access 不能進 member/org dashboard。
- [ ] Manager/org admin API 不回傳 member 客戶姓名、保單明細、SPIN 對話全文、Theater 逐字稿，除非另有 audit/break-glass 規格。
- [ ] Plan/capability 限制 server-side 仍會重檢，不只前端 disable。

---

## 6. AI-first Sidebar Acceptance Checklist

- [ ] Member sidebar 第一屏保留 `AI 工作台`，順序為 `問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`，legacy SPIN 由 feature flag 控制。
- [ ] `問誠問 AI` 在不同 surface 的可見性與 scope 一致：member 不讀 org raw detail，org 不讀 member private detail，super admin 不讀敏感業務內容。
- [ ] Assistant action 在 mobile drawer 點擊後行為正常；若會關閉 drawer，focus/aria 狀態不破。
- [ ] `AI 顧問陪談` 與 `/interview` 保持主入口；`SPIN 舊版` 不應成為新使用者第一主線。
- [ ] 不改 SPIN 狀態機、不改 Theater enum、不改 server-side scoring/turn contract。

---

## 7. Visual and Accessibility Acceptance Checklist

若 RAS 卡包含 UI，除本框架外仍需符合 `ACC-003`：

- [ ] Desktop expanded/collapsed sidebar 無水平 overflow。
- [ ] Mobile drawer 第一屏顯示該角色最重要 section。
- [ ] Collapsed state 保留 group spacing，不形成無層級 icon wall。
- [ ] Icon-only item/action 具備 `aria-label` 與 tooltip。
- [ ] Keyboard tab order 合理，focus ring 可見且 active rail 不遮蔽 focus。
- [ ] 符合 ARC-003：paper/ink/hairline、1px navy active rail、無重陰影、無滿版藍底、gold 小面積。
- [ ] reduced-motion 下 sidebar transition 不造成理解依賴。
- [ ] Dark mode 基本可讀，active/disabled/upgrade 狀態對比足夠。

---

## 8. Verification

每張卡完成前：

- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`。
- [ ] 跑 `pnpm lint:changed`。
- [ ] 若改 route/layout/auth/session/navigation behavior，註記已讀 Next.js bundled docs。
- [ ] 若改 resolver/policy，補 role matrix test、script 或 fixture proof。
- [ ] 若改 UI，使用 Browser 檢查 desktop 與 mobile viewport；重要頁面保存截圖。
- [ ] 若缺正式 auth/session，清楚標示以 mock fixture 驗收的範圍，不宣稱 production auth 通過。
- [ ] 若碰 schema 才跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`；本 workstream 預設不需要 schema change。

---

## 9. Hard Stop Conditions

以下任一情況發生，卡不得標完成：

- Sidebar hide/show 被當成唯一權限控制。
- Manager 可以直接看到所有 member 客戶明細、保單明細、SPIN 對話全文或 Theater 逐字稿。
- Client portal/token viewer 可以看到內部 CRM、團隊績效、AI prompt 或 coaching note。
- Super admin 可以用一般 app session 進入平台後台。
- Support/finance 預設可 impersonate 或讀敏感內容，且無 reason/scope/expiry/audit。
- Plan limits 只在前端限制，server-side 可繞過。
- `問誠問 AI` 跨 surface 讀取超出當前身份的資料。
- 刪除或 optional 化 client/policy 合規欄位。
- 改壞 SPIN 狀態機或 Theater persona/scoring contract。
- 未跑 `tsc` 或 `lint:changed` 卻把卡標完成。
