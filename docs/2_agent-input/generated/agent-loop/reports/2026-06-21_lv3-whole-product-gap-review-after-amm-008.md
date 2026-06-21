# LV3 Whole-Product Gap Review after AMM-008

Date: 2026-06-21
Loop type: scheduled fifth-loop whole-product gap review
Cadence: `normalLoopsSinceLastWholeProductReview` moved from 4 to 0
Push: push skipped by user instruction

## Scope

This review ran after `AMM-008 cross-state AMM proof pack`. It did not implement source code and did not call OpenAI/Anthropic. Its job was to inspect the current product architecture, experience, interface, safety, and onboarding maturity across the LV3 advisor workflow, then convert the most important gaps into the next source-backed slice.

The previous AMM review's top gaps have mostly been closed by source/proof loops: writeback confirmation UI, dashboard/CRM global meeting entrypoints, provider-backed memory-chat, and the cross-state AMM proof pack. The current bottleneck shifted to the post-visit notes surface.

## Anti-Repetition Gate

- Last normal loop `AMM-008` was L1/L2 executable proof with source/test fixes, browser/API/DB/provider evidence, and no docs-only completion.
- The loops before it were AMM source/provider/UI/API work: provider memory-chat, global entrypoints, and writeback confirmation cards.
- This scheduled review is allowed by cadence, but its output explicitly forbids a docs-only next loop when safe source work exists.

## Six Frames

1. Advisor workflow: visit preparation and meeting workspace are strong, but `/pre-visit/[planId]/notes` still leaves advisors in a separate post-visit notes lane.
2. Source/BFF architecture: visit notes BFF, quick-capture BFF, and AMM meeting BFF exist, but they are not proven as one compatibility bridge.
3. Evidence and reasoning: meeting summary, citations, memory-chat, and writeback boundaries are strong; raw note / quick-capture / transcript separation needs an explicit UI/API proof.
4. Relationship and theater: relationship graph and Route B theater have usable proof, but post-visit insights are not yet a clean handoff source for follow-up graph/theater refinement.
5. QA/compliance/release: AMM cross-state proof is broad; the remaining notes bridge must preserve compliance fields, manager/foreign denial, no raw provider/private payload storage, and `AiUsageLog` policy.
6. NANDA/AgentFacts: 11 AI manifests remain internal-only/local-draft. AMM manifest evidence should be updated after the notes bridge, but external registry publication stays blocked.

## Top Gap Ranking

1. `AMM-005c notes/postVisitNotes compatibility bridge` - severity 2, leverage 3. Connects notes, AI meeting, quick-capture, summary, writeback, and legacy visit notes with source/UI/API/DB/browser proof.
2. `REL-004 formal RelationshipEdge schema` - severity 2, leverage 3. Would improve graph/theater source truth, but needs migration/rollback approval.
3. `AMM-007 pgvector retrieval` - severity 1, leverage 2. Improves meeting memory scale, but current deterministic retrieval works and extension/operator path is still a blocker.
4. Route B provider-backed director/character/feedback runtime - severity 2, leverage 2. Live provider proof is approved, but notes compatibility is more directly tied to post-visit advisor operation.
5. Relationship graph to theater state-change loop - severity 2, leverage 2. Important for immersive maturity, best after post-visit insight capture is unified.
6. Same-org cross-member meeting memory sharing - severity 2, leverage 2. Product/privacy decision needed before shared org memory can be enabled.
7. AI module external registry readiness - severity 2, leverage 1. Internal manifests exist; external publication/signing/cross-org access is not approved.
8. Public launch hardening BFF-402/403/404 - severity 3, leverage 2. Release important, but outside the immediate LV3 immersive advisor loop.
9. Untracked notes prototype ownership - severity 1, leverage 1. It must be adopted only through an AMM-owned source/proof slice, not treated as baseline evidence.
10. Relationship person metadata depth - severity 1, leverage 2. Job/income/status/context exist in current graph proof, but richer update flows can follow after notes and edge-schema decisions.

## Candidate Score

1. `AMM-005c notes/postVisitNotes compatibility bridge` - 95/100. Highest cross-surface leverage, reviewable source slice, directly resolves the current split advisor workflow, and can be proven without production writes.
2. `REL-004 formal edge table schema` - 87/100. Strong architecture leverage for graph/theater, but requires schema migration and rollback approval.
3. `AMM-007 pgvector retrieval` - 82/100. Useful maturity improvement for memory retrieval, but less user-visible than the notes bridge and requires Supabase extension/operator path.

Selected next slice: `AMM-005c notes/postVisitNotes compatibility bridge`.

## Documentation Updates

- `AGENTS.md`: added AMM-005c card and whole-product review note after AMM-008.
- `docs/05_execution-plans/PLN-023_ai-meeting-module-batch-tasks-v1.0.md`: added the same executable AMM-005c checklist.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence and pointed the next normal loop at AMM-005c.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`: recorded the review result and remaining operator blockers.

## NANDA Alignment

No AI module was changed and no provider call was made. The NANDA posture remains internal-only/local-draft. The next AMM-005c source slice should update the AMM manifest/proof notes only if the notes bridge changes capability boundaries, data classes, or evidence claims. External NANDA publication, signing, public discovery, and cross-org agent access remain unapproved.

## Validation

- `git diff --check`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.
- Targeted API/browser/DB proof: not applicable for this scheduled review; required next loop for AMM-005c.

## DB / Prisma

No Prisma schema changes, no `prisma generate`, no `db push`, no production write, and no destructive DB operation.

## Blockers

- REL-004 formal edge table needs schema migration/rollback approval.
- AMM-007 pgvector retrieval needs Supabase extension/operator path.
- External NANDA/third-party registry publication remains blocked by explicit user instruction.
- Real production payment/email/notification enablement still depends on manual env/provider setup and separate real-operation QA.

## Next Recommended Loop

Run `AMM-005c notes/postVisitNotes compatibility bridge`.

Prompt: `Implement AMM-005c as a source-backed slice. Make /pre-visit/[planId]/notes preserve BFF-owned postVisitNotes/postVisitAnalysis while linking or embedding the owner-scoped CLIENT_MEETING workspace, latest meeting summary, writeback confirmation state, and quick-capture boundary. Add pnpm meeting:notes-compat-qa and prove owner success, manager/foreign denial, raw private/provider sentinel guard, refresh/new-context persistence, desktop/mobile browser safety, and AiUsageLog no-provider unchanged unless provider mode is explicitly used with success/error logs. Do not complete this with docs-only proof or by staging unreviewed notes prototype files.`
