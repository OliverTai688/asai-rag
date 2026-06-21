# 2026-06-21 LV3 Whole-product Gap Review - After AMM Provider Summary

## Scope
- Type: scheduled fifth-loop whole-product review.
- Trigger: `normalLoopsSinceLastWholeProductReview = 4`.
- Review target: client creation -> relationship graph -> visit preparation -> reasoning/evidence -> theater stage -> private/group interaction/state proposal -> AI interview / quick-capture / AI Meeting writeback.
- User preference applied: avoid docs-only proof when safe source work exists. This review is the cadence exception, and it points the next loop at source/UI/API/DB/browser work.
- No product source implementation, DB write, provider call, production write, real email/notification/payment, external registry publication, public discovery endpoint, credential signing, or cross-org agent access in this review.
- Web research: none. This review used repo-owned prompts, reports, AGENTS, PLN/ACC/AUD/RES docs, package scripts, and local git status.

## Anti-duplicate Review Gate
- Latest completed loops after the previous whole-product review:
  - `AMM-005a`: accepted meeting workspace entrypoint from `/pre-visit/[planId]`.
  - `AMM-004a`: deterministic/no-provider meeting and client memory-chat.
  - `AMM-006a`: meeting writeback boundary API and DB audit proof.
  - `AMM-003b`: live provider JSON meeting summary with success/error `AiUsageLog`.
- Last-two classification:
  - `AMM-003b`: L2 source/provider/API/DB proof.
  - `AMM-006a`: L2 source/API/DB writeback boundary proof.
- What changed since the last review:
  - AMM is no longer only a backend foundation. It now has an accepted previsit workspace, cross-meeting memory chat, writeback preview/POST boundary, and provider-quality cited summary.
  - The primary gap moved from "make AI Meeting operable" to "let advisors confirm and apply meeting output from the workspace without raw-ID or API-only workflows."
  - Provider summary no longer outranks UI writeback because success/error `AiUsageLog`, quota, disabled, error, citation, and persistence proof now exist.
- Why this report is not duplicate work:
  - It refines the next AMM source slice from broad `AMM-005b` into narrower `AMM-006b meeting workspace writeback confirmation cards`.
  - It updates AMM owner docs with concrete UI/API/DB/browser acceptance instead of only restating open blockers.

## Target Flow Inventory
| Flow step | Classification | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Client creation | mostly ready | BFF-103 lifecycle, compliance fields preserved | Full `RelationshipEdge` table remains REL-004 schema/operator-gated |
| Relationship graph | ready with caveat | REL-001/002/003/005 source/API/browser proof | Formal edge model / migration not done |
| Visit preparation package | ready | BFF-104, BFF-202, previsit reasoning UI, theater handoff | Cross-flow acceptance should keep re-running after AMM UI changes |
| Question list and reasoning evidence | ready | facts/inferences/unknowns/citations in visit, meeting summary, memory-chat | Meeting writeback UI must show the same evidence labels |
| Preparation package -> theater stage | ready no-provider | TDF-004, ITA-003c/d/e/g, launch-boundary proof | Relationship-map-style stage map and live provider roles still open |
| Theater private/group/state proposal | ready no-provider | persisted group/private advisor turns, state proposals | AI character/director/feedback provider runtime still open |
| AI interview / quick-capture writeback | ready no-provider + provider routes guarded | PIM-010/011 and AMM-006a | Meeting writeback API is not yet visible in the workspace |
| AI Meeting capture/summary/chat | ready with caveat | AMM-002a, 003a/b, 004a, 005a | Provider memory-chat, writeback UI, global entrypoints, pgvector |
| Public/platform/billing release gates | partially ready | BFF-305a, BFF-401a | BFF-402 notification/query/idempotency remains release-hardening |
| AI protocol readiness | internal-only baseline | NAP-001..005, AMM manifest updates | No external registry approval; AMM still internal-only |

