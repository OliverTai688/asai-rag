# 2026-06-20 LV3 RAS-002 Sidebar Resolver / Policy

## Scope

Normal LV3 implementation/proof loop.

Selected slice: `RAS-002 server-side sidebar resolver and policy tests`.

Reason for selecting fallback: the product-level primary slice remains `ITA-003f/S1 Route B relationship-graph stage map`, but Supabase DB DNS still returned no answer for `db.wwocdcicvpmbdmqvskzi.supabase.co`. RAS-002 does not require DB, provider, Prisma, browser session, or production auth rollout.

This loop intentionally did not claim route guard, workspace bootstrap, sidebar renderer, or browser auth completion.

## Candidate Score

1. `ITA-003f/S1 Route B relationship-graph stage map` — 19 raw / 14 executable after DB penalty. It best advances package/graph -> theater immersion, but persisted session/browser proof depends on unavailable Supabase DB/DNS.
2. `RAS-002 server-side sidebar resolver and policy tests` — 18 executable. It reduces cross-role privacy risk, converts RAS-001 contract into deterministic policy proof, and keeps member/org/platform/client surfaces from bleeding into each other without DB/provider.
3. `BFF-103d CRM related-list full proof rerun` — 17 raw / 12 executable after DB penalty. It is important for client -> prep inputs, but the proof is still blocked by the same DB/DNS issue.

Selected highest safe slice: RAS-002.

## Navigation Brief

- Surface scope: member admin, org admin, platform, client portal.
- Roles covered: collaborator, member, manager, org admin, org owner, support, finance, super admin, client viewer.
- Routes affected: no runtime route/layout change; resolver only projects existing manifest routes/actions.
- Navigation change: deterministic filtering/disabled projection from RAS-001 manifest.
- Data visibility: member own/assigned, org aggregate/settings, platform metadata/audit, client-authorized; no member client detail appears in org admin resolver output.
- Plan/feature impact: AI capability off disables AI workbench; legacy SPIN appears only with `legacySpinNav`; org admin capability controls aggregate/admin surfaces.
- Verification: `pnpm nav:role-aware-contract-qa`, `pnpm nav:role-aware-resolver-qa`, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`.

## Changes

- Added resolved sidebar item diagnostics and `resolveSidebarSections(context)` in `src/domains/navigation/role-aware-sidebar.ts`.
- Added navigation policy helpers: `canAccessMemberRoute`, `canAccessOrgAdmin`, `canManageOrgSettings`, `canReadOrgAggregate`, `canManageBilling`, `canUseAiModule`, `canUseScopedAssistant`, `canAccessPlatformTool`, `canReadClientPortal`, `evaluateSidebarPolicy`.
- Tightened platform impersonation navigation to super admin-only until route guard/audit proof exists.
- Added `scripts/role-aware-sidebar-resolver-qa.mjs`.
- Added `pnpm nav:role-aware-resolver-qa`.
- Updated `AGENTS.md`, `PLN-021`, `loop-state.json`, and `issue-question.md`.

## Validation

- PASS: `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` confirmed DB DNS still has no answer.
- PASS: `pnpm nav:role-aware-contract-qa`.
- PASS: `pnpm nav:role-aware-resolver-qa`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.

## Evidence

`pnpm nav:role-aware-resolver-qa` verifies:

- collaborator sees assigned work and personal settings, not team/org settings.
- member keeps AI-first workbench and hides legacy SPIN/org settings by default.
- `legacy-spin` appears only when `legacySpinNav=true`.
- AI capability off disables AI workbench rather than pretending success.
- scoped manager can enter org aggregate surface; manager without unit scope cannot.
- manager resolver output has `/team`, `/team/coaching`, `/team/members`, `/team/ai-usage`, `/team/coverage` only, with no `/crm`, `/interview`, `/theater`, `/spin`, `/pre-visit`, or `/reports` routes.
- org admin / owner can manage org settings.
- platform sidebar is empty for app session, even with `SUPER_ADMIN` role.
- support sees support metadata tools, not plan/billing/impersonation tools.
- finance sees billing/cost aggregate tools, not support/impersonation tools.
- client viewer sees only `/client/*` routes and no internal CRM/team/AI/platform routes.
- resolver source has no OpenAI/Anthropic provider call path.

## DB / Prisma

- No DB reads/writes.
- No Prisma schema changes.
- No `prisma db push`.
- No OpenAI/Anthropic provider call; no `AiUsageLog` write required because this is deterministic no-provider proof.

## Git

- Push skipped by user instruction.
- Local commit is created after validation; exact hash is recorded in final response / `git log -1`.

## Blockers

- Operator/environment: Supabase DB DNS still blocks ITA-003f persisted theater stage proof and BFF-103d full proof.
- Source follow-up: RAS-003 still needs workspace bootstrap and route guard alignment; RAS-004 still needs sidebar renderer/browser QA.
- Production approval: none for this slice.

## Next Recommended Loop

If DB/DNS recovers:

```text
執行 ITA-003f/S1 Route B relationship-graph stage map (no-provider)：讓 /theater/[sessionId] 以 Route B characters / relationship evidence 呈現可操作舞台地圖，支援點人物進私聊、發言/焦點高亮、visibility badge 與 guarded-disabled runtime 狀態；不呼叫 provider，補 member/manager/privacy/mobile proof。
```

If DB/DNS remains blocked:

```text
執行 RAS-003 workspace bootstrap and route guard alignment：用 RAS-002 resolver 輸出 bootstrap navigation sections，對齊 member/org/super/client route policy；只在有 proof 時宣稱 URL guard，缺正式 session 則清楚標 fixture/blocker。
```
