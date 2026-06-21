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

### Strategic Development Loop Guardrails（必做）

每輪不是只「撿一張安全卡」；必須先做一次短策略判斷，確認本輪能有效推進產品能力、研究轉化或 release evidence。

1. **Strategic Review Gate**：選卡前先讀 `AGENTS.md`、相關 `PLN/ACC/RES`、`docs/2_agent-input/generated/agent-loop/loop-state.json`（若存在）、`issue-question.md`（若存在）與最近 3-5 份 loop report。用 report 或工作紀錄回答：目前主目標是什麼、最近三輪完成什麼、真正瓶頸是什麼、本輪為何不是重複任務、完成後會讓下一輪更接近哪個 product/research/acceptance 結果。
2. **Anti-Repetition Rule**：若連續兩輪主要成果都是文件整理、checklist 勾選、proof-plan 或 evidence report，下一輪不得再做同類型任務；必須改做 L2+ implementation/proof slice，或升級成 L4 blocker analysis/unblock plan。例外只有一種：該文件變更直接解除具名 acceptance item，且同輪留下可重跑的 proof command。
3. **Research-to-Implementation Loop**：每份 `RES-`、研究筆記或理論框架都要被映射到至少一個可驗收產物：product concept、data model、UI flow、API contract、prototype、test、acceptance criteria、user-facing workflow 或 evidence report。不能只新增研究歸檔而不產生下一張可執行卡。
4. **Acceptance-Driven Slice**：每輪選定工作必須明確引用一個 acceptance item、roadmap item、research hypothesis 或已登錄 issue-question。L0 hygiene（typo/format/checklist-only）只能在沒有更高價值且可安全推進的任務時使用。
5. **Manual Blocker Fallback**：遇到 DB、auth、env、external service 阻擋時，不得只寫 `MANUAL_REQUIRED` 後停止。先改做 contract test、schema review、mock/fixture boundary test、static source proof、setup checklist 或 release-proof fallback；若這些都無法推進，才記為 blocked。
6. **Escalation Rule**：同一類 blocker 連續出現兩次時，停止小修與重複 proof-plan，改產出 blocker analysis：根因、受影響 acceptance、已嘗試 proof、可由 agent 完成的 fallback、需要 operator 的最小決策或環境動作。
7. **Task Level Bias**：優先 L2-L4，避免長期停在 L0/L1。L0 = hygiene；L1 = proof/evidence；L2 = implementation slice；L3 = research translation；L4 = architecture/blocker review。正常 automation loop 應選 L2 或 L3；被阻擋時先選 L1 fallback；重複阻擋時升級 L4。

### NANDA / AgentFacts AI Protocol Loop（所有 AI workstream 必做）

目標：專案內每一個 AI 能力都要逐步對齊 MIT Project NANDA / AgentFacts 的設計方向：可發現、可驗證、可描述能力、可被 registry/index 登記、可跨 protocol 擴充，且保留保險資料的最小揭露與合規邊界。

1. **AgentFacts-style manifest first**：新增或修改任何 AI module / AI route / agent-like workflow 時，必須同步定義或更新內部 manifest，至少包含 agent id、owner surface、capabilities、input/output schema、endpoints/actions、modalities、auth/session scope、data classes、privacy/retention、quota/cost、`AiUsageLog` policy、version、status、registration readiness。
2. **Registry readiness state**：每個 AI 能力都要有明確狀態：`internal-only`、`registry-draft`、`external-ready`、`external-registered`。不得把 `internal-only` 或 `registry-draft` 宣稱成已對外登記或 NANDA production compatible。
3. **Protocol-neutral adapter boundary**：AI 實作不得只綁死單一 provider shape；BFF / domain 層要保留可轉接 NANDA AgentFacts、MCP tools/resources/prompts、A2A Agent Card 或 standard HTTPS 的 protocol-neutral contract。
4. **Verified capability and least disclosure**：manifest 只能揭露必要能力與端點，不暴露 raw prompt、private transcript、policy number、email/phone、secret/token、provider payload。對外 registry/export 前必須有 allowlist、redaction、capability claim 與 proof note。
5. **Research-practice cadence**：每輪若碰 AI module，需在 report 寫一段 `NANDA alignment`：本輪新增/更新的 AgentFacts-style 欄位、未完成的 registry gap、下一個可驗收實作切片。每三到五輪 whole-product review 要重新評估所有 AI module 的 registry readiness。
6. **External registration approval**：任何真實對外 NANDA / third-party registry 發布、憑證簽章、公開 discovery endpoint、或跨組織 agent access，都需要 operator 明確 approval；未核可前只能做 internal manifest、static schema proof、local adapter proof。

### 每輪固定工程收尾（必做）

每一輪循環都必須把工程基線收乾淨，避免下一輪接手時先被歷史狀態絆住：

1. **啟動與收尾都跑 `git status`**：啟動時辨識既有變更、使用者變更、上一輪 agent 變更；收尾時確認本輪實際改動範圍。不得 revert 或覆蓋非本輪變更。
2. **每輪都跑 TypeScript 檢查並修 tsc error**：至少執行 `pnpm exec tsc --noEmit --pretty false`。若出現 tsc error，必須優先修到通過；若錯誤來自本輪不可安全處理的既有受保護區域，需在 report 記錄檔案、錯誤摘要、為何不能改、下一輪入口，且不得把 tsc 寫成通過。
3. **每輪仍須跑對應驗收**：`tsc` 不取代 `pnpm lint:changed`、Prisma validate/generate/db push、acceptance script、API/browser proof。依本輪變更選擇必要驗收，結果寫入 report。
4. **每輪都要 git commit 與 git push**：驗收與文件更新完成後，stage 本輪相關檔案，建立清楚 commit message，並 push 到當前工作分支。只提交本輪相關變更；若 worktree 中有使用者或其他 agent 的未相關變更，不得一併 stage。
   - 2026-06-20 operator override：使用者要求「先不用 git push」期間，每輪仍需驗收、stage 與建立本地 commit，但不得 push；final/report 必須寫明 push skipped by user instruction。待使用者明確恢復 push 後，再回到每輪 push。
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
- `RES-008` 已建議改成「今日 / AI 工作台 / 客戶工作 / 團隊與系統」分組，AI 工作台順序為 `問誠問 AI`、`AI 了解客戶`、`AI 劇場演練`。

### Batch AIS-001 — Sidebar AI-first IA and grouping
- [x] 將 `src/components/layout/sidebar.tsx` nav data 改為 grouped navigation structure，保留現有 route 與 active 判斷。
- [x] 新增 `AI 工作台` section，順序為：`問誠問 AI`、`AI 了解客戶`、`AI 劇場演練`。
- [x] 將 AI 助手 trigger 從底部 CTA 移入 `AI 工作台` section；底部只保留 collapse/layout control。
- [x] `客戶工作` section 包含：客戶管理、訪前規劃、分析報告、議題單。
- [x] `團隊與系統` section 包含：團隊管理、通訊處設定、個人設定；`體驗版` 依 IQ-028 只在未登入 / onboarding / public trial 情境顯示。
- [x] 視覺符合 ARC-003：paper/ink/hairline、1px navy active rail、無滿版藍底、無重陰影、gold 只作稀有小訊號。
- [x] 不改 SPIN 狀態機、不改 Theater enum、不改 assistant store / API 行為。
- [x] 跑 `pnpm lint:changed`；保存 desktop 展開態截圖。

變更檔案：`src/components/layout/sidebar.tsx`。截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-001-desktop-expanded.png`、`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-mobile-drawer.png`。

### Batch AIS-002 — Collapsed, mobile, tooltip, and accessibility polish
- [x] 收合態保留 group spacing，避免 icon 變成無層級長串。
- [x] 所有 icon-only navigation/action 都具備 tooltip 與 `aria-label`，包含 `問誠問 AI`、`AI 了解客戶`、`AI 劇場演練`、collapse control。
- [x] Mobile drawer 第一屏可看到 `AI 工作台`；點擊 AI 助手會關閉 drawer 並開啟 assistant panel。
- [x] Keyboard tab order 合理：brand/logo → 今日 → AI 工作台 → 客戶工作 → 團隊與系統 → collapse。
- [x] Focus ring 使用既有 navy `--ring`，active state 不遮蔽 focus outline。
- [x] 檢查 reduced-motion：sidebar transition 不應在 `prefers-reduced-motion` 下造成明顯干擾。
- [x] 跑 `pnpm lint:changed`；保存 desktop 收合態與 mobile drawer 截圖。

變更檔案：`src/components/layout/sidebar.tsx`。截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-desktop-collapsed.png`、`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-ai-first/ais-002-mobile-drawer.png`。

### Batch AIS-003 — AI module naming and adjacent page consistency
- [x] Sidebar 使用任務導向命名：`問誠問 AI`、`AI 了解客戶`、`AI 劇場演練`。
- [x] 展開態可加入一行 microcopy，但需確保 `w-60` 下不換行破版；若破版則只保留 label，microcopy 放 tooltip。
- [x] `/spin` 與 `/spin/[sessionId]` 的導航 active 對應 `AI 了解客戶`，頁面可見標題或 breadcrumb 與新命名一致。
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

## Role-aware Sidebar Navigation Batch Tasks

Context: 將 AI-first sidebar 進一步升級為依 session、role、surface、unit scope、plan capability 與 feature flag 投影的 role-aware navigation。研究依據：`docs/07_research-and-design/RES-020_role-aware-sidebar-navigation-research-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-021_role-aware-sidebar-navigation-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-013_role-aware-sidebar-navigation-acceptance-framework-v1.0.md`。本條只做**登入後 sidebar navigation contract、server-side resolver、workspace bootstrap、route guard 一致性、surface-specific sidebar rendering 與跨角色 QA**，不改 SPIN 狀態機、不改 Theater enum、不刪合規欄位、不把 sidebar hide/show 當成唯一權限控制。

### Current Role-aware Sidebar Gaps
- `RES-008` 已完成 AI-first sidebar IA；RAS-005 已完成 role-aware sidebar fixture/source/headless Browser cross-role QA，dashboard shell 改吃 `RoleAwareSidebar` + RAS-003 `buildWorkspaceSidebarRenderModel()`，legacy `src/components/layout/sidebar.tsx` 保留但不再是 dashboard shell 主 renderer。
- `RES-020` 已定義 role-aware navigation projection：surface 決定 sidebar 家族、role 決定 section/item 可見性、capability 決定 hide/disable/teaser/surface switch；RAS-001/RAS-002/RAS-003 已完成 contract、resolver、bootstrap 與 guard-alignment source proof。
- `ARC-006` 已定義 app/client/platform session 分離與 manager aggregate visibility；目前 RAS-005 只宣稱 fixture/source/headless Browser proof，不宣稱 production/staging live auth session matrix 通過。
- `/interview` 與 `SPIN 舊版` 並存；legacy SPIN 應由 feature flag 控制，不應長期成為所有角色常駐主入口。

### Batch RAS-001 — Role-aware navigation contract
- [x] 盤點目前 `src/components/layout/sidebar.tsx` 的 section、route、assistant action、active state、tooltip/aria 行為，形成 migration note。
- [x] 定義 `SidebarSection`、`SidebarItem`、`SidebarAction`、`SidebarBadge`、`SidebarDisabledReason` 等型別；需能表達 `href`、`action`、`visible`、`disabled`、`reason`、`badge`、`ariaLabel`。
- [x] 定義 `SidebarContext` input，至少包含 session type、organization role、platform role、client role、managed unit scope、plan capabilities、feature flags、demo mode。
- [x] 建立 member / org admin / super admin / client portal 四套 manifest draft，保留 `RES-008` 的 AI-first 命名：`問誠問 AI`、`AI 了解客戶`、`AI 劇場演練`。
- [x] 明確標註 `SPIN 舊版` 只由 legacy feature flag 顯示，不作新使用者常駐主入口。
- [x] 不改 route guard、不改 business data、不改 assistant/theater/spin store。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

完成註記：2026-06-20 新增 `src/domains/navigation/role-aware-sidebar.ts` 與 `pnpm nav:role-aware-contract-qa`。Contract 已覆蓋 member / org admin / platform / client portal 四套 manifest draft、`SidebarContext`、action/link/visible/disabled/badge/aria contract、legacy `SPIN 舊版` feature flag 與 current sidebar migration note；未接 UI、未改 route guard、未改 business data。

### Batch RAS-002 — Server-side sidebar resolver and policy tests
Whole-product review note（2026-06-20 after RAS-001）：若 Supabase DB/DNS 仍阻擋 BFF/Theater browser proof，RAS-002 是下一個最高安全 fallback。它不需要 DB/provider，即可把 RAS-001 contract 轉成可測試 resolver，驗證 manager / client / platform 不會因 sidebar 顯示取得更寬資料邊界；不得把 resolver proof 宣稱為正式 route guard/browser auth proof。

- [x] 建立 `resolveSidebarSections(context)` 或同等 helper，輸入 RAS-001 contract，輸出已過濾/標註 disabled 的 sections。
- [x] 建立 navigation policy helpers，至少覆蓋 `canAccessMemberRoute`、`canAccessOrgAdmin`、`canManageOrgSettings`、`canReadOrgAggregate`、`canUseAiModule`、`canAccessPlatformTool`。
- [x] 補測試或可重複 script 覆蓋 collaborator、member、manager、org admin、org owner、support、finance、super admin、client viewer。
- [x] 驗證 manager 只能看 scoped org aggregate 導覽，不因 sidebar 顯示而取得 member 客戶明細。
- [x] 驗證 super admin 導覽不會出現在一般 app session；client portal 不會出現 CRM/team/AI prompt/coaching 項目。
- [x] Plan capability off 時，resolver 使用 hide/disable/upgrade/surface switch 策略一致。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；若新增測試，跑對應 test command。

完成註記：2026-06-20 新增 role-aware sidebar resolver / policy helper 與 `pnpm nav:role-aware-resolver-qa`。Resolver 會依 surface/session/role/capability/feature flag 回傳已過濾或 disabled 的 sections；fixture proof 覆蓋 collaborator、member、scoped manager、manager without unit、org admin、org owner、support、finance、super admin、app-session super admin 與 client viewer。Manager 只拿 scoped org aggregate navigation，不含 member client-detail routes；support/finance 不預設取得 impersonation；client portal 不含內部 CRM/team/AI/platform route。此卡不接 sidebar UI、不改 route guard、不改 business data、不呼叫 provider。

### Batch RAS-003 — Workspace bootstrap and route guard alignment
- [x] 盤點現有 workspace/session/bootstrap 入口；若不存在正式 endpoint，先建立最小 `/api/workspace/bootstrap` contract 或 server helper。
- [x] Bootstrap response 回傳 current user、current organization、membership/role、plan capabilities、feature flags、sidebar sections、default surface redirect。
- [x] 將 member/org/super/client route guard 與 navigation policy 對齊；手打 URL 不可比 sidebar 顯示更寬。
- [x] `/settings` 與 `/team/settings` 權限分離：前者 current member；後者 owner/admin，可對 manager scoped/read-only。
- [x] 同一使用者同時具備 member/org 權限時，明確回傳 surface switch entry，不把兩套 sidebar 混成一條長清單。
- [x] 若改 route/layout/session 行為，註記已讀的 Next.js bundled docs 章節。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；若改 API/guard，補 curl/script proof。

完成註記：2026-06-20 RAS-003 已完成 workspace bootstrap 與 route guard/settings split source proof。`/api/workspace/bootstrap?surface=...` 回傳 `navigation.sidebarSections`、`surfaceSwitches`、`defaultSurfaceRedirect`、`routeGuardAlignment`、`settingsRoutePolicy` 與 no-provider/no-db-write proof；`requireOrgAdmin()` / `requireOrgAdminRoute()` 走 `canReadWorkspaceOrgAggregate()`，manager 必須有 managed unit scope；`/team/settings` 改走 `requireOrgSettingsRoute()`，`/api/org/settings` 改走 `requireOrgSettingsAdmin()`，owner/admin only。`pnpm nav:workspace-bootstrap-qa` 與 `pnpm nav:route-guard-qa` 覆蓋 member、owner/admin、scoped manager、unscoped manager、AGENT 相容角色、quota exhausted disabled state、org surface 不混 member routes、手打 `/team` / `/team/settings` / `/super-admin` / `/client/*` 的 policy denial。此 proof 仍不是完整跨角色 Browser session QA；RAS-004 接 sidebar renderer，RAS-005 補 Browser/URL guard matrix。

