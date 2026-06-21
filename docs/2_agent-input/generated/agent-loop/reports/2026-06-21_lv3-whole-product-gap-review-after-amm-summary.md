# 2026-06-21 LV3 Whole-product Gap Review - After AMM Summary Persistence

## Scope
- Type: scheduled fifth-loop whole-product review.
- Trigger: `normalLoopsSinceLastWholeProductReview = 4`.
- Review target: client creation -> relationship graph -> visit preparation -> reasoning/evidence -> theater stage -> private/group interaction/state proposal -> AI interview / quick-capture / AI Meeting writeback.
- User preference applied: avoid docs-only proof when a safe source-backed implementation/proof slice exists.
- No runtime source implementation, DB write, provider call, production write, real email/notification/payment, external registry publication, public discovery endpoint, credential signing, or cross-org agent access in this review.
- Web research: none. This review used repo-owned prompts, reports, AGENTS, PLN/ACC/ARC/RES docs, package scripts, and local git status.

## Anti-duplicate Review Gate
- Latest completed loops after the previous whole-product review:
  - `AMM-001a`: formal meeting pure contract and no-provider summary skeleton proof.
  - `AMM-001b`: additive `CLIENT_MEETING`, `AiModule.MEETING`, and `InterviewMeetingSummary` persistence contract.
  - `AMM-002a`: member-scoped meeting session/turn capture BFF with DB/API proof.
  - `AMM-003a`: deterministic/no-provider cited meeting summary persistence route with DB/API proof.
- What changed since the last review:
  - AMM is no longer only a prototype/workstream idea. It now has accepted pure contracts, additive schema, meeting session/turn BFFs, and deterministic cited summary persistence.
  - The primary gap moved from "define/prove meeting backend" to "make meeting capability operable without raw IDs from advisor workflow surfaces."
  - `PLN-023` had stale AMM-002/003 checkboxes, so this review syncs the owner plan to prevent future loops from redoing completed cards.
- Why this report is not duplicate work:
  - The previous review selected `AMM-001a`; four L2 source/API/DB proof loops have since changed the product baseline.
  - This review points the next normal loop at `AMM-005a`, a UI/API/browser implementation slice, not another docs-only or proof-plan loop.

## Last-two Classification
- Previous loop: `AMM-003a`, L2 implementation/proof, source + API + DB + deterministic no-provider QA.
- Loop before that: `AMM-002a`, L2 implementation/proof, source + API + DB capture BFF QA.
- Anti-repetition rationale: current loop is scheduled cadence review. It is allowed to be docs-focused, but it records the next slice as source-backed `AMM-005a`.

## Target Flow Inventory
| Flow step | Classification | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Client creation | mostly ready | BFF-103 lifecycle, compliance fields preserved | Full relationship edge table remains schema/operator-gated |
| Relationship graph | ready with caveat | REL-001/002/003/005 source/write/browser proof | REL-004 full edge model not migrated |
| Visit preparation package | ready | BFF-104, BFF-202, previsit reasoning UI, persisted handoff | Live provider proof remains `AiUsageLog`-gated |
| Question list and reasoning evidence | ready | Visit/report/issues/quick-capture facts/inferences/unknowns/evidence DTOs | Meeting UI must preserve citation/evidence labels |
| Preparation package -> theater stage | ready no-provider | TDF-004, ITA-003c/d/e/f, BFF-204a | Live role orchestration still provider/env-gated |
| Theater private/group/state proposal | ready no-provider | ITA-003e/f/g | AI character response and five-view feedback not live |
| AI interview / quick-capture writeback | ready no-provider + provider route guarded | PIM-010, PIM-011b/c, NAP-003b | Meeting workspace not yet visible/operable |
| AI Meeting capture/summary | backend ready no-provider | AMM-001a/b, AMM-002a, AMM-003a | UI entrypoint, memory-chat, provider summary, writeback |
| Public/platform/billing release gates | partially ready | BFF-304a, BFF-305a, BFF-401a | BFF-402 notification/query/idempotency remains |
| AI protocol readiness | internal-only baseline | NAP-001..005, AUD-008, AMM manifest updates | No external registry approval; AMM still internal-only |

## Six-frame Findings
1. Advisor workflow and onboarding: AMM backend can capture and summarize, but advisors still lack a visible low-noise meeting workspace from visit/client context.
2. Source-of-truth and BFF: meeting capture/summary are server-owned; the missing bridge is client-safe UI consumption and later client-scoped memory retrieval.
3. AI reasoning and evidence: deterministic citations now exist; provider JSON summary and memory-chat must preserve facts/inferences/unknowns and `AiUsageLog` success/error paths.
4. Theater/relationship immersion: meeting memories do not yet feed previsit/theater updates or state-change proposals.
5. QA, compliance, and release-proof: no desktop/mobile browser proof exists for the meeting workspace; BFF-402 remains a separate severity-3 release-hardening gap.
6. NANDA / AgentFacts protocol: AMM is manifest-described and internal-only; external publication remains forbidden.

