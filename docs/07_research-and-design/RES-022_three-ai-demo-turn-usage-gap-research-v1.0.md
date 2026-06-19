# RES-022 — 三個 AI 演示與逐輪用量缺口研究 v1.0

日期：2026-06-19  
範圍：只研究三個登入後核心 AI 演示的可玩性、正確性、完整性，以及 super admin 查看每一次對話輪 AI 用量的資料與介面缺口。  
三個 AI：`問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`。  
不在本研究處理：SPIN 狀態機改寫、Theater persona enum 任意遷移、production 金流/通知/email、刪除或重置遠端資料。

---

## 1. 結論

目前 repo 已具備三個 AI 的 production-minimum cost logging 基礎：`/api/ai/chat`、`/api/ai/interview`、`/api/ai/theater` 與 `/api/ai/theater/score` 都有 session-scoped guard、quota check 與 `AiUsageLog` 寫入路徑，且 `PLN-017` 已留下 success/error proof 記錄。

但若目標是「我能立即開始玩三個 AI，並在 super admin 看到每一次對話輪的 AI 用量」，現況仍不足。核心缺口不是單純缺 `AiUsageLog`，而是 `AiUsageLog` 沒有可穩定 join 回 conversation/session/turn 的欄位；super admin 現有頁面也只顯示彙總與 quota warning，沒有逐輪明細表。

建議下一輪做一個完整交付切片：先定義 AI turn usage contract，再補 DB 欄位或關聯 metadata、API 明細、super admin UI、三 AI demo script 與 browser/API proof。完成後才能宣稱「三 AI 可玩且可逐輪稽核」。

---

## 2. 現況盤點

### 2.1 問誠問 AI

入口：
- Sidebar `AI 工作台` 內的 `問誠問 AI` action，開啟 `GlobalAssistant` panel。
- 輔助入口：`AssistantFAB`。

主要 API：
- `POST /api/ai/chat`

已存在能力：
- 使用 current member session，不信任前端傳入 org/user。
- 成功串流完成後寫 `AiUsageLog(module=CHAT)`。
- 成功時建立 `AssistantConversation` 與 `AssistantMessage`。
- error path 會寫 `AiUsageLog.error`。
- assistant 可回傳 tool command，例如 `[[TOOL:NAVIGATE:/...]]`。

缺口：
- 每次成功送出都建立新的 `AssistantConversation`，即使前端傳 `context.conversationId`，目前只是放入 metadata，沒有 upsert/append 到同一 conversation。
- `AiUsageLog` 沒有 `conversationId` / `messageId` / `turnId` 欄位；只能靠 `requestId`、時間與 metadata 人工推測。
- 前端 local store conversation id 與 DB conversation id 不一致，super admin 很難把「畫面上的第 N 輪」對回某筆 usage。

### 2.2 AI 顧問陪談

入口：
- Sidebar `AI 工作台` 的 `AI 顧問陪談`，目前 href 為 `/interview`。

主要 API：
- `POST /api/ai/interview`
- `POST /api/ai/interview/outputs`
- DB session/turn helpers：`/api/ai/interview/sessions/*`

已存在能力：
- `/api/ai/interview` 使用 current member session 與 quota guard。
- 成功回合寫 `AiUsageLog(module=INTERVIEW)`。
- 成功回合另寫 `InteractionEvent(type=VISIT)`，metadata 內含 messages、assistantContent、microPlan、requestId。
- 若選了 client，頁面會建立 DB-backed `InterviewSession`，並可 append user turn / generate reflection / writeback。

缺口：
- `/interview` 頁送 `/api/ai/interview` 時目前使用 local store `activeSession.id` 當 `sessionId`，不是 DB-backed `persistentSessionId`。
- 同一個 AI request body 未帶 `clientId`，所以 `AiUsageLog.clientId` 與 `InteractionEvent.clientId` 可能為空，即使使用者在 UI 選了 client。
- AI assistant 回覆本身沒有寫入 `InterviewTurn`；目前逐輪內容主要落在 `InteractionEvent.metadata.assistantContent`，不是 first-class turn record。
- 因 session id / client id 不一致，super admin 要逐輪看用量時無法可靠地對回 `InterviewSession`、`InterviewTurn` 與 client。

### 2.3 AI 劇場演練

入口：
- Sidebar `AI 工作台` 的 `AI 劇場演練`，href 為 `/theater`。

主要 API：
- `POST /api/ai/theater`
- `POST /api/ai/theater/score`

已存在能力：
- `/api/ai/theater` 與 `/api/ai/theater/score` 使用 current member session、quota guard、success/error `AiUsageLog(module=THEATER)`。
- 成功角色回覆與評分會寫 `InteractionEvent(type=THEATER)`，metadata 內含 sessionId、persona、history、assistantContent/score、requestId。
- Theater session 頁面會把 `sessionId`、`clientId`、history 送進 AI route。

