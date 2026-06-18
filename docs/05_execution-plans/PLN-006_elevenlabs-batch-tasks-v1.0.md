# 誠問 AI — ElevenLabs 風格 Batch Tasks v1.0

> 流水號 019 ｜分類 05_execution-plans ｜狀態：待執行
> 設計依據：`docs/02_architecture-and-rules/ARC-003_elevenlabs-design-direction-v1.0.md`
> 給 AGENTS 的執行協定見 `AGENTS.md` ＞ Batch Task Execution Protocol

本文件是**可被 agent 逐張執行的任務卡**集合。任務分成 6 個批次（B0–B5），有依賴順序。每張卡片自帶：目標、檔案、步驟、驗收、範圍外。完成一張即在「進度看板」打勾並更新 §狀態。

---

## 進度看板（單一真相）

| 批次 | 任務 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| B0 | B0-01 中性 token 層 | ✅ | — |
| B0 | B0-02 語意 token 重映射 | ✅ | B0-01 |
| B0 | B0-03 排版尺度 + Latin grotesque 字體 | ✅ | B0-01 |
| B0 | B0-04 動態 / 反白 utility | ✅ | B0-01 |
| B1 | B1-01 Button mono variant | ✅ | B0 |
| B1 | B1-02 Card 髮絲線平面化 | ✅ | B0 |
| B1 | B1-03 Badge 中性化 | ✅ | B0 |
| B1 | B1-04 Input / focus ring 一致化 | ✅ | B0 |
| B2 | B2-01 Landing hero 編輯版重build | ✅ | B1 |
| B2 | B2-02 Landing 功能區 bento 化 | ✅ | B1 |
| B2 | B2-03 Landing 反白 CTA 區段 | ✅ | B1 |
| B2 | B2-04 Pricing 頁 ElevenLabs 化 | ✅ | B1 |
| B3 | B3-01 Dashboard layout 中性化 | ✅ | B1 |
| B3 | B3-02 Sidebar 髮絲線重整 | ✅ | B1 |
| B3 | B3-03 Top-bar 精簡 | ✅ | B1 |
| B4 | B4-01 Dashboard 卡片 / widget | ✅ | B3 |
| B4 | B4-02 圖表配色中性化 | ✅ | B3 |
| B5 | B5-01 動態與 hover 收斂 | ✅ | B2,B3,B4 |
| B5 | B5-02 對比度 / a11y / reduced-motion QA | ✅ | 全部 |
| B5 | B5-03 深色模式回歸測試 | ✅ | 全部 |

狀態圖示：☐ 未開始 ／ ◐ 進行中 ／ ✅ 完成 ／ ⛔ 阻擋。

---

## 批次 B0 — 基礎 Token（先做，其餘全靠它）

### TASK B0-01 — 中性 / 墨紙色層
- 依賴：無
- 檔案：`src/app/globals.css`
- 目標：在 `@theme inline` 與 `:root` 新增 018 §3.1 的中性 token（paper / ink / hairline / inverted）。
- 步驟：
  1. 在 `@theme inline` 區（`globals.css:52-64` 附近）新增 `--color-paper`、`--color-ink`、`--color-hairline`、`--color-inverted-bg`、`--color-inverted-fg` 等 Tailwind utility token。
  2. 在 `:root` 新增同名 CSS 變數與值（見 018 §3.1）。
  3. 不刪除既有藍/金變數（後續批次仍引用，只是縮小使用面積）。
- 驗收：`pnpm prisma:validate` 不需動；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）；可在元件以 `bg-paper`、`text-ink`、`border-hairline` 取用。
- 範圍外：不改任何元件、不動 `.dark`（B5-03 再驗）。

### TASK B0-02 — 語意 token 重映射
- 依賴：B0-01
- 檔案：`src/app/globals.css`（`:root`，`globals.css:67-137`）
- 目標：將既有語意 token 換成 018 §3.2 的中性值，達成「零元件改動換膚」。
- 步驟：依 018 §3.2 表逐項改值（`--background`、`--foreground`、`--muted`、`--muted-foreground`、`--border`、`--input`、`--ring`、`--accent`）。`--primary` 保留 navy。
- 驗收：dashboard 與 landing 直接刷新後底色轉中性、無藍味滿版；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：硬編碼了顏色的頁面（如 `page.tsx` 的 `#F7FAFF`）由 B2 處理，本卡不碰。

### TASK B0-03 — 排版尺度 + Latin grotesque 字體
- 依賴：B0-01
- 檔案：`src/app/layout.tsx`、`src/app/globals.css`
- 目標：導入 018 §3.3 排版尺度與 Latin neo-grotesque。
- 步驟：
  1. `layout.tsx:2` 以 `next/font/google` 加入 `Geist`（或 `Inter_Tight`）作為 `--font-display`/Latin，取代以 `DM Serif Display` 當 display 的角色（`DM_Serif_Display` 可保留供特例，但不再是預設 display）。讀 `node_modules/next/dist/docs/` 確認此版 next/font API。
  2. `globals.css` 新增 heading utility（display/h1/h2 的 `font-size: clamp(...)`、`letter-spacing`、`line-height`），數字 `font-variant-numeric: tabular-nums`。
