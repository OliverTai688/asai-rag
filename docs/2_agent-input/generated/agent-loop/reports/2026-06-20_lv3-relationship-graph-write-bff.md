# 2026-06-20 - LV3 Relationship Graph Write BFF

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `BFF-103b family edit/delete/re-parent remote-confirmed relationship graph write path`.
- Goal: make the relationship graph safely editable through member-scoped BFF writes instead of local-only client store updates.

## Candidate Score

1. `BFF-103b family edit/delete/re-parent remote-confirmed relationship graph write path` - 18/20
   - Connects client -> relationship graph and keeps graph metadata usable for previsit/theater downstream.
   - Replaces local-only family graph writes with DB-backed, member-scoped BFF behavior.
   - Adds API/browser/DB proof for a LV3-critical editing path.
2. `ITA-003a Route B schema/runtime migration draft` - 17/20
   - Highest theater-runtime leverage for private/group chat and state changes, but requires schema/runtime migration risk; this loop chose the safer graph-write source blocker first.
3. `BFF-001 full-site data-source inventory and responsibility matrix` - 14/20
   - High platform safety leverage, but less directly tied to the current `新增客戶 -> 關係圖` immersive workflow gap.

## Selected Slice

`BFF-103b family edit/delete/re-parent remote-confirmed relationship graph write path`.

This loop did not touch Theater Route B schema/runtime and did not call any provider.

## Changes

- Added `PATCH/DELETE /api/clients/[id]/family-members/[memberId]`.
  - Uses `requireCurrentMember()` and server-side `canWriteClient()` scope through repository helpers.
  - Rejects invalid input, self-parenting, missing parent, and parent cycles.
  - Deletes safely reattach children to the deleted member's parent, or root when no parent exists.
- Added `updateFamilyMemberForClient()` and `deleteFamilyMemberForClient()`.
- Added client service `updateFamilyMemberRemote()` and `deleteFamilyMemberRemote()`.
- Updated `/crm/[clientId]/relationships` delete action to use remote-confirmed delete and toast success/error.
- Added `pnpm client:relationship-graph-write-qa`.
- Updated `AGENTS.md`, `PLN-019`, `issue-question.md`, and `loop-state.json`.

## Validation

- `pnpm exec eslint src/lib/clients/client-repository.ts 'src/app/api/clients/[id]/family-members/[memberId]/route.ts' src/domains/client/service.ts 'src/app/(dashboard)/crm/[clientId]/relationships/page.tsx' scripts/client-relationship-graph-write-qa.mjs`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `DEMO_QA_BASE_URL=http://localhost:3011 pnpm client:relationship-graph-write-qa`: pass.
- Final `pnpm lint:changed`: pass.
- Final `git diff --check`: pass.

## Evidence

`pnpm client:relationship-graph-write-qa` final proof:

- PATCH unauth returns 401.
- POST creates a demo/test client and family members through existing member BFF.
- PATCH re-parent returns 200 and persists `parentMemberId` in returned client DTO.
- PATCH rejects self-parenting and graph cycles with 400.
- Manager cannot patch member relationship detail: 404.
- DELETE returns 200, removes selected family member, keeps child node, and reattaches child to root.
- DELETE missing member returns 404.
- Browser `/crm/[clientId]/relationships` delete button uses remote delete; after reload the deleted member remains gone.
- Desktop has no horizontal overflow.
- No provider route invoked.

Screenshots:

- `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-before-delete.png`
- `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-after-delete.png`

## DB / Prisma

- Prisma schema changed: no.
- Prisma validate/generate/db push: not required.
- DB operations: approved LCH demo/test non-destructive writes against current `.env` development Supabase target through local dev server APIs: created identifiable QA clients/family members, patched `FamilyMember.parentMemberId`, deleted QA family members, and verified refreshed DB-backed UI state.
- No destructive DB operation.
- Provider calls: none. No `AiUsageLog` row required for this deterministic BFF slice.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 12]`.
- Local commit: created after final validation; final response records the commit hash.
- Push: `push skipped by user instruction`.

## Blockers

- Source blocker: BFF-103 still needs client archive/update, policy/timeline/report/gap-analysis related-list BFF completion.
- Source/product gap: main client `parentMemberId` exists in domain type but not persisted in Prisma Client; root-parent family tree edits still need a dedicated persistence design.
- Source blocker: production Route B multi-character Theater runtime/schema is not implemented.
- Operator/environment blocker: `pnpm build` remains blocked by the known Next/Turbopack Google Font path issue.

## Next Recommended Loop

Recommended next prompt:

`ITA-003a Route B schema/runtime migration draft using TDF-005a handoff contract and TDF-006 cross-state proof: consume TheaterRouteBHandoffPacket into persisted TheaterScene/TheaterCharacter/TheaterTurn visibility scope with local Prisma validate/generate only, then add director/character provider route proof with AiUsageLog. If schema risk is deferred, run BFF-001 full-site data-source inventory and responsibility matrix before the next whole-product review.`
