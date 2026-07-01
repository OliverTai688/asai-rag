# 2026-07-02 Theater Runtime Metric Rail

## Scope

Selected slice: simplify the Route B stage runtime game-chat HUD so the four visible count tiles become one inline metric rail.

Strategic review: recent loops have been removing nested cards from the Route B theater surface by moving secondary evidence, review, red-line, and compliance controls into browsers, icon popovers, and sheet-like detail flows. The game-chat HUD still showed a small card grid for turn/character/status/provider state, which duplicated the visible card language next to the relationship map. This loop is an L2 UI implementation/proof slice that keeps the session page in the same simplification path without touching theater logic, provider contracts, or scoring JSON.

SubAgent check: a read-only subAgent reported no blocking issues. It suggested adding content assertions, targeted internal-overflow proof, and source reconcile markers for the new rail; this loop implemented those checks.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Replaced the `RouteBGameChatHud` mini-count grid with the existing `RouteBInlineMetricRail`.
  - Kept the same four facts: `回合`, `角色`, `狀態提案`, and `AI 回覆`.
  - Preserved Route B session behavior, provider guard copy, chat scope, and status-target logic.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added desktop/mobile proof that the game-chat HUD uses exactly one inline metric rail.
  - Added content proof for the four expected metric labels plus `locked`/`on` provider state.
  - Added element-level horizontal-overflow proof for the metric rail and saved focused runtime-metric screenshots.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source/proof markers for `RouteBInlineMetricRail` and the new game-chat HUD QA checks.

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - desktop/mobile game chat HUD uses one inline metric rail
  - desktop/mobile game chat HUD metric rail has expected labels
  - desktop/mobile game chat HUD metric rail has no internal horizontal overflow
  - Route B session UI proof writes no fake `AiUsageLog`: `before=0 after=0`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-runtime-metrics-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-runtime-metrics-mobile.png`

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA created disposable Route B demo/test sessions through `/api/theater/route-b/sessions`. Provider calls remained disabled, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. This loop only adjusted internal Route B session presentation and proof coverage. The theater capability remains internal-only/manifest-ready, and the UI exposes no raw provider payload, private transcript, policy number, or external registry capability.

## Blockers

- None for this UI slice.
- Several unrelated dirty files remain in the worktree; this loop stages only the Route B session rail, QA proof scripts, screenshots, and this report.

## Next Recommended Loop

Continue on the Route B session page while the user direction remains active: simplify the remaining character/evidence surfaces into icon popovers or compact row lists, then keep browser QA focused on mobile overflow and unlabeled icon controls.

## Git

Push skipped by current user instruction. Local commit should be created after final `git diff --check` and staging only this slice.
