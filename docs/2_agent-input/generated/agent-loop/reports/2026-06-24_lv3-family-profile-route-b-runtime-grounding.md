# 2026-06-24 LV3 Family Profile Route B Runtime Grounding

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `REL-006e — Family profile -> Route B next-turn/provider runtime grounding`.
- Strategic gate: last loop was whole-product gap review, not another docs-only loop; selected slice implements the review's top source-backed gap.

## Candidate Score

1. `REL-006e family profile -> next-turn/provider runtime grounding` — 29 points: +8 source/QA, +7 relationship graph -> theater, +6 privacy/no-write boundary, +5 theater grounded in relationship graph data, +3 docs/report handoff.
2. `REL-006f family profile -> feedback review/provider grounding` — 26 points: +8 source/QA, +7 graph -> theater feedback, +6 privacy/no-write boundary, +5 theater maturity; kept next because next-turn runtime was a prerequisite-like neighboring surface.
3. `Relationship confirmation persistence decision implementation` — 7 points: +8 potential source value, +6 persistence/BFF value, -5 product schema decision still missing, -6 would require schema/DB path without explicit option selection.

## Changes

- Added `TheaterRouteBFamilyProfileRuntimeGrounding` to Route B next-turn draft input summary.
- `buildTheaterRouteBNextTurnDraft()` now converts `RouteBSessionSnapshot.scene.sourceGrounding.familyProfiles` into least-disclosure runtime evidence: member/field/status counts, safe field summaries, unknown prompts, and no-write/no-provider boundaries.
- `buildRouteBProviderPromptContext()` and next-turn provider input now pass `familyProfileGrounding` and expose `useFamilyProfilesAsRuntimeEvidence=true`.
- `/theater/[sessionId]` next-turn preview now renders `data-route-b-next-turn-family-profile-runtime-grounding`.
- AgentFacts manifest / registry QA now includes family-profile runtime refs while keeping `registryReadiness=internal-only`.
- Added `pnpm theater:route-b-family-profile-runtime-qa`.

## Validation

- PASS `pnpm theater:route-b-family-profile-runtime-qa`
- PASS `pnpm theater:route-b-next-turn-dry-run`
- PASS `pnpm theater:route-b-provider-prompt-context-dry-run`
- PASS `pnpm theater:route-b-next-turn-provider-dry-run`
- PASS `pnpm theater:route-b-next-turn-ui-contract-qa`
- PASS `pnpm theater:family-profile-session-source-qa`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm ai:bff-audit`
- PASS `git diff --check`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed` (exit 0; one unrelated warning remained in `scripts/public-status-degraded-qa.mjs`).

## Evidence

- New runtime proof outputs show `providerCallAttempted=false`, `aiUsageLogWritten=false`, `rawMetadataIncluded=false`, `sourceReferenceIdsIncluded=false`, `rawPrivateTranscriptIncluded=false`, `rawProviderPayloadIncluded=false`, `relationshipGraphWriteAttempted=false`, `visitPlanWriteAttempted=false`, `writesConfirmedCrmFact=false`.
- Provider dry-run proves live provider consumption remains gated by success/error THEATER `AiUsageLog` before append candidate return.
- No external registry publication; NANDA alignment remains internal manifest / local QA only.

## DB/Prisma

- No Prisma schema change.
- No Prisma generate/db push.
- No DB write in this slice.
- No provider call in provider-disabled proof; provider dry-run uses injected fake providers only and verifies usage logging contract.

## Git

- Branch: `codex/asai-lv3-automation`.
- Push policy: push skipped by user instruction.
- Commit: pending before local commit.

## Blockers

- Manual/product blocker remains: relationship confirmation persistence option A/B/C or formal schema choice.
- External registry/public discovery remains unapproved.
- Next adjacent source gap: `REL-006f` feedback review/provider grounding.

## Next Recommended Loop

Run `REL-006f family profile -> Route B feedback review/provider grounding`: add safe `familyProfileGrounding` to `buildTheaterRouteBFeedbackContract()`, `buildTheaterRouteBFeedbackProviderInput()`, `buildTheaterRouteBFeedbackReview()`, feedback review UI, AgentFacts refs, and no-provider QA.

push skipped by user instruction
