# 誠問 AI｜訪談 Agent × 劇場 Agent 雙模板設計 v1.1

> 狀態：設計草案（待開發，已鎖定 A–J 全部開發決策）
> 來源依據：
>
> - 訪綱 A：`docs/顧問陪談半結構訪綱＿0603討論確認版.docx (1).md`
> - 訪綱 B：`docs/模擬劇場場域建構半結構訪綱_0610.docx.md`
> - 既有相關計畫：`014-誠問AI-家庭關係圖多世代擴充計劃-v1.0.md`、`012-誠問AI-SPIN訪談大綱功能規劃-v1.0.md`
> - v1.0 → v1.1 變更：依使用者 A1–J31 決策，**人格框架由 DISC 改為 Big Five＋情境特質（CAPS）**、**劇場改為導演編排的多角色（群聊/私聊）並取消數值化緊張度（情緒融入文字）**、新增**真實資料 Migration（上線準備）**。三大研究區塊皆經實際網路研究綜合並標註證據強度。

---

## 0. 設計總綱與已鎖定決策

把現有「SPIN 問答」與「劇場演練」重構為**兩個獨立 agent，各自「訪談蒐集 → 產出」兩階段**，建立在**共用半結構訪談引擎**之上。

```
                ┌─────────────────────────────────────┐
                │   半結構訪談引擎 (Interview Engine)    │
                │   讀「訪綱配置」→ AI 主導逐段訪談       │
                │   → 即時記錄素材 → 收斂成「產出」       │
                └─────────────────────────────────────┘
                   ▲ 訪綱配置                ▲ 訪綱配置
        ┌──────────┴─────────┐   ┌──────────┴──────────┐
        │ 訪綱A：顧問陪談      │   │ 訪綱B：劇場場域建構    │
        │ → 訪談 Agent        │   │ → 劇場 Agent          │
        │ 產出：輪廓表+準備卡  │   │ 產出：劇場環境建構表    │
        └────────────────────┘   └──────────┬──────────┘
                                            ▼
                  多角色 RPG 劇場（導演編排・群聊/私聊・情緒融入文字）
                                            ▼
                          五個質化 AI 視角回饋（不打分，可勾選）

        ┌───────────────────────────────────────────────┐
        │  兩種運行模式（任一訪綱皆可套）— 即「兩個模板」     │
        │  ① 獨立模式：不綁客戶，對話從零建構                │
        │  ② 客戶資料模式：載入網頁客戶 → 補問缺口 →        │
        │     萃取事實「業務員確認後寫回客戶檔」              │
        └───────────────────────────────────────────────┘
```

### 已鎖定決策（A–J）

| 編號 | 決策 |
|---|---|
| A1 | 訪綱配置存為 **TS 常數**（`src/domains/interview/outlines/`），不進 DB，未來要可編輯再搬 |
| A2 | **半結構**：◆ 必問、↳ AI 彈性追問、**不跳段** |
| A3 | **取消 phase-complete 機制**，段落間自然接續 |
| B4 | 入口先選「獨立 / 帶客戶」 |
| B5 | 客戶資料模式自動標「已知 vs 待確認」，只追問缺口 |
| B6 | 萃取事實**經業務員確認後寫回**客戶檔（事實項可寫回、推論項預設不寫回） |
| B7 | 訪談結束時統一出「確認卡」逐項勾選寫回 |
| C8 | 訪談 Agent 產出由 **AI 研究/生成**（非靜態樣板） |
| C9 | 先列出 **AI 總結**，讓業務員可編輯、打分 |
| C10 | Issue/輪廓由 **AI 推估，業務員可編輯確認後成立** |
| C11 | 人格**只用文字解釋推論**，背後框架**改用具信效度的 Big Five＋情境特質**（取代 DISC 四型） |
| D12 | 劇場可兩條路進場：跑完訪綱 B / 從既有資料一鍵建場 |
| D13 | 同場 **NPC 上限 4 個** |
| D14 | 角色由訪綱推論生成，原型經本次研究確認（見 §4） |
| D15 | 業務員扮演自己，可**點選對象**：私聊（1對1）/ 群聊（NPC 一起加入） |
| E16 | 對話分**私聊 / 群聊** |
| E17 | NPC 互動採**導演調度**（研究確認，見 §5） |
| E18 | 無硬回合上限，業務員自行結束觸發回饋 |
| E19 | **取消數值化緊張度**；情緒與肢體動作**融入文字回覆**（舞台指示） |
| F20 | 結束後一次跑五個視角 |
| F21 | 五視角業務員可勾選想聽哪幾個，**預設全部** |
| F22 | 五視角回饋也可用於訪談 Agent |
| G23 | 紅線以事後回饋為主，嚴重項即時提示 |
| G24 | 異議庫依角色人格自然觸發 |
| H25 | RAG 留檔案上傳位置，**並開始設計上線用真實資料 migration**（見 §10） |
| H26 | 向量方案採 **Supabase Postgres + pgvector** |
| I27 | 新建 `interview` domain；劇場在 `theater` 擴充；SPIN 舊頁保留到新流程穩定 |
| I28 | 新增獨立 **`InterviewSession`**，不混進 SpinSession |
| I29 | 一併補上 **AiUsageLog 寫入** |
| J30 | 先做 M1（訪談引擎＋訪綱 A 獨立模式） |
| J31 | **直接接 OpenAI**（不先 mock） |

