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

## 2026-06-19 Round 016 - LCH-005 Demo Manager Aggregate-Only QA Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-005` Demo Account Relogin QA - demo manager aggregate-only proof；同步解除 `LCH-007` 的 `GET /api/org/overview` 第一張 API 缺口。
- 選擇原因：上一輪已證明 demo member 可新增 client 與 AI output；下一個上線 blocker 是 org manager 權限邊界，必須證明 manager 只看到彙總與輔導指標，不會看到 member 客戶明細。

### 本輪完成

- 新增 `GET /api/org/overview`。
- Route 使用 `requireOrgAdmin()` 與 `canReadOrgAggregate()`，由 server session 推導 organization、role、unit scope。
- Overview 只回傳 organization summary、scope、totals、coaching、unitHealth、memberHealth；不回 client list、client PII、policy、report body、SPIN/Theater transcript。
- 新增 `scripts/demo-manager-aggregate-qa.mjs`。
- 新增 package script `pnpm demo:manager-aggregate-qa`。
- QA script 以 demo manager session 呼叫 `/api/org/overview`，並用 DB demo clients/policies 產生 forbidden sentinels 檢查 API response。
- LCH-005 的「demo manager 只看到 aggregate/coaching/unit/member health」已標記完成；LCH-007 的 `GET /api/org/overview` 已標記完成。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否，本輪無 schema 變更。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪只做 aggregate read proof，未新增/刪除資料。

### 驗收

```bash
pnpm demo:preflight
pnpm exec tsc --noEmit --pretty false
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:manager-aggregate-qa
pnpm run lint:changed
pnpm build
```

結果：

- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- TypeScript：通過。
- `GET /api/org/overview`：demo manager 回 200。
- Aggregate proof：members `3`、activeMembers `3`、units `2`、clients `3`、visitPlans `1`、reports `1`、aiUsageThisMonth `2`、membersNeedingCoaching `2`。
- Leak proof：DB demo clients/policies 產生 7 個 forbidden sentinels；overview response 未包含 client name/email/phone/occupation/notes/policy/product，且不含 `email`、`phone`、`annualIncome`、`notes`、`policies`、`familyMembers`、`clientSections`、`internalSections` detail field names。
- `/api/clients` manager session proof：200，但不洩漏其他 member seeded client details。

### 失敗與風險

- 本輪 proof 使用 dev auth header，不等同正式 Supabase/Auth.js login flow；正式 demo users `supabase_auth_id` 綁定仍未完成。
- `/api/org/overview` 是最小 aggregate API；`/api/org/members`、`/api/org/coaching`、`/api/org/ai-usage`、org settings 與 `/team` UI 串接仍待 `LCH-007`。
- Manager 目前若沒有 scoped unit，policy 允許看全 org aggregate；符合現有 policy，但正式企業級 scope 仍需 operator 確認 seed/role 配置。

### 剩餘上線 blocker

