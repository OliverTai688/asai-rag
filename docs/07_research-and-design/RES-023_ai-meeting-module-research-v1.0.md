# 誠問 AI AI Meeting Module Research v1.0

> 建立日期：2026-06-20  
> 狀態：研究定稿，建議轉為 `ARC-010` / `PLN-023` / `ACC-015` 可執行文件  
> 問題：誠問 AI 想參考 Notion AI Meeting，做一個**全站 AI 會議模組**：能即時記錄/轉寫拜訪會議、自動生成摘要與行動項、並且「這個 AI 很知道過去客戶的狀況，可以進行對答」。要研究怎麼實施。  
> 範圍：本研究只做**會議捕捉 → 結構化摘要 → 跨會議客戶記憶 → 會議對答（chat）→ 寫回邊界**的架構與缺口評估。不做 UI redesign、不改 SPIN 狀態機、不改 Theater legacy enum/scoring、不預設保存 raw audio。  
> 關聯：`docs/02_architecture-and-rules/ARC-007_realtime-voice-and-park-memory-interview-architecture-v1.0.md`、`docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`、`docs/02_architecture-and-rules/ARC-008_full-site-bff-architecture-v1.0.md`、`docs/07_research-and-design/RES-017_chinese-realtime-voice-and-park-memory-interview-research-v1.0.md`、`docs/07_research-and-design/RES-011_insurance-kyc-pq-mapping-research-v1.0.md`。

---

## 1. 結論

誠問 AI 不需要從零做 AI 會議模組。Notion AI Meeting 的四個核心能力——**即時轉寫、自動摘要/行動項、可點擊引用回原文、與會議對答**——本 repo 已有 80% 的底層 primitive，集中在 `interview` domain 的 Park-style 記憶引擎與 realtime voice BFF。

真正缺的不是「再做一個 AI」，而是把現有 primitive 收斂成一個**全站、以客戶為中心**的會議物件，並補三個關鍵缺口：

1. **第一級的「會議」物件**：目前 `拜訪後筆記` 只是 `VisitPlan.postVisitNotes` 一段純文字；`InterviewSession` 雖然有完整 turn/memory/reflection，但綁在 `/interview` 頁，沒有以「一場會議」被全站（CRM、訪前規劃、dashboard）共用。
2. **結構化會議摘要 + 引用回原文**：目前沒有 `MeetingSummary` 物件（摘要、決策、行動項、參與者），也沒有「每條摘要可點回 transcript 時間點」的 citation 機制。
3. **跨會議的客戶記憶對答**：目前 `retrieveInterviewMemories()` 是 **session-scoped**（單場會議內檢索）。要做到「AI 很知道過去客戶的狀況」，需要把檢索擴成 **client-scoped 跨 session**（這場 + 過去所有會議 + CRM facts + 保單 + 家庭圖 + 既往報告），並提供一條會議/客戶對答 route。

建議路線：**把 AI 會議模組做成 `interview` 記憶引擎的一層全站 orchestration**，新增 `CLIENT_MEETING` 會議類型、`MeetingSummary` 與 citation 契約、client-scoped 跨 session 檢索與 `/api/ai/meeting/*` 對答 BFF；`拜訪後筆記` 從「純文字框」升級為「會議工作台」的其中一個輸入來源，不另起爐灶。raw audio 預設不保存、每次 provider call 寫 `AiUsageLog`、寫回 CRM 需人工確認，沿用既有硬規則。

---

## 2. 外部基準：Notion AI Meeting 怎麼運作

