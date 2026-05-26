# Quickstart Mobile Acceptance Framework

Date: 2026-05-26

## Purpose

本文件把目前 Quickstart demo 的「介面簡化、手機優先、一路下一步完成體驗」整理成開發驗收框架。後續 UI 測試時，不只看頁面有沒有做出來，而是檢查使用者是否能在手機上從 dashboard 進入，連續按「下一步」理解一條完整的保險拜訪閉環。

核心目標：

- 使用者進入 `/dashboard` 或重新整理後，先看到歡迎卡。
- 使用者不需要理解側欄、頁籤、資料模型或功能名稱，只要一直按下一步。
- 每一站只講一件事：這一步要看什麼、會產出什麼、下一步去哪裡。
- 手機版優先。桌面版可以承載更多資訊，但不可反過來拖累手機體驗。

## Research Basis

| Source | 研究重點 | 對本案的落地規則 |
| --- | --- | --- |
| Apple Human Interface Guidelines - Onboarding: https://developer.apple.com/design/human-interface-guidelines/onboarding | Onboarding 應短、可互動、避免一次教太多；必要資訊應靠近當前任務；非必要設定延後。 | Quickstart 不做說明書式導覽。每頁只保留當前任務文字、demo 預設資料與可操作 CTA。 |
| Material Design - Onboarding: https://m2.material.io/design/communication/onboarding.html | Onboarding 可用 quickstart 模式讓使用者直接進入核心功能。 | 首屏歡迎卡直接帶使用者進入王大明情境，不要求先設定帳號、客戶或資料。 |
| Material Design - Steppers: https://m1.material.io/components/steppers.html | Stepper 適合有邏輯順序的流程；手機可用文字、dots 或 progress bar；避免一頁多個 stepper。 | 全站只保留一個 Quickstart progress。手機顯示「Step x/6 + progress bar」，不要同時顯示大卡、底部 CTA 與重複 step 標題。 |
| Android Developers - Responsive Navigation: https://developer.android.com/develop/ui/views/layout/build-responsive-navigation | Compact width 的 navigation 應調整到更符合手持操作的位置，並依 window size 改變版面。 | Quickstart 手機版不顯示側欄；主行動固定於底部拇指區。桌面可有上方 CTA，但手機只保留底部主 CTA。 |
| Material Design - Bottom Navigation: https://m1.material.io/components/bottom-navigation.html | Bottom navigation 主要用於 3-5 個頂層目的地；單一任務不適合用底部導覽混淆路徑。 | Quickstart 不做底部多 tab 導覽，而是使用單一 sticky next CTA。 |
| Linear Design Refresh: https://linear.app/now/behind-the-latest-design-refresh | 高密度工具 UI 要讓支援性元素退後，主任務保持焦點；邊界與分隔線要降低噪音。 | Quickstart focus mode 隱藏側欄、全域助理與一般 dashboard chrome；卡片、邊線、陰影必須克制。 |
| Stripe Apps Design: https://docs.stripe.com/stripe-apps/design | 限制自由樣式以維持一致性與 accessibility；FocusView 用於需要完成的 start-to-finish 任務。 | Quickstart 是任務模式，不是普通 dashboard 瀏覽模式。視覺上應像 FocusView：少分支、少中斷、單一主 CTA。 |
| Vercel Geist: https://vercel.com/geist/introduction | 高級工具介面依賴一致元件、高對比色彩與可重用設計系統。 | 不為每頁發明新卡片樣式；Quickstart shell、CTA、progress、callout 由 demo module 統一。 |

## Current UI Audit

檢視目標：`/reports/rep_1779504857472?demo=quickstart`

目前已改善：

- Quickstart focus mode 會收起側欄與全域助理，主內容不再和 dashboard 常駐面板競爭注意力。
- Report 頁已改為較簡化的單欄體驗，保留「內部摘要 / 客戶版」切換。
- `王大明` 與 `加保` 已作為 demo 故事主軸，不應再顯示 `c_wang`、`ADD_ON` 這類 seed id / enum。

目前仍顯冗長的部分：

- `Step 6 / 6`、`報告追蹤`、`完成 Demo` 在同一頁多處出現，手機 DOM 與視覺上會造成重複感。
- Report 頁一進來展開所有 markdown 段落，使用者還沒理解「這頁要看什麼」就被長內容淹沒。
- 手機版頂部 CTA 與底部 sticky CTA 會重複，應以底部 CTA 為唯一高優先行動。
- 「建立分享連結」在 demo 最後一步不是主行動，手機上應降級或收在次要操作中。
- Dashboard 歡迎卡、完成卡與 quickstart 流程狀態需要一致規則，否則重新整理後使用者可能不知道該從哪裡繼續。

## Experience Path

### Entry Rule

1. 使用者進入 `/dashboard`：若未完成 demo，顯示 Quickstart 歡迎卡。
2. 使用者重新整理 `/dashboard`：仍顯示歡迎卡，除非 local state 或 URL 明確是 `demo=completed`。
3. 使用者進入 `/dashboard?demo=completed`：顯示完成卡，回顧剛才產出的成果。
4. 使用者進入任何 `?demo=quickstart` 深連結：自動進入 focus mode，若 demo 資料不存在，應自動建立或導回對應起點，不可空白。

