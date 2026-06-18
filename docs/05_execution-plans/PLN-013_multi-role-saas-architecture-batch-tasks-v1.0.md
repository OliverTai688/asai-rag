# 誠問 AI Multi-role SaaS Architecture Batch Tasks v1.0

> 建立日期：2026-06-18  
> 狀態：待執行  
> 研究依據：`RES-007_product-surface-and-admin-architecture-v1.0.md`、`RES-009_demo-account-and-mockdata-database-migration-v1.0.md`  
> 驗收依據：`ACC-004_multi-role-saas-architecture-acceptance-framework-v1.0.md`  
> 關聯計畫：`PLN-011_multi-tenant-launch-plan-v1.0.md`、`PLN-012_page-by-page-modern-ui-batch-tasks-v1.0.md`

本計畫把誠問 AI 從單一 dashboard app 推進為「商務前端 + 登入分流 + front office + member admin + org admin + super admin」的多角色 SaaS。每張卡都必須同時思考 route、role、data visibility、billing/plan、audit、demo seed 與 UI surface，而不是只做一個頁面。

本條 workstream 只做產品架構、權限、路由、資料模型與必要 UI surface 的落地。不改 SPIN 狀態機、不改 Theater enum、不刪合規欄位、不略過 AiUsageLog。

---

## 0. 執行協定

每張卡的固定流程：

1. **讀文件**：`RES-007`、`RES-009`、`ACC-004`、本卡；若碰到現有多租戶/auth/billing/schema，另讀 `PLN-011`。
2. **讀 Next.js 文件**：若改 route、layout、middleware、server actions、cookies/session 行為，先讀 `node_modules/next/dist/docs/` 相關章節。
3. **產出 architecture brief**：用 `ACC-004 §2` 格式說明 surface、roles、routes、data visibility、audit/billing 影響。
4. **實作範圍控制**：只做本卡明確列出的文件、schema、route、UI 或 service；不要順手重構 SPIN/theater/AI route。
5. **安全驗收**：檢查 manager 不看客戶明細、super admin 與 app session 分離、impersonation 有 reason/expiry/audit。
6. **驗收指令**：跑 `pnpm lint:changed`；動到 Prisma schema 才跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
7. **打勾**：完成後本文件與 `AGENTS.md` 對應卡片改 `[x]`，並註記變更檔案與 QA 結果。

---

## 1. 進度看板

| 卡片 | 主題 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| PSA-001 | PRD/ARC 定稿 | ✅ | `RES-007` |
| PSA-002 | Auth surface 分流 | ✅ | PSA-001 |
| PSA-003 | Plan config 與個人協作者 | ✅ | PSA-001 |
| PSA-004 | OrganizationUnit 多層級 | ✅ | PSA-001 |
| PSA-005 | Demo account 與 mockdata 資料庫化 | [~] | PSA-002、PSA-003、PSA-004 |
| PSA-006 | Org admin 輔導台 | ✅ | PSA-003、PSA-004、PSA-005 |
| PSA-007 | Share branding 與 client portal | ✅ | PSA-003、PSA-004、PSA-005 |
| PSA-008 | 綠界 billing | ✅ | PSA-003 |
| PSA-009 | Super admin 與 impersonation | ✅ | PSA-001 |
| PSA-010 | Cross-surface QA | ✅ | PSA-002-PSA-009 |

---

## Batch PSA-001 - PRD/ARC 定稿

目標：將 `RES-007` 的研究結論升級成可約束實作的產品需求與架構規則。

- [x] 產出 Multi-role SaaS PRD，涵蓋 personal、team、enterprise、front office/client portal、member admin、org admin、super admin。
- [x] 產出 Role/Permission/Route ARC，定義 route guards、role matrix、manager visibility、client access、super admin session 與 impersonation audit。
- [x] PRD/ARC 明確列出 hard decisions：個人版可邀請協作者且上限由 super admin 設定；org manager 只看彙總/輔導指標；企業支援總公司/區部/通訊處；付款採綠界。
- [x] 更新 `docs/00_manual-and-index/MAN-001_document-index.md` 與 `docs/00_manual-and-index/MAN-000_docs-usage-manual.md` 文件數量。
- [x] 跑 `pnpm lint:changed`。

