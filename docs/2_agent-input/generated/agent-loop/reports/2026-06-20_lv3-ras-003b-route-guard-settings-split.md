# 2026-06-20 LV3 RAS-003b Route Guard / Settings Split

## Scope

Normal LV3 implementation/proof loop.

Selected slice: `RAS-003b route guard/settings split proof`.

Reason for selecting fallback: the product-level primary slice remains `ITA-003f/S1 Route B relationship-graph stage map`, but Supabase DB DNS still returned no answer for `db.wwocdcicvpmbdmqvskzi.supabase.co`. RAS-003b can reduce auth/privacy risk and advance role-aware surface maturity without DB writes, provider calls, or production auth rollout.

This loop completes RAS-003 source/fixture proof. It intentionally does not claim RAS-004 sidebar renderer completion or RAS-005 cross-role browser session matrix completion.

## Candidate Score

1. `ITA-003f/S1 Route B relationship-graph stage map` - 19 raw / 14 executable after DB penalty. It best advances package/graph -> theater immersion, but persisted theater session/browser proof depends on unavailable Supabase DB/DNS.
2. `RAS-003b route guard/settings split proof` - 18 executable. It reduces role/route leakage risk, aligns bootstrap/navigation policy with page/API guards, and closes the `/team/settings` owner/admin split without DB/provider.
3. `BFF-103d CRM related-list full proof rerun` - 17 raw / 12 executable after DB penalty. It remains important for client -> prep inputs, but the full API/browser proof is still blocked by the same DB/DNS issue.

Selected highest safe slice: RAS-003b.

## Navigation Brief

- Surface scope: member workspace and org admin workspace; platform/client routes are explicitly rejected by workspace route policy.
- Roles covered by fixture proof: member, owner, admin, scoped manager, unscoped manager.
- Routes affected: `/team`, `/team/settings`, `/settings`, `/api/org/settings`; source proof also checks `/super-admin` and `/client/*` denial from app workspace policy.
- Navigation change: no renderer change. Bootstrap `routeGuardAlignment` now records policy-aligned org and org-settings guards.
- Data visibility: `/team` requires org aggregate visibility; `/team/settings` and `/api/org/settings` require owner/admin settings permission.
- Plan/feature impact: manager org aggregate requires managed unit scope; org settings remains owner/admin only.
- Verification plan: RAS contract/resolver/bootstrap QA, new route-guard QA, TypeScript, lint.

## Changes

- Added `canReadWorkspaceOrgAggregate()`, `canManageWorkspaceOrgSettings()`, and `resolveWorkspaceRouteAccess()` in `src/lib/navigation/workspace-sidebar.ts`.
- Updated `workspaceRouteGuardAlignment` and bootstrap proof docs to include route guard redirect docs.
- Tightened `requireOrgAdmin()` in `src/lib/auth/current-workspace.ts` to use role-aware org aggregate policy.
- Added `requireOrgSettingsAdmin()` for owner/admin-only org settings API access.
- Updated `src/lib/auth/route-guards.ts` to use policy helpers and add `requireOrgSettingsRoute()`.
- Updated `/team/settings` page to use `requireOrgSettingsRoute()`.
- Updated `/api/org/settings` to use `requireOrgSettingsAdmin()`.
- Added `scripts/role-aware-route-guard-qa.mjs` and `pnpm nav:route-guard-qa`.
- Updated `scripts/role-aware-workspace-bootstrap-qa.mjs`, `AGENTS.md`, `PLN-021`, `loop-state.json`, and `issue-question.md`.

## Validation

- PASS: `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` confirmed DB DNS still has no answer.
- PASS: `pnpm nav:role-aware-contract-qa`.
- PASS: `pnpm nav:role-aware-resolver-qa`.
- PASS: `pnpm nav:workspace-bootstrap-qa`.
- PASS: `pnpm nav:route-guard-qa`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.
- PASS: targeted ESLint for changed source/script files.

## Evidence

`pnpm nav:route-guard-qa` verifies:

- owner/admin can read org aggregate and manage org settings.
- scoped manager can read org aggregate but cannot manage org settings.
- unscoped manager cannot hand-type `/team`.
- member cannot hand-type `/team` or `/team/settings`.
- scoped manager denied from `/team/settings` redirects to `/team`.
- member/unscoped manager denied from org routes redirects to `/dashboard`.
- app workspace policy rejects `/super-admin` and `/client/*`.
- `/team` uses `requireOrgAdminRoute()`.
- `/team/settings` uses `requireOrgSettingsRoute()`.
- `/api/org/settings` uses `requireOrgSettingsAdmin()`.
- route guard source has no OpenAI/Anthropic provider imports.

## DB / Prisma

- No DB reads/writes beyond the DNS probe.
- No Prisma schema changes.
- No `prisma db push`.
- No OpenAI/Anthropic provider call; no `AiUsageLog` write required because this is deterministic no-provider proof.

## Git

- Push skipped by user instruction.
- Local commit is created after validation; exact hash is recorded in final response / `git log -1`.

## Blockers

- Environment: Supabase DB DNS still blocks ITA-003f persisted theater stage proof and BFF-103d full proof.
- UI follow-up: RAS-004 still needs sidebar renderer to consume bootstrap navigation sections and handle surface switch in UI.
- Browser/session follow-up: RAS-005 still needs cross-role Browser/URL guard matrix with real or controlled sessions.
- Production approval: none for this slice.

## Next Recommended Loop

If DB/DNS recovers:

```text
執行 ITA-003f/S1 Route B relationship-graph stage map (no-provider)：讓 /theater/[sessionId] 以 Route B characters / relationship evidence 呈現可操作舞台地圖，支援點人物進私聊、發言/焦點高亮、visibility badge 與 guarded-disabled runtime 狀態；不呼叫 provider，補 member/manager/privacy/mobile proof。
```

If DB/DNS remains blocked:

```text
執行 RAS-004 sidebar renderer / surface switch：讓登入後 sidebar 消費 /api/workspace/bootstrap.navigation 或同等 server helper 的 resolved sections，保留 AI-first member surface、org admin surface switch、legacy SPIN flag、tooltip/aria/mobile 行為；避免 stage unrelated existing sidebar dirty changes。
```
