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
| BFF-001 | Full-site data-source inventory and responsibility matrix | [x] | BFF-000 |
| BFF-002 | Shared API foundation | [x] | BFF-001 |
| BFF-101 | Member dashboard BFF | [x] | BFF-002 |
| BFF-102 | Member settings BFF hardening | [ ] | BFF-002 |
| BFF-103 | CRM BFF completion | [ ] | BFF-002 |
| BFF-104 | Visit / pre-visit BFF | [x] | BFF-002 |
| BFF-105 | Reports / share action BFF | [x] | BFF-002 |
| BFF-106 | Issues BFF | [x] | BFF-002 |
| BFF-201 | AI BFF audit gate | [x] | BFF-002 |
| BFF-202 | Visit/report AI hardening | [x] | BFF-201 |
| BFF-203 | SPIN AI hardening | [ ] | BFF-201 |
| BFF-204 | Theater AI hardening | [ ] | BFF-201 |
| BFF-205 | Assistant/RAG/interview hardening | [ ] | BFF-201 |
| BFF-301 | Org BFF repository extraction and aggregate QA | [x] | BFF-002 |
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

- [x] 盤點所有 `src/app/**/page.tsx`、`src/components/**`、`src/domains/**/service.ts`、`src/domains/**/store.ts` 的 business data source。
- [x] 標記每個 surface 是 DB/BFF、server component query、mock API、Zustand local、static fixture、mixed mode。
- [x] 產出 `AUD-006_full-site-bff-data-source-inventory-v1.0.md`。
- [x] 建立 responsibility matrix：surface、UI route、BFF endpoint、session type、DTO、read/write、audit、QA script。
- [x] 新增或擴充 QA script，偵測 production page 直接 import `mocks.ts`、`seed-fixtures.ts` 或 browser storage business truth source。
- [x] 不改業務邏輯；不重寫 BFF route。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review fallback（2026-06-20）：若下一輪無法安全確認 Route B DB target 或 migration approval，BFF-001 是最高安全 fallback。盤點時要特別標出 `/reports` local store/share action、`/issues` static mock、admin demo seed、client service local write methods，以及 theater Route B runtime/source 邊界。

Whole-product review fallback update（2026-06-20 after previsit redesign）：若 `ITA-003e` Route B 互動寫入切片被 provider/env/session 條件阻擋，BFF-001 仍是最高安全 fallback。盤點時要把已完成的 DB-backed client/relationship/visit/Route B session proof 與仍 local/static 的 `/reports`、`/issues`、admin/demo seed、client store local write methods 分開標示，避免後續 LV3 proof 混入 mock/local truth。

完成註記（2026-06-20）：已新增 `docs/06_audits-and-reports/AUD-006_full-site-bff-data-source-inventory-v1.0.md` 與 `pnpm bff:inventory-qa`。Audit 建立全站 responsibility matrix，明確分出 DB/BFF ready、partial BFF/mixed、local/Zustand truth、static fixture/mock、UI-only browser state；並點名 `/reports`、`/issues`、`/team`、admin/pilot demo seed、SPIN mock outline fallback、notification reminder mock route、domain store seed 與 calendar store seed 等 blocker。此卡不呼叫 provider、不做 DB/Prisma 操作、不重寫 BFF route；下一張最低未完成卡為 BFF-002。

---

## Batch BFF-002 - Shared API Foundation

目標：建立新 BFF route 可重用的 response/error/validation/sanitize foundation，避免每條 route 自行拼 contract。

- [x] 新增 `src/lib/api/errors.ts` 或等價 helper：auth、forbidden、not found、validation、rate limit、quota errors。
- [x] 新增 `src/lib/api/response.ts` 或等價 helper：JSON response、request id、private data no-store headers。
- [x] 新增 `src/lib/api/validation.ts` 或等價 helper：Zod parse + flattened issues。
- [x] 新增 `src/lib/api/sanitize.ts` 或等價 helper：share event、client response、audit metadata whitelist。
- [x] 先接 2-3 條低風險 route 作 proof，不一次重寫全站。
- [x] Error contract 不應暴露 stack、env、secret、provider raw payload。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已新增 `src/lib/api/errors.ts`、`response.ts`、`validation.ts`、`sanitize.ts`，並接入 `/api/member/settings`、`/api/share/[token]`、`/api/share/[token]/events`、`/api/client-portal/responses`。Proof：`pnpm bff:foundation-qa`、`DEMO_QA_BASE_URL=http://localhost:3026 pnpm bff:foundation-api-qa`、`pnpm share:token-qa`、`pnpm client-portal:qa` 均通過；private response / validation error 有 no-store 與 request id，share event / client response sanitizer 保持 unsafe payload key count 0。此卡不呼叫 provider、不改 Prisma schema、不做 production write；API proof 僅新增可辨識 demo/test share/client portal event evidence。下一張最高槓桿卡建議為 BFF-105 reports / share action BFF。

