# 誠問 AI 介面簡化模式研究 v1.0

> 研究日期：2026-06-17  
> 範圍：研究 icon、popover/dialog/sheet、收合、漸進揭露等模式，轉譯為誠問 AI dashboard / CRM / pre-visit / theater 的介面簡化準則。  
> 關聯文件：`ARC-003_elevenlabs-design-direction-v1.0.md`、`PLN-006_elevenlabs-batch-tasks-v1.0.md`、`ACC-002_elevenlabs-visual-acceptance-plan-v1.0.md`。

---

## 1. 研究結論

誠問 AI 的介面簡化不應等於「把文字全部換成 icon」。研究共識是：icon 可降低視覺重量，但多數 icon 仍有歧義；複雜流程應透過漸進揭露、分層操作與更少的同屏決策來降低認知負荷。

本產品應採取四個方向：

1. **主畫面只保留主要任務**：每頁第一屏只呈現 1 個 primary action、2-3 個 secondary actions，其餘移到 overflow、popover、sheet 或詳細頁。
2. **icon 作為掃描輔助，不作為猜謎**：導航與主要 CTA 保留文字；重複性工具列可用 icon-only，但必須有 `aria-label`、tooltip、可觸控尺寸。
3. **短任務用 dialog，長任務用 sheet / full page**：新增客戶、選資料來源可用 dialog；拜訪規劃、劇場設定、報告生成這類多步任務應改成右側 sheet 或頁內 stepper。
4. **收合只藏低頻資訊，不藏決策必要資訊**：accordion 適合「歷史紀錄、進階設定、詳情、合規說明」，不適合把使用者必須比較的核心資料藏起來。

---

## 2. 外部研究摘錄

### 2.1 Icon：省空間，但要有語意保護

NN/g 的 icon usability 研究指出，導航 icon 特別需要可見文字標籤；hover 才顯示文字在觸控裝置上不可用，也增加互動成本。Material Design 3 也要求 icon button 使用意義清楚的系統 icon。WCAG / WAI 對控制項的可理解性要求則意味著 icon-only button 至少要提供可被輔助科技讀出的名稱。

對誠問 AI 的規則：

- Sidebar 展開態：icon + label；收合態：icon-only + tooltip + `aria-label`。
- 主 CTA：保留文字，例如「開始演練」「生成拜訪規劃」；可加 leading icon。
- 表格列動作、卡片右上工具：可 icon-only，例如 edit、more、archive、share，但要有 tooltip 與 `aria-label`。
- 禁止只用不明 icon 表達業務概念，例如「AI 洞察」「合規提醒」「劇場回饋」仍需短標籤。

### 2.2 Progressive disclosure：把低頻/進階功能後移

NN/g 將 progressive disclosure 定義為把進階或低頻功能延後到次級畫面，以降低初學者負擔與錯誤率。表單降低認知負荷的建議也指向同一件事：先問當下必要資料，後續欄位依條件或步驟顯示。

對誠問 AI 的規則：

- pre-visit 建立流程第一步只問「客戶、目的、時間」；AI 產出後才展開材料、異議處理、時間分配。
- theater 開始流程第一步只問「使用哪份資料、演練目標、難度」；persona 細節與進階 prompt 設定放入「進階設定」收合區。
- CRM 360 第一屏只放身份、合規狀態、下一步行動；保單、家庭、互動時間軸透過 tabs / segmented control 切換。
- Dashboard widget 只露出 summary；完整列表進入 sheet 或專頁。

### 2.3 Dialog / popup：短而聚焦，不能變成小頁面

NN/g 對 popup 的警告是：它們容易阻礙使用者目標；modes 研究也指出 modal 會限制背景互動，因此應只在需要明確決策或短任務時使用。Material UI 將 dialog 描述為要求使用者處理關鍵資訊、決策或任務的 modal window，並提醒它是刻意打斷的元件，應節制使用。

對誠問 AI 的規則：

- 適合 dialog：確認刪除、選擇報告資料來源、快速新增關係人、分享設定、升級提示。
- 不適合 dialog：完整新增客戶、多步訂閱、完整拜訪規劃、劇場場景建構、長篇報告編輯。
- 若內容超過 3 個輸入群組或需要滾動，預設改為 right sheet 或 full page。
- 禁止 dialog 疊 dialog；需要下一層選擇時改用同一 sheet 內 stepper。

### 2.4 Sheet / popover：保留上下文的次級面板

