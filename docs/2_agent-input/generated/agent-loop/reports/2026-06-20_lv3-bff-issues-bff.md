# 2026-06-20 LV3 BFF Issues BFF

## Scope

- 本輪類型：ASAI LV3 normal implementation/proof loop。
- Selected slice：BFF-106 Issues BFF。
- 目標：移除 `/issues` 的 `MOCK_ISSUES` production-facing static truth，改成 member-scoped Issues BFF、fact/inference/unknown DTO、internal readiness 與 status/action audit proof。
- Push policy：依使用者 2026-06-20 指示，本輪只建立本地 commit，`push skipped by user instruction`。

## Candidate Score

1. BFF-106 Issues BFF：21/25。移除 visible static mock，建立 server-owned issue readiness / fact-inference-unknown DTO，能供 dashboard/previsit/org coaching 後續使用，且不需 provider approval。
2. BFF-101 Member dashboard BFF：19/25。能改善第一屏 decision center，但需要 issues/task signal 先 server-owned 才更穩。
3. PIM/BFF interview -> VisitPlanDraft / TheaterBuildDraft：18/25。最貼近 AI 訪談建立準備包/劇場，但 writeback/draft boundary 比 BFF-106 更需要產品決策。

## Changes

- 新增 `GET /api/issues` 與 `PATCH /api/issues/[id]`。
- 新增 `src/domains/issues/types.ts` 與 `src/lib/issues/issues-repository.ts`，用現有 DB `Issue` table 產生 member-scoped DTO。
- DTO 包含 facts / inferences / unknowns、source references、internal readiness（`clientFacingVisible=false`）與 advisor next action。
- `/issues` 改為 server page 初始讀取 + client component 操作介面；不再使用 `MOCK_ISSUES`。
- PATCH status/action/feedback/assignment 會寫 `AuditLog(resourceType=ISSUE)`。
- 新增 `pnpm bff:issues-qa` 與 evidence screenshots。
- 同步 `AGENTS.md`、`PLN-019`、`AUD-006`、`loop-state.json`、`issue-question.md`。
- Validation repair：工作樹中的新增客戶 notes/optional fields 變更需要補 `react-hook-form`/Zod output 泛型與 `CreateClientInput` optional 欄位，否則本輪 `tsc` 不會通過；未改合規欄位。

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`。
- PASS `pnpm lint:changed`。
- PASS targeted ESLint：issues page/client, issues API routes, issues domain/repository, `scripts/bff-issues-qa.mjs`。
- First QA attempt on `localhost:3030` failed because another Next dev server was already running on `localhost:3000`; reran against the active server.
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm bff:issues-qa`。

## Evidence

- API proof：unauth 401、member list 200、database source/no-store/request-id、empty query 200 empty list、invalid patch 400、manager foreign patch 404、member status/action patch 200。
- DB proof：QA inserted identifiable demo/test `Issue` row and status/action update wrote `AuditLog(resourceType=ISSUE)` count `0 -> 1`。
- DTO proof：facts=4、inferences=1、unknowns=1、internal readiness not client-facing、advisor next action present。
- Browser proof：`/issues` desktop/mobile renders DB issue, fact/inference/unknown evidence, next action, no horizontal overflow, no raw private sentinel.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-issues-bff/2026-06-20-issues-bff-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-issues-bff/2026-06-20-issues-bff-mobile.png`

## DB / Prisma

- Prisma schema/generate/db push：未執行，無 schema change。
- DB 操作：僅在 development/demo Supabase target 新增可辨識 demo/test `Issue` evidence，並透過 BFF PATCH 寫 `AuditLog`；無 production write、無 destructive operation、無真 email/notification/payment。
- Provider：未呼叫 OpenAI/Anthropic；不需 `AiUsageLog`，QA 提供 no-provider proof。

## Git

- Local commit required after validation.
- Push：`push skipped by user instruction`。

## Blockers

- Source blockers：dashboard client-side aggregation、`/team` `MOCK_TEAM_MEMBERS`、SPIN mock outline fallback、admin/pilot demo seed、notification mock success。
- Operator/environment blockers：Route B provider/live Realtime provider proof、production migration approval、production build font blocker、production billing/email/notification approvals。
- Product decision blockers：interview-to-draft confirmation boundary、role-aware legacy SPIN exposure、beta scope/legal packet。

## Next Recommended Loop

Run `BFF-101 Member dashboard BFF`：建立 `GET /api/member/dashboard`，用 server-owned clients/visits/reports/issues/AI usage 組成今日主線、下一步 CTA、KPI、task queue、recent activity 與 quota summary，並證明 unauth/member success/refresh/mobile/no private leakage。
