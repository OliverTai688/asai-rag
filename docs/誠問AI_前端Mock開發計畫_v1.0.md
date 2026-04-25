  
**誠問 AI**

*Sincere Question AI*

**純前端 Mock 開發計畫 v1.0  |  Frontend-Only Prototype Plan**

*目的：在不接任何後端、AI API、DB 的前提下，產出完全可操作的前端原型，用於 Demo、早期 UX 驗證、技術 Spike 與招商簡報。*

| 文件版本 | v1.0 (2026-04-24) |
| :---- | :---- |
| **對應規格** | 誠問AI 產品規格文件 v1.0、誠問AI 技術規格文件 NextJS v1.0 |
| **技術基底** | Next.js 16.2.4 (App Router) + React 19 + TypeScript 5 + Tailwind 4 + shadcn (base-nova) + @base-ui/react |
| **範疇** | 純 Client + 假 Route Handler；不接 LLM、DB、Auth、金流、Voice、Pinecone、Stripe、Ably |
| **主要讀者** | 前端工程師、設計師、PM、Demo Stakeholder |

---

# **一、目標與範疇  Scope**

## **1.1 本計畫的目標**

1. 在 **2–3 個開發衝刺（6–8 週）內** 產出一份完全可點擊、可操作、視覺完整的「誠問 AI」前端原型。
2. 所有資料流由 **本地 Mock 層（seed + localStorage + 偽串流 Route Handler）** 提供，零第三方依賴。
3. 每個模組都保留 **清晰的「接真後端接口」注入點**，便於後續階段平滑切換到 tRPC / Vercel AI SDK / Prisma。
4. 聚焦在 **資訊架構、核心互動流程、空/錯/載入狀態** 的完整性，而非效能或規模。

## **1.2 明確 Not-in-scope**

以下功能在此計畫中 **不實作真實版本**，僅保留 UI 殼或以假資料模擬：

- 真實 LLM 呼叫（OpenAI / Claude / Whisper / ElevenLabs）
- 真實驗證與 Session（NextAuth、JWT、OAuth）
- 資料庫與 ORM（PostgreSQL、Prisma）
- 向量搜尋與 RAG（Pinecone、Cohere Rerank）
- 即時推播（Ably、WebSocket）
- 金流（Stripe Webhook、訂閱）
- 語音模式（Web Speech、STT、TTS）— 保留 UI 殼與狀態機，語音相關按鈕 disabled 並標示 Coming Soon
- E2E / Playwright / AI Eval / PromptFoo
- 多租戶資料隔離與 RBAC（改以簡易「切換角色」下拉選單模擬）

---

# **二、技術棧 — 從技術規格書裁剪**

| Layer | 技術規格書 v1.0 | 本計畫採用 | 說明 |
| :---- | :---- | :---- | :---- |
| Framework | Next.js 15 + App Router | **Next.js 16.2.4** + App Router | 已初始化，沿用 |
| Language | TypeScript 5 | TypeScript 5 | 沿用 |
| Style | Tailwind 3 + shadcn/ui | **Tailwind 4 + shadcn (base-nova) + @base-ui/react** | 已安裝完成，沿用 |
| Icon | — | **lucide-react** | components.json 已設定 |
| State (client) | Zustand + TanStack Query | **Zustand**（含 persist middleware）| 無伺服器狀態 → 不需要 TanStack Query |
| Form | React Hook Form + Zod | **React Hook Form + Zod 4** | Zod 已安裝；新增 RHF |
| AI Stream | Vercel AI SDK streamText | **自製 `ReadableStream` Route Handler + 腳本字典** | 模擬逐字回應 |
| Mock Data | — | **Seed TS 檔 + zustand-persist**（localStorage） | 重新整理後資料仍在 |
| Auth | NextAuth v5 | **假 Session Context**（zustand store）| 提供角色切換器 |
| Route Proxy | middleware.ts | **不需要**（無需擋 API） | Next.js 16 已更名為 proxy.ts，本案不使用 |
| i18n | — | **預設 zh-TW**，字串集中於 `src/lib/i18n/strings.ts` | 不接 next-intl，但字串不散落 |

