# 2026-07-02 Theater Single Surface Icon Popovers

## Scope

Selected slice: continue simplifying the Route B theater session into a single relationship-map and chat workspace, moving supporting evidence/status into icon popovers instead of multiple visible card regions.

Strategic review: this follows the active `lv3-theater-private-group-chat` direction and the operator request to avoid multiple card areas. The prior loop added game chat and comment mode; this loop reduced visible structure and strengthened browser QA for the new popover interaction model. This is an L2 UI implementation/proof slice.

SubAgent: `Huygens` performed read-only UI/QA audit. It flagged remaining card-like areas, duplicate icon labels, and missing popover overflow checks. The main implementation addressed the visible private-chat card list, duplicate `Provider guard`/`進階` controls, observation-mode callout, and popover QA coverage.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Replaced the previous multi-section Route B layout with one bordered workspace: relationship stage map on the left, group/private chat on the right.
  - Moved characters, relationship evidence, provider guard, next-turn preview, and advanced controls behind icon-only buttons with tooltip/popover/sheet access.
  - Changed private chat from repeated cards to a low-noise row list that selects private focus.
  - Reduced observation mode from a bordered callout into an inline status row.
  - Removed duplicate visible `進階` and duplicate `Provider guard` controls from the main surface.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Updated browser QA to open relationship evidence, provider guard, and next-turn preview popovers before asserting proof text.
  - Added desktop/mobile horizontal-overflow checks while each popover is open.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Updated source markers for `single-surface`, relationship evidence popover, and provider proof popover.
- Updated route-b session screenshots:
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-mobile.png`

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - desktop/mobile stage render proof
  - relationship evidence popover proof
  - provider no-call/no-usage/write-boundary proof
  - next-turn preview popover proof
  - popover open-state overflow proof
  - THEATER `AiUsageLog` unchanged `0 -> 0`
- PASS targeted browser comment proof
  - created Route B session
  - switched to `Comment`
  - saved scenario note
  - verified comment boundary and no private sentinel
  - THEATER `AiUsageLog` unchanged `0 -> 0`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`

Validation caveat: direct local binaries are still used because the non-interactive `pnpm exec` path is blocked by pnpm ignored-build approval in this workspace.

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA made non-destructive Route B demo/test writes by creating sessions and one comment turn. Failed intermediate proof attempts created additional identifiable demo sessions before browser locator setup was corrected; none attempted provider calls, none wrote THEATER `AiUsageLog`, and no CRM confirmed facts were written.

## NANDA Alignment

No AI route, provider contract, external registry, public discovery endpoint, or cross-org agent access changed. The Route B stage remains an internal-only no-provider UI surface for this slice.

AgentFacts-style gap remains unchanged: if the icon popovers become exported agent actions later, describe them as read-only proof/context affordances and keep relationship evidence, private turns, provider payloads, and raw prompts out of any public manifest.

## Blockers

- None for this UI simplification slice.
- Future work may still simplify the advanced sheet internals, but it is now off the main surface behind an icon/sheet interaction.

## Next Recommended Loop

Continue reducing the advanced sheet into icon-triggered focused drawers or tabs, starting with source-grounding and provider guard details. Keep the main stage surface limited to relationship map, chat lanes, composer, and mode icons.
