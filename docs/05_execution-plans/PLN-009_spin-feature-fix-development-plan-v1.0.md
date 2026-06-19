# SPIN 問答流程修復開發計劃 v1.0

| 文件版本 | v1.0 |
| :--- | :--- |
| 建立日期 | 2026 年 5 月 15 日 |
| 適用版本 | v0.5 Beta |
| 問題類型 | 功能缺失 + UX 斷點 |

---

## 一、問題診斷

> 現象：SPIN 對話的四個階段（S → P → I → N）無法完整走完，部分階段卡住無法推進，且使用者體驗存在多處斷點。

### Bug 1 — Mock API 只完整實作 SITUATION 一個階段

**位置：** `src/app/api/mock/ai/spin/route.ts`

**問題：**

```
SELF_CLARIFY 模式
├── SITUATION   → 有完整回應 + [[PHASE_COMPLETE]] ✓
├── PROBLEM     → 有回應，但 缺少 [[PHASE_COMPLETE]] ✗  ← 使用者卡在此
├── IMPLICATION → 走 default，無意義通用回應，無 [[PHASE_COMPLETE]] ✗
├── NEED_PAYOFF → 走 default，無意義通用回應，無 [[PHASE_COMPLETE]] ✗
└── COMPLETE    → 走 default，顯示不相關文字 ✗

QUESTION_DESIGN 模式
└── 全部階段 → 完全相同的固定回應，無階段感知，無 [[PHASE_COMPLETE]] ✗
```

**影響：** 使用者在 PROBLEM 階段後再也收不到「進入下一步」的 Toast，對話流程實質上在第一次回應後就停止推進。

---

### Bug 2 — Streaming 期間顯示原始標記給使用者

**位置：** `src/app/(dashboard)/spin/[sessionId]/page.tsx` 第 112–115 行

**問題：**

串流過程中，`fullText` 直接被設定為訊息內容，使用者在 AI 打字過程中看到：

```
了解。針對王大明的情境...[[INSIGHT:客戶目前的年收入為 120萬，屬於家庭主要經濟來源]] 你可以試著...[[QUESTION:...]] [[PHASE_COMPLETE]]
```

`cleanResponse()` 只在串流**結束後**（第 137 行）才被呼叫，清理結果只更新了儲存的訊息，但 streaming 期間畫面上的標記無法消除。

---

### Bug 3 — COMPLETE 階段後無 CTA，使用者不知道下一步

**位置：** `src/app/(dashboard)/spin/[sessionId]/page.tsx` 第 291–329 行

**問題：**

到達 COMPLETE 後，畫面上只有一個小 Badge 寫「準備生成拜訪摘要報告」，旁邊是一個 `<ArrowRight />` 圖示，但兩者都**沒有連結**，點了無反應。

- 沒有展示 summary 的關鍵摘要內容（keyInsights、keyProblems、suggestedActions）
- 輸入框還在，讓使用者以為還可以繼續打字
- 沒有「前往生成報告」或「前往劇場演練」的導航按鈕

---

### Bug 4 — 手動進入下一階段只靠 Toast，無明確 UI 操作點

**位置：** `src/app/(dashboard)/spin/[sessionId]/page.tsx` 第 128–134 行

**問題：**

唯一可以推進到下一階段的方式是 AI 回應包含 `[[PHASE_COMPLETE]]` 時跳出的 Toast，且 Toast 會自動消失。

- Phase Stepper（四格進度條）是純裝飾，不能點擊
- 沒有任何固定顯示的「進入下一階段」按鈕
- 使用者如果錯過 Toast 就完全無法前進（PROBLEM、IMPLICATION、NEED_PAYOFF 三個階段）

---

### Bug 5 — 進度顯示為英文代碼，缺乏可讀性

**位置：** `src/app/(dashboard)/spin/[sessionId]/page.tsx` 第 196 行

**問題：**

```tsx
<p>當前進度：{session.phase}</p>
// 顯示：當前進度：NEED_PAYOFF
```

使用者看到的是 `SITUATION / PROBLEM / IMPLICATION / NEED_PAYOFF`，沒有中文說明。

---

### Bug 6 — Phase Stepper isActive 邏輯定義混用

**位置：** `src/app/(dashboard)/spin/[sessionId]/page.tsx` 第 215–217 行

**問題：**

```tsx
const isActive = currentIdx >= i;   // 當前及之前的都是 active
const isCurrent = currentIdx === i; // 當前階段
```

