# 2026-06-21 LV3 AMM-004a Meeting Memory Chat

## Scope

- Loop type: LV3 normal implementation/proof loop, L2 source/API/runtime proof.
- Selected slice: `AMM-004a deterministic cross-meeting client memory/chat`.
- Anti-repetition: previous completed slice was AMM-005a source/UI/API/browser proof, so this loop intentionally added source/API/runtime QA rather than another docs-only proof.

## Candidate Score

1. `AMM-004a cross-meeting client memory/chat` — 95/100. Connects meeting capture + summary + client memory into a usable advisor question-answer surface; owner-scoped and no-provider proofable now.
2. `AMM-003b provider JSON summary` — 88/100. Important for final AI value, but provider success/error logging adds higher risk; deterministic memory-chat creates safer grounding first.
3. `AMM-006a writeback boundary` — 84/100. High product leverage, but benefits from this loop's cited facts/inferences/unknowns answer contract.

## Changes

- Added deterministic no-provider memory-chat repository for current meeting, cross-session client memory, persisted meeting summaries, least-disclosure CRM client/family/policy/report metadata, citations, and safety flags.
- Added owner-scoped API routes:
  - `POST /api/ai/meeting/sessions/[sessionId]/chat`
  - `POST /api/ai/clients/[clientId]/memory-chat`
- Extended interview memory retrieval to support same-client cross-session `FACT` / `CONFIRMED` / `INFERENCE` / `UNKNOWN` memories.
- Updated `asai.meeting.prototype` AgentFacts-style manifest with memory-chat capability, endpoints, DTOs, evidence refs, and proof command.
- Added `pnpm meeting:memory-chat-qa` runtime API proof and updated AI BFF audit coverage.
- Updated AMM checklists, loop state, and issue-question handoff.

## Validation

- PASS `node --check scripts/meeting-memory-chat-qa.mjs`
- PASS `pnpm meeting:memory-chat-qa`
- PASS final: `pnpm exec tsc --noEmit --pretty false`
- PASS final: `pnpm ai:bff-audit`
- PASS final: `pnpm ai:protocol-registry-qa`
- PASS final: `pnpm lint:changed`

## Evidence

- Runtime proof covered unauth 401, owner session/client memory-chat 200, prior meeting summary citation, current/client memory citation, CRM client/family/policy projection, facts/inferences/unknowns buckets, manager session 404, manager client 403, raw provider sentinel 409 without echo, no contact/policy/raw transcript/provider payload leakage, and no-provider `AiUsageLog` unchanged (`150->150`).
- No OpenAI/Anthropic provider call was attempted in this loop.

## DB/Prisma

- No Prisma schema change, no Prisma generate, no db push.
- Runtime proof used approved development/demo API writes to create identifiable test client, family member, policy, visit plan, meeting sessions, turns, and deterministic summary rows.
- No destructive DB operation, no production write, no email/notification/payment action.

## NANDA Alignment

- `asai.meeting.prototype` remains `internal-only`; no external registry publication, signing, public discovery endpoint, or cross-org access was attempted.
- Manifest now declares `meeting-client-memory-chat`, memory-chat endpoints/actions, DTO/evidence refs, no-provider proof command, least-disclosure policy, and remaining provider/pgvector/writeback gaps.

## Git

- Local commit required after validation.
- Push skipped by user instruction.

## Blockers

- Product/implementation blocker remaining: provider-backed memory-chat quota/error logging, AMM-003b live provider summary, AMM-006 writeback boundary, and pgvector retrieval are not complete.
- External registry publication remains unapproved.

## Next Recommended Loop

Run `AMM-006a meeting action-item / CRM writeback candidate boundary`: convert cited meeting summary and memory-chat facts/inferences/unknowns into confirmation cards, prove inference checked does not create CRM fact, confirmed checked can create CRM candidate/audit, unknown creates follow-up, high-sensitive missing approval blocks, and no-provider `AiUsageLog` remains unchanged.
