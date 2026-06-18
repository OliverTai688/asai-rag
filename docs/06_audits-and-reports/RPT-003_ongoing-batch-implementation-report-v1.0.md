# 誠問 AI Ongoing Batch Implementation Report v1.0

> 建立日期：2026-06-19  
> 狀態：進行中  
> 用途：紀錄每一輪依 `AGENTS.md` 執行 batch task 的實作內容、驗收結果與下一步。

---

## 2026-06-19 Round 001 - LCH-001 Session / Workspace Foundation

### 本輪目標

- 先解除 Launch Readiness 的 session/workspace foundation 工程阻擋。
- 在 Supabase public env 尚未補齊前，先建立 production-safe server helper 與本機可驗收路徑。
- 更新 `AGENTS.md` / `PLN-017` / report / issue-question。

### 已完成

- 新增 `src/lib/auth/session.ts`
  - `getAppSession()`
  - `getClientSession()`
  - `getPlatformSession()`
  - `getAuthHealth()`
  - Supabase bearer/cookie token 驗證雛形：呼叫 Supabase `/auth/v1/user` 後用 DB `User.supabaseAuthId` 或 email 對應正式使用者。
  - 本機開發 fallback：只有 `NODE_ENV !== "production"` 且 `ALLOW_DEV_AUTH_HEADER=true` 時接受 `x-asai-demo-user-email`。

- 新增 `src/lib/auth/current-workspace.ts`
  - `requireCurrentMember()`
  - `requireOrgAdmin()`
  - `requirePlatformUser()`
  - `requireClientPortalUser()`
  - `AuthRequiredError`
  - `authErrorResponse()`

- 新增 `src/lib/auth/policies.ts`
  - `canReadClientDetail()`
  - `canWriteClient()`
  - `canReadOrgAggregate()`
  - `canUseAiModule()`
  - `canBreakGlass()`

- 新增 `GET /api/workspace/bootstrap`
  - 回傳 user、organization、membership、plan capability、AI quota、auth health。

- 更新 `.env.example`
  - 新增 `ALLOW_DEV_AUTH_HEADER="false"`，標記為 local-only escape hatch。

- 更新進度文件
  - `AGENTS.md` 的 `LCH-001` 部分項目改為完成。
  - `PLN-017` 的 `LCH-001` 狀態改為 `[~]`。

### 驗收

```bash
pnpm exec eslint src/lib/auth/session.ts src/lib/auth/policies.ts src/lib/auth/current-workspace.ts src/app/api/workspace/bootstrap/route.ts
pnpm exec tsc --noEmit --pretty false
pnpm lint:changed
pnpm prisma:validate
pnpm demo:preflight
pnpm demo:runtime-audit
```

結果：

- Targeted ESLint：通過。
- TypeScript：通過。
- `pnpm lint:changed`：通過。
- `pnpm prisma:validate`：通過。
- `pnpm demo:preflight`：通過 DB DNS、connection、必要 tables；仍警告 Supabase public env 是 placeholder。
- `pnpm demo:runtime-audit`：通過。

API smoke：

```bash
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -i http://localhost:3000/api/workspace/bootstrap
curl -i -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/api/workspace/bootstrap
```

結果：

- 無 header：`401 UNAUTHENTICATED`。
- 本機 demo header：`200 OK`，回 `demo_org_asai_personal`、`demo_user_member`、plan capability、AI quota。

### 尚未完成

- Supabase Auth public env / anon key / callback URL 尚未補齊。
- 尚未安裝或接入正式 Supabase client helper；目前 server verifier 用 fetch 驗 token。
- Dashboard/member/org/super-admin route guard 尚未接。
- Client portal session contract 尚未設計完成。
- `LCH-001` 整卡尚未完成，仍為進行中。

### 下一輪建議

1. 若 operator 已補 Supabase env，接正式 Supabase Auth client/server helper，移除對 dev header 的依賴。
2. 若 env 仍未補，先做 `LCH-002` 的 DB-backed `/api/clients`，用 `requireCurrentMember()` + dev header 進行本機驗收。
3. 決定 route guard 採 middleware/proxy 還是 layout/server redirect；若要新增 middleware/proxy，需先讀 Next 16 `proxy` 文件。

---

## 2026-06-19 Round 002 - LCH-001 Auth.js / NextAuth Provider Turn

### 本輪目標

- 依 operator 新方向，把 auth provider 從 Supabase Auth blocker 轉為 Auth.js / NextAuth foundation。
- 保留上一輪 workspace/policy helper，不重做 route guard。
- 更新 `AGENTS.md` / `PLN-017` / issue-question。

### 選擇原因

- `LCH-001` 是最低未完成且阻擋後續 `/api/clients`、AI session scope、demo relogin 的 batch。
- Operator 明確詢問「改成用 next.js auth」，需先避免後續自動輪次繼續補 Supabase Auth env。

### 已完成

- 安裝 `next-auth@beta`。
- 新增 `src/auth.ts`
  - 使用 Auth.js / NextAuth v5 pattern。
  - 使用 JWT session strategy。
  - 本機 demo Credentials provider 只在 `NODE_ENV !== "production"` 且 `ALLOW_DEV_AUTH_HEADER=true` 時啟用。
  - Production 要求 `AUTH_SECRET`，非 production 有 deterministic dev fallback 以利本機驗收。
- 新增 `src/app/api/auth/[...nextauth]/route.ts`
  - 匯出 Auth.js handlers。
- 新增 `src/types/next-auth.d.ts`
  - 擴充 `Session.user.id`。
- 更新 `src/lib/auth/session.ts`
  - `getAppSession()` 改為優先讀 Auth.js `auth()`，再從 DB 對應 user/membership。
  - auth health 改為 `provider: "AUTH_JS"`。
  - 保留 legacy Supabase token verifier 作相容 helper，但不再是主路徑。
- 更新 `.env.example`
  - 新增 `AUTH_SECRET` / `AUTH_TRUST_HOST`。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否。
