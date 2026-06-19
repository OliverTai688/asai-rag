<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — 誠問 AI 操作真相源

本檔是 agent 在本 repo 工作的**單一操作真相源（single operational source of truth）**。它不只是設計守則，而是一疊**可被 agent 逐張執行的 batch-task workstream**。架構慣例參照 `2026-nuvaclub` 的 `AGENTS.md`。

閱讀順序：先讀「環境與架構」「絕不可碰」→ 再讀「Batch Task 操作模型」理解怎麼跑 → 要動 UI 才細讀「設計系統北極星」→ 接著到對應的 workstream 撿卡執行。

`CLAUDE.md` 透過 `@AGENTS.md` 內嵌本檔；兩者的硬規則一致，以本檔與 `CLAUDE.md` 為準。

---

## 環境與架構（速覽）

```bash
pnpm dev               # 開發伺服器
pnpm build             # prisma generate + next build（需 DIRECT_URL）
pnpm lint              # 全 repo ESLint（有預先存在的紅線基準，見下）
pnpm lint:changed      # 只 lint 變更檔（diff-scoped 驗收閘門，必過）
pnpm prisma:generate   # schema 改動後重生 Prisma client
pnpm prisma:validate   # 只驗 schema，不生成
```

- **領域驅動結構**：商業邏輯在 `src/domains/<name>/`（`types.ts` / `service.ts` / `store.ts` / `mocks.ts`），不與路由共置。核心領域：`rag`、`assistant`、`spin`、`theater`、`visit`、`report`、`client`、`team`、`session`、`calendar`、`event`、`experience`、`subscription`、`ai-mock`、`demo`。
- **API routes** 在 `src/app/api/`，每個 AI 功能一條（`/rag`、`/ai/chat`、`/ai/spin`、`/ai/theater`、`/ai/visit`、`/ai/report`、`/ai/spin-suggestions`、`/ai/theater/score`）；mock 對應在 `/api/mock/*`。
- **UI**：shadcn（`src/components/ui/`）+ Tailwind v4 + Base UI。Route group `(dashboard)/` 與 `(public)/` 區隔登入/未登入版型。
- **State**：每領域一個 Zustand 5 store；無 Redux / Context app state。
- **DB**：Prisma 7（`prisma/schema.prisma`），多租戶（全部 record 以 `organizationId` 切分）；client 生成到 `src/generated/prisma/`，經 `src/lib/prisma.ts` 單例存取。
- **i18n**：僅繁體中文（zh-TW），字串在 `src/lib/i18n/`；產品名「誠問 AI」。
- 完整技術規格見 `docs/02_architecture-and-rules/ARC-001_tech-spec-nextjs-v1.0.md`。

---

## 絕不可碰（硬規則，跨所有 workstream）

這些是法規與核心狀態機，任何 batch 卡都不得為了便利而改寫：

1. **合規欄位**：client/policy 上的 `complianceChecklist`、`sensitivityLevel`、`kycStatus` 是法規要求——不得刪除、不得改為 optional。
2. **SPIN 狀態機**：sessions 依 `SITUATION → PROBLEM → IMPLICATION → NEED_PAYOFF` 推進；任何 `src/domains/spin/` 改動都要保留此狀態機。
3. **Theater persona / scoring 遷移保護**：legacy `CONSERVATIVE`、`SKEPTICAL`、`BUSY`、`EMOTIONAL` enum 與 server-side scoring/turn contract 在一般 workstream 仍不得任意改型別。例外：operator 於 2026-06-18 核可 ITA Route B（一次切換）；只有 `訪談 × 劇場 雙 Agent` 的 ITA-003/ITA-006 可依 `AUD-004`/`ARC-004` 規格遷移為 Big Five＋多角色＋五視角質化回饋，且必須包含 migration、rollback/compatibility note、QA 與 `AiUsageLog`。
4. **AiUsageLog**：每一次 OpenAI/Anthropic 呼叫都要寫 `AiUsageLog` 做成本追蹤——比照既有 API route 的寫法，不得略過。
5. **`src/generated/`**：由 `prisma:generate` 產出且 gitignored——永遠不要手改。

> 上述同步於 `CLAUDE.md` 的 Key Constraints。違反任一項視為該卡未完成。

---

## 整晚總目標 — 上線阻擋最小化

整晚循環的最高優先順序是**上線阻擋最小化**：讓專案在連續開發輪次中大幅接近可上線狀態，直到剩下最少、最明確的人工處理事項。每輪不是只做零碎小任務，而是選擇一條最低未完成、最接近上線阻擋、且可由系統安全推進的 workstream，完成一個可驗收的戰役閉環。

每輪可以連續處理同一條上線路徑中的多個高度相關任務，例如：schema → repository → service → BFF → UI → i18n → acceptance script → browser/API proof → report → issue-question。只要變更彼此高度相關、能形成完整交付切片，就可以在同一輪完成；不用被「單一小任務」限制。

允許 agent 執行本地與開發環境的高權限操作，包括 Prisma generate、Prisma db push、seed/backfill、lint、i18n check、build、acceptance script、browser/API proof、文件與報告更新。若目前 DB target 可確認為 local、development 或明確授權的 staging，可以主動執行 db push 與相關驗收；若無法確認 DB target，或判斷為 production，則不得執行破壞性 DB 操作。

Operator 於 2026-06-19 明確批准目前 `.env` 指向的 Supabase target 可執行 **LCH demo/test 非破壞性寫入 proof**，包含新增 demo/test client、family member、policy、AI output 與後續 refresh/relogin 驗收。此授權只涵蓋可辨識、可回報、可清理或可保留為 demo evidence 的新增/更新；仍不包含 drop/reset、清表、刪除遠端資料、production 金流/通知/email、停用 Supabase public-read、刪除 legacy bucket object，或儲存 raw secret/token/private payload。

遇到 blocker 時，不要立刻停止整輪。先判斷是否可以繞到同一 workstream 的其他安全可推進任務，例如補 acceptance proof、修 UI fallback、補 API guard、補 readiness panel、補 report、補 issue-question、補 dry-run script、補文件，或把 raw-ID workflow 改成 UI selector。只有當該 workstream 已無安全可推進項目時，才切換到下一個最低未阻擋 workstream。

不得犧牲安全性、repo 規則、資料完整性與 operator 權限邊界。production write、真實 email、真實 notification、真實 payment/refund、刪除遠端資料、停用 Supabase public-read、刪除 legacy bucket object、儲存 raw cookie/secret/token/private payload，仍需明確人工 approval，不得自行執行或繞過。

每輪結束必須留下可交接成果：code、docs、proof、report、issue-question。Report 要清楚說明本輪戰役目標、實際完成內容、DB/Prisma 操作、驗收結果、剩餘 blocker、下一輪最建議入口。Issue-question 要記錄真正需要人決策、授權、session、seed data、production approval 或外部服務權限的事項。不要把未驗收寫成已通過，也不要用 mock 成功冒充正式驗收。

### 每輪固定工程收尾（必做）

每一輪循環都必須把工程基線收乾淨，避免下一輪接手時先被歷史狀態絆住：

1. **啟動與收尾都跑 `git status`**：啟動時辨識既有變更、使用者變更、上一輪 agent 變更；收尾時確認本輪實際改動範圍。不得 revert 或覆蓋非本輪變更。
2. **每輪都跑 TypeScript 檢查並修 tsc error**：至少執行 `pnpm exec tsc --noEmit --pretty false`。若出現 tsc error，必須優先修到通過；若錯誤來自本輪不可安全處理的既有受保護區域，需在 report 記錄檔案、錯誤摘要、為何不能改、下一輪入口，且不得把 tsc 寫成通過。
3. **每輪仍須跑對應驗收**：`tsc` 不取代 `pnpm lint:changed`、Prisma validate/generate/db push、acceptance script、API/browser proof。依本輪變更選擇必要驗收，結果寫入 report。
4. **每輪都要 git commit 與 git push**：驗收與文件更新完成後，stage 本輪相關檔案，建立清楚 commit message，並 push 到當前工作分支。只提交本輪相關變更；若 worktree 中有使用者或其他 agent 的未相關變更，不得一併 stage。
5. **commit/push 若失敗不可假裝完成**：若因 git 衝突、remote 權限、分支狀態、網路、pre-commit、或混入不可分離的既有變更導致無法 commit/push，必須在 report 與 final 回覆記錄失敗原因、已完成的驗收、尚未提交的檔案與下一步。
6. **final 回覆要包含 git 結果**：每輪回覆需明確列出 `git status` 摘要、commit hash（若成功）、push 目標分支（若成功），或阻擋原因（若未成功）。

---

## 設計系統北極星 — ElevenLabs 級的克制

UI 正朝 **ElevenLabs.io 級**視覺語言遷移：單色紙墨畫布、一個安靜的 accent、編輯級超大字、髮絲線（1px）取代陰影、大量留白、反白（黑底）聚焦區段、bento 網格。品質來自**移除**而非堆疊。

**品牌不可剝離**：這是受監管的保險。Navy（`#1A3A6B`）留作*墨/accent 錨點*；金色降為*稀有*的 premium 訊號（任一畫面 < 3%）。用克制而非顏色量體表達「資深顧問」的份量。

做 UI 時，依**權威順序**遵循：

1. `docs/02_architecture-and-rules/ARC-003_elevenlabs-design-direction-v1.0.md` — 設計 DNA、gap 分析，以及 **token / 字體 / 間距 / 元件規格的真相源**。
2. `docs/05_execution-plans/PLN-006_elevenlabs-batch-tasks-v1.0.md` — 可執行任務卡 backlog（與下方「ElevenLabs UI Redesign」workstream 互為鏡像）。
3. `src/app/globals.css` 既有語意 token — 優先用 `bg-paper / text-ink / border-hairline` 與語意變數，少用硬編碼 hex。

硬規則：髮絲線（1px）邊框優先於 drop shadow；單色（`mono`）主 CTA 優先於彩色；標題用 display 尺度 + 負字距；數字用 tabular-nums；每個行銷頁至少 1 個反白區段；尊重 `prefers-reduced-motion`；維持 WCAG AA 對比。不要重新引入藍味滿版底（如 `#F7FAFF`、`#EBF3FB` 當頁底）。

---

## Batch Task 操作模型（agent 必讀）

本檔的工作以 **workstream** 為單位組織。每個 workstream 是一段聚焦的工作流，固定四段結構：

```text
## <Workstream 名稱> Batch Tasks
Context：範圍 + 引用的 docs（PRD/ARC/PLN/ACC…）。一句話講清「這條只做什麼、不做什麼」。
### Current <Domain> Gaps：現況事實（已存在什麼、缺什麼），給撿卡的 agent 對齊用。
### Batch <KEY>-<NNN> — <標題>：一張可執行的卡，內容是 [x]/[ ] 的驗收清單。
### Current <Domain> Blockers：阻擋項（需 operator 的 DB push、缺 session/seed、需人工核可等）。
```

**卡（Batch）= 一份驗收清單**。每個 `- [ ]` 是一個**可獨立驗收**的成果，不是模糊目標。完成即就地把 `[ ]` 改成 `[x]`——卡內勾選狀態就是該 workstream 的單一真相，不另開追蹤表。

### 執行協定

1. **撿最低的未阻擋卡**：尊重批次依賴（B0 → B1 → …、或 KEY 內的序號）。同一 workstream 內由上而下、由低號往高號。
2. **一般單卡單分支；整晚循環可做完整切片**：平時以 `redesign/<KEY>-<NNN>-<slug>`（UI）或 `feat/<KEY>-<NNN>-<slug>` 保持獨立可審；若本輪目標是「上線阻擋最小化」，可以在同一 workstream 內連續完成多張高度相關卡，形成 schema/repository/service/BFF/UI/proof/report 的完整交付切片。
3. **只做同一交付切片的範圍**：尊重每張卡的「範圍外」線，不要順手 batch-replace 超出範圍；整晚循環若跨卡，也必須保持同一路徑、同一上線阻擋、同一驗收閉環。
4. **完成前驗收**：每輪必跑 `pnpm exec tsc --noEmit --pretty false` 並修 tsc error；再跑 `pnpm lint:changed`（diff-scoped 閘門，**必過**）。本 repo 帶有**預先存在的紅線 `pnpm lint` 基準**（React 19 嚴格 `react-hooks/set-state-in-effect` + `no-explicit-any`，集中在受保護的 SPIN/theater/AI code，UI redesign 不得為了過 lint 改寫它們），所以閘門是「**在你動過的檔案中不新增 lint 問題**」，不是全 repo 全綠。只有動到 schema 才跑 `pnpm prisma:validate`。
5. **完成定義（DoD）**：驗收項全綠 → 卡內 `[ ]` 打成 `[x]` →（若有進度看板）同步打 ✅ → 在卡上註記變更檔案。
6. **絕不可碰**：見上方「絕不可碰」五項。

