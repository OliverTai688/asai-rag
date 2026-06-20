# AUD-006 Full-site BFF Data Source Inventory v1.0

> 建立日期：2026-06-20  
> 狀態：BFF-001 baseline complete; BFF-101 member dashboard BFF complete; BFF-105 reports/share BFF complete; BFF-106 issues BFF complete; BFF-301 org aggregate BFF complete
> 對應計畫：`docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md`  
> 驗收依據：`docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md`

本文件盤點誠問 AI production-facing runtime 的 business data source，目標是把後續 BFF 卡片的責任邊界固定下來。盤點不改業務邏輯、不重寫 route、不呼叫 provider、不執行 DB write；它只建立「哪一個 surface 應該由哪一條 BFF 負責，以及哪裡仍在使用 mock/local truth」的可驗收基線。

## Classification Legend

| 分類 | 定義 | LV3 風險 |
| --- | --- | --- |
| DB/BFF ready | UI 主要透過 authenticated BFF 或 public/client BFF 取得 server-owned DTO，Zustand 只作 cache/UI state。 | 可作 LV3 proof 來源。 |
| Partial BFF / mixed | 有 BFF read/write，但同頁或鄰近 action 仍混用 local store、static fixture、mock route 或 browser-generated business object。 | Proof 必須明確標註哪些資料是 server-owned。 |
| Local/Zustand truth | business record 仍可由 domain store seed 或 local mutation 建立/更新。 | 不可作正式 launch proof。 |
| Static fixture/mock | Page/component 直接使用 `MOCK_*`、`seed-fixtures.ts`、`mocks.ts` 或 mock API。 | 必須由後續 BFF 卡清除或限制成 dev/demo-only。 |
| UI-only browser state | localStorage/sessionStorage 只保存 UI 展開、quickstart、connect flag 等非 business truth。 | 可接受，但需被 audit 註明。 |

## Executive Summary

- **可作 LV3 server-owned proof 的核心鏈路**：`/crm` client list/detail、`/crm/[clientId]/relationships` relationship graph review、`/pre-visit` list/detail/notes/create/update、`/dashboard` member decision center、`/issues` issue readiness、`/team` org aggregate coaching dashboard、`/theater/build` client/visit handoff、Route B `/theater/[sessionId]` persisted session and advisor turns、public `/share/[token]`、client portal、org/platform/settings/pricing APIs。
- **最高優先 BFF 缺口**：BFF-101/BFF-106/BFF-301 後，member-facing `/dashboard`、`/issues` 與 org-facing `/team` 已有 server-owned BFF proof；下一批最高風險轉為 SPIN mock outline fallback、admin/pilot demo seed、notification mock success 與剩餘 CRM related-list/archive/update cleanup。
- **明確 static/mock blockers**：`src/app/(admin)/admin/page.tsx` 與 `src/app/(dashboard)/pilot/page.tsx` 的 `@/domains/demo/seed-fixtures`。`/issues` 的 `MOCK_ISSUES` 已由 BFF-106 移除；`/team` 的 `MOCK_TEAM_MEMBERS` 已由 BFF-301 移除。
- **local truth baseline**：`src/domains/client/store.ts`、`src/domains/event/store.ts`、`src/domains/report/store.ts`、`src/domains/visit/store.ts`、`src/domains/spin/store.ts` 仍從 demo seed 初始化；其中 visit/client 已有 BFF path，但 store seed 仍需保留為 cache fallback 或 demo-only 並逐步清除 production dependency。
- **browser storage baseline**：`src/domains/assistant/store.ts` 僅 persist `isPanelOpen`，`src/components/demo/dashboard-welcome-card.tsx` 僅保存 quickstart UI 狀態；`src/domains/calendar/store.ts` persist Google connected flag，但 events 仍有 local seed，需列入 future calendar BFF。
- **mock route baseline**：`src/app/api/mock/*` 由 `blockMockApiInProduction()` guard 管理；`src/app/(dashboard)/spin/[sessionId]/page.tsx` 仍會呼叫 `/api/mock/ai/spin-outline` 作 outline fallback，需在 BFF-203 或 SPIN hardening 中移除 production dependency。
- **notification blocker**：`src/app/api/notifications/visit-reminder/route.ts` 是 mock email path，會 console log 並回 success；不得當 production notification proof。

## Responsibility Matrix

