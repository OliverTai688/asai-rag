# 2026-06-25 LV3 REL-008 Linked Client Map Navigation

## Scope
- Loop type: normal LV3 implementation/proof loop, not fifth-loop whole-product review.
- Task level: L2 source/UI implementation + executable API/browser proof.
- Selected slice: REL-008 `RelationshipMap` linked-client navigation affordance.
- Anti-repetition: last two loops were REL-007 parent/relation hardening and REL-008 source/BFF linked-client contract. This loop is not docs/checklist repetition; it completes the adjacent visible UI affordance and proof for the same client -> relationship graph source chain.

## Candidate Score
1. REL-008 linked-client map navigation affordance — 9.1/10. Directly connects client detail BFF -> relationship graph UI, closes a named REL-008 acceptance item, and is DB/browser proofable without schema work.
2. REL-009 BFF convergence/perf/a11y polish — 8.4/10. Important next cleanup, but larger scope and less surgical than finishing the current linked-client UX.
3. Relationship graph cold-start proof harness stability — 8.0/10. Useful release evidence, but does not advance advisor-visible product behavior.

## Changes
- `src/lib/clients/client-repository.ts`
  - Client detail BFF now enriches family members with owner-scoped linked-client summaries when readable.
  - Unreadable linked targets remain generic unavailable markers and do not expose target name, email, phone, owner, or private details.
- `src/components/crm/RelationshipMap.tsx`
  - Person nodes now carry `linkedClient` metadata.
  - Readable linked clients render a focusable same-app `/crm/[clientId]` navigation affordance.
  - Unavailable linked clients render a non-clickable marker.
- `scripts/client-relationship-graph-write-qa.mjs`
  - Browser proof now asserts linked family node visibility, readable CRM href, linked email/phone sentinel absence, and source-level unavailable navigation gating.

## Validation
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
  - Existing warning only: `scripts/public-status-degraded-qa.mjs` unused `existsSync`.
- PASS `DEMO_QA_BASE_URL=http://127.0.0.1:3070 pnpm client:relationship-graph-write-qa`
- FAIL / unrelated worktree source-check blocker: `pnpm client:relationship-edge-shadow-bff-qa`
  - Fails only on `REL-004b keeps Prisma schema unchanged until formal RelationshipEdge approval` because current worktree has pre-existing dirty `prisma/schema.prisma`.
  - This loop did not modify or stage `prisma/schema.prisma`.

## Evidence
- API proof: readable `linkedClientId` persists, relationship graph BFF returns navigable `/crm/[linkedClientId]`, context names readable linked client, edge-shadow summary counts linked-client candidates, email/phone sentinels absent.
- Browser proof: `/crm/[clientId]/relationships` renders linked-client family node and readable linked-client affordance with correct href; linked email/phone sentinels absent; desktop/mobile no horizontal overflow.
- Source proof: `RelationshipMap` has explicit unavailable state and only navigates when `linkedClient.canNavigate && linkedClient.href`.

## DB/Prisma
- No Prisma schema change, no migration, no `prisma db push`, no `src/generated` edit by this loop.
- Non-destructive demo/test DB writes were performed by `client:relationship-graph-write-qa` under existing AGENTS.md authorization.
- No provider call; no `AiUsageLog` required or faked.

## NANDA Alignment
- No AI module/provider route changed.
- Relationship graph source contract is safer for downstream AI modules because linked-client metadata is allowlisted and owner-scoped before it can ground previsit/theater context.
- External AgentFacts/NANDA publication remains unapproved and not attempted.

## Git
- Branch: `codex/asai-lv3-automation`
- Commit: pending at report write time.
- Push: `push skipped by user instruction`.

## Blockers
- Product/schema blocker remains: formal durable `RelationshipEdge` table still needs operator approval before migration/db push.
- Product decision blocker remains: relationship confirmation persistence A/B/C still unanswered.
- Worktree/source-check blocker: unrelated dirty `prisma/schema.prisma` makes `client:relationship-edge-shadow-bff-qa` fail its no-schema-change sentinel.
- Proof-maintenance blocker remains: cold-start/browser `client:relationship-graph-qa` reliability can be improved separately.

## Next Recommended Loop
- Select REL-009 BFF convergence/perf/a11y/upper-limit polish, or stabilize `pnpm client:relationship-graph-qa` cold-start/browser phase if release evidence is higher priority.
- If operator first approves formal `RelationshipEdge` schema/migration or answers relationship confirmation A/B/C, prioritize that approval/decision path.

push skipped by user instruction