### 狀態圖示

`[ ]`／☐ 未開始 ｜ `[~]`／◐ 進行中 ｜ `[x]`／✅ 完成 ｜ ⛔ 阻擋（移到 Blockers 並註明原因）。

### 新增 workstream 的流程

1. 先寫對應的 `PLN-` 計畫文件放 `docs/05_execution-plans/`（驗收框架另寫 `ACC-` 放 `docs/08_acceptance-and-qa/`），並登錄到 `docs/00_manual-and-index/MAN-001_document-index.md`。
2. 在本檔用下方「Workstream 範本」新增一段，Context 引用該 `PLN-`/`ACC-` 文件。
3. 把粗任務拆成可獨立驗收的 `Batch <KEY>-<NNN>` 卡。

### Workstream 範本（複製即用）

```markdown
## <Feature> Batch Tasks

Context: <一句話範圍>。實作參考：`docs/05_execution-plans/PLN-0XX_<slug>.md`、驗收：`docs/08_acceptance-and-qa/ACC-0XX_<slug>.md`。本條只做 <X>，不做 <Y>。

### Current <Feature> Gaps
- <現況事實 1：已存在什麼>
- <現況事實 2：缺什麼>

### Batch <KEY>-001 — <子目標>
- [ ] <可獨立驗收的成果 1>
- [ ] <可獨立驗收的成果 2>
- [ ] 跑 `pnpm lint:changed`；動到 schema 才 `pnpm prisma:validate`。

### Current <Feature> Blockers
- <需 operator 的 DB push / 缺 seed / 缺 session / 需人工核可…>
```

---

## ElevenLabs UI Redesign Batch Tasks

Context: 將全站 UI 遷移到 ElevenLabs 級單色克制視覺。設計 DNA 與 token 真相源在 `docs/02_architecture-and-rules/ARC-003_elevenlabs-design-direction-v1.0.md`；逐張任務卡的完整版（含每卡檔案/步驟/範圍外）在 `docs/05_execution-plans/PLN-006_elevenlabs-batch-tasks-v1.0.md`；視覺驗收在 `docs/08_acceptance-and-qa/ACC-002_elevenlabs-visual-acceptance-plan-v1.0.md`。本條只做**換膚與版型克制化**，不動商業資料、不動 SPIN/theater/AI 邏輯。下方為 workstream 鏡像（單一真相仍以本檔勾選狀態為準，與 PLN-006 進度看板同步）。

### Current UI Gaps
- Token 層（B0）、核心 primitives（B1）、行銷頁（B2）、App shell（B3）已完成換膚。
- Dashboard 內容卡片/圖表（B4）已完成中性化。
- 全站動態收斂、a11y/對比/reduced-motion QA、深色模式回歸（B5）已完成；下一階段進入逐頁 Modern Minimal redesign。
- 仍有未進入逐頁 redesign 的功能頁殘留硬編碼藍味底（如 `#F7FAFF`），由 Modern Minimal 對應卡處理。

### Batch B0 — 基礎 Token
- [x] B0-01 中性／墨紙色層（`globals.css` 新增 paper/ink/hairline/inverted token）。
- [x] B0-02 語意 token 重映射（達成零元件改動換膚）。
- [x] B0-03 排版尺度 + Latin grotesque 字體（display 尺度、負字距、tabular-nums）。
- [x] B0-04 動態／反白 utility（`.section-inverted`、reduced-motion 降級）。

### Batch B1 — 核心元件 Primitives
- [x] B1-01 Button `mono` / `monoOutline` variant 作主 CTA；`gold` 收斂為特例。
- [x] B1-02 Card 髮絲線平面化（移除預設 drop shadow）。
- [x] B1-03 Badge 中性化（藍金 variant 標為特例）。
- [x] B1-04 Input / focus ring 一致化（全站 navy `--ring`）。

### Batch B2 — 行銷頁面
- [x] B2-01 Landing hero 編輯版重 build（超大 display、中性紙底、單色 CTA）。
- [x] B2-02 Landing 功能區 bento 化。
- [x] B2-03 Landing 反白 CTA 區段。
- [x] B2-04 Pricing 頁 ElevenLabs 化（highlight 方案用黑反白卡而非金漸層）。

### Batch B3 — App Shell
- [x] B3-01 Dashboard layout 中性化（QuickstartMode 不破）。
- [x] B3-02 Sidebar 髮絲線重整（active 態中性 + 1px navy accent）。
- [x] B3-03 Top-bar 精簡（髮絲線底邊、notification-hub 不破）。

### Batch B4 — Dashboard 內容
- [x] B4-01 Dashboard 卡片／widget 套 B1-02 卡片、中性配色、tabular 數字（資料來源/store 不改）。
- [x] B4-02 圖表配色中性化（`--chart-1..5` 改 navy 明度階 + 1 個 accent）。

### Batch B5 — 動態與品質
- [x] B5-01 動態與 hover 收斂（統一為 ARC-003 §3.6 參數）。
- [x] B5-02 對比度／a11y／reduced-motion QA（正文 ≥ WCAG AA 4.5:1，focus 可見）。
- [x] B5-03 深色模式回歸測試（新中性 token 在 `.dark` 補齊、逐頁切深色檢查）。

### Current UI Blockers
- 無 operator/DB 阻擋（本 workstream 不動 schema）。
- B5 已完成瀏覽器檢查；證據截圖已存到 `docs/06_audits-and-reports/screenshots/`。

---

## Modern Minimal Page Redesign Batch Tasks

Context: 將 dashboard 與核心功能頁逐頁改成現代、簡約、美觀且可操作的 SaaS 工作介面。研究依據：`docs/07_research-and-design/RES-005_interface-simplification-patterns-v1.0.md`、`docs/07_research-and-design/RES-006_modern-minimal-web-design-principles-v1.0.md`；逐頁任務卡：`docs/05_execution-plans/PLN-012_page-by-page-modern-ui-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-003_modern-ui-page-acceptance-framework-v1.0.md`。本條只做**頁面級研究、設計與 UI 實作**，不改商業資料、不改 AI route、不改 SPIN/theater 核心邏輯。

### Current Modern UI Gaps
- 現有 ElevenLabs token / primitives / shell 已打底，但許多 dashboard 與功能頁仍有重色塊、重陰影、大圓角、展示型卡片與過多同屏動作。
- `RES-005` 已建立 icon / sheet / popover / collapsible 的簡化規則；`RES-006` 補上 modern minimal 美感與 SaaS 操作密度原則。
- 每張卡必須先做 page design brief，再實作；不能只憑直覺改樣式。

### Batch MM-001 — Dashboard decision center
- [x] 產出 `/dashboard` page design brief（主工作、主 CTA、資訊三層、互動策略、移除項）。
- [x] 研究 2-3 個 dashboard / decision center / SaaS command center pattern。
- [x] 第一屏只突出「今日主線」與一個最重要下一步；KPI 與 widgets compact 化。
- [x] 保留 QuickstartMode / demo flow 不破。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-002 — CRM list
- [x] 產出 `/crm` page design brief。
- [x] 研究 2-3 個 modern CRM list / record table pattern。
- [x] 主 CTA 僅保留「新增客戶」；篩選、排序、匯入放 toolbar / popover。
- [x] 客戶列表改為低噪音 dense card/table hybrid，row actions 補 tooltip / aria-label。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-003 — CRM detail shell and overview
- [x] 產出 `/crm/[clientId]` page design brief。
- [x] 研究 2-3 個 CRM record detail / customer 360 pattern。
- [x] 簡化 identity rail、overview 卡片與 tabs；第一屏只保留一個下一步主 CTA。
- [x] 不改 compliance 欄位、不改家庭圖資料結構。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-004 — CRM subpages
- [x] 產出 CRM subpages page design brief。
- [x] 研究 2-3 個 record subview / related list pattern。
- [x] `/policies`、`/relationships`、`/timeline`、`/reports`、`/gap-analysis` 統一低噪音 related-list / recommendation 版型。
- [x] 不重寫 graph layout、不改 family tree plan。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-005 — Pre-visit list and create flow
- [x] 產出 `/pre-visit` page design brief。
- [x] 研究 2-3 個 planning / scheduling / AI generation setup pattern。
- [x] 新增規劃流程依 ACC-003 判斷 dialog vs right sheet；列表 compact 化。
- [x] 保留 Quickstart demo flow 不破。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-006 — Pre-visit detail and notes
- [x] 產出 `/pre-visit/[planId]` 與 notes page design brief。
- [x] 研究 2-3 個 AI-generated plan / checklist / meeting prep pattern。
- [x] 詳情頁改為「準備包」資訊架構，低頻區塊收合且 trigger 含 summary。
- [x] 不改 `/api/ai/visit`、不改 VisitPlan store。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-007 — Theater list and setup
- [x] 產出 `/theater` page design brief。
- [x] 研究 2-3 個 practice setup / simulation / AI roleplay pattern。
- [x] 第一屏改為「選資料來源 → 選演練目標 → 開始」compact flow；人格庫降級到進階設定。
- [x] 不改 Theater enum、不改 theater store。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-008 — Theater session
- [x] 產出 `/theater/[sessionId]` page design brief。
- [x] 研究 2-3 個 chat workspace / coaching feedback / simulation UI pattern。
- [x] 對話區為主體，persona/status/score 降為側欄或 collapsible；輸入區 mobile 不遮擋。
- [x] 不改 `/api/ai/theater`、不改 scoring JSON。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-009 — Reports list and detail
- [x] 產出 `/reports` 與 `/reports/[reportId]` page design brief。
- [x] 研究 2-3 個 document management / report editor / share workflow pattern。
- [x] reports list 改 compact report library；detail 頁清楚分離編輯、分享、預覽模式。
- [x] 不改 report service/store、不改分享 token 邏輯。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-010 — Public share page
- [x] 產出 `/share/[token]` page design brief。
- [x] 研究 2-3 個 client-facing report / proposal / secure share page pattern。
- [x] 客戶報告頁 mobile-first，可信、簡潔、可行動；合規免責可見但不喧賓奪主。
- [x] 不改 tracking API。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-011 — Team page
- [x] 產出 `/team` page design brief。
- [x] 研究 2-3 個 manager dashboard / coaching list / team analytics pattern。
- [x] 第一屏回答「誰需要輔導、下一步是什麼」；KPI、排行榜、熱點降噪。
- [x] 不改 team aggregation mock、不新增權限。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-012 — Pilot, settings, admin surfaces
- [x] 產出 `/pilot`、`/settings`、`/(admin)/admin` page design brief。
- [x] 研究 2-3 個 onboarding hub / settings / admin console pattern。
- [x] pilot 改為可執行體驗入口；settings/admin 採 compact operational layout。
- [x] 不改 admin/subscription API。
- [x] 跑 `pnpm lint:changed`；依 ACC-003 做 desktop/mobile 視覺驗收。

### Batch MM-013 — Cross-page interaction polish
- [x] 盤點所有 icon-only buttons，補 tooltip / aria-label。
- [x] 統一 page header、toolbar、empty state、compact card/list、dialog/sheet/popover 使用。
- [x] 檢查 mobile overflow、focus ring、reduced-motion。
- [x] 更新 `AGENTS.md` 與 `PLN-012` 完成狀態。
- [x] 跑 `pnpm lint:changed`；保存最終 desktop/mobile 截圖。

變更檔案：`src/components/assistant/global-assistant.tsx`、`src/components/ai-assistant/fab.tsx`、`src/components/dashboard/tasks-panel.tsx`、`src/components/layout/notification-hub.tsx`、`src/components/layout/top-bar.tsx`、`src/app/(dashboard)/issues/page.tsx`、`docs/05_execution-plans/PLN-012_page-by-page-modern-ui-batch-tasks-v1.0.md`、`AGENTS.md`。

