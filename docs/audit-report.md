# 誠問 AI 可體驗版 Audit Report

| 項目 | 內容 |
| :--- | :--- |
| 研究日期 | 2026-05-22 |
| 研究範圍 | 保險通訊處 / 代理人用 CRM、Agency Management System、銷售智能與 AI 輔助拜訪流程 |
| 目標 | 規劃「可體驗版」應包含的功能、體驗路徑與差異化切入點 |
| 產出 | 可體驗版功能包、體驗路徑、標竿網站 audit、開發優先級 |

## 1. 領域定義與 Top 3 標竿網站

本次把誠問 AI 所在領域定義為：**保險銷售團隊的端到端客戶經營平台**，涵蓋客戶 360、保單 / 保障需求、拜訪規劃、銷售流程、報告、追蹤、主管管理與 AI 輔助。

以下三個網站作為全球 Top 3 產品標竿，原因是它們各自代表保險 CRM / AMS 的三個主流方向：

| 標竿網站 | Top 3 判準 | 對誠問 AI 的啟發 |
| :--- | :--- | :--- |
| [Salesforce Financial Services Cloud for Insurance Brokerages](https://www.salesforce.com/financial-services/insurance-brokerage-management-software/) | Salesforce 自稱為「#1 AI CRM」，其保險經紀方案主打 360-degree client view、client lifecycle、AI 自動化、Policy Lifecycle Manager、commission / billing workflows | 可體驗版要把「客戶 360 + lifecycle action」放在第一屏，不只展示 AI 對話 |
| [Applied Epic](https://www1.appliedsystems.com/en-us/solutions/for-agents/agency-management-system/applied-epic) | 官方稱 Applied Epic 是「world's most widely used insurance agency management system」，涵蓋 prospecting、pipeline、quoting、accounting、reporting、policy management、sales automation | 可體驗版必須呈現保險業的完整作業骨架：客戶、保單、拜訪、報告、追蹤、續保 / 加保 |
| [Vertafore AMS360](https://www.vertafore.com/products/agency-management-software/ams360) | 官方定位為 agency management system，串接 people / process / data，涵蓋 policy lifecycle、accounting、BI、AI Reconciliation Agent、Email Agent、client communication | 可體驗版要讓使用者看到「營運效率」而非只看到「內容生成」：任務、追蹤、通知、主管視角都要連起來 |

補充參照：

- [AgencyBloc AMS+](https://www.agencybloc.com/agency-management-system/)：保險垂直 CRM 的 health / benefits / Medicare 工作流、compliance、policy tracking、agent management 與 reporting 值得參考。
- [Huthwaite SPIN Methodology](https://www.huthwaiteinternational.com/spin-methodology)：SPIN 不是僵硬步驟，而是 Situation / Problem / Implication / Need-payoff 四類問題，用來引導買方自己說出需求價值。
- [台灣 FSC KYC / product suitability 條文](https://law.fsc.gov.tw/EngLawContent.aspx?id=2273&lan=E)：保險銷售應蒐集財務資訊、評估風險承受度、檢查商品適合度，並設置客戶資料使用與保密控管。

## 2. 可體驗版版本定位

建議版本名稱：**Experience Preview 0.8**

核心定位：讓通訊處主管與業務員在 20-30 分鐘內看見「從客戶洞察到回訪行動」的閉環，而不是單點 AI demo。

體驗版主張：

1. **保險垂直，而非泛 CRM**：客戶資訊需呈現家庭、保障、保單、風險缺口與互動紀錄。
2. **銷售方法論可被執行**：SPIN 問題、訪前規劃、演練與報告要串成同一條路徑。
3. **主管看得到團隊行為**：能看到誰有做規劃、誰有練習、哪些客戶有回應。
4. **AI 是流程助理，不是單次生成器**：AI 要能在每一步提供下一步動作、風險提醒與合規提示。

## 3. 可體驗版功能包

### P0 必須包含

| 模組 | 體驗版功能 | 成功標準 |
| :--- | :--- | :--- |
| 體驗版首頁 / 任務中樞 | 呈現 6 步體驗路徑、目前完成度、下一個可點行動 | 使用者不用口頭引導即可知道下一步 |
| CRM 客戶 360 | 展示客戶基本資料、家庭、保單、AI 摘要、保障缺口、互動時間軸 | 像保險 CRM，不像一般聯絡人資料庫 |
| 訪前規劃 | 選客戶 + 拜訪目的，AI 生成目標、SPIN 問題、異議處理、材料 | 一鍵產出可帶去拜訪的準備包 |
| SPIN 對話 | 支援 SELF_CLARIFY / QUESTION_DESIGN，四階段產出摘要 | 問題不是模板堆疊，而是根據客戶情境推進 |
| 劇場演練 | 依客戶背景選 persona / 難度，演練後給分與話術修正 | 能讓業務員在拜訪前先練一次 |
| 雙版本報告 | 內部版含銷售洞察，客戶版含專業建議與分享頁 | 分享後可追蹤開啟，回到 CRM / dashboard |
| AI 助手 | 情境感知推薦行動、導航、摘要、下一步提醒 | 不只問答，能推動路徑前進 |

### P1 建議納入

| 模組 | 體驗版功能 | 理由 |
| :--- | :--- | :--- |
| 主管視角 | 團隊規劃覆蓋率、演練完成率、報告分享後回訪率 | Applied / Vertafore 類 AMS 都強調營運與 BI |
| 合規提示 | KYC / 適合度提醒、敏感資料標記、AI disclaimer | 保險銷售產品不可只做生成，需呈現安全邊界 |
| 追蹤通知 | 報告開啟、生日、保單到期、回訪任務 | 對齊 AMS360 的 client communication / automation |
| 範例資料切換 | 初訪、加保、續保、轉介紹、長照 / 退休 / 教育金案例 | 讓體驗版能服務不同銷售場景 |

## 4. 建議體驗路徑

### 業務員 25 分鐘主路徑

1. 進入 **體驗版中樞**，看到今日推薦客戶與 6 步流程。
2. 點選「林建華」進入 CRM 360，快速理解家庭、保單、資產與 AI 風險提示。
3. 建立「初訪 / 加保 / 續約」訪前規劃，AI 生成 SPIN 問題與異議處理。
4. 從訪前規劃跳到 SPIN 對話，完成 Situation → Problem → Implication → Need-payoff 摘要。
5. 進入劇場演練，選「保守型 / 忙碌型 / 疑慮型」客戶，完成 3-5 輪演練。
6. 生成報告，業務員看到內部版，客戶收到分享版。
7. 客戶打開分享頁後，dashboard 出現 engagement event 與下一步任務。
8. AI 助手整理回訪建議，業務員安排下一次會談。

### 主管 15 分鐘管理路徑

1. 進入 dashboard 或 team page。
2. 查看本週 SPIN 次數、訪前規劃覆蓋率、劇場演練完成率。
3. 看到需輔導業務員與高機會客戶。
4. 點進單一業務員 / 客戶，檢查 SPIN 摘要、報告品質與追蹤狀態。
5. 指派下一步任務或回饋。

### 客戶 3 分鐘分享路徑

1. 由 LINE / Email 開啟專屬報告頁。
2. 看見個人化保障摘要、風險說明、建議下一步。
3. 點選「預約討論 / 我有疑問」。
4. 系統回寫開啟與互動事件。

## 5. 標竿功能對照

| 能力 | Salesforce | Applied Epic | Vertafore AMS360 | 誠問 AI 現況 | 體驗版判斷 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 客戶 360 | 360 client view、single platform | single view of agency business | people / process / data connected | 已有 CRM、家庭、保單、關係地圖 | 足夠展示，需補體驗入口 |
| 保單生命週期 | Policy Lifecycle Manager | policy management、renewals、submissions | bind-to-renewal policy lifecycle | 有保單 mock 與 gap analysis | 體驗版可展示，真實 CRUD 待補 |
| 銷售流程 | action plans、discovery framework | prospecting、pipeline、sales automation | client communication / automation | SPIN、pre-visit、report 已有 | 需要把跨頁路徑串起來 |
| AI 營運 | Agentforce | AI reconciliation / coverage gap | reconciliation / email agents | AI mock + OpenAI route | 體驗版先用 mock，需標示 AI 邊界 |
| Reporting / BI | Financial Services Cloud analytics ecosystem | role-based dashboards | BI trends / KPIs | dashboard、team page 已有 | 需補「體驗版 readiness」視角 |
| 合規 / 安全 | enterprise trust posture | security controls / permissions | integrated systems | 尚未看到完整 auth / org isolation | 不可聲稱正式合規，只能呈現設計方向 |

## 6. Domain Knowledge 要求

### SPIN

Huthwaite 將 SPIN 定義為四類問題：Situation 蒐集背景、Problem 找出困難、Implication 探索問題後果、Need-payoff 讓客戶說出解決價值。體驗版不應把 SPIN 做成硬性的四頁表單，而應讓 AI 根據回答動態建議下一個問題。

### 台灣保險合規

FSC 條文要求 KYC 指引至少包含蒐集財務資訊、核保與審查原則、商品適合度檢查、客戶資料使用與保密原則。體驗版可用「合規提示 / 資料敏感度 / 適合度提醒」呈現專業度，但不得讓 demo 看起來像已具備正式法遵系統。

### 保險 AMS

全球標竿都不是只做客戶名片管理，而是把政策、續保、佣金、會計、通訊、報告、營運 KPI 串起來。誠問 AI 的差異化不在於複製 AMS 全功能，而是先用 AI 把「拜訪準備 → 對話 → 報告 → 追蹤」做深。

## 7. 目前產品可直接支撐的體驗版

| 已有模組 | 可支撐內容 |
| :--- | :--- |
| `/dashboard` | KPI、日曆、任務、活動、AI insight |
| `/crm`、`/crm/[clientId]` | 客戶列表、360 概覽、gap analysis、relationships、timeline、reports |
| `/pre-visit`、`/pre-visit/[planId]` | 拜訪規劃、AI 生成、拜訪後記錄 |
| `/spin`、`/spin/[sessionId]` | SPIN 對話、階段輸出、問題建議 |
| `/theater`、`/theater/[sessionId]` | 角色演練與評分 |
| `/reports`、`/reports/[reportId]` | 報告列表、報告生成、分享 |
| `/share/[token]` | 客戶公開報告與追蹤 |
| `/team` | 團隊管理雛形 |
| 全頁 AI 助手 | 導航、摘要、mock RAG |

## 8. 主要缺口

| 優先級 | 缺口 | 影響 |
| :--- | :--- | :--- |
| P0 | 沒有體驗版中樞，功能散在各頁 | Demo 需要口頭帶，使用者不易理解閉環 |
| P0 | 資料仍以 Zustand + mock 為主，Prisma 目前只有 Issue | 不能承諾正式多使用者 / 真資料 |
| P0 | Auth、orgId、多租戶、權限尚未實作 | 通訊處 / 主管情境無法正式上線 |
| P0 | AI mock 與真 AI 路線混用，缺少模型狀態標示 | Demo 可用，但需明確 beta 邊界 |
| P1 | 報告分享追蹤尚偏 mock，缺少真 engagement analytics | 追蹤價值無法完全量化 |
| P1 | 合規提示分散，缺少 KYC / suitability checklist | 保險垂直可信度還可加強 |
| P1 | 沒有匯入 / 匯出 / carrier integration | 與 AMS 類產品相比仍是銷售智能層 |

## 9. Audit 結論

可體驗版應優先建立「體驗版中樞」作為跨模組路徑入口，讓已有的 CRM、pre-visit、SPIN、theater、report、share、team 功能被包成一條可展示的保險銷售閉環。這比新增孤立功能更能對齊 Salesforce / Applied / Vertafore 的平台感，也更能凸顯誠問 AI 的差異：**用 AI 把保險業務每一次拜訪變成可準備、可演練、可追蹤、可輔導的流程。**

