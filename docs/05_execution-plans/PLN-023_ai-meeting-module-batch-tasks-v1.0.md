# 誠問 AI AI Meeting Module Batch Tasks v1.0

> 建立日期：2026-06-20
> 狀態：可逐張執行的 batch backlog，與 `AGENTS.md` 的 AI Meeting Module workstream 互為鏡像（單一真相以 `AGENTS.md` 勾選狀態為準）
> 研究依據：`docs/07_research-and-design/RES-023_ai-meeting-module-research-v1.0.md`
> 架構依據：`docs/02_architecture-and-rules/ARC-010_ai-meeting-module-architecture-v1.0.md`
> 驗收依據：`docs/08_acceptance-and-qa/ACC-015_ai-meeting-module-acceptance-framework-v1.0.md`

本條只做：**會議捕捉 → 結構化摘要（含 citation）→ 跨會議客戶記憶 → 會議對答 → 寫回邊界 → 全站入口**。不做 UI redesign、不改 SPIN 狀態機、不改 Theater legacy enum/scoring、不預設保存 raw audio。KEY = `AMM`。

> **2026-06-20 operator 決策**：
> 1. `MeetingSummary` 持久化 = **開新表 `InterviewMeetingSummary`**。
> 2. 即時轉寫 = **只做現場 AI 麥克風**（mic-only realtime），視訊系統音訊延後。
> 3. 建置順序 = **先專注刻介面（UI-first）**：先做 `AMM-005` 會議工作台介面（本地/demo state），再回頭補 `AMM-001`~`AMM-004` 的 types/BFF/schema 與接線。介面層先用本地 state + demo fixture 呈現摘要/對答，後端隨後補。
>
> **2026-06-21 implementation reality**：後端 foundation 已先行完成 `AMM-001a/001b`、`AMM-002a`、`AMM-003a/003b`、`AMM-004a`、`AMM-005a`、`AMM-006a`；下一個最高槓桿切片應避開 docs-only proof，優先把 meeting writeback UI / global entrypoints 或 provider-backed memory-chat 接成正式可操作入口。

---

## Current AI Meeting Gaps

- 拜訪後筆記只是 `VisitPlan.postVisitNotes` 純文字，無 transcript / 結構化摘要 / 行動項 / citation / 跨會議記憶。
- `interview` domain 已有完整 Park-memory + realtime voice + persistence，但綁在 `/interview`，未成為全站「會議」物件。
- `retrieveInterviewMemories()` 已有 client-scoped deterministic memory-chat route 與 provider-backed live memory-chat mode；pgvector retrieval 仍待 AMM-007。
- 已有 `MeetingSummary` / `MeetingCitation` contract、additive `InterviewMeetingSummary` schema、member-scoped meeting capture BFF、deterministic cited summary persistence proof、provider JSON summary success/error `AiUsageLog` proof、pre-visit meeting workspace 入口、dashboard / CRM client detail 全站入口、deterministic writeback boundary 與 workspace confirmation cards。
- 仍缺 `/pre-visit/[planId]/notes` 與 `postVisitNotes` 相容升級、pgvector retrieval。AMM-008 已補 cross-state proof pack。

---

