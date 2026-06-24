# LV3 Meeting Review Context Signal Contract

## Scope

- Loop type: LV3 immersive advisor-system normal implementation/proof loop.
- Task level: L2 source/proof implementation slice.
- Strategic gate: last two loops were L2 implementation/proof (`feedback-advisor candidate review context`, then cross-flow proof-pack refresh), so this loop continued implementation and avoided a docs-only or repeated DB-proof loop.
- Selected slice: make `MeetingWritebackCandidate.reviewContext` from Route B feedback-advisor context become visit/preparation-package relationship signal evidence through a deterministic server-side contract proof.

## Candidate Score

1. Selected - AI Meeting writeback review context -> visit/prep relationship signal contract: 9.1/10.
   - Connects theater/AI Meeting review context to visit preparation evidence.
   - Runs without DB, provider, browser session, schema change, or CRM write.
   - Leaves a self-runnable proof command and AgentFacts registry checks.
2. Full live LV3 cross-flow no-provider proof: 7.4/10.
   - Valuable end-to-end evidence, but current Supabase DNS still returns `ENOTFOUND/P1001`.
   - Risk of spending another loop on known external blocker.
3. RelationshipEdge schema or relationship confirmation persistence: 6.9/10.
   - High product value, but still needs operator/schema/product-decision approval before persistence.

## Changes

- Added `MEETING_WRITEBACK_REVIEW_CONTEXT` as an accepted visit meeting relationship signal source type.
- Added `meetingWritebackCandidateReviewContextToRelationshipSignals(candidate)` to convert safe `MeetingWritebackCandidateReviewContext` summaries into visit/prep relationship signal inputs.
- Expanded the meeting relationship signal dry-run fixture from 4 to 6 cards, covering:
  - quick note,
  - writeback candidate,
  - two Route B feedback-advisor review-context cards,
  - open question,
  - action item.
- Updated the visit AgentFacts-style manifest version and evidence refs for:
  - `MeetingWritebackCandidateReviewContext`,
  - `MeetingWritebackCandidate.reviewContext=MeetingWritebackCandidateReviewContext[]`,
  - `VisitMeetingRelationshipSignalInput.sourceType=MEETING_WRITEBACK_REVIEW_CONTEXT`,
  - no graph/VisitPlan/client/policy/confirmed CRM fact writes.
- Updated protocol registry QA to enforce the new DTO/source/helper evidence.
- Updated `loop-state.json`: cadence normal loops `2 -> 3`; next recommended slice now points to visible/BFF-safe adoption of the new contract if DB/DNS remains blocked.

## NANDA Alignment

- Agent/module touched: `asai.visit.preparation_package`.
- Manifest version: `2026-06-25.meeting-review-context-signal-contract`.
- Registry readiness remains `internal-only`; no external NANDA/third-party registry publication, signing, public discovery, or cross-org access.
- Capability/action updated: `meeting-notes-relationship-confirmation-signal`.
- Protocol boundary: still protocol-neutral DTO/helper evidence, not provider-shape specific.
- Least-disclosure proof: the dry-run redacts email, phone, policy number, raw provider payload, and raw private transcript sentinels.
- AiUsageLog policy: no provider call attempted in this slice; `aiUsageLogWritten=false` is explicit no-provider proof, not a fake usage log.

## Validation

- PASS `pnpm visit:meeting-relationship-signal-dry-run`
  - cardCount `6`
  - sourceTypes include `MEETING_WRITEBACK_REVIEW_CONTEXT`
  - providerCallAttempted `false`
  - writesConfirmedCrmFact `false`
  - persistedToDatabase `false`
- PASS `pnpm visit:meeting-relationship-signal-bff-ui-qa`
- PASS `pnpm visit:meeting-signal-theater-handoff-qa`
- PASS `pnpm meeting:route-b-feedback-advisor-writeback-bridge-qa`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm ai:bff-audit`
  - Note: command passed with DB summary warn: `ENOTFOUND db.wwocdcicvpmbdmqvskzi.supabase.co`.
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
  - Note: existing warning remains in `scripts/public-status-degraded-qa.mjs` for unused `existsSync`; no error.
- PASS `git diff --check`

## Evidence

- No OpenAI/Anthropic provider call.
- No Prisma command required.
- No DB write, no production write, no email, no notification, no payment/refund.
- No schema migration and no `src/generated` edits.
- No raw cookie, secret, token, OTP, provider payload, private transcript, payment data, raw theater session id, or raw person id stored.

## DB/Prisma

- DB/Prisma operations: none.
- Known DB blocker unchanged: Supabase host currently fails DNS resolution in source audits.

## Git

- Push skipped by user instruction (`2026-06-20 先不用 git push`).
- Local commit will be created after final staging/verification.

## Blockers

- External: DB/DNS `ENOTFOUND/P1001` blocks live DB-backed cross-flow proof.
- Product/schema: RelationshipEdge formal schema/migration and rollback approval still needed before persistence.
- Product decision: relationship confirmation card persistence A/B/C remains unresolved.
- Release/compliance: external registry publication remains unapproved and must stay internal-only.

## Next Recommended Loop

If DB/DNS is available, rerun `DEMO_QA_BASE_URL=http://127.0.0.1:<free-port> pnpm lv3:cross-flow-no-provider-qa`. If DNS remains blocked, use the new `meetingWritebackCandidateReviewContextToRelationshipSignals` contract in a visible visit/preparation source-only evidence panel or BFF-safe preview, preserving summary-required/advisor-confirmation/no-provider/no relationship graph/VisitPlan/client profile/policy/confirmed CRM fact writes.

Push status: push skipped by user instruction.