**額外建議套件（Phase 0 安裝）：**

- `react-hook-form`、`@hookform/resolvers`
- `date-fns`（+ `date-fns/locale/zh-TW`）
- `nanoid`（mock ID 產生）
- `sonner`（Toast，取代自建）
- `cmdk`（AI 助手 Command Palette）
- `recharts`（團隊儀表板用；Phase 7 才裝）

---

# **三、架構總覽  Architecture**

## **3.1 目錄結構（規劃）**

```
src/
├── app/
│   ├── layout.tsx                    # Root layout（已存在，需改為 zh-TW + Toaster）
│   ├── page.tsx                      # Landing / 導向 /dashboard
│   ├── (dashboard)/                  # Route group：帶 Sidebar + AssistantFAB
│   │   ├── layout.tsx                # Shell：Sidebar + TopBar + AssistantFAB
│   │   ├── dashboard/page.tsx        # 首頁總覽
│   │   ├── spin/
│   │   │   ├── page.tsx              # SPIN 對話列表
│   │   │   └── [sessionId]/page.tsx  # 單次 SPIN 對話
│   │   ├── theater/
│   │   │   ├── page.tsx
│   │   │   └── [sessionId]/page.tsx
│   │   ├── crm/
│   │   │   ├── page.tsx              # 客戶列表
│   │   │   └── [clientId]/
│   │   │       ├── page.tsx          # 360° 檢視
│   │   │       ├── gap-analysis/page.tsx
│   │   │       └── timeline/page.tsx
│   │   ├── pre-visit/
│   │   │   ├── page.tsx              # 規劃列表
│   │   │   └── [planId]/page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx              # 報告列表
│   │   │   └── [reportId]/page.tsx   # 報告編輯器
│   │   ├── team/page.tsx             # 團隊管理後台
│   │   └── settings/page.tsx         # 帳號 / 角色切換
│   ├── share/[token]/
│   │   └── page.tsx                  # 公開客戶報告頁（獨立 layout）
│   └── api/
│       ├── rag/route.ts              # (已存在, Phase 0 移除或轉為 mock)
│       └── mock/
│           ├── ai/
│           │   ├── spin/route.ts     # SPIN 偽串流
│           │   ├── theater/route.ts  # 劇場偽串流
│           │   ├── assistant/route.ts# 全頁助手偽串流
│           │   └── report/route.ts   # 報告生成偽串流
│           └── track/[token]/route.ts# 接收 share 頁 beacon（寫入 store）
├── components/
│   ├── ui/                           # shadcn 原件（button 已有；Phase 0 補齊）
│   ├── layout/                       # Sidebar, TopBar, PageHeader
│   ├── ai-assistant/                 # FAB, Panel, Tool renderers
│   ├── spin/                         # PhaseStepper, MessageList, MessageBubble
│   ├── theater/                      # PersonaCard, RolePlayChat, ScoreReport
│   ├── crm/                          # ClientCard, GapChart, TimelineItem, FamilyTree
│   ├── report/                       # SectionBlock, ShareLinkCard, CTAButtonsEditor
│   └── shared/                       # EmptyState, ErrorBoundary, PageSpinner
├── domains/                          # (已有 rag/，以此為 pattern)
│   ├── session/                      # 假 session 與角色
│   ├── client/                       # CRM 客戶 Model + mocks + store
│   ├── spin/                         # SPIN session / message Model
│   ├── theater/                      # Theater session / persona
│   ├── visit/                        # 訪前規劃
│   ├── report/                       # 報告 / 分享 / 追蹤事件
│   ├── assistant/                    # 全頁 AI 助手狀態與工具
│   ├── team/                         # 團隊績效 mocks
│   └── ai-mock/                      # 偽 AI 腳本字典、串流工具
│       ├── stream.ts                 # 共用 ReadableStream 工具
│       ├── scripts/
│       │   ├── spin.ts               # 依 phase 的預設回應集合
│       │   ├── theater.ts            # 依 persona 的對話分支
│       │   ├── assistant.ts          # 依 intent 的工具呼叫
│       │   └── report.ts             # 報告 section 模板
│       └── delay.ts                  # 可調整的假延遲
├── lib/
│   ├── utils.ts                      # (已有，cn())
│   ├── format.ts                     # date / currency / percent
│   └── i18n/strings.ts               # 集中字串
└── stores/                           # (若不想放 domains 就統一放這裡)
```

