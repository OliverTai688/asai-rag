# RES-026 — 劇場演練舞台：關係圖驅動的多角色 AI 對話模擬研究 v1.0

- 類型：研究與設計（RES）
- 主題：`/theater/[sessionId]` 缺少「正式演練舞台」——已能建構劇場場景（訪綱 B / Route B handoff），但沒有可以「看著關係圖、跟其中一個人對話，或設定情境讓多角色彼此對話」的演練介面。研究可參考的學術/產品做法並提出設計。
- 狀態：研究版（research draft），尚未動 schema / route / UI
- 建立日期：2026-06-20
- 範圍：盤點現況缺口、整理外部參考（generative agents、多方對話 turn-taking、互動式戲劇 drama manager、AI 業務 roleplay 產品）、提出舞台 UI 與導演編排設計、對齊既有 Route B 契約、列出開發缺口與建議切片。**本文件不改 code、不動 Prisma schema、不呼叫 provider。**
- 對應 workstream：`PLN-015` ITA-003（劇場多角色 + 導演編排 + 群/私聊）、ITA-004（五視角質化回饋）；`PLN-020` TDF（Theater Direct Field Guide handoff）
- 相關檔案：`src/app/(dashboard)/theater/[sessionId]/page.tsx`、`src/app/(dashboard)/theater/build/page.tsx`、`src/domains/theater/route-b-handoff.ts`、`src/domains/theater/route-b-session.ts`、`src/lib/theater/route-b-session-bff-repository.ts`、`src/app/api/theater/route-b/**`、`src/domains/client/relationship-graph.ts`、`src/components/crm/RelationshipMap.tsx`

---

## 0. 一句話結論

劇場「建場」已經完成（可由訪綱 B / 客戶資料 / 訪談轉入產出 `TheaterRouteBHandoffPacket`，並能持久化成 Route B session），但**演練舞台是空的**：目前 `/theater/[sessionId]` 只能唯讀地呈現已建好的場景與顧問單向 turn，沒有「導演（director）AI 選誰發言 → 角色（character）AI 回話」的 runtime loop，也沒有把**關係圖當成舞台地圖**的互動介面。要補的不是又一個聊天框，而是一個 **relationship-graph-centered 的演練舞台 + 導演編排引擎**：使用者可以（A）點關係圖上的某個人單獨對話，或（B）設定一個情境（誰在場、議題、張力），讓 AI 角色在導演調度下彼此對話、顧問隨時插話。學術上這對應 Park et al. 的 generative agents（memory→reflection→planning）、murder-mystery 多方 turn-taking（self-selection + current-speaker-selects-next + adjacency pairs），以及 Façade 的 drama manager（beat sequencing + 社會張力指標）。本專案已有的 Route B 契約（visibility scope、director input、character input、fact/inference/unknown）剛好就是這套設計的骨架，缺的是 runtime route 與舞台 UI。

---

## 1. 現況事實（程式碼層級）

### 1.1 已建好的部分（建場 / 持久化）

| 區塊 | 檔案 | 現況 |
| --- | --- | --- |
| 建場入口 | `src/app/(dashboard)/theater/page.tsx` | 三入口：用訪綱建場 / 帶客戶資料建場 / 從既有訪談轉入；不再強制先做 SPIN |
| 建場流程 | `src/app/(dashboard)/theater/build/page.tsx` | 對話式訪綱 B，右側抽屜審查 setup draft，產出 `TheaterBuildPacket`；完成 CTA 呼叫 `POST /api/theater/route-b/sessions` |
| Handoff 契約 | `src/domains/theater/route-b-handoff.ts` | `TheaterRouteBHandoffPacket` = scene + characters + visibility rules + state patches + director/character input builder + AiUsage plan |
| Session 持久化 | `src/lib/theater/route-b-session-bff-repository.ts`、`POST /api/theater/route-b/sessions`、`GET .../[sessionId]` | 建立並讀回 `TheaterSession` + `TheaterCharacter` + 開場 `TheaterTurn`；owner-scoped；高敏感 gate |
| 顧問 turn 寫入 | `POST /api/theater/route-b/sessions/[sessionId]/turns` | 顧問可寫 GROUP/PRIVATE turn、指定 addressee、附 state patch proposal；**不呼叫 provider** |
| Runtime gate（dry-run） | `POST /api/theater/route-b/runtime` | `SESSION_DRAFT` 可用；`DIRECTOR`/`CHARACTER`/`FEEDBACK` 在 `ENABLE_ROUTE_B_THEATER_PROVIDER!=="true"` 時回 `503 GUARDED_DISABLED`，證明未呼叫 provider、未寫假 `AiUsageLog` |