驗收註記：2026-06-18 修補通知中心、使用者選單、AI FAB、assistant panel、任務列與 issues 頁的 icon-only / keyboard / focus 可用性；`/issues` 日期格式改為 deterministic formatter，避免 hydration mismatch。Browser QA 覆蓋 `/dashboard`、`/issues` desktop 1440×1000 / mobile 390×844：new console error 0、unlabeled icon-like controls 0、無水平 overflow。截圖：`docs/06_audits-and-reports/screenshots/modern-ui/mm-013-dashboard-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/mm-013-dashboard-mobile.png`、`docs/06_audits-and-reports/screenshots/modern-ui/mm-013-issues-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/mm-013-issues-mobile.png`。

### Current Modern UI Blockers
- 無 operator/DB 阻擋（本 workstream 不動 schema）。
- 每卡需瀏覽器檢查；重要頁面截圖存到 `docs/06_audits-and-reports/screenshots/modern-ui/`。
- 若 ElevenLabs B4/B5 尚未完成，MM-001 可先做，但需避免與 B4 widget 中性化重複改動造成衝突。

---

## AI-first Sidebar Navigation Batch Tasks

Context: 將 dashboard shell 側邊欄從單層功能清單改為凸顯三個核心 AI 模組的 AI-first 工作台導覽。研究依據：`docs/07_research-and-design/RES-008_ai-first-sidebar-navigation-research-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-014_ai-first-sidebar-navigation-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-003_modern-ui-page-acceptance-framework-v1.0.md`。本條只做**App shell 側邊欄資訊架構、三個 AI 入口呈現、收合/mobile/a11y polish 與相鄰命名一致性**，不改商業資料、不改 SPIN/theater/AI route、不改 assistant store 行為。

### Current Sidebar Gaps
- 目前 `src/components/layout/sidebar.tsx` 將總覽、體驗版、客戶管理、SPIN、劇場、訪前規劃、報告、團隊、議題、設定平鋪成同一層。
- 三個產品核心 AI 模組沒有形成連續群組：`SPIN 對話` 與 `劇場演練` 像普通功能項，`誠問 AI 助手` 固定在底部像外掛 CTA。
- `RES-008` 已建議改成「今日 / AI 工作台 / 客戶工作 / 團隊與系統」分組，AI 工作台順序為 `問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`。

### Batch AIS-001 — Sidebar AI-first IA and grouping
- [x] 將 `src/components/layout/sidebar.tsx` nav data 改為 grouped navigation structure，保留現有 route 與 active 判斷。
- [x] 新增 `AI 工作台` section，順序為：`問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`。
- [x] 將 AI 助手 trigger 從底部 CTA 移入 `AI 工作台` section；底部只保留 collapse/layout control。
- [x] `客戶工作` section 包含：客戶管理、訪前規劃、分析報告、議題單。
- [x] `團隊與系統` section 包含：團隊管理、通訊處設定、個人設定；`體驗版` 依 IQ-028 只在未登入 / onboarding / public trial 情境顯示。
- [x] 視覺符合 ARC-003：paper/ink/hairline、1px navy active rail、無滿版藍底、無重陰影、gold 只作稀有小訊號。
- [x] 不改 SPIN 狀態機、不改 Theater enum、不改 assistant store / API 行為。
- [x] 跑 `pnpm lint:changed`；保存 desktop 展開態截圖。

變更檔案：`src/components/layout/sidebar.tsx`。截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-001-desktop-expanded.png`、`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-mobile-drawer.png`。

### Batch AIS-002 — Collapsed, mobile, tooltip, and accessibility polish
- [x] 收合態保留 group spacing，避免 icon 變成無層級長串。
- [x] 所有 icon-only navigation/action 都具備 tooltip 與 `aria-label`，包含 `問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`、collapse control。
- [x] Mobile drawer 第一屏可看到 `AI 工作台`；點擊 AI 助手會關閉 drawer 並開啟 assistant panel。
- [x] Keyboard tab order 合理：brand/logo → 今日 → AI 工作台 → 客戶工作 → 團隊與系統 → collapse。
- [x] Focus ring 使用既有 navy `--ring`，active state 不遮蔽 focus outline。
- [x] 檢查 reduced-motion：sidebar transition 不應在 `prefers-reduced-motion` 下造成明顯干擾。
- [x] 跑 `pnpm lint:changed`；保存 desktop 收合態與 mobile drawer 截圖。

變更檔案：`src/components/layout/sidebar.tsx`。截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-desktop-collapsed.png`、`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-mobile-drawer.png`。

### Batch AIS-003 — AI module naming and adjacent page consistency
- [x] Sidebar 使用任務導向命名：`問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`。
- [x] 展開態可加入一行 microcopy，但需確保 `w-60` 下不換行破版；若破版則只保留 label，microcopy 放 tooltip。
- [x] `/spin` 與 `/spin/[sessionId]` 的導航 active 對應 `AI 顧問陪談`，頁面可見標題或 breadcrumb 與新命名一致。
- [x] `/theater` 與 `/theater/[sessionId]` 的導航 active 對應 `AI 劇場演練`，頁面可見標題或 breadcrumb 與新命名一致。
- [x] Assistant panel trigger 與 assistant panel title 保留「誠問 AI 助手」品牌，但導覽動詞使用「問誠問 AI」。
- [x] 不移除頁面內必要的 SPIN 專業語彙；只調整導覽層與入口文案。
- [x] 跑 `pnpm lint:changed`；保存 `/spin`、`/theater` active state 截圖。

完成註記：`/spin`、`/spin/[sessionId]`、`/theater`、`/theater/[sessionId]` 已對齊 AI 模組命名；並修補 `/spin/[sessionId]` 既有 React 19 lint 紅線與 `useMounted` runtime error。截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-004-spin-final.png`、`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-004-theater-final.png`。

### Batch AIS-004 — Cross-state QA and documentation sync
- [x] 用 Browser 檢查 `/dashboard`、`/spin`、`/theater`、`/crm` 的 desktop 展開/收合狀態，確認 active state 與無水平溢出。
- [x] 用 Browser 檢查 mobile drawer，確認 AI 工作台第一屏可見、點擊 assistant trigger 正常。
- [x] 檢查 console error、keyboard focus、tooltip、`aria-label`、reduced-motion、dark mode 基本可讀性。
- [x] 截圖存到 `docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/`。
- [x] 更新 `AGENTS.md` 與 `PLN-014` 完成狀態，並在完成卡片註記變更檔案。
- [x] 跑 `pnpm lint:changed`。

完成註記：Browser DOM/console QA 通過，`/spin`、`/theater`、`/crm` 新錯誤 0 且無水平溢出；In-app Browser `Page.captureScreenshot` timeout 改以 headless Chrome 保存最終截圖與 force-dark 備援截圖。

### Batch AIS-005 — Issue-question decision sync
- [x] 記錄三個 AI 模組命名、sidebar 分組、AI 助手雙入口、`體驗版` 未登入顯示、headless Chrome 截圖備援等決策到 `RES-016`。
- [x] 從已登入 sidebar 移除 `體驗版`，保留 `/pilot` route 與未登入 / onboarding 入口。
- [x] 保留 `問誠問 AI` 在 `AI 工作台` 第一入口；底部/浮動 CTA 可作為輔助入口，不取代主導覽。
- [x] 新增 Next 16 / React 19 runtime 技術債 issue，後續以獨立 batch 盤點。
- [x] 跑 `pnpm lint:changed`。

完成註記：operator 決策已同步到 `RES-016`；目前 repo 已出現 `/interview` 與 `/spin` 並存，下一輪 AI-first 結構調整需先研究 `/interview` 與 legacy SPIN 的導覽關係，再決定是否保留 `SPIN 舊版` 在主 sidebar。

### Current Sidebar Blockers
- 無 operator/DB 阻擋（本 workstream 不動 schema）。
- 若要改 route/layout 行為，需先讀 Next.js bundled docs。
- 若實作時發現現有 assistant panel 無 tooltip primitive 或 mobile 行為缺口，優先做局部 UI 修補，不改 assistant domain/store。
- In-app Browser 對 `/spin`、`/theater` active state 截圖仍會 `Page.captureScreenshot` timeout；已用 headless Chrome 補存截圖，若後續要做互動錄影再重開 Browser session。
- `/interview` 與 `/spin` 並存的 IA 關係需另開 AI-first 結構研究與 batch，不在 AIS-005 直接合併。

---

## Multi-role SaaS Architecture Batch Tasks

Context: 將誠問 AI 從單一 dashboard app 推進為「商務前端 + 登入分流 + front office + member admin + org admin + super admin」的多角色 SaaS。研究依據：`docs/07_research-and-design/RES-007_product-surface-and-admin-architecture-v1.0.md`、`docs/07_research-and-design/RES-009_demo-account-and-mockdata-database-migration-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-004_multi-role-saas-architecture-acceptance-framework-v1.0.md`。本條只做**產品架構、權限、路由、資料模型、demo seed 與必要 UI surface 落地**，不改 SPIN 狀態機、不改 Theater enum、不刪合規欄位、不略過 AiUsageLog。

### Current PSA Gaps
- `RES-007` 已收斂兩段式 SaaS 與四種系統介面：front office、member admin、org admin、super admin。
- `RES-009` 已收斂 mockdata 資料庫化方向：mock 只能作為 seed fixture，體驗範例必須是 DB demo account，runtime 不再依賴本地 mockdata/localStorage business persistence。
- 已決策：個人版可邀請協作者且上限由 super admin 設定；org manager 只看彙總與輔導指標；通訊處品牌可出現在 share page；企業支援總公司/區部/通訊處；super admin 需要 impersonation audit；付款採綠界；client portal 未來支援登入。
- 已決策：member admin 與 org admin 都需要 settings，但必須分層。`/settings` 是 member settings（個人資料、通知、AI 偏好、個人整合、預設 workspace），`/org/settings` 或 `/team/settings` 是 org settings（members/seats、unit、branding、client portal、AI quota、billing visibility、合規預設）；兩者 API 與權限不可混用。
- 現況已有 `/`、`/pricing`、`/share/[token]`、`/(dashboard)`、`/(admin)/admin` 雛形，但 auth surface、org admin、super admin、plan config、OrganizationUnit、demo seed、mock runtime removal、綠界 billing 還未形成完整閉環。

### Batch PSA-001 — PRD/ARC 定稿
- [x] 產出 Multi-role SaaS PRD，涵蓋 personal、team、enterprise、front office/client portal、member admin、org admin、super admin。
- [x] 產出 Role/Permission/Route ARC，定義 route guards、role matrix、manager visibility、client access、super admin session 與 impersonation audit。
- [x] PRD/ARC 明確列出 hard decisions：個人版可邀請協作者且上限由 super admin 設定；org manager 只看彙總/輔導指標；企業支援總公司/區部/通訊處；付款採綠界。
- [x] 更新 `docs/00_manual-and-index/MAN-001_document-index.md` 與 `docs/00_manual-and-index/MAN-000_docs-usage-manual.md` 文件數量。
- [x] 跑 `pnpm lint:changed`。

變更檔案：`docs/01_product-requirements/PRD-003_multi-role-saas-product-spec-v1.0.md`、`docs/02_architecture-and-rules/ARC-006_role-permission-route-architecture-v1.0.md`、`docs/00_manual-and-index/MAN-001_document-index.md`、`docs/00_manual-and-index/MAN-000_docs-usage-manual.md`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

### Batch PSA-002 — Auth Surface 分流
- [x] 建立 `/login`、`/signup`、`/invite/[token]`、`/client-login`、`/super-admin/login` 的 route/page skeleton 或規劃文件。
- [x] 定義一般 app session、client session、platform session 的分離策略；super admin 使用獨立登入入口與 guard。
- [x] 登入後 redirect 規則清楚：member/collaborator 到 member admin，org owner/admin/manager 可進 org admin，client user 到 client portal，platform role 到 super admin。
- [x] 若新增 route/layout/middleware，先讀 Next.js 對應文件。
- [x] 跑 `pnpm lint:changed`。

變更檔案：`src/app/(auth)/_components/auth-surface.tsx`、`src/app/(auth)/login/page.tsx`、`src/app/(auth)/signup/page.tsx`、`src/app/(auth)/invite/[token]/page.tsx`、`src/app/(client-auth)/client-login/page.tsx`、`src/app/(super-admin)/super-admin/login/page.tsx`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

### Batch PSA-003 — Plan Config 與個人協作者
- [x] 建立或規劃 `PlanConfig` 能力：`maxMembers`、`maxCollaborators`、`maxUnits`、`monthlyAiQuota`、`shareBrandingEnabled`、`clientPortalEnabled`。
- [x] 個人版 organization 支援邀請協作者，但邀請數不得超過 super admin 設定的 `maxCollaborators`。
- [x] 超過上限時 UI 顯示升級或聯絡管理員流程，不允許前端繞過。
- [x] 若動 Prisma schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`；否則以 docs/spec/mock service 交付。
- [x] 跑 `pnpm lint:changed`。

