# 2026-07-02 Theater Review Browser

## Scope

Selected slice: simplify the Route B advanced sheet `review` tab from stacked review/compliance panels into one focused review browser.

Strategic review: the previous loop converted source evidence into a single source browser and identified the review tab as the next multi-panel region. This loop keeps the same interaction language: one drawer, icon navigation, focused content, and no provider/schema changes. This is an L2 UI implementation/proof slice.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Added `RouteBReviewBrowser` with icon tabs for `五視角回顧` and `待審閱候選`.
  - Replaced the review tab's two always-visible panels with one focused browser surface.
  - Removed the outer `Card` wrappers from feedback and compliance intake views so the browser does not become a card stack.
  - Preserved feedback/compliance buttons, safety copy, data markers, and no-provider boundaries.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added browser QA for the single review browser.
  - Switched both review browser views and checked horizontal overflow on desktop/mobile.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source markers for `data-route-b-review-browser` and active review state.
- Added proof screenshots:
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-review-browser-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-review-browser-mobile.png`

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - advanced review tab opens a single review browser
  - feedback and compliance views switch without horizontal overflow
  - source/risk/context tabs still pass overflow proof
  - THEATER `AiUsageLog` unchanged `0 -> 0`
- PASS review-browser screenshot proof via local Playwright script.
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`
- PASS `git diff --check`

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA made non-destructive Route B demo/test writes by creating sessions for UI proof and screenshots. No provider call was attempted, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. The review browser is internal UI-only proof. If review summaries are exposed through an AgentFacts-style capability later, publish only redacted status summaries and keep private transcript, raw provider payload, and compliance finding details internal.

## Blockers

- None for this UI slice.
- Review browser currently shows empty/idle state until a saved feedback review exists. A richer visual fixture would improve screenshot coverage of populated review rows.

## Next Recommended Loop

Simplify the `risk` tab next: keep red-line state controls, but convert the warning/action stack into one focused red-line browser with compact rule rows and a detail popover.
