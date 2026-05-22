# Mobile Quickstart Experience Plan

Date: 2026-05-22

## Goal

目前 `/pre-visit` 的手機體驗像是把桌面表單縮小，造成兩個問題：表單欄位過寬、層級太吵，且 demo 使用者不知道下一步該去哪裡。這一版把體驗改成「Quickstart story」：同一位示範客戶一路穿過客戶洞察、訪前規劃、SPIN、演練、報告與追蹤。

## Research Notes

- Linear 的近期 redesign 原則是降低不該競爭注意力的元素，讓結構「被感覺到而不是被看見」。落地到本案：減少過重陰影、過大圓角與藍色滿版壓迫感，讓主要任務與下一步 CTA 更清楚。Source: https://linear.app/now/behind-the-latest-design-refresh
- Vercel dashboard 強調列表 / grid 切換、可保存偏好、專案資訊卡片與操作選單，代表高級工具型介面應該是可掃描、可比較、低噪音。Source: https://vercel.com/docs/dashboard-features/overview
- Material Design onboarding 建議 Quickstart 讓使用者直接進入核心功能，優先給第一個關鍵動作；stepper 則用於顯示邏輯步驟與進度，手機可用文字、dots 或 progress bar。Source: https://m1.material.io/growth-communications/onboarding.html and https://m1.material.io/components/steppers.html
- Stripe merchant onboarding 把複雜任務拆成準備、申請、審查、設定、測試、上線等清楚階段。落地到保險拜訪 demo：每一步都要有輸入、輸出與下一步，而不是把所有功能同時丟給使用者。Source: https://stripe.com/en-sg/resources/more/merchant-onboarding-explained
- Plaid Quickstart 用 sandbox credentials 與可操作的 sample app 讓使用者快速完成第一個 item。落地到本案：固定 demo 客戶與預填目的，讓第一次體驗不用理解資料模型也能走完流程。Source: https://plaid.com/docs/quickstart/

## Mobile Layout Rules

1. `pre-visit` 建立規劃在手機使用單欄表單，不使用雙欄。欄位順序固定為客戶、目的、時間、開始規劃。
2. Modal 在手機以接近 bottom sheet 的尺寸運作：小邊距、可捲動、CTA 靠近拇指區，避免桌面大面積藍色 header 壓縮可用空間。
3. 選單 trigger 必須顯示 human label，不顯示 enum 或 seed id。例：`c_wang` 顯示 `王大明`，`ADD_ON` 顯示 `加保`。
4. Quickstart 在手機以橫向可滑進度列呈現，不在小螢幕塞六張大卡。每一步有 step number、頁面、輸出與 CTA。
5. 視覺語言改為低噪音工具介面：8-12px radius、柔和 border、克制陰影、單一主 CTA，避免每個區塊都用高飽和背景搶注意力。

## Quickstart Story

Demo persona: `王大明`，45 歲，科技業主管，已有壽險與醫療險，這次拜訪目的為「加保」。

1. `/pilot`：說明這是一條 10 分鐘的示範路徑，從王大明的保障缺口開始。
2. `/pre-visit?demo=quickstart`：預填王大明與加保目的，建立一筆拜訪規劃。
3. `/pre-visit/[planId]?demo=quickstart`：查看 AI 生成的目標、SPIN 問題、異議處理與應備材料。
4. `/spin?clientId=c_wang&autoCreate=true&demo=quickstart`：進入 SPIN 需求澄清，完成摘要。
5. `/theater?demo=quickstart`：用疑慮型客戶 persona 演練加保說明。
6. `/reports?demo=quickstart`：生成雙版本報告並回到 `/dashboard?demo=quickstart` 看追蹤。

## Current Implementation Scope

- 新增 demo quickstart domain module，集中定義示範客戶、拜訪目的、跨頁步驟與 CTA。
- 新增 `QuickstartGuide` component，放在 `/pilot` 與 `/pre-visit`，形成可見的跨頁故事導覽。
- 修正 `/pre-visit` 建立規劃 modal：中文顯示選中值、手機單欄、較乾淨的 spacing / border / radius。
- 保留現有 mock store 與 route，不引入新的狀態風險。

## Next Development Plan

1. 將 quickstart step state 寫入 URL query 或 local store，讓每頁知道目前 demo 進度。
2. 在 `/pre-visit/[planId]`、`/spin`、`/theater`、`/reports` 加入同一個 compact guide。
3. 建立 Supabase seed 對應：demo organization、demo client、demo visit plan、demo report chain。
4. 加上 mobile screenshot regression，檢查 390px、599px、768px 三個寬度的欄位不溢位、不顯示 raw id。