| Surface | UI route / component | Current source classification | Required / existing BFF endpoint | Session type | DTO / owner | Read / write owner | Audit / usage / event | QA script / status | Blocker / next card |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Member workspace bootstrap | Dashboard shell, global nav | DB/BFF ready for bootstrap | `GET /api/workspace/bootstrap` | member | Workspace bootstrap DTO | server session | no-store private data | existing route proof | Keep as shared dependency for BFF-101/102/301. |
| Dashboard decision center | `/dashboard` | DB/BFF ready | `GET /api/member/dashboard` | member | `MemberDashboardDto` with today line, KPI, tasks, recent activity, agenda, AI quota | server aggregate from current member scope | no-store private data; no provider call | `pnpm bff:dashboard-qa` | BFF-101 complete. Quickstart welcome card keeps UI-only demo state; future calendar BFF can replace local calendar store. |
| CRM list | `/crm` | DB/BFF ready with cache | `GET/POST /api/clients` | member | `Client` DTO retaining compliance fields | server session | client write events in repository path | existing client QA | BFF-103 still needs archive/update and store cleanup. |
| CRM detail | `/crm/[clientId]` | DB/BFF ready with cache | `GET /api/clients/[id]` | member | `Client` detail DTO | server session | no private fields beyond member scope | existing client QA | BFF-103. |
| Relationship graph | `/crm/[clientId]/relationships` | DB/BFF ready for review; partial writes complete | `GET /api/clients/[id]/relationship-graph`, `PATCH/DELETE /api/clients/[id]/family-members/[memberId]` | member | relationship graph review DTO, family write DTO | server session | write proof through client repository | `pnpm client:relationship-graph-qa`, `pnpm client:relationship-graph-write-qa` | BFF-103 needs parentMemberId persistence and related subresources. |
| CRM policies | `/crm/[clientId]/policies` | Partial BFF / mixed | `POST /api/clients/[id]/policies` exists; list/detail BFF partial | member | policy DTO must keep compliance checklist / KYC / sensitivity | server session | policy write audit needed | pending | BFF-103. |
| CRM timeline | `/crm/[clientId]/timeline` | Partial BFF / local event source | missing related-list BFF | member | interaction/timeline DTO | server session | interaction event source required | pending | BFF-103. |
| CRM reports subpage | `/crm/[clientId]/reports` | DB/BFF ready for deterministic report storage; mixed for AI generation route | `GET /api/reports?clientId=...`, `POST /api/reports`, `/api/ai/report` exists | member | client report list/action DTO | server session | BFF report writes/share events audited; AI generation must write `AiUsageLog` | `pnpm bff:reports-qa`; AI route covered by `pnpm demo:ai-generation-qa` | BFF-105 complete; BFF-202 keeps `/api/ai/report` hardening/audit coverage. |
| Gap analysis | `/crm/[clientId]/gap-analysis` | Mixed | missing gap-analysis related-list BFF | member | facts/inferences/unknowns recommendation DTO | server session | inference labels required | pending | BFF-103 or BFF-106-like recommendation BFF. |
| Pre-visit list/create | `/pre-visit` | DB/BFF ready | `GET/POST /api/visits` | member | VisitPlan list/create DTO | server session | no provider call in CRUD path | `pnpm visit:bff-qa` | Complete for BFF-104; keep `/api/ai/visit` separate. |
| Pre-visit detail | `/pre-visit/[planId]` | DB/BFF ready | `GET/PATCH /api/visits/[id]`, `POST /api/visits/[id]/theater-handoff` | member | preparation package, checklist, reasoning evidence, notes | server session | no raw prompt/provider payload | `pnpm visit:bff-qa` | Complete for BFF-104; provider generation hardening in BFF-202. |
| Pre-visit notes | `/pre-visit/[planId]/notes` | DB/BFF ready | `PATCH /api/visits/[id]` | member | notes/materials DTO | server session | no raw private transcript | `pnpm visit:bff-qa` | Complete for BFF-104. |
| Theater setup | `/theater` | Mixed | `POST /api/theater/client-builds`, `GET /api/theater/client-builds/[clientId]`, local legacy store | member | client build review, source review, stage draft | server for Route B; local for legacy setup | high-sensitivity gate writes interaction event | `pnpm theater:client-build-qa`, `pnpm visit:theater-gate-qa` | BFF-204 and ITA Route B provider runtime. |
| Theater build | `/theater/build` | DB/BFF ready for Route B handoff | `POST /api/theater/route-b/sessions` | member | Route B persisted session DTO | server session | session create rows; no provider usage | `pnpm theater:route-b-session-ui-qa` | Provider orchestration still guarded-disabled. |
| Theater session | `/theater/[sessionId]` | DB/BFF ready for persisted session and advisor turns; mixed for AI replies | `GET /api/theater/route-b/sessions/[id]`, `POST /api/theater/route-b/sessions/[id]/turns`, `POST /api/theater/route-b/runtime` | member | Route B session, character, turn, state patch proposal DTO | server session | no provider call unless flag and `AiUsageLog` success/error | `pnpm theater:route-b-interaction-qa` | ITA-003f blocked until provider/cost approval. |
| Legacy theater AI | legacy `/api/ai/theater`, `/api/ai/theater/score` | Mixed / legacy | existing AI routes | member/session | legacy persona/score DTO | route-specific | must keep legacy contract and write `AiUsageLog` on provider call | `pnpm ai:usage-audit` | BFF-204; do not change enum outside approved ITA. |
| SPIN list/session | `/spin`, `/spin/[sessionId]` | Local/Zustand truth with AI routes | `/api/ai/spin`, `/api/ai/spin-suggestions`, mock outline fallback | member/session | SPIN state machine DTO | currently local session store | provider calls must write `AiUsageLog` | pending SPIN hardening | BFF-203; preserve `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF`. |
| Interview workspace | `/interview` | DB/BFF ready for persisted interview; mixed for voice provider | `/api/ai/interview/sessions`, `/turns`, `/reflections`, `/plans`, `/writebacks`, realtime routes | member | Interview session/turn/memory/reflection/writeback DTO | server session | provider session marker / `AiUsageLog` rules already audited | `pnpm interview:cross-mode-qa` | Live realtime provider proof still requires approval. |
| Reports library | `/reports` | DB/BFF ready with cache; quickstart local branch | `GET/POST /api/reports` | member | report library DTO | server session | report create/update via repository; no provider call in CRUD path | `pnpm bff:reports-qa` | BFF-105 complete. Blank/orphan report create is intentionally blocked because `Report.clientId` is required. |
| Report detail/share | `/reports/[reportId]` | DB/BFF ready with cache; quickstart local branch | `GET/PATCH /api/reports/[id]`, `POST /api/reports/[id]/share` | member | member edit DTO plus client-safe sections | server session | share action creates/reuses `ReportShare` and writes sanitized `ShareEvent` | `pnpm bff:reports-qa` | BFF-105 complete. Public preview stays separate through `/api/share/[token]`. |
| Public shared report | `/share/[token]` | DB/BFF ready | `GET /api/share/[token]`, `POST /api/share/[token]/events` | public token | public report DTO | token-scoped server route | share view events | `pnpm share:token-qa` | Keep separate from member report detail DTO. |
| Issues | `/issues` | DB/BFF ready | `GET /api/issues`, `PATCH /api/issues/[id]` | member | issue/recommendation DTO with facts/inferences/unknowns/internal readiness/next action | server session | status/action writes `AuditLog(resourceType=ISSUE)` | `pnpm bff:issues-qa` | BFF-106 complete. Keep internal readiness out of public report/share DTOs. |
| Team page | `/team` | DB/BFF ready | server page uses `getOrgTeamDashboardForSession`; API islands `/api/org/overview`, `/api/org/coaching`, `/api/org/ai-usage` | org manager/member | `OrgTeamDashboardDto` / org aggregate DTOs | server session / role aware | org aggregate must not leak client detail/private transcript | `pnpm bff:org-aggregate-qa` | BFF-301 complete. |
| Org settings/admin | `/team/settings`, org admin surfaces | DB/BFF ready partial | `/api/org/settings`, `/api/org/members`, `/api/org/units`, `/api/org/invites`, `/api/org/overview`, `/api/org/coaching`, `/api/org/ai-usage` | org manager | org aggregate DTO | server session | audit for writes | existing org QA scripts plus `pnpm bff:org-aggregate-qa` | BFF-301 complete for aggregate reads; BFF-302 handles writes/capability. |
| Platform admin | `/(admin)/admin`, `/platform` APIs | Mixed | `/api/platform/*`; admin page still demo seed | platform/admin | platform DTO | server session for API; page seed for demo metrics | platform audit logs required | existing platform QA scripts | BFF-304. Current `src/app/(admin)/admin/page.tsx` imports `seed-fixtures`. |
| Pilot/onboarding | `/pilot` | Static fixture/demo seed | no production BFF required unless pilot is promoted | public/member onboarding | demo-only DTO | demo only | none | pending | Mark demo-only or build pilot BFF before production use. Current `src/app/(dashboard)/pilot/page.tsx` imports `seed-fixtures`. |
| Public pricing | `/pricing`, signup pricing | DB/BFF ready | `GET /api/public/pricing` | public | plan/pricing DTO | public server route | no private cost/provider config | `pnpm public:pricing-qa` | BFF-305. |
| Client portal | `/client-login`, portal responses | DB/BFF ready | `/api/client-portal/bootstrap`, `/api/client-portal/session`, `/api/client-portal/responses` | client token | client-safe DTO | token-scoped server route | response write event | `pnpm client-portal:qa` | BFF-303. |
| Notifications | reminder API | Static/mock route | `POST /api/notifications/visit-reminder` currently mock | system/cron/member | notification job DTO | should be server job with provider guard | real email requires explicit approval | pending | Replace or disable before production; current route logs and returns success. |
| Mock API routes | `src/app/api/mock/*` | Mock API guarded | `blockMockApiInProduction()` | dev/demo only | mock DTO | none | no provider usage | `pnpm mock:production-guard-qa` | Keep blocked in production. |
| Global assistant / search | assistant panel/search components | Mixed cache source | `/api/ai/chat`, `/api/rag`; local stores for search context | member | assistant DTO and searchable references | provider route + local cache | provider `AiUsageLog` required | `pnpm ai:usage-audit`, `pnpm rag:launch-posture-qa` | BFF-205. |
| Calendar | calendar store/surfaces | Local/Zustand truth | missing calendar BFF | member | calendar event DTO | should be member/calendar integration | integration audit needed | pending | Future calendar BFF; `calendar/store.ts` seeds events and persists connect flag. |