### Batch RAS-004 — Sidebar renderer, surface switch, and legacy SPIN visibility
- [x] Sidebar renderer 改讀 RAS-003 navigation sections，保留現有 open/collapsed/mobile drawer、active rail、tooltip、aria-label、assistant action。
- [x] Member sidebar 第一屏保留 `今日` 與 `AI 工作台`；org admin sidebar 第一屏回答「誰需要輔導、下一步是什麼」；super admin sidebar 不混入 member routes。
- [x] `問誠問 AI` 可在不同 surface 顯示，但 assistant scope 文案或 payload 不跨越該 surface 的資料邊界。
- [x] `SPIN 舊版` 由 legacy feature flag 控制；`AI 了解客戶` `/interview` 保持新主入口。
- [x] `團隊管理`、`通訊處設定`、`個人設定` 依 role/capability 顯示，避免所有 membership 無差別看到 org-wide 設定。
- [x] Mobile drawer 第一屏顯示該角色最重要 section；collapsed state 不變成無層級 icon wall。
- [x] 符合 ARC-003：paper/ink/hairline、1px navy active rail、無滿版藍底、無重陰影、gold 只作稀有訊號。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`；用 Browser 做 desktop/mobile QA 並保存重要截圖。

進行註記：2026-06-20 完成 RAS-004a sidebar renderer contract adapter，但尚未把 `src/components/layout/sidebar.tsx` 接上。`buildWorkspaceSidebarRenderModel()` 會把 RAS-003 bootstrap sections 轉為 renderer-friendly `primarySections`、`surfaceSwitches`、`activeItemId` 與 action union，並以 `pnpm nav:sidebar-renderer-contract-qa` 覆蓋 member AI-first order、org aggregate assistant scope、surface switch、legacy SPIN feature flag、active state 與 no-provider/no-db-write proof。本輪刻意未修改既有 dirty 的 `src/components/layout/sidebar.tsx`（目前含其他工作新增 `/notes` entry），避免混入非本輪變更。

Whole-product review 註記（2026-06-20 after RAS-004a）：第五輪 LV3 校準確認 RAS-004a 已建立 renderer contract，但實際 sidebar UI / Browser proof 尚未完成。因 Supabase DB/DNS 仍阻擋 DB-backed theater/previsit/related-list proof，下一輪安全 fallback 為 `RAS-004b sidebar UI wiring`：讓 `src/components/layout/sidebar.tsx` 消費 `buildWorkspaceSidebarRenderModel()`，保留 AI-first IA、role-aware visibility、surface switch、legacy SPIN flag 與 mobile/collapsed/a11y polish，且不得混入既有 `/notes` dirty diff。若 DB/DNS 在下一輪前恢復，product-level primary 仍是 `ITA-003f/S1 Route B relationship-graph stage map (no-provider)`。

進行註記：2026-06-20 完成 RAS-004b sidebar UI wiring。新增 `src/components/layout/role-aware-sidebar.tsx`，由 server `src/app/(dashboard)/layout.tsx` 建立 member/orgAdmin render models 並傳入 `DashboardShell`；`DashboardShell` 改用 `RoleAwareSidebar`，未修改也未 staging 既有 dirty 的 legacy `src/components/layout/sidebar.tsx` `/notes` diff。新增 `pnpm nav:sidebar-ui-qa` 驗證 shell 不再 import legacy sidebar、layout server-side 建立 member/orgAdmin model、member/org assistant scope 分別為 `member-own-assigned` / `org-aggregate`、role-aware data-boundary hooks、mobile/collapsed/reduced-motion hooks，並以 Playwright-core fixture 保存 desktop/mobile 截圖。此 proof 不呼叫 provider、不寫 DB；live cross-role Browser/session matrix 與 assistant scope payload 行為仍留 RAS-005。

完成註記：2026-06-20 RAS-005 已補 RAS-004 殘留驗收。`pnpm nav:sidebar-cross-role-qa` 驗證 member 第一屏 `今日` / `AI 工作台`、member `問誠問 AI` scope=`member-own-assigned`、org admin / scoped manager `問誠問 AI` scope=`org-aggregate`、owner org settings/billing、scoped manager 無 billing/settings write nav、super admin platform fixture 不混 member routes、client viewer fixture 不混 dashboard routes。截圖：`docs/06_audits-and-reports/screenshots/modern-ui/sidebar-role-aware/ras-005-cross-role-matrix-desktop.png`、`ras-005-cross-role-matrix-mobile.png`。此 proof 為 fixture/source/headless Browser，不宣稱 production/staging live auth session matrix。

### Batch RAS-005 — Cross-role QA, docs sync, and AGENTS status update
- [x] 以 demo/mock session 或 resolver test fixture 驗證 collaborator、member、manager、org admin、org owner、support/finance/super admin、client viewer 的 sidebar 差異。
- [x] Browser 檢查 member desktop/mobile、org admin desktop/mobile、super admin route、client/share page 不出現越權導覽。
- [x] 手打 URL guard proof：一般 member 不能進 org settings write；manager 不能進 billing/plan write；client 不能進 dashboard；app session 不能進 super admin。
- [x] 檢查 console error、keyboard focus、tooltip、`aria-label`、reduced-motion、dark mode 基本可讀性。
- [x] 更新 `AGENTS.md` 與 `PLN-021` 完成狀態，在卡片註記變更檔案、QA 結果、截圖/proof 路徑。
- [x] 如發現需 operator 決策，新增或更新 `RES-016` issue-question，不把 blocker 寫成完成。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

完成註記：2026-06-20 新增 `scripts/role-aware-sidebar-cross-role-qa.mjs` 與 `pnpm nav:sidebar-cross-role-qa`；同輪將 `resolveWorkspaceRouteAccess()` 的 org write/billing route family（如 `/team/billing`、`/team/seats`、`/team/units`、`/team/invites`、`/api/org/units`、`/api/org/invites`、`/api/org/billing`）分流到 owner/admin settings policy，避免 scoped manager 只因可讀 org aggregate 而手打進 billing/plan write。`pnpm nav:route-guard-qa` 已覆蓋 manager billing/seats/org-units denial。未發現新的 operator decision，未更新 issue-question。

### Current Role-aware Sidebar Blockers
- RAS-005 已有可重複 fixture/source/headless Browser cross-role proof；正式 production/staging live auth session matrix 仍未宣稱通過，需有可用 session/access 才能補。
- 若改 route/layout/auth behavior，必須先讀 Next.js bundled docs。
- 若發現現有 auth/session helper 不足，先補 contract/helper，不直接繞過 route guard。
- Super admin、client portal、org admin 的正式入口仍受 PSA / auth provider / staging access 狀態影響；不可用 sidebar hide/show 取代 server guard。

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
- 三個 AI 目標是 `問誠問 AI`、`AI 了解客戶`、`AI 劇場演練`，每次 provider call 必須寫 `AiUsageLog`。
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
- [x] 建立 Sentry 或等價錯誤監控方案；若暫不接，寫 release blocker。
- [x] 建立 DB backup/restore 與 migration rollback note。
- [x] 建立 privacy / terms / AI disclaimer 最小頁面或 release blocker。
- [x] 建立 ECPay test flow checklist；正式收費開關預設關閉。
- [x] Full smoke：front office、member admin、org admin、super admin、client portal。
- [x] 保存 release QA evidence。
- [x] 跑 `pnpm lint:changed`、`pnpm exec tsc --noEmit --pretty false`、`pnpm prisma:validate`、`pnpm demo:preflight`、`pnpm demo:runtime-audit`。

進行中註記：2026-06-19 新增 `GET /api/platform/release-readiness`、`src/lib/platform/platform-release-readiness-repository.ts`、super-admin `Release readiness` / `AI quota warning` 面板與 `pnpm demo:release-readiness-qa`。Readiness API 只允許 platform user 讀取，一般 app session 403；回傳 current-month `AiUsageLog` aggregate、organization quota usage、pending/failed billing order count、mock/email/notification/billing/auth/monitoring/legal/backup/ECPay control gate。QA 通過 API 200/403、required controls、private seeded sentinel 0 leak、super-admin desktop Playwright screenshot、console error 0、無水平 overflow。此切片只完成 AI quota/cost alert 與 production controls visibility；Sentry/backup/legal/ECPay/full smoke 仍為 LCH-009 blocker。

進行中註記：2026-06-19 續補 release blocker 文檔與 public legal pages。新增 `/privacy`、`/terms`，兩頁皆標明 private beta 最小揭露、AI 輔助不構成保險/法律/稅務建議、正式公開上線前仍需法務/合規核可。新增 `ACC-007_release-rollback-and-backup-runbook.md` 與 `ACC-008_ecpay-test-flow-checklist.md`，readiness gate 的 legal_pages、backup_restore、ecpay_checklist 可由檔案存在與 QA 驗證轉為 pass；production monitoring、AI route usage audit、full smoke、正式 ECPay credentials/callback/CheckMacValue 與 production payment approval 仍是 blocker。

進行中註記：2026-06-19 新增 `pnpm ai:usage-audit` 與 `AUD-005_ai-usage-route-audit-v1.0.md`。Audit source + DB aggregate proof 顯示 production-minimum pass：`/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs`、`/api/ai/theater`、`/api/ai/theater/score`；gap：legacy `/api/ai/spin`、`/api/ai/spin-suggestions`、`/api/ai/visit`、`/api/ai/report` 缺 auth/quota/success/error `AiUsageLog`，`/api/rag` 為 placeholder 且缺 guard/quota。此項完成 audit evidence，不代表 legacy gap 已修復。

進行中註記：2026-06-19 續轉換 `/api/ai/visit` 與 `/api/ai/report`：兩條 route 改為 `requireCurrentMember()` session-scoped、server 端以 `clientId` 查 DB client、不再信任前端完整 client payload，並加入 `canUseAiModule()` quota guard；success path 寫 `AiUsageLog` 並 increment organization `monthlyAiUsed`，missing key / provider / empty / schema error path 寫 `AiUsageLog.error`。新增 `pnpm demo:ai-generation-qa`，驗證 unauth visit 401、demo member visit/report 200、response shape/markdown 正常、DB `VISIT`/`REPORT` success usage 各增加 `1→2`。`pnpm ai:usage-audit` 更新後剩餘 gaps：`/api/ai/spin`、`/api/ai/spin-suggestions`、`/api/rag`。

進行中註記：2026-06-19 續轉換 `/api/ai/spin` 與 `/api/ai/spin-suggestions`：兩條 route 改為 `requireCurrentMember()` session-scoped、前端只送 `clientId`，server 端讀 DB client 組 SPIN context，不再信任前端完整 `clientContext`；加入 `canUseAiModule(session, SPIN)` quota guard，success path 寫 `AiUsageLog` 並 increment organization `monthlyAiUsed`，missing key / provider / stream / suggestions error path 寫 `AiUsageLog.error`。新增到 `pnpm demo:ai-generation-qa`：unauth SPIN 401、demo member SPIN stream 200、SPIN suggestions 200、DB `SPIN` success usage `0→2`。`pnpm ai:usage-audit` 更新後唯一 gap：`/api/rag`。

進行中註記：2026-06-19 續處理 `/api/rag` launch posture：route 改為 `requireCurrentMember()` session-scoped 並加入 `canUseAiModule(session, RAG)` quota guard；private beta 期間一律回 `503 RAG_DISABLED_FOR_PRIVATE_BETA`、`launchPosture=disabled_guarded`、`providerAttempted=false`，不呼叫 provider、不寫假 `AiUsageLog`。`pnpm ai:usage-audit` 更新後 overall=`pass`、routesWithGaps=`[]`；新增 `pnpm rag:launch-posture-qa` 驗證 unauth 401、invalid input 400、demo member valid request 503 disabled、DB `RAG` usage count unchanged。

進行中註記：2026-06-19 新增 `pnpm demo:full-smoke-qa`，orchestration 執行 front office `public-pricing-qa`、member admin `demo-relogin-qa`、org admin `demo-org-coaching-ai-usage-qa`、super admin `demo-platform-read-qa`、client portal `client-portal-qa`；五個 surface command exit 0。Browser proof 覆蓋 `/pricing`、`/dashboard`、`/team`、`/super-admin`、`/share/demo-share-wang`，狀態皆 200、expected text 可見、console error 0、無水平 overflow。截圖保存到 `docs/06_audits-and-reports/screenshots/launch-readiness/lch-009/full-smoke/`；current-month `AiUsageLog` count 可讀且 full smoke 不新增 AI provider usage（`10→10`）。

進行中註記：2026-06-19 新增 `ACC-009_release-monitoring-setup-runbook.md` 與 `pnpm monitoring:readiness-qa`。Runbook 定義 `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` env contract、operator checklist、PII/cookie/authorization/prompt 禁止規則與 production ingestion proof 要求；QA 驗證一般 member 403、platform readiness 含 `monitoring` control、live gate 不輸出 DSN、source 使用 documented DSN OR contract，並用 dry-run 證明無 DSN=blocked、server/public DSN 任一存在=pass。此項完成「方案或 release blocker」要求；若部署環境未設定 DSN，readiness gate 仍會正確保持 monitoring blocked，不宣稱 production provider ingestion 已完成。

### Current Launch Blockers
- Auth provider 已改採 Auth.js / NextAuth；production 仍需 `AUTH_SECRET`、正式 provider/email/SSO 與 callback URL。
- `/api/rag` 已是 guarded disabled posture；若要 public RAG launch，仍需正式 provider/vector path 與 success/error `AiUsageLog`。
- Theater Route B 尚未 migration；若用 legacy Theater，只能標 staging demo。
- ECPay credentials、callback domain、CheckMacValue、notification/query API、refund/void process 尚未完成。
- Super admin platform auth/MFA/staging access 仍需 operator。
- Production monitoring runbook/env contract 已完成；public production 仍需 operator 設定 Sentry/等價 DSN、alert route 與不含 secret 的 sample ingestion proof。privacy/terms/AI disclaimer 與 backup/rollback 已有 private beta draft，但仍需正式 legal/compliance/operator sign-off。

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

TDF-005a handoff note（2026-06-20）：Route B compatibility brief 與 handoff contract 已先在 `src/domains/theater/route-b-handoff.ts`、`docs/06_audits-and-reports/AUD-007_theater-route-b-handoff-compatibility-brief-v1.0.md` 完成。後續 ITA-003 不需重寫 handoff；請以 `TheaterRouteBHandoffPacket` / `TheaterRouteBScene` / `TheaterRouteBCharacter[]` / director input / character input / visibility rules / state patches / AiUsage plan 為 migration source。尚未完成：Prisma schema、director provider route、character provider route、feedback route、success/error `AiUsageLog` proof、DB migration/rollback QA。

ITA-003a schema adapter note（2026-06-20）：已完成 Route B additive schema / typed persistence adapter 子切片。`prisma/schema.prisma` 新增 `TheaterCharacter`、`TheaterRouteBCharacterRole`、`TheaterRouteBVisibilityScope`，並在 `TheaterSession` 保留 Route B scene/source/state/visibility metadata、在 `TheaterTurn` 加 `speakerCharacterId` / `addresseeCharacterId` / `visibilityScope` / `directorDirective` / `statePatches`。`src/lib/theater/route-b-session-repository.ts` 可把 `TheaterRouteBHandoffPacket` 轉成 typed session / character / opening turn payload，legacy `personaType` / `tension` 僅作 compatibility，不作 Route B 新主流程。`pnpm theater:route-b-schema-dry-run` 通過，證明 group/private/director/narrator visibility、private 不外洩、state patch 不寫 confirmed CRM fact、director/character/feedback 仍需 `AiUsageLog`，且 no-provider/no-DB-write。尚未完成：正式 DB push/migration rollback QA、director provider route、character provider route、feedback route、success/error `AiUsageLog` runtime proof；因此 ITA-003 整卡仍保持未完成。

Whole-product review 註記（2026-06-20）：第五輪 LV3 校準確認 Route B 已跨過 handoff/schema adapter，但 immersive theater 的最大缺口已轉為 runtime proof。下一個最高槓桿子切片建議為 `ITA-003b Route B development migration + deterministic runtime BFF gate`：先確認 DB target 為 local/development/已授權 staging，做 additive migration proof 或 dry-run fallback，再補 director/character/feedback runtime route 的 guarded-disabled/no-provider 與 `AiUsageLog` success/error contract；若 DB target 不能確認，改先執行 `BFF-001` 全站資料來源盤點。

ITA-003b runtime gate note（2026-06-20）：已新增 deterministic Route B runtime BFF gate：`POST /api/theater/route-b/runtime`。`SESSION_DRAFT` 可用 handoff packet 產生 typed session draft summary；`DIRECTOR` / `CHARACTER` / `FEEDBACK` 在 `ENABLE_ROUTE_B_THEATER_PROVIDER` 未開啟時回 `503 ROUTE_B_PROVIDER_DISABLED`，明確證明 providerCallAttempted=false、aiUsageLogWritten=false、未偽造 usage，並保留 provider 啟用前必須補 success/error `AiUsageLog` 的 contract。`pnpm theater:route-b-runtime-qa` 通過 unauth 401、invalid 400、draft 200、director/character/feedback guarded-disabled、private visibility、state patch 不寫 confirmed CRM fact、response no private sentinel、`AiUsageLog` count before/after 不變。尚未完成：DB push/migration rollback QA、正式 persisted Route B session read/write、provider success/error path 與 session UI。

ITA-003c persisted session note（2026-06-20）：已完成 Route B persisted session read/write proof。新增 `src/lib/theater/route-b-boundary.ts` 共用 boundary guard、`src/lib/theater/route-b-session-bff-repository.ts` member-scoped BFF repository、`POST /api/theater/route-b/sessions` 與 `GET /api/theater/route-b/sessions/[sessionId]`；`TheaterCharacter.id` 改為 session-scoped DB id，`routeBCharacterId` 保留邏輯角色 id，讓同一 handoff 可重複建立。DB target 為目前 `.env` development Supabase Postgres，已執行 `pnpm exec prisma db push`（無 `--accept-data-loss`）並回報 in sync；首次 `--skip-generate` 嘗試因 Prisma 7 不支援該 option 失敗，已改用普通 `db push`。`pnpm theater:route-b-persistence-qa` 通過 unauth 401、invalid 400、create 201、owner read 200、manager read 404、DB rows `theater_sessions=1` / `theater_characters=3` / director-only opening turn=1、response no private sentinel、`AiUsageLog` count before/after 不變。`pnpm theater:route-b-runtime-qa` 仍通過。尚未完成：provider success/error `AiUsageLog` runtime proof、群/私聊 session UI 與五視角 feedback runtime。

ITA-003d session UI note（2026-06-20）：已完成 Route B persisted session UI/read surface。`/theater/build` 的完成 CTA 會用 `buildTheaterRouteBHandoff(packet, { routeBEnabled: true })` 建立 `POST /api/theater/route-b/sessions`，成功後導向 `/theater/[sessionId]`；`/theater/[sessionId]` 會先讀 persisted Route B DTO，渲染多角色舞台、角色卡、群聊/私聊 lane、導演開場、關係/旁白補問、visibility proof 與 provider guarded-disabled 狀態，legacy store session 仍僅作舊 quickstart/舊演練讀取。新增 `src/domains/theater/route-b-session.ts` 作 client-safe DTO type、`pnpm theater:route-b-session-ui-qa` 覆蓋 create session、owner browser read、manager 404、desktop/mobile no overflow、provider action disabled、response/page no private sentinel、`AiUsageLog` THEATER count before/after 不變。修正 `theater-client-build-qa` QA stamp，避免 timestamp 片段被電話 sentinel 誤判。尚未完成：Route B provider success/error `AiUsageLog` proof、真正群/私聊回合寫入、人物狀態更新互動與五視角 feedback runtime。

Whole-product review 註記（2026-06-20 after previsit redesign）：最新端到端校準確認 client/relationship graph/previsit package/theater handoff 已可串起，但 Route B session 仍停在 read-only guarded-disabled stage。下一個最高槓桿子切片建議為 `ITA-003e Route B persisted interaction write shell`：新增 owner-scoped advisor turn append / group-private lane selection / state patch proposal persistence，先不呼叫 provider；proof 必須覆蓋 member 201、manager 404、private visibility 不外洩、state patch 不寫 confirmed CRM fact、response no raw private sentinel、`AiUsageLog` count before/after 不變。若本切片被 provider/env 阻擋，fallback 為 `BFF-001` 全站資料來源盤點。

ITA-003e interaction shell note（2026-06-20）：已完成 Route B persisted interaction write shell。新增 `POST /api/theater/route-b/sessions/[sessionId]/turns` 與 `appendRouteBAdvisorTurnForMember()`，owner 可寫入顧問 `AGENT` turn，支援 `GROUP` / `PRIVATE` visibility、私聊 addressee routeBCharacterId、狀態筆記 proposal persistence；狀態 proposal 同步寫入 turn `statePatches` 與 session `sceneState.statePatches`，固定 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`，不觸發 provider。`/theater/[sessionId]` Route B stage 新增顧問互動 composer，私聊 lane 顯示指定角色私聊 turn，provider guard 仍維持 disabled。`pnpm theater:route-b-interaction-qa` 通過 unauth 401、member group/private 201、invalid private 400、manager 404、DB turn/state proof、browser submit proof、response/page no private sentinel、`AiUsageLog` THEATER count before/after 不變；in-app Browser 背景檢查 console error 0。尚未完成：Route B director/character/feedback provider success/error `AiUsageLog`、AI 角色回覆 orchestration 與五視角 feedback runtime。

Whole-product review 註記（2026-06-20 after RAS-001）：端到端 LV3 校準確認「建場」已可從 client / relationship graph / previsit / interview 進入 persisted Route B session，但劇場頁仍不像真正的演練舞台。下一個 product-level 最高槓桿子切片為 `ITA-003f/S1 Route B relationship-graph stage map (no-provider)`：`/theater/[sessionId]` 以 Route B characters/relationship evidence 呈現可操作舞台地圖，支援點人物進私聊、發言/被點名高亮、群/私聊 visibility badge、guarded-disabled runtime 狀態，不呼叫 provider；proof 覆蓋 member read、manager 404、private visibility、不寫 confirmed CRM fact、desktop/mobile no overflow。若 Supabase DB/DNS 仍不可用，立即 fallback 到 `RAS-002` resolver/policy tests，避免卡在 DB proof。

Whole-product review 註記（2026-06-20 after RAS-004a）：最新校準維持 `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` 為 product-level primary，因它直接補「關係圖 / 準備包 / 訪談草稿 -> 劇場舞台」的沉浸缺口；但目前 DB DNS 仍無法解析，下一輪若 DB 未恢復，先做 `RAS-004b` 讓 role-aware sidebar 實際落地到 UI。AMM meeting module、quick-capture notes、REL-004 edge table 都是後續 source gap；在未有 committed proof 或 schema approval 前，不取代 Route B stage map 作核心主線。

ITA-003g runtime preflight note（2026-06-21）：已完成 Route B director / character / feedback guarded runtime preflight，不呼叫 provider。`POST /api/theater/route-b/runtime` 現在會在 provider gate 前輸出 `runtimeInputPreview`，包含 `sourceAlignment.agentId=asai.theater.route_b`、action id（`route-b-director` / `route-b-character` / `route-b-feedback`）、必填欄位與 missing field、safe input contract、visibility summary、provider boundary、success/error `AiUsageLog` plan 與 `registryReadiness=internal-only`。缺 director utterance 或未知 character id 會回 `400 ROUTE_B_RUNTIME_PREFLIGHT_INVALID`，不再被包成 provider-disabled；provider 未啟用時仍回 `503 ROUTE_B_PROVIDER_DISABLED`，且 `providerCallAttempted=false`、`aiUsageLogWritten=false`。`asai.theater.route_b` manifest 已新增 runtime preflight capability / director-character-feedback actions / `RouteBRuntimeInputPreview` DTO refs。`pnpm theater:route-b-runtime-qa` 通過 unauth 401、invalid handoff 400、draft 200、director/character/feedback guarded-disabled、preflight 400、AgentFacts source alignment、visibility-safe history、private/provider sentinel 0、THEATER `AiUsageLog` count before/after 不變；`pnpm ai:protocol-registry-qa` 與 `pnpm ai:bff-audit` 仍通過。尚未完成：live provider success/error `AiUsageLog`、AI 角色回覆 orchestration、五視角 feedback runtime 與 operator provider approval。

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

