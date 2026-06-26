# 誠問 AI AI Meeting Module Architecture v1.0

> 建立日期：2026-06-20  
> 狀態：架構規則，供 `PLN-023` 執行  
> 研究依據：`docs/07_research-and-design/RES-023_ai-meeting-module-research-v1.0.md`  
> 驗收依據：`docs/08_acceptance-and-qa/ACC-015_ai-meeting-module-acceptance-framework-v1.0.md`  
> 相鄰架構：`docs/02_architecture-and-rules/ARC-007_realtime-voice-and-park-memory-interview-architecture-v1.0.md`、`docs/02_architecture-and-rules/ARC-008_full-site-bff-architecture-v1.0.md`

---

## 1. 架構目標

AI Meeting Module 把現場拜訪/客戶會議變成一個**第一級、以客戶為中心、可被全站共用**的物件，並提供 Notion AI Meeting 級的四件事：即時轉寫、結構化摘要（含可點擊引用）、跨會議客戶記憶、會議對答。核心原則是**重用 `interview` Park-memory 引擎**，以 additive 方式擴充，不另起平行系統：

```text
UI（拜訪後筆記升級的會議工作台 / CRM 會議分頁 / dashboard）
  -> Meeting BFF（/api/ai/meeting/*、沿用 interview session/turn/memory）
  -> interview 記憶引擎（memory / park-loop / reflection-planning）
  -> Prisma（InterviewSession/Turn/Memory/Reflection + MeetingSummary）+ OpenAI/Anthropic provider
```

### 1.1 完成定義

- 會議是 `InterviewSession`（`interviewKind = CLIENT_MEETING`），CRM/訪前規劃/dashboard 皆可開啟與回看。
- 每場會議可生成 `MeetingSummary`（摘要/決策/行動項/待確認/參與者），每要點帶 `MeetingCitation` 連回 transcript turn。
- 會議對答可引用**本場 + 本客戶過去所有會議 + CRM/保單/家庭/報告**，答案分 fact/inference/unknown 並帶 citations。
- raw audio 預設不存；member-private transcript；org manager 只看 aggregate。
- 每次 summary/chat/realtime provider call 寫 `AiUsageLog`（success/error）；寫回 CRM/task 需人工確認 + audit。

---

## 2. 資料模型（additive，不破壞既有）

### 2.1 會議類型

- `InterviewKind` 增加 `CLIENT_MEETING`。與 `ADVISOR_COMPANION`、`THEATER_FIELD_BUILD` 並存，共用 `InterviewTurn` / `InterviewMemory` / `InterviewReflection`。
- 不改 SPIN 狀態機、不改 Theater legacy enum/scoring。

### 2.2 MeetingSummary（持久化決策）

**2026-06-20 operator 決策：採新增 additive 表 `InterviewMeetingSummary`**（一場 session 一筆，可重生覆蓋）。欄位至少：

```text
InterviewMeetingSummary
  id, organizationId, unitId, clientId, sessionId, ownerId
  headline            // 一句話會議結論
  summary             // 摘要正文
  decisions   String[] // 決策
  actionItems Json     // [{ id, text, owner, dueHint, citations[], writebackStatus }]
  openQuestions String[] // 待確認/下一步要問
  participants Json    // [{ name, role: FOCUS_CLIENT | FAMILY | ADVISOR | OTHER, memberId? , familyMemberId? }]
  citations   Json     // MeetingCitation[]（summary 層級）
  model, generatedAt, supersedesSummaryId, metadata, createdAt, updatedAt
```

UI-first 過渡（2026-06-20 決策：先刻介面）：在後端 `InterviewMeetingSummary` 表與 BFF 落地前，介面層先以 client-side 本地 state / demo fixture 呈現 `MeetingSummary`，讓 UX 可被瀏覽與迭代；待 operator 確認 DB target 後再執行正式表 migration 與 BFF 接線。pure type 先落地以確保 UI 與後端契約一致。

