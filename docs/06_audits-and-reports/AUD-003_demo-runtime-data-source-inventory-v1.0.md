# 誠問 AI Demo Runtime Data Source Inventory v1.0

> 建立日期：2026-06-18  
> 狀態：PSA-005 partial implementation audit  
> 對應任務：`AGENTS.md` / `PLN-013` 的 `PSA-005 — Demo Account 與 Mockdata 資料庫化`

---

## 1. 結論

目前 repo 已具備 DB demo seed 的第一層落地：`scripts/seed-demo.mjs` 可用 stable seed key 建立 demo organization、demo users、unit tree、client、compliance、visit plan、SPIN、Theater、report 與 share token。2026-06-18 已執行 `pnpm prisma db push --accept-data-loss` 並成功將 schema 同步到 Supabase；`pnpm demo:seed:reset` 因 Supabase host DNS `ENOTFOUND` 暫時未能實跑。

但 runtime 尚未完成 DB-backed read path。2026-06-18 已新增 `src/domains/demo/seed-fixtures.ts` 與 `pnpm demo:runtime-audit`，讓 runtime store/page 不再直接 import `src/domains/*/mocks.ts`，並移除 client/visit/SPIN/report/event/theater/session 的 browser-storage business persistence；assistant/calendar 僅保留 panel open / Google connected 這類 UI 或 integration state。`mocks.ts` 仍作為 demo seed material 的原始 fixture。PSA-005 目前可標示為「seed foundation + direct mock import guard + localStorage business persistence guard completed / DB-backed runtime migration blocked」，不可宣稱 production runtime 已完整改由資料庫驅動。

---

## 2. 已建立的 Demo Seed Contract

Seed script：`scripts/seed-demo.mjs`

命令：

```bash
pnpm demo:preflight
pnpm demo:seed
pnpm demo:seed:reset
```

環境：

- 讀取 `DIRECT_URL`，缺少時退回 `DATABASE_URL`。
- 自帶 `.env` loader，不依賴 `dotenv` package。
- `pnpm demo:preflight` 可先檢查 database URL、DNS、連線與 demo seed 必要資料表。

Idempotency：

- Demo scenario：`quickstart-insurance-advisor`
- Demo seed version：`1`
- Seed key 格式：`quickstart-insurance-advisor:<entity>:v1`
- `--reset` 只刪除 matching `demo_scenario` 的 demo records 與其子資料，不刪除真實資料。

已 seed entities：

- `PlanConfig`：FREE、STARTER、PRO、ENTERPRISE
- `Organization`：demo personal workspace
- `User`：demo member、manager、collaborator、client
- `OrganizationUnit`：HEADQUARTERS、BRANCH
- `OrganizationMember`：manager、member、collaborator
- `Client`：王大明
- `FamilyMember` / `Policy` / `ComplianceChecklist`
- `VisitPlan`
- `SpinSession` / `SpinMessage`
- `TheaterSession` / `TheaterTurn`
- `Report` / `ReportShare`

---

## 3. Schema Support Added

新增或補強欄位：

- `isDemo`
- `demoSeedKey`
- `demoScenario`
- `demoSeedVersion`

已補到：

- `Organization`
- `User`
- `OrganizationUnit`
- `Client`
- `VisitPlan`
- `SpinSession`
- `TheaterSession`
- `Report`
- `ReportShare`

仍未補到但可由 parent demo record cascade/reset 的資料：

- `OrganizationMember`
- `FamilyMember`
- `Policy`
- `ComplianceChecklist`
- `SpinMessage`
- `TheaterTurn`

---

## 4. Runtime Mock / LocalStorage Inventory

### 4.1 Zustand business stores

以下 stores 已不再將 canonical business-like data 放入 localStorage；它們已不再直接 import `src/domains/*/mocks.ts`，但在 DB-backed runtime read path 完成前，仍透過 `src/domains/demo/seed-fixtures.ts` 取得 demo seed material：

- `src/domains/client/store.ts`：讀 `SEED_CLIENTS`
- `src/domains/visit/store.ts`：讀 `SEED_VISIT_PLANS`
- `src/domains/spin/store.ts`：讀 `SEED_SPIN_SESSIONS` / `SEED_SPIN_MESSAGES`
- `src/domains/theater/store.ts`
- `src/domains/report/store.ts`：讀 `SEED_REPORTS`
- `src/domains/event/store.ts`：讀 `SEED_EVENTS`

Browser storage allowlist：

- `src/domains/assistant/store.ts`：只 partial persist `isPanelOpen`。
- `src/domains/calendar/store.ts`：只 partial persist `isGoogleConnected`。
- `src/components/demo/dashboard-welcome-card.tsx`：只保存 Quickstart guide dismissed/completed 類 UI state。
- `src/app/(dashboard)/settings/page.tsx`：提供手動清 storage 的 dev/demo control。

已移除 browser-storage persistence：

- `src/domains/client/store.ts`
- `src/domains/visit/store.ts`
- `src/domains/spin/store.ts`
- `src/domains/theater/store.ts`
- `src/domains/report/store.ts`
- `src/domains/event/store.ts`
- `src/domains/session/store.ts`