- 是否執行 db push：否。
- DB target 判斷：`.env` 指向 Supabase Postgres；本輪未執行 DB mutation。
- 結果：無 DB 寫入；只讀 Auth.js demo provider 驗證會查 DB user。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint src/auth.ts src/types/next-auth.d.ts 'src/app/api/auth/[...nextauth]/route.ts' src/lib/auth/session.ts src/app/api/workspace/bootstrap/route.ts
pnpm lint:changed
pnpm prisma:validate
pnpm build
pnpm demo:preflight
pnpm demo:runtime-audit
```

API proof：

```bash
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -i http://localhost:3000/api/auth/session
curl -i http://localhost:3000/api/auth/providers
curl -i http://localhost:3000/api/workspace/bootstrap
curl -i -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/api/workspace/bootstrap
```

結果：

- `/api/auth/session`：`200 OK`，未登入回 `null`。
- `/api/auth/providers`：`200 OK`，本機 demo credentials provider 可見。
- `/api/workspace/bootstrap` 無 session：`401 UNAUTHENTICATED`。
- `/api/workspace/bootstrap` + dev header：`200 OK`，回 demo member workspace。
- `pnpm build`：通過，Auth.js route 進入 production build route list。
- `pnpm demo:preflight`：通過 DB DNS/connection/tables；仍警告 Supabase public env placeholder，但這已不再阻擋 Auth.js 主登入方向。
- `pnpm demo:runtime-audit`：通過。

### 尚未完成

- Production `AUTH_SECRET` 尚未由 operator 提供。
- 正式 provider/email/SSO 尚未決策與接入。
- Route guards 尚未接。
- Client portal session contract 尚未設計。

### 下一輪建議

1. 若要繼續 `LCH-001`，先做 dashboard/org/super-admin route guard，建議採 page/layout guard + API policy 為主。
2. 若 route guard 暫不碰，可開始 `LCH-002`：建立 DB-backed `/api/clients`，用 `requireCurrentMember()` 驗證 server-side organization/user 推導。

---

## 2026-06-19 Round 003 - LCH-002 DB-backed Client CRUD Foundation

### 本輪戰役目標

- 推進 Launch Readiness 的第一條「資料能正常新增」垂直切片。
- 建立 member-scoped client BFF，讓 `/crm` 不再以 browser storage / seed fixture 作主要 runtime source。
- 在不確認遠端 DB target 的情況下，完成安全的 read/API/browser proof，避免未知 production mutation。

### 選擇原因

- `LCH-002` 是 `LCH-001` 之後最低未完成且最接近上線阻擋的 batch。
- 上線至少需要 demo member 清空 browser storage 後能看到 DB seeded clients，且後續要能新增客戶。
- 現有 CRM list 仍以 Zustand demo seed 作初始資料，無法證明 DB-backed runtime。

### 已完成

- 新增 `src/lib/clients/client-dto.ts`
  - 將 Prisma `Client` + `ComplianceChecklist` + `FamilyMember` + `Policy` 映射成既有 UI `Client` DTO。
  - 保留 hard rule 合規欄位：`complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- 新增 `src/lib/clients/client-repository.ts`
  - `listClientsForMember(session)`：只回 current member 在 current org 中 own clients。
  - `createClientForMember(session, input)`：由 server session 推導 `organizationId`、`ownerId`、`unitId`，並建立 `ComplianceChecklist`。
  - `getClientForMember()` / `updateClientForMember()`：套 `canReadClientDetail()` / `canWriteClient()`。
- 新增 `GET/POST /api/clients`。
- 新增 `GET/PATCH /api/clients/[id]`。
- 更新 `src/domains/client/store.ts`
  - 新增 `setClients()` 作 API cache hydration。
- 更新 `src/domains/client/service.ts`
  - 新增 `fetchClients()`、`fetchClientById()`、`createClientRemote()`。
- 更新 `/crm`
  - Client list mount 後呼叫 `/api/clients`。
  - 新增 loading、error、retry state。
  - 列表統計與篩選讀 BFF hydrated cache。
- 更新 `AddClientDialog`
  - Submit 改走 `POST /api/clients`。
  - 修掉 `any` status setter 與 number input coercion。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：是，透過 `pnpm build` 觸發 `prisma generate`。
- 是否執行 db push：否。
- DB target 判斷：`.env` 指向遠端 Supabase Postgres；本輪可連線且 demo seeded data 可讀，但無法由 repo/env 自動確認一定不是 production。
- 結果：
  - 未執行 DB mutation、db push、seed/reset。
  - 已透過 read-only API proof 驗證 DB seeded client 可被 demo member 讀到。
  - `POST/PATCH` code path 已 build/type/lint 通過，但未對遠端 DB 實際寫入。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint src/lib/clients/client-dto.ts src/lib/clients/client-repository.ts 'src/app/api/clients/route.ts' 'src/app/api/clients/[id]/route.ts' 'src/app/(dashboard)/crm/page.tsx' src/components/crm/add-client-dialog.tsx src/domains/client/service.ts src/domains/client/store.ts
pnpm lint:changed
pnpm prisma:validate
pnpm demo:runtime-audit
pnpm build
pnpm demo:preflight
```

結果：

- TypeScript：通過。
- Targeted ESLint：通過。
- `pnpm lint:changed`：通過。
- `pnpm prisma:validate`：通過。
- `pnpm demo:runtime-audit`：通過。
- `pnpm build`：通過，route list 包含 `/api/clients` 與 `/api/clients/[id]`。
- `pnpm demo:preflight`：通過 DB DNS/connection/tables；仍警告 Supabase public env placeholder。

API proof：

```bash
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -i http://localhost:3000/api/clients
curl -i -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/api/clients
curl -i -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/api/clients/c_wang
curl -i -H 'x-asai-demo-user-email: demo.member@asai.local' -H 'content-type: application/json' -d '{"email":"not-an-email"}' http://localhost:3000/api/clients
```

結果：

- 無 session `GET /api/clients`：`401 UNAUTHENTICATED`。
- Demo member `GET /api/clients`：`200 OK`，回 DB seeded client `c_wang` / `王大明`。
- Demo member `GET /api/clients/c_wang`：`200 OK`，回 client detail、family、policies、compliance checklist。
- Demo member invalid `POST /api/clients`：`400 INVALID_CLIENT_INPUT`，未寫入 DB。

Browser proof：

- 新 browser context（無既有 localStorage）+ `x-asai-demo-user-email: demo.member@asai.local` 開 `/crm`。
- 等到畫面顯示 `王大明`。
- Console error：0。
- Horizontal overflow：false。
- 截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-002-crm-db-backed-desktop.png`。

### 失敗與風險

- 未做實際 POST/PATCH DB write proof，原因是 DB target 為遠端 Supabase 且無法從 repo/env 自動判斷一定不是 production。
- CRM detail overview API 已可讀，但 detail layout 與 subpages 尚未全部改成 API/cache-first；仍有舊 `clientService.getClientById()` / store path。
- 尚未建立 family/policy write path。

### 剩餘上線 blocker

- 需要 operator 明確確認目前 Supabase DB target 是 development/staging，才能執行新增 client、刷新仍存在的寫入 proof。
- `LCH-002` 還需要完成 CRM detail/subpages API-backed migration、family/policy write path。
- `LCH-001` route guards 仍未完成。

### 下一輪建議

1. 若 operator 確認 DB target 是 development/staging：直接補 `POST /api/clients` 實際寫入 proof、refresh proof，必要時加 idempotent cleanup/backfill 策略。
2. 若 DB target 仍不明：繼續 LCH-002 內安全可推進項，將 CRM detail layout/subpages 改為 `fetchClientById()` API-backed，並補 family/policy endpoints 的 source-level proof。
3. 接續完成 LCH-001 route guards，減少未登入直接看到 dashboard skeleton 的 UX/security 缺口。

---

## 2026-06-19 Round 004 - LCH-002 CRM Detail API Hydration

### 本輪戰役目標

- 在 DB target 未確認、不能安全寫入遠端 DB 的情況下，繼續推進 `LCH-002` 內安全可驗收項目。
- 讓 CRM detail layout、overview 與 subpages 可直接從 `/api/clients/[id]` hydrate，不依賴使用者先從 `/crm` list 進入或 browser storage 裡已有 client cache。
- 補上 browser proof，證明清空 browser context 後 detail pages 仍可讀 DB seeded client。

