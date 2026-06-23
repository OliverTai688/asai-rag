# 2026-06-23 LV3 Meeting Relationship Signal BFF/UI

## Scope
- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `LV3-MEETING-PREP-UI-001`.
- Goal: make accepted AI Meeting quick-note memory, persisted summary, and writeback preview candidates visible in `/pre-visit/[planId]` as relationship signal cards through an owner-scoped BFF, without raw session/person id entry or CRM/relationship graph writes.

## Candidate Score
1. `LV3-MEETING-PREP-UI-001` — 46/50
   - Connects AI Meeting -> preparation package, two core surfaces.
   - Directly closes prior whole-product review gap.
   - Source-backed BFF/UI slice, not docs-only proof.
2. `LV3-MEETING-SIGNAL-THEATER-001` — 40/50
   - Strong next bridge from prep -> theater, but depends on first making signals visible/readable in prep.
3. `REL-CONFIRM-PERSISTENCE-DECISION` — 34/50
   - Important for refresh/new-context persistence, but still needs product/schema decision before DB write.

## Changes
- Added `GET /api/visits/[id]/meeting-relationship-signals`.
- Added `getVisitMeetingRelationshipSignalDeckForMember()` read-only repository.
- Added `/pre-visit/[planId]` right-rail "會議關係訊號" panel.
- Added `pnpm visit:meeting-relationship-signal-bff-ui-qa`.
- Updated AgentFacts manifest and registry QA for the new endpoint, BFF owner refs, UI evidence, and proof command.
- Updated `loop-state.json` cadence to 1 and recorded next recommended implementation slice.
- Updated `issue-question.md` source status so the old "UI/BFF not yet wired" note is no longer stale.

## Validation
- PASS `pnpm visit:meeting-relationship-signal-bff-ui-qa`
- PASS `pnpm visit:meeting-relationship-signal-dry-run`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed` (exit 0; existing warning remains in `scripts/public-status-degraded-qa.mjs`)
- PASS `git diff --check`

## Evidence
- BFF proof: owner-scoped VisitPlan, server-derived latest meeting session, summary/writeback read through existing member scope, no query-supplied session/person ids.
- UI proof: `data-meeting-relationship-signal-cards`, no raw meeting session id or summary id rendered.
- Safety proof: no provider call, no fake `AiUsageLog`, no relationship graph write, no VisitPlan write, no confirmed CRM fact write, no raw transcript/provider/payment token outside explicit false proof booleans.

## NANDA Alignment
- Updated `asai.visit.preparation_package` manifest version to `2026-06-23.meeting-relationship-signal-bff-ui`.
- Added endpoint `/api/visits/[id]/meeting-relationship-signals`.
- Added `VisitMeetingRelationshipSignalBffDto`, owner refs, evidence refs, and proof command.
- Registry readiness remains internal-only; no external NANDA publication, discovery endpoint, signing, or cross-org agent access started.

## DB/Prisma
- No Prisma schema change.
- No Prisma generate/db push.
- No DB write path added; repository is read-only.

## Git
- Push skipped by user instruction.
- Commit pending at report creation time; final response will include commit hash after local commit.

## Blockers
- Remaining product/schema blocker: relationship confirmation advisor-state refresh/new-context persistence still needs a decision between VisitPlan JSON subdocument and dedicated table.
- External NANDA publication remains blocked by operator approval.

## Next Recommended Loop
`LV3-MEETING-SIGNAL-THEATER-001`: carry owner-scoped `VisitMeetingRelationshipSignalDeck` outputs into preparation-package -> theater handoff sourceSummary / knownMaterials / narrator confirmation questions, without persisting relationship graph or confirmed CRM facts.
