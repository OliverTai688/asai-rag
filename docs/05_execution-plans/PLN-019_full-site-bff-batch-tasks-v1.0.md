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
| BFF-203 | SPIN AI hardening | [x] | BFF-201 |
| BFF-204 | Theater AI hardening | [x] | BFF-201 |
| BFF-205 | Assistant/RAG/interview hardening | [x] | BFF-201 |
| BFF-301 | Org BFF repository extraction and aggregate QA | [x] | BFF-002 |
| BFF-302 | Org writes audit and capability enforcement | [x] | BFF-301 |
| BFF-303 | Client portal BFF completion | [x] | BFF-002 |
| BFF-304 | Platform BFF completion | [x] | BFF-002 |
| BFF-305 | Public BFF completion | [x] | BFF-002 |
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

- [x] 補 `PATCH/ARCHIVE` 或明確 soft-delete endpoint，保留合規欄位。
- [x] 補 family/policy/timeline/report/gap-analysis related-list BFF DTO。
- [x] 所有 writes 由 server session 推導 organization/owner/unit。
- [x] `complianceChecklist`、`sensitivityLevel`、`kycStatus` 必須在 DTO 與 create/update flow 保留。
- [x] Client store local write methods 改成 remote-confirmed cache update 或標註 dev-only。
- [x] API proof：401、403/404 foreign client、400 validation、200/201 success。
- [x] Browser proof：`/crm` 與 `/crm/[clientId]/*` refresh/new context。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20 BFF-103a）：已補關係圖 metadata/source review 子切片。新增 deterministic `ClientRelationshipGraphReview` builder、member-scoped `/api/clients/[id]/relationship-graph`、CRM relationships 頁「關係圖來源審查」面板與 `pnpm client:relationship-graph-qa`。DTO 以人物節點呈現職位、年收入、人物狀態、關係脈絡、fact/inference/unknown、source references、準備包與劇場 readiness；response 不回 email/phone/raw private sentinel。API proof：unauth 401、missing 404、member 200、manager 403；Browser proof：desktop/mobile no overflow。BFF-103 仍未完成，因 family edit/delete remote-confirmed write path 與其他 related-list BFF 尚待後續。

完成註記（2026-06-20 BFF-103b）：已補 family member remote-confirmed write path 子切片。新增 `PATCH/DELETE /api/clients/[id]/family-members/[memberId]`、`updateFamilyMemberForClient`、`deleteFamilyMemberForClient`、client service remote update/delete helpers 與 `pnpm client:relationship-graph-write-qa`。API proof 覆蓋 unauth 401、member re-parent 200、self-parent/cycle 400、manager 404、delete 200、missing delete 404，並確認刪除父節點時子節點會接回 root；Browser proof 覆蓋 `/crm/[clientId]/relationships` 刪除按鈕走 remote-confirmed delete，reload 後被刪成員仍消失，desktop no overflow。此子切片不呼叫 provider，無 AiUsageLog 需求；BFF-103 仍未完成，因 client archive/update、policy/timeline/report/gap-analysis related-list 仍待補；主客戶 `parentMemberId` runtime dependency 已由 REL-001/002 後續解除。

校準註記（2026-06-20 fifth-loop review）：BFF-103 的下一個最低風險入口不是直接補 schema，而是先執行 Relationship Graph workstream 的 `REL-001/REL-002` no-schema repair。Source audit 顯示 Prisma `Client` model 沒有 `parentMemberId`，但 domain type / DTO / repository / UI 仍讀寫該欄位；同時 `RelationshipMap.tsx` 長輩 early-return 會讓直接掛主客戶的父母節點漂浮，`AddRelationshipDialog.tsx` parent mode 仍 local-only。建議先用既有 `FamilyMember.parentMemberId` 與 `PATCH /api/clients/[id]/family-members/[memberId]` 完成 BFF-confirmed parent 建立與 refresh/new-context proof，再回到 BFF-103 related-list/archive/update。

完成註記（2026-06-20 REL-001/002）：Relationship Graph workstream 已完成 no-schema repair。`Client.parentMemberId` runtime dependency 已移除；root-connected elder nodes 會產生 elder→client edge；`AddRelationshipDialog` parent mode 走 `createFamilyMemberRemote` + `updateFamilyMemberRemote` re-parent，local family write helpers 標為 dev-only。`pnpm client:relationship-graph-write-qa` 擴充 API/browser persist proof，`pnpm client:relationship-graph-qa` private sentinel false positive 已改為 seeded email/phone 精準檢查。

完成註記（2026-06-20 BFF-103c）：已補 client update/archive source-truth 子切片。新增 `DELETE /api/clients/[id]` soft archive、`archiveClientForMember()`、archived DTO、client service `updateClientRemote()` / `archiveClientRemote()` 與 `pnpm bff:crm-client-lifecycle-qa`。Proof 覆蓋 unauth DELETE 401、member create/PATCH 201/200、manager PATCH/DELETE 404、relationship graph 讀到更新後職位/年收入/status、DELETE soft archive 200、DB `clients.status=ARCHIVED` 且 `compliance_checklists` 保留、archived client detail/relationship graph 404、`/api/clients` 不再列出封存客戶、`/crm/[clientId]` detail 與 `/crm` desktop/mobile refresh proof、`AiUsageLog` count 不變與 no-provider proof。BFF-103 大卡仍未完成，因 policy/timeline/report/gap-analysis related-list BFF DTO 尚待補。

阻擋註記（2026-06-20 BFF-103d partial）：已落地 related-list DTO implementation，但驗收被外部 Supabase DNS/DB 連線中斷阻擋，因此本 checklist 仍不打勾。新增 `GET /api/clients/[id]/related-lists`、`src/lib/clients/client-related-lists-repository.ts`、`src/domains/client/related-lists.ts`、`useClientRelatedLists()`，並將 CRM `policies`、`timeline`、`gap-analysis` 子頁改讀 policies/timeline/report/gap-analysis aggregate DTO；DTO 保留 `complianceChecklist`、`sensitivityLevel`、`kycStatus`，且不回 email/phone/policyNumber/report body/raw metadata。新增 `pnpm bff:crm-related-lists-qa`，初次 proof 已跑到 unauth 401、member create/family/policy/visit/report 201、related-lists 200、manager 403、policies/timeline desktop screenshot；後續 `/crm/[clientId]/gap-analysis` 因 Prisma `EHOSTUNREACH/P1001` 失敗，重跑時 DNS `ENOTFOUND db.wwocdcicvpmbdmqvskzi.supabase.co`，`/api/clients` 也回 500。`pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed` 通過；待 DB DNS 恢復後重跑 `DEMO_QA_BASE_URL=http://localhost:3029 pnpm bff:crm-related-lists-qa` 才能完成本 checklist。