### 選擇原因

- 上輪已完成 list API/cache-first，但 detail 子頁仍有多處 `clientService.getClientById()` / store direct path，空 browser storage 直接開 `/crm/c_wang` 可能顯示找不到或空畫面。
- `新增後刷新仍存在` 仍受 DB target 不明阻擋；同一 workstream 內最安全可推進項是 detail/subpage API-backed migration。

### 已完成

- 更新 `src/domains/client/store.ts`
  - 新增 `setClient()` upsert，讓單筆 detail API 可寫入 cache。
- 更新 `src/domains/client/service.ts`
  - `fetchClientById()` 改用 `setClient()`，單筆 client 不存在時也能 hydrate。
- 新增 `src/components/crm/use-client-record.ts`
  - 以 `clientService.fetchClientById(clientId)` hydrates detail cache。
  - 回傳 `client`、`isLoading`、`error` 給 layout/subpages。
- 更新 CRM detail layout
  - `src/app/(dashboard)/crm/[clientId]/layout.tsx` 改用 `useClientRecord()`。
  - 新增 loading state 與 permission/not-found error copy。
- 更新 CRM detail pages/subpages
  - `page.tsx`、`policies/page.tsx`、`relationships/page.tsx`、`gap-analysis/page.tsx`、`reports/page.tsx` 改用 `useClientRecord()`。
  - `timeline/page.tsx` 不依賴 client detail，本輪以 browser proof 覆蓋。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：是，透過 `pnpm build` 觸發 `prisma generate`。
- 是否執行 db push：否。
- DB target 判斷：`.env` 指向遠端 Supabase Postgres；本輪只做 read-only API/browser proof。
- 結果：無 DB mutation；直接讀 `GET /api/clients/c_wang` 取得 DB seeded client。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint src/components/crm/use-client-record.ts src/domains/client/service.ts src/domains/client/store.ts 'src/app/(dashboard)/crm/[clientId]/layout.tsx' 'src/app/(dashboard)/crm/[clientId]/page.tsx' 'src/app/(dashboard)/crm/[clientId]/policies/page.tsx' 'src/app/(dashboard)/crm/[clientId]/relationships/page.tsx' 'src/app/(dashboard)/crm/[clientId]/gap-analysis/page.tsx' 'src/app/(dashboard)/crm/[clientId]/reports/page.tsx'
pnpm lint:changed
pnpm demo:runtime-audit
pnpm prisma:validate
pnpm build
```

結果：

- TypeScript：通過。
- Targeted ESLint：通過。
- `pnpm lint:changed`：通過。
- `pnpm demo:runtime-audit`：通過。
- `pnpm prisma:validate`：通過。
- `pnpm build`：通過。

API proof：

```bash
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -i -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/api/clients/c_wang
```

結果：

- `GET /api/clients/c_wang`：`200 OK`，回 client、family、policies、compliance checklist。

Browser proof：

- 新 browser context，設定 `x-asai-demo-user-email: demo.member@asai.local`。
- 直接開以下路徑，不先進 `/crm`：
  - `/crm/c_wang`
  - `/crm/c_wang/relationships`
  - `/crm/c_wang/policies`
  - `/crm/c_wang/gap-analysis`
  - `/crm/c_wang/reports`
  - `/crm/c_wang/timeline`
- 結果：
  - Console error：0。
  - Horizontal overflow：false。
- 截圖：
  - `docs/06_audits-and-reports/screenshots/launch-readiness/lch-002-crm-detail-db-overview.png`
  - `docs/06_audits-and-reports/screenshots/launch-readiness/lch-002-crm-detail-db-relationships.png`
  - `docs/06_audits-and-reports/screenshots/launch-readiness/lch-002-crm-detail-db-policies.png`
  - `docs/06_audits-and-reports/screenshots/launch-readiness/lch-002-crm-detail-db-gap-analysis.png`
  - `docs/06_audits-and-reports/screenshots/launch-readiness/lch-002-crm-detail-db-reports.png`
  - `docs/06_audits-and-reports/screenshots/launch-readiness/lch-002-crm-detail-db-timeline.png`

### 失敗與風險

- 未做實際 DB write proof，原因同 Round 003：DB target 是遠端 Supabase 且仍未確認非 production。
- relationships 的新增/刪除仍是 local store mutation；尚未完成 family/policy write path。
- reports subpage 仍使用 report store 產生/顯示報告，尚未 DB-backed report CRUD。

### 剩餘上線 blocker

- `LCH-002` 仍缺：
  - family/policy minimal write endpoint。
  - 實際新增 client 後刷新仍存在 proof。
- `LCH-005` demo relogin full QA 仍缺 visit plans、reports、sessions、AI output 等跨模組 DB proof。
- 需 operator 確認 Supabase DB target 才能進行寫入驗收。

### 下一輪建議

1. 若 DB target 已確認 development/staging：補 client create write proof，新增後刷新仍存在，並記錄 cleanup/idempotent 策略。
2. 若 DB target 仍不明：繼續 LCH-002 的 safe path，新增 `POST /api/clients/[id]/family-members` 或 `POST /api/clients/[id]/policies` 的 source/build proof，但不做遠端寫入。
3. 也可切回 LCH-001 route guard，補 dashboard/member/org/super-admin coarse protection。

---

## 2026-06-19 Round 005 - LCH-002 Family / Policy Minimal Write BFF

### 本輪戰役目標

- 在 DB target 未確認前，不對遠端 Supabase 做實際寫入。
- 補齊 `LCH-002` 的最小 family/policy write path：server route、repository policy check、client service method、relationships dialog API wiring。
- 以 source/build/API validation/browser proof 證明路徑可被接續驗收。

### 選擇原因

- `LCH-002` 剩兩個主缺口：family/policy minimal write path 與實際新增後刷新 proof。
- 實際寫入 proof 當輪仍受 IQ-007 阻擋；family/policy endpoint 可安全完成並以 401/400 proof 驗證 auth/schema guard。此阻擋已於 2026-06-19 Operator Approval Update 解除為「允許 LCH demo/test 非破壞性寫入 proof」。

### 已完成

- 更新 `src/lib/clients/client-repository.ts`
  - 新增 `createFamilyMemberInputSchema`、`createPolicyInputSchema`。
  - 新增 `createFamilyMemberForClient()`。
  - 新增 `createPolicyForClient()`。
  - 新增共用 `getWritableClientScope()`，寫入前確認 current org、非 archived client、`canWriteClient()`。
- 新增 `POST /api/clients/[id]/family-members`。
- 新增 `POST /api/clients/[id]/policies`。
- 更新 `src/domains/client/service.ts`
  - 新增 `createFamilyMemberRemote()`。
  - 新增 `createPolicyRemote()`。
  - 成功時以完整 client DTO `setClient()` 更新 cache。
- 更新 `src/components/crm/AddRelationshipDialog.tsx`
  - Child mode 改走 family member BFF。
  - 新增 submitting state。
  - 移除既有 `any` setter。
  - 修復 React 19 `react-hooks/set-state-in-effect`：改用 derived selected parent value，不在 effect 內同步 setState。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：是，透過 `pnpm build` 觸發 `prisma generate`。
- 是否執行 db push：否。
- DB target 判斷：`.env` 指向遠端 Supabase Postgres；本輪不做 DB mutation。
- 結果：
  - 無 schema change、無 db push、無遠端寫入。
  - 新 endpoints 已進 build route list。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint src/lib/clients/client-repository.ts 'src/app/api/clients/[id]/family-members/route.ts' 'src/app/api/clients/[id]/policies/route.ts' src/domains/client/service.ts src/components/crm/AddRelationshipDialog.tsx
pnpm lint:changed
pnpm demo:runtime-audit
pnpm prisma:validate
pnpm build
```