變更檔案：`prisma/schema.prisma`、`src/domains/subscription/types.ts`、`src/domains/subscription/plan-config.ts`、`src/domains/subscription/hooks/useSubscriptionForm.ts`、`src/domains/subscription/plans.ts`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

### Batch PSA-004 — OrganizationUnit 多層級
- [x] 建立或規劃 `OrganizationUnit` tree：`HEADQUARTERS`、`REGION`、`BRANCH`。
- [x] 成員可指定 primary unit；manager 可有 unit-scoped 管理範圍。
- [x] 客戶、報告、SPIN、劇場、拜訪資料保留 `organizationId`，必要時增加 `unitId` 供彙總與品牌 fallback。
- [x] Org admin 報表只能依 unit scope 聚合，不揭露 member 客戶明細。
- [x] 若動 Prisma schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [x] 跑 `pnpm lint:changed`。

變更檔案：`prisma/schema.prisma`、`src/domains/team/unit-scope.ts`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

### Batch PSA-005 — Demo Account 與 Mockdata 資料庫化
- [x] 盤點所有 runtime mock/localStorage 資料來源：`src/domains/*/mocks.ts`、Zustand persist store、inline mock、`/api/mock/*`、Quickstart demo fixture。
- [x] 建立 canonical demo seed fixtures，將現有 mockdata 轉成可 upsert 的 DB seed material，包含 stable `seedKey`、`organizationId`、owner、`isDemo`、scenario/version。
- [x] 建立或規劃 demo accounts：member、manager、client portal、staging super admin；登入後資料都從 DB 讀取。
- [x] 建立 idempotent seed/reset 策略：重跑不重複、只清 `isDemo=true` 或 matching scenario，不刪真實資料。
- [x] Runtime UI/service 不再 import `src/domains/*/mocks.ts` 作為業務資料來源；localStorage 僅保留 UI state。
- [x] `/api/mock/*` 只能保留 dev/test guard；production UI 不得呼叫 mock API 作為資料來源。
- [ ] 清空 browser storage 後，demo account 重新登入仍看到完整範例資料。
- [x] 若動 Prisma schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [x] 跑 `pnpm lint:changed`；必要時補 demo seed QA evidence。

進行中註記：Seed foundation、mock API production guard、`demo:preflight` 檢查腳本、TypeScript 合規欄位基線修復、runtime direct mock import audit 與 localStorage business persistence 收斂已完成；store/page 不再直接 import `src/domains/*/mocks.ts`，統一經 `src/domains/demo/seed-fixtures.ts` 取用 demo seed material，client/visit/SPIN/report/event/theater/session 不再 persist 到 browser storage，assistant/calendar 僅 partial persist UI/integration state，並以 `pnpm demo:runtime-audit` 防止回歸。2026-06-18 `pnpm prisma db push --accept-data-loss` 回報 DB 已與 Prisma schema 同步；`pnpm demo:preflight` 通過 DB 連線/必要 seed table 檢查；`pnpm demo:seed:reset` 已成功 seed `quickstart-insurance-advisor` v1。剩餘驗收是 Supabase Auth public env 與清空 browser storage 後的 demo account 重新登入 DB-backed runtime 驗證。

變更檔案：`prisma/schema.prisma`、`scripts/seed-demo.mjs`、`scripts/demo-preflight.mjs`、`scripts/demo-runtime-audit.mjs`、`.env.example`、`package.json`、`src/domains/demo/seed-fixtures.ts`、`src/domains/client/store.ts`、`src/domains/visit/store.ts`、`src/domains/spin/store.ts`、`src/domains/report/store.ts`、`src/domains/event/store.ts`、`src/domains/theater/store.ts`、`src/domains/session/store.ts`、`src/domains/assistant/store.ts`、`src/domains/calendar/store.ts`、`src/app/(dashboard)/pilot/page.tsx`、`src/app/(admin)/admin/page.tsx`、`src/app/api/mock/_lib/mock-api-guard.ts`、`src/app/api/mock/track/[token]/route.ts`、`src/app/api/mock/ai/assistant/route.ts`、`src/app/api/mock/ai/theater/route.ts`、`src/app/api/mock/ai/visit/route.ts`、`src/app/api/mock/ai/spin-outline/route.ts`、`src/domains/client/types.ts`、`src/domains/client/mocks.ts`、`src/domains/client/service.ts`、`docs/06_audits-and-reports/AUD-003_demo-runtime-data-source-inventory-v1.0.md`、`docs/00_manual-and-index/MAN-001_document-index.md`、`docs/00_manual-and-index/MAN-000_docs-usage-manual.md`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

### Batch PSA-006 — Org Admin 輔導台
- [x] `/org` 或現有 `/team` 的第一屏回答「誰需要輔導、下一步是什麼」。
- [x] 僅顯示彙總、輔導、訓練、AI 用量與 unit/member health，不顯示 member 客戶明細、保單明細或對話全文。
- [x] 補成員邀請、席次、unit filter、coaching queue 的最小可用資訊架構。
- [x] 若做 UI，遵循 `ACC-003` modern minimal page 驗收；若做權限/資料，遵循 `ACC-004`。
- [x] 跑 `pnpm lint:changed`；重要 UI 保存 desktop/mobile 截圖。

變更檔案：`src/app/(dashboard)/team/page.tsx`、`docs/06_audits-and-reports/screenshots/modern-ui/psa-006-team-org-admin-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/psa-006-team-org-admin-mobile.png`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

驗收註記：2026-06-18 `/team` 改為 aggregate-only org admin 輔導台；移除 `useClientStore` / client tag heatmap runtime 依賴。Browser DOM 驗證與 headless screenshot fallback 通過 desktop 1440 / mobile 390，無水平 overflow；Browser 原生 screenshot API 在本頁 timeout，因此截圖以 local headless Chrome 保存。

### Batch PSA-007 — Share Branding 與 Client Portal
- [x] Share page 可讀取 organization/unit branding：logo、display name、brand color；brand color 只作小面積 accent。
- [x] Token access 保留，並設計 client login / client portal 的 route、session、資料可見性。
- [x] 客戶登入後只能查看授權報告、預約、回覆、補資料，不進入內部 CRM。
- [x] Share/client portal 保留誠問 AI 產出/輔助標示與保險合規免責。
- [x] 跑 `pnpm lint:changed`；重要 UI 保存 desktop/mobile 截圖。

變更檔案：`src/domains/report/types.ts`、`src/domains/report/store.ts`、`src/app/(public)/share/[token]/page.tsx`、`src/app/(client-auth)/client-login/page.tsx`、`docs/06_audits-and-reports/screenshots/modern-ui/psa-007-share-branding-desktop.png`、`docs/06_audits-and-reports/screenshots/modern-ui/psa-007-share-branding-mobile.png`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

驗收註記：2026-06-18 `ShareMeta` 增加 branding / portal / CTA contract，分享頁可顯示 organization/unit 品牌、client portal 授權範圍與合規提醒；`/client-login` demo share link 對齊 seed token `demo-share-wang`。正式 DB-backed share lookup 與 client session authorization 仍依賴 PSA-005 DB seed/runtime migration 與 auth provider 決策。

### Batch PSA-008 — 綠界 Billing
- [x] 將 Stripe 命名欄位規劃或遷移為 provider-neutral billing 模型，例如 `paymentProvider`、`providerCustomerId`、`providerSubscriptionId`、`PaymentTransaction`。
- [x] 實作或規劃綠界 checkout/order、notification、query、payment status 狀態機。
- [x] 付款狀態連動 plan config、seat limit、AI quota、branding、client portal capability。
- [x] 付款成功不得只信任前端 redirect；必須以 server-side notification 或查詢結果為準。
- [x] 若動 Prisma schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [x] 跑 `pnpm lint:changed`。

變更檔案：`prisma/schema.prisma`、`src/domains/subscription/types.ts`、`src/domains/subscription/billing.ts`、`src/domains/subscription/hooks/useSubscriptionForm.ts`、`src/domains/subscription/mocks.ts`、`src/components/subscription/steps/StepPaymentDetails.tsx`、`src/app/(admin)/admin/page.tsx`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

驗收註記：2026-06-18 新增 `PaymentProvider`、`SubscriptionOrderStatus`、`PaymentTransactionStatus`、`PaymentAccount`、`PaymentTransaction`；`Organization` 補 provider-neutral billing 欄位並保留 legacy Stripe 欄位作 migration compatibility。`billing.ts` 定義綠界導轉、server notification/query confirmation 與 plan activation helper；購買 modal 移除 Stripe/卡號假表單，改成綠界導轉骨架與「不得只依前端 redirect 啟用」提醒。operator 已決策採綠界測試環境完整整合，並準備 production readiness 但不啟用正式金流；正式 ECPay API route、CheckMacValue、ReturnURL/OrderResultURL/ServerReplyURL 仍需 operator 憑證與 callback URL。2026-06-18 `pnpm prisma db push --accept-data-loss` 已回報 DB schema 同步。

### Batch PSA-009 — Super Admin 與 Impersonation
- [x] 建立 platform-only super admin guard；super admin session 與一般 app session 分離。
- [x] 建立或規劃 impersonation session：actor、target org/member、reason、scope、startsAt、expiresAt、endedAt。
- [x] 所有 impersonation 期間的敏感讀寫操作寫 AuditLog，含 `impersonationSessionId`。
- [x] Super admin 預設看彙總、用量、付款、事件與支援資訊；查看敏感內容需 break-glass reason。
- [x] 跑 `pnpm lint:changed`；若動 schema，跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。

變更檔案：`prisma/schema.prisma`、`src/domains/platform/types.ts`、`src/domains/platform/impersonation.ts`、`src/app/(super-admin)/super-admin/page.tsx`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

驗收註記：2026-06-18 新增 `PlatformRole`、`ImpersonationStatus`、`AuditAction`、`AuditSensitivity`、`PlatformUser`、`ImpersonationSession`、`AuditLog`；`ImpersonationSession` 必填 actor、target org、reason、scope、startsAt、expiresAt，且 audit log 可關聯 `impersonationSessionId`。`src/domains/platform/impersonation.ts` 定義 platform session boundary、role guard、reason/scope/expiry 驗證、60 分鐘上限與 audit draft。`/super-admin` 頁面預設只呈現彙總、用量、付款、事件與支援資訊，敏感讀取需 break-glass。operator 已決策提供 staging access cookie/password；正式 platform auth provider 改採 Supabase Auth，但 MFA / cookie guard 尚未接。2026-06-18 `pnpm prisma db push --accept-data-loss` 已回報 DB schema 同步。

### Batch PSA-010 — Cross-surface QA
- [x] 補一張 cross-surface responsibility matrix，覆蓋 CRM、SPIN、Theater、Pre-visit、Reports、Share、Billing、Settings、AiUsageLog。
- [x] 檢查 route guard、data visibility、empty/loading/error state，特別是 manager 不看客戶明細與 super admin 獨立登入。
- [x] 檢查 personal collaborator 上限、unit scope、demo account DB seed、mockdata runtime removal、share branding、client portal、impersonation audit、綠界 billing 的文件與程式碼一致。
- [x] 更新 `AGENTS.md` 與 `PLN-013` 完成狀態。
- [x] 跑 `pnpm lint:changed`；必要時保存 desktop/mobile 截圖或 QA evidence。

變更檔案：`docs/08_acceptance-and-qa/ACC-005_cross-surface-responsibility-matrix-v1.0.md`、`docs/00_manual-and-index/MAN-001_document-index.md`、`docs/00_manual-and-index/MAN-000_docs-usage-manual.md`、`docs/05_execution-plans/PLN-013_multi-role-saas-architecture-batch-tasks-v1.0.md`、`AGENTS.md`。