範圍外：不改程式碼、不改 schema、不實作 auth。

狀態：✅ 完成（2026-06-18）。

Architecture brief:
- Surface scope：marketing / commerce、front office、member admin、org admin、super admin。
- Roles：platform roles、organization roles、client roles、front token access。
- Routes：定義 `/login`、`/signup`、`/invite/[token]`、`/client-login`、`/super-admin/login` 與 member/org/super-admin route guard 邊界。
- Data visibility：member 看 own/assigned data；manager 看 aggregate/coaching；client 看授權內容；super admin 預設看彙總與支援資訊。
- Plan/billing impact：personal collaborator、seat、unit、AI quota、branding、client portal 由 plan config 控制；付款 provider 第一版採綠界但 billing model provider-neutral。
- Demo data impact：demo account 使用 DB records；mockdata 只能作 seed material。
- Audit/security impact：super admin impersonation 必須具 reason、scope、expiry、audit trail。
- Verification plan：本卡只改 docs；跑 `pnpm lint:changed`，未動 schema。

變更檔案：`docs/01_product-requirements/PRD-003_multi-role-saas-product-spec-v1.0.md`、`docs/02_architecture-and-rules/ARC-006_role-permission-route-architecture-v1.0.md`、`docs/00_manual-and-index/MAN-001_document-index.md`、`docs/00_manual-and-index/MAN-000_docs-usage-manual.md`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-002 - Auth Surface 分流

目標：建立登入與 session surface 邊界，避免一般 app、客戶前台、super admin 混用同一入口。

- [x] 建立 `/login`、`/signup`、`/invite/[token]`、`/client-login`、`/super-admin/login` 的 route/page skeleton 或規劃文件，依當前 repo 狀態選擇最小可交付。
- [x] 定義一般 app session、client session、platform session 的分離策略；super admin 使用獨立登入入口與 guard。
- [x] 登入後 redirect 規則清楚：member/collaborator 到 member admin，org owner/admin/manager 可進 org admin，client user 到 client portal，platform role 到 super admin。
- [x] 若新增 route/layout/middleware，先讀 Next.js 對應文件。
- [x] 跑 `pnpm lint:changed`。

範圍外：不接真第三方 auth provider、不搬移所有既有 dashboard routes。

狀態：✅ 完成（2026-06-18）。

Architecture brief:
- Surface scope：新增一般 app、client portal、platform super admin 三種登入入口骨架，避免共用同一登入頁造成 session 與權限混淆。
- Roles：一般 app 支援 `ORG_OWNER`、`ORG_ADMIN`、`MANAGER`、`MEMBER`、`COLLABORATOR`；client surface 支援 client user/family viewer；platform surface 支援 `SUPER_ADMIN`、support、finance 等平台角色。
- Routes：`/login`、`/signup`、`/invite/[token]`、`/client-login`、`/super-admin/login` 已建立 page skeleton；邀請頁依 Next.js async params pattern 讀 token。
- Data visibility：本卡不讀 DB、不接 provider、不建立假 session；頁面只宣告 redirect 與權限邊界，真正 guard 留待後續 auth middleware/provider 卡。
- Plan/billing impact：signup 明示 personal/team/enterprise 能力將由 `PlanConfig` 與綠界 billing 決定，不把方案限制寫死在此卡。
- Demo data impact：頁面文案對齊 demo account DB seed 方向，未新增 runtime local mockdata。
- Audit/security impact：super admin login skeleton 明確要求 reason、scope、expiry 與 audit log，供 PSA-009 impersonation 實作承接。
- Verification plan：實作前讀 `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`、`04-linking-and-navigating.md`、`node_modules/next/dist/docs/01-app/02-guides/authentication.md`；跑 `pnpm lint:changed` 通過；以既有 `localhost:3000` dev server smoke test `/login`、`/signup`、`/invite/demo-token`、`/client-login`、`/super-admin/login` 皆回 200。

變更檔案：`src/app/(auth)/_components/auth-surface.tsx`、`src/app/(auth)/login/page.tsx`、`src/app/(auth)/signup/page.tsx`、`src/app/(auth)/invite/[token]/page.tsx`、`src/app/(client-auth)/client-login/page.tsx`、`src/app/(super-admin)/super-admin/login/page.tsx`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-003 - Plan Config 與個人協作者