> **設計原則：** 一個模組 = 一個 `src/domains/<name>/` 資料夾，內含 `types.ts` / `mocks.ts` / `store.ts` / `service.ts`（`service.ts` 即未來接真後端的注入點）。UI 層僅透過 `service.ts` 拿資料，**絕對不直接 import mocks**，確保未來一行改動即可切換。

## **3.2 狀態管理策略**

| 狀態類型 | 工具 | 範例 |
| :---- | :---- | :---- |
| 全域 UI | Zustand (無 persist) | AI 助手開關、Toast、Sidebar 折疊 |
| 業務資料（可變更）| Zustand + `persist` middleware（localStorage）| clients、spin sessions、reports、theater、plans |
| 假 Session | Zustand + persist | 目前登入 user、role、org |
| 串流訊息 | `useState` + `fetch()` + `ReadableStream`.getReader() | SPIN / Theater / Assistant 對話 |
| 表單 | React Hook Form + Zod | 客戶新增、報告編輯、訪前規劃 |
| URL 狀態 | `searchParams` + `useSearchParams()` | 列表篩選、排序、分頁 |

**Store 清單與 key：**

- `sincerely:v1:session` — `{ user, role, orgId }`
- `sincerely:v1:clients` — `Client[]`
- `sincerely:v1:spin` — `{ sessions, messagesBySession }`
- `sincerely:v1:theater` — `{ sessions, turnsBySession }`
- `sincerely:v1:visits` — `VisitPlan[]`
- `sincerely:v1:reports` — `{ reports, shares, events }`
- `sincerely:v1:assistant` — `{ open, contextRoute, messages }`

## **3.3 假 AI 串流設計**

1. 前端呼叫 `POST /api/mock/ai/<module>`，body 含 `scenario` / `phase` / `personaType` / `messages`。
2. Route Handler 回傳 `ReadableStream`，內部 `async iterator` 以 30–80ms 間隔 enqueue 一個字（含中文分詞）。
3. 腳本檔 `domains/ai-mock/scripts/*.ts` 依 `scenario` 鍵返回字串陣列；落空時使用通用模板。
4. 前端以 `response.body.getReader()` 逐 chunk 解碼並 append 到 message 狀態，視覺上等同真 streaming。
5. 隨機觸發「phase 推進」「工具呼叫」的特殊標記（如 `[[PHASE_COMPLETE]]`、`[[TOOL:navigate:/crm]]`）由前端解析執行。

---

# **四、分階段開發路線圖  Roadmap**

> 以下每階段標示的「人日」為單人估算；實際排期視團隊人力並行。

## **Phase 0 ｜ 地基 Foundation  （~5 人日）**

**目標：** 把所有後續模組共用的地基打好，之後每個 Phase 都能獨立開發。

**交付物：**

1. 安裝 shadcn 所需元件：`card, dialog, sheet, avatar, badge, input, textarea, tabs, select, progress, tooltip, skeleton, dropdown-menu, popover, command, scroll-area, separator, toast (sonner)`
2. 補裝 `react-hook-form`、`@hookform/resolvers`、`date-fns`、`nanoid`、`sonner`、`cmdk`
3. `app/layout.tsx` 改 `lang="zh-TW"`、掛 `<Toaster>`、設定 metadata
4. 建 `(dashboard)/layout.tsx`：左側 Sidebar（8 個模組入口）、頂部 TopBar（Breadcrumb + 角色切換器 + 假頭像）、右下 AssistantFAB 預留位
5. `app/page.tsx` 改為 Landing，一鍵進入 `/dashboard`
6. 建立 Mock 基礎：
   - `domains/session/`：`useSessionStore`、`RoleSwitcher` 元件、三組預設帳號（OWNER / MANAGER / AGENT）
   - `domains/client/mocks.ts`：10 筆台灣風格假客戶（含家庭結構、現有保障、職業、標籤）
   - `domains/ai-mock/stream.ts`：`streamScriptedResponse(chunks, delayMs)` 工具
