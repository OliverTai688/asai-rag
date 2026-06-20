# 2026-06-20 LV3 Loop - RAS-005 Cross-role Sidebar QA

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `RAS-005 cross-role sidebar QA, docs sync, and AGENTS status update`.
- Reason DB-backed primary was not selected: `db.wwocdcicvpmbdmqvskzi.supabase.co` still returned `No answer`, so `ITA-003f/S1` and `BFF-103d` remain blocked for DB-backed proof.
- Provider posture: no OpenAI/Anthropic call; no `AiUsageLog` write required. Proof is explicit no-provider/no-db-write.

## Candidate Score

1. `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` - 90 raw / blocked by DB DNS. Highest product leverage, but needs persisted Route B session proof.
2. `RAS-005 cross-role sidebar QA/docs sync` - 84 executable now. Completes the role-aware navigation proof chain, improves onboarding and route safety across member/org/platform/client surfaces, and avoids DB/provider.
3. `BFF-103d related-list proof recovery` - 76 raw / blocked by DB DNS. Important source-truth recovery for client context, but cannot complete until Supabase DNS recovers.

## Selected slice

Selected `RAS-005` because it can be completed safely with deterministic fixtures and headless Browser proof while DB is blocked.

Navigation brief:

- Surface scope: member workspace, org admin workspace, platform sidebar manifest, client portal sidebar manifest.
- Roles: collaborator, member, scoped manager, unscoped manager, owner, support, finance, super admin, app-session super admin, client viewer.
- Routes: `/team/settings`, `/team/billing`, `/team/seats`, `/team/units`, `/team/invites`, `/api/org/settings`, `/api/org/units`, `/api/org/invites`, `/api/org/billing`, `/super-admin`, `/client/*`.
- Navigation change: cross-role QA script plus org write/billing route policy hardening.
- Data visibility: member routes stay member-own-assigned; org admin routes stay aggregate/settings scoped; platform/client manifests do not mix member routes.
- Plan/feature impact: AI scope remains member-own-assigned for member and org-aggregate for org; scoped manager still cannot access billing/settings write.
- Verification plan: new `pnpm nav:sidebar-cross-role-qa`, existing route/sidebar contract QA, TypeScript, lint.

## Changes

- Added `scripts/role-aware-sidebar-cross-role-qa.mjs`.
- Added `pnpm nav:sidebar-cross-role-qa`.
- Hardened `resolveWorkspaceRouteAccess()` so org write/billing route families use owner/admin `canManageWorkspaceOrgSettings()` instead of general org aggregate access.
- Expanded `scripts/role-aware-route-guard-qa.mjs` to cover manager denial for `/team/billing`, `/team/seats`, and `/api/org/units`.
- Updated `AGENTS.md` and `PLN-021` to mark RAS-004/RAS-005 fixture/source proof complete with live-auth caveats.
- Updated `loop-state.json`.

`issue-question.md` was not updated because this loop discovered no new operator decision. The remaining live session/browser limitation is an environment/access blocker already represented in docs and reports.

## Validation

Passed:

- `pnpm nav:sidebar-cross-role-qa`
- `pnpm nav:route-guard-qa`
- `pnpm nav:sidebar-ui-qa`
- `pnpm nav:sidebar-renderer-contract-qa`
- `pnpm nav:role-aware-resolver-qa`
- `pnpm nav:workspace-bootstrap-qa`
- `git diff --check`
- JSON parse check for `loop-state.json`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint:changed`

## Evidence

- `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-role-aware/ras-005-cross-role-matrix-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-role-aware/ras-005-cross-role-matrix-mobile.png`

`pnpm nav:sidebar-cross-role-qa` proves:

- member first screen keeps `今日` then `AI 工作台`.
- member assistant scope is `member-own-assigned`; org assistant scope is `org-aggregate`.
- scoped manager gets org aggregate but no billing/settings write navigation.
- app-session super admin cannot resolve platform sidebar.
- platform/client manifests do not mix member dashboard routes.
- fixture Browser desktop/mobile no horizontal overflow, console error 0, sidebar items have aria labels, keyboard focus can land on a sidebar item, and mobile keeps AI workbench visible.

This is fixture/source/headless Browser proof only. It does not claim production/staging live auth session matrix.

## DB/Prisma

- DB writes: none.
- Prisma schema/generate/db push: none.
- Provider calls: none.
- DNS evidence: `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` returned `No answer`.
- `AiUsageLog`: unchanged by design because no OpenAI/Anthropic call was made.

## Git

Push remains paused by user instruction: `push skipped by user instruction`.

## Blockers

- Environment: Supabase DB DNS still blocks DB-backed `ITA-003f/S1` and `BFF-103d` proof.
- Environment/session: production or staging live cross-role auth/browser matrix is still not claimed; this loop only provides deterministic fixture/source/headless proof.
- Provider: Route B director/character/feedback provider success/error `AiUsageLog` proof remains deferred.

## Next Recommended Loop

If DB/DNS recovers, run `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` using the new stage-map acceptance criteria, then rerun BFF-103d related-list proof. If DB remains blocked, run a quiet five-frame gap-research documentation loop for the next LV3 source gap, likely AI meeting memory / quick-capture notes ownership, without staging unrelated existing dirty files.
