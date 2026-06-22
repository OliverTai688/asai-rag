# 2026-06-22 LV3 Whole-product Gap Review after ITA-005f Feedback Consumption

## Scope

- Loop type: scheduled fifth-loop whole-product gap review.
- Cadence trigger: `normalLoopsSinceLastWholeProductReview=4`; this loop ran `lv3-whole-product-gap-review-loop.md` and resets the counter to `0`.
- Reviewed flow: client -> relationship graph -> visit preparation package -> reasoning trace -> Route B theater stage -> group/private interaction -> provider candidate -> advisor-confirmed append -> feedback/red-line review -> interview/meeting writeback.
- This scheduled review is intentionally docs-only, but it converts the gap into owner docs and points the next normal loop to a source-backed implementation/proof slice.
- Push policy: push skipped by user instruction.

## What Changed Since Last Review

- `ITA-003n` landed an owner-scoped Route B next-turn provider-candidate route with success/error THEATER/OpenAI `AiUsageLog` evidence and append candidate safety gating.
- `ITA-005d` turned severe red-line preview into advisor action cards with `WATCHING`, `EVIDENCE_NEEDED`, `NOT_APPLICABLE`, and `ESCALATE` states.
- `ITA-005e` persisted only safe action state under the owner-scoped Route B session as `sceneState.redLineActionState`.
- `ITA-005f` made feedback review consume persisted action state and surface per-finding `actionContext`.
- Therefore the bottleneck moved from theater red-line operability to downstream consumption by visit preparation / AI meeting notes.

## Anti-duplicate Review Gate

- The last three normal loops were L2 source/API/UI/proof implementation slices, not checklist-only reports.
- This review is not re-collecting theater evidence. It re-ranks the whole product after the action state became persisted and consumed by feedback review.
- User preference honored: residual browser-only checks are delegated to operator-run commands; next loop is not allowed to spend a turn only on screenshots or proof-plan writing.

## Six-frame Review

1. Advisor workflow / onboarding: advisors can now see, save, and review red-line handling state inside theater. Gap: the next visit-prep or meeting workspace still does not carry those cautions forward.
2. Source-of-truth / BFF: Route B session, turns, red-line actions, provider candidate, append, and feedback review are owner-scoped. Gap: no downstream DTO/API consumer has joined `redLineActionState` with prep/notes surfaces.
3. AI reasoning / evidence: facts/inferences/unknowns and action context are preserved in theater feedback. Gap: preparation questions and meeting notes do not yet cite that action context as evidence-needed next steps.
4. Theater / relationship immersion: theater now supports group/private turns, stage map, provider candidate, confirmed append, and feedback review. Gap: theater learnings do not yet loop back into the advisor's next real-world meeting artifact.
5. QA / compliance / release proof: no-provider and provider-logged paths are well covered. Gap: formal compliance workflow, notification, live detection, and cross-surface red-line consumption remain explicitly unclaimed.
6. NANDA / AgentFacts protocol: `asai.theater.route_b` is strong internally and remains `internal-only`. Gap: a downstream consumption capability/action/DTO ref is not yet declared or proven.

## Top Gaps

| Rank | Gap | Type | Severity | Leverage | Status vs prior review | Owner |
| --- | --- | --- | ---: | ---: | --- | --- |
| 1 | Persisted red-line action context is not consumed by visit preparation package or AI meeting notes | source/product | 3 | 3 | new top gap after `ITA-005f` | `ITA/AMM-005g` |
| 2 | AMM / notes prototype files are visible in the dirty worktree but not adopted as committed, validated baseline | source/worktree hygiene | 2 | 3 | sharper due next-consumer options | AMM/PIM |
| 3 | Formal compliance review workflow / real notification for `ESCALATE` remains unapproved and unimplemented | product/approval | 3 | 2 | unchanged and intentionally blocked | compliance ops |
| 4 | Visit preparation package does not show Route B feedback/action context as evidence-needed questions or cautions | source/product | 2 | 3 | now sequenced first if avoiding dirty notes scope | Visit/ITA |
| 5 | AI meeting notes do not consume theater feedback/red-line context into safe follow-up notes or writeback candidates | source/product | 2 | 3 | useful but scope-risky because of dirty prototype | AMM |
| 6 | Live Route B feedback provider route remains contract-only relative to feedback review persistence | source/provider | 2 | 2 | unchanged lower priority | future `ITA-004d` |
| 7 | Cross-flow clean-browser proof is stale after latest red-line action chain | proof | 1 | 3 | should follow next source consumer, not precede it | LV3 proof pack |
| 8 | Formal `RelationshipEdge` table is still not migrated | schema/operator | 2 | 2 | unchanged | `REL-004` |
| 9 | pgvector / retrieval-backed memory is not enabled | operator/environment | 2 | 2 | unchanged | PIM/AMM/NAP |
| 10 | External NANDA / third-party registry publication remains unapproved | product/operator | 1 | 1 | unchanged and intentionally blocked | NAP |

