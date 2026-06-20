# 2026-06-20 LV3 Loop - RAS-004b Sidebar UI Wiring

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `RAS-004b sidebar UI wiring`.
- Reason DB-backed primary was not selected: `db.wwocdcicvpmbdmqvskzi.supabase.co` still failed DNS resolution before implementation, so `ITA-003f/S1 Route B relationship-graph stage map` and `BFF-103d` DB-backed proofs remain blocked.
- Provider posture: no OpenAI/Anthropic call; no `AiUsageLog` required. Proof is explicit no-provider/no-db.

## Candidate Score

1. `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` - 19 raw / executable reduced by DB DNS blocker. Strongest product slice because it connects relationship graph, preparation package, interview drafts, and theater stage, but it needs DB-backed persisted session proof.
2. `RAS-004b sidebar UI wiring` - 18 raw / executable now. Connects RAS-003 server-side navigation contract to actual dashboard shell UI, improves role-aware onboarding and surface clarity, and avoids provider/DB.
3. `BFF-103d CRM related-list proof recovery` - 17 raw / executable reduced by DB DNS blocker. Important source-truth cleanup, but blocked by the same Supabase DNS/connection issue.

## Changes

- Added `src/components/layout/role-aware-sidebar.tsx`.
  - Renders `WorkspaceSidebarRenderModel` sections, items, surface switches, active rail, tooltip/collapsed/mobile states, disabled reasons, data-boundary hooks, and assistant scope hooks.
  - Keeps assistant action limited to opening the existing assistant panel; no provider or payload changes.
- Updated `src/app/(dashboard)/layout.tsx`.
  - Builds member and orgAdmin sidebar render models server-side with `buildWorkspaceSidebarRenderModel()`.
- Updated `src/components/layout/dashboard-shell.tsx`.
  - Uses `RoleAwareSidebar` for desktop and mobile drawer.
  - Leaves legacy `src/components/layout/sidebar.tsx` untouched to avoid mixing its existing `/notes` dirty diff.
- Added `scripts/role-aware-sidebar-ui-qa.mjs` and `pnpm nav:sidebar-ui-qa`.
  - Verifies shell/layout wiring, member/org active items, member/org assistant scopes, data-boundary/reduced-motion hooks, legacy sidebar isolation, and fixture browser overflow.
- Updated `AGENTS.md`, `PLN-021`, `issue-question.md`, and `loop-state.json`.

## Validation

- PASS `pnpm nav:sidebar-ui-qa`
- PASS `pnpm nav:sidebar-renderer-contract-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`

## Evidence

- `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-role-aware/ras-004b-sidebar-ui-fixture-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-role-aware/ras-004b-sidebar-ui-fixture-mobile.png`
- Fixture browser proof has no horizontal overflow and keeps AI workbench visible.
- Live cross-role Browser/session matrix is not claimed; DB/DNS is still blocking DB-backed dashboard session proof.

## DB/Prisma

- No Prisma schema change.
- No `prisma db push`.
- No DB write.
- No provider call.

## Git

- Branch: `codex/asai-lv3-automation`
- Push: `push skipped by user instruction`
- Local commit will be created after final staging for this loop.

## Blockers

- DB/DNS blocker remains for Supabase host `db.wwocdcicvpmbdmqvskzi.supabase.co`, blocking DB-backed Route B stage-map proof and related-list proof recovery.
- RAS-005 still needs live cross-role Browser/session matrix and URL guard proof; this loop only provides source + fixture browser proof.

## Next Recommended Loop

- If Supabase DB/DNS recovers: run `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` and rerun `BFF-103d` related-list proof.
- If DB remains blocked: run `RAS-005 cross-role sidebar QA/docs sync` with fixtures, and only claim live Browser proof for surfaces that can load without DB failure.
