# 2026-07-02 Theater Review Inner Browsers

## Scope

Selected slice: simplify the Route B review browser internals so `五視角回顧` and `待審閱候選` no longer read as nested multi-card/detail stacks.

Strategic review: recent loops converted Route B stage, source evidence, next-turn preview, red-line, context, and outer review regions into focused browser surfaces. The previous review-browser loop still left the feedback/compliance content with stacked details inside the sheet. This loop is not another docs-only pass: it is an L2 UI implementation/proof slice that completes the review surface simplification requested by the operator.

SubAgent check: a read-only subAgent reviewed this diff and reported no blocking issues. It recommended adding stronger active-state proof and long-label wrapping; both were addressed in this loop.

## Changes

- `src/app/(dashboard)/theater/[sessionId]/page.tsx`
  - Added focused inner browsers for feedback review and compliance intake.
  - `五視角回顧` now switches between `回顧總覽`, `五視角`, and `紅線` icon tabs.
  - `待審閱候選` now switches between `候選總覽`, `候選`, and `邊界` icon tabs.
  - Removed always-expanded inner details from these regions and kept content in one selected view at a time.
  - Added long-label wrapping on selected red-line/candidate headers and badges for mobile resilience.
- `scripts/theater-route-b-session-ui-qa.mjs`
  - Added browser QA for both inner browsers.
  - Checks every inner tab on desktop/mobile, asserts active data markers, and verifies no horizontal overflow.
  - Saves focused screenshots for feedback and compliance inner browser states.
- `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
  - Added static markers for inner browser data attributes and active-state browser proof.

## Validation

- PASS `./node_modules/.bin/tsc --noEmit --pretty false`
- PASS `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs`
  - desktop/mobile feedback inner browser renders and switches `overview`, `perspectives`, `redLines`
  - desktop/mobile compliance inner browser renders and switches `overview`, `candidate`, `boundary`
  - every switched view has no horizontal overflow
  - Route B session UI proof writes no fake `AiUsageLog`: `before=0 after=0`
- PASS `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs`

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-feedback-browser-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-feedback-browser-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-compliance-browser-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-compliance-browser-mobile.png`

## DB/Prisma

No Prisma schema change, migration, generated client edit, or `prisma db push`.

Browser QA created disposable Route B demo/test sessions through `/api/theater/route-b/sessions`. Provider calls remained disabled, no THEATER `AiUsageLog` was written, and no CRM confirmed facts were written.

## NANDA Alignment

No AI module manifest, provider adapter, registry endpoint, or external access changed. The UI exposes internal no-provider review state and guard boundaries only. Registry readiness remains internal-only/manifest-ready; any future AgentFacts export must redact private transcript, raw provider payload, formal compliance finding detail, and CRM identifiers.

## Blockers

- None for this UI slice.
- Non-blocking future a11y polish: these custom icon tabs use `role="tab"` and `aria-selected`, but do not yet implement full `aria-controls`/`tabpanel` or roving arrow-key behavior. Consider migrating them to the shared Tabs primitive once the Route B sheet structure stabilizes.

## Next Recommended Loop

Move one layer outward to the adjacent AI workbench: simplify the theater build/setup surface or the assistant panel entrypoints so the user flow stays `select context -> open stage -> speak/comment`, with secondary settings in popovers/sheets instead of visible card stacks.

## Git

Push skipped by current user instruction. Local commit should be created after final `git diff --check` and staging only this slice.
