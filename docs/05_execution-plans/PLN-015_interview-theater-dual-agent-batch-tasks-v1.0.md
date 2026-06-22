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

- [x] 寫 migration/compatibility brief：legacy `personaType` / `tension` / `score` 如何轉換或廢棄、rollback 條件、seed 影響。
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

TDF-005a handoff note（2026-06-20）：Route B compatibility brief 與 handoff contract 已先在 `src/domains/theater/route-b-handoff.ts`、`docs/06_audits-and-reports/AUD-007_theater-route-b-handoff-compatibility-brief-v1.0.md` 完成。後續 ITA-003 不需重寫 handoff；請以 `TheaterRouteBHandoffPacket` / `TheaterRouteBScene` / `TheaterRouteBCharacter[]` / director input / character input / visibility rules / state patches / AiUsage plan 為 migration source。尚未完成：Prisma schema、director provider route、character provider route、feedback route、success/error `AiUsageLog` proof、DB migration/rollback QA。

ITA-003a schema adapter note（2026-06-20）：已完成 Route B additive schema / typed persistence adapter 子切片。`prisma/schema.prisma` 新增 `TheaterCharacter`、`TheaterRouteBCharacterRole`、`TheaterRouteBVisibilityScope`，並在 `TheaterSession` 保留 Route B scene/source/state/visibility metadata、在 `TheaterTurn` 加 `speakerCharacterId` / `addresseeCharacterId` / `visibilityScope` / `directorDirective` / `statePatches`。`src/lib/theater/route-b-session-repository.ts` 可把 `TheaterRouteBHandoffPacket` 轉成 typed session / character / opening turn payload，legacy `personaType` / `tension` 僅作 compatibility，不作 Route B 新主流程。`pnpm theater:route-b-schema-dry-run` 通過，證明 group/private/director/narrator visibility、private 不外洩、state patch 不寫 confirmed CRM fact、director/character/feedback 仍需 `AiUsageLog`，且 no-provider/no-DB-write。尚未完成：正式 DB push/migration rollback QA、director provider route、character provider route、feedback route、success/error `AiUsageLog` runtime proof；因此 ITA-003 整卡仍保持未完成。

Whole-product review 註記（2026-06-20）：第五輪 LV3 校準確認 Route B 已跨過 handoff/schema adapter，但 immersive theater 的最大缺口已轉為 runtime proof。下一個最高槓桿子切片建議為 `ITA-003b Route B development migration + deterministic runtime BFF gate`：先確認 DB target 為 local/development/已授權 staging，做 additive migration proof 或 dry-run fallback，再補 director/character/feedback runtime route 的 guarded-disabled/no-provider 與 `AiUsageLog` success/error contract；若 DB target 不能確認，改先執行 `BFF-001` 全站資料來源盤點。

ITA-003b runtime gate note（2026-06-20）：已新增 deterministic Route B runtime BFF gate：`POST /api/theater/route-b/runtime`。`SESSION_DRAFT` 可用 handoff packet 產生 typed session draft summary；`DIRECTOR` / `CHARACTER` / `FEEDBACK` 在 `ENABLE_ROUTE_B_THEATER_PROVIDER` 未開啟時回 `503 ROUTE_B_PROVIDER_DISABLED`，明確證明 providerCallAttempted=false、aiUsageLogWritten=false、未偽造 usage，並保留 provider 啟用前必須補 success/error `AiUsageLog` 的 contract。`pnpm theater:route-b-runtime-qa` 通過 unauth 401、invalid 400、draft 200、director/character/feedback guarded-disabled、private visibility、state patch 不寫 confirmed CRM fact、response no private sentinel、`AiUsageLog` count before/after 不變。尚未完成：DB push/migration rollback QA、正式 persisted Route B session read/write、provider success/error path 與 session UI。

ITA-003c persisted session note（2026-06-20）：已完成 Route B persisted session read/write proof。新增 `src/lib/theater/route-b-boundary.ts` 共用 boundary guard、`src/lib/theater/route-b-session-bff-repository.ts` member-scoped BFF repository、`POST /api/theater/route-b/sessions` 與 `GET /api/theater/route-b/sessions/[sessionId]`；`TheaterCharacter.id` 改為 session-scoped DB id，`routeBCharacterId` 保留邏輯角色 id，讓同一 handoff 可重複建立。DB target 為目前 `.env` development Supabase Postgres，已執行 `pnpm exec prisma db push`（無 `--accept-data-loss`）並回報 in sync；首次 `--skip-generate` 嘗試因 Prisma 7 不支援該 option 失敗，已改用普通 `db push`。`pnpm theater:route-b-persistence-qa` 通過 unauth 401、invalid 400、create 201、owner read 200、manager read 404、DB rows `theater_sessions=1` / `theater_characters=3` / director-only opening turn=1、response no private sentinel、`AiUsageLog` count before/after 不變。`pnpm theater:route-b-runtime-qa` 仍通過。尚未完成：provider success/error `AiUsageLog` runtime proof、群/私聊 session UI 與五視角 feedback runtime。

ITA-003d session UI note（2026-06-20）：已完成 Route B persisted session UI/read surface。`/theater/build` 完成 CTA 會以 `buildTheaterRouteBHandoff(packet, { routeBEnabled: true })` 建立 DB-backed Route B session 並導向 `/theater/[sessionId]`；session 頁在 legacy store fallback 前先讀 `GET /api/theater/route-b/sessions/[sessionId]`，渲染多角色舞台、角色卡、群聊/私聊 lane、導演開場、關係/旁白補問、visibility proof 與 provider guarded-disabled 狀態。新增 `src/domains/theater/route-b-session.ts` client-safe DTO type 與 `pnpm theater:route-b-session-ui-qa`；proof 覆蓋 create session、owner browser read、manager 404、desktop/mobile no overflow、provider action disabled、response/page no private sentinel、`AiUsageLog` THEATER count before/after 不變。尚未完成：Route B provider success/error `AiUsageLog` proof、真正群/私聊回合寫入、人物狀態更新互動與五視角 feedback runtime。

