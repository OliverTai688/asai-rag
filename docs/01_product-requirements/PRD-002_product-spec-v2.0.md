# 誠問 AI — 產品規格文件 v2.0

**Sincere Question AI | Insurance Sales Intelligence Platform**

| 文件版本 | v2.0 |
| :--- | :--- |
| 建立日期 | 2026 年 5 月 |
| 上一版本 | v1.0（2026 年 4 月） |
| 機密等級 | 內部機密 — 限授權人員閱覽 |
| 適用對象 | 產品、技術、商業開發團隊 |

---

## 一、執行摘要

誠問 AI 是一套專為保險通訊處與業務員打造的 AI 銷售智能平台，融合 SPIN 國際銷售法、生成式 AI、模擬演練、CRM 管理與全頁面 AI 助手，打造保險業最完整的業務輔助生態系。

v2.0 規格以**當前已實作的功能**為基準，反映前端 Mock 開發完成後的實際產品狀態，並對技術架構進行精確描述。

| 核心價值 | 說明 |
| :--- | :--- |
| **精準銷售** | 以 SPIN 四步驟 AI 引導，讓每次拜訪有方法、有結構、有成果 |
| **劇場演練** | AI 模擬四類客戶性格，進行文字模式對話排練，實時評分反饋 |
| **智能 CRM** | 360° 客戶管理，從家庭結構到保障缺口一手掌握 |
| **訪前規劃** | AI 自動生成拜訪目標、SPIN 提問腳本、預期疑問與回應 |
| **報告生成** | SPIN 分析轉化為雙版本專業報告，支援分享與追蹤 |
| **全頁 AI 助手** | RAG 知識問答 + 客戶洞察 + 自然語言網頁操作指令 |

---

## 二、產品定位與目標市場

### 2.1 產品定位

誠問 AI 不是通用 AI 工具的套殼，而是深度理解保險銷售流程的垂直行業 SaaS 平台。核心信念：

- 每一位業務員都值得擁有 AI 等級的銷售教練
- 每一次客戶接觸都應該有數據驅動的準備與追蹤
- 通訊處主管需要可視化的團隊戰力，而非感覺

### 2.2 目標市場

| 市場層級 | 說明 |
| :--- | :--- |
| **主要市場** | 台灣壽險、產險業務通訊處（預估 3,500+ 處） |
| **次要市場** | 獨立業務員、保經代公司、區域業務主管 |
| **擴展市場** | 東南亞保險業務市場（2027+ 規劃） |
| **市場規模** | 台灣保險業務員逾 35 萬人；通訊處年均軟體預算 NT$2M+ |

### 2.3 競爭差異化

| 差異點 | 說明 |
| :--- | :--- |
| **保險垂直深耕** | 內建台灣保險業術語、法規知識、商品邏輯，非通用 LLM |
| **全流程閉環** | 訪前規劃 → SPIN 引導 → 演練 → 報告 → 追蹤，一站完成 |
| **行為數據** | 客戶閱讀追蹤讓業務員知道客戶「真正在乎什麼」 |
| **AI 情境感知** | 助手隨頁面上下文自動切換建議內容 |

---

## 三、使用者旅程

### 3.1 業務員核心旅程（10 步驟）

```
Step 1  建立客戶檔案    →  Step 2  訪前智能規劃    →  Step 3  SPIN AI 對話
Step 4  劇場模擬演練    →  Step 5  出發拜訪        →  Step 6  拜訪後記錄
Step 7  AI 生成報告    →  Step 8  分享互動頁面     →  Step 9  追蹤閱讀行為
Step 10 AI 洞察下一步
```

### 3.2 各角色體驗地圖

| 角色 | 核心使用情境 | 主要價值收益 |
| :--- | :--- | :--- |
| **業務員** | 每日拜訪準備、SPIN 引導、演練、報告產出、追蹤 | 省時 80%+ 文書作業；拜訪成功率提升；客戶信任感增強 |
| **通訊處主管** | 查看團隊使用數據、AI 輔導建議、績效分析 | 數據化管理取代主觀感知；週會有據可依 |
| **客戶（間接）** | 接收個人化互動報告、預約下次諮詢 | 獲得專業、貼心的服務體驗；信任度提升 |

---

## 四、功能模組規格（當前實作狀態）

