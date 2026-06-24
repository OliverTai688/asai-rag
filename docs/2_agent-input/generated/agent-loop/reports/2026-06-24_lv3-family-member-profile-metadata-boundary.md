# 2026-06-24 LV3 Family Member Profile Metadata Boundary

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Task level: L2 source-backed implementation + L1 executable source contract proof.
- Selected slice: `REL-006 family/person metadata profile boundary`.
- Goal: let relationship graph family/person nodes carry allowlisted job/title, annual income or dependency, person status / decision role, relationship context, fact status, and source refs without schema changes or confirmed CRM fact writes.
- Push: push skipped by user instruction.

## Strategic Review

- Last-two-loop classification:
  - Previous loop: L4 scheduled whole-product review / blocker re-ranking.
  - Loop before that: L1 executable cross-flow proof for Route B state proposal -> visit prep -> AI Meeting notes -> writeback preview.
- Anti-repetition rationale: this loop is not another review/report/proof-plan loop. It changes domain/BFF/DTO source and adds an executable QA command for a relationship graph capability selected by the prior review.
- Product mapping: target LV3 flow requires relationship graph people to carry concise person context before generating preparation packages and theater stages.

## Candidate Score

1. `REL-006 family/person metadata profile boundary` - 29/30, selected.
   - Source-backed, no-schema, connects client -> relationship graph -> downstream prep/theater quality.
   - Reduces privacy risk by allowlisting `metadata.profile` and blocking raw transcript/provider/contact/policy/payment/secret sentinels.
   - Uses existing `FamilyMember.metadata Json?`, so no REL-004 approval is required.

2. `AMM-006c state proposal writeback-candidate boundary` - 27/30.
   - Good downstream bridge from theater/meeting context to writeback candidates.
   - Lower priority this loop because the last four implementation loops already focused on state proposal downstream flow.

3. Formal `REL-004 RelationshipEdge` table - 26/30 but blocked.
   - Highest durable graph value, but needs additive Prisma schema/migration/rollback and DB proof approval.

## Changes

- Added `src/domains/client/family-member-profile.ts`:
  - stable schema version `2026-06-24.family-member-profile.v1`;
  - allowlisted fields: `jobTitle`, `annualIncomeOrDependency`, `personStatus`, `decisionRole`, `relationshipContext`, `sourceReferences`;
  - strict key validation and private sentinel rejection for email, Taiwan mobile pattern, raw transcript/payload/provider payload, policy number, secret/token/OTP/payment, and private key patterns.
- Extended `FamilyMember` DTO type with optional `profile`.
- Updated `toClientDto()` to expose only extracted `profile`, not raw `metadata`.
- Updated family member BFF repository schemas and create/update paths to write `metadata.profile` through current member + client ownership; browser cannot supply org/user/unit scope.
- Updated `relationship-graph.ts` to consume profile fields in source review, map profile source refs, preserve FACT/INFERENCE/UNKNOWN, and keep missing values as unknowns.
- Added `pnpm client:family-member-profile-metadata-qa`.
- Marked REL-006 complete in `AGENTS.md`, `PLN-024`, and `ACC-016`; updated `issue-question.md` and `loop-state.json`.

## Validation

- PASS: `pnpm client:family-member-profile-metadata-qa`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed` (exit 0; existing unrelated warning remains in `scripts/public-status-degraded-qa.mjs`).
- PASS: `git diff --check`.
- PASS: `jq empty docs/2_agent-input/generated/agent-loop/loop-state.json`.

## Evidence

- `pnpm client:family-member-profile-metadata-qa` checks:
  - profile allowlist fields and stable schema version;
  - strict/private sentinel guard;
  - BFF write schema does not accept browser `organizationId`, `ownerId`, `userId`, or `unitId`;
  - writes are scoped through `getWritableClientScope(session, clientId)` and `canWriteClient`;
  - relationship graph reads are current-member/org scoped;
  - DTO exposes extracted `profile` instead of raw metadata;
  - graph source review consumes profile while missing fields remain UNKNOWN;
  - no `RelationshipEdge` schema, no VisitPlan write, no provider call, no fake `AiUsageLog`.

## DB/Prisma

- No Prisma schema change.
- No Prisma generate/validate/db push.
- No DB proof or DB write was executed in this loop.
- The source boundary uses existing `FamilyMember.metadata Json?`.

## NANDA Alignment

- No AI module, provider wrapper, AI route, or AgentFacts manifest was changed.
- No provider call was attempted; no `AiUsageLog` row is expected for this deterministic no-provider slice.
- External NANDA / third-party registry publication remains unapproved and was not attempted.

## Git

- Commit is created locally after validation.
- Push skipped by user instruction.

## Blockers

- Product/schema: formal `RelationshipEdge` table still needs additive schema/migration/rollback approval and DB proof.
- Product/data-model: relationship confirmation persistence still needs A/B/C decision.
- Product/UI: profile metadata can now be written by BFF, but no dedicated advisor UI editor was added in this slice.
- External approval: NANDA/third-party registry publication remains paused.

## Next Recommended Loop

If no REL-004 approval or relationship confirmation A/B/C answer arrives, choose one small source-backed follow-up:

- connect the new family profile fields into preparation/theater handoff source review; or
- add a compact advisor UI editor for `FamilyMember.profile`.

Keep the same guardrails: no provider/fake `AiUsageLog`, no formal `RelationshipEdge` table, no VisitPlan write, and no confirmed CRM fact write without explicit approval.

push skipped by user instruction