---

## 1. 半結構訪談引擎（共用核心）

引擎只認識抽象結構：段落 / 核心題(◆) / 追問(↳) / 每段目標來源用途 / 產出 schema。換 agent＝換訪綱配置（A1：TS 常數），不改引擎。

### 1.1 訪綱配置資料結構

```ts
interface InterviewOutline {
  id: string;
  name: string;                 // 「顧問陪談」/「劇場場域建構」
  role: string;                 // 「顧問訪業務員」
  framework: "SPIN_HIDDEN" | "SCHEIN_3LAYER";
  principles: string[];         // 各訪綱的進行原則 / 引導重點
  segments: InterviewSegment[];
  outputSchema: OutputField[];
}

interface InterviewSegment {
  order: number;
  title: string;
  subtitle?: string;
  goal: string;
  dataSource: string;
  purpose: string;
  coreQuestions: { id: string; text: string }[];   // ◆ 必問
  followUps:     { id: string; text: string }[];    // ↳ AI 彈性追問
  guideNote?: string;
}

interface OutputField {
  key: string;
  label: string;
  type: "text" | "list" | "table" | "rolecard" | "relationmap" | "spinQuestions" | "pq";
  sourceSegments: number[];
}
```

### 1.2 引擎行為（依 A2/A3）
- 依 segment 順序主導訪談；◆ 必問、↳ 視回答彈性追問，**不跳段**。
- 段落間**自然接續**，**不使用 phase-complete 判定**；由引擎依「◆ 是否都已獲回應」隱式判斷可否推進，業務員也可手動下一段。
- 每段即時把回答結構化進 `outputSchema` 對應欄位。
- 全程白話（訪綱 A：不對業務員提「SPIN」一詞）。
- 訪綱 B 特有：每筆素材標註「已知事實 vs 合理推論」。

---

## 2. 兩種運行模式（＝兩個模板）

| | ① 獨立模式 | ② 客戶資料模式 |
|---|---|---|
| 入口(B4) | 選「獨立」 | 選「帶客戶」→ 接 CRM 客戶選單 |
| 起點 | 空白；第0段先問「要談誰」 | 預載 `Client`/`FamilyMember`/`Policy` |
| 已知 vs 待確認(B5) | 全部現場問 | CRM 有值者標「已知」，只追問缺口 |
| 寫回(B6/B7) | 不寫回 | 結束時出「確認卡」逐項勾選；事實項可寫回 `aiTags`/家庭/保單/痛點，**推論項預設不寫回** |
| 適用 | 新名單、臨時練習 | 既有客戶、長期經營 |

---

## 3. 人格建模：Big Five ＋ 情境特質（取代 DISC）