Apple HIG 將 popover 視為從控制項觸發的暫時性視圖；sheet 則是會阻止使用者操作 parent view 的聚焦體驗。NN/g 對 bottom sheet 的描述也適合本產品的行動端：少量選項與臨時資訊可以放在 sheet，但不應放長內容或疊加 sheet。

對誠問 AI 的規則：

- Desktop：右側 sheet 用於「查看詳情、快速編輯、AI 建議、設定」。
- Mobile：bottom sheet 用於「更多操作、快速選擇、篩選」。
- Popover 用於小型選單與輕量說明，例如日期篩選、卡片更多操作、狀態選擇。
- Sheet 內若需要保存，底部固定 action bar；若只是查看，避免強制 CTA。

### 2.5 Accordion / collapsible：減少長頁，但不要藏比較

NN/g 對 accordion 的建議是：它能簡化長內容、減少捲動，但會降低內容可見性並增加互動成本；桌面端適合內容重、且使用者通常不需要同時開多段內容的頁面。

對誠問 AI 的規則：

- 適合收合：歷史紀錄、原始 AI prompt、合規條文、進階篩選、低頻欄位、舊版 SPIN 詳情。
- 不適合收合：KPI、下一步行動、風險警示、需要並排比較的方案、劇場對話主線。
- 收合標題要含 summary，例如「保單 3 張・1 張 90 天內到期」，不能只寫「更多」。

---

## 3. 誠問 AI 介面簡化原則

### P1. 一頁一個主動作

每頁頂部只保留一個主 CTA：

| 頁面 | 主 CTA | 其他動作處理 |
| --- | --- | --- |
| Dashboard | 今日最重要行動 | 其他 quick actions 放 icon toolbar / sheet |
| CRM list | 新增客戶 | 匯入、篩選、排序放 toolbar |
| CRM detail | 開始訪前規劃 | 編輯、分享、封存放 overflow |
| Pre-visit | 生成 / 更新規劃 | 進階設定與歷史版本收合 |
| Theater | 開始演練 | persona 細節、難度說明收合 |
| Reports | 生成報告 | 分享、複製、下載放 row actions |

### P2. 三層資訊架構

所有複雜頁改為三層：

1. **Summary layer**：主畫面，顯示狀態、核心內容、下一步。
2. **Context layer**：popover / sheet，顯示解釋、詳情、設定、輔助操作。
3. **Work layer**：full page 或大型 sheet，承載多步輸入與長文本編輯。

### P3. Icon 使用分級

| 使用情境 | 規則 |
| --- | --- |
| 主導航 | icon + label；收合才 icon-only |
| 主 CTA | icon + text，不使用 icon-only |
| 次要 CTA | text 或 icon + text |
| 重複列動作 | icon-only 可接受，但需 tooltip / aria-label |
| 狀態 | icon + short label，例如「需補 KYC」 |
| 危險動作 | text label + confirmation，避免只用 X / trash |

### P4. Dialog / sheet 判斷表

| 任務特徵 | 元件 |
| --- | --- |
| 1 個決策、不可忽略 | Alert dialog |
| 1-3 個欄位、完成後回原頁 | Dialog |
| 需要保留頁面上下文、欄位較多 | Right sheet |
| 多步驟、長表單、需要草稿 | Full page / route |
| 小型選單或狀態切換 | Popover / dropdown |
| 低頻詳情 | Collapsible / accordion |

---

## 4. 頁面改造建議

### 4.1 Dashboard

現況問題：同屏資訊量多，卡片仍有硬編碼藍色、圖示、badge、摘要與 quick actions 混在一起。

建議：

- KPI card 改為「數字 + 一行趨勢 + icon」，詳細原因點擊後右側 sheet。
- Tasks / AI insight / Calendar 只保留 compact summary；完整列表進 sheet。
- Quick actions 改成 icon toolbar，hover/focus 顯示 tooltip；在 mobile 改 bottom sheet。
- Dashboard 第一屏只突出「今日主線」與「下一步」。

### 4.2 CRM detail

現況問題：CRM detail 容易同時呈現身份、家庭、保單、AI 摘要、tabs、CTA，視覺競爭強。

建議：

- 左側客戶卡簡化成 identity rail：姓名、狀態、合規、主 CTA。
- 編輯客戶從長 dialog 改 right sheet；家庭成員編輯用 sheet 內 section。
- tabs 只保留核心：概覽、保單、關係、時間軸、報告；低頻操作進 overflow。
- AI 摘要改成 collapsible card，預設只露一句洞察與 1 個下一步。

### 4.3 Pre-visit

現況問題：建立 dialog 裡已有多個欄位、藍底 header 與說明，對快速建立來說太重。

