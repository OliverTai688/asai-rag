# 誠問 AI Interview × Theater Gate Readiness Audit v1.0

> 建立日期：2026-06-18  
> 狀態：ITA-000 gate packet（core decisions approved）  
> 對應任務：`AGENTS.md` 的 `Batch ITA-000 — 情境定案與基線收斂`

---

## 1. 結論

PSA-005 目前只剩 DB/auth 相關驗證項阻擋，因此下一個可推進 workstream 是「訪談 × 劇場雙 Agent」。但 ITA-001 之前必須先處理 ITA-000 gate，因為現行設計會碰到三種高風險邊界：

- `AGENTS.md` hard rule #3 目前禁止改 Theater persona enum 與 scoring/turn 型別。
- `ARC-004` v1.1 的目標是多角色、Big Five、取消 tension/score，與 hard rule #3 方向衝突。
- `RES-001` 仍有 A4、D16、D18、B9 等情境層待定，會影響資料模型、權限、成本與事實邊界。

本文件把 ITA-000 需要 operator 核可的內容整理成「可批准的預設決策」。2026-06-18 operator 已批准 Theater Route B（一次切換且不保留 legacy fallback）、A4 訪談產出與 `VisitPlan` 分工、D16 真實客戶資料進劇場界線、D18 成本/配額分級、B9 NPC 防幻覺與旁白 NPC 補資訊機制、Supabase Auth、綠界測試環境完整整合加 production readiness、PQ 可由 AI 改寫但需保留 intent/evidence 標記、Issue 0-5 visibility policy、OpenAI quota 可用後重測、working tree 可整理 review 節點。

---

## 2. Gate 決策包

### A4：訪談產出與 `VisitPlan` 合併

建議定案：

- 訪談 Agent 的「對話準備卡」不另建一套重複 planning entity。
- 訪談結束後產出可升級或寫入既有 `VisitPlan`：
  - `objectives`
  - `spinQuestions`
  - `objections`
  - `materials`
  - future metadata：`generatedFromInterviewSessionId`
- `InterviewSession` 保留逐段訪談素材、推論、確認卡與 AI trace；`VisitPlan` 保留顧問真正拿去執行的訪前準備。

理由：

- 避免「訪談準備卡」與既有訪前規劃同時存在而打架。
- 對現有 `/pre-visit`、Quickstart、report flow 的影響最小。
- 不碰 SPIN 狀態機，也不刪合規欄位。

核可狀態：2026-06-18 operator 已批准。訪談保留素材與確認卡；`VisitPlan` 保留真正拿去拜訪的準備包。

### D16：真實客戶資料進劇場界線

建議定案：

- 真實客戶只能由該客戶 owner 顧問啟用劇場建場。
- Org manager 只能看彙總與輔導指標，不看客戶明細、逐字稿或角色私聊內容。
- `sensitivityLevel` 高敏感客戶預設不可直接進劇場；owner 顧問輸入 reason 並同意風險後可使用。
- 劇場逐字稿不提供 public share；若未來支援分享，必須另開權限與 audit 設計。
- 劇場角色卡標記事實/推論：
  - fact：來自 CRM / policy / visit / confirmed interview
  - inference：AI 依訪談推論，預設不寫回客戶檔
  - unknown：角色應表達不確定，不得補造

理由：

- 符合 PSA 決策：org manager 不看 member 客戶明細。
- 保留合規欄位硬規則：`sensitivityLevel` 不得 optional，且要真正影響使用邊界。
- 降低把真實客戶人格化模擬帶來的個資與倫理風險。

核可狀態：2026-06-18 operator 已批准採用本界線作為後續設計預設；org manager 仍只看彙總。

### D18：成本與配額分級

建議定案：

- 以 `AiUsageLog` 作為訪談/劇場成本計量基礎。
- Subscription capability 分成：
  - interview sessions per month
  - theater sessions per month
  - theater turns or token budget per month
  - multi-character theater enabled
  - feedback perspectives enabled
- Personal/team/enterprise 共用 `PlanConfig.monthlyAiQuota`，但劇場要另有 theater sessions / turns soft quota UI，因為群聊每回合可能 2-3 次 LLM call。
- 超額不能只在前端擋；API route 也要檢查 plan/quota。

理由：

- `AGENTS.md` hard rule #4 要求每次 OpenAI/Anthropic call 寫 `AiUsageLog`。
- Theater 群聊成本會比單角色高，若沒有 quota gate，enterprise pilot 很容易成本失控。
- 與 PSA-003 plan config、PSA-008 billing 能力銜接。

核可狀態：2026-06-18 operator 已批准依建議實作。

### B9：NPC 事實一致性與防幻覺

建議定案：

- NPC 只能引用其可見範圍內的 facts：
  - scene setup
  - confirmed client fields
  - confirmed interview facts
  - visible conversation history
- NPC 可以表達推論或感受，但必須以不確定語氣呈現，不能把推論說成事實。
- 不知道的資訊一律用「不確定 / 沒印象 / 我要確認」類回應，不得補造保單、收入、家庭成員、病史、資產數字。
- 每條 theater memory 應有 `visibilityScope`，私聊內容不自動外洩到群聊。
- 若未來接 RAG，RAG 只能提供引用依據；沒有來源仍不可補造。
- 若場景需要但資料缺口存在，旁白 NPC 以情境問題詢問使用者；使用者可略過或補充資訊，補充內容進入 fact/inference/unknown 流程。

