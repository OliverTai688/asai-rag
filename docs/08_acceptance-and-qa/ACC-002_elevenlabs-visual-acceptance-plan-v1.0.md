# 誠問 AI — ElevenLabs 風格視覺驗證計劃 v1.0

> 流水號 020 ｜分類 08_acceptance-and-qa ｜狀態：待執行（由瀏覽器 agent / codex browser 跑）
> 對象批次：B0–B3（已實作完成）。B4–B5 完成後再追加對應檢查。
> 設計依據：[018 設計方向](018-誠問AI-ElevenLabs-Design-Direction-v1.0.md)、[019 批次任務](019-誠問AI-ElevenLabs-Batch-Tasks-v1.0.md)

本文件給**瀏覽器自動化 agent** 逐步執行，目的：用真人視角確認 B0–B3 的換膚在實際畫面上正確（編譯/lint 已通過，缺的只剩「眼睛」）。每步有明確 URL、操作、**通過/失敗判準**，最後填寫結果表。

---

## 0. 前置（必做，否則看到舊畫面）

1. **重啟 dev server**：目前在 :3000 跑的是「改動前」啟動的 instance，會 serve 到 stale CSS。請先停掉再重啟：
   ```bash
   # 找到並停掉舊的（PID 可能是 675 等），或直接：
   pkill -f "next dev" ; pnpm dev
   ```
   等待 `✓ Ready` 後再開始。
2. **Staging gate**：未登入時根路徑會 **307 redirect 到 `/staging-access?callbackUrl=...`**。先在瀏覽器完成該頁的 staging 驗證（取得 cookie），之後才能進 `/`、`/dashboard`、`/pricing`。若 agent 無法通過 gate，記為 **BLOCKER**（需人工提供 staging 密語/cookie）。
3. **視窗**：桌機檢查用 1440×900；手機檢查用 390×844（iPhone 12）。
4. **截圖命名**：`{route}-{light|dark}-{desktop|mobile}.png`，存到 `docs/06_audits-and-reports/screenshots/`（若不存在請建立）。

---

## 1. 受測路由

| # | URL | 對應批次 | 重點 |
| --- | --- | --- | --- |
| R1 | `/`（landing） | B2-01/02/03 | hero 編輯版、bento、反白 CTA 段 |
| R2 | `/pricing` | B2-04 | 髮絲線方案卡、PRO 反白黑卡、tabular 價格 |
| R3 | `/dashboard` | B3-01/02/03 + B0/B1 | app shell 中性化、sidebar、top-bar、卡片 |
| R4 | `/crm` | B3 + B1 | 列表/卡片在新 token 下不破版 |
| R5 | `/dashboard?demo=quickstart` | B3-01 | quickstart 模式 top-bar 中性化 |

---

## 2. 逐路由檢查清單（通過/失敗判準）

### R1 — Landing `/`
桌機（light）：
- [ ] 頁面底色為**中性暖白**（≈ `#FAFAF9`），**不是**藍味底（`#F7FAFF`）。失敗條件：背景明顯偏藍。
- [ ] Hero 主標**極大、字距偏緊**（display ≥ 72px 級感）；「真誠」二字為深藍。
- [ ] 主 CTA「立即開始體驗」為**單色墨黑 pill**（黑底白字、圓角全圓）；次 CTA 為**髮絲線 pill**。失敗：仍是金色按鈕。
- [ ] 功能區為 **bento**（卡片**不等寬**：一寬一窄 + 一條通欄），卡片是**髮絲線邊框、無厚陰影**。
- [ ] 底部有**純黑反白區段**：黑底、白標題、白底黑字按鈕、上方一條金色細線。失敗：此段仍白底。
- [ ] 金色面積極小（僅 logo 火花 + 反白段細線）。
- [ ] hover 卡片：邊框變深 + 輕微上浮 1px，**無**大陰影彈跳。

dark（切系統深色或加 `.dark`）：
- [ ] 底色轉**近黑中性**（非深藍 `#0A1929`）；文字白；卡片為深灰 surface。反白段在深色頁應呈現相對亮塊。

mobile（390 寬）：
- [ ] hero/CTA/bento 不溢出、不重疊；CTA 直向堆疊。

