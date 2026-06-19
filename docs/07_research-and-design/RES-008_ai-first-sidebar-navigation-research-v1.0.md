# 誠問 AI AI-first 側邊導覽研究 v1.0

> 研究日期：2026-06-18  
> 範圍：針對 dashboard shell 側邊欄重新排列資訊架構，凸顯三個核心 AI 模組：SPIN 對話、劇場演練、誠問 AI 助手。  
> 關聯文件：`ARC-003_elevenlabs-design-direction-v1.0.md`、`RES-005_interface-simplification-patterns-v1.0.md`、`RES-006_modern-minimal-web-design-principles-v1.0.md`、`RES-007_product-surface-and-admin-architecture-v1.0.md`、`PLN-012_page-by-page-modern-ui-batch-tasks-v1.0.md`。  
> 目前觀察來源：使用者截圖、`src/components/layout/sidebar.tsx`、既有 Modern Minimal redesign 文件。

---

## 1. 研究結論

目前側邊欄把所有目的地平鋪成同一層：總覽、體驗版、客戶管理、SPIN、劇場、訪前規劃、報告、團隊、議題、設定。這種排列清楚但不夠有產品觀點，會讓誠問 AI 最獨特的三個 AI 能力看起來只是普通功能項。

建議改成 **AI-first workbench navigation**：

1. **最上層先呈現 AI 工作流，而不是資料表清單**：SPIN、劇場、AI 助手必須形成一個視覺群組，讓使用者一進產品就知道「這是一個 AI 陪練與顧問工作台」。
2. **AI 助手不是底部廣告式 CTA，而是全域 command layer**：它負責回答網站任何問題、跨頁引導與操作建議，應以常駐 command entry 呈現，而不是和縮小側欄控制放在同一個底部區域。
3. **導覽應按使用情境分組**：先放「今天要做的 AI 工作」，再放「工作需要的資料」，最後放「管理與設定」。這比按開發模組或資料 domain 排列更符合保險業務員的日常。
4. **SPIN 與劇場要被命名成任務，而非方法名**：展開態可顯示「AI 顧問陪談」與「AI 劇場演練」，副標或 badge 才補 SPIN / Role-play；降低新手理解成本，同時保留專業語彙。
5. **收合態必須靠群組、tooltip、active rail 維持辨識**：icon-only 狀態不能只剩一串灰色 icon；三個 AI 模組需要更強的 active / hover / tooltip 與可及名稱。

一句話方向：側邊欄不應只是 sitemap，而要像「AI 銷售教練的工作台目錄」。

---

## 2. 外部研究重點

### 2.1 App 的主要導覽適合放左側，但需要清楚分組

NN/g 的 menu design checklist 指出，應把 menu 放在使用者預期的位置；對應 application，primary navigation 通常在左側。Material Design navigation drawer 也將 drawer item 定義為帶 label、可行動的 destination；Material 3 navigation rail 則建議 3-7 個主要 destination，適合中型螢幕快速切換。

對誠問 AI 的轉譯：

- 左側 sidebar 是正確基本型，但不能把 10 個項目全部同權重排列。
- AI 核心目的地應是第一群組；資料與管理目的地降為第二、第三群組。
- 收合側欄可接近 navigation rail，但主目的地數量要控制，避免 icon wall。

### 2.2 導覽是資訊架構的表現，不等於資料模型

NN/g 對 IA 與 navigation 的區分指出，IA 是內容結構，navigation 是協助使用者到達內容的 UI。Abby Covert 對 side rail navigation 的說明也指出，side rail 常用於內容類型、分類或 facet 之間的切換。

對誠問 AI 的轉譯：

- 既有 domain 順序不應直接等於 sidebar 順序。
- 使用者不是在想「我要進 theater domain」，而是在想「我要練一段難講的對話」。
- 導覽命名要反映工作，而不是反映工程資料夾。

### 2.3 現代 SaaS 導覽重視可預測、可自訂、漸進揭露

Atlassian 在新 navigation 設計文章中強調：跨產品重複可預測 pattern、讓使用者控制顯示內容、對新手漸進揭露但保留 power user 功能。這點也呼應誠問 AI 已有的 Modern Minimal 原則：主畫面不堆功能，而是把次要資訊移到次級層。

