# 誠問 AI Role-aware Sidebar Navigation Batch Tasks v1.0

> 建立日期：2026-06-19  
> 狀態：待執行  
> 研究依據：`RES-020_role-aware-sidebar-navigation-research-v1.0.md`  
> 架構依據：`ARC-006_role-permission-route-architecture-v1.0.md`、`RES-013_four-surface-launch-implementation-research-v1.0.md`  
> 設計依據：`RES-008_ai-first-sidebar-navigation-research-v1.0.md`、`ARC-003_elevenlabs-design-direction-v1.0.md`  
> 驗收依據：`ACC-013_role-aware-sidebar-navigation-acceptance-framework-v1.0.md`

本計畫把 `RES-020` 的 role-aware sidebar 研究轉成可逐張執行的 batch tasks。範圍只包含登入後 sidebar navigation contract、server-side resolver、workspace bootstrap、route guard 一致性、member/org/super/client 不同 surface 的導覽顯示與 QA；不改 SPIN 狀態機、不改 Theater enum、不刪合規欄位、不把 sidebar hide/show 當成唯一權限控制。

---

## 0. 執行協定

每張卡的固定流程：

1. **讀文件**：`RES-020`、`ARC-006`、`RES-008`、`RES-013`、`ACC-013`、本卡。
2. **讀 Next.js 文件**：若改 `src/app/` route group、layout、middleware、server component/client component boundary、navigation 或 auth guard，先讀 `node_modules/next/dist/docs/` 對應章節。
3. **現況盤點**：確認 `src/components/layout/sidebar.tsx`、dashboard layout、現有 org APIs、super admin route、workspace/session helper 狀態。
4. **產出 navigation brief**：每張實作卡先註記 surface、roles、routes、data visibility、plan/feature flag、verification plan。
5. **實作**：優先建立可測試的 server-side navigation contract/resolver，再接 UI；避免在 client component 內硬寫散落 role 判斷。
6. **驗收**：`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 必跑；改 route/layout/auth 時做 URL guard proof；改 UI 時做 desktop/mobile Browser QA。
7. **打勾**：完成後本文件與 `AGENTS.md` 對應卡片改 `[x]`，並在卡片註記變更檔案、QA 結果、截圖或 proof 路徑。

---

## 1. 進度看板

| 卡片 | 範圍 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| RAS-001 | Role-aware navigation contract | ✅ | `RES-020` |
| RAS-002 | Server-side sidebar resolver and policy tests | ✅ | RAS-001 |
| RAS-003 | Workspace bootstrap and route guard alignment | ✅ | RAS-002 |
| RAS-004 | Sidebar renderer, surface switch, and legacy SPIN visibility | ✅ | RAS-003 |
| RAS-005 | Cross-role QA, docs sync, and AGENTS status update | ✅ fixture/source proof; live auth matrix not claimed | RAS-004 |

---

## Batch RAS-001 - Role-aware navigation contract

目標：建立 sidebar item/section/action 的 canonical contract，讓 member、org admin、super admin、client portal 可用同一個資料結構投影不同導覽。

- [x] 盤點目前 `src/components/layout/sidebar.tsx` 的 section、route、assistant action、active state、tooltip/aria 行為，形成 migration note。
- [x] 定義 `SidebarSection`、`SidebarItem`、`SidebarAction`、`SidebarBadge`、`SidebarDisabledReason` 等型別；需能表達 `href`、`action`、`visible`、`disabled`、`reason`、`badge`、`ariaLabel`。
- [x] 定義 `SidebarContext` input，至少包含 session type、organization role、platform role、client role、managed unit scope、plan capabilities、feature flags、demo mode。
- [x] 建立 member / org admin / super admin / client portal 四套 manifest draft，保留 `RES-008` 的 AI-first 命名：`問誠問 AI`、`AI 了解客戶`、`AI 劇場演練`。
- [x] 明確標註 `SPIN 舊版` 只由 legacy feature flag 顯示，不作新使用者常駐主入口。
- [x] 不改 route guard、不改 business data、不改 assistant/theater/spin store。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

完成註記：2026-06-20 新增 `src/domains/navigation/role-aware-sidebar.ts` canonical contract 與 `pnpm nav:role-aware-contract-qa`。Contract 覆蓋 member / org admin / platform / client portal 四套 manifest draft、`SidebarContext`、action/link/visible/disabled/badge/aria contract、legacy `SPIN 舊版` feature flag 與 current sidebar migration note。此卡不接 sidebar UI、不改 route guard、不改 business data；後續 RAS-002 需把 contract 接成 resolver/policy tests。

範圍外：不接 API；不改 sidebar UI；不新增資料庫欄位。

---

## Batch RAS-002 - Server-side sidebar resolver and policy tests

目標：把 role-aware visibility 從 client component 抽到可測試的 resolver/policy helper。

Whole-product review note（2026-06-20 after RAS-001）：若 Supabase DB/DNS 仍阻擋 BFF/Theater browser proof，RAS-002 是下一個最高安全 fallback。它不需要 DB/provider，即可把 RAS-001 contract 轉成可測試 resolver，驗證 manager / client / platform 不會因 sidebar 顯示取得更寬資料邊界；不得把 resolver proof 宣稱為正式 route guard/browser auth proof。

- [x] 建立 `resolveSidebarSections(context)` 或同等 helper，輸入 RAS-001 contract，輸出已過濾/標註 disabled 的 sections。
- [x] 建立 navigation policy helpers，至少覆蓋 `canAccessMemberRoute`、`canAccessOrgAdmin`、`canManageOrgSettings`、`canReadOrgAggregate`、`canUseAiModule`、`canAccessPlatformTool`。
- [x] 補測試或可重複 script 覆蓋 collaborator、member、manager、org admin、org owner、support、finance、super admin、client viewer。
- [x] 驗證 manager 只能看 scoped org aggregate 導覽，不因 sidebar 顯示而取得 member 客戶明細。
- [x] 驗證 super admin 導覽不會出現在一般 app session；client portal 不會出現 CRM/team/AI prompt/coaching 項目。
- [x] Plan capability off 時，resolver 使用 hide/disable/upgrade/surface switch 策略一致。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；若新增測試，跑對應 test command。

完成註記：2026-06-20 RAS-002 已完成。`src/domains/navigation/role-aware-sidebar.ts` 新增 `resolveSidebarSections()`、policy helpers 與 resolved item diagnostics；`scripts/role-aware-sidebar-resolver-qa.mjs` / `pnpm nav:role-aware-resolver-qa` 以 fixtures 驗證 collaborator、member、scoped manager、manager without unit、org admin、org owner、support、finance、super admin、app-session super admin 與 client viewer。Proof 明確只涵蓋 resolver/policy，不宣稱正式 route guard/browser auth；support/finance 不預設取得 impersonation；client portal 不含內部 CRM/team/AI/platform routes。

範圍外：不處理真實 auth provider migration；不改 Prisma schema，除非另有 PSA 卡明確要求。

---

## Batch RAS-003 - Workspace bootstrap and route guard alignment

目標：讓登入後 bootstrap 回傳 role-aware navigation，且 URL route guard 與 sidebar visibility 共用同一批 policy 判斷。

- [x] 盤點現有 workspace/session/bootstrap 入口；若不存在正式 endpoint，先建立最小 `/api/workspace/bootstrap` contract 或 server helper。
- [x] Bootstrap response 回傳 current user、current organization、membership/role、plan capabilities、feature flags、sidebar sections、default surface redirect。
- [x] 將 member/org/super/client route guard 與 navigation policy 對齊；手打 URL 不可比 sidebar 顯示更寬。
- [x] `/settings` 與 `/team/settings` 權限分離：前者 current member；後者 owner/admin，可對 manager scoped/read-only。
- [x] 同一使用者同時具備 member/org 權限時，明確回傳 surface switch entry，不把兩套 sidebar 混成一條長清單。
- [x] 若改 route/layout/session 行為，註記已讀的 Next.js bundled docs 章節。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；若改 API/guard，補 curl/script proof。

完成註記：2026-06-20 RAS-003 已完成。新增 `src/lib/navigation/workspace-sidebar.ts`、更新 `/api/workspace/bootstrap`，並新增 `pnpm nav:workspace-bootstrap-qa` / `pnpm nav:route-guard-qa`。Bootstrap response 維持既有 user/org/membership/plan/quota/auth 欄位，新增 `navigation.sidebarSections`、`defaultSurfaceRedirect`、`surfaceSwitches`、`routeGuardAlignment`、`settingsRoutePolicy` 與 no-provider/no-db-write proof。`requireOrgAdmin()` / `requireOrgAdminRoute()` 改用 `canReadWorkspaceOrgAggregate()`，manager 必須有 managed unit scope；`/team/settings` 改用 `requireOrgSettingsRoute()`，`/api/org/settings` 改用 `requireOrgSettingsAdmin()`，owner/admin only。QA 覆蓋 member、owner/admin、scoped/unscoped manager、legacy `AGENT` role、quota exhausted AI disabled state、org surface 不混 member client routes、手打 `/team` / `/team/settings` / `/super-admin` / `/client/*` policy denial。此為 deterministic source/fixture proof，不宣稱完整 production browser auth；RAS-005 仍需跨角色 Browser/URL guard matrix。

範圍外：不實作完整 Supabase Auth provider；不新增 production write；不處理 billing callback。

---

## Batch RAS-004 - Sidebar renderer, surface switch, and legacy SPIN visibility

目標：讓 `src/components/layout/sidebar.tsx` 使用 role-aware navigation sections render，並保留現有 AI-first visual/a11y polish。

- [x] Sidebar renderer 改讀 RAS-003 navigation sections，保留現有 open/collapsed/mobile drawer、active rail、tooltip、aria-label、assistant action。
- [x] Member sidebar 第一屏保留 `今日` 與 `AI 工作台`；org admin sidebar 第一屏回答「誰需要輔導、下一步是什麼」；super admin sidebar 不混入 member routes。
- [x] `問誠問 AI` 可在不同 surface 顯示，但 assistant scope 文案或 payload 不跨越該 surface 的資料邊界。
- [x] `SPIN 舊版` 由 legacy feature flag 控制；`AI 了解客戶` `/interview` 保持新主入口。
- [x] `團隊管理`、`通訊處設定`、`個人設定` 依 role/capability 顯示，避免所有 membership 無差別看到 org-wide 設定。
- [x] Mobile drawer 第一屏顯示該角色最重要 section；collapsed state 不變成無層級 icon wall。
- [x] 符合 ARC-003：paper/ink/hairline、1px navy active rail、無滿版藍底、無重陰影、gold 只作稀有訊號。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；用 Browser 做 desktop/mobile QA 並保存重要截圖。

進行註記（2026-06-20 RAS-004a）：已新增 `buildWorkspaceSidebarRenderModel()` 與 `pnpm nav:sidebar-renderer-contract-qa`，先把 RAS-003 workspace bootstrap sections 轉為 sidebar renderer 可消費的 view model。Proof 覆蓋 member surface 第一屏 `今日` / `AI 工作台`、`問誠問 AI` member-own-assigned scope、org admin `org-aggregate` scope、surface switch、`/team/settings` active state、legacy SPIN feature flag、unscoped manager downgrade、AI quota disabled，以及 no-provider/no-db-write posture。此進行註記不代表 RAS-004 完成：`src/components/layout/sidebar.tsx` 尚未接上 view model，且該檔目前有其他工作留下的 `/notes` dirty diff，本輪未 staging/overwrite。

Whole-product review note（2026-06-20 after RAS-004a）：本輪第五輪 LV3 校準把 `RAS-004b sidebar UI wiring` 定為 DB blocked 時的下一個安全 fallback。實作時只把 `buildWorkspaceSidebarRenderModel()` 接進 sidebar renderer，保留現有 AI-first minimal UI、mobile/collapsed state、tooltip/aria/focus behavior、surface switch 與 legacy SPIN flag；不得順手整理 `/notes` dirty diff、不得改 AI route/SPIN/Theater runtime。若 Supabase DB/DNS 恢復，product-level primary 可切回 `ITA-003f/S1 Route B relationship-graph stage map (no-provider)`。

進行註記（2026-06-20 RAS-004b）：已新增 `src/components/layout/role-aware-sidebar.tsx`，並讓 `src/app/(dashboard)/layout.tsx` server-side 建立 member/orgAdmin `buildWorkspaceSidebarRenderModel()` 後傳入 `DashboardShell`；`DashboardShell` 改用 `RoleAwareSidebar` 作 desktop/mobile drawer 主 renderer。Legacy `src/components/layout/sidebar.tsx` 仍保留且含其他工作留下的 `/notes` dirty diff，本輪未修改、未 staging、未混入。`pnpm nav:sidebar-ui-qa` 驗證 shell/layout wiring、member/org active item、assistant scope、data-boundary hooks、reduced-motion hooks與 no legacy import，並以 Playwright-core fixture 保存 `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-role-aware/ras-004b-sidebar-ui-fixture-desktop.png`、`ras-004b-sidebar-ui-fixture-mobile.png`。此 proof 不呼叫 provider、不寫 DB；live Browser/session cross-role matrix、super admin/client portal surfaced UI、assistant scope payload 行為仍需 RAS-005。

完成註記（2026-06-20 RAS-005）：`pnpm nav:sidebar-cross-role-qa` 已補 RAS-004 殘留的跨 surface fixture/browser proof：member 第一屏 `今日` / `AI 工作台`、member `問誠問 AI` scope=`member-own-assigned`、org admin / scoped manager `問誠問 AI` scope=`org-aggregate`、owner org settings/billing、scoped manager 無 billing/settings write nav、super admin platform fixture 不混 member routes、client viewer fixture 不混 dashboard routes。截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-role-aware/ras-005-cross-role-matrix-desktop.png`、`ras-005-cross-role-matrix-mobile.png`。此 proof 仍明確為 fixture/source/headless Browser，不宣稱 production/staging live auth session matrix。

範圍外：不重設整站 shell 視覺；不新增 command palette；不改 AI route、SPIN 狀態機或 Theater scoring。

---

## Batch RAS-005 - Cross-role QA, docs sync, and AGENTS status update

目標：完成 role-aware sidebar 的跨角色驗收，並把結果同步回 AGENTS / PLN / report。

- [x] 以 demo/mock session 或 resolver test fixture 驗證 collaborator、member、manager、org admin、org owner、support/finance/super admin、client viewer 的 sidebar 差異。
- [x] Browser 檢查 member desktop/mobile、org admin desktop/mobile、super admin route、client/share page 不出現越權導覽。
- [x] 手打 URL guard proof：一般 member 不能進 org settings write；manager 不能進 billing/plan write；client 不能進 dashboard；app session 不能進 super admin。
- [x] 檢查 console error、keyboard focus、tooltip、`aria-label`、reduced-motion、dark mode 基本可讀性。
- [x] 更新 `AGENTS.md` 與本 `PLN-021` 完成狀態，在卡片註記變更檔案、QA 結果、截圖/proof 路徑。
- [x] 如發現需 operator 決策，新增或更新 `RES-016` issue-question，不把 blocker 寫成完成。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

完成註記（2026-06-20）：新增 `scripts/role-aware-sidebar-cross-role-qa.mjs` 與 `pnpm nav:sidebar-cross-role-qa`，並將 `resolveWorkspaceRouteAccess()` 的 `/team/billing`、`/team/seats`、`/team/units`、`/team/invites`、`/api/org/units`、`/api/org/invites`、`/api/org/billing` 等 org write/billing route family 分流到 owner/admin `canManageWorkspaceOrgSettings()`，避免 scoped manager 只因可讀 org aggregate 而手打進 billing/plan write。`pnpm nav:sidebar-cross-role-qa` 覆蓋 collaborator、member、scoped/unscoped manager、owner、support、finance、super admin、app-session super admin、client viewer；fixture Browser proof 覆蓋 desktop/mobile no overflow、console error 0、aria-label、keyboard focus、AI workbench mobile visible 與 dark-band readability。`pnpm nav:route-guard-qa` 同步覆蓋 manager billing/seats/org-units denial。未發現新的 operator decision，因此未更新 issue-question。正式 production/staging live auth session matrix 仍不可宣稱。

範圍外：不做 production auth rollout；不做 DB destructive operation；不把 mock success 冒充正式權限驗收。

---

## Current Blockers

- 需要可重複的 role/session fixture 或 demo accounts 才能做完整 Browser 跨角色驗收；若缺正式 session，先以 resolver unit tests + mock bootstrap proof 補足，不宣稱 production auth 通過。
- 若改 route/layout/auth behavior，必須先讀 Next.js bundled docs。
- 若發現現有 auth/session helper 不足，先補 contract/helper，不直接繞過 route guard。
- Super admin、client portal、org admin 的正式入口仍受 PSA / auth provider / staging access 狀態影響；不可用 sidebar hide/show 取代 server guard。
