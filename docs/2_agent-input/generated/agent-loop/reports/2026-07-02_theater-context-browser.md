# 2026-07-02 LV3 Theater Context Browser Simplification

## Strategic Review

- Current objective: continue Route B theater UI simplification around the stage surface and adjacent AI workbench, reducing stacked card regions into icon-driven browsers, popovers, and sheets.
- Recent completed loops already simplified the theater stage into a single surface, added game chat/comment mode, and moved source evidence, qualitative review, and red-line review into focused advanced browsers.
- Bottleneck this round: the advanced `舞台脈絡` tab still rendered provider guard plus four separate details/card regions, which was the last dense multi-card cluster inside the advanced sheet.
- Selected slice: collapse provider guard, director opening, relationship context, narrator questions, and visibility rules into one `Context Browser` with icon tabs and browser QA markers.

## Changes

- Replaced the `舞台脈絡` tab in `src/app/(dashboard)/theater/[sessionId]/page.tsx` with `RouteBContextBrowser`.
- Added icon tabs for `Provider guard`, `導演開場`, `關係脈絡`, `旁白補問`, and `可見性規則`.
- Removed the old `RouteBDetails` stacked details component from this path.
- Kept provider guard proof inside the single browser and preserved `data-route-b-advanced-provider-strip="true"`.
- Added `data-route-b-context-browser="true"` and active-state marker for static reconcile and browser proof.
- Updated Route B browser QA to open `舞台脈絡`, click all context icon tabs, and assert no horizontal overflow.

## DB / Prisma

- No schema changes.
- No Prisma generate, validate, db push, migration, or destructive DB operation.
- Browser QA created disposable Route B demo sessions through `/api/theater/route-b/sessions`.
- Provider calls remained disabled; THEATER `AiUsageLog` count stayed unchanged in browser QA: `0 -> 0`.

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`
- PASS `git diff --check -- <changed theater context files>`

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-context-browser-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-context-browser-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-mobile.png`

## NANDA Alignment

- No AI route or provider contract changed.
- AgentFacts-style boundary remains internal-only: the browser surfaces capability evidence, privacy guard state, visibility scope, and no-provider/no-fake-usage proof without exposing raw provider payloads or private IDs.
- Registry gap unchanged: Route B theater is still an internal manifest-ready workflow, not externally registered.

## Remaining Blockers / Next Entry

- Push skipped by current user instruction.
- Next recommended UI slice: continue the same simplification pattern into the adjacent AI workbench/sidebar entry states, focusing on command palette or sheet-based entry instead of additional dashboard cards.