> **為何換掉 DISC**（研究結論，證據強）：DISC 源於 1928 年 Marston 的情緒理論、非為心理計量而設計；四象限「類型」在因素分析下不成立、維度間互相關；多採 ipsative 強迫選擇無法跨人比較；官方自承「不建議用於甄選」；同儕審查效標效度文獻稀缺。相對地，Big Five 跨 50+ 文化複製、數千篇研究、盡責性是最穩定的績效預測子。**類型模型把連續特質硬切，重測易換類；維度模型在正面對決研究中預測效度較優。**

### 3.1 雙層人格模型
1. **特質基線（Big Five / OCEAN，連續向度）**：開放性 O、盡責性 C、外向性 E、親和性 A、神經質 N，各維度給 高/中/低（內部可選展開 NEO 30 facets 提供細粒度）。
2. **情境特質（CAPS if-then 行為簽名）**：`IF 情境線索 → THEN 行為/情緒`。理論支撐：Mischel & Shoda CAPS、Fleeson 狀態密度分佈（同一人狀態變異≈人際變異，但分佈平均數穩定）、Whole Trait Theory、特質激發理論（特質只在相關情境線索出現時被表達）、關係自我（重要他人在場會啟動對應狀態）。→ 這正是「同一客戶談錢、談死亡、配偶在場行為會變」的機制性解釋。

```ts
interface PersonaModel {
  bigFive: { O: Level; C: Level; E: Level; A: Level; N: Level }; // "high"|"mid"|"low"
  bigFiveRationale: Partial<Record<"O"|"C"|"E"|"A"|"N", string>>; // 一句白話理由
  situationalSignatures: {                  // CAPS if-then
    cue: string;          // 「直白談身故」「配偶在場」「被催促」
    response: string;     // 「防禦、轉移話題」
    affect?: string;      // 情緒走向（內部用，不顯示數值）
  }[];
  exemplarLines: string[];  // 2–3 句示範台詞（鎖定口吻，比形容詞有效）
}
```

### 3.2 與保險行為的關聯（給生成 persona 的依據，證據強度中等、效果量偏弱，勿過度宣稱因果）
- **N 高** → 風險趨避、財務焦慮（持較少風險資產）。
- **C 高** → 長期規劃、儲蓄、退休準備、保守提領（財富累積顯著較高）。
- **A 高** → 對顧問/業務的信任與易受說服（liking/社會證明/權威原則最敏感）。
- **O 高** → 接受創新/非傳統金融商品；台灣樣本中正向預測**長照險**需求。
- **E 高** → 互動偏好、衝動購買、較高風險承擔/股市參與。
- ⚠️ 混合發現：神經質與壽險購買方向在不同樣本不一致；風險傾向不完全由 Big Five 解釋。生成 persona 時當「傾向提示」而非鐵律。

### 3.3 AI 如何「推論並用白話解釋」（C11：不顯示分數、不貼類型標籤）
- 從對話語言線索做**傾向提示**（LIWC 類標記，效果量中小、情境依賴，須保守）：
  - N 高：較多第一人稱單數（我/我的）、負向情緒與焦慮詞。
  - E 高：較多正向情緒詞、社交詞、話多。
  - O 高：較長/複雜詞彙、抽象與知識主題。
  - A 高：共融/情感語言、少對抗詞。
  - C 高：成就/條理導向用語。
- **呈現方式**：UI 用白話 + 推測語氣 + 信心程度，例如：「他多次提到『我得自己扛』、很少談感受，**看起來**責任感很重、習慣壓抑情緒（盡責性偏高、情緒外顯偏低）——這是依對話線索的**推論**，僅供參考，你可以修改。」**不出現「D 型/C 型」字樣、不出現分數**。

---

## 4. 劇場角色原型庫（Big Five 重表）

**用途**：角色由訪綱 B 素材推論生成；素材不足時以下列 8 原型作「種子」。每個原型以 Big Five 基線 + 情境簽名 + Schein 三層次（人造物/信奉價值/基本假設）描述，確保角色「有沒說出口的理由」。

> 設計原理：三層表面衝突、根部一致；**隱藏勝利條件＝觸及基本假設**（在價值層硬碰通常失敗）；異議常是煙霧彈。
> D14 確認：8 原型在 Big Five 下彼此可區辨（靠 OCEAN 剖面 + 核心恐懼 + 情境簽名差異化），保留 8 個；其中「謹慎拖延型」與「精算質疑型」相近，以親和性/信任(A) 與動機區隔。

