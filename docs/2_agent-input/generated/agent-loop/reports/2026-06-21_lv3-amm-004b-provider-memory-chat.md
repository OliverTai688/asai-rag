# 2026-06-21 LV3 Loop - AMM-004b Provider Memory-chat

## Scope

- Loop type: normal LV3 implementation/proof loop, not fifth-loop whole-product review.
- Task level: L2 source/API/DB/provider proof.
- Selected slice: `AMM-004b provider-backed meeting/client memory-chat`.
- Goal: make AI Meeting memory-chat answer from owner-scoped meeting/CRM memory through a live guarded provider path, with success/error `AiUsageLog`, quota/disabled guards, least-disclosure citations, and deterministic fallback preserved.
- User preference applied: avoid docs-only proof. This loop changed source routes/repository/provider helper/QA and used docs only for status/report synchronization.

## Strategic Review Gate

- Current product target: client/visit/meeting memory must become usable context for advisor preparation and immersive follow-up, not remain a raw-ID backend proof.
- Recent loops: AMM visible workspace, meeting writeback, and provider summary work already moved AI Meeting from prototype to source/API/UI proof.
- Bottleneck before this loop: memory-chat still had only deterministic no-provider proof; provider answer quality, cost logging, and guarded failure behavior were not proven.
- Why this is not repeat work: last two loops were source/UI/API/DB/browser proof; this loop is a new provider-backed API/DB proof slice and closes a different acceptance gap.

## Candidate Score

1. `AMM-004b provider-backed meeting/client memory-chat` - 97/100. It was the next recommended slice, connects meeting memory + CRM memory + provider answer quality, closes `AiUsageLog` success/error + 429/503 guard evidence, and is source/API/DB proof rather than docs-only proof.
2. `AMM-008 cross-state AMM proof pack` - 89/100. High whole-flow value, but it depends on provider memory-chat being complete first.
3. `/pre-visit/[planId]/notes` + `postVisitNotes` compatibility - 84/100. Useful UX/source slice, but less critical than closing provider usage/logging for AI Meeting intelligence.

## Changes

- Added shared provider helper `src/lib/interview/meeting-memory-chat-provider.ts`.
- Expanded `src/lib/interview/meeting-memory-chat-repository.ts` with provider mode schema, reusable preparation helpers, cited grounding, provider safety metadata, success persistence, and error logging.
- Updated session and client memory-chat API routes to support `mode: "PROVIDER_JSON"` while preserving deterministic no-provider fallback.
- Added `scripts/meeting-memory-chat-provider-qa.mjs` and `pnpm meeting:memory-chat-provider-qa`.
- Updated `scripts/ai-usage-route-audit.mjs` so memory-chat routes are audited as provider-ready through support files.
- Updated `src/domains/ai-protocol/manifest.ts` with internal-only provider-ready AMM memory-chat evidence.
- Updated `AGENTS.md`, `PLN-023`, `loop-state.json`, and `issue-question.md`.

## Validation

- PASS `node --check scripts/meeting-memory-chat-provider-qa.mjs`
- PASS `node --check scripts/ai-usage-route-audit.mjs`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm meeting:memory-chat-provider-qa`
- PASS `pnpm meeting:memory-chat-qa`
- PASS `pnpm ai:bff-audit`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm lint:changed`
  - Note: `lint:changed` scanned 234 branch-level changed files against `origin/main`, including historical files outside this loop, and passed.
- PASS `git diff --check`
- PASS `loop-state.json` JSON parse.

## Evidence

`pnpm meeting:memory-chat-provider-qa` proved:

- 401 unauthenticated guard.
- Demo/test client, family member, policy, visit, prior/current meeting sessions, turns, and prior summary setup.
- Raw provider-like payload is rejected with 409 and does not echo payload.
- Provider-disabled guard returns 503 with no provider attempt.
- Quota guard returns 429 with no provider attempt and no fake `AiUsageLog`.
- Forced provider error returns 502 and writes an error `AiUsageLog`.
- Session provider memory-chat returns 200 with provider/model/usageLogId, facts/inferences/unknowns, cited prior summary context, no CRM fact write, and no raw/private leakage.
- Client provider memory-chat returns 200 with CRM projection, usageLogId, and no leakage.
- Manager session is denied with 404, manager client access with 403, and no new provider log.
- DB proof: `{"total":2,"openAiMeetingSuccess":2,"sessionTraceCount":1,"clientScopeCount":2}` for success logs in the QA trace.

