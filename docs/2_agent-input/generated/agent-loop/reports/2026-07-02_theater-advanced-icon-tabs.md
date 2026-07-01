# 2026-07-02 Theater Advanced Icon Tabs

## Scope

Selected slice: continue the Route B theater UI simplification by reducing the advanced sheet from a vertical stack of many card regions into focused icon tabs.

Strategic review: the previous loop made the main stage a single relationship-map/chat surface and explicitly left the advanced sheet as the next simplification target. This loop addresses that blocker without touching provider behavior, AI routes, Prisma schema, scoring contracts, or theater enums. This is an L2 UI implementation/proof slice.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Added `Tabs` to the advanced sheet and replaced the always-visible card stack with four icon-only views: source evidence, qualitative feedback, compliance red lines, and stage context.
  - Moved provider/visibility proof into a compact non-card `RouteBProviderGuardStrip` in the stage-context tab.
  - Kept the main stage surface limited to relationship map, chat lanes, composer, and mode/tool icons.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added browser coverage that opens the advanced sheet, switches each icon tab, and checks desktop/mobile horizontal overflow.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source markers for `data-route-b-advanced-tabs` and `data-route-b-advanced-provider-strip`.
- Updated route-b session screenshots and added advanced-sheet evidence:
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-mobile.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-advanced-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-advanced-mobile.png`

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - desktop/mobile stage render proof
  - popover proof for relationship evidence, provider guard, and next-turn preview
  - advanced sheet opens icon-tab focused panel
  - advanced source/review/risk/context tabs have no horizontal overflow
  - THEATER `AiUsageLog` unchanged `0 -> 0`
- PASS advanced-tabs screenshot proof via local Playwright script.
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`
- PASS `git diff --check`

Validation caveat: direct local binaries are still used because the non-interactive `pnpm exec` path is blocked by pnpm ignored-build approval in this workspace.

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA made non-destructive Route B demo/test writes by creating sessions for UI proof and screenshots. No provider call was attempted, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module contract, provider adapter, public registry, or external AgentFacts exposure changed. The tabbed advanced sheet is a UI-only internal proof surface. If these tabs later become externally discoverable capabilities, expose only high-level read-only affordances and keep raw prompt/provider payload/private transcript details redacted.

## Blockers

- None for this UI slice.
- The source/review/risk tab contents still contain local card/details components inside their focused views; they are no longer all visible at once. A future pass can simplify each tab's internal rows.

## Next Recommended Loop

Simplify the `source evidence` tab internals first: convert meeting/family/edge source cards into a single segmented source browser with compact rows and a popover preview for each item.
