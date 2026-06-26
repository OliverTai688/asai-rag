# 誠問 AI Visit Notes Quick-Capture Interface Gap Research v1.0

> 建立日期：2026-06-20  
> 狀態：研究定稿，建議轉為 `PLN`/`ARC`/`ACC` 可執行文件（見 §9）  
> 問題：拜訪筆記目前是「進到某一份拜訪準備包 → 打開一個大 textarea → 手動存檔」。要參考 Google Keep 這類**適合隨時記錄**的介面標的，大幅檢視介面優化缺口，讓顧問能在任何時刻零摩擦地記下一句話，之後再整理、歸戶、餵給 AI。  
> 範圍：本研究只做**拜訪筆記的捕捉介面（capture interface）優化缺口與目標介面設計方向**。不改 SPIN 狀態機、不改 Theater enum/scoring、不預設保存 raw audio；與 AI 會議模組（`RES-023`/`ARC-010`）互補但不取代。  
> 關聯：`docs/07_research-and-design/RES-023_ai-meeting-module-research-v1.0.md`、`docs/02_architecture-and-rules/ARC-010_ai-meeting-module-architecture-v1.0.md`、`docs/02_architecture-and-rules/ARC-003_elevenlabs-design-direction-v1.0.md`、`docs/07_research-and-design/RES-005_interface-simplification-patterns-v1.0.md`、`docs/07_research-and-design/RES-006_modern-minimal-web-design-principles-v1.0.md`、`docs/08_acceptance-and-qa/ACC-003_modern-ui-page-acceptance-framework-v1.0.md`。

---

## 1. 結論

目前的拜訪筆記是一個**「目的地型」表單**（destination form）：使用者得先導航到「拜訪規劃 → 某份準備包 → 拜訪筆記」三層，才看到一個 460px 高的 textarea，寫完還要按「儲存筆記」。這對「事後完整補記」堪用，但對顧問真正的高頻需求——**剛拜訪完在車上、講完電話當下、想到一件事就立刻記一句**——摩擦太高，等於沒有隨手記的入口。

