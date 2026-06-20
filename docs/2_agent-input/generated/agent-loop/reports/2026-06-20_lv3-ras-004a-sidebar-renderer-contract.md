# 2026-06-20 LV3 RAS-004a Sidebar Renderer Contract

## Scope

Normal LV3 implementation/proof loop.

Selected slice: `RAS-004a sidebar renderer contract adapter`.

Reason for selecting fallback: the product-level primary slice remains `ITA-003f/S1 Route B relationship-graph stage map`, but Supabase DB DNS still returned no answer for `db.wwocdcicvpmbdmqvskzi.supabase.co`. RAS-004a advances the role-aware interface architecture without DB writes, provider calls, or touching the currently dirty `src/components/layout/sidebar.tsx`.

This loop does not claim full RAS-004 completion. Sidebar React UI wiring, desktop/mobile Browser QA, and cross-role session QA remain follow-up work.

## Candidate Score

1. `ITA-003f/S1 Route B relationship-graph stage map` - 19 raw / 14 executable after DB penalty. It best advances package/graph -> theater immersion, but persisted theater stage proof depends on unavailable Supabase DB/DNS.
2. `RAS-004a sidebar renderer contract adapter` - 17 executable. It connects RAS-003 bootstrap navigation to a renderer-ready view model, preserves AI-first/member-vs-org scope, and avoids the unrelated existing sidebar `/notes` dirty diff.
3. `BFF-103d CRM related-list full proof rerun` - 17 raw / 12 executable after DB penalty. It remains important for client -> prep inputs, but full API/browser proof is still blocked by the same DB/DNS issue.

Selected highest safe slice: RAS-004a.

## Navigation Brief

- Surface scope: member workspace and org admin workspace render models.
- Roles covered by fixture proof: member, owner, scoped manager, unscoped manager.
- Routes affected: no runtime route/layout change; `src/components/layout/sidebar.tsx` not edited.
- Navigation change: RAS-003 `sidebarSections` and `surfaceSwitches` now have a renderer-friendly `primarySections`, action union, `surfaceSwitches`, and `activeItemId`.
- Data visibility: member assistant remains `member-own-assigned`; org assistant remains `org-aggregate`.
- Plan/feature impact: AI quota disabled state remains disabled in render items; legacy SPIN stays behind `LEGACY_SPIN_NAV` / `NEXT_PUBLIC_LEGACY_SPIN_NAV`.
- Verification plan: new renderer contract QA, existing RAS contract/resolver/bootstrap/route-guard QA, TypeScript, lint.

## Changes

- Added renderer view-model types and `buildWorkspaceSidebarRenderModel()` in `src/lib/navigation/workspace-sidebar.ts`.
- Added `resolveWorkspaceSidebarActiveItemId()` with longest-prefix matching and `/team/settings` exclusion from `/team`.
- Added `scripts/role-aware-sidebar-renderer-contract-qa.mjs`.
- Added `pnpm nav:sidebar-renderer-contract-qa`.
- Updated `AGENTS.md` and `PLN-021` with a RAS-004a progress note, without checking off RAS-004.
- Updated `loop-state.json` cadence to 4, and recorded next loop should be the scheduled whole-product review.
- Updated `issue-question.md` with a resolved RAS-004a note.

## Validation

- PASS: `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` confirmed DB DNS still has no answer.
- PASS: `pnpm nav:sidebar-renderer-contract-qa`.
- PASS: `pnpm nav:role-aware-contract-qa`.
- PASS: `pnpm nav:role-aware-resolver-qa`.
- PASS: `pnpm nav:workspace-bootstrap-qa`.
- PASS: `pnpm nav:route-guard-qa`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.

## Evidence

`pnpm nav:sidebar-renderer-contract-qa` verifies:

- member render model starts with `今日` and `AI 工作台`.
- member AI workbench order remains `ask-asai`, `ai-understand-client`, `ai-theater`.
- member assistant action is scoped to `member-own-assigned`.
- `/interview/*` activates `ai-understand-client`; `/theater/*` activates `ai-theater`.
- `legacy-spin` is hidden by default and appears only with `LEGACY_SPIN_NAV=true`.
- member org-admin surface switch is disabled with `ROLE_RESTRICTED`.
- owner org surface does not mix `/crm`, `/interview`, `/theater`, `/spin`, `/pre-visit`, or `/reports`.
- org assistant action is scoped to `org-aggregate`.
- `/team/settings` activates `org-settings`, not `org-home`.
- scoped manager sees org aggregate but not org settings/billing.
- unscoped manager is downgraded to member surface with `UNIT_SCOPE_REQUIRED`.
- AI quota exhausted disables `ask-asai`.
- proof records no-provider, no-db-write, and `dirtySidebarFileTouched=false`.

## DB / Prisma

- No DB reads/writes beyond the DNS probe.
- No Prisma schema changes.
- No `prisma db push`.
- No OpenAI/Anthropic provider call; no `AiUsageLog` write required because this is deterministic no-provider proof.

## Git

- Push skipped by user instruction.
- Local commit is created after validation; exact hash is recorded in final response / `git log -1`.

## Blockers

- Operator/environment: Supabase DB DNS still blocks ITA-003f persisted theater stage proof and BFF-103d full proof.
- Source/UI: RAS-004b still needs `src/components/layout/sidebar.tsx` to consume `buildWorkspaceSidebarRenderModel()` and do Browser QA.
- Worktree hygiene: `src/components/layout/sidebar.tsx` has an existing unrelated `/notes` dirty diff that must be isolated or intentionally handled before staging UI wiring.
- Browser/session: RAS-005 still needs cross-role Browser/URL guard matrix with real or controlled sessions.
- Production approval: none for this slice.

## Next Recommended Loop

Cadence counter is now 4, so run the scheduled whole-product review next:

```text
執行 ASAI LV3 whole-product gap review loop，重新評估 client -> relationship graph -> preparation package -> theater -> interview writeback 的架構、體驗、介面、證據與 blocker；納入 RAS-004a renderer contract 已完成但 sidebar UI wiring/Browser QA 尚未完成，以及 Supabase DB/DNS 仍 blocked 的狀態。
```