## Batch AMM-000 — 文件與 workstream 登錄
- [x] 新增 `RES-023`、`ARC-010`、`PLN-023`、`ACC-015`。
- [x] 更新 `AGENTS.md` 新增 AI Meeting Module workstream 鏡像。
- [x] 更新 `MAN-001` 文件索引與 `MAN-000` 文件數量。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`（純文件，無 code 變更時可註記 N/A）。

完成註記：2026-06-20 由「全站 AI 會議模組」需求啟動本 workstream；研究確認重用 `interview` Park-memory 引擎，缺口為會議第一級物件、結構化摘要+citation、跨 session 客戶記憶與對答。下一張最低未完成卡為 AMM-001。

## Batch AMM-001 — 會議資料模型與契約
- [x] `InterviewKind` 新增 `CLIENT_MEETING`（additive，不動 SPIN/Theater）。
- [x] 新增 pure types：`MeetingSummary`、`MeetingActionItem`、`MeetingParticipant`、`MeetingCitation`，置於 `src/domains/interview/meeting.ts`。
- [x] 定案 `MeetingSummary` 持久化：新增 `InterviewMeetingSummary` 表，或先存 session/reflection metadata（依 ARC-010 §2.2，operator 未核可 migration 前先 metadata + dry-run）。
- [x] 定案 AI 用量歸類：新增 `AiModule.MEETING` 或沿用 `CHAT`/既有 module + trace（同步 `pnpm ai:usage-audit` 認知）。
- [x] 建立 mapping helper：transcript turns + 手動筆記 → `MeetingSummary` 草稿骨架（pure，不呼叫 provider）。
- [x] unit/dry-run script：給定最小 turns 能產出 summary 骨架與 citation，未知不升格成 fact。
- [x] 不呼叫 provider、不改 legacy Theater、若動 schema 才跑 Prisma validate/generate。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-21 AMM-001a/001b 完成 source-backed contract。AMM-001a 新增 `MeetingSummary`/citation/action/participant pure contract、deterministic skeleton mapper 與 `pnpm meeting:contract-dry-run`；AMM-001b 新增 additive `CLIENT_MEETING`、`AiModule.MEETING`、`InterviewMeetingSummary` schema 與 `buildMeetingSummaryPersistenceDraft()` / `pnpm meeting:persistence-contract-dry-run`。本階段只 validate/generate Prisma，未 db push/migration，未採用未追蹤 meeting UI / notes UI prototype。

## Batch AMM-002 — 捕捉層重用（transcript + 手動筆記）
- [x] 新增 `POST /api/ai/meeting/sessions`（`CLIENT_MEETING`，可帶 `clientId`、`visitPlanId`），`requireCurrentMember()` 推導 scope。
- [x] 新增 `GET /api/ai/meeting/sessions/[id]`、`POST /api/ai/meeting/sessions/[id]/turns`（手動筆記 / 文字 / 語音 final transcript），auto 產生 memory candidate。
- [x] 即時語音沿用既有 `/api/ai/interview/realtime-session`、`realtime-events`、`transcribe`，以 `CLIENT_MEETING` 建立；raw audio 不存。
- [x] DTO 回 transcript（含 turn `occurredAt`）、memory rail（confirmed/inference/unknown）。
- [x] API proof：unauth 401、member create/turn 200/201、清空 storage 後可重讀。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-21 AMM-002a 已新增 `src/lib/interview/meeting-session-repository.ts`、`/api/ai/meeting/sessions`、`/[sessionId]`、`/[sessionId]/turns`，以 current member scope 建立/讀取 `CLIENT_MEETING`，client/visitPlan 由 owner-scoped DB record resolve，raw audio/provider/secret/payment payload 會被 409 blocked。`pnpm meeting:bff-qa` 證明 unauth 401、member create/turn/readback、manager 404、DB metadata/turn/memory proof、raw payload blocked、`AiUsageLog` unchanged。

## Batch AMM-003 — 結構化摘要生成 + 引用
- [x] AMM-003a：新增 deterministic/no-provider `POST /api/ai/meeting/sessions/[id]/summary`，由已持久化 turns/memories 產生並 upsert `InterviewMeetingSummary`。
- [x] AMM-003a：每要點/行動項帶 `citations`（turnId + occurredAt + memoryIds），只引用已存在 turn/memory（防幻覺）。
- [x] AMM-003a：手動筆記與 final transcript 一起餵 deterministic summary skeleton；支援明確 `overwrite`。
- [x] AMM-003b：JSON mode provider 生成正式 `MeetingSummary`（headline/summary/decisions/actionItems/openQuestions/participants）；success/error 寫 `AiUsageLog`；quota-blocked 回 429 不呼叫 provider。
- [x] AMM-003b：provider summary 可重生覆蓋（supersedes 前一份），不污染 transcript。
- [x] AMM-003b：API proof 覆蓋 401、429、success summary 含 citation、provider error 寫 error log。
- [x] AMM-003a 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm meeting:summary-bff-qa`。
- [x] AMM-003b 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm meeting:summary-provider-qa`。

完成註記：2026-06-21 AMM-003a 已新增 `src/app/api/ai/meeting/sessions/[sessionId]/summary/route.ts` 與 `generateMeetingSummaryForMember()`；`pnpm meeting:summary-bff-qa` 證明 unauth 401、空來源 409、owner summary create 201、raw provider-like payload 409 且不落 row、overwrite=false 409、overwrite=true 200、manager 404、DB `InterviewMeetingSummary` citations/sourceTurnIds/guardEvidence/provider-null proof、`AiUsageLog` unchanged。AMM-003b provider JSON mode 仍未完成。

完成註記：2026-06-21 AMM-003b 已新增 provider JSON summary path 與 `pnpm meeting:summary-provider-qa`；proof 覆蓋 unauth 401、raw provider-like payload 409/no row、provider-disabled 503/no fake usage、quota 429/no provider、forced provider error 502 + error log/no summary row、success 201 + citations + provider/model/usageLogId、overwrite=false 不重打 provider、overwrite=true 更新同一 summary row 並新增 success log、manager 404/no log、DB `generated_by='provider-json'`、`provider='OPENAI'`、`usage_log_id IS NOT NULL`、guardEvidence `providerCallAttempted=true` / `storesRawProviderPayload=false` / `writesConfirmedCrmFact=false`。Deterministic no-provider summary path 仍保留作 fallback。

## Batch AMM-004 — 跨會議客戶記憶 + 對答
- [x] AMM-004a：擴充 `retrieveInterviewMemories()` 支援可選 `clientId`（跨 session），保留 `visibilityScope` 過濾。
- [x] AMM-004a：投影 CRM client facts / policy / family graph / prior report / prior meeting summary 成 deterministic memory-chat grounding（fact/inference/unknown 保留標籤）。
- [x] AMM-004a：新增 `POST /api/ai/meeting/sessions/[id]/chat` 與 `POST /api/ai/clients/[id]/memory-chat`，grounding = 本場 transcript + 本客戶跨 session 記憶。
- [x] AMM-004a：答案分 facts/inferences/unknowns 並帶 citations；不把推論當事實、不重述已確認事實當新發現。
- [x] AMM-004b success/error 寫 `AiUsageLog`；429/503 contract 完整。
- [x] AMM-004a API proof：能引用**過去**會議與 CRM facts 回答；member 不能對無權客戶對答（403）。
- [x] AMM-004a 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm meeting:memory-chat-qa`。
- [x] AMM-004b 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm meeting:memory-chat-provider-qa`、`pnpm ai:bff-audit`、`pnpm ai:protocol-registry-qa`。

完成註記：2026-06-21 AMM-004a 已完成 deterministic/no-provider cross-meeting memory-chat；新增 `src/lib/interview/meeting-memory-chat-repository.ts`、`POST /api/ai/meeting/sessions/[sessionId]/chat`、`POST /api/ai/clients/[clientId]/memory-chat` 與 `pnpm meeting:memory-chat-qa`。Proof 覆蓋 unauth 401、owner session/client memory-chat 200、prior meeting summary citation、current/client memory citation、CRM client/family/policy projection、facts/inferences/unknowns 分桶、manager session 404、manager client 403、raw provider sentinel 409 且不 echo、response 不含 email/phone/policy id/raw transcript/provider payload、no-provider `AiUsageLog` unchanged。Provider-backed live chat、quota 429/503 與 success/error `AiUsageLog` 仍留待 AMM-004b/AMM-003b。

完成註記：2026-06-21 AMM-004b 已完成 provider-backed meeting/client memory-chat；`mode: "PROVIDER_JSON"` 共用 owner-scoped grounding、least-disclosure citations 與 safety assertion，quota/provider-disabled guard 先於 provider call，provider error/success 都寫 `MEETING` / `OPENAI` `AiUsageLog`，不持久化 raw provider payload 或 chat transcript。新增 `src/lib/interview/meeting-memory-chat-provider.ts` 與 `pnpm meeting:memory-chat-provider-qa`，proof 覆蓋 unauth 401、raw provider-like payload 409/no echo、provider-disabled 503/no fake usage、quota 429/no provider、forced provider error 502 + error log、session/client provider memory-chat success + usageLogId、DB usage log trace/client linkage、manager 404/403 no log、response 無 email/phone/policy/raw transcript/provider payload。Deterministic no-provider fallback 仍保留。

## Batch AMM-005 — 全站入口與拜訪後筆記升級
- [x] AMM-005a：先從 `/pre-visit/[planId]` 或 `/pre-visit/[planId]/meeting` 建立正式 meeting workspace 入口，接 accepted AMM BFF（create/read `CLIENT_MEETING`、append manual/final-transcript turn、generate deterministic summary），不得要求 raw ID。
- [x] AMM-005a：若採用既有未追蹤 meeting/notes prototype，必須在本卡明確檢查、限縮 AMM-owned subset、補 Browser/API proof，不能把 prototype 當既成 proof。
- [x] AMM-005a Browser/API proof：desktop/mobile console error 0、無水平 overflow、refresh/new-context persistence、manager/foreign denial、raw provider/audio/private sentinel blocked、no-provider `AiUsageLog` unchanged。
- [ ] `拜訪後筆記`（`/pre-visit/[planId]/notes`）升級為會議工作台：手動筆記 + 可選即時轉寫 + 自動摘要 + 對答，對齊同一 `CLIENT_MEETING` session。
- [ ] `postVisitNotes` / `postVisitAnalysis` 保留為手動輸入來源，相容並存，不破壞既有資料。
- [x] AMM-005b：入口：dashboard「最近會議」、CRM client detail「AI 會議工作台」、訪前規劃詳情皆可開始/檢視會議，且不要求 raw ID workflow。
- [x] AMM-005b：不改商業資料 schema 邏輯；入口遵循 `ACC-003` modern minimal 與 `ARC-003` 視覺。
- [x] AMM-005b Browser/API/DB proof：dashboard/CRM desktop + CRM mobile console error 0、無水平 overflow、refresh persistence、manager/foreign denial、raw provider payload guard、client-scoped DB proof、no-provider `AiUsageLog` unchanged。
- [x] AMM-005b 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm meeting:global-entrypoints-qa`。