## Theater Direct Field Guide Batch Tasks

Context: 解除 `/theater` 對 legacy SPIN / AI 了解客戶摘要的唯一入口依賴，讓 AI 劇場可直接用劇場半結構訪綱 B 建場，也可帶客戶資料建場或從既有訪談轉入。研究依據：`docs/07_research-and-design/RES-019_theater-direct-field-guide-gap-framework-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-020_theater-direct-field-guide-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-012_theater-direct-field-guide-acceptance-framework-v1.0.md`。本條是 ITA-003 Route B 前置切片：先做入口 IA、訪綱 B TS contract、setup draft 與 handoff packet；除 TDF-005 外不改 Theater legacy enum/scoring/schema。

### Current TDF Gaps
- `RES-019` 已確認 AI 劇場的前置條件應是「有可建場素材」，不是「必須先有 AI 了解客戶 / SPIN」。
- `/theater` 已完成三入口 IA、訪綱建場 prototype、previsit/client source review、高敏感 gate proof 與 TDF-006 跨狀態 QA；空素材可直進劇場訪綱建場，legacy SPIN quickstart 仍可轉入既有劇場演練。
- `RES-003` 劇場場域建構訪綱 B 已能產生 setup/build packet；下一個高槓桿缺口是把 setup draft 明確交接到 Route B 多角色 runtime。
- Route B 多角色、導演編排、群聊/私聊、人物狀態更新與五視角回饋已有 TDF-005 handoff contract；production runtime/schema 仍由 ITA-003/004/006 管理，不得順手改 legacy Theater schema。

### Batch TDF-000 — Workstream 文件與 AGENTS 登錄
- [x] 新增 `PLN-020`，拆成可逐張執行的 Theater Direct Field Guide batch tasks。
- [x] 新增 `ACC-012`，定義 direct setup、訪綱 B、setup draft、客戶資料建場、合規、QA 驗收。
- [x] 更新 `AGENTS.md`，新增 TDF workstream 鏡像。
- [x] 更新 `MAN-001` 文件索引。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch TDF-001 — Theater direct setup IA correction
- [x] `/theater` header 文案移除「必須先有 SPIN 摘要」語意，改成「選建場方式 → 確認素材 → 開始演練」。
- [x] 第一屏新增三入口 selector：`用劇場訪綱建場`、`帶客戶資料建場`、`從既有訪談轉入`。
- [x] 無 SPIN / interview material 時仍能選 `用劇場訪綱建場`，主 CTA 不因缺 SPIN disabled。
- [x] 既有 `fromSpin` / `spinId` quickstart path 保持可用，不破壞 Quickstart demo flow。
- [x] 空狀態改為引導劇場訪綱 B，不再要求先完成 AI 了解客戶。
- [x] 不改 Theater legacy enum、store schema、score route。
- [~] Browser QA：server-render 200 + route guard proof 通過；逐項 pixel/console 截圖待補。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`（並對新增檔案直接 `eslint`）。

完成註記：2026-06-19 `/theater` 改為 3-mode IA（`用劇場訪綱建場` / `帶客戶資料建場`（選填）/ `從既有訪談轉入`），預設不再強制選 SPIN/訪談來源；header 文案改「選建場方式 → 確認素材 → 開始演練」；空狀態引導改用劇場訪綱建場而非「先完成顧問陪談」。主 CTA 依 mode 切換 label/enabled，outline mode 永不 disabled。既有 `demo=quickstart` autoCreate 與 `spinId` 路徑保留。`帶客戶資料建場` 以 `/api/clients` 載入 owner-scoped 客戶，敏感/高敏感客戶需勾選確認才可建場。驗收：`pnpm exec tsc --noEmit` 0 error、新增/變更檔案 ESLint 0 error、`/theater` 與 `/theater/build` demo header 皆 200、`/api/ai/theater-build` unauth 401、invalid 400。變更檔案：`src/app/(dashboard)/theater/page.tsx`。

### Batch TDF-002 — 訪綱 B TS outline + setup draft contract
- [ ] 新增 `theaterFieldOutline`，沿用 `InterviewOutline` 型別，包含 7 段、核心題、追問、goal/dataSource/purpose、output schema。
- [ ] 新增 `TheaterSetupDraft`、`TheaterCharacterDraft`、`TheaterRelationDraft`、`TheaterMaterialSource`、`TheaterMaterialFactStatus` 等 pure types。
- [ ] 建立 mapping helper：outline answers/materials → setup draft，輸出場域概述、角色卡、關係張力、三層次摘要、核心場景、待確認問題。
- [ ] 每條素材可標記 `fact` / `confirmed` / `inference` / `unknown` 與 source reference。
- [ ] NPC draft 上限 ≤ 4；焦點客戶必須存在。
- [ ] 不呼叫 provider、不動 Prisma、不改 legacy Theater store。
- [ ] Unit/pure test 或 source-level proof：給定最小素材能產出 setup draft，未知項不被升格成 fact。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch TDF-003 — 劇場訪綱建場 prototype
- [x] `/theater` 點 `用劇場訪綱建場`（或帶客戶建場）開啟 full-page flow（`/theater/build`）。
- [x] 訪綱 B 依段落推進；AI 導演訪談員以 `currentSegmentId` 主導且 system prompt 明令不跳段，段落 stepper 可回看；允許標 `unknown`。
- [x] 右側顯示 setup draft review：場域、焦點客戶、角色、關係、異議、敏感點、已確認/推論/未知與旁白補問。
- [x] 使用者可編輯 draft（手動補素材，可選 確認事實/推論/待確認 與類別），保留 fact/inference/unknown 標記。
- [x] 完成 draft 後 CTA 明確標示 Route B（多角色演練）尚未啟用，先停在可確認的場域建構包。
- [x] 不把 draft 寫入 CRM；對話回答以 `INFERENCE` 收集，不被升格成 confirmed fact。
- [~] Browser QA：server-render 200 + route guard proof 通過；逐項 pixel/console 截圖待補。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`（新增檔案直接 `eslint`）。

完成註記：2026-06-19 新增 `/theater/build` 全頁建場流程與 `POST /api/ai/theater-build` 串流路由。Setup draft 直接消費既有 `buildTheaterFieldBuildContext` / `TheaterBuildPacket`（PIM-003 contract，等同 TDF-002 setup draft contract，故未另建 `TheaterSetupDraft` 重複型別）。AI 路由以 `requireCurrentMember()` 推導 org/member/unit，套 `canUseAiModule(THEATER)` quota（429），成功/失敗皆寫 `AiUsageLog`（module THEATER）並 increment `monthlyAiUsed`；不改 Theater legacy enum/scoring/score route。`帶客戶資料建場` 經 `clientId` 由 `/api/clients/[id]` 預載 owner-scoped 已知素材作 seed（fact/inference/unknown 分類），完整 server-side compliance gate 仍歸 TDF-004。變更檔案：`src/app/(dashboard)/theater/build/page.tsx`、`src/app/api/ai/theater-build/route.ts`、`src/lib/theater/theater-build-ai-repository.ts`。

UX 對齊註記：2026-06-19 依 operator 要求把 `/theater/build` 介面對齊 `AI 了解客戶`（`/interview`）：採同一「conversation hero + ModeToggle（文字/語音）+ 右側 Sheet drawer」版型，場域建構包/角色/素材分層/手動補素材/完成建場全部收進右側抽屜，第一屏只留乾淨對話。新增語音輸入輔助：以 Web Speech API（`zh-TW`，`webkitSpeechRecognition` fallback）做即時聽寫進 composer，含 mic consent、聽取/暫停/權限被拒/不支援狀態與 interim 轉寫顯示；只保留文字轉寫、不保存原始語音，瀏覽器不支援時自動回退文字。`pnpm exec tsc --noEmit` 0 error、該檔 ESLint 0 error、`/theater/build` demo header 200。

### Batch TDF-004 — 客戶資料一鍵建場與合規 gate
- [ ] 建立 server/service contract：`buildTheaterMaterialFromClient(clientId)` 或同等 BFF，scope 由 `requireCurrentMember()` 推導。
- [ ] 載入 client / family / policy / visit / confirmed interview facts，輸出 known facts、missing fields、inferences、sensitivity warnings。
- [ ] `/theater` `帶客戶資料建場` 可選 owner 可讀客戶；org manager 不得讀 member 客戶明細。
- [ ] `sensitivityLevel` 高敏感客戶需 explicit confirmation、reason、riskAccepted 才可建場。
- [ ] setup draft review 可區分已知、待確認、推論；未知項可轉成旁白 NPC 待問問題。
- [ ] 不刪改 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [ ] API proof：unauth 401、越權 403、高敏感缺 reason blocked、正常 demo client 可產出 draft。
- [ ] Browser QA：desktop/mobile 建場流程、錯誤狀態、console error 0。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；動 schema 才跑 Prisma。

進行中註記：2026-06-20 新增 LV3 pre-visit → theater handoff source/proof slice：`src/domains/theater/visit-handoff.ts` 可把 `VisitPlan`、`Client`、準備包 SPIN question reasoning evidence、family/policy/objection/material/compliance gap 轉成 `TheaterBuildPacket` 已知素材，保留 `FACT` / `INFERENCE` / `UNKNOWN` 分層；高敏感客戶缺 `reason`/`riskAccepted` 時回 `BLOCKED_SENSITIVE` 且 `canStartSimulation=false`。本 slice 不建立 BFF、不宣稱 TDF-004 完成、不改 Theater legacy enum/scoring/schema、不呼叫 provider、不寫 CRM。Proof：`pnpm visit:theater-handoff-dry-run` 通過，確認 READY packet、NPC ≤ 4、未知不升格成 fact、email/phone 不外洩。

進行中註記：2026-06-20 續補 member-scoped persisted visit package → theater build BFF proof：新增 `GET /api/visits/[id]/theater-handoff`，由 `requireCurrentMember()` 推導 org/member/unit，讀 DB `VisitPlan` + client detail policy，回傳 client-safe summary、knownMaterials、warnings/missing、`TheaterBuildPacket`。`/theater/build?visitPlanId=...` 會優先讀此 server-owned handoff，失敗才退回舊 `clientId` 預載。新增 `pnpm visit:theater-bff-qa` 覆蓋 unauth 401、missing 404、demo persisted visit 200、email/phone/raw private sentinel 0、desktop/mobile theater build 無 overflow。TDF-004 仍未完成，因為尚未提供完整 client selector、高敏感 reason/riskAccepted UI 與 full customer-data build review flow。

進行中註記：2026-06-20 續補 persisted visit package → theater build 高敏感 gate：`GET /api/visits/[id]/theater-handoff` 保持 read-only，新增 `POST /api/visits/[id]/theater-handoff` 僅接受 `riskAccepted=true` 與 8 字以上 reason，通過後寫 `InteractionEvent` audit（metadata source `visit_theater_handoff_approval`）並回傳 READY handoff；`/theater/build?visitPlanId=...&source=previsit` 新增準備包來源審查 panel，顯示 known facts / inferences / unknowns source counts、source preview 與高敏感確認 UI，approval 後才允許進 setup review。新增 `pnpm visit:theater-gate-qa` 覆蓋 unauth 401、高敏感缺 approval blocked、invalid approval 400、approved audit write、email/phone/raw private sentinel 0、desktop/mobile no overflow 與 no-provider proof。TDF-004 仍未完成，因為 `/theater` client selector、越權 403 與完整 owner-readable client-data build flow 尚待補。

進行中註記：2026-06-20 續補 `/theater` client selector + owner-scoped client-data build review：新增 `src/domains/theater/client-build.ts` pure builder、`src/lib/theater/client-build-repository.ts`、`GET /api/theater/client-builds` 與 `GET /api/theater/client-builds/[clientId]`。列表只回 owner-readable client build options；detail 由 current member scope 推導 org/member/unit，同 org 但非 owner 回 `403 CLIENT_FORBIDDEN`。`/theater` 的 `帶客戶資料建場` 改讀此 BFF，選客戶後先顯示 known facts / inference / unknown review；`/theater/build?clientId=...&source=client` 也改讀同一 BFF，移除舊 `/api/clients/[id]` fallback。高敏感 client 直建場回 `BLOCKED_SENSITIVE` 且 `canStartSimulation=false`，需改走準備包 high-sensitive approval flow。新增 `pnpm theater:client-build-qa` 覆蓋 unauth 401、member 200、manager 403、高敏感 blocked、email/phone/raw private sentinel 0、desktop/mobile no overflow 與 no-provider proof。TDF-004 仍未完成，因 Route B multi-character session 與完整 production theater migration 另屬 TDF-005/ITA-003。

### Batch TDF-005 — Route B handoff packet for multi-character Theater
- [x] 撰寫 migration/compatibility brief：legacy `personaType`、`tension`、`score` 與新 `TheaterCharacter` / feedback 的切換策略。
- [x] 定義 `TheaterSetupDraft -> TheaterScene -> TheaterCharacter[]` handoff contract。
- [x] 定義 director input：場景狀態、scoped history、角色卡、visibility rules、業務員 utterance。
- [x] 定義 character call input：角色卡、addressee、visibility scope、director directive、可見歷史。
- [x] 定義 AiUsageLog 策略：director call、character call、feedback call 都要可追蹤。
- [x] 定義 rollback note：Route B 未啟用時 `/theater` 可停在 setup draft，不宣稱 production multi-character theater。
- [x] 更新 `PLN-015` ITA-003 references，避免雙重任務來源互相打架。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；若動 schema 需 Prisma。

Whole-product review 註記（2026-06-20）：本輪第五輪校準將下一個最高槓桿切片選為 `TDF-005a Route B handoff packet and migration compatibility brief`。不要直接做 Theater schema migration；先定義 setup draft 如何映射成 scene/characters、director input、character input、群聊/私聊 visibility scope、人物狀態更新 rollback boundary、director/character/feedback `AiUsageLog` 策略與 legacy compatibility note，並同步 `PLN-015` ITA-003 references。

完成註記（2026-06-20）：新增 `src/domains/theater/route-b-handoff.ts` deterministic handoff contract，將 `TheaterBuildPacket` 映射成 `TheaterRouteBScene` / `TheaterRouteBCharacter[]` / visibility rules / state patches / director input / character input / AiUsage plan / runtime rollback boundary；`docs/06_audits-and-reports/AUD-007_theater-route-b-handoff-compatibility-brief-v1.0.md` 記錄 legacy `personaType`、`tension`、`score` 相容策略與 ITA-003 接手邊界。`pnpm theater:route-b-handoff-dry-run` 通過，覆蓋 NPC ≤ 4、unknown 不升格、private/group scoped history、state patch 不寫 confirmed CRM fact、director/character/feedback `AiUsageLog` 要求、Route B disabled rollback 與 no-provider proof。未動 Prisma schema、不呼叫 provider、不寫 DB；production multi-character Theater 仍需 ITA-003/ITA-006 實作。

### Batch TDF-006 — Cross-state QA and docs sync
- [x] `/theater` 無素材狀態可直接開始劇場訪綱 B。
- [x] `/theater` 有 legacy SPIN / interview material 時，`從既有訪談轉入` 仍可用。
- [x] `/theater` 帶客戶資料建場的 known/gap/inference review 通過。
- [x] 高敏感客戶建場 gate 與 audit proof 通過。
- [x] Browser QA 保存 desktop/mobile 截圖到 `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/`。
- [x] 更新 `AGENTS.md`、`PLN-020`、必要 report / issue-question。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma 與 Browser QA。

完成註記：2026-06-20 新增 `pnpm theater:direct-field-qa` 聚合驗收，串起 `/theater` 空素材直建場、`/theater/build` 獨立建場入口、legacy SPIN quickstart → theater view、TDF-005 Route B handoff dry-run、previsit high-sensitive gate/audit proof 與 client-build selector/owner-scope proof。截圖保存於 `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/`。本輪不改 Prisma schema、不呼叫 provider、不改 Theater legacy enum/scoring/schema；production multi-character Theater 仍歸 ITA-003/ITA-006。

### Current TDF Blockers
- TDF-004 需要 session/BFF guard 可安全推導 current member scope；若 guard 尚未完成，先做 service contract + mocked/demo proof，不宣稱 production-ready。
- 高敏感客戶進劇場需 explicit confirmation、reason、riskAccepted；不得繞過。
- Route B 多角色 schema / director / visibility scope 仍歸 `PLN-015` ITA-003 / ITA-006；TDF-005 只做 handoff packet，除非本輪明確切入 ITA-003。
- Supabase pgvector / RAG 不應成為 TDF-001..TDF-003 的依賴。

---

## Realtime Voice × Park-style Interview Memory Batch Tasks

Context: 將兩個 AI 訪談（顧問陪談訪綱 A、劇場場域建構訪綱 B）升級為可用中文語音/文字進行的連續訪談，並導入 Park et al. `Memory Stream -> Reflection -> Planning` 運作架構。架構依據：`docs/02_architecture-and-rules/ARC-007_realtime-voice-and-park-memory-interview-architecture-v1.0.md`；研究依據：`docs/07_research-and-design/RES-017_chinese-realtime-voice-and-park-memory-interview-research-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-010_realtime-voice-park-memory-interview-acceptance-framework-v1.0.md`。本條只做**兩個 AI 訪談的記憶、反思、規劃、語音 shell/realtime 接入與 confirmation/writeback 邊界**；不取代 SPIN legacy、不直接完成 Theater Route B 全量 migration、不預設保存 raw audio。

### Current PIM Gaps
- `/interview` 已有文字訪談、中文語音 Beta shell、composition guard、Realtime session BFF 與 event mirror；production/live Realtime provider proof 尚未執行。
- 訪綱 A 與訪綱 B 已共用 Park memory domain contracts；劇場場域建構可產生 `TheaterBuildPacket`，完整 Theater Route B migration 仍屬 `PLN-015`。
- 訪談 turn、memory、reflection 已 DB 化，並提供 owner-scoped BFF routes；reflection/planning 已拆成可測 service 與 BFF route。
- Confirmation card 與 CRM/writeback boundary 已完成；confirmed fact / inference / unknown 會先經人工確認卡，再依 server boundary 寫成 CRM candidate、interview insight 或 follow-up task。
- PIM-010 已補上 LV3 expansion gap：AI 訪談可把確認卡素材建立為 persisted `VisitPlan` 草稿或 Route B theater session draft；後續焦點轉回 SPIN source-truth、Route B provider orchestration 或 live Realtime provider proof。
- PIM-011 已完成 committed baseline：quick-capture -> Park memory bridge 具 domain contract、BFF/API persistence、cross-role denial、refresh/new-context DB readback、`/pre-visit/[id]/notes` UI selector 與 desktop/mobile browser proof；AMM meeting workspace prototype 仍未納入正式 baseline。