### 4.1 儀表板 `/dashboard`

**狀態：已實作**

| 項目 | 規格 |
| :--- | :--- |
| **KPI 概覽** | 客戶總數、本月 SPIN 對話數、報告產出數、演練次數 |
| **活動時間軸** | 顯示近期所有互動事件（SPIN、劇場、報告、分享開啟） |
| **參與度熱列表** | 依參與熱度排序客戶清單，標示需優先跟進對象 |
| **任務面板** | 顯示待辦任務清單與優先處理提醒 |
| **日曆視圖** | 顯示拜訪計畫與重要事件 |
| **AI 洞察** | 今日業務建議、客戶異動提醒、使用趨勢摘要 |
| **快速操作** | 一鍵進入：開始 SPIN / 新增客戶 / 訪前規劃 |

---

### 4.2 SPIN AI 對話引導 `/spin`, `/spin/[sessionId]`

**狀態：已實作（含 Mock AI）**

| 項目 | 規格 |
| :--- | :--- |
| **雙模式** | **釐清自我（SELF_CLARIFY）**：業務員自省思路整理；**設計提問（QUESTION_DESIGN）**：產生客戶提問策略 |
| **SPIN 四階段** | Situation（情境）→ Problem（問題）→ Implication（暗示）→ Need-Payoff（需求回報）→ COMPLETE |
| **AI 引導** | 動態追問、識別客戶痛點模式、建議最佳提問順序 |
| **四層結構輸出** | 每個 SPIN 階段產出結構化摘要，可直接進入報告生成 |
| **會話管理** | 對話紀錄跨 Session 保存；可回顧、延續、搜尋歷史 |
| **狀態追蹤** | 即時顯示當前 SPIN 階段進度 |
| **輸出連結** | 一鍵進入「AI 報告生成」或「劇場演練」模組 |
| **API** | `POST /api/ai/spin`（Stream 模式）；`GET /api/mock/ai/spin`（Mock） |

---

### 4.3 劇場模擬演練 `/theater`, `/theater/[sessionId]`

**狀態：已實作（含 Mock AI，文字模式）**

| 項目 | 規格 |
| :--- | :--- |
| **客戶角色類型** | **保守型（CONSERVATIVE）**：謹慎、要求充分資料；**疑慮型（SKEPTICAL）**：多質疑、需打消顧慮；**忙碌型（BUSY）**：時間壓力大、要求快速切入；**感性型（EMOTIONAL）**：重視情感連結與信任 |
| **難度分級** | 簡單（EASY）/ 中等（MEDIUM）/ 困難（HARD）三級 |
| **演練流程** | 選擇關聯 SPIN 對話 → 選擇客戶角色與難度 → 進行多輪文字對話 → AI 評分反饋 |
| **AI 回應** | 根據角色設定、難度、對話歷史、客戶背景動態生成（Stream 模式） |
| **評分機制** | 演練結束後 AI 給出「問題品質評分」「遺漏痛點提示」「建議優化話術」（TheaterScore） |
| **對話記錄** | 每輪對話含角色、內容、時間戳；支援事後回顧 |
| **後台數據** | 主管可查看業務員演練頻率、評分趨勢（規劃） |
| **API** | `POST /api/ai/theater`（Stream）；`POST /api/ai/theater/score`；`GET /api/mock/ai/theater` |

---

### 4.4 智能 CRM `/crm`, `/crm/[clientId]`

**狀態：已實作（含完整 Mock 資料）**

#### 4.4.1 客戶列表 `/crm`

| 項目 | 規格 |
| :--- | :--- |
| **視圖模式** | 表格視圖 / 網格（卡片）視圖切換 |
| **搜尋與篩選** | 關鍵字搜尋、依狀態篩選（PROSPECT / ACTIVE / CLOSED） |
| **新增客戶** | Dialog 表單；欄位：姓名、電話、Email、生日、職業、公司 |
| **狀態標籤** | 色彩標示客戶開發狀態 |

#### 4.4.2 客戶詳細頁 `/crm/[clientId]`

