# 2026-06-20 LV3 Relationship Graph Edge Convergence

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `REL-003 relationship graph BFF edge convergence`.
- Goal: make the interactive relationship map consume the same relationship-graph review truth as the BFF source review, without schema changes or provider calls.
- Push policy: `push skipped by user instruction`.

## Candidate Score

1. `REL-003 relationship graph BFF edge convergence` - 22/25. Connects `client -> relationship graph -> previsit/theater source`, replaces UI-only edge recomputation with one BFF/domain truth, improves privacy-safe DTO proof, and stays no-schema/no-provider.
2. `BFF-203 SPIN hardening` - 19/25. Important for AI 了解客戶, but protected SPIN state-machine risk makes it a follow-up.
3. `Interview -> VisitPlan/Theater draft writeback` - 18/25. Strong cross-surface leverage, but draft confirmation and raw transcript boundaries still need a product boundary pass.

## Selected Slice

`REL-003 relationship graph BFF edge convergence`.

Acceptance focus:
- Derive typed edges from existing `FamilyMember.parentMemberId` and `relation`.
- Keep node/edge DTO free of email, phone, raw provider payload, secret, cookie, or private sentinel values.
- Make `RelationshipMap` consume the same review builder nodes/edges as `/api/clients/[id]/relationship-graph`.
- Render spouse/sibling as same-rank edges and social ties as association edges.
- Do not change Prisma schema, SPIN state machine, Theater enum/scoring, or compliance fields.

## Changes

- `ClientRelationshipGraphReview` now includes `edges` and `sourceSummary.edgeCount`.
- Added typed edge derivation for `PARENT_OF`, `SPOUSE_OF`, `SIBLING_OF`, and `SOCIAL_TIE`; `CHILD_OF` remains in the type contract for the future schema-era compatibility.
- `RelationshipMap` now builds ReactFlow nodes/edges from `buildClientRelationshipGraphReview(client)` instead of recomputing graph truth locally.
- Spouse and sibling edges receive same-rank layout hints; social ties do not drive hierarchical rank.
- Source review header now shows edge count.
- `client:relationship-graph-qa` now proves edge types, edge fact status, node/edge count, no seeded email/phone sentinel, no raw private sentinel, and desktop/mobile no overflow.
- REL docs, issue-question, and loop-state were updated.

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.
- PASS `DEMO_QA_BASE_URL=http://localhost:3027 pnpm client:relationship-graph-qa`.
- PASS `DEMO_QA_BASE_URL=http://localhost:3027 pnpm client:relationship-graph-write-qa`.
- PASS `git diff --check`.

Note: first targeted QA attempt against `http://localhost:3000` returned 404 because that port was not serving this repo's API. A dedicated dev server was started with `ALLOW_DEV_AUTH_HEADER=true pnpm dev --port 3027`; all targeted evidence above uses that server.

## Evidence

- API proof: unauth 401, create graph QA client 201, relationship graph detail 200, missing client 404, manager forbidden 403.
- Edge proof: `nodes=5`, `edges=4`, `sourceSummary.edgeCount=4`, and edge types include `PARENT_OF`, `SPOUSE_OF`, `SIBLING_OF`, `SOCIAL_TIE`.
- Privacy proof: response contains no seeded email/phone sentinel, raw payload, cookie, secret, authorization, or provider payload sentinel.
- Browser proof: relationship graph review renders fact/inference/unknown labels, job/income/status fields, previsit/theater readiness, and 4 BFF-derived ReactFlow edges; desktop/mobile no horizontal overflow.
- Write regression proof: parent create/reload/delete, root elder edge, re-parent, self-parent/cycle guards, manager denial, and mobile overflow still pass.
- Screenshots updated by QA:
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph/2026-06-20-relationship-graph-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph/2026-06-20-relationship-graph-mobile.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-parent-create.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-after-delete.png`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/2026-06-20-relationship-graph-write-mobile.png`

## DB / Prisma

- Prisma schema/generate/db push: not run; no schema change.
- DB writes: targeted QA created identifiable demo/test clients, family members, and policies through member-scoped BFF routes on the approved development/demo target. No destructive operation and no production write.
- Provider: no OpenAI/Anthropic call; no `AiUsageLog` required. Both targeted QA scripts are deterministic BFF/browser proof.

## Git

- Local commit required after final validation.
- Push: `push skipped by user instruction`.

## Blockers

- Source: REL-004 full edge table remains blocked until migration/rollback approval; CRM related-list/archive/update BFF gaps remain.
- Operator/environment: provider/cost approval still required for Route B AI orchestration; production build font blocker remains separate.
- Product decision: interview-to-previsit/theater draft confirmation boundary remains open.

## Next Recommended Loop

Run `REL-005 relationship graph layout/interaction polish`: keep REL-004 schema work blocked until explicit approval, and instead harden the no-schema graph UI with cross-state QA for empty, single-parent, dual-parent, spouse, sibling, and social-tie states; add toolbar tooltip/aria polish, reduced-motion/dark-mode checks, and screenshot evidence.
