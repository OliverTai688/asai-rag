# 誠問 AI Interview × Theater Dual Agent Batch Tasks v1.0

> 建立日期：2026-06-18  
> 狀態：進行中  
> 架構依據：`ARC-004_interview-theater-dual-agent-design-v1.1.md`、`ARC-005_interview-theater-dual-agent-design-v1.0.md`  
> 研究依據：`RES-003_theater-field-semi-structured-interview-guide.md`、`RES-004_advisor-companion-semi-structured-interview-guide.md`、`RES-010_issue-maturity-and-pq-construct-research-v1.0.md`  
> Gate 依據：`AUD-004_interview-theater-gate-readiness-audit-v1.0.md`  
> 驗收依據：`ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`

本計畫把 `AGENTS.md` 的「訪談 × 劇場 雙 Agent」workstream 拆成可逐張執行的 batch tasks。範圍包含：訪談 Agent、客戶資料模式、劇場多角色一次切換、五視角質化回饋、異議/紅線偵測、RAG/pgvector 樁與 DB persistence。任何卡都不得破壞合規欄位、SPIN 狀態機或 `AiUsageLog` 成本追蹤。

---

## 0. 執行協定

每張卡固定流程：

1. **讀文件**：`AGENTS.md`、`ARC-004`、`AUD-004`、本 `PLN-015`、`ACC-006`。涉及 PQ/Issue 時讀 `RES-010`；涉及訪綱 A/B 時讀 `RES-004` / `RES-003`。
2. **讀 Next.js 文件**：若改 route、layout、server action、streaming、cookies/session，先讀 `node_modules/next/dist/docs/` 對應章節。
3. **先寫 contract**：新增或修改 type / schema / API 前，先確認 data visibility、fact/inference/unknown、AiUsageLog、org manager visibility、client sensitivity。
4. **保護 legacy**：SPIN legacy 狀態機不可改。Theater Route B 已核可，但只允許 ITA-003/ITA-006 依本文件 migration plan 一次切換。
5. **成本與 audit**：每次 OpenAI/Anthropic call 必須寫 `AiUsageLog`；高敏感客戶、impersonation、真實客戶進劇場需 audit reason。
6. **驗收指令**：跑 `pnpm lint:changed`；動 Prisma schema 跑 `pnpm prisma:validate`、`pnpm prisma:generate`，需要 DB 實套時再跑 `pnpm prisma db push --accept-data-loss` 或 migration。
7. **打勾同步**：完成後同步本文件與 `AGENTS.md` 勾選狀態，並註記變更檔案、QA 結果與仍未完成項。

---

## 1. 進度看板

| 卡片 | 主題 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| ITA-000 | 情境定案與基線收斂 | [~] | `AUD-004` |
| ITA-001 | 訪談引擎 + 訪綱 A + 獨立模式 | [~] | ITA-000 可部分並行 |
| ITA-002 | 客戶資料模式 + 確認寫回 | [ ] | ITA-001、Supabase Auth/session |
| ITA-003 | 劇場多角色 + 導演編排 + 群/私聊 | [ ] | ITA-000 Route B、ITA-001 |
| ITA-004 | 五視角質化回饋 | [ ] | ITA-003 或 ITA-001 feedback contract |
| ITA-005 | 異議庫 + 紅線偵測 | [ ] | ITA-003、ITA-004 |
| ITA-006 | 真實資料 migration + RAG 樁 + pgvector | [ ] | ITA-002、ITA-003、Supabase pgvector |

---

## Batch ITA-000 - 情境定案與基線收斂

目標：把高風險產品決策、Theater hard rule 例外、PQ/Issue 內容與工程基線收斂到可開發狀態。

- [x] 定案 022 的 ★ 項並回寫 `ARC-004` / `RES-001`：A4（訪談產出與 `VisitPlan` 合併）、D16（真實客戶入劇場界線）、D18（成本/配額分級）、B9（NPC 防幻覺事實邊界）。
- [x] 取得 Theater 資料模型變更核可：operator 2026-06-18 選 Route B 一次切換；只允許 ITA-003/ITA-006 依本計畫遷移。
- [x] 補內容空缺：`RES-010` 已建立 PQ 題庫與 Issue Readiness Level 0-5 研究版。
- [ ] working tree 收斂：整理現況、確認可 review 範圍、必要時建立 commit/PR 邊界。
- [x] 跑 `pnpm lint:changed`。

範圍外：不直接改 Theater schema；不把 A4/D18/B9 視為已明確核可。

狀態：[~] 進行中（2026-06-18）。

