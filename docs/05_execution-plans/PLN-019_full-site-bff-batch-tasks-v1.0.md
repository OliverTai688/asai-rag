# 誠問 AI Full-site BFF Batch Tasks v1.0

> 建立日期：2026-06-19  
> 狀態：待執行  
> 研究依據：`docs/07_research-and-design/RES-018_full-site-bff-architecture-research-v1.0.md`  
> 架構依據：`docs/02_architecture-and-rules/ARC-008_full-site-bff-architecture-v1.0.md`  
> 驗收依據：`docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md`

本計畫把 full-site BFF 研究轉成可逐張執行的 batch tasks。目標是讓 production runtime 的資料真相源收斂到 server-side BFF，Zustand 只作 UI state/cache，並把 public/member/org/client/platform 五種 surface 的資料邊界固定下來。

---

## 0. Hard Rules

- 不信任前端傳入 `organizationId`、`ownerId`、`userId`、`unitId`、`clientId`、role、quota、plan capability。
- 不讓 org aggregate endpoint 回 client detail、report body、policy detail、transcript、private note、raw AI prompt。
- 不讓 client portal token 進 member/org/platform APIs。
- 不讓 public API 回 private plan cost、provider config、secret/env、internal billing state。
- 每次 OpenAI/Anthropic provider call 必須寫 `AiUsageLog` success/error。
- Client/policy 合規欄位不得刪除、不得改 optional。
- SPIN 狀態機不可破壞。
- Theater legacy enum/scoring contract 不在本 workstream 任意改型別；Route B migration 仍依 ITA workstream。
- `src/generated/` 永遠不要手改。

---

## 1. Progress Board

| 卡片 | 主題 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| BFF-000 | Architecture files and workstream registration | [x] | RES-018 |
| BFF-001 | Full-site data-source inventory and responsibility matrix | [ ] | BFF-000 |
| BFF-002 | Shared API foundation | [ ] | BFF-001 |
| BFF-101 | Member dashboard BFF | [ ] | BFF-002 |
| BFF-102 | Member settings BFF hardening | [ ] | BFF-002 |
| BFF-103 | CRM BFF completion | [ ] | BFF-002 |
| BFF-104 | Visit / pre-visit BFF | [ ] | BFF-002 |
| BFF-105 | Reports / share action BFF | [ ] | BFF-002 |
| BFF-106 | Issues BFF | [ ] | BFF-002 |
| BFF-201 | AI BFF audit gate | [ ] | BFF-002 |
| BFF-202 | Visit/report AI hardening | [ ] | BFF-201 |
| BFF-203 | SPIN AI hardening | [ ] | BFF-201 |
| BFF-204 | Theater AI hardening | [ ] | BFF-201 |
| BFF-205 | Assistant/RAG/interview hardening | [ ] | BFF-201 |
| BFF-301 | Org BFF repository extraction and aggregate QA | [ ] | BFF-002 |
| BFF-302 | Org writes audit and capability enforcement | [ ] | BFF-301 |
| BFF-303 | Client portal BFF completion | [ ] | BFF-002 |
| BFF-304 | Platform BFF completion | [ ] | BFF-002 |
| BFF-305 | Public BFF completion | [ ] | BFF-002 |
| BFF-401 | ECPay checkout BFF | [ ] | BFF-002 |
| BFF-402 | ECPay notification/query/idempotency | [ ] | BFF-401 |
| BFF-403 | Subscription capability BFF | [ ] | BFF-402 |
| BFF-404 | Release readiness BFF gate | [ ] | BFF-301、BFF-303、BFF-304、BFF-403 |

---

## Batch BFF-000 - Architecture Files And Workstream Registration

目標：把 `RES-018` 轉成 AGENTS.md 可執行 workstream 與配套文件。

- [x] 新增 `ARC-008_full-site-bff-architecture-v1.0.md`。
- [x] 新增 `PLN-019_full-site-bff-batch-tasks-v1.0.md`。
- [x] 新增 `ACC-011_full-site-bff-acceptance-framework-v1.0.md`。
- [x] 更新 `RES-018` 下一步引用，避免與 realtime `ARC-007/PLN-018/ACC-010` 撞號。
- [x] 更新 `AGENTS.md` 新 workstream，與本文件卡片狀態同步。
- [x] 更新 `MAN-000` 文件數量與 `MAN-001` 文件索引。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 full-site BFF 架構、批次與驗收文件；因 `ARC-007/PLN-018/ACC-010` 已由 realtime voice workstream 占用，本 workstream 使用 `ARC-008/PLN-019/ACC-011`。下一張最低未完成卡為 BFF-001。