對誠問 AI 的轉譯：

- Sidebar 可先採固定分組，未來再允許 pin 常用頁。
- 「體驗版」「議題單」「系統設定」不應與 SPIN / 劇場同層競爭。
- AI 助手可成為 power user 的捷徑：問問題、找頁面、啟動流程。

### 2.4 Icon 可以掃描，但不能承擔整個業務語意

既有 `RES-005` 已建立規則：sidebar 展開態使用 icon + label；收合態 icon-only 必須有 tooltip 與 `aria-label`。Material Design 的 destination item 也要求以文字 label 描述目的地。

對誠問 AI 的轉譯：

- SPIN、劇場、AI 助手不能只靠 MessageSquare、Theater、Bot 讓人猜。
- 展開態可加微型描述，例如「釐清需求」「練習異議」「問任何問題」。
- 收合態 tooltip 要說任務，不只重複模組名。

---

## 3. 現況問題

### 3.1 視覺層級問題

目前三個 AI 模組分散：

- `SPIN 對話` 排在客戶管理之後。
- `劇場演練` 只是下一個 list item。
- `誠問 AI 助手` 固定在底部，視覺上像促銷 CTA 或外掛，而不是產品核心。

結果是：使用者先看到的是「一般 CRM 後台」，不是「AI 協作產品」。

### 3.2 使用情境未被表達

保險業務員常見問題不是「我要去哪個 route」，而是：

| 使用者情境 | 真正需要 | 對應模組 |
| --- | --- | --- |
| 我對客戶狀況還不清楚 | 被引導問出需求、問題、影響、需求回報 | SPIN 對話 |
| 我知道客戶可能會拒絕，但不知道怎麼回 | 在安全環境練習異議與說法 | 劇場演練 |
| 我不知道這頁怎麼用、也不知道下一步 | 問產品、資料、流程與操作問題 | 誠問 AI 助手 |
| 我要回顧或補資料 | 找客戶、看報告、整理訪前規劃 | CRM / Reports / Pre-visit |

目前 sidebar 沒有把這些情境翻譯成結構。

### 3.3 底部 AI 助手與 collapse control 競爭

底部同時有「誠問 AI 助手」與「縮小側欄」。前者是核心 AI 能力，後者是 layout 控制；兩者同處底部，會讓核心能力被當成輔助工具。

### 3.4 項目過多且缺少分段

10 個項目全部在單一 nav 中，會降低掃描效率。尤其「體驗版」「議題單」「系統設定」是不同層級的任務，與 AI 模組並排時會稀釋產品定位。

---

## 4. 建議資訊架構

### 4.1 推薦排列：AI workbench first

展開態 sidebar 建議分成四段：

```text
Brand

今日
  總覽

AI 工作台
  誠問 AI 助手       問任何產品、客戶、流程問題
  AI 顧問陪談        SPIN 對話；釐清需求與下一步
  AI 劇場演練        Role-play；練異議與話術

客戶工作
  客戶管理
  訪前規劃
  分析報告
  議題單

團隊與系統
  團隊管理
  體驗版
  系統設定

Collapse control
```

這個版本適合目前產品階段：既保留完整目的地，又讓 AI 三核心成為第一視覺群組。

### 4.2 更激進版本：AI mission control

若下一階段要讓 AI 更像產品主入口，可把 AI 區做成三個 compact action rows，而不是普通 nav item：

```text
AI 工作台
  [Bot]   問誠問 AI
          搜尋、解釋、導覽

  [Chat]  顧問陪談
          建立客戶輪廓與 SPIN 問題

  [Stage] 劇場演練
          模擬客戶反應與異議
```

設計注意：

- 不做卡片套卡片，不加重陰影。
- 使用 hairline group container 或 section divider 即可。
- 只讓 active item 有 navy accent rail；gold 僅用於 AI 助手 icon 的小訊號。
- 三個 row 高度保持克制，避免 sidebar 變成 landing module。

### 4.3 保守版本：只重排與加 section label

若要最低風險實作，可先只調整 `navItems` 資料結構：

```text
總覽

AI 工作台
  SPIN 對話
  劇場演練
  誠問 AI 助手

客戶工作
  客戶管理
  訪前規劃
  分析報告
  議題單

管理
  團隊管理
  體驗版
  系統設定
```

