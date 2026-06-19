# 誠問 AI AI Usage Route Audit v1.0

> 建立日期：2026-06-19
> 對應 batch：`LCH-009` Production Controls And Release QA
> 範圍：盤點 repo 內 OpenAI/Anthropic-facing route 是否具備 session guard、quota guard、success/error `AiUsageLog` evidence。本文不包含 production provider payload、request body、raw error、cookie 或 secret。

---

## 1. 結論

本輪新增 `pnpm ai:usage-audit`，以 route manifest + source check + current-month DB aggregate 產出可重跑 evidence。

Audit 結論：

- ✅ Production-minimum pass：`/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs`、`/api/ai/theater`、`/api/ai/theater/score`、`/api/ai/spin`、`/api/ai/spin-suggestions`、`/api/ai/visit`、`/api/ai/report`。
- ✅ Guarded disabled pass：`/api/rag` 已改為 private beta disabled posture，具備 `requireCurrentMember()`、`canUseAiModule()` 與 deterministic `503 RAG_DISABLED_FOR_PRIVATE_BETA`；disabled 時不呼叫 provider、不寫假 `AiUsageLog`。
- ⚠️ `/api/rag` 不是 provider-ready RAG feature；若要 public launch，仍需正式 vector/provider path 與 success/error `AiUsageLog` 實作。

Current-month DB aggregate proof（`pnpm ai:usage-audit`，2026-06-19）：

| module | provider | total | success | error | first_seen | last_seen |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `INTERVIEW` | `OPENAI` | 2 | 2 | 0 | 2026-06-18 19:50:06.56 | 2026-06-18 19:50:41.506 |
| `REPORT` | `OPENAI` | 3 | 3 | 0 | 2026-06-19 01:42:54.405 | 2026-06-19 01:59:15.19 |
| `SPIN` | `OPENAI` | 2 | 2 | 0 | 2026-06-19 01:59:18.643 | 2026-06-19 01:59:24.121 |
| `VISIT` | `OPENAI` | 3 | 3 | 0 | 2026-06-19 01:42:35.323 | 2026-06-19 01:59:10.891 |

> 註：DB aggregate 只列 module/provider/count/time window，不輸出 raw error、request id 或 private payload。CHAT/THEATER 的既有 proof 記錄在 `RPT-003` 與 `PLN-017`。

---

## 2. Route Audit Matrix

| route | module | provider | provider call | auth guard | quota guard | success usage evidence | error usage evidence | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/ai/chat` | `CHAT` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistAssistantChatSuccess` | ✅ `persistAssistantChatFailure` / `writeAiUsageLogSafely` | Pass |
| `/api/ai/interview` | `INTERVIEW` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistInterviewTurnSuccess` | ✅ `persistInterviewFailure` | Pass |
| `/api/ai/interview/outputs` | `INTERVIEW` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistInterviewOutputSuccess` | ✅ `persistInterviewFailure` | Pass |
| `/api/ai/theater` | `THEATER` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistTheaterCharacterSuccess` | ✅ `persistTheaterFailure` | Pass |
| `/api/ai/theater/score` | `THEATER` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistTheaterScoreSuccess` | ✅ `persistTheaterFailure` | Pass |
| `/api/ai/spin` | `SPIN` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistAiGenerationSuccess` | ✅ `persistAiGenerationFailure` | Pass |
| `/api/ai/spin-suggestions` | `SPIN` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistAiGenerationSuccess` | ✅ `persistAiGenerationFailure` | Pass |
| `/api/ai/visit` | `VISIT` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistAiGenerationSuccess` | ✅ `persistAiGenerationFailure` | Pass |
| `/api/ai/report` | `REPORT` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistAiGenerationSuccess` | ✅ `persistAiGenerationFailure` | Pass |
| `/api/rag` | `RAG` | `OPENAI` target | N/A disabled | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | N/A disabled | N/A disabled | Pass / `disabled_guarded` |

---

## 3. Required Fixes Before Public Beta

1. Keep `/api/rag` disabled for private beta unless/until formal RAG provider/vector path is implemented with success/error `AiUsageLog`.
2. Keep `/api/ai/spin`、`/api/ai/spin-suggestions`、`/api/ai/visit` and `/api/ai/report` in the release QA matrix because they now have session, quota, success/error usage logging and DB-backed client lookup.
3. After each route or launch-posture change, rerun:

```bash
pnpm ai:usage-audit
pnpm rag:launch-posture-qa
pnpm run lint:changed
pnpm exec tsc --noEmit --pretty false
pnpm prisma:validate
pnpm demo:preflight
pnpm demo:runtime-audit
```

---

## 4. Evidence Command

```bash
pnpm ai:usage-audit
```

Result summary:

- Overall: `pass`.
- Routes with gaps: none.
- DB aggregate status: `pass`.

Additional RAG disabled proof:

```bash
DEMO_QA_BASE_URL=http://localhost:3000 pnpm rag:launch-posture-qa
```

Result summary:

- Unauthenticated `/api/rag`: `401`.
- Authenticated invalid question: `400 INVALID_RAG_INPUT`.
- Authenticated valid question: `503 RAG_DISABLED_FOR_PRIVATE_BETA`, `launchPosture=disabled_guarded`, `providerAttempted=false`.
- DB `AiUsageLog(module=RAG)` count unchanged while disabled.