已完成：
- `AUD-004` 建立 gate packet。
- `RES-010` 建立論文構面版 PQ/Issue 研究。
- `AGENTS.md` hard rule #3 已更新為 Route B 例外保護規則。
- 2026-06-18 operator 已核可 A4、D18、B9、IRL visibility、PQ 改寫、旁白 NPC、高敏感客戶 reason/risk consent、Route B 不保留 legacy fallback。
- `RES-011` 已建立 KYC/PQ canonical mapping 研究，作為沒有公司既有問卷時的解決方案。
- `src/domains/interview/pq-compliance.ts` 已落地 KYC/PQ canonical mapping constants 與 compliance gap helper。
- `PLN-016` 已建立 review node splitting plan。
- OpenAI quota 補上後已重啟 dev server，使用 `demo_org_asai_personal` 重測 `/api/ai/interview/outputs` 成功回 200，草稿含 known facts、unknowns、SPIN/PQ 候選、Issue Readiness 與 compliance notes；`AiUsageLog` 實際寫入驗證 count 2 -> 3。
- `pnpm prisma db push --accept-data-loss`、`pnpm demo:preflight`、`pnpm demo:seed:reset`、`pnpm demo:runtime-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 已通過。

仍待：
- working tree 大量既有變更依 `PLN-016` 切分 review 邊界。
- `/interview` 頁面按鈕層的完整 Browser 成功生成截圖與 console QA。

---

## Batch ITA-001 - 訪談引擎 + 訪綱 A + 獨立模式

目標：完成不依賴 CRM 的顧問陪談 M1，從訪談對話收斂為可編輯的「客戶輪廓表＋對話準備卡」。

- [x] 新建 `src/domains/interview/`（types/service/store），含 `InterviewOutline` / `InterviewSegment` / `OutputField` 型別。
- [x] 訪綱 A（顧問陪談）萃取為 TS 常數配置：7 段、核心題、追問、引導重點、產出 schema。
- [x] 引擎逐段主導、不跳段、段落自然接續、取消 phase-complete。
- [x] 獨立模式跑通：對話 → 即時結構化素材 → AI 收斂「客戶輪廓表＋對話準備卡」（可編輯，C8/C9）；人格只給白話推論不顯分數。
- [x] `/api/ai/interview` 直接接 OpenAI streaming，寫入 `AiUsageLog`。
- [x] `RES-010` 的 PQ 題庫 / Issue Readiness Level 已落地 `src/domains/interview/issue-maturity.ts` pure constants/stub。
- [x] 不動 SPIN 狀態機、不動既有 `/spin`。
- [ ] Browser QA：`/interview` desktop/mobile，可開始、送出、生成準備卡、無 console error、無水平 overflow。
- [x] 跑 `pnpm lint:changed`.

範圍外：不寫回 CRM；不新增 `InterviewSession` Prisma persistence；不改 Theater schema。

狀態：[~] 進行中（2026-06-18）。

Implementation note：
- 已建立 `InterviewOutputDraft` type。
- 已建立 `/api/ai/interview/outputs` JSON route，直接接 OpenAI JSON mode，成功/錯誤路徑皆寫 `AiUsageLog`。
- `/interview` 已加上「生成準備卡」與可編輯 JSON 草稿區。
- Browser QA：desktop 可開啟 `/interview`、開始陪談、送出回答、素材草稿出現、生成準備卡按鈕啟用、console error 0、無水平 overflow；mobile 390x844 無水平 overflow。先前按下生成準備卡時 OpenAI 回 429 quota，UI 顯示錯誤且未 crash；2026-06-18 quota 補上並重啟 dev server 後，使用 `demo_org_asai_personal` 重測 `/api/ai/interview/outputs` API 成功回 200，草稿含 known facts、unknowns、SPIN/PQ 候選、Issue Readiness 與 compliance notes，且 `AiUsageLog` 實際寫入驗證 count 2 -> 3。缺 `OPENAI_API_KEY` 時 route 也會回錯並記錄 usage error。

下一個可執行小步：
- 用 Browser 補 `/interview` 頁面按鈕層成功生成截圖與 console QA。
- Browser 成功生成重測通過後，將本卡 Browser QA 打勾。

---

## Batch ITA-002 - 客戶資料模式 + 確認寫回

目標：讓訪談 Agent 可選擇帶入既有客戶，區分已知/待確認，最後用確認卡控制寫回。

- [ ] 入口可選「獨立 / 帶客戶」；帶客戶載入 `Client` / `FamilyMember` / `Policy`。
- [ ] 自動分「已知 / 待確認」，只追問缺口。
- [ ] 結束出「確認卡」逐項勾選；事實項可寫回、推論項預設不寫回。
- [ ] 寫回沿用 `aiTags` 動態更新模式；不刪改 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [ ] 高敏感客戶需要 explicit confirmation 與 audit reason。
- [ ] Org manager 不得看到 member 客戶明細或逐字稿。
- [ ] 跑 `pnpm lint:changed`。

範圍外：不做劇場角色生成；不做 RAG 真檢索。

阻擋：Supabase Auth/session guard 尚未實作，真 DB-backed client-bound runtime 需要 session boundary。

---

## Batch ITA-003 - 劇場多角色 + 導演編排 + 群/私聊

目標：依 operator Route B，把 legacy 單角色 Theater 一次切換成多角色、導演編排、visibility scope 的劇場 Agent。

- [ ] 寫 migration/compatibility brief：legacy `personaType` / `tension` / `score` 如何轉換或廢棄、rollback 條件、seed 影響。
- [ ] Prisma schema：`TheaterCharacter`（Big Five + if-then + exemplar lines）、`TheaterTurn` 加 `speaker/addressee/visibilityScope`、移除數值 `tension`。
- [ ] 訪綱 B 配置 + 一鍵從既有資料建場；焦點客戶必在場、NPC ≤4。
- [ ] 導演 agent 結構化輸出：選發言者、addressee、visibility、演出指令。
- [ ] 旁白 NPC：當必要資訊缺失時，以情境問題詢問使用者；使用者可略過或補充資訊，補充內容標記 fact/inference/unknown。
- [ ] 逐角色序列 streaming 呼叫；每次 AI call 寫 `AiUsageLog`。
- [ ] 群聊/私聊與知情範圍；私聊不自動外洩到群聊。
- [ ] 防搶話/防冷場：被問必答、連續發言上限 2。
- [ ] NPC 事實依 B9 邊界：`fact` / `inference` / `unknown`，不得杜撰。
- [ ] 跑 `pnpm prisma:validate`、`pnpm prisma:generate`、`pnpm lint:changed`。

範圍外：不保留舊單角色 tension/score 流程當新體驗主路徑；不做 legacy Theater fallback/viewer。

阻擋：需要 DB migration review；高敏感真實客戶需 audit reason；成本/quota API gate 尚未完成。

---

## Batch ITA-004 - 五視角質化回饋

目標：用五個質化視角取代分數式 scoring，讓劇場與訪談都能產生可輔導的回饋。

- [ ] 五視角 prompt：教練的耳朵 / 客戶的眼睛 / 沉默裡的需求 / 守門的良心 / 決策的橋。
- [ ] 結束一次跑五個，可勾選、預設全部。
- [ ] 以 `TheaterFeedback` 或同等 JSON contract 儲存質化文字，不顯示總分。
- [ ] 可用於訪談 Agent 的準備卡 review。
- [ ] 「守門的良心」可連接紅線偵測輸出。
- [ ] 每次 AI call 寫 `AiUsageLog`。
- [ ] 跑 `pnpm lint:changed`；動 schema 才跑 Prisma 指令。

範圍外：不做績效排名分數；不把 feedback 當客戶評分。

---

## Batch ITA-005 - 異議庫 + 紅線偵測

目標：把 12 類異議與 18 條銷售紅線落地到劇場與回饋流程。

- [ ] 建立異議庫 domain 常數，含說法、背後擔憂、回應方向、適用角色。
- [ ] 劇場角色依人格與情境自然觸發異議，不硬塞。
- [ ] 建立紅線偵測規則與 prompt，事後為主、嚴重項即時。
- [ ] 紅線誤判可標「不適用」，但保留 audit/feedback record。
- [ ] 嚴重紅線：代簽、代墊、保證獲利、吸金、未做 KYC 即推商品。
- [ ] 跑 `pnpm lint:changed`。

範圍外：不提供法律意見；不自動判定顧問違規懲處。

---

## Batch ITA-006 - 真實資料 migration + RAG 樁 + pgvector

目標：把訪談/劇場資料正式 DB 化，並提供 RAG/pgvector 的最小可接續樁。

- [ ] `InterviewSession`、多角色 Theater tables、`KnowledgeDocument` / `KnowledgeChunk` schema。
- [ ] 所有 business records 帶 `organizationId`，必要資料帶 `unitId`。
- [ ] Supabase 啟用 `pgvector` extension 與向量索引。
- [ ] Seed：訪綱常數、劇場模板、PQ/Issue definitions。
- [ ] RAG 上傳 UI 樁 + `ragService` 介面契約；本期不接真檢索也要清楚標示。
- [ ] 高敏感資料不得進 RAG，除非有明確 consent/audit design。
- [ ] 跑 `pnpm prisma:validate`、`pnpm prisma:generate`、`pnpm lint:changed`；需實套 DB 時跑 migration/db push。

範圍外：不做完整 vector retrieval ranking；不把 RAG 來源當成無來源事實。

阻擋：Supabase pgvector 權限需 operator 確認。

---

## Current Blockers

- A4、D16、D18、B9 已核可；後續若改變資料模型需依本文件更新決策紀錄。
- Supabase Auth 已選定，但 app/client/platform session guards、public env、service role、callback URL 尚未實作。
- Supabase pgvector extension 與向量索引尚需 operator 啟用或確認權限。
- 綠界正式 API route 仍需 MerchantID、HashKey、HashIV、callback domain。
- Staging super admin visual QA 仍需 operator 提供 staging access cookie/password。
- Working tree 很大，需切分可 review 範圍；不要把所有歷史改動混進單一卡片宣稱完成。
- Review node 切分見 `docs/05_execution-plans/PLN-016_review-node-splitting-plan-v1.0.md`。
