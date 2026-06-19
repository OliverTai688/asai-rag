# 誠問 AI Issue Maturity 與 PQ 題庫構面研究 v1.0

> 建立日期：2026-06-18  
> 對應任務：`AGENTS.md` 的 `Batch ITA-000`、`Batch ITA-001`  
> 狀態：研究定稿，可進入產品審閱與實作

---

## 1. 結論

Issue 0-5 不應設計成「客戶好壞」或「成交機率」分數，而應設計成 **Issue Readiness Level, IRL（議題就緒度）**。IRL 評估的是顧問是否已掌握足夠事實、決策脈絡、風險理解與下一步，以便安全地產出訪談策略或劇場情境。

PQ 題庫也不應只是保險產品問卷，而應是一組半結構化探問，用來補齊 IRL 的證據。題目必須能標記回答性質：

- `fact`：客戶明確提供或既有 CRM/保單資料。
- `confirmed`：顧問與客戶確認後可寫回的事實。
- `inference`：AI 或顧問的推論，預設不寫回。
- `unknown`：尚不確定，應追問或保留。

本研究建議把 Issue 0-5 建成五個構面：

1. **事實完整度**：人口、家庭、收支、既有保障、合規欄位是否足以描述情境。
2. **問題表徵品質**：能否形成一句清楚的 issue summary，並指出缺口。
3. **風險與因應評估**：客戶是否理解風險嚴重性、發生脆弱性、方案有效性與可執行性。
4. **決策準備度**：客戶是否被充分告知、價值排序是否清楚、共同決策者與支持系統是否到位。
5. **顧問行動性**：顧問是否能提出下一步、訪談策略、合規提醒與可驗證素材。

---

## 2. 研究依據

### 2.1 決策衝突與共同決策

Ottawa Hospital Research Institute 的 Decisional Conflict Scale 用來測量人們在選擇選項時的 uncertainty，以及造成 uncertainty 的可修正因素，例如資訊不足、價值不清、缺乏支持；完整版本也看選擇是否 informed、values-based、likely to be implemented。這直接對應保險顧問情境中的「客戶還沒準備好決策」。

系統採用方式：

- 不照搬醫療量表題目與分數。
- 借用構面：資訊充分、價值清楚、支持/共同決策、可執行的決策。
- 在 UI 顯示「缺哪些決策證據」，而不是只顯示抽象分數。

