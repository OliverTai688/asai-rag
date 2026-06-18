# 誠問 AI 現代簡約網站設計原則研究 v1.0

> 研究日期：2026-06-17  
> 範圍：研究 modern / minimal / beautiful SaaS 與網站設計原則，轉譯為誠問 AI 可逐頁實作的產品介面準則。  
> 關聯文件：`ARC-003_elevenlabs-design-direction-v1.0.md`、`RES-005_interface-simplification-patterns-v1.0.md`、`PLN-012_page-by-page-modern-ui-batch-tasks-v1.0.md`、`ACC-003_modern-ui-page-acceptance-framework-v1.0.md`。

---

## 1. 研究結論

現代簡約 UI 的核心不是「少放東西」，而是「只讓當下任務需要的東西出現在正確層級」。對誠問 AI 這種保險銷售工作台來說，好的簡約必須同時滿足三件事：

1. **視覺安靜**：低彩度、穩定間距、髮絲線、有限陰影、少量 accent。
2. **操作清楚**：每頁一個主任務，次要操作進 toolbar / sheet / popover。
3. **資訊有效**：保留業務決策必要資料，不為了極簡而藏掉風險、合規、下一步。

因此，本研究建議採用「Beautiful Operational Minimalism」作為下一階段產品 UI 方向：不是行銷型留白，也不是資料密集型後台，而是像 Linear / Attio 這類現代 SaaS 工具一樣，以清楚層級、低噪音元件、精準文字與可預測互動承載複雜工作流。

---

## 2. 外部研究重點

### 2.1 Aesthetic and minimalist design

NN/g 的 Heuristic #8 指出，簡約設計應降低介面噪音，移除不支援使用者任務的內容，讓必要資訊被看見。NN/g 對 minimalism 的特徵研究也強調，極簡不是裝飾風格，而是一種移除無關元素、聚焦任務的策略。

對誠問 AI 的轉譯：

- 每張卡片都要回答「這張卡幫使用者做什麼決策」。
- 裝飾性漸層、大片彩色底、重陰影若不支援任務，移除。
- 說明文字要壓縮成「下一步、狀態、原因」三種高訊號文案。
- 不把保險合規與風險資訊視為雜訊；它們是任務必要資訊。

### 2.2 Aesthetic-usability effect

NN/g 與 Laws of UX 都提到：使用者常把美觀介面感知為更可用。但 NN/g 也提醒，美感可能掩蓋真實可用性問題。這對誠問 AI 很重要：漂亮不能取代流程可用。

對誠問 AI 的轉譯：

- 頁面重設計前先定義任務成功標準，例如「業務員 10 秒內知道下一步」。
- 視覺驗收必須同時包含操作驗收：tab focus、空狀態、loading、error、mobile。
- 美感來自一致性與節制，而不是額外裝飾。

### 2.3 Whitespace and visual hierarchy

多個設計研究與實務指南都指向同一件事：留白的價值在於建立層級與可讀性，不是單純放大空距。IxDF 對 visual hierarchy 的定義也強調，層級讓使用者能在數位產品中找到路徑。

對誠問 AI 的轉譯：

- 留白要用於分隔任務群組，而不是把 dashboard 拉成行銷頁。
- 工作型頁面採「高密度但低噪音」：列表可密，邊框要輕，字級要穩。
- 重要資訊用位置、字重、大小、對比建立層級；少用顏色搶注意力。

### 2.4 SaaS dashboard clarity

SaaS dashboard 研究普遍指出，dashboard 不只是展示資料，而是協助決策、降低認知負荷、推動下一步行動。Linear 的 redesign 說明也提到透過調整 sidebar、tabs、headers、panels 來降低視覺噪音、維持對齊、提升層級與密度。

對誠問 AI 的轉譯：

- Dashboard 不是總覽海報，而是「今日決策台」。
- KPI 不該每張都像主角；只有今日主線與下一步是主角。
- 表格、列表、活動流要比大卡片更常用，讓工具回到工作節奏。

### 2.5 Accessible modern components

Radix Primitives 強調可存取的基礎互動，包括 role、aria、focus management、keyboard navigation。Material Design 對 icon buttons、tooltips、dialogs 也提供清楚邊界：icon 要語意清楚，tooltip 提供簡短支援，dialog 是有意打斷的元件。

對誠問 AI 的轉譯：

- 使用 shadcn / Base UI primitives 時不破壞既有 accessibility 行為。
- icon-only button 一律具備 tooltip 與 accessible name。
- dialog 只用於短任務；長流程改 sheet 或頁面。
- 所有新互動都要能鍵盤操作。

---