Whole-product review 註記（2026-06-20 after previsit redesign）：最新端到端校準確認 previsit 準備包已成為 project/relationship-aware handoff，但 Route B theater 仍缺「可操作」的群聊/私聊/人物狀態更新寫入。下一個最高槓桿子切片建議為 `ITA-003e Route B persisted interaction write shell`：新增 owner-scoped advisor turn append / group-private lane selection / state patch proposal persistence，先不呼叫 provider；proof 必須覆蓋 member 201、manager 404、private visibility 不外洩、state patch 不寫 confirmed CRM fact、response no raw private sentinel、`AiUsageLog` count before/after 不變。provider director/character/feedback success/error `AiUsageLog` 仍留到後續 ITA-003f 或 ITA-004 前置，不得在無 proof 時開啟。

ITA-003e interaction shell note（2026-06-20）：已完成 Route B persisted interaction write shell。新增 `POST /api/theater/route-b/sessions/[sessionId]/turns` 與 `appendRouteBAdvisorTurnForMember()`，owner 可寫入顧問 `AGENT` turn，支援 `GROUP` / `PRIVATE` visibility、私聊 addressee routeBCharacterId、狀態筆記 proposal persistence；狀態 proposal 同步寫入 turn `statePatches` 與 session `sceneState.statePatches`，固定 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`，不觸發 provider。`/theater/[sessionId]` Route B stage 新增顧問互動 composer，私聊 lane 顯示指定角色私聊 turn，provider guard 仍維持 disabled。`pnpm theater:route-b-interaction-qa` 通過 unauth 401、member group/private 201、invalid private 400、manager 404、DB turn/state proof、browser submit proof、response/page no private sentinel、`AiUsageLog` THEATER count before/after 不變；in-app Browser 背景檢查 console error 0。尚未完成：Route B director/character/feedback provider success/error `AiUsageLog`、AI 角色回覆 orchestration 與五視角 feedback runtime。

Whole-product review note（2026-06-20 after RAS-001）：端到端 LV3 校準確認「建場」已可從 client / relationship graph / previsit / interview 進入 persisted Route B session，但劇場頁仍缺 relationship-graph-centered 的可操作舞台。下一個 product-level 最高槓桿子切片為 `ITA-003f/S1 Route B relationship-graph stage map (no-provider)`：`/theater/[sessionId]` 以 Route B characters / relationship evidence 呈現舞台地圖，支援點人物進私聊、發言/被點名高亮、群/私聊 visibility badge、guarded-disabled runtime 狀態，不呼叫 provider；proof 覆蓋 member read、manager 404、private visibility、不寫 confirmed CRM fact、desktop/mobile no overflow。若 Supabase DB/DNS 仍不可用，下一輪先 fallback `RAS-002` resolver/policy tests。

Whole-product review note（2026-06-20 after RAS-004a）：`ITA-003f/S1` 仍是 immersive theater 的 product-level primary，因關係圖、準備包、訪談 writeback 已能進 Route B session，但 session page 還缺真正以人物關係為中心的舞台地圖。若 DB/DNS 仍不可用，下一輪安全 fallback 改為 `RAS-004b sidebar UI wiring`；DB 恢復後再回來做 stage map proof，且不得在 provider/director/character/feedback 未有 `AiUsageLog` success/error proof 前宣稱 AI 角色 runtime 完成。

Quiet five-frame gap note（2026-06-20 after quiet continuation prompt）：本輪未出現新的人工決策或立即通知價值，因此依 LV3 quiet continuation rule 以五個視框把 `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` 收斂成下一張可 review 的 source/proof slice。

- Advisor workflow / onboarding：劇場第一屏應先呈現「客戶關係舞台」而非一般聊天頁。顧問要能看見焦點客戶、NPC、關係張力、待確認資訊，並能點人物直接切到私聊或群聊情境。
- Source-of-truth / BFF：stage map 只讀 persisted Route B session DTO、characters、relationship evidence、turn visibility 與 state proposal，不讀 mock store；Supabase DNS 未恢復前只能做文件/fixture proof，不得宣稱 DB-backed browser proof。
- AI reasoning / evidence：每個人物與關係邊要標示 `fact` / `inference` / `unknown` 或等價來源，顯示準備包/訪談/關係圖的 evidence label，不暴露 raw private transcript、raw provider payload 或 secret。
- Theater / relationship immersion：stage map 要支援 active speaker/addressee highlight、group/private visibility badge、click-to-private-chat、旁白補問入口、人物狀態 proposal；狀態 proposal 固定 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`。
- QA / compliance / release-proof：S1 不呼叫 provider，需證明 `providerCallAttempted=false`、`AiUsageLog` count 不變；member owner read 200、manager read 404、private sentinel 不外洩、desktop/mobile no overflow，且不更動 SPIN legacy 狀態機。

下一輪可執行 slice：`ITA-003f/S1 Route B relationship-graph stage map (no-provider)`。輸入為 `GET /api/theater/route-b/sessions/[sessionId]` 的 persisted DTO；輸出為 `/theater/[sessionId]` 的 stage map panel、角色/關係 evidence chip、私聊 focus action、visibility proof、state proposal affordance。若 DB/DNS 仍 blocked，先執行 `RAS-005 cross-role sidebar QA/docs sync` 或保留 fixture-only proof，不能把 fixture 當正式 DB proof。

Quiet S1a proof-plan note（2026-06-20 after PIM-011b）：Supabase DB/DNS 仍無法解析，本輪未新增 source，改把 `ITA-003f/S1` 收斂成可直接實作的 stage-map proof plan。下一個 Route B stage-map source slice 必須同時符合以下五個視框，否則不得把一般 chat workspace 或 fixture stage 宣告為 LV3 沉浸劇場完成：