| 分頁 | 功能說明 |
| :--- | :--- |
| **360° 概覽** | 客戶基本資料、家庭結構、職業財務概況、AI 智能摘要 |
| **保障缺口分析** | AI 自動比對現有保障與建議保額，標示缺口並推薦產品方向 |
| **保單管理** | 現有保單清單、保費、效期、狀態管理 |
| **關係地圖** | ReactFlow 視覺化人際關係網絡圖；支援新增/刪除關係節點 |
| **互動時間軸** | 拜訪紀錄、SPIN 對話、報告分享、客戶閱讀行為一條線呈現 |
| **關聯報告** | 顯示該客戶所有生成的報告清單 |

**資料模型：**

| 欄位 | 類型 | 說明 |
| :--- | :--- | :--- |
| id | string | nanoid 生成 |
| name | string | 客戶姓名 |
| status | ClientStatus | PROSPECT / ACTIVE / CLOSED |
| phone, email | string | 聯絡資訊 |
| birthDate | Date | 生日（觸發提醒） |
| occupation, company | string | 職業資訊 |
| annualIncome | number | 年收入（用於缺口分析） |
| familyMembers | FamilyMember[] | 家庭成員結構 |
| policies | Policy[] | 現有保單清單 |
| relationships | RelationshipType[] | 人際關係 |
| tags | string[] | 自訂標籤 |

---

### 4.5 訪前智能規劃 `/pre-visit`, `/pre-visit/[planId]`

**狀態：已實作（含 AI 生成）**

| 項目 | 規格 |
| :--- | :--- |
| **輸入** | 選擇客戶檔案 + 拜訪目的（初訪 / 加保 / 續約 / 關懷 / 轉介紹） |
| **AI 生成內容** | 拜訪目標清單、SPIN 提問腳本、預期客戶疑問與回應話術、建議資料清單 |
| **對話劇本** | 完整流程：開場白 → 破冰 → SPIN 提問 → 需求確認 → 下一步 |
| **時間規劃** | 建議各段落時間分配 |
| **狀態管理** | DRAFT / READY / COMPLETED / ARCHIVED |
| **拜訪後記錄** | 填寫參與者與會議摘要；AI 自動產出情況分析 |
| **API** | `POST /api/ai/visit`（JSON 結構化輸出）；`GET /api/mock/ai/visit` |

**資料模型（VisitPlan）：**

| 欄位 | 類型 | 說明 |
| :--- | :--- | :--- |
| id | string | 規劃 ID |
| clientId | string | 關聯客戶 |
| purpose | VisitPurpose | 拜訪目的 |
| objectives | VisitObjective[] | 拜訪目標清單 |
| spinQuestions | SpinQuestion[] | SPIN 提問腳本 |
| objectionHandling | ObjectionHandling[] | 預期疑問與回應 |
| materials | VisitMaterial[] | 資料清單 |
| status | VisitPlanStatus | 規劃狀態 |
| visitNotes | string | 拜訪後記錄 |

---

### 4.6 AI 智能報告生成 `/reports`, `/reports/[reportId]`

**狀態：已實作（含 AI 生成與分享功能）**

| 項目 | 規格 |
| :--- | :--- |
| **觸發方式** | SPIN 對話結束後一鍵生成；亦可從客戶頁面或手動觸發 |
| **報告章節** | situation（情況）、problem（問題）、implication（暗示）、recommendation（建議）、summary（摘要）、performance（績效） |
| **可編輯性** | 每段 AI 產出內容皆可手動修改、補充個人觀察 |
| **版本管理** | 同一客戶可有多份報告版本；自動標注生成時間與對話來源 |
| **分享功能** | 生成專屬 Token；一鍵分享互動頁面 |
| **ShareMeta** | 分享時間、有效期設定、開啟次數追蹤 |
| **API** | `POST /api/ai/report`（Markdown 格式輸出） |

---

### 4.7 客戶互動報告頁面 `/share/[token]`（公開路由）

**狀態：已實作（含訪問追蹤）**

| 項目 | 規格 |
| :--- | :--- |
| **分享方式** | 生成專屬 Token URL；支援 LINE、Email 分享 |
| **頁面設計** | 響應式設計；行動裝置優先；品牌配色（深海藍白金系） |
| **閱讀追蹤** | 開啟時間、Token 驗證、訪問記錄全記錄 |
| **追蹤 API** | `GET /api/mock/track/[token]`（紀錄訪問事件） |
| **到期設定** | 可設定連結有效期 |

---

### 4.8 全頁面 AI 助手

**狀態：已實作（FAB 浮動按鈕 + 全頁面對話面板）**