Quiet recovery proof-plan note（2026-06-21 BFF-103d）：Supabase DB/DNS 仍無法解析，本輪未新增 source，改把 BFF-103d 的恢復驗收收斂成可重跑 proof plan。DB 恢復後的下一個 BFF-103d recovery slice 必須同時符合以下五個視框，否則不得把 partial proof 宣告為完成：

1. Advisor workflow / onboarding：CRM detail subpages 應讓顧問在同一 client context 內看到 policies、timeline、reports、gap-analysis 與 theater/previsit readiness，不要求 raw client id workflow；empty/error 狀態要引導「補保單、補家庭成員、生成準備包、建立劇場」等下一步。
2. Source-of-truth / BFF：`GET /api/clients/[id]/related-lists` 是 policies/timeline/reports/gap-analysis 子頁的 member-scoped truth source；UI 不得在 refresh/new context 後退回 local store、mock list、raw Prisma shape 或 client-provided org/member/client scope。
3. AI reasoning / evidence：gap-analysis/report/previsit handoff 只消費 DTO 的 facts/inferences/unknowns、source references、readiness signals；不得把 inference 當 confirmed fact，也不得回傳 raw report body、raw provider payload、policyNumber、email/phone sentinel。
4. Theater / relationship immersion：related-list DTO 要保留 relationship graph / policy / visit / report signals 足以支撐 previsit package 與 Route B theater source review；若 theater readiness 缺資料，應輸出 unknown/missing reason，而不是假裝可建完整 stage。
5. QA / compliance / release-proof：恢復 proof 必須重跑 `DEMO_QA_BASE_URL=http://localhost:3029 pnpm bff:crm-related-lists-qa` 或等價腳本，覆蓋 unauth 401、member 200/201、manager/foreign 403/404、desktop/mobile policies/timeline/gap-analysis no overflow、refresh/new-context persistence、`AiUsageLog` unchanged、response/page no private sentinel。DB/DNS blocked 期間只能提交 proof-plan 或 blocked report。

Completion note（2026-06-21 BFF-103d recovery）：DB 恢復後已以 `DEMO_QA_BASE_URL=http://localhost:3000 pnpm bff:crm-related-lists-qa` 完整通過恢復驗收。Proof 覆蓋 unauth 401、member create/family/policy/visit/report 201、member related-lists 200、manager 403、compliance fields/sensitivity/kyc 保留、policy summary total、report summary source、timeline policy/visit/report events、gap-analysis deterministic categories 與 fact/inference/unknown evidence、sourceSummary provider none、DTO 不含 report body/internal section/client section/email/phone/policyNumber、desktop policies/timeline/gap-analysis/reports no overflow、mobile gap-analysis no overflow、`AiUsageLog` count unchanged 147->147。僅修 `scripts/bff-crm-related-lists-qa.mjs` 的 reports text locator strict-mode；產品 BFF/UI source 未改。

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
- [x] 保留 `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF`。
- [x] Success/error path 都寫 `AiUsageLog`。
- [x] Quota/capability guard 完整。
- [x] 移除或替換 `/spin/[sessionId]` 的 `/api/mock/ai/spin-outline` fallback 與 local seed truth，不把 legacy SPIN mock/local session 當正式 proof。
- [x] API/browser proof 覆蓋 existing SPIN session flow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review 註記（2026-06-20）：`AUD-005` 已證明 `/api/ai/spin` 與 `/api/ai/spin-suggestions` route-level session/quota/usage audit pass；BFF-203 仍保持未完成，因 `AUD-006` 指出 `/spin/[sessionId]` 仍呼叫 `/api/mock/ai/spin-outline`，`src/domains/spin/store.ts` 仍以 demo seed/local truth 初始化。下一輪若 PIM-010 被阻擋，fallback 為 `BFF-203a SPIN source-truth hardening`，必須保護 SPIN 狀態機。

完成註記（2026-06-20）：已完成 BFF-203a SPIN source-truth hardening。新增 persisted SPIN session BFF 與 deterministic outline helper，正式 `/spin` list/create/detail/outline 使用 `spin_sessions` / `spin_messages`；Quickstart demo seed 保留但不作正式 proof。Server-side `PATCH` 限制同階、往下一階或完成，保留 SPIN 狀態機；`/spin/[sessionId]` 不再呼叫 `/api/mock/ai/spin-outline`。Proof：`pnpm spin:source-truth-qa`、Browser completed session outline proof、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 通過；本 slice 不呼叫 provider，outline response 帶 no-provider proof。

---

## Batch BFF-204 - Theater AI Hardening

目標：把 `/api/ai/theater` 與 `/api/ai/theater/score` 對齊 AI BFF contract，不任意改 legacy contract。

- [x] Session-scoped，不信任 browser org/user。
- [x] Success/error path 都寫 `AiUsageLog`。
- [x] Quota/capability guard 完整。
- [x] Legacy Theater 若未 Route B migration，維持 staging/demo gate，不宣稱 production-ready。
- [x] 不改 legacy enum/scoring 型別；Route B migration 另依 ITA。
- [x] API/browser proof 覆蓋 theater list/session basic flow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Quiet gap-research note（2026-06-21）：本輪未改 runtime source，改用六視框把 BFF-204 拆成下一輪可驗收 implementation slices，避免把 provider approval blocker 誤當可直接完成的工程卡。