---

## Batch BFF-001 - Full-site Data-source Inventory And Responsibility Matrix

目標：盤點全站 production runtime 資料來源，建立 BFF 責任矩陣與 mock/localStorage 禁用 baseline。

- [ ] 盤點所有 `src/app/**/page.tsx`、`src/components/**`、`src/domains/**/service.ts`、`src/domains/**/store.ts` 的 business data source。
- [ ] 標記每個 surface 是 DB/BFF、server component query、mock API、Zustand local、static fixture、mixed mode。
- [ ] 產出 `AUD-006_full-site-bff-data-source-inventory-v1.0.md`。
- [ ] 建立 responsibility matrix：surface、UI route、BFF endpoint、session type、DTO、read/write、audit、QA script。
- [ ] 新增或擴充 QA script，偵測 production page 直接 import `mocks.ts`、`seed-fixtures.ts` 或 browser storage business truth source。
- [ ] 不改業務邏輯；不重寫 BFF route。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-002 - Shared API Foundation

目標：建立新 BFF route 可重用的 response/error/validation/sanitize foundation，避免每條 route 自行拼 contract。

- [ ] 新增 `src/lib/api/errors.ts` 或等價 helper：auth、forbidden、not found、validation、rate limit、quota errors。
- [ ] 新增 `src/lib/api/response.ts` 或等價 helper：JSON response、request id、private data no-store headers。
- [ ] 新增 `src/lib/api/validation.ts` 或等價 helper：Zod parse + flattened issues。
- [ ] 新增 `src/lib/api/sanitize.ts` 或等價 helper：share event、client response、audit metadata whitelist。
- [ ] 先接 2-3 條低風險 route 作 proof，不一次重寫全站。
- [ ] Error contract 不應暴露 stack、env、secret、provider raw payload。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-101 - Member Dashboard BFF

目標：讓 `/dashboard` 首屏 decision center 由 single member-scoped BFF 提供 UI-ready DTO。

- [ ] 建立 `GET /api/member/dashboard`。
- [ ] DTO 包含今日主線、下一步 CTA、compact KPI、task queue、recent activity、AI quota summary。
- [ ] Server session 用 `requireCurrentMember()` 推導 org/user/unit，不信任前端 scope。
- [ ] Repository 聚合 client/visit/report/issue/AI usage，不在 browser 串多條低階 API 拼資料。
- [ ] `/dashboard` 改走 BFF/cache-first；Zustand 只作 UI/cache。
- [ ] Browser proof：desktop/mobile refresh/new context 後資料一致，console error 0、無水平 overflow。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-102 - Member Settings BFF Hardening

目標：把 `/settings` 收斂為 member-scoped BFF contract，避免混入 org settings。

- [ ] 檢查 `GET/PATCH /api/member/settings` 是否使用 current member scope。
- [ ] DTO 明確分 profile、notification preferences、AI preferences、personal collaborator hints。
- [ ] 不允許修改 org branding、billing、unit policy、client portal、org AI quota、compliance defaults。
- [ ] 前端清除 local fallback；error/empty/loading/forbidden state 一致化。
- [ ] API proof：member 200/patch 200；unauth 401；跨 member/org scope 無法指定。
- [ ] Browser proof：refresh/new context persistence。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-103 - CRM BFF Completion

目標：補齊 CRM 剩餘 read/write subresources，讓 client detail/subpages 不依賴 local business truth。

- [ ] 補 `PATCH/ARCHIVE` 或明確 soft-delete endpoint，保留合規欄位。
- [ ] 補 family/policy/timeline/report/gap-analysis related-list BFF DTO。
- [ ] 所有 writes 由 server session 推導 organization/owner/unit。
- [ ] `complianceChecklist`、`sensitivityLevel`、`kycStatus` 必須在 DTO 與 create/update flow 保留。
- [ ] Client store local write methods 改成 remote-confirmed cache update 或標註 dev-only。
- [ ] API proof：401、403/404 foreign client、400 validation、200/201 success。
- [ ] Browser proof：`/crm` 與 `/crm/[clientId]/*` refresh/new context。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-104 - Visit / Pre-visit BFF