## Mock / Local Truth Baseline

The following paths are known production-facing or production-adjacent risk points. They are not newly introduced by BFF-001; they are the baseline that later cards must reduce.

| Path | Pattern | Classification | Required follow-up |
| --- | --- | --- | --- |
| `src/app/(dashboard)/issues/page.tsx` | resolved: no `MOCK_ISSUES`; server page reads issues repository | DB/BFF ready | BFF-106 complete; keep `pnpm bff:issues-qa` in release proof. |
| `src/app/(dashboard)/team/team-page-client.tsx` | resolved: no `MOCK_TEAM_MEMBERS`; server page passes `OrgTeamDashboardDto` | DB/BFF ready | BFF-301 complete; keep `pnpm bff:org-aggregate-qa` in release proof. |
| `src/app/(admin)/admin/page.tsx` | `@/domains/demo/seed-fixtures` | Static fixture/demo seed | BFF-304 or explicit demo-only guard. |
| `src/app/(dashboard)/pilot/page.tsx` | `@/domains/demo/seed-fixtures` | Static fixture/demo seed | Explicit demo-only posture or pilot BFF. |
| `src/app/(dashboard)/spin/[sessionId]/page.tsx` | `/api/mock/ai/spin-outline` | Mock fallback | BFF-203. |
| `src/domains/client/store.ts` | `demoSeedClients` | Local/Zustand truth seed | BFF-103 store cleanup after remote writes complete. |
| `src/domains/event/store.ts` | `demoSeedEvents` | Local/Zustand truth seed | Dashboard no longer consumes it for recent activity; keep as legacy/demo-only until broader timeline cleanup. |
| `src/domains/report/store.ts` | `demoSeedReports` | Local cache / quickstart seed after BFF-105 | Keep as cache/demo-only; production report list/detail/share should hydrate from `/api/reports`. |
| `src/domains/visit/store.ts` | `demoSeedVisitPlans` | Local cache seeded from demo fixtures | BFF-104 already provides BFF path; follow-up can remove production dependency. |
| `src/domains/spin/store.ts` | `demoSeedSpinSessions`, `demoSeedSpinMessages` | Local/Zustand truth seed | BFF-203. |
| `src/domains/calendar/store.ts` | persisted store with seeded events | Local/Zustand truth seed | Future calendar BFF. |
| `src/domains/assistant/store.ts` | `persist`, `createJSONStorage`, `localStorage` | UI-only browser state | Acceptable because `partialize` persists `isPanelOpen` only. Keep business conversation persistence out of localStorage. |
| `src/components/demo/dashboard-welcome-card.tsx` | `window.localStorage` | UI-only quickstart state | Acceptable demo UX state; not business truth. |
| `src/app/api/notifications/visit-reminder/route.ts` | mock send reminder and console log | Mock API behavior | Replace with guarded provider/job BFF before production notification proof. |
| `src/domains/demo/seed-fixtures.ts` | imports domain mocks | Demo seed source | Allowed only as demo seed boundary; production pages should not import it directly. |
| `src/app/api/mock/*` | mock API route files | Mock API guarded | Keep `blockMockApiInProduction()` proof. |