結果：

- TypeScript：通過。
- Targeted ESLint：通過。
- `pnpm lint:changed`：通過。
- `pnpm demo:runtime-audit`：通過。
- `pnpm prisma:validate`：通過。
- `pnpm build`：通過，route list 包含：
  - `/api/clients/[id]/family-members`
  - `/api/clients/[id]/policies`

API proof（invalid payload / unauth only，不寫入 DB）：

```bash
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -i -H 'content-type: application/json' -d '{"name":"測試","relation":"配偶"}' http://localhost:3000/api/clients/c_wang/family-members
curl -i -H 'x-asai-demo-user-email: demo.member@asai.local' -H 'content-type: application/json' -d '{"relation":"配偶"}' http://localhost:3000/api/clients/c_wang/family-members
curl -i -H 'content-type: application/json' -d '{"type":"壽險","provider":"測試","amount":100}' http://localhost:3000/api/clients/c_wang/policies
curl -i -H 'x-asai-demo-user-email: demo.member@asai.local' -H 'content-type: application/json' -d '{"provider":"測試"}' http://localhost:3000/api/clients/c_wang/policies
```

結果：

- 未登入 family POST：`401 UNAUTHENTICATED`。
- demo member invalid family POST：`400 INVALID_FAMILY_MEMBER_INPUT`。
- 未登入 policy POST：`401 UNAUTHENTICATED`。
- demo member invalid policy POST：`400 INVALID_POLICY_INPUT`。

Browser proof：

- 新 browser context + demo member header 開 `/crm/c_wang/relationships`。
- 點擊「新增關係人」開啟 dialog。
- Console error：0。
- Horizontal overflow：false。
- 截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-002-family-dialog-api-wired.png`。

### 失敗與風險

- 沒有做 valid POST 寫入 proof，原因仍是 DB target 未確認。
- Parent mode 的 re-parent flow 仍是 local graph helper；正式 DB re-parent/update family member endpoint 待後續 CRUD 卡。
- Policy endpoint 已完成 source/build/guard proof，但尚未新增 policy create dialog。

### 剩餘上線 blocker

- `LCH-002` 只剩「新增 client 後刷新仍存在」實際 DB write proof。
- `LCH-005` 仍需完整 demo relogin QA：clients、visit plans、reports、sessions、AI output。
- 仍需 operator 確認 Supabase target 是 development/staging，或提供 local DB target。

### 下一輪建議

1. 若 DB target 已確認 development/staging：執行 valid `POST /api/clients` 寫入 proof，刷新重讀確認存在。
2. 若 DB target 仍不明：切回 `LCH-001` route guards，這是下一個可安全推進且影響上線的缺口。

### 2026-06-19 Operator Approval Update

- Operator 已明確批准目前 `.env` 指向的 Supabase target 可執行 LCH demo/test 非破壞性寫入 proof。
- 後續輪次可補 `POST /api/clients` valid write、refresh/relogin proof、family/policy valid write proof。
- 仍禁止 drop/reset、清表、刪除遠端資料、真實金流/email/notification、停用 public-read、刪除 bucket object、儲存 raw secret/token/private payload。

## 2026-06-19 Round 006 - LCH-001 Route Guard Closure

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-001` Session / Workspace Foundation route guards。
- 選擇原因：`LCH-001` 是最低未完成卡；route guard 直接影響 member/org/super-admin 的上線安全邊界，且不需要 DB mutation。

### 本輪完成

- 將原 `(dashboard)/layout.tsx` client shell 移到 `src/components/layout/dashboard-shell.tsx`。
- 新增 server `(dashboard)/layout.tsx`，未登入 member routes 直接 `redirect("/login")`。
- 將 `/team` 改為 server wrapper，套 `requireOrgAdminRoute()`，owner/admin/manager 才能進入 org admin surface。
- `/super-admin` page 套 `requirePlatformRoute()`，一般 app session 或無 platform role 會導 `/super-admin/login`。
- 新增 `src/lib/auth/route-guards.ts`，集中 route-level redirect helper，API policy 仍保留在 `current-workspace.ts` / `policies.ts`。
- 更新 `AGENTS.md`、`PLN-017`、`RES-016`。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：是，透過 `pnpm build` 觸發 `prisma generate`。
- 是否執行 db push：否。
- DB target 判斷：`.env` 指向遠端 Supabase Postgres；本輪不做 DB mutation。
- 結果：無 schema change、無 db push、無遠端寫入。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm lint:changed
pnpm demo:runtime-audit
pnpm build
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -s -o /dev/null -D - http://localhost:3000/dashboard
curl -s -o /tmp/asai-dashboard.html -w '%{http_code}\n' -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/dashboard
curl -s -o /tmp/asai-team.html -w '%{http_code}\n' -H 'x-asai-demo-user-email: demo.manager@asai.local' http://localhost:3000/team
curl -s -o /dev/null -D - -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/super-admin
```

結果：

- TypeScript：通過。
- `pnpm lint:changed`：通過。
- `pnpm demo:runtime-audit`：通過。
- `pnpm build`：通過；dashboard/member routes 轉為 dynamic。
- 無 session `/dashboard`：`307`，location `/login`。
- 本機 dev header + demo member `/dashboard`：`200`。
- 本機 dev header + demo manager `/team`：`200`。
- 本機 dev header + demo member `/super-admin`：`307`，location `/super-admin/login`。

### 失敗與風險

- 本輪未做 Browser screenshot，因改動是 server guard；以 HTTP proof + build 驗證。
- Dev header proof 必須顯式用 `ALLOW_DEV_AUTH_HEADER=true` 啟動，production 仍禁止 dev header。
- Production `AUTH_SECRET` 與正式 provider/email/SSO 尚未接入，仍是 release blocker。
- Client portal session contract 仍未設計，留給 `LCH-006`。

### 剩餘上線 blocker

- `LCH-002` 仍缺「新增 client 後刷新仍存在」實際 DB write proof。
- `LCH-004` 三個 AI 尚未完成 session-scoped persistence / `AiUsageLog` 全路徑 proof。
- `LCH-005` demo relogin full QA 仍缺。
- `LCH-006` client portal session/share DB-backed token lookup 仍缺。

### 下一輪建議

1. 補 `LCH-002` valid `POST /api/clients` 寫入 proof，刷新重讀確認存在。
2. 或開始 `LCH-003` member settings BFF，讓 `/settings` 從 mock surface 轉為 member-scoped contract。

## 2026-06-19 Round 007 - LCH-002 Valid Client Write Proof

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-002` DB-backed Client CRUD valid write proof。
- 選擇原因：`LCH-002` 是最低未完成且最接近「資料能正常新增」上線阻擋的卡；operator 已批准目前 Supabase target 做 LCH demo/test 非破壞性寫入 proof。