來源：[Decisional Conflict Scale - Ottawa Hospital Research Institute](https://decisionaid.ohri.ca/eval_dcs.html)。

### 2.2 臨床推理的 problem representation

臨床推理文獻把 problem representation 放在 data acquisition 與 hypothesis generation 之間：先把零散資料轉成結構化、可行動的問題表徵，再引導後續資料蒐集與判斷。NCBI Bookshelf 與 Bowen 的 NEJM 教學文章都強調，好的 problem representation 能協助生成假設、聚焦追問、辨識區分性特徵。

系統採用方式：

- 每個 issue 都要能生成一句「問題表徵」：
  - `誰`：客戶/家庭/決策者。
  - `在什麼情境`：收入、家庭責任、既有保障、事件或目標。
  - `面臨什麼缺口`：保障、現金流、決策、合規或資料缺口。
  - `下一步需要確認什麼`。
- IRL 3 以上才允許生成具體訪談策略；IRL 1-2 只能生成追問建議。

來源：[NCBI Bookshelf - Prerequisites for Learning Clinical Reasoning](https://www.ncbi.nlm.nih.gov/books/NBK543761/)、[Bowen 2006 NEJM PDF](https://www.bumc.bu.edu/facdev-medicine/files/2010/06/Bowen-clinical-reasoning-NEJM.pdf)。

### 2.3 Protection Motivation Theory

Protection Motivation Theory 將保護行為動機拆成 threat appraisal 與 coping appraisal。ASU 的學術資料頁摘要指出，threat appraisal 包含 threat severity / vulnerability，coping appraisal 包含 self-efficacy / response efficacy。這很適合保險情境，因為保險不是只讓客戶害怕風險，也要確認客戶相信方案有效、自己付得起且能執行。

系統採用方式：

- 保險 issue 不只問「怕不怕」，也問：
  - 風險嚴重性：若發生，影響到誰、多久、多少金額。
  - 脆弱性：哪些家庭/工作/健康/負債條件讓事件更有影響。
  - 因應有效性：客戶是否理解保險或替代方案能解決哪一段。
  - 自我效能/成本：客戶是否負擔得起、願意執行、需要誰同意。

來源：[Arizona State University - Protection Motivation Theory](https://asu.elsevierpure.com/en/publications/protection-motivation-theory/)。

### 2.4 Miller's Pyramid

Miller 的能力評估金字塔把 competence/performance 分成 knows、knows how、shows how、does。這不是保險量表，但可用來約束系統不要把「知道一點資料」誤判成「能行動」。IRL 的 0-5 可對應從無資料、知道線索、能解釋、能示範策略，到能執行並驗證。

系統採用方式：

- IRL 1：只知道線索。
- IRL 2：知道如何追問。
- IRL 3：能形成可評估問題。
- IRL 4：能設計策略。
- IRL 5：能帶著已確認資料執行下一步。

來源：[Miller 1990 PubMed record](https://pubmed.ncbi.nlm.nih.gov/2400509/)、[Revisiting Miller's pyramid in medical education](https://pmc.ncbi.nlm.nih.gov/articles/PMC7246123/)。

### 2.5 財務風險承受度

Grable and Lytton risk-tolerance scale 的 15 年回顧顯示，財務風險承受度量表具有可驗證的 reliability/validity，且高分與 equity ownership 正相關、與 cash/bond ownership 負相關。保險顧問情境不應直接把投資風險承受度等同於保障需求，但可以借用「意願、能力、行為證據」分離的精神。

系統採用方式：

- 不把風險承受度當成是否推保險的唯一依據。
- 分離：
  - risk need：客觀保障缺口。
  - risk capacity：收入、支出、保費負擔、現金流承受能力。
  - risk tolerance：客戶心理接受度與偏好。
  - behavior evidence：既有行為，如保單、儲蓄、延遲決策、解約經驗。

來源：[The Grable and Lytton risk-tolerance scale: A 15-year retrospective](https://openjournals.libs.uga.edu/fsr/article/view/3240)。

---

## 3. Issue Readiness Level 0-5

| Level | 名稱 | 系統意義 | 可允許輸出 |
| --- | --- | --- | --- |
| 0 | 不適用 / 無資料 | 此 issue 沒有可靠資料，或目前不適用。 | 不生成建議，只列為未評估。 |
| 1 | 線索存在 | 有模糊訊號，例如顧問提到擔心、客戶有家庭責任，但缺基本事實。 | 只能產生追問題。 |
| 2 | 初步成形 | 已有基本事實，可形成初步 issue summary，但缺關鍵數字、決策者或既有保障。 | 產生追問清單與資料缺口。 |
| 3 | 可評估 | 事實足以描述問題，風險/缺口/決策脈絡大致清楚，但仍需確認至少一個高影響項。 | 可生成訪談策略草稿，標記待確認。 |
| 4 | 策略就緒 | 需求、背景、決策者、可行性與合規注意事項清楚，可形成下一次對話準備。 | 可生成客戶輪廓、對話準備卡、SPIN/PQ 題。 |
| 5 | 行動已確認 | 關鍵事實已確認，客戶價值排序與下一步明確，且顧問有可執行/可追蹤的行動。 | 可生成正式準備包、劇場場景、追蹤任務。 |

### Level 判斷規則

每個 issue 以五個構面評估，取最低成熟構面的限制作為上限：

| 構面 | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
| --- | --- | --- | --- | --- | --- |
| 事實完整度 | 只有線索 | 有基本背景 | 有必要事實 | 關鍵欄位齊 | 已確認且可引用 |
| 問題表徵 | 不能摘要 | 可列主題 | 可寫 issue summary | summary 含因果與缺口 | summary 已經客戶/顧問確認 |
| 風險與因應 | 只知道擔心 | 知道可能風險 | 知道嚴重性/脆弱性 | 知道方案有效性/成本 | 客戶理解並接受下一步 |
| 決策準備 | 決策者未知 | 決策者可能已知 | 共同決策/價值待確認 | 價值排序清楚 | 已約定下一步或同意補資料 |
| 顧問行動性 | 只能泛問 | 能列追問 | 能設計訪談方向 | 能準備對話卡 | 能建立任務/劇場/追蹤 |

### 不得自動升級的情況

- `sensitivityLevel` 高且缺少 audit reason。
- `kycStatus` 不足以支持建議或商品討論。
- 只有 AI inference，沒有 fact/confirmed material。
- 共同決策者缺席且會實質影響決策。
- 客戶明確表達不想討論或需暫停。

---

## 4. Issue 類別 v1

| Issue key | 顯示名稱 | 主要證據 | 典型下一步 |
| --- | --- | --- | --- |
| `family_protection` | 家庭責任保障 | 家庭成員、經濟支柱、扶養責任、債務 | 確認責任期間與必要月現金流 |
| `income_interruption` | 收入中斷風險 | 職業、收入穩定度、緊急預備金、失能/傷病風險 | 釐清可承受停工月數 |
| `medical_care` | 醫療與長照準備 | 既有醫療保障、家族照護經驗、長照責任 | 確認自費醫療/長照預算 |
| `retirement_cashflow` | 退休與現金流 | 年齡、退休目標、儲蓄率、資產配置 | 盤點退休收入來源與缺口 |
| `education_dependents` | 子女教育/依賴者 | 子女年齡、教育期程、照顧安排 | 確認目標金額與時間 |
| `policy_clarity` | 既有保單理解 | 保單清單、保障內容、重複/缺口 | 建立保單摘要與缺口表 |
| `decision_alignment` | 決策一致性 | 共同決策者、價值排序、顧慮 | 安排共同討論或補資料 |
| `compliance_readiness` | 合規與資料完整 | KYC、敏感資料同意、錄音/揭露需求 | 補齊合規欄位與同意紀錄 |

---

## 5. PQ 題庫 v1

PQ 題庫採「核心題 + 追問題」結構。每題需標記可補強的 IRL 構面。

### 5.1 家庭責任保障

| 題目 | 追問 | 補強構面 |
| --- | --- | --- |
| 目前家中有哪些人主要依靠你的收入或照顧？ | 若你暫時無法工作，誰會最先受到影響？ | 事實完整度、風險脆弱性 |
| 你希望家人在發生重大事件時，至少維持多久的生活穩定？ | 這段期間每月大概需要多少現金流？ | 風險嚴重性、顧問行動性 |
| 家裡重大財務決策通常由誰一起討論？ | 下一次若談到保障安排，誰需要在場？ | 決策準備度 |

### 5.2 收入中斷風險

| 題目 | 追問 | 補強構面 |
| --- | --- | --- |
| 如果收入中斷 3-6 個月，現在的預備金能支撐多久？ | 哪些支出最難降低？ | 風險嚴重性、risk capacity |
| 你的收入比較固定，還是受業績/案量影響？ | 最近一年收入波動大概落在哪個範圍？ | 事實完整度 |
| 你最擔心的是短期醫療、長期失能，還是家庭照顧造成的中斷？ | 過去身邊是否有人遇過類似狀況？ | 風險感受、problem representation |

### 5.3 醫療與長照準備

| 題目 | 追問 | 補強構面 |
| --- | --- | --- |
| 你目前對自己的醫療保障內容有多清楚？ | 哪些項目你不確定有沒有理賠？ | policy_clarity、決策準備 |
| 家中是否有照顧長輩或重大醫療支出的經驗？ | 那次經驗中最吃力的是費用、時間還是人力？ | 風險嚴重性、價值排序 |
| 若需要長期照顧，你比較希望家人照顧、專業機構，還是混合安排？ | 這背後你最重視的是尊嚴、費用、方便性或家人負擔？ | 價值清晰度 |

### 5.4 退休與現金流

| 題目 | 追問 | 補強構面 |
| --- | --- | --- |
| 你心中理想退休年齡和每月生活費大概是多少？ | 這個數字包含房貸、醫療或孝親嗎？ | 事實完整度、problem representation |
| 目前有哪些退休收入來源是你比較確定的？ | 哪些來源你覺得不穩定？ | risk capacity、風險脆弱性 |
| 你偏好穩定現金流，還是願意接受波動換取成長？ | 過去投資或保單經驗讓你更保守還是更積極？ | risk tolerance、行為證據 |

### 5.5 子女教育/依賴者

| 題目 | 追問 | 補強構面 |
| --- | --- | --- |
| 對子女教育或家人照顧，你有沒有一定想完成的責任？ | 這個責任大概會持續到什麼時間點？ | 事實完整度、風險嚴重性 |
| 如果家庭收入突然改變，哪些教育或照顧安排最不能中斷？ | 是否已有專門準備金？ | risk need、risk capacity |
| 這類安排通常誰會共同決定？ | 需要先取得誰的共識？ | 決策準備 |

### 5.6 保單理解與決策一致性

| 題目 | 追問 | 補強構面 |
| --- | --- | --- |
| 你現在手上的保單，哪些是你很清楚用途的？ | 哪些是買了但不確定還適不適合的？ | policy_clarity |
| 過去做保險決策時，最讓你卡住的是價格、信任、條款，還是家人意見？ | 這次若要往前一步，哪個卡點要先處理？ | 決策衝突、價值清晰度 |
| 你希望顧問下一次帶給你的是保單整理、缺口分析、方案比較，還是先釐清問題？ | 哪一種最能幫你做決定？ | 顧問行動性 |

---

## 6. UI / API 使用規則

- Member admin 可看到每個 issue 的 IRL、文字標籤、缺口與下一步。
- Org admin 只能看彙總與輔導指標，例如「團隊平均 issue readiness」「常見缺口類別」，不得看到客戶明細或逐字稿。
- Super admin 可看系統彙總；impersonation 期間若查看敏感 issue material，必須寫 audit log。
- Client-facing share page 不顯示內部 IRL 分數；只能顯示已確認且適合對客戶揭露的摘要。
- AI 產出必須把 `fact`、`confirmed`、`inference`、`unknown` 分開，避免把推論包裝成客戶事實。

---

## 7. 實作建議

建議新增 domain module：

```text
src/domains/interview/issue-maturity.ts
```

內容包含：

- `ISSUE_CATEGORIES`
- `ISSUE_READINESS_LEVELS`
- `ISSUE_READINESS_DIMENSIONS`
- `PQ_QUESTION_BANK`
- `evaluateIssueReadiness(materials)` 的純函式 stub

本文件先作為 ITA-000 gate 的產品/研究定義；實作應在 ITA-001/002/004 逐步接上，避免一次把 scoring、劇場與 DB migration 綁死。
