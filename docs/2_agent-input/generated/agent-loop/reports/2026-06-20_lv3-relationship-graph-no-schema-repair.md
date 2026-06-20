# 2026-06-20 LV3 Relationship Graph No-schema Repair

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `REL-001/REL-002 no-schema relationship graph build/persistence repair`.
- Goal: make `新增客戶 -> 建立關係圖` reliable enough for the rest of the LV3 flow by fixing root elder edges and parent-mode persistence without schema changes.
- Push policy: `push skipped by user instruction`.

## Candidate Score

1. `REL-001/REL-002 relationship graph no-schema repair` - 22/25. Directly fixes `client -> relationship graph`, removes local-only parent writes, improves BFF/session-owned proof, and avoids schema/provider risk.
2. `BFF-203 SPIN hardening` - 19/25. Important source hardening for AI 了解客戶, but protected SPIN state-machine risk makes it a follow-up.
3. `Interview -> VisitPlan/Theater draft writeback` - 18/25. Strong cross-surface leverage, but draft confirmation and raw transcript boundaries need one more design pass.

## Changes

- Removed runtime `Client.parentMemberId` from the client domain type.
- Removed `RelationshipMap`'s `client.parentMemberId` edge path and dead code.
- Root-connected elders now render as `elder -> primary client` edges instead of floating without an edge.
- `AddRelationshipDialog` parent mode now creates the new parent through `createFamilyMemberRemote`, then re-parents the selected child through `updateFamilyMemberRemote`.
- Local family write helpers were marked dev-only; production relationship writes now use BFF-confirmed paths.
- `client:relationship-graph-write-qa` now covers invalid create, root elder reload, browser toolbar parent creation, reload persistence, delete, and mobile overflow.
- `client:relationship-graph-qa` private sentinel was tightened to seeded email/phone values to avoid timestamp false positives.
- REL workstream docs, BFF inventory, issue-question, and loop-state were updated.

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm client:relationship-graph-write-qa`
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm client:relationship-graph-qa`
- PASS final rerun after report/docs edit: `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, `git diff --check`

## Evidence

- API proof: unauth 401, missing name 400, create 201, re-parent 200, self/cycle 400, manager 404, delete 200, missing delete 404.
- Persist proof: root elder persists without `Client.parentMemberId`; browser toolbar parent create persists after reload and target child shows `連結至` the new parent.
- Browser proof: desktop and mobile no horizontal overflow; relationship graph review still renders fact/inference/unknown, previsit readiness, and theater readiness.
- Privacy proof: seeded email/phone and raw private sentinel checks pass.
- No-provider proof: both targeted scripts use deterministic client/family/relationship-graph BFF routes only.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-parent-create.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-after-delete.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-mobile.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph/2026-06-20-relationship-graph-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph/2026-06-20-relationship-graph-mobile.png`

## DB / Prisma

- Prisma schema/generate/db push: not run; no schema change.
- DB writes: targeted QA created identifiable demo/test client, family members, and policy rows through member-scoped BFFs on the approved development/demo target. No destructive operation, no delete beyond the QA-created family member, no production write.
- Provider: no OpenAI/Anthropic call; no `AiUsageLog` required.

## Git

- Local commit required after final validation.
- Push: `push skipped by user instruction`.

## Blockers

- Source: REL-003 still needs one BFF-derived edge truth for `RelationshipMap` and relationship-graph review; CRM related-list/archive/update BFF gaps remain.
- Operator/environment: provider/cost approval still required for Route B AI orchestration; production build font blocker remains separate.
- Production approval: REL-004 edge-model schema migration requires explicit migration/rollback approval.

## Next Recommended Loop

Run `REL-003 relationship graph BFF edge convergence`: derive typed `PARENT_OF` / `SPOUSE_OF` / `SIBLING_OF` / `SOCIAL_TIE` edges from existing `FamilyMember` data, keep node/edge DTO free of email/phone, and make `RelationshipMap` consume the same BFF truth as the relationship-graph review without changing schema.