### 1.2 缺的部分（演練 runtime / 舞台 UI）

- **沒有 director provider route**：誰該發言、對誰說、群聊還是私聊、導演指令——目前只有 input builder（`buildTheaterRouteBDirectorInput`），沒有真的呼叫 LLM 的 route。
- **沒有 character provider route**：角色依人格卡 + 可見歷史 + 導演指令生成台詞——同樣只有 input builder，無 runtime。
- **沒有 feedback provider route**：ITA-004 五視角質化回饋未接。
- **舞台 UI 唯讀且單薄**：`/theater/[sessionId]` 能顯示角色卡、群/私聊 lane、顧問 composer，但沒有「AI 角色會回話」的循環，也**沒有把關係圖當成舞台**——使用者無法在圖上點某個人開始對話。
- **`ENABLE_ROUTE_B_THEATER_PROVIDER` 預設關閉**：所有 provider 行為都還在 guarded-disabled posture。

> 換句話說：**建場（setup）已閉環，演練（runtime）還是空舞台**。使用者描述的「沒有劇場開始演練的頁面」精準命中這個缺口。

### 1.3 關係圖現況（可重用為舞台地圖）

- `src/domains/client/relationship-graph.ts`：`RelationshipGraphPersonNode`（role / generation / fields / unknowns / sourceReferences）、fact/inference/unknown 分層、BFF read-only。
- `src/components/crm/RelationshipMap.tsx`：ReactFlow + dagre 佈局，generation 著色。
- 缺口（見 `RES-024`/REL workstream）：edge model 不足、parent 持久化 bug——但**節點/角色資料足以作為舞台人物來源**，演練舞台可直接消費 Route B `characters[]` 或關係圖 review。

---

## 2. 外部參考研究

### 2.1 Generative Agents（Park et al., 2023）— 可信角色的記憶／反思／規劃

核心三件套，是「角色為什麼會這樣說話」的可信度來源：

1. **Memory Stream**：所有觀察以時間戳記錄，檢索分數 = `recency`（指數衰減）＋`importance`（角色自評重要度 0–10）＋`relevance`（與當前情境的語意相似度），三者正規化加權。
2. **Reflection**：當近期 importance 累積超過閾值，角色把零散觀察綜合成更高層的推論（例如「客戶其實最在意的是孩子教育金」）。
3. **Planning / Reacting**：角色維持跨時間一致的計畫，遇事件才調整；決定「是否要反應、是否要開啟對話」。

**對本專案的映射**：`interview` domain 已有 Park-style memory/reflection/planning（`src/domains/interview/memory.ts`、`park-loop.ts`、`reflection-planning.ts`）。劇場角色的「為什麼這樣回」可以重用同一套檢索分數，讓每個 `TheaterRouteBCharacter` 帶 scoped memory（knownFacts=fact、personaHints=inference、unknowns=待補），**檢索時嚴格分 fact / inference / unknown，不把推論當事實**（對齊硬規則 B9 防幻覺）。

### 2.2 Murder Mystery 多方對話 turn-taking（Who Speaks Next?, 2024）— 導演「選誰發言」的可實作演算法

這篇把對話分析（conversation analysis）的 turn-taking 規則落成 pseudocode，**直接可作為導演編排核心**：