Google Keep 這類標的的核心不是功能多，而是把**捕捉摩擦壓到趨近於零**，並把「整理」延後：always-visible 的「Take a note…」輸入框、單鍵語音轉文字、即存即同步（沒有存檔按鈕）、卡片牆一眼掃完、之後再用標籤/顏色/置頂歸類。來源：[Google Keep Note-Taking Guide 2026 — Geeky Gadgets](https://www.geeky-gadgets.com/google-keep-beginners-tutorial/)、[The pursuit of frictionless capture — Boris Smus](https://smus.com/notes/2025/the-pursuit-of-frictionless-capture/)、[Google Keep Complete Guide — arekore](https://arekore.app/en/productivity/google-keep-complete-guide)。

建議方向：在誠問 AI 引入一條**「隨手筆記」捕捉層（quick-capture layer）**，與既有「拜訪後完整筆記」「AI 會議工作台」三者分工：

- **隨手筆記**＝全站可達的 FAB / inline composer，語音優先、自動儲存、可先不歸戶；之後一鍵歸到客戶/拜訪，或升級成會議記錄。
- **拜訪後完整筆記**＝保留現有結構化長文編輯。
- **AI 會議工作台**（`RES-023`）＝即時轉寫 + 摘要 + 對答的重流程。

三者共用同一筆記資料源，並餵進 Park memory（`ARC-010`），讓 AI「越記越懂客戶」。視覺仍遵守 ElevenLabs 克制語言（`ARC-003`）：Keep 的彩色卡片要降規為**少量、語意化的色票**，不得回到滿版彩底。

---

## 2. 參考標的：適合「隨時記錄」的介面怎麼建構

### 2.1 Google Keep — 零摩擦捕捉 + 延後整理

來源：[Geeky Gadgets](https://www.geeky-gadgets.com/google-keep-beginners-tutorial/)、[arekore Complete Guide](https://arekore.app/en/productivity/google-keep-complete-guide)、[Redesigning Google Keep — Medium](https://medium.com/@gondaneprateek/redesigning-google-keep-84120ff68a13)。

可借用的建構手法：

1. **永遠在最上方的捕捉框**：「Take a note…」一直在畫面頂端，點一下就展開，不必先「新增」再進頁。捕捉是預設動作，不是要去找的功能。
2. **多模輸入**：文字、清單、圖片、**語音（單鍵錄音自動轉文字）**。語音對「手不方便打字」的車上/走路場景最關鍵。
3. **即存即同步**：沒有「儲存」按鈕，輸入即保存、跨裝置同步。使用者不用承擔「會不會沒存到」的心智負擔。
4. **卡片牆（masonry）**：既有筆記以便利貼卡片呈現，**背景色一眼可辨**；重要的可**置頂（pin）**。
5. **延後整理**：先記，之後再貼**標籤**（一則可多標籤，像可疊加的資料夾）、上色、設**時間/地點提醒**、封存。
6. **搜尋優先於分類**：大量筆記靠搜尋找回，而不是逼使用者當下分類。

### 2.2 其他標的的共通原則

- **Apple Notes**：被評為 Apple 生態內「最零摩擦」的選擇，iCloud 自動同步、語音/掃描即時可用。來源：[19 Best Note Taking Apps 2026 — Digital PM](https://thedigitalprojectmanager.com/tools/best-note-taking-apps/)。
- **Raycast Notes**：主打「一個 hotkey 之外」即可從任何地方記下想法，強調 fast / light / frictionless。來源：[Raycast Notes](https://www.raycast.com/core-features/notes)。
- **Frictionless capture 原則**：捕捉的價值在於「不切換情境、不用找對的 App 就能立刻記下」；任何多餘的一步都會讓人放棄記錄。來源：[The pursuit of frictionless capture — Boris Smus](https://smus.com/notes/2025/the-pursuit-of-frictionless-capture/)。

### 2.3 萃取出的設計準則（給誠問 AI 用）

| 準則 | 標的行為 | 誠問 AI 轉譯 |
| --- | --- | --- |
| 捕捉是預設、不是目的地 | 頂部常駐輸入框 / 全域 hotkey | 全站 FAB 或 top-bar quick-note，任何頁面都能起一則筆記 |
| 語音優先 | 單鍵錄音自動轉文字 | 只做麥克風語音轉文字（對齊 `RES-023` 決策），不存原始音檔 |
| 即存即同步 | 無存檔鍵、自動保存 | 自動儲存草稿（debounce），移除「必須按儲存」 |
| 先記、後歸類 | 標籤/顏色/置頂事後加 | 可先不歸戶，之後一鍵歸客戶/拜訪、貼標籤、升級成會議 |
| 一眼可掃 | 彩色卡片牆 + 置頂 | 低噪音卡片列（色票降規）、置頂、最近優先 |
| 找得回來 | 搜尋 + 標籤 | 跨客戶筆記搜尋、依客戶/拜訪/標籤過濾 |

---

## 3. 現況盤點：拜訪筆記目前的介面

### 3.1 拜訪後筆記（`/pre-visit/[planId]/notes`）

- 進入路徑：`/pre-visit` → 開某份準備包 → 點「拜訪筆記」。**三層導航**才到得了。
- 版面：`max-w-7xl` 雙欄；左側一個 `min-h-[460px]` 的單一 textarea，右側顯示原目標/已用材料/記錄提示。
- 儲存：**手動「儲存筆記」按鈕**，寫入 `VisitPlan.postVisitNotes`（純文字）。
- 摘要/下一步：用字串比對 textarea 內容（第一行當摘要、含「下一步/跟進/追蹤」的行當下一步）。
- 綁定：一定要先有一份 `VisitPlan` 才有地方記；**無法記一則尚未歸戶的隨手筆記**。

### 3.2 AI 會議工作台（本輪新增，`/pre-visit/[planId]/meeting`）

- 即時轉寫 + 結構化摘要（含 citation）+ 與客戶對答。屬「重流程」：適合一場正式面談，不適合「記一句話」。

### 3.3 一句話定位現況

現況有「完整補記（textarea）」與「重會議（meeting）」兩端，**中間缺了 Google Keep 那種『隨時記一句』的輕捕捉層**，而這正是顧問最高頻、最容易流失的記錄場景。

---

## 4. 介面優化缺口（大幅檢視）

| # | 缺口 | 現況 | 標的做法 | 影響 |
| --- | --- | --- | --- | --- |
| C1 | 無全站快速捕捉入口 | 只能從拜訪詳情頁進 textarea | 頂部常駐輸入框 / 全域 FAB / hotkey | 高頻「想到就記」幾乎無法達成，記錄流失 |
| C2 | 捕捉前置成本高 | 需先有 VisitPlan、三層導航 | 點一下就能寫，先記後歸 | 車上/通話後當下放棄記錄 |
| C3 | 無語音輸入 | 只能打字 | 單鍵語音轉文字 | 手不方便時無法記；最關鍵缺口 |
| C4 | 手動存檔、無自動儲存 | 要按「儲存筆記」 | 即存即同步、無存檔鍵 | 心智負擔 + 漏存風險 |
| C5 | 無筆記列表/卡片牆 | 一份 plan 一段文字 | masonry 卡片、置頂、最近優先 | 看不到「我最近記了什麼」，無法回顧 |
| C6 | 無延後歸類能力 | 一寫就綁死某份 plan | 先不歸戶，之後貼標籤/歸客戶 | 不允許「先記再說」，違反 capture-first |
| C7 | 無標籤/顏色/置頂 | 無任何輕量分類 | 多標籤、色票、pin | 大量筆記無法快速分流與聚焦 |
| C8 | 無跨客戶搜尋/過濾 | 散在各 plan | 全域搜尋 + 標籤過濾 | 找不回舊筆記 |
| C9 | 無結構化捕捉 | 純文字，靠字串比對抓摘要 | 清單/勾選/提醒 | 待辦、提醒、事實散在自由文字中 |
| C10 | 與 AI 記憶斷開 | textarea 不進 memory 流 | — | 隨手筆記沒餵給「懂客戶」的 AI（`ARC-010`）|
| C11 | 行動裝置體驗未最佳化 | 桌機表單為主 | 行動優先、拇指可達、輸入不被遮 | 顧問多在外勤，手機才是主場景 |
| C12 | 無捕捉後的下一步 | 存了就結束 | 升級成提醒/任務/會議/CRM | 筆記變成死資料，不流動 |

---

## 5. 建議目標介面（方向，細節待 ARC）

### 5.1 三層筆記分工

```text
隨手筆記（quick capture）   ← 本研究重點：零摩擦、語音優先、可不歸戶、自動存
   ↓ 一鍵歸戶 / 升級
拜訪後完整筆記（structured） ← 保留現有長文編輯
   ↓ 正式面談
AI 會議工作台（meeting）     ← RES-023：即時轉寫 + 摘要 + 對答
```

三者共用同一筆記資料源，並投影進 Park memory（`ARC-010`），讓 AI 越記越懂客戶。

### 5.2 隨手筆記捕捉介面要素

1. **全站捕捉入口**：top-bar 的「＋ 隨手記」或全域 FAB；任何頁面、任何時刻可起一則筆記。可選 hotkey。
2. **語音優先**：開啟即可單鍵語音轉文字（mic-only，對齊 `RES-023`）；不支援時退回文字，不阻斷。
3. **自動儲存**：輸入即 debounce 存草稿，移除「必須按儲存」；明確顯示「已儲存」微狀態。
4. **先記後歸**：可先不選客戶；事後在卡片上一鍵歸到客戶/拜訪、貼標籤、設提醒、或「升級成會議」。
5. **卡片牆**：最近筆記以低噪音卡片列呈現，可置頂、可過濾（客戶/拜訪/標籤/未歸戶）。
6. **結構小工具**：可切清單/勾選；偵測「下一步/提醒」可一鍵轉任務（接 AMM-006 寫回邊界）。
7. **行動優先**：拇指可達、輸入區不被鍵盤遮、單手可完成「起筆 → 語音 → 存」。

### 5.3 視覺與品牌邊界

- 遵循 `ARC-003`：paper/ink/hairline、1px 邊框優先於陰影、留白；Keep 的彩色卡片**降規為少量語意色票**（如：未歸戶/提醒/重要），不得回到滿版彩底，金色維持稀有（<3%）。
- 遵循 `ACC-003` modern minimal 與行動驗收。

### 5.4 與資料/隱私邊界

- 隨手筆記預設 member-private；歸戶後沿用 CRM 可見性與合規欄位，不刪改 `complianceChecklist`/`sensitivityLevel`/`kycStatus`。
- 語音只存逐字稿，不存原始音檔。
- 寫回 CRM/任務需人工確認 + audit（沿用 `ARC-010` 寫回邊界）。

---

## 6. 建議優化批次順序（草案，KEY 待定）

- 捕捉層 contract 與 pure types（quick note 資料模型，可先不歸戶）。
- 全站捕捉入口（top-bar/FAB + inline composer），自動儲存、語音轉文字（mic-only）。
- 筆記卡片牆（最近/置頂/過濾/搜尋）。
- 先記後歸：一鍵歸客戶/拜訪、標籤、升級成會議；下一步轉任務。
- 與 Park memory 串接（隨手筆記投影成 InterviewMemory）。
- 行動優先 polish + `ACC-003` desktop/mobile 驗收。

> UI-first 仍適用：捕捉層可先以本地/demo state 刻介面，後端 BFF/schema 隨後補（對齊 `RES-023` 的 UI-first 決策）。

---

## 7. Definition of Done（介面層）

- 任何頁面可在 ≤1 次點擊起一則筆記，語音或文字皆可，**無需先選客戶、無需按儲存**。
- 自動儲存有可見狀態；重整/重登後筆記仍在。
- 卡片牆可一眼掃最近筆記，可置頂、可依客戶/標籤/未歸戶過濾、可搜尋。
- 可一鍵把未歸戶筆記歸到客戶/拜訪、貼標籤、升級成會議、轉任務。
- 行動裝置：拇指可達、輸入不被遮、`ACC-003` desktop/mobile 驗收通過、console error 0、無水平 overflow。
- 視覺符合 `ARC-003`（無滿版彩底、髮絲線優先、金色稀有）。

---

## 8. Open Questions

1. 隨手筆記是否需要**完全獨立於 VisitPlan** 的資料表（未歸戶筆記），或掛在既有 interview/note 結構下？（影響 schema；建議獨立 `QuickNote`，可選關聯 client/visit）
2. 全站捕捉入口放 **top-bar、FAB，還是兩者**？是否要 hotkey？
3. 自動儲存的 server 寫入頻率與離線策略（先 local 後同步 vs 即時 BFF）？
4. 色票語意：用哪幾個語意色（未歸戶/提醒/重要…）才不違反 `ARC-003` 的克制？
5. 隨手筆記是否一律進 Park memory，還是使用者可標「私人草稿不進 AI」？
6. 是否需要圖片/拍照捕捉（保單照片、白板）？若要，需 size/type allowlist 與隱私處理。
7. 提醒（時間/地點）是否第一版就做，或延後？

---

## 9. 下一步建議

本研究聚焦「介面優化缺口」。若要落地，建議接續產出：

- `ARC-0XX_quick-capture-notes-architecture-v1.0.md`：`QuickNote` 資料模型、全站捕捉入口、自動儲存、歸戶/升級流程、與 Park memory/AI 會議的關係、視覺/隱私邊界。
- `PLN-0XX_quick-capture-notes-batch-tasks-v1.0.md`：把 §6 拆成可勾選 batch cards（UI-first）。
- `ACC-0XX_quick-capture-notes-acceptance-framework-v1.0.md`：捕捉摩擦、自動儲存、卡片牆、歸戶、行動優先、隱私/寫回驗收。
