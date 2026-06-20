# 2026-06-21 LV3 Whole-Product Gap Review — Cross-Flow Proof

## Scope

- Loop type: scheduled fifth-loop whole-product gap review.
- Trigger: `normalLoopsSinceLastWholeProductReview=4`, so this loop used `lv3-whole-product-gap-review-loop.md` instead of a normal implementation slice.
- Target LV3 definition: product architecture, experience, interface, and minimal onboarding maturity for the advisor workflow; not a public launch Level 3 claim.
- No provider call, no DB write, no Prisma operation, no production write, no external registry publication.
- User push override remains active: `push skipped by user instruction`.

## Anti-Duplicate Check

- Previous loop: `NAP-003b interview memory + quick-capture/realtime source adoption`.
- Loop before that: `NAP-003a provider-ready source adoption`.
- Earlier fifth-loop review selected Route B runtime preflight, which is now completed by ITA-003g.
- This loop is not repeating NAP-003a/b or ITA-003g; it reviews the whole product after those individual source/proof slices moved forward.

## Six-Frame Review

| Frame | Finding |
| --- | --- |
| Advisor workflow | Individual surfaces are stronger, but the clean-context journey across client, relationship graph, visit/previsit, quick-capture/interview writeback, and Route B theater still needs one proof pack. |
| Source of truth | DB/DNS blocker is resolved, and several server-owned proofs exist; the remaining risk is proving they connect without local/mock truth or raw-ID workflow. |
| AI protocol / NAP | NAP-003a/b are adopted; theater and RAG still need source-adoption closure, but they can be a fallback if cross-flow proof becomes too broad. |
| Theater immersion | Route B stage map/runtime preflight exists, yet product-level value depends on showing the stage as part of the visit package and relationship graph flow. |
| Interface / onboarding | UI has been simplified, but LV3 needs a proof that a new reviewer can operate the journey with obvious CTAs and no hidden IDs. |
| Safety / compliance | Live provider Route B, live WebRTC, external registry publication, production write, email, notification, payment, refund, and destructive DB ops remain approval-blocked. |

## Top 10 Gaps

| Rank | Gap | Severity | Leverage | Proof Need |
| --- | --- | --- | --- | --- |
| 1 | Clean LV3 cross-flow no-provider proof pack | High | Very high | Fresh-context evidence across client -> graph -> previsit -> writeback -> theater stage. |
| 2 | NAP-003c theater + RAG source adoption | High | High | Manifest source adoption for legacy/Route B theater and RAG guarded-disabled posture. |
| 3 | NAP-005 local-only adapter/export dry-run | Medium | High | Least-disclosure, versioned export proof without public registry publication. |
| 4 | Route B live provider/director/character/five-view runtime | High | High | Requires explicit provider approval and success/error `AiUsageLog` proof. |
| 5 | Release candidate QA pack / ACC-014 Gate 7 | High | Medium | Browser matrix, tsc/lint, and release-readiness proof after cross-flow stabilizes. |
| 6 | RAG guarded-disabled private beta proof | Medium | Medium | Show no high-sensitive ingestion or public claim while RAG remains disabled. |
| 7 | Realtime voice live provider proof | Medium | Medium | Requires explicit approval; must prove retention/transcription separation. |
| 8 | AI Meeting / notes prototype ownership | Medium | Medium | Current files are untracked; needs explicit slice before becoming baseline. |
| 9 | Relationship edge schema / advanced graph persistence | Medium | Medium | Needs schema/Prisma scope and migration safety if no-schema route no longer suffices. |
| 10 | Production payment/email/notification readiness | High | Low for LV3 loop | Approval-blocked and outside current immersive advisor proof. |

## Top-3 Candidate Scores

1. `LV3-CROSS-001 clean cross-flow no-provider proof pack` — 93/100  
   Connects more than two core surfaces, uses resolved DB proof path, avoids provider approval, and directly tests the target advisor experience.

2. `NAP-003c theater + RAG source adoption` — 90/100  
   Completes remaining per-AI source alignment and strengthens registry readiness, but is still more protocol-centric than whole-product experiential.

3. `NAP-005 local-only adapter/export dry-run` — 86/100  
   Important for NANDA/AgentFacts readiness and low-risk because it is local-only, but it does not prove the advisor flow itself.

## Selected Next Slice

Selected next normal loop: `LV3-CROSS-001 clean cross-flow no-provider proof pack`.

Suggested prompt:

> Run `LV3-CROSS-001 clean cross-flow no-provider proof pack`. Prove a clean advisor journey across DB-backed client/relationship graph, visit/previsit reasoning evidence, quick-capture or interview writeback, and persisted Route B theater stage. Do not call providers. Do not use raw-ID-only workflow. Reuse existing BFF/theater/interview proof scripts where possible; add a small acceptance script or report only if the current proofs cannot show the cross-surface journey. If this becomes too broad, fallback to NAP-003c theater+RAG source adoption, then NAP-005 local-only adapter/export dry-run.

## Changes

- Updated `docs/2_agent-input/generated/agent-loop/loop-state.json`:
  - Reset `normalLoopsSinceLastWholeProductReview` to `0`.
  - Set `lastWholeProductReviewReport` to this report.
  - Replaced the previous implementation recommendation with `LV3-CROSS-001`.
- Updated `AGENTS.md` NAP owner notes with the cross-flow recommendation and fallback order.

## Validation

- `node -e "JSON.parse(...loop-state.json...)"`: pass.
- `git diff --check`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.

## Evidence

- Source/proof references reviewed:
  - `docs/2_agent-input/generated/agent-loop/reports/2026-06-21_lv3-nap-003b-interview-source-adoption.md`
  - `docs/2_agent-input/generated/agent-loop/reports/2026-06-21_lv3-nap-003a-provider-ready-source-adoption.md`
  - `docs/2_agent-input/generated/agent-loop/reports/2026-06-21_lv3-quiet-nap-003-source-adoption-gap.md`
  - `docs/2_agent-input/generated/agent-loop/reports/2026-06-21_lv3-ita-003g-route-b-runtime-preflight.md`
  - `docs/2_agent-input/generated/agent-loop/issue-question.md`
  - `docs/06_audits-and-reports/AUD-008_nanda-agentfacts-ai-module-inventory-v1.0.md`
  - `docs/08_acceptance-and-qa/ACC-014_private-beta-launch-gate-acceptance-framework-v1.0.md`

## DB / Prisma

- No DB operation.
- No Prisma schema change, validate/generate/db push not run.
- No provider call; therefore no new `AiUsageLog` is expected.

## Git

- Start status included unrelated pre-existing dirty files; this loop did not stage them.
- Local commit required.
- Push skipped by user instruction.

## Remaining Blockers

- External NANDA/AgentFacts registry publication, signing, public discovery endpoint, and cross-org agent access need operator approval.
- Live Route B provider runtime and live WebRTC/realtime voice proof need explicit provider approval and `AiUsageLog` success/error proof.
- Production payment/email/notification/write and destructive DB operations remain blocked.
- Untracked AI Meeting / notes prototype files are not baseline until a dedicated slice selects and validates them.

## Next Recommended Loop

Run `LV3-CROSS-001 clean cross-flow no-provider proof pack` first. If the proof pack is too wide to finish in one reviewable slice, downgrade to `NAP-003c theater + RAG source adoption`, then `NAP-005 local-only adapter/export dry-run`.