---

## Batch BFF-101 - Member Dashboard BFF

目標：讓 `/dashboard` 首屏 decision center 由 single member-scoped BFF 提供 UI-ready DTO。

- [x] 建立 `GET /api/member/dashboard`。
- [x] DTO 包含今日主線、下一步 CTA、compact KPI、task queue、recent activity、AI quota summary。
- [x] Server session 用 `requireCurrentMember()` 推導 org/user/unit，不信任前端 scope。
- [x] Repository 聚合 client/visit/report/issue/AI usage，不在 browser 串多條低階 API 拼資料。
- [x] `/dashboard` 改走 BFF/cache-first；Zustand 只作 UI/cache。
- [x] Browser proof：desktop/mobile refresh/new context 後資料一致，console error 0、無水平 overflow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已完成 BFF-101。新增 `MemberDashboardDto`、member dashboard repository、`GET /api/member/dashboard`、server page 與 client component；dashboard 首屏今日主線、KPI、task queue、recent activity、agenda、AI quota summary 皆由 current member server scope 聚合 clients / visits / reports / issues / AI usage。`/dashboard` 不再讀 client/event/session local store 當 business truth；Quickstart welcome card 仍只保留 demo UI state。`pnpm bff:dashboard-qa` 通過 unauth 401、member 200/no-store/request-id、manager own-dashboard 隔離、seeded issue task reload、desktop/mobile no overflow 與 no raw private sentinel；不呼叫 provider、不改 Prisma schema。

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

完成註記（2026-06-20 BFF-103a）：已補關係圖 metadata/source review 子切片。新增 deterministic `ClientRelationshipGraphReview` builder、member-scoped `/api/clients/[id]/relationship-graph`、CRM relationships 頁「關係圖來源審查」面板與 `pnpm client:relationship-graph-qa`。DTO 以人物節點呈現職位、年收入、人物狀態、關係脈絡、fact/inference/unknown、source references、準備包與劇場 readiness；response 不回 email/phone/raw private sentinel。API proof：unauth 401、missing 404、member 200、manager 403；Browser proof：desktop/mobile no overflow。BFF-103 仍未完成，因 family edit/delete remote-confirmed write path 與其他 related-list BFF 尚待後續。

完成註記（2026-06-20 BFF-103b）：已補 family member remote-confirmed write path 子切片。新增 `PATCH/DELETE /api/clients/[id]/family-members/[memberId]`、`updateFamilyMemberForClient`、`deleteFamilyMemberForClient`、client service remote update/delete helpers 與 `pnpm client:relationship-graph-write-qa`。API proof 覆蓋 unauth 401、member re-parent 200、self-parent/cycle 400、manager 404、delete 200、missing delete 404，並確認刪除父節點時子節點會接回 root；Browser proof 覆蓋 `/crm/[clientId]/relationships` 刪除按鈕走 remote-confirmed delete，reload 後被刪成員仍消失，desktop no overflow。此子切片不呼叫 provider，無 AiUsageLog 需求；BFF-103 仍未完成，因 client archive/update、policy/timeline/report/gap-analysis related-list 仍待補；主客戶 `parentMemberId` runtime dependency 已由 REL-001/002 後續解除。

校準註記（2026-06-20 fifth-loop review）：BFF-103 的下一個最低風險入口不是直接補 schema，而是先執行 Relationship Graph workstream 的 `REL-001/REL-002` no-schema repair。Source audit 顯示 Prisma `Client` model 沒有 `parentMemberId`，但 domain type / DTO / repository / UI 仍讀寫該欄位；同時 `RelationshipMap.tsx` 長輩 early-return 會讓直接掛主客戶的父母節點漂浮，`AddRelationshipDialog.tsx` parent mode 仍 local-only。建議先用既有 `FamilyMember.parentMemberId` 與 `PATCH /api/clients/[id]/family-members/[memberId]` 完成 BFF-confirmed parent 建立與 refresh/new-context proof，再回到 BFF-103 related-list/archive/update。

完成註記（2026-06-20 REL-001/002）：Relationship Graph workstream 已完成 no-schema repair。`Client.parentMemberId` runtime dependency 已移除；root-connected elder nodes 會產生 elder→client edge；`AddRelationshipDialog` parent mode 走 `createFamilyMemberRemote` + `updateFamilyMemberRemote` re-parent，local family write helpers 標為 dev-only。`pnpm client:relationship-graph-write-qa` 擴充 API/browser persist proof，`pnpm client:relationship-graph-qa` private sentinel false positive 已改為 seeded email/phone 精準檢查。

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

