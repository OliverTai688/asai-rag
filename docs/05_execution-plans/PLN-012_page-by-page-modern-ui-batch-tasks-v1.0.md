# 誠問 AI Page-by-Page Modern UI Batch Tasks v1.0

> 建立日期：2026-06-17  
> 狀態：完成  
> 研究依據：`RES-005_interface-simplification-patterns-v1.0.md`、`RES-006_modern-minimal-web-design-principles-v1.0.md`  
> 驗收依據：`ACC-003_modern-ui-page-acceptance-framework-v1.0.md`  
> 設計底座：`ARC-003_elevenlabs-design-direction-v1.0.md`

本計畫將「簡約、modern、beautiful、可操作」落成逐頁 batch tasks。每張卡只處理一個頁面或一個緊密頁面群，必須先做頁面級研究與設計 brief，再實作。

---

## 0. 執行協定

每張卡的固定流程：

1. **讀文件**：`ARC-003`、`RES-005`、`RES-006`、`ACC-003`、本卡。
2. **讀 Next.js 文件**：若改動 route/layout/data 行為，先讀 `node_modules/next/dist/docs/` 相關章節。
3. **頁面現況盤點**：列出主工作、主 CTA、次要動作、視覺噪音、互動噪音、狀態缺口。
4. **外部參考研究**：針對該頁搜尋 2-3 個相關 modern SaaS pattern；可用 NN/g / Baymard / Linear / Attio / Material / Apple HIG 等。
5. **Page design brief**：用 `ACC-003 §2` 格式產出 brief。
6. **實作**：只改本卡頁面與必要局部元件；不動商業資料、store、API、SPIN/theater/AI 邏輯。
7. **驗收**：桌機/手機視覺檢查、focus/tooltip/aria、`pnpm lint:changed`。
8. **打勾**：完成後本文件與 AGENTS.md 對應卡片改 `[x]`，並註記變更檔案。

---

## 1. 進度看板

| 卡片 | 頁面 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| MM-001 | Dashboard `/dashboard` | ✅ | ElevenLabs B4 建議先完成 |
| MM-002 | CRM List `/crm` | ✅ | MM-001 |
| MM-003 | CRM Detail Shell `/crm/[clientId]` | ✅ | MM-002 |
| MM-004 | CRM Subpages | ✅ | MM-003 |
| MM-005 | Pre-visit List/Create `/pre-visit` | ✅ | MM-001 |
| MM-006 | Pre-visit Detail/Notes `/pre-visit/[planId]` | ✅ | MM-005 |
| MM-007 | Theater List/Setup `/theater` | ✅ | MM-001 |
| MM-008 | Theater Session `/theater/[sessionId]` | ✅ | MM-007 |
| MM-009 | Reports List/Detail `/reports` | ✅ | MM-001 |
| MM-010 | Public Share `/share/[token]` | ✅ | MM-009 |
| MM-011 | Team `/team` | ✅ | MM-001 |
| MM-012 | Pilot/Settings/Admin surfaces | ✅ | MM-001 |
| MM-013 | Cross-page interaction polish | ✅ | MM-001-MM-012 |

---

## Batch MM-001 - Dashboard decision center

目標：把 `/dashboard` 從資訊展示頁簡化為「今日決策台」。

- [x] 產出 page design brief：主工作、第一屏主 CTA、Primary/Secondary/Tertiary 資訊層。
- [x] 研究 2-3 個 dashboard / decision center / SaaS command center pattern。
- [x] 第一屏只突出「今日主線」與一個最重要下一步。
- [x] KPI cards 壓成 compact、tabular、低噪音樣式；細節進 sheet 或次級區。
- [x] Tasks / Activity / Calendar / AI insight 視覺密度統一，移除多餘色塊與硬陰影。
- [x] icon-only controls 補 tooltip / aria-label。
- [x] 保留 QuickstartMode / demo flow 不破。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 event/client/session store；不改 AI assistant 邏輯。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問在 10 秒內決定今天先做哪一件最重要的客戶行動。
- Primary CTA：第一屏唯一主 CTA 為「開始拜訪規劃」，指向 `/pre-visit`。
- Information hierarchy：Primary = 今日主線（王大明加保拜訪 + 3 個必要上下文 + CTA）；Secondary = 今日掃描、compact KPI、AI 摘要、任務與行程；Tertiary = Quickstart demo 入口只在 `?demo=quickstart` / `?demo=completed` 顯示，活動與其他 widget 留在下方掃描層。
- Interaction strategy：次要路徑改成低噪音文字列連結；icon-only「新增行程」保留在 Calendar header，補 tooltip 與 `aria-label`；任務 checkbox 補 `aria-label`。
- What to remove：移除普通 dashboard 自動 Quickstart tour，移除快速行動面板與多主 CTA 競爭；KPI 由展示卡壓成 compact tabular 卡。
- References checked：Eleken SaaS Dashboard Design（define the decision / actionable KPIs / hierarchy）、Linear UI redesign（reduce visual noise / increase hierarchy and density）、Esri clear dashboard advice（one key insight, mild themes, remove non-primary-question elements）。