目標：讓 `/pre-visit` list/detail/notes/create/update 走 member-scoped BFF。

- [x] 建立 `GET/POST /api/visits` 或現有命名等價 route。
- [x] 建立 `GET/PATCH /api/visits/[id]` 與 notes write path。
- [x] DTO 回準備包、checklist、source client context、status、updatedAt，不回 raw prompt/provider payload。
- [x] `/pre-visit`、`/pre-visit/[planId]`、notes 頁改 BFF/cache-first。
- [x] 與 `/api/ai/visit` 的 AI generation contract 分清：planning CRUD 不等於 provider call。
- [x] API/browser proof 覆蓋 refresh/new context。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review 註記（2026-06-20）：下一個 LV3 implementation loop 建議切成 `BFF-104a Visit / Pre-visit server-owned workspace`。先補 `GET/POST /api/visits`、`GET/PATCH /api/visits/[id]`、notes write path，並把 `/pre-visit` list/detail/notes 改為 BFF/cache-first；`/api/ai/visit` 保持 provider-generation route，generated preparation package 另走 deterministic save/update path，避免把 raw prompt/provider payload 當業務資料保存。驗收需證明 refresh/new context 後準備包、reasoning evidence、notes 與 persisted `visitPlanId` theater CTA 都存在。

完成註記（2026-06-20）：`BFF-104a` 已落地。新增 `src/app/api/visits/route.ts`、`src/app/api/visits/[id]/route.ts`、`src/lib/visits/visit-plan-repository.ts` create/list/update schemas 與 repository 方法、`VisitService` remote cache helpers，並把 `/pre-visit` list/detail/notes 接到 BFF。`pnpm visit:bff-qa` 以 demo member proof 驗證 401 guard、create/patch/reload、reasoning evidence、notes reload、persisted visitPlanId theater handoff、no raw private sentinel、desktop/mobile no overflow；腳本不呼叫 provider route。

---

## Batch BFF-105 - Reports / Share Action BFF

目標：讓 reports library/detail/edit/share action 全部由 BFF 管理。

- [ ] 建立 `GET /api/reports` 與 `GET/PATCH /api/reports/[id]`。
- [ ] 建立 `POST /api/reports/[id]/share` 或等價 action，產生 share token/server-side CTA config。
- [ ] Report detail DTO 分 edit/share/preview mode，不回 client-private internal fields 給 public DTO。
- [ ] `/reports`、`/reports/[reportId]`、CRM report subpage 改 BFF/cache-first。
- [ ] Share action 寫 audit/event；public share 仍走 `/api/share/[token]`。
- [ ] API/browser proof 覆蓋 invalid report、foreign org、success share。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-106 - Issues BFF

目標：讓 `/issues` 由 server-side issue/recommendation BFF 提供資料，不依賴 mock/static state。

- [ ] 建立 `GET /api/issues`，回 member-scoped issue list、priority、readiness、next action。
- [ ] 建立 `PATCH /api/issues/[id]` 或 action endpoint 管理 status/assignment。
- [ ] DTO 區分 issue fact、AI inference、unknown，不把推論當事實。
- [ ] `/issues` 改 BFF/cache-first。
- [ ] API/browser proof 覆蓋 empty、forbidden、success、refresh。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-201 - AI BFF Audit Gate

目標：建立 AI route 全覆蓋 audit gate，後續逐條 hardening 前先知道缺口。

- [ ] 擴充或新增 `pnpm ai:bff-audit`，列出所有 `/api/ai/*`、`/api/rag` route。
- [ ] 檢查每條 route 是否有 session/token scope、plan capability、quota guard、success/error `AiUsageLog`、input limit。
- [ ] 產出或更新 `AUD-005_ai-usage-route-audit-v1.0.md`。
- [ ] 不改 SPIN 狀態機、不改 Theater enum/scoring。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-202 - Visit / Report AI Hardening