- 驗收：標題套用後字級/負字距生效；CJK 仍走 Noto Sans TC 不變形；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：各頁面套用 heading class 由 B2/B3 做。

### TASK B0-04 — 動態 / 反白 utility
- 依賴：B0-01
- 檔案：`src/app/globals.css`
- 目標：提供反白區段與標準進場動態的 utility，供 marketing 批次重用。
- 步驟：
  1. 新增 `.section-inverted`（`background: var(--inverted-bg); color: var(--inverted-fg)`）含內部文字/邊框色覆寫。
  2. 確認既有 `page-enter` / `card-stagger` keyframes（`globals.css:169` 起）符合 018 §3.6 參數，必要時調整 translateY 與 duration。
  3. 確認 `prefers-reduced-motion` 區塊（既有）涵蓋新 utility。
- 驗收：任一頁套 `.section-inverted` 即得黑底白字且邊框/次文字正確；reduced-motion 下動態降級。
- 範圍外：實際套用反白區段是 B2-03。

---

## 批次 B1 — 核心元件 Primitives

### TASK B1-01 — Button mono variant
- 依賴：B0
- 檔案：`src/components/ui/button.tsx`
- 目標：新增 `mono`（黑底白字）與 `monoOutline`（髮絲線）variant 作為主 CTA；`gold` 收斂為單一 premium 用。
- 步驟：
  1. 在 `variants.variant`（`button.tsx:10`）新增 `mono`：`bg-ink text-inverted-fg hover:bg-ink/90`；`monoOutline`：`border-hairline text-ink bg-transparent hover:bg-paper-2`。
  2. 圓角：主 CTA 場景可用 `rounded-full`（保留 size 既有，className 覆寫）。
  3. 不刪 `default`/`gold`，僅文件註記「default=次要、gold=特例」。
- 驗收：`buttonVariants({ variant: "mono" })` 可用；既有用到 default/gold 的頁面不報錯；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：不批次替換現有按鈕（各頁於 B2/B3 換）。

### TASK B1-02 — Card 髮絲線平面化
- 依賴：B0
- 檔案：`src/components/ui/card.tsx`
- 目標：移除 drop shadow 預設，改 1px `--hairline` 邊框、平面表面，hover 才微浮。
- 步驟：
  1. Card 根樣式 shadow 改為 `border border-hairline shadow-none`，hover 加 `hover:border-hairline-2 hover:-translate-y-px transition`。
  2. `CardGold` 左金條由現況細化為 1px。
  3. 深色模式 border 用半透明（沿用既有 `rgba(144,202,249,0.15)` 或改中性半透明）。
- 驗收：卡片無重陰影、髮絲線清楚；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：dashboard widget 內距調整在 B4。

### TASK B1-03 — Badge 中性化
- 依賴：B0
- 檔案：`src/components/ui/badge.tsx`
- 目標：預設 badge 中性（ink / 髮絲 outline）；藍金 variant 保留但標為特例。
- 步驟：調整 `default` 為中性，新增/確認 `outline` 走髮絲線；`blue`/`gold` 保留。
- 驗收：預設 badge 不再是藍底；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：逐頁替換不在本卡。

### TASK B1-04 — Input / focus ring 一致化
- 依賴：B0
- 檔案：`src/components/ui/{input,textarea,select}.tsx`、`button.tsx`
- 目標：focus ring 全站統一為 navy `--ring` 3px 柔光（取代散落的 `#1565C0/20`）。
- 步驟：將硬編碼 `ring-[#1565C0]/20` 改為 `ring-ring/20`（或語意 token），邊框用 `border-hairline`。
- 驗收：tab focus 視覺一致；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）；鍵盤可見 focus（a11y）。
- 範圍外：無。

---

## 批次 B2 — 行銷頁面（最有感、Demo 用）

### TASK B2-01 — Landing hero 編輯版重build
- 依賴：B1
- 檔案：`src/app/page.tsx`
- 目標：hero 改 ElevenLabs 編輯風：超大 display 標題（≥72px 桌機、負字距）、中性紙底、單色主 CTA。
- 步驟：
  1. 容器底色由 `#F7FAFF` 改 `bg-paper`；移除藍 radial，改極淡中性或拿掉。
  2. H1 套 display class（B0-03），padding 拉大（py 96–128）。
  3. 主 CTA 改 `variant="mono"` pill；次 CTA `monoOutline`。eyebrow 改中性（去金）。