`isActive` 包含了「當前階段」，導致 CSS 判斷時需要靠 render 順序（`isCurrent` 要先判斷）來避免樣式衝突，邏輯不清晰。應改為：

```tsx
const isCompleted = currentIdx > i;  // 已完成
const isCurrent = currentIdx === i;  // 當前進行中
```

---

## 二、修復範圍與優先順序

| 優先級 | Bug | 影響程度 | 修復難度 | 預估工時 |
| :---: | :--- | :---: | :---: | :---: |
| P0 | Bug 1：Mock API 階段缺失 | 核心功能不可用 | 低 | 1h |
| P0 | Bug 2：Streaming 顯示原始標記 | 嚴重 UX 問題 | 低 | 0.5h |
| P1 | Bug 3：COMPLETE 後無 CTA | 流程無法閉環 | 中 | 2h |
| P1 | Bug 4：缺乏固定的進階按鈕 | 操作無出口 | 低 | 1h |
| P2 | Bug 5：進度顯示英文代碼 | 可讀性差 | 極低 | 0.25h |
| P2 | Bug 6：isActive 邏輯 | 程式碼可維護性 | 極低 | 0.25h |

**總預估工時：5 小時**

---

## 三、各 Bug 修復方案

### 修復 Bug 1 — 補完 Mock API 所有階段

**檔案：** `src/app/api/mock/ai/spin/route.ts`

#### SELF_CLARIFY 模式，補齊所有 case：

```typescript
// PROBLEM 補加 [[PHASE_COMPLETE]]
case "PROBLEM":
  responseText = `很好。既然我們知道 ${clientContext.profile.name} 的固定開銷比例高，下一步要引發「問題意識」。

[[INSIGHT:高額固定支出代表風險緩衝薄弱，一旦收入中斷衝擊極大]]

你可以問他：如果這份收入突然中斷，目前的存款可以支撐家庭多久？

[[QUESTION:如果收入突然中斷，目前的存款可以支撐家庭多久？]]

這會讓他開始意識到現有保障的不足。如果他已有反應（驚訝、沉默、或主動詢問），這個階段的目標已達成。

[[PHASE_COMPLETE]]`;
  break;

// 新增 IMPLICATION case
case "IMPLICATION":
  responseText = `進入暗示階段——讓 ${clientContext.profile.name} 感受到「不處理的代價」有多重。

[[INSIGHT:問題若不解決，家庭財務可能在突發事件時崩潰，孩子教育與房貸同時受衝擊]]

試著這樣問他：「如果這個缺口沒有填補，您估計家人最快多久會感受到生活品質的改變？」

[[QUESTION:如果這個缺口沒有填補，您估計家人最快多久會感受到生活品質的改變？]]

當他開始描述具體的擔憂或影響時，暗示階段任務完成。

[[PHASE_COMPLETE]]`;
  break;

// 新增 NEED_PAYOFF case
case "NEED_PAYOFF":
  responseText = `最後一步——讓 ${clientContext.profile.name} 自己說出需要的解決方案。

[[INSIGHT:客戶自己說出需求，比業務推銷的說服力高出數倍]]

引導問題：「如果有一個方案，能確保您萬一無法工作時家人生活不受影響，您覺得這件事值得認真規劃嗎？」

[[QUESTION:如果有一個方案能確保萬一無法工作時家人生活不受影響，您覺得值得認真規劃嗎？]]

當他回答「值得」或主動詢問方案細節，這是最強的購買訊號，SPIN 完整閉環。

[[PHASE_COMPLETE]]`;
  break;

// 新增 COMPLETE case（不應再回應，但防呆）
case "COMPLETE":
  responseText = `SPIN 對話已完成。你可以點擊上方按鈕前往生成報告或開始劇場演練。`;
  break;
```

#### QUESTION_DESIGN 模式，加入階段分支：

```typescript
} else {
  // QUESTION_DESIGN Mode — 按階段設計不同提問
  switch (phase) {
    case "SITUATION":
      responseText = `針對 ${clientContext.profile.name} 的現況，以下是可直接使用的開場問題：

1.「請問您目前的工作是固定薪資還是浮動收入為主？」
[[QUESTION:請問您目前的工作是固定薪資還是浮動收入為主？]]

2.「家裡現在每個月大概有哪些固定的大支出？（房貸/車貸/孩子教育等）」
[[QUESTION:家裡現在每個月大概有哪些固定的大支出？]]

[[INSIGHT:從具體數字切入，比抽象問題更容易讓客戶開口]]