### R2 — Pricing `/pricing`
- [ ] 頁底/頂 header 中性（非藍）；header 管理後台鈕為髮絲線 pill。
- [ ] 四張方案卡：一般卡**髮絲線、白底、無金漸層**。
- [ ] **PRO 卡為反白黑卡**（深色頁時反成白卡，總之與頁面相反）＋**白色 CTA 按鈕**；「最受歡迎」金徽章極小。失敗：PRO 仍是金色漸層底。
- [ ] 價格數字對齊整齊（tabular，等寬數字）。
- [ ] hover 卡片邊框變深、無厚陰影。

### R3 — Dashboard `/dashboard`
- [ ] 整體 app 底色中性暖白；**無藍味滿版**。
- [ ] **Sidebar**：白/中性底、髮絲右邊界；目前頁的 active 項是**淺灰底 + 深墨文字 + 1px 深藍左細線 + 深藍 icon**（非整塊藍底）。
- [ ] **Top-bar**：髮絲底邊、半透明 backdrop；搜尋框中性灰底、focus 時 ring 為**深藍**（非亮藍）。
- [ ] 使用者頭像下拉：選單為髮絲線邊、輕陰影、focus 項中性底。
- [ ] 內容卡片：髮絲線、平面、hover 上浮 1px。
- [ ] 收合 sidebar（點「縮小側欄」）→ 變 72px、icon 置中、不破版。
- [ ] dark：切深色，sidebar/top-bar/卡片皆中性近黑、文字對比足夠、**無殘留亮藍滿版**。

### R4 — CRM `/crm`
- [ ] 列表/卡片/badge 在新 token 下正常；**注意 badge**：預設 badge 現為**實心墨黑**，掃視是否有「過多黑色徽章」造成視覺沉重（記錄位置，供 B4 調整）。
- [ ] 無明顯未套色（透明/無底）元素 → 若有，記為「token 拼錯」候選。

### R5 — Quickstart `/dashboard?demo=quickstart`
- [ ] 頂部 quickstart bar 中性化（髮絲底邊、navy logo 方塊、髮絲線「離開體驗」pill）。
- [ ] 進入此模式不報錯、不閃爍（先前 set-state effect 已修）。

---

## 3. 全域回歸檢查（跨所有路由）

- [ ] **無樣式缺失**：沒有元素呈現「透明背景 / 看不見的文字 / 預設未套色」——這代表某個 `bg-*`/`text-*` token 名稱拼錯。發現即截圖 + 記 URL + DOM 選擇器。
- [ ] **對比度（抽查）**：正文 muted 文字（`text-ink-3` ≈ `#737373`）在 paper 底上需可讀（目標 WCAG AA 4.5:1）。可用瀏覽器 a11y 工具量 hero 副標、卡片描述。
- [ ] **reduced-motion**：開系統「減少動態」後重載 `/`，hero/卡片進場動畫應**不位移**（僅淡入或無動畫）。
- [ ] **Console**：DevTools console 無新的 error（紅字）；warning 可忽略既有項。
- [ ] **CJK 大標**：hero/區段大標為中文，會 fallback 到 Noto Sans TC（Geist 只吃 Latin）——**這是預期**，記錄觀感即可，非失敗。

---

## 4. 結果回填表（agent 填寫後存回本檔末或 06-reports）

| 檢查項 | 路由 | 結果(✅/❌) | 截圖 | 備註 |
| --- | --- | --- | --- | --- |
| 中性底色 | R1 | | | |
| hero display 字級 | R1 | | | |
| mono CTA | R1 | | | |
| bento 版面 | R1 | | | |
| 反白 CTA 段 | R1 | | | |
| dark 中性化 | R1 | | | |
| PRO 反白黑卡 | R2 | | | |
| tabular 價格 | R2 | | | |
| sidebar active 中性 | R3 | | | |
| top-bar 髮絲/ring 深藍 | R3 | | | |
| sidebar 收合 | R3 | | | |
| dashboard dark | R3 | | | |
| badge 過黑掃描 | R4 | | | |
| 無樣式缺失(全域) | all | | | |
| reduced-motion | R1 | | | |
| console 乾淨 | all | | | |

---

## 5. 失敗時的回報格式

每個 ❌ 請提供：
1. 路由 + 視窗尺寸 + light/dark
2. 截圖檔名
3. 問題描述（預期 vs 實際）
4. 若是「無樣式」：對應 DOM 元素的 class 字串（方便定位是哪個 token 拼錯）

agent 跑完把本表填好，連同 screenshots 路徑回報即可。後續修正會以新的 batch 卡（B6-fix-*）處理。
