# 2026-06-20 LV3 Whole-product Gap Review - Relationship Graph First

## Loop Type

- Type: scheduled fifth-loop whole-product calibration.
- Cadence: `normalLoopsSinceLastWholeProductReview` was 4 after `BFF-201`; this review reset it to 0.
- Push policy: `push skipped by user instruction`.

## Current LV3 Posture

Recent loops moved the strongest BFF proof forward: reports/share, issues, member dashboard, team/org aggregate, previsit workspace, theater handoff, Route B persisted shell, and AI usage route audit now have server-owned proof or guarded-disabled evidence. The next product risk is no longer "can a page read server data"; it is whether the first LV3 object the advisor builds, the relationship graph, can be created, persisted, and trusted before it feeds previsit and theater.

No provider calls were made in this review. No DB/Prisma writes were performed.

## Source Evidence

- `prisma/schema.prisma` `Client` model has no `parentMemberId`; `FamilyMember` has `parentMemberId`.
- `src/domains/client/types.ts`, `src/lib/clients/client-dto.ts`, `src/lib/clients/client-repository.ts`, and `src/components/crm/RelationshipMap.tsx` still read/write `Client.parentMemberId`, so the UI/repository contract is ahead of the schema truth.
- `src/components/crm/RelationshipMap.tsx` returns early for `!member.parentMemberId && generation < 0`, which can make directly attached elder nodes float without a visible parent edge.
- `src/components/crm/AddRelationshipDialog.tsx` child mode uses `createFamilyMemberRemote`, but parent mode still uses local `addFamilyMember` / `updateClient` / `updateFamilyMember`, so refresh/new-context proof is not yet trustworthy for the parent creation path.
- `src/app/(dashboard)/spin/[sessionId]/page.tsx` still fetches `/api/mock/ai/spin-outline`; `src/domains/spin/store.ts` still carries demo seed truth. This remains a protected follow-up because SPIN state machine changes need extra care.

## Top Gap Ranking

1. `REL-001/REL-002 relationship graph no-schema repair` - score 22/25.
   Highest leverage because it repairs the first LV3 workflow handoff, `新增客戶 -> 建立關係圖`, without schema migration or provider risk. It directly improves previsit/theater source truth.
2. `BFF-203 SPIN hardening` - score 19/25.
   Important because AI 了解客戶 still has mock/local fallback, but the protected SPIN state machine makes it a slightly riskier follow-up than the relationship graph repair.
3. `Interview -> VisitPlan/Theater draft writeback` - score 18/25.
   Strong LV3 leverage because interview becomes a creation surface, but product boundaries around draft confirmation, raw transcript avoidance, and theater source cards need one more design pass.
4. `BFF-204 / ITA-003f Route B provider orchestration` - score 17/25, blocked.
   High experiential leverage, but requires explicit provider/cost approval and success/error `AiUsageLog`; guarded-disabled posture must stay until then.
5. `BFF-103 remaining CRM related lists/archive/update` - score 16/25.
   Necessary for full CRM server ownership, but less directly blocking than relationship graph creation/persistence.

## Selected Next Slice

`REL-001/REL-002 no-schema relationship graph build/persistence repair`.

Acceptance focus:
- Remove required UI dependency on the schema-mismatched `Client.parentMemberId` contract.
- Fix elder/root parent edge rendering so parent/elder relations produce visible `PARENT_OF` edges.
- Make `AddRelationshipDialog` parent mode server-confirmed via `createFamilyMemberRemote` plus `PATCH /api/clients/[id]/family-members/[memberId]` re-parent.
- Prove refresh/new-context persistence for child and parent creation.
- Do not change schema, do not call provider, do not weaken compliance fields.

## Updated Artifacts

- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md`
- `docs/06_audits-and-reports/AUD-006_full-site-bff-data-source-inventory-v1.0.md`
- This report.

## Validation

- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
- PASS: `git diff --check`
- Targeted proof: source audit only (`rg` over Prisma schema, client DTO/repository/types, relationship map, relationship dialog, SPIN page/store). No provider call, no DB write.

## Remaining Blockers

- Provider/cost approval is still required before Route B director/character/feedback provider calls.
- Production schema migration approval remains required for any REL-004 edge-model schema work.
- SPIN hardening must preserve the `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF` state machine.
- AI meeting module work exists in the worktree but was not selected or staged in this review.