### Step Copy

| Step | Route | Screen title | Body copy | Primary CTA |
| --- | --- | --- | --- | --- |
| 0 | `/dashboard` | 歡迎體驗王大明加保拜訪 | 接下來只要一直按下一步，系統會帶你跑完訪前準備、需求澄清、演練、報告與追蹤。 | 下一步：建立拜訪規劃 |
| 1 | `/pre-visit?demo=quickstart` | 建立王大明的訪前規劃 | 已帶入示範客戶與「加保」目的。確認後，AI 會生成這次拜訪的準備包。 | 下一步：生成準備包 |
| 2 | `/pre-visit/[planId]?demo=quickstart` | AI 已整理出門前準備包 | 先看三件事：拜訪目標、SPIN 提問、可能異議。其他細節可以先收合。 | 下一步：開始 SPIN 澄清 |
| 3 | `/spin/[sessionId]?demo=quickstart` | 把需求問清楚 | 依照 S/P/I/N 四段，把王大明真正擔心的保障缺口整理成摘要。 | 下一步：劇場演練 |
| 4 | `/theater/[sessionId]?demo=quickstart` | 先演練再拜訪 | 用疑慮型客戶 persona 預演回應，讓業務員在真正拜訪前修正說法。 | 下一步：生成決策報告 |
| 5 | `/reports/[reportId]?demo=quickstart` | 把拜訪輸出成可追蹤報告 | 比較內部摘要與客戶版說法，確認下一個追蹤動作。 | 完成 Demo：回到總覽 |
| 6 | `/dashboard?demo=completed` | Demo 完成：你剛跑完一次拜訪閉環 | 這次體驗完成了準備包、需求摘要、演練紀錄、客戶報告與追蹤任務。 | 重新體驗 |

## Mobile Layout Contract

適用斷點：`360px`、`390px`、`430px`、`599px`、`768px`。

手機版資訊架構：

1. Top bar：56px 高，僅保留品牌、目前 demo 狀態、離開體驗。不可顯示 search、notification、profile、側欄按鈕。
2. Progress：一行 `Step x/6`、目前步驟名稱、細 progress bar。不可同時出現第二組 stepper。
3. Hero：只放頁面標題與一句 body copy。高度不得超過首屏 35%。
4. Content：單欄，先摘要後細節。長報告、長清單、角色設定、技巧提示預設收合。
5. Bottom action：固定於底部，含 safe-area padding，只有一個 primary CTA。次要行動放在內容區或 overflow menu。
6. Spacing：左右 padding 16px；卡片 radius 8px；border 使用低對比；陰影只能用於浮層或 sticky CTA。
7. Text：按鈕文字不換行；中文 CTA 建議 8-14 字，必要時用冒號後短語，例如「下一步：劇場演練」。

手機版禁用項：

- 不顯示桌面側欄、右側助理欄、全域搜尋框。
- 不使用雙欄表單。
- 不把六個大 step card 一次塞進首屏。
- 不在同一視窗出現兩個 primary CTA。
- 不顯示 seed id、enum、英文 mock key，例如 `c_wang`、`ADD_ON`。
- 不用滿版深藍大 header 壓縮可讀內容。

## Page-Level Acceptance Criteria

### P0 Dashboard Entry

- [ ] 直接開 `/dashboard` 會出現 Quickstart 歡迎卡。
- [ ] 重新整理 `/dashboard` 後歡迎卡仍存在，除非 demo 已完成。
- [ ] 歡迎卡第一個 CTA 為「下一步：建立拜訪規劃」。
- [ ] 歡迎卡只說明體驗收益與下一步，不列功能清單。
- [ ] 手機首屏可看到完整歡迎卡 title、body、primary CTA，不需先捲動。

### P0 Next-Only Flow

- [ ] 使用者從歡迎卡開始，連續點 primary CTA 可走完 6 個步驟。
- [ ] 每一步 primary CTA href 與 `src/domains/demo/quickstart.ts` 一致。
- [ ] 每一步只存在一個高優先 primary CTA；若桌面頂部也有 CTA，手機必須隱藏。
- [ ] 每一步的 CTA label 使用「下一步：...」或「完成 Demo：...」。
- [ ] 使用者不需要側欄、不需要搜尋、不需要手動選客戶，即可完成流程。

### P0 Mobile Visual Cleanliness

- [ ] 在 360px、390px、430px、599px、768px 寬度無水平 overflow。
- [ ] Bottom sticky CTA 不遮住最後一段內容；主內容 bottom padding 至少等於 CTA 高度加 safe area。
- [ ] 每頁首屏最多一個大面積品牌藍區塊。
- [ ] 每頁最多一組 progress indicator。
- [ ] 每頁最多一個主要卡片容器；不要出現 card inside card。
- [ ] 報告頁首屏只能看到摘要，不直接展開所有 markdown 細節。

### P0 Demo Data And Human Labels

