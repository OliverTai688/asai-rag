# 誠問 AI Premium UI Redesign Plan

| 項目 | 內容 |
| :--- | :--- |
| 建立日期 | 2026-05-22 |
| 目標 | 把目前偏雜、偏 mock 感的介面收斂成高端保險顧問 SaaS |
| 第一優先 | 使用者能掃描、信任、行動，而不是被裝飾干擾 |
| 本輪實作範圍 | Design tokens、核心元件、Dashboard 首屏、Sidebar / Topbar、任務與活動 panels |

## 1. 外部標竿研究

本輪選擇三個高端產品介面作為視覺標竿：

| 標竿 | 研究依據 | 可借鑑原則 |
| :--- | :--- | :--- |
| [Linear UI refresh](https://linear.app/changelog/2026-03-12-ui-refresh) | Linear 2026 UI refresh 強調 calmer、consistent interface，目標是更容易 scan information、navigate workflows、stay focused；也特別提到 dimmer sidebars 讓主內容突出 | 側欄降噪、主內容抬高、頁面 header 與 controls 一致化 |
| [Stripe Apps Design](https://docs.stripe.com/stripe-apps/design) / [Components](https://docs.stripe.com/stripe-apps/components) | Stripe 強調限制 custom styling 以維持一致性與 accessibility，並用 component patterns、ContextView / FocusView、Table、TaskList、Badge、Charts 等穩定元件組成 dashboard | 少用自由色與自由樣式；用穩定元件、清楚狀態、表格與 task list 承載金融資訊 |
| [Vercel Geist](https://vercel.com/geist/introduction) | Geist 是 Vercel 的一致化 web experience 設計系統，核心是克制、精準、低噪音的 developer product UI | 降低彩度與陰影；把邊界、字重、間距做準，讓資訊本身高級 |

## 2. 現況 Audit

目前介面「髒髒的」的主因：

1. **表面太多層**：Card 內又放帶背景的區塊、再加 hover shadow，造成廉價的堆疊感。
2. **圓角過大且不一致**：`rounded-xl`、`2xl`、`3xl`、`32px` 混用，金融 SaaS 會顯得不穩。
3. **顏色太滿**：成功綠、警告橘、亮藍、金色、淺藍都同時在首屏出現，品牌的 Blue × White × Gold 失焦。
4. **金色使用過量**：金線、金 badge、金 CTA、金點在多處同時出現，失去「高級點綴」的稀缺性。
5. **KPI 視覺太熱鬧**：每張 KPI 有圖示背景、trend chip、大數字、sparkline、漸層，導致掃描成本高。
6. **Topbar / Sidebar 噪音高**：粗金線、強陰影、Logo 卡、active pill 都在搶視線。
7. **字級與字重過多**：`font-black`、大數字、全大寫 badge 混用太頻繁，缺少成熟節奏。

## 3. Premium UI 原則

### 3.1 視覺語言

- **80% 中性表面**：白、霧白、淡藍灰作為主體。
- **15% 深藍結構**：標題、選中態、主要 CTA。
- **5% 金色點綴**：只用於高價值提示、品牌 mark、少數 KPI accent。
- **停止大面積彩色卡片**：狀態用文字、icon、細線，不用整塊色塊。
- **卡片半徑收斂到 8-12px**：核心 SaaS 元件以 `rounded-lg` 為主。
- **陰影變薄**：用 border + subtle shadow，不用厚重 drop shadow。

### 3.2 資訊架構

- Dashboard 首屏只回答三件事：
  1. 今天最重要的客戶 / 任務是什麼？
  2. 團隊或個人指標是否正常？
  3. 下一步去哪裡？
- Calendar 不應搶走首屏全部注意力，應退為「今日安排」而非巨型 widget。
- KPI 不用 sparkline 全部展開，首屏只保留一個主趨勢指標，其他用靜態摘要。

### 3.3 互動感

- Hover 只改 border/background，不做大幅 translate。
- Motion 用於進場與狀態轉換，不用持續閃動。
- 重要行動使用 icon + text，次要行動用 ghost/link。

## 4. 分階段開發計劃

### Phase 1：全域質感清理

本輪實作。

- 調整 `globals.css` tokens：背景更霧白、border 更淡、gold 使用更少。
- 調整 `Card`：圓角收斂、陰影變薄、hover 更克制。
- 調整 `Button` / `Badge`：去掉過度漸層與過大 pill，讓狀態更成熟。
- Sidebar：dim side navigation，active state 更細。
- Topbar：移除粗金線與重陰影，搜尋變成安靜工具列。

### Phase 2：Dashboard 首屏高級化

本輪實作。

- Header 加入「今日指揮中心」語氣，減少裝飾 badge。
- KPI 卡片變成 executive metric strip：少色、少圖、少動。
- Calendar 變成 compact schedule panel。
- 今日任務變成清楚的 task list。
- AI Insight 變成 advisor note，而不是彩色提示清單。

### Phase 3：CRM / SPIN / Report 深層頁一致化

下一輪。

- CRM detail tab header 統一。
- SPIN 對話區改成 FocusView：左主對話、右窄輔助。
- Report editor 改成文稿閱讀感，降低 card 堆疊。

### Phase 4：封測前 UI QA

下一輪。

- Desktop / tablet / mobile screenshot 檢查。
- Light / dark mode 對比檢查。
- 移除低於 12px 的輔助文字。
- 金色使用比例 audit。

## 5. 本輪驗收標準

- Dashboard 第一眼更安靜、有高級金融 SaaS 感。
- 首屏不再同時出現多種高彩度卡片。
- Sidebar 與 Topbar 退到背景，主內容更突出。
- `pnpm build` 成功。
- 用 in-app browser 重新截圖確認。

