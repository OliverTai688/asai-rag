# 2026-07-02 Theater Stage Lane Switcher

## Strategic review gate
- Main goal: keep simplifying Route B theater mode into a single playable surface, following the user direction to avoid multiple card regions and prefer icon/tabs/flow controls.
- Recent loops collapsed advanced sheet source/review/red-line/context panels, runtime metrics, character/evidence popovers, and family/edge source rows.
- This loop is not another source-browser pass: it removes the remaining side-by-side group/private chat lanes from the stage runtime and makes the chat area a single lane browser with icon switching.
- Acceptance anchor: Route B session browser QA and ACC-006 reconciliation markers in `scripts/theater-route-b-session-ui-qa.mjs` and `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`.

## Scope completed
- Updated `src/app/(dashboard)/theater/[sessionId]/page.tsx`.
  - Replaced the two visible group/private chat columns with one `data-route-b-stage-lane-browser`.
  - Added an icon lane switcher for `群聊` and `私聊`.
  - Only one lane panel is rendered at a time through `data-route-b-stage-lane-panel`.
  - Clicking a person on the relationship stage map now switches the chat lane to private while keeping composer scope, addressee, and state patch target aligned.
  - Removed the now-unused `RouteBLaneHeader` helper.
- Updated `scripts/theater-route-b-session-ui-qa.mjs`.
  - Added desktop/mobile proof for default group lane, private icon availability, switching to private, returning to group, one-active-panel guarantees, and no internal lane overflow.
  - Extended stage-map character click proof to assert the lane browser opens private and still renders exactly one active panel.
  - Added focused lane-switcher screenshots.
- Updated `scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs`.
  - Added source markers and browser-QA marker coverage for the single lane browser and one-panel proof.

## SubAgent review
- Epicurus reviewed the diff read-only and found no UI simplification blocker.
- It confirmed the stage runtime now has a single lane browser with conditional group/private panels, and that stage-map person clicks synchronize private lane, composer scope, addressee, and state patch target.
- It suggested strengthening QA to assert total lane panel count equals one. This was added before final validation.

## Validation
- `pnpm exec tsc --noEmit --pretty false` attempted, but local pnpm dependency-status install is still blocked by ignored build scripts for Prisma/sharp/msw.
- `./node_modules/.bin/tsc --noEmit --pretty false` — pass.
- `node scripts/theater-route-b-stage-map-acceptance-reconcile-qa.mjs` — pass.
- `DEMO_QA_BASE_URL=http://localhost:3000 node scripts/theater-route-b-session-ui-qa.mjs` — pass.
- `PATH="$PWD/node_modules/.bin:$PATH" BASE=HEAD node scripts/lint-changed.mjs` — pass.

## Browser proof
- Existing local server: `http://localhost:3000`.
- Browser QA created disposable Route B demo sessions and verified desktop/mobile views.
- New screenshots:
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-lane-switcher-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-lane-switcher-mobile.png`
- Visual inspection confirmed the runtime now shows one chat lane at a time, with private/group switching controlled by icon buttons instead of two parallel chat regions.

## DB / Prisma / provider boundary
- Prisma/schema changes: none.
- DB writes: disposable Route B demo sessions from browser QA only.
- Provider calls: none.
- `AiUsageLog`: unchanged during browser proof, `before=0 after=0`.
- CRM confirmed-fact writes: none.

## NANDA alignment
- No AgentFacts manifest, provider adapter, registry endpoint, or external access changed.
- This loop is an internal UI/control-flow simplification. Route B remains internal-only and guarded-disabled for provider actions in this proof.
- No raw provider payload, private transcript, source reference id, policy number, or external registry claim is exposed.

## Remaining blockers / next entry
- No blocker for this slice.
- Push remains skipped by operator instruction.
- Unrelated meeting workspace/repository/API dirty files remain in the worktree and were not included.
- Next suggested entry: continue the same simplification path by moving any remaining stage-runtime secondary controls into icon popovers or the advanced sheet, while preserving one active primary workflow region.