目標：把 `/api/ai/visit` 與 `/api/ai/report` 對齊 AI BFF contract。

- [ ] `requireCurrentMember()` 推導 org/user/unit/client/report scope。
- [ ] `canUseAiModule()` 與 quota guard；quota blocked 不呼叫 provider、不寫假 usage。
- [ ] Success/error path 都寫 `AiUsageLog`。
- [ ] Response DTO 分 facts/inferences/unknowns/recommendations。
- [ ] API proof：401、400、429、success、provider error。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-203 - SPIN AI Hardening

目標：把 `/api/ai/spin` 與 `/api/ai/spin-suggestions` 對齊 AI BFF contract，且不破壞 SPIN 狀態機。

- [ ] Session-scoped，不信任 browser org/user。
- [ ] 保留 `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF`。
- [ ] Success/error path 都寫 `AiUsageLog`。
- [ ] Quota/capability guard 完整。
- [ ] API/browser proof 覆蓋 existing SPIN session flow。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-204 - Theater AI Hardening

目標：把 `/api/ai/theater` 與 `/api/ai/theater/score` 對齊 AI BFF contract，不任意改 legacy contract。

- [ ] Session-scoped，不信任 browser org/user。
- [ ] Success/error path 都寫 `AiUsageLog`。
- [ ] Quota/capability guard 完整。
- [ ] Legacy Theater 若未 Route B migration，維持 staging/demo gate，不宣稱 production-ready。
- [ ] 不改 legacy enum/scoring 型別；Route B migration 另依 ITA。
- [ ] API/browser proof 覆蓋 theater list/session basic flow。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-205 - Assistant / RAG / Interview Hardening

目標：補齊 assistant、RAG、interview AI BFF contract 與 private-beta posture。

- [ ] `/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs` audit gap = 0。
- [ ] `/api/rag` 若 disabled，回 guarded 503，不呼叫 provider、不寫假 usage。
- [ ] Assistant conversation persistence 不含 secret/tool raw private payload。
- [ ] Interview output DTO 分 fact/inference/unknown，保存 supporting evidence。
- [ ] API proof：401、400、429/503、success、provider error。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-301 - Org BFF Repository Extraction And Aggregate QA

目標：把 org aggregate routes 的 Prisma 聚合抽入 repository，並建立 aggregate privacy proof。

- [ ] 抽 `src/lib/org/*-repository.ts` 或整合既有 org-settings repository。
- [ ] `/api/org/overview`、coaching、AI usage 只保留 route protocol/session/response。
- [ ] Manager unit scope 與 `canReadOrgAggregate()` 保留。
- [ ] Sentinel QA 確認不回 client name/email/phone/report body/transcript/policy detail。
- [ ] API/browser proof：manager aggregate 200、member 403、unauth 401。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-302 - Org Writes Audit And Capability Enforcement

目標：讓 org members/units/invites/settings writes 都有 plan capability 與 audit。

- [ ] Members/invites 套 max members/collaborators/seat limits。
- [ ] Units 套 max units 與 hierarchy validation。
- [ ] Settings writes 寫 `AuditLog`，保留 actor/resource/reason。
- [ ] Manager read-only 或 limited-write policy 清楚。
- [ ] API proof 覆蓋 forbidden、limit exceeded、audit created。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-303 - Client Portal BFF Completion

目標：補齊 client portal token session lifecycle、response boundary 與 revocation proof。

- [ ] Share token session 支援 expiry/rotation/revocation。
- [ ] `/api/client-portal/bootstrap` 僅回 authorized report/client-safe sections。
- [ ] `/api/client-portal/responses` payload whitelist，支援補資料、提問、預約意向。
- [ ] 若新增附件 route，必須 size/type allowlist、signed URL、virus-scan strategy。
- [ ] Client token 打 workspace/member/org/platform APIs 必須 401/403。
- [ ] Browser/API proof 覆蓋 authorized/invalid/expired/revoked。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-304 - Platform BFF Completion

目標：完成 platform metadata/readiness/audit/break-glass surface。