| 項目 | 規格 |
| :--- | :--- |
| **入口** | 右下角 FAB 浮動按鈕；快捷鍵喚出 |
| **情境感知** | 感知當前頁面路由，自動切換相關建議（在 CRM 頁自動建議保障缺口分析） |
| **RAG 知識問答** | 查詢內建知識庫（保險法規、商品條款、SPIN 話術）；RAG Domain 架構預留向量搜索接口 |
| **客戶洞察** | 根據當前客戶上下文即時產出保障缺口摘要、互動歷史重點、建議下一步行動 |
| **網頁操作指令** | 工具指令（Tool calling）執行導航、打開表單、高亮面板等操作 |
| **多輪對話** | Zustand Store 維持對話上下文；支援跨模組操作 |
| **應用通知** | AppNotification 系統；通知中心顯示未讀通知 |
| **API** | `POST /api/ai/chat`（Stream 模式 + Tool calling） |

**AI 助手工具指令（Tool calling）：**

| 指令 | 功能 |
| :--- | :--- |
| `navigate` | 路由跳轉（如「帶我去王大明的客戶頁面」） |
| `openForm` | 開啟特定表單（如「新增客戶」） |
| `highlightPanel` | 高亮頁面特定區塊以引導用戶 |

---

### 4.9 通知中心

**狀態：已實作**

| 項目 | 規格 |
| :--- | :--- |
| **入口** | 頂部欄通知鈴鐺圖示 |
| **通知類型** | 系統通知、客戶行為通知（報告被開啟）、任務提醒 |
| **已讀/未讀** | 一鍵全部標為已讀 |
| **通知詳情** | 顯示標題、摘要、時間戳、操作連結 |

---

### 4.10 團隊管理後台 `/team`

**狀態：已實作（UI 架構）**

| 項目 | 規格 |
| :--- | :--- |
| **使用者管理** | 新增/停用帳號；角色權限分配（主管 / 資深業務 / 一般業務） |
| **績效儀表板** | 各業務員：SPIN 對話次數、報告產出數、演練頻率、客戶互動率 |
| **AI 輔導建議** | 根據使用數據，AI 自動標注需重點輔導的業務員（規劃） |

---

### 4.11 系統設定 `/settings`

**狀態：已實作（UI 架構）**

| 項目 | 規格 |
| :--- | :--- |
| **帳號設定** | 個人資訊、密碼變更 |
| **通知偏好** | 各類通知開關設定 |
| **介面設定** | 主題（淺色 / 深色）、語言偏好 |

---

## 五、技術架構（當前實作）

### 5.1 技術棧全景

| 層級 | 技術選型 | 版本 |
| :--- | :--- | :--- |
| **框架** | Next.js App Router | 16.2.4 |
| **UI Library** | React | 19.2.4 |
| **語言** | TypeScript | 5.x |
| **樣式** | Tailwind CSS | 4.x |
| **UI 組件** | shadcn/ui | 4.4.0 |
| **狀態管理** | Zustand | 5.0.12 |
| **表單** | React Hook Form + Zod | 7.73.1 / 4.3.6 |
| **AI 引擎（主）** | OpenAI SDK | 6.37.0 |
| **圖表** | Recharts | 3.8.1 |
| **流程圖** | ReactFlow | 11.11.4 |
| **動畫** | Motion（Framer Motion） | 12.38.0 |
| **ORM** | Prisma | 7.8.0 |
| **通知** | Sonner（Toast） | 2.0.7 |
| **圖示** | Lucide React | 1.9.0 |
| **日期** | date-fns | 4.1.0 |
| **ID 生成** | nanoid | 5.1.9 |
| **Markdown** | react-markdown + remark-gfm | 10.1.0 |
| **主題** | next-themes | 0.4.6 |

### 5.2 目錄結構