- 驗收：hero 字級/負字距達標、無藍味底、主 CTA 單色；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：功能區（B2-02）、反白段（B2-03）。

### TASK B2-02 — Landing 功能區 bento 化
- 依賴：B1
- 檔案：`src/app/page.tsx`（`FeatureCard` 區，`page.tsx:92-124`）
- 目標：等寬三欄改 bento 不規則網格，卡片髮絲線平面。
- 步驟：用 CSS grid 做 asymmetric bento（例：一大兩小 / 2×3 跨欄）；`FeatureCard` 改 `border-hairline`、移除藍/金底，icon 底改中性。
- 驗收：版面非等寬均質、髮絲線一致、RWD 不破；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：文案不改。

### TASK B2-03 — Landing 反白 CTA 區段
- 依賴：B1、B0-04
- 檔案：`src/app/page.tsx`
- 目標：新增/改造一段純黑反白區（`.section-inverted`）聚焦最終 CTA 與品牌語。
- 步驟：將 brand statement 或新增 CTA 段套 `.section-inverted`，內含白字標題 + mono(白底黑字) CTA；金色僅 1px 分隔線。
- 驗收：黑區段對比正確、CTA 醒目、reduced-motion 正常；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：無。

### TASK B2-04 — Pricing 頁 ElevenLabs 化
- 依賴：B1
- 檔案：`src/app/(public)/pricing/page.tsx`、`src/components/subscription/PricingSection.tsx`
- 目標：方案卡改髮絲線中性版；highlight 方案用「黑反白卡」而非金漸層；數字 tabular。
- 步驟：
  1. 頁底 `#F7FAFF` → `bg-paper`。
  2. `PricingSection` 卡片去金漸層底，改 `border-hairline`；PRO 改 `.section-inverted` 卡（黑底白字）+ mono CTA。
  3. 價格數字套 tabular-nums、display 字級。
- 驗收：四欄卡片中性一致、PRO 以反白凸顯而非金、motion 收斂；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：`plans.ts` 商業資料不改；PurchaseModal 流程不改（僅按鈕換 mono）。

---

## 批次 B3 — App Shell

### TASK B3-01 — Dashboard layout 中性化
- 依賴：B1
- 檔案：`src/app/(dashboard)/layout.tsx`
- 目標：主內容區底色走 `--background`(已中性)、區塊以髮絲線界定。
- 步驟：移除硬編碼藍味底，確認沿用語意 token；main 區邊界用 `border-hairline`。
- 驗收：dashboard 框架中性、無藍滿版；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）；QuickstartMode 不破。
- 範圍外：sidebar / top-bar 各自卡片。

### TASK B3-02 — Sidebar 髮絲線重整
- 依賴：B1
- 檔案：`src/components/layout/sidebar.tsx`
- 目標：active 態由藍底改中性（淺灰底 + ink 文字 + 1px 左 accent），icon thin-stroke。
- 步驟：active `#F1F6FB` → `bg-paper-2`；左 accent 2px → 1px navy；hover 中性。
- 驗收：導航中性、active 清楚、收合態正常；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：導航項目增刪不在本卡。

### TASK B3-03 — Top-bar 精簡
- 依賴：B1
- 檔案：`src/components/layout/top-bar.tsx`
- 目標：髮絲線底邊、移除多餘陰影、字級/留白對齊 018 排版。
- 驗收：top-bar 平面髮絲線、notification-hub 不破；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：通知邏輯不改。

---

## 批次 B4 — Dashboard 內容

### TASK B4-01 — Dashboard 卡片 / widget
- 依賴：B3
- 檔案：`src/components/dashboard/*`（activity-timeline、tasks-panel、engagement-heat-list 等）
- 目標：套用 B1-02 卡片、中性配色、tabular 數字、留白對齊。
- 驗收：各 widget 視覺一致、髮絲線、無重陰影；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：資料來源 / store 不改。
- 狀態：✅ 完成（2026-06-17）。
- 變更檔案：`src/app/(dashboard)/dashboard/page.tsx`、`src/components/dashboard/activity-timeline.tsx`、`src/components/dashboard/dashboard-calendar.tsx`、`src/components/dashboard/engagement-heat-list.tsx`、`src/components/dashboard/tasks-panel.tsx`。

### TASK B4-02 — 圖表配色中性化
- 依賴：B3
- 檔案：`src/app/globals.css`（`--chart-1..5`）、用到圖表的元件
- 目標：圖表色盤由藍金改「navy 單色階 + 1 個重點」，符合單色紀律。
- 步驟：`--chart-1..5` 改 navy 明度階；保留 1 個 accent 給關鍵序列。
- 驗收：圖表中性可讀、色弱友善；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 範圍外：圖表函式庫不換。
- 狀態：✅ 完成（2026-06-17）。
- 變更檔案：`src/app/globals.css`。

