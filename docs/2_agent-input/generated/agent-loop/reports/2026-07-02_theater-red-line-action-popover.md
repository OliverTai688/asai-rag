# 2026-07-02 Theater Red-line Action Popover

## Scope

Selected slice: simplify the Route B `合規紅線` browser so summary counts and action-state controls no longer read as visible card/button clusters.

Strategic review: recent loops converted Route B stage support panels into browser, sheet, popover, and metric-rail patterns. The red-line browser still had a mini-count card grid and a visible action-state button grid inside the selected-rule detail. This is an L2 UI implementation/proof slice that keeps the theater stage focused while moving secondary controls behind an icon popover.

SubAgent check: a read-only subAgent reported no blocking issues. It suggested avoiding incomplete radio semantics and making rule-tab presence a hard QA assertion; this loop addressed both by using `aria-pressed` row buttons and strict rule-tab proof.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Replaced the red-line mini-count grid with `RouteBInlineMetricRail`.
  - Converted selected-rule detail from a rounded card to a hairline-separated `article`.
  - Moved action-state choices into one `SlidersHorizontal` icon popover.
  - Rendered action choices as a compact row list with `aria-pressed`, avoiding a partial radio pattern and avoiding stacked option cards.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added desktop/mobile proof that the red-line browser uses one inline metric rail.
  - Added hard proof that red-line rule tabs exist.
  - Opens the action popover, checks pressed-choice controls, verifies no horizontal overflow, and saves focused screenshots.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source/proof markers for the red-line action popover, inline rail, rule tabs, and pressed choices.

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - desktop/mobile red-line browser uses one inline metric rail
  - desktop/mobile red-line browser exposes rule tabs
  - desktop/mobile action controls stay in one icon popover trigger
  - desktop/mobile action popover exposes pressed choices
  - Route B session UI proof writes no fake `AiUsageLog`: `before=0 after=0`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-red-line-action-popover-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-red-line-action-popover-mobile.png`

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA created disposable Route B demo/test sessions through `/api/theater/route-b/sessions`. Provider calls remained disabled, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. The red-line popover exposes only internal aggregate/status controls and no raw provider payload, private transcript, formal compliance finding, or external notification capability. Registry readiness remains internal-only/manifest-ready.

## Blockers

- None for this UI slice.
- The red-line rule tabs themselves remain horizontally scrollable label buttons. A later polish pass can convert rule navigation into compact icon+popover rows if the labels become noisy.

## Next Recommended Loop

Stay on the Route B session page while adjacent dirty files remain unrelated: reduce remaining rounded mini-cards in the stage runtime/character popovers, or simplify selected red-line rule details into a context popover once rule labels and evidence density are stable.

## Git

Push skipped by current user instruction. Local commit should be created after final `git diff --check` and staging only this slice.