1. Advisor workflow / onboarding：legacy theater list/session proof 要證明顧問能從 `/theater` 看到 staging/demo gate、現有 session、Route B no-provider handoff 狀態與下一步；不得用 raw session id workflow 當主要 proof。
2. Source-of-truth / BFF：`/api/ai/theater`、`/api/ai/theater/score` 只負責 legacy provider turn/score，Route B persisted session/turns 仍走 `/api/theater/route-b/*`；下一輪需明確標示兩條 contract，不互相偷渡。
3. AI reasoning / evidence：legacy score/turn response 要保留 fact/inference/unknown 或 equivalent coaching evidence；Route B guarded runtime preflight 可作 provider boundary proof，但不能宣稱 live multi-character AI 已可用。
4. Theater / relationship immersion：BFF-204 的安全可做 slice 應先驗 legacy theater gate + Route B source adoption/readiness，而不是改 enum/scoring；角色狀態 proposal 不得寫成 confirmed CRM fact。
5. QA / compliance / release-proof：下一輪若無 live provider approval，建議先做 `BFF-204a legacy theater launch gate and guarded Route B boundary proof`，跑 `pnpm ai:bff-audit`、`pnpm theater:route-b-runtime-qa`、`pnpm theater:route-b-interaction-qa` 或等價 proof，並證明 `AiUsageLog` unchanged for guarded/no-provider paths。
6. NANDA / AgentFacts protocol：`asai.theater.legacy` 與 `asai.theater.route_b` manifest 已有 local adapter/export proof；BFF-204 完成前需保持 internal-only、revocable、no external registry publication。

Whole-product review note（2026-06-21 after NAP-005 / BFF-204-205 gap research）：第五輪校準後，下一張 normal implementation 卡仍應先切 `BFF-204a legacy theater launch gate and guarded Route B boundary proof`。本卡只證明 Theater launch boundary：legacy routes/session scope、guarded Route B runtime、list/session UI basic flow、staging/demo gate、no-provider `AiUsageLog` unchanged；不做 live multi-character provider、不改 Theater enum/scoring、不合併未追蹤 AI meeting / notes prototype。

完成註記（2026-06-21 BFF-204a）：已完成 Theater launch-boundary proof。新增 `pnpm theater:launch-boundary-qa`，聚合 legacy `/api/ai/theater`/score static gate、`/theater` desktop/mobile browser proof、AI BFF audit、protocol registry QA、Route B runtime/session UI/interaction QA。結果：`providerCallAttempted=false`、`aiUsageLogWritten=false`、THEATER `AiUsageLog` 10 → 10；legacy enum/scoring 未變更，Route B live provider/five-view feedback 仍需 explicit approval，不在本卡宣稱 production-ready。

---

## Batch BFF-205 - Assistant / RAG / Interview Hardening

目標：補齊 assistant、RAG、interview AI BFF contract 與 private-beta posture。

- [x] `/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs` audit gap = 0。
- [x] `/api/rag` 若 disabled，回 guarded 503，不呼叫 provider、不寫假 usage。
- [x] Assistant conversation persistence 不含 secret/tool raw private payload。
- [x] Interview output DTO 分 fact/inference/unknown，保存 supporting evidence。
- [x] API proof：401、400、429/503、success、provider error。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Quiet gap-research note（2026-06-21）：BFF-205 不應一次混做 Assistant、RAG、Interview 與 external provider launch。下一輪 implementation 應拆成 private-beta posture proof，再逐步補 persistence / evidence hygiene。

1. Advisor workflow / onboarding：Assistant/RAG/Interview 要支援顧問從已知客戶、訪談記憶、準備包與劇場缺口進入；若 RAG disabled，UI/API 需清楚回 guarded 503 與 next-safe action，不可假裝查到知識庫。
2. Source-of-truth / BFF：`/api/ai/chat` provider route、interview provider route、deterministic interview BFF route、`/api/rag` disabled route 必須各自有 manifest/audit posture；Zustand/browser storage 不得成為 assistant conversation 或 interview output 的正式 truth。
3. AI reasoning / evidence：interview outputs、quick-capture、visit/theater handoff 都要維持 fact / inference / unknown / supporting evidence；assistant persistence 不得保存 raw tool payload、secret、token、raw private transcript 或 provider raw payload。
4. Theater / relationship immersion：Interview writeback 到 VisitPlan / Route B session 已有 no-provider proof；BFF-205 下一步應確認 Assistant/RAG 不會把 relationship graph inference 升格成 theater fact。
5. QA / compliance / release-proof：建議下一輪若選 BFF-205，先做 `BFF-205a RAG guarded-disabled + assistant/interview persistence hygiene proof`，跑 `pnpm ai:bff-audit`、`pnpm rag:launch-posture-qa`、`pnpm ai:protocol-registry-qa`，並用 targeted API proof 覆蓋 401/400/503/no fake usage。
6. NANDA / AgentFacts protocol：`asai.rag.private_beta` 必須維持 `sourceAdoption.status=adopted` 但 `launchPosture=disabled_guarded`；任何 public discovery、registry publication、cross-org agent access 或 provider-backed RAG retrieval 都需 operator 逐項批准。

Whole-product review fallback note（2026-06-21）：若 BFF-204a 被 env/session 阻擋，BFF-205a 是次順位安全切片；範圍限 RAG disabled_guarded posture 與 Assistant/Interview persistence hygiene，不得在同輪啟用 provider-backed retrieval、external registry publication、public discovery 或 cross-org agent access。

完成註記（2026-06-21 BFF-205a）：已完成 private-beta AI boundary proof。新增 `scripts/bff-ai-boundary-qa.mjs` 與 `pnpm bff:ai-boundary-qa`，聚合 `/api/rag` guarded-disabled proof、Assistant persistence/source-hygiene static proof、Interview quick-capture fact/inference/unknown/evidence proof、AI BFF audit 與 internal-only protocol registry QA。Proof 顯示 RAG 401/400/503、`providerAttempted=false`、RAG `AiUsageLog` 0 → 0；Interview quick-capture 401/201/409/404/no-provider/no raw private transcript、INTERVIEW usage aggregate 79 → 79，quick-capture run usage 150 → 150；Assistant repository/tool boundary 未保存 raw provider/tool payload、secret/token/cookie/private transcript。未啟用 provider-backed retrieval、external registry publication、public discovery 或 cross-org agent access，也未 stage 未追蹤 AI meeting / notes prototype。

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

- [x] Members/invites 套 max members/collaborators/seat limits。
- [x] Units 套 max units 與 hierarchy validation。
- [x] Settings writes 寫 `AuditLog`，保留 actor/resource/reason。
- [x] Manager read-only 或 limited-write policy 清楚。
- [x] API proof 覆蓋 forbidden、limit exceeded、audit created。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21）：已完成 BFF-302。`/api/org/units` 成功建立 unit 時改為 transaction 內同步寫 `AuditLog(resourceType=ORG_UNIT)`，metadata 僅含 unit type、parent、slug 與 plan usage snapshot，不保存私人客戶細節。新增 `pnpm bff:org-writes-qa`，proof 覆蓋 owner members/units/settings/invites 讀寫邊界、unscoped manager 對 org aggregate/settings/units/invites 403、unit max limit 403 且 no create、settings patch 產生 `ORG_SETTINGS` audit、invite create 產生 `ORG_INVITE` audit、collaborator cap 403 且 no membership increase、response 無 client/private sentinel，並串跑 `pnpm nav:route-guard-qa`。此卡未呼叫 provider、不改 Prisma schema；DB proof 僅新增/更新可辨識 demo/test org settings 與 invite evidence。