7. 刪除或改造現有 `src/app/api/rag/route.ts` 為 `/api/mock/ai/assistant/route.ts` 的基礎版
8. 加入 `lib/format.ts`（zh-TW 日期 / 金額格式化）

**驗收：**

- [ ] `pnpm dev` 啟動無錯；`/` 可導到 `/dashboard`
- [ ] Sidebar 八個入口點擊均能切換頁面（即便僅顯示佔位）
- [ ] 角色切換器切換後 TopBar 顯示的身份資訊即時更新
- [ ] Lighthouse accessibility ≥ 90（初始空頁）

---

## **Phase 1 ｜ Dashboard 總覽 + CRM 360°  （~7 人日）**

**目標：** 最重要的「資訊主場」先做出來，讓後續所有 AI 模組都有客戶資料可綁。

**交付物：**

1. **Dashboard 總覽頁** (`/dashboard`)
   - 四張 KPI 卡片（本週 SPIN 次數、待跟進客戶數、未讀閱讀通知、本月報告產出）— 數字由 mock store 計算
   - 「今日任務」清單（模擬：3 個待跟進客戶、2 個生日提醒）
   - 「最近互動」時間軸（從 `events` store 取最新 8 筆）
   - 「客戶閱讀熱度」橫條榜（Phase 5 有真資料後自動亮起）
2. **CRM 列表頁** (`/crm`)
   - 搜尋（name/email）、標籤篩選、狀態篩選（PROSPECT / ACTIVE / CLOSED）
   - 表格／卡片切換
   - 「新增客戶」對話框（Dialog + RHF）
3. **CRM 360° 檢視** (`/crm/[clientId]`)
   - 左側：基本資料 + 家庭結構圖（自製 SVG 小樹狀圖）+ 職業財務 + 標籤（AI 標籤 badge 以不同色系）
   - 右側 Tabs：現有保障 | 互動時間軸 | 保障缺口（路由到 `gap-analysis`）| 報告歷史
   - 底部 CTA：`開始 SPIN 對話`、`訪前規劃`、`生成報告`（按鈕先只做導向）
4. **保障缺口** (`/crm/[clientId]/gap-analysis`) — 靜態圖表：現有 vs 建議保額水平比較；AI 建議方向以 bullet list 靜態呈現（Phase 3 報告再動態生成）
5. **互動時間軸** (`/crm/[clientId]/timeline`) — 從多個 store 聚合（spin / theater / reports / events）

**驗收：**

- [ ] 新增客戶 → 列表立即出現 → 重新整理仍在
- [ ] CRM 360° 所有 tab 可切換，無 console error
- [ ] 空狀態（零客戶時）顯示友善引導
- [ ] RWD：列表頁 ≥ 768px 正常、手機寬度降級為卡片

---

## **Phase 2 ｜ SPIN AI 對話引導（UI 模擬）  （~7 人日）**

**目標：** 展示核心差異化功能；完整 streaming 體驗 + 四階段狀態機。

**交付物：**

1. **SPIN 對話列表** (`/spin`) — 依客戶分組；顯示 phase、訊息數、更新時間；「開始新對話」按鈕
2. **SPIN 對話頁** (`/spin/[sessionId]`)
   - 頂部 `PhaseStepper`：Situation → Problem → Implication → Need-Payoff（可手動跳階，也會由 AI 腳本自動推進）
   - 模式切換：釐清自我 / 設計提問（Tabs）
   - 訊息列（User / Assistant bubbles，支援 Markdown）
   - Composer（`Textarea` + ⏎ 送出）
   - 送出後呼叫 `/api/mock/ai/spin` → 逐字渲染（見 3.3）
   - AI 回應含特殊標記 `[[PHASE_COMPLETE]]` 時，顯示「建議進入下一階段」提示條
   - 完成對話後底部出現「生成報告」「開始演練」兩個 CTA（連到 Phase 3 / 4）
