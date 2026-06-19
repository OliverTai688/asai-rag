# 誠問 AI Realtime Voice × Park-style Interview Memory Architecture v1.0

> 建立日期：2026-06-19  
> 狀態：架構定稿，可拆 batch 實作  
> 研究依據：`RES-017_chinese-realtime-voice-and-park-memory-interview-research-v1.0.md`  
> 既有架構依據：`ARC-004_interview-theater-dual-agent-design-v1.1.md`、`ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`  
> 對應計畫：`PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`  
> 範圍：兩個 AI 訪談運作架構，包含「顧問陪談訪綱 A」與「劇場場域建構訪綱 B」。  
> 不做事項：不取代 SPIN legacy 狀態機、不改 Theater Route B 已核可決策、不預設保存 raw audio、不把 AI inference 寫成 CRM fact。

---

## 0. Architecture Summary

本文件把 Park et al. 2023 Generative Agents 的 `Memory Stream -> Reflection -> Planning` 落成誠問 AI 兩個 AI 訪談的共用運作架構：

1. **顧問陪談訪談**：業務員用文字或中文語音描述客戶狀況，AI 逐段訪談，形成客戶輪廓、Issue Readiness、PQ 缺口與下一次對話準備卡。
2. **劇場場域建構訪談**：業務員用文字或中文語音補齊劇場場景，AI 逐段取得角色、關係、場域、異議與未確認資料，再交給 Theater Route B 建立多角色劇場。

兩者不再只是「messages + prompt」；每個回合會被轉成可檢索、可反思、可規劃的訪談記憶。

```text
文字輸入 / 中文語音 transcript
        |
        v
Interview Turn
        |
        v
Memory Candidate Extraction
        |
        v
Memory Stream
        |
        +--> Retrieval for current segment
        +--> Reflection at segment boundary
        +--> Planning before next question
        |
        v
Next Question / Confirmation / Output Draft / Theater Build Packet
```

核心原則：

- 每個 memory 都必須標明 `fact`、`confirmed`、`inference`、`unknown` 或 `instruction`。
- Reflection 是解釋層，不是真相層。
- Planning 只決定下一個訪談動作，不得繞過訪綱順序與合規規則。
- 語音只是一種輸入輸出 adapter；voice transcript 進入同一個 memory pipeline。
- 每次 OpenAI/Anthropic 呼叫都必須寫 `AiUsageLog`，包含錯誤路徑。

---

## 1. Relationship To Existing Architecture

### 1.1 Extends ARC-004, not replaces it

`ARC-004` 定義兩個 AI 訪談與劇場的產品型態：

- 訪綱 A：顧問陪談。
- 訪綱 B：劇場場域建構。
- 獨立模式與客戶資料模式。
- 訪談結束確認卡。
- Theater Route B 多角色、導演、群聊/私聊、五視角回饋。

本文件只補上「運作架構」：

- 訪談中每個事件如何被記成 memory。
- memory 如何被取回、反思、規劃下一題。
- 中文即時語音如何接進同一 pipeline。
- 兩個訪談如何產生不同 output packet。

### 1.2 Extends PLN-015, becomes PLN-018

`PLN-015` 仍是雙 Agent 大功能路線；`PLN-018` 是其中「即時語音 + Park-style 記憶」的可執行 implementation workstream。後續 Agent 應先看 `PLN-018`，再依需要回讀 `PLN-015`。

### 1.3 Hard boundaries

- 不手改 `src/generated/`。
- 不刪除或 optional 化 client/policy 合規欄位。
- 不破壞 legacy SPIN 狀態機。
- Theater schema 遷移仍只允許在 ITA/PIM 明確卡片中執行，且需 migration/rollback note。
- Org manager 不可讀 member 客戶明細、逐字稿、私聊內容或 raw transcript。
- Raw audio 預設不保存；若未來保存 audio，需要 legal/compliance consent 與 retention policy。

---

## 2. Shared Domain Model

### 2.1 Interview kinds

```ts
type InterviewKind =
  | "ADVISOR_COMPANION"       // 訪綱 A：顧問陪談
  | "THEATER_FIELD_BUILD";    // 訪綱 B：劇場場域建構

type InterviewMode =
  | "STANDALONE"
  | "CLIENT_BOUND";

type InterviewModality =
  | "TEXT"
  | "VOICE_REALTIME"
  | "VOICE_TRANSCRIPT_FALLBACK";
```

### 2.2 Memory event

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

type InterviewDataClass =
  | "fact"
  | "confirmed"
  | "inference"
  | "unknown"
  | "instruction";

type InterviewVisibilityScope =
  | "member_private"
  | "client_record_candidate"
  | "org_aggregate_only"
  | "theater_build_private";

interface InterviewMemory {
  id: string;
  organizationId: string;
  memberId: string;
  unitId?: string | null;
  clientId?: string | null;
  interviewSessionId: string;
  turnId?: string | null;
  interviewKind: InterviewKind;
  createdAt: string;