Whole-product review note（2026-06-21 after AMM-003a）：第五輪校準確認 backend foundation 已 source/DB/API-backed，但 AMM 仍不是「容易操作」的 advisor workflow，因為顧問尚缺從 visit/client context 進入 meeting workspace 的正式入口。下一輪 normal loop 建議 `AMM-005a visible meeting workspace entrypoint`，先把 accepted BFF 和 deterministic summary route 接到低噪音 UI，留下 browser/API proof；`AMM-004a` cross-meeting memory/chat 與 `AMM-003b` provider JSON summary 是第二、第三順位。

完成註記：2026-06-21 AMM-005a 已採納既有 meeting UI prototype 的 AMM-owned subset，改為 `/pre-visit/[planId]` 可點擊進入 `/pre-visit/[planId]/meeting` 的正式工作台；workspace 只用 accepted meeting BFF 自動建立/讀取 `CLIENT_MEETING`、append manual note/final transcript、POST deterministic summary，並以 GET summary 支援 refresh/new-context persistence。`pnpm meeting:workspace-ui-qa` 覆蓋 desktop/mobile no overflow、console error 0、manager denial、raw provider/audio sentinel blocked、owner summary GET、AiUsageLog unchanged。未追蹤 notes UI 與 note domain prototype 仍未採納。