- [x] 建立 `GET /api/reports` 與 `GET/PATCH /api/reports/[id]`。
- [x] 建立 `POST /api/reports/[id]/share` 或等價 action，產生 share token/server-side CTA config。
- [x] Report detail DTO 分 edit/share/preview mode，不回 client-private internal fields 給 public DTO。
- [x] `/reports`、`/reports/[reportId]`、CRM report subpage 改 BFF/cache-first。
- [x] Share action 寫 audit/event；public share 仍走 `/api/share/[token]`。
- [x] API/browser proof 覆蓋 invalid report、foreign org、success share。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已完成 BFF-105。新增 `src/lib/report/report-repository.ts` 的 member-scoped report list/detail/create/update/share schemas 與 repository 方法、`GET/POST /api/reports`、`GET/PATCH /api/reports/[id]`、`POST /api/reports/[id]/share`，並讓 `/reports`、`/reports/[reportId]`、`/crm/[clientId]/reports` 改走 BFF/cache-first。`Report` DTO 分 member internal sections 與 client-safe sections；public share 仍透過 `/api/share/[token]`，不回 internal/performance section。新增 `pnpm bff:reports-qa`：API proof 覆蓋 unauth 401、member list/create/detail/update/share、invalid section 400、manager foreign read 404、ShareEvent count 增加與 public share no-leak；browser proof 覆蓋 reports list/detail desktop/mobile no overflow。此卡不呼叫 provider、不改 Prisma schema、不做 production write；DB proof 僅新增可辨識 demo/test `Report`、`ReportShare` 與 `ShareEvent` evidence。

---

## Batch BFF-106 - Issues BFF

目標：讓 `/issues` 由 server-side issue/recommendation BFF 提供資料，不依賴 mock/static state。

- [x] 建立 `GET /api/issues`，回 member-scoped issue list、priority、readiness、next action。
- [x] 建立 `PATCH /api/issues/[id]` 或 action endpoint 管理 status/assignment。
- [x] DTO 區分 issue fact、AI inference、unknown，不把推論當事實。
- [x] `/issues` 改 BFF/cache-first。
- [x] API/browser proof 覆蓋 empty、forbidden、success、refresh。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review 註記（2026-06-20 after BFF-105）：下一個 normal LV3 implementation loop 建議選 `BFF-106 Issues BFF`。先把 `src/app/(dashboard)/issues/page.tsx` 從 `MOCK_ISSUES` 改為 member-scoped BFF/cache-first；server DTO 至少包含 issue summary、status、priority、source references、`fact` / `inference` / `unknown` classification、IRL/internal readiness 與 advisor next action。Client-facing report/share 不得顯示 internal IRL 分數；org/manager 後續 aggregate 只能看統計，不讀 member client details。驗收需新增 deterministic API/browser proof：unauth 401、member success、foreign/manager detail forbidden 或 404、empty state、status/action write audit、refresh/new context persistence、desktop/mobile no overflow、response 無 raw private sentinel。

完成註記（2026-06-20）：已完成 BFF-106。新增 `src/domains/issues/types.ts`、`src/lib/issues/issues-repository.ts`、`GET /api/issues`、`PATCH /api/issues/[id]`、`/issues` server page + client component 與 `pnpm bff:issues-qa`。DTO 由 DB `Issue` table 產生，包含 facts / inferences / unknowns、source references、internal readiness（固定不可 client-facing）與 advisor next action；PATCH status/action/feedback/assignment 會寫 `AuditLog(resourceType=ISSUE)`。Proof 覆蓋 unauth 401、member 200、manager foreign 404、empty query、invalid patch 400、status/action audit、reload persistence、desktop/mobile no overflow、no raw private sentinel；不呼叫 provider、不改 Prisma schema。下一張建議為 `BFF-101 Member dashboard BFF`。

---

## Batch BFF-201 - AI BFF Audit Gate

目標：建立 AI route 全覆蓋 audit gate，後續逐條 hardening 前先知道缺口。