  kind: InterviewMemoryKind;
  source: InterviewMemorySource;
  dataClass: InterviewDataClass;
  visibilityScope: InterviewVisibilityScope;

  text: string;
  evidenceText?: string;
  confidence: "low" | "medium" | "high";
  importance: 1 | 2 | 3 | 4 | 5;
  issueTags: string[];
  outlineSegmentId?: string;
  pqQuestionIds?: string[];

  embeddingStatus: "pending" | "ready" | "skipped";
  retentionPolicy: "session_only" | "member_workspace" | "client_candidate" | "theater_build";
}
```

### 2.3 Reflection

```ts
interface InterviewReflection {
  id: string;
  organizationId: string;
  interviewSessionId: string;
  interviewKind: InterviewKind;
  segmentId?: string;
  summary: string;
  confirmedFacts: string[];
  inferredPatterns: string[];
  unknowns: string[];
  issueReadinessImpact?: string;
  theaterBuildImpact?: string;
  recommendedNextFocus: string;
  supportingMemoryIds: string[];
}
```

### 2.4 Micro-plan

```ts
interface InterviewMicroPlan {
  objective: string;
  nextQuestion: string;
  whyThisQuestion: string;
  outlineSegmentId: string;
  issueTags: string[];
  expectedEvidenceType: "fact" | "value" | "risk" | "decision" | "relationship" | "next_step";
  avoid: string[];
}
```

---

## 3. Runtime Flow A - Advisor Companion Interview

目標：把業務員的客戶故事整理成可用、可確認、可追蹤的訪談輸出。

```text
User utterance
  -> final transcript / text
  -> InterviewTurn(role=user, modality)
  -> Memory extraction
  -> Retrieve related client facts + same-session memories
  -> Reflection if segment boundary or user asks summary
  -> Planning
  -> AI asks one next question
  -> Output draft / confirmation card
```

### 3.1 Memory extraction rules

| Input | Memory | Rule |
| --- | --- | --- |
| 使用者口述客戶故事 | `utterance` | 保存 final transcript；轉寫不確定則 `unknown` |
| CRM 已有資料 | `crm_fact` | read-only，作為檢索記憶，不自動改寫 |
| AI 推測客戶議題 | `inference` | 只能作訪談洞察，不可直接寫 CRM |
| 使用者修正 | `correction` | supersede prior memory，提升 confidence |
| 使用者確認 | `confirmed_fact` | 可進確認卡，需 user approval 才 writeback |

### 3.2 Advisor reflection

Reflection 必須回答：

- 已確認事實是什麼？
- 只是推論的是什麼？
- 目前缺什麼才足以產出準備卡？
- 對 Issue Readiness / PQ / SPIN hidden stage 的影響是什麼？
- 下一段訪談應該先問哪一類問題？

### 3.3 Advisor planning

Planning 不得重問已確認事實。若 Issue Readiness 低於 3，只能問釐清題，不生成策略。AI 對業務員的問題必須一次一題、台灣繁體中文、白話，不直接提內部 SPIN/PQ 分數。

### 3.4 Advisor output packet

顧問陪談輸出：

```ts
interface AdvisorCompanionPacket {
  clientProfileDraft: {
    confirmedFacts: string[];
    inferredPatterns: string[];
    unknowns: string[];
  };
  prepCard: {
    nextConversationGoal: string;
    suggestedQuestions: string[];
    riskAndComplianceNotes: string[];
  };
  issueReadiness: {
    level: 0 | 1 | 2 | 3 | 4 | 5;
    gaps: string[];
  };
  supportingMemoryIds: string[];
}
```

---

## 4. Runtime Flow B - Theater Field Build Interview

目標：把劇場場景需要的角色、關係、異議、場域、資訊缺口，整理成 Theater Route B 可消費的 build packet。

```text
User describes upcoming meeting / target client / participants
  -> InterviewTurn
  -> Memory extraction
  -> Retrieve same-session scene facts + client facts if allowed
  -> Reflection for scene coherence
  -> Planning
  -> AI asks next scene-building question
  -> Theater build packet
