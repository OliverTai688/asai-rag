# 誠問 AI Full-site BFF Architecture Research v1.0

> 建立日期：2026-06-19  
> 狀態：研究定稿，已轉為 `ARC-008` / `PLN-019` / `ACC-011` 可執行文件  
> 問題：若誠問 AI 要從目前的 partial vertical-slice BFF 推進到全站 BFF，參考 Netflix / BFF 架構精神，需要實作哪些項目？

---

## 1. 結論

誠問 AI 目前已經有 **partial BFF**：`/api/clients`、`/api/share/[token]`、`/api/client-portal/*`、`/api/org/*`、`/api/platform/*`、`/api/public/pricing` 等 route handler 已經在做 session scope、DTO shaping、aggregation、client-safe response 與前端 cache hydration。

但它還不是 full-site BFF。要往 Netflix-style / Backend-for-Frontend 方向完成，下一階段的目標不是「多開幾條 API」，而是建立一條全站一致的責任線：

```text
UI / Zustand cache
  -> Surface-specific BFF route handlers
  -> Use-case / repository layer
  -> Prisma / AI provider / payment / external service
```

Full-site BFF 的完成定義：

- 前端不直接依賴 mock/localStorage 作 business truth source。
- 每個 surface 都有自己的 server contract：member app、org admin、client portal、platform admin、public site。
- BFF 不信任前端傳入 `organizationId`、`ownerId`、`unitId`、`clientId` scope；scope 一律由 server session/token 推導。
- BFF 回傳 UI-ready DTO，不把 Prisma model、internal enum、private metadata、provider payload 原樣丟給 browser。
- AI、billing、share、client response、org aggregate、platform support 都經 server-side authorization、audit、quota、rate-limit 與 error contract。
- Zustand 保留為 UI state/cache，不再是正式資料來源。

---

## 2. 外部架構基準

### 2.1 Netflix BFF 重點

