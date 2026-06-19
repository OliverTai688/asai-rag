# 誠問 AI — ElevenLabs 風格設計方向 v1.0

> 流水號 018 ｜分類 02_architecture-and-rules ｜狀態：草案 → 待執行
> 對應批次執行文件：`docs/05_execution-plans/PLN-006_elevenlabs-batch-tasks-v1.0.md`

本文件做三件事：(1) 拆解 ElevenLabs.io 的設計語言，(2) 對照誠問 AI 現況做差距分析，(3) 定義可落地的目標 token / 結構 / 排版規格。所有規格皆對應實際檔案，供 AGENTS 依 019 批次文件逐項執行。

---

## 1. ElevenLabs 設計 DNA（研究）

ElevenLabs 官網之所以「高級」，靠的不是顏色多，而是**克制 + 編輯感 + 高對比**。拆成九條可複製的原則：

1. **單色為底、高對比畫布**：近黑墨色（≈`#0A0A0A`）配暖白紙色（≈`#FAFAF9`），大量真中性灰。彩色幾乎只出現在「產品視覺」（漸層、波形），介面框架本身近乎黑白。
2. **反白區塊節奏**：白底區段與純黑底區段交替，黑底段用來聚焦 CTA / 產品 demo，形成「呼吸感」與戲劇張力。
3. **編輯級排版**：超大標題（display 56–96px），負字距（heading `-0.02em ~ -0.04em`），neo-grotesque 無襯線字體，數字用 tabular。標題佔版面、留白佔其餘。
4. **髮絲線取代陰影**：1px 細邊框（暖灰）界定區塊，平面化表面，hover 才給極輕微 elevation。少用 drop shadow。
5. **慷慨的縱向節奏**：section 上下 padding 96–160px，內容 max-width 收斂、行寬舒適（measure 約 60–70 字元）。
6. **Bento 網格**：功能區用大小不一的 bento 卡片拼貼，而非等寬三欄。
7. **單色按鈕**：黑底白字 / 白底黑字 / 髮絲線 outline，圓角溫和（pill 或 8–12px）。彩色按鈕極罕見。
8. **克制的動態**：200–400ms ease-out 淡入 + 小幅位移；尊重 `prefers-reduced-motion`。沒有彈跳、沒有炫技。
9. **彩色交給內容**：hero / 產品圖用漸層 mesh、波形視覺承載品牌色；介面 chrome 永遠中性。

**一句話總結**：ElevenLabs = 黑白紙墨的編輯版面 + 一個安靜的重點色 + 大留白 + 髮絲線。高級感來自「拿掉」，不是「加上」。

---

## 2. 誠問 AI 現況 × 差距分析

現況設計系統為 **Blue × White × Gold**（見 `src/app/globals.css`、`src/app/page.tsx`）。它「可信、友善」，但離 ElevenLabs 的「編輯級高級感」有明確差距：

| 維度 | 現況 | ElevenLabs 目標 | 差距 |
| --- | --- | --- | --- |
| 底色 | 藍味背景滿版（`#F7FAFF` / `#EBF3FB`） | 中性暖白紙色（`#FAFAF9`）+ 純白卡 | 藍味過重，缺中性層 |
| 重點色 | 藍 + 金同時偏強 | 單一安靜重點色，金只當髮絲微光 | 重點色太多、太亮 |
| 排版 | hero 最大 64px，字距偏鬆 | display 72–96px、負字距、編輯感 | 標題不夠大、不夠緊 |
| 區塊界定 | 卡片陰影 + 10px 圓角 | 1px 髮絲線、平面、hover 才浮 | 陰影過多、偏 SaaS |
| 區段節奏 | section padding 中等 | 96–160px 大留白 + 反白黑區段 | 缺呼吸感與黑區段 |
| 功能版面 | 等寬三欄 FeatureCard | Bento 不規則網格 | 版面太均質 |
| 按鈕 | 藍 default + gold premium | 單色黑/白/outline pill | 彩色按鈕需收斂 |
| 字體 | Noto Sans/Serif TC + DM Serif Display | CJK 用 Noto Sans TC，Latin 配 grotesque | Latin display 用襯線，與 grotesque 調性不符 |

