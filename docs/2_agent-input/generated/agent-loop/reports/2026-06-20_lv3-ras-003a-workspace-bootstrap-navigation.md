# 2026-06-20 LV3 RAS-003a Workspace Bootstrap Navigation

## Scope

Normal LV3 implementation/proof loop.

Selected slice: `RAS-003a workspace bootstrap navigation contract`.

Reason for selecting fallback: the product-level primary slice remains `ITA-003f/S1 Route B relationship-graph stage map`, but Supabase DB DNS still returned no answer for `db.wwocdcicvpmbdmqvskzi.supabase.co`. RAS-003a can safely advance role-aware surface architecture without DB writes, provider calls, or production auth rollout.

This loop intentionally does not claim full RAS-003 completion. URL hand-typed guard proof, `/team/settings` route split, sidebar renderer consumption, and browser auth QA remain follow-up work.

## Candidate Score

1. `ITA-003f/S1 Route B relationship-graph stage map` - 19 raw / 14 executable after DB penalty. It best advances package/graph -> theater immersion, but persisted theater session/browser proof depends on unavailable Supabase DB/DNS.
2. `RAS-003a workspace bootstrap navigation contract` - 18 executable. It connects RAS-002 resolver output to the real `/api/workspace/bootstrap` boundary, returns sections/default surface/surface switches/settings policy, and does not require DB writes or provider calls.
3. `BFF-103d CRM related-list full proof rerun` - 17 raw / 12 executable after DB penalty. It remains important for client -> prep inputs, but the full API/browser proof is still blocked by the same DB/DNS issue.

Selected highest safe slice: RAS-003a.

## Navigation Brief

- Surface scope: member and org admin workspace bootstrap; platform/client surfaces remain outside app workspace bootstrap.
- Roles covered by fixture proof: member, owner, scoped manager, unscoped manager, legacy `AGENT`.
- Routes affected: `/api/workspace/bootstrap` now accepts optional `surface=member|orgAdmin` and includes navigation payload.
- Data visibility: member surface returns member own/assigned sections; org admin surface returns org aggregate/settings only and does not mix member client work routes.
- Surface switch: member/org-admin entries are explicit, available/unavailable, and include disabled reasons.
- Settings policy: `/settings` is current-member policy; `/team/settings` is owner/admin policy, with manager mode recorded as scoped/read-only-or-hidden.
- Verification: `pnpm nav:workspace-bootstrap-qa`, existing RAS contract/resolver QA, `tsc`, and `lint:changed`.

## Changes

- Added `src/lib/navigation/workspace-sidebar.ts` as the AppSession -> role-aware sidebar bootstrap helper.
- Updated `src/app/api/workspace/bootstrap/route.ts` to include `navigation` alongside existing user/org/membership/plan/quota/auth fields.
- Added `scripts/role-aware-workspace-bootstrap-qa.mjs`.
- Added `pnpm nav:workspace-bootstrap-qa`.
- Updated `AGENTS.md`, `PLN-021`, `loop-state.json`, and `issue-question.md`.

## Validation

- PASS: `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` confirmed DB DNS still has no answer.
- PASS: `pnpm nav:workspace-bootstrap-qa`.
- PASS: `pnpm nav:role-aware-contract-qa`.
- PASS: `pnpm nav:role-aware-resolver-qa`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.
- PASS: `pnpm exec eslint src/lib/navigation/workspace-sidebar.ts src/app/api/workspace/bootstrap/route.ts scripts/role-aware-workspace-bootstrap-qa.mjs`.

## Evidence

`pnpm nav:workspace-bootstrap-qa` verifies:

- `/api/workspace/bootstrap` imports and returns `buildWorkspaceBootstrapNavigation`.
- Bootstrap proof records the Next route handler docs path.
- Member defaults to member surface, receives `AI 工作台`, and does not receive org settings.
- Member gets an explicit unavailable org surface switch with `ROLE_RESTRICTED`.
- Legacy `AGENT` role maps to member navigation role.
- Owner can request org admin surface and receives org settings/billing when allowed.
- Org admin surface does not expose `/crm`, `/interview`, `/theater`, `/spin`, `/pre-visit`, or `/reports`.
- Scoped manager can request org admin surface but does not receive org settings or billing.
- Unscoped manager is downgraded to member surface and gets `UNIT_SCOPE_REQUIRED`.
- Quota exhausted state disables assistant item with `AI_DISABLED`, rather than faking availability.
- Route guard alignment records current guard names plus the manager-scope follow-up.
- Bootstrap navigation source has no OpenAI/Anthropic provider imports.

## DB / Prisma

- No DB reads/writes beyond the failed DNS probe.
- No Prisma schema changes.
- No `prisma db push`.
- No OpenAI/Anthropic provider call; no `AiUsageLog` write required because this is deterministic no-provider proof.

## Git

- Push skipped by user instruction.
- Local commit is created after validation; exact hash is recorded in final response / `git log -1`.

## Blockers

- Environment: Supabase DB DNS still blocks ITA-003f persisted theater stage proof and BFF-103d full proof.
- Source follow-up: RAS-003b still needs actual URL route guard/settings split. Current bootstrap returns the policy matrix, but `requireOrgAdminRoute` / `/team/settings` still need targeted alignment proof before RAS-003 is complete.
- UI follow-up: RAS-004 still needs sidebar renderer to consume bootstrap navigation sections and browser QA.
- Production approval: none for this slice.

## Next Recommended Loop

If DB/DNS recovers:

```text
執行 ITA-003f/S1 Route B relationship-graph stage map (no-provider)：讓 /theater/[sessionId] 以 Route B characters / relationship evidence 呈現可操作舞台地圖，支援點人物進私聊、發言/焦點高亮、visibility badge 與 guarded-disabled runtime 狀態；不呼叫 provider，補 member/manager/privacy/mobile proof。
```

If DB/DNS remains blocked:

```text
執行 RAS-003b route guard/settings split proof：讓 requireOrgAdminRoute、/team/settings、manager scoped/read-only-or-hidden 與 /api/workspace/bootstrap.navigation.routeGuardAlignment 對齊；補 hand-typed URL/API proof，再進 RAS-004 sidebar renderer。
```