變更檔案：`src/app/(dashboard)/dashboard/page.tsx`、`src/components/dashboard/dashboard-calendar.tsx`、`src/components/dashboard/tasks-panel.tsx`。

QA 結果：
- In-app Browser desktop `/dashboard`：console error 0、無水平溢出、普通 dashboard 不顯示 Quickstart tour、主 CTA count = 1。
- Chrome desktop/mobile `/dashboard`：1280×720 與 390×844 console error 0、無水平溢出、主 CTA count = 1。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/dashboard-mm-001-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/dashboard-mm-001-mobile.png`。

---

## Batch MM-002 - CRM list

目標：讓 `/crm` 成為快速找客戶、辨識風險、採取下一步的現代 CRM list。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 modern CRM list / record table pattern。
- [x] 頁面主 CTA 僅保留「新增客戶」；匯入、篩選、排序放 toolbar / popover。
- [x] 客戶列表改為 dense card/table hybrid，避免每筆資料像大展示卡。
- [x] 狀態、合規、最近互動、下一步行動可掃描。
- [x] Empty/filter/no-result 狀態清楚。
- [x] icon-only row actions 補 tooltip / aria-label。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 client mock/store；不新增真 CRUD。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問快速找到客戶、比較狀態/合規/最近互動，並對單一客戶接上下一步拜訪。
- Primary CTA：第一屏唯一主 CTA 為「新增客戶」，保留既有 `AddClientDialog`。
- Information hierarchy：Primary = page header + 新增客戶；Secondary = 4 個 compact stats、search/filter/sort toolbar、dense record table；Tertiary = row action overflow、欄位控制（佔位）、mobile mini record cards。
- Interaction strategy：狀態與排序放 dropdown；row actions 使用 icon-only menu，補 `aria-label` + tooltip；desktop 用 table，mobile 用 stacked mini cards；每列保留「規劃拜訪」作為可掃描的次級 action。
- What to remove：移除 grid/table view toggle、大展示卡、重陰影、大圓角、藍味 tag 底；不再讓每筆客戶像展示卡。
- References checked：NN/g Data Tables（find/compare/view-action row tasks）、Eleken Table Design UX（B2B SaaS table search/filter/action/mobile stacking）、Andrew Coyle Table UI Considerations（search/filter、display density、contextual identifying columns）。

變更檔案：`src/app/(dashboard)/crm/page.tsx`。

QA 結果：
- In-app Browser desktop `/crm`：console error 0、無水平溢出、主 CTA count = 1、table 10 rows、search 存在、row actions 有 `aria-label`。
- Chrome desktop/mobile `/crm`：1280×720 與 390×844 console error 0、無水平溢出、主 CTA count = 1、可見點擊目標皆 ≥ 40px；mobile row action 44px。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/crm-mm-002-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/crm-mm-002-mobile.png`。

---

## Batch MM-003 - CRM detail shell and overview

