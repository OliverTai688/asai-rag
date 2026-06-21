# 2026-06-21 LV3 AMM-003a Meeting Summary Persistence Loop

## Scope
- Loop type: normal LV3 implementation/proof loop, not fifth-loop whole-product review (`normalLoopsSinceLastWholeProductReview` was 3).
- Selected slice: `AMM-003a deterministic/no-provider meeting summary persistence route`.
- Goal: convert captured `CLIENT_MEETING` turns/memories into a persisted cited `InterviewMeetingSummary` without provider calls, while keeping AMM-003b provider JSON mode separate.
- Push policy: push skipped by user instruction.

## Last-two Classification
- Previous loop: `AMM-002a`, L2 source/DB/API proof for meeting capture BFF.
- Loop before that: `AMM-001b`, L2 source/schema/proof for meeting persistence contract.
- Anti-repetition rationale: this loop is not docs-only or proof-plan-only; it adds a runtime API route, repository persistence helper, executable API/DB QA, route audit coverage, and manifest coverage.

## Candidate Score
| Candidate | Score | Reason |
| --- | ---: | --- |
| AMM-003a meeting summary persistence route | 94 | Direct next AMM slice; connects meeting capture -> cited summary -> future memory/chat/writeback; source/API/DB/QA-backed; no provider risk. |
| AMM-003b provider JSON summary | 87 | High value and user-approved provider proof is possible, but safer after deterministic persistence/overwrite/citation proof. |
| AMM-004 cross-meeting memory/chat | 82 | Strong immersive value, but depends on persisted summaries and citation boundary established by AMM-003a. |

## Changes
- Added `POST /api/ai/meeting/sessions/[sessionId]/summary`.
- Added `generateMeetingSummaryForMember()` and DTO/safety helpers in `meeting-summary-repository`.
- Added `pnpm meeting:summary-bff-qa`.
- Updated AI route audit manifest and internal AgentFacts-style manifest for `asai.meeting.prototype`.
- Updated AMM workstream notes in tracked `AGENTS.md`, `loop-state.json`, and `issue-question.md`.

## Validation
- PASS `node --check scripts/meeting-summary-bff-qa.mjs`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `DEMO_QA_BASE_URL=http://localhost:3058 pnpm meeting:summary-bff-qa`
  - unauth summary 401
  - empty meeting source 409
  - owner summary create 201
  - raw provider-like summary payload 409 and no summary row
  - citations only use stored source turns
  - `overwrite=false` 409, `overwrite=true` 200
  - manager summary 404
  - DB row: one `InterviewMeetingSummary`, provider/model/usageLogId null, citations/sourceTurnIds persisted, guardEvidence providerCallAttempted=false and writesConfirmedCrmFact=false
  - no-provider proof: `AiUsageLog` unchanged `150 -> 150`
- PASS `pnpm ai:bff-audit`
  - `overall=pass`, `routeCount=27`, `/api/ai/meeting/sessions/[sessionId]/summary` covered as deterministic no-provider route.
- PASS `pnpm ai:protocol-registry-qa`
  - 11 internal-only manifests; `asai.meeting.prototype` includes summary endpoint and remains internal-only.

## DB / Prisma
- No Prisma schema change, no `prisma:validate`, no `prisma:generate`, no `prisma db push`.
- Runtime proof performed non-destructive development DB writes via API: demo/test client, visit plan, meeting sessions/turns, and one `InterviewMeetingSummary` row.
- No production write, destructive DB operation, remote deletion, payment, email, notification, or provider call.

## Evidence
- Source/API:
  - `src/app/api/ai/meeting/sessions/[sessionId]/summary/route.ts`
  - `src/lib/interview/meeting-summary-repository.ts`
  - `scripts/meeting-summary-bff-qa.mjs`
- Static proof:
  - `pnpm ai:bff-audit`
  - `pnpm ai:protocol-registry-qa`
- Runtime proof:
  - `DEMO_QA_BASE_URL=http://localhost:3058 pnpm meeting:summary-bff-qa`

## NANDA Alignment
- Agent/module id: `asai.meeting.prototype`, owner surface `AI Meeting / visit notes capture`.
- Capability touched: deterministic cited meeting summary persistence.
- Endpoint/action touched: `POST /api/ai/meeting/sessions/[sessionId]/summary`, `persist-deterministic-meeting-summary`.
- DTO boundary: `GenerateMeetingSummaryInput`, `GenerateMeetingSummaryResult`, `PersistedMeetingSummaryDto`, `MeetingSummary`, `MeetingCitation`, `InterviewMeetingSummary`.
- Auth/data classes: app member owner scope; member-private transcript/summary/citation data.
- Quota/cost/AiUsageLog: no provider call, quota not required, `AiUsageLog` not required and unchanged proof recorded.
- Registry readiness: `internal-only`.
- External publication/signing/public discovery/cross-org access remains blocked by explicit operator approval.

## Git
- Commit: pending at report creation time.
- Push: skipped by user instruction.

## Blockers
- Source: AMM-003b provider JSON-mode summary, quota 429, and success/error `AiUsageLog` proof remain open.
- Source: AMM-004 cross-meeting memory/chat and AMM-006 writeback boundaries remain future slices.
- Operator/environment: live provider proof requires configured provider env and usage/cost evidence.
- Production approval: production migration/rollback and any real provider/payment/email/notification enablement remain approval-gated.

## Next Recommended Loop
Cadence is now 4, so run the scheduled whole-product review prompt next. After the review, likely candidates are AMM-003b provider JSON-mode summary with success/error `AiUsageLog`, AMM-004 cross-meeting memory/chat, or BFF-402 billing notification/query/idempotency depending on scoring.

push skipped by user instruction
