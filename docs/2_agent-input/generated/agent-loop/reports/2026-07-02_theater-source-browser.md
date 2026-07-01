# 2026-07-02 Theater Source Browser

## Scope

Selected slice: simplify the Route B advanced sheet `source evidence` tab from multiple stacked source panels into one focused source browser.

Strategic review: the previous loop converted the advanced sheet into four icon tabs and left source-tab internals as the next target. This loop follows the same UI direction: fewer visible card regions, more icon-driven progressive disclosure, no provider or schema changes. This is an L2 UI implementation/proof slice.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Added `RouteBSourceEvidenceBrowser` with icon tabs for available source classes.
  - Replaced the source tab's three always-visible panels with one browser that shows only the selected source class.
  - Removed `Card` wrappers from meeting, family profile, and relationship-edge source panels; their contents now render as compact rows inside the source browser.
  - Preserved existing source-grounding data markers for source QA compatibility.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added browser QA for the single source browser.
  - Switched all available source tabs and checked horizontal overflow.
  - Made source-tab switching resilient to fixtures that only contain a subset of source classes.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source markers for `data-route-b-source-browser` and active source state.
- Updated/added proof screenshots:
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-source-browser-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-source-browser-mobile.png`

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - advanced source tab opens a single source browser
  - available source-browser tab(s) switch without horizontal overflow
  - advanced/review/risk/context tabs still pass overflow proof
  - THEATER `AiUsageLog` unchanged `0 -> 0`
- PASS source-browser screenshot proof via local Playwright script.
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`
- PASS `git diff --check`

Validation note: the first browser QA attempt assumed all three source classes existed in every fixture. The final QA now proves every available source tab and separately asserts that at least one source tab is exposed.

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA made non-destructive Route B demo/test writes by creating sessions for UI proof and screenshots. No provider call was attempted, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. The source browser is internal UI-only proof. If surfaced in an AgentFacts-style manifest later, it should be described as a read-only redacted source-evidence view with no raw prompt, provider payload, private transcript, or source reference id disclosure.

## Blockers

- None for this UI slice.
- Source browser currently exposes only source classes present in the session fixture; richer screenshots need a fixture with meeting, family, and edge source grounding present together.

## Next Recommended Loop

Simplify the `review` tab next: convert feedback and compliance intake from two stacked cards into one icon-based review browser with compact status rows and a focused detail popover.