[[PHASE_COMPLETE]]`;
      break;

    case "PROBLEM":
      responseText = `PROBLEM 階段的目標是讓 ${clientContext.profile.name} 意識到現有保障的不足：

1.「如果您突然生病住院三個月，目前的保險能幫您負擔多少醫療費用？」
[[QUESTION:如果您突然生病住院三個月，目前的保險能幫您負擔多少醫療費用？]]

2.「您有沒有估算過，如果收入中斷，現有存款大概能撐多久？」
[[QUESTION:您有沒有估算過，如果收入中斷，現有存款大概能撐多久？]]

[[INSIGHT:用「中斷」而非「消失」，語氣更溫和但效果一樣強]]

[[PHASE_COMPLETE]]`;
      break;

    case "IMPLICATION":
      responseText = `IMPLICATION 階段——讓 ${clientContext.profile.name} 具體感受到問題的連鎖影響：

1.「如果這個情況發生，您覺得孩子的教育計畫會受到影響嗎？」
[[QUESTION:如果這個情況發生，您覺得孩子的教育計畫會受到影響嗎？]]

2.「這段期間家裡的開銷，主要會由誰來承擔？」
[[QUESTION:這段期間家裡的開銷，主要會由誰來承擔？]]

[[INSIGHT:讓客戶說出「家人會受影響」，比你說更有力]]

[[PHASE_COMPLETE]]`;
      break;

    case "NEED_PAYOFF":
      responseText = `NEED_PAYOFF 最終階段——讓 ${clientContext.profile.name} 主動表達需求：

1.「如果能有一個方案，萬一您無法工作，家人的生活和孩子的教育都不受影響，您覺得這值得認真考慮嗎？」
[[QUESTION:如果能有一個方案讓家人生活不受影響，您覺得這值得認真考慮嗎？]]

2.「對您來說，什麼樣的保障方式最符合現在的需求？」
[[QUESTION:對您來說，什麼樣的保障方式最符合現在的需求？]]

[[INSIGHT:在 Need-Payoff 讓客戶主動描述需求，成交率提升 3 倍]]

[[PHASE_COMPLETE]]`;
      break;

    default:
      responseText = `SPIN 對話已完成，感謝你的使用。`;
  }
}
```

---

### 修復 Bug 2 — Streaming 期間即時清理標記

**檔案：** `src/app/(dashboard)/spin/[sessionId]/page.tsx`

**修改第 112–115 行**，在 streaming 更新訊息時先清理標記：

```tsx
// Before（有問題）
setMessages(prev => {
  const last = prev[prev.length - 1];
  return [...prev.slice(0, -1), { ...last, content: fullText }];
});

// After（修復）
setMessages(prev => {
  const last = prev[prev.length - 1];
  return [...prev.slice(0, -1), { 
    ...last, 
    content: spinService.cleanResponse(fullText)  // 即時清理
  }];
});
```

同時，第 137–140 行的 finalContent 邏輯保持不變（清理後存入 store）：

```tsx
// 維持不變，streaming 結束後再次清理並儲存
const finalContent = spinService.cleanResponse(fullText);
const finalMsg = { ...assistantMsg, content: finalContent, isStreaming: false };
setMessages(prev => [...prev.slice(0, -1), finalMsg]);
addMessage(sessionId, finalMsg);
```

---

### 修復 Bug 3 — COMPLETE 階段完整 CTA 與摘要展示

**檔案：** `src/app/(dashboard)/spin/[sessionId]/page.tsx`

**方案：** 當 `session.phase === "COMPLETE"` 時，替換輸入區域為摘要卡片 + 操作按鈕。

**修改 Input area 區段（第 290–329 行）：**