完成註記：2026-06-21 AMM-005b 已完成 dashboard + CRM global meeting entrypoints。新增 dashboard「最近會議」入口、CRM client detail「AI 會議工作台」入口、`/crm/[clientId]/meeting` route，並讓 `MeetingWorkspace` 可從 `visitPlanId` 或 `clientId` 啟動同一 accepted AMM BFF。新增 `scripts/meeting-global-entrypoints-qa.mjs` / `pnpm meeting:global-entrypoints-qa`，證明 dashboard recent meeting 直接進 `/pre-visit/[planId]/meeting`、CRM direct meeting 可建立 client-scoped `CLIENT_MEETING`、summary refresh/new-context persistence、DB client scope / no visitPlan proof、manager denied、raw provider payload blocked、desktop/mobile no overflow、console error 0、no-provider `AiUsageLog` unchanged。`/pre-visit/[planId]/notes` 與 `postVisitNotes` 相容升級仍未完成。

Whole-product review note（2026-06-21 after AMM-008）：AMM 已具備跨狀態 source/browser/API/DB/provider proof，但拜訪後整理仍分裂為 legacy `/pre-visit/[planId]/notes` / `postVisitNotes` 與正式 `CLIENT_MEETING` workspace。下一輪不得只補文件或 proof-plan；應以 `AMM-005c` 修改 source，讓 notes route、manual notes、quick-capture、meeting summary、writeback confirmation 與 legacy post-visit notes 有同頁相容路徑並能重跑 proof。

