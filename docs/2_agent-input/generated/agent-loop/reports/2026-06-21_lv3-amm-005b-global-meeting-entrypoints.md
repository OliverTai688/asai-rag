# 2026-06-21 LV3 AMM-005b Global Meeting Entrypoints

## Scope
- Loop type: normal LV3 implementation/proof loop, cadence 1 -> 2.
- Selected slice: `AMM-005b dashboard + CRM global meeting entrypoints`.
- This loop intentionally avoided docs-only proof by changing source UI/routes, AMM workspace contract, QA automation, AgentFacts manifest, and browser/API/DB proof.

## Candidate Score
1. `AMM-005b dashboard + CRM global meeting entrypoints` - 96/100. It connects dashboard/CRM/pre-visit surfaces to the same accepted meeting workspace and removes raw-ID navigation friction.
2. `AMM-004b provider-backed memory-chat` - 90/100. High-value provider maturity, but global entrypoints were needed first so advisors can reliably reach the meeting workspace.
3. `AMM-008 cross-state AMM proof pack` - 86/100. Useful release evidence, but it depends on completing the main entrypoint surface.

## Changes
- `MeetingWorkspace` now supports either `planId` or `clientId`, with context-aware labels and BFF payloads.
- Added `/crm/[clientId]/meeting` so CRM client detail can open a client-scoped meeting workspace without a visit plan.
- Added dashboard `最近會議` entrypoint and CRM detail `AI 會議工作台` entrypoint.
- Added `scripts/meeting-global-entrypoints-qa.mjs` and `pnpm meeting:global-entrypoints-qa`.
- Updated `asai.meeting.prototype` AgentFacts-style manifest to version `2026-06-21.amm-005b`.
- Updated AMM workstream docs, loop state, issue-question handoff, and this report.

## Validation
- PASS `node --check scripts/meeting-global-entrypoints-qa.mjs`.
- PASS `pnpm meeting:global-entrypoints-qa`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm ai:bff-audit`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm lint:changed`.
- PASS `git diff --check`.
- PASS `loop-state json ok`.

## Evidence
- `pnpm meeting:global-entrypoints-qa` proved dashboard recent meeting entrypoint targets the seeded visit plan, opens workspace without raw ID workflow, creates/resumes session with `sessionId`, and survives refresh.
- The same proof validated CRM client detail opens `/crm/[clientId]/meeting`, creates a client-scoped `CLIENT_MEETING`, appends final transcript, generates deterministic summary, persists across reload/new browser context, and stores DB evidence with selected `client_id` and no `visitPlanId`.
- Browser proof covered dashboard desktop, CRM desktop, and CRM mobile with console error 0 and no horizontal overflow.
- API/privacy proof covered manager 404 for dashboard/CRM sessions, manager 404 creating foreign client meeting, raw provider payload guard 409/no sentinel echo, and no-provider `AiUsageLog` unchanged (`153->153`).
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/ai-meeting/amm-005b-global-entrypoints/amm-005b-dashboard-meeting-desktop.png`
  - `docs/06_audits-and-reports/screenshots/ai-meeting/amm-005b-global-entrypoints/amm-005b-crm-meeting-desktop.png`
  - `docs/06_audits-and-reports/screenshots/ai-meeting/amm-005b-global-entrypoints/amm-005b-crm-meeting-mobile.png`

## DB / Prisma
- No Prisma schema changes.
- No Prisma generate/validate/db push.
- Development/demo DB proof performed additive, identifiable AMM-005b test writes only: QA client, visit plan, `CLIENT_MEETING` sessions/turns/summary.
- No production write, destructive DB operation, raw audio, raw private transcript, raw provider payload, real email/notification/payment, or external registry publication.

## NANDA Alignment
- `asai.meeting.prototype` remains `internal-only`.
- Manifest now declares global meeting entrypoint capability/action, owner refs, proof command, UI evidence refs, and least-disclosure posture.
- External NANDA / third-party registry publication, public discovery, signing, and cross-org access remain disabled pending explicit approval.

## Git
- Stage only this loop's files.
- Local commit required after validation.
- Push skipped by user instruction.
- Pre-existing unrelated dirty/untracked files remain intentionally unstaged.

## Blockers
- Source/product: provider-backed memory-chat (`AMM-004b`), AMM cross-state proof pack (`AMM-008`), `/pre-visit/[planId]/notes` plus `postVisitNotes` compatibility, pgvector retrieval.
- Operator/environment: live WebRTC permission proof, same-client cross-member meeting sharing decision.
- Approval: production migrations/rollback, external NANDA publication, destructive DB/remote deletion/refund/void remain gated.

## Next Recommended Loop
Run `AMM-004b provider-backed memory-chat`: add provider-backed meeting/client memory-chat with quota 429, provider-disabled 503, success/error `AiUsageLog`, no raw transcript/provider/contact leakage, and least-disclosure cited answer proof.

push skipped by user instruction