3. 腳本字典：`domains/ai-mock/scripts/spin.ts` — 每個 phase × mode 預備 3–5 段回應，並支援簡單關鍵字命中

**驗收：**

- [ ] 串流效果自然（每 chunk 30–80ms）；中斷後可再送
- [ ] Phase 切換、模式切換、歷史訊息、重新整理後仍保留
- [ ] 客戶 Context：從 CRM 進入時帶入 clientId，Composer 上方顯示綁定客戶 chip
- [ ] 會話摘要（結束 session 時 AI 產出一段 summary，寫入 session metadata）

---

## **Phase 3 ｜ 訪前智能規劃 + AI 雙版報告生成  （~7 人日）**

**目標：** 完成從「規劃 → 拜訪後記 → AI 報告」閉環的前端模擬。

**交付物：**

1. **訪前規劃列表** (`/pre-visit`) + **規劃頁** (`/pre-visit/[planId]`)
   - 輸入：選客戶 + 拜訪目的（初訪/加保/續約/關懷/轉介紹）
   - 一鍵「AI 生成規劃」 → 呼叫 `/api/mock/ai/report`（scenario=plan）串流產出四區塊：業務問題清單、客戶問題清單、對話劇本、時間規劃
   - 每區塊可直接行內編輯（`contentEditable` 或 Textarea 模式切換）
   - 「拜訪後記」區塊：RHF 表單（參與者、會議摘要、結論）→ 送出後追加 AI 情況分析
2. **報告列表** (`/reports`) — 依客戶分組；顯示版本、是否已分享
3. **報告編輯器** (`/reports/[reportId]`)
   - 雙頁籤：業務版 / 客戶版
   - Sections（情況摘要、痛點分析、建議行動、下次重點 / 現況、潛在需求、建議方向）
   - 每個 section：AI 產出 → 可手動覆寫 → `isEdited` badge
   - 工具列：`PDF 預覽`（用 `@react-pdf/renderer` 或簡單 print CSS）、`生成互動頁面` → 進 Phase 5、`複製為 Word 草稿`（純前端 clipboard）
   - 版本切換（mock 版本 list）

**驗收：**

- [ ] 從 SPIN → 報告 的 CTA 能帶入該 session 訊息作為 context
- [ ] 編輯 section → 切 tab → 回來仍保留
- [ ] PDF 預覽至少可在新分頁顯示基本排版
- [ ] 列印樣式（`@media print`）乾淨無多餘 UI

---

## **Phase 4 ｜ 劇場模擬演練（文字模式）  （~6 人日）**

**目標：** 呈現「角色扮演 + 評分」的獨特體驗；語音模式保留 UI 殼。

**交付物：**

1. **演練列表** (`/theater`) — 依客戶或 persona 分組；顯示評分趨勢
2. **演練頁** (`/theater/[sessionId]`)
   - Persona 選擇器：conservative / proactive / skeptical / busy / custom（custom 從 client 自動生成 — 讀 CRM 欄位組字串）
   - 模式：文字（啟用） / 語音（disabled + `Coming Soon` badge）
   - 聊天介面：業務員 vs AI 客戶；AI 回應依 persona 腳本（`scripts/theater.ts`）
   - 側欄即時提示：「客戶剛表達疑慮 — 建議先同理再追問」（從腳本隨機拋）
   - 完成對話：呼叫 `/api/mock/ai/report?scenario=theater-score` → 產出評分報告（5 維度雷達 + 遺漏痛點 + 建議話術 3 點）
   - 歷史回放：時間軸逐 turn 播放（文字逐字動畫）
3. 腳本：每個 persona type 預備「開場 / 中段追問 / 常見反對 / 結尾」四段分支

**驗收：**

- [ ] Persona 切換後 AI 第一句截然不同
- [ ] 評分報告的雷達圖以純 SVG 或 recharts 呈現
- [ ] 語音 tab 點擊時顯示友善提示而非錯誤

---

