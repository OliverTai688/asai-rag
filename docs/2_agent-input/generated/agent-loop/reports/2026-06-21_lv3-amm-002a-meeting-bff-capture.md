# 2026-06-21 LV3 AMM-002a Meeting BFF Capture Loop

## Scope
- Loop type: normal LV3 implementation/proof loop, not fifth-loop whole-product review (`normalLoopsSinceLastWholeProductReview` was 2).
- Selected slice: `AMM-002a member-scoped AI Meeting capture BFF`.
- Goal: move AI Meeting from schema/contract proof into actual source + DB + API proof without adopting the existing untracked meeting/notes UI prototype.
- Push policy: push skipped by user instruction.

## Candidate Score
| Candidate | Score | Reason |
| --- | ---: | --- |
| AMM-002a meeting sessions/turns BFF | 95 | Direct next slice from loop-state; connects visit/client scope -> meeting capture -> InterviewTurn/Memory persistence; avoids docs-only proof and enables AMM-003 summary. |
| AMM-003 summary route/provider | 86 | High product value, but needs persisted `CLIENT_MEETING` capture proof first to avoid provider work over an unproven runtime boundary. |
| BFF-402 billing notification/query/idempotency | 78 | Still release-hardening fallback, but less connected to the core immersive advisor workflow than meeting capture. |

## Changes
- Added `src/lib/interview/meeting-session-repository.ts` as the meeting-specific BFF wrapper over existing interview persistence.
- Added API routes:
  - `POST /api/ai/meeting/sessions`
  - `GET /api/ai/meeting/sessions/[sessionId]`
  - `POST /api/ai/meeting/sessions/[sessionId]/turns`
- Added raw audio/provider/secret/payment payload guard before schema parsing.
- Added `scripts/meeting-bff-qa.mjs` and `pnpm meeting:bff-qa`.
- Updated AI route audit and the internal AgentFacts-style manifest for `asai.meeting.prototype`.
- Updated `AGENTS.md`, `loop-state.json`, and `issue-question.md`.

## Validation
- PASS `pnpm exec prisma db push`
- PASS `pnpm ai:bff-audit`
  - `overall=pass`, `routeCount=26`, new meeting routes covered as deterministic no-provider BFF routes.
- PASS `pnpm ai:protocol-registry-qa`
  - `asai.meeting.prototype` remains `internal-only`, no external-ready/registered claim.
- PASS `node --check scripts/meeting-bff-qa.mjs`
- PASS `DEMO_QA_BASE_URL=http://localhost:3057 pnpm meeting:bff-qa`
  - unauth create 401
  - member client + visitPlan create 201
  - member `CLIENT_MEETING` create 201
  - text turn 201
  - final voice transcript turn 201 and persisted as `VOICE_TRANSCRIPT_FALLBACK`
  - raw audio/provider-like payload blocked 409 and creates no turn row
  - stateless owner readback 200 with persisted turns/memories
  - manager readback 404
  - DB proof: one owner-scoped `CLIENT_MEETING` session, visitPlan metadata, 2 turns, 2 memories, raw payload marker count 0
  - no-provider proof: `AiUsageLog` count unchanged `150 -> 150`

## DB / Prisma
- Ran additive `pnpm exec prisma db push` against the current `.env` development Supabase target.
- No `--accept-data-loss`, reset, deletion, or destructive operation was used.
- Production migration remains approval-gated.

## Evidence
- Source proof:
  - `src/lib/interview/meeting-session-repository.ts`
  - `src/app/api/ai/meeting/sessions/route.ts`
  - `src/app/api/ai/meeting/sessions/[sessionId]/route.ts`
  - `src/app/api/ai/meeting/sessions/[sessionId]/turns/route.ts`
- Runtime proof:
  - `pnpm meeting:bff-qa`
  - `pnpm ai:bff-audit`
  - `pnpm ai:protocol-registry-qa`
- No OpenAI/Anthropic provider call was made; therefore no `AiUsageLog` write was required, and the unchanged-count proof documents that no fake usage log was created.

## NANDA Alignment
- Updated `asai.meeting.prototype` with AMM-002a endpoints, actions, DTO refs, privacy boundary, owner-scoped auth, source owner refs, and proof commands.
- Registry readiness remains `internal-only`.
- External NANDA / third-party publication, signing, public discovery endpoint, and cross-org agent access remain disabled and require explicit operator approval.

## Git
- Commit: pending at report creation time.
- Push: skipped by user instruction.

## Blockers
- Meeting summary provider route and success/error `AiUsageLog` proof are not implemented yet.
- Meeting UI entrypoints remain existing untracked prototype files and were not adopted in this loop.
- Cross-meeting retrieval/chat and meeting writeback boundaries remain future AMM slices.
- Production migration / rollback plan remains approval-gated.

## Next Recommended Loop
Run `AMM-003a deterministic meeting summary persistence route`: implement `POST /api/ai/meeting/sessions/[sessionId]/summary` as a no-provider route that builds a cited summary skeleton from persisted meeting turns/memories, writes `InterviewMeetingSummary`, proves citation IDs, owner readback, overwrite/regenerate safety, no provider, no fake `AiUsageLog`, and no CRM confirmed fact write. Keep live provider summary generation as AMM-003b.