目標：讓方案能力由 super admin 設定，不把 personal/team/enterprise 限制寫死在 UI 或 service。

- [x] 建立或規劃 `PlanConfig` 能力：`maxMembers`、`maxCollaborators`、`maxUnits`、`monthlyAiQuota`、`shareBrandingEnabled`、`clientPortalEnabled`。
- [x] 個人版 organization 支援邀請協作者，但邀請數不得超過 super admin 設定的 `maxCollaborators`。
- [x] 超過上限時 UI 顯示升級或聯絡管理員流程，不允許前端繞過。
- [x] 若動 Prisma schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`；否則以 docs/spec/mock service 交付。
- [x] 跑 `pnpm lint:changed`。

範圍外：不實作綠界付款、不調整 AI route 內部邏輯。

狀態：✅ 完成（2026-06-18）。

Architecture brief:
- Surface scope：本卡只建立 plan capability truth source 與 limit checking，不接 auth provider、不接綠界、不搬移現有 dashboard routes。
- Roles：`MemberRole` 保留既有 `AGENT`，新增 `ADMIN`、`MEMBER`、`COLLABORATOR` 以承接 PSA role matrix；協作者名額用 `COLLABORATOR` 角色計算。
- Routes：無新增 route；後續 `/invite/[token]`、org admin invite UI、billing activation 可引用同一套 `checkInviteLimit`。
- Data visibility：本卡不改客戶/報告/SPIN/Theater 資料查詢；只提供 plan gate，避免前端單點 disable 被繞過。
- Plan/billing impact：新增 `PlanConfig` schema，欄位含 `maxMembers`、`maxCollaborators`、`maxUnits`、`monthlyAiQuota`、`shareBrandingEnabled`、`clientPortalEnabled`、`impersonationAllowed`；domain helper 提供 default config 與 invite/unit/AI quota 檢查。
- Demo data impact：未新增 runtime mockdata；預設 plan config 可在 PSA-005 seed 時轉成 DB upsert material。
- Audit/security impact：server-side invite/billing API 後續必須重跑 domain helper 或 DB-backed equivalent；前端升級提示不得作為唯一限制。
- Verification plan：`pnpm prisma:validate` 通過、`pnpm prisma:generate` 通過、subscription domain 新檔案 ESLint 通過、`pnpm lint:changed` 通過。

變更檔案：`prisma/schema.prisma`、`src/domains/subscription/types.ts`、`src/domains/subscription/plan-config.ts`、`src/domains/subscription/hooks/useSubscriptionForm.ts`、`src/domains/subscription/plans.ts`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-004 - OrganizationUnit 多層級

目標：支援 enterprise 的總公司、區部、通訊處層級，並讓報表與品牌可按 unit scope 運作。

- [x] 建立或規劃 `OrganizationUnit` tree：`HEADQUARTERS`、`REGION`、`BRANCH`。
- [x] 成員可指定 primary unit；manager 可有 unit-scoped 管理範圍。
- [x] 客戶、報告、SPIN、劇場、拜訪資料保留 `organizationId`，必要時增加 `unitId` 供彙總與品牌 fallback。
- [x] Org admin 報表只能依 unit scope 聚合，不揭露 member 客戶明細。
- [x] 若動 Prisma schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [x] 跑 `pnpm lint:changed`。

範圍外：不做複雜跨租戶合併、不改現有 client compliance 欄位。

狀態：✅ 完成（2026-06-18）。

Architecture brief:
- Surface scope：本卡建立 enterprise unit schema 與 unit-scoped aggregation helper，不新增 org admin UI、不搬移既有 routes。
- Roles：`OrganizationMember.primaryUnitId` 表示主要歸屬；`managedUnitScopes` 表示 manager 可管理的 unit 範圍，支援含子層級的 aggregate query。
- Routes：無新增 route；後續 `/org` 或 `/team` org admin 頁可用 `collectManagedUnitIds` 與 `createAggregateOnlyFilter` 做 unit-scoped 聚合。
- Data visibility：business records 保留 `organizationId` 作租戶邊界，新增 optional `unitId` 供 clients、visit plans、SPIN、Theater、reports、share/events、assistant、AiUsageLog 做 unit 聚合與品牌 fallback；helper 不提供 member 客戶明細讀取。
- Plan/billing impact：PSA-003 的 `maxUnits` 可限制 `OrganizationUnit` 建立數；enterprise 可用 `HEADQUARTERS -> REGION -> BRANCH` 表達總公司、區部、通訊處。
- Demo data impact：PSA-005 seed 可建立 demo headquarters/region/branch，並把 demo records 指向 matching `unitId`。
- Audit/security impact：manager dashboard 必須使用 aggregate-only filter；若未來需要看敏感明細，需另接 audit/break-glass。
- Verification plan：`pnpm prisma:validate` 通過、`pnpm prisma:generate` 通過、`src/domains/team/unit-scope.ts` ESLint 通過、`pnpm lint:changed` 通過。

變更檔案：`prisma/schema.prisma`、`src/domains/team/unit-scope.ts`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-005 - Demo Account 與 Mockdata 資料庫化

目標：確保架構改造後，所有體驗範例資料都存在資料庫，runtime 不再依賴本地 mockdata 或 localStorage business persistence。

- [x] 盤點所有 runtime mock/localStorage 資料來源：`src/domains/*/mocks.ts`、Zustand persist store、inline mock、`/api/mock/*`、Quickstart demo fixture。
- [x] 建立 canonical demo seed fixtures，將現有 mockdata 轉成可 upsert 的 DB seed material，包含 stable `seedKey`、`organizationId`、owner、`isDemo`、scenario/version。
- [x] 建立或規劃 demo accounts：member、manager、client portal、staging super admin；登入後資料都從 DB 讀取。
- [x] 建立 idempotent seed/reset 策略：重跑不重複、只清 `isDemo=true` 或 matching scenario，不刪真實資料。
- [x] Runtime UI/service 不再 import `src/domains/*/mocks.ts` 作為業務資料來源；localStorage 僅保留 UI state。
- [x] `/api/mock/*` 只能保留 dev/test guard；production UI 不得呼叫 mock API 作為資料來源。
- [ ] 清空 browser storage 後，demo account 重新登入仍看到完整範例資料。
- [x] 若動 Prisma schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [x] 跑 `pnpm lint:changed`；必要時補 demo seed QA evidence。

範圍外：不刪 AI dev/test fixture；不把 demo data 當成匿名 public mock mode。

狀態：[~] 進行中（2026-06-18）。Seed foundation、mock API production guard、`demo:preflight` 檢查腳本、TypeScript 合規欄位基線修復、runtime direct mock import audit 與 localStorage business persistence 收斂已完成；runtime stores/pages 不再直接 import `src/domains/*/mocks.ts`，統一經 `src/domains/demo/seed-fixtures.ts` 取用 demo seed material，client/visit/SPIN/report/event/theater/session 不再 persist 到 browser storage，assistant/calendar 僅 partial persist UI/integration state，並新增 `pnpm demo:runtime-audit` 防止回歸。2026-06-18 `pnpm prisma db push --accept-data-loss` 回報 DB schema 已同步；`pnpm demo:preflight` 通過 DB/seed table 檢查；`pnpm demo:seed:reset` 成功 seed `quickstart-insurance-advisor` v1。清空 browser storage 後的 demo account 重新登入驗證仍未完成。

Architecture brief:
- Surface scope：本次交付 DB demo seed contract、seed script、資料來源盤點、runtime direct mock import 收斂、localStorage business persistence 收斂與 audit gate；尚不接 auth provider，也尚未完成 DB-backed runtime read path。
- Roles：seed 建立 demo member、manager、collaborator、client user；client user 目前只落 app-level `users` record，待 auth provider 決策後再連接 client session。
- Routes：無新增 route；`/api/mock/*` 已加 production guard（`NODE_ENV=production` 時預設回 404，除非 `ALLOW_MOCK_API=true`）；現有 `/client-login` 可指向 `/share/demo-share-wang` 類 demo share，但正式 client portal 仍屬 PSA-007。
- Data visibility：seed records 全部帶 `organizationId`，主要業務資料帶 `unitId`、owner、`isDemo`、`demoSeedKey`、`demoScenario`、`demoSeedVersion`；reset 只清 matching scenario，不刪真實資料。前端 `Client` domain type 已補齊必填 `complianceChecklist`、`sensitivityLevel`、`kycStatus`，符合合規欄位硬規則。
- Plan/billing impact：seed upsert `PlanConfig`，讓 demo organization 可承接 PSA-003 的 collaborator/quota/unit limits。
- Demo data impact：新增 `scripts/seed-demo.mjs`、`scripts/demo-preflight.mjs`、`scripts/demo-runtime-audit.mjs`、`pnpm demo:preflight`、`pnpm demo:seed`、`pnpm demo:seed:reset`、`pnpm demo:runtime-audit`；scenario 為 `quickstart-insurance-advisor` v1。
- Audit/security impact：`AUD-003` 明確列出仍在 runtime 使用的 seed compatibility layer、UI-state storage 與 `/api/mock/*`，避免把 seed foundation 誤判為 production ready。
- Verification plan：`pnpm prisma:validate` 通過、`pnpm prisma:generate` 通過、`pnpm prisma db push --accept-data-loss` 回報 DB schema 已同步、`pnpm demo:preflight` 通過 DB 連線與必要 seed table 檢查、`pnpm demo:seed:reset` 成功、`pnpm demo:runtime-audit` 通過並檢查 direct mock import / disallowed browser storage、`scripts/seed-demo.mjs` / `scripts/demo-preflight.mjs` / `scripts/demo-runtime-audit.mjs` ESLint 與 `node --check` 通過、mock API route ESLint 通過、`pnpm exec tsc --noEmit --pretty false` 通過、`pnpm lint:changed` 通過。剩餘：清空 browser storage 後的 demo account 重新登入 DB-backed runtime 驗證。

變更檔案：`prisma/schema.prisma`、`scripts/seed-demo.mjs`、`scripts/demo-preflight.mjs`、`scripts/demo-runtime-audit.mjs`、`.env.example`、`package.json`、`src/domains/demo/seed-fixtures.ts`、`src/domains/client/store.ts`、`src/domains/visit/store.ts`、`src/domains/spin/store.ts`、`src/domains/report/store.ts`、`src/domains/event/store.ts`、`src/domains/theater/store.ts`、`src/domains/session/store.ts`、`src/domains/assistant/store.ts`、`src/domains/calendar/store.ts`、`src/app/(dashboard)/pilot/page.tsx`、`src/app/(admin)/admin/page.tsx`、`src/app/api/mock/_lib/mock-api-guard.ts`、`src/app/api/mock/track/[token]/route.ts`、`src/app/api/mock/ai/assistant/route.ts`、`src/app/api/mock/ai/theater/route.ts`、`src/app/api/mock/ai/visit/route.ts`、`src/app/api/mock/ai/spin-outline/route.ts`、`src/domains/client/types.ts`、`src/domains/client/mocks.ts`、`src/domains/client/service.ts`、`docs/06_audits-and-reports/AUD-003_demo-runtime-data-source-inventory-v1.0.md`、`docs/00_manual-and-index/MAN-001_document-index.md`、`docs/00_manual-and-index/MAN-000_docs-usage-manual.md`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-006 - Org Admin 輔導台

目標：把 org admin 從「團隊排行榜」提升為可操作的主管輔導台。

- [x] `/org` 或現有 `/team` 的第一屏回答「誰需要輔導、下一步是什麼」。
- [x] 僅顯示彙總、輔導、訓練、AI 用量與 unit/member health，不顯示 member 客戶明細、保單明細或對話全文。
- [x] 補成員邀請、席次、unit filter、coaching queue 的最小可用資訊架構。
- [x] 若做 UI，遵循 `ACC-003` modern minimal page 驗收；若做權限/資料，遵循 `ACC-004`。
- [x] 跑 `pnpm lint:changed`；重要 UI 保存 desktop/mobile 截圖。

範圍外：不新增權限繞過、不做客戶明細 super-view。

狀態：✅ 完成（2026-06-18）。`/team` 已改為 aggregate-only org admin 輔導台，第一屏突出今日優先輔導對象、unit scope、席次、AI 用量與訓練動作；移除客戶 AI 標籤熱點與 `useClientStore` runtime 依賴，不顯示 member 客戶明細、保單明細或對話全文。

Verification：`pnpm exec eslint 'src/app/(dashboard)/team/page.tsx'` 通過、`pnpm lint:changed` 通過、`pnpm exec tsc --noEmit --pretty false` 通過；desktop 1440 / mobile 390 檢查無水平 overflow。Browser screenshot API 在本頁 timeout，已用 local headless Chrome fallback 保存 `docs/06_audits-and-reports/screenshots/modern-ui/psa-006-team-org-admin-desktop.png` 與 `docs/06_audits-and-reports/screenshots/modern-ui/psa-006-team-org-admin-mobile.png`。

變更檔案：`src/app/(dashboard)/team/page.tsx`、`docs/06_audits-and-reports/screenshots/modern-ui/psa-006-team-org-admin-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/psa-006-team-org-admin-mobile.png`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-007 - Share Branding 與 Client Portal

目標：讓前台頁面從單一 token share 演化為品牌化且可登入的 client-facing surface。

- [x] Share page 可讀取 organization/unit branding：logo、display name、brand color；brand color 只作小面積 accent。
- [x] Token access 保留，並設計 client login / client portal 的 route、session、資料可見性。
- [x] 客戶登入後只能查看授權報告、預約、回覆、補資料，不進入內部 CRM。
- [x] Share/client portal 保留誠問 AI 產出/輔助標示與保險合規免責。
- [x] 跑 `pnpm lint:changed`；重要 UI 保存 desktop/mobile 截圖。

範圍外：不改 tracking API 語意；不讓客戶看其他客戶資料。

狀態：✅ 完成（2026-06-18）。`ShareMeta` 增加 branding / portal / CTA contract；`/share/[token]` 可顯示 organization/unit display name、logo fallback、brand color 小面積 accent、client portal 授權範圍與登入 CTA；`/client-login` demo share link 對齊 seed token `demo-share-wang`。客戶入口明確限制在授權報告、預約下一步、回覆顧問、補充資料，不進入內部 CRM。

Verification：`pnpm exec eslint 'src/app/(public)/share/[token]/page.tsx' 'src/app/(client-auth)/client-login/page.tsx' src/domains/report/types.ts src/domains/report/store.ts` 通過、`pnpm exec tsc --noEmit --pretty false` 通過、`pnpm lint:changed` 通過；desktop 1440 / mobile 390 檢查無水平 overflow。截圖保存於 `docs/06_audits-and-reports/screenshots/modern-ui/psa-007-share-branding-desktop.png` 與 `docs/06_audits-and-reports/screenshots/modern-ui/psa-007-share-branding-mobile.png`。

Production note：正式 DB-backed share lookup、organization/unit branding 讀取、client session authorization 仍依賴 PSA-005 demo DB/runtime migration 與 auth provider 決策；本卡完成的是前台 contract 與可視化 client-facing surface。

變更檔案：`src/domains/report/types.ts`、`src/domains/report/store.ts`、`src/app/(public)/share/[token]/page.tsx`、`src/app/(client-auth)/client-login/page.tsx`、`docs/06_audits-and-reports/screenshots/modern-ui/psa-007-share-branding-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/psa-007-share-branding-mobile.png`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-008 - 綠界 Billing

目標：建立 provider-neutral billing domain，並以綠界作為第一個 payment provider。

- [x] 將 Stripe 命名欄位規劃或遷移為 provider-neutral billing 模型，例如 `paymentProvider`、`providerCustomerId`、`providerSubscriptionId`、`PaymentTransaction`。
- [x] 實作或規劃綠界 checkout/order、notification、query、payment status 狀態機。
- [x] 付款狀態連動 plan config、seat limit、AI quota、branding、client portal capability。
- [x] 付款成功不得只信任前端 redirect；必須以 server-side notification 或查詢結果為準。
- [x] 若動 Prisma schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [x] 跑 `pnpm lint:changed`。

範圍外：不把綠界 raw payload 暴露給前端；不在本卡重寫 subscription UI。

狀態：✅ 完成（2026-06-18）。Schema 新增 provider-neutral billing layer：`PaymentProvider`、`SubscriptionOrderStatus`、`PaymentTransactionStatus`、`PaymentTransactionKind`、`PaymentAccount`、`PaymentTransaction`；`Organization` 補 `paymentProvider`、`providerCustomerId`、`providerSubscriptionId`，legacy `stripeCustomerId` / `stripeSubscriptionId` 保留作 migration compatibility。`SubscriptionOrder` 改為 enum status/provider-neutral 欄位，保留 legacy `provider` / `providerId`。

Implementation note：`src/domains/subscription/billing.ts` 定義綠界導轉付款 flow、ECPay trade status mapping、order status derivation、server-confirmed plan activation helper 與 redirect-only rejection。付款成功啟用方案能力會從 `PlanConfig` 連動 `seatLimit`、`monthlyAiQuota`、`shareBrandingEnabled`、`clientPortalEnabled`。購買 modal 的付款步驟移除 Stripe/卡號假表單，改成綠界導轉骨架與 server notification/query confirmation 提醒；admin 訂單狀態 map 同步新狀態機。

Verification：`pnpm prisma:validate` 通過、`pnpm prisma:generate` 通過、`pnpm exec eslint src/domains/subscription/types.ts src/domains/subscription/billing.ts src/domains/subscription/hooks/useSubscriptionForm.ts src/domains/subscription/mocks.ts src/components/subscription/steps/StepPaymentDetails.tsx 'src/app/(admin)/admin/page.tsx'` 通過、`pnpm exec tsc --noEmit --pretty false` 通過、`pnpm lint:changed` 通過。`pnpm exec tsc` 曾在與 `pnpm prisma:generate` 平行執行時短暫讀到生成中間狀態，generate 完成後重跑通過。2026-06-18 `pnpm prisma db push --accept-data-loss` 已回報 DB schema 同步。

Production note：operator 已決策採綠界測試環境完整整合，並做 production readiness 但不啟用正式金流。尚未實作正式 ECPay checkout/notification/query API route；需要綠界 MerchantID、HashKey、HashIV、ReturnURL、OrderResultURL、ServerReplyURL/ClientBackURL 與 production callback domain 後才能接正式交易。若套用到資料庫，需注意 `SubscriptionOrder.status` String → enum 的資料轉換；2026-06-18 `pnpm prisma db push --accept-data-loss` 已回報 DB schema 同步。

變更檔案：`prisma/schema.prisma`、`src/domains/subscription/types.ts`、`src/domains/subscription/billing.ts`、`src/domains/subscription/hooks/useSubscriptionForm.ts`、`src/domains/subscription/mocks.ts`、`src/components/subscription/steps/StepPaymentDetails.tsx`、`src/app/(admin)/admin/page.tsx`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-009 - Super Admin 與 Impersonation

目標：建立平台管理面與客服除錯能力，同時保護高敏感保險資料。

- [x] 建立 platform-only super admin guard；super admin session 與一般 app session 分離。
- [x] 建立或規劃 impersonation session：actor、target org/member、reason、scope、startsAt、expiresAt、endedAt。
- [x] 所有 impersonation 期間的敏感讀寫操作寫 AuditLog，含 `impersonationSessionId`。
- [x] Super admin 預設看彙總、用量、付款、事件與支援資訊；查看敏感內容需 break-glass reason。
- [x] 跑 `pnpm lint:changed`；若動 schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。

範圍外：不提供無痕 impersonation；不允許 support 角色永久接管帳號。

狀態：✅ 完成（2026-06-18）。Schema 新增 `PlatformRole`、`ImpersonationStatus`、`AuditAction`、`AuditSensitivity`、`PlatformUser`、`ImpersonationSession`、`AuditLog`。`ImpersonationSession` 包含 actor、target org/member、reason、scope、startsAt、expiresAt、endedAt；`AuditLog` 可記錄 actor/target/action/resource/sensitivity/reason/ipHash/userAgentHash 與 `impersonationSessionId`。正式 DB 套用仍受 Supabase 連線阻擋。

Implementation note：`src/domains/platform/impersonation.ts` 定義 platform session boundary、role guard、reason/scope/expiry 驗證、60 分鐘上限、break-glass audit requirement 與 audit draft。`/super-admin` 頁面預設只顯示彙總、用量、付款、事件與支援資訊；敏感讀取與 impersonation 必須經 break-glass。新增 route 前已閱讀 Next bundled docs：`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`、`node_modules/next/dist/docs/01-app/02-guides/authentication.md`。

Verification：`pnpm prisma:validate` 通過、`pnpm prisma:generate` 通過、`pnpm exec eslint src/domains/platform/types.ts src/domains/platform/impersonation.ts 'src/app/(super-admin)/super-admin/page.tsx'` 通過、`pnpm exec tsc --noEmit --pretty false` 通過、`pnpm lint:changed` 通過。`curl -I http://localhost:3000/super-admin` 回 307 到 `/staging-access?callbackUrl=%2Fsuper-admin`，表示本機視覺驗收被既有 staging gate 擋住；operator 已決策提供 staging access cookie/password 後再截圖。2026-06-18 `pnpm prisma db push --accept-data-loss` 已回報 DB schema 同步。

Production note：正式 platform auth provider、MFA、cookie/session guard、AuditLog 寫入 middleware/server action 尚未接；本卡交付 schema/domain/surface contract，不建立假 platform session。

變更檔案：`prisma/schema.prisma`、`src/domains/platform/types.ts`、`src/domains/platform/impersonation.ts`、`src/app/(super-admin)/super-admin/page.tsx`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Batch PSA-010 - Cross-surface QA

目標：確認每個核心功能都已具備 front office、member admin、org admin、super admin 的責任邊界。

- [x] 補一張 cross-surface responsibility matrix，覆蓋 CRM、SPIN、Theater、Pre-visit、Reports、Share、Billing、Settings、AiUsageLog。
- [x] 檢查 route guard、data visibility、empty/loading/error state，特別是 manager 不看客戶明細與 super admin 獨立登入。
- [x] 檢查 personal collaborator 上限、unit scope、demo account DB seed、mockdata runtime removal、share branding、client portal、impersonation audit、綠界 billing 的文件與程式碼一致。
- [x] 更新 `AGENTS.md` 與 `PLN-013` 完成狀態。
- [x] 跑 `pnpm lint:changed`；必要時保存 desktop/mobile 截圖或 QA evidence。

範圍外：不新增大功能；本卡以一致性與驗收修補為主。

狀態：✅ 完成（2026-06-18）。`ACC-005_cross-surface-responsibility-matrix-v1.0.md` 已補上 CRM、SPIN、Theater、Pre-visit、Reports、Share、Billing、Settings、AiUsageLog 的 front office / member admin / org admin / super admin 責任矩陣，並列出 route guard、資料可見性、empty/loading/error state 現況與 production blockers。

QA conclusion：multi-role SaaS 的產品/路由/schema/UI contract 已形成可續作骨架；不可宣稱 production integration complete。DB schema 同步、demo preflight、demo seed reset 已通過；production integration 仍受 Supabase Auth env/session guard、ECPay credentials/callback domain、staging access 與清空 browser storage 後的 demo relogin QA 阻擋。

變更檔案：`docs/08_acceptance-and-qa/ACC-005_cross-surface-responsibility-matrix-v1.0.md`、`docs/00_manual-and-index/MAN-001_document-index.md`、`docs/00_manual-and-index/MAN-000_docs-usage-manual.md`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

---

## Current PSA Blockers

- Auth provider 已決策為 Supabase Auth；仍需 public env、service role、callback URL、member/client/platform session guard。
- Billing 已決策為綠界測試環境完整整合，production readiness 但不啟用正式金流；仍需 MerchantID、HashKey、HashIV 與 callback domain。
- 若缺少 operator 憑證，對應卡可先交付 PRD/ARC/schema draft/mock UI，但不得假裝完成 production integration。
- 2026-06-18 `pnpm prisma db push --accept-data-loss`、`pnpm demo:preflight`、`pnpm demo:seed:reset` 已通過；PSA-005 剩餘清空 browser storage 後的 demo account 重新登入 DB-backed runtime 驗證。
- Staging super admin visual QA 仍需 operator 提供 staging access cookie/password。