- [ ] 客戶名稱顯示 `王大明`，不顯示 `c_wang`。
- [ ] 拜訪目的顯示 `加保`，不顯示 `ADD_ON`。
- [ ] 深連結重新整理時，若 local storage 沒有該 plan/session/report，系統自動建立 demo chain 或導回上一個可建立資料的 step。
- [ ] Demo module 是文案、客戶、目的、route、CTA 的單一來源。

### P1 Report Page Simplification

- [ ] Report hero 不再重複 `Step 6 / 6`，只由 Quickstart progress 顯示 step。
- [ ] 「建立分享連結」降為次要操作；手機版不與完成 CTA 並列。
- [ ] 首屏顯示三個摘要：客戶、報告版本、下一步。
- [ ] `內部摘要 / 客戶版` tab 在手機寬度可完整點擊，不換行、不溢位。
- [ ] markdown section 預設以 accordion 或 summary card 呈現，展開後才看長文。

### P1 Completion And Loop

- [ ] `/dashboard?demo=completed` 顯示完成卡。
- [ ] 完成卡列出 4 個產出：準備包、需求摘要、演練紀錄、決策報告。
- [ ] 完成卡提供「重新體驗」且會重置 quickstart state。
- [ ] 完成狀態不會覆蓋一般 dashboard 核心內容，只在首屏形成可收合的完成提示。

### P2 Instrumentation

- [ ] 每一步 primary CTA 發送 `quickstart_step_next` event。
- [ ] 完成時發送 `quickstart_completed` event。
- [ ] 每一步記錄 viewport width，方便發現手機流失點。
- [ ] UI 測試截圖保存 360、390、599、768 四個寬度。

## Development Plan

### Phase 1 - Demo Shell

- 建立或收斂 `QuickstartShell`：統一 top bar、progress、mobile sticky CTA、safe-area padding。
- 將 focus mode 放在 dashboard layout，`?demo=quickstart` 時收起 sidebar、global assistant、一般 top bar。
- 將 Quickstart copy、route、CTA 統一由 `demoQuickstart` module 供應。

### Phase 2 - Dashboard Gate

- 建立 `QuickstartWelcomeCard` 的顯示規則：首次進入、重新整理、未完成 demo 都顯示。
- 建立 `QuickstartCompletedCard`：完成後回 dashboard 顯示結果回顧與重新體驗。
- 加上 local storage key，例如 `asai.quickstart.status`，狀態包含 `idle | in_progress | completed`。

### Phase 3 - Page Simplification

- `/pre-visit`：手機 bottom-sheet modal，客戶與目的用中文 label，預填且可直接下一步。
- `/pre-visit/[planId]`：只保留準備包摘要、SPIN 問題、異議處理三塊，材料清單收合。
- `/spin/[sessionId]`：手機上先顯示目前階段與建議問題，歷史訊息收合或降低權重。
- `/theater/[sessionId]`：先顯示 persona 狀態、下一句建議、主要回覆 CTA，細節放下方。
- `/reports/[reportId]`：首屏摘要化，長 markdown 收合，完成 CTA 固定底部。

### Phase 4 - QA

- 跑一次完整 next-only manual test。
- 跑 360、390、430、599、768px screenshot audit。
- 檢查 console 無 hydration error、無 Next.js client/server mismatch。
- 執行 `pnpm exec eslint` 與 `pnpm build`。

## UI Test Script

1. 開啟 `http://localhost:3001/dashboard`。
2. 驗收歡迎卡：首屏可見 title、body、`下一步：建立拜訪規劃`。
3. 點下一步，應進入 `/pre-visit?demo=quickstart`，modal 已預填 `王大明`、`加保`。
4. 點下一步，應進入 `/pre-visit/[planId]?demo=quickstart`，看到準備包摘要。
5. 點下一步，應自動建立 SPIN session 並進入 `/spin/[sessionId]?demo=quickstart`。
6. 點下一步，應自動建立 theater session 並進入 `/theater/[sessionId]?demo=quickstart`。
7. 點下一步，應自動建立 report 並進入 `/reports/[reportId]?demo=quickstart`。
8. 點完成，應回到 `/dashboard?demo=completed`，看到完成卡。
9. 在任一中途頁重新整理，頁面不得空白，不得回到英文 id，不得丟失 primary CTA。
10. 在手機寬度重跑一次，過程中不能使用側欄或搜尋。

## Definition Of Done

Quickstart 可以被視為上線可驗收，必須同時符合：

- 手機使用者能在 10 分鐘內只按下一步完成整段體驗。
- 每頁首屏都能回答「我在哪一步、這一步看什麼、下一步去哪」。
- 沒有 raw id / enum / mock key 外露。
- 沒有水平 overflow、按鈕文字截斷、CTA 遮住內容。
- `dashboard -> pre-visit -> plan -> spin -> theater -> report -> dashboard completed` 可以在刷新後保持可恢復。
- 視覺上符合 `docs/誠問設計規格.md` 的清晰、信任、價值三原則，且支援性 chrome 不搶主任務注意力。