缺口：
- `/theater` 啟動流程依賴 client-side `useSpinStore` 與 local completed SPIN session；清空 browser storage 或未跑 quickstart 時容易無資料可選。
- DB seed 已有 `theater_sessions` / `theater_turns`，但 `/theater` 頁目前不是從 DB BFF 讀取這些 seeded sessions。
- Theater API route 是 legacy demo gate；production 下若未設定 `ENABLE_LEGACY_THEATER_DEMO=true` 會回 `503 THEATER_ROUTE_B_REQUIRED`。這是安全設計，但 demo runbook 必須明確標示 dev/staging 開關。
- `AiUsageLog` 仍沒有 `theaterSessionId` / `theaterTurnId`，只能用 `InteractionEvent.metadata.requestId` 間接連。

---

## 3. Super Admin 逐輪用量現況

現有資料表：
- `AiUsageLog`：organization/unit/user/client/provider/module/model/tokens/latency/cost/requestId/error/createdAt。
- `AssistantConversation` / `AssistantMessage`：可保存 chat 對話內容。
- `InterviewSession` / `InterviewTurn`：可保存訪談 session 與 turn，但目前 `/api/ai/interview` 的 AI 回覆不穩定落到這裡。
- `TheaterSession` / `TheaterTurn`：可保存劇場 session 與 turn，但目前 UI 主要用 client-side store。
- `InteractionEvent`：目前 interview/theater success path 用 metadata 保存 requestId、history、assistantContent 或 score。

現有 super admin 能力：
- `/super-admin` 顯示 release readiness、AI usage aggregate 與 quota warning。
- `GET /api/platform/ai-usage` 回傳 current-month cross-tenant aggregate：totals、byOrganization、byModule、byProvider、errorHeatmap。

現有缺口：
- 沒有逐筆 `AiUsageLog` list API。
- 沒有「每一次對話輪」的 normalized DTO。
- 沒有 super admin 明細 UI，例如：時間、組織、成員、AI 模組、session/conversation、turn index、model、tokens、latency、cost、error。
- 沒有穩定 linkage 欄位，無法用 SQL join 直接從 usage log 找到 assistant message / interview turn / theater turn。
- 若要看內容，必須另外定義 redaction 與 break-glass 規則；super admin 預設不應直接暴露 raw private conversation content。

---

## 4. 目標狀態：三 AI 可玩且可逐輪稽核

一個演示合格回合需要同時滿足：

1. 使用者可以從 AI 工作台入口開啟 AI，不需要手動塞 raw id。
2. 每送出一輪 user message，AI 正常回覆或友善失敗。
3. 成功或 provider error 都寫 `AiUsageLog`。
4. 成功回合有 first-class turn/conversation/session record。
5. `AiUsageLog` 能穩定關聯到該回合。
6. super admin 可用 read-only view 查看逐輪成本 metadata。
7. 預設明細不洩漏 raw sensitive content；需要內容回放時走 break-glass/impersonation/audit policy。

建議的 normalized turn usage DTO：

```ts
type PlatformAiTurnUsage = {
  usageLogId: string;
  createdAt: string;
  organization: { id: string; name: string; slug: string | null };
  user: { id: string; name: string | null };
  unit: { id: string; name: string | null } | null;
  client: { id: string; name: string | null } | null;
  module: "CHAT" | "INTERVIEW" | "THEATER";
  provider: "OPENAI" | "ANTHROPIC" | "MOCK";
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  costUsd: string | null;
  requestId: string | null;
  error: string | null;
  trace: {
    conversationId?: string;
    messageId?: string;
    sessionId?: string;
    turnId?: string;
    source: "assistant" | "interview" | "theater" | "interaction_event_fallback";
  };
  preview: {
    userInputSnippet?: string;
    assistantOutputSnippet?: string;
    redacted: boolean;
  };
};
```

---

## 5. 建議資料模型策略

### Route A：最小侵入，補 `AiUsageLog.metadata`

優點：schema 變更較小。  
缺點：Prisma schema 目前沒有 metadata 欄位，需要 migration；JSON join/search 能力較差。

新增欄位：
- `AiUsageLog.trace Json?`

每個 route 寫：
- chat：`conversationId`、`assistantMessageId`、client conversation id。
- interview：DB `interviewSessionId`、user `InterviewTurn.id`、assistant `InterviewTurn.id`。
- theater：DB `theaterSessionId`、agent/client `TheaterTurn.id` 或 fallback local session id。

### Route B：first-class nullable FK 欄位

優點：super admin 查詢與索引清楚。  
缺點：schema 變更較多，但更符合「每輪稽核」。

建議欄位：
- `assistantConversationId String?`
- `assistantMessageId String?`
- `interviewSessionId String?`
- `interviewTurnId String?`
- `theaterSessionId String?`
- `theaterTurnId String?`
- `interactionEventId String?`

建議採 Route B。原因：使用者明確要測試「每一次對話輪」的 AI 用量，這是合規/成本稽核能力，不宜依賴 fragile metadata。

---

## 6. 下一輪批次建議

### Batch TAU-001 — Turn usage contract and schema

- [ ] 定義 `AiUsageLog` turn trace 欄位策略，建議 Route B。
- [ ] Prisma migration：補 nullable trace FK 或 `trace Json`。
- [ ] 更新 `writeAiUsageLog` / generation repository input types。
- [ ] 跑 `pnpm prisma:validate`、`pnpm prisma:generate`。

