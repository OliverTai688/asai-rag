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
> **2026-06-21 implementation reality**：後端 foundation 已先行完成 `AMM-001a/001b`、`AMM-002a`、`AMM-003a`，下一個最高槓桿切片改為把 accepted BFF/session/summary contract 接成正式可操作入口，而不是再用本地/demo-only prototype 作 proof。

---

## Current AI Meeting Gaps

- 拜訪後筆記只是 `VisitPlan.postVisitNotes` 純文字，無 transcript / 結構化摘要 / 行動項 / citation / 跨會議記憶。
- `interview` domain 已有完整 Park-memory + realtime voice + persistence，但綁在 `/interview`，未成為全站「會議」物件。
- `retrieveInterviewMemories()` 為 session-scoped；缺 client-scoped 跨 session 檢索與會議/客戶對答 route。
- 已有 `MeetingSummary` / `MeetingCitation` contract、additive `InterviewMeetingSummary` schema、member-scoped meeting capture BFF 與 deterministic cited summary persistence proof。
- 仍缺正式可操作 meeting workspace 入口（dashboard / CRM client detail / 訪前規劃）、cross-meeting memory/chat、provider JSON summary success/error `AiUsageLog` proof、writeback boundary 與 cross-state browser QA。

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
- [ ] AMM-003b：JSON mode provider 生成正式 `MeetingSummary`（headline/summary/decisions/actionItems/openQuestions/participants）；success/error 寫 `AiUsageLog`；quota-blocked 回 429 不呼叫 provider。
- [ ] AMM-003b：provider summary 可重生覆蓋（supersedes 前一份），不污染 transcript。
- [ ] AMM-003b：API proof 覆蓋 401、429、success summary 含 citation、provider error 寫 error log。
- [x] AMM-003a 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm meeting:summary-bff-qa`。

完成註記：2026-06-21 AMM-003a 已新增 `src/app/api/ai/meeting/sessions/[sessionId]/summary/route.ts` 與 `generateMeetingSummaryForMember()`；`pnpm meeting:summary-bff-qa` 證明 unauth 401、空來源 409、owner summary create 201、raw provider-like payload 409 且不落 row、overwrite=false 409、overwrite=true 200、manager 404、DB `InterviewMeetingSummary` citations/sourceTurnIds/guardEvidence/provider-null proof、`AiUsageLog` unchanged。AMM-003b provider JSON mode 仍未完成。

## Batch AMM-004 — 跨會議客戶記憶 + 對答
- [ ] 擴充 `retrieveInterviewMemories()` 支援可選 `clientId`（跨 session），保留 `visibilityScope` 過濾。
- [ ] 投影 CRM client facts / policy / family graph / prior report / prior meeting summary 成 `InterviewMemory`（fact 標 CONFIRMED、推論標 INFERENCE）。
- [ ] 新增 `POST /api/ai/meeting/sessions/[id]/chat` 與 `POST /api/ai/clients/[id]/memory-chat`，grounding = 本場 transcript + 本客戶跨 session 記憶。
- [ ] 答案分 facts/inferences/unknowns 並帶 citations；不把推論當事實、不重述已確認事實當新發現。
- [ ] success/error 寫 `AiUsageLog`；429/503 contract 完整。
- [ ] API proof：能引用**過去**會議與 CRM facts 回答；member 不能對無權客戶對答（403）。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

## Batch AMM-005 — 全站入口與拜訪後筆記升級
- [x] AMM-005a：先從 `/pre-visit/[planId]` 或 `/pre-visit/[planId]/meeting` 建立正式 meeting workspace 入口，接 accepted AMM BFF（create/read `CLIENT_MEETING`、append manual/final-transcript turn、generate deterministic summary），不得要求 raw ID。
- [x] AMM-005a：若採用既有未追蹤 meeting/notes prototype，必須在本卡明確檢查、限縮 AMM-owned subset、補 Browser/API proof，不能把 prototype 當既成 proof。
- [x] AMM-005a Browser/API proof：desktop/mobile console error 0、無水平 overflow、refresh/new-context persistence、manager/foreign denial、raw provider/audio/private sentinel blocked、no-provider `AiUsageLog` unchanged。
- [ ] `拜訪後筆記`（`/pre-visit/[planId]/notes`）升級為會議工作台：手動筆記 + 可選即時轉寫 + 自動摘要 + 對答，對齊同一 `CLIENT_MEETING` session。
- [ ] `postVisitNotes` / `postVisitAnalysis` 保留為手動輸入來源，相容並存，不破壞既有資料。
- [ ] 入口：dashboard「最近會議」、CRM client detail「會議」分頁、訪前規劃詳情皆可開始/檢視會議。
- [ ] 不改商業資料 schema 邏輯；遵循 `ACC-003` modern minimal 與 `ARC-003` 視覺。
- [ ] Browser proof：desktop/mobile console error 0、無水平 overflow、refresh persistence。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

Whole-product review note（2026-06-21 after AMM-003a）：第五輪校準確認 backend foundation 已 source/DB/API-backed，但 AMM 仍不是「容易操作」的 advisor workflow，因為顧問尚缺從 visit/client context 進入 meeting workspace 的正式入口。下一輪 normal loop 建議 `AMM-005a visible meeting workspace entrypoint`，先把 accepted BFF 和 deterministic summary route 接到低噪音 UI，留下 browser/API proof；`AMM-004a` cross-meeting memory/chat 與 `AMM-003b` provider JSON summary 是第二、第三順位。

完成註記：2026-06-21 AMM-005a 已採納既有 meeting UI prototype 的 AMM-owned subset，改為 `/pre-visit/[planId]` 可點擊進入 `/pre-visit/[planId]/meeting` 的正式工作台；workspace 只用 accepted meeting BFF 自動建立/讀取 `CLIENT_MEETING`、append manual note/final transcript、POST deterministic summary，並以 GET summary 支援 refresh/new-context persistence。`pnpm meeting:workspace-ui-qa` 覆蓋 desktop/mobile no overflow、console error 0、manager denial、raw provider/audio sentinel blocked、owner summary GET、AiUsageLog unchanged。未追蹤 notes UI 與 note domain prototype 仍未採納。

## Batch AMM-006 — 寫回邊界（行動項 / CRM）
- [ ] 沿用 `src/domains/interview/writeback-boundary.ts`：行動項 → follow-up task、confirmed fact → CRM candidate、inference → insight、unknown → follow-up。
- [ ] confirmed + 人工勾選才寫回；inference 永不變 CRM fact。
- [ ] 敏感客戶寫回需 reason/riskAccepted；所有寫回建立 audit/interaction event。
- [ ] 不刪改 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [ ] API proof：inference checked 不變 CRM fact；confirmed checked 才寫回；audit 建立。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

## Batch AMM-007 — pgvector 規模化（operator 依賴）
- [ ] `InterviewMemory.embeddingStatus` 接 embedding 寫入流程；Supabase 啟用 pgvector + 向量索引。
- [ ] 跨 session 檢索改向量＋lexical 混合；未啟用前以 lexical fallback 並在 report 標 blocker。
- [ ] 不宣稱向量檢索已上線，除非有實際 embedding + 索引 proof。
- [ ] 動 schema 跑 `pnpm prisma:validate`、`pnpm prisma:generate`、local/development db push 或 migration dry-run。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

## Batch AMM-008 — 跨狀態 QA、docs sync、rollback note
- [ ] 端到端 proof：建立會議 → 累積 transcript → 生成 summary（含 citation）→ 與客戶對答引用過去會議。
- [ ] 隱私 proof：org manager aggregate API 不回 transcript/memory/客戶明細；raw audio 不入庫。
- [ ] 用量 proof：summary/chat/realtime provider call 皆寫 `AiUsageLog`（success/error）；quota 429 不呼叫 provider。
- [ ] Persistence proof：清空 browser storage / 重新登入後會議與摘要可從 DB 恢復。
- [ ] Rollback note：`CLIENT_MEETING` 停用、`MeetingSummary` migration revert、pgvector/realtime 降級策略。
- [ ] 更新 `AGENTS.md`、`PLN-023`、必要 report / issue-question；保存 desktop/mobile 截圖。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma 與 Browser QA。

---

## Current AI Meeting Blockers

- `MeetingSummary` 正式表 development db push 已於 AMM-002a 對目前 `.env` target 執行；production migration / rollback plan 仍需明確 approval。
- raw audio 保存需 legal/compliance approval；預設不存。
- 跨會議向量檢索需 operator 在 Supabase 啟用 pgvector 與向量索引。
- 同 org 跨成員共享同客戶會議記憶屬 visibility 決策，預設 member-private，需 operator 決定是否開放。
- 即時視訊（Zoom/Meet/Teams）系統音訊捕捉非第一版範圍；第一版以現場麥克風面談為主。
- 若改 route/layout/server action/cookies/session 行為，先讀 `node_modules/next/dist/docs/` 對應 Next.js 文件。
