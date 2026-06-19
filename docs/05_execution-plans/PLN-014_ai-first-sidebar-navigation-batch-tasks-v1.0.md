# 誠問 AI AI-first Sidebar Navigation Batch Tasks v1.0

> 建立日期：2026-06-18  
> 狀態：待執行  
> 研究依據：`RES-008_ai-first-sidebar-navigation-research-v1.0.md`  
> 設計底座：`ARC-003_elevenlabs-design-direction-v1.0.md`、`RES-005_interface-simplification-patterns-v1.0.md`、`RES-006_modern-minimal-web-design-principles-v1.0.md`  
> 驗收依據：`ACC-003_modern-ui-page-acceptance-framework-v1.0.md`

本計畫把 `RES-008` 的 AI-first 側邊導覽研究轉成可逐張執行的 batch tasks。範圍只包含 App shell 側邊欄資訊架構、三個 AI 模組的導覽呈現、收合/mobile 狀態與相鄰頁面命名一致性；不改 SPIN 狀態機、不改 Theater enum、不改 AI routes、不改資料模型。

---

## 0. 執行協定

每張卡的固定流程：

1. **讀文件**：`ARC-003`、`RES-005`、`RES-006`、`RES-008`、`ACC-003`、本卡。
2. **讀 Next.js 文件**：若改動 `src/app/(dashboard)/layout.tsx`、route group、client/server boundary 或 navigation behavior，先讀 `node_modules/next/dist/docs/` 相關章節。
3. **現況盤點**：確認 `src/components/layout/sidebar.tsx` 的 nav data、assistant trigger、collapse/mobile 行為與 active route 判斷。
4. **實作**：只改 sidebar / shell / 必要相鄰標題文案；不動 business logic、store、API、Prisma schema。
5. **驗收**：desktop 展開/收合、mobile drawer、keyboard focus、tooltip/aria、assistant panel trigger、`pnpm lint:changed`。
6. **打勾**：完成後本文件與 `AGENTS.md` 對應卡片改 `[x]`，並在卡片上註記變更檔案與截圖路徑。

---

## 1. 進度看板

| 卡片 | 範圍 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| AIS-001 | Sidebar AI-first IA 與分組實作 | ✅ | `RES-008` |
| AIS-002 | 收合/mobile/tooltip/a11y polish | ✅ | AIS-001 |
| AIS-003 | AI 模組命名與相鄰頁面一致性 | ✅ | AIS-001 |
| AIS-004 | Cross-state QA 與文件同步 | ✅ | AIS-001-AIS-003 |

---

## Batch AIS-001 - Sidebar AI-first IA and grouping

目標：把側邊欄從單層功能清單改為「今日 / AI 工作台 / 客戶工作 / 團隊與系統」的 AI-first 工作台導覽。

- [x] 將 `src/components/layout/sidebar.tsx` 的 nav data 改為 grouped navigation structure，保留現有 route 與 active 判斷。
- [x] 新增 `AI 工作台` section，順序為：`問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`。
- [x] 將 AI 助手 trigger 從底部 CTA 移入 `AI 工作台` section；底部只保留 collapse/layout control。
- [x] `客戶工作` section 包含：客戶管理、訪前規劃、分析報告、議題單。
- [x] `團隊與系統` section 包含：團隊管理、通訊處設定、個人設定；`體驗版` 依 IQ-028 只在未登入 / onboarding / public trial 情境顯示。
- [x] 視覺符合 ARC-003：paper/ink/hairline、1px navy active rail、無滿版藍底、無重陰影、gold 只作稀有小訊號。
- [x] 不改 SPIN 狀態機、不改 Theater enum、不改 assistant store / API 行為。
- [x] 跑 `pnpm lint:changed`；保存 desktop 展開態截圖。

範圍外：不新增 command palette；不改 `/spin`、`/theater`、assistant panel 的內容邏輯。

狀態：✅ 完成（2026-06-18）。

變更檔案：`src/components/layout/sidebar.tsx`。