| 原型 | OCEAN 剖面（高/中/低） | 核心恐懼（基本假設） | 關鍵情境簽名 if-then | 典型異議 |
|---|---|---|---|---|
| 扛家計支柱型 | C高 E中(主張高) A中低 N外低內高 O中低 | 我倒下家就垮 | IF 直白談身故 → 防禦轉移；IF 談家人未來 → 軟化 | 我再想想／預算有其他優先 |
| 精算質疑型 | C高 O中(ideas高) A低(信任低) N中 E中低 | 被坑／做錯決定 | IF 含糊話術 → 質問升級；IF 坦承不足 → 信任回升 | 太複雜／已有保單且自認夠 |
| 情感顧家型 | A高 E中高(熱情) N中高 O中(feelings高) C中 | 顧不好家人＝失職 | IF 真實家庭故事 → 軟化；IF 被當不懂理財 → 退縮 | 我要跟先生討論 |
| 謹慎拖延型 | N中高 C中(過度審慎) O低 A中 E中低 | 選錯被套牢 | IF 被催 → 抗拒(reactance)；IF 選項收斂 → 鬆動 | 我考慮一下／最近忙 |
| 忙碌沒空型 | E高(活躍) C高(成就) A低(沒耐心) N外低 O中 | 不想面對自身脆弱 | IF 冗長 → 不耐打斷；IF 3句講完價值 → 投入 | 最近真的太忙／之後再說 |
| 被排除配偶型 | A高(順從避衝突) E低(沉默) N中 C中 O中 | 另一半不在時我一無所知 | IF 被拉進對話 → 開口；IF 被晾 → 沉默/事後否決 | 我跟另一半討論後決定緩緩 |
| 怕拖累子女長輩型 | C高(自尊) A高(不麻煩人) N中(隱忍) O低(傳統) E中低 | 成為累贅＝失敗 | IF 重框為「自己預付」→ 接受；IF 點破累贅 → 落淚/防禦 | 不要為我花錢（含忌諱包裝） |
| 唱反調親戚型 | A低(對抗) E高(愛插話) N中 C中 O中 | 失去影響力／傷人情 | IF 被排除 → 爭主導；IF 被請教給面子 → 軟化 | 我有朋友也在賣／我親戚理賠很麻煩 |

角色卡欄位（生成/種子皆用）：原型名稱、場域身分、公開立場（信奉價值）、沒說出口的（基本假設）、外顯行為（人造物/口頭禪）、情境簽名（if-then）、OCEAN 剖面、對保險態度與典型異議、與其他角色的張力。

---

## 5. 多角色 RPG 編排架構（導演 + 序列呼叫）

> 研究結論（證據強）：**採「導演 agent + 逐角色序列 LLM 呼叫 + 共享劇本狀態 + 知情範圍標籤」**。不要「單次 prompt 一次扮演 4 角」（會 persona collapse、口吻同質化，逼真度勝率差 2–10 倍）；也不要全自主多代理自由發言（搶話、冷場、成本爆炸）。

### 5.1 每回合資料流
```
業務員輸入（targetCharacterId：對誰說、mode：私聊/群聊）
        │
   ┌────┴─ 私聊：跳過導演，直接呼叫該角色（必答，無冷場）
   │
   └─ 群聊 ▼
┌─────────────────────────────────────────┐
│ 導演 Agent（1 次輕量 LLM，結構化 JSON 輸出） │
│ 輸入：場景狀態 + scoped 歷史 + 業務員話     │
│      + adjacency-pair 型別 + 各 NPC 摘要    │
│ 輸出：nextSpeakers[](通常1，至多2連續)      │
│      + addressee + directive(演出指令)      │
│      + sceneEnd                            │
└─────────────────────────────────────────┘
        ▼ 1~2 位發言者
┌─────────────────────────────────────────┐
│ 逐角色 Character Agent（各 1 次 streaming）  │
│ prompt = 該角色 PersonaModel + scoped 記憶  │
│   + 內部情緒欄位{valence,arousal,label}     │
│   + 導演 directive + 格式規範               │
│ 輸出：含 *舞台指示* 的台詞，逐角色「打字」    │
└─────────────────────────────────────────┘
        ▼ 寫回記憶（加 visibilityScope 標籤）→ 等下一句
```