1. `think()`：每個角色先各自生成「想說的話 + 要不要說（speak/listen）+ importance 0–9」。
2. `selectMostImportant()`：多人想說時，**importance 最高者得發言權**（= 自我選擇 self-selection；平手隨機）。
3. `speak()`：被選中者用角色卡 + 記憶層 + 任何回應限制生成台詞。
4. `detectDesignation()`：LLM 分析上一句是否為 **first pair part**（是非問句 / wh- 問句 / 點名），預測下一個說話者。
5. **current-speaker-selects-next（CSSN）**：若上一句點名或提問，被點到的人**有義務接話且必須相關**（second pair part / adjacency pair），覆蓋自我選擇。

記憶採三層：共享對話史（最近 5 turn）、角色短期（內心想法）、角色長期（正規化事實）。結果：相較 baseline，**對話崩潰（dialogue breakdown）顯著減少**。

**對本專案的映射**：這就是 `TheaterRouteBDirectorInput` 該驅動的邏輯。導演 AI 一次 call 同時做 self-selection（誰最想說）＋ CSSN（誰被點名）＋防搶話（連續發言上限 2，對齊 ITA-003 卡），輸出「下一位發言者 + addressee + visibilityScope + directive」。

### 2.3 Façade（Mateas & Stern）— Drama Manager 與社會張力指標

互動式戲劇的經典架構，提供「**情境演進**」與「**張力作為可追蹤指標**」的設計語言：

- **Drama Manager / Beat Sequencer**：27 個主要 beat（每場跑約 15 個），依角色狀態與玩家行為**動態選 beat**；策略層（選哪個 beat）與戰術層（角色怎麼演）分離。
- **角色協調（ABL / "secretive synchronization"）**：兩個角色（Grace/Trip）執行前先協商，避免台詞重疊——「像職業摔角：知道結局，但依現場即興」。
- **社會遊戲（social games）**：平行追蹤 Affinity（玩家偏向誰）與 Therapy（自我覺察）兩個指標；800+ 條 NL 規則把玩家輸入映射成 ~30 個 discourse act（批評/稱讚/調情…），改變角色情緒與張力，再決定哪個 beat 觸發。

**對本專案的映射與取捨**：
- **採用**：策略/戰術分離（導演=策略、角色=戰術）；情境用「beat / 場景階段」推進，而非無限自由聊。
- **採用但改質化**：Façade 用數值張力；本專案硬規則 #3 已決定 **Route B 取消數值緊張度**、情緒融入文字、回饋採五視角質化（不打分）。所以「張力」只作導演**內部編排訊號**（要不要升溫/降溫、誰該插話），**不對使用者顯示分數**。
- **採用**：角色協調避免搶話 = 導演序列化發言（逐角色 streaming），而非所有角色平行噴台詞。

### 2.4 Cohesive Conversations（2024）— 多代理對話的一致性維護

針對多代理對話「越聊越漂、人設崩」的問題，技術包含：共享狀態追蹤、對知識庫做事實核對、角色檔案約束、上下文窗口管理、一致性驗證器（self-correction / 重述驗證）。

**對本專案的映射**：對應 `sanitizeRouteBText()`（遮罩 email/phone/secret）＋ fact/inference/unknown 邊界＋ state patch `requiresConfirmation=true / writesConfirmedCrmFact=false`。可加一個輕量「導演事後校對」：角色台詞若引用了未知事實，導演標記為 inference 或改走旁白 NPC 補問，而非讓它變成 confirmed fact。

### 2.5 AI 業務 roleplay 產品（SmartWinnr / VirtualSpeech / Skill Lake 等）— 產品形態與回饋慣例

業界（含保險、製藥等受監管產業）AI roleplay 的共識做法：