---

## Batch BFF-303 - Client Portal BFF Completion

目標：補齊 client portal token session lifecycle、response boundary 與 revocation proof。

- [x] Share token session 支援 expiry/rotation/revocation。
- [x] `/api/client-portal/bootstrap` 僅回 authorized report/client-safe sections。
- [x] `/api/client-portal/responses` payload whitelist，支援補資料、提問、預約意向。
- [x] 若新增附件 route，必須 size/type allowlist、signed URL、virus-scan strategy。
- [x] Client token 打 workspace/member/org/platform APIs 必須 401/403。
- [x] Browser/API proof 覆蓋 authorized/invalid/expired/revoked。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21）：已完成 BFF-303。`/api/reports/[id]/share` 透過 repository 支援 `ensure`、`rotate`、`revoke` 與 1-365 天到期設定；rotate/revoke 會讓現有 active share 過期並寫 `ShareEvent` audit label，revoke 後 report 回 `READY`。新增 `pnpm bff:client-portal-qa`，proof 覆蓋 missing session 401、authorized share/bootstrap 200、client-safe sections/private sentinel、client token 打 workspace/member/org/platform 401/403、response whitelist 與 unsafe metadata 不落 DB、invalid/expired/rotated-old/revoked token 404 或 401、rotate/revoke audit event、revoke 後 active shares=0。Browser proof 覆蓋 authorized share、client-login authorized、expired/invalid/revoked missing state、mobile no overflow；截圖在 `docs/06_audits-and-reports/screenshots/lv3-client-portal-bff/`。本輪未新增附件 route，故附件 size/type/signed URL/virus-scan gate 無新增攻擊面；未呼叫 provider、不改 Prisma schema、不做 production write，僅新增可辨識 demo/test report/share/portal response evidence。

---

## Batch BFF-304 - Platform BFF Completion

目標：完成 platform metadata/readiness/audit/break-glass surface。

Whole-product review note（2026-06-21 after BFF-303）：BFF-204/205/302/303 已分別補上 Theater/RAG/Assistant/Interview/org writes/client portal 的 launch boundary proof；下一個 full-site BFF 最高槓桿缺口轉為 platform surface。`BFF-304a` 下一輪應先做 platform session separation + metadata/audit proof：app session 打 platform APIs 必須 401/403，platform session 讀 organizations / AI usage / audit logs 只能回 metadata/aggregate，敏感讀必寫 `AuditLog` 並回 proof id，break-glass/impersonation 需要 reason/scope/expiry/actor/target。此 slice 不啟用 production impersonation、不做 production write、不接真 payment/email/notification；若 platform session/env 不可用，fallback 是 deterministic source/fixture proof，但不得宣稱 live platform auth matrix 完成。

- [x] Platform session 與 app session 分離 proof。
- [x] Organizations/AI usage/audit logs 預設 metadata/aggregate。
- [x] Impersonation/break-glass 必填 reason、scope、expiry、actor/target。
- [x] Sensitive read 每次寫 `AuditLog`，且 response 可回報 proof id。
- [x] Release readiness 聚合 auth、AI、billing、monitoring、backup、BFF gates。
- [x] API proof 覆蓋 app session rejected、platform success、break-glass audit。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21 BFF-304a）：已完成 platform BFF completion。新增 `pnpm bff:platform-qa` 聚合 proof，並補 `IMPERSONATED_READ` response-visible audit proof id 與 release-readiness `bff_surface_gates` / `bffGates` 投影。Proof 覆蓋 unauth/member/manager/client token 呼叫 `/api/platform/organizations` 皆 401/403、platform organizations/detail/AI usage/audit logs/release-readiness 200 且只回 metadata/aggregate、release-readiness 顯示 `platform_bff=pass` 且不 overclaim `billing_bff=blocked`、impersonation 缺 reason 400/expiry too long 403/start 201/read-proof 200 + `AuditLog` id、break-glass 缺 reason/risk 400/expiry too long 403/success 201 + `AuditLog` id、default/read/break-glass response private sentinel 0、`AiUsageLog` 150→150 unchanged。此卡未啟用 production impersonation、未做 real payment/email/notification、未呼叫 provider、不改 Prisma schema；僅新增可辨識 demo/test report/share/audit evidence。

---

## Batch BFF-305 - Public BFF Completion

目標：讓 public pages 的正式狀態由 public-safe BFF 控制。

Research-to-executable note（2026-06-21 after BFF-304a）：BFF-304a 已關閉 platform session / metadata / audit frontier；下一個 public-facing 缺口是 public pages 的狀態與 CTA 邏輯仍未形成單一 public-safe BFF truth。`BFF-305a` 應先補 `/api/public/status` 或等價 contract，讓 maintenance、AI availability、checkout availability、CTA posture、lead capture posture、legal/privacy status 由 server 回傳；`/api/public/pricing` 必須與 status/CTA 一致，landing/pricing 不得只靠 hardcoded frontend copy 判斷是否可試用/結帳。2026-06-21 operator 追加決策：lead capture 要一起做，但僅限 private beta lead persistence，不啟用真實付款/email/notification；lead endpoint 必須具 rate limit、honeypot/spam protection、consent version、allowlisted persistence、abuse/failure proof。