### Batch PIM-000 — 架構文件與 workstream 登錄
- [x] 新增 `ARC-007`，明確定義兩個 AI 訪談共用 Park-style runtime architecture。
- [x] 新增 `PLN-018`，拆成可逐張執行的 PIM batch tasks。
- [x] 新增 `ACC-010`，定義語音、memory、reflection、planning、writeback、QA 驗收。
- [x] 更新 `AGENTS.md` 新 workstream，與本文件卡片狀態同步。
- [x] 更新 `MAN-000` 文件數量與 `MAN-001` 文件索引。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 `ARC-007` / `PLN-018` / `ACC-010`，並同步 `AGENTS.md`、`MAN-000`、`MAN-001`。驗收：`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 通過。下一張最低未完成卡為 PIM-001。

### Batch PIM-001 — Memory domain contracts + pure services
- [x] 在 `src/domains/interview/` 新增或擴充 `InterviewKind`、`InterviewModality`、`InterviewMemory`、`InterviewReflection`、`InterviewMicroPlan` 型別。
- [x] 新增 memory candidate extraction pure service，將 user/assistant turn 轉成 `fact` / `inference` / `unknown` / `instruction` 候選。
- [x] 新增 retrieval scoring pure helper：relevance、importance、recency、outline match、scope filters。
- [x] 新增 correction/supersede helper，確保 transcript 修正後舊 memory 不再當 confirmed fact。
- [x] 新增 unit tests 或 dry-run script，覆蓋顧問陪談與劇場場域建構 memory candidate。
- [x] 不新增 DB、不改 AI route、不保存 raw audio。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 `src/domains/interview/memory.ts` 與 `InterviewMemory` / `InterviewReflection` / `InterviewMicroPlan` 等 domain contract，並加入 `pnpm interview:memory-dry-run` 覆蓋顧問陪談 confirmed fact、劇場 inference、voice transcript unknown、correction/supersede 與 retrieval ranking。驗收：`pnpm interview:memory-dry-run`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 通過。下一張最低未完成卡為 PIM-002。

### Batch PIM-002 — 顧問陪談 Park memory loop
- [x] `/api/ai/interview` 使用 memory extraction 結果建立 session-local memory stream。
- [x] AI 回應前先做 scoped retrieval，prompt 中明確區分 confirmed facts / inferences / unknowns。
- [x] 產生 `InterviewMicroPlan`，UI 顯示「為什麼問這題」或可供 debug/QA 的 plan evidence。
- [x] `/api/ai/interview/outputs` 消費 memory stream / reflection / supporting memory IDs，而不只吃 messages。
- [x] 顧問陪談不重問已 confirmed facts；轉寫/輸入不確定時先確認。
- [x] 每次 AI call 成功/錯誤皆寫 `AiUsageLog`。
- [x] API proof：多輪對話中已確認事實不被重問，output draft 帶 supporting memory IDs。
- [x] Browser proof：`/interview` desktop/mobile 無 console error、無水平 overflow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 `src/domains/interview/park-loop.ts`，讓 `/api/ai/interview` 與 `/api/ai/interview/outputs` 共用 session-local memory stream、retrieval partition、micro-plan 與 evidence IDs。UI 於 `/interview` 顯示「下一題計畫」與 supporting memory IDs。驗收：`pnpm interview:park-loop-dry-run`、`pnpm interview:memory-dry-run`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm build` 通過；Browser proof desktop/mobile console error 0、無水平 overflow，且合成回答送出後顯示 plan evidence。截圖：`docs/06_audits-and-reports/screenshots/pim/pim-002-interview-desktop.png`、`docs/06_audits-and-reports/screenshots/pim/pim-002-interview-mobile.png`。下一張最低未完成卡為 PIM-003。

### Batch PIM-003 — 劇場場域建構 Park memory loop
- [x] 萃取或補齊 theater field outline runtime entry，使用 `InterviewKind.THEATER_FIELD_BUILD`。
- [x] 將場景、角色、關係、異議、敏感資料與未知缺口轉成 memory candidates。
- [x] Reflection 判斷焦點客戶、NPC 必要性、已知/推論/未知、旁白 NPC 需補問項。
- [x] 產生 `TheaterBuildPacket`，只把 confirmed facts 當事實，inferred persona 保持推論語氣。
- [x] 若資料不足，不生成可演練劇場；改回補問或旁白 NPC question list。
- [x] 不改 Theater legacy enum/scoring；若要接 Route B schema，需依 ITA-003/ITA-006 migration note。
- [x] API/source-level proof：build packet 不含未確認 fact leakage，NPC <= 4。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；動 schema 才跑 Prisma。

完成註記：2026-06-19 已新增 `theaterFieldBuildOutline`、`TheaterBuildPacket` contract 與 `src/domains/interview/theater-build.ts`，可將劇場場景/角色/關係/異議/敏感點/未知缺口轉為 Park memory stream、reflection 與 Route B build packet。`pnpm interview:theater-build-dry-run` 覆蓋 READY packet、資料不足 `NEEDS_MORE_INFO`、NPC <= 4、推論不混入 confirmed facts、未知缺口轉 narrator questions。驗收：`pnpm interview:theater-build-dry-run`、`pnpm interview:park-loop-dry-run`、`pnpm interview:memory-dry-run`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed`、針對新增檔案 ESLint、`pnpm build` 通過。下一張最低未完成卡為 PIM-004。

### Batch PIM-004 — `/interview` 中文語音 UX shell
- [x] `/interview` 新增 mode toggle：文字訪談 / 中文語音訪談 Beta。
- [x] 顯示 mic consent：使用麥克風、預設不保存 raw audio、只保存 transcript/structured memory。
- [x] 顯示 live voice stage：未連線、聽取中、AI 思考中、AI 回覆中、已暫停。
- [x] 顯示 live transcript panel，支援 transcript correction UI 與 `correction` memory placeholder。
- [x] 顯示 memory rail：已確認、推論、待確認、本段訪綱進度。
- [x] 提供 text fallback；browser 不支援 mic 或 permission denied 時不阻斷文字模式。
- [x] 不呼叫 production Realtime、不保存 raw audio。
- [x] Browser proof：desktop/mobile、permission denied、fallback、console error 0、無水平 overflow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已在 `/interview` 補上文字/中文語音 Beta 切換、mic consent、voice stage、live transcript/correction placeholder、memory rail 與文字 fallback；`Textarea` 加入 composition guard，避免中文輸入組字期間 Enter 被誤送出。本輪不接 Realtime provider、不保存 raw audio。驗收：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/app/(dashboard)/interview/page.tsx`、`pnpm run lint:changed`、三個 PIM dry-run、`pnpm build` 通過；Browser proof desktop/mobile console error 0、無水平 overflow；headless Chrome smoke 覆蓋 permission denied/unsupported fallback。截圖：`docs/06_audits-and-reports/screenshots/pim/pim-004-interview-desktop.png`、`docs/06_audits-and-reports/screenshots/pim/pim-004-interview-mobile.png`。下一張最低未完成卡為 PIM-005。

### Batch PIM-005 — Realtime session BFF + event mirror
- [x] 新增 `POST /api/ai/interview/realtime-session`，用 `requireCurrentMember()` 推導 org/member/unit。
- [x] 套 `canUseAiModule(session, INTERVIEW)`；超限回 429，不 mint realtime token。
- [x] Mint short-lived ephemeral Realtime session token；不得把 server API key 下放 browser。
- [x] 新增 `POST /api/ai/interview/realtime-events`，只接 final transcript、assistant transcript、interrupt、correction、confirmation 等非 secret event。
- [x] final transcript event 進 memory extraction；raw audio 預設不保存。
- [x] Realtime provider success/error/usage metadata 可取得時寫 `AiUsageLog`；若 provider usage metadata 不足，至少記 session marker 與 event proof，不得偽造 cost。
- [x] API proof：unauth 401、quota 429、member 200、event mirror 200、secret 不出現在 response/log/report。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 `src/lib/interview/realtime-bff.ts`、`/api/ai/interview/realtime-session` 與 `/api/ai/interview/realtime-events`。Session route 使用 `requireCurrentMember()` + `canUseAiModule(INTERVIEW)`，production path 透過 OpenAI `/v1/realtime/client_secrets` mint short-lived client secret，non-production dry-run path 可驗證 member 200 / quota 429 / no server API key leak；成功/失敗皆寫 `AiUsageLog` marker，不偽造 token/cost。Event mirror 只接受 final transcript、assistant transcript、interrupt、correction、confirmation，拒收 token/cookie/raw audio/base64 欄位，final transcript 會產生 `VOICE_TRANSCRIPT` memory candidate，raw audio 預設不保存。新增 `pnpm interview:realtime-bff-qa` 覆蓋 helper、unauth 401、quota 429、member dry-run 200、event mirror 200、raw-audio reject；`pnpm ai:usage-audit` 已納入兩條新 route。驗收：`pnpm interview:realtime-bff-qa`、三個 PIM dry-run、`pnpm ai:usage-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed`、`pnpm build` 通過。下一張最低未完成卡為 PIM-006。

### Batch PIM-006 — Prisma persistence for turns/memory/reflection
- [x] Prisma 新增或調整 `InterviewSession`、`InterviewTurn`、`InterviewMemory`、`InterviewReflection`。
- [x] 所有 records 有 `organizationId`；client-bound records 有可驗證 `clientId`；必要時帶 `unitId`。
- [x] 建立 repository / DTO，不讓 client 直接 import Prisma/domain DB layer。
- [x] Backfill/seed strategy idempotent，只處理 demo 或新表，不破壞真實資料。
- [x] Org manager API 不回逐字稿、memory text、client detail。
- [x] 動 schema 跑 `pnpm prisma:validate`、`pnpm prisma:generate`、local/development `db push` 或 migration dry-run。
- [x] API proof：建立 session、turn、memory、reflection；重新登入/清空 storage 後可讀。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 `InterviewSession`、`InterviewTurn`、`InterviewMemory`、`InterviewReflection` schema 與 owner-scoped BFF routes：`POST /api/ai/interview/sessions`、`GET /api/ai/interview/sessions/[sessionId]`、`POST /turns`、`POST /reflections`。`src/lib/interview/interview-persistence-repository.ts` 負責 DTO/repository 邊界，client 不直接 import Prisma；turn append 會沿用 Park-style memory extraction 產生 DB memory candidate；reflection 只接受同 session supporting memory IDs。DB target 為目前 `.env` Supabase Postgres development target，已執行 additive `pnpm exec prisma db push` 且無 data-loss prompt。新增 `pnpm interview:persistence-qa` 覆蓋 unauth 401、member create/turn/memory/reflection、stateless snapshot read、manager 404 privacy guard 與 no raw audio payload。驗收：`pnpm prisma:validate`、`pnpm prisma:generate`、`pnpm exec prisma db push`、`pnpm interview:persistence-qa`、四個 PIM proof、`pnpm ai:usage-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed`、`pnpm build` 通過。下一張最低未完成卡為 PIM-007。

### Batch PIM-007 — Reflection + planning service/routes
- [x] 新增 reflection service，輸入 scoped memory，輸出 `InterviewReflection`，保留 supporting memory IDs。
- [x] 新增 planning service，輸入 current segment、retrieved memories、latest reflection、Issue/PQ context，輸出 `InterviewMicroPlan`。
- [x] 可選新增 `POST /api/ai/interview/reflections` 與 `POST /api/ai/interview/plans`，或先以 server-only service 接入 existing route。
- [x] Reflection output 必須分 confirmed facts / inferred patterns / unknowns。
- [x] Planning 不得跳段、不重問 confirmed fact、不把 inference 當 fact。
- [x] 每次 AI call 寫 `AiUsageLog`；缺 provider/quota/provider error 也記錄。
- [x] API/source proof：supporting memory IDs 存在，reflection 不含 raw private payload。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 `src/domains/interview/reflection-planning.ts`，把 Park-style reflection/planning 拆成 deterministic pure service，支援 `ADVISOR_COMPANION` 與 `THEATER_FIELD_BUILD` outline。新增 `src/lib/interview/interview-reflection-planning-repository.ts` 與 BFF routes：`POST /api/ai/interview/sessions/[sessionId]/reflections/generate`、`POST /api/ai/interview/sessions/[sessionId]/plans`。本輪不新增 provider call，因此無新增 `AiUsageLog` event；既有 AI route usage audit 仍通過。新增 `pnpm interview:reflection-planning-qa` 覆蓋 unauth 401、member session/turns、generated reflection persisted、confirmed/inference/unknown 分流、supporting memory IDs、no raw payload fields、plan 優先追問 unknown、不重問 confirmed fact、inference guard、manager 404 privacy guard。驗收：`pnpm interview:reflection-planning-qa`、四個 PIM proof、`pnpm ai:usage-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed`、新增檔案 ESLint、`pnpm build` 通過。下一張最低未完成卡為 PIM-008。

### Batch PIM-008 — Confirmation card + CRM/writeback boundary
- [x] `/interview` 顧問陪談結束/段落結束顯示 confirmation card。
- [x] confirmed fact + user checked 才可寫回 CRM candidate；inference 只能保存為 interview insight。
- [x] unknown 轉成 follow-up question/task 或 Theater narrator question。
- [x] 高敏感資料寫回需要 explicit confirmation、reason/riskAccepted 或標記為不可寫回。
- [x] 所有 writeback 建立 audit/interaction event。
- [x] API proof：inference checked 不會變成 CRM fact；confirmed fact checked 才可 writeback。
- [x] Browser proof：desktop/mobile 可勾選、取消、保存、錯誤狀態。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 `src/domains/interview/writeback-boundary.ts`、`src/lib/interview/interview-writeback-repository.ts` 與 BFF route `GET/POST /api/ai/interview/sessions/[sessionId]/writebacks`。`/interview` 現可用 CRM 客戶 selector 建立 DB-backed session，段落確認卡支援 confirmed/inference/unknown 候選、checkbox、取消、高敏感理由/riskAccepted 與保存結果；server 端保證 inference 只會成為 interview insight，unknown 成為 follow-up task，confirmed + checked + 高敏感 approval 才會建立 CRM candidate interaction event。驗收：`pnpm interview:writeback-qa`、`pnpm interview:writeback-browser-qa`、PIM regression、`pnpm ai:usage-audit`、`pnpm exec tsc --noEmit --pretty false`、新增檔案 ESLint、`pnpm run lint:changed`、`pnpm build` 通過。截圖：`docs/06_audits-and-reports/screenshots/pim/pim-008-writeback/pim-008-interview-desktop.png`、`docs/06_audits-and-reports/screenshots/pim/pim-008-writeback/pim-008-interview-mobile.png`。下一張最低未完成卡為 PIM-009。

### Batch PIM-009 — Cross-mode QA, docs sync, rollback notes
- [x] 顧問陪談文字模式 multi-turn proof：不重問 confirmed fact，output draft 帶 memory evidence。
- [x] 劇場場域建構 proof：build packet 分 confirmed/inference/unknown，NPC <= 4。
- [x] 語音 shell proof：mic consent、permission denied、fallback、correction UI。
- [x] Persistence proof：清空 browser storage 後 session/memory 可從 DB 恢復。
- [x] Privacy proof：org manager aggregate API 不回 transcript/memory/client private payload。
- [x] Rollback note：voice provider disabled、memory persistence disabled、schema rollback 或 migration revert strategy。
- [x] 更新 `AGENTS.md`、`PLN-018`、必要 report / issue-question。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma 與 Browser QA。

完成註記：2026-06-19 新增 `pnpm interview:cross-mode-qa` 作為 PIM release-candidate proof，串接 advisor/theater/voice shell/persistence/reflection/writeback/browser/privacy 驗收。`PLN-018` 已補 rollback note：voice provider 可停用回文字 fallback、memory persistence 可停用回 request-local stream、schema rollback 必須以 approved reverse migration 或 unused additive tables 處理、CRM writeback rollback 保留 audit trail、manager aggregate API 不得讀 transcript/memory/client private payload。驗收：`pnpm interview:cross-mode-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed` 通過。PIM workstream code/docs/proof 已可交接；live Realtime provider proof、raw audio retention 與 production migration approval 仍是 blockers。

### Batch PIM-010 — Interview -> VisitPlan / Theater draft writeback
- [x] 新增或擴充 writeback target：`VISIT_PLAN_DRAFT` 與 `THEATER_BUILD_DRAFT`，只接受已確認或明確標示 inference/unknown 的素材。
- [x] `VISIT_PLAN_DRAFT` 透過現有 `/api/visits` / visit repository 建立 persisted `VisitPlan` 草稿，保留 facts / inferences / unknowns / reasoning evidence，不保存 raw transcript 或 raw provider payload。
- [x] `THEATER_BUILD_DRAFT` 透過現有 Theater build packet / Route B session boundary 建立可 review 的 stage draft 或 DB-backed Route B session，未知項轉 narrator questions，NPC <= 4。
- [x] 高敏感 client 仍需 reason/riskAccepted；inference 不得寫成 confirmed CRM fact。
- [x] API proof：unauth 401、member 201、manager/foreign 404、高敏感缺 approval blocked、response no raw private sentinel。
- [x] Browser proof：`/interview` confirmation card 可選「建立準備包草稿」或「建立劇場草稿」，完成後導向 `/pre-visit/[id]` 或 `/theater/build` / `/theater/[sessionId]`，desktop/mobile 無水平 overflow。
- [x] No-provider proof：本切片不呼叫 OpenAI/Anthropic；`AiUsageLog` count before/after 不變。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review 註記（2026-06-20）：第五輪校準後下一個最高槓桿實作切片建議為 `PIM-010 Interview -> VisitPlan / Theater draft writeback`。原因：client/relationship/previsit/theater shell 已有 server-owned proof，但「AI 訪談建立或補強準備包與劇場」仍停在 CRM candidate/insight/task；本切片可不動 schema、不呼叫 provider，直接串起 interview -> previsit -> theater。

完成註記：2026-06-20 已在 confirmation/writeback boundary 增加 `VISIT_PLAN_DRAFT` / `THEATER_BUILD_DRAFT`，`/interview` 確認卡可建立 persisted `VisitPlan` 草稿或 DB-backed Route B theater session。高敏感缺 draft reason/riskAccepted 會 blocked；approved writeback 保留 facts/inferences/unknowns/reasoning evidence，未知項轉 narrator questions，NPC <= 4，且不建立 confirmed CRM fact。Proof：`pnpm interview:draft-writeback-qa` 通過 API/DB/browser/no-provider；`DEMO_QA_BASE_URL=http://localhost:3031 pnpm interview:writeback-qa` regression 通過。

### Batch PIM-011 — Post-visit quick-capture -> Park memory bridge
- [x] Advisor workflow / onboarding：定義顧問從 `/pre-visit/[id]/notes`、全站 quick-capture 或 meeting workspace 捕捉一則 post-visit note 後，下一步只需選「歸客戶/歸拜訪/保持私人草稿/轉成待確認」之一，不要求一開始就完整分類。
- [x] Source-of-truth / BFF：quick-capture bridge 由 server session 推導 organization/member/unit/client/visit scope；可先以 existing `InterviewSession` / `InterviewTurn` / `InterviewMemory` 建立 no-schema adapter，不新增未核可 production migration。
- [x] AI reasoning / evidence：每則 note 轉成 memory candidate 時必須保留 `FACT` / `CONFIRMED` / `INFERENCE` / `UNKNOWN`、source label、supporting note/turn id；不得保存 raw audio、raw private transcript 或 raw provider payload。
- [x] Theater / relationship immersion：與準備包/劇場的交接只產生 narrator questions、state proposal 或 relationship tension inference；固定 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`，不直接改 confirmed CRM fact。
- [x] QA / compliance / release-proof：新增 no-provider proof script，覆蓋 member owner 200、manager/foreign 404 或 403、high-sensitive missing reason blocked、`AiUsageLog` count unchanged、response no private sentinel、refresh/new-context memory readback；UI 若接入需 desktop/mobile no overflow。
- [x] 更新 `ACC-010` quick-capture bridge acceptance；若後續需要獨立 `QuickNote` table 或 `AiModule.MEETING`，先記為 product/operator decision，不在本卡偷做。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false` 與 `pnpm lint:changed`。

完成註記（2026-06-20 PIM-011a）：新增 `src/domains/interview/quick-capture.ts`、`pnpm interview:quick-capture-bridge-dry-run`。此子切片只完成 no-provider/no-schema domain contract：serverScope 優先於 clientProvidedScope、manual/voice quick-capture 可轉 `InterviewMemory` candidate、confirmed/inference/unknown 分流、inference 不產生 CRM candidate、unknown 轉 narrator question、inference/unknown 轉 theater state proposal 且 `writesConfirmedCrmFact=false`、高敏感連到 client/visit 缺 reason/riskAccepted 會 blocked、private draft 可保留、secret/token/raw payload 會 blocked、`providerCallAttempted=false` / `aiUsageLogRequired=false`。尚未完成：正式 BFF/API persistence、owner/member 200、manager/foreign denial、refresh/new-context DB readback、UI browser proof。

