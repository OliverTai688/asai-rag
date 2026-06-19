# 誠問 AI AI 劇場直接建場開發缺口評估框架 v1.0

> 建立日期：2026-06-19  
> 狀態：研究定稿  
> 目的：釐清 `AI 劇場演練` 不應以「已完成 AI 了解客戶 / SPIN 摘要」作為唯一前置條件，並建立一個可用於後續 ITA workstream 的開發缺口評估框架。  
> 關聯文件：`ARC-004_interview-theater-dual-agent-design-v1.1.md`、`RES-003_theater-field-semi-structured-interview-guide.md`、`RES-004_advisor-companion-semi-structured-interview-guide.md`、`PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`、`ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`。

---

## 1. 研究結論

`AI 劇場演練` 的正確入口不是「先有顧問訪談，才能演練」，而是「先有可建場素材，才能演練」。素材可以來自三條路：

1. **劇場訪綱直接建場**：使用 `RES-003` 的「模擬劇場・場域建構半結構訪綱」逐段訪談，產出場域、角色卡、關係張力、三層次摘要與核心場景。
2. **客戶資料一鍵建場**：從 CRM / FamilyMember / Policy / VisitPlan / confirmed interview facts 建場；資料不足時只補問缺口。
3. **顧問訪談產物轉劇場**：使用訪綱 A 的客戶輪廓表、對話準備卡、SPIN/PQ/Issue 候選作為素材來源之一。

因此，現行 `/theater` setup 把「SPIN 摘要」作為唯一資料來源，是 legacy 產品假設，不符合 `ARC-004` 的 D12：「劇場可兩條路進場：跑完訪綱 B / 從既有資料一鍵建場」。它應改為多來源建場工作台。

---

## 2. 研究依據

### 2.1 本 repo 內部依據

- `RES-003` 已提供劇場專用半結構訪綱 B，目的明確是「為模擬劇場演練蒐集並建構素材」，產出包含場域概述、角色卡、關係連結、三層次摘要、待演練核心場景。
- `ARC-004` 已定案「兩個獨立 agent，各自訪談蒐集 -> 產出」，並將訪綱 A 對應訪談 Agent、訪綱 B 對應劇場 Agent。
- `ARC-004` D12 已定案劇場可「跑完訪綱 B」或「從既有資料一鍵建場」。
- `PLN-015` ITA-003 已列出「訪綱 B 配置 + 一鍵從既有資料建場」為必要項。
- `ACC-006` 已要求多角色劇場具備焦點客戶、NPC <= 4、角色人格/if-then/示範台詞、turn visibility scope，並禁止 NPC 杜撰真實客戶事實。

### 2.2 外部方法論依據

- 半結構訪談的核心價值是「預定主題框架 + 彈性追問」。Scribbr 對半結構訪談的定義是依照預定 thematic framework 提問，但問題順序或措辭可調整。來源：<https://www.scribbr.com/methodology/semi-structured-interview/>
- Kallio et al. 在半結構訪談 guide 開發研究中提出五階段流程：確認使用半結構訪談的前置條件、取回並使用既有知識、形成初版訪談 guide、pilot test、形成完整 guide。來源：<https://pubmed.ncbi.nlm.nih.gov/27221824/>
- 多角色 LLM 模擬不宜只看單一 persona imitation。RoleInteract 研究指出，角色扮演 agent 需要同時評估個體層級與群體互動層級；個體表現好不代表群體互動也好。來源：<https://arxiv.org/html/2403.13679v2>
- 2026 年 role-orchestrated multi-agent communication simulation 研究顯示，將 conversational responsibilities 拆給不同角色，並由 controller / supervisory role 動態啟動與安全稽核，有助於角色區分、協調與可解釋性，但會帶來延遲與成本權衡。來源：<https://arxiv.org/abs/2604.00249>
- Google Cloud 對 multi-agent system 的描述也強調多 agent 可由具不同能力或角色的 agent 協同，常需要 orchestration。來源：<https://cloud.google.com/discover/what-is-a-multi-agent-system>

---

## 3. 評估框架：TDF-GAP

本文件採用 **TDF-GAP**（Theater Direct Field Guide Gap Assessment）框架評估開發缺口。每個維度用 0-3 分標示成熟度：

| 分數 | 定義 |
| --- | --- |
| 0 | 不存在，或只有 legacy 假設。 |
| 1 | 有文件或局部 prototype，但未串成可用流程。 |
| 2 | 有可操作流程，但缺 persistence、guard、QA 或 production contract。 |
| 3 | 可上線：有資料模型、API、UI、權限、AiUsageLog、QA 與 rollback/compatibility note。 |

### 維度 A：入口與資料來源獨立性

驗收問題：

- `/theater` 是否能在沒有顧問訪談 / SPIN session 時開始？
- 是否明確提供 `劇場訪綱建場`、`帶客戶資料建場`、`從既有訪談轉入` 三種入口？
- 顧問訪談是否只是素材來源之一，而不是 hard dependency？