### Batch TAU-002 — 三 AI persistence 對齊

- [ ] Chat success path append/reuse DB conversation，usage log 關聯 conversation/message。
- [ ] `/interview` UI 呼叫 `/api/ai/interview` 時送 `clientId` 與 DB `persistentSessionId`。
- [ ] Interview AI 回覆寫入 `InterviewTurn(role=ASSISTANT)`，usage log 關聯 session/turn。
- [ ] Theater demo 起點可從 DB seeded completed SPIN/theater source 或明確 quickstart fixture 開始，不再只依賴 localStorage。
- [ ] Theater AI 回覆與 score 關聯 DB theater session/turn 或標記 fallback trace。

### Batch TAU-003 — Super admin turn usage view

- [ ] 新增 `GET /api/platform/ai-usage/turns`，支援 date/module/org/user/client/error filters。
- [ ] 回傳 normalized `PlatformAiTurnUsage[]`，預設只含 snippets 或 no content。
- [ ] `/super-admin` 新增「AI turn usage」read-only table。
- [ ] 明確標示 error rows、zero token rows、stream usage missing rows。
- [ ] 若需要看完整 conversation content，另走 break-glass 並寫 `AuditLog`。

### Batch TAU-004 — Demo QA

- [ ] 建立 `pnpm demo:three-ai-turn-usage-qa`。
- [ ] 以 demo member 依序呼叫：chat 1 輪、interview 1 輪、theater 1 輪、theater score 1 次。
- [ ] 驗證 `AiUsageLog` 逐筆增加，且每筆有 trace。
- [ ] 以 platform user 呼叫 turn usage API，確認能看到剛才每一輪。
- [ ] Browser 檢查 `/dashboard` assistant、`/interview`、`/theater`、`/super-admin` 無 console error、無水平 overflow。

---

## 7. 可立即使用的人工測試腳本

在下一輪實作前，人工測試應先用「可玩性」和「可稽核性」分開判斷：

1. 啟動 dev server，確認 `OPENAI_API_KEY`、demo auth header、必要 Supabase env 都存在。
2. 以 demo member 登入或使用 dev auth header。
3. 在任一 dashboard 頁打開 `問誠問 AI`，送出一輪「請帶我去客戶管理」。
4. 到 `/interview` 選一位 client，開始訪談並送出一輪回答。
5. 到 `/theater?demo=quickstart&autoCreate=true` 或先建立 completed SPIN，再開始劇場演練並送出一輪回應。
6. 用 platform user 打 `/api/platform/ai-usage`，只能確認 aggregate 增加。
7. 目前若要查逐輪，只能直接查 DB：`ai_usage_logs` 加 `interaction_events` / `assistant_conversations` / `assistant_messages`，這不符合 super admin UI 驗收。

---

## 8. 風險與紅線

- 不得把 sidebar hide/show 當成權限控制；super admin turn usage API 必須用 platform route guard。
- 不得在 super admin 預設畫面暴露 raw client private payload、完整 transcript、policy details 或 secret。
- Theater Route B 尚未完成時，不得把 legacy theater flow 宣稱為 production-ready；可標示為 demo/staging 演示。
- 不得改 SPIN `SITUATION → PROBLEM → IMPLICATION → NEED_PAYOFF` 狀態機。
- 不得刪除或 optional 化 client/policy 合規欄位。
- 所有 provider call success/error 都必須保留 `AiUsageLog`。

---

## 9. 本研究引用的本地證據

- `src/components/layout/sidebar.tsx`：三 AI 入口與 `/interview`、`/theater`、`SPIN 舊版` 並存。
- `src/app/api/ai/chat/route.ts`：chat session-scoped route、stream usage、success/error logging。
- `src/lib/assistant/assistant-chat-repository.ts`：chat persistence 與 `AiUsageLog(module=CHAT)`。
- `src/app/(dashboard)/interview/page.tsx`：DB persistent session 與 AI request session id/client id 不一致缺口。
- `src/app/api/ai/interview/route.ts`：interview stream、micro plan、`AiUsageLog(module=INTERVIEW)`。
- `src/lib/interview/interview-ai-repository.ts`：interview usage 與 `InteractionEvent` metadata。
- `src/app/(dashboard)/theater/page.tsx`：theater 啟動依賴 local completed SPIN source。
- `src/app/(dashboard)/theater/[sessionId]/page.tsx`：theater turn call body 與 score call body。
- `src/app/api/ai/theater/route.ts`：legacy theater gate、session-scoped usage logging。
- `src/lib/theater/theater-ai-repository.ts`：theater usage 與 `InteractionEvent` metadata。
- `src/lib/platform/platform-read-repository.ts`：`getPlatformAiUsage()` 目前只提供 aggregate。
- `src/app/(super-admin)/super-admin/page.tsx`：super admin 目前顯示 release readiness 與 quota aggregate，沒有逐輪明細。
- `prisma/schema.prisma`：`AiUsageLog` 目前沒有 conversation/session/turn trace 欄位。