- [x] `/api/public/pricing` 補 cache/fallback policy 與 DB consistency proof。
- [x] 新增 `/api/public/status`，回 maintenance、checkout availability、AI availability。
- [x] 新增 `/api/public/lead` 或明確延後，若實作需 rate limit、spam protection、consent version。
- [x] Landing/pricing CTA 不以 hardcoded frontend copy 判斷 checkout availability。
- [x] Public BFF 不回 private plan cost、secret、provider raw config。
- [x] Browser/API proof 覆蓋 pricing/status/CTA。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21 BFF-305a status/CTA/lead capture）：已完成 Public BFF status / CTA / private-beta lead capture proof。新增 public-safe `GET /api/public/status`、shared public status repository、pricing/status shared checkout/CTA availability source、landing/pricing CTA data-bound contract、additive `PublicLead` schema、`POST /api/public/lead` 與 `pnpm public:status-qa`。Proof 覆蓋 status 200、pricing 200、public cache header、DB-backed `PlanConfig` consistency、checkout action disabled、production payment disabled、public lead capture enabled、consent validation 400、honeypot 202 且不入庫、valid lead 201 且 `public_leads` +1、same email third request 429、not-public-discovery registry posture、pricing/status CTA consistency、private sentinel 0、landing/pricing desktop/mobile no overflow、browser console error 0；截圖保存於 `docs/06_audits-and-reports/screenshots/lv3-public-bff/`。仍不啟用 real payment、real email、real notification、provider call 或 external registry publication；BFF-401/BFF-402 billing server-payload / notification/query/idempotency 仍待後續。

Whole-product review 註記（2026-06-23 runtime proof gate）：`pnpm lv3:cross-flow-no-provider-qa` 發現 public home 在 DB/DNS 不可達時會經 `src/lib/public/status-repository.ts` 的 `prisma.systemSettings.findUnique()` 回 Prisma `P1001 DatabaseNotReachable`，導致匿名 public flow 500，且 dev browser 同時看到 `/api/bff/notifications` 404。這不是 BFF-305a public status contract 的語意回歸，而是 runtime degraded-mode 與相鄰 notification BFF 對齊缺口；下一個 normal loop 應新增 source-backed `BFF-305b`，讓 public status 在 DB unavailable 時回 least-disclosure degraded contract，不宣稱 checkout/payment/provider 可用，並對齊 notification fetch endpoint，使 clean cross-flow proof 不因公共狀態讀取或 missing BFF route 起不來。

### Batch BFF-305a - Public Status And CTA Availability Proof

目標：把 public website / pricing / CTA / beta availability 變成 public-safe server contract，不再由前端硬編碼自行推論。

- [x] 建立 `GET /api/public/status` 或同等 BFF，匿名可讀，回 `maintenance`、`aiAvailability`、`checkoutAvailability`、`primaryCta`、`leadCapture`、`legalStatus`、`updatedAt`。
- [x] Status DTO 不含 private plan cost、provider raw config、billing internal state、payment transaction、tenant/client data、secret/token/raw provider payload。
- [x] `/api/public/pricing` 與 public status 共用 checkout / CTA availability source；public pricing 不再和 status 回傳矛盾。
- [x] Landing / pricing CTA 依 public BFF contract 顯示：private beta / invite / checkout disabled / contact sales / unavailable states。
- [x] Public lead endpoint 具 rate limit、honeypot/spam protection、consent version、safe allowlisted persistence 與 abuse/failure proof；不得新增裸寫入 endpoint。
- [x] Public status endpoint 不得混同 NANDA / third-party public discovery 或 external registry；agent publication、credential signing、cross-org agent access 仍回 NAP gate 與 operator approval。
- [x] API proof 覆蓋 status 200、pricing 200、CTA consistency、checkout disabled/sandbox posture、private sentinel 0。
- [x] Browser proof 覆蓋 landing/pricing desktop/mobile CTA 與 no overflow；不得宣稱 payment/email/notification production ready。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、targeted public BFF QA（新增或更新 `pnpm public:pricing-qa` / `pnpm public:status-qa`）。

### Batch BFF-305b - Public Status Degraded Fallback And Notification BFF Alignment

目標：讓匿名 public page / clean browser proof 在 development DB/DNS 暫時不可達時仍能得到 public-safe degraded contract，而不是直接 500；同時補齊 app shell 已呼叫但不存在的 notification BFF boundary。

- [x] `getPublicStatus()` 或等價 public status repository 在 Prisma `P1001` / DB unavailable 時回安全 degraded status：`maintenance`/`checkoutAvailability`/`aiAvailability`/`primaryCta`/`leadCapture`/`legalStatus` 仍完整，但不得宣稱 checkout、real payment、provider AI、lead persistence 或 production readiness 可用。
- [x] Degraded response 必須標示 `source` / `dbAvailable=false` / `degradedReason` 等 public-safe evidence，不回 DB host、connection string、secret、provider raw config、tenant/client/payment data。
- [x] `/api/public/pricing` 與 landing/pricing CTA 在 degraded status 下仍與 status 一致；pricing 不得覆蓋 status 的 disabled/unavailable posture。
- [x] 對齊 `/api/bff/notifications` 或呼叫方 endpoint，讓 dashboard/top-bar/notification hub 不再在 clean proof 中打到 404；若為 disabled/no-notification posture，需回 public/member-safe empty DTO，不得 fake real notification delivery。
- [x] 新增或更新 targeted QA，覆蓋 DB unavailable fallback、status/pricing CTA consistency、notification route no 404、private sentinel 0、no provider/no fake `AiUsageLog`。
- [x] 重跑 `pnpm lv3:cross-flow-no-provider-qa` 或等價 cross-flow proof；若只剩 live DB/browser residual evidence，可依使用者偏好提供使用者自跑 command，但不能把 fallback source behavior 未驗收寫成通過。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-23 BFF-305b degraded fallback / notification alignment）：已完成 public status DB-unavailable fail-closed fallback、public pricing fallback plan consistency、`/api/bff/notifications` disabled/no-delivery DTO 與 `pnpm public:status-degraded-qa`。Proof 使用 invalid DB URL 啟動 dev server，驗證 `/api/public/status` 200 且 `source=degraded_local`、`dbAvailable=false`、`degradedReason=database_unavailable`、checkout/payment/AI/lead persistence disabled；`/api/public/pricing` 200 且 fallback plans/CTA 與 degraded status 一致；`/api/bff/notifications` 200 且 `realNotificationSent=false`、`triggersExternalNotification=false`；landing/pricing page 在 DB unavailable 下皆不 500、private sentinel 0。此結果不代表 production DB outage policy、real notification delivery、real payment、provider AI availability 或 external NANDA publication 已啟用。

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

### Batch BFF-401a - Checkout Disabled/Sandbox Server-Payload Proof

目標：先建立 server-owned checkout BFF contract，證明 production payment 尚未 proof-ready 時 fail closed；不啟用真付款、不寫 pending order、不做 notification/query/idempotency。