完成註記（2026-06-21 PIM-011b）：新增 `/api/ai/interview/quick-captures`、`createPersistentQuickCaptureBridge()`、`pnpm interview:quick-capture-bff-qa` 與 AI route audit manifest。此子切片完成正式 BFF/API persistence proof：server session 推導 scope、owner 201、session snapshot refresh/new-context readback、manager read/write 404、高敏感 client 缺 reason/riskAccepted 409 且不落 session/turn/memory、secret/raw payload 409 且不落地、response DTO 不 echo raw note text/private sentinel、unknown 轉 narrator question + state proposal、inference 轉 state proposal 且 CRM writeback candidate = 0、`AiUsageLog` 147->147。尚未完成：正式 UI selector / `/pre-visit/[id]/notes` / meeting workspace 接入與 desktop/mobile UI proof。

Whole-product review 註記（2026-06-21 after PIM-011b）：第五輪校準後，下一個最高槓桿實作切片改為 `PIM-011c quick-capture UI selector bridge`。原因：BFF/API persistence 已有 DB-backed proof，現在最短缺口是顧問看得見、不用 raw ID 的入口；正式 UI 應優先接 `/pre-visit/[planId]/notes`，用 current visit/client context 與 selector 選「保持私人草稿 / 歸客戶 / 歸拜訪 / 轉待確認」，再呼叫 `/api/ai/interview/quick-captures`，並以 desktop/mobile browser proof 證明 no-overflow、high-sensitive approval gate、response 不暴露 raw note/private sentinel。既有未追蹤 AI meeting / notes prototype 不屬 committed baseline，除非下一輪明確選中 AMM/quick-capture workspace 並驗收完整範圍，否則不得 stage。

完成註記（2026-06-21 PIM-011c）：`/pre-visit/[planId]/notes` 已新增 advisor-facing quick-capture selector，顧問只需選「保持私人草稿 / 歸客戶 / 歸拜訪 / 轉待確認」，不需輸入 raw client/visit/session ID；linked capture 可填 reason/riskAccepted，送到 `/api/ai/interview/quick-captures` 後只顯示 safe DTO 摘要、memory id、state proposal count、`scope=server_session` 與 `provider=none`，不 echo raw note/private sentinel。新增 `pnpm interview:quick-capture-ui-qa` 覆蓋 high-sensitive visit capture blocked 409、補 approval 後 READY 201、mobile follow-up review state proposal、desktop/mobile no overflow、result panel no raw echo、`AiUsageLog` 147->147；`pnpm interview:quick-capture-bff-qa` 與 `node scripts/ai-usage-route-audit.mjs` regression 仍通過。截圖：`docs/06_audits-and-reports/screenshots/pim/pim-011c-quick-capture-ui/pim-011c-notes-desktop.png`、`docs/06_audits-and-reports/screenshots/pim/pim-011c-quick-capture-ui/pim-011c-notes-mobile.png`。

### Current PIM Blockers
- Realtime voice 若接 provider，需要可用 OpenAI Realtime model、ephemeral session policy 與 usage/cost evidence。
- Raw audio retention 需要 legal/compliance approval；預設不可保存。
- PIM-006 已對目前 `.env` development Supabase Postgres 執行 additive `db push`；production DB mutation 仍需明確 approval。
- Theater Route B 完整 schema migration 仍依 `PLN-015`/ITA-003/ITA-006 管理。
- Supabase pgvector 仍需 operator 確認，PIM 不應把 pgvector 當第一階段依賴。
- PIM-011 committed baseline 已完成；若後續要把未追蹤 AI meeting / notes prototype 納入 AMM workspace，需另選 AMM slice 並驗收完整範圍，不得把 prototype 當已完成 proof。

---

## Full-site BFF Architecture Batch Tasks

Context: 將目前 partial vertical-slice BFF 推進成全站一致的 Backend-for-Frontend 架構。研究依據：`docs/07_research-and-design/RES-018_full-site-bff-architecture-research-v1.0.md`；架構規則：`docs/02_architecture-and-rules/ARC-008_full-site-bff-architecture-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md`。本條只做**public/member/org/client/platform 五種 surface 的 BFF contract、DTO、權限邊界、資料來源收斂、AI/billing/audit proof**；不做 UI redesign、不任意改 SPIN 狀態機、不任意改 Theater legacy enum/scoring。

### Current BFF Gaps
- 已有 partial BFF：`/api/clients`、`/api/share/[token]`、`/api/client-portal/*`、`/api/org/*`、`/api/platform/*`、`/api/public/pricing`、SPIN session BFF 與部分 `/api/ai/*`。
- 全站資料來源盤點、response foundation、member dashboard、reports/share、issues、team/org aggregate、visit/pre-visit、SPIN source-truth 與 visit/report AI hardening 已完成；部分 production page/store/service 仍可能混用 local state、mock、static fixture 或 legacy fallback。
- BFF route 命名、DTO privacy、audit/usage proof 尚未全站一致；error/response/validation/sanitize foundation 已由 BFF-002 建立，後續 route 需逐步採用。
- Billing/ECPay production-grade BFF、CRM related-list/archive/update、admin/pilot seed 與 Theater AI hardening 仍待完整化；public status/CTA/lead capture BFF 已完成，但 real payment/email/notification 仍未啟用。

### Batch BFF-000 — 架構文件與 workstream 登錄
- [x] 新增 `ARC-008_full-site-bff-architecture-v1.0.md`。
- [x] 新增 `PLN-019_full-site-bff-batch-tasks-v1.0.md`。
- [x] 新增 `ACC-011_full-site-bff-acceptance-framework-v1.0.md`。
- [x] 更新 `RES-018` 下一步引用，避免與 realtime `ARC-007/PLN-018/ACC-010` 撞號。
- [x] 更新 `AGENTS.md` 新 workstream，與 `PLN-019` 卡片狀態同步。
- [x] 更新 `MAN-000` 文件數量與 `MAN-001` 文件索引。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-19 已新增 full-site BFF 架構、批次與驗收文件；因 realtime voice workstream 已使用 `ARC-007/PLN-018/ACC-010`，本 BFF workstream 使用 `ARC-008/PLN-019/ACC-011`。下一張最低未完成卡為 BFF-001。

### Batch BFF-001 — 全站資料來源盤點與責任矩陣
- [x] 盤點所有 production route/page/component/domain service/store 的 business data source。
- [x] 標記 DB/BFF、server component query、mock API、Zustand local、static fixture、mixed mode。
- [x] 產出 `AUD-006_full-site-bff-data-source-inventory-v1.0.md`。
- [x] 建立 responsibility matrix：surface、UI route、BFF endpoint、session type、DTO、read/write、audit、QA script。
- [x] 新增或擴充 QA script，偵測 production page 直接 import `mocks.ts`、`seed-fixtures.ts` 或 browser storage business truth source。
- [x] 不改業務邏輯、不重寫 BFF route。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review fallback（2026-06-20）：若下一輪無法安全確認 Route B DB target 或 migration approval，BFF-001 是最高安全 fallback。盤點時要特別標出 `/reports` local store/share action、`/issues` static mock、admin demo seed、client service local write methods，以及 theater Route B runtime/source 邊界。

Whole-product review fallback update（2026-06-20 after previsit redesign）：若 `ITA-003e` 互動寫入切片被 provider/env/session 條件阻擋，優先執行 BFF-001。盤點需把目前已完成的 DB-backed client/relationship/visit/theater session proof 與仍 local/static 的 `/reports`、`/issues`、admin/demo seed、client store local write methods 分開標示，避免後續 LV3 proof 混入 mock/local truth。

完成註記（2026-06-20）：已新增 `docs/06_audits-and-reports/AUD-006_full-site-bff-data-source-inventory-v1.0.md` 與 `pnpm bff:inventory-qa`。Audit 建立全站 responsibility matrix，明確分出 DB/BFF ready、partial BFF/mixed、local/Zustand truth、static fixture/mock、UI-only browser state；並點名 `/reports`、`/issues`、`/team`、admin/pilot demo seed、SPIN mock outline fallback、notification reminder mock route、domain store seed 與 calendar store seed 等 blocker。此卡不呼叫 provider、不做 DB/Prisma 操作、不重寫 BFF route；下一張最低未完成卡為 BFF-002。

### Batch BFF-002 — Shared API foundation
- [x] 建立共用 error/response/validation/sanitize helpers。
- [x] 新 route 使用 shared helpers；既有 route 只挑 2-3 條低風險 proof，不做全站機械重寫。
- [x] Private data response 設 no-store/cache-control；error response 不暴露 stack/env/secret/provider raw payload。
- [x] Share event、client response、audit metadata 使用 whitelist sanitizer。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已新增 `src/lib/api/errors.ts`、`response.ts`、`validation.ts`、`sanitize.ts`，並接入 `/api/member/settings`、`/api/share/[token]`、`/api/share/[token]/events`、`/api/client-portal/responses`。Proof：`pnpm bff:foundation-qa`、`DEMO_QA_BASE_URL=http://localhost:3026 pnpm bff:foundation-api-qa`、`pnpm share:token-qa`、`pnpm client-portal:qa` 均通過；private response / validation error 有 no-store 與 request id，share event / client response sanitizer 保持 unsafe payload key count 0。此卡不呼叫 provider、不改 Prisma schema、不做 production write；API proof 僅新增可辨識 demo/test share/client portal event evidence。下一張最高槓桿卡建議為 BFF-105 reports / share action BFF。

### Batch BFF-101 — Member dashboard BFF
- [x] 建立 `GET /api/member/dashboard`，回今日主線、下一步 CTA、compact KPI、task queue、recent activity、AI quota summary。
- [x] Server session 用 `requireCurrentMember()` 推導 org/user/unit。
- [x] Repository 聚合 client/visit/report/issue/AI usage，不讓 browser 串多條低階 API 自行拼資料。
- [x] `/dashboard` 改 BFF/cache-first；Zustand 只作 UI/cache。
- [x] Browser proof：desktop/mobile refresh/new context 後資料一致，console error 0、無水平 overflow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已完成 BFF-101。新增 `src/domains/dashboard/types.ts`、`src/lib/dashboard/member-dashboard-repository.ts`、`GET /api/member/dashboard`、server page + `dashboard-page-client`，並讓 `TasksPanel` / `ActivityTimeline` 消費 `MemberDashboardDto`。`/dashboard` 不再直接呼叫 `clientService.getDashboardStats()`、`eventService.getLatestEvents()` 或 `useSessionStore()` 作 business truth；BFF DTO 由 current member scope 聚合 clients / visits / reports / issues / `AiUsageLog`，回今日主線、reasoning facts/inferences/unknowns、KPI、task queue、recent activity、agenda 與 quota summary。Proof：`DEMO_QA_BASE_URL=http://localhost:3000 pnpm bff:dashboard-qa` 覆蓋 unauth 401、member 200/no-store/request-id、manager own-dashboard 隔離、seeded issue task reload、desktop/mobile no overflow、response/page no raw private sentinel；不呼叫 provider，無 `AiUsageLog` 需求。

### Batch BFF-102 — Member settings BFF hardening
- [ ] 檢查 `GET/PATCH /api/member/settings` 是否使用 current member scope。
- [ ] DTO 明確分 profile、notification preferences、AI preferences、personal collaborator hints。
- [ ] 不允許修改 org branding、billing、unit policy、client portal、org AI quota、compliance defaults。
- [ ] API proof：member 200/patch 200；unauth 401；跨 member/org scope 無法指定。
- [ ] Browser proof：refresh/new context persistence。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch BFF-103 — CRM BFF completion
- [x] 補 `PATCH/ARCHIVE` 或明確 soft-delete endpoint，保留合規欄位。
- [x] 補 family/policy/timeline/report/gap-analysis related-list BFF DTO。
- [x] 所有 writes 由 server session 推導 organization/owner/unit。
- [x] DTO 必須保留 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [x] Client store local write methods 改成 remote-confirmed cache update 或標註 dev-only。
- [x] API proof：401、403/404 foreign client、400 validation、200/201 success。
- [x] Browser proof：`/crm` 與 `/crm/[clientId]/*` refresh/new context。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20 BFF-103a）：新增 `src/domains/client/relationship-graph.ts`、`src/lib/clients/relationship-graph-repository.ts`、`GET /api/clients/[id]/relationship-graph`、CRM 關係圖來源審查面板與 `pnpm client:relationship-graph-qa`。每個人物節點含職位、年收入、人物狀態、關係脈絡、fact/inference/unknown 與 source references；API proof 覆蓋 unauth 401、missing 404、member 200、manager 403、no email/phone/raw private sentinel；Browser proof 覆蓋 `/crm/[clientId]/relationships` desktop/mobile no overflow。此子切片不呼叫 provider，無 AiUsageLog 需求。

完成註記（2026-06-20 BFF-103b）：新增 `PATCH/DELETE /api/clients/[id]/family-members/[memberId]`、family member update/delete repository helpers、client service remote helpers 與 `pnpm client:relationship-graph-write-qa`。Proof 覆蓋 unauth 401、member re-parent 200、self-parent/cycle 400、manager 404、delete 200、missing delete 404、刪父節點時子節點安全接回 root、browser UI delete refresh 後仍消失、desktop no overflow、no-provider proof。BFF-103 大卡仍保持未完成，因為 client archive/update、policy/timeline/report/gap related-list 仍待補；主客戶 `parentMemberId` runtime dependency 已由 REL-001/002 後續解除。

完成註記（2026-06-20 BFF-103c）：新增 `DELETE /api/clients/[id]` soft archive、client lifecycle repository helper、archived DTO、client service `updateClientRemote()` / `archiveClientRemote()` 與 `pnpm bff:crm-client-lifecycle-qa`。Proof 覆蓋 unauth DELETE 401、member create/PATCH 201/200、manager PATCH/DELETE 404、relationship graph 讀到更新後職位/年收入/status、DELETE soft archive 200、DB `clients.status=ARCHIVED` 且 `compliance_checklists` 保留、archived client detail/relationship graph 404、`/api/clients` 不再列出封存客戶、CRM detail/list desktop/mobile refresh proof、`AiUsageLog` count 不變與 no-provider proof。BFF-103 大卡仍保持未完成，因為 policy/timeline/report/gap-analysis related-list BFF DTO 尚待補。

阻擋註記（2026-06-20 BFF-103d partial）：已落地 `GET /api/clients/[id]/related-lists`、client related-list repository/domain DTO、`useClientRelatedLists()`、CRM `policies` / `timeline` / `gap-analysis` 子頁 BFF DTO 接線與 `pnpm bff:crm-related-lists-qa`；DTO 保留合規欄位，並排除 email/phone/policyNumber/report body/raw metadata。`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 通過；targeted proof 因 Supabase DNS/DB `ENOTFOUND` / Prisma `EHOSTUNREACH/P1001` 中斷，故 BFF-103 related-list checklist 仍不打勾。待 DB DNS 恢復後重跑 `DEMO_QA_BASE_URL=http://localhost:3029 pnpm bff:crm-related-lists-qa`。

完成註記（2026-06-21 BFF-103d recovery）：DB 透過目前開發環境 IPv6/pg read proof 恢復後，已重跑 `DEMO_QA_BASE_URL=http://localhost:3000 pnpm bff:crm-related-lists-qa` 並完整通過。Proof 覆蓋 unauth 401、member client/family/policy/visit/report create 201、`GET /api/clients/[id]/related-lists` 200、manager 403、DTO 保留 `complianceChecklist` / `sensitivityLevel` / `kycStatus`、policies/timeline/reports/gap-analysis server-owned DTO、report body / raw section names / email / phone / policyNumber 不外洩、gap-analysis fact/inference/unknown evidence、desktop policies/timeline/gap-analysis/reports no overflow、mobile gap-analysis no overflow、`AiUsageLog` count 147->147。僅修 QA harness 的 reports page locator strict-mode `.first()`；產品 source 未改。

### Batch BFF-104 — Visit / pre-visit BFF
- [x] 建立 visit list/detail/create/update/notes BFF。
- [x] DTO 回準備包、checklist、source client context、status、updatedAt，不回 raw prompt/provider payload。
- [x] `/pre-visit`、`/pre-visit/[planId]`、notes 頁改 BFF/cache-first。
- [x] 與 `/api/ai/visit` AI generation contract 分清。
- [x] API/browser proof 覆蓋 refresh/new context。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review 註記：2026-06-20 第五輪校準選定下一個最高槓桿實作切片為 `BFF-104a Visit / Pre-visit server-owned workspace`。先補 `GET/POST /api/visits`、`GET/PATCH /api/visits/[id]`、notes write path，並把 `/pre-visit` list/detail/notes 改為 BFF/cache-first；`/api/ai/visit` 保持 provider-generation route，generated preparation package 另走 deterministic save/update path。驗收需覆蓋 refresh/new context、reasoning evidence persistence、persisted `visitPlanId` theater CTA、no raw prompt/provider/private leakage。

完成註記：2026-06-20 新增 `GET/POST /api/visits`、`GET/PATCH /api/visits/[id]`、`VisitService` remote cache helpers 與 `pnpm visit:bff-qa`。`/pre-visit` list/create/autoCreate、`/pre-visit/[planId]` detail/generate save/material toggle、`/pre-visit/[planId]/notes` save/reload 均改為 member-scoped BFF/cache-first；Quickstart demo branch 保留 local fixture。Proof：`DEMO_QA_BASE_URL=http://localhost:3001 pnpm visit:bff-qa` 通過，覆蓋 unauth 401、demo create/patch/reload、reasoning evidence persistence、notes reload、persisted `visitPlanId` theater handoff、raw private sentinel 0、desktop/mobile no overflow。此 proof 不呼叫 `/api/ai/visit` 或 provider，無 AiUsageLog 需求；DB 僅新增/更新可辨識 demo `VisitPlan` evidence，無 schema/Prisma 變更。

### Batch BFF-105 — Reports / share action BFF
- [x] 建立 reports list/detail/update/share action BFF。
- [x] Report detail DTO 分 edit/share/preview mode，不把 public share DTO 與 member private DTO 混用。
- [x] Share action 寫 audit/event；public share 仍走 `/api/share/[token]`。
- [x] `/reports`、`/reports/[reportId]`、CRM report subpage 改 BFF/cache-first。
- [x] API/browser proof 覆蓋 invalid report、foreign org、success share。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已新增 member-scoped `GET/POST /api/reports`、`GET/PATCH /api/reports/[id]`、`POST /api/reports/[id]/share`、report repository schemas 與 `pnpm bff:reports-qa`。`/reports` library/detail 與 CRM report subpage 改為 BFF/cache-first；quickstart demo 保留 local branch。Member DTO 回 internal editor sections 與 client-safe sections，public `/api/share/[token]` 仍只回 client-safe DTO；share action 會建立/重用 `ReportShare` 並寫 sanitized `ShareEvent`。Proof 覆蓋 unauth 401、member list/detail/create/update/share、invalid section 400、manager foreign read 404、public share 不回 internal/performance section、desktop/mobile no overflow。此 proof 不呼叫 provider，無 AiUsageLog 需求；DB 僅新增可辨識 demo/test `Report`、`ReportShare` 與 `ShareEvent` evidence，無 schema/Prisma 變更。

### Batch BFF-106 — Issues BFF
- [x] 建立 `GET /api/issues` 與 issue status/action endpoint。
- [x] DTO 區分 issue fact、AI inference、unknown，不把推論當事實。
- [x] `/issues` 改 BFF/cache-first。
- [x] API/browser proof 覆蓋 empty、forbidden、success、refresh。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review 註記（2026-06-20 after BFF-105）：第五輪校準後的最高安全 implementation slice 改為 `BFF-106 Issues BFF`。原因：reports/share 已 server-owned，`/issues` 仍是 production-facing `MOCK_ISSUES`，且 issue readiness / next action 會被 dashboard、previsit question rationale、org coaching 與 release QA 重複引用。下一輪實作需建立 member-scoped `GET /api/issues` 與 status/action endpoint，DTO 明確分 `fact` / `inference` / `unknown` / `nextAction` / internal IRL，不把推論當事實，不把 internal IRL 暴露到 client-facing report；proof 覆蓋 unauth、forbidden/foreign、empty/success、refresh/new context、desktop/mobile no overflow 與 no mock/local truth。