- [x] 擴充或新增 `pnpm ai:bff-audit`，列出所有 `/api/ai/*`、`/api/rag` route。
- [x] 檢查每條 route 是否有 session/token scope、plan capability、quota guard、success/error `AiUsageLog`、input limit。
- [x] 產出或更新 `AUD-005_ai-usage-route-audit-v1.0.md`。
- [x] 不改 SPIN 狀態機、不改 Theater enum/scoring。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已完成 BFF-201。`scripts/ai-usage-route-audit.mjs` 改為自動 discovery + manifest gate，新增 `pnpm ai:bff-audit` alias，掃描 `src/app/api/ai/**/route.ts` 與 `src/app/api/rag/**/route.ts`。Proof 顯示 22/22 route covered、13 條 provider-ready route 具備 session/quota/input/success-error `AiUsageLog` evidence、8 條 deterministic interview BFF route 有 session/input/no-provider proof、`/api/rag` 保持 guarded-disabled no-provider posture。此卡未改 SPIN 狀態機、未改 Theater enum/scoring、未呼叫 provider、未改 DB/Prisma schema；下一張建議 `BFF-202 Visit/report AI hardening` 或 `BFF-203 SPIN AI hardening`，依是否優先處理 provider route proof 或 SPIN mock source blocker。

---

## Batch BFF-202 - Visit / Report AI Hardening

目標：把 `/api/ai/visit` 與 `/api/ai/report` 對齊 AI BFF contract。

- [x] `requireCurrentMember()` 推導 org/user/unit/client/report scope。
- [x] `canUseAiModule()` 與 quota guard；quota blocked 不呼叫 provider、不寫假 usage。
- [x] Success/error path 都寫 `AiUsageLog`。
- [x] Response DTO 分 facts/inferences/unknowns/recommendations。
- [x] API proof：401、400、429、success、provider error。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：`src/domains/visit/ai-evidence-dto.ts` 建立 visit/report 共用 evidence summary DTO 與 provider-safe client snapshot。`/api/ai/visit` 回傳向下相容準備包 JSON + `evidenceSummary`；`/api/ai/report` 保留 markdown 相容模式並新增 `responseFormat: "json"`，CRM report subpage 已消費 JSON DTO。Provider prompt 僅包含職業、年收入、狀態、敏感/KYC、關係摘要、保單摘要、合規待補與 AI tags，不送 email/phone/raw notes。新增 `pnpm bff:visit-report-ai-qa`，proof 通過 401、400、429 no fake usage、success、invalid-model provider error、success/error `AiUsageLog` 增量、email/phone sentinel 0。未改 Prisma schema；DB 僅新增正常 VISIT/REPORT OpenAI usage evidence。

---

## Batch BFF-203 - SPIN AI Hardening

目標：把 `/api/ai/spin` 與 `/api/ai/spin-suggestions` 對齊 AI BFF contract，且不破壞 SPIN 狀態機。

- [x] Session-scoped，不信任 browser org/user。
- [ ] 保留 `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF`。
- [x] Success/error path 都寫 `AiUsageLog`。
- [x] Quota/capability guard 完整。
- [ ] 移除或替換 `/spin/[sessionId]` 的 `/api/mock/ai/spin-outline` fallback 與 local seed truth，不把 legacy SPIN mock/local session 當正式 proof。
- [ ] API/browser proof 覆蓋 existing SPIN session flow。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review 註記（2026-06-20）：`AUD-005` 已證明 `/api/ai/spin` 與 `/api/ai/spin-suggestions` route-level session/quota/usage audit pass；BFF-203 仍保持未完成，因 `AUD-006` 指出 `/spin/[sessionId]` 仍呼叫 `/api/mock/ai/spin-outline`，`src/domains/spin/store.ts` 仍以 demo seed/local truth 初始化。下一輪若 PIM-010 被阻擋，fallback 為 `BFF-203a SPIN source-truth hardening`，必須保護 SPIN 狀態機。

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

- [x] 抽 `src/lib/org/*-repository.ts` 或整合既有 org-settings repository。
- [x] `/api/org/overview`、coaching、AI usage 只保留 route protocol/session/response。
- [x] Manager unit scope 與 `canReadOrgAggregate()` 保留。
- [x] Sentinel QA 確認不回 client name/email/phone/report body/transcript/policy detail。
- [x] API/browser proof：manager aggregate 200、member 403、unauth 401。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已完成 BFF-301。新增 `src/domains/org/types.ts`、`src/lib/org/org-aggregate-repository.ts`、`src/lib/org/org-api-errors.ts` 與 `pnpm bff:org-aggregate-qa`；`/api/org/overview`、`/api/org/coaching`、`/api/org/ai-usage` 改為 route protocol/session/response shell，聚合與 manager unit scope 集中在 repository。`/team` 改由 server page 讀 `OrgTeamDashboardDto`，移除 `MOCK_TEAM_MEMBERS`。Proof 覆蓋 unauth 401、member 403、manager aggregate 200、private no-store/request-id、database/org-aggregate visibility、desktop/mobile `/team` no overflow、no client detail/report body/transcript/policy/private memory sentinel；既有 org QA scripts 仍通過。未改 Prisma schema，未呼叫 provider。

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
