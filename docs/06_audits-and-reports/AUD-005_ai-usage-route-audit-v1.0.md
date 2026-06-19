# 誠問 AI AI Usage Route Audit v1.0

> 建立日期：2026-06-19
> 對應 batch：`LCH-009` Production Controls And Release QA
> 範圍：盤點 repo 內 OpenAI/Anthropic-facing route 是否具備 session guard、quota guard、success/error `AiUsageLog` evidence。本文不包含 production provider payload、request body、raw error、cookie 或 secret。

---

## 1. 結論

本輪新增 `pnpm ai:usage-audit`，以 route manifest + source check + current-month DB aggregate 產出可重跑 evidence。

Audit 結論：

- ✅ Production-minimum pass：`/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs`、`/api/ai/theater`、`/api/ai/theater/score`、`/api/ai/visit`、`/api/ai/report`。
- ⛔ 必須改造或下線後才可 public：`/api/ai/spin`、`/api/ai/spin-suggestions`。
- ⚠️ `/api/rag` 目前是 placeholder service，沒有 provider call；但 route 仍缺 member guard/quota，public beta 前應關閉、guard 或明確移出 AI provider audit 範圍。

Current-month DB aggregate proof（`pnpm ai:usage-audit`，2026-06-19）：

| module | provider | total | success | error | first_seen | last_seen |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `INTERVIEW` | `OPENAI` | 2 | 2 | 0 | 2026-06-18 19:50:06.56 | 2026-06-18 19:50:41.506 |
| `REPORT` | `OPENAI` | 2 | 2 | 0 | 2026-06-19 01:42:54.405 | 2026-06-19 01:44:04.187 |
| `VISIT` | `OPENAI` | 2 | 2 | 0 | 2026-06-19 01:42:35.323 | 2026-06-19 01:44:00.497 |

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
| `/api/ai/spin` | `SPIN` | `OPENAI` | ✅ | ❌ | ❌ | ❌ | ❌ | Gap |
| `/api/ai/spin-suggestions` | `SPIN` | `OPENAI` | ✅ | ❌ | ❌ | ❌ | ❌ | Gap |
| `/api/ai/visit` | `VISIT` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistAiGenerationSuccess` | ✅ `persistAiGenerationFailure` | Pass |
| `/api/ai/report` | `REPORT` | `OPENAI` | ✅ | ✅ `requireCurrentMember` | ✅ `canUseAiModule` | ✅ `persistAiGenerationSuccess` | ✅ `persistAiGenerationFailure` | Pass |
| `/api/rag` | `RAG` | `OPENAI` target | ❌ placeholder | ❌ | ❌ | ❌ | ❌ | Gap / placeholder |

---

## 3. Required Fixes Before Public Beta

1. Either retire legacy `/api/ai/spin` / `/api/ai/spin-suggestions` from public runtime or convert them to the same session/quota/usage contract used by `CHAT` and `INTERVIEW`.
2. Decide `/api/rag` launch posture: keep disabled/placeholder behind guard, or implement real provider/vector path with `AiUsageLog`.
3. Keep `/api/ai/visit` and `/api/ai/report` in the release QA matrix because they now have session, quota, success/error usage logging and DB-backed client lookup.
4. After each conversion, rerun:

```bash
pnpm ai:usage-audit
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

- Overall: `gaps_found`.
- Routes with gaps: `/api/ai/spin`, `/api/ai/spin-suggestions`, `/api/rag`.
- DB aggregate status: `pass`.