完成註記（2026-06-20）：已完成 BFF-106。新增 `src/domains/issues/types.ts`、`src/lib/issues/issues-repository.ts`、`GET /api/issues`、`PATCH /api/issues/[id]`、`/issues` server page + client操作介面與 `pnpm bff:issues-qa`。Issue DTO 從 DB `Issue` row 生成 member-scoped list，明確分 `facts` / `inferences` / `unknowns`、`sourceReferences`、internal readiness（固定 `clientFacingVisible=false`）與 advisor `nextAction`；status/action 更新會寫 `AuditLog(resourceType=ISSUE)`。Proof 覆蓋 unauth 401、member success、manager foreign 404、empty query、invalid patch 400、status/action write audit、reload persistence、desktop/mobile no overflow、response/page no raw private sentinel；不呼叫 provider，無 AiUsageLog 需求。下一張建議為 BFF-101 member dashboard BFF，讓首頁 task queue/今日主線消費 server-owned issues signal。

### Batch BFF-201 — AI BFF audit gate
- [x] 擴充或新增 `pnpm ai:bff-audit`，列出所有 `/api/ai/*`、`/api/rag` route。
- [x] 檢查每條 route 是否有 session/token scope、plan capability、quota guard、success/error `AiUsageLog`、input limit。
- [x] 產出或更新 `AUD-005_ai-usage-route-audit-v1.0.md`。
- [x] 不改 SPIN 狀態機、不改 Theater enum/scoring。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已完成 BFF-201。`pnpm ai:bff-audit` 現在自動掃描 `src/app/api/ai/**/route.ts` 與 `src/app/api/rag/**/route.ts`，並以 manifest gate 證明 22/22 route covered、13 條 provider-ready route 有 session/quota/input/success-error `AiUsageLog` evidence、8 條 deterministic interview BFF route 有 session/input/no-provider proof、`/api/rag` 為 guarded-disabled no-provider posture。未改 SPIN 狀態機、未改 Theater enum/scoring、未呼叫 provider、未改 DB/Prisma schema。

### Batch BFF-202 — Visit / report AI hardening
- [x] `/api/ai/visit` 與 `/api/ai/report` 用 `requireCurrentMember()` 推導 org/user/unit/client/report scope。
- [x] `canUseAiModule()` 與 quota guard；quota blocked 不呼叫 provider、不寫假 usage。
- [x] Success/error path 都寫 `AiUsageLog`。
- [x] Response DTO 分 facts/inferences/unknowns/recommendations。
- [x] API proof：401、400、429、success、provider error。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已完成 BFF-202。`/api/ai/visit` 回傳向下相容的準備包 JSON，新增 `evidenceSummary.facts/inferences/unknowns/recommendations`；`/api/ai/report` 保留 markdown 相容模式，並新增 `responseFormat: "json"` DTO，CRM report subpage 已改用 JSON DTO 後保存 markdown。兩條 provider prompt 改用 `buildProviderSafeClientSnapshot()`，避免把 email/phone/raw notes 或整包 client DTO 送進 provider。新增 `pnpm bff:visit-report-ai-qa`，在 local Next 16 dev server 上通過 unauth 401、invalid 400、forced quota 429/no fake usage、provider success、invalid-model provider error、success/error `AiUsageLog` 增量與 email/phone sentinel 0。驗收：`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、targeted ESLint、`pnpm ai:bff-audit`、`DEMO_QA_BASE_URL=http://localhost:3020 pnpm bff:visit-report-ai-qa` 通過；本輪未改 Prisma schema，DB 只新增正常 OpenAI usage log evidence。

### Batch BFF-203 — SPIN AI hardening
- [x] `/api/ai/spin` 與 `/api/ai/spin-suggestions` session-scoped。
- [x] 保留 `SITUATION → PROBLEM → IMPLICATION → NEED_PAYOFF`。
- [x] Success/error path 都寫 `AiUsageLog`；quota/capability guard 完整。
- [x] 移除或替換 `/spin/[sessionId]` 的 `/api/mock/ai/spin-outline` fallback 與 local seed truth，不把 legacy SPIN mock/local session 當正式 proof。
- [x] API/browser proof 覆蓋 existing SPIN session flow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review 註記（2026-06-20）：`AUD-005` 已證明 `/api/ai/spin` 與 `/api/ai/spin-suggestions` route-level session/quota/usage audit pass；BFF-203 仍保持未完成，因 `AUD-006` 指出 `/spin/[sessionId]` 仍呼叫 `/api/mock/ai/spin-outline`，`src/domains/spin/store.ts` 仍以 demo seed/local truth 初始化。下一輪若不做 PIM-010，fallback 為 `BFF-203a SPIN source-truth hardening`，必須保護 SPIN 狀態機。

完成註記（2026-06-20）：已完成 BFF-203a SPIN source-truth hardening。新增 persisted SPIN session BFF：`GET/POST /api/spin/sessions`、`GET/PATCH /api/spin/sessions/[sessionId]`、`POST /messages`、`POST /outline`，正式 `/spin` list/create 與 `/spin/[sessionId]` detail/outline 改讀寫 `spin_sessions` / `spin_messages`；Quickstart demo seed 保留但不作正式 proof。`PATCH` server-side 保護階段只能同階、往下一階或完成，維持 `SITUATION → PROBLEM → IMPLICATION → NEED_PAYOFF` 狀態機。`/spin/[sessionId]` 不再呼叫 `/api/mock/ai/spin-outline`；正式 outline 走 deterministic domain helper，response 帶 no-provider proof，不需 `AiUsageLog`。Proof：`pnpm spin:source-truth-qa` 通過 unauth 401、member create/read/write/outline、manager foreign 404、non-sequential jump 409、raw sentinel 0；Browser proof 以 dev member one-click login 開啟 completed BFF session，生成訪談大綱 sheet 含 QA stamp、console error 0、無水平 overflow；`pnpm ai:bff-audit` 仍通過。

### Batch BFF-204 — Theater AI hardening
- [x] `/api/ai/theater` 與 `/api/ai/theater/score` session-scoped。
- [x] Success/error path 都寫 `AiUsageLog`；quota/capability guard 完整。
- [x] Legacy Theater 若未 Route B migration，維持 staging/demo gate，不宣稱 production-ready。
- [x] 不改 legacy enum/scoring 型別；Route B migration 另依 ITA。
- [x] API/browser proof 覆蓋 theater list/session basic flow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Quiet gap-research note（2026-06-21）：下一輪若選 BFF-204，優先切 `BFF-204a legacy theater launch gate and guarded Route B boundary proof`。驗收要用 `/theater` list/session、`/api/ai/theater`/score audit、Route B guarded runtime/interactions 與 no-provider `AiUsageLog` unchanged proof，明確保留 staging/demo gate，不改 legacy enum/scoring，不宣稱 Route B live multi-character provider ready。

Whole-product review note（2026-06-21 after NAP-005 / BFF-204-205 gap research）：第五輪校準確認 cross-flow no-provider proof、NAP source adoption 與 local-only adapter/export dry-run 已完成；下一個最高槓桿 implementation slice 是 `BFF-204a legacy theater launch gate and guarded Route B boundary proof`。原因：劇場仍是「準備包 -> 演練舞台」最容易被誤宣稱 live-ready 的核心表面，需用 `/theater` UI、legacy AI routes、Route B guarded runtime、no-provider `AiUsageLog` unchanged 與 staging/demo gate 證明邊界。若 Theater proof 被 env/session 阻擋，fallback 為 `BFF-205a RAG guarded-disabled + assistant/interview persistence hygiene proof`；既有未追蹤 AI meeting / notes prototype 不屬 committed baseline，不得在未選 AMM slice 前 stage 或宣稱已完成。

完成註記（2026-06-21 BFF-204a）：已完成 Theater launch-boundary proof。新增 `pnpm theater:launch-boundary-qa`，聚合 static gate 檢查、`/theater` desktop/mobile browser proof、`pnpm ai:bff-audit`、`pnpm ai:protocol-registry-qa`、`pnpm theater:route-b-runtime-qa`、`pnpm theater:route-b-session-ui-qa`、`pnpm theater:route-b-interaction-qa`。證據顯示 legacy `/api/ai/theater` 與 `/api/ai/theater/score` 保留 session/quota/success-error usage contract 與 production staging/demo gate；Route B runtime/session/interaction 維持 provider guarded-disabled、`providerCallAttempted=false`、`aiUsageLogWritten=false`、THEATER `AiUsageLog` count unchanged（10 → 10）、角色狀態 proposal 不寫 confirmed CRM fact。未宣稱 Route B live multi-character provider ready；live provider/five-view feedback 與 external registry/public discovery 仍屬後續 approval blocker。

### Batch BFF-205 — Assistant / RAG / interview hardening
- [x] `/api/ai/chat`、`/api/ai/interview`、`/api/ai/interview/outputs` audit gap = 0。
- [x] `/api/rag` 若 disabled，回 guarded 503，不呼叫 provider、不寫假 usage。
- [x] Assistant conversation persistence 不含 secret/tool raw private payload。
- [x] Interview output DTO 分 fact/inference/unknown，保存 supporting evidence。
- [x] API proof：401、400、429/503、success、provider error。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Quiet gap-research note（2026-06-21）：下一輪若選 BFF-205，優先切 `BFF-205a RAG guarded-disabled + assistant/interview persistence hygiene proof`。驗收要跑 `pnpm ai:bff-audit`、`pnpm rag:launch-posture-qa`、`pnpm ai:protocol-registry-qa` 或等價 proof；`/api/rag` disabled 時必須 503、providerAttempted=false、RAG `AiUsageLog` unchanged，不得用 mock answer/fake usage 冒充 retrieval。

Whole-product review fallback note（2026-06-21）：BFF-205a 是 BFF-204a 的次順位安全切片，而非同輪混做項。若執行本 fallback，優先證明 RAG disabled_guarded posture、Assistant/Interview persistence DTO hygiene、fact/inference/unknown/evidence 邊界與 no fake usage；不得啟用 provider-backed retrieval、external registry publication、public discovery 或 cross-org agent access。

完成註記（2026-06-21 BFF-205a）：已完成 RAG guarded-disabled 與 Assistant/Interview persistence hygiene proof。新增 `pnpm bff:ai-boundary-qa`，聚合 static boundary checks、`pnpm ai:bff-audit`、`pnpm ai:protocol-registry-qa`、`pnpm rag:launch-posture-qa`、`pnpm interview:quick-capture-bff-qa`。證據顯示 `/api/rag` private-beta disabled 時回 503、`launchPosture=disabled_guarded`、`providerAttempted=false`、RAG `AiUsageLog` count unchanged（0 → 0）；Assistant route/repository 維持 session/org guard、allowed tool route allowlist、success/failure usage path與無 raw provider/tool payload、secret/token/cookie/private transcript persistence；Interview quick-capture/writeback 邊界維持 fact/inference/unknown/evidence data class 與 no-provider posture，INTERVIEW usage aggregate unchanged（79 → 79），quick-capture proof run usage unchanged（150 → 150）。未啟用 provider-backed RAG retrieval、external registry publication、public discovery 或 cross-org agent access；未納入未追蹤 AI meeting / notes prototype。

### Batch BFF-301 — Org BFF repository extraction and aggregate QA
- [x] 抽 `src/lib/org/*-repository.ts` 或整合既有 org repository。
- [x] `/api/org/overview`、coaching、AI usage 只保留 route protocol/session/response。
- [x] Manager unit scope 與 `canReadOrgAggregate()` 保留。
- [x] Sentinel QA 確認不回 client name/email/phone/report body/transcript/policy detail。
- [x] API/browser proof：manager aggregate 200、member 403、unauth 401。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20）：已完成 BFF-301。新增 `src/domains/org/types.ts`、`src/lib/org/org-aggregate-repository.ts` 與 `src/lib/org/org-api-errors.ts`；`/api/org/overview`、`/api/org/coaching`、`/api/org/ai-usage` 改成只負責 requireOrgAdmin、private no-store response 與 shared error，Prisma 聚合移入 repository。`/team` 改為 server page 讀 `OrgTeamDashboardDto`，移除 `MOCK_TEAM_MEMBERS` production-facing fixture。`pnpm bff:org-aggregate-qa` 通過 unauth 401、member 403、manager 200、no-store/request-id、database/org-aggregate visibility、desktop/mobile `/team` no overflow、no client detail/report body/transcript/policy/private memory sentinel；既有 `demo:manager-aggregate-qa`、`demo:org-coaching-ai-usage-qa`、`demo:org-members-qa` 仍通過。未呼叫 provider、未改 Prisma schema。

### Batch BFF-302 — Org writes audit and capability enforcement
- [x] Members/invites 套 max members/collaborators/seat limits。
- [x] Units 套 max units 與 hierarchy validation。
- [x] Settings writes 寫 `AuditLog`，保留 actor/resource/reason。
- [x] Manager read-only 或 limited-write policy 清楚。
- [x] API proof 覆蓋 forbidden、limit exceeded、audit created。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21）：已完成 BFF-302。`/api/org/units` 成功建立 unit 時改為 transaction 內同步寫 `AuditLog(resourceType=ORG_UNIT)`，metadata 僅含 unit type、parent、slug 與 plan usage snapshot，不保存私人客戶細節。新增 `pnpm bff:org-writes-qa`，proof 覆蓋 owner members/units/settings/invites 讀寫邊界、unscoped manager 對 org aggregate/settings/units/invites 403、unit max limit 403 且 no create、settings patch 產生 `ORG_SETTINGS` audit、invite create 產生 `ORG_INVITE` audit、collaborator cap 403 且 no membership increase、response 無 client/private sentinel，並串跑 `pnpm nav:route-guard-qa`。此卡未呼叫 provider、不改 Prisma schema；DB proof 僅新增/更新可辨識 demo/test org settings 與 invite evidence。

### Batch BFF-303 — Client portal BFF completion
- [x] Share token session 支援 expiry/rotation/revocation。
- [x] `/api/client-portal/bootstrap` 僅回 authorized report/client-safe sections。
- [x] `/api/client-portal/responses` payload whitelist，支援補資料、提問、預約意向。
- [x] Client token 打 workspace/member/org/platform APIs 必須 401/403。
- [x] Browser/API proof 覆蓋 authorized/invalid/expired/revoked。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21）：已完成 BFF-303。`/api/reports/[id]/share` 透過 repository 支援 `ensure`、`rotate`、`revoke` 與 1-365 天到期設定；rotate/revoke 會讓現有 active share 過期並寫 `ShareEvent` audit label，revoke 後 report 回 `READY`。新增 `pnpm bff:client-portal-qa`，proof 覆蓋 missing session 401、authorized share/bootstrap 200、client-safe sections/private sentinel、client token 打 workspace/member/org/platform 401/403、response whitelist 與 unsafe metadata 不落 DB、invalid/expired/rotated-old/revoked token 404 或 401、rotate/revoke audit event、revoke 後 active shares=0。Browser proof 覆蓋 authorized share、client-login authorized、expired/invalid/revoked missing state、mobile no overflow；截圖在 `docs/06_audits-and-reports/screenshots/lv3-client-portal-bff/`。本輪未新增附件 route，故附件 size/type/signed URL/virus-scan gate 無新增攻擊面；未呼叫 provider、不改 Prisma schema、不做 production write，僅新增可辨識 demo/test report/share/portal response evidence。

### Batch BFF-304 — Platform BFF completion
Whole-product review note（2026-06-21 after BFF-303）：BFF-204/205/302/303 已分別補上 Theater/RAG/Assistant/Interview/org writes/client portal 的 launch boundary proof；下一個 full-site BFF 最高槓桿缺口轉為 platform surface。`BFF-304a` 下一輪應先做 platform session separation + metadata/audit proof：app session 打 platform APIs 必須 401/403，platform session 讀 organizations / AI usage / audit logs 只能回 metadata/aggregate，敏感讀必寫 `AuditLog` 並回 proof id，break-glass/impersonation 需要 reason/scope/expiry/actor/target。此 slice 不啟用 production impersonation、不做 production write、不接真 payment/email/notification；若 platform session/env 不可用，fallback 是 deterministic source/fixture proof，但不得宣稱 live platform auth matrix 完成。

- [x] Platform session 與 app session 分離 proof。
- [x] Organizations/AI usage/audit logs 預設 metadata/aggregate。
- [x] Impersonation/break-glass 必填 reason、scope、expiry、actor/target。
- [x] Sensitive read 每次寫 `AuditLog`，且 response 可回報 proof id。
- [x] Release readiness 聚合 auth、AI、billing、monitoring、backup、BFF gates。
- [x] API proof 覆蓋 app session rejected、platform success、break-glass audit。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21 BFF-304a）：已完成 platform BFF completion。新增 `pnpm bff:platform-qa` 聚合 proof，並補 `IMPERSONATED_READ` response-visible audit proof id 與 release-readiness `bff_surface_gates` / `bffGates` 投影。Proof 覆蓋 unauth/member/manager/client token 呼叫 `/api/platform/organizations` 皆 401/403、platform organizations/detail/AI usage/audit logs/release-readiness 200 且只回 metadata/aggregate、release-readiness 顯示 `platform_bff=pass` 且不 overclaim `billing_bff=blocked`、impersonation 缺 reason 400/expiry too long 403/start 201/read-proof 200 + `AuditLog` id、break-glass 缺 reason/risk 400/expiry too long 403/success 201 + `AuditLog` id、default/read/break-glass response private sentinel 0、`AiUsageLog` 150→150 unchanged。此卡未啟用 production impersonation、未做 real payment/email/notification、未呼叫 provider、不改 Prisma schema；僅新增可辨識 demo/test report/share/audit evidence。

### Batch BFF-305 — Public BFF completion

Research-to-executable note（2026-06-21 after BFF-304a）：BFF-304a 已關閉 platform session / metadata / audit frontier；下一個 public-facing 缺口是 public pages 的狀態與 CTA 邏輯仍未形成單一 public-safe BFF truth。`BFF-305a` 應先補 `/api/public/status` 或等價 contract，讓 maintenance、AI availability、checkout availability、CTA posture、lead capture posture、legal/privacy status 由 server 回傳；`/api/public/pricing` 必須與 status/CTA 一致，landing/pricing 不得只靠 hardcoded frontend copy 判斷是否可試用/結帳。2026-06-21 operator 追加決策：lead capture 要一起做，但僅限 private beta lead persistence，不啟用真實付款/email/notification；lead endpoint 必須具 rate limit、honeypot/spam protection、consent version、allowlisted persistence、abuse/failure proof。

- [x] `/api/public/pricing` 補 cache/fallback policy 與 DB consistency proof。
- [x] 新增 `/api/public/status`，回 maintenance、checkout availability、AI availability。
- [x] 新增 `/api/public/lead` 或明確延後，若實作需 rate limit、spam protection、consent version。
- [x] Landing/pricing CTA 不以 hardcoded frontend copy 判斷 checkout availability。
- [x] Public BFF 不回 private plan cost、secret、provider raw config。
- [x] Browser/API proof 覆蓋 pricing/status/CTA。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21 BFF-305a status/CTA/lead capture）：已完成 Public BFF status / CTA / private-beta lead capture proof。新增 public-safe `GET /api/public/status`、shared public status repository、pricing/status shared checkout/CTA availability source、landing/pricing CTA data-bound contract、additive `PublicLead` schema、`POST /api/public/lead` 與 `pnpm public:status-qa`。Proof 覆蓋 status 200、pricing 200、public cache header、DB-backed `PlanConfig` consistency、checkout action disabled、production payment disabled、public lead capture enabled、consent validation 400、honeypot 202 且不入庫、valid lead 201 且 `public_leads` +1、same email third request 429、not-public-discovery registry posture、pricing/status CTA consistency、private sentinel 0、landing/pricing desktop/mobile no overflow、browser console error 0；截圖保存於 `docs/06_audits-and-reports/screenshots/lv3-public-bff/`。仍不啟用 real payment、real email、real notification、provider call 或 external registry publication；BFF-401/BFF-402 billing server-payload / notification/query/idempotency 仍待後續。

