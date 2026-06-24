# 2026-06-24 LV3 Whole-product Gap Review - After Feedback Writeback Bridge

## Scope

- Type: scheduled fifth-loop whole-product calibration.
- Trigger: `cadenceReview.normalLoopsSinceLastWholeProductReview=4`.
- Task level: L4 architecture / proof-readiness review with one narrow executable QA-script repair.
- Push: push skipped by user instruction.

## What Changed Since The Last Review

- The last whole-product review selected `REL-006e family profile -> Route B next-turn/provider runtime grounding`.
- Four normal implementation/proof loops completed the rest of that chain:
  - `REL-006e`: family profile -> Route B next-turn/provider runtime grounding.
  - `REL-006f`: family profile -> Route B feedback review/provider grounding.
  - `REL-006g`: Route B feedback family profile -> visit prep / AI Meeting advisor context.
  - `REL-006h`: feedback advisor context -> AI Meeting writeback preview bridge.
- This review is not duplicate work because the previously selected family-profile runtime/feedback gaps are resolved. The sharper gap is now proof orchestration: the clean-flow proof pack needs to be refreshed so it validates the newer REL-006h chain instead of only older client/prep/theater boundaries.
- During review, `pnpm lv3:route-b-state-proposal-cross-flow-qa` initially failed because `meeting:route-b-state-proposal-context-qa` expected the old note-draft merge call with only red-line and state-proposal reminders. The product source now also merges feedback-advisor reminders. The QA script was updated to assert all three reminders preserve the existing note draft, and the cross-flow command now passes again.

## Last-two-loop Classification

- Previous loop: L2 implementation/proof (`REL-006h`, feedback advisor context -> meeting writeback preview bridge).
- Loop before that: L2 implementation/proof (`REL-006g`, feedback family-profile evidence -> visit/meeting advisor context).
- Anti-repetition result: allowed scheduled review; not a docs-only repeat. The review produced a narrow QA-script repair and a source-backed next proof slice.

## Six Frames

1. Advisor workflow / onboarding: the advisor can now enter person profile data and see it flow to preparation, theater, meeting notes, and writeback preview context; the next usability gap is proving this feels continuous from a clean context rather than relying on individual slice proofs.
2. Source-of-truth / BFF: REL-006h remains no-schema and server-owned, but the cross-flow proof pack does not yet cover the newest family-profile and feedback-advisor bridge chain.
3. AI reasoning / evidence: FACT / INFERENCE / UNKNOWN and no-write boundaries are present in individual proofs; the proof-pack gap is verifying they survive across the whole advisor journey.
4. Theater / relationship immersion: Route B now consumes relationship/profile grounding in next-turn, feedback, visit prep, and meeting preview. Formal durable relationship edges remain blocked by schema approval.
5. QA / compliance / release-proof: an executable cross-flow proof regression was found and fixed. Remaining full clean-browser evidence should be a next normal-loop source/proof slice, not residual screenshot collection inside this review.
6. NANDA / AgentFacts protocol: active AI modules remain `internal-only`; manifests and registry QA pass. External registry publication remains paused by operator decision.

## Candidate Score

1. `LV3-CROSS-002 post-REL-006h cross-flow proof pack refresh` - 9.3/10, selected next.
   - Severity 2, leverage 3. It connects client -> relationship graph profile editor -> preparation -> Route B theater -> visit/AI Meeting advisor context -> writeback preview.
   - Source-backed proof work: update/extend `pnpm lv3:cross-flow-no-provider-qa` or a neighboring wrapper with deterministic commands and optional browser smoke.
   - Safety: no schema change, no provider call, no fake `AiUsageLog`, no production write, no confirmed CRM fact write.
2. `Meeting writeback preview consumes feedback advisor context inside candidate review boundary` - 8.4/10.
   - Severity 2, leverage 2. It would move from sidecar preview context toward candidate-review ergonomics, but must avoid direct CRM fact creation and should follow the proof-pack refresh.
3. Formal `REL-004 RelationshipEdge` table - 7.0/10 but blocked.
   - Severity 2, leverage 3. Durable edge writes/backfill remain important, but require additive Prisma schema/migration/rollback approval and DB proof.
4. Relationship confirmation persistence A/B/C - 6.8/10 but product-decision blocked.
   - Severity 2, leverage 3. Durable advisor card state still requires the operator to pick VisitPlan JSON, dedicated table, or explicit defer.
5. AMM pgvector retrieval - 5.8/10 but environment/operator blocked.
   - Severity 1, leverage 2. Useful for scale, but not the top LV3 immersive gap while lexical memory and cross-surface bridges are already functional.

## Top Gaps