```
/src
├── /app
│   ├── /(public)
│   │   └── /share/[token]          # 客戶分享報告頁（公開）
│   ├── /(dashboard)                # 驗證後保護路由
│   │   ├── /dashboard              # 首頁概覽
│   │   ├── /crm                    # 客戶列表
│   │   │   └── /[clientId]         # 客戶詳細（含 5 個子分頁）
│   │   ├── /spin                   # SPIN 對話列表
│   │   │   └── /[sessionId]        # SPIN 對話介面
│   │   ├── /theater                # 劇場演練列表
│   │   │   └── /[sessionId]        # 劇場演練介面
│   │   ├── /pre-visit              # 訪前規劃列表
│   │   │   └── /[planId]           # 訪前規劃編輯
│   │   ├── /reports                # 報告管理列表
│   │   │   └── /[reportId]         # 報告詳細
│   │   ├── /team                   # 團隊管理
│   │   └── /settings               # 系統設定
│   ├── /api
│   │   ├── /ai/chat                # AI 助手（Stream + Tool）
│   │   ├── /ai/visit               # 訪前規劃生成
│   │   ├── /ai/theater             # 劇場演練（Stream）
│   │   ├── /ai/theater/score       # 劇場評分
│   │   ├── /ai/report              # 報告生成
│   │   ├── /rag                    # RAG 知識庫查詢
│   │   └── /mock/                  # Mock API（開發用）
│   └── page.tsx                    # 首頁
├── /components
│   ├── /ui                         # shadcn/ui 基礎組件
│   ├── /dashboard                  # 儀表板組件
│   ├── /crm                        # CRM 相關組件
│   ├── /assistant                  # AI 助手組件
│   ├── /ai-assistant               # FAB 浮動按鈕
│   └── /layout                     # 側邊欄、頂部欄、通知中心
├── /domains                        # 業務邏輯層（Domain-Driven）
│   ├── /client                     # 客戶管理
│   ├── /spin                       # SPIN 對話
│   ├── /theater                    # 劇場演練
│   ├── /visit                      # 訪前規劃
│   ├── /report                     # 報告管理
│   ├── /event                      # 事件追蹤
│   ├── /assistant                  # AI 助手
│   ├── /calendar                   # 日曆
│   ├── /session                    # 會話管理
│   └── /rag                        # RAG 知識庫
└── /lib
    ├── /i18n                       # 多語言支持
    ├── /hooks                      # 自訂 Hooks
    └── utils.ts                    # 工具函數
```

### 5.3 AI 架構

| 模組 | 技術方案 |
| :--- | :--- |
| **主要 LLM** | OpenAI GPT-4o-mini（生產）；Mock 模式（開發） |
| **串流輸出** | OpenAI Stream → ReadableStream → SSE |
| **Tool calling** | AI 助手支援 navigate / openForm / highlightPanel 三種工具指令 |
| **RAG Pipeline** | Domain 架構預留；RagSource + RagResponse 型別定義完成；向量搜索待接入 |
| **Prompt 設計** | 每個 AI 端點獨立 System Prompt；含客戶上下文注入 |
| **備援 LLM** | Anthropic Claude（package.json 有安裝，API 設計支援切換） |

### 5.4 資料架構

**當前狀態：** 前端以 Zustand Store + In-Memory Mock 資料為主；Prisma schema 已定義，Database 整合進行中。

**Mock 種子資料（6 個客戶）：**

| 客戶 | 狀態 | 特徵 |
| :--- | :--- | :--- |
| 王大明 | ACTIVE | 40 歲、主要示範客戶 |
| 林建華 | PROSPECT | 待開發 |
| 陳雅婷 | ACTIVE | 女性客戶 |
| 李國樑 | ACTIVE | 企業主 |
| 吳美玲 | CLOSED | 已成交 |
| 張志明 | PROSPECT | 待追蹤 |

**Domain Store 架構（Zustand）：**

| Store | 管理狀態 |
| :--- | :--- |
| `clientStore` | 客戶列表、當前客戶 |
| `spinStore` | SPIN 對話 Session |
| `theaterStore` | 劇場演練 Session |
| `assistantStore` | AI 助手對話歷史、通知清單 |
| `sessionStore` | 當前登入用戶 |

### 5.5 設計系統

**主題：深海浮月 — 藍白金三色系統**

| 角色 | 色碼 | 用途 |
| :--- | :--- | :--- |
| 深海藍 | `#0A2342` | 頁面背景、側邊欄 |
| 品牌藍 | `#1A3A6B` | 主要容器、Card 背景 |
| 主藍 | `#1565C0` | 主要操作按鈕、Active 狀態 |
| 純白 | `#FFFFFF` | 文字、輸入框 |
| 金色點綴 | `#D4AF37` | 重要標籤、Premium 標示 |

