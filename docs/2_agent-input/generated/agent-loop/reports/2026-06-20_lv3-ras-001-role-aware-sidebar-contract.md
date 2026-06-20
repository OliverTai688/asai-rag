# 2026-06-20 LV3 RAS-001 Role-aware Sidebar Contract

## Scope

Normal LV3 implementation/proof loop. Selected slice: RAS-001 role-aware sidebar navigation contract and legacy SPIN visibility.

DB-dependent BFF-103d follow-up was deferred because Supabase DB DNS still returned no answer for `db.wwocdcicvpmbdmqvskzi.supabase.co`.

## Candidate Score

1. BFF-103d CRM related-list full proof — 22/25 before blocker, 17/25 after penalty. It would add API/browser/DB proof for client detail -> related-list -> prep inputs, but currently depends on unavailable Supabase DNS/DB.
2. RAS-001 role-aware navigation contract / legacy SPIN visibility — 18/25. It reduces cross-surface privacy/compliance risk, preserves AI-first IA, clarifies `/interview` vs legacy `/spin`, and can be proven without DB/provider calls.
3. Build/font production blocker — 14/25. Useful launch hardening, but less directly connected to the immersive advisor workflow than RAS and would not improve client -> prep -> theater source boundaries this round.

## Navigation Brief

- Surface scope: member admin, org admin, platform/super admin, client portal.
- Roles: organization roles, platform roles, client roles, token/client-safe access boundary.
- Routes: manifest draft only; no route guard or renderer behavior changed.
- Navigation change: canonical action/link contract plus four manifest families; member AI order is `問誠問 AI` -> `AI 了解客戶` -> `AI 劇場演練`; `SPIN 舊版` is hidden behind `legacySpinNav`.
- Data visibility: member own/assigned, org aggregate/settings, platform metadata/audit, client-authorized boundaries are explicit on every item.
- Plan/feature impact: capabilities and feature flags are part of `SidebarContext`.
- Verification: TypeScript, changed-file lint, and `pnpm nav:role-aware-contract-qa`.

## Changes

- Added `src/domains/navigation/role-aware-sidebar.ts`.
- Added `scripts/role-aware-sidebar-contract-qa.mjs`.
- Added `pnpm nav:role-aware-contract-qa`.
- Updated `AGENTS.md` and `PLN-021` RAS-001 status.
- Updated `loop-state.json` cadence counter to 4 and next recommendation to scheduled whole-product gap review.
- Updated `issue-question.md` with a resolved RAS-001 note and explicit remaining RAS-002/RAS-004 scope.

## Validation

- PASS: `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` confirmed DB DNS still unavailable, so no DB-dependent proof was selected.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.
- PASS: `pnpm nav:role-aware-contract-qa`.

## Evidence

- Contract QA validates:
  - four manifest families exist: member, org admin, platform, client portal.
  - `SidebarContext` includes session type, roles, unit scope, plan capabilities, feature flags, and demo mode.
  - member AI workbench order is `問誠問 AI` -> `AI 了解客戶` -> `AI 劇場演練`.
  - `問誠問 AI` is an `openAssistant` action, not a route.
  - `SPIN 舊版` is `visible=false`, `badge=legacy`, and requires `legacySpinNav`.
  - org admin manifest has no member detail routes.
  - platform manifest stays under `/super-admin`.
  - client portal manifest excludes internal dashboard/CRM/team/AI routes.
  - contract has no OpenAI/Anthropic provider call path.

## DB / Prisma

- No Prisma schema changes.
- No `prisma db push`.
- No DB reads/writes.
- No OpenAI/Anthropic provider call; no `AiUsageLog` write needed because this is deterministic contract proof only.

## Git

- Push skipped by user instruction.
- Local commit: report is included in the loop commit; exact hash is recorded in final response / `git log -1`.

## Blockers

- Operator/environment: Supabase DB DNS remains unavailable for BFF-103d full proof.
- Source/follow-up: RAS-001 is contract-only. RAS-002 must implement resolver/policy tests; RAS-004 must later wire sidebar renderer and Browser QA.
- Production approval: none for this slice.

## Next Recommended Loop

Because cadence counter is now 4, run the scheduled fifth-loop whole-product gap review next:

```text
執行 ASAI LV3 whole-product gap review loop，重新評估 client -> relationship graph -> preparation package -> theater -> interview writeback 的架構、體驗、介面、證據與 blocker；同時納入 BFF-103d DB blocker 與 RAS-001 contract-only 狀態。
```