## 3. 誠問 AI 的 Modern Minimal Design Principles

### Principle 1 - One Job Per Screen

每個頁面先定義一個「主工作」：

- Dashboard：決定今天先做什麼。
- CRM list：找到或新增客戶。
- CRM detail：理解這位客戶並採取下一步。
- Pre-visit：生成可帶去拜訪的準備包。
- Theater：開始並完成一場演練。
- Reports：產出、編輯、分享報告。
- Team：看出誰需要輔導與下一個管理動作。

頁面第一屏只能有一個主要 CTA。其他操作放到 secondary action、icon toolbar、overflow、sheet。

### Principle 2 - Quiet Density

誠問 AI 是工作工具，不是純展示網站。頁面要比 landing page 更密，但不能吵：

- 使用 1px hairline 代替 shadow。
- 卡片半徑控制在 8px 左右，除非既有 primitive 另有定義。
- 同類資料用 list/table，不用每筆都做大卡。
- 數字使用 tabular-nums。
- 色彩只承擔狀態與品牌，不承擔裝飾。

### Principle 3 - Progressive Context

把資訊分成三層：

| 層級 | 用途 | 元件 |
| --- | --- | --- |
| Primary | 當下必須知道 | page header, summary row, compact card |
| Secondary | 做決策時可能需要 | tabs, collapsible, right sheet |
| Tertiary | 低頻設定與原始資料 | popover, drawer, details section |

不要把所有資訊同時展示；也不要把風險、合規、下一步藏到第三層。

### Principle 4 - Editorial Typography, Operational Scale

行銷頁可用大 display；dashboard 與工具頁不使用 hero-scale type。工具頁文字規則：

- Page title：24-32px。
- Section title：14-18px。
- Card title：12-14px，搭配 eyebrow / metadata。
- Body：13-15px，行高穩定。
- Button label：12-14px，短而明確。

### Principle 5 - Icons as Instruments

icon 是操作樂器，不是謎語：

- 主 CTA：icon + text。
- 導航：icon + text；收合狀態才 icon-only。
- row action：icon-only 可接受，但必須 tooltip + aria-label。
- 狀態 icon 搭配短文案，例如「需補 KYC」「AI 已生成」。
- 危險動作不可只用 icon 表示。

### Principle 6 - Beautiful States

每頁都要設計狀態，而不是只設計 happy path：

- Empty：告訴使用者下一個可做動作。
- Loading：保持版面尺寸穩定。
- Error：說明原因與恢復動作。
- Success：短暫確認，不打斷工作。
- Disabled：說明缺少什麼條件。

---

## 4. 頁面級研究與實作流程

每張頁面卡都必須照以下順序執行：

1. **讀文件**：`ARC-003`、`RES-005`、本文件、對應 `PLN-012` 卡片、`ACC-003`。
2. **現況盤點**：截出頁面任務、主 CTA、資訊區塊、硬編碼色彩、過度卡片/陰影、modal/sheet 使用。
3. **外部參考**：針對該頁搜尋 2-3 個相近現代 SaaS pattern，例如 CRM record view、dashboard decision center、AI chat workspace。
4. **頁面設計 brief**：在實作回覆或對應卡片註記「主工作、保留資訊、移除資訊、互動分層、驗收重點」。
5. **實作**：只改該頁與必要局部元件，不動資料來源與商業邏輯。
6. **驗收**：desktop/mobile、keyboard、reduced motion、lint:changed。

---

## 5. 來源

- NN/g, Aesthetic and Minimalist Design: https://www.nngroup.com/articles/aesthetic-minimalist-design/
- NN/g, The Characteristics of Minimalism in Web Design: https://www.nngroup.com/articles/characteristics-minimalism/
- NN/g, 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, The Aesthetic-Usability Effect: https://www.nngroup.com/articles/aesthetic-usability-effect/
- Laws of UX: https://lawsofux.com/
- IxDF, Visual Hierarchy: https://ixdf.org/literature/topics/visual-hierarchy
- Baymard, Homepage and Category Navigation UX Research: https://baymard.com/research/homepage-and-category-usability
- Baymard, Ecommerce UX Best Practices: https://baymard.com/learn/ecommerce-ux-best-practices
- Linear, How we redesigned the Linear UI: https://linear.app/now/how-we-redesigned-the-linear-ui
- Radix Primitives Accessibility: https://www.radix-ui.com/primitives/docs/overview/accessibility
- Material Design 3, Icon buttons: https://m3.material.io/components/icon-buttons/overview
- Material Design 3, Tooltips: https://m3.material.io/components/tooltips
- Material Design 3, Dialogs: https://m3.material.io/components/dialogs/guidelines