## Top Gaps
| Rank | Gap | Class | Severity | Leverage | Status since prior review | Owner surface | Smallest next slice |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| 1 | AI Meeting has backend proof but no accepted visible workspace entrypoint | source/UI/proof gap | 2 | 3 | Changed: backend now exists, UI remains missing | `AGENTS.md` AMM, `PLN-023`, `ACC-015` | `AMM-005a visible meeting workspace entrypoint` |
| 2 | Cross-meeting client memory/chat is missing | source gap | 2 | 3 | Still open, now unblocked by captured meetings/summaries | AMM-004 | `AMM-004a client-scoped retrieval + no-provider chat contract` |
| 3 | Provider JSON summary lacks success/error `AiUsageLog` proof | source/operator gap | 2 | 2 | Still open; deterministic fallback now ready | AMM-003b | `AMM-003b provider summary route proof` |
| 4 | Meeting summary/action items do not write back through confirmation cards | source gap | 2 | 3 | Still open; needs UI and summary first | AMM-006 / PIM writeback | `AMM-006a action item and fact candidate writeback` |
| 5 | Billing notification/query/idempotency missing | source/proof + production approval gap | 3 | 2 | Still open after BFF-401a disabled checkout | BFF-402 | `BFF-402a invalid/duplicate notify + query-disabled/idempotency proof` |
| 6 | Meeting workspace browser proof absent | proof gap | 2 | 2 | New priority after AMM-003a | AMM-005 / ACC-015 | Include in `AMM-005a` |
| 7 | Full relationship edge table not migrated | operator/schema gap | 2 | 2 | Still blocked; no-schema graph remains acceptable | REL-004 | Migration only with explicit schema path |
| 8 | Route B live provider role orchestration absent | operator/environment gap | 2 | 3 | Still env/provider-gated | ITA-003h | Provider proof when env is available |
| 9 | External NANDA registry/public discovery/signing disabled | product/operator approval gap | 2 | 2 | Still explicitly forbidden | NAP / issue-question | Approval package only, not automation |
| 10 | pgvector meeting memory scale not enabled | operator/environment gap | 1 | 2 | Still not needed for first meeting workspace | AMM-007 | Lexical fallback until operator enables pgvector |

## Selected Next Implementation Slice
Selected: `AMM-005a visible meeting workspace entrypoint`.

Top-3 scoring rationale:
1. `AMM-005a` - 95/100: changes UI/API consumption and browser proof; connects previsit/client context -> meeting capture -> deterministic cited summary; removes raw-ID workflow; directly answers the user's concern about avoiding docs-only proof.
2. `AMM-004a` - 91/100: high immersive value; connects prior meetings/CRM facts to meeting chat, but is easier to validate after advisors can create/read meetings from an accepted workspace.
3. `AMM-003b` - 88/100: provider-backed value and user-approved live AI proof, but deterministic summary already gives a safe fallback; provider success/error `AiUsageLog` is riskier than first making AMM operable.

Acceptance outline for `AMM-005a`:
- Add a visible meeting workspace entrypoint from `/pre-visit/[planId]` first, with no raw session/client ID entry.
- Use the accepted AMM BFFs: create/read `CLIENT_MEETING`, append manual/final-transcript turn, call deterministic summary route.
- If the existing untracked meeting/notes prototype is adopted, explicitly inspect, scope, and validate only the AMM-owned subset.
- Browser/API proof: desktop/mobile console error 0, no horizontal overflow, refresh/new-context persistence, manager/foreign denial.
- Privacy/cost proof: raw provider/audio/private sentinel blocked; no-provider path keeps `AiUsageLog` unchanged.
- Required validation: `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, targeted AMM browser/API QA.

## NANDA / AgentFacts Readiness Summary
- Accepted AI modules remain `internal-only`; none are `external-ready` or `external-registered`.
- `asai.meeting.prototype` now has AMM-001/002/003a source and endpoint proof, but it remains internal-only because provider summary, memory-chat, writeback, UI/browser proof, and external approval are missing.
- `asai.theater.route_b`, `asai.interview`, quick-capture, visit/report, SPIN, RAG, and assistant manifests remain least-disclosure internal manifests.
- External NANDA / third-party registry publication, signing, public discovery endpoint, and cross-org agent access remain blocked by explicit operator instruction.

## Docs Updated
- `AGENTS.md`: added AMM-005a next-slice review note and clarified AMM-003a backend proof in current gaps.
- `docs/05_execution-plans/PLN-023_ai-meeting-module-batch-tasks-v1.0.md`: synced AMM-002 and AMM-003a completed state; added AMM-005a source/UI/browser acceptance items.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`: recorded this scheduled review and next source-backed slice.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence to 0 and pointed next slice to `AMM-005a`.
- This report.

## Validation
- PASS `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"`
- PASS `git diff --check`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
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
- Pre-existing unrelated dirty/untracked manual/sidebar/previsit/meeting/notes prototype files are intentionally not staged unless they are part of this review's owner-doc edits.

## Remaining Blockers
- Source gap: AMM-005a UI entrypoint, AMM-004 memory-chat, AMM-003b provider summary, AMM-006 writeback remain open.
- Operator/environment gap: provider env/usage-cost evidence, live WebRTC/voice browser permission proof, pgvector enablement, staging cross-role matrix.
- Product decision gap: cross-member same-client meeting memory sharing remains default member-private until decided.
- Production approval gap: production migration/rollback, real payment/refund/void/destructive DB/remote deletion, real email/notification remain approval-gated.

## Next Recommended Loop
Run `AMM-005a visible meeting workspace entrypoint`.

Suggested prompt:
> Execute `AMM-005a` only. Build the first accepted AI Meeting workspace entrypoint from `/pre-visit/[planId]` (or `/pre-visit/[planId]/meeting`) using existing AMM BFFs: create/read `CLIENT_MEETING`, append manual/final-transcript turn, call deterministic summary route, and display transcript + cited summary without raw-ID workflow. If existing untracked meeting/notes prototype files are used, explicitly inspect, scope, validate, and stage only the AMM-owned subset. Add targeted browser/API QA proving desktop/mobile console error 0, no horizontal overflow, refresh/new-context persistence, manager/foreign denial, raw provider/audio/private sentinel blocked, and no-provider `AiUsageLog` unchanged. Run `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, targeted AMM QA, stage only related files, commit locally, and write `push skipped by user instruction`.

push skipped by user instruction
