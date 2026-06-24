# 2026-06-24 LV3 Loop — Family Profile Advisor Editor UI

## Scope

- Loop type: normal LV3 implementation/proof slice（cadence 3 -> 4；下一輪應跑 fifth-loop whole-product gap review）。
- Selected slice: `REL-006d family profile advisor editor UI`。
- Goal: 讓顧問可在 `/crm/[clientId]/relationships` 直接維護關係人「職位/職業、年收入或財務依賴、人物狀態、決策角色、關係脈絡」，把已完成的 `FamilyMember.metadata.profile` boundary 變成可操作的 relationship graph UI。

## Candidate Score

1. `REL-006d advisor profile editor UI` — 29/30
   - Impact 10: 直接補上 client -> relationship graph 的人物資料輸入，並讓 preparation package / theater grounding 的 profile source 有人能維護。
   - Safety 10: 不改 Prisma schema、不碰 `RelationshipEdge` table、不呼叫 provider、不寫 VisitPlan/confirmed CRM fact。
   - Verifiability 9: source/UI contract proof + dev browser/API readback proof 可重跑。
2. `Family profile -> Route B next-turn/provider prompt context` — 27/30
   - Impact 高，但 advisor 尚無 UI 時資料進一步往 provider context 推，操作價值較弱。
3. Formal `RelationshipEdge` table — blocked / high value
   - 仍需 schema/migration/rollback approval；本輪不得執行。

## Changes

- `src/app/(dashboard)/crm/[clientId]/relationships/page.tsx`
  - 新增關係人「人物資料」compact editor。
  - 每欄保留 `FACT` / `INFERENCE` / `UNKNOWN` 與 rationale。
  - Save/clear 走 `clientService.updateFamilyMemberRemote()`；payload 只含 allowlisted profile 與 relationship_graph source reference。
- `src/domains/client/family-member-profile.ts`
  - input schema 接受共用 `FAMILY_MEMBER_PROFILE_SCHEMA_VERSION`，並用 `.safeExtend()` 保留 refined schema runtime compatibility。
- `src/domains/client/service.ts`
  - 前端 family member write input 補上 `profile?: FamilyMemberProfile | null`，對齊 BFF `nullish()` 清空語意。
- `scripts/client-family-member-profile-ui-qa.mjs` + `package.json`
  - 新增 source/UI contract proof 與可選 `--browser` proof。
- `AGENTS.md`、`PLN-024`、`ACC-016`、`issue-question.md`、`loop-state.json`
  - 登記 REL-006d 完成、evidence、cadence 4 與下一輪 fifth-loop review 建議。

## Validation

- PASS `pnpm client:family-member-profile-ui-qa`
- PASS `CLIENT_FAMILY_PROFILE_UI_QA_BASE_URL=http://localhost:3067 pnpm client:family-member-profile-ui-qa --browser`
- PASS `pnpm client:family-member-profile-metadata-qa`
- PASS `pnpm visit:family-profile-theater-handoff-qa`
- PASS `pnpm theater:family-profile-session-source-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`（exit 0；repo still reports an unrelated existing warning in `scripts/public-status-degraded-qa.mjs`）

## Evidence

- Browser/API proof created demo/test client + family member via local dev server with `ALLOW_DEV_AUTH_HEADER=true`, opened profile editor on desktop/mobile, saved profile via UI, and verified API readback includes the allowlisted profile with `relationship_graph` source reference.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/rel-006d-family-profile-editor-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/rel-006d-family-profile-editor-mobile.png`
- Source proof flags: no provider call, no fake `AiUsageLog`, no browser-supplied org/user/unit scope, no `RelationshipEdge` table write, no VisitPlan write, no confirmed CRM fact write, no external registry publication.

## DB / Prisma

- Prisma schema/generate/db push: not run, not needed.
- DB write: only non-destructive demo/test BFF writes during browser proof（create demo/test client, create family member, patch `FamilyMember.metadata.profile`）under existing dev proof allowance.
- Provider calls: none; `AiUsageLog` not required for this no-provider slice.

## NANDA Alignment

- No AI module/provider route changed; no external registry publication.
- Existing internal-only Route B / visit preparation family profile grounding remains least-disclosure.
- This slice improves verified source data quality for downstream AI modules without exposing raw metadata/source reference internals.

## Blockers

- Formal `RelationshipEdge` table remains blocked on schema/migration/rollback approval.
- Relationship confirmation persistence remains blocked on product decision A/B/C.
- No new blocker introduced.

## Next Recommended Loop

- Because cadence counter is now 4, next heartbeat should run `lv3-whole-product-gap-review-loop.md`.
- If implementation resumes after review: either carry family profile grounding into Route B next-turn/provider prompt context, or wait for operator approval on formal `RelationshipEdge` schema / relationship confirmation persistence.

Git: local commit to be created after lint; push skipped by user instruction.