## Six-frame Findings
1. Advisor workflow and onboarding: meeting workspace can capture and summarize, but the next action after summary is not obvious because writeback candidates are API-only.
2. Source-of-truth and BFF: writeback preview/POST is server-owned and session-scoped; the missing layer is client-safe UI consumption and browser proof.
3. AI reasoning and evidence: provider and deterministic summaries have citations; confirmation cards must preserve fact/inference/unknown labels so inference never becomes CRM fact.
4. Theater/relationship immersion: meeting outputs can become follow-up tasks/insights/CRM candidates, but they do not yet flow through an advisor-confirmed interaction surface.
5. QA, compliance, and release-proof: AMM has strong API/DB/provider proof, but workspace writeback needs desktop/mobile browser proof, high-sensitive gate proof, and no-provider usage proof.
6. NANDA / AgentFacts protocol: `asai.meeting.prototype` is capability-declared and internal-only; UI writeback should become a declared owner-surface proof before any external readiness claim.

## Top Gaps
| Rank | Gap | Class | Severity | Leverage | Status since prior review | Owner surface | Smallest next slice |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| 1 | Meeting writeback boundary is API-only; workspace has no confirmation cards | source/UI/proof gap | 2 | 3 | New top gap after AMM-006a and AMM-003b | AMM-006 | `AMM-006b meeting workspace writeback confirmation cards` |
| 2 | Dashboard and CRM client detail do not expose meeting entrypoints | source/UI/proof gap | 2 | 3 | Still open after previsit entrypoint | AMM-005 | `AMM-005b dashboard + CRM global meeting entrypoints` |
| 3 | Provider-backed memory-chat lacks quota/error/success `AiUsageLog` proof | source/provider proof gap | 2 | 2 | Still open; deterministic chat exists | AMM-004 | `AMM-004b provider-backed memory-chat` |
| 4 | Cross-flow proof pack does not include the newly provider-backed AMM path | proof gap | 2 | 3 | Changed by AMM-003b | LV3-CROSS / AMM-008 | Add AMM provider-summary + writeback UI to cross-flow QA |
| 5 | Route B live director/character/feedback provider runtime not complete | operator/provider gap | 2 | 3 | Still open; preflight exists | ITA-003 | Provider runtime success/error `AiUsageLog` slice |
| 6 | Relationship graph formal edge table not migrated | operator/schema gap | 2 | 2 | Still blocked; no-schema graph usable | REL-004 | Migration/backfill with rollback approval |
| 7 | Billing notification/query/idempotency still incomplete | source/release proof gap | 3 | 2 | Still open after checkout disabled proof | BFF-402 | ECPay notify/query/idempotency proof |
| 8 | pgvector meeting memory retrieval not enabled | operator/environment gap | 1 | 2 | Still deferred; lexical fallback works | AMM-007 | pgvector enablement proof when approved |
| 9 | External NANDA publication remains blocked | product/operator approval gap | 2 | 2 | Still explicitly forbidden | NAP | Approval package only, no automation publication |
| 10 | Notes prototype remains unaccepted in current dirty worktree | source ownership gap | 1 | 2 | Still present as unrelated untracked files | AMM/PIM | Adopt only through a scoped AMM/PIM slice |

## Selected Next Implementation Slice
Selected: `AMM-006b meeting workspace writeback confirmation cards`.

Top-3 scoring rationale:
1. `AMM-006b` - 96/100: source-backed UI/API/DB/browser slice; connects meeting summary/provider output -> advisor confirmation -> CRM candidate/insight/follow-up task; closes the most visible break in the core "AI interview/meeting enriches client data" flow.
2. `AMM-005b` - 91/100: strong onboarding value because dashboard/CRM entrypoints remove another raw-path dependency, but it still leaves meeting results un-actionable if writeback UI is absent.
3. `AMM-004b` - 88/100: provider memory-chat improves answer quality and `AiUsageLog` coverage, but deterministic memory-chat already exists; operational writeback confirmation is the higher leverage next step.

