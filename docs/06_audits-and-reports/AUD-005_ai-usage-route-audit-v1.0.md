# 誠問 AI AI / BFF Route Audit v1.1

> 建立日期：2026-06-19
> 更新日期：2026-06-20
> 對應 batch：`BFF-201` AI BFF audit gate
> 範圍：盤點 repo 內所有 `/api/ai/*` 與 `/api/rag` route 是否被 audit manifest 覆蓋，並檢查 session/token scope、capability/quota guard、provider success/error `AiUsageLog`、input limit 與 no-provider / guarded-disabled proof。本文不包含 production provider payload、request body、raw error、cookie 或 secret。

---

## 1. 結論

本輪將 `pnpm ai:usage-audit` 擴充為 full AI namespace audit gate，並新增等價 alias：

```bash
pnpm ai:bff-audit
```

Audit gate 會自動掃描：

- `src/app/api/ai/**/route.ts`
- `src/app/api/rag/**/route.ts`

若新增 route 但未登錄 manifest，或 route 缺少必要 auth/quota/input/usage/no-provider evidence，指令會回 `overall=gaps_found` 並以 non-zero exit code 失敗。

2026-06-20 audit 結論：

- ✅ Route discovery pass：共 22 條 route，manifest 覆蓋 22/22，undocumented route = 0。
- ✅ Provider-ready pass：13 條 OpenAI-facing route 具備 `requireCurrentMember()`、`canUseAiModule()`、input limit、provider call evidence、success/error `AiUsageLog` evidence。
- ✅ No-provider / deterministic BFF pass：8 條 interview persistence/reflection/plan/writeback route 具備 session scope、input schema 或 GET-only boundary，且未偵測 OpenAI/Anthropic provider call；不需要假寫 `AiUsageLog`。
- ✅ Guarded-disabled pass：`/api/rag` 仍是 private beta disabled posture；有 `requireCurrentMember()`、`canUseAiModule()`、input validation、`RAG_DISABLED_FOR_PRIVATE_BETA`、`disabled_guarded` 與 `providerAttempted=false` evidence；disabled 時不呼叫 provider、不寫假 usage。
- ✅ Event mirror pass：`/api/ai/interview/realtime-events` 不打外部 provider，但會以 `AiProvider.MOCK` 寫 usage/event mirror evidence，並拒絕 raw audio / secret-bearing payload。

---

## 2. Coverage Summary

| category | count | route posture |
| --- | ---: | --- |
| provider-ready | 13 | 外部 OpenAI provider path；success/error 需寫 `AiUsageLog` |
| deterministic BFF / no external provider | 8 | DB-backed interview session、turn、reflection、plan、writeback；不假寫 usage |
| guarded disabled | 1 | `/api/rag` disabled private beta；不呼叫 provider、不寫假 usage |
| total | 22 | `/api/ai/*` + `/api/rag` |

Current-month DB aggregate proof（`pnpm ai:bff-audit`，2026-06-20）：

| module | provider | total | success | error | first_seen | last_seen |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `CHAT` | `OPENAI` | 37 | 34 | 3 | 2026-06-19 07:22:52.803 | 2026-06-19 11:21:49.356 |
| `INTERVIEW` | `OPENAI` | 73 | 70 | 3 | 2026-06-19 07:22:58.943 | 2026-06-19 11:44:10.158 |
| `THEATER` | `OPENAI` | 10 | 9 | 1 | 2026-06-19 07:23:05.099 | 2026-06-19 11:18:10.334 |
| `VISIT` | `OPENAI` | 16 | 13 | 3 | 2026-06-19 07:53:13.551 | 2026-06-19 16:47:00.862 |

> DB aggregate 只列 module/provider/count/time window，不輸出 raw provider payload、request body、raw transcript、cookie、secret 或 token。

---

## 3. Route Audit Matrix