Netflix 在 Android app backend swap 的技術文章中明確描述其 BFF 方向：不是一個通用 backend API，而是依 client experience 建立對應 backend。  
來源：[Seamlessly Swapping the API backend of the Netflix Android app](https://netflixtechblog.com/seamlessly-swapping-the-api-backend-of-the-netflix-android-app-3d4317155187)

對誠問 AI 的轉譯：

- 不做一條萬用 `/api/data`。
- 不讓 `/api/clients` 同時服務 member detail、org manager aggregate、client portal、platform support。
- 每個 surface 回自己的 DTO，避免為了相容所有畫面讓 API 膨脹。

### 2.2 Sam Newman BFF pattern

Sam Newman 將 BFF 定義為「每個 user experience 一個 backend」，server-side component 位於 client 與 downstream service 之間，並由同一支 UI 團隊快速演進。  
來源：[Backends For Frontends - Sam Newman](https://samnewman.io/patterns/architectural/bff/)

對誠問 AI 的轉譯：

- `/dashboard`、`/crm`、`/pre-visit`、`/interview`、`/theater` 可共用 member-app BFF foundation，但不應與 client portal 混用。
- `/team/*` 屬 org-admin / manager aggregate BFF，預設不回 client detail。
- `/share/*`、`/client-login` 屬 client-portal BFF，只能看 token-scoped client-safe data。
- `/super-admin/*` 屬 platform BFF，預設 metadata/aggregate；敏感 detail 需 break-glass audit。

### 2.3 Azure / AWS BFF 參考

Azure Architecture Center 將 BFF 描述為「為每個 frontend interface 建立獨立 backend service」，用來避免單一 shared backend 成為瓶頸。  
來源：[Azure Backends for Frontends pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)

AWS 的 BFF 說明也強調 UI-ready projection、API aggregation 與 event/update pattern。  
來源：[AWS Backends for Frontends Pattern](https://aws.amazon.com/blogs/mobile/backends-for-frontends-pattern/)

對誠問 AI 的轉譯：

- BFF response 應該是「畫面能直接用」的 projection，不是 DB table dump。
- 若同一畫面需要 client、policy、report、quota、task，應由 BFF 聚合，不讓 browser 串多條低階 API 再自己拼。
- 但 BFF 不應承擔所有 domain rule；domain rule 放在 use-case/repository/policy helper，BFF 負責 protocol、session、contract、composition。

---

## 3. 目前狀態判斷

### 3.1 已有 BFF 的部分

| Surface | 已有跡象 | 評估 |
| --- | --- | --- |
| Member CRM | `GET/POST /api/clients`、`GET/PATCH /api/clients/[id]`、family/policy write routes | 已接近 BFF：session scope、server validation、DTO/cache hydration 已存在。 |
| Workspace bootstrap | `/api/workspace/bootstrap` | 已提供 app shell 所需 session/org/quota capability。 |
| Client portal/share | `/api/share/[token]`、`/api/client-portal/*` | 已有 token-scoped, client-safe contract。 |
| Org admin | `/api/org/overview`、members、units、invites、settings、coaching、AI usage | 已有 aggregate-oriented BFF，但部分 route 還需 repository 抽層與一致 error/audit。 |
| Platform admin | `/api/platform/*` | 已有 platform-scoped BFF 雛形，impersonation/break-glass/readiness 已形成營運 surface。 |
| Public pricing | `/api/public/pricing` | 已從 DB PlanConfig 產生 public-safe DTO。 |
| AI routes | `/api/ai/*`、`/api/rag` | 部分已納入 session/quota/AiUsageLog，但需要全線一致化。 |

### 3.2 尚未 full-site BFF 的缺口

| 缺口 | 風險 |
| --- | --- |
| 部分 frontend domain service 仍保留 local create/update/delete 或 mock fallback | 清 cache/換裝置後資料不一致；上線時難以證明 DB 是真相源。 |
| BFF route 命名與 surface ownership 尚未形成文件化規範 | 新功能容易開成 generic API，長期回到 shared backend 膨脹。 |
| Route handler 有些直接寫 Prisma 聚合 | BFF 變胖；權限、DTO、query scope 難複用與測試。 |
| Error response / validation / auth response 不完全一致 | 前端處理複雜，QA script 難做全站 contract audit。 |
| Org aggregate、member detail、client portal DTO 邊界仍需自動化 sentinel proof | 最大風險是跨租戶、跨角色、private field leakage。 |
| AI routes 尚未全部變成 member-scoped BFF contract | quota、AiUsageLog、prompt input policy、error logging 容易漏。 |
| Billing/ECPay 尚未有 production-grade BFF | 付款狀態若靠 redirect 會造成錯誤啟用或詐欺風險。 |
| Public pages 有些仍可直接依 static/mock content 顯示 production-like 資訊 | 正式方案、CTA、checkout/provider 狀態可能與 DB 不一致。 |

---

## 4. Target Architecture

### 4.1 Surface BFF 分層

```text
Public Web BFF
  /api/public/pricing
  /api/public/lead
  /api/public/status

Member App BFF
  /api/workspace/bootstrap
  /api/member/settings
  /api/member/dashboard
  /api/clients/*
  /api/visits/*
  /api/reports/*
  /api/ai/*

Org Admin BFF
  /api/org/overview
  /api/org/members
  /api/org/units
  /api/org/invites
  /api/org/settings
  /api/org/ai-usage
  /api/org/coaching

Client Portal BFF
  /api/share/[token]
  /api/share/[token]/events
  /api/client-portal/session
  /api/client-portal/bootstrap
  /api/client-portal/responses

Platform Admin BFF
  /api/platform/organizations
  /api/platform/organizations/[id]
  /api/platform/ai-usage
  /api/platform/audit-logs
  /api/platform/impersonation/*
  /api/platform/break-glass
  /api/platform/release-readiness
  /api/platform/settings
```

### 4.2 每條 BFF 的標準處理順序

```text
1. Parse request
2. Resolve session/token
3. Derive tenant/scope server-side
4. Validate input with schema
5. Check policy/capability/quota
6. Execute use-case/repository
7. Map to surface DTO
8. Write audit/usage/event if needed
9. Return consistent response or error
```

### 4.3 目錄建議

目前 repo 已有 `src/lib/<domain>/*-repository.ts`。短期可沿用，不必大搬家；但全站 BFF 化後建議建立更清楚的 convention：

```text
src/app/api/<surface-or-domain>/.../route.ts
src/lib/<domain>/<domain>-repository.ts
src/lib/<domain>/<domain>-dto.ts
src/lib/<domain>/<domain>-schemas.ts
src/lib/auth/current-workspace.ts
src/lib/auth/policies.ts
src/lib/api/errors.ts
src/lib/api/response.ts
src/lib/api/rate-limit.ts
src/lib/audit/audit-log.ts
```

規則：

- `route.ts` 不直接拼大型 Prisma response；大型 query/transaction 放 repository/use-case。
- DTO mapping 與 Prisma include/select 分離，避免 route handler 變成資料模型知識集中地。
- `src/domains/*/service.ts` 在 browser 端只 fetch BFF + hydrate store；正式 write 不再直接改 local store。
- mock route 只限 dev/test，不可作 production-like business source。

---

## 5. 需要實作的項目

### 5.1 BFF Contract Inventory

- 盤點所有 route/page/store/service 的資料來源。
- 標記每個畫面目前是 DB/BFF、server component query、mock API、Zustand local、static fixture、mixed mode。
- 產出全站 BFF responsibility matrix，欄位至少包含：surface、route/page、BFF endpoint、session type、DTO、read/write、audit、QA script。
- 新增 CI/QA script 檢查禁止 production page 直接 import `mocks.ts`、`seed-fixtures.ts` 或使用 localStorage 作 business truth source。

驗收：

- `docs/06_audits-and-reports/AUD-006_full-site-bff-data-source-inventory-v1.0.md`
- 每個 production route/page 都有 source classification。

### 5.2 Shared API Foundation

- 建立共用 error helpers：`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`VALIDATION_ERROR`、`RATE_LIMITED`、`AI_QUOTA_EXCEEDED`。
- 建立 request id / trace id helper。
- 建立 JSON response helper，統一 `{ data, error, meta }` 或現有 response style 的標準。
- 建立 Zod validation helper，避免每條 route 重寫 parse/error flatten。
- 建立 safe payload sanitizer，供 share event、client response、audit metadata 使用。
- 建立 route-level no-store/cache-control policy。

驗收：

- 新 route 使用 shared helpers。
- 既有高風險 routes 逐步改用，不一次重寫全 repo。

### 5.3 Member App BFF 完整化

優先順序：

1. `/api/member/dashboard`：dashboard 首屏 decision center 的 UI-ready DTO。
2. `/api/member/settings`：個人設定、notification preference、profile。
3. `/api/clients/*` 補齊 update/delete/archive、policy/family/timeline/report related list。
4. `/api/visits/*`：pre-visit list/detail/create/update/notes。
5. `/api/reports/*`：report list/detail/update/share action。
6. `/api/issues/*`：issue list/detail/status/action。

要求：

- 所有 member detail API 以 `requireCurrentMember()` 推導 org/user/unit scope。
- 不信任 browser 傳入 `organizationId`、`ownerId`、`unitId`。
- 回傳 DTO 必須保留合規欄位：`complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- Zustand write methods 改成 optimistic cache 或 BFF hydration，不再作正式資料來源。

### 5.4 Org Admin BFF 完整化

需要實作：

- `/api/org/overview` 抽 repository，保留 manager unit scope。
- `/api/org/members` 支援 invite/role/status/seat limit contract。
- `/api/org/units` 支援 unit tree、manager assignment、unit limits。
- `/api/org/settings` 支援 branding、policy、AI quota controls。
- `/api/org/coaching` 只回 aggregate/coaching signal，不回 client private detail。
- `/api/org/ai-usage` 回 cost/quota/member/module breakdown。

要求：

- Manager 預設只看 managed unit aggregate。
- Org admin 若要看 member client detail，應走 explicit member/client route policy，不重用 aggregate endpoint 偷渡 detail。
- 每個 org write 需要 audit event。

### 5.5 Client Portal BFF 完整化

需要實作：

- token/cookie session 已有，補 production-grade expiry/rotation/revocation。
- `/api/client-portal/bootstrap` 僅回 authorized report/client-safe sections。
- `/api/client-portal/responses` 支援補資料、提問、預約意向，payload whitelist。
- `/api/client-portal/files` 若未來支援附件，需 virus scan、size/type allowlist、signed URL。
- `/api/share/[token]/events` 僅寫 sanitized event，不保存 raw private payload。

要求：

- Client token 不能打 `/api/workspace/bootstrap`。
- Client portal response 不可寫入 member/admin-only metadata。
- Public share 不能暴露 internal score、advisor private note、AI raw prompt、provider payload。

### 5.6 Platform Admin BFF 完整化

需要實作：

- Platform session 與 app session 分離。
- `/api/platform/organizations` 預設 metadata/aggregate。
- `/api/platform/impersonation/*`、`/api/platform/break-glass` 必須有 reason、expiry、actor/target、read/write proof。
- `/api/platform/audit-logs` 支援查詢、filter、export readiness。
- `/api/platform/settings` 管理 global kill switch、AI provider posture、maintenance banner。
- `/api/platform/release-readiness` 聚合 production launch gates。

要求：

- Super admin 預設不能直接看敏感客戶內容。
- 每次 sensitive read 都要 audit。
- Break-glass session 必須短效、可撤銷、可回報。

### 5.7 AI BFF 一致化

需要實作：

- 所有 `/api/ai/*` route 都先 `requireCurrentMember()` 或明確 public/client token contract。
- 所有 OpenAI/Anthropic 呼叫都寫 `AiUsageLog`，包含 success/error。
- 所有 AI route 都檢查 plan capability、monthly quota、module availability。
- Prompt input 要做 size limit、PII/sensitive handling policy、allowed module schema。
- Response DTO 要分 `facts`、`inferences`、`unknowns`、`recommendations`，避免 AI 猜測看起來像事實。
- 建立 `pnpm ai-usage-route-audit` 的 full coverage gate。

硬規則：

- 不改 SPIN `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF` 狀態機。
- 不任意改 Theater legacy enum / scoring contract，除非進入已核可 ITA route。
- 不略過 `AiUsageLog`。

### 5.8 Billing / ECPay BFF

需要實作：

- `/api/billing/checkout` 由 server 產生 ECPay payload，不由 browser 拼 CheckMacValue。
- `/api/billing/ecpay/return` 只顯示 pending/received，不作唯一啟用依據。
- `/api/billing/ecpay/notify` 驗證 CheckMacValue、idempotency、寫 transaction ledger。
- `/api/billing/ecpay/query` server-to-server 查詢交易狀態。
- `/api/billing/subscription` 回 current plan/capability/quota/seat usage。
- `/api/org/billing` 給 owner/admin 管理 seats、invoice、payment status。

要求：

- 付款成功只信任 server notification/query confirmation。
- 所有金流事件寫 audit/ledger。
- 正式金流需要 operator credentials 與 callback domain，不得自行啟用 production。

### 5.9 Public Site BFF

需要實作：

- `/api/public/pricing` 已有，補 cache strategy 與 fallback policy。
- `/api/public/lead`：銷售表單/候補名單，需 rate-limit、spam protection、consent version。
- `/api/public/status`：顯示 maintenance/checkout availability/AI availability。
- Public CTA 不應直接根據 hardcoded front-end copy 判斷 checkout 是否可用。

要求：

- Public BFF 不回 private plan cost、provider secret、billing raw config。
- Landing/pricing 顯示的方案能力與 DB `PlanConfig` 一致。

### 5.10 Frontend Migration

需要實作：

- 每個 `src/domains/*/service.ts` 分成：
  - `fetch*Remote`
  - `create/update*Remote`
  - local cache selector
  - dev-only mock helper
- Production page 不直接 import `mocks.ts`。
- Hydration pattern 統一：loading、empty、error、unauthorized、forbidden、stale cache。
- 對 high-risk write 使用 server-confirmed update；optimistic UI 必須能 rollback。
- Browser QA 覆蓋 refresh/relogin/new browser context。

### 5.11 Observability / QA

需要實作：

- BFF route smoke scripts：401/403/404/400/200/201。
- Cross-role sentinel tests：member、manager、org admin、client token、platform user。
- Private field leakage tests：raw prompt、internal note、provider payload、secret/env、foreign org/client id。
- Usage/audit proof：AI、billing、share event、client response、org write、platform break-glass。
- Monitoring：route error rate、latency、AI provider failure、quota exceeded、payment notify failure。

---

## 6. 建議批次順序

### Phase 0 - Inventory and Rules

- `BFF-001` 全站資料來源盤點。
- `BFF-002` BFF naming / responsibility matrix。
- `BFF-003` shared API response/error/validation helpers。
- `BFF-004` production mock/localStorage guard script。

### Phase 1 - Member App Runtime

- `BFF-101` dashboard BFF。
- `BFF-102` member settings BFF。
- `BFF-103` CRM remaining writes/read subresources。
- `BFF-104` visit/pre-visit BFF。
- `BFF-105` report library/detail/share BFF。
- `BFF-106` issue BFF。

### Phase 2 - AI Contract Hardening

- `BFF-201` AI route session/quota/AiUsageLog audit gate。
- `BFF-202` visit/report AI routes hardened。
- `BFF-203` spin routes hardened without state-machine change。
- `BFF-204` theater routes hardened without legacy contract break。
- `BFF-205` assistant/rag/interview routes hardened。

### Phase 3 - Multi-surface Completion

- `BFF-301` org aggregate repository extraction and QA.
- `BFF-302` org write audit and unit/seat capability enforcement.
- `BFF-303` client portal session/revocation/response completion.
- `BFF-304` platform metadata/readiness/audit completion.
- `BFF-305` public lead/status/pricing consistency.

### Phase 4 - Billing and Launch Gates

- `BFF-401` ECPay checkout payload server generation.
- `BFF-402` ECPay notification/query/idempotency.
- `BFF-403` subscription capability activation.
- `BFF-404` release readiness BFF aggregates all gates.

---

## 7. Definition of Done

Full-site BFF 可以宣告完成時，至少要通過：

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint:changed`
- BFF inventory shows no production page uses mock/localStorage as business truth source.
- Every production surface has documented BFF endpoint ownership.
- Cross-role QA proves:
  - member cannot read foreign org/client.
  - manager sees aggregate only unless explicitly authorized.
  - client token cannot access workspace/member/org/platform APIs.
  - platform sensitive reads require audit/break-glass.
- AI route audit proves every provider call writes `AiUsageLog`.
- Billing proof proves checkout status is activated only by server notification/query confirmation.
- Browser QA proves refresh/relogin/new context persistence for key flows.

---

## 8. Open Questions

1. Full-site BFF 是否仍全部使用 Next.js route handlers，或未來要把 high-scale BFF 拆成獨立 service？
2. Member app 是否需要 GraphQL/tRPC 類型 contract，還是維持 REST + Zod DTO？
3. Org admin 是否允許 admin drill-down 到 member client detail？若允許，需要什麼顯示提示、audit 與 least privilege？
4. Client portal 正式登入是否採 email OTP/Auth.js client user，或先維持 share token session？
5. Public launch 第一版是否開放正式金流？若是，ECPay credentials/callback domain/production notification proof 需要 operator 明確授權。
6. 是否需要把 BFF contract 生成 OpenAPI spec，供 QA 與 future mobile client 使用？

---

## 9. 下一步建議

下一份文件建議直接產出：

- `ARC-008_full-site-bff-architecture-v1.0.md`：架構規則、目錄 convention、surface ownership、DTO/error/auth contract。
- `PLN-019_full-site-bff-batch-tasks-v1.0.md`：把本研究第 6 節拆成可勾選 batch cards。
- `ACC-011_full-site-bff-acceptance-framework-v1.0.md`：cross-role、private leakage、AI usage、billing、browser persistence 驗收框架。