驗收註記：2026-06-18 `ACC-005` 已建立跨介面責任矩陣，覆蓋 CRM、SPIN、Theater、Pre-visit、Reports、Share、Billing、Settings、AiUsageLog 的 front office / member admin / org admin / super admin 邊界；route guard、資料可見性、空/載入/錯誤狀態、personal collaborator、unit scope、demo seed、runtime mock removal、share branding、client portal、impersonation audit、綠界 billing 已逐項對齊。2026-06-19 追加 settings 分層：member `/settings` 與 org `/org/settings`/`/team/settings` 必須獨立，member settings 不可改 org-wide policy，org settings 不可讀 member private preferences。operator 已決策 Supabase Auth、綠界測試環境完整整合、staging access 由 operator 提供；production integration 仍受 Supabase public env、ECPay credentials/callback domain、staging cookie 與 browser storage relogin QA 阻擋。

### Current PSA Blockers
- Auth provider 已決策為 Supabase Auth；仍需補 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、service role / callback 設定與 session guard 實作。
- Billing 已決策為綠界測試環境完整整合，production readiness 但不啟用正式金流；仍需 MerchantID、HashKey、HashIV、ReturnURL、OrderResultURL、ServerReplyURL/ClientBackURL 與 callback domain。
- 若缺少 operator 憑證，對應卡可先交付 PRD/ARC/schema draft/mock UI，但不得假裝完成 production integration。
- 2026-06-18 `pnpm prisma db push --accept-data-loss`、`pnpm demo:preflight`、`pnpm demo:seed:reset` 已通過；剩餘 PSA-005 驗收是清空 browser storage 後，用 demo account 重新登入仍從 DB 看到完整範例資料。
- Staging super admin visual QA 仍需 operator 提供 staging access cookie/password。

---

## Launch Readiness Implementation Batch Tasks

Context: 將 `RES-012` / `RES-013` 的上線差距與四介面實作研究轉成 Level 1 受控 Staging Demo 的可執行任務。逐張任務卡：`docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`；架構依據：`docs/02_architecture-and-rules/ARC-006_role-permission-route-architecture-v1.0.md`、`docs/08_acceptance-and-qa/ACC-005_cross-surface-responsibility-matrix-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-004_multi-role-saas-architecture-acceptance-framework-v1.0.md`、`docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`。本條做**上線最小閉環**：session、DB-backed CRUD、member/org settings、三 AI、demo relogin、front office/client portal、org aggregate、super admin/audit、release QA。不做未核可的正式 public launch。

### Current Launch Gaps
- 目前不建議直接正式上線；最近目標是 Level 1 受控 Staging Demo。
- 三個 AI 目標是 `問誠問 AI`、`AI 顧問陪談`、`AI 劇場演練`，每次 provider call 必須寫 `AiUsageLog`。
- 資料新增最小閉環尚未完成：Client、VisitPlan、InterviewSession、TheaterSession、Report/Share、MemberSettings、OrgSettings 都要 DB-backed。
- `member settings` 與 `org settings` 已決策分層：`/settings` 只管 member-scoped preferences；`/org/settings` 或 `/team/settings` 才管 organization-wide policy。
- Org admin 只能走 aggregate APIs；不得重用 member detail APIs。

### Batch LCH-001 — Session / Workspace Foundation
- [x] 接 Auth.js / NextAuth server auth foundation 與必要 env contract。
- [x] 建立 `getAppSession()`、`getClientSession()`、`getPlatformSession()`。
- [x] 建立 `requireCurrentMember()`、`requireOrgAdmin()`、`requirePlatformUser()`、`requireClientPortalUser()`。
- [x] 建立 policy helpers：client detail/write、org aggregate、AI module、break-glass。
- [x] 建立 `/api/workspace/bootstrap`，回 user/org/membership/unit/plan/quota。
- [x] Dashboard/member routes 未登入導 `/login`；org admin routes 套 owner/admin/manager guard；super admin routes platform-only。
- [x] 若改 middleware/cookies/route groups，先讀 Next.js bundled docs。
- [x] 跑 `pnpm lint:changed`；動 schema 才跑 Prisma 驗收。

完成註記：2026-06-19 新增 `src/lib/auth/session.ts`、`src/lib/auth/current-workspace.ts`、`src/lib/auth/policies.ts` 與 `GET /api/workspace/bootstrap`。原本 Supabase Auth blocker 已依 operator 新方向改為 Auth.js / NextAuth：新增 `src/auth.ts`、`src/app/api/auth/[...nextauth]/route.ts`、`src/types/next-auth.d.ts`，`getAppSession()` 優先讀 Auth.js `auth()`，再對應 DB user/membership；本機 demo credentials/dev header 只在 `NODE_ENV !== "production"` 且 `ALLOW_DEV_AUTH_HEADER=true` 時啟用。2026-06-19 追加 route guard：`(dashboard)/layout.tsx` server guard 未登入導 `/login`，`/team` server wrapper 套 owner/admin/manager guard，`/super-admin` platform-only guard 導 `/super-admin/login`。Smoke：`/api/auth/session` 200、`/api/auth/providers` 200、無 session 的 workspace bootstrap 401、無 session `/dashboard` 307 `/login`、demo member `/dashboard` 200、demo manager `/team` 200、demo member `/super-admin` 307 `/super-admin/login`。剩餘 release blocker：production `AUTH_SECRET`、正式 provider/email/SSO、client portal session contract。

變更檔案：`src/auth.ts`、`src/types/next-auth.d.ts`、`src/app/api/auth/[...nextauth]/route.ts`、`src/lib/auth/session.ts`、`src/lib/auth/current-workspace.ts`、`src/lib/auth/policies.ts`、`src/lib/auth/route-guards.ts`、`src/app/api/workspace/bootstrap/route.ts`、`src/app/(dashboard)/layout.tsx`、`src/components/layout/dashboard-shell.tsx`、`src/app/(dashboard)/team/page.tsx`、`src/app/(dashboard)/team/team-page-client.tsx`、`src/app/(super-admin)/super-admin/page.tsx`、`.env.example`、`package.json`、`pnpm-lock.yaml`、`AGENTS.md`、`docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md`、`docs/06_audits-and-reports/RPT-003_ongoing-batch-implementation-report-v1.0.md`、`docs/07_research-and-design/RES-016_issue-question-log-v1.0.md`。

### Batch LCH-002 — DB-backed Client CRUD
- [x] 建立 `GET/POST /api/clients`，server 端推導 `organizationId`、`ownerId`、`unitId`。
- [x] 建立 `GET/PATCH /api/clients/[id]`，套 member detail policy。
- [x] 新增 client 時初始化合規 contract，不省略 KYC/suitability/consent 欄位。
- [x] 建立最小 family/policy write path。
- [x] CRM list/detail 改為 API/cache-first；localStorage 不再是 client business source of truth。
- [x] 清空 browser storage 後 demo member 仍可從 DB 看到 seeded clients。
- [x] 新增 client 後刷新仍存在。
- [x] 跑 `pnpm demo:runtime-audit` 與 `pnpm lint:changed`。

完成註記：2026-06-19 新增 DB-backed member client BFF：`GET/POST /api/clients`、`GET/PATCH /api/clients/[id]`、server-side DTO/repository mapper。API 不信任前端 `organizationId`/`ownerId`/`unitId`，由 `requireCurrentMember()` 注入；新增 client 時會建立 `ComplianceChecklist`（KYC/suitability/consent 全為 MISSING 並列 missingItems）。`/crm` list 與新增對話框改為 BFF/cache-first；新 browser context + demo member header 可從 DB 看到 seeded client `王大明`，console error 0、無水平 overflow。後續同輪補上 `useClientRecord()` API hydration，`/crm/c_wang`、relationships、policies、gap-analysis、reports、timeline 可在乾淨 browser context 直接從 `/api/clients/[id]` hydrate；desktop Browser QA 皆 console error 0、無水平 overflow。再補 `POST /api/clients/[id]/family-members`、`POST /api/clients/[id]/policies` 與 service methods；relationships dialog child mode 已接 family member BFF，API 401/400 proof 與 dialog open Browser proof 通過。Operator 於 2026-06-19 已批准目前 Supabase target 可做 LCH demo/test 非破壞性寫入 proof；同日以 `ALLOW_DEV_AUTH_HEADER=true` 建立 demo/test client `cmqjsnwbf00005061en7zsevh`（`LCH-002 測試客戶 20260619014910`），`POST /api/clients` 回 201，後續 `GET /api/clients` 與 `GET /api/clients/cmqjsnwbf00005061en7zsevh` 回 200，list/detail 均可重讀且 `kycStatus=MISSING`。

### Batch LCH-003 — Member Settings And Workspace Preferences
- [x] 將 `/settings` 定義為 member settings：profile、notification、AI preferences、personal integrations、default workspace。
- [x] 建立 `GET/PATCH /api/member/settings`。
- [x] `/settings` 不得修改 org branding、billing、unit policy、client portal、org AI quota、compliance defaults。
- [x] Personal plan owner 的 collaborator 入口仍需 server-side plan policy。
- [x] AI 個人偏好不得超過 org policy 上限。
- [x] 更新 sidebar/route naming，避免與 org settings 混淆。
- [x] 跑 `pnpm lint:changed`；必要時保存 desktop/mobile 截圖。

完成註記：2026-06-19 新增 `OrganizationMember.settings` nullable JSON 作為 member-scoped preferences contract；建立 `src/lib/member-settings/member-settings-repository.ts` 與 `GET/PATCH /api/member/settings`，只由 `requireCurrentMember()` 推導 current membership，不接受前端傳入 org/user scope。`/settings` 已改為「個人設定」，覆蓋 profile、notifications、AI preferences、personal integrations、default workspace、personal collaborator entry 與 security boundary；sidebar route naming 由「系統設定」改為「個人設定」。API proof：`GET /api/member/settings` 200，`PATCH /api/member/settings` 200，重讀 persisted true；`pnpm prisma:validate`、`pnpm prisma:generate`、`pnpm prisma db push`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm build` 通過。Browser proof `/settings` desktop/mobile console error 0、無水平 overflow；截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-003/settings-desktop.png`、`docs/06_audits-and-reports/screenshots/launch-readiness/lch-003/settings-mobile.png`。

### Batch LCH-004 — Three AI Production Minimum
- [x] `/api/ai/chat` 改 session-scoped，保存 conversation/message，寫 `AiUsageLog`。
- [x] Assistant tool commands 依 surface allowlist。
- [x] `/api/ai/interview` 與 `/outputs` 由 server session 注入 scope，保存 session/material/output draft。
- [x] `/interview` 頁面按鈕層完成 Browser success QA。
- [x] Theater 採 Route B 最小版，或 staging 明確 legacy demo gate。
- [~] Theater director/character/feedback calls 全部寫 `AiUsageLog`。
- [~] 建立 `canUseAiModule()` 與 quota check；超限回 429。
- [x] 三個 AI 都驗證 success/error path `AiUsageLog`。
- [ ] 跑 `pnpm lint:changed`；動 Theater schema 需 Prisma 驗收與 migration/rollback note。