QA 結果：
- `pnpm lint:changed` 通過。
- In-app Browser desktop `/dashboard`：`AI 工作台`、`問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練` 可見；sidebar 寬度 240px；無水平溢出。
- In-app Browser collapsed desktop：sidebar 約 72px；icon-only controls 有 accessible name；無水平溢出。
- In-app Browser mobile drawer：`AI 工作台` 第一屏可見；點擊 `問誠問 AI` 後 drawer 關閉且 assistant panel 開啟；無水平溢出。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-001-desktop-expanded.png`、`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-mobile-drawer.png`。

---

## Batch AIS-002 - Collapsed, mobile, tooltip, and accessibility polish

目標：確保 AI-first sidebar 在收合態與 mobile drawer 仍可理解、可操作、可及。

- [x] 收合態保留 group spacing，避免 icon 變成無層級長串。
- [x] 所有 icon-only navigation/action 都具備 tooltip 與 `aria-label`，包含 `問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`、collapse control。
- [x] Mobile drawer 第一屏可看到 `AI 工作台`；點擊 AI 助手會關閉 drawer 並開啟 assistant panel。
- [x] Keyboard tab order 合理：brand/logo → 今日 → AI 工作台 → 客戶工作 → 團隊與系統 → collapse。
- [x] Focus ring 使用既有 navy `--ring`，active state 不遮蔽 focus outline。
- [x] 檢查 reduced-motion：sidebar transition 不應在 `prefers-reduced-motion` 下造成明顯干擾。
- [x] 跑 `pnpm lint:changed`；保存 desktop 收合態與 mobile drawer 截圖。

範圍外：不實作使用者自訂 pin/favorite；不新增 sidebar resize。

狀態：✅ 完成（2026-06-18）。

變更檔案：`src/components/layout/sidebar.tsx`。

QA 結果：
- `pnpm lint:changed` 通過。
- In-app Browser desktop collapsed `/dashboard`：section label 隱藏但 group spacing 保留；icon-only controls 含 accessible name；collapse control 有 `展開側欄` aria；無水平溢出。
- In-app Browser keyboard/focus：品牌區為 `回到總覽` link，接著為 `總覽`、`問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`；nav links 有 focus outline，collapse button 保留 shadcn focus ring。
- In-app Browser mobile drawer：`AI 工作台` 第一屏可見，brand link 指向 `/dashboard`，console error 0。
- 截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-desktop-collapsed.png`、`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-mobile-drawer.png`。

---

## Batch AIS-003 - AI module naming and adjacent page consistency

目標：讓 sidebar label、tooltip、page title 與三個 AI 模組的使用情境一致。

- [x] Sidebar 使用任務導向命名：`問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`。
- [x] 展開態可加入一行 microcopy，但需確保 `w-60` 下不換行破版；若破版則只保留 label，microcopy 放 tooltip。
- [x] `/spin` 與 `/spin/[sessionId]` 的導航 active 對應 `AI 顧問陪談`，頁面可見標題或 breadcrumb 與新命名一致。
- [x] `/theater` 與 `/theater/[sessionId]` 的導航 active 對應 `AI 劇場演練`，頁面可見標題或 breadcrumb 與新命名一致。
- [x] Assistant panel trigger 與 assistant panel title 保留「誠問 AI 助手」品牌，但導覽動詞使用「問誠問 AI」。
- [x] 不移除頁面內必要的 SPIN 專業語彙；只調整導覽層與入口文案。
- [x] 跑 `pnpm lint:changed`；保存 `/spin`、`/theater` active state 截圖。

範圍外：不重寫 SPIN / theater 頁面版型；不改 AI prompt。

狀態：✅ 完成（2026-06-18）。

變更檔案：`src/components/layout/sidebar.tsx`、`src/app/(dashboard)/spin/page.tsx`、`src/app/(dashboard)/spin/[sessionId]/page.tsx`、`src/app/(dashboard)/theater/page.tsx`、`src/app/(dashboard)/theater/[sessionId]/page.tsx`、`src/lib/hooks/use-mounted.ts`。

QA 結果：
- `pnpm lint:changed` 通過。
- In-app Browser `/spin`：H1 = `AI 顧問陪談`，sidebar 含 `AI 顧問陪談`，console error 0，無水平溢出。
- In-app Browser `/spin/[sessionId]`：breadcrumb 含 `AI 顧問陪談`，sidebar 含 `AI 顧問陪談`，console error 0，無水平溢出。
- In-app Browser `/theater`：H1 = `AI 劇場演練`，sidebar 含 `AI 劇場演練`，console error 0，無水平溢出。
- In-app Browser screenshot command 在 `/spin` 與 `/theater` active state retry 時 timeout；已保留 DOM/console 驗收結果，並用 headless Chrome 補存截圖。

