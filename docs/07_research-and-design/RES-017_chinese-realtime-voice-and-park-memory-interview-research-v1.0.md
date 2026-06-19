# 誠問 AI 中文即時語音 × Park-style 訪談記憶架構研究 v1.0

> 建立日期：2026-06-19  
> 對應需求：使用者希望「可以用中文語音即時的方式跟 AI 對話」；訪談希望「參考 Park 設計的記憶架構來進行訪談連續對話」。  
> 對應 surface：`/interview`、未來 `AI 了解客戶` 主入口、可延伸到 `AI 劇場演練`。  
> 狀態：研究定稿；可作為後續 `ARC` / `PLN` / implementation batch 的依據。  
> 不做事項：本文件不直接導入 production Realtime API、不執行 production recording、不改 SPIN 狀態機、不改 Theater enum。

---

## 0. Executive Summary

建議把 `/interview` 從「文字串流訪談」升級成 **中文即時語音訪談工作台**，並把 Park et al. 2023 Generative Agents 的三段式記憶架構正式落進訪談 Agent：

1. **Memory Stream 記憶流**：每一句語音轉寫、CRM 事實、業務員確認、AI 推論、系統事件都成為可檢索的 memory event，帶有 `source`、`visibilityScope`、`dataClass`、`confidence`、`issueTags`、`importance`。
2. **Reflection 反思**：在段落切換、重要記憶累積、或使用者要求總結時，把記憶流合成「高階洞察」，但必須標成 `inference`，不可直接寫回客戶檔。
3. **Planning 規劃**：每一輪回應前，AI 先取回相關記憶、目前訪綱段落、Issue Readiness、PQ 缺口，生成「下一步訪談 micro-plan」，再用自然中文問下一題。

語音層建議採 **OpenAI Realtime API + WebRTC** 作為目標架構，因 browser speech-to-speech 場景官方建議優先從 Voice agents / Realtime + WebRTC 開始；WebSocket relay 可作為合規控制較高的第二階段。MVP 不建議只用 request-based STT → LLM → TTS，因為它很難達到「即時對話、可插話、自然打斷」的使用者期待。

---

## 1. Source Research

### 1.1 Park et al. Generative Agents