進行中註記：2026-06-19 已完成 `/api/ai/chat` production slice：route 以 `requireCurrentMember()` 推導 org/user/unit，不接受前端 org/user scope；`canUseAiModule(session, CHAT)` 超限會回 429；OpenAI 串流 success path 寫 `AiUsageLog`、`AssistantConversation`、`AssistantMessage`，並將 organization `monthlyAiUsed` increment 1。API proof：demo member `POST /api/ai/chat` 200，CHAT usage log 0→1、assistant conversations 0→1、assistant messages 0→2、latest model `gpt-4o-mini`、monthly counter 1。Browser proof `/dashboard` desktop/mobile console error 0、無水平 overflow；截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-004/dashboard-ai-chat-desktop.png`、`docs/06_audits-and-reports/screenshots/launch-readiness/lch-004/dashboard-ai-chat-mobile.png`。`/api/ai/interview`、Theater Route B、三 AI error-path 全覆蓋仍未完成，所以 LCH-004 不得標整卡完成。

進行中註記：2026-06-19 續完成 `/api/ai/interview` 與 `/api/ai/interview/outputs` production slice：兩條 route 以 `requireCurrentMember()` 注入 org/user/unit，不再接受前端 `organizationId/userId`；`clientId` 若有傳入也需 server 確認 current member 可讀，否則不掛 relation。訪談串流成功後寫 `AiUsageLog` 與 `InteractionEvent(metadata.source=api/ai/interview)`；輸出草稿成功後寫 `AiUsageLog` 與 `InteractionEvent(metadata.source=api/ai/interview/outputs)`，並 increment organization `monthlyAiUsed`。API proof：demo member `POST /api/ai/interview` 200、`POST /api/ai/interview/outputs` 200；DB proof `INTERVIEW usage 3→5`、success usage `1→3`、interaction events `0→2`、latest sources `api/ai/interview/outputs` / `api/ai/interview`。Browser proof `/interview` desktop/mobile console error 0、無水平 overflow；截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-004/interview-desktop.png`、`docs/06_audits-and-reports/screenshots/launch-readiness/lch-004/interview-mobile.png`。Theater Route B 與三 AI error-path 全覆蓋仍未完成。

進行中註記：2026-06-19 補 `canUseAiModule()` quota 429 API proof：`pnpm demo:preflight` 通過；以 demo member default org `demo_org_asai_personal` 做可還原測試，將 `monthlyAiUsed` 暫設為 `monthlyAiQuota=200` 後呼叫 `POST /api/ai/chat`、`POST /api/ai/interview`、`POST /api/ai/interview/outputs`，三者皆回 `429 QUOTA_EXCEEDED` 且回傳友善訊息。DB proof：`AiUsageLog` count 在 quota-blocked calls 前後維持 `CHAT=1`、`INTERVIEW=5`，確認 provider call 前即阻擋、不增加成本；測試後已還原 `monthlyAiUsed=3` 並再次查詢確認。Quota UI proof、Theater quota/error path 與三 AI success/error 全覆蓋仍未完成。

進行中註記：2026-06-19 完成 Theater legacy staging gate 與 usage minimum：`/api/ai/theater`、`/api/ai/theater/score` 改用 `requireCurrentMember()` 推導 org/user/unit，加入 Zod validation、`canUseAiModule(session, THEATER)`、`AiUsageLog`、`InteractionEvent(type=THEATER)` 與 `monthlyAiUsed` increment；production 若未設定 `ENABLE_LEGACY_THEATER_DEMO=true` 會回 `503 THEATER_ROUTE_B_REQUIRED`，避免 legacy flow 被宣稱為新版 production Theater。API proof：demo member `POST /api/ai/theater` 200、`POST /api/ai/theater/score` 200；DB proof `THEATER usage 0→2`、success usage `0→2`、THEATER interaction events `0→2`、monthly counter `3→5`。Theater quota proof：character/score 皆回 `429 QUOTA_EXCEEDED`，THEATER usage 維持 `2`，counter 還原 `5`。Route B 多角色/旁白 NPC/五視角新版劇場與 provider error-path 全覆蓋仍未完成。

進行中註記：2026-06-19 補三 AI provider error-path proof：`/api/ai/chat`、`/api/ai/interview`、`/api/ai/theater` 在本機以無效 OpenAI key 觸發 provider 401，三者皆回 500 且寫入 `AiUsageLog.error`。DB proof：error count deltas `CHAT +1`、`INTERVIEW +1`、`THEATER +1`；同輪補 `/api/ai/interview` outer catch，確保 stream 建立前失敗也會寫 `persistInterviewFailure()`。三 AI success/error path 已驗證；Route B 新版劇場、director/NPC/五視角與 quota UI 全頁 proof 仍未完成。

### Batch LCH-005 — Demo Account Relogin QA
- [x] `pnpm demo:preflight` 通過。
- [x] `pnpm demo:seed:reset` 可重跑且不刪真實資料。
- [ ] Demo users 連到 Supabase Auth `supabase_auth_id`。
- [x] 清空 browser storage 後 demo member 登入，仍看到 DB seeded clients、visit plans、reports、sessions。
- [x] Demo member 新增 client、建立至少一筆 AI output，刷新後仍存在。
- [x] Demo manager 只看到 aggregate/coaching/unit/member health。
- [ ] Demo client 只看到 authorized share/client portal content。
- [x] `/api/mock/*` 在 production-like env 預設不可用。
- [x] 保存 QA evidence：commands、screenshots、AiUsageLog count before/after。
- [x] 跑 `pnpm lint:changed`。