```tsx
{/* Input area */}
<div className="pt-6">
  {session.phase === "COMPLETE" ? (
    /* COMPLETE 狀態：顯示摘要 + CTA */
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
      {/* 完成標題 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <p className="font-bold text-sm">SPIN 對話完成</p>
          <p className="text-xs text-zinc-400">已整理 {session.transitions.length} 個階段的洞察</p>
        </div>
      </div>

      {/* 摘要內容 */}
      {session.summary && (
        <div className="space-y-3">
          {session.summary.keyInsights.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">情境洞察</p>
              <div className="flex flex-wrap gap-1.5">
                {session.summary.keyInsights.map((insight, i) => (
                  <Badge key={i} className="bg-blue-50 text-blue-700 border-none text-xs font-medium">
                    {insight}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {session.summary.keyProblems.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">發現問題</p>
              <div className="flex flex-wrap gap-1.5">
                {session.summary.keyProblems.map((problem, i) => (
                  <Badge key={i} className="bg-amber-50 text-amber-700 border-none text-xs font-medium">
                    {problem}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {session.summary.suggestedActions.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">建議行動</p>
              <div className="flex flex-wrap gap-1.5">
                {session.summary.suggestedActions.map((action, i) => (
                  <Badge key={i} className="bg-green-50 text-green-700 border-none text-xs font-medium">
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTA 按鈕區 */}
      <div className="flex gap-3 pt-2">
        <Button 
          className="flex-1 rounded-2xl bg-[#1A3A6B] hover:bg-[#1565C0] font-bold gap-2"
          onClick={() => router.push(`/reports?fromSpin=${sessionId}&clientId=${session.clientId}`)}
        >
          <FileText className="w-4 h-4" /> 生成客戶報告
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 rounded-2xl font-bold gap-2 border-zinc-200"
          onClick={() => router.push(`/theater?fromSpin=${sessionId}&clientId=${session.clientId}`)}
        >
          <Swords className="w-4 h-4" /> 前往劇場演練
        </Button>
      </div>
    </div>
  ) : (
    /* 一般狀態：輸入框 */
    <div className="bg-white dark:bg-zinc-900 p-2 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl focus-within:ring-2 ring-[#1565C0]/20 transition-all">
      <Textarea 
        placeholder={session.mode === "SELF_CLARIFY" ? "告訴 AI 你現在掌握到的情況..." : "詢問 AI 該如何設計提問..."}
        className="border-none bg-transparent min-h-[50px] max-h-[150px] resize-none focus-visible:ring-0 px-4 pt-4 text-sm font-medium"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="text-[10px] text-zinc-400 font-bold ml-2">Press Enter to Send</span>
        <Button 
          size="icon" 
          className={cn(
            "rounded-2xl w-10 h-10 transition-all",
            input.trim() ? "bg-[#1A3A6B] hover:bg-[#1565C0] shadow-lg shadow-[#1565C0]/30" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          )}
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )}
</div>
```

**新增 icon import：**

```tsx
import { CheckCircle2, FileText, Swords } from "lucide-react";
```

---

### 修復 Bug 4 — 加入固定顯示的「進入下一階段」按鈕

**檔案：** `src/app/(dashboard)/spin/[sessionId]/page.tsx`

**方案：** 在 Phase Stepper 下方、Phase Outputs 上方加入一個固定按鈕，當有 output 產生後啟用。

**插入位置：** 第 234 行之後、第 236 行之前

```tsx
{/* 手動進入下一階段按鈕 */}
{session.phase !== "COMPLETE" && (
  <div className="flex items-center justify-between mb-3">
    <span className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">
      {phaseLabel[session.phase]} 階段
    </span>
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "rounded-xl font-bold text-xs gap-1.5 h-7 px-3 transition-all",
        session.outputs[session.phase as keyof typeof session.outputs]?.length > 0
          ? "border-[#1565C0]/30 text-[#1565C0] hover:bg-[#EBF3FB]"
          : "border-zinc-200 text-zinc-300 cursor-not-allowed"
      )}
      disabled={
        (session.outputs[session.phase as keyof typeof session.outputs]?.length ?? 0) === 0 ||
        isTyping
      }
      onClick={() => handleAdvancePhase("USER")}
    >
      進入下一階段 <ArrowRight className="w-3 h-3" />
    </Button>
  </div>
)}
```

**同時在 page 頂部加入 phaseLabel 對照表：**

```tsx
const phaseLabel: Record<string, string> = {
  SITUATION: "情境",
  PROBLEM: "問題",
  IMPLICATION: "暗示",
  NEED_PAYOFF: "需求",
  COMPLETE: "完成",
};
```

---

### 修復 Bug 5 — 進度顯示改為中文

**檔案：** `src/app/(dashboard)/spin/[sessionId]/page.tsx` 第 196 行

```tsx
// Before
<p className="text-xs text-zinc-500 font-medium tracking-wide">當前進度：{session.phase}</p>

// After
<p className="text-xs text-zinc-500 font-medium tracking-wide">
  當前進度：{phaseLabel[session.phase] ?? session.phase}
</p>
```

---

### 修復 Bug 6 — Phase Stepper isActive 邏輯語義化

**檔案：** `src/app/(dashboard)/spin/[sessionId]/page.tsx` 第 215–217 行