Park et al. 2023 的 Generative Agents 架構核心是：用自然語言保存完整經驗記錄、隨時間合成高階反思、再動態檢索記憶來規劃行為。論文指出 observation、planning、reflection 都會影響 believable behavior。  
來源：[arXiv: Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442)、[ACM DOI](https://dl.acm.org/doi/10.1145/3586183.3606763)。

對誠問 AI 的轉譯：

- 原論文中的「代理人在小鎮生活」改成「訪談 Agent 在一場顧問陪談中持續理解業務員、客戶、議題、關係與缺口」。
- Memory Stream 不只是聊天紀錄，而是**可被重新檢索、反思與規劃的素材庫**。
- Reflection 不應變成「客戶真實事實」，而應變成標記清楚的 `inference` / `hypothesis`。
- Planning 不應自由發散，而要受訪綱 A、Issue Readiness、PQ 題庫、合規規則、使用者已確認事實約束。

### 1.2 OpenAI Voice / Realtime Research

OpenAI 官方 Voice agents guide 建議先選語音架構，再把工具、handoff、guardrails 接到 agent workflow；若要 browser speech-to-speech，Realtime API with WebRTC 文件建議 browser/mobile client 優先用 WebRTC，而非 WebSocket，以取得更穩定的即時效能。  
來源：[OpenAI Voice agents guide](https://developers.openai.com/api/docs/guides/voice-agents)、[Realtime API with WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)。

OpenAI Realtime / audio docs 也區分：

- live transcript deltas：用 realtime transcription session。
- request-based upload / diarization：用 Speech to text。
- TTS 可 stream audio chunk，適合非全雙工 fallback。  
來源：[Realtime and audio](https://developers.openai.com/api/docs/guides/realtime)、[Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)、[Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech)。

對誠問 AI 的轉譯：

- 若目標是「像真人一樣中文即時對話」，首選 Realtime + WebRTC。
- 若目標是「可控、可稽核、先做穩」，可先做 push-to-talk + realtime transcription + text response + streaming TTS fallback。
- 無論哪種，`AiUsageLog`、quota、tenant scope、transcript privacy 必須由 server 端掌控。

### 1.3 Repo Existing Context

本 repo 已有：

- `/interview` 文字訪談工作台。
- `/api/ai/interview` 與 `/api/ai/interview/outputs` session-scoped production-minimum slice。
- `advisorCompanionOutline` 訪綱 A，具備段落、核心題、追問、產出 schema。
- `RES-010` 的 Issue Readiness Level / PQ 題庫。
- `ARC-004` 的訪談 × 劇場雙 Agent 決策。
- `AUD-004` 的 `fact` / `inference` / `unknown`、visibility scope、真實客戶資料邊界。
- legacy `/api/ai/spin` prompt 已提到 Park et al. 2023 的 Memory Stream，但尚未在 `/interview` 正式模型化。

---

## 2. Product Goal

使用者想要的不是「按一下錄音、等 AI 回覆」，而是：

- 可以直接用中文說話。
- AI 邊聽邊理解，必要時可插話、追問、確認。
- 業務員不用一直打字，能像跟一位顧問在陪談。
- AI 會記得前面說過的事，不重複問。
- AI 會把「已知事實」「推論」「待確認」分清楚。
- 訪談不是單次問答，而是一段連續、有記憶、有目的、有收斂的對話。

產品北極星：

> 「讓業務員用自然中文把腦中零散的客戶故事說出來；AI 用可追溯記憶流把故事整理成事實、推論、缺口與下一步。」

---

## 3. Target UX

### 3.1 `/interview` 語音模式第一版

建議新增一個 mode toggle：

```text
[文字訪談] [中文語音訪談 Beta]
```

語音模式畫面分四區：

1. **Live voice stage**
   - 麥克風狀態：未連線 / 聽取中 / AI 思考中 / AI 回覆中 / 已暫停。
   - 即時字幕：顯示 user transcript delta 與 AI transcript。
   - 可插話：AI 回覆中使用者開口時，前端送 interrupt / cancel event。

2. **Interview memory rail**
   - 已知事實。
   - 待確認。
   - AI 推論。
   - 本段訪綱進度。

3. **Next question / plan card**
   - AI 接下來為什麼問這題。
   - 對應訪綱段落、Issue、PQ。
   - 允許使用者按「跳過」「改問更白話」「先總結」。

4. **Confirmation card**
   - 訪談結束或段落結束時出現。
   - `fact` 可勾選寫回 CRM。
   - `inference` 只能保存為訪談洞察，不自動寫回客戶檔。
   - `unknown` 轉為下次拜訪追問清單。

### 3.2 中文語音互動規則

語音 Agent 必須具備中文對話禮貌與節奏：

- 用台灣繁體中文語氣，避免中國用語。
- 允許國台英混雜，例如「保單 review」「client」「房貸」。
- 不因口語斷句混亂而急著判定回答完成。
- 對長沉默使用柔和 nudging：「我先幫你整理一下，你剛剛提到三件事...」
- 對不確定轉寫要追問確認：「我剛剛聽到的是『房貸還有 20 年』，對嗎？」
- 不把轉寫錯誤直接寫入 memory fact。

### 3.3 語音 consent

第一次開啟語音模式前必須顯示明確說明：

- 系統會使用麥克風。
- 預設只保存文字 transcript 與 AI 結構化記憶，不保存原始音檔。
- 若未來要保存 audio recording，必須另有明確 consent。
- 訪談中可能涉及客戶資料；不得口述不必要的身分證、保單完整號碼、醫療細節。

---

## 4. Voice Architecture Options

### Option A - WebRTC Realtime Direct Client Session

```text
Browser /interview
  -> POST /api/ai/interview/realtime-session
       server checks requireCurrentMember()
       server checks canUseAiModule(INTERVIEW)
       server creates short-lived realtime session token
  -> Browser connects to OpenAI Realtime via WebRTC
  -> Realtime audio in/out + transcript events
  -> Browser sends transcript/memory events back to BFF
  -> BFF persists AiUsageLog / InteractionEvent / InterviewMemory
```

優點：

- 最接近「即時中文語音對話」。
- 低延遲、支援自然打斷、適合 browser/mobile。
- 前端可同步顯示 live transcript / AI speaking state。

風險：

- Usage accounting 與 transcript persistence 不可只靠 client，需 server side event sync。
- Ephemeral token 流程要小心，不能把 long-lived API key 下放到 browser。
- Realtime session lifecycle、disconnect、resume、quota close 要設計清楚。

適合：目標版本。

### Option B - Server WebSocket Relay

```text
Browser mic/audio
  -> WebSocket /api/ai/interview/realtime-relay
  -> Server relays to OpenAI Realtime
  -> Server observes all events, writes logs/memory
  -> Browser receives audio/transcript
```

優點：

- Server 可以完整控管 transcript、redaction、usage、audit、tool calls。
- 更容易做 enterprise compliance、recording policy、tenant-specific guardrails。

風險：

- 延遲與 infra 複雜度較高。
- WebSocket scaling / connection lifecycle 成本較高。

適合：Level 3 / enterprise hardening。

### Option C - Request-based STT -> LLM -> TTS

```text
Browser records one utterance
  -> /api/stt transcribe
  -> /api/ai/interview text response
  -> /api/tts audio stream
```

優點：

- 最容易落地。
- 最容易使用既有 `/api/ai/interview`。
- transcript 與 `AiUsageLog` 控制簡單。

風險：

- 體感不像即時對話。
- 打斷、半句修正、自然停頓處理很弱。
- 長訪談容易變成「錄音表單」而不是陪談。

適合：fallback / no-mic / poor network mode，不適合作為主方案。

### Recommendation

分階段：

1. **Phase V0 - Voice shell prototype**：先做 UI shell、mic permission、live transcript placeholder、manual push-to-talk，不接 production Realtime。
2. **Phase V1 - WebRTC Realtime Beta**：建立 ephemeral session route，Realtime speech-to-speech，保存 transcript memory，不存 raw audio。
3. **Phase V2 - Park memory engine**：把 transcript event 接入 memory stream / reflection / planning。
4. **Phase V3 - Compliance hardening**：server relay 或 event mirror、redaction、retention policy、operator audit。

---

## 5. Park-style Memory Architecture For Interview

### 5.1 Why Park-style memory is needed

現在 `/interview` 的訪談能力主要靠：

- 目前 messages。
- 訪綱段落。
- output generation prompt。

這會遇到問題：

- 長訪談中 AI 可能重複問已回答內容。
- AI 不容易知道「這是一個重要線索」還是「只是口語閒聊」。
- 生成準備卡時缺少可追溯的 evidence chain。
- 後續重開訪談，連續性不足。

Park-style memory 可以把每個訪談事件變成可檢索的經驗記錄，再由 reflection 與 planning 推動下一題。

### 5.2 Core objects

```ts
type InterviewMemoryKind =
  | "utterance"
  | "crm_fact"
  | "system_fact"
  | "confirmed_fact"
  | "inference"
  | "unknown"
  | "reflection"
  | "plan"
  | "correction";

type InterviewMemorySource =
  | "voice_transcript"
  | "text_input"
  | "crm"
  | "policy"
  | "family_graph"
  | "ai_reflection"
  | "user_confirmation"
  | "system";

interface InterviewMemory {
  id: string;
  organizationId: string;
  memberId: string;
  clientId?: string | null;
  interviewSessionId: string;
  turnId?: string | null;
  createdAt: string;

  kind: InterviewMemoryKind;
  source: InterviewMemorySource;
  dataClass: "fact" | "confirmed" | "inference" | "unknown" | "instruction";
  visibilityScope: "member_private" | "client_record_candidate" | "org_aggregate_only";

  text: string;
  evidenceText?: string;
  confidence: "low" | "medium" | "high";
  importance: 1 | 2 | 3 | 4 | 5;
  issueTags: string[];
  outlineSegmentId?: string;
  pqQuestionIds?: string[];

  embeddingStatus: "pending" | "ready" | "skipped";
  retentionPolicy: "session_only" | "member_workspace" | "client_candidate";
}
```

### 5.3 Memory Stream write rules

Every turn creates memory candidates:

| Event | Memory kind | Data class | Write rule |
| --- | --- | --- | --- |
| User speech transcript | `utterance` | `fact` or `unknown` | Save transcript after finalization; mark uncertain transcript as `unknown` |
| AI asks question | `plan` | `instruction` | Save concise reason for next question |
| CRM loaded fact | `crm_fact` | `fact` | Read-only memory, linked to source record |
| AI inference | `inference` | `inference` | Never write to CRM automatically |
| User correction | `correction` | `confirmed` | Supersede prior memory if applicable |
| Segment summary | `reflection` | `inference` | Save after segment boundary |
| Final confirmation | `confirmed_fact` | `confirmed` | Eligible for CRM writeback only after user approval |

### 5.4 Retrieval scoring

Park et al. retrieval is commonly understood as combining recency, importance, and relevance. For insurance interview we should adapt it as:

```text
score =
  relevance(query, memory.embedding) * 0.50
  + importance(memory.importance) * 0.25
  + recency(memory.createdAt) * 0.15
  + outlineMatch(currentSegment, memory.outlineSegmentId) * 0.10
```

Hard filters before scoring:

- Same `organizationId`.
- Current `memberId` or allowed client/team scope.
- Same `interviewSessionId`, plus selected prior confirmed client memories if client mode.
- Exclude `inference` from CRM writeback prompts unless explicitly requested.
- Exclude raw voice/audio; retrieve transcript and structured memory only.

### 5.5 Reflection

Reflection is a controlled summarization process:

Trigger conditions:

- Segment boundary.
- 5 or more high-importance memories accumulated.
- User asks「幫我整理一下」.
- Before generating output draft.

Reflection prompt should answer:

```text
1. 目前已確認的事實是什麼？
2. 目前只是推論或可能性的事是什麼？
3. 哪些待確認事項最阻礙下一步？
4. 對應哪些 Issue / PQ / SPIN hidden stage？
5. 下一段訪談應該先問哪一類問題？
```

Reflection output schema:

```ts
interface InterviewReflection {
  id: string;
  interviewSessionId: string;
  segmentId?: string;
  summary: string;
  confirmedFacts: string[];
  inferredPatterns: string[];
  unknowns: string[];
  recommendedNextFocus: string;
  supportingMemoryIds: string[];
}
```

Important: reflection is not truth. It is an interpretation layer.

### 5.6 Planning

Planning converts retrieved memory + reflection into next action:

```ts
interface InterviewMicroPlan {
  objective: string;
  nextQuestion: string;
  whyThisQuestion: string;
  outlineSegmentId: string;
  issueTags: string[];
  expectedEvidenceType: "fact" | "value" | "risk" | "decision" | "next_step";
  avoid: string[];
}
```

Planning rules:

- Do not ask for facts already confirmed.
- If user gave uncertain transcript, confirm before using it.
- If `Issue Readiness` below 3, ask clarifying questions, do not generate strategy.
- If a question touches high sensitivity, explain why and keep it optional.
- Prefer one clear Chinese question at a time.
- Avoid insurance jargon unless user uses it first.

### 5.7 Confirmation and CRM writeback

End of session or segment:

```text
AI: 我先把剛剛的內容分成三類，您看哪些可以留下來：

已確認事實：
[ ] 客戶是家庭主要收入來源
[ ] 太太會參與重大財務決策

AI 推論：
[ ] 客戶可能不是真的排斥保險，而是怕被推銷

待確認：
[ ] 房貸剩餘年期
[ ] 現有醫療險實際內容
```

Writeback policy:

- `confirmed_fact` + user checked -> eligible for CRM.
- `inference` + user checked -> save to interview insights, not CRM facts.
- `unknown` -> task / next visit question.
- Every writeback creates audit / interaction event.

---

## 6. Proposed Data Model

目前 repo 可先使用 `InteractionEvent` 做 minimum evidence，但要支援連續語音與 Park memory，建議後續新增 Prisma model：

```prisma
model InterviewSession {
  id             String   @id @default(cuid())
  organizationId String
  memberId       String
  clientId       String?
  mode           InterviewMode
  status         InterviewStatus
  outlineId      String
  currentSegment String?
  isVoiceEnabled Boolean  @default(false)
  startedAt      DateTime @default(now())
  endedAt        DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model InterviewTurn {
  id                 String   @id @default(cuid())
  organizationId     String
  interviewSessionId String
  role               InterviewTurnRole
  modality           InterviewModality
  transcript          String
  transcriptFinal     Boolean  @default(true)
  audioStored         Boolean  @default(false)
  createdAt           DateTime @default(now())
}

model InterviewMemory {
  id                 String   @id @default(cuid())
  organizationId     String
  interviewSessionId String
  turnId             String?
  kind               InterviewMemoryKind
  source             InterviewMemorySource
  dataClass          InterviewDataClass
  visibilityScope    InterviewVisibilityScope
  text               String
  evidenceText       String?
  confidence         InterviewConfidence
  importance         Int
  issueTags          String[]
  outlineSegmentId   String?
  embeddingStatus    InterviewEmbeddingStatus
  retentionPolicy    InterviewRetentionPolicy
  createdAt          DateTime @default(now())
}

model InterviewReflection {
  id                 String   @id @default(cuid())
  organizationId     String
  interviewSessionId String
  segmentId          String?
  summary            String
  confirmedFacts     Json
  inferredPatterns   Json
  unknowns           Json
  supportingMemoryIds String[]
  createdAt          DateTime @default(now())
}
```

Naming can be adjusted to repo conventions. The important part is the separation between turn transcript, memory event, reflection, and CRM writeback candidate.

---

## 7. API / BFF Design

### 7.1 Realtime session creation

```http
POST /api/ai/interview/realtime-session
```

Responsibilities:

- `requireCurrentMember()`.
- Validate `canUseAiModule(session, INTERVIEW)`.
- Create or resume `InterviewSession`.
- Mint short-lived OpenAI Realtime session token.
- Return client connection parameters only, never the server API key.
- Create initial `AiUsageLog` session marker or pending usage record if supported.

Response:

```json
{
  "interviewSessionId": "int_...",
  "clientSecret": "ephemeral...",
  "model": "realtime-model-name",
  "voice": "zh-TW-friendly-voice",
  "expiresAt": "2026-06-19T..."
}
```

### 7.2 Event mirror / persistence

```http
POST /api/ai/interview/realtime-events
```

Client sends selected non-secret events:

- final user transcript.
- final assistant transcript.
- interrupt event.
- segment transition.
- user confirmation.

Server:

- writes `InterviewTurn`.
- extracts memory candidates.
- writes `InterviewMemory`.
- writes `AiUsageLog` cost events when usage metadata is available.

### 7.3 Memory retrieval

```http
POST /api/ai/interview/memory/retrieve
```

Used by server or tool call:

- input: current utterance / segment / issue tags.
- output: scoped memory snippets with citations.

### 7.4 Reflection

```http
POST /api/ai/interview/reflections
```

Can be explicit button or automatic after segment boundary.

### 7.5 Output generation

Existing:

```http
POST /api/ai/interview/outputs
```

Should be upgraded to consume:

- raw turns.
- memory stream.
- latest reflections.
- confirmed writeback candidates.

---

## 8. Prompting Architecture

### 8.1 Realtime system prompt

The Realtime Agent should be instructed:

```text
你是誠問 AI 訪談 Agent。你正在用繁體中文與保險業務員語音陪談。

目標：
1. 用白話訪談業務員，協助他整理客戶輪廓與下一次對話準備。
2. 依訪綱段落順序主導，不跳段。
3. 每次只問一個清楚問題。
4. 先確認聽到的關鍵事實，再用於後續推論。
5. 嚴格區分：已確認事實、AI 推論、待確認。
6. 不提供保險、法律、稅務或投資建議；只協助準備訪談。
7. 若聽到敏感資料，提醒使用者只保留必要資訊。
8. 如果使用者插話，立刻停止長篇回覆，聽完再接續。
```

### 8.2 Memory tool prompt

When the agent needs memory:

```text
根據目前使用者這句話與訪綱段落，取回最相關的記憶。
只使用同 organization/member/session 可見的記憶。
不要把 inference 當作 confirmed fact。
```

### 8.3 Reflection prompt

```text
請根據 memory stream 產生本段反思。
輸出 JSON：
- confirmedFacts
- inferredPatterns
- unknowns
- issueReadinessImpact
- recommendedNextFocus
- supportingMemoryIds

所有 inferredPatterns 都必須用「可能」「看起來」「需要確認」語氣。
```

### 8.4 Planning prompt

```text
請根據訪綱目前段落、retrieved memories、latest reflection、Issue Readiness，決定下一個問題。

限制：
- 不重複已確認問題。
- 一次只問一題。
- 若 transcript 不確定，先確認轉寫。
- 若資料不足，只問追問，不生成策略。
- 用台灣繁體中文、自然口語、不要提 SPIN 名詞。
```

---

## 9. Chinese Voice Specific Risks

### 9.1 IME is not voice, but same input principle applies

剛修過的中文輸入法 Enter 問題提醒我們：中文輸入與英文不同，系統不能把「使用者按 Enter / 停頓」直接等同於「語意完成」。語音也一樣：

- 中文口語常有長停頓。
- 業務員可能邊想邊說：「嗯... 他太太其實...」
- 系統不能過早 endpoint。

Voice endpointing 必須可調：

- 短句確認問題可用短 endpoint。
- 故事敘述段落需長 endpoint。
- 使用者可按「我還沒說完」或設定 push-to-talk。

### 9.2 Transcription correction

需要 UI 支援：

- 點擊 transcript 修改。
- 修改後寫 `correction` memory。
- 被 correction supersede 的 memory 不再作 confirmed fact。

### 9.3 Taiwanese Mandarin vocabulary

需要 phrase hints / domain glossary：

- 保單、保額、保費、受益人、醫療險、失能、長照、房貸、教育金。
- 通訊處、業務員、陪訪、保單健檢。
- 人名常見誤聽需二次確認。

---

## 10. Compliance And Privacy

語音訪談比文字更敏感，因為它可能更自然地帶出 private data。

Required controls:

- Mic permission only after explicit user action.
- No raw audio persistence by default.
- Transcript retention visible to user.
- Sensitive-data warning when user begins saying unnecessary identifiers.
- Tenant scope and member scope enforced server-side.
- `AiUsageLog` required for every provider call.
- No production recording before legal/compliance approval.
- Client-facing output only includes confirmed and appropriate material.

Sensitive data classes:

| Data | Handling |
| --- | --- |
| Customer name | Allowed if already in CRM or user provides for interview context |
| Phone/email | Avoid voice repetition; do not send to reflection unless necessary |
| Policy number | Mask or avoid full number |
| Medical details | Minimize; tag as high sensitivity |
| Raw audio | Do not store by default |
| AI inference | Store as inference, not CRM fact |

---

## 11. Implementation Roadmap

### Batch VOI-001 - Voice UX Shell

- Add voice mode toggle to `/interview`.
- Add mic permission state and consent copy.
- Add live transcript panel.
- Add AI speaking/listening state.
- No production Realtime call yet; can use local mock state.
- Acceptance: browser proof desktop/mobile; no accidental recording.

### Batch VOI-002 - Realtime Session BFF

- Add `POST /api/ai/interview/realtime-session`.
- Require member session and quota guard.
- Return ephemeral realtime session token.
- Never expose server API key.
- Acceptance: unauth 401, quota 429, member 200; no secret printed.

### Batch VOI-003 - Realtime WebRTC Client

- Connect browser mic to Realtime via WebRTC.
- Show transcript deltas.
- Support interrupt / pause / resume.
- Fallback to text mode if unsupported.
- Acceptance: browser proof, console error 0, mobile permission state.

### Batch MEM-001 - Interview Memory Stream

- Add `InterviewMemory` domain types and repository.
- Persist final transcript turns as memory candidates.
- Separate `fact` / `inference` / `unknown`.
- Acceptance: API proof memory count increments; no raw audio.

### Batch MEM-002 - Retrieval + Reflection

- Add scoped retrieval function.
- Add reflection generation route.
- Store supporting memory IDs.
- Acceptance: reflection cites memory IDs and preserves inference labels.

### Batch MEM-003 - Planning Loop

- Before AI asks next question, retrieve memory and generate micro-plan.
- UI shows "why this question".
- Prevent repeated questions from confirmed facts.
- Acceptance: scripted multi-turn conversation where AI does not re-ask already confirmed fact.

### Batch MEM-004 - Confirmation Card / CRM Writeback

- End-session confirmation card.
- Confirmed facts can write to CRM.
- Inferences stay in interview insights.
- Unknowns become follow-up questions/tasks.
- Acceptance: writeback audit, no inference-to-fact leakage.

---

## 12. Acceptance Criteria

Voice:

- User can start Chinese voice interview from `/interview`.
- Browser asks mic permission only after explicit click.
- AI responds in spoken Traditional Chinese.
- Live transcript is visible and editable.
- User can interrupt AI.
- If Realtime unavailable, text fallback remains usable.
- No raw audio is stored by default.

Memory:

- Each finalized user utterance creates memory candidate.
- Memory has source, dataClass, confidence, importance, issueTags.
- Retrieval respects org/member/session scope.
- Reflection separates confirmed facts, inference, unknowns.
- Planning avoids repeated questions.
- Confirmation card controls CRM writeback.

Compliance:

- `AiUsageLog` exists for every OpenAI call.
- No secret/client token stored in repo or report.
- No raw cookie/token/private payload in logs.
- Sensitive voice transcript handling is documented.

---

## 13. Open Decisions

需要產品/技術決策：

1. **Raw audio retention**：建議 private beta 預設不存；若要存，需另做 legal consent。
2. **Realtime transport**：建議 V1 用 WebRTC direct ephemeral session；enterprise hardening 再做 server relay。
3. **Voice vendor**：建議先 OpenAI Realtime；若台灣中文聲音品質不足，再評估 Azure / ElevenLabs TTS fallback。
4. **Memory persistence**：最小版可用 `InteractionEvent`；正式版建議新 Prisma models。
5. **Embedding / vector retrieval**：先 lexical + metadata retrieval；pgvector 可作 V2。
6. **Transcript correction UX**：是否允許逐句編輯並重跑 reflection；建議要。
7. **CRM writeback policy**：confirmed facts 可寫回哪些 client fields，需要 per-field allowlist。

---

## 14. Recommended Next Step

建議下一輪不要直接「接語音 API」，而是先做：

1. 新增 `PLN-018_chinese-voice-interview-memory-batch-tasks-v1.0.md`。
2. 新增 `ARC-007_realtime-voice-and-interview-memory-architecture-v1.0.md`。
3. 第一張 implementation card 做 `/interview` voice mode shell + consent + transcript UI，不接 production voice。
4. 第二張 card 才做 Realtime session BFF 與 WebRTC prototype。
5. 第三張 card 開始 Park-style memory stream persistence。

這樣可以避免把 voice、memory、DB schema、Realtime token、安全與 UI 一次全部混在一起。

---

## 15. References

- Park, J. S. et al. 2023. Generative Agents: Interactive Simulacra of Human Behavior. [arXiv](https://arxiv.org/abs/2304.03442), [ACM DOI](https://dl.acm.org/doi/10.1145/3586183.3606763).
- OpenAI. [Voice agents guide](https://developers.openai.com/api/docs/guides/voice-agents).
- OpenAI. [Realtime API with WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc).
- OpenAI. [Realtime and audio](https://developers.openai.com/api/docs/guides/realtime).
- OpenAI. [Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text).
- OpenAI. [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech).
- Repo: `docs/02_architecture-and-rules/ARC-004_interview-theater-dual-agent-design-v1.1.md`.
- Repo: `docs/07_research-and-design/RES-003_theater-field-semi-structured-interview-guide.md`.
- Repo: `docs/07_research-and-design/RES-004_advisor-companion-semi-structured-interview-guide.md`.
- Repo: `docs/07_research-and-design/RES-010_issue-maturity-and-pq-construct-research-v1.0.md`.
- Repo: `docs/06_audits-and-reports/AUD-004_interview-theater-gate-readiness-audit-v1.0.md`.