### 本輪完成

- 在目前 `.env` 指向的 Supabase Postgres target 執行非破壞性 demo/test client 新增 proof。
- 以 server session/dev header 建立 client，確認 API 不信任前端 org/user scope，而由 server session 寫入。
- 重讀 list/detail API，確認新增 client 重新整理後仍存在。
- 驗證新增 client 合規 checklist 初始化：`kycStatus=MISSING`。
- 更新 `AGENTS.md`、`PLN-017`，將 `LCH-002` 完成。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否，本輪無 schema/codegen 需求。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；operator 已批准目前 target 可做 LCH demo/test 非破壞性寫入 proof。
- 寫入結果：
  - Created client id：`cmqjsnwbf00005061en7zsevh`。
  - Created client name：`LCH-002 測試客戶 20260619014910`。
  - `POST /api/clients`：201。
  - `GET /api/clients`：200，list 中找到 created client，list count 2。
  - `GET /api/clients/cmqjsnwbf00005061en7zsevh`：200，detail name match，`kycStatus=MISSING`。

### 驗收

```bash
pnpm demo:preflight
pnpm exec tsc --noEmit --pretty false
pnpm lint:changed
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -H 'x-asai-demo-user-email: demo.member@asai.local' -H 'content-type: application/json' -d @/tmp/asai-lch002-create-payload.json http://localhost:3000/api/clients
curl -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/api/clients
curl -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/api/clients/cmqjsnwbf00005061en7zsevh
```

結果：

- `pnpm demo:preflight`：通過 DB DNS / connection / required tables；仍警告 Supabase public env placeholder。
- TypeScript：通過。
- `pnpm lint:changed`：通過。
- `POST /api/clients`：201。
- `GET /api/clients`：200，created client found。
- `GET /api/clients/[id]`：200，detail match，`kycStatus=MISSING`。

### 失敗與風險

- 本輪沒有清除新增 demo/test client，因禁止刪除遠端資料；該筆可保留為 LCH evidence。
- Dev proof 依賴 `ALLOW_DEV_AUTH_HEADER=true`，production 不得啟用。
- `pnpm demo:preflight` 仍警告 Supabase public env placeholder；此不阻擋 DB-backed client CRUD，但會阻擋未來 client-side Supabase features。
- Dev server log 出現 pg deprecation warning：`Calling client.query() when the client is already executing a query is deprecated`；不阻擋本輪，但後續可檢查 preflight/dev concurrent query path。

### 剩餘上線 blocker

- `LCH-003` member settings 尚未 DB/BFF-backed。
- `LCH-004` 三個 AI 尚未完成 session-scoped persistence / `AiUsageLog` 全路徑 proof。
- `LCH-005` demo relogin full QA 仍缺 visit plans、reports、sessions、AI output。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。

### 下一輪建議

1. 做 `LCH-003` member settings BFF，讓 `/settings` 從 mock surface 轉成 member-scoped contract。
2. 或開始 `LCH-004` 的 `/api/ai/interview` session-scope / `AiUsageLog` 最小閉環。

## 2026-06-19 Round 008 - LCH-003 Member Settings DB-backed Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-003` Member settings and workspace preferences。
- 選擇原因：`LCH-003` 是最低未完成且直接阻擋 member admin / org admin settings 分層的上線卡；原 `/settings` 仍是本機假資料與「系統設定」命名。

### 本輪完成

- 新增 `OrganizationMember.settings` nullable JSON，作為 member-scoped preferences contract。
- 新增 `src/lib/member-settings/member-settings-repository.ts`，由 server session 推導 current membership，只讀寫個人偏好。
- 新增 `GET/PATCH /api/member/settings`，支援 profile、notifications、AI preferences、personal integrations、default workspace。
- 重作 `/settings` 為「個人設定」頁，移除本機 business data reset，明確排除 org branding、billing、unit policy、client portal、org AI quota、compliance defaults。
- sidebar 將 `/settings` 命名由「系統設定」改為「個人設定」。
- 保存 `/settings` desktop/mobile 截圖。

### DB / Prisma 操作

- 是否修改 schema：是，新增 `OrganizationMember.settings Json?`。
- 是否執行 generate：是，`pnpm prisma:generate` 與 `pnpm build` 內的 generate 均通過。
- 是否執行 db push：是，`pnpm prisma db push` 通過。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres `db.wwocdcicvpmbdmqvskzi.supabase.co`；本輪為 nullable column add 與 demo member settings JSON 寫入 proof。

### 驗收

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm demo:preflight
pnpm prisma db push
pnpm exec tsc --noEmit --pretty false
pnpm run lint:changed
pnpm build
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -H 'x-asai-demo-user-email: demo.member@asai.local' http://localhost:3000/api/member/settings
curl -X PATCH -H 'x-asai-demo-user-email: demo.member@asai.local' -H 'content-type: application/json' http://localhost:3000/api/member/settings
```

結果：

- Prisma validate/generate/db push：通過。
- TypeScript：通過。
- `pnpm lint:changed`：通過。
- `pnpm build`：通過，`/api/member/settings` 列入 route manifest。
- API proof：`GET /api/member/settings` 200；`PATCH /api/member/settings` 200；重讀 `GET` 200 且 `displayName=Demo Member LCH-003`、`landingPath=/crm` persisted true。
- Browser proof：`/settings` desktop 1440x1000、mobile 390x844 heading `個人設定`，console error 0、無水平 overflow。

### 失敗與風險

- `pnpm demo:preflight` 仍警告 Supabase public env placeholder；不阻擋 server-side DB proof，但會阻擋未來 client-side Supabase features。
- 本輪只完成 member settings；org settings 仍待 `LCH-007`。
- Personal collaborator 入口尚未實作真正 invite flow，僅顯示 server policy entry，符合本卡範圍。

### 剩餘上線 blocker

- `LCH-004` 三個 AI 尚未完成 session-scoped persistence / `AiUsageLog` 全路徑 proof。
- `LCH-005` demo relogin full QA 仍缺 visit plans、reports、sessions、AI output。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` org aggregate + org settings 尚未完成。

### 下一輪建議

1. 進入 `LCH-004`，先完成 `/api/ai/chat` 或 `/api/ai/interview` session-scoped persistence + `AiUsageLog` proof。
2. 或做 `LCH-007` org aggregate/org settings，因 `LCH-003` 已解除設定分層依賴。

## 2026-06-19 Round 009 - LCH-004 Assistant Chat Usage And Persistence Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-004` Three AI Production Minimum - assistant chat slice。
- 選擇原因：三個 AI 是上線核心阻擋；其中 `/api/ai/chat` 最接近可完成完整 session → provider → persistence → usage proof 的交付切片，且不牽動 Theater Route B migration。