但此版本仍較弱，因為 AI 助手是 button action，不是 route，需要與 Link item 做清楚互動區分。

---

## 5. 三個 AI 模組的導覽角色

### 5.1 SPIN 對話：從方法名改成工作名

建議主 label：

- 首選：`AI 顧問陪談`
- 次選：`SPIN 對話`
- 補充 microcopy：`釐清需求與下一步`

理由：

- 新手不一定知道 SPIN，但知道「我需要有人陪我問清楚客戶」。
- 產品文件 `RES-004` 已明確主張「業務員不需要懂 SPIN」；導覽也應延續這個原則。
- 頁面內仍可保留 SPIN 階段與專業框架。

### 5.2 劇場演練：強調安全練習場

建議主 label：

- 首選：`AI 劇場演練`
- 次選：`劇場演練`
- 補充 microcopy：`練異議、角色與說法`

理由：

- 劇場是誠問 AI 的差異化模組，需要比一般 role-play 更有品牌感。
- 使用者心智是「我準備好了嗎」而不是「我要進入 theater」。
- 若未來升級為多角色劇場，此命名仍可承載。

### 5.3 誠問 AI 助手：全域問答與操作入口

建議主 label：

- 首選：`問誠問 AI`
- 次選：`誠問 AI 助手`
- 補充 microcopy：`問網站、客戶與下一步`

角色定義：

- 不是頁面 destination，而是 global command / assistant action。
- 應支援從任一頁開啟。
- 可在 sidebar AI 區出現，也可保留 keyboard shortcut / top-bar command entry。
- 底部不再用大面積 navy CTA 佔據，避免和主要 navigation 層級衝突。

---

## 6. 互動與視覺規格建議

### 6.1 展開態

- Sidebar 寬度維持現有 `w-60` 可行，但 AI row 若要放 microcopy，建議檢查中文換行。
- Section label 使用 10-11px uppercase/中文短標，`text-ink-3`，不使用彩色 badge。
- Nav item 高度：
  - 普通 item：40px 左右。
  - AI featured item：48-56px，可有一行 11px microcopy。
- Active state：
  - 保留 `bg-paper-2`。
  - 左側 1px navy rail。
  - icon 與 label 用 ink/navy，不用滿版 navy outline。
- AI 助手 action：
  - 可用 `button`，但放入 AI section。
  - 使用 `aria-label="開啟誠問 AI 助手"`。
  - microcopy 說明它是「問任何問題」，不要只說「助手」。

### 6.2 收合態

- Section label 隱藏，但 group spacing 保留，讓 icon 不變成單一長串。
- 三個 AI icon 可在 group 內相鄰，順序固定：助手、顧問陪談、劇場。
- 每個 icon-only item 必須有 tooltip：
  - `問誠問 AI：問網站、客戶與下一步`
  - `AI 顧問陪談：釐清需求與 SPIN 問題`
  - `AI 劇場演練：練異議與角色反應`
- 收合態 AI 助手不應變成難以辨識的小 bot button；可以保持與 nav item 同尺寸，但用 subtle navy icon 表示全域能力。

### 6.3 Mobile drawer

- Mobile 開啟 sidebar 時，AI 工作台要在第一屏可見。
- AI 助手 action 點擊後應關閉 drawer 並開啟 assistant panel，目前 `mobile` 分支已有類似行為，可保留。
- 避免 mobile 需要捲到底才找到助手。

### 6.4 可及性

- Sidebar `nav` 可拆為多個 `section`，但仍建議保留單一 `nav aria-label="主導覽"`。
- 每個 section label 可用 visible text；不需要只給 screen reader。
- `button` 與 `Link` 樣式可相近，但語意不可混淆。
- Focus ring 使用既有 navy `--ring`，不要因 active state 移除 outline。

---

## 7. 推薦實作路徑

### Phase 1 - 重排與分組

- 將 `navItems` 改為 grouped navigation data。
- 新增 `AI 工作台` section。
- 將 AI 助手 button 從底部移到 AI section。
- 底部只保留 collapse control；必要時放 organization/user switcher，不放核心 CTA。