## Existing Server-owned Proofs

- `pnpm visit:bff-qa` proves `/api/visits` and `/api/visits/[id]` create/update/reload, reasoning evidence, notes persistence, theater handoff and no raw private sentinel without provider calls.
- `pnpm bff:reports-qa` proves `/api/reports` list/create, `/api/reports/[id]` detail/update, `/api/reports/[id]/share`, sanitized `ShareEvent`, public share client-safe sections, invalid/foreign guards, and reports list/detail browser persistence without provider calls.
- `pnpm bff:issues-qa` proves `/api/issues` list and `/api/issues/[id]` status/action update, fact/inference/unknown DTO, internal readiness hidden from client-facing surfaces, empty query, manager foreign guard, `AuditLog(resourceType=ISSUE)`, refresh persistence and desktop/mobile browser proof without provider calls.
- `pnpm bff:dashboard-qa` proves `/api/member/dashboard` unauth/member success, private no-store/request-id, current member scope aggregation across clients/visits/reports/issues/AI usage, manager own-dashboard isolation, refresh/browser persistence, desktop/mobile no overflow and no raw private sentinel without provider calls.
- `pnpm bff:org-aggregate-qa` proves `/api/org/overview`, `/api/org/coaching`, `/api/org/ai-usage` unauth 401、member 403、manager 200、private no-store/request-id、database/org-aggregate visibility, `/team` desktop/mobile no overflow, and no client detail/report body/transcript/policy/private memory sentinel without provider calls.
- `pnpm client:relationship-graph-qa` and `pnpm client:relationship-graph-write-qa` prove relationship graph review and family member remote-confirmed write path.
- `pnpm theater:client-build-qa`, `pnpm visit:theater-gate-qa`, `pnpm theater:route-b-persistence-qa`, `pnpm theater:route-b-session-ui-qa`, and `pnpm theater:route-b-interaction-qa` prove Route B handoff/session/turn storage without provider calls.
- `pnpm share:token-qa`, `pnpm client-portal:qa`, `pnpm public:pricing-qa`, and org/platform QA scripts cover public/client/org/platform BFF islands.

