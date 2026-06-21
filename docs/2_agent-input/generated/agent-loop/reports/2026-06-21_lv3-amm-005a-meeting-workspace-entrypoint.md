# 2026-06-21 LV3 AMM-005a Meeting Workspace Entrypoint

## Scope

Normal LV3 implementation/proof loop. Selected one reviewable slice: `AMM-005a visible meeting workspace entrypoint`.

Goal: make the already-proven AMM meeting BFF operable from the advisor preparation package without a raw-ID workflow, and prove the UI/API path with real local browser/API evidence.

This loop did not call OpenAI/Anthropic. It used deterministic no-provider AMM routes only.

## Candidate Score

1. `AMM-005a visible meeting workspace entrypoint` — 96/100
   - Connects two core surfaces: preparation package -> AI Meeting workspace.
   - Converts previously unaccepted meeting prototype files into accepted source with BFF-backed proof.
   - Has immediate manual-review value: no raw-ID workflow, desktop/mobile UI, refresh persistence.

2. `AMM-004a cross-meeting client memory/chat` — 91/100
   - Strong next slice because it connects meeting capture -> client memory retrieval -> cited advisor Q&A.
   - Deferred because the entrypoint needed to exist first to avoid another backend-only proof.

3. `AMM-003b provider JSON summary with AiUsageLog proof` — 88/100
   - High maturity value and now operator-approved in principle.
   - Deferred because live provider summary should build on the deterministic UI path and needs success/error usage evidence.

## Changes

- Added owner-scoped `GET /api/ai/meeting/sessions/[sessionId]/summary`.
- Added `readMeetingSummaryForMember()` for persisted summary readback.
- Replaced the meeting prototype page with a server page that passes `planId` and optional `sessionId` to the workspace.
- Replaced demo-builder meeting workspace with BFF-driven UI:
  - auto create/read `CLIENT_MEETING`
  - append manual note
  - append final transcript
  - generate deterministic no-provider summary
  - read persisted summary on refresh/new context
  - show memory rail and safety posture
- Adopted the existing `/pre-visit/[planId]` AI meeting button into this slice.
- Added `scripts/meeting-workspace-ui-qa.mjs` and `pnpm meeting:workspace-ui-qa`.
- Updated AMM workstream status in `AGENTS.md` and `PLN-023`.
- Updated `asai.meeting.prototype` AgentFacts-style manifest to `2026-06-21.amm-005a`, still `internal-only`.

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `node --check scripts/meeting-workspace-ui-qa.mjs`
- PASS targeted ESLint on AMM changed source files
- PASS `pnpm ai:bff-audit`
  - `overall=pass`, `routeCount=27`, no route gaps.
- PASS `pnpm ai:protocol-registry-qa`
  - 11 manifests remain `internal-only`; no external publication claimed.
- PASS `pnpm meeting:workspace-ui-qa`
  - member creates QA client and visit
  - desktop enters meeting from `/pre-visit/[planId]` button
  - creates session without advisor raw-ID input
  - appends manual note via BFF
  - appends final transcript via BFF
  - generates deterministic summary
  - desktop/mobile console error 0
  - desktop/mobile no horizontal overflow
  - new browser context reads existing meeting session and summary
  - same-page refresh preserves summary
  - manager cannot read member-private session or summary
  - owner reads summary through GET route
  - raw provider/audio sentinel payload blocked with 409 and not echoed
  - no-provider `AiUsageLog` unchanged: `150->150`

## Evidence

- Screenshots:
  - `docs/06_audits-and-reports/screenshots/ai-meeting/amm-005a-workspace/amm-005a-meeting-desktop.png`
  - `docs/06_audits-and-reports/screenshots/ai-meeting/amm-005a-workspace/amm-005a-meeting-mobile.png`
- Reusable command: `pnpm meeting:workspace-ui-qa`
- State updates:
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `docs/2_agent-input/generated/agent-loop/issue-question.md`

## DB/Prisma

- Prisma schema/generate/db push: not run, not needed.
- Runtime QA performed non-destructive development test writes through existing APIs:
  - demo/test client
  - demo/test visit plan
  - `CLIENT_MEETING` session
  - meeting turns/memories
  - deterministic `InterviewMeetingSummary`
- No provider call was attempted; no `AiUsageLog` row was written.

## NANDA Alignment

- Updated internal manifest for `asai.meeting.prototype`.
- Added the accepted UI entrypoint owner refs:
  - `src/app/(dashboard)/pre-visit/[planId]/meeting/page.tsx`
  - `src/components/meeting/meeting-workspace.tsx`
  - `scripts/meeting-workspace-ui-qa.mjs`
- Added GET/POST summary interface posture while keeping provider posture deterministic-no-provider.
- Registry readiness remains `internal-only`; no external NANDA/third-party publication, public discovery, signing, or cross-org access was enabled.

## Git

- Push: `push skipped by user instruction`.
- Commit: created locally after this report is staged.
- Unrelated pre-existing dirty/untracked files were intentionally not staged.

## Blockers

- AMM-004 cross-meeting memory/chat is not implemented yet.
- AMM-003b live provider JSON summary with success/error `AiUsageLog` is not implemented yet.
- Notes UI/domain prototype remains unaccepted unless a later AMM/PIM slice explicitly adopts and validates it.
- Dashboard/CRM global meeting entrypoints beyond `/pre-visit/[planId]` are not complete.
- AMM-006 action item / CRM writeback candidate boundary remains future work.

## Next Recommended Loop

Run `AMM-004a cross-meeting client memory/chat`: add the first meeting/client memory chat BFF contract grounded in current meeting turns, persisted meeting summaries, and prior client memories. Keep facts/inferences/unknowns and citations explicit; enforce member ownership; block raw provider/audio/private sentinel payloads; prove owner success, manager/foreign denial, refresh/new-context readback, no raw transcript/provider/contact/policy leakage, and either unchanged `AiUsageLog` for no-provider or success/error `AiUsageLog` for provider-backed calls.

push skipped by user instruction