### 品牌取捨原則（重要）

誠問 AI 服務**受規範的保險業**，navy + gold 是刻意的「資深顧問、沉穩可信」訊號，不可整碗丟掉。轉譯策略是：

> **保留 navy 作為「墨色 / 重點錨」、gold 退為「稀有的高級訊號」，但全面採用 ElevenLabs 的結構、排版、留白與單色紀律。**

結果應是：用 ElevenLabs 等級的克制，去表達「資深顧問」的份量。不是把誠問 AI 變成科技黑，而是讓它變成**編輯級的金融高級感**。

---

## 3. 目標規格（可落地）

以下為 019 批次文件各任務的「真實來源（source of truth）」。token 名稱沿用 `globals.css` 既有語意，僅換值或新增中性層。

### 3.1 中性 / 墨紙色層（新增）

```text
--paper        #FAFAF9   /* 頁面底，暖白 */
--paper-2      #F4F4F2   /* 次層底 / hover */
--surface      #FFFFFF   /* 卡片 */
--ink          #0A0A0A   /* 主文字 / 黑區段底 */
--ink-2        #404040   /* 次要文字 */
--ink-3        #737373   /* muted 文字 */
--hairline     #E7E5E4   /* 1px 邊框，暖灰 */
--hairline-2   #D6D3D1   /* 較深髮絲線 */
--inverted-bg  #0A0A0A   /* 反白區段底 */
--inverted-fg  #FAFAF9   /* 反白區段文字 */
```

> **Token 主題感（重要，B0 已實作）**：`paper / ink / hairline` 透過 runtime 變數接線，**會隨 `.dark` 翻轉**（淺色模式淺、深色模式近黑），可安心當主題感表面／文字色用。`inverted-bg / inverted-fg` 為**絕對黑白**，不隨主題變，專供 `.section-inverted` 固定黑區段。主題感表面亦可直接用語意 token（`bg-background / bg-card / border-border / text-foreground / text-muted-foreground`）。

### 3.2 語意 token 重映射（改值，不改名）

維持現有 `--background / --foreground / --card / --primary ...` 介面，讓既有元件零改動就換膚：

```text
--background        #FAFAF9        (was #F8FAFC)
--foreground        #0A0A0A        (was #0A1929)
--card              #FFFFFF
--card-foreground   #0A0A0A
--muted             #F4F4F2        (was #EBF3FB，去藍味)
--muted-foreground  #737373        (was #546E7A)
--border            #E7E5E4        (was #D8E1EA，髮絲化)
--input             #E7E5E4
--primary           #1A3A6B        (navy 保留為重點錨)
--ring              #1A3A6B        (focus 用 navy，去亮藍)
--accent            #F4F4F2        (中性化，去 #E8F0FE)
```

> 金色（`--color-gold*`）保留變數但**使用面積 < 3%**：僅用於髮絲分隔線、極少數 premium 徽章。移除大面積金底（如 `#FDF3D0` 區塊）。

### 3.3 排版尺度

```text
Display   clamp(48px, 6vw, 88px)   weight 600–700   tracking -0.03em   line-height 1.05
H1        clamp(32px, 4vw, 56px)   weight 600       tracking -0.02em   line-height 1.1
H2        28–32px                  weight 600       tracking -0.015em
Body-L    18px / 1.6
Body      15–16px / 1.6
Caption   12–13px   tracking 0.02em   muted
Eyebrow   11px      tracking 0.16em   UPPERCASE   muted（取代現有金色 eyebrow）
```

- **CJK**：Noto Sans TC（既有）。
- **Latin / 數字**：導入 neo-grotesque 變體（建議 `Geist` 或 `Inter Tight`，next/font 載入），取代用 `DM Serif Display` 當 display 的做法。數字一律 tabular。

### 3.4 區段節奏與容器