## **Phase 5 ｜ 客戶互動報告頁 + 閱讀追蹤  （~5 人日）**

**目標：** 展現「業務端 ↔ 客戶端」的雙向互動。

**交付物：**

1. **公開報告頁** (`/share/[token]`)
   - 獨立 layout（不套 Sidebar）
   - 響應式、以客戶版報告 section 為主內容
   - CTA 按鈕區（預約下次諮詢 / 下載 PDF / 立即回覆）— 預約開 Dialog（假送出 + Toast）
   - 自動觸發假 `OPEN` event：`navigator.sendBeacon('/api/mock/track/<token>', …)`
   - `IntersectionObserver` 追蹤 section 閱讀進度 → 寫入 `events` store
2. **分享管理** — 在報告編輯器 (`/reports/[id]`) 的側邊面板：
   - 生成短網址（`/share/<nanoid>`）、到期時間、密碼保護（UI only）
   - QR Code（`qrcode.react`）
   - 即時互動儀表板：開啟次數 / 閱讀進度分布 / 最後開啟時間（從 events store 反推）
3. **通知中心**（TopBar 鈴鐺）：模擬「客戶 A 剛打開您的報告」即時 toast（每 30s 隨機觸發一次，可關閉）

**驗收：**

- [ ] 從報告頁生成連結 → 新分頁打開 → 業務端儀表板數字 +1
- [ ] Section 滾過後，儀表板進度條對應更新
- [ ] 公開頁在無 session 下可正常瀏覽（不會被 dashboard layout 包到）

---

## **Phase 6 ｜ 全頁 AI 助手 FAB  （~5 人日）**

**目標：** 把前面五個 Phase 打通的「跨模組助理」，是產品最大殺手鐧。

**交付物：**

1. **FAB 按鈕**：右下角固定；點擊開啟右側 Sheet（也支援快捷鍵 `⌘K`）
2. **Sheet 面板**
   - 上方：情境感知橫條顯示「您在 CRM > 王大明」
   - 主體：Tab 切換（問知識 / 客戶洞察 / 執行動作）
     - 問知識：對話介面，呼叫 `/api/mock/ai/assistant?scenario=rag`；回應附假引用來源卡片
     - 客戶洞察：自動生成當前客戶的「缺口摘要 / 最近互動重點 / 建議下一步」三段
     - 執行動作：Command Palette（`cmdk`），列出指令：`建立客戶`、`找出本月未追蹤`、`導到 SPIN`、`生成報告`
3. **Tool Calls 機制**：助手回應可含 `[[TOOL:navigate:/crm/cxxx]]`、`[[TOOL:create-client:{...}]]`、`[[TOOL:list-unfollowed]]` → 前端 parser 執行對應動作（`router.push`、`store.add`）並在對話中顯示「已為您執行」卡片
4. **情境注入**：`pathname` + `currentClientId`（從 URL 或 zustand）傳給 Mock 端供腳本選用

**驗收：**

- [ ] 在 `/crm/c1` 點 FAB → 助手自動顯示該客戶身份
- [ ] 指令「幫我建立王小明的新客戶檔案」→ 真的在 `clients` store 新增一筆並導到該客戶
- [ ] 助手 Sheet 打開時不阻擋主頁面互動（overlay 半透明）

---

## **Phase 7 ｜ 團隊管理後台  （~4 人日）**

**目標：** 給 MANAGER / OWNER 看的視角，呈現管理端的價值主張。

**交付物：**

1. **團隊首頁** (`/team`)
   - 僅 MANAGER / OWNER 可見（AGENT 進入顯示 403 殼）
   - KPI 卡：團隊 SPIN 次數週比、報告產出、演練頻率、平均評分
   - 業務員績效表：姓名 / 本週 SPIN / 演練數 / 客戶互動率 / AI 建議 badge
   - 排行與上期對比（recharts BarChart / LineChart）
2. **AI 輔導建議面板**：列出三位「建議優先輔導」業務員 + 建議方向（腳本靜態）
3. 假匯出按鈕（生成 CSV Blob 下載）
4. **設定頁** (`/settings`)：更清楚的角色切換、品牌色預覽、語系（只顯示 zh-TW）