## Next BFF Queue

1. **BFF-201 AI BFF audit gate**: refresh `/api/ai/*` and `/api/rag` coverage after the BFF read surfaces, before choosing the next AI hardening card.
2. **BFF-203 SPIN hardening**: preserve the SPIN state machine while removing mock outline fallback and local seed truth from production proof.
3. **BFF-204 / ITA-003f Route B provider orchestration**: only after explicit provider/cost approval; success/error paths must write `AiUsageLog`, and raw provider payload must not be stored.
4. **BFF-202 Visit/report AI hardening follow-up**: keep `/api/ai/visit` and `/api/ai/report` usage/cost/error audit coverage aligned with the server-owned visit/report CRUD surfaces.
5. **BFF-103 CRM BFF completion**: finish archive/update, policy/timeline/gap related-list, and remaining local store cleanup while preserving compliance fields.

## BFF-001 Validation Notes

- This audit intentionally does **not** mark local/static sources as fixed. It marks them as known baseline blockers.
- No OpenAI/Anthropic provider calls were made; no `AiUsageLog` write was required.
- No Prisma schema change, Prisma generate, DB push, production write, email, notification, payment, refund, remote deletion or destructive operation was performed.
- The companion QA script is `pnpm bff:inventory-qa`. It scans production-facing source for mock/local/browser-storage patterns and fails if any newly detected risk path is missing from this audit.