- **買家人格變體**：從一個模板快速生成多個 buyer persona（「多疑的採購」「預算緊的關鍵人」），對齊本專案 Big Five + 情境特質多角色。
- **即時情境適應**：顧問講得空泛，AI 就追問業務影響；claim 模糊就要求證據——對齊異議庫（ITA-005）依人格自然觸發。
- **演練後即時回饋**：語氣、同理、異議處理、關鍵字覆蓋——對齊 ITA-004 五視角（教練的耳朵 / 客戶的眼睛 / 沉默裡的需求 / 守門的良心 / 決策的橋），但本專案**不打分、純質化**。
- **練習迴圈壓縮**：把「數週才練一次」壓到「隨時幾分鐘」——這是劇場舞台的產品價值主張。

---

## 3. 設計提案：關係圖驅動的演練舞台

### 3.1 舞台資訊架構（一頁三區）

```
┌──────────────────────────────────────────────────────────────┐
│  舞台地圖（關係圖）          │   對話舞台（中央，主體）          │
│  ─ 焦點客戶 + NPC ≤4         │   ─ 群聊 / 私聊 lane              │
│  ─ 點節點 = 開私聊 / 聚焦    │   ─ 角色頭像 + visibility badge   │
│  ─ 在場/不在場、發言中高亮    │   ─ 導演旁白（場景階段提示）      │
│  ─ 關係邊（張力/結合/親子）   │   ─ 顧問 composer（插話/點名）    │
├──────────────────────────────┴───────────────────────────────┤
│  右抽屜（可收合）：角色卡 / 已知事實·推論·未知 / 五視角回饋     │
└──────────────────────────────────────────────────────────────┘
```

- **舞台地圖**重用 `RelationshipMap` 的 ReactFlow 佈局，但語意改為「演練在場人物」：節點＝Route B character，邊＝關係（親子/配偶結合/社會關係/張力）；**發言中的角色高亮、被點名的角色脈動**。
- **對話舞台**重用既有 `/theater/[sessionId]` 的群/私聊 lane 與顧問 composer，補上「AI 角色會回話」的 runtime。
- **右抽屜**重用 setup draft 的 fact/inference/unknown 分層；演練結束顯示五視角回饋。

### 3.2 兩種互動模式（精準回應使用者需求）

**模式 A — 跟某一個人對話（1-on-1 / 私聊）**
- 在關係圖點某個角色 → 開私聊 lane（`visibilityScope = PRIVATE`，addressee = 該角色）。
- runtime 只跑 character call（該角色回話）；其他角色不知情（private 不外洩，由 `isTurnVisibleToCharacter()` 保證）。
- 用途：先單獨摸清決策者 / 影響者 / 被扶養人的立場。

**模式 B — 設定情境讓他們彼此對話（多角色 / 群聊）**
- 顧問設定「情境卡」：在場者、議題（例：是否加保重疾）、初始張力傾向、顧問角色（在場/旁觀）。
- runtime 進入 **director → character 循環**：
  1. 導演 call：依 §2.2 演算法選下一位發言者（self-selection＋CSSN）、決定對誰說、群/私聊、導演指令。
  2. 角色 call：被選中角色依人格卡＋可見歷史＋導演指令生成台詞（streaming）。
  3. 顧問可隨時插話（寫 advisor turn，可點名某角色 → 觸發 CSSN）。
  4. 防搶話/防冷場：連續發言上限 2；被問必答；冷場時導演讓旁白 NPC 拋情境問題或讓某角色自我選擇發言。
- 用途：觀察家庭/決策圈在顧問不主導時如何互相影響，找出真正的決策橋與守門人。

### 3.3 導演編排迴圈（對齊既有契約）

```
顧問 utterance / 或 系統 tick
        │
        ▼
  DIRECTOR call  ── buildTheaterRouteBDirectorInput(handoff, utterance, scopedHistory)
        │           輸出：nextSpeaker, addressee, visibilityScope, directive, （內部）張力意圖
        ▼
  CHARACTER call ── buildTheaterRouteBCharacterInput(handoff, charId, addressee, scope, directive, visibleHistory)
        │           輸出：角色台詞（情緒以舞台指示融入文字，不給數值）
        ▼
  persist TheaterTurn（speaker/addressee/visibilityScope/directorDirective/statePatches）
        │
        ▼
  可選 state patch（角色內部狀態更新 proposal，requiresConfirmation，不寫 CRM）
        │
        ▼
  迴圈直到：達回合上限 / 顧問結束 / 導演判定情境收斂
        │
        ▼
  FEEDBACK call ── 五視角質化回饋（ITA-004），不打分
```

