# 2026-06-25 LV3 REL-008 Linked Client Relationship Network

## Scope
- Loop type: normal LV3 source/proof implementation loop, not fifth-loop whole-product review.
- Selected slice: REL-008 `linkedClientId` cross-client relationship network.
- Goal: let a relationship graph person safely represent “also a CRM client” and feed downstream previsit/theater source contracts without adding formal `RelationshipEdge` schema or exposing unauthorized client detail.

## Candidate Score
1. REL-008 linkedClientId cross-client relationship network — 9.2/10. Connects client -> relationship graph -> edge-shadow/previsit/theater source boundary, uses existing Prisma field, closes a named REL gap, and is fully source/proofable.
2. Relationship graph proof harness stability — 8.3/10. Valuable release evidence work, but mostly harness reliability after warmed-server proof already passed.
3. Theater stage-map reconcile proof drift — 7.4/10. Useful acceptance maintenance, but less central than strengthening the client relationship source chain.

## Changes
- Added `FamilyMember.linkedClient` safe summary type in domain DTO contract.
- Allowed family member `POST/PATCH` to accept guarded `linkedClientId`; self-target and unreadable targets return non-leaking errors.
- Relationship graph BFF now decorates readable linked clients with `displayName/status/href` and marks unavailable links without exposing private target details.
- Edge-shadow dry-run now emits an additional server-only `linked_client_relation` candidate and BFF summary exposes only `linkedClientCandidateCount`.
- Updated write QA and edge-shadow QA to prove readable navigation metadata, unreadable target denial, no linked email/phone leak, and no server-only draft-edge exposure.

## Validation
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed` (exit 0; existing warning remains in unrelated `scripts/public-status-degraded-qa.mjs`)
- PASS `git diff --check`
- PASS `pnpm client:relationship-edge-shadow-qa`
- PASS `pnpm client:relationship-edge-shadow-bff-qa`
- PASS `DEMO_QA_BASE_URL=http://127.0.0.1:3069 pnpm client:relationship-graph-write-qa`

## Evidence
- Edge-shadow proof: 9 source members -> 10 draft candidates, `linkedClientCandidateCount=1`, no schema/db/provider flags.
- BFF proof: summary omits `draftEdges`, draft ids, node ids, metadata, and linked client id sentinel.
- API/browser write proof: readable linked client persisted and appears navigable in graph BFF; unreadable manager-owned linked client rejected as `FAMILY_MEMBER_LINKED_CLIENT_NOT_FOUND`; linked client email/phone sentinels absent from graph response.

## DB/Prisma
- Prisma schema unchanged; no `prisma db push`, no migration, no `src/generated` edit.
- Non-destructive demo/test DB writes were performed by `client:relationship-graph-write-qa` under existing AGENTS.md authorization for LCH/demo proof.
- No provider call; no `AiUsageLog` required or faked.

## NANDA Alignment
- No AI module/provider route changed in this slice.
- Source contract improves least-disclosure grounding for downstream AI modules: relationship graph and edge-shadow can now describe cross-client relationship capability without raw private target data.
- Registry gap unchanged: external NANDA/AgentFacts publication remains unapproved and not attempted.

## Git
- Branch: `codex/asai-lv3-automation`
- Push: skipped by user instruction.

## Blockers
- Product/schema blocker remains: formal durable `RelationshipEdge` table still needs operator approval before migration/db push.
- Product decision blocker remains: relationship confirmation persistence A/B/C still unanswered.
- Proof-maintenance blocker remains: cold-start/browser `client:relationship-graph-qa` reliability can be improved separately.

## Next Recommended Loop
- If staying source-backed: add RelationshipMap linked-client clickable affordance for readable linked clients, with unauthorized/unavailable UI proof.
- If prioritizing release evidence: stabilize cold-start/browser relationship graph proof harness before adding more surface.