- [x] 建立 `POST /api/billing/checkout`，必須 current member session。
- [x] Server 驗證 self-serve paid plan；不得信任 client amount、organizationId、ownerId 或 payment provider payload。
- [x] Production payment proof 未完成時回 503 disabled posture，且 `orderCreated=false`、`transactionCreated=false`、`providerAttempted=false`。
- [x] Response 不回 HashKey、HashIV、CheckMacValue、provider raw payload、payment token、card data、raw payment data 或 browser-generated checksum。
- [x] API/DB proof 覆蓋 unauth 401、invalid plan 400、disabled 503、subscription order/payment transaction count unchanged、private/payment sentinel 0。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm billing:checkout-qa`。

完成註記（2026-06-21 BFF-401a checkout disabled/sandbox server-payload proof）：已新增 `POST /api/billing/checkout`、versioned checkout disabled DTO、server-side repository 與 `pnpm billing:checkout-qa`。Proof 覆蓋 unauth 401、non-self-serve plan 400、PRO checkout 503 disabled、no-store/request-id、no provider attempt、no redirect payload、no order/transaction insert、browser checksum generation 不允許、redirect-only activation 不允許、HashKey/HashIV/CheckMacValue/provider raw payload/card/payment token/private env sentinel 0。此切片不啟用 real payment、real email、real notification、不產生 ECPay signed payload、不寫 pending order；BFF-402 notification/query/idempotency 與真正 sandbox/production checkout 仍待後續 proof。

---

### Batch BFF-402a - Visit Reminder Notification Disabled Boundary

目標：先移除 production-facing visit reminder mock success，建立 authenticated、no-delivery、no-provider 的通知邊界；不啟用真 email、真 notification、job queue 或 provider。

- [x] `/api/notifications/visit-reminder` 不再回 `success: true` 或「Reminder email sent successfully」類 fake delivery 文案。
- [x] Route 需驗證 input 並要求 current member session；unauth 401、invalid payload 400。
- [x] Authenticated 且 DB 可用時回 503 disabled posture，DTO 明確 `providerAttempted=false`、`jobQueued=false`、`realEmailSent=false`、`realNotificationSent=false`、`mockSuccess=false`。
- [x] Auth DB 不可達時 fail closed 為 `VISIT_REMINDER_AUTH_UNAVAILABLE`，仍 `providerAttempted=false`，不得嘗試 real delivery。
- [x] Response 不 echo `agentEmail`、不暴露 raw cookie/secret/token/provider payload/private transcript/payment data。
- [x] Targeted QA `pnpm notification:visit-reminder-disabled-qa` 覆蓋 source boundary、401/400、DB-unavailable 503 fail-closed、private sentinel 0；DB 可達後可由 operator 重跑同一 command 驗 authenticated disabled DTO。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-23 BFF-402a visit reminder disabled boundary）：已將 `/api/notifications/visit-reminder` 從 mock email success 改為 shared validation + current-member auth + versioned disabled/no-delivery DTO；新增 DB-unavailable fail-closed fallback 與 `pnpm notification:visit-reminder-disabled-qa`。Proof 在目前 Supabase DB host `P1001 DatabaseNotReachable` 下通過 source/static、unauth 401、invalid 400、auth DB-unavailable 503、no-store/request-id、providerAttempted=false、private sentinel 0；同一 QA command 可於 DB 可達時驗 authenticated disabled DTO。此切片不啟用 real email、real notification、job queue、provider call、fake `AiUsageLog` 或 payment notification/query/idempotency；完整 BFF-402 ECPay notify/query/idempotency 仍待後續。

---

### Batch BFF-402b - ECPay Notify/Query Disabled Skeleton

目標：先建立 ECPay callback/query 的 server-owned fail-closed contract，避免 payment callback 或 query 被 UI/redirect 誤當成功；不啟用真 ECPay credentials、不產生或驗證真 CheckMacValue、不寫 transaction ledger、不啟用 plan。

- [x] 建立 `POST /api/billing/ecpay/notify`，支援 JSON 與 `application/x-www-form-urlencoded` notification payload parsing；invalid payload 回 400。
- [x] Notify 在 provider/env proof 未完成時回 503 disabled posture，明確 `providerAttempted=false`、`checkMacValueVerified=false`、`ledgerWriteAttempted=false`、`transactionCreated=false`、`orderUpdated=false`、`activation.allowed=false`。
- [x] 建立 `POST /api/billing/ecpay/query` server-owned confirmation skeleton；invalid payload 400、unauth 401，DB auth 不可達時 fail closed 為 `BILLING_ECPAY_AUTH_UNAVAILABLE` 且 `providerAttempted=false`。
- [x] DTO 不回 HashKey、HashIV、raw CheckMacValue、provider raw payload、payment token、card data、raw payment data、secret/token/cookie/OTP；也不儲存 raw provider payload。
- [x] Targeted QA `pnpm billing:ecpay-disabled-qa` 覆蓋 source boundary、notify 400/503、duplicate notify disabled idempotency posture、query 400/401、DB-unavailable 503 fail-closed、private/payment sentinel 0。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-23 BFF-402b ECPay notify/query disabled skeleton）：已新增 `src/domains/subscription/ecpay.ts`、`POST /api/billing/ecpay/notify`、`POST /api/billing/ecpay/query` 與 `pnpm billing:ecpay-disabled-qa`。Proof 通過 57/57 checks：source static boundary、notify invalid 400、notify form payload 503 disabled、duplicate notify 503 disabled 且 duplicate-safe/no ledger write/no transaction/no activation、query invalid 400、query unauth 401、目前 DB `P1001 DatabaseNotReachable` 下 authenticated query fail closed 為 `BILLING_ECPAY_AUTH_UNAVAILABLE`、response no-store/request-id、payment/private sentinel 0。此結果不代表真 CheckMacValue 驗證、ECPay server query、transaction ledger persistence、refund/void/manual review 或 production payment enablement 已完成。

---

### Batch BFF-402d - Transaction Ledger Idempotency Contract

目標：先把 ECPay notify/query 與 plan-change activation 共同依賴的 transaction ledger idempotency 規則落成 typed source contract；不啟用真 provider call、不寫 `PaymentTransaction`、不啟用 plan、不做 refund/void/destructive payment action。

- [x] 新增 shared `BillingLedgerIdempotencyContractDto`，明確 `organizationId + provider + merchantTradeNo` 唯一 scope、server-owned upsert target、duplicate notification 不重複啟用計畫。
- [x] `POST /api/billing/ecpay/notify` 的 disabled DTO 內含 ledger contract，duplicate notify response 可驗 `dbWriteAttempted=false`、`duplicateWritePrevented=true`、`organizationPlanUpdated=false`、`providerRawPayloadStored=false`。
- [x] `POST /api/billing/ecpay/query` 的 disabled DTO 內含同一 ledger contract；DB auth 不可達時仍 fail closed，不呼叫 provider。
- [x] `POST /api/billing/plan-change` 的 disabled DTO 明確引用 `asai.billing.ledger_idempotency.v1`、ledger scope 與啟用前允許的 ledger status `PAID` / `QUERY_CONFIRMED`。
- [x] Targeted QA `pnpm billing:ledger-idempotency-qa`、`pnpm billing:plan-change-boundary-qa`、`BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3061 pnpm billing:ecpay-disabled-qa` 通過。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-23 BFF-402d transaction ledger idempotency contract）：已新增 `src/domains/subscription/ledger.ts` 與 `pnpm billing:ledger-idempotency-qa`，並讓 ECPay notify/query disabled DTO 與 plan-change disabled DTO 指向同一個 ledger idempotency contract。Proof：`pnpm billing:ledger-idempotency-qa` 通過 static source gate；`pnpm billing:plan-change-boundary-qa` 通過 source gate；`BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3061 pnpm billing:ecpay-disabled-qa` 通過 73/73 checks，覆蓋 duplicate notify response 內的 ledger contract、no DB write/no activation/no raw provider payload/no provider call。此結果不代表已完成真正 `PaymentTransaction` persistence/upsert、CheckMacValue 驗證、ECPay server query confirmation、confirmed transaction/query activation、refund/void/manual review 或 production payment enablement。

---

### Batch BFF-402e - Server-only CheckMacValue Validation Boundary

目標：先把 ECPay notification 的 CheckMacValue canonicalization / verification 落到 server-only domain contract；可使用 server env 進行 checksum 驗證，但仍不啟用真付款、不呼叫 provider query、不寫 transaction ledger、不啟用 plan。

- [x] 新增 `asai.billing.ecpay.checkmac.v1` contract，依 ECPay All-In-One SHA256 規則排除 `CheckMacValue`、A-Z 排序、前後加 `HashKey` / `HashIV`、URL encode + lowercase + SHA256 uppercase。
- [x] `POST /api/billing/ecpay/notify` 只在 server route 讀取 `ECPAY_HASH_KEY` / `ECPAY_HASH_IV`；DTO 不回 HashKey、HashIV、raw CheckMacValue，也不允許 browser 產生 checksum。
- [x] Notify valid checksum 可回 `checkMacValueVerified=true` 與 `checkMacValidation.status=verified`，tampered checksum 回 `status=invalid`；兩者仍維持 503 guarded-disabled、no provider call、no ledger write、no transaction/order update、no plan activation。
- [x] Targeted QA `pnpm billing:ecpay-checkmac-qa`、`BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3062 pnpm billing:ecpay-disabled-qa`、`pnpm billing:ledger-idempotency-qa` 通過。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-23 BFF-402e server-only CheckMacValue validation boundary）：新增 `src/domains/subscription/ecpay-checkmac.ts`、`pnpm billing:ecpay-checkmac-qa`，並讓 notify route server-side 讀 env 後注入 `buildDisabledEcpayNotifyDto()`。Proof：`pnpm billing:ecpay-checkmac-qa` 通過 static + deterministic fixture；`BILLING_ECPAY_DISABLED_QA_BASE_URL=http://127.0.0.1:3062 pnpm billing:ecpay-disabled-qa` 通過 99/99 checks，覆蓋 valid checksum verified、duplicate valid checksum verified、tampered checksum invalid、response/payment/private sentinel 0、no raw checksum/HashKey/HashIV echo、no DB write/no provider/no activation；`pnpm billing:ledger-idempotency-qa` 仍通過。此結果不代表 ECPay server query confirmation、真正 `PaymentTransaction` persistence/upsert、confirmed transaction/query activation、refund/void/manual review 或 production payment enablement 已完成。

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

