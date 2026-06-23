# 2026-06-23 LV3 whole-product gap review — AMM notes compatibility

## Scope
- Loop type: scheduled fifth-loop whole-product review.
- Trigger: `normalLoopsSinceLastWholeProductReview=4`, so this loop used `lv3-whole-product-gap-review-loop.md`.
- Non-duplicate rationale: the previous whole-product review selected the BFF release-readiness gate path; subsequent normal loops completed BFF-404a/BFF-402f/BFF-402g/BFF-402h guarded contract slices. The frontier can now move back to the core immersive advisor flow instead of re-reviewing the same release gate.
- User preference applied: avoid docs-only proof when safe source/proof work exists; if residual evidence can be self-run by the operator, hand it off instead of creating proof churn.

## Recent Loop Delta
- Completed since the last review: release-readiness BFF projection, ECPay query boundary, payment transaction persistence contract, and confirmed activation guarded contract.
- Current release/BFF posture: safer guarded contracts exist, but true live payment activation/upsert/provider env proof remains externally blocked.
- Current LV3 posture: AI meeting and notes are accepted workstream surfaces, but AMM-005c still has an unchecked Browser/API/DB proof for the formal `/pre-visit/[planId]/notes` compatibility bridge.

## Six Review Frames
- Advisor workflow: `新增客戶 -> 訪談/會議 -> notes -> 準備包/寫回` is closer, but the notes/postVisitNotes bridge is not yet proven in browser/API/DB.
- Relationship graph: relationship confirmation cards and REL-004 `RelationshipEdge` remain important, but schema/product decisions make them less safe as the next autonomous slice.
- Preparation package and evidence: visit-prep reasoning is source-backed; the highest nearby gap is whether post-meeting notes reliably feed the accepted meeting workspace without relying on the quarantined `/notes` prototype.
- Theater immersion: ITA red-line and theater bridges are stronger, but richer relationship state still depends on relationship persistence decisions.
- QA/release: payment live gates and production env remain blockers; the next safe proof should focus on accepted AMM flow, not another docs-only readiness note.
- Protocol/NANDA: all AI modules remain internal-only; AgentFacts-style manifests exist, but AMM inventory/source adoption is stale around the old `asai.meeting.prototype` wording.

## Top Candidate Scores
| Candidate | Score | Why |
| --- | ---: | --- |
| AMM-005c notes/postVisitNotes compatibility proof closure | 43 | Connects meeting capture, notes, summary/writeback, and pre-visit workflow; accepted source exists; proof can expose concrete source/QA fixes; no schema or provider publication approval needed. |
| REL-004 relationship edge model + graph source | 37 | Strong LV3 relationship immersion value, but requires schema/model approval and possible DB migration decision before safe autonomous work. |
| BFF-402 live payment query/upsert/activation proof | 34 | High release value after guarded contracts, but live provider/env/activation evidence is mostly external and less tied to the immersive advisor-system core. |

## Selected Next Slice
Selected next normal loop: **AMM-005c notes/postVisitNotes compatibility proof closure**.

Acceptance target:
- Run the accepted pre-visit notes bridge through `DEMO_QA_BASE_URL=http://localhost:<port> pnpm meeting:notes-compat-qa`.
- Fix any source or QA contract issue exposed by that proof.
- Keep the quarantined `/notes` prototype out of scope.
- If the only remaining evidence is a manually repeatable screenshot/browser check, delegate it to the operator and record the exact command/path instead of adding docs-only proof churn.

## Top Product Gaps
1. AMM-005c Browser/API/DB proof remains unchecked for `/pre-visit/[planId]/notes`.
2. Relationship confirmation advisor-state persistence still needs a product/schema decision.
3. REL-004 `RelationshipEdge` schema remains the largest relationship-graph maturity gap, but is migration-gated.
4. Live ECPay/payment transaction upsert/confirmed activation proof remains externally blocked by provider/env/payment conditions.
5. NANDA inventory should align accepted AMM source surfaces and stop treating meeting only as a prototype row before external registry work.

## Owner Docs Updated
- `docs/05_execution-plans/PLN-023_ai-meeting-module-batch-tasks-v1.0.md`: added whole-product review note pointing next normal loop back to AMM-005c.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence to 0 and updated next recommended implementation slice.
- This report.

## NANDA Alignment
- Status remains `internal-only`; no external NANDA registry publication, credential signing, public discovery endpoint, or cross-org agent access was attempted.
- Registry readiness gap: AMM manifest/inventory language should be reconciled with accepted MeetingWorkspace/BFF source in a later source-backed NAP/AMM slice.
- Least-disclosure posture preserved: no raw transcript, raw provider payload, raw payment data, secret, cookie, token, or OTP was added to evidence.

## Validation
- PASS: `git diff --check`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed` exited 0. It reported one warning in pre-existing changed file `scripts/public-status-degraded-qa.mjs`; this review loop did not modify that file.

## DB/Prisma
- No Prisma schema changes.
- No DB write/read proof executed in this review loop.
- No production write, email, notification, payment/refund, destructive DB operation, or remote deletion.

## Git
- Push policy: push skipped by user instruction.
- Commit: created after report writing; final response records the local commit hash.

## Next Recommended Prompt
Run the normal LV3 immersive loop and select **AMM-005c notes/postVisitNotes compatibility proof closure**. Start from `PLN-023` AMM-005c, run or repair `pnpm meeting:notes-compat-qa` against the accepted `/pre-visit/[planId]/notes` bridge, and only delegate residual browser evidence if it is manually self-runnable.