### 本輪完成

- `/api/ai/chat` 改為 session-scoped route：使用 `requireCurrentMember()` 推導 organization/user/unit，不接受前端 org/user scope。
- 加入 body schema validation 與 route context allowlist，導航工具只允許既有安全 route。
- 加入 `canUseAiModule(session, CHAT)` quota check；超限回 429。
- 保留 streaming UX，OpenAI success stream 完成後寫入 `AiUsageLog`、`AssistantConversation`、`AssistantMessage`。
- 成功 AI call 後 increment organization `monthlyAiUsed`，讓 quota/aggregate 後續有真資料。
- 前端 assistant request 附帶 local `conversationId` 作 metadata，不改 client store persistence 行為。

### DB / Prisma 操作

- 是否修改 schema：否，沿用既有 `AssistantConversation`、`AssistantMessage`、`AiUsageLog`。
- 是否執行 generate：是，`pnpm build` 內執行 Prisma generate 成功。
- 是否執行 db push：否，本輪無 schema 變更。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪寫入 demo member chat proof。

### 驗收

```bash
pnpm demo:preflight
pnpm exec tsc --noEmit --pretty false
pnpm run lint:changed
pnpm build
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -H 'x-asai-demo-user-email: demo.member@asai.local' -H 'content-type: application/json' -X POST http://localhost:3000/api/ai/chat
```

結果：

- `POST /api/ai/chat`：200，回傳串流文字。
- DB proof：`CHAT usage=1`、`success_usage=1`、`assistant_conversations=1`、`assistant_messages=2`、`monthly_ai_used=1`、latest model `gpt-4o-mini`。
- Browser proof：`/dashboard` desktop 1440x1000、mobile 390x844，console error 0、無水平 overflow。
- TypeScript、lint:changed、build：通過。

### 失敗與風險

- 本輪只完成 assistant chat；`/api/ai/interview` 仍尚未改為 session-injected persistence，Theater Route B 尚未完成。
- Chat error-path `AiUsageLog` 已在 code path 中補上，但本輪未刻意用壞 key 觸發 provider error；後續 LCH-004 全覆蓋時需補三 AI success/error evidence。
- 這輪產生 1 筆真實 OpenAI demo usage 與 1 組 assistant conversation/message evidence；保留作 LCH proof，不刪遠端資料。

### 剩餘上線 blocker

- `LCH-004` 剩餘：interview session scope + output persistence、Theater Route B、三 AI success/error `AiUsageLog` 全路徑 proof。
- `LCH-005` demo relogin full QA 仍缺 visit plans、reports、sessions、AI output。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` org aggregate + org settings 尚未完成。

### 下一輪建議

1. 繼續 `LCH-004`，處理 `/api/ai/interview` 與 `/api/ai/interview/outputs` session injection + persistence proof。
2. 或先補 `LCH-004` chat error-path proof 與 quota 429 proof，再進 interview。

## 2026-06-19 Round 010 - LCH-004 Interview Agent Usage And Output Persistence Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-004` Three AI Production Minimum - interview agent slice。
- 選擇原因：`/api/ai/chat` 已完成，下一個最低未完成且最接近上線阻擋的是 AI 顧問陪談；它原本仍信任前端 `organizationId/userId`，且沒有 DB-backed session/material/output evidence。

### 本輪完成

- `/api/ai/interview` 改為 session-scoped route：使用 `requireCurrentMember()` 推導 organization/user/unit，不再讀前端 `organizationId/userId`。
- `/api/ai/interview/outputs` 同步改為 session-scoped，輸出草稿由 server session 注入 scope。
- 新增 `src/lib/interview/interview-ai-repository.ts`，以 `InteractionEvent` 保存訪談回合與輸出草稿 evidence。
- `clientId` 若由前端傳入，server 會確認 current member 可讀該 client，否則不掛 relation。
- 兩條 route 都加入 `canUseAiModule(session, INTERVIEW)` quota check；超限回 429。
- 成功 provider call 後寫 `AiUsageLog`，並 increment organization `monthlyAiUsed`。
- `/interview` 前端不再送 demo organization id。

### DB / Prisma 操作

- 是否修改 schema：否，沿用既有 `InteractionEvent`、`AiUsageLog`。
- 是否執行 generate：是，`pnpm build` 內執行 Prisma generate 成功。
- 是否執行 db push：否，本輪無 schema 變更。
- DB target 判斷：`pnpm demo:preflight` 在前一輪與本輪相關 DB proof 均指向遠端 Supabase Postgres；本輪寫入 demo member interview proof。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm run lint:changed
pnpm build
ALLOW_DEV_AUTH_HEADER=true pnpm dev
curl -H 'x-asai-demo-user-email: demo.member@asai.local' -H 'content-type: application/json' -X POST http://localhost:3000/api/ai/interview
curl -H 'x-asai-demo-user-email: demo.member@asai.local' -H 'content-type: application/json' -X POST http://localhost:3000/api/ai/interview/outputs
```

結果：

- `POST /api/ai/interview`：200，回傳串流訪談追問。
- `POST /api/ai/interview/outputs`：200，回傳結構化草稿；`knownFacts=2`、`unknowns=1`、`prepQuestions=3`、`issueReadiness=2`。
- DB proof：`INTERVIEW usage 3→5`、success usage `1→3`、interaction events `0→2`；latest sources：`api/ai/interview/outputs`、`api/ai/interview`；latest model `gpt-4o-mini`。
- Browser proof：`/interview` desktop 1440x1000、mobile 390x844，heading `AI 顧問陪談`，console error 0、無水平 overflow。
- TypeScript、lint:changed、build：通過。

### 失敗與風險

- 本輪未新增正式 `InterviewSession` Prisma model；使用 `InteractionEvent` 作最小 evidence，後續若要完整 relogin editable interview workspace，仍需專用資料模型或把 store migration 納入 LCH/ITA。
- Theater Route B 尚未完成，LCH-004 不可標整卡完成。
- 三 AI error-path 全覆蓋尚未完成；本輪 proof 是 success path。

### 剩餘上線 blocker

- `LCH-004` 剩餘：Theater Route B、Theater usage log、三 AI success/error `AiUsageLog` 全路徑 proof、quota 429 UI proof。
- `LCH-005` demo relogin full QA 仍缺 visit plans、reports、sessions、AI output 整合。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` org aggregate + org settings 尚未完成。

### 下一輪建議

1. 繼續 `LCH-004`，進 Theater Route B 最小版或先加 staging legacy gate + usage proof。
2. 或補三 AI error-path / quota 429 evidence，讓 `AiUsageLog` 覆蓋更完整。

## 2026-06-19 Round 011 - LCH-004 AI Quota Guard Proof Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-004` Three AI Production Minimum - quota guard proof。
- 選擇原因：chat/interview success path 已完成，下一個最低且最接近上線成本風險的是 AI quota 超限保護；它能驗證超限時 provider call 前阻擋，不會新增 `AiUsageLog` 或成本。

