# 2026-07-02 Theater Source Signal Row List

## Scope

Selected slice: simplify the Route B advanced sheet `來源證據` / `會議訊號` source browser so meeting-signal details no longer read as source-type chips, metadata pills, or `stage card` UI copy.

Strategic review: the previous loops collapsed the Route B stage surface, runtime metrics, character popover, and relationship evidence popover into icon-triggered focused surfaces with row lists and inline rails. The next visible density pocket was the meeting-signal source body inside the advanced sheet: it was already inside a single source browser, but still used chip/pill clusters. This loop keeps the same source browser and proof boundaries while simplifying the body into one row-list flow.

SubAgent check: Einstein reported no blocking issues. It confirmed old source-type markers remained present and suggested hardening long metric values plus preserving source-type marker semantics. This loop addressed both by adding `min-w-0 break-words` to metric values, making `data-route-b-meeting-signal-card-source-type` present only when a card has a source type, and adding browser proof for optional card-level source type markers.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Changed meeting source copy from `張 stage card` to `則會議訊號`.
  - Replaced source-type chips with an inline metric rail while preserving `data-route-b-meeting-signal-source-types` and `data-route-b-meeting-signal-source-type-chip`.
  - Replaced per-signal status/priority/source/action pills with a compact row list and `RouteBInlineMetricRail`.
  - Preserved `data-route-b-meeting-signal-card-source-type` for cards that actually carry a source type.
  - Hardened `RouteBInlineMetricRail` values for long labels on mobile.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added desktop/mobile proof for meeting source optional source-type rail, compact row list, row inline rails, no `stage card` copy, no pill clusters, internal overflow safety, and optional card-level source-type markers.
  - Saved focused source-signal row screenshots.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added source and browser-proof markers for the meeting signal row-list and optional source-type rail checks.

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `node scripts/theater-meeting-signal-session-source-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - desktop/mobile source browser meeting source types stay in optional inline metric rail
  - desktop/mobile source browser meeting signals render compact row list
  - desktop/mobile source browser meeting signal rows use inline metric rails
  - desktop/mobile source browser preserves optional card-level source type markers
  - desktop/mobile source browser meeting signal copy avoids card language
  - desktop/mobile source browser meeting signal view avoids pill clusters
  - Route B session UI proof writes no fake `AiUsageLog`: `before=0 after=0`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-source-signal-rows-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-source-signal-rows-mobile.png`

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA created disposable Route B demo/test sessions through `/api/theater/route-b/sessions`. Provider calls remained disabled, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. This loop only adjusted internal source-evidence presentation and proof coverage. The theater capability remains internal-only/manifest-ready and still exposes no raw provider payload, private transcript, source reference id, external registry claim, policy number, or cross-organization agent access.

## Blockers

- None for this UI slice.
- Several unrelated dirty files remain in the worktree; this loop stages only the Route B source-signal UI, QA proof scripts, screenshots, and this report.

## Next Recommended Loop

Continue within the advanced sheet: simplify the family-profile or relationship-edge source body into the same row-list and inline rail language, then keep the browser proof focused on optional source markers, mobile overflow, and no raw/private sentinel leakage.

## Git

Push skipped by current user instruction. Local commit should be created after final `git diff --check` and staging only this slice.