所有 record 帶 `organizationId`；client-bound 帶可驗證 `clientId`；必要時 `unitId`。

### 2.3 Citation 契約

```text
MeetingCitation {
  turnId: string          // InterviewTurn.id
  occurredAt: string      // turn 時間點（對齊 Notion 可點擊引用）
  memoryIds: string[]     // 支撐此要點的 InterviewMemory.id
  quote?: string          // 原文片段（client-safe，不含 raw audio）
}
```

- 摘要要點、行動項、對答答案都可帶 `citations`。
- citation 只引用**已存在**的 turn/memory；不得引用未發生內容（防幻覺）。
- UI 點 citation → 捲動/高亮對應 transcript turn。

### 2.4 記憶來源投影

`InterviewMemory` 來源（`source`）可來自：transcript turn（既有）、CRM client fact、policy、family graph、prior report、prior meeting summary。投影規則：

- 來自 CRM/policy 已確認欄位 → `dataClass = CONFIRMED`、`source = CRM/POLICY/FAMILY_GRAPH`。
- 來自 AI 推論 → `dataClass = INFERENCE`、`confidence` 標註，不得升格成 fact。
- 缺口 → `dataClass = UNKNOWN`，可轉旁白/follow-up。
- `visibilityScope` 預設 `MEMBER_PRIVATE`；只有人工確認才升 `CLIENT_RECORD_CANDIDATE`。

---

## 3. 跨會議記憶檢索

### 3.1 檢索 scope

擴充 `retrieveInterviewMemories()` 的 filter：

- 既有：`organizationId` + `sessionId` + `interviewKind`。
- 新增可選：`clientId`（跨 session），開啟「本客戶所有會議記憶」檢索。
- 永遠套用 `visibilityScope` 過濾：`MEMBER_PRIVATE` 只給該 member；`ORG_AGGREGATE_ONLY` 不回明細；`THEATER_BUILD_PRIVATE` 不外洩。
- 跨成員可見性預設**關閉**（member-private）；若 org 要共享同客戶會議記憶，需 explicit policy（Open Question，預設不開）。

### 3.2 排序與規模

- 第一階段沿用 `scoreInterviewMemory()`（relevance/importance/recency/outlineMatch）lexical 檢索，足以支撐單客戶有限歷史。
- 第二階段（`AMM-007`）接 Supabase pgvector：`InterviewMemory.embeddingStatus` 由 PENDING→READY，檢索改向量＋lexical 混合。pgvector 需 operator 在 Supabase 啟用；未啟用前以 lexical fallback 並在 report 標 blocker，不得宣稱向量檢索已上線。

---

## 4. BFF Route 契約

| Route | Method | 用途 | Scope / Guard |
| --- | --- | --- | --- |
| `/api/ai/meeting/sessions` | POST | 建立會議 session（`CLIENT_MEETING`），可帶 `clientId`、`visitPlanId` | `requireCurrentMember()` 推導 org/user/unit；client 須 member 可讀 |
| `/api/ai/meeting/sessions/[id]` | GET | 讀會議快照（session/turns/transcript/summary） | member ownership |
| `/api/ai/meeting/sessions/[id]/turns` | POST | append turn（手動筆記 / 文字 / 語音 final transcript） | member ownership；auto 產生 memory candidate |
| `/api/ai/meeting/sessions/[id]/summary` | POST | 生成/重生 `MeetingSummary`（JSON mode，仿 interview outputs） | `canUseAiModule()`；success/error 寫 `AiUsageLog` |
| `/api/ai/meeting/sessions/[id]/chat` | POST | 與本場會議對答（grounding：本場 transcript + 本客戶跨 session 記憶） | `canUseAiModule()`；429/503；答案帶 citations |
| `/api/ai/clients/[id]/memory-chat` | POST | 不綁單場：直接跟「這位客戶的所有會議記憶」對答 | member 須可讀該 client；`canUseAiModule()` |
| `/api/ai/meeting/sessions/[id]/writebacks` | GET/POST | 行動項→task、confirmed fact→CRM candidate（沿用 writeback-boundary） | member ownership + 人工確認 + audit |