來源：[AI Meeting Notes (beta) – Notion Help Center](https://www.notion.com/help/ai-meeting-notes)、[Preserve perfect meeting memory with AI Meeting Notes](https://www.notion.com/help/guides/preserve-perfect-meeting-memory-with-ai-meeting-notes)、[AI Meeting Notes—Perfect meeting memory | Notion](https://www.notion.com/product/ai-meeting-notes)、[Notion AI meeting notes: is it enough? | eesel AI](https://www.eesel.ai/blog/notion-ai-meeting-notes)、[Notion AI Meeting Notes Review (2026) | tldv](https://tldv.io/blog/notion-ai-meeting-notes-review/)。

| 能力 | Notion 行為 | 對誠問 AI 的轉譯 |
| --- | --- | --- |
| 捕捉 | 即時轉寫麥克風＋系統音訊（Zoom/Meet/Teams 或現場面談）；也可上傳 AAC/M4A/MP3/WAV | 主場景是**現場拜訪面談**＝麥克風即時轉寫＋可上傳錄音檔；視訊會議捕捉非第一優先 |
| 摘要 | 會議結束停止轉寫後自動生成摘要、行動項、參與者 | 生成 `MeetingSummary`：摘要、決策、行動項、待確認、參與者（焦點客戶＋家庭成員） |
| 引用回原文 | 2025-11 起每條摘要要點帶可點擊 citation，連回 transcript 確切時刻 | 每條摘要/行動項/答案帶 `citations`：指向 `InterviewTurn`（時間點）與 `InterviewMemory`（證據） |
| 手動筆記融合 | AI 同時吃 live transcript 與你的手動筆記（含 tag/@mention）生成更好的摘要 | `拜訪後筆記` 的手動輸入＋ live transcript 一起餵摘要生成 |
| 對答 | 可用 Notion AI 對會議內容提問；所有 transcript/摘要/決策/行動項可全 workspace 搜尋 | 「與這場會議對答」＋「跨這位客戶所有會議對答」；以 Park memory + RAG 檢索 grounding |
| 記憶 | 「perfect meeting memory」：跨會議可被 AI 檢索引用 | 本研究的差異化重點：**跨 session 的客戶記憶**，讓 AI 真的知道客戶過去狀況 |

差異化：Notion 是通用 workspace；誠問 AI 是**受監管的保險顧問場景**。會議記憶必須區分 confirmed fact / inference / unknown，寫回 CRM 要人工確認，敏感客戶要 gating，raw audio 預設不留。這正是 `interview` domain 既有設計的強項。

---

## 3. 現況盤點：repo 已有什麼

### 3.1 拜訪後筆記（要被升級的現況）

- UI：[`src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx`](../../src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx) — `開啟筆記` 進入的純文字編輯器。
- 資料：`VisitPlan.postVisitNotes`（freeform，≤20KB）與 `postVisitAnalysis`（AI 分析，≤20KB），定義在 [`src/domains/visit/types.ts`](../../src/domains/visit/types.ts)。
- 存取：`PATCH /api/visits/[id]`（[`src/app/api/visits/[id]/route.ts`](../../src/app/api/visits/[id]/route.ts)）→ `src/lib/visits/visit-plan-repository.ts`。
- 限制：**只有一段文字**。沒有 transcript、沒有結構化摘要/決策/行動項、沒有引用、沒有跨會議記憶、視野是 all-or-nothing。

### 3.2 Interview Park-memory 引擎（要被重用的底座）

`src/domains/interview/`：

- `types.ts`：`InterviewKind`（`ADVISOR_COMPANION` | `THEATER_FIELD_BUILD`）、`InterviewModality`（`TEXT` | `VOICE_REALTIME` | `VOICE_TRANSCRIPT_FALLBACK`）、`InterviewMemory`、`InterviewReflection`、`InterviewMicroPlan`、`InterviewDataClass`（`FACT`/`CONFIRMED`/`INFERENCE`/`UNKNOWN`/`INSTRUCTION`）、`InterviewVisibilityScope`。
- `memory.ts`：`createMemoryCandidatesFromTurn()`（turn → memory，依中文 hint 推 fact/inference/unknown）、`retrieveInterviewMemories()`（BM25-like 排序，**目前過濾 organizationId/sessionId/interviewKind**）、`scoreInterviewMemory()`（relevance/importance/recency/outlineMatch 加權）、`applyMemoryCorrection()`（修正鏈）。
- `park-loop.ts`：`buildAdvisorMemoryLoopContext()` — 回應前做 scoped retrieval，prompt 區分 confirmed/inference/unknown，產 `InterviewMicroPlan`。
- `reflection-planning.ts`：`buildInterviewReflection()`（confirmedFacts/inferredPatterns/unknowns/recommendedNextFocus + supportingMemoryIds）、`buildInterviewPlanningResult()`。

### 3.3 Persistence（已 DB 化，可直接接）

Prisma（`prisma/schema.prisma` 約 1003–1142）：

- `InterviewSession`：organizationId/unitId/clientId/ownerId、interviewKind、status、outlineId、currentSegmentId、title、metadata、startedAt/completedAt。Relations：turns/memories/reflections/reports。
- `InterviewTurn`：role（USER/ASSISTANT/SYSTEM）、**modality（含 VOICE_REALTIME / VOICE_TRANSCRIPT_FALLBACK）**、content、**transcriptFinal**、providerEventId、outlineSegmentId、occurredAt。← transcript 與時間點 citation 的天然錨點。
- `InterviewMemory`：kind/source/dataClass/visibilityScope、text、evidenceText、confidence、importance、issueTags、**embeddingStatus（PENDING/READY/SKIPPED）**、retentionPolicy、supersedes/supersededBy。← 跨 session 記憶與向量化的天然欄位。
- `InterviewReflection`：summary、confirmedFacts、inferredPatterns、unknowns、recommendedNextFocus、supportingMemoryIds。
- repository：[`src/lib/interview/interview-persistence-repository.ts`](../../src/lib/interview/interview-persistence-repository.ts)（owner-scoped DTO 邊界，client 不直接 import Prisma）。

### 3.4 Realtime voice BFF（捕捉層已備）

- [`src/lib/interview/realtime-bff.ts`](../../src/lib/interview/realtime-bff.ts)：`gpt-realtime-2`、5 分鐘 ephemeral client secret、event 白名單（FINAL_TRANSCRIPT/ASSISTANT_TRANSCRIPT/INTERRUPT/CORRECTION/CONFIRMATION）、拒收 token/cookie/raw_audio/base64。
- routes：`/api/ai/interview/realtime-session`（mint，套 `canUseAiModule(INTERVIEW)`，超限 429）、`/api/ai/interview/realtime-events`（鏡像事件，final transcript 進 memory，raw audio 不存）、`/api/ai/interview/transcribe`（上傳 WAV/MP3 → 文字）。
- UI：`/interview` 已有 mic consent、voice stage、live transcript/correction、memory rail、文字 fallback。

### 3.5 對答與用量底座

- 全站助手 `問誠問 AI`：`/api/ai/chat`（streaming，tool 路由白名單，trace → `AssistantConversation`/`AssistantMessage`）。
- 寫回邊界：`/api/ai/interview/sessions/[id]/writebacks` + [`src/domains/interview/writeback-boundary.ts`](../../src/domains/interview/writeback-boundary.ts)（confirmed→CRM candidate、inference→insight、unknown→follow-up task，皆人工確認 + audit）。
- 用量：[`src/lib/ai/usage-log.ts`](../../src/lib/ai/usage-log.ts) — `AiUsageLog` 有 `module`（CHAT/INTERVIEW/SPIN/THEATER/VISIT/REPORT/RAG）與 trace 欄位（interviewSessionId/interviewTurnId 等）。
- BFF：`requireCurrentMember()` 推導 scope、`canUseAiModule(session, module)` quota、429。

---

## 4. 缺口分析（從現況到 AI 會議模組）

| # | 缺口 | 現況 | AI 會議模組需要 |
| --- | --- | --- | --- |
| G1 | 「會議」不是第一級全站物件 | transcript/記憶綁在 `/interview`；拜訪只有 `postVisitNotes` 文字 | 一個 `CLIENT_MEETING` 會議物件，CRM/訪前規劃/dashboard 都能開、都能回看 |
| G2 | 沒有結構化摘要與引用 | `postVisitAnalysis` 是純文字；無決策/行動項/參與者/citation | `MeetingSummary`（摘要/決策/行動項/待確認/參與者）+ 每要點帶 `citations`→turn/memory |
| G3 | 記憶只在單場 session 內 | `retrieveInterviewMemories()` 過濾 `sessionId` | client-scoped 跨 session 檢索（這場＋過去會議＋CRM/保單/家庭/報告） |
| G4 | 沒有會議/客戶對答 route | 只有通用 `/api/ai/chat`，無客戶記憶 grounding | `/api/ai/meeting/[id]/chat`、`/api/ai/clients/[id]/memory-chat`，答案帶 citations |
| G5 | 全站入口缺 | `開啟筆記` 只在訪前規劃詳情頁 | dashboard「最近會議」、CRM client detail「會議」分頁、拜訪詳情皆可開始/檢視 |
| G6 | 跨會議檢索規模 | in-memory BM25-like，`embeddingStatus` 仍 PENDING、pgvector 未啟用 | 客戶歷史變大後需 pgvector 向量檢索（分階段，operator 啟用） |
| G7 | 會議摘要/行動項未連動任務與 CRM | 寫回邊界只在 interview outputs | 行動項→follow-up task、confirmed fact→CRM candidate，沿用 writeback-boundary |

---

## 5. 建議目標架構（摘要，細節入 ARC-010）

### 5.1 會議＝interview session 的全站投影

不新建平行資料模型。以 **additive** 方式擴充：

- `InterviewKind` 增 `CLIENT_MEETING`（現場拜訪/客戶會議），與既有 `ADVISOR_COMPANION` 共用 turn/memory/reflection。
- 新增 `MeetingSummary` 結構（持久化選項見 ARC-010：新表 `InterviewMeetingSummary`，或先存 `InterviewReflection.metadata`／`InterviewSession.metadata`，由 ARC-010 定案）。
- citation 契約：`MeetingCitation { turnId, occurredAt, memoryIds[], quote }`，UI 可點回 transcript 時間點（對齊 Notion 2025-11 的可點擊引用）。

### 5.2 跨會議客戶記憶

- 把 `retrieveInterviewMemories()` 的 filter 從 `sessionId` 放寬到可選 `clientId`（跨 session）；保留 visibilityScope 過濾（member private 不外洩、org aggregate only 不回明細）。
- 記憶來源不只 transcript：CRM client facts、policy、family graph、既往 report、過去會議摘要都可投影成 `InterviewMemory`（dataClass 標 CONFIRMED/INFERENCE）。
- 規模化：`embeddingStatus` → 接 pgvector（G6，分階段；未啟用前用現有 lexical 檢索，標 blocker）。

### 5.3 會議對答 BFF

- `/api/ai/meeting/[sessionId]/chat`：grounding = 本場 transcript + 本客戶跨 session 記憶；答案分 facts/inferences/unknowns 並帶 citations；每次寫 `AiUsageLog`（建議新增 `AiModule.MEETING` 或沿用 `CHAT` + trace，ARC-010 定）。
- `/api/ai/meeting/[sessionId]/summary`：生成/重生 `MeetingSummary`（仿 `/api/ai/interview/outputs` 的 JSON-mode pattern）。
- 皆 `requireCurrentMember()` scope、`canUseAiModule()` quota、429/503 contract。

### 5.4 入口與替換

- `拜訪後筆記` 升級為「會議工作台」：手動筆記 + （可選）即時轉寫 + 自動摘要 + 對答，全部對齊同一 `InterviewSession`。`postVisitNotes` 保留為手動輸入來源之一（相容、不破壞既有資料）。
- 全站入口：dashboard、CRM client detail、訪前規劃詳情。

### 5.5 隱私與合規（沿用硬規則）

- raw audio 預設不存；只存 transcript + 結構化記憶。
- member-private transcript；org manager 只看 aggregate，不看逐字稿/記憶明細/客戶明細。
- 寫回 CRM/任務必經人工確認 + audit；敏感客戶需 reason/riskAccepted gating。
- 每次 provider call（summary/chat/realtime）寫 `AiUsageLog`，含 success/error。

---

## 6. 建議批次順序（細節入 PLN-023，KEY = AMM）

- `AMM-000` 文件與 workstream 登錄（ARC-010 / PLN-023 / ACC-015 / MAN / AGENTS）。
- `AMM-001` 會議資料模型與契約：`CLIENT_MEETING` kind、`MeetingSummary`、`MeetingCitation`、pure mapping/types（不接 provider）。
- `AMM-002` 捕捉層重用：以 interview realtime/transcribe + 手動筆記建立 meeting session 的 turn/transcript。
- `AMM-003` 結構化摘要生成 + 引用：`/summary` route，摘要/決策/行動項/參與者 + citation，寫 `AiUsageLog`。
- `AMM-004` 跨會議客戶記憶 + 對答：client-scoped retrieval + `/chat` route，答案帶 citations。
- `AMM-005` 全站入口與拜訪後筆記升級：dashboard/CRM/訪前規劃入口，`postVisitNotes` 相容並存。
- `AMM-006` 寫回邊界：行動項→task、confirmed fact→CRM candidate，人工確認 + audit。
- `AMM-007` pgvector 規模化（operator 依賴；未啟用前 lexical fallback 並標 blocker）。
- `AMM-008` 跨狀態 QA、docs sync、rollback note。

---

## 7. Definition of Done

- `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 通過；動 schema 跑 Prisma validate/generate 與 local/development db push 或 migration dry-run。
- 一場 demo 拜訪：可建立會議 → （文字或語音）累積 transcript → 一鍵生成 `MeetingSummary`（摘要/決策/行動項/參與者）→ 每要點可點回 transcript turn。
- 「與這位客戶對答」能引用**過去**會議與 CRM facts 回答，且答案帶 citations、區分 fact/inference/unknown，不重述已確認事實當新發現。
- 隱私 proof：org manager aggregate API 不回 transcript/memory/客戶明細；raw audio 不入庫。
- 每次 summary/chat/realtime provider call 都寫 `AiUsageLog`（success/error）。
- 寫回 proof：inference 不會變 CRM fact；confirmed + 勾選 + （敏感）approval 才寫回，且有 audit。
- 清空 browser storage / 重新登入後，會議與摘要仍可從 DB 讀回。

---

## 8. Open Questions（需 operator / product 決策）

> **2026-06-20 operator 決策**：Q1 = **開新表** `InterviewMeetingSummary`；Q2 = **只做現場 AI 麥克風**，視訊系統音訊延後；建置順序 = **先專注刻介面（UI-first）**，後端 BFF/schema 隨後補。其餘 Q3–Q7 仍待決。

1. ~~`MeetingSummary` 持久化~~ → **已決策：新增 `InterviewMeetingSummary` 表**（schema migration，待 operator 確認 DB target 後執行）。
2. ~~即時轉寫範圍~~ → **已決策：第一版只做現場麥克風面談**，視訊（Zoom/Meet/Teams）系統音訊捕捉延後。
3. raw audio 是否要保存供日後重聽？（預設不存，需 legal/compliance approval 才開）
4. AI 用量歸類：新增 `AiModule.MEETING`，還是會議對答計入 `CHAT`、摘要計入既有 module？（影響配額與報表）
5. 跨會議記憶規模：何時啟用 Supabase pgvector？未啟用前以 lexical 檢索能撐多少客戶歷史量？
6. 「AI 知道過去客戶狀況」的記憶來源邊界：是否納入其他顧問對同一客戶的會議？（多租戶/同 org 跨成員可見性，預設 member-private，需決策）
7. 對答 grounding 是否也吃 SPIN/Theater session 與報告全文？（資料越廣越「懂客戶」，但要管 visibility 與成本）

---

## 9. 下一步建議

直接產出三份可執行文件：

- `ARC-010_ai-meeting-module-architecture-v1.0.md`：會議物件模型、`MeetingSummary`/citation 契約、跨 session 檢索規則、BFF route 契約、隱私/用量/寫回邊界、目錄 convention。
- `PLN-023_ai-meeting-module-batch-tasks-v1.0.md`：把第 6 節拆成 `AMM-000`..`AMM-008` 可勾選卡。
- `ACC-015_ai-meeting-module-acceptance-framework-v1.0.md`：捕捉/摘要/citation/跨會議對答/隱私/寫回/用量/browser persistence 驗收框架。