1. Advisor workflow / onboarding：`/theater/[sessionId]` 第一屏主體應是「客戶關係舞台」，顧問先看到焦點客戶、NPC、關係張力、待確認缺口與目前群聊/私聊 lane；下一步主動作是點人物私聊、回到群聊、或新增人物狀態 proposal，而不是輸入 raw session/person id。
2. Source-of-truth / BFF：stage map 只消費 server-owned `GET /api/theater/route-b/sessions/[sessionId]` persisted DTO，從 `characters`、`scene.sourceMetadata`、`sceneState.statePatches`、stored turns 與 relationship evidence 推導 stage persons/edges/active lane；不從 legacy Theater store、mock session 或 client-provided org/member/client scope 取 business truth。
3. AI reasoning / evidence：每個 stage person / edge / tension chip 至少要標示 `fact` / `inference` / `unknown` 或等價 evidence state，並指向 relationship graph、previsit package、interview memory、quick-capture 或 Route B source metadata；不得顯示 raw private transcript、raw provider payload、email/phone sentinel、secret/token。
4. Theater / relationship immersion：stage map 必須能表達 active speaker、addressee、group/private visibility badge、click-to-private-chat、旁白補問、state proposal affordance；state proposal 繼續沿用 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`，只改劇場暫態，不改 confirmed CRM fact。
5. QA / compliance / release-proof：S1a 不呼叫 provider；proof 必須顯示 `providerCallAttempted=false` 或等價 guarded-disabled posture、`AiUsageLog` count 不變、member owner 200、manager/foreign 404、private lane 不外洩、desktop/mobile no overflow。DB/DNS blocked 期間只能完成 proof-plan 或 fixture/source contract，不能宣告 DB-backed browser proof。

ITA-003f/S1 stage-map implementation note（2026-06-21）：DB direct host 仍無 IPv4 A record，但本輪透過 IPv6 `AAAA`、TCP 5432/6543 與 pg read `select 1` 證明目前開發環境可恢復 DB-backed proof。`/theater/[sessionId]` 已新增 Route B「客戶關係舞台」，直接消費 persisted session DTO 的 characters、relationship evidence、stored turns 與 state proposal count；人物卡顯示已知/推論/未知、focus/NPC、latest speaker/addressee 與狀態 proposal，點選人物會把 composer 切到 PRIVATE 並選定 addressee。舞台同屏顯示 `providerCallAttempted=false`、`usageLogWritten=false`、`requiresConfirmation=true`、`writesConfirmedCrmFact=false`。`pnpm theater:route-b-session-ui-qa` 通過 create persisted session、owner browser read、manager 404、desktop/mobile relationship stage map、click-to-private-chat、relationship evidence、visibility proof、no horizontal overflow、private sentinel 0、THEATER `AiUsageLog` count before/after 不變；`pnpm theater:route-b-interaction-qa` 仍通過 group/private advisor turn、state patch proposal、DB proof 與 no fake usage。尚未完成：Route B director/character/feedback provider success/error `AiUsageLog`、AI 角色回覆 orchestration 與五視角 feedback runtime。

ITA-003g runtime preflight note（2026-06-21）：已完成 Route B director / character / feedback guarded runtime preflight，不呼叫 provider。`POST /api/theater/route-b/runtime` 現在會在 provider gate 前輸出 `runtimeInputPreview`，包含 `sourceAlignment.agentId=asai.theater.route_b`、action id（`route-b-director` / `route-b-character` / `route-b-feedback`）、必填欄位與 missing field、safe input contract、visibility summary、provider boundary、success/error `AiUsageLog` plan 與 `registryReadiness=internal-only`。缺 director utterance 或未知 character id 會回 `400 ROUTE_B_RUNTIME_PREFLIGHT_INVALID`，不再被包成 provider-disabled；provider 未啟用時仍回 `503 ROUTE_B_PROVIDER_DISABLED`，且 `providerCallAttempted=false`、`aiUsageLogWritten=false`。`asai.theater.route_b` manifest 已新增 runtime preflight capability / director-character-feedback actions / `RouteBRuntimeInputPreview` DTO refs。`pnpm theater:route-b-runtime-qa` 通過 unauth 401、invalid handoff 400、draft 200、director/character/feedback guarded-disabled、preflight 400、AgentFacts source alignment、visibility-safe history、private/provider sentinel 0、THEATER `AiUsageLog` count before/after 不變；`pnpm ai:protocol-registry-qa` 與 `pnpm ai:bff-audit` 仍通過。尚未完成：live provider success/error `AiUsageLog`、AI 角色回覆 orchestration、五視角 feedback runtime 與 operator provider approval。

Whole-product review note（2026-06-22 after Visit -> Theater evidence summary）：AMM-005c runtime proof 仍被 DB/DNS `ENOTFOUND` 阻擋，REL-004 / AMM-007 分別需要 schema / pgvector operator path；上一輪已把準備包問題證據來源與 fact/inference/unknown summary 接到 theater handoff。下一個正常 loop 不應再追 AMM-005c 截圖或 proof-plan；建議做 `ITA-003h Route B director/character orchestration contract (no-provider first)`：新增純 domain contract 或 runtime dry-run，把顧問最新 group/private turn 轉成 director selection candidate、speaker/addressee/visibility directive、character reply input plan 與 expected persistence envelope；不呼叫 provider、不寫假 `AiUsageLog`、不要求 DB，並以 `pnpm theater:route-b-orchestration-dry-run` 或等價 proof 證明 private history scope、被點名角色必答、防連續搶話、unknown 仍進 narrator question/state proposal、`writesConfirmedCrmFact=false`。若後續接 live provider，必須另做 success/error `AiUsageLog` proof 與 DB/browser session proof。

ITA-003h orchestration contract note（2026-06-22）：已完成 Route B director / character orchestration source contract，不呼叫 provider、不要求 DB。`src/domains/theater/route-b-orchestration.ts` 新增 `buildTheaterRouteBOrchestrationPlan()`，把 latest advisor group/private turn 轉成 director input、speaker/addressee/visibility directive、character reply input、persistence envelope、narrator queue 與 provider boundary。`pnpm theater:route-b-orchestration-dry-run` 通過：private history scoped to addressee、named addressee must answer、consecutive-speaker guard、unknowns stay narrator/state-proposal material、`requiresConfirmation=true`、`writesConfirmedCrmFact=false`、`providerCallAttempted=false`、`aiUsageLogWritten=false` 且不含 raw provider/private sentinel。`asai.theater.route_b` manifest 已新增 orchestration capability / action / DTO refs / proof command；`pnpm ai:protocol-registry-qa` 會檢查 owner/evidence refs。尚未完成：把 orchestration 接進 persisted runtime/BFF turn loop、live provider success/error `AiUsageLog` proof、五視角 feedback runtime。

ITA-003i runtime orchestration integration note（2026-06-22）：已把 Route B orchestration contract 接進 guarded runtime BFF。`POST /api/theater/route-b/runtime` 的 `DIRECTOR` preflight 在 provider gate 前新增 `runtimeInputPreview.orchestration`，只回 least-disclosure 摘要：`agentId=asai.theater.route_b`、`registryReadiness=internal-only`、`actionId=route-b-orchestration`、speaker/addressee/visibility directive、guard evidence、character visible history count、state patch count、safe persistence envelope 與 no-provider boundary；不回 raw director input、raw private lane content 或 provider payload。`pnpm theater:route-b-runtime-qa` 覆蓋 no-provider guarded-disabled、private named addressee 必答、missing addressee 400、consecutive-speaker guard、其他私聊不可見、`requiresConfirmation=true`、`writesConfirmedCrmFact=false`、THEATER `AiUsageLog` count 不變。`asai.theater.route_b` manifest 已新增 runtime orchestration preview capability / `RouteBOrchestrationRuntimePreview` DTO ref / `runtimeInputPreview.orchestration` evidence ref。尚未完成：persisted session turn loop 自動產生 AI 角色回覆、live provider success/error `AiUsageLog` proof、五視角 feedback runtime。

ITA-004a feedback contract note（2026-06-22）：已完成 Route B 五視角質化回饋的 source contract 與 guarded runtime preview，不呼叫 provider、不要求 DB。`src/domains/theater/route-b-feedback.ts` 新增 `buildTheaterRouteBFeedbackContract()`、`ROUTE_B_FEEDBACK_PERSPECTIVES`（教練的耳朵 / 客戶的眼睛 / 沉默裡的需求 / 守門的良心 / 決策的橋）與 `ROUTE_B_SEVERE_RED_LINES`（代簽、代墊、保證獲利、吸金、未做 KYC 即推商品）。`POST /api/theater/route-b/runtime` 的 `FEEDBACK` preflight 現在會回 `runtimeInputPreview.feedback`，只含 selected perspectives、visibility/material count、qualitative-only output contract、red-line labels、no-provider boundary 與 persistence envelope；`totalScoreAllowed=false`、`rankingAllowed=false`、`writesConfirmedCrmFact=false`。`pnpm theater:route-b-feedback-dry-run` 通過五視角預設全選、可選子集、紅線可標不適用、非法律意見、success/error `AiUsageLog` provider gate、無 email/phone/provider/private sentinel。`asai.theater.route_b` manifest 已新增 feedback capability / `RouteBFeedbackRuntimePreview` / `TheaterRouteBFeedbackContract` / feedback dry-run command。尚未完成：真正 provider success/error `AiUsageLog`、feedback 文字持久化與 session end UI。

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

ITA-004b provider logging contract note（2026-06-22）：已完成 Route B feedback provider success/error usage-log contract 子切片。新增 `src/domains/theater/route-b-feedback-provider.ts` 與 `pnpm theater:route-b-feedback-provider-dry-run`，以 injected provider / usage logger 驗證：provider input 只含 feedback preview counts、五視角、紅線 labels 與 qualitative output rules；success path 在回傳 feedback 前寫 success usage record，provider error path 在回傳 sanitized error 前寫 error usage record；兩者皆不儲存 provider body、private lane content 或 confirmed CRM fact。AgentFacts-style manifest 已新增 `route-b-feedback-provider-log-contract` capability、DTO/evidence refs 與 proof command。尚未完成：live provider route wiring、DB persisted feedback summary、訪談準備卡 review consumption、紅線偵測 library。

Whole-product review note（2026-06-22 after Route B feedback provider log contract）：第五輪校準確認 Route B 已有 persisted stage map、顧問 group/private turn write shell、orchestration contract/runtime preview、五視角 feedback contract 與 injected provider usage-log contract；下一個產品缺口不是再補 proof 文件，而是讓 session 消費這些 source contract 產生可審查的下一個角色回合。下一輪 normal loop 建議 `ITA-003j Route B next-turn consumption / persisted role reply loop (guarded no-provider first)`：用 persisted `RouteBSessionSnapshot` + latest advisor turn + `buildTheaterRouteBOrchestrationPlan()` 產生 CHARACTER/NARRATOR next-turn draft，包含 speaker/addressee/visibility、character input boundary、state proposal envelope、`requiresConfirmation=true`、`writesConfirmedCrmFact=false`、no raw private/provider payload；DB 可用時可接 owner-scoped append/read proof，DB 仍 `ENOTFOUND` 時先完成 pure contract/API dry-run，不再用 AMM-005c 或 ITA-003i 截圖搜證消耗輪次。

ITA-003j next-turn contract note（2026-06-22）：已完成 persisted Route B session 的下一回合 no-provider draft contract。新增 `src/domains/theater/route-b-next-turn.ts`，以 `RouteBSessionSnapshot` + latest advisor group/private turn 轉成 `TheaterRouteBNextTurnDraft`，並重用 `buildTheaterRouteBOrchestrationPlan()` 決定 speaker / addressee / visibility / guard evidence / pending state proposal count。新增 `GET /api/theater/route-b/sessions/[sessionId]/next-turn`，沿用 member-scoped session read，只回 least-disclosure draft preview，不回 direct private dialog 或 provider body；缺 advisor turn 或缺角色時改回 `NARRATOR` blocked draft，不杜撰角色台詞。`pnpm theater:route-b-next-turn-dry-run` 通過群聊防連續搶話、私聊點名必答、blocked draft、`providerCallAttempted=false`、`aiUsageLogWritten=false`、`writesConfirmedCrmFact=false` 與 no email/phone/provider/private sentinel。AgentFacts-style manifest 已新增 next-turn capability / endpoint / DTO refs / proof command。尚未完成：live character text generation provider success/error `AiUsageLog` proof、DB-backed owner API live evidence（DB host 若恢復可由 operator 重跑）、自動 append character turn 的 confirmation UI。

ITA-003k next-turn UI consumption note（2026-06-22）：已把 `GET /api/theater/route-b/sessions/[sessionId]/next-turn` 接進 `/theater/[sessionId]` Route B stage。顧問可手動讀取下一回合預覽；顧問寫入 group/private turn 後也會自動刷新 preview。UI 只顯示 selected speaker / addressee / visibility / guard evidence / rationale / provider boundary / privacy proof，並明確標示 `generatedTextAllowed=false`、`providerCallAttempted=false`、`aiUsageLogWritten=false`、`writesConfirmedCrmFact=false`。確認並產生角色台詞按鈕保持 disabled，直到 live character provider success/error `AiUsageLog` proof 完成。新增 `pnpm theater:route-b-next-turn-ui-contract-qa` 作 source-level UI contract proof；AgentFacts-style manifest 已新增 next-turn UI preview capability / owner surface / proof command。尚未完成：live character text generation provider success/error `AiUsageLog` proof、DB/browser live owner evidence（若環境可連可由 operator 自行重跑）、真正 append character/narrator turn 的確認流程。

ITA-003l next-turn provider logging contract note（2026-06-22）：已完成 character/narrator next-turn provider success/error usage-log contract，不連外、不寫 DB。新增 `src/domains/theater/route-b-next-turn-provider.ts` 與 `pnpm theater:route-b-next-turn-provider-dry-run`，以 injected provider / usage logger 驗證：provider input 只含 next-turn preview、guard evidence 與 persistence envelope 摘要；blocked draft 不呼叫 provider、不寫 fake usage、不產生 append candidate；success path 必須先寫 success usage record 才回 generated append candidate；provider error path 必須先寫 sanitized error usage record 才回 error。Success append candidate 固定 `requiresAdvisorConfirmation=true`、`writesConfirmedCrmFact=false`、`storesRawProviderPayload=false`、`rawPrivateTranscriptIncluded=false`。AgentFacts-style manifest 已新增 `route-b-next-turn-provider-log-contract` capability、DTO/evidence refs 與 proof command。尚未完成：live OpenAI/Anthropic route wiring、owner-scoped persisted character/narrator turn append API/UI、DB/browser live proof、external registry publication。

ITA-003m next-turn append confirmation note（2026-06-22）：已完成 owner-scoped persisted append confirmation source contract。新增 `src/domains/theater/route-b-next-turn-append.ts`、`POST /api/theater/route-b/sessions/[sessionId]/append-candidate` 與 `appendRouteBNextTurnCandidateForMember()`，只接受 provider success candidate + safe `usageLogId` + `confirmedByAdvisor=true` + safe flags，並把 CHARACTER/NARRATOR candidate 寫成 TheaterTurn；append 本身固定 `noProviderCallInAppend=true`、`storesRawProviderPayload=false`、`rawPrivateTranscriptIncluded=false`、`writesConfirmedCrmFact=false`。`RouteBSessionSnapshot` 也在 BFF 邊界把 legacy `AGENT/CLIENT/SYSTEM` 正規化為 `ADVISOR/CHARACTER/DIRECTOR/NARRATOR`，讓 persisted next-turn draft 能讀到最新 advisor turn。`/theater/[sessionId]` 的 next-turn panel 已接上 append-candidate handler，但沒有 provider candidate/usageLogId 時仍保持 disabled，不用 mock success 假裝 live append。新增 `pnpm theater:route-b-next-turn-append-dry-run`；AgentFacts-style manifest 已新增 append confirmation capability / endpoint / DTO/evidence refs。尚未完成：live OpenAI/Anthropic route wiring 產生真實 provider candidate、DB/browser live append proof、external registry publication。

Whole-product review note（2026-06-22 after Route B append confirmation）：第五輪校準確認 Route B 的「顧問寫入 -> next-turn draft -> provider candidate contract -> advisor-confirmed append」已形成 source-backed chain；新的最高槓桿缺口轉為 session end coaching：feedback contract/provider logging 已存在，但回饋尚未被持久化為可重讀的 session review，也尚未在 `/theater/[sessionId]` 成為顧問可操作的五視角回顧面板。下一輪 normal loop 建議 `ITA-004c Route B feedback persistence + session-end UI`：新增 owner-scoped feedback summary/review persistence boundary（可先 no-provider deterministic summary 或 injected provider result envelope）、`GET/POST` API 或 repository helper、`/theater/[sessionId]` 低噪音 review panel，證明 qualitative-only/no total score、red-line not-applicable、requiresAdvisorConfirmation、`writesConfirmedCrmFact=false`、no raw private/provider payload、manager/foreign denied、no-provider `AiUsageLog` unchanged；不得把剩餘 DB/browser append screenshot collection 當作下一輪主工作。

ITA-004c feedback review persistence note（2026-06-22）：已完成 Route B feedback persistence + session-end UI 的 no-provider source slice。新增 `src/domains/theater/route-b-feedback-review.ts`、`GET/POST /api/theater/route-b/sessions/[sessionId]/feedback-review` 與 `createRouteBFeedbackReviewForMember()` / `getRouteBFeedbackReviewForMember()`；POST 以 current owner-scoped `RouteBSessionSnapshot` 產生 deterministic `TheaterRouteBFeedbackReview` 並保存到 `sceneState.feedbackReview`，GET 只回已驗證 review 或 explicit empty guard proof。`/theater/[sessionId]` 新增五視角回顧面板，可讀回/生成 review，顯示 qualitative-only、provider boundary、AiUsageLog=false、writesConfirmedCrmFact=false、紅線 needs-review / notApplicable 狀態與合規提醒。新增 `pnpm theater:route-b-feedback-review-qa`，驗證五視角、紅線 notApplicable、no total score / ranking、no raw provider/private/contact/policy sentinel、owner-scoped API/repository/UI contract 與 AgentFacts manifest endpoint/action/DTO/evidence refs。尚未完成：live feedback provider route wiring、manager/foreign live DB denial screenshot、訪談準備卡 review consumption、紅線偵測 source library。

---

## Batch ITA-005 - 異議庫 + 紅線偵測

目標：把 12 類異議與 18 條銷售紅線落地到劇場與回饋流程。

- [ ] 建立異議庫 domain 常數，含說法、背後擔憂、回應方向、適用角色。
- [ ] 劇場角色依人格與情境自然觸發異議，不硬塞。
- [ ] 建立紅線偵測規則與 prompt，事後為主、嚴重項即時。
- [ ] 紅線誤判可標「不適用」，但保留 audit/feedback record。
- [ ] 嚴重紅線：代簽、代墊、保證獲利、吸金、未做 KYC 即推商品。
- [ ] 跑 `pnpm lint:changed`。

ITA-005a objection/red-line source library note（2026-06-22）：已完成 source-backed 子切片，尚未宣稱 ITA-005 全卡完成。新增 `src/domains/theater/route-b-objection-red-line-library.ts`，定義 12 類角色異議（說法、背後擔憂、回應方向、適用角色、trigger signals）與 18 條紅線規則；其中 5 條嚴重紅線（代簽、代墊、保證獲利、吸金、未做 KYC 即推商品）維持 immediate detection，13 條一般紅線維持 post-review。`route-b-feedback.ts` 與 `route-b-feedback-review.ts` 已消費同一 library summary；review 現在能產出 18 條 red-line findings，誤判仍可標 `NOT_APPLICABLE` 且保留 audit posture。新增 `pnpm theater:route-b-objection-red-line-library-dry-run`，驗證 12/18 counts、自然選取異議、severe/standard detection mode、not-applicable audit、no-provider / no fake `AiUsageLog` / no CRM fact write / no private sentinel。AgentFacts manifest 已新增 `route-b-objection-red-line-library` capability / DTO/evidence refs / proof command。尚未完成：把異議庫接入 live director/character provider prompt、即時嚴重紅線 UI 提示、回饋結果的人工作用流程與 legal/compliance ops review。

ITA-005b provider prompt-context note（2026-06-22）：已完成 source-backed prompt/runtime DTO integration 子切片，尚未宣稱 ITA-005 全卡完成。新增 `src/domains/theater/route-b-provider-prompt-context.ts`，把 ITA-005a 的 12 類異議與 18 條紅線轉成 `RouteBProviderPromptContext`，供 `TheaterRouteBNextTurnProviderInput.promptContext` 與 `TheaterRouteBFeedbackProviderInput.promptContext` 使用；feedback provider 另新增 `redLineReview.allRules`，證明完整 18 條紅線會進 provider review contract。新增 `pnpm theater:route-b-provider-prompt-context-dry-run`，並擴充 next-turn / feedback provider dry-run，覆蓋 selected objections、5 severe immediate、13 post-review、no legal advice、no confirmed CRM fact write、no raw provider/private payload 與 success/error `AiUsageLog` contract。尚未完成：live provider route wiring、即時嚴重紅線 UI 提示、回饋結果人工作用流程與 legal/compliance ops review。

ITA-005c severe red-line warning preview note（2026-06-22）：已完成 Route B severe immediate 紅線的 advisor-visible UI/source preview，尚未宣稱 ITA-005 全卡完成。新增 `src/domains/theater/route-b-severe-red-line-preview.ts`，從 `RouteBProviderPromptContext` 同源生成 `RouteBSevereRedLineWarningPreview`，只包含 5 條 severe immediate 紅線（代簽、代墊、保證獲利、吸金、未做 KYC 即推商品），固定 watchlist-only、requires evidence or not-applicable、no legal advice、no CRM confirmed fact、no provider/no fake usage。`/theater/[sessionId]` Route B stage 右欄新增「守門紅線」面板，顯示 trigger signals、evidence policy、provider/AiUsageLog boundary 與 no formal finding posture。新增 `pnpm theater:route-b-severe-red-line-preview-dry-run`，覆蓋 domain preview + static UI contract + AgentFacts refs。尚未完成：live provider route wiring、真實即時偵測、法遵處置 workflow 與 external registry publication。

ITA-005d severe red-line action workflow note（2026-06-22）：已完成 Route B severe immediate 紅線的 advisor action workflow 子切片，尚未宣稱 ITA-005 全卡完成或正式法遵處置完成。新增 `src/domains/theater/route-b-red-line-action-workflow.ts`，從 `RouteBSevereRedLineWarningPreview` 同源生成 5 張 action cards，每張允許 `WATCHING`、`EVIDENCE_NEEDED`、`NOT_APPLICABLE`、`ESCALATE`；`NOT_APPLICABLE` 保留 audit posture，`ESCALATE` 只代表待審閱狀態，不發真實 notification、不建立 legal finding、不寫 confirmed CRM fact。`/theater/[sessionId]` 的「守門紅線」面板已加入 action state controls、狀態摘要、reason/evidence requirement 與 UI-local persistence boundary；未來若接 DB，只允許持久化 `ruleId`、`state`、`advisorReasonCode`、`updatedAt`。新增 `pnpm theater:route-b-red-line-action-workflow-dry-run`，覆蓋 domain workflow + static UI/manifest registry contract + no provider/no fake AiUsageLog/no raw private/provider/contact/policy sentinel。尚未完成：正式法遵審閱 persistence、real notification/escalation、live detection、feedback/prep/meeting consumption bridge 與 external registry publication。

ITA-005e severe red-line action persistence note（2026-06-22）：已完成 Route B severe red-line action state 的 owner-scoped persistence boundary，仍不代表正式法遵處置、real notification 或 legal review routing 完成。`src/domains/theater/route-b-red-line-action-workflow.ts` 新增 `RouteBRedLineActionPersistenceState`、固定 `advisorReasonCode` enum 與 safe record builder；`POST/GET /api/theater/route-b/sessions/[sessionId]/red-line-actions` 只允許 current member 讀寫自己的 Route B session，並將 `sceneState.redLineActionState` 限縮為 `ruleId`、`state`、`advisorReasonCode`、`updatedAt`。`/theater/[sessionId]` 的「守門紅線」面板新增讀取/保存控制、persisted record count 與 latest updated。新增 `pnpm theater:route-b-red-line-action-persistence-qa` 覆蓋 domain allowlist、API/repository/UI/manifest source contract、no provider/no fake AiUsageLog/no raw private/provider/contact/policy sentinel；既有 `pnpm theater:route-b-persistence-qa` 已擴充可在 dev server/DB 可用時證明 owner write/read、manager denial、DB scene_state 與 refresh/new-context persistence。尚未完成：正式法遵審閱 workflow、real notification、feedback/prep/meeting consumption bridge、live detection 與 external registry publication。

ITA-005f red-line action feedback consumption note（2026-06-22）：已完成 persisted severe red-line action state 的第一個 consumer bridge，仍不代表正式法遵處置、real notification 或 legal review routing 完成。`RouteBSessionSnapshot.scene.redLineActionState` 現在由 `sceneState.redLineActionState` 讀出；`buildTheaterRouteBFeedbackReview()` 會消費 `RouteBRedLineActionPersistenceState`，在 `TheaterRouteBFeedbackReview.redLineActionState` 產生 summary counts，並在 matching red-line findings 附上 per-rule `actionContext`（state、advisorReasonCode、updatedAt），同時保留 `noLegalAdvice=true`、`noFormalFinding=true`、`triggersExternalNotification=false`、`writesConfirmedCrmFact=false`、no-provider posture。`/theater/[sessionId]` 五視角回顧面板顯示 action-state source、升級審閱/需要佐證 counts 與每條 finding 的 advisor action context。`pnpm theater:route-b-feedback-review-qa` 與 `pnpm ai:protocol-registry-qa` 已驗證 persisted action state 被 feedback review 消費、AgentFacts refs 已登錄、沒有 raw private/provider/contact/policy sentinel、沒有 fake `AiUsageLog`。尚未完成：把同一 action context 接入 visit preparation package / AI meeting notes、正式法遵審閱 workflow、real notification、live detection 與 external registry publication。

ITA/AMM-005g visit preparation red-line context bridge note（2026-06-22）：已完成第一個 source-backed downstream consumer 的 domain/evidence bridge，仍不代表完整 BFF/UI 自動載入或正式法遵處置完成。新增 `src/domains/visit/route-b-red-line-context.ts`，由 server-owned `TheaterRouteBFeedbackReview` 讀取 feedback `actionContext`，轉成 `VisitRouteBRedLineContext` 與 `VisitQuestionEvidence.source=theater_route_b_red_line`；`ESCALATE` / `EVIDENCE_NEEDED` 只進入 P/I/N 問題 reasoning 作為 `unknown` / advisor evidence-needed reminder，S 題維持現況盤點，不覆寫 relationship graph、policy、client profile 的 fact/inference/unknown 標記。新增 `pnpm visit:route-b-red-line-context-dry-run`，驗證 source action id、evidence counts、no provider/no fake `AiUsageLog`、no legal/formal finding、no notification、no confirmed CRM fact write、no raw private/provider/contact/policy sentinel。AgentFacts manifest `asai.visit.preparation_package` 已新增 downstream capability/action/DTO/evidence refs 並保持 `internal-only`。尚未完成：production visit-prep BFF/UI 從 owner-scoped theater feedback review 自動載入此 context、AI meeting notes consumer、正式法遵審閱 workflow、real notification、live detection 與 external registry publication。

ITA/AMM-005h visit preparation BFF/UI red-line context autoload note（2026-06-22）：已完成 visit-prep BFF/UI 自動載入 persisted theater feedback review 的 source-backed slice，仍不代表正式法遵處置或 AI meeting notes consumer 完成。新增 `src/lib/visits/route-b-red-line-context-repository.ts` 與 `GET /api/visits/[id]/route-b-red-line-context`，從 current-member owner-scoped `VisitPlan` 重新建立 visit handoff packet id，再用 organization/owner/client/`routeBSourcePacketId` 查同源 Route B session 的 `sceneState.feedbackReview`，交給 `buildVisitRouteBRedLineContextFromFeedbackReview()` 轉為 `VisitRouteBRedLineContextBffDto`。`/pre-visit/[planId]` 新增「劇場紅線回帶」面板，顯示升級/待佐證/觀察 summary 與 advisor-context reminder，不顯示 raw session/feedback ids，也不要求顧問輸入 session/person id。新增 `pnpm visit:route-b-red-line-context-bff-qa`，驗證 route/repository/UI/manifest/registry contract、no provider/no fake `AiUsageLog`、no legal/formal finding、no notification、no confirmed CRM fact write、no raw private/provider/payment sentinel。尚未完成：AI meeting notes consumer、正式法遵審閱 workflow、real notification、live detection 與 external registry publication。

ITA/AMM-005i AI meeting notes red-line context consumption note（2026-06-22）：已完成第二個 source-backed downstream consumer，仍不代表正式法遵處置、real notification 或 external registry ready。此輪先審核 worktree 中 untracked `/notes` local Zustand prototype，決定不將其納入 committed baseline；正式落地面改用已接受的 `/pre-visit/[planId]/notes` + owner-scoped `MeetingWorkspace`。Notes page 從 `GET /api/visits/[id]/route-b-red-line-context` 載入 Route B red-line context，僅傳 `status`、`summary`、`routeBRedLineContext` items 與 proof 到 MeetingWorkspace，不傳 `sourcePacketId`、theater session id 或 feedback review id。MeetingWorkspace 新增 `meeting-route-b-red-line-context` 面板，將 `ESCALATE` / `EVIDENCE_NEEDED` context 併入 manual-note draft，並顯示 no-provider、no-notification、no-formal-finding、no confirmed CRM fact guardrails。新增 `pnpm meeting:route-b-red-line-context-qa`，覆蓋 notes bridge、workspace panel/draft merge、BFF proof、manifest/registry refs 與 no raw id boundary；`asai.meeting.prototype` manifest 已新增 internal-only capability/action/DTO/evidence refs。尚未完成：正式法遵審閱 workflow、real notification、live detection、AI meeting `/notes` prototype 正式採納與 external registry publication。

AMM-005j global notes hub quarantine note（2026-06-22）：已將 dashboard `/notes` 從 local Zustand quick-note board 改為 accepted-source entrypoint，不採納 untracked `src/components/notes/*` 與 `src/domains/note/*` 作產品資料真相。新的 `/notes` page 是 server component，宣告 `data-local-note-store="disabled"` 與 `data-accepted-notes-source="/pre-visit/[planId]/notes"`，只導向已驗收的 `/pre-visit`、`/pre-visit/[planId]/notes`、CLIENT_MEETING workspace 與 postVisitNotes/Route B red-line context path；不建立未歸戶草稿、不讀 local seed notes、不保存 raw audio/transcript/provider payload、不建立 formal finding。新增 `pnpm meeting:notes-hub-quarantine-qa`，驗證 global `/notes` 不 import `@/components/notes`、`@/domains/note/store`、`useNoteStore`、`QuickNoteComposer`、`SEED_NOTES` 或 `localStorage`，並驗證 AgentFacts manifest/registry refs。尚未完成：若要開放真正 quick-capture notes，需另做 server-owned BFF、scope checks、writeback boundary、資料模型與 browser/API/DB proof。

Whole-product review note（2026-06-22 after AMM-005j notes hub quarantine）：第五輪校準確認前一輪 top gap「Route B red-line action context 下游消費」已由 visit preparation BFF/UI、AI meeting notes consumer 與 `/notes` accepted-source quarantine 收斂；新的最高槓桿缺口不是再補 docs/proof，而是 `ITA-005k disabled/no-provider red-line compliance-review intake`。下一輪 normal loop 建議建立 owner-scoped intake candidate contract：從 persisted Route B feedback/action context 或 visit/meeting red-line context 產生「待審閱候選」，只保留 `ruleId`、action state、advisorReasonCode、source surface、evidence refs、review status 與 safe summary；不得建立 formal legal/compliance finding、不得發真實 notification、不得呼叫 provider、不得寫 confirmed CRM fact、不得保存 raw private transcript / raw provider payload。若 formal compliance workflow、real notification 或 live detection 仍未獲 operator 明確批准，先完成 disabled/no-provider source/API/UI/QA slice；若只剩 dev-server/browser screenshot，交由 operator 自行重跑，不要用一輪 automation 做純證據搜集。

ITA-005k compliance-review intake note（2026-06-22）：已完成 disabled/no-provider 審閱候選 intake 的 source/API/UI 子切片，仍不代表正式法遵處置、real notification、legal review routing、live detection 或 external registry ready。新增 `src/domains/theater/route-b-compliance-review-intake.ts`，由 persisted `TheaterRouteBFeedbackReview.redLineFindings.actionContext` 產生 `RouteBComplianceReviewIntake`；只有 `ESCALATE` / `EVIDENCE_NEEDED` 進候選，候選只保留 rule/action/reason/source/evidence/review status/safe summary/timestamps 與 no-formal/no-notification/no-provider/no-CRM-fact proof。新增 `GET /api/theater/route-b/sessions/[sessionId]/compliance-review-intake`，透過 current-member owner-scoped repository 讀取同一 Route B session 的 feedback review，不信任 browser raw org/client/session/person id，且不新增 candidate persistence。`/theater/[sessionId]` 右側欄新增「待審閱候選」panel，清楚標示「需要佐證 / 不代表正式法遵處置」，不把 `ESCALATE` 呈現為已發正式通報。新增 `pnpm theater:route-b-compliance-review-intake-qa` 覆蓋 domain fixture、API/repository/UI/manifest static contract、no provider/no fake `AiUsageLog`、no notification/no formal finding/no confirmed CRM fact、no raw private/provider/contact/policy/payment sentinel；`asai.theater.route_b` manifest 已新增 internal-only capability/action/DTO/evidence refs 與 proof command。

Whole-product review note（2026-06-22 after Route B red-line preview）：第五輪校準確認 Route B 已有 persisted stage、group/private advisor turns、next-turn draft、provider logging contract、append confirmation、feedback persistence、objection/red-line library、provider prompt context 與 severe warning preview。最高槓桿缺口已轉為 `ITA-003n live Route B next-turn provider route wiring`：新增 owner-scoped provider-candidate route，從 persisted `RouteBSessionSnapshot` 與 `RouteBProviderPromptContext` 產生 CHARACTER/NARRATOR append candidate；success path 必須先寫 THEATER `AiUsageLog` 再回 `usageLogId` 與 candidate，error path 必須寫 sanitized error usage log；guard paths（unauth、manager/foreign、blocked draft、quota、provider disabled、raw sentinel）不得呼叫 provider或寫假 usage。UI 只能在 candidate 含 safe `usageLogId` 且 advisor confirmation 後 append，不得 mock success。若 provider/env 當輪不可用，先完成 disabled/error/quota guard proof，再改做 `ITA-005d` 紅線 action workflow；不得回到只補截圖或 docs-only evidence。

ITA-003n live provider route note（2026-06-22）：已完成 Route B next-turn provider-candidate route wiring，尚未宣稱 ITA-003 全卡或 external registry ready。新增 `POST /api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate`，由 member-scoped session repository 讀 persisted `RouteBSessionSnapshot`，server-side 產生 next-turn draft，注入 `RouteBProviderPromptContext` 後才呼叫 OpenAI JSON mode；success path 先寫 THEATER/OpenAI `AiUsageLog` 與 monthly usage，再回安全 candidate + `usageLogId`，provider/schema error path 先寫 sanitized error usage log，guard paths維持 no-provider/no-fake-usage/no-append。`/theater/[sessionId]` 新增「產生角色候選」按鈕，只有 candidate 安全旗標與 `usageLogId` 俱全時才啟用既有 append confirmation。新增 `pnpm theater:route-b-next-turn-provider-route-qa`，串接 provider/append dry-run 並靜態驗證 route/UI/manifest/audit source contract；另跑 `pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`。剩餘瀏覽器截圖或成本型 live click 可由 operator 在 dev server + provider key 可用時自行重跑；下一段建議改做 `ITA-005d` 紅線 action workflow，而不是再做 docs-only proof。

Whole-product review note（2026-06-22 after ITA-005f feedback consumption）：第五輪校準確認 Route B 的 severe red-line action chain 已從 preview、action workflow、owner-scoped persistence 推進到 feedback review consumption；新的最高槓桿缺口不是再補 theater retention proof，而是把 `sceneState.redLineActionState` / feedback `actionContext` 接到下一個 advisor surface。下一輪 normal loop 建議 `ITA/AMM-005g red-line action context downstream consumption bridge`：優先選一個 source-backed consumer（建議先做 visit preparation package；若要做 AI meeting notes，需先審核並隔離目前 worktree 中未納入 baseline 的 notes prototype），由 owner-scoped Route B session / feedback review 讀取 action context，轉成 facts / inferences / unknowns / advisor cautions / evidence-needed next steps；不得建立正式法遵 finding、real notification、legal advice 或 confirmed CRM fact write，不得儲存 raw private/provider payload。若剩餘只是 dev-server/browser visual proof，可交給 operator 自行跑，不要用一輪 automation 只蒐集截圖。

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