### 5.2 「該不該現在開口」判準（群聊，依優先序）
1. **被直接點名 → 必答**（偵測 adjacency pair 的問句/呼名 → 消滅冷場）。
2. 相關性（與上一發言/自身立場契合）。
3. 資訊缺口（有可補充/需澄清才開口）。
4. 個性驅動斷言性（用 E/A 調門檻：唱反調親戚門檻低愛插話、被排除配偶門檻高）。
5. 參與平衡（沉默衰減：太久沒講加權，太常講轉聽眾）。
6. yes-and 品質（接受並擴展，不空泛重複）。
7. 打斷需更高門檻。

### 5.3 防搶話 / 防冷場
- **Exclusive turn**：群聊每回合只有導演授權者能發言；連續發言上限 2，第 2 位需高動機。
- **被問必答**：對被點名 NPC 的 prompt 加 `(response)` 約束。
- 全員低動機且無人被點名 → 導演 fallback 補旁白或由最相關者補位。

### 5.4 私聊 vs 群聊：知情範圍（visibility scoping）
- 每條對話/事件記憶加 `visibilityScope: [npcId...]`（RBAC）；NPC 回應前只檢索「對它可見」的記憶。
- 群聊：在場 NPC + 業務員可見；**不在場角色不知道**。
- 私聊：只有該 NPC 與業務員可見；**其他 NPC 預設不知情**（跟配偶私下講的，唱反調親戚不該知道）。
- 若私聊內容「後來該被知道」，由明確「轉述事件」寫入，不自動全域可見。
- 重新加入的 NPC 用 Theory-of-Mind 提示「我可能不知道剛剛發生什麼」，避免穿幫。

### 5.5 情緒與肢體融入文字（E19，取消數值）
- 格式：動作用 `*...*`（第三人稱、顯示斜體）。範例：`「這我得想想…」*她皺眉，往後靠*`。
- ⚠️ 慣例陷阱：角色 AI 慣例中「括號=OOC、星號=動作」。**系統 prompt 必須明訂格式語義並給 1–2 個 few-shot**，全程一致。
- 內部仍保留情緒欄位 `{valence, arousal, label}` 驅動舞台指示（**不顯示給使用者**，僅供逼真度）。
- 角色聲音差異化：Big Five + 情境簽名 + **2–3 句示範台詞**（比抽象形容詞有效；PersonaLLM 證人類辨識度可達 ~80%）。

### 5.6 LLM 呼叫策略（J31 直接接 OpenAI）
- 私聊：每回合 1 次（角色）。群聊：1（導演）+ 1~2（角色）= 2~3 次。
- 用 **Responses API + streaming**；導演用結構化輸出（JSON schema）。
- prompt caching 快取場景/世界設定前綴；非發言角色只放摘要（控成本，多角色 token 約 6–15×）。
- 導演可用較快/便宜模型；角色台詞用較強模型（聲音差異化）。
- **不引入 AutoGen/LangGraph/CrewAI 框架**——4 角編排自寫即可，借其「模式」就好。
- 風險與緩解：persona 同質化→獨立呼叫+示範台詞+強調立場；過早附和→prompt 明示「不要輕易讓步」；長對話 persona drift→控回合數+定期重注入角色定義。

---

## 6. 五個質化 AI 視角（取代評分）

演練結束後**不打分數**，由五個視角各生成一段質化觀察與建議。F20：結束一次跑五個；F21：可勾選、預設全部；F22：也可用於訪談 Agent。

| 視角 | 看的東西 | 立場 | 踩煞車 |
|---|---|---|---|
| 教練的耳朵 | 對話結構、探詢深度（SPIN 層次推進） | 銷售方法論 | 否 |
| 客戶的眼睛 | 此刻情緒、信任/戒備（第一人稱） | 客戶內心 | 否 |
| 沉默裡的需求 | 不在場家人、未說出口的需求與關係張力 | 家庭系統 | 否（看更深） |
| 守門的良心 | 誠實、揭露、尊重節奏、合規 | 公平待客 | **會** |
| 決策的橋 | 決策摩擦、選項結構、下一步 | 客戶決策能力 | 部分 |

