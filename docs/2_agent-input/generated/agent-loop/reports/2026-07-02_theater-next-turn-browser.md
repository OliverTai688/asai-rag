# 2026-07-02 LV3 Theater Next-turn Browser Simplification

## Strategic Review

- Current objective: continue Route B theater UI simplification, following the latest direction to avoid multiple card regions and use icons, popovers, sheets, tabs, or flow structure.
- Recent loops simplified the stage surface, advanced context, and composer settings. The remaining adjacent high-noise area was the `下一回合預覽` popover.
- Selected slice: convert `RouteBNextTurnPreviewPanel` from a multi-card popover into a single `Next-turn Browser` with icon tabs for `預覽`, `來源`, `Provider`, and `Guard`.

## Changes

- Updated `src/app/(dashboard)/theater/[sessionId]/page.tsx`.
- Added `RouteBNextTurnBrowserMode` and a focused browser surface with active-state marker.
- Moved preview, runtime grounding sources, provider boundary/actions, and guard/rationale into separate icon-tab views.
- Kept the existing popover entry and no-provider behavior; no API, provider, scoring, or persistence contract changed.
- Updated Route B browser QA to open the next-turn popover, verify the single browser, click all four tabs, and assert no horizontal overflow.
- Updated static reconcile proof with next-turn browser markers.

## DB / Prisma

- No schema changes.
- No Prisma generate, validate, db push, migration, or destructive DB operation.
- Browser QA created disposable Route B demo sessions through `/api/theater/route-b/sessions`.
- Provider calls remained disabled; THEATER `AiUsageLog` count stayed unchanged: `0 -> 0`.

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`
- PASS `git diff --check -- <changed Route B next-turn files>`

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-next-turn-browser-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-next-turn-browser-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-mobile.png`

## NANDA Alignment

- No AI route or provider adapter changed.
- AgentFacts-style boundary remains internal-only: the browser exposes no-provider draft state, provider boundary, usage-log requirements, and guard evidence without raw provider payloads or external registry claims.
- Registry gap unchanged: Route B theater remains internal manifest-ready, not externally registered.

## Remaining Blockers / Next Entry

- Push skipped by current user instruction.
- Next recommended slice: reduce `RouteBReviewBrowser` inner compliance/review details into focused single-item browsers, following the same icon-tab pattern.
