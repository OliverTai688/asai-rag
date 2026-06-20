# 2026-06-20 LV3 BFF Reports / Share Action

## Scope

- 本輪類型：ASAI LV3 normal implementation/proof loop。
- Selected slice：BFF-105 Reports / share action BFF。
- 目標：讓 `/reports` library、`/reports/[reportId]` detail/edit/share action 與 CRM report subpage 改由 member-scoped BFF 管理，並維持 public share DTO client-safe。
- Push policy：依使用者 2026-06-20 指示，本輪只建立本地 commit，`push skipped by user instruction`。

## Candidate Score

1. BFF-105 Reports / share action BFF：20/20。連接 CRM report subpage、member report library/detail 與 public share，直接降低 local/Zustand report truth 與 client-private leakage 風險。
2. BFF-106 Issues BFF：17/20。可移除 visible static mock，適合作為下一個 source blocker，但與拜訪準備包/報告/分享流的連接低於 BFF-105。
3. BFF-101 Member dashboard BFF：16/20。能改善首頁 decision center 的 server-owned DTO，但本輪 reports/share 是更靠近 advisor deliverable 與 client-facing proof 的 slice。

## Changes

- 新增 `GET/POST /api/reports`、`GET/PATCH /api/reports/[id]`、`POST /api/reports/[id]/share`。
- 擴充 report repository schema 與 DTO：member editor 使用 internal sections，public/share 使用 client-safe sections；internal-only `performance` / `methodology` 不進 public DTO。
- `/reports`、`/reports/[reportId]`、`/crm/[clientId]/reports` 改為 BFF/cache-first；quickstart demo branch 保留 local flow。
- 新增 `pnpm bff:reports-qa`，覆蓋 API guard、DB proof、public share no-leak 與 browser desktop/mobile proof。
- 更新 `AGENTS.md`、`PLN-019`、`AUD-006`、`loop-state.json`、`issue-question.md`。

## Validation

- PASS：`pnpm exec tsc --noEmit --pretty false`。
- PASS：`DEMO_QA_BASE_URL=http://localhost:3027 pnpm bff:reports-qa`。
- PASS：`pnpm lint:changed`。
- PASS：targeted ESLint for changed/new source files and QA script。
- PASS：`git diff --check`。

## Evidence

- QA created server-owned demo/test report: `cmqlnivr60004fl61jakuuf1j` for client `c_wang`。
- Share proof：`ReportShare` token created/reused and sanitized `ShareEvent` count increased `0 -> 1`。
- Public share proof：`/api/share/[token]` returns client-safe sections, omits internal `performance` section and raw/internal fields.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-reports-bff/2026-06-20-reports-bff-list-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-reports-bff/2026-06-20-reports-bff-detail-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-reports-bff/2026-06-20-reports-bff-detail-mobile.png`

## DB / Prisma

- Prisma schema/generate/db push：未執行，無 schema change。
- DB 操作：僅在 development/demo Supabase target 新增可辨識 demo/test `Report`、`ReportShare`、`ShareEvent` evidence；無 production write、無 destructive operation、無真 email/notification/payment。
- Provider：未呼叫 OpenAI/Anthropic；不需 `AiUsageLog`，QA 提供 no-provider proof。

## Git

- Local commit required after validation.
- Push：`push skipped by user instruction`。

## Blockers

- Source blockers：`/issues` static mock、`/team` mock aggregate、dashboard client-side aggregation、SPIN mock outline fallback、admin/pilot demo seed、notification mock success。
- Provider/cost blockers：Route B director/character/feedback provider orchestration and live realtime proof still require explicit approval and `AiUsageLog` success/error evidence。
- Build blocker：Next/Turbopack Google Font path remains a separate production build issue.

## Next Recommended Loop

- 因 `normalLoopsSinceLastWholeProductReview` 已到 4，下一輪應執行 scheduled fifth-loop whole-product gap review：`docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`。