- 每個 DIRECTOR / CHARACTER / FEEDBACK call **都要寫 `AiUsageLog`**（success/error 皆寫），對齊 handoff 的 `aiUsagePlan` 與硬規則 #4。
- provider 未啟用時維持 `503 GUARDED_DISABLED`，舞台顯示「演練引擎尚未啟用」並停在可確認的場景，不偽造對話。

### 3.4 防幻覺與合規邊界（不可妥協）

- 角色只能用 `knownFacts`（FACT/CONFIRMED）當事實；`personaHints`/`unknowns` 維持推論語氣或轉旁白 NPC 補問（B9）。
- 私聊內容不得外洩給未授權角色；org manager 不得看客戶明細 / 逐字稿 / 私聊（D16）。
- 高敏感客戶進劇場需 reason + riskAccepted（TDF-004 gate），舞台不得繞過。
- 演練產出（state patch / 角色推論）預設**不寫回 CRM**；要寫回走既有 writeback 確認卡（confirmed + 勾選才寫）。
- 不保存 raw audio（若舞台接語音，沿用 interview realtime 的 transcript-only 策略）。

---

## 4. 對齊既有 Route B 契約：已有 vs 待補

| 能力 | 既有契約／程式碼 | 狀態 | 待補 |
| --- | --- | --- | --- |
| 場景/角色/可見性 | `TheaterRouteBScene` / `Character` / `VisibilityScope` | ✅ | — |
| 導演輸入組裝 | `buildTheaterRouteBDirectorInput()` | ✅ input builder | ❌ provider route |
| 角色輸入組裝 | `buildTheaterRouteBCharacterInput()` | ✅ input builder | ❌ provider route |
| 顧問 turn 寫入 | `POST .../sessions/[id]/turns` | ✅ | 串接導演迴圈觸發 |
| 私聊不外洩 | `isTurnVisibleToCharacter()` | ✅ | 舞台 UI lane 呈現 |
| 角色記憶/檢索 | `interview` memory/park-loop | ✅ 可重用 | 接成 character scoped memory |
| 五視角回饋 | ITA-004 規格 | ⏳ 規格 | ❌ feedback route + UI |
| 舞台地圖 | `RelationshipMap`（ReactFlow） | ✅ 元件 | 改吃 Route B characters、發言高亮、點節點開私聊 |
| 演練引擎開關 | `ENABLE_ROUTE_B_THEATER_PROVIDER` | ✅ guarded | 啟用時補 success/error `AiUsageLog` |

**結論：契約 80% 就位，缺的是 3 條 provider route（director / character / feedback）＋舞台 UI 把關係圖接成可互動地圖。**

---

## 5. 開發缺口與建議切片（給 ITA-003/004 撿卡用）

> 以下為研究建議，**非任務卡**；正式卡仍以 `PLN-015` ITA-003/004 與 AGENTS.md 勾選為準。動 schema 需可確認 DB target 與 migration/rollback note。

