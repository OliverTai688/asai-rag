# 誠問 AI Modern UI Page Acceptance Framework v1.0

> 建立日期：2026-06-17  
> 適用範圍：`PLN-012_page-by-page-modern-ui-batch-tasks-v1.0.md` 的逐頁 UI redesign 任務。  
> 關聯研究：`RES-005_interface-simplification-patterns-v1.0.md`、`RES-006_modern-minimal-web-design-principles-v1.0.md`。

---

## 1. 驗收目標

每張頁面卡完成時，頁面必須同時滿足：

1. **簡潔漂亮**：低噪音、穩定層級、符合 `ARC-003` token 與 ElevenLabs 級克制方向。
2. **操作有效**：使用者可以快速完成該頁主工作，不因過度收合或裝飾而迷失。
3. **狀態完整**：桌機、手機、空狀態、loading/error、focus、reduced-motion 都可接受。

---

## 2. Page Brief 驗收

每張頁面卡實作前，agent 必須先產出一段 page design brief，至少包含：

- **Page job**：這頁的唯一主工作。
- **Primary CTA**：第一屏唯一主 CTA 是什麼。
- **Information hierarchy**：Primary / Secondary / Tertiary 三層資訊。
- **Interaction strategy**：哪些進 sheet、popover、collapsible、tabs、full page。
- **What to remove**：要移除或降級的視覺噪音。
- **References checked**：本卡查看的 2-3 個外部或內部參考。

Page brief 可寫在 PR / final summary / 對應卡註記中；若未產出，卡不得標完成。

---

## 3. Visual Acceptance Checklist

- [ ] 第一屏只有 1 個主 CTA。
- [ ] 主 CTA 使用 text 或 icon + text，不使用 icon-only。
- [ ] 次要動作已降級為 toolbar、overflow、popover、sheet 或 collapsible。
- [ ] 無新引入大面積藍底、紫藍漸層、金色大面積底、重陰影。
- [ ] 卡片使用 hairline border；預設無 drop shadow。
- [ ] 文字層級符合工具頁尺度，不把 dashboard / CRM 做成 hero page。
- [ ] 數字使用 tabular-nums。
- [ ] icon 風格一致，優先 lucide，線寬與尺寸一致。
- [ ] 文案短而可操作，避免可有可無的功能介紹句。
- [ ] mobile 不發生文字溢出、按鈕擠壓、卡片互相重疊。

---

## 4. Interaction Acceptance Checklist

- [ ] icon-only button 具備 `aria-label` 與 tooltip。
- [ ] 可點區域至少 40px 高；mobile 優先 44px。
- [ ] Dialog 只承載短任務；超過 3 個輸入群組使用 sheet/page。
- [ ] Sheet / popover / dialog 不互相疊加。
- [ ] Collapsible trigger 文案含摘要，例如「保單 3 張・1 張即將到期」。
- [ ] 鍵盤可操作主流程，focus ring 可見。
- [ ] `prefers-reduced-motion` 下不依賴動畫理解狀態。

---

## 5. Functional Acceptance Checklist

- [ ] 不改動資料來源/store/API/schema，除非卡片明確允許。
- [ ] 不改 SPIN 狀態機。
- [ ] 不改 Theater enum 與 server-side scoring 既有型別，除非另有 AI 模組卡。
- [ ] 不刪除 client/policy 合規欄位。
- [ ] 原本 route、query string demo/quickstart flow 不破。
- [ ] 原本主要 CTA 可以完成同一工作。
- [ ] Empty/loading/error 狀態至少保留原功能，不退化成空白。

---

## 6. Verification

每張卡完成前：

- [ ] 跑 `pnpm lint:changed`。
- [ ] 若只改 UI，不跑 Prisma；動到 schema 才跑 `pnpm prisma:validate`。
- [ ] 使用瀏覽器檢查 desktop 與 mobile viewport。
- [ ] 若有重要視覺變更，依卡片要求保存截圖到 `docs/06_audits-and-reports/screenshots/modern-ui/`。