1. Cross-flow proof pack coverage after REL-006h: proof/source gap. Owner: LV3 cross-flow QA / BFF proof scripts. Evidence: individual REL-006h proof passes; wrapper proof initially caught a stale meeting-state expectation. Missing: refreshed pack covering the new family-profile feedback/writeback chain.
2. Formal relationship edge persistence: operator/schema gap. Owner: REL-004. Evidence: REL-004a-g shadow bridges pass. Missing: schema approval, migration/rollback, DB proof.
3. Relationship confirmation durable persistence: product decision. Owner: visit preparation confirmation state. Evidence: transient state boundary proof passes. Missing: A/B/C operator answer.
4. Meeting feedback-advisor context as candidate-review ergonomics: source gap. Owner: AMM writeback boundary. Evidence: REL-006h sidecar bridge passes. Missing: candidate-review consumption proof without direct confirmed fact write.
5. Full clean-browser/mobile smoke after newest bridges: proof gap. Owner: LV3-CROSS-002. Evidence: prior cross-flow proof exists and now state-proposal wrapper is healthy. Missing: current post-REL-006h clean-flow browser/API proof if desired.

## Changes

- Updated `scripts/meeting-route-b-state-proposal-context-qa.mjs` so the source contract matches current `MeetingWorkspace` behavior: existing note draft + red-line reminders + state proposal reminders + feedback advisor reminders.
- Updated `AGENTS.md` and `PLN-024` whole-product review notes with the resolved REL-006h chain and next proof-pack refresh.
- Updated `loop-state.json` cadence to 0 and next recommended slice to `LV3-CROSS-002`.
- Added this review report.

## NANDA Alignment

- No AI route/provider wrapper was changed.
- Active AgentFacts-style modules remain `internal-only`; `pnpm ai:protocol-registry-qa` passed.
- No external NANDA / third-party registry publication, public discovery endpoint, signing, credentialing, or cross-org agent access was attempted.
- Provider policy remains unchanged: provider routes require success/error `AiUsageLog`; deterministic/no-provider bridges must not write fake usage logs.

## Validation

- Initial finding: FAIL `pnpm lv3:route-b-state-proposal-cross-flow-qa`; root cause was stale QA expectation in `meeting:route-b-state-proposal-context-qa`.
- PASS `pnpm meeting:route-b-state-proposal-context-qa` after QA-script repair.
- PASS `pnpm lv3:route-b-state-proposal-cross-flow-qa`.
- PASS `pnpm meeting:route-b-feedback-advisor-writeback-bridge-qa`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm ai:bff-audit` (`overall=pass`; DB summary still warns `ENOTFOUND db.wwocdcicvpmbdmqvskzi.supabase.co`).
- PASS `node -e "JSON.parse(...loop-state.json...)"` (`loop-state json ok`).
- PASS `git diff --check`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed` (exit 0; one pre-existing unrelated warning in `scripts/public-status-degraded-qa.mjs`).

## DB/Prisma

- No Prisma schema change.
- No Prisma generate / validate / db push.
- No DB write, provider call, real email, real notification, payment/refund, remote delete, or production write.

## Residual Self-runnable Evidence

- Next normal loop should own the refreshed proof pack. Starting command candidates:
  - `pnpm lv3:cross-flow-no-provider-qa`
  - `pnpm lv3:route-b-state-proposal-cross-flow-qa`
  - `pnpm meeting:route-b-feedback-advisor-writeback-bridge-qa`
- If a browser smoke is desired after the proof-pack refresh, run a local dev server and verify client profile edit -> prep/theater handoff -> Route B session -> notes/writeback preview with desktop/mobile no horizontal overflow and console error 0.

## Git

- Start status: branch `codex/asai-lv3-automation`, ahead of origin; pre-existing unrelated dirty docs/sidebar/notes prototype files remain unstaged.
- Commit: pending after validation.
- Push: push skipped by user instruction.

## Blockers

- Product/schema: formal `RelationshipEdge` table approval, migration/rollback, DB proof.
- Product/data-model: relationship confirmation persistence A/B/C answer.
- Operator/env: AMM pgvector extension/index path; DB DNS warning remains for some live proof.
- External publication: NANDA/third-party registry remains unapproved.
- Worktree hygiene: unrelated dirty/untracked files remain intentionally unstaged.

## Next Recommended Loop

Run `LV3-CROSS-002 post-REL-006h cross-flow proof pack refresh`: update or extend `pnpm lv3:cross-flow-no-provider-qa` so the clean advisor flow covers client/relationship graph family profile editing, preparation/theater handoff, Route B runtime/feedback grounding, visit/AI Meeting advisor context, and AI Meeting writeback preview bridge. Keep it no-provider/no-fake-usage/no-schema/no-confirmed-fact-write. If operator supplies formal `RelationshipEdge` schema approval or relationship confirmation persistence A/B/C first, prioritize that approved path instead.

push skipped by user instruction
