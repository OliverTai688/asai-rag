# 誠問 AI Demo Account 與 Mockdata 資料庫化研究 v1.0

> 研究日期：2026-06-18  
> 範圍：確保系統架構改造後，現有 mockdata 全部轉為資料庫中的體驗範例帳號與 seed data；runtime 不再依賴本地 mockdata、localStorage store 或 `/api/mock/*` 作為業務資料來源。  
> 關聯文件：`RES-007_product-surface-and-admin-architecture-v1.0.md`、`PLN-011_multi-tenant-launch-plan-v1.0.md`、`PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`ACC-004_multi-role-saas-architecture-acceptance-framework-v1.0.md`。

---

## 1. 研究結論

誠問 AI 下一階段架構改造時，mockdata 不能再被視為前端 runtime 的資料來源。它應被重新定位為「demo seed fixture」：只用於建立資料庫中的體驗範例帳號、範例 organization、範例客戶、範例 SPIN、範例劇場、範例報告與互動紀錄。

目標狀態：

```text
legacy mocks.ts / inline mock / /api/mock/*
  -> canonical seed fixtures
  -> idempotent seed script / onboarding seed API
  -> Supabase Postgres / Prisma
  -> app runtime API/service
  -> UI
```

換句話說，使用者在體驗產品時看到的資料都是真實資料庫資料，只是被標記為 `isDemo` 或屬於 demo organization。前端不能再從 `src/domains/*/mocks.ts` 或 localStorage 初始化業務資料。

---

## 2. 當前現況盤點

### 2.1 已存在的本地 mock / localStorage 資料來源

| 類型 | 位置 | 目前角色 | 目標處理 |
| --- | --- | --- | --- |
| Client seed | `src/domains/client/mocks.ts`、`client/store.ts` | `SEED_CLIENTS` + localStorage persist | 轉為 DB seed fixture；runtime 改 API/DB |
| SPIN seed | `src/domains/spin/mocks.ts`、`spin/store.ts` | session/messages seed + localStorage persist | 轉為 DB seed fixture；保留 SPIN 狀態機 |
| Visit seed | `src/domains/visit/mocks.ts`、`ai-mock/scripts/visit.ts` | 訪前規劃與 AI mock 腳本 | demo seed 產出 VisitPlan；AI mock 僅作 dev/test |
| Report seed | `src/domains/report/mocks.ts`、`report/store.ts` | 報告 localStorage persist | 轉為 DB reports/report_shares/share_events |
| Theater seed | `src/domains/theater/store.ts`、`theater/service.ts` | 劇場 session localStorage + mock score | 轉為 DB seed；不得改 Theater enum |
| Event/team aggregation | `src/domains/event/mocks.ts`、`team/service.ts` | 活動與團隊 mock 聚合 | 轉為 DB interaction_events + aggregation query |
| Subscription/admin mock | `src/domains/subscription/mocks.ts`、`/(admin)/admin` | 後台訂閱/營收 mock | 轉為 subscription_orders/payment tables |
| Experience/pilot mock | `src/domains/experience/mocks.ts` | 體驗版狀態說明 | 可保留為靜態產品說明，不作業務資料來源 |
| Mock APIs | `src/app/api/mock/*` | 模擬 AI/track responses | production 不可作業務資料來源；可保留 dev-only |
| Quickstart local state | `components/demo/*`、`domains/demo/*` | 用 localStorage 控制體驗流程 | quickstart 可保留 UI 狀態，但資料讀 DB demo account |

### 2.2 Prisma schema 已有的基礎

目前 schema 已有多租戶與 demo 標記的雛形：

- `Organization.demoDataSeededAt`
- `Client.isDemo`
- `VisitPlan.isDemo`
- `SpinSession.isDemo`
- `TheaterSession.isDemo`
- `Report.isDemo`
- `InteractionEvent`、`ReportShare`、`ShareEvent`、`AiUsageLog`

這些欄位足以支撐第一版 demo seed，但仍需補幾個治理能力：

- seed version，例如 `demoSeedVersion`，避免 fixture 更新後無法判斷是否重灌。
- seed source，例如 `metadata.seedKey`，讓 seed 可 idempotent upsert。
- demo account / demo organization 的建立規則。
- 清除 demo data 時的 cascade 邊界。

---

## 3. 目標架構

### 3.1 Demo account 不是 mock mode

未來應區分三種模式：

| 模式 | 說明 | 是否可用本地 mockdata |
| --- | --- | --- |
| Production real account | 真實客戶與真實組織 | 不可 |
| Production demo account | 資料庫中的範例帳號/範例組織 | 不可，資料仍來自 DB |
| Local dev fixture | 開發用 seed fixture 或 AI response stub | 可，但只能用於 seed/dev/test，不作產品 runtime |

Demo account 是真實帳號，只是資料是 `isDemo=true` 的範例資料。這能確保 onboarding、權限、報表、分享、追蹤、AI usage、billing guard 都走同一套 production path。

### 3.2 Runtime data source 原則

架構改造完成後：

- UI 頁面不可 import `src/domains/*/mocks.ts` 取得業務資料。
- Zustand 不可用 localStorage 作為 canonical business data store。
- Store 可保留 UI-only state，例如 sidebar open、quickstart step、draft filter，但不能保存 client/report/session 作為主資料。
- `/api/mock/*` 不可被 production UI 呼叫；若保留，必須被 dev flag 或 test route guard 限制。
- AI mock scripts 可保留為 dev/test fixture，但真實 demo account 的 AI 結果需可被寫入 DB。
- 所有 demo 資料需有 `organizationId`，且遵守 RLS / route guard。

---

## 4. Demo Seed 設計

### 4.1 建議 seed 層級

```text
DemoSeedScenario
  -> DemoOrganization
    -> DemoUsers / OrganizationMembers
    -> DemoClients
      -> FamilyMembers
      -> Policies
      -> ComplianceChecklist
      -> VisitPlans
      -> SpinSessions / SpinMessages
      -> TheaterSessions / TheaterTurns
      -> Reports / ReportShares / ShareEvents
      -> InteractionEvents
    -> AiUsageLogs for demo AI calls or seeded examples
```

### 4.2 建議 demo accounts

| 帳號 | Surface | 用途 |
| --- | --- | --- |
| `demo.member@sincere-ai.test` | member admin | 個人業務員完整體驗 |
| `demo.manager@sincere-ai.test` | org admin | 主管看彙總與輔導指標 |
| `demo.client@sincere-ai.test` | front office / client portal | 客戶查看授權報告、預約、回覆 |
| `demo.super@sincere-ai.test` | super admin | 僅 local/staging；展示平台後台與 impersonation audit |

Production 若開放 demo login，應使用受控的 demo tenant，且定期 reset。Super admin demo 僅允許 staging 或內部環境。

### 4.3 Idempotent seed 規則

Seed script 必須可重複執行：

- 每筆 fixture 有穩定 `seedKey`，存於 `metadata.seedKey` 或專用欄位。
- upsert 以 `organizationId + seedKey` 或 stable slug/token 做匹配。
- 不覆蓋使用者後續自行建立的非 demo 資料。
- 清除 demo data 只刪 `isDemo=true` 或 `metadata.seedScenario` 符合的資料。
- seed 後更新 `Organization.demoDataSeededAt` 與 `demoSeedVersion`。

### 4.4 Demo data reset

需要兩種 reset：

| Reset 類型 | 使用者 | 行為 |
| --- | --- | --- |
| Per-org demo reset | member/org admin | 清除該 organization 的 `isDemo=true` 資料後重灌 |
| Global demo scenario reset | super admin | 重建官方 demo tenant，用於展示與 QA |

Reset 不能刪真實資料。若 demo organization 混有真實資料，系統只能刪 `isDemo=true` records。

---

## 5. Migration Strategy

### Phase 1 - Inventory and fixtures

- 盤點所有 `mocks.ts`、inline mock、localStorage persist、`/api/mock/*`。
- 將可展示的範例資料搬成 canonical fixtures，例如 `prisma/seed/demo-scenarios/*.ts` 或 `src/domains/demo/fixtures/*`。
- 為每筆 fixture 補 `seedKey`、`isDemo`、scenario、organization/user ownership。

### Phase 2 - DB seed script

- 建立 `pnpm db:seed:demo` 或 `pnpm prisma:seed:demo`。
- 使用 Prisma transaction upsert demo organization、users、members、clients、policies、sessions、reports、events。
- Seed 後可在資料庫查到完整 demo graph。

### Phase 3 - Runtime API replacement

- Client/report/spin/theater/visit/event/team service 從 localStorage store 改為 API/DB。
- Zustand 改為 cache/UI state，不再作 canonical persistence。
- Dashboard/team/report/share 的資料都從 DB query 或 API route 取得。

### Phase 4 - Mock route quarantine

- `/api/mock/*` 加上 dev/test guard，production 不可呼叫。
- AI mock scripts 只供 local dev、測試、或 seed 產出固定內容。
- 移除 production UI 對 `/api/mock/*` 的 fetch。

### Phase 5 - Demo onboarding

- 新 user/org 建立後，可選「載入範例資料」。
- Trial/demo account 預設 seed demo data。
- UI 明確顯示「範例資料」，但資料仍來自 DB。
- 提供清除範例資料與重新載入。

### Phase 6 - Hard gate

- CI 或 lint rule 檢查 production route/page 不得 import `*/mocks`。
- CI 檢查 production UI 不得 fetch `/api/mock/*`。
- QA 使用 demo account 驗證完整產品體驗。

---

## 6. Data Ownership and Compliance

Demo data 即使是範例，仍需遵守同一套資料隔離：

- 所有 demo records 必須有 `organizationId`。
- Client/policy 的 `complianceChecklist`、`sensitivityLevel` / sensitivity、`kycStatus` 不可省略。
- Org manager 仍只看 demo aggregate，不因 demo 模式看到 member 客戶明細。
- Share token 仍需可撤回、可到期、可追蹤。
- AiUsageLog 仍需記錄 demo AI calls；若是 seeded fixed output，可標 `provider=MOCK`，但也要進 DB。

---

## 7. Acceptance Criteria

架構改造完成後，以下條件必須成立：

- [ ] 新開無 localStorage 的瀏覽器登入 demo member account，仍能看到完整範例客戶、拜訪、SPIN、劇場、報告、活動。
- [ ] 清空 browser storage 後重新整理，demo data 不消失。
- [ ] DB 中可查到 demo organization、demo users、clients、visit plans、spin sessions、theater sessions、reports、events。
- [ ] Production UI 不 import `src/domains/*/mocks.ts` 作為資料來源。
- [ ] Production UI 不呼叫 `/api/mock/*` 作為資料來源。
- [ ] Org manager demo account 只看彙總與輔導指標，不看 member 客戶明細。
- [ ] Share/client portal demo 走 token 或 client session，資料來自 DB。
- [ ] `pnpm lint:changed` 通過；動 schema 時 `pnpm prisma:validate` 與 `pnpm prisma:generate` 通過。

---

## 8. 對現有文件的影響

需要更新：

- `PLN-011`：將「localStorage → Supabase」改成「mock/localStorage → DB canonical runtime」，並把 demo seed 從 onboarding 補強為 production demo account。
- `PLN-013`：新增 mockdata database migration batch。
- `ACC-004`：新增 runtime data source 驗收與 hard stop。
- `AGENTS.md`：新增 PSA 卡片與硬性驗收語句，避免 agent 在架構改造時繼續新增本地 mockdata。

---

## 9. 核心決策

本研究建議採用以下決策作為後續架構卡的硬規則：

```text
Mockdata is seed material, not runtime data.
Demo accounts are real database accounts with demo records.
localStorage is UI state only, not business persistence.
```

也就是說，之後所有「體驗範例」都必須能在資料庫中被查詢、被授權、被分享、被追蹤、被 reset，並且與真實帳號走同一套系統架構。