```text
Section padding   py 96–160px（桌機），py 64–80px（手機）
Content width     max-w-[1200px]；文字段落 max-w-[680px]
網格              功能區改 bento（asymmetric grid），非等寬三欄
反白區段          每頁至少 1 段純黑（--inverted-bg）聚焦 CTA / 產品
```

### 3.5 元件規格

- **Button**：新增 `mono`（黑底白字）與 `monoOutline`（髮絲線）variant，作為主 CTA；`default`(navy) 降為次要；`gold` 僅保留給單一 premium 場景。圓角 pill（`rounded-full`）或 12px。
- **Card**：移除 drop shadow，改 1px `--hairline` 邊框 + 平面；hover 僅 border 變深 + 1px 位移。`CardGold` 左金條保留但細化為 1px。
- **Badge**：中性化，預設 `--ink` / 髮絲 outline；藍金 variant 僅特例。
- **Focus ring**：navy `--ring`，3px 柔光，全站一致。

### 3.5b Depth layer — 「克制 ≠ 空洞」（重要修正）

純粹「拿掉」會讓頁面變**純樸/空洞**，不是 modern。ElevenLabs/Linear/Vercel 的現代感來自「克制的 chrome **＋** 豐富的 hero 視覺」。行銷頁必須補上 depth layer（彩色只出現在這層，chrome 仍中性）：

- **Hero 視覺**：產品 mockup（瀏覽器框 + 假儀表板，純 CSS 即可）或產品截圖，是現代 SaaS landing 的視覺核心。已建 `ProductMock`（見 `src/app/page.tsx`）。
- **背景深度**：`.glow-hero` / `.glow-inverted`（品牌 navy/blue/gold 極光暈）、`.bg-grid` / `.bg-dots`（髮絲格線，ink-based 會隨主題翻轉）、`.mask-radial` / `.mask-fade-b`（讓背景往邊緣淡出）。
- **浮起層**：`.shadow-float` 僅用於 hero 產品視覺（depth 在 hero imagery 上是允許的，chrome 仍維持髮絲線平面）。
- **Bento 要有內容**：卡片內放 mini 視覺（對話氣泡、頭像堆疊、報告線條、評分長條），不要只有 icon + 文字的空盒。
- **Stats strip**：tabular 數字 + 標籤，建立可信度與節奏。

> 規則：**chrome 中性克制；hero/content 視覺承載彩色與深度。** 兩者缺一不可。

### 3.6 動態

```text
進場     opacity 0→1 + translateY 8px，280–360ms，ease-out
Hover    border-color / 1px lift，150ms
反白切換 背景 280ms ease-inout
全程尊重 prefers-reduced-motion（既有 globals.css 已有處理，沿用）
```

---

## 4. 驗收基準（全 redesign 完成時）

1. 主要頁面（landing、pricing、dashboard shell）無大面積藍味底，改中性紙墨層。
2. 每個 marketing 頁至少一段反白黑區段。
3. Hero display 字級 ≥ 72px（桌機）、負字距生效。
4. 卡片以髮絲線界定，drop shadow 僅 hover 微量。
5. 主 CTA 為單色（mono）按鈕；金色面積 < 3%。
6. 功能區為 bento 版面。
7. `pnpm lint` 通過；深色模式（`.dark`）與 `prefers-reduced-motion` 不破版。
8. 對比度符合 WCAG AA（正文 ≥ 4.5:1）。
9. 不更動任何合規欄位與 SPIN / Theater 狀態機（見 CLAUDE.md 約束）。

---

## 5. 參考錨點

- 現況 token：`src/app/globals.css:52-166`
- 現況 landing：`src/app/page.tsx`
- 現況 pricing：`src/app/(public)/pricing/page.tsx`、`src/components/subscription/PricingSection.tsx`
- 元件 primitives：`src/components/ui/{button,card,badge,input}.tsx`
- App shell：`src/app/(dashboard)/layout.tsx`、`src/components/layout/{sidebar,top-bar}.tsx`
- 字體載入：`src/app/layout.tsx:2-33`