**驗收：**

- [ ] 切換角色為 AGENT → Sidebar 的「團隊」入口隱藏
- [ ] 圖表在黑暗模式下可讀
- [ ] CSV 下載內容符合顯示資料

---

## **Phase 8 ｜ 打磨 & 交付  （~4 人日）**

**目標：** 讓原型有「準正式版」的質感。

**交付物：**

- 所有頁面 `loading.tsx`（Skeleton）+ `error.tsx`（Error boundary）+ `not-found.tsx`
- 全域 404 / 500
- Empty state 圖像化（蒐集一組 Lucide + 插圖）
- 鍵盤快捷鍵：`⌘K` 打開助手、`⌘/` 聚焦搜尋、`⌘B` 折疊 Sidebar
- A11y：Tab order、aria-label、`prefers-reduced-motion` 尊重、對比 AA
- 黑暗模式全面檢查
- RWD：每頁在 375 / 768 / 1280 / 1536 下視覺審查
- 一組 Demo 劇本（README 更新）：「給 Stakeholder 的 5 分鐘導覽」

**驗收：**

- [ ] 所有頁面 Lighthouse Accessibility ≥ 90、Best Practices ≥ 90
- [ ] `pnpm build` 無 warning
- [ ] 瀏覽一整輪流程零 console error

---

# **五、Mock 資料與假 AI 詳規**

## **5.1 Mock 客戶樣板**

```ts
// domains/client/mocks.ts (節錄)
export const SEED_CLIENTS: Client[] = [
  {
    id: 'c_wang',
    name: '王大明',
    birthDate: '1985-03-12',
    occupation: '科技業中階主管',
    annualIncome: 1_800_000,
    family: [
      { relation: '配偶', name: '林小美', age: 38 },
      { relation: '子', name: '王小明', age: 8 },
      { relation: '女', name: '王小美', age: 5 },
    ],
    existingPolicies: [ /* 2–3 張，標出保額缺口 */ ],
    tags: ['高意向', '雙薪家庭'],
    aiTags: ['子女教育金缺口', '醫療險不足'],
    status: 'ACTIVE',
  },
  // ... 9 筆風格各異的假客戶（保守型退休族、忙碌型老闆、疑慮型年輕人…）
]
```

## **5.2 假 AI 腳本結構**

```ts
// domains/ai-mock/scripts/spin.ts
export const SPIN_SCRIPTS: Record<SpinMode, Record<SpinPhase, string[]>> = {
  SELF_CLARIFY: {
    SITUATION: [
      '先釐清幾件事：這位客戶的家庭結構目前是…？',
      '他現有的保障是否包含重大疾病與失能？',
      // ...
    ],
    PROBLEM: [ /* … */ ],
    IMPLICATION: [ /* … */ ],
    NEED_PAYOFF: [ /* … */ ],
    COMPLETE: [ '[[PHASE_COMPLETE]] 我已整理出關鍵洞察，建議生成報告。' ],
  },
  QUESTION_DESIGN: { /* … */ },
}
```

## **5.3 串流工具**

```ts
// domains/ai-mock/stream.ts
export function streamScriptedResponse(
  fullText: string,
  opts: { chunkSize?: number; delayMs?: [number, number] } = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const chunks = [...fullText] // 逐字（含中文單字）
  const { delayMs = [30, 80] } = opts
  return new ReadableStream({
    async pull(controller) {
      if (chunks.length === 0) return controller.close()
      const delay = delayMs[0] + Math.random() * (delayMs[1] - delayMs[0])
      await new Promise((r) => setTimeout(r, delay))
      controller.enqueue(encoder.encode(chunks.shift()))
    },
  })
}
```

---

# **六、路由完整清單**