```

### 4.1 Theater build memory classes

| Class | Use |
| --- | --- |
| `scene_fact` | 時間、地點、會議目的、誰在場 |
| `character_seed` | 焦點客戶/NPC 的已知資訊 |
| `relationship_signal` | 家庭/決策/影響力關係 |
| `objection_signal` | 可能異議、背後擔憂 |
| `sensitivity_flag` | 高敏感、不可進劇場或需 reason 的資料 |
| `unknown` | 必須由旁白 NPC 或使用者補充的缺口 |

上述可由 `InterviewMemory.kind/source/dataClass/issueTags` 表達，不一定第一版就新增所有 enum。

### 4.2 Theater reflection

Reflection 必須回答：

- 場景是否足以建立焦點客戶？
- NPC 是否必要，是否不超過 4？
- 哪些角色特質是已知事實，哪些只是推論？
- 哪些資訊缺口應交給旁白 NPC 補問？
- 是否有高敏感客戶資料或不該進劇場的內容？

### 4.3 Theater planning

Planning 會優先補齊：

1. 劇場目標。
2. 焦點客戶。
3. 在場角色與關係。
4. 場景張力與異議。
5. 已知事實/推論/未知分層。
6. 需要 user consent 的敏感資料。

### 4.4 Theater build packet

```ts
interface TheaterBuildPacket {
  sceneGoal: string;
  focusClient: {
    nameOrAlias: string;
    confirmedFacts: string[];
    inferredPatterns: string[];
    unknowns: string[];
  };
  characters: Array<{
    role: string;
    relationshipToFocusClient: string;
    confirmedFacts: string[];
    inferredPersona: string;
    possibleObjections: string[];
    ifThenSignatures: string[];
    sensitivityNotes: string[];
  }>;
  narratorQuestions: string[];
  supportingMemoryIds: string[];
}
```

Theater Route B 只能把 `confirmedFacts` 當事實使用；`inferredPersona` 必須以推論語氣呈現；`unknowns` 只能變成旁白 NPC 補問，不得被 NPC 杜撰。

---

## 5. Voice Adapter

語音不是第三個訪談引擎，而是 input/output adapter。

### 5.1 Target architecture

目標採 WebRTC Realtime：

```text
Browser /interview
  -> POST /api/ai/interview/realtime-session
  -> receive ephemeral client secret
  -> WebRTC Realtime audio/transcript
  -> POST selected final transcript events to /api/ai/interview/realtime-events
  -> memory pipeline
```

### 5.2 Server responsibilities

- Mint short-lived realtime session token; never expose provider API key.
- Enforce `requireCurrentMember()`.
- Enforce `canUseAiModule(session, INTERVIEW)`.
- Mirror final transcript and selected events into BFF persistence.
- Write `AiUsageLog` for all provider calls or realtime usage events when available.
- Reject raw audio persistence unless policy enables it.

### 5.3 Client responsibilities

- Ask mic permission only after explicit click.
- Show consent and no-raw-audio default.
- Show live transcript and allow correction.
- Support interrupt, pause, resume, and text fallback.
- Do not store secret, raw cookie, token, private transcript payload in repo or report.

---

## 6. API Surface

Minimum planned API surface:

```text
POST /api/ai/interview/realtime-session
POST /api/ai/interview/realtime-events
POST /api/ai/interview/memory/retrieve
POST /api/ai/interview/reflections
POST /api/ai/interview/plans
POST /api/ai/interview/confirmations
```

Existing API surface to extend:

```text
POST /api/ai/interview
POST /api/ai/interview/outputs
```

Implementation may merge retrieve/reflection/planning into server services first, but public route boundaries should remain documented so later voice/tool calls can use them.

---

## 7. Persistence Strategy

### Phase 1 - Pure domain and InteractionEvent

- Add domain types and pure services.
- Use existing `InteractionEvent` for proof if schema migration is not ready.
- No raw audio.
- No embedding.

### Phase 2 - Prisma Interview tables

Add dedicated tables:

- `InterviewSession`
- `InterviewTurn`
- `InterviewMemory`
- `InterviewReflection`

All rows require `organizationId`; client-bound rows may include `clientId`; unit aggregation may include `unitId`.

### Phase 3 - Retrieval hardening

- Lexical + metadata retrieval first.
- Embedding/pgvector later after Supabase extension is approved.
- High sensitivity data excluded from vectorization unless explicitly allowed.

---

## 8. Guardrails

### 8.1 Fact boundary

The system may say:

- 「已確認：...」
- 「目前推測：...」
- 「仍待確認：...」

The system must not say:

- 「客戶一定是...」 when evidence is inference.
- 「已寫入客戶檔」 before user confirmation.
- 「這是合規建議」 as legal/compliance conclusion.

### 8.2 CRM writeback

Only `confirmed_fact` + user checked confirmation can be written back. Inference remains interview insight. Unknown becomes follow-up task/question.

### 8.3 Org visibility

Org managers may see aggregate counts and coaching patterns, not raw transcript, client details, private reflection text, or theater private chat.

### 8.4 Voice privacy

No raw audio by default. Transcript can be retained according to `retentionPolicy`, with correction and deletion strategy in later implementation.

---

## 9. Implementation Dependency Order

Recommended order:

1. Domain contracts and pure memory services.
2. Advisor text memory loop.
3. Theater build memory loop.
4. Voice UX shell.
5. Realtime BFF/session/token.
6. Persistence models and migration.
7. Reflection/planning API split.
8. Confirmation/writeback.
9. Cross-surface QA and docs sync.

This order lets the project gain Park-style continuity before taking on realtime voice transport risk.