**字體系統：**
- 標題：Noto Serif TC（帶有傳統感與信任感）
- 內文：Noto Sans TC（清晰易讀）

---

## 六、API 規格

### 6.1 AI 相關端點

#### `POST /api/ai/chat`

AI 助手對話（Stream 模式 + Tool calling）

```
Request:
{
  messages: ConversationMessage[],
  context?: {
    currentPage: string,
    clientId?: string,
    clientName?: string
  }
}

Response: text/event-stream
- 一般回應：流式文字輸出
- 工具指令：{ tool: "navigate" | "openForm" | "highlightPanel", params: {...} }
```

#### `POST /api/ai/visit`

訪前規劃 AI 生成（JSON 結構化輸出）

```
Request:
{
  clientInfo: ClientInfo,
  purpose: VisitPurpose,
  existingPolicies?: Policy[]
}

Response: VisitPlan（JSON）
```

#### `POST /api/ai/theater`

劇場演練 AI 客戶回應（Stream 模式）

```
Request:
{
  persona: TheaterPersonaType,
  difficulty: TheaterDifficulty,
  tension: number,
  clientBackground: string,
  spinOutput?: SpinSession,
  history: TheaterTurn[]
}

Response: text/event-stream（AI 角色回應）
```

#### `POST /api/ai/report`

報告內容生成（Markdown 格式）

```
Request:
{
  prompt: string,
  clientInfo: ClientInfo,
  spinSession?: SpinSession
}

Response: { content: string }（Markdown）
```

#### `POST /api/ai/theater/score`

劇場演練評分

```
Request: { session: TheaterSession }
Response: TheaterScore
```

### 6.2 Mock API 端點（開發用）

| 端點 | 說明 |
| :--- | :--- |
| `GET /api/mock/ai/assistant` | 模擬助手回應 |
| `GET /api/mock/ai/spin` | 模擬 SPIN 對話 |
| `GET /api/mock/ai/theater` | 模擬劇場演練 |
| `GET /api/mock/ai/visit` | 模擬訪前規劃 |
| `GET /api/mock/track/[token]` | 模擬分享頁追蹤 |

---

## 七、事件追蹤系統

所有業務操作透過 Event Domain 記錄，形成互動時間軸。

**事件類型（EventType）：**

| 事件 | 觸發時機 |
| :--- | :--- |
| `SPIN` | 完成一次 SPIN 對話 |
| `THEATER` | 完成一次劇場演練 |
| `REPORT` | 生成或更新報告 |
| `SHARE_OPEN` | 客戶開啟分享報告頁面 |
| `SYSTEM` | 系統事件（登入、匯入等） |

**InteractionEvent 資料結構：**

```typescript
{
  id: string
  clientId: string
  type: EventType
  title: string
  description: string
  metadata: Record<string, unknown>
  createdAt: Date
}
```

---

## 八、訂閱方案與商業模式

### 8.1 方案比較

| 功能 | 個人版 | 通訊處版 | 企業版 |
| :--- | :---: | :---: | :---: |
| SPIN AI 對話引導 | ✓ | ✓ | ✓ |
| AI 雙版報告生成 | ✓ | ✓ | ✓ |
| 客戶互動報告追蹤 | ✓ | ✓ | ✓ |
| 訪前智能規劃 | ✓ | ✓ | ✓ |
| 智能 CRM（基礎） | ✓ | ✓ | ✓ |
| 劇場模擬演練（文字模式） | ✓ | ✓ | ✓ |
| 劇場模擬演練（語音模式） | — | ✓ | ✓ |
| 全頁面 AI 助手（基礎 RAG） | ✓ | ✓ | ✓ |
| 網頁操作代理 | — | ✓ | ✓ |
| 智能 CRM（進階保障缺口分析） | — | ✓ | ✓ |
| 品牌客製化 | — | ✓ | ✓ |
| 團隊管理後台 | — | ✓ | ✓ |
| 進階數據報表 | — | ✓ | ✓ |
| 私有知識庫上傳 | — | — | ✓ |
| API 整合（保險公司） | — | — | ✓ |
| 專屬客服 SLA | — | — | ✓ |
| AI 對話配額 | 200 次/月 | 無限制 | 無限制 |

### 8.2 定價策略