### 本輪完成

- 對 demo member default org 執行可還原 quota proof。
- 暫時將 `demo_org_asai_personal.monthly_ai_used` 設為 `monthly_ai_quota`，呼叫 `/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs`。
- 三條 route 皆回 `429 QUOTA_EXCEEDED`，且 response 帶「AI 使用額度已用完，請聯絡管理員或升級方案。」。
- 比對 quota-blocked calls 前後 `AiUsageLog` count，確認超限時不進 provider、不增加成本。
- 測試後還原 `monthly_ai_used=3`，並二次查詢確認。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否，本輪無 schema 或 generated client 變更。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；operator 已批准 LCH demo/test 非破壞性寫入 proof。本輪只對 demo org 做可還原 counter update。

### 驗收

```bash
pnpm demo:preflight
ALLOW_DEV_AUTH_HEADER=true pnpm dev
node <quota-proof-script>
node <restore-verification-query>
pnpm exec tsc --noEmit --pretty false
pnpm run lint:changed
```

結果：

- `pnpm demo:preflight`：通過，Supabase DB DNS/connection/tables 正常；public Supabase env 仍是 placeholder warning。
- `/api/ai/chat` quota proof：429 `QUOTA_EXCEEDED`。
- `/api/ai/interview` quota proof：429 `QUOTA_EXCEEDED`。
- `/api/ai/interview/outputs` quota proof：429 `QUOTA_EXCEEDED`。
- DB proof：`AiUsageLog` count 前後維持 `CHAT=1`、`INTERVIEW=5`。
- Restore proof：`demo_org_asai_personal.monthly_ai_used=3`、`monthly_ai_quota=200`。

### 失敗與風險

- 第一次 proof script 使用錯誤表名 `organization_memberships`，失敗於查詢階段，未執行任何 update；已依 Prisma `@@map("organization_members")` 修正後通過。
- 本輪只驗 chat/interview/output API quota guard，尚未驗 Theater Route B quota、UI 429 顯示與 provider error-path usage log。

### 剩餘上線 blocker

- `LCH-004` 剩餘：Theater Route B、Theater usage log、三 AI success/error `AiUsageLog` 全路徑 proof、quota UI proof。
- `LCH-005` demo relogin full QA 仍缺 visit plans、reports、sessions、AI output 整合。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` org aggregate + org settings 尚未完成。

### 下一輪建議

1. 繼續 `LCH-004`，優先進 Theater Route B 最小版或 staging legacy gate，讓第三個 AI 不再是 production blocker。
2. 補 chat/interview provider error-path `AiUsageLog` proof，並把 quota 429 UI 呈現接到 dashboard/interview。

## 2026-06-19 Round 012 - LCH-004 Theater Legacy Gate And Usage Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-004` Three AI Production Minimum - Theater legacy gate + usage proof。
- 選擇原因：第三個 AI Theater 原本仍直接信任前端 payload、沒有 session guard、沒有 quota、沒有 `AiUsageLog`，是三 AI 上線最低要求中最大的成本與權限缺口。

### 本輪完成

- `/api/ai/theater` 改為 session-scoped route，使用 `requireCurrentMember()` 推導 current org/user/unit。
- `/api/ai/theater/score` 同步改為 session-scoped，加入 Zod body validation。
- 兩條 route 都加入 `canUseAiModule(session, THEATER)`，超限回 `429 QUOTA_EXCEEDED`。
- success path 寫 `AiUsageLog`、`InteractionEvent(type=THEATER)`，並 increment organization `monthlyAiUsed`。
- failure path 寫 `AiUsageLog.error`，讓 provider/key/runtime error 可追蹤。
- 新增 `src/lib/theater/theater-ai-repository.ts`，封裝 Theater usage/event persistence。
- 新增 production legacy gate：`NODE_ENV=production` 且未設定 `ENABLE_LEGACY_THEATER_DEMO=true` 時回 `503 THEATER_ROUTE_B_REQUIRED`。
- `/theater/[sessionId]` UI 送出 `sessionId/clientId`，並顯示 API 回傳的 429/503 friendly message。
- `.env.example` 補 `ENABLE_LEGACY_THEATER_DEMO=false` 說明。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否，本輪無 schema 變更。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪寫入 demo Theater usage/event proof。

### 驗收

```bash
pnpm demo:preflight
pnpm exec tsc --noEmit --pretty false
ALLOW_DEV_AUTH_HEADER=true pnpm dev
node <theater-success-proof-script>
node <theater-quota-proof-script>
pnpm run lint:changed
pnpm build
```

結果：

- `POST /api/ai/theater`：200，回傳客戶角色回覆。
- `POST /api/ai/theater/score`：200，回傳評分 JSON keys `empathy/questioning/clarity/objectionHandling/closing/missedOpportunities/improvedPhrasing`。
- DB proof：`THEATER usage 0→2`、success usage `0→2`、THEATER interaction events `0→2`、monthly counter `3→5`。
- Quota proof：character/score 皆回 `429 QUOTA_EXCEEDED`，`THEATER usage` 維持 `2`，counter 還原 `5`。
- TypeScript：通過。

### 失敗與風險

- 本輪沒有做 Route B 真正多角色/旁白 NPC/五視角新版劇場；只完成 legacy staging gate，避免誤宣稱 production ready。
- Theater 目前只有 character + score/feedback 兩種 provider call；尚無 Route B director call，因此 `Theater director/character/feedback calls` 只能標 `[~]`。
- Provider error-path 實際壞 key proof 尚未跑；code path 已寫 `AiUsageLog.error`，但三 AI error-path 全覆蓋仍待後續。

### 剩餘上線 blocker

- `LCH-004` 剩餘：Route B 新版 Theater、多角色/旁白 NPC/五視角回饋、三 AI provider error-path proof、quota UI 全頁 proof。
- `LCH-005` demo relogin full QA 仍缺 visit plans、reports、sessions、AI output 整合。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` org aggregate + org settings 尚未完成。

### 下一輪建議

1. 繼續 `LCH-004`，補三 AI provider error-path proof，確認 `AiUsageLog.error` 實際落庫。
2. 或進 Route B theater migration 設計/實作，補 director/NPC/五視角資料結構與 UI。

## 2026-06-19 Round 013 - LCH-004 Three AI Error Path Proof Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-004` Three AI Production Minimum - three AI provider error-path proof。
- 選擇原因：三個 AI success path 與 quota proof 已有 evidence，但 provider/key/runtime error 是否會實際寫入 `AiUsageLog.error` 仍是上線觀測缺口。

### 本輪完成

- 補 `/api/ai/interview` outer catch：OpenAI stream 建立前若失敗，也會呼叫 `persistInterviewFailure()`。
- 以測試用無效 OpenAI key 啟動 dev server，對 `/api/ai/chat`、`/api/ai/interview`、`/api/ai/theater` 各打一筆 provider error proof。
- 三條 route 皆回 500，且 `AiUsageLog.error` 實際落庫。
- LCH-004 的「三個 AI 都驗證 success/error path `AiUsageLog`」已標記完成。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否，本輪無 schema 變更。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪寫入 demo error usage proof。

