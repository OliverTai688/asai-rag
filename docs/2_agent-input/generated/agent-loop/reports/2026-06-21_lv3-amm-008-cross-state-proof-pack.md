# 2026-06-21 LV3 AMM-008 Cross-State Proof Pack

## Scope

Run one LV3 immersive advisor-system loop for a source-backed AI Meeting slice. This loop avoids docs-only proof and focuses on proving the advisor flow across CRM, relationship source, visit plan, AI Meeting workspace, provider summary, writeback, provider memory chat, realtime provider boundary, manager aggregate privacy, and DB usage evidence.

## Candidate Score

1. AMM-008 cross-state AMM proof pack — 96/100. Best fit because it connects CRM -> visit -> meeting workspace -> summary -> writeback -> memory-chat -> realtime -> org privacy, uses source/API/browser/DB/provider proof, and closes the next recommended AMM acceptance gap.
2. `/pre-visit/[planId]/notes` + `postVisitNotes` compatibility — 86/100. Valuable source/UI compatibility work, but narrower than AMM-008 and less cross-surface.
3. AMM-007 pgvector retrieval — 76/100. Important retrieval maturity item, but still operator/DB-extension dependent and less immediately reviewable than the current cross-state proof pack.

## Selected Slice

Selected AMM-008: cross-state AI Meeting proof pack with a reusable command, manifest evidence, source fixes, browser screenshots, and DB proof.

## Changes

- Added `pnpm meeting:cross-state-qa` via `scripts/meeting-cross-state-qa.mjs`.
- Fixed meeting memory-chat safety checks to scan only user-facing text, not opaque ids that can contain phone-like numeric substrings.
- Anchored client memory-chat grounding with the CRM client profile when available, so client-level provider answers can cite client occupation, annual income, status, and sensitivity.
- Updated the AI protocol manifest for `asai.meeting.prototype` with AMM-008 version/evidence/proof command.
- Marked AMM-008 complete in `AGENTS.md` and `PLN-023`.
- Updated loop-state cadence to 4 and recorded next whole-product review requirement.

## Validation

- PASS `node --check scripts/meeting-cross-state-qa.mjs`
- PASS `pnpm meeting:cross-state-qa`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm ai:bff-audit`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`

## Evidence

- Script: `scripts/meeting-cross-state-qa.mjs`
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/ai-meeting/amm-008-cross-state/amm-008-cross-state-desktop.png`
  - `docs/06_audits-and-reports/screenshots/ai-meeting/amm-008-cross-state/amm-008-cross-state-mobile.png`
- Proof highlights from `pnpm meeting:cross-state-qa`:
  - Provider summary quota 429 blocks before provider and writes no fake `AiUsageLog`.
  - Provider summary forced error is sanitized and logs an error usage row.
  - Provider summary success persists provider/model/usageLogId and cited summary rows.
  - Desktop and mobile meeting workspace reload same DB session without horizontal overflow or console errors.
  - Writeback raw/private payload is blocked and does not echo the sentinel.
  - Writeback confirmation creates an audit event and never writes confirmed CRM fact.
  - Provider session/client memory-chat succeeds with usageLogId and least-disclosure citations.
  - Realtime quota blocks before provider; provider path writes INTERVIEW/OpenAI usage; raw audio event payload is rejected.
  - Manager aggregate overview does not expose meeting/client detail sentinels and cannot read member-private meeting snapshot.
  - DB raw sentinel scan is zero for turns, memories, summaries, and writeback events.
  - Usage deltas prove real provider/dry-run event logging: total `AiUsageLog` 174 -> 180 on the passing run.

## DB/Prisma

- Prisma schema unchanged; no `prisma db push`, no migration, no destructive DB operation.
- Non-destructive development/demo DB writes were performed under existing approval: demo/test client, relationship source, policy, visit plan, meeting sessions/turns/summaries/writeback event, and `AiUsageLog` rows.
- No raw cookie, secret, token, OTP, raw provider payload, raw private transcript, raw audio, or payment data was stored in evidence or report.

## NANDA Alignment

- `asai.meeting.prototype` remains `internal-only`; no external NANDA/third-party registry publication, public discovery, signing, or cross-org access was started.
- Manifest now advertises the AMM-008 proof command and evidence refs for cross-state meeting usage, privacy, realtime, memory-chat, and manager aggregate boundaries.

## Git

- Push skipped by user instruction.
- Commit pending at report write; final loop response will include local commit hash if commit succeeds.

## Blockers

- External NANDA publication remains blocked pending explicit operator approval.
- AMM-007 pgvector retrieval remains dependent on an approved DB extension path.
- `/pre-visit/[planId]/notes` and `postVisitNotes` compatibility still needs source work.

## Next Recommended Loop

Cadence counter is now 4. Next heartbeat should run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md` first, then select the highest-value source/proof slice. Current likely implementation follow-up after review: `/pre-visit/[planId]/notes` + `postVisitNotes` compatibility, with AMM-007 pgvector retrieval second if the DB extension path is approved.