目標：讓 `/crm/[clientId]` shell 與 overview 第一屏更像高級保險顧問工作台。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 CRM record detail / customer 360 pattern。
- [x] 左側客戶 identity rail 簡化：姓名、狀態、合規、主 CTA。
- [x] 第一屏只保留一個主 CTA：開始訪前規劃或下一步建議。
- [x] 編輯客戶資料由長 dialog 改 right sheet 或明確標記為後續卡。
- [x] overview 卡片分層：AI 摘要、保障缺口、家庭/保單 summary，避免互相搶焦。
- [x] tabs/segmented control 清楚，mobile 不擠壓。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改家庭圖資料結構；不改 compliance schema 欄位。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問打開單一客戶時，先理解身份、資料完整度與下一次訪談焦點，而不是被完整 CRM 表單淹沒。
- Primary CTA：第一屏唯一主 CTA 為 identity rail 內的「開始訪前規劃」，指向 `/pre-visit?clientId=<id>&autoCreate=true`。
- Information hierarchy：Primary = 左側 identity rail（姓名、狀態、KYC/資料訊號、主 CTA、核心聯絡/家庭/保單資料）；Secondary = overview 的下一步判斷、需要釐清、家庭/保單/AI 標籤 summary；Tertiary = 保障缺口摘要、談話線索與 tabs 進入關係/時間軸/報告。
- Interaction strategy：record tabs 保留在內容區上方並可水平捲動；長表單編輯先移除舊 dialog，明確標記為後續 CRM 卡改 right sheet；overview 不再放第二個「開始訪前規劃」按鈕。
- What to remove：移除大型藍色漸層 AI hero、重陰影大圓角、overview 內重複主 CTA，以及容易造成第一屏混亂的長編輯 dialog。
- References checked：[CRMsearch Customer 360](https://crmsearch.com/strategy/360-customer-view/)（customer 360 要把資料轉成可行動洞察）、[SmartSuite Record Page Tabs](https://help.smartsuite.com/en/articles/12038870-record-page-tabs)（record sections 用 tabs 降低單頁負擔）、[Pipedrive Next Best Action](https://www.pipedrive.com/en/blog/next-best-action)（集中資料後產生明確下一步行動）。

變更檔案：`src/app/(dashboard)/crm/[clientId]/layout.tsx`、`src/app/(dashboard)/crm/[clientId]/page.tsx`。

QA 結果：
- In-app Browser `/crm/c_wang`：頁面開啟成功、title 正常、主 CTA count = 1。
- Chrome desktop/mobile `/crm/c_wang`：1440×1000 與 390×844 console error 0、無水平溢出、客戶姓名可見、tabs 可見、主 CTA count = 1。
- `pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/crm-detail-mm-003-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/crm-detail-mm-003-mobile.png`。

---

## Batch MM-004 - CRM subpages

範圍：`/crm/[clientId]/policies`、`relationships`、`timeline`、`reports`、`gap-analysis`。

- [x] 產出 page design brief，說明每個 subpage 的主工作。
- [x] 研究 2-3 個 record subview / related list pattern。
- [x] 每個 subpage 保留單一主 CTA；其他動作移到 row actions / overflow。
- [x] policies 與 reports 使用 compact related-list 規格。
- [x] relationships 的新增/編輯流程使用 dialog/sheet 邊界符合 `ACC-003`。
- [x] gap-analysis 移除展示型重色塊，改 summary + actionable recommendations。
- [x] timeline 以掃描效率為優先，狀態與時間清楚。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不重寫 graph layout；不改 family tree plan。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問在客戶 detail 內用同一套 related-list / recommendation 語言處理保單、關係人、活動、報告與缺口，而不是每個子頁都有自己的展示型版面。
- Primary CTA：每個子頁第一屏只保留一個主 CTA：policies「手動登錄保單」、relationships「新增關係人」、timeline「安排下一次拜訪」、reports「生成新報告」、gap-analysis「轉成拜訪規劃」。
- Information hierarchy：Primary = 子頁標題、單一主 CTA、3 個 compact metrics；Secondary = related list / activity feed / gap list；Tertiary = row actions、disabled share placeholder、recommendation details。
- Interaction strategy：policies/reports 用 compact related-list；relationships 保留既有圖與短 dialog，不重寫 graph layout；timeline 改為掃描式 activity feed；gap-analysis 改成 summary metrics + recommendation list；icon-only actions 補 tooltip / aria-label。
- What to remove：移除大圓角展示卡、重陰影、藍色漸層建議卡、子頁動畫噪音，以及 reports/policies 各自手刻的 button 樣式。
- References checked：[Salesforce related lists](https://help.salesforce.com/s/articleView?id=platform.customizing_related_lists.htm&language=en_US&type=5)（related list 應控制欄位、排序與顯示順序）、[Microsoft Power Apps timeline](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/set-up-timeline-control)（timeline 需支援活動類型與過濾/顯示選項）、[UX StackExchange master-detail related lists](https://ux.stackexchange.com/questions/104103/stacked-master-detail-tables-for-related-lists)（row-local detail 比遠端分離更自然）。

變更檔案：`src/app/(dashboard)/crm/[clientId]/_components/record-subpage-ui.tsx`、`src/app/(dashboard)/crm/[clientId]/policies/page.tsx`、`src/app/(dashboard)/crm/[clientId]/relationships/page.tsx`、`src/app/(dashboard)/crm/[clientId]/timeline/page.tsx`、`src/app/(dashboard)/crm/[clientId]/reports/page.tsx`、`src/app/(dashboard)/crm/[clientId]/gap-analysis/page.tsx`。

QA 結果：
- In-app Browser `/crm/c_wang/relationships`：頁面開啟成功、title count = 1、主 CTA count = 1。
- Chrome desktop/mobile 五個子頁：1440×1000 與 390×844 console error 0、無水平溢出、子頁 title 可見、主 CTA count = 1。
- mobile 另存 content-scroll 截圖，確認 identity rail 下方的子頁內容可達。
- `pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/crm-subpages-mm-004-*-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/crm-subpages-mm-004-*-mobile.png`、`docs/06_audits-and-reports/screenshots/modern-ui/crm-subpages-mm-004-*-mobile-content.png`。

---

## Batch MM-005 - Pre-visit list and create flow

目標：讓 `/pre-visit` 變成輕量、快速、聚焦的拜訪規劃入口。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 planning / scheduling / AI generation setup pattern。
- [x] 新增規劃流程檢查：若 dialog 超過 3 輸入群組，改 right sheet 或拆 step。
- [x] 列表每筆只顯示客戶、目的、時間、狀態、下一步。
- [x] view mode、filter、排序放 toolbar；避免大面積說明文。
- [x] Quickstart demo flow 保持可用。
- [x] icon-only actions 補 tooltip / aria-label。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 VisitPlan store；不接真 API。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問用最少輸入建立一筆拜訪準備任務，並在列表中快速辨識「誰、為什麼、何時、目前狀態、下一步」。
- Primary CTA：一般頁第一屏唯一主 CTA 為「新增規劃」；Quickstart 頁唯一主 CTA 為「下一步：生成準備包」。
- Information hierarchy：Primary = page header、單一主 CTA、4 個 compact metrics；Secondary = view mode、search、status filter、sort toolbar 與 compact rows；Tertiary = empty state、Quickstart 次要入口、row next step。
- Interaction strategy：新增規劃只有客戶、目的、時間 3 個輸入群組，符合短 dialog；列表篩選/排序放 toolbar；`?clientId&autoCreate=true` 保留直接建立並導向 detail；`?demo=quickstart` 保留專用示範起始畫面。
- What to remove：移除大面積藍底 dialog header、重陰影大卡、假日曆開發中區塊、普通頁 Quickstart 固定底部 CTA，以及內部值 `ALL` / `TIME_ASC` 外露。
- References checked：[Zapier AI scheduling assistants](https://zapier.com/blog/best-ai-scheduling/)（AI scheduling 應減少 context switching 並完成排程任務）、[Smart Interface Design Patterns meeting checklist](https://smart-interface-design-patterns.com/articles/designing-better-meetings/)（會前準備需明確目的、時間、問題與材料）、[Donux B2B SaaS listing page](https://donux.com/blog/pragmatic-b2b-saas-design-listing)（列表頁需有 filters、sorting、empty states 與 mobile patterns）。

變更檔案：`src/app/(dashboard)/pre-visit/page.tsx`。

QA 結果：
- In-app Browser `/pre-visit`：頁面開啟成功、主 CTA count = 1。
- Chrome desktop/mobile `/pre-visit`：1440×1000 與 390×844 console error 0、無水平溢出、標題可見、中文 filter/sort label 可見、主 CTA count = 1、dialog 可開。
- Chrome desktop/mobile `/pre-visit?demo=quickstart`：console error 0、無水平溢出、Quickstart title 可見、主 CTA count = 1。
- `autoCreate` 檢查：`/pre-visit?clientId=c_wang&autoCreate=true` 會導向 `/pre-visit/plan-*`。
- `pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/pre-visit-mm-005-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/pre-visit-mm-005-mobile.png`、`docs/06_audits-and-reports/screenshots/modern-ui/pre-visit-mm-005-quickstart-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/pre-visit-mm-005-quickstart-mobile.png`。

---

## Batch MM-006 - Pre-visit detail and notes

範圍：`/pre-visit/[planId]`、`/pre-visit/[planId]/notes`。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 AI-generated plan / checklist / meeting prep pattern。
- [x] 詳情頁改為「準備包」資訊架構：目標、SPIN 問題、異議、材料、時間分配。
- [x] 預設展開最需要處理的 section，其餘使用 collapsible 並帶 summary。
- [x] AI 生成狀態、失敗狀態、重新生成動作清楚。
- [x] notes 頁只突出拜訪後摘要與下一步，長表單分層。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 `/api/ai/visit`；不改 AiUsageLog。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問把一份拜訪規劃轉成可進場使用的準備包，並在拜訪後快速留下摘要與下一步。
- Primary CTA：`/pre-visit/[planId]` 第一屏唯一主 CTA 為未完成時「生成準備包」、完成後「開始 SPIN 澄清」；notes 頁唯一主 CTA 為「儲存筆記」。
- Information hierarchy：Primary = 客戶/目的/狀態、準備完整度、主 CTA；Secondary = 目標、SPIN、異議、材料、時間分配；Tertiary = 列印、拜訪筆記、材料勾選與拜訪後提示。
- Interaction strategy：詳情頁用 native collapsible，trigger 直接包含數量與完成 summary，預設只展開「拜訪目標」；AI 生成失敗以 inline alert + 重新生成處理；notes 頁保留完整 textarea，但把摘要與下一步提到第一屏。
- What to remove：移除大型藍色區塊、三個競爭 CTA、手動編輯 dialog、SPIN 匯入噪音、全螢幕 notes overlay 與重陰影沉浸卡。
- References checked：[Read AI - AI meeting agendas](https://www.read.ai/articles/how-to-create-a-meeting-agenda)（AI agenda 應從脈絡找未決事項與決策點）、[YouCanBookMe meeting prep](https://youcanbook.me/blog/meeting-prep)（準備需包含 goal、agenda、materials、decisions/next steps）、[Asana meeting agenda](https://asana.com/resources/meeting-agenda)（會後 notes 應包含 decisions、tasks、unanswered questions 與 action plan）。

變更檔案：`src/app/(dashboard)/pre-visit/[planId]/page.tsx`、`src/app/(dashboard)/pre-visit/[planId]/notes/page.tsx`。

QA 結果：
- Chrome desktop/mobile `/pre-visit/plan-mm-006-qa`：1440×1000 與 390×844 console error 0、無水平溢出、主 CTA count = 1、collapsible count = 4、default open = 1、頁面內 action button 最小高度 40px。
- Chrome desktop/mobile `/pre-visit/plan-mm-006-qa/notes`：1440×1000 與 390×844 console error 0、無水平溢出、主 CTA count = 1、頁面內 action button 最小高度 40px。
- `pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/pre-visit-detail-mm-006-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/pre-visit-detail-mm-006-mobile.png`、`docs/06_audits-and-reports/screenshots/modern-ui/pre-visit-notes-mm-006-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/pre-visit-notes-mm-006-mobile.png`。

---

## Batch MM-007 - Theater list and setup

目標：讓 `/theater` 從功能展示頁改為專注的演練啟動台。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 practice setup / simulation / AI roleplay pattern。
- [x] 第一屏改成「選資料來源 -> 選演練目標 -> 開始」的 compact flow。
- [x] 難度改 segmented control；難度說明進 tooltip/collapsible。
- [x] 人格庫概覽移到進階設定或 sheet，不佔主畫面。
- [x] 最近演練只顯示 3-5 筆；完整歷史進 sheet或次級頁。
- [x] Quickstart autoCreate flow 不破。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 Theater enum；不改 theater store。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問從一份 SPIN 摘要快速啟動一場演練，而不是先閱讀功能介紹或 persona 展示。
- Primary CTA：第一屏唯一主 CTA 為頁首「開始演練」；沒有可用 SPIN 摘要時 disabled，避免建立空 session。
- Information hierarchy：Primary = page header + 單一主 CTA + 3 步啟動流（資料來源、演練目標、難度）；Secondary = 啟動摘要、最近 5 場演練；Tertiary = persona library 與完整歷史，皆收合。
- Interaction strategy：資料來源用 dense selectable rows；演練目標用 3 個 segmented choice cards；難度用 neutral segmented control；persona 庫放入「進階設定」native collapsible；完整歷史放入 collapsible。
- What to remove：移除大型藍色/漸層模擬卡、人格庫大色塊、難度紅橘綠強色、重陰影與「什麼是劇場」展示卡；普通頁不顯示 Quickstart guide。
- References checked：[Retorio AI role-play scenarios](https://www.retorio.com/blog/interactive-ai-role-play-scenarios-sales-training)（角色扮演 setup 應能調整 persona objection difficulty）、[Think Design role-play UX research](https://think.design/user-design-research/role-play/)（role play 可用情境與角色重演來取得真實反應與回饋）、[PlayAvatar behavioral AI personas](https://play-avatar.com/product/ai-personas)（persona 應定義溝通風格、行為模式與情緒反應，且保持一致）。

變更檔案：`src/app/(dashboard)/theater/page.tsx`。

QA 結果：
- Chrome desktop/mobile `/theater`：1440×1000 與 390×844 console error 0、無水平溢出、主 CTA count = 1、演練目標 count = 3、collapsible count = 2、頁面內 action button 最小高度 40px。
- `pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/theater-mm-007-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/theater-mm-007-mobile.png`。

---

## Batch MM-008 - Theater session

目標：讓 `/theater/[sessionId]` 成為沉浸但克制的演練 workspace。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 chat workspace / coaching feedback / simulation UI pattern。
- [x] 對話區保持主體，persona/status/score 降為側欄或 collapsible panel。
- [x] 輸入區固定、清楚、mobile 不遮擋內容。
- [x] 緊張度/難度/角色資訊不要以大色塊干擾對話。
- [x] 完成後 feedback 以 summary + collapsible details 呈現。
- [x] 鍵盤 focus 與送出流程可用。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 `/api/ai/theater`；不改 scoring JSON。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問在單一 workspace 內完成演練對話、觀察緊張度、結束後閱讀可行動回饋。
- Primary CTA：active session 的主工作是輸入區送出回應；頁首「結束並評分」為次要完成動作。completed session 不再顯示輸入，主體轉為回饋摘要。
- Information hierarchy：Primary = 對話紀錄與輸入區；Secondary = 緊張度、persona、狀態、評分摘要；Tertiary = SPIN 摘要、錯失契機、建議說法細節。
- Interaction strategy：desktop 以 chat + right sidebar；mobile 把演練資訊與 feedback 放入 collapsible，不用 modal；評分 details 用 native collapsible；Enter 送出、Shift+Enter 換行。
- What to remove：移除大 HUD、彩色 tension bar、重陰影 bubble、固定大 feedback modal、persona 大卡與藍色/紅橘綠干擾色。
- References checked：[The Front Kit AI chat UI best practices](https://thefrontkit.com/blogs/ai-chat-ui-best-practices)（streaming、typing indicator、feedback capture 與鍵盤操作）、[Neuron UX conversational AI design](https://www.neuronux.com/post/ux-design-for-conversational-ai-and-chatbots)（先定義 purpose/scope/audience/channel）、[Tough Tongue AI coaching feedback](https://www.toughtongueai.com/blog/executive-coaching-llm-feedback-conversations-comparison/)（AI roleplay 應模擬真實對話並在事後給 structured feedback）。

變更檔案：`src/app/(dashboard)/theater/[sessionId]/page.tsx`。

QA 結果：
- Chrome desktop/mobile active `/theater/theater-mm-008-active`：1440×1000 與 390×844 console error 0、無水平溢出、對話訊息 3 則、輸入區 1、送出按鈕 44px、演練 context 可見。
- Chrome desktop/mobile completed `/theater/theater-mm-008-done`：1440×1000 與 390×844 console error 0、無水平溢出、輸入區 0、評分摘要可見、feedback details 可收合。
- `pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/theater-session-mm-008-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/theater-session-mm-008-mobile.png`、`docs/06_audits-and-reports/screenshots/modern-ui/theater-session-mm-008-feedback-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/theater-session-mm-008-feedback-mobile.png`。

---

## Batch MM-009 - Reports list and detail

範圍：`/reports`、`/reports/[reportId]`。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 document management / report editor / share workflow pattern。
- [x] reports list 改 compact report library：標題、客戶、狀態、更新時間、主要 action。
- [x] 生成報告資料來源若仍是短選擇可保留 dialog；若多步設定則改 sheet。
- [x] detail 頁把編輯、分享、預覽分成清楚模式，不同模式避免同屏競爭。
- [x] icon row actions 補 tooltip / aria-label。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 report service/store；不改分享 token 邏輯。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓顧問在報告庫中快速找到客戶報告，並讓單一報告清楚通過編輯、預覽、分享三個模式。
- Primary CTA：`/reports` 第一屏唯一主 CTA 為「生成報告」；`/reports/[reportId]` 第一屏唯一主 CTA 為「建立分享連結」。
- Information hierarchy：List primary = page header、生成報告、搜尋與 compact report rows；secondary = 報告數、分享狀態、更新時間；tertiary = row icon actions。Detail primary = 報告內容與目前模式；secondary = 客戶脈絡、章節摘要、分享狀態；tertiary = 複製連結、列印預覽與 section meta。
- Interaction strategy：生成資料來源維持短 dialog；detail 用 mode rail/segmented buttons 分離編輯、預覽、分享；preview 不顯示 textarea；分享設定集中在 share panel；icon-only row actions 使用 tooltip + `aria-label`。
- What to remove：移除報告列表的大卡 grid、重陰影、藍色展示卡；移除 detail 內編輯/分享/預覽同屏競爭與大面積裝飾色。
- References checked：[SaaS UI templates](https://www.saasui.design/)（report library 可採 compact operational surfaces）、[Adobe Experience Manager edit/preview modes](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/sites/authoring/authoring/editing-content)（preview 應隱藏編輯機制）、[Google Looker reports](https://docs.cloud.google.com/looker/docs/create-view-edit-reports)（報告工作流需明確分離 create/view/edit/share）。

變更檔案：`src/app/(dashboard)/reports/page.tsx`、`src/app/(dashboard)/reports/[reportId]/page.tsx`。

QA 結果：
- Chrome desktop/mobile `/reports`：1440×1000 與 390×844 console error 0（以修補後 timestamp 過濾）、無水平溢出、主 CTA count = 1、compact rows 可見、icon actions 具 `aria-label`，控制高度 ≥ 40px。
- Chrome desktop `/reports/[reportId]`：preview mode 文字區 count = 0、edit/preview/share mode 可見、分享 panel 可開、無水平溢出。
- Quickstart autoCreate `/reports?demo=quickstart&autoCreate=true&clientId=c_wang` 可產生報告並導向 detail。
- `pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/reports-mm-009-list-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/reports-mm-009-detail-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/reports-mm-009-share-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/reports-mm-009-list-mobile.png`、`docs/06_audits-and-reports/screenshots/modern-ui/reports-mm-009-detail-mobile.png`。

---

## Batch MM-010 - Public share page

目標：讓 `/share/[token]` 成為客戶看到的簡潔、可信、可行動報告頁。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 client-facing report / proposal / secure share page pattern。
- [x] 第一屏清楚呈現客戶報告標題、可信品牌、主要下一步。
- [x] 內文以章節化閱讀為主，避免 dashboard 卡片語言。
- [x] 合規免責與資料敏感提示可見但不喧賓奪主。
- [x] mobile 優先，LINE 開啟閱讀不破版。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 tracking API；不新增公開表單提交。

狀態：✅ 完成（2026-06-17）。

Page design brief:
- Page job：讓客戶在手機上安心閱讀分享報告，理解建議重點與下一步，而不是進入內部 dashboard。
- Primary CTA：第一屏唯一主 CTA 為「查看建議重點」，導向 recommendation section。
- Information hierarchy：Primary = 誠問 AI 信任標頭、客戶報告標題、下一步 CTA、report status；Secondary = 閱讀前敏感資料提醒、章節導覽、章節化報告內容；Tertiary = footer 合規聲明與版本。
- Interaction strategy：公開頁不使用 dialog/sheet；章節導覽用 sticky horizontal chips；失效 token 顯示簡潔 empty/error state；tracking 保留既有 `recordAccess()` + `/api/mock/track/:token` side effect。
- What to remove：移除 ASAI | AUTHENTIC 舊品牌、大圓角展示卡、重陰影、綠色認證大 badge、dashboard/內部操作語言與內部 performance section。
- References checked：[Figma mobile-first design](https://www.figma.com/resource-library/mobile-first-design/)（mobile-first 先保留核心內容並向大螢幕擴展）、[SmartVault client portal best practices](https://www.smartvault.com/resources/client-portal-best-practices/)（client portal 需直覺、安全、易取得支援）、[Suralink secure file sharing best practices](https://www.suralink.com/blog/how-to-securely-share-files-best-practices-for-protecting-sensitive-data)（敏感文件需強調安全與合規處理）。

變更檔案：`src/app/(public)/share/[token]/page.tsx`。

QA 結果：
- Chrome desktop/mobile `/share/ZoyHDWr7bp`：1440×1000 與 390×844 console error 0、無水平溢出、主 CTA count = 1、章節 count = 4、章節導覽 count = 4、控制高度最小 44px、無 nested buttons。
- 失效 token `/share/not-a-real-token-mm010`：顯示「報告不存在或已過期」，console error 0、無水平溢出。
- 修補 SSR/localStorage hydration mismatch：公開頁先顯示穩定 loading，再依 client store 顯示報告或失效狀態。
- `pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/share-mm-010-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/share-mm-010-mobile.png`、`docs/06_audits-and-reports/screenshots/modern-ui/share-mm-010-missing-mobile.png`。

---

## Batch MM-011 - Team page

目標：讓 `/team` 從資料展示頁轉為主管輔導決策頁。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 manager dashboard / coaching list / team analytics pattern。
- [x] 第一屏只回答「誰需要輔導，下一步是什麼」。
- [x] 團隊 KPI compact 化，排行榜與熱點降噪。
- [x] 成員列表採 dense operational card/table，不使用重陰影展示卡。
- [x] AI 增效統計色彩與 motion 收斂。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 team aggregation mock；不新增權限。

狀態：✅ 完成（2026-06-18）。

Page design brief:
- Page job：讓主管在 10 秒內看出哪位成員最需要輔導，以及下一步該安排什麼。
- Primary CTA：第一屏唯一主 CTA 為「安排輔導」，對應今日優先成員。
- Information hierarchy：Primary = 今日優先輔導成員、原因、下一步、三個診斷數字；Secondary = compact team KPI、輔導佇列 dense rows；Tertiary = 需求熱點、營收掃描、AI 使用覆蓋，全部降成右側掃描資訊。
- Interaction strategy：不新增 dialog/sheet；輔導佇列使用 dense operational card/table hybrid；其他成員動作用 secondary outline button 並加 `aria-label`；熱點與覆蓋率用 hairline panel + thin progress bar。
- What to remove：移除 motion-heavy cards、彩色 avatar/排名、戰神榜語氣、重陰影、大面積 navy AI card、黃色/橘色排名 highlight，以及 header 的多主 CTA。
- References checked：[Geckoboard dashboard design best practices](https://www.geckoboard.com/best-practice/dashboard-design/)（dashboard 應聚焦、避免雜訊）、[Klipfolio sales dashboard guide](https://www.klipfolio.com/resources/articles/what-is-a-sales-dashboard)（sales dashboard 應追蹤 team performance、targets 與 actionable metrics）、[NN/g dashboard design](https://www.nngroup.com/articles/dashboard-design/)（dashboard 需讓使用者快速監控狀態並採取行動）。

變更檔案：`src/app/(dashboard)/team/page.tsx`。

QA 結果：
- `pnpm lint:changed` 通過。
- Chrome desktop/mobile `/team`：1440×1000 與 390×844 console error 0、無水平溢出、主 CTA count = 1、輔導 row count = 4、mobile action button 高度 ≥ 40px。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/team-mm-011-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/team-mm-011-mobile.png`。

---

## Batch MM-012 - Pilot, settings, admin surfaces

範圍：`/pilot`、`/settings`、`/(admin)/admin`。

- [x] 產出 page design brief。
- [x] 研究 2-3 個 onboarding hub / settings / admin console pattern。
- [x] pilot 頁從展示頁調整為可執行體驗路徑入口，減少大色塊與冗長說明。
- [x] settings 頁採清楚 section + compact controls。
- [x] admin 頁保留營運狀態與關鍵表格，避免行銷化卡片。
- [x] 跑 `pnpm lint:changed`；截 desktop/mobile。

範圍外：不改 admin/subscription API。

狀態：✅ 完成（2026-06-18）。

Page design brief:
- Page job：`/pilot` 讓使用者直接進入 demo value path；`/settings` 讓顧問快速調整 workspace 偏好與本機資料；`/admin` 讓 operator 掃描訂閱營運狀態與處理待辦。
- Primary CTA：`/pilot` 第一屏唯一主 CTA 為「開始主路徑」；`/settings` 第一屏唯一主 CTA 為「儲存變更」；`/admin` 第一屏不放行銷 CTA，以「需要處理」營運摘要作決策焦點，設定卡內保留「儲存設定」。
- Information hierarchy：Pilot primary = readiness + 主路徑；secondary = readiness signals + 可執行體驗路徑；tertiary = 下一個開發阻擋。Settings primary = category nav + active section controls；secondary = profile/notification/theme/security/data groups；tertiary = demo-only status notes。Admin primary = pending/failed order health；secondary = compact metrics + trial settings；tertiary = recent subscription table。
- Interaction strategy：Pilot 不再使用大面積 Quickstart 展示卡，改成 route rows；settings 用左側 category nav + compact panels，notification/theme 使用 native buttons/switch role；admin 用 operational header、hairline cards 與 horizontally scrollable order table。
- What to remove：移除 pilot 大藍底 hero/Quickstart block、settings 大圓角重陰影與空白 section、admin `#F7FAFF` 藍味頁底與品牌展示型 dashboard 卡。
- References checked：[NN/g onboarding tutorials](https://www.nngroup.com/articles/onboarding-tutorials/)（onboarding 應避免阻擋使用者進入產品價值）、[Geckoboard dashboard design best practices](https://www.geckoboard.com/best-practice/dashboard-design/)（營運 dashboard 應聚焦、避免雜訊）、[Toptal settings UX](https://www.toptal.com/designers/ux/settings-ux)（settings 應用分組、清楚標籤與可預期 controls 降低認知負擔）。

變更檔案：`src/app/(dashboard)/pilot/page.tsx`、`src/app/(dashboard)/settings/page.tsx`、`src/app/(admin)/admin/page.tsx`。

QA 結果：
- `pnpm lint:changed` 通過。
- In-app Browser desktop `/pilot`、`/settings`、`/admin`：console error 0、body 無水平溢出、標題可見。
- In-app Browser mobile 390×844 `/pilot`、`/settings`、`/admin`：console error 0、body 無水平溢出；pilot step rail 與 admin order table 為刻意橫向 scroll 容器。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/pilot-mm-012-desktop.png`、`pilot-mm-012-mobile.png`、`settings-mm-012-desktop.png`、`settings-mm-012-mobile.png`、`admin-mm-012-desktop.png`、`admin-mm-012-mobile.png`。

---

## Batch MM-013 - Cross-page interaction polish

目標：把逐頁 redesign 後的互動模式收斂成一致系統。

- [x] 盤點所有 icon-only buttons，補 tooltip / aria-label。
- [x] 盤點 dialog/sheet/popover 使用，移除不必要巢狀 overlay。
- [x] 統一 page header、toolbar、empty state、compact card/list 規格。
- [x] 檢查 mobile overflow、focus ring、reduced-motion。
- [x] 更新 `AGENTS.md` 與本文件完成狀態。
- [x] 跑 `pnpm lint:changed`；保存最終桌機/手機截圖。

範圍外：不做新功能；只做跨頁一致性與品質修補。

狀態：✅ 完成（2026-06-18）。

變更檔案：`src/components/assistant/global-assistant.tsx`、`src/components/ai-assistant/fab.tsx`、`src/components/dashboard/tasks-panel.tsx`、`src/components/layout/notification-hub.tsx`、`src/components/layout/top-bar.tsx`、`src/app/(dashboard)/issues/page.tsx`、`docs/05_execution-plans/PLN-012_page-by-page-modern-ui-batch-tasks-v1.0.md`、`AGENTS.md`。

QA 結果：
- 修補 icon-only controls：通知中心、使用者選單、AI FAB、assistant panel 對話歷史/新對話/關閉/送出、任務列處理動作、issues 更多操作。
- 修補 keyboard/focus：issues list card 支援 `role="button"`、`tabIndex`、Enter/Space；assistant conversation row 避免 nested button，刪除動作有獨立 aria label；hover-only action 在 mobile/keyboard 下可見。
- 盤點 overlay：未新增 dialog/sheet/popover，既有 dropdown trigger 改為具 aria 的 button render，未引入巢狀 overlay。
- 修補 hydration：`/issues` 日期格式改為 deterministic formatter，避免 server/client locale mismatch。
- Browser QA：`/dashboard` 與 `/issues` 在 1440×1000、390×844 皆為 new console error 0、unlabeled icon-like controls 0、無水平 overflow。
- `pnpm exec eslint ...` 通過；`pnpm exec tsc --noEmit --pretty false` 通過；`pnpm lint:changed` 通過。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/mm-013-dashboard-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/mm-013-dashboard-mobile.png`、`docs/06_audits-and-reports/screenshots/modern-ui/mm-013-issues-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/mm-013-issues-mobile.png`。