| route | module | provider/posture | auth scope | quota/capability | input limit | usage evidence | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/ai/chat` | `CHAT` | `OPENAI` provider-ready | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ Zod max limits | ✅ success/error repository usage | Pass |
| `/api/ai/interview` | `INTERVIEW` | `OPENAI` provider-ready | ✅ | ✅ | ✅ Zod max limits | ✅ success/error repository usage | Pass |
| `/api/ai/interview/outputs` | `INTERVIEW` | `OPENAI` provider-ready | ✅ | ✅ | ✅ Zod schema | ✅ success/error repository usage | Pass |
| `/api/ai/interview/realtime-session` | `INTERVIEW` | `OPENAI` provider or dry-run | ✅ | ✅ | ✅ realtime session schema | ✅ success/error `writeAiUsageLogSafely` | Pass |
| `/api/ai/interview/realtime-events` | `INTERVIEW` | `MOCK` event mirror, no external provider | ✅ | ✅ | ✅ event schema + raw payload reject | ✅ `AiProvider.MOCK` usage/event mirror | Pass |
| `/api/ai/interview/sessions` | `INTERVIEW` | deterministic BFF | ✅ | N/A no provider | ✅ create session schema | N/A no provider | Pass |
| `/api/ai/interview/sessions/[sessionId]` | `INTERVIEW` | deterministic BFF GET | ✅ | N/A no provider | N/A GET-only | N/A no provider | Pass |
| `/api/ai/interview/sessions/[sessionId]/turns` | `INTERVIEW` | deterministic BFF | ✅ | N/A no provider | ✅ append turn schema | N/A no provider | Pass |
| `/api/ai/interview/sessions/[sessionId]/reflections` | `INTERVIEW` | deterministic BFF | ✅ | N/A no provider | ✅ reflection schema | N/A no provider | Pass |
| `/api/ai/interview/sessions/[sessionId]/reflections/generate` | `INTERVIEW` | deterministic BFF | ✅ | N/A no provider | ✅ deterministic generation schema | N/A no provider | Pass |
| `/api/ai/interview/sessions/[sessionId]/plans` | `INTERVIEW` | deterministic BFF | ✅ | N/A no provider | ✅ plan schema | N/A no provider | Pass |
| `/api/ai/interview/sessions/[sessionId]/writebacks` | `INTERVIEW` | deterministic BFF | ✅ | N/A no provider | ✅ writeback schema | N/A no provider | Pass |
| `/api/ai/interview/transcribe` | `INTERVIEW` | `OPENAI` audio transcription | ✅ | ✅ | ✅ `MAX_AUDIO_BYTES` / `MIN_AUDIO_BYTES` | ✅ success/error `writeAiUsageLogSafely` | Pass |
| `/api/ai/interview/transcribe-realtime-session` | `INTERVIEW` | `OPENAI` transcription secret | ✅ | ✅ | ✅ no body / session scoped | ✅ success/error `writeAiUsageLogSafely` | Pass |
| `/api/ai/report` | `REPORT` | `OPENAI` provider-ready | ✅ | ✅ | ✅ prompt/client schema | ✅ success/error repository usage | Pass |
| `/api/ai/spin` | `SPIN` | `OPENAI` provider-ready | ✅ | ✅ | ✅ SPIN phase/message limits | ✅ success/error repository usage | Pass |
| `/api/ai/spin-suggestions` | `SPIN` | `OPENAI` provider-ready | ✅ | ✅ | ✅ SPIN suggestion schema | ✅ success/error repository usage | Pass |
| `/api/ai/theater-build` | `THEATER` | `OPENAI` provider-ready | ✅ | ✅ | ✅ message/material limits | ✅ success/error theater build usage | Pass |
| `/api/ai/theater` | `THEATER` | `OPENAI` legacy provider-ready | ✅ | ✅ | ✅ legacy persona/message schema | ✅ success/error theater usage | Pass |
| `/api/ai/theater/score` | `THEATER` | `OPENAI` legacy score provider-ready | ✅ | ✅ | ✅ score schema | ✅ success/error theater usage | Pass |
| `/api/ai/visit` | `VISIT` | `OPENAI` provider-ready | ✅ | ✅ | ✅ visit request/output schemas | ✅ success/error repository usage | Pass |
| `/api/rag` | `RAG` | guarded-disabled private beta | ✅ | ✅ | ✅ query schema | N/A no provider while disabled | Pass |

---

## 4. Route Discovery Evidence

`pnpm ai:bff-audit` discovered and covered:

```text
/api/ai/chat
/api/ai/interview
/api/ai/interview/outputs
/api/ai/interview/realtime-events
/api/ai/interview/realtime-session
/api/ai/interview/sessions
/api/ai/interview/sessions/[sessionId]
/api/ai/interview/sessions/[sessionId]/plans
/api/ai/interview/sessions/[sessionId]/reflections
/api/ai/interview/sessions/[sessionId]/reflections/generate
/api/ai/interview/sessions/[sessionId]/turns
/api/ai/interview/sessions/[sessionId]/writebacks
/api/ai/interview/transcribe
/api/ai/interview/transcribe-realtime-session
/api/ai/report
/api/ai/spin
/api/ai/spin-suggestions
/api/ai/theater
/api/ai/theater-build
/api/ai/theater/score
/api/ai/visit
/api/rag
```

Result summary:

- Overall: `pass`
- Routes with gaps: `[]`
- Discovery gaps: `[]`
- DB aggregate status: `pass`

---

## 5. Required Follow-ups Before Public Beta

1. Keep `/api/rag` disabled for private beta unless/until formal RAG provider/vector path is implemented with success/error `AiUsageLog`.
2. Run `pnpm ai:bff-audit` before BFF-202/203/204/205 changes and after any new `/api/ai/*` route is added.
3. BFF-202 should still add targeted API proof for `/api/ai/visit` and `/api/ai/report` success/provider-error paths, even though audit evidence is green.
4. BFF-203 should treat SPIN mock outline/local session source as a separate source blocker; current audit only proves provider route scope/usage/input guard, not the whole SPIN UI source model.
5. BFF-204 should keep legacy Theater enum/scoring untouched unless an approved ITA Route B card is active.

---

## 6. Evidence Commands

```bash
pnpm ai:bff-audit
pnpm ai:usage-audit
```

Both commands run the same audit gate.

Additional RAG disabled proof remains:

```bash
DEMO_QA_BASE_URL=http://localhost:3000 pnpm rag:launch-posture-qa
```

Expected RAG posture while disabled:

- Unauthenticated `/api/rag`: `401`.
- Authenticated invalid question: `400 INVALID_RAG_INPUT`.
- Authenticated valid question: `503 RAG_DISABLED_FOR_PRIVATE_BETA`, `launchPosture=disabled_guarded`, `providerAttempted=false`.
- DB `AiUsageLog(module=RAG)` count unchanged while disabled.