理由：

- 這是合規與訓練可信度的核心線。
- 與 D16 的可見範圍、B7 私聊外洩控制、ITA-003 multi-character memory model 直接相依。

核可狀態：2026-06-18 operator 已批准，並新增旁白 NPC 補資訊機制。

---

## 3. Theater Hard Rule 衝突

現行 hard rule：

> Theater persona enum：`CONSERVATIVE`、`SKEPTICAL`、`BUSY`、`EMOTIONAL` 為 typed enum；scoring 與回合在 server 端追蹤，不得改型別。

`ARC-004` v1.1 目標：

- Big Five + CAPS 取代固定 persona type。
- 多角色 `TheaterCharacter`。
- `TheaterTurn` 需 `speaker/addressee/visibilityScope`。
- 取消數值 `tension`。
- 五視角質化回饋取代分數式 scoring。

衝突判斷：

- ITA-001 可先做 `interview` domain 與訪綱 A 獨立模式，只要不改既有 `/spin` 與 Theater 型別。
- ITA-003 / ITA-006 不可開始 schema/type 變更，除非 operator 明確批准更新 hard rule #3。
- 若需要保守兼容路線，可保留舊 enum 作 `legacyPersonaType`，新增 `TheaterCharacter` 作新流程，舊 `/theater` 穩定前維持不破。

建議核可選項與決策：

1. **保守兼容**：保留舊 enum/score API，新增新劇場模型；舊頁逐步遷移。
2. **一次切換（2026-06-18 operator 選 B，且 2026-06-18 追加不保留 legacy fallback）**：直接改 Theater schema 與 API；以新版劇場為主，需完整 migration、QA 與資料備份/回滾說明，但不做 legacy viewer 作新主流程。
3. **暫緩 Theater**：先只做 Interview Agent，Theater 多角色等 production DB/auth 穩定後再開。

---

## 4. 內容缺口

### PQ 題庫與 Issue 0-5 定義

2026-06-18 operator 指示：PQ 題庫由 agent 先起草；Issue 0-5 需以論文構面研究後重設更完整版本。

已新增研究文件：`docs/07_research-and-design/RES-010_issue-maturity-and-pq-construct-research-v1.0.md`。

研究版定義：

- Issue 0-5 改稱 **Issue Readiness Level, IRL（議題就緒度）**，衡量顧問是否掌握足夠事實、問題表徵、風險/因應、決策準備與行動性。
- PQ 題庫分成家庭責任、收入中斷、醫療長照、退休現金流、子女/依賴者、保單理解與決策一致性。
- 每個素材需標記 `fact`、`confirmed`、`inference`、`unknown`，避免把 AI 推論當成客戶事實。
- Org admin 只看彙總與輔導指標，不看客戶明細或逐字稿。
- 顧問端只顯示文字缺口，不顯示 L0-L5；org admin 看彙總；super admin 在權限/audit 條件下可調出 L0-L5。
- PQ 題目可由 AI 改寫語氣，但需保留 intent key 與 fact/inference/unknown 標記。
- 若無公司既有問卷，採 `RES-011` 的 canonical KYC/PQ mapping；未來提供公司問卷時只做欄位映射與語氣替換。

仍需 operator/業務提供：

- 正式品牌話術與合規審核。
- 若有公司既有問卷，提供題號/題文/版本供 `RES-011` mapping。

---

## 5. Engineering Baseline

2026-06-18 已完成可開發前檢查：

- `pnpm demo:runtime-audit` 通過。
- targeted ESLint 通過。
- `pnpm exec tsc --noEmit --pretty false` 通過。
- `pnpm lint:changed` 通過。

但 working tree 尚未乾淨：

- 有大量前序 PSA/MM/AIS 文件、UI、schema 與 script 變更。
- DB schema 已於 2026-06-18 重新驗證：`pnpm prisma db push --accept-data-loss` 回報資料庫已與 Prisma schema 同步；`pnpm demo:preflight` 與 `pnpm demo:seed:reset` 均已通過。
- 未建立可 review 的小分支/commit 邊界。

建議在 ITA-001 實作前先做一次人工 review 節點：

- 決定是否先提交目前 PSA/MM/AIS 累積變更。
- 清空 browser storage 後，用 demo account 完成重新登入與 DB-backed 範例資料驗證。
- 依 `PLN-016` 整理 review 節點。

---

## 6. Go / No-Go

可先做：

- 建立 `src/domains/interview/` 的純 TS 型別與訪綱 A 常數。
- 設計 `InterviewSession` draft type，但不進 Prisma migration。
- 撰寫不碰 Theater 的訪談 engine service。

不可先做：

- 在 ITA-003 之外臨時改 Theater enum。
- 在沒有 migration / rollback / QA notes 的情況下移除 tension/score。
- 在沒有依 Route B 規格同步文件與測試的情況下新增 Theater multi-character migration。
- 讓真實高敏感客戶在沒有 owner reason 與風險同意的情況下進劇場。
- 宣稱 demo account 已 DB-backed 完成，直到 DB seed/reset 與清 storage relogin 驗證通過。
