# RPT-002 誠問 AI — AGENTS.md 與 Batch Task 操作模型報告

> 類型 RPT ｜分類 06_audits-and-reports ｜日期 2026-06-17 ｜狀態：已交付
> 對象：`AGENTS.md`、`docs/00_manual-and-index/MAN-000`、`docs/05_execution-plans/PLN-006`
> 參照來源：`2026-nuvaclub` 的 `AGENTS.md` 與 `docs/` 治理慣例

本報告說明本次為誠問 AI 建立的 **AGENTS.md 操作真相源 + 可執行 batch-task 架構 + docs 命名制**的執行概念與特性，並記錄本次變更。

---

## 1. 一句話總結

把「給 agent 的指令」從零散的設計守則，升級為**單一操作真相源（AGENTS.md）+ 可逐張驗收執行的 batch-task workstream + 類型化 docs 治理**，讓任何 agent 都能在同一套協定下「撿卡 → 做 → 自我驗收 → 勾選」，而不需要每次重新理解專案。

---

## 2. 核心概念

### 2.1 AGENTS.md = 單一操作真相源

過去 `AGENTS.md` 只有三件事：Next.js 版本警語、ElevenLabs 設計守則、一段指向某設計文件的批次協定。改寫後它承載**agent 工作所需的全部操作脈絡**：

- 環境與架構速覽（指令、領域結構、API、state、DB、i18n）。
- 「絕不可碰」硬規則（合規欄位、SPIN 狀態機、Theater enum、AiUsageLog、`src/generated/`）。
- 設計系統北極星（ElevenLabs 克制）。
- **Batch Task 操作模型**（協定 + 範本）。
- 至少一個**完整的 worked example workstream**（ElevenLabs UI Redesign）。
- docs 命名慣例指引。

### 2.2 Workstream 的四段固定結構

每條 workstream 都長一樣，agent 不必猜：

| 段落 | 作用 |
| --- | --- |
| **Context** | 一句話界定範圍 + 引用 `PLN-`/`ACC-`/`ARC-` 文件；明說「只做 X、不做 Y」。 |
| **Current Gaps** | 現況事實（已存在什麼、缺什麼），讓撿卡的 agent 對齊狀態。 |
| **Batch `<KEY>-<NNN>`** | 一張卡 = 一份 `[x]/[ ]` 驗收清單，每項可獨立驗收。 |
| **Current Blockers** | 阻擋項（需 operator 的 DB push、缺 session/seed、需人工核可）。 |

### 2.3 卡 = 驗收清單，勾選 = 單一真相

每個 `- [ ]` 是一個**可獨立驗收的成果**，不是模糊目標。完成就地把 `[ ]` 改 `[x]`；卡內勾選狀態本身就是進度真相，**不另開重複追蹤表**。這是從 nuvaclub 學到的關鍵特性：進度與規格放在同一處，避免「文件說做完、實際沒做」的漂移。

---

## 3. 執行協定（agent 怎麼跑一張卡）

1. **撿最低未阻擋卡**：尊重批次依賴（B0 → B1 → …）。
2. **單卡單分支**：`redesign/<KEY>-<NNN>-<slug>` 或 `feat/...`，獨立可審。
3. **只做卡的範圍**：尊重「範圍外」，不順手 batch-replace。
4. **完成前驗收**：跑 `pnpm lint:changed`（**diff-scoped 閘門，必過**）。
5. **DoD**：驗收全綠 → `[ ]` 打 `[x]` → 同步進度看板 → 註記變更檔。
6. **絕不可碰**：五項硬規則。

### 特性：diff-scoped 閘門（而非全 repo 全綠）

本 repo 帶有**預先存在的紅線 `pnpm lint` 基準**（React 19 嚴格規則 + `no-explicit-any`，集中在受保護的 SPIN/theater/AI code）。因此閘門刻意定為「**在你動過的檔案中不新增 lint 問題**」（`pnpm lint:changed`），而非要求全 repo 綠。這讓 UI redesign 不會被迫改寫受保護的核心邏輯，也不會被既有紅線卡死。這是本專案與 nuvaclub（用 `pnpm run lint` 全綠）最大的協定差異。