| 方案 | 定價 |
| :--- | :--- |
| **個人版** | NT$ 990 / 人 / 月（年繳享 85 折） |
| **通訊處版** | NT$ 599 / 人 / 月起（10 人起訂；年繳） |
| **企業版** | 客製報價（含 SLA、私有部署、API 整合） |
| **免費試用** | 14 天全功能試用；無需信用卡 |

---

## 九、開發路線圖

| 版本 | 時程 | 主要交付功能 | 狀態 |
| :--- | :--- | :--- | :--- |
| **v0.5 Beta** | 2026 Q2 | SPIN AI 對話、雙版報告、基礎 CRM、文字劇場演練、客戶報告追蹤 | **進行中** |
| **v1.0 GA** | 2026 Q3 | 語音劇場演練、全頁面 AI 助手 RAG 正式版、訪前規劃完整版、通訊處後台 | 規劃中 |
| **v1.5** | 2026 Q4 | 網頁操作代理完整版、保障缺口 AI 分析、私有知識庫、LINE 通知整合 | 規劃中 |
| **v2.0** | 2027 Q1 | 行動 App、語音劇場演練、保險公司 API 整合、AI 輔導建議 | 規劃中 |
| **v2.5+** | 2027 Q3+ | 多語言支援（英、泰、越）、海外市場適配、白牌 API 開放 | 規劃中 |

---

## 十、資料治理與隱私合規

| 合規項目 | 設計策略 |
| :--- | :--- |
| **資料最小化** | 僅收集業務必要資料；敏感欄位本地端加密後儲存 |
| **存取控制** | RBAC 角色權限；主管只能看自屬業務員數據；跨通訊處資料隔離 |
| **AI 訓練政策** | 客戶資料不用於 LLM 模型訓練；對話記錄匿名化後方可用於產品改善 |
| **資料保存期限** | 對話記錄預設保存 3 年；到期自動刪除或通知客戶 |
| **右利保障** | 支援客戶資料查閱、更正、刪除申請（Right to Erasure） |
| **稽核日誌** | 所有資料存取操作完整記錄；支援匯出供法遵稽核 |

---

## 十一、風險評估

| 風險類型 | 等級 | 因應策略 |
| :--- | :--- | :--- |
| **AI 幻覺與誤導風險** | 高 | RAG 架構 + 來源引用；法規敏感內容雙重過濾 |
| **競爭者快速模仿** | 中 | 垂直深耕差異化；客戶資料累積優勢；品牌先行者優勢 |
| **LLM API 成本超支** | 中 | 混合輕量/重量模型；快取機制；配額設計 |
| **保險業監理法規變更** | 中 | 持續追蹤金管會動態；法遵顧問合作；彈性架構 |
| **業務員數位採用阻力** | 中 | 極簡 UX 設計；主管帶頭使用策略；14 天體驗 ROI |
| **資料外洩事件** | 低 | 最小權限原則；定期滲透測試；資安保險 |

---

## 十二、成功指標

### 產品指標

| 指標 | 目標 |
| :--- | :--- |
| 月活躍用戶（MAU） | 啟動後 6 個月達 1,000+；12 個月達 5,000+ |
| SPIN 功能採用率 | > 70% 月活用戶 |
| 劇場演練採用率 | > 40% 月活用戶 |
| AI 助手採用率 | > 60% 月活用戶 |
| NPS 淨推薦值 | > 55 |
| 月留存率 | Month-12 > 88% |

### 商業指標

| 指標 | 目標 |
| :--- | :--- |
| ARR | 2026 年底 NT$5M；2027 年底 NT$30M |
| CAC | 個人版 < NT$2,000；通訊處版 < NT$20,000 |
| LTV/CAC | > 3x |
| 毛利率 | > 70%（達規模後） |
| Net Revenue Retention | > 110% |

---

## 十三、結語

誠問 AI 以「讓每一次提問都充滿誠意與智慧」為核心理念，構建保險業最完整的 AI 銷售智能生態系。我們深信，當業務員擁有正確的工具、方法與數據，他們與客戶之間的每一次對話都將創造真實的價值——而不只是一份保單。

> **誠問 AI — 讓每一次提問，都充滿誠意與智慧。**

---

本文件版本 v2.0  |  2026 年 5 月  |  機密文件 — 未經授權禁止轉載