### Phase 2 - AI featured rows

- 為 AI section 支援 `description`。
- 展開態顯示一行 microcopy；收合態改 tooltip。
- 使用同一 NavItem component，避免 Link item 與 button item 分叉過大。

### Phase 3 - Active/context states

- 若 pathname 在 `/spin` 或 `/spin/[sessionId]`，AI 顧問陪談 active。
- 若 pathname 在 `/theater` 或 `/theater/[sessionId]`，AI 劇場演練 active。
- AI 助手沒有 route active，可在 panel open 時呈現 active-like state。
- 未來可在 AI rows 顯示 subtle status，例如「進行中 1 場」「草稿 2 份」，但第一版先不要加，避免噪音。

### Phase 4 - 對應 page header

Sidebar 改完後，三個 AI 頁面的 page title 也應一致：

| Route | Sidebar label | Page title 建議 |
| --- | --- | --- |
| `/spin` | AI 顧問陪談 | AI 顧問陪談 |
| `/spin/[sessionId]` | AI 顧問陪談 | 顧問陪談 session / 客戶名 |
| `/theater` | AI 劇場演練 | AI 劇場演練 |
| `/theater/[sessionId]` | AI 劇場演練 | 劇場演練 session / 客戶名 |
| Assistant panel | 問誠問 AI | 誠問 AI 助手 |

---

## 8. 建議開發驗收清單

若將本研究轉成 batch card，建議驗收如下：

- [ ] Sidebar 以 section 分組：今日、AI 工作台、客戶工作、團隊與系統。
- [ ] 三個 AI 模組在 desktop 展開態第一屏可見，且形成連續群組。
- [ ] AI 助手從底部 CTA 移入 AI 工作台，底部只保留 collapse/layout 控制。
- [ ] 展開態 AI rows 有清楚 label；可加一行 microcopy，但不得造成 sidebar 擁擠或換行破版。
- [ ] 收合態所有 icon-only item 有 tooltip 與 `aria-label`。
- [ ] Active state 符合 ElevenLabs / ARC-003：hairline、paper、navy accent，不使用滿版藍底或重陰影。
- [ ] Mobile drawer 第一屏看得到 AI 工作台；點擊 AI 助手會關閉 drawer 並開啟 assistant panel。
- [ ] 不改 SPIN 狀態機、不改 Theater enum、不改 AI route 與 AiUsageLog。
- [ ] 跑 `pnpm lint:changed`，並保存 desktop/mobile sidebar 截圖。

---

## 9. 最終建議稿

本研究推薦第一版採用以下順序：

```text
誠問 AI

今日
  總覽

AI 工作台
  問誠問 AI
  AI 顧問陪談
  AI 劇場演練

客戶工作
  客戶管理
  訪前規劃
  分析報告
  議題單

團隊與系統
  團隊管理
  體驗版
  系統設定

縮小側欄
```

三個 AI 模組的使用情境對照：

```text
我不知道下一步      → 問誠問 AI
我需要釐清客戶需求  → AI 顧問陪談
我需要練習怎麼說    → AI 劇場演練
```

這樣的導覽會把產品定位從「帶 AI 功能的 CRM」轉成「以 AI 陪談、AI 演練、AI 問答為核心的保險顧問工作台」。

---

## 10. 來源

- NN/g, Menu-Design Checklist: 17 UX Guidelines: https://www.nngroup.com/articles/menu-design/
- NN/g, The Difference Between Information Architecture (IA) and Navigation: https://www.nngroup.com/articles/ia-vs-navigation/
- NN/g, How Many Items in a Navigation Menu?: https://www.nngroup.com/videos/number-items-navigation-menu/
- Material Design, Navigation drawer: https://m2.material.io/components/navigation-drawer
- Material Design 3, Navigation rail: https://m3.material.io/components/navigation-rail/overview
- Atlassian, Designing Atlassian's new navigation: https://www.atlassian.com/blog/design/designing-atlassians-new-navigation
- Atlassian Design System, Side navigation: https://atlassian.design/components/side-navigation
- Abby Covert, Information Architecture for Navigation: https://abbycovert.com/writing/information-architecture-for-navigation/
- MUI, Drawer: https://mui.com/material-ui/react-drawer/
