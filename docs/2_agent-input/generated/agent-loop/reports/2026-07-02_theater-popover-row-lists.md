# 2026-07-02 Theater Popover Row Lists

## Scope

Selected slice: simplify the Route B stage icon popovers for `舞台角色` and `關係證據`, removing nested row cards and mini-count grids in favor of compact row lists plus inline metric rails.

Strategic review: recent loops converted the Route B stage from separate cards into a single theater surface with icon popovers, advanced sheet tabs, focused browsers, and inline metric rails. The remaining top-stage popovers still hid card-like content inside the popover. This loop keeps the same interaction model while making the opened content itself lighter, which directly follows the user's latest direction: no multiple card regions; use icon/popover/tabs/flow to reduce UI weight.

SubAgent check: Bernoulli reported no blocking issues. It confirmed the diff moved both popovers away from nested card/mini-grid presentation. Its specific locator-stability suggestion was implemented by switching relationship evidence text proof to the scoped `data-route-b-relationship-evidence-popover` locator. A non-blocking a11y suggestion was also addressed by adding optional `ariaLabel` support to `RouteBInlineMetricRail` for the new row metrics.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Replaced `RouteBCharacterCard` with `RouteBCharacterRow`.
  - Changed `舞台角色` popover content to a `divide-y` row list with one inline metric rail per character.
  - Changed `關係證據` popover content to a compact row list with `factStatus`, `visibilityScope`, `sources`, and `mode` in inline metric rails.
  - Removed the now-unused `RouteBMiniCount` helper.
  - Added optional `ariaLabel` support to `RouteBInlineMetricRail`, used by the new character/evidence row metrics.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added desktop/mobile proof for character row list, inline rails, expected labels, no nested card rows, and internal overflow safety.
  - Added desktop/mobile proof for relationship evidence row list, inline rails, no nested card rows, and internal overflow safety.
  - Switched relationship evidence `innerText()` proof to the scoped popover locator.
  - Saved focused row-list screenshots.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source and browser-proof markers for character/evidence row lists and their inline rail checks.

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - desktop/mobile character popover renders compact row list
  - desktop/mobile character rows use inline metric rails
  - desktop/mobile character popover avoids nested card rows
  - desktop/mobile relationship evidence renders compact row list
  - desktop/mobile relationship evidence rows use inline metric rails
  - desktop/mobile relationship evidence popover avoids nested card rows
  - Route B session UI proof writes no fake `AiUsageLog`: `before=0 after=0`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-character-rows-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-character-rows-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-relationship-evidence-rows-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-relationship-evidence-rows-mobile.png`

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA created disposable Route B demo/test sessions through `/api/theater/route-b/sessions`. Provider calls remained disabled, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. This loop only adjusted the internal Route B presentation and proof harness. The theater capability remains internal-only/manifest-ready and still exposes no raw provider payload, private transcript, formal external registry claim, policy number, or cross-organization agent access.

## Blockers

- None for this UI slice.
- Several unrelated dirty files remain in the worktree; this loop stages only the Route B session row-list UI, QA proof scripts, screenshots, and this report.

## Next Recommended Loop

Continue simplifying the Route B session page by reviewing the advanced sheet's source/review/context detail bodies for any remaining card-like nested panels, then convert the next safe target into row lists, icon tabs, or focused popovers with browser proof.

## Git

Push skipped by current user instruction. Local commit should be created after final `git diff --check` and staging only this slice.