Acceptance outline for `AMM-006b`:
- Update `src/components/meeting/meeting-workspace.tsx` to load `GET /api/ai/meeting/sessions/[sessionId]/writebacks` after a summary exists.
- Render compact confirmation cards for confirmed decisions, inferences, action items, and unknown/open questions.
- Allow selecting candidates and entering reason/riskAccepted where required.
- POST selected candidates to `/writebacks`, then display created / blocked / skipped results.
- Prove inference checked does not create CRM fact; confirmed creates CRM candidate audit only; action item / unknown create follow-up tasks.
- Browser/API/DB proof: desktop/mobile console error 0, no horizontal overflow, summary missing state, manager 404, high-sensitive reason gate, raw private/provider sentinel blocked, no-provider `AiUsageLog` unchanged.
- Required validation: `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, `pnpm ai:bff-audit`, `pnpm ai:protocol-registry-qa`, targeted `pnpm meeting:workspace-writeback-ui-qa` or equivalent.

## NANDA / AgentFacts Readiness Summary
- ASAI AI modules remain internal-only; none are external-ready or external-registered.
- `asai.meeting.prototype` now declares capture, summary, provider summary, deterministic memory-chat, workspace entrypoint, and writeback-boundary capabilities, but it is still internal-only because writeback UI proof, provider memory-chat, global entrypoints, pgvector, and external approval are missing.
- `asai.theater.route_b`, `asai.interview`, quick-capture, visit/report, SPIN, RAG, and assistant manifests remain least-disclosure internal manifests.
- External NANDA / third-party registry publication, signing, public discovery endpoint, and cross-org agent access remain blocked by explicit operator instruction.

## Docs Updated
- `AGENTS.md`: added AMM-006b next-slice acceptance and whole-product review note.
- `docs/05_execution-plans/PLN-023_ai-meeting-module-batch-tasks-v1.0.md`: added AMM-006b UI/API/DB/browser acceptance.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`: recorded this scheduled review and next source-backed slice.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence to 0 and pointed next slice to `AMM-006b`.
- This report.

## Validation
- PASS `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"`
- PASS `git diff --check`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.
  - Note: `lint:changed` scanned the branch-level diff against `origin/main`, including historical files outside this loop, and passed.

## DB / Prisma
- Prisma schema unchanged in this review.
- No Prisma validate/generate/db push.
- No DB read/write proof in this review.
- No provider call; no `AiUsageLog` expected.

## Git
- Stage only this review's related files.
- Local commit required after validation.
- Push skipped by user instruction.
- Pre-existing unrelated dirty/untracked files are intentionally not staged.

## Remaining Blockers
- Source gap: AMM-006b writeback UI, AMM-005b global entrypoints, AMM-004b provider memory-chat.
- Operator/environment gap: pgvector, live WebRTC browser permission proof, external NANDA publication.
- Product decision gap: same-org cross-member meeting memory sharing remains member-private until decided.
- Production approval gap: production migrations/rollback, real payment/refund/void/destructive DB/remote deletion, real email/notification enablement remain gated.

## Next Recommended Loop
Run `AMM-006b meeting workspace writeback confirmation cards`.

Suggested prompt:
> Execute `AMM-006b` only. Update the accepted AI Meeting workspace so after a summary exists it calls `GET /api/ai/meeting/sessions/[sessionId]/writebacks`, renders compact confirmation cards for confirmed decisions, inferences, action items, and unknown/open questions, supports reason/riskAccepted for sensitive candidates, posts selected candidates to `/writebacks`, and displays created/blocked/skipped results. Add targeted browser/API/DB QA proving desktop/mobile console error 0, no horizontal overflow, summary-required state, owner created events, manager 404, raw private/provider sentinel blocked, high-sensitive missing reason blocked, inference checked never creates CRM fact, confirmed only creates CRM candidate audit, action/unknown create follow-up tasks, and no-provider `AiUsageLog` unchanged. Run `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, `pnpm ai:bff-audit`, `pnpm ai:protocol-registry-qa`, targeted meeting workspace writeback QA, stage only related files, commit locally, and write `push skipped by user instruction`.

push skipped by user instruction