注意：經 operator 批准，已局部修補 `src/app/(dashboard)/spin/[sessionId]/page.tsx` 的既有 React 19 lint 紅線（effect setState、`Date.now()` purity、stream buffer mutation），未改 SPIN phase 狀態機。

---

## Batch AIS-004 - Cross-state QA and documentation sync

目標：完成 sidebar redesign 的跨狀態驗收，並同步 AGENTS / PLN 勾選狀態。

- [x] 用 Browser 檢查 `/dashboard`、`/spin`、`/theater`、`/crm` 的 desktop 展開/收合狀態，確認 active state 與無水平溢出。
- [x] 用 Browser 檢查 mobile drawer，確認 AI 工作台第一屏可見、點擊 assistant trigger 正常。
- [x] 檢查 console error、keyboard focus、tooltip、`aria-label`、reduced-motion、dark mode 基本可讀性。
- [x] 截圖存到 `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/`。
- [x] 更新 `AGENTS.md` 與本 `PLN-014` 完成狀態，並在完成卡片註記變更檔案。
- [x] 跑 `pnpm lint:changed`。

範圍外：不處理非 sidebar 的跨頁互動 polish；該項仍屬 `MM-013`。

狀態：✅ 完成（2026-06-18）。

QA 結果：
- `pnpm lint:changed` 通過。
- In-app Browser desktop `/dashboard`、`/spin`、`/theater`、`/crm`：展開/收合狀態皆無水平溢出，console error 0，AI 工作台導覽可見。
- Route active：`/spin` active = `AI 顧問陪談`，H1 = `AI 顧問陪談`；`/theater` active = `AI 劇場演練`，H1 = `AI 劇場演練`；`/crm` active = `客戶管理`。
- `/spin/[sessionId]`：breadcrumb = `AI 顧問陪談`，sidebar active label 可見，console error 0。
- Assistant panel 若已開啟，`問誠問 AI` 會同時呈現 active-like state；此為預期的 global panel 狀態。
- Mobile drawer / assistant trigger 已於 AIS-002 驗收：`AI 工作台` 第一屏可見，點擊 `問誠問 AI` 後 drawer 關閉且 assistant panel 開啟。
- Screenshots：`ais-004-spin-final.png`、`ais-004-theater-final.png`、`ais-004-spin-force-dark.png`、`ais-004-theater-force-dark.png`。In-app Browser screenshot timeout 以 headless Chrome 補存。

---

## Batch AIS-005 - Issue-question decision sync

目標：同步 operator 對 AI-first sidebar 的 issue-question 決策，避免後續 agent 回復舊 IA。

- [x] 記錄三個 AI 模組命名、sidebar 分組、AI 助手雙入口、`體驗版` 未登入顯示、headless Chrome 截圖備援等決策到 `RES-016`。
- [x] 從已登入 sidebar 移除 `體驗版`，保留 `/pilot` route 與未登入 / onboarding 入口。
- [x] 保留 `問誠問 AI` 在 `AI 工作台` 第一入口；底部/浮動 CTA 可作為輔助入口，不取代主導覽。
- [x] 新增 Next 16 / React 19 runtime 技術債 issue，後續以獨立 batch 盤點。
- [x] 跑 `pnpm lint:changed`。

狀態：✅ 完成（2026-06-19）。

變更檔案：`src/components/layout/sidebar.tsx`、`docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`、`docs/05_execution-plans/PLN-014_ai-first-sidebar-navigation-batch-tasks-v1.0.md`、`AGENTS.md`。

注意：目前 repo 已出現 `/interview` 與 `/spin` 並存。下一輪 AI-first 結構調整需先研究 `/interview` 與 legacy SPIN 的導覽關係，再決定是否保留 `SPIN 舊版` 在主 sidebar。

---

## Current Blockers

- 無 operator/DB 阻擋；本 workstream 不動 schema。
- 若要改 route/layout 行為，需先讀 Next.js bundled docs。
- 若實作時發現現有 assistant panel 無 tooltip primitive 或 mobile 行為缺口，優先做局部 UI 修補，不改 assistant domain/store。
- In-app Browser 對 `/spin`、`/theater` active state 截圖仍會 `Page.captureScreenshot` timeout；已用 headless Chrome 補存截圖，若後續要做互動錄影再重開 Browser session。
- `/interview` 與 `/spin` 並存的 IA 關係需另開 AI-first 結構研究與 batch，不在 AIS-005 直接合併。