```tsx
// Before（語義不清）
const isActive = currentIdx >= i;
const isCurrent = currentIdx === i;

// After（語義清晰）
const isCompleted = currentIdx > i;
const isCurrent = currentIdx === i;
```

同時更新 className 引用：

```tsx
// Before
isCurrent ? "bg-[#1A3A6B] ..." : (isActive ? "bg-[#2196F3]" : "bg-zinc-100 ...")
isCurrent ? "text-[#1565C0]" : (isActive ? "text-zinc-500 font-bold" : "text-zinc-300 ...")

// After
isCurrent ? "bg-[#1A3A6B] ..." : (isCompleted ? "bg-[#2196F3]" : "bg-zinc-100 ...")
isCurrent ? "text-[#1565C0]" : (isCompleted ? "text-zinc-500 font-bold" : "text-zinc-300 ...")
```

---

## 四、開發任務清單

```
任務 1（P0）補完 Mock API                          預估：1h
  1-1  SELF_CLARIFY 模式補齊 PROBLEM + [[PHASE_COMPLETE]]
  1-2  SELF_CLARIFY 模式新增 IMPLICATION case
  1-3  SELF_CLARIFY 模式新增 NEED_PAYOFF case
  1-4  SELF_CLARIFY 模式新增 COMPLETE 防呆 case
  1-5  QUESTION_DESIGN 模式加入 switch(phase) 分支

任務 2（P0）修復 Streaming 顯示原始標記              預估：0.5h
  2-1  串流 setMessages 時先呼叫 cleanResponse

任務 3（P1）實作 COMPLETE 摘要卡片與 CTA 按鈕         預估：2h
  3-1  import CheckCircle2, FileText, Swords
  3-2  將 COMPLETE 後的輸入框替換為摘要卡片
  3-3  加入摘要三區塊（情境洞察 / 發現問題 / 建議行動）
  3-4  加入「生成客戶報告」按鈕（→ /reports）
  3-5  加入「前往劇場演練」按鈕（→ /theater）

任務 4（P1）加入固定顯示的「進入下一階段」按鈕         預估：1h
  4-1  在 page 頂部加入 phaseLabel 對照表
  4-2  在 Phase Outputs 上方插入進階按鈕
  4-3  當 outputs 為空時按鈕 disabled；有 output 後啟用

任務 5（P2）進度顯示中文化                          預估：0.25h
  5-1  Header 進度顯示改用 phaseLabel

任務 6（P2）Phase Stepper 邏輯語義化               預估：0.25h
  6-1  isActive 改名為 isCompleted
  6-2  條件改為 currentIdx > i
  6-3  更新對應 className 引用
```

**總預估工時：5 小時**

---

## 五、修復後的完整流程體驗

```
使用者進入 SPIN 對話頁面
    ↓
Phase Stepper 顯示：情境 / 問題 / 暗示 / 需求（中文）
    ↓
輸入訊息 → AI 回應（串流，無原始標記）
    ↓
「情境洞察」Badge 出現 → 「進入下一階段」按鈕啟用
    ↓
Toast 提示「AI 建議進入下一步」（可點擊） OR 使用者點擊按鈕（固定可見）
    ↓
切換到 PROBLEM 階段 → 繼續對話 → 收到 [[PHASE_COMPLETE]]
    ↓
切換到 IMPLICATION → 繼續對話 → 收到 [[PHASE_COMPLETE]]
    ↓
切換到 NEED_PAYOFF → 繼續對話 → 收到 [[PHASE_COMPLETE]] 或點「結束對話」
    ↓
進入 COMPLETE 狀態
    ↓
輸入框消失 → 顯示摘要卡片（情境洞察 / 發現問題 / 建議行動）
    ↓
「生成客戶報告」→ /reports   「前往劇場演練」→ /theater
```

---

## 六、不在本次修復範圍

以下項目確認存在但不在本計劃範圍，留待後續版本：

| 項目 | 說明 | 規劃版本 |
| :--- | :--- | :--- |
| Phase Stepper 可點擊切換 | 可能導致跳過 AI 引導，需確認產品方向 | v0.6 |
| QUESTION_DESIGN 模式品質提升 | 需接入真實 AI API，Mock 只是過渡 | v1.0 GA |
| 對話歷史跨 session 搜尋 | 需要後端搜尋 API | v1.0 GA |
| 語音模式 | Web Speech API + TTS | v1.0 GA |

---

*文件版本 v1.0 | 2026 年 5 月 15 日 | 誠問 AI 開發團隊內部文件*