### Batch BFF-305a — Public status and CTA availability proof
- [x] 建立 `GET /api/public/status` 或同等 BFF，匿名可讀，回 `maintenance`、`aiAvailability`、`checkoutAvailability`、`primaryCta`、`leadCapture`、`legalStatus`、`updatedAt`。
- [x] Status DTO 不含 private plan cost、provider raw config、billing internal state、payment transaction、tenant/client data、secret/token/raw provider payload。
- [x] `/api/public/pricing` 與 public status 共用 checkout / CTA availability source；public pricing 不再和 status 回傳矛盾。
- [x] Landing / pricing CTA 依 public BFF contract 顯示：private beta / invite / checkout disabled / contact sales / unavailable states。
- [x] Public lead endpoint 具 rate limit、honeypot/spam protection、consent version、safe allowlisted persistence 與 abuse/failure proof；不得新增裸寫入 endpoint。
- [x] Public status endpoint 不得混同 NANDA / third-party public discovery 或 external registry；agent publication、credential signing、cross-org agent access 仍回 NAP gate 與 operator approval。
- [x] API proof 覆蓋 status 200、pricing 200、CTA consistency、checkout disabled/sandbox posture、private sentinel 0。
- [x] Browser proof 覆蓋 landing/pricing desktop/mobile CTA 與 no overflow；不得宣稱 payment/email/notification production ready。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、targeted public BFF QA（新增或更新 `pnpm public:pricing-qa` / `pnpm public:status-qa`）。

### Batch BFF-401 — ECPay checkout BFF
- [ ] 建立 `/api/billing/checkout`，server-side 產生 ECPay payload 與 CheckMacValue。
- [ ] Browser 只收到導轉必要資料，不接觸 HashKey/HashIV。
- [ ] Checkout request 寫 pending order/transaction。
- [ ] Production credentials/callback domain 未獲 approval 時只能 test/sandbox 或 disabled posture。
- [ ] API proof：unauth 401、invalid plan 400、disabled 503 或 sandbox 200。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch BFF-401a — Checkout disabled/sandbox server-payload proof
- [x] 建立 `POST /api/billing/checkout`，必須 current member session。
- [x] Server 驗證 self-serve paid plan；不得信任 client amount、organizationId、ownerId 或 payment provider payload。
- [x] Production payment proof 未完成時回 503 disabled posture，且 `orderCreated=false`、`transactionCreated=false`、`providerAttempted=false`。
- [x] Response 不回 HashKey、HashIV、CheckMacValue、provider raw payload、payment token、card data、raw payment data 或 browser-generated checksum。
- [x] API/DB proof 覆蓋 unauth 401、invalid plan 400、disabled 503、subscription order/payment transaction count unchanged、private/payment sentinel 0。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm billing:checkout-qa`。

完成註記（2026-06-21 BFF-401a checkout disabled/sandbox server-payload proof）：已新增 `POST /api/billing/checkout`、versioned checkout disabled DTO、server-side repository 與 `pnpm billing:checkout-qa`。Proof 覆蓋 unauth 401、non-self-serve plan 400、PRO checkout 503 disabled、no-store/request-id、no provider attempt、no redirect payload、no order/transaction insert、browser checksum generation 不允許、redirect-only activation 不允許、HashKey/HashIV/CheckMacValue/provider raw payload/card/payment token/private env sentinel 0。此切片不啟用 real payment、real email、real notification、不產生 ECPay signed payload、不寫 pending order；BFF-402 notification/query/idempotency 與真正 sandbox/production checkout 仍待後續 proof。

### Batch BFF-402 — ECPay notification / query / idempotency
- [ ] 建立 `/api/billing/ecpay/notify`，驗證 CheckMacValue。
- [ ] 建立 `/api/billing/ecpay/query` server-to-server confirmation。
- [ ] Return/OrderResult URL 只顯示 pending/received，不直接啟用 plan。
- [ ] Transaction ledger idempotency：同交易重送不重複啟用。
- [ ] API proof 覆蓋 invalid CheckMacValue、duplicate notify、query confirmed。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch BFF-403 — Subscription capability BFF
- [ ] 建立 `/api/billing/subscription` 或 `/api/org/billing`。
- [ ] DTO 包含 current plan、capability、quota、seat/collaborator/unit usage、checkout status。
- [ ] Plan activation 只由 confirmed transaction/query 控制。
- [ ] Workspace bootstrap 與 org/member UI 使用 server capability，不使用 hardcoded plan assumptions。
- [ ] API/browser proof 覆蓋 plan change persistence。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch BFF-404 — Release readiness BFF gate
- [ ] `/api/platform/release-readiness` 納入 BFF inventory、AI usage audit、billing proof、cross-role sentinel、monitoring、backup/rollback。
- [ ] 新增 `pnpm bff:release-readiness-qa` 或整合既有 full smoke。
- [ ] Full smoke 覆蓋 public、member、org、client portal、platform。
- [ ] Report 註明剩餘 blockers，不把 mock success 寫成 production success。
- [ ] 更新 `AGENTS.md`、`PLN-019`、必要 report / issue-question。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Browser QA。

### Current BFF Blockers
- ECPay production credentials、HashKey/HashIV、callback domain、server notification/query proof 需要 operator approval。
- Production auth provider/email/SSO、platform MFA、client-user OTP 仍需 operator/product 決策。
- 若 BFF tasks 改 route/layout/server action/cookies/session 行為，先讀 `node_modules/next/dist/docs/` 對應 Next.js 版本文件。
- Production DB destructive operation、drop/reset/delete remote data 仍需明確 approval。

---

## AI Meeting Module Batch Tasks

Context: 參考 Notion AI Meeting，做一個**全站 AI 會議模組**：即時轉寫拜訪會議、自動生成結構化摘要（含可點擊引用）、跨會議客戶記憶與會議對答。研究依據：`docs/07_research-and-design/RES-023_ai-meeting-module-research-v1.0.md`；架構規則：`docs/02_architecture-and-rules/ARC-010_ai-meeting-module-architecture-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-023_ai-meeting-module-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-015_ai-meeting-module-acceptance-framework-v1.0.md`。本條只做**會議捕捉 → 結構化摘要 → 跨會議客戶記憶 → 對答 → 寫回 → 全站入口**，重用 `interview` Park-memory 引擎；不做 UI redesign、不改 SPIN 狀態機、不改 Theater legacy enum/scoring、不預設保存 raw audio。KEY = `AMM`。下方為 workstream 鏡像（單一真相以本檔勾選狀態為準，與 PLN-023 同步）。

### Current AI Meeting Gaps
- 拜訪後筆記只是 `VisitPlan.postVisitNotes` 純文字，無 transcript / 結構化摘要 / 行動項 / citation / 跨會議記憶。
- `interview` domain 已有 Park-memory + realtime voice + persistence，但綁在 `/interview`，未成為全站「會議」物件。
- `retrieveInterviewMemories()` 為 session-scoped；缺 client-scoped 跨 session 檢索與會議/客戶對答 route。
- 已有 `MeetingSummary` / `MeetingCitation` no-provider 契約骨架、additive persistence schema、AMM-002a meeting capture BFF 與 DB/API proof；仍缺正式 summary route/provider、跨會議對答與全站入口（dashboard / CRM client detail / 訪前規劃）。

### Batch AMM-000 — 文件與 workstream 登錄
- [x] 新增 `RES-023`、`ARC-010`、`PLN-023`、`ACC-015`。
- [x] 更新 `AGENTS.md` 新增 AI Meeting Module workstream 鏡像。
- [x] 更新 `MAN-001` 文件索引與 `MAN-000` 文件數量。
- [x] 純文件輪：無 code 變更，`pnpm exec tsc`／`lint:changed` 此輪標 N/A，待 AMM-001 起的實作卡執行。

完成註記：2026-06-20 依「全站 AI 會議模組（參考 Notion AI Meeting）」需求啟動 workstream。研究確認不必另起爐灶：重用 `interview` Park-memory 引擎（memory/park-loop/reflection-planning）、realtime voice BFF 與 `InterviewSession/Turn/Memory/Reflection` persistence，缺口為「會議第一級物件、結構化摘要+citation、跨 session 客戶記憶與對答」。下一張最低未完成卡為 AMM-001。

### Batch AMM-001 — 會議資料模型與契約
- [x] `InterviewKind` 新增 `CLIENT_MEETING`（additive）；新增 `MeetingSummary`/`MeetingActionItem`/`MeetingParticipant`/`MeetingCitation` pure types（`src/domains/interview/meeting.ts`）。
- [x] 定案 `MeetingSummary` 持久化（新表 `InterviewMeetingSummary` 或先存 session/reflection metadata）與 AI 用量歸類（`AiModule.MEETING` 或沿用 `CHAT`/既有 module + trace）。
- [x] mapping helper：transcript turns + 手動筆記 → summary 骨架（pure，不呼叫 provider，未知不升格成 fact）。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；動 schema 才跑 Prisma。

Whole-product review note（2026-06-21 after BFF-401a）：第五輪 LV3 校準確認 billing/public/platform release gates 已大幅收斂，下一個最高槓桿核心產品缺口轉為 AI Meeting / notes prototype 尚未成為 committed baseline。下一輪建議先做 `AMM-001a formal meeting contract + no-provider summary skeleton proof`：只採用必要 source，新增/驗證 `MeetingSummary`、`MeetingCitation`、action item / participant types 與 transcript/manual-note → summary skeleton mapping helper，補 dry-run script 證明 citation 不幻覺、unknown 不升格 fact、no provider / no DB write / no raw audio / no raw private transcript。不要在同輪順手 stage 既有未追蹤 meeting UI prototype；若需要採用 prototype，必須在 AMM-owned source/proof slice 中完整驗收。BFF-402 仍是 release-hardening 次順位，Route B live provider proof 仍需 provider env 與 success/error `AiUsageLog`。

### Batch AMM-001a — Formal meeting contract + no-provider summary skeleton proof
- [x] 新增 `MeetingSummary` / `MeetingCitation` / `MeetingActionItem` / `MeetingParticipant` pure contract（`src/domains/interview/meeting.ts`），不碰 Prisma/schema。
- [x] 新增 deterministic `buildMeetingSummarySkeleton()`：只從既有 transcript/manual-note turns 產生 cited decisions/action items/open questions，unknown 不升格 fact。
- [x] 新增 `assertMeetingSummarySkeletonSafety()` 與 `pnpm meeting:contract-dry-run`，驗證 citation turn ids、no provider、no DB write、no audio binary storage、no private transcript storage、no confirmed CRM fact write。
- [x] 更新 `asai.meeting.prototype` internal manifest 為 AMM-001a planned contract，保留 internal-only / no external registry posture，並標明 BFF/session/persistence 仍 blocked。
- [x] 跑 `pnpm meeting:contract-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21 AMM-001a）：本切片只採用 `src/domains/interview/meeting.ts` 作為 mainline source；未 stage 既有未追蹤 meeting UI / notes UI / note domain prototype。AMM-001a 時 `CLIENT_MEETING` schema、summary persistence 與 BFF/session route 仍待後續 slice。

完成註記（2026-06-21 AMM-001b）：新增 additive `InterviewKind.CLIENT_MEETING`、`AiModule.MEETING`、`InterviewMeetingSummary` Prisma model 與 `src/lib/interview/meeting-summary-repository.ts` persistence draft helper；`pnpm meeting:persistence-contract-dry-run` 證明 source turn / memory citation extraction、no provider、no DB write、no confirmed CRM fact write。此輪只跑 `prisma validate/generate`，未執行 db push/migration、未採用既有未追蹤 meeting UI / notes UI prototype。下一張最低未完成卡為 `AMM-002`：正式 BFF session/turn capture route，並需另行處理 DB migration execution proof。

### Batch AMM-002 — 捕捉層重用
- [x] `POST /api/ai/meeting/sessions`、`GET /api/ai/meeting/sessions/[id]`、`POST .../turns`（手動/文字/語音 final transcript）；語音沿用既有 interview realtime/transcribe；raw audio 不存。
- [x] API proof：unauth 401、member create/turn 201/200、清空 storage 可重讀。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21 AMM-002a）：新增 `src/lib/interview/meeting-session-repository.ts` 與 `/api/ai/meeting/sessions`、`/[sessionId]`、`/[sessionId]/turns`；BFF 只接受 current member scope，client/visitPlan 以 owner-scoped DB record resolve，使用 `CLIENT_MEETING` 與既有 InterviewTurn/Memory persistence，並以 payload guard 擋 raw audio/provider/secret/payment 欄位。對目前 `.env` development Supabase target 執行 additive `pnpm exec prisma db push`（無 reset/accept-data-loss），`pnpm meeting:bff-qa` 證明 unauth 401、member create/turn/readback、manager 404、DB metadata/turn/memory proof、raw payload blocked 且 `AiUsageLog` 150->150 unchanged。未採用既有未追蹤 meeting UI / notes UI prototype。

### Batch AMM-003 — 結構化摘要生成 + 引用
- [x] AMM-003a：`POST .../summary` deterministic/no-provider shell 由已持久化 turns/memories 產生並 upsert `InterviewMeetingSummary`，每要點帶 citation 連回已存在 turn/memory；支援明確 overwrite。
- [ ] AMM-003b：JSON mode provider 生成正式 `MeetingSummary`；success/error 寫 `AiUsageLog`；quota 429 不呼叫 provider；可重生覆蓋。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21 AMM-003a）：新增 `src/app/api/ai/meeting/sessions/[sessionId]/summary/route.ts` 與 `generateMeetingSummaryForMember()`，只接受 current member owner-scoped `CLIENT_MEETING`，使用已存 transcript/manual-note turns + Park memory IDs 建立 deterministic summary skeleton 並 upsert `InterviewMeetingSummary`。`pnpm meeting:summary-bff-qa` 證明 unauth 401、空來源 409、owner create 201、raw provider-like payload blocked 且不落 row、overwrite=false 409、overwrite=true 200、manager 404、DB summary row/citations/sourceTurnIds/guardEvidence proof、provider/model/usageLogId null、`AiUsageLog` 150->150 unchanged。未呼叫 provider；AMM-003b provider JSON mode 與 success/error `AiUsageLog` proof 仍未完成。

### Batch AMM-004 — 跨會議客戶記憶 + 對答
- [ ] 擴充 `retrieveInterviewMemories()` 支援可選 `clientId`（跨 session，保留 visibilityScope）；投影 CRM/policy/family/report/prior summary 成 memory。
- [ ] `POST .../chat`、`POST /api/ai/clients/[id]/memory-chat`，grounding = 本場 transcript + 客戶跨 session 記憶；答案分 fact/inference/unknown + citations。
- [ ] API proof：能引用過去會議與 CRM facts；無權客戶 403。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch AMM-005 — 全站入口與拜訪後筆記升級
- [ ] `拜訪後筆記` 升級為會議工作台（手動筆記 + 可選即時轉寫 + 自動摘要 + 對答），`postVisitNotes` 相容並存；入口加 dashboard/CRM client detail/訪前規劃。
- [ ] Browser proof：desktop/mobile console error 0、無水平 overflow、refresh persistence。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch AMM-006 — 寫回邊界
- [ ] 沿用 `writeback-boundary`：行動項→task、confirmed→CRM candidate、inference→insight、unknown→follow-up；confirmed+勾選才寫回；敏感客戶 reason/riskAccepted；皆 audit。
- [ ] API proof：inference checked 不變 CRM fact；confirmed checked 才寫回。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch AMM-007 — pgvector 規模化（operator 依賴）
- [ ] `InterviewMemory.embeddingStatus` 接 embedding，Supabase 啟用 pgvector；未啟用前 lexical fallback 並標 blocker。
- [ ] 動 schema 跑 Prisma validate/generate 與 local/development db push 或 migration dry-run。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch AMM-008 — 跨狀態 QA、docs sync、rollback note
- [ ] 端到端 + 隱私 + 用量 + persistence proof；rollback note；更新 `AGENTS.md`/`PLN-023`/report/issue-question；保存截圖。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma 與 Browser QA。

### Current AI Meeting Blockers
- `MeetingSummary` 正式表 development db push 已於 AMM-002a 對目前 `.env` target 執行；production migration / rollback plan 仍需明確 approval。
- raw audio 保存需 legal/compliance approval；預設不存。
- 跨會議向量檢索需 operator 在 Supabase 啟用 pgvector 與向量索引。
- 同 org 跨成員共享同客戶會議記憶屬 visibility 決策，預設 member-private，需 operator 決定。
- 即時視訊系統音訊捕捉非第一版範圍；第一版以現場麥克風面談為主。
- 若改 route/layout/server action/cookies/session 行為，先讀 `node_modules/next/dist/docs/` 對應 Next.js 文件。

---

## Relationship Network Graph Batch Tasks

Context: 修復 `/crm/[clientId]/relationships` 人物關係圖的建立/持久化 bug，並把「單一父指標的樹」升級為可表達網絡的「節點＋邊」模型。研究依據：`docs/07_research-and-design/RES-024_relationship-network-graph-creation-gap-research-v1.0.md`；逐張任務卡：`docs/05_execution-plans/PLN-024_relationship-network-graph-batch-tasks-v1.0.md`；驗收：`docs/08_acceptance-and-qa/ACC-016_relationship-network-graph-acceptance-framework-v1.0.md`。本條只做**關係圖資料來源收斂、建立/持久化修復、edge 語意與佈局、edge model 與驗收**；不改 SPIN 狀態機、不改 Theater enum/scoring、不刪合規欄位、不外洩 email/phone 到 org manager aggregate 或 client-facing 介面。REL-001/002/003 不動 schema；REL-004 才動 schema 且需可確認 DB target 與 migration/rollback note。對齊 Full-site BFF（BFF-103 CRM completion）。KEY = `REL`。下方為 workstream 鏡像（單一真相以本檔勾選狀態為準，與 PLN-024 同步）。

### Current Relationship Graph Gaps
- REL-001/002/003/005 已完成 no-schema 修復與 polish：runtime 不再讀寫 `Client.parentMemberId`，root-connected 長輩會畫成 `PARENT_OF` edge，child / parent create path 都改為 BFF-confirmed，edge list 由同一個 review builder 推導，關係圖具 keyboard/aria toolbar 與跨狀態 Browser proof。
- **G4 剩餘 schema gap**：正式 `RelationshipEdge` edge table 尚未建立；目前先由 `FamilyMember.parentMemberId` + `relation` deterministic 推導雙親、配偶、手足、社會關係 edge。REL-004 需 migration/rollback approval。

### Batch REL-001 — 最小修復：移除幽靈欄位、修長輩連線（不動 schema）
- [x] 移除 / 廢用 UI 對 `Client.parentMemberId` 的必要依賴，直到 REL-004 有正式 schema：`RelationshipMap.tsx:149-159` client-parent edge、`:180` `isClientParent` dead code；source audit confirmed `relationship-graph.ts` `getParentLabel` only depends on `FamilyMember.parentMemberId`.
- [x] 修 `RelationshipMap.tsx:186` 長輩 early-return：長輩直接掛主客戶時畫成方向正確的 `PARENT_OF`（長輩→主客戶）邊，不再漂浮孤立。
- [x] edge label / 方向統一（不再父→客戶硬寫「子女」與其他成員 `member.relation` 兩套邏輯）。
- [x] 不改 SPIN 狀態機、不改 Theater enum/scoring、不刪合規欄位。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；Browser proof 長輩有連線、desktop/mobile 無 overflow、console error 0。

