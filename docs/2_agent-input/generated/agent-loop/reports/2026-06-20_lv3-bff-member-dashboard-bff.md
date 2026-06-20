# 2026-06-20 LV3 BFF Member Dashboard BFF

## Scope

- 本輪類型：ASAI LV3 normal implementation/proof loop。
- Selected slice：BFF-101 Member dashboard BFF。
- 目標：讓 `/dashboard` 首屏 decision center 改由 single member-scoped BFF 提供 UI-ready DTO，消費 server-owned clients / visits / reports / issues / AI usage signals。
- Push policy：依使用者 2026-06-20 指示，本輪只建立本地 commit，`push skipped by user instruction`。

## Candidate Score

1. BFF-101 Member dashboard BFF：22/25。移除首頁 client-side/local aggregation，連接 issues、visits、reports、clients、AI quota，改善第一屏 onboarding 與 decision center，且不需 provider approval。
2. BFF-301 Team/org aggregate BFF：18/25。可移除 `/team` visible mock aggregate 並降低 manager privacy risk，但較偏 org surface，不如 dashboard 直接改善 member LV3 主入口。
3. PIM/BFF interview -> VisitPlanDraft / TheaterBuildDraft：18/25。最貼近 AI 訪談建立準備包/劇場，但 draft/writeback boundary 仍需更細產品界線；本輪 BFF-101 無決策阻擋。

## Changes

- 新增 `MemberDashboardDto` domain contract。
- 新增 member dashboard repository，從 current member session 聚合 clients / visits / reports / issues / `AiUsageLog`。
- 新增 `GET /api/member/dashboard`，使用 shared private no-store response 與 auth error contract。
- `/dashboard` 改為 server page + thin client component；不再使用 `clientService.getDashboardStats()`、`eventService.getLatestEvents()`、`useSessionStore()` 作 business truth。
- `TasksPanel` 與 `ActivityTimeline` 改吃 dashboard DTO，保留 empty state 與 desktop/mobile 版型。
- 新增 `pnpm bff:dashboard-qa`。
- 同步 `AGENTS.md`、`PLN-019`、`AUD-006`、`loop-state.json`、`issue-question.md`。

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`。
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm bff:dashboard-qa`。
- PASS targeted ESLint for dashboard page/client, dashboard API route, domain DTO, repository, dashboard panels, and QA script。
- PASS `pnpm lint:changed`。
- PASS `pnpm bff:inventory-qa`。
- PASS `git diff --check`。

## Evidence

- API proof：unauth 401、member 200、private no-store、request id、`source=database`、`visibility=member-scoped`、KPI/task queue/today mainline/reasoning/recent activity/AI quota DTO present。
- Cross-role proof：manager gets own member dashboard 200 but does not receive member-owned seeded issue task.
- Browser proof：`/dashboard` desktop/mobile renders today mainline, seeded DB issue task, KPI set, AI quota/insight panel, no horizontal overflow, reload keeps task visible.
- Private leakage proof：API response and browser page text contain no raw private/provider/cookie/secret/token/email/policy/transcript sentinels.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-member-dashboard-bff/2026-06-20-dashboard-bff-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-member-dashboard-bff/2026-06-20-dashboard-bff-mobile.png`

## DB / Prisma

- Prisma schema/generate/db push：未執行，無 schema change。
- DB 操作：QA 在 development/demo Supabase target 新增一筆可辨識 demo/test `Issue` 作 dashboard task evidence；無 production write、無 destructive operation、無真 email/notification/payment。
- Provider：未呼叫 OpenAI/Anthropic；不需 `AiUsageLog`，QA 提供 no-provider proof。

## Git

- Local commit required after final validation.
- Push：`push skipped by user instruction`。

## Blockers

- Source blockers：`/team` `MOCK_TEAM_MEMBERS`、SPIN mock outline fallback、admin/pilot demo seed、notification mock success、CRM remaining related-list/archive/update cleanup。
- Operator/environment blockers：Route B provider/live Realtime provider proof、production migration approval、production build font blocker、production billing/email/notification approvals。
- Product decision blockers：interview-to-draft confirmation boundary、role-aware legacy SPIN exposure、beta scope/legal packet。

## Next Recommended Loop

Run `BFF-301 Team/org aggregate BFF`：replace `/team` `MOCK_TEAM_MEMBERS` with server-owned org aggregate repository/DTO, preserve manager/member boundaries, prove no client detail/report body/transcript/private memory leakage, and keep `/dashboard`/member proof clean.
