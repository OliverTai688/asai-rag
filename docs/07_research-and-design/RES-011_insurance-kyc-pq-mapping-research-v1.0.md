# 誠問 AI Insurance KYC / PQ Mapping Research v1.0

> 建立日期：2026-06-18  
> 狀態：研究定稿，可作為 ITA-000 / ITA-001 / ITA-002 的合規映射基線  
> 對應問題：若沒有公司既有問卷，如何讓 `RES-010` 的 PQ 題庫與保險招攬需求分析、KYC/KYP、適合度、業務員報告書欄位對齊。

---

## 1. 結論

目前先採 **canonical compliance mapping**，不等待單一公司問卷：

1. 以主管機關、公會自律規範與公開 KYC/需求適合度報告書常見欄位建立「必備欄位骨架」。
2. `RES-010` 的 PQ 題庫保留自然語氣，但每題必須綁定 `intentKey`、`complianceFieldKey`、`evidenceKind`。
3. 未來若 operator 提供公司既有問卷，只做欄位映射與語氣替換，不推翻 domain model。
4. AI 可改寫問句，但不可改變題目意圖、合規欄位、fact/inference/unknown 標記。

本文件不是法律意見，也不替代公司法遵審核；它是產品與資料模型的合規對齊基線。

---

## 2. 研究依據

### 2.1 招攬文件至少應包含的資訊

壽險公會法規查詢系統的「保險業招攬及核保作業控管自律規範」明列業務員報告書或其他招攬文件/電話錄音紀錄至少應包含招攬經過、要保人/被保險人/受益人身分確認、投保目的與需求、要保人與被保險人收入/財務狀況、是否投保其他商業保險、投保前三個月內是否終止契約/貸款/保單借款、家中主要經濟來源者、身故受益人指定等資訊。65 歲以上客戶還要評估是否具有辨識不利其投保權益情形之能力與商品適合性。

來源：  
https://law.lia-roc.org.tw/Law/Content?lsid=FL037628

### 2.2 需求與適合度分析/KYC

金管會主管法規資料提到「瞭解要保人及被保險人之需求及其適合度分析評估暨業務員報告書」KYC 範本，重點是把了解需求與適合度分析整合到業務員報告書，而不是只做銷售話術。

來源：  
https://law.fsc.gov.tw/LawContent.aspx?id=GL000234

### 2.3 KYC / KYP 商品適合度

金融消費評議中心解釋 KYC 是金融服務業提供金融商品或服務前的基本動作，用以了解客戶風險承受能力；KYP 是金融服務業推介商品前，需理解商品複雜度與風險，再搭配客戶風險屬性提供合適商品。

來源：  
https://www.foi.org.tw/Article.aspx?Arti=2424&Lang=1&lid=1839

### 2.4 投資型保險與不當銷售防線

投資型保險商品銷售自律規範要求建立交易控管機制，避免提供客戶逾越財力狀況或不合適商品/服務，避免以貸款或保單借款繳交保費等不當行為。

來源：  
https://law.lia-roc.org.tw/Law/Content?lsid=FL046519

### 2.5 公開 KYC 報告書欄位參考

公開保險需求及適合度分析評估暨業務員報告書範例中，業務員聲明包含已評估收入、財務狀況、職業、保費負擔能力、保險金額相當性，並確認已說明承保範圍、除外不保事項與商品風險。

來源：  
https://www.wwunion.com/wp-content/uploads/2020/06/KYC-%E4%BF%9D%E9%9A%AA%E9%9C%80%E6%B1%82%E5%8F%8A%E9%81%A9%E5%90%88%E5%BA%A6%E5%88%86%E6%9E%90%E8%A9%95%E4%BC%B0%E6%9A%A8%E6%A5%AD%E5%8B%99%E5%93%A1%E5%A0%B1%E5%91%8A%E6%9B%B8%EF%BC%88%E4%BA%BA%E8%BA%AB%E4%BF%9D%E9%9A%AA%EF%BC%89%EF%BC%88109-05%E7%89%88%EF%BC%89-1090520-O.pdf

---

## 3. Canonical Compliance Field Set

| Field key | 顯示名稱 | 最小資料 | Evidence kind | PQ intent |
| --- | --- | --- | --- | --- |
| `solicitation_context` | 招攬經過 | 來源、關係、接觸契機、對話目的 | fact/unknown | 釐清為何拜訪 |
| `identity_relationship` | 身分與關係 | 要保人、被保險人、受益人、關係 | fact/confirmed | 確認角色與責任 |
| `insurance_purpose_need` | 投保目的與需求 | 保障、退休、醫療、長照、資產傳承等目的 | fact/inference/confirmed | 釐清需求與價值 |
| `income_financial_status` | 收入與財務狀況 | 工作收入、其他收入、現金流、保費負擔能力 | fact/unknown | 評估 risk capacity |
| `existing_commercial_insurance` | 既有商業保險 | 保單種類、保額、缺口、不確定項 | fact/unknown | 避免重複或缺口 |
| `recent_policy_actions` | 近期保單/借貸動作 | 三個月內解約、貸款、保單借款 | fact/unknown | 防止不當替換與財務壓力 |
| `primary_economic_provider` | 家中主要經濟來源者 | 家中經濟支柱與依賴者 | fact/inference | 家庭保障責任 |
| `beneficiary_reasonableness` | 受益人合理性 | 受益人是否為配偶/直系親屬/法定繼承人，若否原因 | fact/unknown | 身故保障與倫理 |
| `senior_suitability` | 高齡適合性 | 65+ 辨識能力、不利因素理解、商品適合理由 | fact/confirmed | 高齡關懷與風險揭露 |
| `product_understanding` | 商品理解 | 承保範圍、除外不保、商品風險 | confirmed/unknown | KYP / disclosure |
| `risk_tolerance_capacity` | 風險承受與能力 | 投資屬性、波動接受度、保費負擔、流動性 | fact/inference | 投資型/長期繳費適合度 |
| `advisor_compliance_notes` | 業務員補充說明 | 其他有利核保或合規判斷資訊 | fact/inference/unknown | 補足特殊情境 |