進行中註記：2026-06-19 新增 `pnpm demo:relogin-qa`，以 Playwright 新 browser context + `x-asai-demo-user-email: demo.member@asai.local` 清空 localStorage/sessionStorage 後逐頁驗證 DB seeded data。驗收：`pnpm demo:preflight` 通過；`pnpm demo:seed:reset` 通過並重新 seed `quickstart-insurance-advisor` v1；`pnpm demo:relogin-qa` 通過，確認 `/crm`、`/crm/c_wang`、`/pre-visit`、`/reports`、`/spin` 仍可看到 `王大明`，`/theater` 可進 AI 劇場演練，final page 無水平 overflow。截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-005/*.png`。Supabase Auth `supabase_auth_id`、demo member 新增 AI output refresh proof 與 demo client portal proof 當時仍未完成。

進行中註記：2026-06-19 新增 `pnpm demo:member-write-qa`，以 demo member 透過 BFF 新增測試客戶並呼叫 `/api/ai/interview/outputs` 產生 AI output，再重讀 API/DB 驗證 refresh persistence。驗收通過：created client `cmqjwzrem0004ai619szx7z9p` 可 `GET /api/clients/[id]` 200 重讀，`kycStatus=MISSING` 初始化；AI output 200 且含 known facts / prep questions / issue readiness；DB proof `INTERVIEW AiUsageLog 1→2`、`monthlyAiUsed 1→2`、created client count `1`、client-linked `InteractionEvent(type=VISIT)` count `1`。第一次腳本因 snake_case alias 判讀 bug 誤報 fail，但 DB JSON 已顯示成功；已修正後重跑通過。Supabase/Auth 正式登入、demo client portal 與 mock API production-like guard proof 仍未完成。

進行中註記：2026-06-19 新增 `GET /api/org/overview` 與 `pnpm demo:manager-aggregate-qa`，以 `demo.manager@asai.local` 驗證 manager 只取得 organization totals、coaching summary、unitHealth、memberHealth。驗收通過：`/api/org/overview` 200，回傳 members `3`、units `2`、clients `3`、visitPlans `1`、reports `1`、aiUsageThisMonth `2`、membersNeedingCoaching `2`；QA script 以 DB demo clients/policies 產生 7 個 forbidden sentinels，確認 overview 與 `/api/clients` manager session 都沒有洩漏 client name/email/phone/occupation/notes/policy/product/report section/transcript/detail field names。Supabase/Auth 正式登入、demo client portal 與 mock API production-like guard proof 仍未完成。

進行中註記：2026-06-19 新增 `pnpm mock:production-guard-qa`，以 `ALLOW_MOCK_API=false pnpm start` 的 production-like runtime 實打 `/api/mock/ai/assistant`、`/api/mock/ai/spin-outline`、`/api/mock/ai/theater`、`/api/mock/ai/visit`、`/api/mock/track/demo-token`，五條皆回 `404` 且 response body 包含 `mock_api_disabled`。LCH-005 的 mock API production-like guard proof 已完成；剩餘 Supabase/Auth 正式登入與 demo client portal proof。

### Batch LCH-006 — Front Office / Share / Client Portal
- [x] 建立 `GET /api/public/pricing`。
- [x] 建立 `GET /api/share/[token]`，只回 client-safe report sections、branding、CTA、合規免責。
- [x] 建立 `POST /api/share/[token]/events`，寫 safe `ShareEvent`。
- [x] `/share/[token]` 改 DB-backed token lookup。
- [x] 建立 `GET /api/client-portal/bootstrap`。
- [x] 建立 `POST /api/client-portal/responses` 最小 contract。
- [x] Client session 不可進 member/org admin。
- [x] Share/client portal desktop/mobile QA：invalid、expired、authorized token、client login。
- [x] 跑 `pnpm lint:changed`。

進行中註記：2026-06-19 新增 `GET /api/share/[token]`、`POST /api/share/[token]/events`、`src/lib/share/share-repository.ts` 與 `pnpm share:token-qa`。`/share/[token]` 已改由 BFF 讀 DB token，不再從 report store/local seed 取報告，也不再呼叫 `/api/mock/track`。驗收通過：`demo-share-wang` GET 200，回傳 token、王大明 display name、2 個 client sections、organization/unit branding；response 不含 internal/performance/client-private sentinels；POST OPEN event 200，`ReportShare.accessCount 0→1`、`ShareEvent 0→1`，unsafe payload key 未寫入 DB；invalid token 404。Browser smoke：`/share/demo-share-wang` 顯示授權報告，console error 0，無水平 overflow。2026-06-19 續補 client portal token-scoped session：`getClientSession()` 從 `x-asai-client-token` header 或 `asai_client_share_token` cookie 驗證 `ReportShare`，不從 member app session 推導 client identity；新增 `GET /api/client-portal/bootstrap` 只回授權 client display name、client-safe sections、branding/CTA/scope；新增 `POST /api/client-portal/responses` 寫 `InteractionEvent(type=TASK)` 供客戶補資料/提問/預約意向。`pnpm client-portal:qa` 通過：missing session 401、client token 打 `/api/workspace/bootstrap` 401、bootstrap 200、response 201、invalid response type 400、`InteractionEvent` 0→1、unsafe payload key count 0。2026-06-19 續補 `GET /api/public/pricing`，由 DB `PlanConfig` 產生 public-safe pricing DTO，回傳四個方案、能力上限、CTA、ECPay provider 狀態；`checkoutEnabled=false`，避免未完成正式金流被誤啟用。`pnpm public:pricing-qa` 通過：API 200、source=database、四個方案能力上限與 DB 一致、private billing/env sentinels 0。2026-06-19 續補 `/client-login` token/cookie handoff：新增 `POST/DELETE /api/client-portal/session`，成功驗證 share token 後寫入 httpOnly `asai_client_share_token` cookie；`/client-login?token=demo-share-wang` 可預填 token 並建立 client session。`pnpm client-portal:qa` 擴充通過：session POST 200、Set-Cookie 含 HttpOnly/SameSite=Lax、cookie bootstrap 200、cookie 打 `/api/workspace/bootstrap` 401、invalid session token 404。Browser smoke：`/client-login?token=demo-share-wang` token 預填、主要 CTA 存在、console error 0、無水平 overflow。2026-06-19 續補 expired token 與完整 browser QA matrix：`share:token-qa` / `client-portal:qa` 會 idempotent upsert `demo-share-wang-expired`，驗證 expired share GET 404、event POST 404、access/share event 不增加、session POST 404、bootstrap 401、workspace 401；Browser matrix 覆蓋 desktop 1440x1000 與 mobile 390x844 的 authorized share、invalid share、expired share、client login，全部 console error 0、無水平 overflow。LCH-006 QA/lint 已完成；正式 client-user email/OTP/Auth.js 與專用 client portal UI route 屬 Level 3+ 後續。

### Batch LCH-007 — Org Admin Aggregate And Org Settings APIs
- [x] 建立 `GET /api/org/overview`。
- [x] 建立 `GET /api/org/members`，不得回客戶明細。
- [x] 建立 `GET /api/org/coaching`。
- [x] 建立 `GET /api/org/ai-usage`。
- [x] 建立 `GET/POST /api/org/units`，套 plan `maxUnits`。
- [x] 建立 `POST /api/org/invites`，套 `PlanConfig.maxCollaborators` / seat limit。
- [x] 建立 `/org/settings` 或 `/team/settings` surface。
- [x] 建立 `GET/PATCH /api/org/settings`；owner/admin 可寫，manager scoped read-only/limited write。
- [x] Org settings 不讀 member private settings；org admin API 不回 client name、phone/email、policy number、report body、SPIN/Theater transcript。
- [x] Browser QA `/team` + org settings desktop/mobile；console error 0、無水平 overflow。
- [x] 跑 `pnpm lint:changed`。

完成註記：2026-06-19 續補 `GET /api/org/members`，使用 `requireOrgAdmin()` 與 `canReadOrgAggregate()`，manager 若有 managed unit scope 則只看 scope 內 primary unit 成員。Response 只回 member metadata、role/status、seat timestamps、primary/managed units 與 client/visit/report/SPIN/Theater/AI usage aggregate counts；不回 user email、member private settings、client name/phone/email、policy number/product、report body、SPIN/Theater transcript。新增 `pnpm demo:org-members-qa`：以 demo manager 呼叫 `/api/org/members`，驗證 200、role=MANAGER、members/units/totals 存在，並用 DB seeded client/policy/report sentinels 掃 response，private/client detail field names 與 sentinels 皆 0。2026-06-19 續補 `GET /api/org/coaching` 與 `GET /api/org/ai-usage`：coaching 回 completion rate、stuck stage、persona load、member coaching aggregate 與 recommendation focus；AI usage 回 current-month module/provider/member/unit aggregate tokens/cost/latency/error counts，不回 requestId/error 原文。新增 `pnpm demo:org-coaching-ai-usage-qa`：demo manager 兩 API 皆 200，forbidden client/private field names 0，DB seeded client/policy/report/message/AI sentinels 0。2026-06-19 續補 `GET/POST /api/org/units`：GET 回 active unit tree、planUsage、permissions 與 unit aggregate counts；POST 僅 OWNER/ADMIN 可用，驗證 parent hierarchy、slug conflict 與 `PlanConfig.maxUnits`。新增 `pnpm demo:org-units-qa`：idempotent 建立 demo owner QA 帳號；demo manager GET 200、manager POST 403、demo owner POST 因 STARTER `maxUnits=1` 且 activeUnits=2 回 `MAX_UNITS_REACHED`，unit count 2→2，client/private sentinels 0。2026-06-19 續補 `POST /api/org/invites`：OWNER/ADMIN 才能邀請，需 reason/riskAccepted，建立 pending `OrganizationMember(status=INVITED)`，套 `PlanConfig.maxCollaborators` / `maxMembers`，不寄真 email，response 只回 masked email，AuditLog 記 email hash/masked/limit decision。新增 `pnpm demo:org-invites-qa`：demo manager POST 403、demo owner 建立 collaborator invite 201、AuditLog count > 0、第二個 collaborator 因 maxCollaborators 403 且 membership count 不變，response 不回 raw invited email。2026-06-19 續補 `GET/PATCH /api/org/settings`、`src/lib/org-settings/org-settings-repository.ts` 與 `/team/settings`；manager 可讀但 `PATCH` 403，OWNER/ADMIN 可寫 organization profile、branding、client portal、compliance defaults、billing visibility 與 AI warning threshold，並寫 `AuditLog(resourceType=ORG_SETTINGS)`。`pnpm demo:org-settings-qa` 通過：manager GET 200/read-only、manager PATCH 403、owner PATCH 200、AuditLog 0→1、private/client forbidden field names 0、DB seeded sentinels 0。`pnpm demo:org-settings-browser-qa` 通過：`/team/settings` desktop 1440×1000 / mobile 390×844 皆顯示 org settings、privacy badge、client portal section、manager read-only notice、save disabled，console error 0、無水平 overflow。截圖：`docs/06_audits-and-reports/screenshots/launch-readiness/lch-007/org-settings-desktop.png`、`docs/06_audits-and-reports/screenshots/launch-readiness/lch-007/org-settings-mobile.png`。驗收需以 `ALLOW_DEV_AUTH_HEADER=true pnpm dev` 啟 server；未開 dev auth 時 org QA 會 401，屬預期 guard。

### Batch LCH-008 — Super Admin / Audit / Impersonation
- [x] 完成 platform session guard；`/super-admin/*` 不接受 app session。
- [x] 建立 platform organizations summary APIs。
- [x] 建立跨租戶 AI usage aggregate API。
- [x] 建立 plan config update API，寫 `AuditLog`。
- [x] 建立 impersonation start/end/revoke flow，reason/scope/expiresAt 必填。
- [x] Impersonated read/write 寫 `AuditLog` 並帶 `impersonationSessionId`。
- [x] 建立 break-glass API：reason、scope、expiry、audit 必填。
- [x] 建立 audit log query API。
- [x] 建立 platform settings 區塊。
- [x] 跑 `pnpm lint:changed`；動 schema 跑 Prisma 驗收。

進行中註記：2026-06-19 新增 `src/lib/platform/platform-read-repository.ts`、`GET /api/platform/organizations`、`GET /api/platform/organizations/[id]`、`GET /api/platform/ai-usage`、`GET /api/platform/audit-logs` 與 `pnpm demo:platform-read-qa`。QA 證明一般 app session 呼叫 `/api/platform/organizations` 回 `403 PLATFORM_REQUIRED`，platform user 可讀 tenant summary/detail、跨租戶 AI usage aggregate 與 audit log list；response 不回 email/phone/policy number/report body/SPIN/Theater transcript/AI requestId/error 原文/provider ids/raw metadata，並以 seeded sentinel 掃描 0 leak。2026-06-19 續補 `PATCH /api/platform/plan-configs/[plan]` 與 `pnpm demo:platform-plan-config-qa`：FINANCE PATCH 403、SUPER_ADMIN 缺 reason 400、SUPER_ADMIN 暫改 STARTER `monthlyAiQuota 200→201` 後還原 `201→200`，兩次皆寫 `AuditLog(action=PLAN_UPDATE,sensitivity=HIGH,resourceType=PLAN_CONFIG)`；audit query 只回 `metadataKeys` 不回 raw metadata。2026-06-19 續補 `POST /api/platform/impersonation`、`PATCH /api/platform/impersonation/[id]` 與 `pnpm demo:platform-impersonation-qa`：FINANCE start 403、缺 reason 400、超過 60 分鐘 403、SUPER_ADMIN 可 start/end/revoke，DB session 狀態 ACTIVE→ENDED / ACTIVE→REVOKED，並寫 `IMPERSONATION_START` / `IMPERSONATION_END` BREAK_GLASS audit。2026-06-19 續補 `POST /api/platform/impersonation/[id]/read-proof` 與 `POST /api/platform/impersonation/[id]/support-note`：只有原 actor、ACTIVE、未過期且 scope 符合的 session 可使用；read proof 寫 `IMPERSONATED_READ`，support-note write proof 只寫 `IMPERSONATED_WRITE` audit、不修改租戶業務資料，兩者 response/audit 均帶 `impersonationSessionId`；scope mismatch 403。2026-06-19 續補 `POST /api/platform/break-glass` 與 `pnpm demo:platform-break-glass-qa`：reason、scope、expiresAt、riskAccepted 必填；FINANCE 403；expiry 超過 30 分鐘 403；SUPPORT 可執行 counts-only sensitive proof，寫 `AuditLog(action=BREAK_GLASS,sensitivity=BREAK_GLASS)` 且 response 不回 raw client/report payload。2026-06-19 續補 `GET/PATCH /api/platform/settings`、`SystemSettings.featureFlags/providerPolicy/supportPolicy` 與 `pnpm demo:platform-settings-qa`：FINANCE read 200/write 403、SUPER_ADMIN 缺 reason 400、可暫改 `trialDays 14→15` 與 `featureFlags.clientPortalEnabled` 後還原，兩次寫 `AuditLog(action=SUPPORT_NOTE,sensitivity=HIGH,resourceType=PLATFORM_SETTINGS)`；audit query 只回 `metadataKeys` 不回 raw metadata。LCH-008 已完成；正式 platform auth/MFA 仍為 production blocker。

### Batch LCH-009 — Production Controls And Release QA
- [x] 建立 AI quota/cost alert 或明確 blocker。
- [x] 對所有 OpenAI/Anthropic routes 做 `AiUsageLog` audit evidence。
- [x] 關閉 production-like env `/api/mock/*`。
- [ ] 建立 Sentry 或等價錯誤監控方案；若暫不接，寫 release blocker。
- [x] 建立 DB backup/restore 與 migration rollback note。
- [x] 建立 privacy / terms / AI disclaimer 最小頁面或 release blocker。
- [x] 建立 ECPay test flow checklist；正式收費開關預設關閉。
- [ ] Full smoke：front office、member admin、org admin、super admin、client portal。
- [ ] 保存 release QA evidence。
- [ ] 跑 `pnpm lint:changed`、`pnpm exec tsc --noEmit --pretty false`、`pnpm prisma:validate`、`pnpm demo:preflight`、`pnpm demo:runtime-audit`。

進行中註記：2026-06-19 新增 `GET /api/platform/release-readiness`、`src/lib/platform/platform-release-readiness-repository.ts`、super-admin `Release readiness` / `AI quota warning` 面板與 `pnpm demo:release-readiness-qa`。Readiness API 只允許 platform user 讀取，一般 app session 403；回傳 current-month `AiUsageLog` aggregate、organization quota usage、pending/failed billing order count、mock/email/notification/billing/auth/monitoring/legal/backup/ECPay control gate。QA 通過 API 200/403、required controls、private seeded sentinel 0 leak、super-admin desktop Playwright screenshot、console error 0、無水平 overflow。此切片只完成 AI quota/cost alert 與 production controls visibility；Sentry/backup/legal/ECPay/full smoke 仍為 LCH-009 blocker。

進行中註記：2026-06-19 續補 release blocker 文檔與 public legal pages。新增 `/privacy`、`/terms`，兩頁皆標明 private beta 最小揭露、AI 輔助不構成保險/法律/稅務建議、正式公開上線前仍需法務/合規核可。新增 `ACC-007_release-rollback-and-backup-runbook.md` 與 `ACC-008_ecpay-test-flow-checklist.md`，readiness gate 的 legal_pages、backup_restore、ecpay_checklist 可由檔案存在與 QA 驗證轉為 pass；production monitoring、AI route usage audit、full smoke、正式 ECPay credentials/callback/CheckMacValue 與 production payment approval 仍是 blocker。

進行中註記：2026-06-19 新增 `pnpm ai:usage-audit` 與 `AUD-005_ai-usage-route-audit-v1.0.md`。Audit source + DB aggregate proof 顯示 production-minimum pass：`/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs`、`/api/ai/theater`、`/api/ai/theater/score`；gap：legacy `/api/ai/spin`、`/api/ai/spin-suggestions`、`/api/ai/visit`、`/api/ai/report` 缺 auth/quota/success/error `AiUsageLog`，`/api/rag` 為 placeholder 且缺 guard/quota。此項完成 audit evidence，不代表 legacy gap 已修復。

### Current Launch Blockers
- Auth provider 已改採 Auth.js / NextAuth；production 仍需 `AUTH_SECRET`、正式 provider/email/SSO 與 callback URL。
- Demo account relogin 尚未完成。
- Legacy `/api/ai/spin`、`/api/ai/spin-suggestions`、`/api/ai/visit`、`/api/ai/report` 缺 auth/quota/success/error `AiUsageLog`；`/api/rag` 仍是 placeholder 且缺 guard/quota。
- Theater Route B 尚未 migration；若用 legacy Theater，只能標 staging demo。
- ECPay credentials、callback domain、CheckMacValue、notification/query API、refund/void process 尚未完成。
- Super admin platform auth/MFA/staging access 仍需 operator。
- Production monitoring 尚未完成；privacy/terms/AI disclaimer 與 backup/rollback 已有 private beta draft，但仍需正式 legal/compliance/operator sign-off。

---

## 訪談 × 劇場 雙 Agent Batch Tasks

Context: 將 SPIN 問答與劇場演練重構為「訪談 Agent」「劇場 Agent」兩支，建立在共用半結構訪談引擎上，並支援「獨立 / 客戶資料」兩種模式。設計與已鎖定決策（A–J）：`docs/02_architecture-and-rules/ARC-004_interview-theater-dual-agent-design-v1.1.md`（前版明細 v1.0 含完整異議/紅線表與 8 原型：`ARC-005`）；逐張任務卡：`docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`；KYC/PQ mapping：`docs/07_research-and-design/RES-011_insurance-kyc-pq-mapping-research-v1.0.md`；review 節點切分：`docs/05_execution-plans/PLN-016_review-node-splitting-plan-v1.0.md`；開發前情境決策紀錄：`docs/07_research-and-design/RES-001_pre-development-scenario-open-questions-v1.0.md`；gate audit：`docs/06_audits-and-reports/AUD-004_interview-theater-gate-readiness-audit-v1.0.md`。本條做**新功能落地**（含 schema/migration/AI route），非換膚。人格框架採 Big Five＋情境特質（取代 DISC）；劇場為導演編排的多角色（群/私聊）、情緒融入文字、取消數值緊張度；回饋採五個質化視角（不打分）。

### Current 訪談/劇場 Gaps
- 既有 `spin`/`theater` 為單角色、數值評分；`interview` domain 已建立純 TS foundation（types/service/store/訪綱 A），並新增 `/interview` M1 工作台與 `/api/ai/interview` streaming route；尚未接 DB persistence，RAG 仍為 placeholder。
- 設計、A–J 決策、三大研究（Big Five/情境特質、多 NPC 編排、異議/紅線）已落在 021；A4/D16/D18/B9 與 Theater Route B 已於 2026-06-18 定案。B7/E20 仍作後續實作細節與 review 節點管理。

### Batch ITA-000 — 情境定案與基線收斂（gate，先做）
- [x] 定案 022 的 ★ 項並回寫 021：A4（訪談產出與 `VisitPlan` 合併）、D16（真實客戶入劇場界線）、D18（成本/配額分級）、B9（NPC 防幻覺事實邊界）。
- [x] 取得 Theater 資料模型變更核可（operator 2026-06-18 選 Route B 一次切換；僅 ITA-003/006 可依規格遷移）。
- [x] 補內容空缺：PQ 題庫題目、Issue 0-5 評分定義（`RES-010` 研究版已建立，正式語氣/合規仍需產品審閱）。
- [ ] working tree 收斂：整理現況、修復 tsc error、依 `PLN-016` 評估可 review/push 節點，建立乾淨基線（E20）。
- [x] 跑 `pnpm lint:changed`。

進行中註記：2026-06-18 已建立 `AUD-004_interview-theater-gate-readiness-audit-v1.0.md`，整理 A4/D16/D18/B9 的可批准預設、Theater hard-rule 衝突、PQ/Issue 內容缺口與工程基線。operator 已決策 Theater Route B 且不保留 legacy fallback、A4 訪談/VisitPlan 分工、D16 真實客戶資料進劇場界線、D18 monthlyAiQuota + theater sessions/turns soft quota、B9 NPC fact/inference/unknown 防幻覺 + 旁白 NPC 補資訊、Supabase Auth、綠界 test/full + production-ready not enabled、PQ 可改寫但保留 intent/evidence、Issue Readiness visibility policy。`RES-010` 已建立研究版 PQ 題庫與 Issue Readiness Level 0-5；`RES-011` 已建立 KYC/PQ canonical mapping，並以 `src/domains/interview/pq-compliance.ts` 落地 constants/helper；`PLN-016` 已建立 review node splitting plan。OpenAI quota 補上後已重啟 dev server，使用 `demo_org_asai_personal` 重測 `/api/ai/interview/outputs` 成功回 200，草稿含 known facts、unknowns、SPIN/PQ 候選、Issue Readiness 與 compliance notes；`AiUsageLog` 實際寫入驗證 count 2 -> 3。`pnpm demo:runtime-audit`、targeted ESLint、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 已通過；`pnpm prisma db push --accept-data-loss`、`pnpm demo:preflight`、`pnpm demo:seed:reset` 已通過。未完成 working tree 收斂前，ITA-000 不整卡打勾。

### Batch ITA-001 — 訪談引擎 + 訪綱A + 獨立模式（M1）
- [x] 新建 `src/domains/interview/`（types/service/store），含 `InterviewOutline`/`InterviewSegment`/`OutputField` 型別。
- [x] 訪綱 A（顧問陪談）萃取為 TS 常數配置（A1）：7 段、◆必問、↳追問、引導重點、產出 schema。
- [x] 引擎逐段主導、不跳段、段落自然接續、**取消 phase-complete**（A2/A3）。
- [x] 獨立模式跑通：對話 → 即時結構化素材 → 收斂「客戶輪廓表＋對話準備卡」（AI 生成可編輯，C8/C9）；人格只給白話推論不顯分數（C11）。
- [x] `/api/ai/interview` 直接接 OpenAI streaming（J31），寫入 `AiUsageLog`（I29）。
- [x] 不動 SPIN 狀態機、不動既有 `/spin`（I27、硬規則#2）。
- [x] 跑 `pnpm lint:changed`。

進行中註記：2026-06-18 在不碰 Theater schema/enum/score、也不做 DB migration 的前提下，落地 `src/domains/interview/` pure TS foundation、`/interview` 獨立模式 M1 工作台、`/api/ai/interview` streaming route 與 `/api/ai/interview/outputs` JSON output route。`advisorCompanionOutline` 依 `RES-004` 萃取成 7 段（第 0-5 段 + 產出確認段），service 支援建立 session、記錄 answer/material、檢查核心題是否已答、只在核心題完成後前進下一段；store 不使用 localStorage。`/api/ai/interview` 直接接 OpenAI chat completion streaming，要求 `organizationId` 作 usage logging，並新增 `AiModule.INTERVIEW`。`RES-010` 已補上研究版 PQ 題庫與 Issue Readiness Level 0-5，並落地 `src/domains/interview/issue-maturity.ts` 常數與 `evaluateIssueReadiness` pure stub。`InterviewOutputDraft` 已建立，輸出 route 使用 OpenAI JSON mode 生成客戶輪廓表、對話準備卡、SPIN/PQ 候選、Issue Readiness、人格白話推論與合規提醒，成功/錯誤路徑皆寫 `AiUsageLog`；`/interview` 右側可生成並編輯 JSON 草稿。Browser QA：desktop 可開啟 `/interview`、開始陪談、送出回答、素材草稿出現、生成準備卡按鈕啟用、console error 0、無水平 overflow；mobile 390x844 無水平 overflow。先前按下生成準備卡時 OpenAI 回 429 quota，UI 顯示錯誤且未 crash；2026-06-18 quota 補上並重啟 dev server 後，使用 `demo_org_asai_personal` 重測 `/api/ai/interview/outputs` API 成功回 200，草稿含 known facts、unknowns、SPIN/PQ 候選、Issue Readiness 與 compliance notes，且 `AiUsageLog` 實際寫入驗證 count 2 -> 3；頁面按鈕層成功生成截圖仍需補。

變更檔案：`prisma/schema.prisma`、`src/lib/ai/usage-log.ts`、`src/app/api/ai/interview/route.ts`、`src/app/api/ai/interview/outputs/route.ts`、`src/app/(dashboard)/interview/page.tsx`、`src/components/layout/sidebar.tsx`、`src/domains/interview/types.ts`、`src/domains/interview/issue-maturity.ts`、`src/domains/interview/outlines/advisor-companion.ts`、`src/domains/interview/outlines/index.ts`、`src/domains/interview/service.ts`、`src/domains/interview/store.ts`、`src/domains/interview/index.ts`、`docs/07_research-and-design/RES-010_issue-maturity-and-pq-construct-research-v1.0.md`、`docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`、`docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`、`AGENTS.md`。

### Batch ITA-002 — 客戶資料模式 + 確認寫回（M2）
- [ ] 入口選「獨立 / 帶客戶」（B4）；帶客戶載入 `Client`/`FamilyMember`/`Policy`。
- [ ] 自動分「已知 / 待確認」，只追問缺口（B5）。
- [ ] 結束出「確認卡」逐項勾選；事實項寫回、推論項預設不寫回（B6/B7）。
- [ ] 寫回沿用 `aiTags` 動態更新模式；不刪改合規欄位（硬規則#1）。
- [ ] 跑 `pnpm lint:changed`。

### Batch ITA-003 — 劇場多角色 + 導演編排 + 群/私聊（M3）
- [ ] 資料模型：`TheaterCharacter`（Big Five+if-then+示範台詞）、`TheaterTurn` 加 `speaker/addressee/visibilityScope`、移除數值 `tension`（E19）—— **需先過 ITA-000 核可**。
- [ ] 訪綱 B 配置 + 一鍵從既有資料建場（D12/A3）；焦點客戶必在場、NPC ≤4（D13）。
- [ ] 導演 agent（結構化輸出選發言者＋演出指令）+ 逐角色序列 streaming 呼叫。
- [ ] 旁白 NPC：資料缺口發生時，以情境問題詢問使用者；使用者可略過或補充資訊，補充內容標記 fact/inference/unknown。
- [ ] 群聊/私聊 + 知情範圍（visibility scoping）；情緒/肢體以舞台指示融入文字（E16/E19）。
- [ ] 防搶話/防冷場（被問必答、連續發言上限 2）；NPC 事實依 B9 邊界，不杜撰。
- [ ] 不沿用舊單角色 tension/score 流程；`AiUsageLog` 寫入。
- [ ] 跑 `pnpm lint:changed`。

### Batch ITA-004 — 五視角質化回饋（M4）
- [ ] 五視角 prompt：教練的耳朵 / 客戶的眼睛 / 沉默裡的需求 / 守門的良心 / 決策的橋。
- [ ] 結束一次跑五個，可勾選、預設全部（F20/F21）；以 `TheaterFeedback` 取代數值評分。
- [ ] 可用於訪談 Agent（F22）。
- [ ] 跑 `pnpm lint:changed`。

### Batch ITA-005 — 異議庫 + 紅線偵測（M5）
- [ ] 異議庫依角色人格自然觸發（G24）。
- [ ] 紅線偵測由「守門的良心」呈現：事後為主、嚴重項即時、誤判可標「不適用」（G23/D17）。
- [ ] 跑 `pnpm lint:changed`。

### Batch ITA-006 — 真實資料 migration + RAG 樁 + pgvector（M6）
- [ ] `InterviewSession`、劇場多角色表、`KnowledgeDocument`/`KnowledgeChunk` schema → `pnpm prisma:validate` → migration。
- [ ] Supabase 啟用 pgvector + 向量索引（H26）。
- [ ] seed：訪綱常數載入、原型/模板。
- [ ] RAG 上傳 UI 樁 + `ragService` 介面契約（本期不接真檢索）。
- [ ] 全表帶 `organizationId`、保留合規欄位（硬規則#1）；動 schema 跑 `pnpm prisma:validate` 與 `pnpm prisma:generate`。
- [ ] 跑 `pnpm lint:changed`。

### Current 訪談/劇場 Blockers
- ITA-000 核心產品決策已定案，但 working tree 仍需依 `PLN-016` 切分 review 節點；不要把所有歷史改動混入 Theater migration。
- Theater Route B 已核可並已同步 hard rule #3；ITA-003/006 可開始設計 migration，但必須附資料備份/回滾說明、QA、AiUsageLog 與 production data protection；新版劇場不保留 legacy fallback 作主流程。
- OpenAI quota 已由 operator 補上，dev server 重啟後 `/api/ai/interview/outputs` success path 與 `AiUsageLog` 實際寫入已通過；仍需補 `/interview` 頁面按鈕層 Browser 截圖與 console QA。
- PQ 題庫與 Issue 0-5 已有 `RES-010` 研究版，KYC/PQ mapping 已有 `RES-011`；仍需未來公司正式問卷題號/題文/版本做 mapping。
- DB push、demo preflight、demo seed reset 已通過；Supabase pgvector extension 與向量索引仍需 operator 在 Supabase 專案啟用或確認權限。
- Supabase Auth 已選定，但 app/client/platform session guards、public env、service role、callback URL 尚未實作。
- D16 已核可真實客戶進劇場邊界；高敏感客戶需 owner reason + risk consent，不得讓 org manager 看客戶明細、逐字稿或私聊內容。

---

## 文件慣例（新增任何規劃/設計/報告/驗收文件時）

- docs 採「分類資料夾 + 類型前綴流水號」：`<TYPE>-<NNN>_<kebab-slug>.md`。規則見 `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`。
- 依**文件屬性**選 TYPE：需求=`PRD`、架構/設計/規則=`ARC`、計畫/路線圖/批次=`PLN`、審計=`AUD`、報告=`RPT`、研究=`RES`、驗收=`ACC`。
- 新增後務必到 `docs/00_manual-and-index/MAN-001_document-index.md` 補一列。
- 過期文件不刪除，於文內標 `superseded by <TYPE-NNN>` 並在索引備註。