- [ ] Platform session 與 app session 分離 proof。
- [ ] Organizations/AI usage/audit logs 預設 metadata/aggregate。
- [ ] Impersonation/break-glass 必填 reason、scope、expiry、actor/target。
- [ ] Sensitive read 每次寫 `AuditLog`，且 response 可回報 proof id。
- [ ] Release readiness 聚合 auth、AI、billing、monitoring、backup、BFF gates。
- [ ] API proof 覆蓋 app session rejected、platform success、break-glass audit。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-305 - Public BFF Completion

目標：讓 public pages 的正式狀態由 public-safe BFF 控制。

- [ ] `/api/public/pricing` 補 cache/fallback policy 與 DB consistency proof。
- [ ] 新增 `/api/public/status`，回 maintenance、checkout availability、AI availability。
- [ ] 新增 `/api/public/lead` 或明確延後，若實作需 rate limit、spam protection、consent version。
- [ ] Landing/pricing CTA 不以 hardcoded frontend copy 判斷 checkout availability。
- [ ] Public BFF 不回 private plan cost、secret、provider raw config。
- [ ] Browser/API proof 覆蓋 pricing/status/CTA。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-401 - ECPay Checkout BFF

目標：建立 server-generated checkout contract，browser 不拼金流 payload。

- [ ] 建立 `/api/billing/checkout`。
- [ ] Server-side 產生 ECPay payload 與 CheckMacValue。
- [ ] Browser 只收到導轉必要資料，不接觸 HashKey/HashIV。
- [ ] Checkout request 寫 pending order/transaction。
- [ ] Production credentials/callback domain 未獲 approval 時只能 test/sandbox 或 disabled posture。
- [ ] API proof：unauth 401、invalid plan 400、disabled 503 或 sandbox 200。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-402 - ECPay Notification / Query / Idempotency

目標：付款狀態只信任 server notification/query confirmation。

- [ ] 建立 `/api/billing/ecpay/notify`，驗證 CheckMacValue。
- [ ] 建立 `/api/billing/ecpay/query` server-to-server confirmation。
- [ ] Return/OrderResult URL 只顯示 pending/received，不直接啟用 plan。
- [ ] Transaction ledger idempotency：同交易重送不重複啟用。
- [ ] Failure/refund/void/manual review 狀態保留。
- [ ] API proof 覆蓋 invalid CheckMacValue、duplicate notify、query confirmed。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-403 - Subscription Capability BFF

目標：把 subscription capability、quota、seat usage 從 server contract 回傳。

- [ ] 建立 `/api/billing/subscription` 或 `/api/org/billing`。
- [ ] DTO 包含 current plan、capability、quota、seat/collaborator/unit usage、checkout status。
- [ ] Plan activation 只由 confirmed transaction/query 控制。
- [ ] Workspace bootstrap 與 org/member UI 使用 server capability，不使用 hardcoded plan assumptions。
- [ ] API/browser proof 覆蓋 plan change persistence。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

---

## Batch BFF-404 - Release Readiness BFF Gate

目標：建立 full-site BFF 上線 gate，讓 production readiness 可被機器與人共同檢查。

- [ ] `/api/platform/release-readiness` 納入 BFF inventory、AI usage audit、billing proof、cross-role sentinel、monitoring、backup/rollback。
- [ ] 新增 `pnpm bff:release-readiness-qa` 或整合既有 full smoke。
- [ ] Full smoke 覆蓋 public、member、org、client portal、platform。
- [ ] Report 註明剩餘 blockers，不把 mock success 寫成 production success。
- [ ] 更新 `AGENTS.md`、`PLN-019`、必要 report / issue-question。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Browser QA。

---

## Current BFF Blockers

- ECPay production credentials、HashKey/HashIV、callback domain、server notification/query proof 需要 operator approval。
- Production auth provider/email/SSO、platform MFA、client-user OTP 仍需 operator/product 決策。
- Existing realtime voice workstream 已占用 `ARC-007/PLN-018/ACC-010`，本 BFF workstream 使用 `ARC-008/PLN-019/ACC-011`。
- 若 BFF tasks 改 route/layout/server action/cookies/session 行為，先讀 `node_modules/next/dist/docs/` 對應 Next.js 版本文件。
- Production DB destructive operation、drop/reset/delete remote data 仍需明確 approval。