### Batch REL-002 — 建立流程收斂到 BFF（child + parent 一致持久化）
- [x] `AddRelationshipDialog.tsx` parent mode 改走 BFF：`createFamilyMemberRemote` + 既有 `PATCH /api/clients/[id]/family-members/[memberId]` re-parent，不再 local-only。
- [x] child / parent 兩 mode 都 server-confirmed；client store local write 改 remote-confirmed cache 或標 dev-only（對齊 BFF-103）。
- [x] write 由 server session 推導 organization/owner；DTO 保留 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [x] API proof：401、foreign client 403/404、缺欄位 400、成功 200/201。
- [x] **Persist proof**：清空 browser storage / 新 context 後父母與子女關係仍在（不再 refresh 消失）。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20 REL-001/002）：移除 `Client.parentMemberId` domain runtime 欄位與 `RelationshipMap` 對它的 client-parent edge/dead-code 依賴；root-connected 長輩改由 `FamilyMember.relation`/generation 推導為長輩→主客戶 edge。`AddRelationshipDialog` parent mode 改為 `createFamilyMemberRemote` 建父節點，再以 `updateFamilyMemberRemote` re-parent target child；local family write helper 已標 dev-only。`pnpm client:relationship-graph-write-qa` 通過 unauth 401、missing name 400、member re-parent 200、self/cycle 400、manager 404、delete 200、root elder reload proof、browser toolbar 新增父節點後 reload 仍 `連結至` 新父節點、desktop/mobile no overflow、no-provider proof；`pnpm client:relationship-graph-qa` 仍通過來源審查與 seeded email/phone sentinel。

### Batch REL-003 — BFF edge 推導 + 渲染收斂 + 配偶 union（不動 schema）
- [x] BFF 由既有 `FamilyMember`（`parentMemberId` + `relation`）推導 edge list：`PARENT_OF`/`SPOUSE_OF`/`SIBLING_OF`/`CHILD_OF`/`SOCIAL_TIE`，附 `factStatus`（對齊 `relationship-graph.ts`）。
- [x] `RelationshipMap` 改吃 BFF 推導 nodes/edges，與 review 收斂為同一份真相（解 G6）。
- [x] 配偶改同 rank 結合線/union（pair-bond），非有向父子邊；社會關係以關聯線呈現。
- [x] edge list / node DTO 不外洩 email/phone（sentinel 掃描 0）。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；Browser proof 配偶/雙親/手足渲染正確。

完成註記（2026-06-20 REL-003）：`ClientRelationshipGraphReview` 新增 typed `edges` 與 `sourceSummary.edgeCount`，由既有 `FamilyMember.parentMemberId` 與 `relation` 推導 `PARENT_OF` / `SPOUSE_OF` / `SIBLING_OF` / `SOCIAL_TIE` edge，保留 `CHILD_OF` type 作 schema-era compatibility；`RelationshipMap` 改以同一個 review builder 的 nodes/edges 轉成 ReactFlow，配偶/手足作同 rank layout hint，社會關係不參與階層 rank；來源審查面板顯示 edge count。`pnpm client:relationship-graph-qa` 覆蓋 edge type、edge factStatus、node/edge count、email/phone sentinel、desktop/mobile no overflow；`pnpm client:relationship-graph-write-qa` 仍通過 parent create/reload/delete proof。

### Batch REL-004 — 完整 edge model（動 schema，需 approval）
- [ ] Prisma 新增 `RelationshipEdge`（`sourceNodeId`/`targetNodeId`/`type`/`factStatus`/`label?`/`metadata?`），帶可驗證 `organizationId`；保留 `FamilyMember` 作 compatibility。
- [ ] 支援多親、配偶結合、手足、離婚/監護、社會關係；主客戶為節點，不再依賴幽靈欄位。
- [ ] Repository / DTO 邊界：UI 不直接 import Prisma；read/write server-scoped。
- [ ] Backfill idempotent：既有 `parentMemberId` 轉 `PARENT_OF` edge，不破壞真實資料。
- [ ] 動 schema 跑 `pnpm prisma:validate`、`pnpm prisma:generate`，可確認 DB target 才 `db push`/migration dry-run，附 rollback note。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

### Batch REL-005 — 佈局/互動 polish + 驗收 + 文件同步
- [x] 佈局：dagre/elk 處理同 rank 配偶與手足排序；社會邊不破壞世代階層；尊重 `prefers-reduced-motion`。
- [x] 互動 polish：節點/toolbar action 有 tooltip + `aria-label`；keyboard 可操作。
- [x] 跨狀態 Browser QA（空/單親/雙親/配偶/社會關係）；截圖存 `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/`。
- [x] 更新 `AGENTS.md`、`PLN-024`、必要 report / issue-question。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20 REL-005）：`RelationshipMap` 將節點改為可 focus 的 `role=group`，keyboard focus 時也顯示新增父/子節點 toolbar；toolbar actions 補 `aria-label`、native `title` tooltip、可見 focus ring 與 reduced-motion-friendly transition。配偶/手足/社會關係的同 rank layout hint 改為 deterministic spacing，圖例與畫布補可辨識 label，視覺收斂為 hairline/無陰影。新增 `pnpm client:relationship-graph-polish-qa`，以 demo BFF 建立空關係、單親、雙親＋配偶＋手足＋社會關係三組客戶，驗證 API edge types、準備包 question handoff、劇場 readiness、desktop/mobile/reduced-motion/dark proof、toolbar aria/title/focus、no overflow、console error 0、email/phone sentinel 0。未改 Prisma schema、不呼叫 provider。

### Current Relationship Graph Blockers
- REL-004 動 schema 需可確認 DB target（local/development/已授權 staging）與 migration/rollback approval；無法確認時停在 REL-001..REL-003/005 不動 schema 切片。
- 若改 route/layout/server action/session 行為，先讀 `node_modules/next/dist/docs/` 對應 Next.js 版本文件。
- 高敏感客戶關係資料進劇場仍走既有 reason/riskAccepted gate（TDF-004），不得繞過。

Whole-product review 註記（2026-06-20 fifth-loop calibration）：BFF-103a/103b 已讓關係圖 review 與 family edit/delete 具備 server proof，但 source audit 仍看到 `Client.parentMemberId` 與 Prisma schema 不一致、`RelationshipMap.tsx` 長輩 early-return 造成孤立節點、`AddRelationshipDialog.tsx` parent mode 仍 local-only。下一輪最高槓桿建議合併做 `REL-001/REL-002` no-schema repair：先不碰 Prisma schema、不改合規欄位、不呼叫 provider，修到 parent/elder relation 可連線、建立流程 BFF-confirmed、refresh/new context 持久化可驗。
- 與 `PLN-023`（AI Meeting Module）為不同 workstream，勿混改其檔案。

---

## NANDA / AgentFacts AI Protocol Alignment Batch Tasks

Context: 將誠問 AI 內所有 AI 能力逐步對齊 MIT Project NANDA / AgentFacts 的 agent protocol 思路：每個 AI 都要可描述、可驗證、可被 internal registry 管理，並保留未來 external NANDA / MCP / A2A / HTTPS adapter 登記能力。本條只做**AI module protocol contract、internal manifest/registry、registration readiness、adapter boundary、least-disclosure proof**；不直接對外發布 registry、不開跨組織 agent access、不繞過 `AiUsageLog`、不暴露 raw prompt/provider/private payload。KEY = `NAP`。

### Current NANDA / Agent Protocol Gaps
- `AUD-008` 已完成 NAP-001 inventory：`問誠問 AI`、`AI 了解客戶`、quick-capture、Realtime voice、SPIN、訪前規劃、report generation、legacy Theater、Route B Theater、RAG guarded-disabled、AI Meeting / notes prototype 都已映射到 internal AgentFacts-style module inventory；目前全數仍為 `internal-only`。
- NAP-002 已建立 `AgentProtocolManifest` source schema、11 個 internal-only manifest 與 `pnpm ai:protocol-registry-qa`；多數正式 AI route 已有 session/quota/`AiUsageLog` 或 deterministic no-provider proof。
- NAP-004 已建立 platform-only internal registry readiness reader、least-disclosure API 與 release-readiness projection；platform user 可讀、member app session 403，且所有 agent 仍為 `internal-only`。
- ITA-003g 已補 `asai.theater.route_b` manifest source alignment：runtime preflight capability、director/character/feedback actions、`RouteBRuntimeInputPreview` DTO refs、guarded-disabled provider posture、visibility-safe history 與 success/error `AiUsageLog` plan 已有 source/API proof；legacy Theater 與其他 AI modules 仍待 NAP-003 完整對齊。
- Quiet NAP-003 gap research（2026-06-21）：`AUD-008` 已新增 NAP-003 source adoption matrix，用六視框把 11 個 AI module 拆成 source owner、目前 proof、adoption gap、下一個最小 slice、proof command 與 blocker。
- NAP-003a（2026-06-21）已完成 CHAT / VISIT / REPORT / SPIN provider-ready source adoption：四個 manifest 都新增 source owner proof、DTO/evidence boundary、quota/`AiUsageLog` posture 與 NAP-003a static QA；未呼叫 provider、不改 SPIN 狀態機，所有 module 仍為 `internal-only`。
- NAP-003c（2026-06-21）已完成 legacy Theater / Route B Theater / RAG private beta source adoption；缺口轉為 NAP-005 local-only adapter/export dry-run。
- NANDA / AgentFacts 對外 registry publication、signing、public discovery endpoint、cross-org agent access 都需 operator approval；目前只允許 internal manifest / adapter proof。

### Batch NAP-001 — AI module inventory and NANDA mapping
- [x] 盤點所有 AI route / module / agent-like workflow：chat、interview、interview outputs、SPIN、visit、report、theater legacy、Route B runtime、RAG、AI Meeting / notes prototype。
- [x] 為每個 AI 建立 mapping：agent id、surface owner、capability、endpoint/action、input/output DTO、auth/session scope、data class、provider posture、quota、`AiUsageLog` policy、registration readiness。
- [x] 標出不可外部登記的資料：raw prompt、private transcript、policy number、email/phone、secret/token、provider payload。
- [x] 產出 NANDA / AgentFacts alignment report，列出 `internal-only` / `registry-draft` / `external-ready` / `external-registered` 狀態。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；不改 product source 時至少跑 `git diff --check`。

完成註記（2026-06-21 NAP-001）：新增 `AUD-008_nanda-agentfacts-ai-module-inventory-v1.0.md`，以 Project NANDA / AgentFacts primary research、`node scripts/ai-usage-route-audit.mjs` route audit（23 routes、13 provider-ready、10 no-provider、gaps 0）與六視框 gap review 建立 AI module inventory。所有 module 目前標為 `internal-only`；未呼叫 provider、未改 product runtime source、未動 DB/Prisma、未對外發布 registry。

### Batch NAP-002 — Internal AgentFacts-style manifest schema
- [x] 建立 `AgentProtocolManifest` 或等價 type/schema，覆蓋 identity、capabilities、modalities、endpoints/actions、schemas、auth scopes、data classes、trust/compliance、quota/cost、audit/usage、version/status、registry readiness。
- [x] Manifest 不得含 raw secret、raw prompt、raw provider payload、private transcript、email/phone/policyNumber sentinel。
- [x] 支援 protocol-neutral export target：NANDA AgentFacts-style JSON、MCP descriptor、A2A Agent Card 或 standard HTTPS metadata（先 internal draft，不對外發布）。
- [x] 補 static QA script：掃描所有 manifest 欄位完整性、sentinel、`AiUsageLog` policy 與 readiness 狀態。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 與新增 QA。

完成註記（2026-06-21 NAP-002）：新增 `src/domains/ai-protocol/` 的 `AgentProtocolManifest` schema 與 11 個 internal-only manifest，覆蓋 chat、interview、quick-capture、Realtime voice、SPIN、visit、report、legacy Theater、Route B Theater、RAG guarded-disabled、AI Meeting prototype。新增 `pnpm ai:protocol-registry-qa` 檢查 manifest completeness、sentinel、`AiUsageLog` policy、readiness 與 disabled publication gate；`pnpm ai:bff-audit` 仍為 route/AiUsage source proof。未呼叫 provider、未動 DB/Prisma、未對外發布 registry。

### Batch NAP-003 — Per-AI manifest adoption and source alignment
- [x] 將 `CHAT` / assistant manifest 對齊 route owner proof，標明 assistant conversation/message persistence、tool allowlist、quota、usage logging。
- [x] 將 `INTERVIEW` / `INTERVIEW_OUTPUTS` / quick-capture manifest 對齊 source proof，標明 memory/writeback/confirmation boundary。
- [x] 將 `VISIT` / `REPORT` AI manifest 對齊 source proof，標明 provider-safe client snapshot、facts/inferences/unknowns DTO。
- [x] 將 `SPIN` manifest 對齊 source proof，明確保留 `SITUATION -> PROBLEM -> IMPLICATION -> NEED_PAYOFF` state machine。
- [x] 將 `THEATER` legacy / Route B manifest 對齊 source proof，標明 guarded-disabled provider posture、director/character/feedback readiness 與 private/group visibility。
- [x] 將 `RAG` manifest 對齊 source proof，標明 private beta guarded-disabled posture。
- [x] 跑 `pnpm ai:bff-audit`、`pnpm ai:protocol-registry-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-21 NAP-003a）：`asai.chat.assistant`、`asai.visit.preparation_package`、`asai.report.generation`、`asai.spin.advisor` 已在 `AgentProtocolManifest` 新增 `proof.sourceAdoption.status=adopted`、source owner refs、evidence refs 與 source adoption notes；`scripts/ai-protocol-registry-qa.ts` 會強制檢查四個 provider-ready module 的 NAP-003a adoption proof。`pnpm bff:visit-report-ai-qa` 會實際觸發 provider 成功路徑，本輪依 no-provider slice 不執行，改以 static/source proof 與非 provider QA 收斂。

完成註記（2026-06-21 NAP-003b）：`asai.interview.companion`、`asai.interview.quick_capture`、`asai.interview.realtime_voice` 已在 `AgentProtocolManifest` 新增 `proof.sourceAdoption.status=adopted`。Evidence 覆蓋 interview provider turn/output 的 memory loop 與 success/error `AiUsageLog` helper、deterministic session/memory/reflection persistence、writeback confirmation/draft handoff、quick-capture no-provider/high-sensitive/no raw note echo proof、realtime dry-run/event-mirror/transcription provider 邊界。`scripts/ai-protocol-registry-qa.ts` 已擴為強制檢查 NAP-003a/b source adoption requirements；live WebRTC 與外部 registry publication 仍是 blocker。

Whole-product review 註記（2026-06-21 after NAP-003b）：第五輪 LV3 校準確認 NAP-003a/b 與 ITA-003g 已把 provider-ready、interview、quick-capture、realtime voice、Route B runtime preflight 的 source/proof 底座補齊；下一個最高槓桿不再是單一 AI manifest，而是 `LV3-CROSS-001 clean cross-flow no-provider proof pack`。下一輪應用 clean context 證明 client / relationship graph / previsit reasoning evidence / quick-capture 或 interview writeback / Route B theater stage 能串成低噪音、無 raw-ID、無 provider call 的顧問旅程；若範圍過大，fallback 為 NAP-003c theater+RAG source adoption，再 fallback NAP-005 local-only adapter/export dry-run。仍不得在未獲 operator approval 前做 live provider Route B、live WebRTC、external registry publication 或 production write。

LV3-CROSS-001 proof pack 註記（2026-06-21）：新增 `pnpm lv3:cross-flow-no-provider-qa`，串跑 client relationship graph、visit/pre-visit BFF、quick-capture BFF/UI、Route B session/UI/interaction 與 `ai:bff-audit`，並在 wrapper 層驗證 `AiUsageLog` count unchanged。初版 proof pack 曾納入 `interview:draft-writeback-qa`，browser path 會呼叫 `/api/ai/interview`；該 provider risk 已移除，最終 committed script 改用 no-provider quick-capture BFF/UI proof。下一輪回到 `NAP-003c theater + RAG source adoption`，補 legacy Theater、Route B Theater 與 RAG guarded-disabled source adoption，不做 external registry publication。

完成註記（2026-06-21 NAP-003c）：`asai.theater.legacy`、`asai.theater.route_b`、`asai.rag.private_beta` 已在 `AgentProtocolManifest` 新增 `proof.sourceAdoption.status=adopted`。Legacy Theater 保留 protected enum/scoring 與 guarded demo / Route B required gate；Route B adoption 覆蓋 deterministic session/turn persistence、private/group visibility、state proposals、guarded runtime preflight 與 success/error `AiUsageLog` plan；RAG adoption 覆蓋 guarded-disabled private beta no-provider posture。`scripts/ai-protocol-registry-qa.ts` now enforces NAP-003a/b/c source adoption requirements。未呼叫 provider、未動 schema、未做 external registry publication。

### Batch NAP-004 — Internal registry and readiness API
- [x] 建立 internal registry reader（server-only），可列出 AI manifests、readiness、missing proof、operator approval blockers。
- [x] Platform readiness / release readiness 可顯示每個 AI 的 protocol readiness，不把 `registry-draft` 顯示為 external registered。
- [x] API response 使用 least-disclosure DTO，不回 private prompt/provider payload。
- [x] Browser/API proof 覆蓋 platform user 可讀、member/client 無權讀、private sentinel 0。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、targeted QA。

完成註記（2026-06-21 NAP-004）：新增 `getAgentProtocolRegistryReadiness()` platform-scoped least-disclosure DTO、`/api/platform/ai-protocol/registry` platform-only no-store API、release-readiness `aiProtocol` projection，以及 `pnpm ai:protocol-readiness-qa`。HTTP proof 覆蓋 member app session 403、platform session 200、registry/release-readiness total 與 `internal-only` readiness 一致、private sentinel 0。未呼叫 provider、未動 Prisma schema、未做 DB write、未對外發布 registry。

### Batch NAP-005 — External registration gate and adapter proof
- [x] 定義 external NANDA / MCP / A2A / HTTPS adapter publication gate：operator approval、signing/credential policy、public discovery endpoint、revocation/key rotation、privacy redaction、rollback。
- [x] 建立 local-only adapter/export dry-run，不呼叫外部 registry、不發布 public endpoint。
- [x] Proof 顯示 exported metadata schema-valid、least-disclosure、versioned、revocable、且未含 secret/private sentinel。
- [x] 更新 issue-question 記錄 external publication / signing / cross-org agent access approval。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、adapter dry-run QA。

完成註記（2026-06-21 NAP-005）：新增 `src/domains/ai-protocol/adapter-export.ts` 與 `pnpm ai:protocol-adapter-dry-run-qa`，可從 11 個 internal-only manifest 產生 NANDA AgentFacts-style JSON、MCP descriptor、A2A Agent Card、HTTPS metadata 四種 local-only draft。Publication gate 固定要求 operator approval、signing material policy、public discovery owner/rollback、revocation/rotation plan、privacy redaction review、cross-organization access policy；dry-run proof 確認 4 個 export target schema-valid、versioned、revocable、least-disclosure、無 private sentinel、無 provider invocation、無 DB write、無 external-ready / external-registered 宣稱、未對外發布 registry。

### Current NANDA / Agent Protocol Blockers
- NANDA / AgentFacts 規格仍在演進；本 repo 先採「NANDA-aligned internal manifest」，不宣稱正式相容或已登記。
- 對外 registry publication、public discovery endpoint、credential signing、cross-org agent access 需 operator approval。
- 若任何 AI provider call 被新增或改動，仍必須先滿足 session/quota/`AiUsageLog` success/error proof。

---


## 文件慣例（新增任何規劃/設計/報告/驗收文件時）

- docs 採「分類資料夾 + 類型前綴流水號」：`<TYPE>-<NNN>_<kebab-slug>.md`。規則見 `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`。
- 依**文件屬性**選 TYPE：需求=`PRD`、架構/設計/規則=`ARC`、計畫/路線圖/批次=`PLN`、審計=`AUD`、報告=`RPT`、研究=`RES`、驗收=`ACC`。
- 新增後務必到 `docs/00_manual-and-index/MAN-001_document-index.md` 補一列。
- 過期文件不刪除，於文內標 `superseded by <TYPE-NNN>` 並在索引備註。