目前評分：**0.5 / 3**

目前缺口：

- `/theater` 仍以 `completedSpinSessions` 作為唯一 source list。
- 頁面文案寫「從一份 SPIN 摘要開始」。
- 空狀態提示「先完成一筆 AI 了解客戶後，就能把它轉成 AI 劇場演練」。
- `handleStartSimulation()` 沒有 selectedSpin 就直接 return。

建議開發切片：

- `/theater` 第一屏改成三入口 selector。
- `fromSpin` 改名或抽象成 `sourceMaterialId/sourceKind`。
- 無既有素材時，主 CTA 應啟動劇場訪綱 B，而不是導去顧問陪談。

### 維度 B：訪綱 B 配置與半結構訪談引擎

驗收問題：

- `RES-003` 是否已萃取為 `InterviewOutline` TS 常數？
- 劇場訪綱是否能逐段訪談、不跳段、保留核心題與追問？
- 訪談素材是否標記 fact / inference / unknown？

目前評分：**1 / 3**

目前缺口：

- `src/domains/interview/outlines/` 已有訪綱 A foundation，但尚未看到訪綱 B 的 TS 常數配置。
- `RES-003` 的 7 段與產出表仍停留在文件層。
- 劇場缺少「場域建構 session」或「theater setup material」資料 contract。

建議開發切片：

- 新增 `theaterFieldOutline`，沿用 `InterviewOutline` 型別。
- 新增 `TheaterFieldMaterial` / `TheaterSetupDraft` pure types。
- 將 `RES-003` 的產出映射到 structured schema：field summary、characters、relations、artifacts、values、assumptions、coreScene、practiceQuestion。

### 維度 C：一鍵建場資料契約

驗收問題：

- 系統是否能從 CRM / policies / visit / confirmed interview facts 組裝已知素材？
- 是否能標示「已知 / 待確認 / 推論」？
- 高敏感客戶是否需要 reason + risk consent？

目前評分：**1 / 3**

目前缺口：

- `ARC-004` / `AUD-004` 已有 D16 真實客戶進劇場界線。
- 目前 `/theater` 只從 SPIN session 推出 persona，沒有從 CRM/family/policy 組裝場域。
- 沒有 `known/gap/inference` 的 setup card，也沒有 high sensitivity gate。

建議開發切片：

- 建立 `buildTheaterMaterialFromClient(clientId)` server/service contract。
- 產出 `knownFacts`、`missingFields`、`inferences`、`sensitivityWarnings`。
- 高敏感客戶建場前顯示 explicit confirmation + reason input，並寫 audit。

### 維度 D：多角色導演編排與 visibility scope

驗收問題：

- 劇場是否從單一 persona 變成焦點客戶 + NPC <= 4？
- 是否支援 group/private mode？
- 每個 turn 是否有 speaker、addressee、visibilityScope？
- 是否防 persona collapse、搶話、冷場？

目前評分：**0.5 / 3**

目前缺口：

- `src/domains/theater/types.ts` 仍是 legacy `TheaterPersonaType` 四型、單一 `client` role、`tension` 數值與分數式 `TheaterScore`。
- `/api/ai/theater` 仍是 legacy 客戶單角色 route，production 目前以 gate 保護。
- 尚無 director agent、speaker selection、visibility scoping、private chat memory。

建議開發切片：

- ITA-003 先寫 migration/compatibility brief，再動 schema。
- 新增 `TheaterCharacter`、`TheaterScene`、`TheaterMessageVisibility`、`TheaterDirectorDecision` contract。
- group mode 經 director agent 選 speaker；private mode 直接呼叫被點選角色。
- 每回合逐角色序列呼叫，每次 provider call 寫 `AiUsageLog`。

### 維度 E：劇場 setup UI 與 session UX

驗收問題：

- setup 是否先問「用哪種方式建場」，而不是先列 SPIN 摘要？
- 訪綱 B 能否以 sheet/wizard 方式逐段收集？
- 使用者是否能看見角色卡、關係張力、場景摘要後再開始？
- mobile session 是否不遮擋輸入區？

目前評分：**1 / 3**

目前缺口：

- `/theater` 已有 modern minimal shell，但 IA 是 legacy SPIN source -> goal -> difficulty。
- setup summary 還是客戶、目標、難度、persona，而不是場域、角色、張力、場景。
- 無訪綱 B wizard、角色卡 review、known/gap review。

建議開發切片：

- `/theater` 改為「建場方式 selector + setup draft review」。
- 劇場訪綱 B 用 right sheet 或 full page wizard，完成後回到 setup draft。
- Start 前顯示：焦點客戶、在場角色、核心張力、未知資訊、資料敏感提醒。

### 維度 F：合規、安全、成本與驗收

驗收問題：

- 每次 AI call 是否都有 `AiUsageLog`？
- 是否能防止真實客戶資料被杜撰或外洩？
- Org manager 是否不能看 member 客戶明細、逐字稿、私聊？
- 是否有 quota/error path proof、Browser QA、rollback note？