---

## 批次 B5 — 動態與品質

### TASK B5-01 — 動態與 hover 收斂
- 依賴：B2、B3、B4
- 檔案：全站（以 `globals.css` utility 為主）
- 目標：統一進場/hover 動態為 018 §3.6 參數，移除不一致的 transition。
- 驗收：互動一致、無突兀彈跳；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 狀態：✅ 完成（2026-06-17）。
- 變更檔案：`src/app/globals.css`、`src/components/ui/card.tsx`、`src/components/ui/select.tsx`、`src/components/ui/tabs.tsx`、`src/components/ui/badge.tsx`。

### TASK B5-02 — 對比度 / a11y / reduced-motion QA
- 依賴：全部
- 檔案：跨頁
- 目標：正文對比 ≥ WCAG AA 4.5:1；focus 可見；reduced-motion 全頁降級。
- 步驟：逐頁檢查 ink/muted 在 paper 上的對比；補不足者。產出簡短 QA 清單附於本檔末。
- 驗收：AA 通過、鍵盤導航可見 focus。
- 狀態：✅ 完成（2026-06-17）。
- 變更檔案：`src/app/globals.css`、`src/components/layout/sidebar.tsx`、`src/components/demo/dashboard-welcome-card.tsx`。
- QA 結果：
  - Token 對比：`ink/paper` 18.96:1、`muted/paper` 4.54:1、`muted/white` 4.74:1、dark muted 7.85:1。
  - Browser routes：`/`、`/pricing`、`/dashboard` 桌機抽查皆無 console error、無水平溢出；最低文字對比 ≥ 4.5:1。
  - 修正：Dashboard Quickstart label `UI 測試腳本` 由 `#7B8B9A` 改為 `text-muted-foreground`，對比由 3.5:1 提升至 4.74:1。
  - Focus：補全域 `focus-visible` fallback，sidebar nav link 補明確 `focus-visible:outline-ring`。
  - Reduced motion：補全域 `prefers-reduced-motion` 降級，限制 animation/transition 時長並關閉自定進場位移。
  - Mobile：`/dashboard` 390px browser check 無水平溢出、無 console error。
  - 截圖：`docs/06_audits-and-reports/screenshots/dashboard-light-desktop-b5-02.png`。

### TASK B5-03 — 深色模式回歸測試
- 依賴：全部
- 檔案：`src/app/globals.css`（`.dark`）
- 目標：確認所有新中性 token 在 `.dark` 有對應、不破版。
- 步驟：為新增中性 token 補 `.dark` 值（ink/paper 反轉、hairline 半透明）；逐頁切深色檢查。
- 驗收：深色模式無低對比、無殘留亮藍滿版；`pnpm lint:changed` 通過（diff-scoped，不可新增 lint 問題）。
- 狀態：✅ 完成（2026-06-17）。
- 變更檔案：`src/app/globals.css`、`src/app/layout.tsx`、`src/app/page.tsx`、`src/app/(public)/layout.tsx`、`src/components/ui/badge.tsx`、`src/components/demo/dashboard-welcome-card.tsx`。
- QA 結果：
  - In-app Browser dark desktop：`/`、`/pricing`、`/dashboard` 均無水平溢出、無 console error；最低文字對比 ≥ 4.5:1。
  - Chrome mobile dark 390×844：`/`、`/pricing`、`/dashboard` 均無水平溢出；最低文字對比 `/` 6.82:1、`/pricing` 4.53:1、`/dashboard` 5.4:1。
  - 修正：landing mock chat bubble 深色字色、pricing gold badge dark contrast、DashboardWelcomeCard dark surface、driver.js tour close/progress contrast。
  - 修正：`(public)/layout.tsx` 移除 nested `<html>/<body>`，消除 `/pricing` hydration mismatch。
  - 截圖：`docs/06_audits-and-reports/screenshots/dashboard-dark-desktop-b5-03.png`。

---

## 附錄：任務卡通用規則（agent 必讀）

- **單卡單分支**：每張卡開 `redesign/B?-??-簡述` 分支，獨立可審。
- **每卡必跑**：`pnpm lint`（必過）；動到 schema 才 `pnpm prisma:validate`（本初始化不應動 schema）。
- **不可碰**：合規欄位（`complianceChecklist`/`sensitivityLevel`/`kycStatus`）、SPIN 狀態機、Theater persona enum、`AiUsageLog` 寫入、`src/generated/`。見 CLAUDE.md。
- **Next.js 版本**：寫任何 code 前讀 `node_modules/next/dist/docs/` 對應指南（見 AGENTS.md 頂部）。
- **完成定義（DoD）**：驗收項全綠 + 進度看板打 ✅ + 本卡 §狀態更新 + 簡述變更檔案。
