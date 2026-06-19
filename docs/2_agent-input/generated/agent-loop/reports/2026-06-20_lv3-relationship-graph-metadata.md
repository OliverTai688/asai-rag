# 2026-06-20 - LV3 Relationship Graph Metadata / Source Review

## Scope

Normal LV3 implementation/proof loop. Selected `BFF-103a Relationship graph metadata/source review` to strengthen the `client -> relationship graph -> preparation package/theater` source boundary without changing schema or weakening compliance fields.

## Candidate Score

1. `BFF-103a Relationship graph metadata/source review` — 17/20.
   - +7 connects client creation, relationship graph, preparation package, and theater readiness.
   - +6 adds member-scoped BFF/source proof without schema risk.
   - +4 provides concrete API/browser evidence and keeps fact/inference/unknown visible.
2. `PIM writeback -> VisitPlan/TheaterBuildDraft` — 14/20.
   - Strong interview-to-workspace continuation, but depends on relationship graph source quality and would be less grounded before this slice.
3. `TDF Route B stage interaction/private-group next step` — 12/20.
   - Important for immersive theater, but touches protected theater migration boundaries and should follow a whole-product review / ITA route-B slice.

## Selected Slice

`BFF-103a`: Add a server-owned relationship graph review DTO and UI proof showing per-person role/job/income/status/context with fact/inference/unknown labels and source references.

## Changes

- Added `ClientRelationshipGraphReview` deterministic builder in `src/domains/client/relationship-graph.ts`.
- Added member-scoped repository and `GET /api/clients/[id]/relationship-graph`.
- Added CRM relationships page source review panel with preparation-package and theater readiness.
- Added `pnpm client:relationship-graph-qa`.
- Updated `AGENTS.md`, `PLN-019`, `issue-question.md`, and `loop-state.json`.

## Validation

- `pnpm exec eslint src/domains/client/relationship-graph.ts src/lib/clients/relationship-graph-repository.ts 'src/app/api/clients/[id]/relationship-graph/route.ts' src/components/crm/RelationshipGraphSourceReview.tsx scripts/client-relationship-graph-qa.mjs`: pass
- `pnpm exec tsc --noEmit --pretty false`: pass
- `DEMO_QA_BASE_URL=http://localhost:3001 pnpm client:relationship-graph-qa`: pass
- `pnpm lint:changed`: pass

## Evidence

`pnpm client:relationship-graph-qa` passed:

- unauth relationship graph route returns 401.
- missing client returns 404.
- demo member can create client, family nodes, policy, then read relationship graph DTO 200.
- demo manager receives 403 on the member client graph.
- DTO contains primary/family nodes, fact/inference/unknown counts, suggested prep questions, previsit readiness, and theater readiness.
- Response contains no email/phone sentinel and no raw private sentinel.
- Browser proof on `/crm/[clientId]/relationships` renders `關係圖來源審查`, fact/inference/unknown labels, job/income/status fields, previsit/theater readiness, no raw client id in body, and no desktop/mobile horizontal overflow.

Screenshots:

- `docs/06_audits-and-reports/screenshots/lv3-relationship-graph/2026-06-20-relationship-graph-desktop.png`
- `docs/06_audits-and-reports/screenshots/lv3-relationship-graph/2026-06-20-relationship-graph-mobile.png`

## DB / Prisma

- No Prisma schema change.
- No Prisma generate / validate / db push required.
- Non-destructive demo/test writes via member-scoped BFF only: one identifiable QA client, two family members, and one policy were created for proof.
- No provider route invoked; no OpenAI/Anthropic call; AiUsageLog not required for this deterministic BFF slice.

## Git

- Local commit: pending until final git step.
- Push: `push skipped by user instruction`.

## Blockers

- Remaining BFF-103 source/write blocker: family edit/delete still uses local store helper in the CRM page; needs remote-confirmed write path.
- Remaining product blocker: related CRM subresources beyond this graph review still need BFF completion.
- Cadence blocker: `normalLoopsSinceLastWholeProductReview` is now 4, so the next heartbeat should run the whole-product gap review prompt before further implementation.

## Next Recommended Loop

Run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`. After that, choose between `PIM/BFF writeback -> VisitPlan/TheaterBuildDraft` and `BFF-103b family edit/delete remote-confirmed write path` based on updated top-3 scores.