| 路徑 | Phase | 需登入 | 說明 |
| :---- | :----: | :----: | :---- |
| `/` | 0 | — | Landing，導到 `/dashboard` |
| `/dashboard` | 1 | ✓ | 首頁總覽 |
| `/crm` | 1 | ✓ | 客戶列表 |
| `/crm/[clientId]` | 1 | ✓ | 客戶 360° |
| `/crm/[clientId]/gap-analysis` | 1 | ✓ | 保障缺口 |
| `/crm/[clientId]/timeline` | 1 | ✓ | 互動時間軸 |
| `/spin` | 2 | ✓ | SPIN 對話列表 |
| `/spin/[sessionId]` | 2 | ✓ | SPIN 對話 |
| `/pre-visit` | 3 | ✓ | 訪前規劃列表 |
| `/pre-visit/[planId]` | 3 | ✓ | 訪前規劃 |
| `/reports` | 3 | ✓ | 報告列表 |
| `/reports/[reportId]` | 3 | ✓ | 報告編輯器 |
| `/theater` | 4 | ✓ | 演練列表 |
| `/theater/[sessionId]` | 4 | ✓ | 演練頁 |
| `/share/[token]` | 5 | — | 公開報告 |
| `/team` | 7 | ✓ (Manager+) | 團隊後台 |
| `/settings` | 7 | ✓ | 設定 |

**Mock API（Route Handlers）：**

| 端點 | 用途 |
| :---- | :---- |
| `POST /api/mock/ai/spin` | SPIN 串流回應 |
| `POST /api/mock/ai/theater` | 劇場 AI 客戶回應 |
| `POST /api/mock/ai/assistant` | 全頁助手回應（含 tool 指令） |
| `POST /api/mock/ai/report` | 報告/訪前規劃段落生成 |
| `POST /api/mock/track/[token]` | 公開頁 beacon 事件 |

---

# **七、風險與對策**

| 風險 | 等級 | 對策 |
| :---- | :----: | :---- |
| localStorage 容量溢位（演練訊息過多） | 中 | 每個 session 超過 N 筆自動截斷；提供「清除演練資料」按鈕 |
| Mock 資料與未來真 DB Schema 差異 | 中 | Type 從 `domains/*/types.ts` 單一來源出，真後端照此實作；提早與技術規格書 Prisma Schema 對齊欄位 |
| 假 streaming 延遲感與真 LLM 差異 | 低 | 參數 `delayMs` 集中在 `domains/ai-mock/delay.ts`，未來可一鍵關閉 |
| 無 Auth 導致 Demo 時角色誤切換 | 低 | Sidebar 頂端顯示當前角色 + 色帶提示 |
| Next.js 16 與 技術規格書 v1.0（Next 15） 差異 | 低 | 文件中 `middleware.ts`/TanStack Query/Zustand 等依賴，在本計畫均改以 Next 16 對應方式或省略；切真版時補寫一份 Migration Note |

---

# **八、驗收與移交標準**

- [ ] 8 個模組 × 對應路由全部可達，互相 CTA 連通
- [ ] 所有可變更操作（新增 / 編輯 / 刪除）重新整理後資料仍在
- [ ] `pnpm build` 無 error / warning；`pnpm lint` 通過
- [ ] README 有「5 分鐘 Demo 劇本」與「如何接上真 API」兩節
- [ ] 每個 `domains/<module>/service.ts` 註解標示「此處替換為真 tRPC / fetch 即可」
- [ ] 交付影片：一鏡到底 5 分鐘完整流程錄製

---

# **九、時程彙總**

| Phase | 人日 | 累計 |
| :---- | :----: | :----: |
| 0 Foundation | 5 | 5 |
| 1 Dashboard + CRM | 7 | 12 |
| 2 SPIN | 7 | 19 |
| 3 訪前 + 報告 | 7 | 26 |
| 4 劇場文字 | 6 | 32 |
| 5 互動報告 + 追蹤 | 5 | 37 |
| 6 全頁助手 | 5 | 42 |
| 7 團隊後台 | 4 | 46 |
| 8 打磨 | 4 | 50 |

> 1 名資深前端全職約 **10 週**；2 人並行 Phase 1–7 可壓到 **6 週**。

---

*— End of Plan —*

誠問 AI Frontend Mock Plan v1.0  |  2026-04  |  內部計畫文件
