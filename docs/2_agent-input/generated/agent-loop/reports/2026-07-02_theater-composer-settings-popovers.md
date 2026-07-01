# 2026-07-02 LV3 Theater Composer Settings Popovers

## Strategic Review

- Current objective: continue Route B theater UI simplification with the user's direction to avoid multiple card regions and move low-frequency controls into icons, popovers, sheets, tabs, or flow structure.
- Recent loops already simplified the stage surface, advanced icon tabs, source browser, review browser, red-line browser, and context browser.
- Subagent used: `Volta` performed a read-only scan and recommended future P0/P1 follow-ups in review/compliance and next-turn preview. This round chose a smaller main-flow slice: composer settings, because it directly affects the theater game/chat interface and avoids dirty unrelated files.
- Selected slice: collapse advisor/comment composer scope, target, and state proposal controls into icon popovers while leaving the primary message/comment input visible.

## Changes

- Updated `src/app/(dashboard)/theater/[sessionId]/page.tsx`.
- Advisor composer now shows one main message input, a `Route B 發話設定` icon popover, and an icon-only submit button.
- Comment mode now shows one situation note input, a `Route B comment 設定` icon popover, and an icon-only save button.
- Popovers retain existing select labels for scope/private target/state target, preserve `requiresConfirmation=true` and `writesConfirmedCrmFact=false`, and use opaque scrollable content on mobile.
- Updated Route B browser QA to open both composer popovers and verify scoped controls plus no horizontal overflow.
- Updated static reconcile proof with composer/comment popover markers.

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

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-composer-settings-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-composer-settings-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-comment-settings-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-comment-settings-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage/route-b-session-stage-mobile.png`

## NANDA Alignment

- No AI route or provider contract changed.
- AgentFacts-style boundary remains internal-only: the composer still exposes no-provider proof, visibility scope, and state proposal write boundaries without raw provider payloads or private registry claims.
- Registry gap unchanged: Route B theater remains internal manifest-ready, not externally registered.

## Remaining Blockers / Next Entry

- Push skipped by current user instruction.
- Next recommended slice from subagent: convert `RouteBNextTurnPreviewPanel` into an icon-tab browser (`預覽` / `來源` / `Provider` / `Guard`) so the popover no longer contains multiple card-like panels.