> 各視角的人物設定、觀察重點、語氣範例、理論依據沿用 v1.0（HubSpot/Rackham SPIN、NVC/Rogers/Brehm、Bowen/White&Epston/Milan、金管會公平待客原則、Iyengar&Lepper/展望理論/推力）。「守門的良心」是 §7 紅線偵測的主要載體。
> prompt 警示：選項過載非鐵律（僅偏好不確定/難比較時成立）；非語言線索有文化差異——用「可能/似乎」推測語氣。

---

## 7. 異議庫 × 銷售紅線（沿用 v1.0 研究）

- **12 種常見異議**（價格太貴／已有保了／我再考慮／要問家人／現在沒需要／身體很健康／還年輕沒負擔／沒興趣／不信任業務（孤兒保單）／不信任保險／錢被綁住／保額不確定怕通膨），各含說法、背後擔憂、回應方向、對應人格。G24：依角色人格自然觸發。
- **18 條銷售紅線**＋廣告用語紅線，標法規依據（保險業務員管理規則 §19/§15、招攬及核保理賠辦法、投資型注意事項、公平交易法 §21、壽險公會自律規範）＋ AI 偵測關鍵詞。G23：事後回饋為主，嚴重項（代簽/代墊/保證獲利/吸金）即時提示。
- **AI 高訊號紅旗速查**（給「守門的良心」）：未做 KYC 即推商品、對保守客戶推高風險投資型、65+ 略過錄音同意、慫恿借款/解約繳費、承諾保證報酬/隱藏費用、宣告利率講成保證、從不提猶豫期/除外、churning、代簽/代墊（可直接判定踩線）。
- 2026 高齡新規：附條件例外、非全面取消，偵測仍以「65+ 錄音錄影/關懷回訪」為預設基準。

（完整 12 異議表與 18 紅線表見 v1.0 §5，內容不變。）

---

## 8. 訪談 Agent 產出（C8–C11）

- **C8**：產出由 AI 研究/生成，非靜態樣板。
- 訪綱 A 產出：**客戶輪廓表（9 欄）＋對話準備卡（5 欄）**，外加 SPIN 問題清單（依 Issue）、PQ、人格文字推論。
- **C9**：AI 先出總結 → 業務員可編輯、打分。
- **C10**：Issue/輪廓 AI 推估，業務員可改，**確認後成立**。
- **C11**：人格只給白話文字推論（Big Five 傾向 + 情境簽名），不顯分數、不貼類型標籤。
- 訪綱 B 產出：**劇場環境建構表**（場域概述／角色卡／關係連結與隱藏張力／三層次摘要／核心場景）→ 直接餵 §5 劇場。
- PQ 題庫與 Issue 0-5 採 `RES-010` 的研究版定義：Issue 0-5 是 **Issue Readiness Level（議題就緒度）**，不是客戶好壞或成交率；PQ 題庫用來補齊事實、問題表徵、風險/因應、決策準備與顧問行動性五個構面。沒有公司既有問卷時，依 `RES-011` 的 KYC/PQ canonical mapping 對齊招攬報告書、需求/適合度、KYC/KYP、高齡適合性等欄位；AI 可改寫語氣，但必須保留 intent key 與 fact/inference/unknown 標記。顧問端只顯示文字缺口，org admin 看彙總，super admin 在權限/audit 條件下可調出 L0-L5。

---

## 9. 資料模型擴充（Prisma 7）