PSA-005 後續要求：

- Canonical business data 改由 DB/API 讀取。
- Zustand/localStorage 只保留 UI state、draft state、panel state；`pnpm demo:runtime-audit` 會擋 direct mock import 與 allowlist 以外的 browser storage 使用。

### 4.2 `src/domains/*/mocks.ts`

Demo seed compatibility layer 仍引用：

- `src/domains/demo/seed-fixtures.ts` -> `src/domains/client/mocks.ts`
- `src/domains/demo/seed-fixtures.ts` -> `src/domains/event/mocks.ts`
- `src/domains/demo/seed-fixtures.ts` -> `src/domains/experience/mocks.ts`
- `src/domains/demo/seed-fixtures.ts` -> `src/domains/subscription/mocks.ts`
- `src/domains/demo/seed-fixtures.ts` -> `src/domains/visit/mocks.ts`
- `src/domains/demo/seed-fixtures.ts` -> `src/domains/spin/mocks.ts`
- `src/domains/demo/seed-fixtures.ts` -> `src/domains/report/mocks.ts`

已完成：

- `src/domains/client/store.ts`
- `src/domains/visit/store.ts`
- `src/domains/spin/store.ts`
- `src/domains/report/store.ts`
- `src/domains/event/store.ts`
- `src/app/(dashboard)/pilot/page.tsx`
- `src/app/(admin)/admin/page.tsx`

以上 runtime 檔案已改走 `src/domains/demo/seed-fixtures.ts`，不再直接 import `*/mocks.ts`。

其中 `client/mocks.ts` 是目前 DB seed 的主要來源之一，但 production runtime 不應直接 import。`pnpm demo:runtime-audit` 會檢查 `src/app`、`src/components`、`src/domains` 是否有 runtime 檔案繞過 `seed-fixtures.ts` 直接 import `*/mocks.ts`，以及是否有 allowlist 外的 browser storage persistence。

### 4.3 Quickstart fixtures

Quickstart 仍依賴：

- `src/domains/demo/quickstart.ts`
- `src/domains/ai-mock/scripts/visit`
- query string：`?demo=quickstart`
- localStorage key：`asai.quickstart.status`

後續方向：

- Quickstart 可保留為導覽狀態，但資料應讀 DB demo records。
- 清空 browser storage 後重新登入 demo account，仍需看到完整資料。

### 4.4 Mock API routes

仍存在 production route tree 下的 mock endpoints：

- `/api/mock/ai/visit`
- `/api/mock/ai/assistant`
- `/api/mock/ai/theater`
- `/api/mock/ai/spin-outline`
- `/api/mock/track/[token]`

已完成：

- `/api/mock/*` 已加 production guard：`NODE_ENV=production` 時預設回 404。
- 僅當 `ALLOW_MOCK_API=true` 時 production 可暫時放行，作為明確 dev/test 例外。
- `.env.example` 已補 `ALLOW_MOCK_API=false`，避免 production-like 環境誤開 mock endpoint。

後續方向：

- Production UI 不得呼叫 mock API 作為資料來源。
- 若 AI output 是 seeded/mock，仍需寫 DB 與 `AiUsageLog`，provider 可標 `MOCK`。

### 4.5 Public share tracking

`src/app/(public)/share/[token]/page.tsx` 仍呼叫 `/api/mock/track/${token}`。

後續方向：

- 改成正式 tracking endpoint。
- Share page 可用 `ReportShare.demoSeedKey = quickstart-insurance-advisor:share:wang:gap:v1` 對應 demo share。

---

## 5. Blockers

- Supabase schema 已可透過 `pnpm prisma db push --accept-data-loss` 同步；但目前 DNS 解析 `db.wwocdcicvpmbdmqvskzi.supabase.co` 失敗並阻擋 `pnpm demo:seed:reset`。可用 `pnpm demo:preflight` 重測。
- 現有 `prisma.config.ts` 使用 `dotenv/config`，但 package 未列 `dotenv`；Prisma CLI 目前仍可跑 validate/generate，但 operator 環境若嚴格執行 config 可能要補 dependency 或改 config loader。
- Auth provider 未定案，因此 demo user 目前只建立 app-level `users` records，尚未連到 Supabase Auth identity。
- Runtime migration 會牽動 dashboard stores 與多頁 UI，需拆成後續 cards；本卡未完成全站 mock removal。
- TypeScript 全專案檢查已在 2026-06-18 修復 `Client.kycStatus` 型別缺口，`pnpm exec tsc --noEmit --pretty false` 通過。

---

## 6. Recommended Next Steps

1. Operator 建立 dev/staging DB 並套用 migration。
2. 執行 `pnpm demo:preflight`，通過後再執行 `pnpm demo:seed:reset` 驗證 seed 可重跑。
3. 建立 DB-backed read APIs：clients、visit plans、spin sessions、theater sessions、reports、share。
4. 將 Zustand business stores 改為 DB/API read path，localStorage 僅保留 UI state。
5. 修正 share tracking，讓 demo share 也寫正式 `ShareEvent`。
6. 清空 browser storage 後，以 demo account 重新登入驗證資料仍從 DB 還原。