- [x] 建立 `/api/billing/subscription` 或 `/api/org/billing`。
- [x] DTO 包含 current plan、capability、quota、seat/collaborator/unit usage、checkout status。
- [x] Plan activation 只由 confirmed transaction/query 控制。
- [x] Workspace bootstrap 與 org/member UI 使用 server capability，不使用 hardcoded plan assumptions。（2026-06-23 BFF-403b 已讓 workspace bootstrap、dashboard layout、workspace navigation/render model 與 RoleAwareSidebar 消費 `BillingSubscriptionCapabilityDto`，並保留 session fallback source 標記。）
- [ ] API/browser proof 覆蓋 plan change persistence。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Evidence（2026-06-23 BFF-403a）：新增 read-only `GET /api/billing/subscription`、`BillingSubscriptionCapabilityDto` 與 workspace bootstrap `subscription` contract。`BILLING_SUBSCRIPTION_QA_BASE_URL=http://127.0.0.1:3058 pnpm billing:subscription-capability-qa` 已通過 source/API guarded proof：unauth 401、shared auth error/no-store/request-id、目前 DB `P1001 DatabaseNotReachable` 下 authenticated request fail-closed 為 503 `BILLING_SUBSCRIPTION_UNAVAILABLE` 且 `providerAttempted=false`、payment/private sentinel 0、repository 只有 read/count，沒有 subscription order/payment transaction write，也沒有 ECPay/OpenAI/Anthropic provider call。此 evidence 不代表 org/member UI 已改用 subscription DTO，也不代表 real plan change persistence、confirmed transaction/query activation、ledger idempotency 或 production payment enablement 已完成。

Whole-product review note（2026-06-23 after BFF-403a）：下一個 normal loop 應選 source-backed `BFF-403b subscription capability UI consumption`，不要再以 docs-only evidence 或單純重跑 BFF-403a authenticated 200 當本輪成果。範圍是讓 org/member UI、workspace navigation/render model、settings/team/billing 相鄰介面消費 workspace bootstrap 或 `/api/billing/subscription` 的 versioned `subscription` DTO，而不是 browser hardcoded plan assumptions 或只讀 `session.planCapability`。Proof 至少要證明 unavailable/read-only/no-provider/no-payment/no-activation 邊界、private/payment sentinel 0、無 subscription order/payment transaction/ledger write、desktop/mobile 或 static render 不破；real plan-change persistence、confirmed transaction/query activation、ledger idempotency 與 production ECPay env/callback 仍留在 BFF-402/403 後續子切片。