## Batch AMM-005c — Notes / postVisitNotes compatibility bridge
- [ ] `/pre-visit/[planId]/notes` 保留 BFF-owned `postVisitNotes` / `postVisitAnalysis` read-write-reload，同頁提供進入或內嵌同一 owner-scoped `CLIENT_MEETING` workspace 的路徑，不要求 raw session ID。
- [ ] 手動拜訪筆記、quick-capture 結果與 meeting turns/summary 明確分層：raw note 不成 raw transcript，不保存 raw provider payload，inference / unknown 不升格 confirmed CRM fact。
- [ ] 顯示 latest `InterviewMeetingSummary`、writeback confirmation 狀態與 legacy notes saved state；refresh/new browser context 後可同時看見 `postVisitNotes` 與 meeting summary / memory evidence。
- [ ] Browser/API/DB proof 覆蓋 owner success、manager/foreign denial、raw private/provider sentinel blocked、`AiUsageLog` no-provider unchanged 或 provider path success/error log、desktop/mobile no overflow、console error 0。
- [ ] 新增可重跑 proof command（建議 `pnpm meeting:notes-compat-qa`）；跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

## Batch AMM-006 — 寫回邊界（行動項 / CRM）
- [x] 沿用 `src/domains/interview/writeback-boundary.ts`：行動項 → follow-up task、confirmed fact → CRM candidate、inference → insight、unknown → follow-up。
- [x] confirmed + 人工勾選才寫回；inference 永不變 CRM fact。
- [x] 敏感客戶寫回需 reason/riskAccepted；所有寫回建立 audit/interaction event。
- [x] 不刪改 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [x] API proof：inference checked 不變 CRM fact；confirmed checked 才寫回；audit 建立。
- [x] AMM-006b：meeting workspace 讀取 `GET /api/ai/meeting/sessions/[sessionId]/writebacks`，在摘要旁顯示低噪音 confirmation cards；summary missing 時顯示「先生成摘要」而非 raw error。
- [x] AMM-006b：顧問可勾選 confirmed decision / inference / action item / unknown/open question；需要 reason/riskAccepted 的候選可填寫理由或勾選風險接受。
- [x] AMM-006b：提交 `POST .../writebacks` 後顯示 created / blocked / skipped 結果；inference checked 仍只成 insight，不建立 CRM fact；confirmed 只建立 CRM candidate audit event。
- [x] AMM-006b Browser/API/DB proof：desktop/mobile console error 0、無水平 overflow、owner createdEvents、manager 404、raw provider/private sentinel blocked、high-sensitive missing reason blocked、no-provider `AiUsageLog` unchanged。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記：2026-06-21 AMM-006a 已完成 deterministic/no-provider meeting writeback boundary；新增 `src/domains/interview/meeting-writeback-boundary.ts`、`src/lib/interview/meeting-writeback-repository.ts`、`/api/ai/meeting/sessions/[sessionId]/writebacks` 與 `pnpm meeting:writeback-qa`。Proof 覆蓋 summary_required / summary missing 409、raw provider-like payload 409 且不 echo sentinel、confirmed decision → CRM candidate、inference → insight 且 CRM fact count = 0、action item / unknown → follow-up task、高敏感 confirmed fact 缺 reason/riskAccepted blocked、manager 404、DB `InteractionEvent` audit evidence 與 no-provider `AiUsageLog` 150->150 unchanged。尚未完成的是 meeting workspace UI confirmation cards 與 AMM-004b provider-backed memory-chat。

Whole-product review note（2026-06-21 after AMM-003b）：最新 fifth-loop review 將下一個 normal loop 指向 `AMM-006b meeting workspace writeback confirmation cards`。理由：AMM backend/provider foundation 已完成，但 `src/components/meeting/meeting-workspace.tsx` 尚未消費 `/writebacks` preview/POST；這直接阻斷「AI 會議/訪談補強客戶資料與待辦」的可操作閉環。下一輪需做 source-backed UI/API/DB/browser proof，不得只更新 docs 或 proof plan。