---

## 4. PQ Mapping Strategy

### 4.1 問題資料結構

每個 PQ 題目應至少包含：

```ts
type PqComplianceMapping = {
  intentKey: string;
  complianceFieldKey: string;
  defaultQuestion: string;
  allowedRewrite: boolean;
  evidenceKind: "FACT" | "CONFIRMED" | "INFERENCE" | "UNKNOWN";
  requiresConfirmationBeforeWriteback: boolean;
  riskFlags: string[];
};
```

### 4.2 映射範例

| intentKey | complianceFieldKey | 預設問句 | 寫回規則 |
| --- | --- | --- | --- |
| `clarify_visit_trigger` | `solicitation_context` | 你這次想找這位客戶談，是最近有什麼契機嗎？ | fact，可由顧問確認 |
| `identify_dependents` | `primary_economic_provider` | 目前家中有哪些人主要依靠他的收入或照顧？ | fact/inference，寫回前確認 |
| `estimate_income_resilience` | `income_financial_status` | 如果收入中斷 3-6 個月，現在預備金能撐多久？ | fact，高敏感時需確認 |
| `review_existing_coverage` | `existing_commercial_insurance` | 他現在有哪些保險？哪些內容你很確定？ | fact/unknown，未知不得補造 |
| `detect_recent_policy_actions` | `recent_policy_actions` | 最近三個月是否有解約、貸款或保單借款？ | fact/unknown，缺資料必追問 |
| `understand_decision_party` | `identity_relationship` | 這類保障安排通常誰會一起決定？ | fact/inference，寫回前確認 |
| `assess_product_understanding` | `product_understanding` | 若下一步談方案，他需要先理解哪些保障範圍或除外事項？ | confirmed，需商品階段再確認 |
| `senior_suitability_check` | `senior_suitability` | 若客戶 65 歲以上，他是否能理解商品的不利因素與長期承諾？ | confirmed，需要 audit note |

---

## 5. AI 改寫規則

AI 可依情境改寫問句，但必須遵守：

- 不改 `intentKey`。
- 不改 `complianceFieldKey`。
- 不把 `UNKNOWN` 改成 `FACT`。
- 不把 inference 寫成 confirmed。
- 不用恐懼、保證、誇大或商品暗示語氣。
- 不在未 KYC 前引導具體商品結論。
- 對高齡、投資型、保單借款/解約、敏感財務資料使用中性問法。

範例：

- 原題：「如果收入中斷 3-6 個月，現在預備金能撐多久？」
- 可改寫：「你對他目前現金流掌握到什麼程度？如果短期收入停下來，哪些支出會最有壓力？」
- 不可改寫：「你應該趕快幫他補一張失能險，不然家人會很慘。」

---

## 6. Missing Company Questionnaire Handling

若暫時沒有公司既有問卷：

1. 使用本文件 `Canonical Compliance Field Set` 作為資料欄位基線。
2. 使用 `RES-010` 題庫作為訪談語氣與情境追問。
3. 每個 output 顯示缺口，不顯示「已合規完成」。
4. 生成 `complianceNotes`，提醒顧問哪些內容仍需公司正式 KYC/報告書確認。

若未來提供公司問卷：

1. 建立 `companyQuestionnaireFieldKey -> complianceFieldKey` mapping。
2. 保留原公司題號/題文/版本。
3. AI 題目改寫只能產生訪談輔助問法，不能替代正式表單題文。
4. 寫回正式欄位前必須顧問確認。

---

## 7. Product Implications

- `/interview` 的準備卡應顯示「合規缺口」而非「合規通過」。
- ITA-002 寫回 CRM 時，`confirmed` 才可寫入正式客戶欄位；`inference` 預設留在 interview materials。
- ITA-003 劇場建場時，NPC 可使用 confirmed/fact；unknown 由旁白 NPC 以情境問題詢問，使用者可略過或補充資訊。
- Org admin 只看缺口彙總，例如「團隊常缺 income_financial_status」，不看逐字回答。
- Super admin 在 impersonation/audit 條件下可調閱 IRL 0-5 與欄位缺口。

---

## 8. Implementation Recommendation

建議後續新增：

```text
src/domains/interview/pq-compliance.ts
```

內容：

- `COMPLIANCE_FIELD_SET`
- `PQ_COMPLIANCE_MAPPINGS`
- `rewriteGuard(intentKey, rewrittenQuestion)`
- `deriveComplianceGaps(outputDraft)`

本研究先作為產品與合規映射基線；正式公司法遵版本進來後，再用 mapping 取代預設題文。