## Candidate Score

1. `ITA/AMM-005g red-line action downstream consumption bridge` - 94/100.
   - Highest leverage because it connects theater feedback/persistence to the next advisor artifact, touching two or more target surfaces while staying source-backed.
2. `Visit preparation package first consumer` - 90/100.
   - Safer first slice if notes files remain unrelated dirty worktree. It can add action-context cautions/questions to an existing server-owned prep package without adopting AMM prototype scope.
3. `AI meeting notes first consumer` - 86/100.
   - Strong product fit for meeting writeback, but it should start with an audit/adoption step for the visible notes prototype files to avoid staging unrelated work.

Selected next normal slice: `ITA/AMM-005g`, preferably visit preparation package as first consumer unless the notes worktree is explicitly selected and audited.

## Selected Next Slice Contract

- Input: owner-scoped `RouteBSessionSnapshot.scene.redLineActionState`, persisted `sceneState.feedbackReview`, or equivalent server-owned feedback review DTO.
- Consumer: pick exactly one first downstream surface: visit preparation package or AI meeting notes.
- Output: facts / inferences / unknowns / advisor cautions / evidence-needed next steps.
- Safety: no legal finding, no real notification, no live detection claim, no provider call unless success/error `AiUsageLog` is added, no raw private/provider payload, no confirmed CRM fact write.
- UI/API: advisor should see action context as cautions or follow-up questions without entering raw session/person IDs.
- Proof: add a targeted source proof command plus `pnpm ai:protocol-registry-qa`, `pnpm ai:bff-audit`, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, and `git diff --check`.

## NANDA Alignment

- Active module: `asai.theater.route_b`, owner surface `/theater/[sessionId]`, registry readiness `internal-only`.
- Current coverage: provider candidate, append confirmation, red-line library, severe preview, action workflow, owner-scoped persistence, and feedback review consumption.
- Next manifest delta: downstream consumption capability/action/DTO/evidence refs for visit-prep or AI meeting notes.
- External NANDA / third-party registry publication, signing, public discovery, and cross-org access remain unapproved.

## Docs Updated

- `docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`: added post-`ITA-005f` whole-product review note and next-slice boundary.
- `docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`: added `6.10` downstream consumption acceptance.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: cadence reset to `0`, latest report pointer updated, next source-backed slice set.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`: recorded resolved review and remaining approval boundaries.

## Validation

- PASS `git diff --check`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## Residual Evidence Delegated

- Optional live browser confirmation for `ITA-005f` can be operator-run on an existing Route B session: save a red-line action state, generate/read feedback review, and confirm action-state source/counts/per-finding context appear.
- This residual check should not consume another automation loop unless source behavior changes.

## DB / Prisma

- No Prisma schema change.
- No `prisma db push`.
- No DB write.
- No provider call, so no new `AiUsageLog` required for this review.

## Blockers

- Source/product blocker: downstream visit-prep / AI meeting notes consumption of red-line action context is not implemented yet.
- Worktree hygiene blocker: current notes/AMM prototype files are visible but unrelated to this review and must not be staged unless selected.
- Approval blocker: formal compliance workflow, real notification, live detection, external registry publication, and confirmed CRM fact writes remain unapproved/out of scope.

## Next Recommended Loop

Run `ITA/AMM-005g red-line action context downstream consumption bridge`. Start by reading this report, `PLN-015`, `ACC-006` section `6.10`, the Route B feedback/action state DTOs, and the visit-prep or AMM notes owner surface selected for the first consumer. Prefer visit preparation package if the notes prototype remains unrelated dirty worktree. Implement one source-backed domain/API/UI or executable QA slice, update the `asai.theater.route_b` manifest, run targeted proof plus `pnpm ai:protocol-registry-qa`, `pnpm ai:bff-audit`, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, and avoid docs-only evidence collection.

push skipped by user instruction
