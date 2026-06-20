# ASAI LV3 Whole-product Gap Review - PIM UI / NAP / Route B

Date: 2026-06-21
Loop type: scheduled fifth-loop whole-product gap review
Automation: `10-agents-batch-task`
Branch: `codex/asai-lv3-automation`
Push: skipped by user instruction

## Scope

This loop followed `lv3-whole-product-gap-review-loop.md` because `normalLoopsSinceLastWholeProductReview` was `4`. No product source, schema, provider integration, production write, email, notification, payment, or destructive DB operation was performed.

The review inventory focused on the LV3 target flow:

`client -> relationship graph -> previsit package -> reasoning evidence -> theater stage -> private/group/status updates -> AI interview / quick-capture writeback`.

Latest implementation evidence reviewed:

- `PIM-011b`: `/api/ai/interview/quick-captures` DB-backed BFF proof, manager denial, high-sensitive gate, raw/private sentinel guard, and `AiUsageLog` unchanged `147->147`.
- `ITA-003f`: Route B relationship-graph stage map no-provider stage proof.
- `BFF-103d`: CRM related-list recovery proof.
- `NAP` workstream added but `NAP-001` inventory is still open.

## Six-frame Review

1. Advisor workflow / onboarding
   - Strongest gap is now visible operation, not backend proof. PIM-011 can persist a quick capture, but the advisor still lacks a committed selector entry in `/pre-visit/[planId]/notes`, global quick-capture, or meeting workspace.
   - Next UI must avoid raw client/visit/session IDs and reduce the first choice to: private draft, client, visit, or follow-up review.

2. Source-of-truth / BFF
   - PIM-011 BFF/API persistence is no longer blocked.
   - AMM / meeting / notes prototype files exist in the worktree but are not committed baseline; future loops must not stage them unless they explicitly select and validate that AMM scope.
   - Remaining BFF surface gaps are broader release-readiness items, not the shortest LV3 immersive path.

3. AI reasoning / evidence
   - Previsit and quick-capture evidence boundaries are materially stronger after PIM-011b.
   - The missing cross-module proof is a NANDA / AgentFacts inventory: which AI is internal-only, provider-ready, registry-draft, guarded-disabled, and what each route can expose.

4. Theater / relationship immersion
   - Route B can now consume relationship graph context into a stage map without provider calls.
   - The main theater gap is still provider/runtime orchestration: director, characters, feedback, private/group visibility, state update interaction, and success/error `AiUsageLog` proof.
   - This is approval-bound if live OpenAI/Anthropic calls are used.

5. QA / compliance / release proof
   - DB-backed PIM quick-capture proof passed in the previous loop.
   - Missing proof is browser/UI proof for quick capture and later a clean end-to-end LV3 run from a fresh browser context.
   - No compliance field, SPIN state machine, Theater enum, or generated file was changed in this review.

6. NANDA / AgentFacts protocol
   - `NAP-001` is now a high-leverage protocol gap: all AI modules need an inventory of identity, capability, endpoints/actions, data classes, auth/session scopes, provider posture, usage logging, and registry readiness.
   - This should happen before any external registry publication claim.

## Top 10 Gaps

| Rank | Gap | Severity | Leverage | Dependency / blocker |
| --- | --- | --- | --- | --- |
| 1 | `PIM-011c` quick-capture UI selector bridge | 2 | 3 | No provider/schema needed; needs browser proof |
| 2 | `NAP-001` AI module inventory and NANDA mapping | 2 | 3 | Docs/static proof first; no external registry claim |
| 3 | `ITA-003g` Route B provider/runtime orchestration | 2 | 3 | Live provider approval or guarded-disabled proof |
| 4 | AMM / meeting workspace baseline decision | 2 | 2 | Current prototype is untracked; do not stage casually |
| 5 | `REL-004` formal `RelationshipEdge` schema | 2 | 2 | Needs migration/rollback/operator approval |
| 6 | Clean end-to-end LV3 browser proof | 2 | 3 | Depends on PIM UI and theater runtime readiness |
| 7 | Role-aware sidebar live auth/browser matrix | 2 | 2 | Fixture/source proof exists; live session matrix still pending |
| 8 | Remaining full-site BFF surfaces | 2 | 2 | BFF-302/303/304/305 remain broader release work |
| 9 | Realtime voice live provider and raw-audio policy | 2 | 2 | Provider/retention approvals required |
| 10 | External agent registry publication gate | 2 | 2 | Must wait for NAP manifest + operator approval |

## Selected Next Slice

Selected: `PIM-011c quick-capture UI selector bridge`

Top-3 candidate scoring:

- `PIM-011c` - 91/100: directly connects previsit notes, Park memory, safe writeback intent, preparation supplement, and theater state proposals; no schema/provider dependency; highest advisor-onboarding leverage.
- `NAP-001` - 86/100: high protocol leverage across every AI module, but mostly documentation/static proof; best immediately after or in parallel with PIM UI.
- `ITA-003g` - 82/100: highest immersion payoff, but live provider use requires approval; guarded-disabled contract proof is possible if approval is absent.

## Owner-doc Updates

Updated this loop:

- `AGENTS.md`
  - Marked PIM-011 BFF/API proof as resolved and clarified that the remaining blocker is UI selector/browser proof.
  - Added the `PIM-011c` whole-product review note.
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
  - Added the `PIM-011c` next-slice note.
- `docs/08_acceptance-and-qa/ACC-010_realtime-voice-park-memory-interview-acceptance-framework-v1.0.md`
  - Added explicit UI selector acceptance target and safe DTO/no raw echo requirement.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - Reset cadence to `0`.
  - Updated latest whole-product review report and next recommended implementation slice.

## Validation

Required checks for this docs-only review:

- `git diff --check` - pass
- `pnpm exec tsc --noEmit --pretty false` - pass
- `pnpm lint:changed` - pass

`pnpm lint:changed` evaluated the repository's full changed-file set against `origin/main`; no new lint failure was reported.

## DB / Prisma / Provider

- DB writes: none.
- Prisma schema/generate/db push: none.
- OpenAI/Anthropic provider calls: none.
- `AiUsageLog`: no new provider call; prior PIM-011b evidence remains `147->147`.

## Git

- Start status: branch ahead with unrelated modified/untracked AMM/notes/sidebar/manual files present before this review.
- Commit: created locally after staging only this review's related files; final response records the hash.
- Push: skipped by user instruction.

## Next Recommended Loop Prompt

Run the normal LV3 immersive implementation loop and select:

`PIM-011c quick-capture UI selector bridge`

Acceptance focus:

- Wire `/pre-visit/[planId]/notes` or an equivalent committed current-workspace entry to `/api/ai/interview/quick-captures`.
- Advisor chooses only private draft / client / visit / follow-up review as first decision.
- No raw client/visit/session ID as the primary workflow.
- High-sensitive client-bound note requires reason/riskAccepted or remains private.
- UI response shows safe DTO summary and memory/state-proposal IDs, not raw note or private sentinel.
- Desktop/mobile browser proof with no horizontal overflow.
- No provider call; prove `AiUsageLog` unchanged.