- `LCH-005` 剩餘：Supabase Auth `supabase_auth_id`、demo client portal、mock API production-like guard proof。
- `LCH-006` client portal/share DB-backed token lookup 仍缺。
- `LCH-007` 剩餘：org members/coaching/ai usage/units/invites/settings API 與 UI proof。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-005`，補 `/api/mock/*` production-like guard proof，避免 production UI 仍能依賴 mock API。
2. 或進 `LCH-006`，做 DB-backed share token/client portal authorized content proof，解除 demo client blocker。

## 2026-06-19 Round 017 - LCH-005 Mock API Production-like Guard Proof

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-005` Demo Account Relogin QA - `/api/mock/*` production-like guard proof；同步解除 `LCH-009` production controls 的 mock route 關閉項目。
- 選擇原因：demo member/manager proof 已完成，下一個可由系統安全推進的 LCH-005 blocker 是確認 production-like runtime 不會把 mock API 當正式驗收或資料來源。

### 本輪完成

- 新增 `scripts/mock-production-guard-qa.mjs`。
- 新增 package script `pnpm mock:production-guard-qa`。
- QA script 實打五條 mock route：`/api/mock/ai/assistant`、`/api/mock/ai/spin-outline`、`/api/mock/ai/theater`、`/api/mock/ai/visit`、`/api/mock/track/demo-token`。
- 使用 `ALLOW_MOCK_API=false pnpm start` 啟動 production-like Next runtime。
- LCH-005 的「`/api/mock/*` 在 production-like env 預設不可用」已標記完成；LCH-009 的 production mock guard 項目同步標記完成。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：是，`pnpm build` 會執行 Prisma generate。
- 是否執行 db push：否。
- DB target 判斷：本輪不需要 DB mutation；未執行 seed/backfill/write。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm build
ALLOW_MOCK_API=false pnpm start
pnpm mock:production-guard-qa
```

結果：

- TypeScript：通過。
- Build：通過，mock routes 仍存在於 build route list，但 runtime guard 生效。
- Production-like guard proof：五條 `/api/mock/*` route 全部回 `404`，response body 包含 `mock_api_disabled`。
- `pnpm start` 以 Ctrl-C 停機，exit code `130` 是手動停機，不列為驗收失敗。

### 失敗與風險

- `/share/[token]` 目前仍有 client-side `/api/mock/track/[token]` fire-and-forget；production-like guard 會讓它 404 並被 catch。正式 share tracking 應由 `LCH-006` 的 `POST /api/share/[token]/events` 取代。
- 本輪只證明 mock routes 在 production-like runtime 預設不可用；尚未完成 client portal 或正式 Auth provider。

### 剩餘上線 blocker

- `LCH-005` 剩餘：Supabase Auth `supabase_auth_id` / 正式 Auth.js provider、demo client portal proof。
- `LCH-006` client portal/share DB-backed token lookup 與 tracking API 仍缺。
- `LCH-007` 剩餘：org members/coaching/ai usage/units/invites/settings API 與 UI proof。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 進 `LCH-006`，做 `GET /api/share/[token]` DB-backed token lookup 與 client-safe report sections，替換 `/share/[token]` 對本地 store/mock tracking 的依賴。
2. 或補 `POST /api/share/[token]/events`，讓 share tracking 從 `/api/mock/track` 正式轉到 DB-backed `ShareEvent`。

## 2026-06-19 Round 018 - LCH-006 DB-backed Share Token And Event Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-006` Front office / share / client portal - DB-backed share token lookup + share event tracking。
- 選擇原因：上一輪已確認 `/api/mock/*` production-like runtime 預設不可用；`/share/[token]` 仍需要正式 DB-backed token lookup 與 tracking event 替代 mock/local store flow。

### 本輪完成

- 新增 `src/lib/share/share-repository.ts`。
- 新增 `GET /api/share/[token]`，只回 client-safe report sections、share branding、portal scope 與 CTA。
- 新增 `POST /api/share/[token]/events`，寫 safe `ShareEvent`，IP 只存 hash，payload 只保留允許欄位。
- `/share/[token]` 改用 BFF fetch，不再使用 local report store token lookup，也不再呼叫 `/api/mock/track`。
- 新增 `scripts/share-token-qa.mjs` 與 package script `pnpm share:token-qa`。
- LCH-006 的 share token GET、share events POST、DB-backed share page 三項已標記完成。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：是，`pnpm build` 已執行 Prisma generate。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪 `share:token-qa` 對 demo share 寫入非破壞性 `ShareEvent` evidence。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
pnpm dev
pnpm share:token-qa
Browser smoke /share/demo-share-wang
pnpm run lint:changed
pnpm exec eslint 'src/app/(public)/share/[token]/page.tsx' 'src/app/api/share/[token]/route.ts' 'src/app/api/share/[token]/events/route.ts' src/lib/share/share-repository.ts scripts/share-token-qa.mjs
pnpm build
```

目前結果：

- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `GET /api/share/demo-share-wang`：200，回傳 matching token、client display name `王大明`、2 個 client sections、organization/unit branding。
- Client-safe proof：response 不含 `內部摘要`、`演練回饋`、`performance`、`internalSections`、`policy_number`、`insured_amount`、`annualIncome`、`phone`、`email`。
- `POST /api/share/demo-share-wang/events`：200。
- DB proof：`ReportShare.access_count 0→1`、`ShareEvent 0→1`、unsafe private payload key count `0`。
- Invalid token proof：`GET /api/share/not-a-real-share-token` 404。
- Browser smoke：`/share/demo-share-wang` 顯示 `王大明` 授權報告，console error 0，水平 overflow 0。
- `pnpm run lint:changed`：通過。
- 本輪新增/修改 share 檔案專項 ESLint：通過。
- `pnpm build`：通過，route list 包含 `/api/share/[token]` 與 `/api/share/[token]/events`。

### 失敗與風險

- 本輪尚未完成 client portal login/session；`/client-login` 仍是入口 skeleton。
- 尚未完成 expired token browser/API proof；目前 API repository 已在 expired share 回 404，但需要後續 seed/proof。
- `GET /api/public/pricing` 未做。

### 剩餘上線 blocker

- `LCH-005` 剩餘：正式 Auth.js provider / demo users `supabase_auth_id`、demo client portal proof。
- `LCH-006` 剩餘：public pricing、client portal bootstrap/responses、client session 不能進 member/org admin、完整 invalid/expired/authorized/client-login browser QA。
- `LCH-007` 剩餘：org members/coaching/ai usage/units/invites/settings API 與 UI proof。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-006`，補 `GET /api/client-portal/bootstrap` 與 client session/token contract 最小版。
2. 或補 `GET /api/public/pricing`，讓前台 pricing 也由 DB-backed plan capability/stable server config 驅動。

## 2026-06-19 Round 019 - LCH-006 Client Portal Bootstrap And Response Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-006` Front office / share / client portal - token-scoped client portal bootstrap + client response write。
- 選擇原因：Round 018 已完成 share token lookup/event tracking；剩餘最接近上線的缺口是 client portal session contract、authorized bootstrap 與客戶回覆能否寫入 DB。

### 本輪完成

- `getClientSession()` 改為從 `x-asai-client-token` header 或 `asai_client_share_token` cookie 驗證 DB `ReportShare`，不從 app membership 推導 client identity。
- 新增 `GET /api/client-portal/bootstrap`：只回 client session scope、client display name、授權報告 client-safe sections、share branding/portal/CTA。
- 新增 `POST /api/client-portal/responses`：支援 `SUPPLEMENT`、`QUESTION`、`BOOKING_INTENT`，寫入 `InteractionEvent(type=TASK)`，metadata 只保留 safe keys。
- 新增 `scripts/client-portal-qa.mjs` 與 package script `pnpm client-portal:qa`。
- `AGENTS.md` 與 `PLN-017` 已將 client portal bootstrap、responses、client session 不可進 member/org admin 三項標記完成。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：待本輪 `pnpm build` 驗收時執行。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪 `client-portal:qa` 對 demo client 寫入非破壞性 `InteractionEvent` evidence。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
pnpm dev
pnpm client-portal:qa
```

目前結果：

- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- Missing client session：`GET /api/client-portal/bootstrap` 401。
- Client token boundary：帶 `x-asai-client-token: demo-share-wang` 呼叫 `/api/workspace/bootstrap` 回 401，證明 client session 不會升級成 member/org admin。
- Authorized bootstrap：`GET /api/client-portal/bootstrap` 200，`session.type=client`，client display name `王大明`，report sections `2`。
- Client-safe proof：bootstrap response 不含 `internalSections`、`內部摘要`、`演練回饋`、`performance`、policy/private sentinels、member owner/actor sentinels。
- Client response：`POST /api/client-portal/responses` 201，invalid type 400。
- DB proof：client-portal `InteractionEvent` count `0→1`，unsafe private payload key count `0`.
- `pnpm run lint:changed`：通過。
- Targeted ESLint：`src/lib/auth/session.ts`、`src/app/api/client-portal/bootstrap/route.ts`、`src/app/api/client-portal/responses/route.ts`、`scripts/client-portal-qa.mjs` 通過。
- `pnpm build`：通過；Prisma Client generated，Next route list 包含 `/api/client-portal/bootstrap` 與 `/api/client-portal/responses`。
- Git：本輪 commit/push 完成後以 final 回報。

### 失敗與風險

- 目前 client portal session 是 token-scoped 最小 contract，尚未完成 `/client-login` UI 到 cookie handoff、email OTP/Auth.js client-user 長期登入。
- Expired token proof 尚未跑；repository/session 都會拒絕 expired share，但需要後續 seed/proof。
- `GET /api/public/pricing` 未做。

### 剩餘上線 blocker

- `LCH-006` 剩餘：public pricing、client login UI/cookie handoff、expired token proof、完整 invalid/expired/authorized/client-login browser QA。
- `LCH-007` 剩餘：org members/coaching/ai usage/units/invites/settings API 與 UI proof。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-006`，補 `/client-login` token handoff/cookie proof 或 expired token proof。
2. 或補 `GET /api/public/pricing`，讓前台 pricing 由 DB-backed plan capability/stable server config 驅動。

## 2026-06-19 Round 020 - LCH-006 Public Pricing API Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-006` Front office / share / client portal - DB-backed public pricing API。
- 選擇原因：LCH-006 剩餘 public pricing API 會影響前台一頁式介紹與方案購買入口；需要先能公開讀取方案能力，但不能誤啟用未完成的正式綠界付款。

### 本輪完成

- 新增 `src/lib/public/pricing-repository.ts`，由 DB `PlanConfig` 組成 public-safe pricing DTO，若 DB 無資料才 fallback 到 server stable defaults。
- 新增 `GET /api/public/pricing`。
- 新增 `scripts/public-pricing-qa.mjs` 與 package script `pnpm public:pricing-qa`。
- DTO 只輸出公開方案資料、能力上限、CTA、ECPay provider 狀態；不輸出 private billing/env 欄位。
- `billing.checkoutEnabled=false`，避免未完成 ECPay 正式收款被前台誤啟用。
- `AGENTS.md` 與 `PLN-017` 已將 `GET /api/public/pricing` 標記完成。

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：待本輪 `pnpm build` 驗收時執行。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪僅讀取 `plan_configs`，沒有 DB write。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
pnpm dev
pnpm public:pricing-qa
```

目前結果：

- TypeScript：第一次發現 DB select 型別缺 `impersonationAllowed`，已改為 public capability type；第二次通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `GET /api/public/pricing`：200。
- API proof：`source=database`，回傳 `FREE`、`STARTER`、`PRO`、`ENTERPRISE` 四個方案。
- DB proof：四個方案的 `maxMembers`、`maxCollaborators`、`maxUnits`、`monthlyAiQuota` 均與 DB `plan_configs` 一致。
- Billing safety proof：`billing.provider=ECPAY` 且 `checkoutEnabled=false`。
- Private field proof：response 不含 `stripeCustomerId`、`stripeSubscriptionId`、provider ids、`rawPayload`、DB/env secret sentinels。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：`src/lib/public/pricing-repository.ts`、`src/app/api/public/pricing/route.ts`、`scripts/public-pricing-qa.mjs` 通過。
- `pnpm build`：通過；Prisma Client generated，Next route list 包含 `/api/public/pricing`。
- Git：本輪 commit/push 完成後以 final 回報。

### 失敗與風險

- 本輪只建立 public pricing API，尚未把 `/pricing` UI 改成 runtime fetch。
- ECPay checkout 仍未完成；API 已刻意回 `checkoutEnabled=false`。

### 剩餘上線 blocker

- `LCH-006` 剩餘：client login UI/cookie handoff、expired token proof、完整 invalid/expired/authorized/client-login browser QA。
- `LCH-007` 剩餘：org members/coaching/ai usage/units/invites/settings API 與 UI proof。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-006`，補 `/client-login` token handoff/cookie proof，讓 demo client 可登入看到 authorized content。
2. 或補 expired token seed/proof 與 share/client portal browser QA，收斂 LCH-006 的 QA 欄位。

## 2026-06-19 Round 021 - LCH-006 Client Login Cookie Handoff Slice

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-006` Front office / share / client portal - client-login token handoff to httpOnly cookie session。
- 選擇原因：LCH-006 已有 share token lookup、client portal bootstrap/response 與 public pricing API；剩餘最直接阻擋 demo client 體驗的是 `/client-login` 還不能把 token 轉成可重用的 client session。

### 本輪完成

- 新增 `POST /api/client-portal/session`：驗證 share token 後寫入 httpOnly `asai_client_share_token` cookie，回傳最小 client/report/session DTO。
- 新增 `DELETE /api/client-portal/session`：清除 client portal cookie。
- 新增 `/client-login` client form，支援 `?token=demo-share-wang` 預填、送出後建立 cookie session。
- 擴充 `pnpm client-portal:qa`：覆蓋 session POST、Set-Cookie 屬性、cookie bootstrap、cookie 不可進 workspace bootstrap、invalid token 404。
- `AGENTS.md` 與 `PLN-017` 已補上本輪進行中註記；完整 desktop/mobile matrix 與 expired token proof 仍保留未完成。

### 修改檔案

- `src/app/api/client-portal/session/route.ts`
- `src/app/(client-auth)/client-login/page.tsx`
- `src/app/(client-auth)/client-login/_components/client-login-form.tsx`
- `scripts/client-portal-qa.mjs`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：待本輪 `pnpm build` 驗收時執行。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪 API proof 只新增一筆非破壞性 demo `InteractionEvent(type=TASK)` 作 response write proof，不做 schema mutation、不清資料。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
pnpm dev
pnpm client-portal:qa
Browser smoke /client-login?token=demo-share-wang
```

目前結果：

- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm client-portal:qa`：通過；missing bootstrap 401、header bootstrap 200、response 201、invalid response type 400。
- Cookie proof：`POST /api/client-portal/session` 200，`Set-Cookie` 含 HttpOnly 與 SameSite=Lax。
- Cookie authorization proof：使用 cookie 呼叫 `/api/client-portal/bootstrap` 200，scope 為 `c_wang`。
- Cross-surface guard proof：使用 client cookie 呼叫 `/api/workspace/bootstrap` 401。
- Invalid proof：invalid session token 404。
- DB write proof：`InteractionEvent` count `1->2`，unsafe payload count 0。
- Browser smoke：`/client-login?token=demo-share-wang` token 預填、主要 CTA 存在、console error 0、無水平 overflow。
- Dev-only note：以 `127.0.0.1` 開 dev server 時 Next HMR 顯示 `allowedDevOrigins` 提示；頁面與 API proof 不受影響。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：`src/app/api/client-portal/session/route.ts`、`src/app/(client-auth)/client-login/page.tsx`、`src/app/(client-auth)/client-login/_components/client-login-form.tsx`、`scripts/client-portal-qa.mjs` 通過。
- `pnpm build`：通過；Prisma Client generated，Next route list 包含 `/api/client-portal/session` 與 `/client-login`。

### 失敗與風險

- 本輪完成 token-to-cookie 最小 handoff，尚未做 email OTP/Auth.js client-user 長期登入。
- `/client-login` 成功後目前提供 bootstrap JSON 入口，尚未導到正式 client portal UI route。
- Expired token proof 尚未跑；repository/session 應拒絕 expired share，但仍需 seed/proof。
- 完整 desktop/mobile matrix 尚未完成，仍需 invalid、expired、authorized token、client login 一起跑。

### 剩餘上線 blocker

- `LCH-006` 剩餘：expired token proof、完整 invalid/expired/authorized/client-login desktop/mobile QA、正式 client portal page UX。
- `LCH-007` 剩餘：org members/coaching/ai usage/units/invites/settings API 與 UI proof。
- ECPay 正式 checkout notification/query proof 仍待後續；public pricing API 目前刻意 `checkoutEnabled=false`。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-006`，補 expired token seed/proof 與完整 share/client portal browser QA matrix。
2. 或進 `LCH-007`，開始 org admin aggregate/settings API，解除通訊處上線缺口。

## 2026-06-19 Round 022 - LCH-006 Expired Token And Browser QA Closure

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-006` Front office / share / client portal - expired token proof + desktop/mobile browser QA matrix。
- 選擇原因：LCH-006 剩餘唯一未完成欄位是 invalid/expired/authorized/client-login 的完整 QA；這會直接影響 front office 與 demo client 是否可被視為上線前最小閉環。

### 本輪完成

- 擴充 `scripts/share-token-qa.mjs`，在 QA 開始時 idempotent upsert `demo-share-wang-expired`。
- 擴充 share proof：expired share `GET /api/share/[token]` 404、`POST /api/share/[token]/events` 404，且 access count / ShareEvent 不增加。
- 擴充 `scripts/client-portal-qa.mjs`，同樣 idempotent upsert expired demo share。
- 擴充 client portal proof：expired token `POST /api/client-portal/session` 404、`GET /api/client-portal/bootstrap` 401、`GET /api/workspace/bootstrap` 401。
- Browser matrix 覆蓋 desktop 1440x1000 與 mobile 390x844：authorized share、invalid share、expired share、client login 全部 console error 0、無水平 overflow。
- `AGENTS.md` 與 `PLN-017` 已將 LCH-006 QA 與 lint checkbox 標記完成。

### 修改檔案

- `scripts/share-token-qa.mjs`
- `scripts/client-portal-qa.mjs`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：`pnpm build` 時執行。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：QA 以 `ON CONFLICT (demo_seed_key)` idempotent upsert `ReportShare(token=demo-share-wang-expired, is_demo=true, expires_at=now()-1 day)`；另因 client response proof 新增 1 筆非破壞性 demo `InteractionEvent(type=TASK)`。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
pnpm dev
pnpm share:token-qa
pnpm client-portal:qa
Browser matrix: desktop/mobile authorized + invalid + expired + client-login
pnpm run lint:changed
pnpm exec eslint scripts/share-token-qa.mjs scripts/client-portal-qa.mjs
pnpm build
```

結果：

- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm share:token-qa`：通過；valid share 200/event 200/private payload 0；invalid 404；expired GET 404/event POST 404；expired access/share events `0->0`。
- `pnpm client-portal:qa`：通過；missing session 401、authorized bootstrap 200、session cookie 200、client cookie workspace 401、invalid session 404、expired session 404、expired bootstrap 401、expired workspace 401、response write 201、unsafe payload 0。
- Browser matrix：desktop/mobile authorized share 顯示 `王大明 的決策建議報告`；invalid/expired share 顯示 `報告不存在或已過期`；client login token 預填 `demo-share-wang`；全部 console error 0、無水平 overflow。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：`scripts/share-token-qa.mjs`、`scripts/client-portal-qa.mjs` 通過。
- `pnpm build`：通過；Prisma Client generated。

### 失敗與風險

- Browser matrix 起初因 share 頁 async loading 停在 `載入安全報告...` 而誤判；改以短暫 settled wait 後通過。這是測試等待策略問題，不是產品錯誤。
- LCH-006 已完成 token/client-scoped 最小閉環，但正式 client-user email/OTP/Auth.js、專用 client portal UI route、ECPay checkout 仍屬後續上線等級。

### 剩餘上線 blocker

- `LCH-007`：org members/coaching/ai usage/units/invites/settings API 與 UI proof。
- `LCH-008`：super admin audit / impersonation / platform controls。
- ECPay 正式 checkout notification/query proof 仍待後續；public pricing API 目前刻意 `checkoutEnabled=false`。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 進 `LCH-007`，建立 `GET /api/org/members`、coaching summary、AI usage/unit/invite/settings API，保持 manager aggregate-only。
2. 或先做 `LCH-009` release QA 聚合，確認目前 Level 1 staging demo 的可展示路徑。

## 2026-06-19 Round 023 - LCH-007 Org Members Aggregate API

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-007` Org Admin Aggregate And Org Settings APIs - `GET /api/org/members`。
- 選擇原因：LCH-006 已完成 front office/client portal 最小閉環；下一個最低未完成上線阻擋是 org admin 成員管理 API，而且必須證明 manager 只能看 aggregate/member metadata，不看 member 客戶明細。

### 本輪完成

- 新增 `GET /api/org/members`。
- Route 使用 `requireOrgAdmin()` 與 `canReadOrgAggregate()`；OWNER/ADMIN 可看 org scope，MANAGER 若有 managed unit scope 則只看 scope 內 primary unit 成員。
- Response 只回 organization scope、units、members、totals。
- Member item 只含 membership id、user id、display name、avatar、user/member status、role、title、region、seat timestamps、primary/managed units 與 aggregate counts。
- 不回 user email、member private settings、client names、client phone/email、policy number/product、report body、SPIN/Theater transcript。
- 新增 `pnpm demo:org-members-qa`。
- `AGENTS.md` 與 `PLN-017` 已將 `GET /api/org/members` 標記完成；LCH-007 其他 API/UI 仍未完成。

### 修改檔案

- `src/app/api/org/members/route.ts`
- `scripts/demo-org-members-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：待本輪 `pnpm build` 驗收時執行。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：無。本輪只讀 demo org/member/client/report/policy sentinel 供 proof。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:org-members-qa
pnpm demo:manager-aggregate-qa
```

目前結果：

- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm demo:org-members-qa`：通過；demo manager `GET /api/org/members` 200、scope role `MANAGER`、members/units/totals 存在、member metadata/seat/aggregates 存在。
- Privacy proof：client/private forbidden field names 0；DB seeded client/policy/report sentinels 0。
- Regression proof：`pnpm demo:manager-aggregate-qa` 通過，既有 `/api/org/overview` aggregate-only 與 `/api/clients` manager ownership guard 未回歸。
- Guard note：第一次以普通 `pnpm dev` 跑 org QA 時得到 401；改以 `ALLOW_DEV_AUTH_HEADER=true pnpm dev` 後通過，符合 dev demo auth guard 設計。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：`src/app/api/org/members/route.ts`、`scripts/demo-org-members-qa.mjs` 通過。
- `pnpm build`：通過；Prisma Client generated，Next route list 包含 `/api/org/members`。

### 失敗與風險

- 本輪只完成 org members aggregate API，尚未做 `/team` UI 串接或 `/org/settings` surface。
- `member displayName` 屬成員 metadata；client/customer names 仍被 QA sentinel 禁止。

### 剩餘上線 blocker

- `LCH-007` 剩餘：`GET /api/org/coaching`、`GET /api/org/ai-usage`、`GET/POST /api/org/units`、`POST /api/org/invites`、org settings API/UI、browser QA。
- `LCH-008`：super admin audit / impersonation / platform controls。
- ECPay 正式 checkout notification/query proof 仍待後續。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-007`，補 `GET /api/org/coaching` 與 `GET /api/org/ai-usage`，延續 aggregate-only proof。
2. 或補 `GET/POST /api/org/units`，套 plan `maxUnits`，為 org settings surface 打底。

## 2026-06-19 Round 024 - LCH-007 Org Coaching And AI Usage Aggregate APIs

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-007` Org Admin Aggregate And Org Settings APIs - `GET /api/org/coaching`、`GET /api/org/ai-usage`。
- 選擇原因：上一輪已完成 org members aggregate API；下一個最低未完成上線缺口是 org manager 的 coaching/usage 彙總，且必須證明 manager 不會取得客戶明細、AI transcript、report body、requestId 或 error 原文。

### 本輪完成

- 新增 `GET /api/org/coaching`。
- 新增 `GET /api/org/ai-usage`。
- 新增 `pnpm demo:org-coaching-ai-usage-qa`。
- `AGENTS.md` 與 `PLN-017` 已將 `GET /api/org/coaching`、`GET /api/org/ai-usage` 標記完成。
- Route 皆使用 `requireOrgAdmin()` 與 `canReadOrgAggregate()`；MANAGER 若有 managed unit scope，會套用 unit scope。
- Coaching response 只回 completion rate、stuck stage aggregate、theater persona load、member coaching aggregate 與 recommendation focus。
- AI usage response 只回 current-month module/provider/member/unit aggregate requests、tokens、estimated cost、average latency 與 module error count；不回 `requestId` 或 `error` 原文。

### 修改檔案

- `src/app/api/org/coaching/route.ts`
- `src/app/api/org/ai-usage/route.ts`
- `scripts/demo-org-coaching-ai-usage-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：`pnpm build` 內執行 `prisma generate`，通過。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪只讀 DB proof，不寫 DB。
- DB 寫入摘要：無。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:org-coaching-ai-usage-qa
pnpm demo:org-members-qa
pnpm run lint:changed
pnpm exec eslint src/app/api/org/coaching/route.ts src/app/api/org/ai-usage/route.ts scripts/demo-org-coaching-ai-usage-qa.mjs
pnpm build
```

結果：

- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm demo:org-coaching-ai-usage-qa`：通過；demo manager 呼叫 `/api/org/coaching` 與 `/api/org/ai-usage` 皆 200，scope role `MANAGER`。
- Privacy proof：client/private forbidden field names 0；DB seeded client/policy/report/message/AI sentinels 0；`requestId` 與 `error` field name 未出現在 response。
- Regression proof：`pnpm demo:org-members-qa` 通過，上一輪 `/api/org/members` aggregate-only contract 未回歸。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：兩個新 route 與新 QA script 通過。
- `pnpm build`：通過；Prisma Client generated，Next route list 包含 `/api/org/coaching` 與 `/api/org/ai-usage`。

### 失敗與風險

- 無本輪驗收失敗。
- `LCH-007` 尚未完成 org units、invites、org settings API/UI 與 `/team` browser QA。
- AI usage current-month period 以 server runtime timezone 建立 Date；API response 使用 ISO，前端顯示時需以 org timezone 格式化。

### 剩餘上線 blocker

- `LCH-007` 剩餘：`GET/POST /api/org/units`、`POST /api/org/invites`、org settings API/UI、browser QA。
- `LCH-008`：super admin audit / impersonation / platform controls。
- ECPay 正式 checkout notification/query proof 仍待後續。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-007`，補 `GET/POST /api/org/units`，套 `PlanConfig.maxUnits`，為 org settings surface 打底。
2. 接著補 `POST /api/org/invites`，套 `PlanConfig.maxCollaborators` / seat limit，並保留 partial-success/operation log 設計入口。

## 2026-06-19 Round 025 - LCH-007 Org Units API And Plan Limit Guard

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-007` Org Admin Aggregate And Org Settings APIs - `GET/POST /api/org/units`。
- 選擇原因：LCH-007 的 org overview/members/coaching/AI usage 已完成；下一個最低未完成上線阻擋是 org unit tree 與 plan `maxUnits` server-side guard，這會支撐後續 org settings surface 與企業多層級管理。

### 本輪完成

- 新增 `GET /api/org/units`。
- 新增 `POST /api/org/units`。
- 新增 `pnpm demo:org-units-qa`。
- Route 使用 `requireOrgAdmin()` 與 `canReadOrgAggregate()`；MANAGER 可讀 scoped units，但不可寫。
- GET 回 organization、scope、planUsage、permissions、active units 與 unit aggregate counts。
- POST 僅 OWNER/ADMIN 可用，並驗證：input schema、parent hierarchy、single HQ rule、slug conflict、`PlanConfig.maxUnits`。
- `AGENTS.md` 與 `PLN-017` 已將 `GET/POST /api/org/units` 標記完成。

### 修改檔案

- `src/app/api/org/units/route.ts`
- `scripts/demo-org-units-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：`pnpm build` 內執行 `prisma generate`，通過。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：`pnpm demo:org-units-qa` idempotent upsert `demo.owner@asai.local` 與 OWNER membership 作為 demo/test proof account；未新增 organization unit。Owner POST 被 `MAX_UNITS_REACHED` 擋下，unit count 2→2。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:org-units-qa
pnpm demo:org-coaching-ai-usage-qa
pnpm demo:org-members-qa
pnpm run lint:changed
pnpm exec eslint src/app/api/org/units/route.ts scripts/demo-org-units-qa.mjs
pnpm build
```

結果：

- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm demo:org-units-qa`：通過；demo manager GET 200，scope role `MANAGER`；activeUnits=2、maxUnits=1 與 DB `PlanConfig` 一致；manager `POST` 403 `ORG_UNITS_WRITE_FORBIDDEN`；demo owner `POST` 403 `MAX_UNITS_REACHED`；unit count 2→2。
- Privacy proof：units response forbidden client/private field names 0；DB seeded client/policy/report sentinels 0。
- Regression proof：`pnpm demo:org-coaching-ai-usage-qa` 與 `pnpm demo:org-members-qa` 通過。因新增 demo owner QA account，member/coaching totals 從 3 變 4 屬預期；private sentinel proof 仍為 0 leak。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：units route 與 units QA script 通過。
- `pnpm build`：通過；Prisma Client generated，Next route list 包含 `/api/org/units`。

### 失敗與風險

- 無本輪驗收失敗。
- Demo org 目前 STARTER maxUnits=1、activeUnits=2；這代表 POST success path 仍待未來以 ENTERPRISE/staging org 或調整 PlanConfig 測試。當前 proof 已證明 server-side maxUnits guard 生效且不新增 unit。
- `POST /api/org/units` 已有 `reason` 欄位，但尚未寫 operation log；可在 LCH-008 audit 或 org settings admin action workstream 補上。

### 剩餘上線 blocker

- `LCH-007` 剩餘：`POST /api/org/invites`、org settings API/UI、browser QA。
- `LCH-008`：super admin audit / impersonation / platform controls。
- ECPay 正式 checkout notification/query proof 仍待後續。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-007`，補 `POST /api/org/invites`，套 `PlanConfig.maxCollaborators` / seat limit。
2. 或先補 `GET/PATCH /api/org/settings`，把 organization profile、branding、client portal、quota/compliance defaults 的權限邊界落地。

## 2026-06-19 Round 026 - LCH-007 Org Invites Plan Limit Guard

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-007` Org Admin Aggregate And Org Settings APIs - `POST /api/org/invites`。
- 選擇原因：org units 已完成；下一個最低未完成上線阻擋是邀請協作者/成員，且使用者先前決策是個人版可邀請協作者但上限由 super admin `PlanConfig.maxCollaborators` 控制。

### 本輪完成

- 新增 `POST /api/org/invites`。
- 新增 `pnpm demo:org-invites-qa`。
- Route 使用 `requireOrgAdmin()`；只有 OWNER/ADMIN 可寫，MANAGER 只能被 403 擋下。
- Invite input 必填 `reason` 與 `riskAccepted=true`。
- 新邀請會建立或重送 pending `OrganizationMember(status=INVITED)`；不寄真 email，response 只回 masked email。
- Server-side 套 `PlanConfig.maxCollaborators` / `maxMembers`；pending invite 也計入 seat usage，避免超邀。
- Invite 寫 `AuditLog(resourceType=ORG_INVITE)`，metadata 只含 email hash、masked email、role、unit、limit decision，不存 raw payload。
- `AGENTS.md` 與 `PLN-017` 已將 `POST /api/org/invites` 標記完成。

### 修改檔案

- `src/app/api/org/invites/route.ts`
- `scripts/demo-org-invites-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：`pnpm build` 內執行 `prisma generate`，通過。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：`pnpm demo:org-invites-qa` 寫入/重送 demo pending invite `demo.invited-collab@asai.local`、`OrganizationMember(status=INVITED, role=COLLABORATOR)` 與 invite `AuditLog`。第二個 overflow collaborator 被 `MAX_COLLABORATORS_REACHED` 擋下，membership count 不增加。沒有真實 email send。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:org-invites-qa
pnpm demo:org-units-qa
pnpm demo:org-members-qa
pnpm run lint:changed
pnpm exec eslint src/app/api/org/invites/route.ts scripts/demo-org-invites-qa.mjs
pnpm build
```

結果：

- TypeScript：初次發現 Prisma JSON metadata type error，已將 `PlanLimitDecision` 攤平成純 JSON 後通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm demo:org-invites-qa`：通過；demo manager POST 403 `ORG_INVITES_WRITE_FORBIDDEN`；demo owner collaborator invite 201；invite status `INVITED`；delivery `not_sent`；response 不含 raw invited email；AuditLog count > 0；collaborator usage 1→2/2；overflow invite 403 `MAX_COLLABORATORS_REACHED`；membership count 5→5。
- Regression proof：`pnpm demo:org-units-qa` 與 `pnpm demo:org-members-qa` 通過。因新增 pending invite，member totals 從 4 變 5 屬預期；private sentinel proof 仍為 0 leak。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：invite route 與 invite QA script 通過。
- `pnpm build`：通過；Prisma Client generated，Next route list 包含 `/api/org/invites`。

### 失敗與風險

- 無未修復驗收失敗。
- Invite 目前只建立 pending membership 與 audit，不寄真 email；正式 email provider / tokenized invite acceptance 仍屬後續。
- AuditLog action 暫用 `SUPPORT_NOTE`，resourceType 區分為 `ORG_INVITE`；若後續新增專用 AuditAction，需要 migration/enum 更新。

### 剩餘上線 blocker

- `LCH-007` 剩餘：org settings API/UI、browser QA。
- `LCH-008`：super admin audit / impersonation / platform controls。
- ECPay 正式 checkout notification/query proof 仍待後續。
- Route B 新版 Theater 仍待後續。

### 下一輪建議

1. 繼續 `LCH-007`，補 `GET/PATCH /api/org/settings`，把 organization profile、branding、client portal、quota/compliance defaults 的權限邊界落地。
2. 接著做 `/team/settings` 或 `/org/settings` UI surface + browser QA，收掉 LCH-007 剩餘項。

## 2026-06-19 Round 027 - LCH-007 Org Settings API And Surface

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-007` Org Admin Aggregate And Org Settings APIs - org settings API/UI/browser QA。
- 選擇原因：`POST /api/org/invites` 已完成；LCH-007 剩餘最低未完成項是 org-wide settings surface 與 `GET/PATCH /api/org/settings`，會直接影響 org admin 是否能獨立管理通訊處品牌、client portal、合規預設與 AI 用量提醒。

### 本輪完成

- 新增 `src/lib/org-settings/org-settings-repository.ts`。
- 新增 `GET/PATCH /api/org/settings`。
- 新增 `/team/settings` surface。
- Sidebar 新增「通訊處設定」入口，並修正 `/team/settings` 不會同時讓 `/team` active。
- 新增 `pnpm demo:org-settings-qa`。
- 新增 `pnpm demo:org-settings-browser-qa`，保存 desktop/mobile screenshots。
- `AGENTS.md` 與 `PLN-017` 已將 LCH-007 settings/API/browser/lint checkbox 標記完成；`PLN-017` LCH-007 table 狀態改為 `[x]`。

### 修改檔案

- `src/lib/org-settings/org-settings-repository.ts`
- `src/app/api/org/settings/route.ts`
- `src/app/(dashboard)/team/settings/page.tsx`
- `src/app/(dashboard)/team/settings/settings-client.tsx`
- `src/components/layout/sidebar.tsx`
- `scripts/demo-org-settings-qa.mjs`
- `scripts/demo-org-settings-browser-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`
- `docs/06_audits-and-reports/screenshots/launch-readiness/lch-007/org-settings-desktop.png`
- `docs/06_audits-and-reports/screenshots/launch-readiness/lch-007/org-settings-mobile.png`

### DB / Prisma 操作

- 是否修改 schema：否，沿用 `Organization.settings Json?`、`logoUrl`、`brandColor`、`monthlyAiQuota/monthlyAiUsed`。
- 是否執行 generate：`pnpm build` 內執行 `prisma generate`，通過。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：`pnpm demo:org-settings-qa` 以 demo owner `PATCH /api/org/settings` 寫入 organization settings safe patch，並新增 `AuditLog(resourceType=ORG_SETTINGS)`；manager `PATCH` 被 403 擋下。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:org-settings-qa
pnpm demo:org-settings-browser-qa
pnpm run lint:changed
pnpm exec eslint src/app/api/org/settings/route.ts 'src/app/(dashboard)/team/settings/page.tsx' 'src/app/(dashboard)/team/settings/settings-client.tsx' src/lib/org-settings/org-settings-repository.ts scripts/demo-org-settings-qa.mjs scripts/demo-org-settings-browser-qa.mjs src/components/layout/sidebar.tsx
pnpm build
```

結果：

- TypeScript：初次發現 `PaymentProvider` 型別過窄，已改引用 generated enum 後通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm demo:org-settings-qa`：通過；demo manager GET 200 且 `canWrite=false`；manager PATCH 403 `ORG_SETTINGS_WRITE_FORBIDDEN`；demo owner PATCH 200 且 `canWrite=true`；`AuditLog` 0→1；private/client forbidden field names 0；DB seeded client/policy/report sentinels 0。
- `pnpm demo:org-settings-browser-qa`：通過；desktop 1440×1000 / mobile 390×844 皆顯示 org settings title、privacy badge、client portal section、manager read-only notice；manager save button disabled；console error 0；無水平 overflow。截圖已保存。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：org settings route/page/repository/QA scripts/sidebar 通過。
- `pnpm build`：通過；Prisma Client generated，Next route list 包含 `/api/org/settings` 與 `/team/settings`。

### 失敗與風險

- 無未修復驗收失敗。
- `/team/settings` 目前以 manager read-only browser QA 覆蓋，owner write flow 以 API proof 覆蓋；若要測完整 owner UI edit，需要可登入 owner 的 browser/session proof。
- Org settings PATCH 目前使用 `AuditLog.action=SUPPORT_NOTE` + `resourceType=ORG_SETTINGS`；若後續需要專用 enum action，要在 LCH-008/production migration 中新增。
- In-app Browser 無法替初始 server-render request 加 demo auth header；本輪以 repo 既有 Playwright Edge + `x-asai-demo-user-email` header 的 headless browser QA 補足。

### 剩餘上線 blocker

- `LCH-008`：super admin audit / impersonation / platform controls。
- `LCH-009`：production controls、AI usage audit、backup/rollback、privacy/terms/disclaimer、ECPay test checklist、full smoke。
- `LCH-004`：Theater Route B 與三 AI error-path / quota UI proof 仍未收完。
- `LCH-005`：Supabase Auth 正式 demo user mapping / client portal login proof 仍待後續。

### 下一輪建議

1. 進入 `LCH-008`，先做 platform organizations summary API 與 platform audit query API，延續本輪 AuditLog groundwork。
2. 或回補 `LCH-004` Theater/AI usage log audit，降低「至少三個 AI 能正常運作」的核心上線風險。

## 2026-06-19 Round 028 - LCH-008 Platform Read-only Summary APIs

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-008` Super Admin / Audit / Impersonation - platform guard、tenant summary、AI usage aggregate、audit log query。
- 選擇原因：LCH-007 已完成 org admin settings；下一個最低未完成上線阻擋是 super admin 能否在不碰敏感明細的情況下檢視跨租戶營運健康、AI 成本與 audit evidence。

### 本輪完成

- 新增 `src/lib/platform/platform-read-repository.ts`，集中處理 platform-only read DTO 與 private-field redaction policy。
- 新增 `GET /api/platform/organizations`，回 tenant summary、health、usage 與 platform totals。
- 新增 `GET /api/platform/organizations/[id]`，回單一 tenant health、unit summary、plan config safe fields、30-day audit summary 與 current-month AI module aggregate。
- 新增 `GET /api/platform/ai-usage`，回跨租戶 current-month cost/token/request/error aggregate；不回 requestId 或 error 原文。
- 新增 `GET /api/platform/audit-logs`，支援 `organizationId/action/sensitivity` filter；只回 actor/target display name、status、resource metadata keys，不回 raw metadata。
- 新增 `pnpm demo:platform-read-qa`，idempotent 建立 `demo.platform@asai.local` platform user 並驗證 app session 403、platform session 200、private sentinel 0 leak。
- `AGENTS.md` 與 `PLN-017` 已標記 LCH-008 已完成的 read-only 項目。

### 修改檔案

- `src/lib/platform/platform-read-repository.ts`
- `src/app/api/platform/organizations/route.ts`
- `src/app/api/platform/organizations/[id]/route.ts`
- `src/app/api/platform/ai-usage/route.ts`
- `src/app/api/platform/audit-logs/route.ts`
- `scripts/demo-platform-read-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres；本輪只有 idempotent demo QA upsert platform user 與 read-only API proof，無 schema mutation。
- DB 寫入摘要：`pnpm demo:platform-read-qa` upsert `demo.platform@asai.local`、其 demo membership anchor 與 `PlatformUser(role=SUPER_ADMIN)`，作為 platform session proof。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
pnpm run lint:changed
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:platform-read-qa
pnpm exec eslint src/lib/platform/platform-read-repository.ts src/app/api/platform/organizations/route.ts 'src/app/api/platform/organizations/[id]/route.ts' src/app/api/platform/ai-usage/route.ts src/app/api/platform/audit-logs/route.ts scripts/demo-platform-read-qa.mjs
```

結果：

- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm run lint:changed`：通過。
- Targeted ESLint：platform repository/routes/QA script 通過。
- `pnpm demo:platform-read-qa`：通過；regular app session `GET /api/platform/organizations` 回 `403 PLATFORM_REQUIRED`；platform user 對 organizations summary/detail、AI usage、audit logs 皆 200；forbidden private field names 0 leak；DB seeded client/policy/report/AI sentinels 0 leak。

### 失敗與風險

- 無未修復驗收失敗。
- 本輪尚未建立 plan config update、impersonation、break-glass 或 platform settings UI；因此 LCH-008 尚未完成。
- `demo.platform@asai.local` 目前使用 demo org membership 作為 Auth.js/dev-header app-session anchor，再由 `PlatformUser` 升級為 platform session；production 仍需正式 platform auth/MFA/staging access。

### 剩餘上線 blocker

- `LCH-008` 剩餘：`PATCH /api/platform/plan-configs/[plan]` + AuditLog、impersonation start/end/revoke、impersonated read/write audit、break-glass API、platform settings surface。
- `LCH-009`：production controls、AI usage route audit、backup/rollback、privacy/terms/disclaimer、ECPay test checklist、full smoke。
- `LCH-004`：Theater Route B 與三 AI error-path / quota UI proof 仍未收完。

### 下一輪建議

1. 繼續 `LCH-008`，先做 `PATCH /api/platform/plan-configs/[plan]`，要求 reason/riskAccepted，寫 `AuditLog(action=PLAN_UPDATE)`，並補 QA script 驗證 FINANCE/SUPER_ADMIN 權限差異。
2. 接著做 impersonation start/end/revoke flow；這是 break-glass 之前的必要 audit 骨架。

## 2026-06-19 Round 029 - LCH-008 Platform Plan Config Update Audit

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-008` Super Admin / Audit / Impersonation - plan config update API + audit proof。
- 選擇原因：上一輪已完成 platform read-only summary；下一個最低未完成高風險 admin action 是 super admin 修改 plan limits。這會直接影響個人協作者上限、unit 上限、AI quota、client portal/branding 能力，因此必須具備高強度 reason/risk acceptance 與 AuditLog。

### 本輪完成

- 新增 `PATCH /api/platform/plan-configs/[plan]`。
- `PATCH` 僅允許 `SUPER_ADMIN`；`FINANCE` / `SUPPORT` 不可寫。
- Request body 必填 `reason` 與 `riskAccepted: true`，且至少要提供一個可更新欄位。
- 支援更新 safe plan fields：display name、max members/collaborators/units、monthly AI quota、share branding、client portal、impersonation allowed、active state。
- 寫入 `AuditLog(action=PLAN_UPDATE,sensitivity=HIGH,resourceType=PLAN_CONFIG)`，metadata 只保存 safe before/after diff、changedFields、actorRole、riskAccepted。
- 新增 `pnpm demo:platform-plan-config-qa`：FINANCE 403、SUPER_ADMIN 缺 reason 400、SUPER_ADMIN 更新 STARTER quota、DB 驗證、還原原值、確認兩筆 PLAN_UPDATE audit、audit query 只回 metadataKeys。
- `AGENTS.md` 與 `PLN-017` 已標記 LCH-008 plan config update 完成。

### 修改檔案

- `src/lib/platform/platform-read-repository.ts`
- `src/app/api/platform/plan-configs/[plan]/route.ts`
- `scripts/demo-platform-plan-config-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：`pnpm build` 內執行 `prisma generate`，通過。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：`pnpm demo:platform-plan-config-qa` upsert demo platform users；暫時將 STARTER `monthly_ai_quota` 從 200 改為 201，再透過同 API 還原為 200；新增兩筆 `PLAN_UPDATE` audit 作 evidence。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint src/lib/platform/platform-read-repository.ts 'src/app/api/platform/plan-configs/[plan]/route.ts' scripts/demo-platform-plan-config-qa.mjs
pnpm demo:preflight
pnpm run lint:changed
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:platform-plan-config-qa
pnpm build
```

結果：

- TypeScript：初次發現 AuditLog metadata JSON type 太寬，已收斂為 Prisma JSON-safe diff 後通過。
- Targeted ESLint：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm run lint:changed`：通過。
- `pnpm demo:platform-plan-config-qa`：通過；FINANCE PATCH 403；SUPER_ADMIN missing reason 400；SUPER_ADMIN update 200；DB row `monthly_ai_quota=201`；restore 200 且 DB row 回 `200`；audit count `0→1→2`；`GET /api/platform/audit-logs?action=PLAN_UPDATE&sensitivity=HIGH` 200 且 response 使用 `metadataKeys` 不回 raw metadata。
- `pnpm build`：通過；Next route list 包含 `/api/platform/plan-configs/[plan]`。

### 失敗與風險

- 無未修復驗收失敗。
- 本輪只做 API proof，尚未建立 platform settings UI；operator 仍需正式 platform auth/MFA。
- Plan config QA 會留下 PLAN_UPDATE audit evidence，這是預期稽核軌跡；方案數值已還原。

### 剩餘上線 blocker

- `LCH-008` 剩餘：impersonation start/end/revoke、impersonated read/write audit、break-glass API、platform settings surface。
- `LCH-009`：production controls、AI usage route audit、backup/rollback、privacy/terms/disclaimer、ECPay test checklist、full smoke。
- `LCH-004`：Theater Route B 與三 AI error-path / quota UI proof 仍未收完。

### 下一輪建議

1. 繼續 `LCH-008`，建立 `POST /api/platform/impersonation` start flow，要求 target org/user、reason、scope、expiresAt，寫 `IMPERSONATION_START` audit。
2. 同輪若可控，補 end/revoke route 與 QA，讓 break-glass 前的 audit session 骨架成形。

## 2026-06-19 Round 030 - LCH-008 Platform Impersonation Start End Revoke

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-008` Super Admin / Audit / Impersonation - impersonation start/end/revoke API 與 BREAK_GLASS audit proof。
- 選擇原因：plan config update 已具備 audit；下一個高風險上線缺口是 super admin/support 的 impersonation 必須被限時、限 scope、可結束/撤銷且全程 audit，否則會形成無痕後門。

### 本輪完成

- 新增 `src/lib/platform/platform-impersonation-repository.ts`。
- 新增 `POST /api/platform/impersonation`：必填 `targetOrgId`、`reason`、`scope`、`expiresAt`；`targetUserId` 可選但若提供必須是該 org active member。
- 新增 `PATCH /api/platform/impersonation/[id]`：支援 `END` 與 `REVOKE`，必填 reason，只允許 active session。
- 沿用既有 platform domain policy：`FINANCE` 不可 impersonate，expiry 上限 60 分鐘。
- Start 寫 `AuditLog(action=IMPERSONATION_START,sensitivity=BREAK_GLASS)`；end/revoke 寫 `AuditLog(action=IMPERSONATION_END,sensitivity=BREAK_GLASS)`。
- 新增 `pnpm demo:platform-impersonation-qa`，驗證 FINANCE 403、missing reason 400、expiry too long 403、SUPER_ADMIN start/end/revoke、DB status 與 audit counts。
- `AGENTS.md` 與 `PLN-017` 已將 impersonation start/end/revoke 標記完成；impersonated read/write audit 另拆成未完成項。

### 修改檔案

- `src/lib/platform/platform-impersonation-repository.ts`
- `src/app/api/platform/impersonation/route.ts`
- `src/app/api/platform/impersonation/[id]/route.ts`
- `scripts/demo-platform-impersonation-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：`pnpm build` 內執行 `prisma generate`，通過。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：`pnpm demo:platform-impersonation-qa` 建立兩筆 demo impersonation sessions：一筆 ACTIVE→ENDED、一筆 ACTIVE→REVOKED；並寫入 `IMPERSONATION_START` / `IMPERSONATION_END` BREAK_GLASS audit evidence。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint src/lib/platform/platform-impersonation-repository.ts src/app/api/platform/impersonation/route.ts 'src/app/api/platform/impersonation/[id]/route.ts' scripts/demo-platform-impersonation-qa.mjs
pnpm demo:preflight
pnpm run lint:changed
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:platform-impersonation-qa
pnpm build
pnpm build
```

結果：

- TypeScript：通過。
- Targeted ESLint：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm run lint:changed`：通過。
- `pnpm demo:platform-impersonation-qa`：通過；FINANCE start 403；missing reason 400；expiry > 60 分鐘 403；SUPER_ADMIN start 201 且 DB ACTIVE；end 200 且 DB ENDED；second start 201；revoke 200 且 DB REVOKED；audit count `START 0→1`、`END 0→1→2`；audit query filter `BREAK_GLASS` 200 且只回 `metadataKeys`。
- `pnpm build`：通過；Next route list 包含 `/api/platform/impersonation` 與 `/api/platform/impersonation/[id]`。

### 失敗與風險

- 無未修復驗收失敗。
- QA 過程 dev server 顯示 `pg@9` deprecation warning：`Calling client.query() when the client is already executing a query is deprecated`。QA 仍通過，非本輪阻擋；若升級 pg 或大量並行 QA，可把 seed helper 改成單一排程或獨立 connection。
- 尚未把 impersonation session 接到實際 read/write route context，因此「impersonated read/write 寫 AuditLog 並帶 impersonationSessionId」仍未完成。

### 剩餘上線 blocker

- `LCH-008` 剩餘：impersonated read/write audit、break-glass API、platform settings surface。
- `LCH-009`：production controls、AI usage route audit、backup/rollback、privacy/terms/disclaimer、ECPay test checklist、full smoke。
- `LCH-004`：Theater Route B 與三 AI error-path / quota UI proof 仍未收完。

### 下一輪建議

1. 繼續 `LCH-008`，先做 impersonated read/write audit context：以 header 或 server-side context 接收 active impersonation session，對 platform-safe read route 產生 `IMPERSONATED_READ` audit，避免直接進敏感 read。
2. 接著做 `POST /api/platform/break-glass`，把 sensitive scope、reason、expiry 與 audit 串到同一套 session guard。

## 2026-06-19 Round 031 - LCH-008 Impersonated Read Write Audit Proof

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-008` Super Admin / Audit / Impersonation - impersonated read/write audit context 與 proof。
- 選擇原因：start/end/revoke 已建立 session 骨架；下一個最接近上線阻擋的是防止 platform impersonation 變成無痕讀寫。必須先證明 read/write 都會驗證 active session 並寫 `AuditLog.impersonationSessionId`，再進 break-glass。

### 本輪完成

- 在 `src/lib/platform/platform-impersonation-repository.ts` 新增 active impersonation resolver：驗證原 actor、session ACTIVE、未過期、required scope 符合。
- 新增 `POST /api/platform/impersonation/[id]/read-proof`：只回 tenant summary/health proof，寫 `AuditLog(action=IMPERSONATED_READ,sensitivity=BREAK_GLASS)` 並帶 `impersonationSessionId`。
- 新增 `POST /api/platform/impersonation/[id]/support-note`：只寫 audit metadata，明確回 `persistedBusinessData=false`，不修改租戶業務資料；寫 `AuditLog(action=IMPERSONATED_WRITE,sensitivity=BREAK_GLASS)` 並帶 `impersonationSessionId`。
- 擴充 `pnpm demo:platform-impersonation-qa`：同一支 QA 驗證 FINANCE 禁止、missing reason、expiry limit、start/read/write/end/revoke、scope mismatch、audit query metadataKeys。
- `AGENTS.md` 與 `PLN-017` 已將 impersonated read/write audit 勾選完成；LCH-008 剩 break-glass 與 platform settings。

### 修改檔案

- `src/lib/platform/platform-impersonation-repository.ts`
- `src/app/api/platform/impersonation/[id]/read-proof/route.ts`
- `src/app/api/platform/impersonation/[id]/support-note/route.ts`
- `scripts/demo-platform-impersonation-qa.mjs`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：否；本輪未改 Prisma schema。`pnpm build` 會再次執行 generate 作 build proof。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：`pnpm demo:platform-impersonation-qa` 新增 demo impersonation sessions 與 BREAK_GLASS audit evidence；首次 proof 為 `IMPERSONATED_READ 0→1`、`IMPERSONATED_WRITE 0→1`，修正後重跑為 `IMPERSONATED_READ 1→2`、`IMPERSONATED_WRITE 1→2`，另保留 start/end/revoke audit 軌跡。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint src/lib/platform/platform-impersonation-repository.ts 'src/app/api/platform/impersonation/[id]/read-proof/route.ts' 'src/app/api/platform/impersonation/[id]/support-note/route.ts' scripts/demo-platform-impersonation-qa.mjs
pnpm demo:preflight
pnpm run lint:changed
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:platform-impersonation-qa
```

結果：

- TypeScript：通過。
- Targeted ESLint：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm run lint:changed`：通過。
- `pnpm demo:platform-impersonation-qa`：通過；修正後重跑 read proof 200 且 `IMPERSONATED_READ 1→2`；support-note write proof 200、`persistedBusinessData=false` 且 `IMPERSONATED_WRITE 1→2`；scope mismatch read proof 403；audit query filter `BREAK_GLASS` 200 且只回 `metadataKeys`。
- `pnpm build`：通過；Next route list 包含 `/api/platform/impersonation/[id]/read-proof` 與 `/api/platform/impersonation/[id]/support-note`。

### 失敗與風險

- 無未修復驗收失敗。
- 本輪的 write proof 是 audit-only support note，不修改租戶業務資料；這是刻意的最小安全 proof。後續若要允許真實 impersonated tenant write，仍需逐 route 加 reason/scope/audit guard。
- Build proof 已通過；無未驗收的 route/typegen 風險。
- Dev server 仍在 `POST /api/platform/impersonation` start path 顯示既有 `pg@9` deprecation warning：`Calling client.query() when the client is already executing a query is deprecated`。本輪已把新增 read-proof transaction 查詢改為序列化；warning 未阻擋 QA，但後續可用 `node --trace-deprecation` 定位既有 start path 或 Prisma/pg interaction。

### 剩餘上線 blocker

- `LCH-008` 剩餘：break-glass API、platform settings surface。
- `LCH-009`：production controls、AI usage route audit、backup/rollback、privacy/terms/disclaimer、ECPay test checklist、full smoke。
- `LCH-004`：Theater Route B 與三 AI error-path / quota UI proof 仍未收完。

### 下一輪建議

1. 繼續 `LCH-008`，建立 `POST /api/platform/break-glass`：reason、scope、expiry、riskAccepted/audit required；只回最小 sensitive proof，不回 raw private payload。
2. 同輪補 `demo:platform-break-glass-qa`，驗證 missing reason/scope/expiry 拒絕、FINANCE 403、SUPER_ADMIN/SUPPORT 成功寫 BREAK_GLASS audit、expired/revoked session 不可用。

## 2026-06-19 Round 032 - LCH-008 Platform Break Glass API

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-008` Super Admin / Audit / Impersonation - break-glass API 與 counts-only sensitive proof。
- 選擇原因：impersonation read/write audit 已具備；下一個最接近上線阻擋的是敏感內容查詢必須有 reason、scope、expiry、risk acceptance 與 audit，避免 support/super admin 成為無痕敏感讀取入口。

### 本輪完成

- 新增 `src/lib/platform/platform-break-glass-repository.ts`。
- 新增 `POST /api/platform/break-glass`：必填 `targetOrgId`、`reason`、`scope`、`expiresAt`、`riskAccepted:true`；`targetUserId` 可選但若提供需屬於 target org active member。
- Break-glass 僅允許 `SUPER_ADMIN` / `SUPPORT`；`FINANCE` 回 403。
- Expiry 必須在未來且最多 30 分鐘。
- Scope 限定 `SENSITIVE_CLIENT_READ` / `SENSITIVE_REPORT_READ`；response 只回 counts-only proof，不回 email/phone/policy/report body/internal sections/transcript/raw metadata。
- 成功 path 寫 `AuditLog(action=BREAK_GLASS,sensitivity=BREAK_GLASS,resourceType=PLATFORM_BREAK_GLASS)`。
- 新增 `pnpm demo:platform-break-glass-qa`，驗證缺 reason、缺 `riskAccepted`、expiry too long、FINANCE forbidden、SUPPORT success、audit count、audit query。
- `AGENTS.md` 與 `PLN-017` 已將 break-glass API 勾選完成；LCH-008 剩 platform settings。

### 修改檔案

- `src/lib/platform/platform-break-glass-repository.ts`
- `src/app/api/platform/break-glass/route.ts`
- `scripts/demo-platform-break-glass-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：`pnpm build` 內執行 `prisma generate`，通過。
- 是否執行 db push：否。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres。
- DB 寫入摘要：`pnpm demo:platform-break-glass-qa` upsert demo support/finance/platform users，並新增一筆 `BREAK_GLASS` audit evidence；本輪 proof 為 `BREAK_GLASS 0→1`。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint src/lib/platform/platform-break-glass-repository.ts src/app/api/platform/break-glass/route.ts scripts/demo-platform-break-glass-qa.mjs
pnpm demo:preflight
pnpm run lint:changed
ALLOW_DEV_AUTH_HEADER=true pnpm dev
pnpm demo:platform-break-glass-qa
pnpm build
```

結果：

- TypeScript：初次發現 Prisma Client model 使用 `sensitivity/complianceChecklist.kycStatus`，已修正 counts-only query 後通過。
- Targeted ESLint：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm run lint:changed`：通過。
- `pnpm demo:platform-break-glass-qa`：通過；missing reason 400、missing riskAccepted 400、expiry too long 403、FINANCE 403、SUPPORT 201、response `rawPayloadReturned=false`、client/report proof counts-only、`BREAK_GLASS 0→1`、audit query 可查到同一 audit id。
- `pnpm build`：通過；Next route list 包含 `/api/platform/break-glass`。

### 失敗與風險

- 無未修復驗收失敗。
- Break-glass 目前是 counts-only sensitive proof，不回 raw private payload；若後續要開放特定 raw sensitive reads，必須逐 route 增加更細 resource selector、redaction policy、reason/scope/audit guard 與 operator approval。
- Platform auth/MFA 仍是正式上線 blocker；本輪只驗證 repo 內 platform guard 與 demo auth header。

### 剩餘上線 blocker

- `LCH-008` 剩餘：platform settings surface。
- `LCH-009`：production controls、AI usage route audit、backup/rollback、privacy/terms/disclaimer、ECPay test checklist、full smoke。
- `LCH-004`：Theater Route B 與三 AI error-path / quota UI proof 仍未收完。

### 下一輪建議

1. 完成 `LCH-008` 最後一塊：platform settings surface，至少提供 feature flags、provider policy、support policy 的 read/update API 或最小 super-admin UI，敏感改動寫 audit。
2. 若先做 API slice，建議新增 `GET/PATCH /api/platform/settings` 與 `demo:platform-settings-qa`，驗證 FINANCE read-only/forbidden update、SUPER_ADMIN update with reason/riskAccepted、audit query。

## 2026-06-19 Round 033 - LCH-008 Platform Settings Surface

### 本輪戰役

- Workstream：Launch Readiness Implementation。
- Batch / task：`LCH-008` Super Admin / Audit / Impersonation - platform settings surface。
- 選擇原因：break-glass 已具備 reason/scope/expiry/audit；LCH-008 最後一個上線缺口是 platform-level feature flags、provider policy、support policy 不能只存在文件，必須有 platform-only read/update API、reason/risk acceptance 與 audit proof。

### 本輪完成

- 擴充 `SystemSettings`：新增 `featureFlags`、`providerPolicy`、`supportPolicy` JSON 欄位。
- 新增 `src/lib/platform/platform-settings-repository.ts`：集中 default settings、Zod patch schema、read/write role policy、safe diff 與 audit write。
- 新增 `GET /api/platform/settings`：`SUPER_ADMIN` / `SUPPORT` / `FINANCE` 可讀，只回 settings DTO 與 scope。
- 新增 `PATCH /api/platform/settings`：僅 `SUPER_ADMIN` 可寫，必填 `reason` 與 `riskAccepted:true`，且至少一個 settings 欄位。
- Provider/support policy 明確禁止在此 API 啟用 production email/notification、raw sensitive payload、關閉 reason/risk acceptance 等危險狀態。
- 成功 PATCH 寫 `AuditLog(action=SUPPORT_NOTE,sensitivity=HIGH,resourceType=PLATFORM_SETTINGS,resourceId=default)`，metadata 只保存 changedFields 與安全 before/after snapshot。
- 新增 `pnpm demo:platform-settings-qa`，驗證 FINANCE read 200/write 403、SUPER_ADMIN 缺 reason 400、update/restore DB row 與 audit count、audit query 只回 metadataKeys。
- `AGENTS.md` 與 `PLN-017` 已將 LCH-008 platform settings 與 lint/Prisma 驗收勾選完成。

### 修改檔案

- `prisma/schema.prisma`
- `src/lib/platform/platform-settings-repository.ts`
- `src/app/api/platform/settings/route.ts`
- `scripts/demo-platform-settings-qa.mjs`
- `package.json`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`

### DB / Prisma 操作

- 是否修改 schema：是；`system_settings` 增加 nullable JSON 欄位 `feature_flags`、`provider_policy`、`support_policy`。
- 是否執行 generate：是；`pnpm prisma:generate` 通過，`pnpm build` 內也再次 generate 通過。
- 是否執行 db push：是；`pnpm exec prisma db push` 已同步到 Supabase Postgres，無 data-loss 提示。
- DB target 判斷：`pnpm demo:preflight` 通過，`.env` 指向遠端 Supabase Postgres `db.wwocdcicvpmbdmqvskzi.supabase.co`。
- Seed/backfill：未新增 destructive seed；`GET /api/platform/settings` 會 idempotent upsert `system_settings.id=default` 與安全預設 JSON。
- DB proof：`pnpm demo:platform-settings-qa` 以 API 暫改 `trialDays 14→15` 與 `featureFlags.clientPortalEnabled`，確認 DB `system_settings.trial_days=15`，再以同 API 還原 `15→14`。

### 驗收

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm exec prisma db push
pnpm exec eslint src/lib/platform/platform-settings-repository.ts src/app/api/platform/settings/route.ts scripts/demo-platform-settings-qa.mjs
pnpm exec tsc --noEmit --pretty false
pnpm demo:preflight
ALLOW_DEV_AUTH_HEADER=true pnpm dev
DEMO_QA_BASE_URL=http://localhost:3000 pnpm demo:platform-settings-qa
pnpm run lint:changed
pnpm build
```

結果：

- Prisma validate/generate/db push：通過；schema 已同步到 Supabase。
- Targeted ESLint：通過。
- TypeScript：通過。
- `pnpm demo:preflight`：通過；Supabase public env placeholder 仍為 warning。
- `pnpm demo:platform-settings-qa`：通過；FINANCE read 200、FINANCE PATCH 403、SUPER_ADMIN missing reason 400、SUPER_ADMIN update 200、DB row updated、`SUPPORT_NOTE/HIGH` audit `0→1`、restore 200、audit `1→2`、audit query filter 200 且只回 `metadataKeys`。
- `pnpm run lint:changed`：通過。
- `pnpm build`：通過；Next route list 包含 `/api/platform/settings`。

### 失敗與風險

- 初次 QA 打到舊的 localhost:3000 dev server，導致 route 不存在且 settings row 未建立；已重啟同 repo Next dev server 後重跑通過。
- `AuditAction` 目前沒有專屬 `PLATFORM_SETTINGS_UPDATE` enum；本輪使用既有 `SUPPORT_NOTE` + `sensitivity=HIGH` + `resourceType=PLATFORM_SETTINGS` 形成可查 audit。若後續需要更精細報表，可新增 enum migration。
- Platform auth/MFA 仍是 production blocker；本輪只驗證 repo 內 platform guard 與 demo auth header。

### 剩餘上線 blocker

- `LCH-008`：已完成。
- `LCH-009`：production controls、AI quota/cost alert、backup/rollback、privacy/terms/disclaimer、ECPay test checklist、full smoke。
- `LCH-004`：Theater Route B 與三 AI error-path / quota UI proof 仍未收完。

### 下一輪建議

1. 進入 `LCH-009`，先做 production controls/readiness API：AI quota/cost alert 或 blocker、production email/notification/payment disabled policy proof、release smoke checklist。
2. 若要先消技術債，可新增 `AuditAction.PLATFORM_SETTINGS_UPDATE` enum migration，但需同步 repository、QA 與 rollback note。

## 2026-06-19 Round 034 - AIS-005 Sidebar Decision Sync Baseline

### 本輪戰役

- Workstream：AI-first Sidebar Navigation。
- Batch / task：`AIS-005` Issue-question decision sync。
- 選擇原因：啟動檢查時工作區已有未提交的 sidebar IA 決策同步切片；若直接進 LCH-009 會混入不相關 UI/docs 變更。先把既有 AIS-005 驗收、補 proof/report 並 commit/push，清出乾淨基線。

### 本輪完成

- 同步 operator 對 AI-first sidebar 的決策：三個 AI 模組命名、sidebar 分組、AI 助手雙入口、`體驗版` 僅未登入/onboarding/public trial 顯示、headless Chrome 截圖備援。
- 已登入 sidebar 的 `團隊與系統` 移除 `體驗版`，保留 `團隊管理`、`通訊處設定`、`個人設定`。
- 保留 `問誠問 AI` 作為 `AI 工作台` 第一入口；底部/浮動 CTA 可作輔助入口。
- 新增 Next 16 / React 19 client runtime 技術債 issue，提醒後續獨立盤點 `useSearchParams`、Suspense、`useMounted` 與 React 19 lint 紅線。
- 補 AIS-005 desktop/mobile sidebar proof 截圖。

### 修改檔案

- `src/components/layout/sidebar.tsx`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-014_ai-first-sidebar-navigation-batch-tasks-v1.0.md`
- `docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`
- `docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`
- `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-005-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-005-mobile.png`

### DB / Prisma 操作

- 是否修改 schema：否。
- 是否執行 generate：`pnpm build` 內執行 Prisma generate，通過。
- 是否執行 db push：否。
- DB target 判斷：`.env` 仍含 `DATABASE_URL` / `DIRECT_URL`，本輪不做 DB mutation。
- Seed/backfill：無。

### 驗收

```bash
pnpm exec tsc --noEmit --pretty false
pnpm run lint:changed
pnpm prisma:validate
ALLOW_DEV_AUTH_HEADER=true pnpm dev
Headless Chrome sidebar proof for /dashboard desktop/mobile
pnpm build
```

結果：

- TypeScript：通過。
- `pnpm run lint:changed`：通過。
- `pnpm prisma:validate`：通過。
- Browser/in-app check：直接開 `/dashboard` 無 demo header 會 307 到 `/login`，符合 guard；登入態 proof 改用 headless Chrome + demo auth header。
- Headless proof：desktop/mobile 皆通過；`AI 工作台`、`問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練` 可見；已登入 sidebar 不顯示 `體驗版`；無水平 overflow；console error 0。
- `pnpm build`：通過。

### 失敗與風險

- 首次 mobile proof 未打開 drawer，因此 AI 工作台不可見；調整 proof 先開啟 mobile nav 後重跑通過。
- `/interview` 與 `/spin` 目前並存，且 sidebar 仍有 `AI 顧問陪談` 與 `SPIN 舊版` 兩個相近入口；已在 `RES-016` / `PLN-014` 記錄為後續 AI-first IA 研究與 batch，不在 AIS-005 直接合併。

### 剩餘上線 blocker

- `LCH-009`：production controls、AI quota/cost alert、backup/rollback、privacy/terms/disclaimer、ECPay test checklist、full smoke。
- `LCH-004`：Theater Route B 與 quota UI proof 仍未完全收尾。
- Platform auth/MFA、production monitoring、正式 ECPay credentials 仍需 operator/production approval。

### 下一輪建議

1. 回到 `LCH-009`，先做 production controls/readiness API 與 release blocker panel：AI quota/cost alert、production email/notification/payment disabled policy、backup/rollback/disclaimer/ECPay checklist。
2. 另開 AI-first IA cleanup batch，研究 `/interview` 與 legacy `/spin` 的主導覽關係，再決定是否移除 `SPIN 舊版` 主 sidebar 入口。
