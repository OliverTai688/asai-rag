# MAN-000 誠問 AI docs 使用說明書

本說明書定義 `docs/` 的分類、文件號與命名規則。命名制參照 `2026-nuvaclub` 的文件治理慣例，於 2026-06-17 由「分類資料夾 + 全域流水號」整批遷移為「分類資料夾 + 類型前綴流水號」。

刻意保留以下位置不納入正式文件庫：

- `evidence/`（若存在）：驗收證據、截圖、執行紀錄，維持在 `docs/` 之外。
- Agent 暫存輸入與產物：不要混進正式文件庫。

## 快速使用

- 要找使用說明與完整索引，先看 `00_manual-and-index`。
- 要找產品需求與定位，先看 `01_product-requirements`。
- 要找技術架構、設計系統、雙 Agent 設計、規則，先看 `02_architecture-and-rules`。
- 要找功能說明，先看 `03_feature-reference`。
- 要找「接下來怎麼做」的計畫、路線圖、批次任務，先看 `05_execution-plans`。
- 要找已完成盤點、審計、開發/交付報告，先看 `06_audits-and-reports`。
- 要找研究、設計探索、訪綱、待決清單，先看 `07_research-and-design`。
- 要找驗收框架與 QA 驗證計畫，先看 `08_acceptance-and-qa`。

完整文件清單請看 [MAN-001_document-index.md](./MAN-001_document-index.md)。

## 目錄分類

| 資料夾 | 文件屬性 | 文件數 |
| --- | --- | ---: |
| `00_manual-and-index` | 使用說明與索引 | 2 |
| `01_product-requirements` | 產品需求文件 | 3 |
| `02_architecture-and-rules` | 架構、設計系統與規則 | 9 |
| `03_feature-reference` | 功能參考文件 | 0 |
| `05_execution-plans` | 計畫、路線圖與批次任務 | 22 |
| `06_audits-and-reports` | 審計、開發與交付報告 | 9 |
| `07_research-and-design` | 研究與設計探索 | 20 |
| `08_acceptance-and-qa` | 驗收與 QA 文件 | 14 |

> `03_feature-reference` 目前無文件，待有獨立功能說明文件（非需求、非計畫）時再啟用。`04_playbook`（前台使用內容）本專案暫不使用。

## 文件號規則

命名格式：

```text
<TYPE>-<NNN>_<kebab-case-title>.md
```

- `<TYPE>`：依「文件屬性」決定，不是依功能模組決定。
- `<NNN>`：**同類型內**的三位數流水號（PRD-001、PRD-002…、ARC-001…），不是全域流水號。
- `<kebab-case-title>`：小寫英文 kebab-case；文件標題（檔案第一行 `#`）可保留中文或中英混合。

範例：

- `PRD-001_product-spec-v1.0.md`：產品需求文件。
- `ARC-003_elevenlabs-design-direction-v1.0.md`：設計系統/規則。
- `PLN-006_elevenlabs-batch-tasks-v1.0.md`：可執行批次任務計畫。
- `AUD-001_experiential-version-audit-report.md`：審計報告。

## 類型代碼

| 代碼 | 用途 | 資料夾 | 目前數量 |
| --- | --- | --- | ---: |
| `MAN` | Manual / Index 使用說明與索引 | `00_manual-and-index` | 2 |
| `PRD` | Product Requirements 產品需求 | `01_product-requirements` | 3 |
| `ARC` | Architecture / Design System 架構與設計規則 | `02_architecture-and-rules` | 9 |
| `REF` | Reference 功能參考 | `03_feature-reference` | 0 |
| `PLN` | Plan / Roadmap / Batch 計畫與批次任務 | `05_execution-plans` | 22 |
| `AUD` | Audit 審計文件 | `06_audits-and-reports` | 4 |
| `RPT` | Report 開發/交付/分析報告 | `06_audits-and-reports` | 5 |
| `RES` | Research 研究與設計探索 | `07_research-and-design` | 20 |
| `ACC` | Acceptance / QA 驗收文件 | `08_acceptance-and-qa` | 14 |

> 未來如需新增類型（如 `BIZ` 商務規則、`ENV` 環境變數、`DBS` 資料庫、`MIG` 遷移），沿用 nuvaclub 同名代碼，放入屬性最接近的資料夾。

## 新增文件流程

1. 先判斷**文件屬性**（需求 / 規則 / 計畫 / 報告 / 研究 / 驗收），不要先用功能模組決定資料夾。
2. 到對應資料夾找同類型代碼的最大文件號，接下一號。
3. 檔名使用小寫英文 kebab-case；標題可保留中文。
4. 新增任何計畫/設計/報告文件後，務必在 [MAN-001_document-index.md](./MAN-001_document-index.md) 補一列。
5. 若是可被 agent 逐張執行的批次任務，計畫文件放 `05_execution-plans`（`PLN`），並在 `AGENTS.md` 對應 workstream 引用它。

## 維護原則

- PRD、計畫、審計不要混放；同一功能可能同時有三種文件，但應依文件屬性分區。
- 需求變更以新的 PRD 承接，不直接把審計報告改成需求文件。
- 過期文件不要刪除；在文件內標註 `superseded by <TYPE-NNN>`，並在索引備註欄補說明（例：`ARC-005` 已被 `ARC-004` 取代）。
- 批次任務的「單一真相」是文件內的進度看板與 `[x]/[ ]` 勾選狀態；不要另開重複的追蹤表。
