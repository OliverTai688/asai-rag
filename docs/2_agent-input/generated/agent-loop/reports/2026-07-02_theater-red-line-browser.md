# 2026-07-02 Theater Red-line Browser

## Scope

Selected slice: simplify the Route B advanced sheet `risk` tab from stacked red-line details into one focused red-line browser.

Strategic review: the previous loops converted source evidence and qualitative review into browser surfaces. This loop applies the same interaction model to the remaining high-noise risk tab while preserving red-line state controls and no-provider compliance boundaries. This is an L2 UI implementation/proof slice.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Reworked `RouteBSevereRedLineWarningPanel` into a `Red-line Browser` surface.
  - Replaced the full warning `details` stack with a compact horizontal rule list and a single selected-rule detail view.
  - Kept read/save state controls, action-state buttons, evidence/legal/CRM boundary lines, and no-provider copy.
  - Added `data-route-b-red-line-browser` and active-rule markers.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added browser QA that opens the risk tab, verifies the single red-line browser, selects the first rule, and checks desktop/mobile overflow.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source markers for the red-line browser and active-rule state.
- Added proof screenshots:
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-red-line-browser-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-red-line-browser-mobile.png`

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - advanced risk tab opens a single red-line browser
  - first rule view has no horizontal overflow
  - source/review/context tabs still pass overflow proof
  - THEATER `AiUsageLog` unchanged `0 -> 0`
- PASS red-line browser screenshot proof via local Playwright script.
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`
- PASS `git diff --check`

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA made non-destructive Route B demo/test writes by creating sessions for UI proof and screenshots. No provider call was attempted, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. The red-line browser is internal UI-only proof. If exposed as a future AgentFacts-style capability, it must remain read-only/redacted unless operator explicitly approves formal finding, notification, or cross-org access.

## Blockers

- None for this UI slice.
- Red-line browser still uses compact count tiles and action-state buttons; future polish can reduce these further into an icon summary rail plus popover explanations.

## Next Recommended Loop

Simplify the `stage context` tab: turn provider guard and four context `details` blocks into one context browser with icon filters for guard, director, relationships, narrator questions, and visibility rules.
