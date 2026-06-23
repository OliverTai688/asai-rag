# 2026-06-23 LV3 Meeting Signal Theater Handoff

## Scope
- Loop type: normal LV3 implementation/proof loop (not fifth-loop whole-product review; cadence 1 -> 2).
- Selected slice: `LV3-MEETING-SIGNAL-THEATER-001`.
- Goal: carry owner-scoped `VisitMeetingRelationshipSignalDeck` from meeting/prep into preparation-package -> theater handoff as safe `knownMaterials`, `sourceSummary`, count UI, and narrator confirmation questions.
- Non-goals: no relationship graph persistence, no VisitPlan write, no confirmed CRM fact write, no provider call, no external NANDA publication.

## Candidate Score
1. `LV3-MEETING-SIGNAL-THEATER-001` — 46/50. Connects meeting/prep -> theater, touches source + BFF + UI + manifest + proof, and avoids docs-only evidence.
2. Relationship confirmation persistence decision — 35/50. Important for reload/new-context continuity, but still needs product/schema decision before DB write.
3. Residual cross-flow/browser evidence — 32/50. Useful but mostly self-runnable proof; user preference says do not over-invest when exact commands can be handed off.

## Changes
- `src/domains/theater/visit-handoff.ts`
  - Added `VisitTheaterMeetingRelationshipSignalHandoffSummary`.
  - Accepts optional `meetingRelationshipSignalDeck`.
  - Emits meeting signal `knownMaterials`, source counts, no-provider/no-write proof flags, and unknown/next-visit narrator questions.
  - Strengthened policy/secret/raw-payload redaction.
- `src/app/api/visits/[id]/theater-handoff/route.ts`
  - Reads meeting signal deck through `getVisitMeetingRelationshipSignalDeckForMember(session, visitPlanId)`.
  - Does not accept browser-supplied meeting session/person ids.
- `src/app/(dashboard)/pre-visit/[planId]/page.tsx`
  - Passes the loaded meeting signal deck into local theater handoff preview.
- `src/app/(dashboard)/theater/build/page.tsx`
  - Shows a `會議` source count in the visit package source review panel.
- `src/domains/visit/meeting-relationship-signal.ts`
  - Strengthened token/cookie/OTP redaction variant handling.
- `src/domains/ai-protocol/manifest.ts`, `scripts/ai-protocol-registry-qa.ts`
  - Added internal-only AgentFacts-style capability/action/evidence for meeting signal -> theater handoff.
- `scripts/visit-theater-handoff-dry-run.ts`, `scripts/visit-theater-handoff-dry-run.mjs`
  - Added meeting signal fixture and no-leak/no-write assertions.
- `scripts/visit-meeting-signal-theater-handoff-qa.mjs`, `package.json`
  - Added targeted static BFF/UI contract proof.

## Validation
- PASS `pnpm visit:theater-handoff-dry-run`
- PASS `pnpm visit:meeting-signal-theater-handoff-qa`
- PASS `pnpm visit:meeting-relationship-signal-dry-run`
- PASS `pnpm visit:meeting-relationship-signal-bff-ui-qa`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
  - Note: command exited 0 with one pre-existing warning in `scripts/public-status-degraded-qa.mjs`; not touched this loop.
- PASS `git diff --check`

## Evidence
- Domain dry-run output: meetingRelationshipSignals cardCount 2, highPriorityCount 1, narratorQuestionCount 1, providerCallAttempted false, persistedToDatabase false, writesRelationshipGraph false, writesVisitPlan false, writesConfirmedCrmFact false.
- Static BFF/UI QA confirms theater handoff route uses server-side deck lookup and does not accept query/session/person ids from browser.
- Registry QA confirms new internal-only AgentFacts capability, owner refs, evidence refs, and proof command.
- No live provider call occurred; no `AiUsageLog` was required or faked.

## NANDA Alignment
- Added internal-only capability `meeting-relationship-signal-theater-handoff-grounding`.
- Added output/evidence refs for `VisitTheaterHandoff.sourceSummary.evidenceSummary.meetingRelationshipSignals` and `VisitTheaterMeetingRelationshipSignalHandoffSummary`.
- Registry readiness remains `internal-only`; external publication/signing/public discovery remain disabled and require operator approval.

## DB/Prisma
- No Prisma schema change.
- No DB write.
- No `prisma db push`, no migration, no production write.

## Git
- Commit planned after report/state updates.
- Push skipped by user instruction.

## Blockers
- Product/schema decision remains open for relationship confirmation card persistence across refresh/new context.
- External NANDA/third-party registry publication remains unapproved.
- Optional browser evidence can be self-run if a dev server/session is available: `DEMO_QA_BASE_URL=http://localhost:<port> pnpm visit:theater-bff-qa`.

## Next Recommended Loop
- `LV3-THEATER-MEETING-SIGNAL-STAGE-001`: surface meeting-derived relationship signal cards inside `/theater/build` source review and Route B stage setup with fact/inference/unknown chips, source labels, and narrator-question previews, still without CRM/VisitPlan/relationship-graph writes.