- **新增 `InterviewSession`（I28）**：欄位 `organizationId`、`outlineId`、`mode`(STANDALONE/CLIENT_BOUND)、`clientId?`、`currentSegment`、`materials`(JSON，含 fact/inference 標記)、`outputs`(JSON)、`status`、`isDemo`、時間戳。兩份訪綱共用。
- **劇場多角色擴充**：
  - 新增 `TheaterCharacter`：`sessionId`、`name`、`role`、`personaModel`(JSON：Big Five + if-then + exemplarLines)、`isFocus`。
  - `TheaterSession`：移除單一 `personaType`、移除數值 `tension`（E19）；改存 `mode`、`sceneSetup`(JSON)。
  - `TheaterTurn`：加 `speakerCharacterId`、`addresseeCharacterId`、`visibilityScope`(String[])、`stageDirections`/情緒（內部 JSON）；移除 `tensionDelta`。
  - 回饋：新增 `TheaterFeedback`（五視角各一段質化文字）取代/並存 `score`。
- **AiUsageLog 寫入（I29）**：訪談/劇場/導演/各角色每次 OpenAI 呼叫都寫入（provider、module、model、tokens、latency、costUsd、requestId）。
- I27：新建 `src/domains/interview/`；`theater` 擴充；SPIN 舊頁保留至新流程穩定。

---

## 10. 真實資料 Migration（上線準備，H25）

目標：從目前「localStorage/Zustand + mock 為主」轉為「Postgres 真實持久化」，供產品發佈。

### 10.1 範圍
1. **Schema migration**：上述 §9 新表 + 既有表補欄位，用 Prisma migrate（需 `DIRECT_URL`）。
2. **pgvector 啟用（H26）**：在 Supabase 開啟 `vector` extension；新增 `KnowledgeDocument` / `KnowledgeChunk(embedding vector)`（見 §11）。
3. **參考資料 seed**：訪綱配置（A1，程式碼常數，不入庫）；8 角色原型種子（可入庫或常數）；異議庫/紅線/五視角 prompt 模板（建議入庫便於日後不改碼調整，或先常數）。
4. **既有資料處理**：上線前正式客戶資料尚未產生 → 以「新結構直接啟用」為主；既有 localStorage demo/seed 不遷移（標 `isDemo`）。提供一支腳本：若某組織已有 localStorage 暫存，匯出 → 映射到新表（best-effort，非必要）。
5. **多租戶與合規**：所有新表帶 `organizationId`；保留 `complianceChecklist`、`sensitivityLevel`、`kycStatus`（法規必填）。知識庫文件亦以 `organizationId` 隔離。

### 10.2 步驟（建議順序）
1. 定稿 §9 schema → `pnpm prisma:validate` → 建 migration。
2. 本機/staging 套用 → `pnpm prisma:generate`。
3. 啟用 pgvector + 建向量索引（ivfflat/hnsw）。
4. 寫 seed script（訪綱以常數載入、原型/模板入庫）。
5. 接上 AiUsageLog 寫入 → 驗證成本記錄。
6. 上線前資料盤點 checklist（RLS/權限、索引、備份）。

### 10.3 風險
- Prisma 7 + `@prisma/adapter-pg` 與 pgvector 型別需確認支援（必要時以 raw SQL 處理 embedding 欄位）。
- migration 與既有 `(dashboard)/pilot`、`subscription`、`admin` 等未提交變更可能衝突 → 上線前先收斂目前 git working tree（見文末待辦）。

---

## 11. RAG 檔案上傳位置（保留擴充點，H25/H26）

- **上傳入口**：管理區「知識庫」頁，支援上傳 PDF/Word/網頁（險種型錄、條款、理賠案例、法規）。
- **資料模型**：`KnowledgeDocument`(organizationId, name, type, source, status, uploadedBy, createdAt) + `KnowledgeChunk`(documentId, content, embedding vector, metadata)。
- **檢索**：`ragService.query()` 由 placeholder 改為 pgvector 向量檢索（recency/importance/relevance 加權 top-k）。
- **消費端**：訪談 Agent（產品知識輔助）、劇場 NPC（質疑依據）、「守門的良心」（合規事實依據）共用同一 `ragService`。
- **本期範圍**：做上傳 UI 樁 + `ragService` 介面契約 + schema/pgvector 就緒；向量化與檢索實作列後續里程碑。

---

## 12. 開發里程碑