建議：

- 新增規劃改成 right sheet：Step 1 選客戶/目的/時間，Step 2 顯示 AI 生成中與預覽，Step 3 確認儲存。
- 規劃詳情頁改成「準備包」：目標、SPIN 問題、異議、材料四個 section，預設只展開第一個未完成 section。
- 時間分配、材料清單、原始 AI prompt 放 collapsible。
- 主要頁列表每張 plan 只顯示客戶、目的、狀態、時間、下一步，其他放 row popover。

### 4.4 Theater

現況問題：開始演練卡片、歷史紀錄、人格庫、說明卡同屏出現，顯得像功能展示頁，不像專注演練工具。

建議：

- 第一屏改成「選資料來源 → 選演練目標 → 開始」三步 compact panel。
- 人格庫概覽移到「進階設定」或獨立 popover，不佔主畫面。
- 難度選擇使用 segmented control；難度說明用 tooltip / collapsible。
- 演練歷史右側保留最近 3 筆，完整歷史進 sheet。
- 結束評分若未來改五視角回饋，預設顯示摘要，五個視角以 accordion 展開。

### 4.5 Reports

建議：

- 報告列表採 dense card / table hybrid：標題、客戶、狀態、更新時間、主要 action。
- 分享、複製、下載、刪除改為 icon row actions；hover/focus tooltip。
- 生成報告的資料來源選擇保留 dialog，但若加入多步設定則升級為 sheet。

---

## 5. 可執行批次建議

若要把本研究轉成開發卡，建議接在現有 ElevenLabs UI Redesign B4/B5 之後，新增一條「Interface Simplification」workstream。

### Batch IS-001 - Action hierarchy

- 每個 dashboard / CRM / pre-visit / theater 頁面確認只保留 1 個主 CTA。
- 次要動作移入 toolbar、overflow menu、popover 或 sheet。
- 所有 icon-only button 補 `aria-label` 與 tooltip。

### Batch IS-002 - Sheet-first secondary workflows

- pre-visit 新增流程由 dialog 改 right sheet。
- CRM 編輯客戶由長 dialog 改 right sheet。
- Dashboard widget detail 改 right sheet。

### Batch IS-003 - Collapsible information architecture

- pre-visit 詳情頁將材料、時間分配、進階說明收合。
- theater 將人格庫與難度說明收合。
- CRM AI 摘要改一行摘要 + 可展開詳情。

### Batch IS-004 - Dense operational dashboard

- KPI、任務、活動、AI insight 統一 compact widget 規格。
- 移除展示型大卡與多餘說明文。
- 保留髮絲線、tabular numbers、單色 icon。

---

## 6. 驗收準則

- 每頁第一屏主 CTA 不超過 1 個。
- 主要導航與主 CTA 不能是無文字 icon-only。
- 所有 icon-only controls 有 `aria-label`、tooltip、focus ring。
- Dialog 內容不超過 3 個輸入群組；超過則使用 sheet 或 page。
- Accordion/collapsible 的 trigger 文案含 summary。
- Mobile 上所有 bottom sheet 不再疊 second sheet；複雜流程改 page。
- `prefers-reduced-motion` 下 popover/sheet/dialog 動畫不造成位移干擾。

---

## 7. 來源

- NN/g, Icon Usability: https://www.nngroup.com/articles/icon-usability/
- NN/g, Yes, Icons Need Text Labels: https://www.nngroup.com/videos/icon-text-labels/
- NN/g, Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- NN/g, Accordions on Desktop: When and How to Use: https://www.nngroup.com/articles/accordions-on-desktop/
- NN/g, Accordions topic guide: https://www.nngroup.com/topic/accordions/
- NN/g, Modes in User Interfaces: https://www.nngroup.com/articles/modes/
- NN/g, Popup Problems: https://www.nngroup.com/videos/popup-problems/
- NN/g, Bottom Sheets: Definition and UX Guidelines: https://www.nngroup.com/articles/bottom-sheet/
- Material Design 3, Icon buttons: https://m3.material.io/components/icon-buttons/overview
- Material Design 3, Tooltips: https://m3.material.io/components/tooltips
- Material Design 3, Dialogs: https://m3.material.io/components/dialogs/guidelines
- Apple Human Interface Guidelines, Popovers: https://developer.apple.com/design/human-interface-guidelines/popovers
- Apple Human Interface Guidelines, Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- Apple Human Interface Guidelines, Disclosure controls: https://developer.apple.com/design/human-interface-guidelines/disclosure-controls
- W3C WAI, Labels or Instructions: https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html