目前評分：**1.5 / 3**

目前缺口：

- legacy theater route 已補 auth/quota/AiUsageLog production minimum，但新版 Route B 尚未完成。
- 高敏感客戶 reason/risk consent 尚未進 UI/API。
- 多角色/private chat visibility 尚無 DB/API contract。
- ITA-003/ITA-006 尚未有 schema migration rollback note。

建議開發切片：

- 將 `AiUsageLog` contract 明確寫進 director call、character call、feedback call。
- 新增 `TheaterMaterialSource` provenance，將每條素材標記 source/ref/factStatus。
- 新增 high sensitivity 建場 gate 與 audit trail。
- ITA-003 完成前不得宣稱新版劇場 production-ready。

---

## 4. 開發缺口總表

| 優先級 | 缺口 | 影響 | 建議歸屬 |
| --- | --- | --- | --- |
| P0 | `/theater` 將 SPIN / 顧問訪談視為唯一入口 | 使用者無法直接用劇場訪綱建場，產品心智錯誤 | ITA-003 前置 UI/IA slice |
| P0 | 訪綱 B 尚未 TS 化 | 劇場 Agent 沒有可執行 outline | ITA-003 |
| P0 | 缺 `TheaterSetupDraft` / material provenance contract | 無法安全區分 fact/inference/unknown | ITA-003 / ITA-006 |
| P0 | legacy theater types 仍是單角色 persona/tension/score | 與 Route B 決策衝突 | ITA-003 |
| P1 | 客戶資料一鍵建場缺 known/gap/inference review | 無法只追問缺口，也無法防杜撰 | ITA-002 / ITA-003 |
| P1 | 高敏感客戶建場 gate 未實作 | 合規風險 | ITA-002 / ITA-003 |
| P1 | 多角色 director / visibility scope 未落地 | 無群聊/私聊與知情範圍 | ITA-003 |
| P1 | 五視角回饋尚未取代 score | 仍停留在分數式 coaching | ITA-004 |
| P2 | setup UI 未提供角色卡/場景 review | 使用者難以確認劇場是否準確 | ITA-003 UI slice |
| P2 | Browser/API proof 尚未覆蓋新建場路徑 | 不能標上線閉環 | ITA-003 QA |

---

## 5. 建議後續 Batch 切法

### Batch TDF-001：Theater direct setup IA correction

- `/theater` 文案移除「必須先有 SPIN 摘要」。
- 新增三入口：`用劇場訪綱建場`、`帶客戶資料建場`、`從既有訪談轉入`。
- 無素材空狀態改成引導訪綱 B。
- 不改 Theater schema，不碰 legacy session page。

### Batch TDF-002：訪綱 B TS outline + setup draft contract

- 新增 `theaterFieldOutline`。
- 新增 `TheaterSetupDraft`、`TheaterCharacterDraft`、`TheaterRelationDraft`、`TheaterMaterialFactStatus`。
- 寫 pure mapping helper：outline answers -> setup draft。
- 不呼叫 provider，不動 Prisma。

### Batch TDF-003：劇場訪綱建場 prototype

- `/theater` 可開啟訪綱 B wizard。
- 完成後產生 setup draft review。
- 可先保存於 client state 或 temporary store；DB persistence 留給 ITA-006。
- Browser QA desktop/mobile。

### Batch TDF-004：客戶資料一鍵建場與合規 gate

- 從 BFF 載入 client/family/policy/visit confirmed facts。
- known/gap/inference review。
- 高敏感客戶 reason + risk consent。
- Org/member visibility guard。

### Batch TDF-005：Route B schema / director / multi-character session

- 依 ITA-003 執行 migration、director agent、character calls、visibility scope、AiUsageLog、rollback/compatibility note。
- 這是 Route B 一次切換主戰役，不應混入前面 IA correction 小切片。

---

## 6. 對現有文件的修正建議

- `PLN-015` ITA-003 應補一句：「劇場訪綱 B 直接建場是 primary entry，不依賴訪綱 A / SPIN 摘要；既有訪談轉入僅為素材來源之一。」
- `ACC-006` Theater Acceptance 可補：「沒有顧問訪談或 SPIN session 時，仍可用訪綱 B 建場並開始演練。」
- `AGENTS.md` 的 ITA workstream 可在 Current Gaps 補明：目前 `/theater` UI 仍被 legacy SPIN source 綁住，需先解除入口依賴。

---

## 7. 本輪研究判斷

最小可交付不是立刻做 Route B migration，而是先把「劇場能直接建場」的產品入口與資料契約拆出來。這能降低 ITA-003 的風險：先修正使用者心智與 outline contract，再進入 schema、director、多角色與 visibility scope 的高風險遷移。

推薦下一輪入口：**Batch TDF-001 + TDF-002**。它們不動 DB、不動 SPIN 狀態機、不動 legacy scoring route，但能把最關鍵的開發缺口補成可 review 的前置切片。
