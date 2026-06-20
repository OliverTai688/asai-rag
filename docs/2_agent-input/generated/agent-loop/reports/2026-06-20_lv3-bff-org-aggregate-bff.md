# 2026-06-20 LV3 BFF Team / Org Aggregate BFF

## Scope

- 本輪類型：ASAI LV3 normal implementation/proof loop。
- Selected slice：BFF-301 Team/org aggregate BFF。
- 目標：移除 `/team` production-facing `MOCK_TEAM_MEMBERS`，讓 team coaching dashboard 消費 server-owned org aggregate DTO，並把 org aggregate route 的 Prisma 聚合抽入 repository。
- Push policy：依使用者 2026-06-20 指示，本輪只建立本地 commit，`push skipped by user instruction`。

## Candidate Score

1. BFF-301 Team/org aggregate BFF：20/25。移除可見 mock aggregate，降低 manager privacy risk，接上 `/team`、`/api/org/overview`、coaching、AI usage，且不需 provider approval。
2. BFF-102 Member settings hardening：16/25。可補 member settings proof，但目前已有 BFF foundation，對 LV3 cross-surface 的 leverage 低於 `/team` source blocker。
3. BFF-201 AI BFF audit gate：15/25。能為下一批 AI hardening 建 baseline，但本輪 `/team` mock 是更直接的 source/privacy blocker。

## Changes

- 新增 `OrgOverviewDto`、`OrgCoachingDto`、`OrgAiUsageDto`、`OrgTeamDashboardDto` 等 org aggregate DTO。
- 新增 `src/lib/org/org-aggregate-repository.ts`，集中 manager unit scope、`canReadOrgAggregate()` 與 overview/coaching/AI usage/team dashboard 聚合。
- 新增 `src/lib/org/org-api-errors.ts`，讓 org aggregate APIs 使用 shared auth/forbidden error contract。
- `/api/org/overview`、`/api/org/coaching`、`/api/org/ai-usage` 改為 protocol/session/private response shell。
- `/team` 改為 server page 讀 `getOrgTeamDashboardForSession()`，`TeamPageClient` 只渲染 DTO；移除 `MOCK_TEAM_MEMBERS`。
- 新增 `pnpm bff:org-aggregate-qa`，並保存 desktop/mobile screenshots。
- 同步 `AGENTS.md`、`PLN-019`、`AUD-006`、`loop-state.json`、`issue-question.md`。

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`。
- PASS targeted ESLint for org DTO/repository/routes/team UI/QA script。
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm bff:org-aggregate-qa`。
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm demo:manager-aggregate-qa`。
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm demo:org-coaching-ai-usage-qa`。
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm demo:org-members-qa`。
- PASS `pnpm lint:changed`。
- PASS `pnpm bff:inventory-qa`，documented risky source paths 從 12 降為 11，`/team` 不再列為 risky source。
- PASS `git diff --check`。
- Notes：第一次嘗試啟動 `localhost:3031` 被 Next 16 擋下，因同 repo 已有 dev server at `localhost:3000`；第一次 org QA 曾因 `true/false` generic sentinel false positive 失敗，已收緊 sentinel filter 後完整重跑通過。

## Evidence

- API proof：`/api/org/overview`、`/api/org/coaching`、`/api/org/ai-usage` unauth 401、member 403、manager 200、private no-store、request id、`source=database`、`visibility=org-aggregate`。
- Privacy proof：API and `/team` browser text do not expose client name/email/phone/report body/transcript/policy detail/private memory sentinels.
- Browser proof：`/team` desktop/mobile renders aggregate-only posture、database source、coaching queue、AI usage aggregate，無水平 overflow。
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-org-aggregate-bff/2026-06-20-org-aggregate-team-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-org-aggregate-bff/2026-06-20-org-aggregate-team-mobile.png`

## DB / Prisma

- Prisma schema/generate/db push：未執行，無 schema change。
- DB 操作：read-only QA；未新增/更新/刪除 DB row。
- Provider：未呼叫 OpenAI/Anthropic；不需 `AiUsageLog`，QA 提供 no-provider proof。

## Git

- Local commit required after final validation.
- Push：`push skipped by user instruction`。

## Blockers

- Source blockers：SPIN mock outline fallback、admin/pilot demo seed、notification mock success、CRM remaining related-list/archive/update cleanup。
- Operator/environment blockers：Route B provider/live Realtime provider proof、production migration approval、production build font blocker、production billing/email/notification approvals。
- Product decision blockers：interview-to-draft confirmation boundary、role-aware legacy SPIN exposure、beta scope/legal packet。
- Pre-existing unrelated worktree changes remain unstaged：MAN/doc index and AI meeting / relationship research files.

## Next Recommended Loop

Run `BFF-201 AI BFF audit gate`：refresh `/api/ai/*` and `/api/rag` audit after BFF read-surface changes, confirm session/token scope, capability/quota guards, success/error `AiUsageLog`, input limits, guarded-disabled no-provider proof, and update `AUD-005` before BFF-202/203/204/205.