1. **M1（J30）**：訪談引擎 + 訪綱 A 配置，跑通**獨立模式**（直接接 OpenAI）。
2. **M2**：客戶資料模式 + 確認寫回（B5–B7）。
3. **M3**：劇場多角色資料模型 + 導演編排 + 群聊/私聊（§5、D13/D15/E16/E17/E19）。
4. **M4**：五視角質化回饋（§6，F20–F22）。
5. **M5**：異議庫餵 NPC + 紅線給「守門的良心」（§7、G23/G24）。
6. **M6**：真實資料 migration + RAG 上傳樁 + pgvector（§10/§11）+ AiUsageLog（I29）。

---

## 13. 待情境討論（開發前需先談）

進入開發前仍有一批「情境層」問題需先討論定案（流程在真實情況下如何運作、合規/倫理/成本/並存策略），完整清單與建議見：
`docs/07_research-and-design/RES-001_pre-development-scenario-open-questions-v1.0.md`

關鍵幾項：訪談產出與既有 `VisitPlan` 是否合併、劇場「演練目標」是否明示、私聊戰術與結局機制、NPC 防幻覺事實邊界、真實客戶進劇場的個資/倫理界線、紅線誤判處理、成本/配額分級、SPIN 並存退場、以及開 M1 前的 working tree 收斂與 tsc 修復。

---

## 附錄：研究來源與證據強度

**Big Five vs DISC / 類型 vs 維度（證據強）**
- Barrick & Mount (1991) 盡責性跨職業績效效標效度；Roberts et al. (2007) 人格預測力≈SES/IQ；McCrae et al. (2005) 跨 50 文化複製；Haslam taxometric 回顧（維度優於類別，但約 14% 可能為真類別）；DISC：Wikipedia/encyclopedia.pub/jobcannon（Marston 1928、ipsative、四型因素分析不成立、官方不建議甄選）；MBTI 重測 39–76% 換類（類型模型通病）。

**情境特質（證據強/理論）**
- Mischel (1968) 人格係數 r≈.30；Mischel & Shoda (1995) CAPS；Shoda et al. (1994) if-then 行為簽名；Fleeson (2001) 狀態密度分佈、Fleeson & Gallagher (2009) 特質強預測分佈位置；Fleeson & Jayawickreme (2015) Whole Trait Theory；特質激發理論；關係自我脈絡變異。

**Big Five × 保險/財務行為（證據中、效果量偏弱）**
- Schilling & Bleidorn (2024, PSPB) 保險需求大樣本；風險傾向後設分析（弱中度）；退休規劃系統性回顧；Fenton-O'Creevy (2023) 財富累積；台灣長照險 × 開放性（PMC7835807）。

**persona schema / 語言推論（證據中）**
- NEO-PI-R 30 facets、IPIP-NEO（公領域）；CAPS if-then 雙層；PersonaLLM（Big Five→可辨識語言 ~80%）；Mairesse et al. (2007)、Yarkoni (2010) LIWC 標記（約 43.9% 顯著、效果量中小、情境依賴 → 保守）。

**多 NPC 編排（證據強）**
- AutoGen SelectorGroupChat / LangGraph supervisor / CrewAI hierarchical；Stanford Generative Agents（should-react、memory stream、knowledge scoping）；CHI 2025 Inner Thoughts（動機評分+門檻+沉默衰減）；Frontiers murder-mystery（adjacency pair + self-selection，p<0.001）；single vs dual-prompt（逼真勝率 2–10×、6× token）；persona collapse（避免單次多角色）；OpenAI Agents SDK streaming；角色 AI 動作格式慣例（星號=動作、括號=OOC，需明訂）。

**異議/紅線（台灣官方/業界）**
- 保險業務員管理規則 §19/§15、招攬及核保理賠辦法、銷售前程序作業準則、投資型銷售應注意事項、金管會函令/新聞稿、公平交易法 §21；壽險公會自律規範（招攬廣告/作業控管/契約轉換/§19 懲處參考）；裁罰實務（新光人壽 720 萬、2020 借款買保單裁罰潮）。

> 共通限制：多數網路研究因 WebFetch 受限，數值取自搜尋摘要與權威來源連結交叉比對，正式對外引用前建議回溯原始期刊/法條全文核對；人格效果量普遍偏弱，產品論述勿過度宣稱單一方向因果。
