# 2026-07-02 Theater Source Family/Edge Rows

## Strategic review gate
- Main goal: continue Route B theater UI simplification by removing multi-card source evidence layouts and moving secondary proof into icon-tab source browser rows, popovers, and inline metric rails.
- Recent loop context: the previous theater loops simplified the advanced sheet, source browser, runtime metric rail, character/relationship popovers, review browsers, red-line browser, and meeting signal source rows.
- This round is not a repeat documentation/proof-only loop: it converts the remaining `familyProfiles` and `relationshipEdgeShadow` source evidence bodies from card/grid proof into compact row lists with shared inline metric rails, and strengthens browser QA around all three source tabs.
- Acceptance anchor: Route B stage-map/browser QA from `scripts/theater-route-b-session-ui-qa.mjs` plus reconciliation coverage in `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`.

## Scope completed
- Updated `src/app/(dashboard)/theater/[sessionId]/page.tsx`.
  - `RouteBFamilyProfileGroundingPanel` now uses a summary metric rail, compact `data-route-b-family-profile-row-list` rows, and a boundary metric rail instead of badge/pill/card-style proof clusters.
  - `RouteBRelationshipEdgeShadowGroundingPanel` now uses `data-route-b-edge-shadow-row-list` rows for candidate summary and distribution/warnings, with boundary proof in one inline rail.
  - Edge type, fact status, warning, and family profile status values are now human-readable summaries instead of raw-ish enum/code walls.
  - `RouteBInlineMetricRail` keeps labels on one line while allowing values to wrap, improving mobile source browser readability.
- Verified the existing `scripts/fixtures/route-b-handoff-fixture.mjs` safe source grounding data is present in `HEAD`.
  - `sourceGrounding.familyProfiles` and `sourceGrounding.relationshipEdgeShadow` let browser QA cover all source tabs instead of only meeting signals.
- Updated `scripts/theater-route-b-session-ui-qa.mjs`.
  - Requires `會議訊號`, `人物 profile`, and `關係邊` source tabs.
  - Adds browser assertions for family profile row lists, edge shadow row lists, inline rails, source boundary labels, false boundary values, raw source identifier absence, no pill clusters, and no internal overflow.
  - Adds desktop/mobile screenshots for family and edge source views.
- Updated `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`.
  - Reconciles new page markers and browser-QA proof markers for all three source tabs plus family/edge row-list assertions.

## SubAgent review
- Earlier subAgent review found two blocking gaps before finalizing: the browser QA fixture did not force all three source tabs to exist, and edge shadow source evidence had become rail-only instead of a row list. Both were fixed in this loop.
- Final sanity review found no UI simplification blocker. It flagged three polish/QA gaps: family summary still looked enum-ish, source tab locators were page-scoped, and least-disclosure browser proof only checked labels rather than false values/raw-id absence. All three were fixed before commit.

## Validation
- `pnpm exec tsc --noEmit --pretty false` attempted first, but local pnpm dependency-status install was blocked by ignored build scripts for Prisma/sharp/msw. Fallback typecheck used the repo binary instead.
- `./node_modules/.bin/tsc --noEmit --pretty false` — pass.
- `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs` — pass.
- `node scripts/theater-family-profile-session-source-qa.mjs` — pass.
- `node scripts/theater-relationship-edge-shadow-session-source-qa.mjs` — pass.
- `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs` — pass.
- `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs` — pass.

## Browser proof
- Existing local server: `http://localhost:3000`.
- Browser QA created disposable Route B demo sessions and verified desktop/mobile views.
- New/updated screenshots:
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-source-family-rows-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-source-family-rows-mobile.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-source-edge-rails-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-source-edge-rails-mobile.png`
- Visual inspection confirmed family/edge source evidence is now row-list based, raw warning constants are not shown in the UI, and the mobile warning label no longer breaks into one-letter fragments.

## DB / Prisma / provider boundary
- Prisma/schema changes: none.
- DB writes: only disposable Route B demo session creation by browser QA.
- Provider calls: none.
- `AiUsageLog`: unchanged during browser proof, `before=0 after=0`.
- Relationship graph / VisitPlan / CRM confirmed-fact writes: false in family and edge source boundary proof.

## NANDA alignment
- No AgentFacts manifest, provider adapter, or registry status changed in this loop.
- The UI continues to expose only least-disclosure source capability proof: counts, status summaries, and safe write/provider boundaries.
- Raw source reference ids, raw metadata, private transcript payloads, provider payloads, and draft relationship edge internals remain hidden.
- Registry readiness remains internal-only for this theater Route B proof surface.

## Remaining blockers / next entry
- No blocker for this slice.
- Push remains skipped by operator instruction.
- Next suggested entry: continue simplifying adjacent AI workbench surfaces by applying the same icon-tab + row-list + metric rail treatment to any remaining Route B source/review panels that still show dense boundary proof inline.