- realtime 語音沿用既有 `/api/ai/interview/realtime-session`、`/api/ai/interview/realtime-events`、`/api/ai/interview/transcribe`，以 `interviewKind = CLIENT_MEETING` 建立；不重做 realtime 基礎建設。
- 標準處理順序沿用 `ARC-008` 第 3 節（parse → session → scope → validate → policy/quota → use-case → DTO → audit/usage → response）。

---

## 5. DTO 與隱私規則

- 會議 DTO 為 member-private：含 transcript、memory、summary、citations。
- org aggregate DTO（`/api/org/*`）**不得**回 transcript、memory text、summary 正文、客戶姓名/電話/email、保單號、報告全文；只回會議計數、完成率、coaching signal 等 aggregate。
- client-facing（若未來分享會議摘要到 client portal）只能回 client-safe section，移除 internal note / raw prompt / inference 私評 / provider payload。
- 合規欄位（`complianceChecklist`、`sensitivityLevel`、`kycStatus`）不得刪改；敏感客戶會議要 reason/riskAccepted gating（沿用 visit theater-handoff gate 模式）。

---

## 6. AI 用量與成本

- 新增 `AiModule.MEETING`（建議）涵蓋會議摘要與會議對答；或暫沿用 `CHAT`（對答）/既有 module（摘要）並以 trace 區分——由 `AMM-001` 定案並同步 `pnpm ai:usage-audit`。
- 每次 provider call 寫 `AiUsageLog`：成功記 tokens/latency/cost；失敗記 `error`，不偽造 cost/token。
- quota-blocked（`canUseAiModule` false）回 429，**不呼叫 provider**、不寫假 usage。
- realtime mint 沿用 ephemeral client secret，不下放 server API key。
- trace 欄位連 `interviewSessionId` / `interviewTurnId`，供 super admin 逐輪用量審計（對齊 RES-022 trace 設計）。

---

## 7. 目錄 convention

沿用 `ARC-008`：

```text
src/app/api/ai/meeting/.../route.ts
src/domains/interview/meeting.ts            // CLIENT_MEETING outline / MeetingSummary / citation pure types & mapping
src/lib/interview/meeting-repository.ts      // MeetingSummary 持久化 + DTO 邊界
src/lib/interview/interview-persistence-repository.ts // 既有 session/turn/memory（重用）
src/lib/ai/usage-log.ts                      // 既有，新增 MEETING module 時更新
```

規則：

- `route.ts` 只做 protocol/session/scope/contract；摘要生成、檢索、DTO mapping 放 domain/repository。
- client 端不直接 import Prisma 或 `mocks.ts` 作 business truth source。
- Zustand 只作 UI cache，不作會議資料真相源。

---

## 8. Rollback / 相容性

- `CLIENT_MEETING` 為 additive enum 值；停用會議模組時，既有 `ADVISOR_COMPANION` / Theater 不受影響。
- `MeetingSummary` 若採新表：rollback 以 reverse migration 或保留未用 additive 表處理，不刪既有資料。
- `拜訪後筆記` 的 `postVisitNotes` / `postVisitAnalysis` 欄位保留；會議工作台只是新增 transcript/summary 來源，舊純文字筆記仍可讀寫，確保相容。
- pgvector 未就緒時退回 lexical 檢索；realtime provider 未就緒時退回文字 + 上傳轉寫；任何降級都要在 report 標明，不宣稱 production-ready。

---

## 9. 硬規則對齊

- 合規欄位不得刪/不得 optional。
- SPIN 狀態機不動；Theater legacy enum/scoring 不動（會議模組不碰 Theater migration）。
- 每次 OpenAI/Anthropic 呼叫寫 `AiUsageLog`。
- `src/generated/` 不手改。
- raw audio 預設不存；寫回 CRM 需人工確認 + audit；敏感客戶 gating。