`pnpm meeting:memory-chat-qa` proved:

- Deterministic fallback remains intact.
- No-provider path keeps `AiUsageLog` unchanged (`156->156` in the QA run).

`pnpm ai:bff-audit` proved:

- `overall: pass`.
- `routeCount: 30`.
- `providerReadyRouteCount: 16`.
- Memory-chat routes are now `provider_ready/pass`.

`pnpm ai:protocol-registry-qa` proved:

- Internal manifest remains valid.
- No module is claimed as `external-ready` or `external-registered`.

## DB / Prisma / Provider

- DB writes: yes, non-destructive demo/test QA writes for client, family member, policy, visit, meeting sessions, meeting turns, deterministic prior summary, memory-chat outputs, and `AiUsageLog` success/error proof.
- Prisma schema change: none.
- Prisma generate/db push: none.
- Provider calls: yes, guarded OpenAI `gpt-4o-mini` memory-chat calls in QA.
- Provider logging: success and forced-error paths write `AiUsageLog`; 429/503 guards do not fake provider logs.
- Raw storage guard: no raw provider payload, raw transcript, cookie, token, secret, OTP, or payment data stored by this slice.

## NANDA Alignment

- Module updated: `asai.meeting.prototype`.
- AgentFacts-style fields touched: capabilities, memory-chat endpoints/actions, provider readiness evidence, privacy/retention notes, quota/cost evidence, `AiUsageLog` policy, version, and proof references.
- Registry readiness remains `internal-only`; external NANDA/third-party publication, public discovery endpoint, signing, or cross-org access were not performed.
- Protocol boundary: provider helper sits behind route/repository DTOs and keeps least-disclosure cited snippets rather than provider-shaped raw payloads.
- Remaining registry gap: AMM still needs cross-state proof pack, stronger writeback confirmation UX, and explicit operator approval before any external registry/export posture changes.

## Git

- Current branch: `codex/asai-lv3-automation`.
- Stage only this loop's AMM-004b files.
- Local commit required after validation.
- Push skipped by user instruction.
- Pre-existing unrelated dirty/untracked docs/sidebar/notes prototype files are intentionally not staged.

## Remaining Blockers

- Source/proof gap: AMM-008 cross-state proof pack is next; AMM memory-chat still needs whole-flow proof from visible workspace into preparation/theater usage.
- Product decision gap: cross-member same-client memory sharing remains default member-private until explicitly decided.
- Operator/environment gap: production migration/rollback, staging role matrix, pgvector memory scale, live voice/WebRTC, and external registry/public discovery remain approval-gated.
- Production approval gap: no production write, real email/notification, real payment/refund, destructive DB, or remote deletion performed.

## Next Recommended Loop

Run `AMM-008 cross-state AMM proof pack`.

Suggested prompt:

```text
執行 AMM-008 cross-state AMM proof pack。串接目前 AI Meeting workspace、meeting summary、meeting writeback、provider memory-chat 與 no-provider fallback，建立一個可重跑的 targeted QA/browser/API proof：advisor 從 pre-visit/client context 建立 meeting、寫入 turns、生成 cited summary、用 provider memory-chat 讀取 prior/current memory、確認 no raw/private leakage、確認 success/error AiUsageLog、確認 manager/foreign denial、確認 deterministic fallback no-provider usage log unchanged。不得做 docs-only proof；若遇 provider/env blocker，改做 guarded-disabled/error contract proof 並保留 source/API/DB evidence。完成後跑 tsc、lint:changed、targeted QA，stage only related files，commit locally，push skipped by user instruction。
```

push skipped by user instruction
