# 2026-06-23 LV3 whole-product gap review - meeting prep signal

## Scope

- Loop type: scheduled fifth-loop whole-product review.
- Trigger: `normalLoopsSinceLastWholeProductReview=4`, so this loop used `lv3-whole-product-gap-review-loop.md`.
- User preference applied: this review does not create artificial docs-only proof. It resets cadence and points the next normal loop to a source-backed BFF/UI slice.
- Push policy: local commit only; `push skipped by user instruction`.

## Recent Loop Delta

Since the previous whole-product review, the automation completed:

1. `AMM-005c` notes / `postVisitNotes` Browser/API/DB proof for the accepted `/pre-visit/[planId]/notes` bridge.
2. `LV3-CROSS-001` clean cross-flow no-provider repair, including Route B public snapshot DTO boundary.
3. `LV3-REL-DECISION-001` relationship confirmation persistence decision contract, making the unresolved product/schema decision explicit.
4. `LV3-MEETING-PREP-001` meeting quick notes / summaries / writeback candidates -> preparation relationship signal cards as a pure source bridge.

The product frontier has moved from "can the pieces work" to "does the advisor see and act on meeting-derived relationship evidence in the preparation workspace."

## Six Review Frames

1. **Advisor workflow / onboarding**: the core path is now credible from client -> relationship graph -> pre-visit -> notes/meeting -> theater, but the latest meeting-derived signals are still not visible in the pre-visit workspace. The advisor can generate the signal deck in source, but cannot yet review those cards from the normal preparation surface.
2. **Source-of-truth / BFF**: `VisitMeetingRelationshipSignalDeck` exists and proves redaction/no-provider/no-write boundaries, but there is no owner-scoped BFF/read DTO or pre-visit UI consumption. Relationship confirmation state persistence remains blocked on the VisitPlan JSON vs dedicated table decision.
3. **AI reasoning / evidence**: facts, inferences, unknowns, source refs, and safe summaries are increasingly consistent across meeting, quick-capture, visit preparation, and theater. The next gap is making that reasoning trace visible beside the preparation questions without exposing raw notes, transcripts, provider payload, contact values, or policy numbers.
4. **Theater / relationship immersion**: Route B has red-line, feedback, compliance-review, relationship-confirmation, and visit-prep handoff bridges. However, meeting-derived relationship signal cards are not yet part of the theater source packet or visible as advisor-confirmed stage grounding.
5. **QA / compliance / release-proof**: cross-flow no-provider proof now passes. Payment/email/notification/external registry production items remain guarded/manual and should not displace the core LV3 immersive workflow unless source behavior regresses.
6. **NANDA / AgentFacts protocol**: internal manifests remain `internal-only`. The meeting-prep signal bridge must be declared as an internal preparation-package capability when the BFF/UI slice lands; no external NANDA registry publication, signing, public discovery endpoint, or cross-org access is approved.

## Top Candidate Scores

| Candidate | Score | Why |
| --- | ---: | --- |
| `LV3-MEETING-PREP-UI-001` meeting relationship signal BFF/UI consumption | 46 | Connects AI Meeting / notes, visit preparation, relationship confirmation, and future theater grounding; source bridge already exists; no schema or provider approval required; produces concrete API/UI proof. |
| Relationship confirmation state persistence implementation | 39 | High product value for refresh/new-context advisor state, but still blocked on product/schema selection: VisitPlan-owned JSON subdocument vs dedicated table. |
| Prep package -> theater source packet consumes meeting signal deck | 36 | Strong immersion value, but should follow after the advisor can first review and classify meeting-derived cards in the preparation workspace. |

## Selected Next Slice

Selected next normal loop: **`LV3-MEETING-PREP-UI-001` owner-scoped meeting relationship signal BFF/UI consumption**.

Acceptance target:

- Add a current-member/owner-scoped read boundary for `VisitMeetingRelationshipSignalDeck`, ideally under the visit/preparation BFF surface.
- Render meeting-derived relationship signal cards in `/pre-visit/[planId]` or the adjacent preparation detail surface with fact / inference / unknown labels, evidence refs, and guardrail copy.
- Do not persist card state, write the relationship graph, or create confirmed CRM facts in this slice.
- Prove owner success, manager/foreign denial, response/page private sentinel 0, no provider call, no fake `AiUsageLog`, no raw private transcript/provider/contact/policy leakage, desktop/mobile prep page safety, `pnpm ai:protocol-registry-qa`, `pnpm exec tsc --noEmit --pretty false`, and `pnpm lint:changed`.

## Top Product Gaps

1. **Meeting-derived relationship signals are source-backed but not visible in the preparation workspace.** This is the highest-leverage source/UI gap.
2. **Relationship confirmation advisor-state persistence is still a product/schema decision.** Until selected, the correct contract remains `persistedToDatabase=false`.
3. **Meeting signal cards are not yet consumed by Route B theater source packets.** This should follow the preparation UI/BFF slice.
4. **Formal `RelationshipEdge` persistence remains migration-gated.** Existing BFF-derived edges are enough for the next slice; REL-004 still needs schema/migration approval.
5. **Live production payment/email/notification/external registry proof remains manual/provider/env gated.** These are release blockers, not the best next LV3 immersive slice.

## NANDA Alignment

- Existing AI modules remain `internal-only`.
- No OpenAI/Anthropic provider call was made in this review.
- No external NANDA / third-party registry publication, public discovery endpoint, credential signing, or cross-org agent access was attempted.
- Next slice must update `asai.visit.preparation_package` AgentFacts-style manifest with the BFF/UI consumption capability and proof command while preserving least-disclosure boundaries.

## Validation

- PASS `git diff --check`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed` with exit code 0. Existing warning only: `scripts/public-status-degraded-qa.mjs` unused `existsSync`; this review loop did not modify that file.

## DB/Prisma

- No Prisma schema change.
- No Prisma generate/db push.
- No DB read/write proof in this scheduled review.
- No production write, real email, real notification, payment/refund, destructive DB operation, provider call, raw private/provider payload storage, secret/token/OTP storage, or remote deletion.

## Git

- Start status included pre-existing unrelated dirty files in docs manual/sidebar/AI meeting notes prototypes; they were not touched or staged by this loop.
- Local commit to be created after validation.
- push skipped by user instruction.

## Blockers

- Product/schema blocker: relationship confirmation state persistence option still unselected.
- Migration blocker: formal `RelationshipEdge` table still requires schema/migration approval.
- External approval blocker: external NANDA publication and real production payment/email/notification enablement remain unapproved or env/provider gated.

## Next Recommended Loop

Run the normal LV3 immersive loop and select **`LV3-MEETING-PREP-UI-001`**. Implement the owner-scoped meeting relationship signal BFF/UI consumption path for `/pre-visit/[planId]`; do not spend the next loop on docs-only proof unless source behavior is blocked. If only residual browser evidence remains after source/API proof passes, hand the exact self-runnable command to the operator.

push skipped by user instruction