---

## 4. docs 命名制（本次一併遷移）

從「分類資料夾 + 全域流水號」（`01-product/001-…`）整批遷移為 nuvaclub 式「**分類資料夾 + 類型前綴流水號**」（`<TYPE>-<NNN>_<slug>`）：

- 依**文件屬性**而非功能模組選 TYPE：`PRD`/`ARC`/`PLN`/`AUD`/`RPT`/`RES`/`ACC`/`MAN`。
- 流水號**同類型內**遞增（PRD-001、PRD-002…），不是全域。
- 由 `MAN-000`（使用說明）+ `MAN-001`（索引）治理；新增文件必登錄索引。
- 過期文件不刪除，標 `superseded by`（例：`ARC-005` 已被 `ARC-004` 取代）。

### 特性：AGENTS.md 與 docs 雙向引用

workstream 的 Context 引用 `PLN-`/`ARC-`/`ACC-` 文件（細節在 docs），而 AGENTS.md 內嵌精簡的可執行鏡像（勾選真相在 AGENTS.md）。docs 放「為什麼/完整規格」，AGENTS.md 放「現在撿哪張、做到哪」。

---

## 5. 本次變更清單

### 新增
- `AGENTS.md` — 全面改寫為操作真相源（環境/架構、絕不可碰、設計北極星、Batch Task 操作模型、Workstream 範本、ElevenLabs UI Redesign worked example、docs 慣例）。
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md` — docs 使用說明書。
- `docs/00_manual-and-index/MAN-001_document-index.md` — docs 文件索引（取代舊 `000-文件目錄.md`）。
- `docs/06_audits-and-reports/RPT-002_…`（本報告）。

### 遷移（27 份文件 → 類型化命名）
- `01_product-requirements/`：PRD-001~002（2）。
- `02_architecture-and-rules/`：ARC-001~005（5；含雙 Agent 設計 v1.1 現行 / v1.0 superseded）。
- `05_execution-plans/`：PLN-001~011（11；含 PLN-006 ElevenLabs Batch Tasks）。
- `06_audits-and-reports/`：AUD-001、RPT-001（+ 本 RPT-002）。
- `07_research-and-design/`：RES-001~004（含兩份半結構訪綱、待決清單、UI prompt）。
- `08_acceptance-and-qa/`：ACC-001~002。
- 修正所有跨文件路徑引用（ARC-003↔PLN-006、ACC-001→ARC-002、ARC-004→RES-001、RPT-001→AUD-001、ACC-002 截圖路徑）。

### 刪除
- 舊 `docs/000-文件目錄.md`（由 MAN-001 取代）。
- 舊分類資料夾 `01-product`…`06-reports`（內容已遷出）。

---

## 6. 與 nuvaclub 的異同

| 面向 | nuvaclub | 誠問 AI（本次） |
| --- | --- | --- |
| AGENTS.md 角色 | 操作真相源 + 多條產品 workstream | 操作真相源 + 協定 + 1 條 worked example（其餘待擴充） |
| workstream 結構 | Context / Gaps / Batch 卡 / Blockers | 相同 |
| 卡 = 驗收清單 | `[x]/[ ]` | 相同 |
| lint 閘門 | `pnpm run lint` 全綠 | `pnpm lint:changed` diff-scoped（因有保護性紅線基準） |
| docs 命名 | `TYPE-NNN_slug` + MAN 索引 | 相同 |
| 不可碰 | 合規/SPIN/Theater/AiUsageLog/generated | 相同（誠問 AI 的法規與狀態機） |

---

## 7. 下一步建議（非本次範圍）

依「只建架構與協定」的決定，本次只內嵌 ElevenLabs UI 一條 worked example。後續可依 `AGENTS.md` 的「新增 workstream 流程」逐步補上：

1. **SPIN 訪談**（依 PLN-008 / PLN-009）。
2. **多租戶上架**（依 PLN-011）。
3. **CRM 分頁優化**（依 PLN-007）。
4. **家庭關係圖多世代**（依 PLN-010）。

每條都先寫/對齊 `PLN-` 與 `ACC-`，再到 AGENTS.md 用範本展開 Batch 卡。
