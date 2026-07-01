# 2026-07-02 Theater Review Metric Rail

## Scope

Selected slice: remove the remaining small count-card clusters inside the Route B review inner browsers and replace them with one inline metric rail.

Strategic review: the previous loop converted `五視角回顧` and `待審閱候選` into focused inner browsers. The remaining visual noise was not another major panel, but the card-like mini count grids inside overview states. This is a narrow L2 UI simplification/proof slice that keeps the Route B theater stage moving toward icon/sheet/browser structure instead of stacked cards.

SubAgent check: a read-only subAgent initially found one blocking QA issue: the browser assertion allowed zero metric rails. This loop fixed it by rendering exactly one rail in overview empty states and restoring strict QA.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Replaced feedback overview `RouteBMiniCount` grid with `RouteBInlineMetricRail`.
  - Replaced compliance overview `RouteBMiniCount` grid with `RouteBInlineMetricRail`.
  - Kept overview metric rails visible in empty/no-provider states with zero values, so the layout remains stable before saved review data exists.
  - Implemented the rail as `dl/dt/dd` with visual number-first ordering, `flex-wrap`, `min-w-0`, and `break-words`.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added strict desktop/mobile assertions that feedback and compliance overview each render exactly one inline metric rail.
  - Added focused screenshots for feedback/compliance metric overview states.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source/proof markers for the inline metric rail and strict browser QA strings.

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - desktop/mobile feedback overview uses one inline metric rail
  - desktop/mobile compliance overview uses one inline metric rail
  - all review inner browser tabs still switch and avoid horizontal overflow
  - Route B session UI proof writes no fake `AiUsageLog`: `before=0 after=0`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-feedback-metrics-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-feedback-metrics-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-compliance-metrics-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-compliance-metrics-mobile.png`

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA created disposable Route B demo/test sessions through `/api/theater/route-b/sessions`. Provider calls remained disabled, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. The rail exposes only redacted aggregate counts inside the internal Route B UI. Registry readiness remains internal-only/manifest-ready; no external NANDA publication or cross-org access was attempted.

## Blockers

- None for this UI slice.
- The populated review state still depends on saved feedback/intake data. Current browser proof validates the no-provider empty state plus the strict rail contract.

## Next Recommended Loop

Move to the adjacent AI workbench without touching existing dirty files: either reduce `RouteBSevereRedLineWarningPanel` action-state controls into an icon popover, or wait for the dirty `theater/build` work to settle before simplifying the theater setup flow.

## Git

Push skipped by current user instruction. Local commit should be created after final `git diff --check` and staging only this slice.