Evidence（2026-06-23 BFF-403b）：完成 source-backed subscription capability UI consumption slice。`src/app/(dashboard)/layout.tsx` 會 server-side 讀取 `buildBillingSubscriptionCapability()` 並把 DTO 注入 member/orgAdmin sidebar render model；若 subscription read 不可用，render model 明確降級為 `session_plan_capability_fallback`，不把 fallback 偽裝成正式 DTO。`src/app/api/workspace/bootstrap/route.ts` 也把同一 `subscription` 傳入 `buildWorkspaceBootstrapNavigation()`；`src/lib/navigation/workspace-sidebar.ts` 新增 `WorkspaceSubscriptionBoundary`，由 DTO 推導 plan capability、AI/seat/collaborator/unit usage、checkout disabled、activation boundary 與 no-provider/no-db-write safety；`RoleAwareSidebar` 底部顯示 compact subscription boundary 並暴露 `data-subscription-source`、`data-checkout-status`、`data-browser-plan-assumptions-allowed` 等可測試 hook。Proof：`pnpm billing:subscription-ui-qa`、`pnpm nav:sidebar-ui-qa`、`pnpm nav:sidebar-renderer-contract-qa` 通過；無 ECPay/OpenAI/Anthropic provider call、無 subscription order/payment transaction/ledger write、無 fake `AiUsageLog`、無 browser/localStorage plan assumption。Real plan-change persistence、confirmed transaction/query activation、ledger idempotency 與 production ECPay env/callback 仍未完成。

---

## Batch BFF-404 - Release Readiness BFF Gate

目標：建立 full-site BFF 上線 gate，讓 production readiness 可被機器與人共同檢查。

- [ ] `/api/platform/release-readiness` 納入 BFF inventory、AI usage audit、billing proof、cross-role sentinel、monitoring、backup/rollback。
- [ ] 新增 `pnpm bff:release-readiness-qa` 或整合既有 full smoke。
- [ ] Full smoke 覆蓋 public、member、org、client portal、platform。
- [ ] Report 註明剩餘 blockers，不把 mock success 寫成 production success。
- [ ] 更新 `AGENTS.md`、`PLN-019`、必要 report / issue-question。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Browser QA。

Whole-product review note（2026-06-23 after BFF-402e/BFF-403b）：下一個 normal loop 應選 source-backed `BFF-404a release readiness BFF gate projection`，不要再以 docs-only evidence、重跑 billing scripts、或單一 payment blocked note 當本輪成果。範圍是把既有 `/api/platform/release-readiness` 的 `bffGates.billing_bff` 從粗粒度 `warning/blocked` 改成可審計的分項 gate：checkout disabled contract、ECPay notify disabled skeleton、server-only CheckMacValue boundary、ledger idempotency contract、subscription UI consumption、query confirmation、`PaymentTransaction` persistence/upsert、confirmed activation、refund/void/manual review。已完成的 guarded-disabled/source proof 可以標示 pass/warning；query、transaction persistence、activation、refund/void 與 production env/callback 必須保持 blocked/operator gap。Proof 至少要新增或整合 `pnpm bff:release-readiness-qa`，驗證 platform-only 讀取、private/payment sentinel 0、BFF subgate statuses、no provider call、no DB write、no fake `AiUsageLog`、以及 release-readiness 不宣稱 public launch ready。

### Batch BFF-404a - Release Readiness BFF Gate Projection

- [x] `/api/platform/release-readiness` 的 `bffGates` 回傳 billing subgates，分辨已 proof 的 guarded-disabled/source boundary 與仍 blocked 的 provider/DB/operator gap。
- [x] Billing subgates 至少包含 checkout disabled、notify disabled skeleton、checksum boundary、ledger idempotency contract、subscription UI consumption、query confirmation、payment transaction persistence、confirmed activation、production env/callback、refund/void/manual review。
- [x] `bff_surface_gates` control detail 不只計算 script 是否存在，也能說明 billing lifecycle 哪些子門檻仍 blocked。
- [x] 新增 `pnpm bff:release-readiness-qa` 或更新既有 release-readiness QA，覆蓋 platform-only source boundary、required BFF subgates、private/payment sentinel 0、no provider/no DB write/no fake usage posture。
- [x] Report 明確寫出此切片不是 production payment enablement，不做真 payment、email、notification、refund/void、provider call 或 external registry publication。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；必要時補 `pnpm demo:release-readiness-qa` 由 operator 自行重跑的 handoff command。

Evidence（2026-06-23 BFF-404a）：`src/lib/platform/platform-release-readiness-repository.ts` 新增 `billingBffSubgates()` / `billingBffGate()`，`bffGates.billing_bff` 仍為 blocked，但回傳 checkout disabled、ECPay notify/query disabled skeleton、server-only checksum boundary、ledger idempotency contract、subscription UI consumption、ECPay server query confirmation、PaymentTransaction persistence、confirmed activation、production payment env/callback、refund/void/manual review 等子門檻。前五項依既有 proof script/source 可 pass；query、transaction persistence、activation、production env/callback、refund/void 仍 blocked。新增 `pnpm bff:release-readiness-qa` 驗證 platform route guard source、required subgates、package script、owner docs/acceptance、no provider call、no DB mutation、no fake `AiUsageLog`、no raw payment/private/provider sentinel；`pnpm bff:release-readiness-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 通過。Full browser/platform smoke 可由 operator 於 dev server 可用時自行重跑 `DEMO_QA_BASE_URL=http://localhost:3000 pnpm demo:release-readiness-qa`，但此 residual smoke 不取代 BFF-404a source proof。

---

## Current BFF Blockers

- ECPay production credentials、callback domain、server query proof、`PaymentTransaction` persistence/upsert、confirmed transaction/query activation、refund/void/manual review 仍需後續 implementation/proof；refund/void/destructive payment action 仍需逐項 explicit approval。
- Production auth provider/email/SSO、platform MFA、client-user OTP 仍需 operator/product 決策。
- Existing realtime voice workstream 已占用 `ARC-007/PLN-018/ACC-010`，本 BFF workstream 使用 `ARC-008/PLN-019/ACC-011`。
- 若 BFF tasks 改 route/layout/server action/cookies/session 行為，先讀 `node_modules/next/dist/docs/` 對應 Next.js 版本文件。
- Production DB destructive operation、drop/reset/delete remote data 仍需明確 approval。