### 驗收

```bash
pnpm demo:preflight
pnpm exec tsc --noEmit --pretty false
OPENAI_API_KEY=sk-invalid-asai-proof ALLOW_DEV_AUTH_HEADER=true pnpm dev
node <three-ai-error-proof-script>
pnpm run lint:changed
pnpm build
```

結果：

- `/api/ai/chat` error proof：500，`CHAT` error count `+1`。
- `/api/ai/interview` error proof：500，`INTERVIEW` error count `+1`。
- `/api/ai/theater` error proof：500，`THEATER` error count `+1`。
- Latest error logs：三者皆有 `model=gpt-4o-mini` 與 `error IS NOT NULL`。
- TypeScript：通過。

### 失敗與風險

- 本輪使用測試用無效 key 觸發 provider 401；文件只記錄 masked/sample error，不存 raw secret。
- 尚未做 browser UI error state proof；API/DB proof 已完成。
- LCH-004 仍未完成新版 Route B Theater，且 quota UI 全頁 proof 仍待後續。

### 剩餘上線 blocker

- `LCH-004` 剩餘：Route B 新版 Theater、多角色/旁白 NPC/五視角回饋、quota UI 全頁 proof。
- `LCH-005` demo relogin full QA 仍缺 visit plans、reports、sessions、AI output 整合。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` org aggregate + org settings 尚未完成。

### 下一輪建議

1. 補 LCH-004 quota UI/browser proof，讓 chat/interview/theater 的 429 friendly message 在頁面層可見。
2. 或進 LCH-005 demo account relogin QA，因三 AI API minimum 已接近可驗收。

## 2026-06-19 Round 014 - LCH-005 Demo Relogin Browser QA Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-005` Demo Account Relogin QA - seed reset + browser storage proof。
- 選擇原因：三 AI API minimum 已接近完成，下一個上線 demo blocker 是體驗帳號不能依賴 browser localStorage；需要可重跑 QA 來證明清空 storage 後仍從 DB 看到 seeded data。

### 本輪完成

- 新增 `scripts/demo-relogin-qa.mjs`，使用 Playwright/Edge 新 context、demo auth header、清空 localStorage/sessionStorage 後巡檢主要 demo surfaces。
- 新增 package script `pnpm demo:relogin-qa`。
- 實跑 `pnpm demo:preflight`，確認 DB target / required tables。
- 實跑 `pnpm demo:seed:reset`，重新 seed `quickstart-insurance-advisor` v1。
- 實跑 `pnpm demo:relogin-qa`，確認清空 browser storage 後 demo member 仍可看到 DB seeded data。
- 保存 LCH-005 browser screenshots。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否，本輪無 schema 變更。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；`demo:seed:reset` 僅 reset `quickstart-insurance-advisor` demo scenario。

### 驗收

```bash
pnpm demo:preflight
pnpm demo:seed:reset
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:relogin-qa
pnpm exec tsc --noEmit --pretty false
pnpm run lint:changed
pnpm build
```

結果：

- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm demo:seed:reset`：通過，seeded demo scenario `quickstart-insurance-advisor` v1。
- `pnpm demo:relogin-qa`：通過。
- Browser QA：`/crm`、`/crm/c_wang`、`/pre-visit`、`/reports`、`/spin` 皆可看到 `王大明`；`/theater` 可看到 `AI 劇場演練`；final page 無水平 overflow。
- 截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-005/crm.png`、`crm-detail.png`、`pre-visit.png`、`reports.png`、`spin.png`、`theater.png`。

### 失敗與風險

- 本輪使用 dev auth header，不等同正式 Supabase/Auth.js login flow。
- `demo:seed:reset` 會 reset demo scenario，不會刪真實資料；仍需避免在未確認 target 時對 production 做 destructive reset。
- demo manager aggregate-only、demo client portal、demo member 新增 AI output refresh proof 仍未完成。

### 剩餘上線 blocker

- `LCH-005` 剩餘：Supabase Auth `supabase_auth_id`、demo member 新增 client/AI output refresh proof、demo manager aggregate-only、demo client portal、mock API production-like guard proof。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` org aggregate + org settings 尚未完成。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-005`，補 demo member 新增 AI output 後刷新仍存在，並補 AiUsageLog count before/after。
2. 或做 demo manager aggregate-only proof，確認 manager 不看到 member 客戶明細。

## 2026-06-19 Round 015 - LCH-005 Demo Member Write And AI Output QA Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-005` Demo Account Relogin QA - demo member write + AI output persistence。
- 選擇原因：清空 storage 後讀取 proof 已完成，下一個 demo 可用性 blocker 是 demo member 能否新增真資料、產生 AI output，並在刷新/重讀後仍存在。

### 本輪完成

- 新增 `scripts/demo-member-write-qa.mjs`。
- 新增 package script `pnpm demo:member-write-qa`。
- QA script 透過 BFF `POST /api/clients` 建立 demo test client。
- QA script 透過 `GET /api/clients/[id]` 重讀 client，驗證 refresh persistence 與 compliance checklist 初始化。
- QA script 呼叫 `/api/ai/interview/outputs` 建立 AI output，並以 DB 查詢驗證 `AiUsageLog`、`InteractionEvent` 與 org monthly counter。
- LCH-005 的「demo member 新增 client、建立至少一筆 AI output，刷新後仍存在」已標記完成。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否，本輪無 schema 變更。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪新增 demo/test client 與 AI output evidence。

### 驗收

```bash
pnpm demo:preflight
pnpm exec tsc --noEmit --pretty false
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:member-write-qa
pnpm run lint:changed
pnpm build
```

結果：

- `POST /api/clients`：201，created client `cmqjwzrem0004ai619szx7z9p`。
- `GET /api/clients/[id]`：200，created client survives reread，`kycStatus=MISSING`。
- `POST /api/ai/interview/outputs`：200，output includes known facts、prep questions、issue readiness。
- DB proof：created client count `1`；client-linked `InteractionEvent(type=VISIT)` count `1`；`INTERVIEW AiUsageLog 1→2`；`monthlyAiUsed 1→2`。
- TypeScript：通過。

### 失敗與風險

- 第一次 `demo:member-write-qa` 因 script 以 camelCase 讀取 Postgres snake_case aliases，導致最後四個 check 誤報 fail；DB JSON 已顯示成功。已修正 script 後重跑通過。
- QA 過程保留兩位 LCH-005 demo/test clients 作 evidence，不做遠端 delete。
- Dev server output 出現 `pg@9` deprecation warning；不影響 API/DB proof，後續若擴大 PG direct script 可再收斂 query flow。

### 剩餘上線 blocker

- `LCH-005` 剩餘：Supabase Auth `supabase_auth_id`、demo manager aggregate-only、demo client portal、mock API production-like guard proof。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` org aggregate + org settings 尚未完成。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-005`，做 demo manager aggregate-only proof，確認 manager 不看到 member 客戶明細。
2. 或補 `/api/mock/*` production-like guard proof，關掉 mock 成功冒充正式驗收的風險。