1. **切片 S1 — 演練舞台唯讀升級（不接 provider）**：`/theater/[sessionId]` 接關係圖地圖（吃 Route B `characters[]`），群/私聊 lane、角色卡、visibility badge、空舞台時顯示 guarded-disabled 狀態。可先做，不依賴 provider。
2. **切片 S2 — Director provider route**：`POST /api/theater/route-b/runtime`（DIRECTOR intent）接 LLM，落實 self-selection＋CSSN＋防搶話，輸出 next speaker / addressee / scope / directive；success/error 寫 `AiUsageLog`。
3. **切片 S3 — Character provider route**：CHARACTER intent 接 LLM，角色依卡片＋scoped memory＋directive 生成台詞（streaming）；fact/inference/unknown 邊界；`AiUsageLog`。
4. **切片 S4 — 模式 A 1-on-1 私聊閉環**：點關係圖節點 → 私聊 → character call → 私聊不外洩 proof。
5. **切片 S5 — 模式 B 多角色情境**：情境卡（在場者/議題/顧問角色）→ director→character 迴圈 → 回合上限/收斂；冷場與旁白 NPC 補問。
6. **切片 S6 — 五視角質化回饋（ITA-004）**：FEEDBACK route + 右抽屜呈現，不打分。
7. **切片 S7 — 演練→寫回**：state patch / 推論走既有 writeback 確認卡，confirmed + 勾選才寫 CRM。

**建議起點**：S1（唯讀舞台 + 關係圖地圖）槓桿最高且不被 provider/env 阻擋——立刻讓「劇場有一個演練頁面」這件事可見，再逐步點亮 director/character runtime。

---

## 6. 風險與待 operator 決策

- **provider 成本/配額**：director＋character 是多次 LLM call/回合，需 `canUseAiModule(THEATER)` quota guard 與每 call `AiUsageLog`；高密度演練成本需 operator 確認分級（對齊 D18）。
- **`ENABLE_ROUTE_B_THEATER_PROVIDER` 啟用時機**：啟用即代表 production multi-character theater，需先有 success/error `AiUsageLog` proof 與 Prisma migration/rollback（ITA-003/006）。
- **跨成員共享同客戶演練記憶**：預設 member-private；是否讓同 org 顧問共享屬 visibility 決策，需 operator 拍板。
- **語音演練**：若舞台支援語音輸入，沿用 interview realtime（transcript-only、不存 raw audio、需 mic consent）。
- **關係圖 edge model**：舞台地圖的「結合/張力/社會關係」邊語意，與 `RES-024`/REL workstream 共用；REL-004 動 schema 前舞台先用推導 edge。

---

## 7. 參考來源

- Park et al., *Generative Agents: Interactive Simulacra of Human Behavior* (2023) — [ACM](https://dl.acm.org/doi/fullHtml/10.1145/3586183.3606763)、[綜述](https://medium.com/@kourosh.sharifi/the-rise-of-generative-agents-in-interactive-simulations-cc5eded2736d)
- *Who Speaks Next? Multi-party AI Discussion Leveraging the Systematics of Turn-taking in Murder Mystery Games* (2024) — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12209177/)、[arXiv](https://arxiv.org/pdf/2412.04937)
- *Cohesive Conversations: Enhancing Authenticity in Multi-Agent Simulated Dialogues* (2024) — [arXiv](https://arxiv.org/pdf/2407.09897)
- Mateas & Stern, *Façade: An Experiment in Building a Fully-Realized Interactive Drama* — [設計故事](https://www.gamedeveloper.com/design/the-story-of-facade-the-ai-powered-interactive-drama)、[GDC 2003 論文](https://users.soe.ucsc.edu/~michaelm/publications/mateas-gdc2003.pdf)
- *Multi-Agent Speaker Selection* — [LazyLLM docs](https://docs.lazyllm.ai/en/stable/Cookbook/multi-agent_authoritarian_speaker/)
- AI 業務 roleplay 產品慣例 — [SmartWinnr 2026 指南](https://smartwinnr.com/blog/insights-ai-roleplays-for-sales-ultimate-2026-guide)、[VirtualSpeech](https://virtualspeech.com/ai-practice)、[Skill Lake](https://www.skilllake.com/features/ai-role-play)

---

> 後續：本研究可直接餵入 `PLN-015` ITA-003（多角色＋導演編排＋群/私聊）與 ITA-004（五視角回饋）的實作卡；舞台 UI 的關係圖地圖與 `RES-024`/REL workstream 共用節點/邊模型。