完成註記：2026-06-21 AMM-006b 已完成 meeting workspace writeback confirmation cards；`src/components/meeting/meeting-workspace.tsx` 摘要就緒後會讀取 `/writebacks` preview，顯示 confirmed/inference/action/unknown 候選、reason/riskAccepted、高敏感 blocked 與 created/blocked/skipped 結果。新增 `scripts/meeting-workspace-writeback-ui-qa.mjs` / `pnpm meeting:workspace-writeback-ui-qa`，證明 summary-required UI、desktop/mobile console error 0、無水平 overflow、owner createdEvents、manager 404、raw provider/private sentinel 409/no echo、confirmed approved -> CRM candidate audit、inference CRM fact count = 0、action/unknown -> follow-up task、`writesConfirmedCrmFact=false`、no-provider `AiUsageLog` 153->153 unchanged。AMM-008 cross-state proof pack 已補上；pgvector 與 notes/postVisitNotes 相容升級仍未完成。

## Batch AMM-007 — pgvector 規模化（operator 依賴）
- [ ] `InterviewMemory.embeddingStatus` 接 embedding 寫入流程；Supabase 啟用 pgvector + 向量索引。
- [ ] 跨 session 檢索改向量＋lexical 混合；未啟用前以 lexical fallback 並在 report 標 blocker。
- [ ] 不宣稱向量檢索已上線，除非有實際 embedding + 索引 proof。
- [ ] 動 schema 跑 `pnpm prisma:validate`、`pnpm prisma:generate`、local/development db push 或 migration dry-run。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

## Batch AMM-008 — 跨狀態 QA、docs sync、rollback note
- [x] 端到端 proof：建立會議 → 累積 transcript → 生成 summary（含 citation）→ 與客戶對答引用過去會議。
- [x] 隱私 proof：org manager aggregate API 不回 transcript/memory/客戶明細；raw audio 不入庫。
- [x] 用量 proof：summary/chat/realtime provider call 皆寫 `AiUsageLog`（success/error）；quota 429 不呼叫 provider。
- [x] Persistence proof：清空 browser storage / 重新登入後會議與摘要可從 DB 恢復。
- [x] Rollback note：`CLIENT_MEETING` 停用、`MeetingSummary` migration revert、pgvector/realtime 降級策略。
- [x] 更新 `AGENTS.md`、`PLN-023`、必要 report / issue-question；保存 desktop/mobile 截圖。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma 與 Browser QA。

完成註記：2026-06-21 AMM-008 新增 `scripts/meeting-cross-state-qa.mjs` / `pnpm meeting:cross-state-qa`，以單一可重跑 proof pack 覆蓋 member 建客戶/visit/meeting、workspace manual note + final transcript、provider summary citation、new browser context persistence、writeback confirmation、provider memory-chat、Realtime `CLIENT_MEETING` provider path / quota guard、manager aggregate privacy 與 raw sentinel DB scan。Rollback：`CLIENT_MEETING` meeting entrypoints 可 feature flag/route gate 停用；`InterviewMeetingSummary` 為 additive migration，可依 production rollback plan revert；pgvector 未啟用時保留 lexical fallback；Realtime provider/env 不可用時走 guarded-disabled/quota path 且不保存 raw audio。

---

## Current AI Meeting Blockers

- `MeetingSummary` 正式表 development db push 已於 AMM-002a 對目前 `.env` target 執行；production migration / rollback plan 仍需明確 approval。
- raw audio 保存需 legal/compliance approval；預設不存。
- 跨會議向量檢索需 operator 在 Supabase 啟用 pgvector 與向量索引。
- 同 org 跨成員共享同客戶會議記憶屬 visibility 決策，預設 member-private，需 operator 決定是否開放。
- 即時視訊（Zoom/Meet/Teams）系統音訊捕捉非第一版範圍；第一版以現場麥克風面談為主。
- 若改 route/layout/server action/cookies/session 行為，先讀 `node_modules/next/dist/docs/` 對應 Next.js 文件。
