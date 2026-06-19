# 誠問 AI Realtime Voice × Park-style Interview Memory Batch Tasks v1.0

> 建立日期：2026-06-19  
> 狀態：進行中（PIM-008 完成）  
> 架構依據：`ARC-007_realtime-voice-and-park-memory-interview-architecture-v1.0.md`  
> 研究依據：`RES-017_chinese-realtime-voice-and-park-memory-interview-research-v1.0.md`  
> 既有雙 Agent 依據：`ARC-004_interview-theater-dual-agent-design-v1.1.md`、`PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`  
> 驗收依據：`ACC-010_realtime-voice-park-memory-interview-acceptance-framework-v1.0.md`

本計畫把「中文即時語音」與「Park-style memory stream / reflection / planning」拆成可由 AGENTS.md 逐輪執行的 batch tasks。範圍只覆蓋兩個 AI 訪談的運作架構：

- 顧問陪談訪綱 A：`ADVISOR_COMPANION`
- 劇場場域建構訪綱 B：`THEATER_FIELD_BUILD`

本 workstream 不直接完成 Theater Route B 全量多角色 migration；只產生可被 Theater Route B 消費的場域建構記憶與 build packet。

---

## 0. 執行協定

每張 PIM 卡固定流程：

1. **讀文件**：`AGENTS.md`、`ARC-007`、本 `PLN-018`、`ACC-010`。涉及雙 Agent 基礎時讀 `ARC-004` / `PLN-015`；涉及語音時讀 `RES-017`。
2. **守 hard rules**：不改 SPIN 狀態機、不刪合規欄位、不手改 `src/generated/`、AI call 必寫 `AiUsageLog`。
3. **先 contract 後 UI**：新增 API/DB/UI 前先落 domain type、visibility scope、fact/inference/unknown contract。
4. **語音先 shell 後 realtime**：不得在沒有 consent、fallback、quota/session guard 前接 production realtime。
5. **Park memory 不冒充事實**：reflection/planning 都是解釋與控制層，不可直接寫回 CRM。
6. **驗收**：每張卡跑 `pnpm lint:changed`；動 schema 跑 `pnpm prisma:validate`、`pnpm prisma:generate`；動 route/core type 跑 `pnpm exec tsc --noEmit --pretty false`；動 UI 做 Browser/headless proof。
7. **同步狀態**：完成後更新本文件與 `AGENTS.md` 勾選狀態，註記變更檔案、驗收結果與未完成項。

---

## 1. 進度看板

| 卡片 | 主題 | 狀態 | 依賴 |
| --- | --- | --- | --- |
| PIM-000 | 架構文件與 workstream 登錄 | [x] | `RES-017` |
| PIM-001 | Memory domain contracts + pure services | [x] | PIM-000 |
| PIM-002 | 顧問陪談 Park memory loop | [x] | PIM-001、ITA-001 |
| PIM-003 | 劇場場域建構 Park memory loop | [x] | PIM-001、ITA-003/Route B contract |
| PIM-004 | `/interview` 中文語音 UX shell | [x] | PIM-000 |
| PIM-005 | Realtime session BFF + event mirror | [x] | PIM-004、session/quota guard |
| PIM-006 | Prisma persistence for turns/memory/reflection | [x] | PIM-001、DB approval |
| PIM-007 | Reflection + planning service/routes | [x] | PIM-006 可部分並行 |
| PIM-008 | Confirmation card + CRM/writeback boundary | [x] | PIM-002、PIM-006 |
| PIM-009 | Cross-mode QA, docs sync, rollback notes | [ ] | PIM-002 to PIM-008 |

---

## Batch PIM-000 - 架構文件與 workstream 登錄

目標：把 `RES-017` 轉成可實作的 ARC、PLN、ACC 與 AGENTS workstream。

- [x] 新增 `ARC-007`，明確定義兩個 AI 訪談共用 Park-style runtime architecture。
- [x] 新增 `PLN-018`，拆成可逐張執行的 PIM batch tasks。
- [x] 新增 `ACC-010`，定義語音、memory、reflection、planning、writeback、QA 驗收。
- [x] 更新 `AGENTS.md` 新 workstream，與本文件卡片狀態同步。
- [x] 更新 `MAN-000` 文件數量與 `MAN-001` 文件索引。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不改 app code、不改 Prisma schema、不接 Realtime API。

完成註記：2026-06-19 已新增 `ARC-007` / `PLN-018` / `ACC-010`，並同步 `AGENTS.md`、`MAN-000`、`MAN-001`。驗收：`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 通過。下一張最低未完成卡為 PIM-001。

---

## Batch PIM-001 - Memory domain contracts + pure services

目標：建立不依賴 DB 的 Park memory contract，讓兩個 AI 訪談先能共用記憶抽取、檢索、反思輸入與 planning 輸入。

- [x] 在 `src/domains/interview/` 新增或擴充 `InterviewKind`、`InterviewModality`、`InterviewMemory`、`InterviewReflection`、`InterviewMicroPlan` 型別。
- [x] 新增 memory candidate extraction pure service，將 user/assistant turn 轉成 `fact` / `inference` / `unknown` / `instruction` 候選。
- [x] 新增 retrieval scoring pure helper：relevance、importance、recency、outline match、scope filters。
- [x] 新增 correction/supersede helper，確保 transcript 修正後舊 memory 不再當 confirmed fact。
- [x] 新增 unit tests 或 dry-run script，覆蓋顧問陪談與劇場場域建構 memory candidate。
- [x] 不新增 DB、不改 AI route、不保存 raw audio。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不實作 Realtime、不改 Prisma、不做 UI。

完成註記：2026-06-19 已新增 `src/domains/interview/memory.ts` 與 `InterviewMemory` / `InterviewReflection` / `InterviewMicroPlan` 等 domain contract，並加入 `pnpm interview:memory-dry-run` 覆蓋顧問陪談 confirmed fact、劇場 inference、voice transcript unknown、correction/supersede 與 retrieval ranking。驗收：`pnpm interview:memory-dry-run`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed` 通過。下一張最低未完成卡為 PIM-002。

---

## Batch PIM-002 - 顧問陪談 Park memory loop

目標：讓 `ADVISOR_COMPANION` 在文字訪談模式先具備 Park-style 連續記憶，不重問已確認事實，並可產生可追溯準備卡。

- [x] `/api/ai/interview` 使用 memory extraction 結果建立 session-local memory stream。
- [x] AI 回應前先做 scoped retrieval，prompt 中明確區分 confirmed facts / inferences / unknowns。
- [x] 產生 `InterviewMicroPlan`，UI 顯示「為什麼問這題」或可供 debug/QA 的 plan evidence。
- [x] `/api/ai/interview/outputs` 消費 memory stream / reflection / supporting memory IDs，而不只吃 messages。
- [x] 顧問陪談不重問已 confirmed facts；轉寫/輸入不確定時先確認。
- [x] 每次 AI call 成功/錯誤皆寫 `AiUsageLog`。
- [x] API proof：多輪對話中已確認事實不被重問，output draft 帶 supporting memory IDs。
- [x] Browser proof：`/interview` desktop/mobile 無 console error、無水平 overflow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不做 voice、不寫回 CRM、不新增 Prisma schema。

完成註記：2026-06-19 已新增 `src/domains/interview/park-loop.ts`，讓 `/api/ai/interview` 與 `/api/ai/interview/outputs` 共用 session-local memory stream、retrieval partition、micro-plan 與 evidence IDs。UI 於 `/interview` 顯示「下一題計畫」與 supporting memory IDs。驗收：`pnpm interview:park-loop-dry-run`、`pnpm interview:memory-dry-run`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`pnpm build` 通過；Browser proof desktop/mobile console error 0、無水平 overflow，且合成回答送出後顯示 plan evidence。截圖：`docs/06_audits-and-reports/screenshots/pim/pim-002-interview-desktop.png`、`docs/06_audits-and-reports/screenshots/pim/pim-002-interview-mobile.png`。下一張最低未完成卡為 PIM-003。

---

## Batch PIM-003 - 劇場場域建構 Park memory loop

目標：讓 `THEATER_FIELD_BUILD` 訪綱 B 使用同一 memory architecture，產生 Theater Route B 可消費的 build packet。

- [x] 萃取或補齊 theater field outline runtime entry，使用 `InterviewKind.THEATER_FIELD_BUILD`。
- [x] 將場景、角色、關係、異議、敏感資料與未知缺口轉成 memory candidates。
- [x] Reflection 判斷焦點客戶、NPC 必要性、已知/推論/未知、旁白 NPC 需補問項。
- [x] 產生 `TheaterBuildPacket`，只把 confirmed facts 當事實，inferred persona 保持推論語氣。
- [x] 若資料不足，不生成可演練劇場；改回補問或旁白 NPC question list。
- [x] 不改 Theater legacy enum/scoring；若要接 Route B schema，需依 ITA-003/ITA-006 migration note。
- [x] API/source-level proof：build packet 不含未確認 fact leakage，NPC <= 4。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`；動 schema 才跑 Prisma。

範圍外：不實作完整多角色劇場 session；不保存 raw transcript 給 org manager。

完成註記：2026-06-19 已新增 `src/domains/interview/outlines/theater-field-build.ts`、`src/domains/interview/theater-build.ts` 與 `TheaterBuildPacket` contract，並以 `pnpm interview:theater-build-dry-run` 驗證 READY / NEEDS_MORE_INFO、NPC 上限、未知缺口旁白補問與 inference-to-fact leakage guard。驗收：`pnpm interview:theater-build-dry-run`、`pnpm interview:park-loop-dry-run`、`pnpm interview:memory-dry-run`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed`、新增檔案 ESLint、`pnpm build` 通過。下一張最低未完成卡為 PIM-004。

---

## Batch PIM-004 - `/interview` 中文語音 UX shell

目標：先完成語音模式 UI 與 consent/fallback，不接 production Realtime provider。

- [x] `/interview` 新增 mode toggle：文字訪談 / 中文語音訪談 Beta。
- [x] 顯示 mic consent：使用麥克風、預設不保存 raw audio、只保存 transcript/structured memory。
- [x] 顯示 live voice stage：未連線、聽取中、AI 思考中、AI 回覆中、已暫停。
- [x] 顯示 live transcript panel，支援 transcript correction UI 與 `correction` memory placeholder。
- [x] 顯示 memory rail：已確認、推論、待確認、本段訪綱進度。
- [x] 提供 text fallback；browser 不支援 mic 或 permission denied 時不阻斷文字模式。
- [x] 不呼叫 production Realtime、不保存 raw audio。
- [x] Browser proof：desktop/mobile、permission denied、fallback、console error 0、無水平 overflow。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不新增 realtime-session route、不接 OpenAI。

完成註記：2026-06-19 已在 `/interview` 完成中文語音 UX shell 與文字 fallback：mode toggle、mic consent、voice stage、live transcript、transcript correction placeholder、memory rail、permission denied/unsupported fallback，並補上中文 IME composition guard 避免組字 Enter 誤送出。驗收：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/app/(dashboard)/interview/page.tsx`、`pnpm run lint:changed`、`pnpm interview:memory-dry-run`、`pnpm interview:park-loop-dry-run`、`pnpm interview:theater-build-dry-run`、`pnpm build` 通過；Browser desktop/mobile console error 0、無水平 overflow；headless Chrome smoke 覆蓋 permission denied/unsupported fallback。截圖：`docs/06_audits-and-reports/screenshots/pim/pim-004-interview-desktop.png`、`docs/06_audits-and-reports/screenshots/pim/pim-004-interview-mobile.png`。下一張最低未完成卡為 PIM-005。

---

## Batch PIM-005 - Realtime session BFF + event mirror

目標：建立安全的 Realtime session BFF 與 event mirror，讓中文語音可以進入同一 memory pipeline。

- [x] 新增 `POST /api/ai/interview/realtime-session`，用 `requireCurrentMember()` 推導 org/member/unit。
- [x] 套 `canUseAiModule(session, INTERVIEW)`；超限回 429，不 mint realtime token。
- [x] Mint short-lived ephemeral Realtime session token；不得把 server API key 下放 browser。
- [x] 新增 `POST /api/ai/interview/realtime-events`，只接 final transcript、assistant transcript、interrupt、correction、confirmation 等非 secret event。
- [x] final transcript event 進 memory extraction；raw audio 預設不保存。
- [x] Realtime provider success/error/usage metadata 可取得時寫 `AiUsageLog`；若 provider usage metadata 不足，至少記 session marker 與 event proof，不得偽造 cost。
- [x] API proof：unauth 401、quota 429、member 200、event mirror 200、secret 不出現在 response/log/report。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不做 server WebSocket relay；不啟 production recording。

完成註記：2026-06-19 已新增 Realtime session BFF、event mirror route、shared helper 與 `pnpm interview:realtime-bff-qa`。Production path 使用 OpenAI `/v1/realtime/client_secrets` 並只回傳短效 client secret；non-production dry-run 驗證 unauth 401、quota 429、member 200、event mirror 200、raw-audio/secret reject 與 server API key 不出現在 response。Event mirror 將 final transcript 轉入 memory candidate，不保存 raw audio；session route 與 event mirror 均寫 usage/session marker，不偽造 cost。驗收：`pnpm interview:realtime-bff-qa`、`pnpm interview:memory-dry-run`、`pnpm interview:park-loop-dry-run`、`pnpm interview:theater-build-dry-run`、`pnpm ai:usage-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed`、`pnpm build` 通過。下一張最低未完成卡為 PIM-006。

---

## Batch PIM-006 - Prisma persistence for turns/memory/reflection

目標：把訪談 turn、memory、reflection DB 化，支援重開訪談與清空 browser storage 後仍可連續。

- [x] Prisma 新增或調整 `InterviewSession`、`InterviewTurn`、`InterviewMemory`、`InterviewReflection`。
- [x] 所有 records 有 `organizationId`；client-bound records 有可驗證 `clientId`；必要時帶 `unitId`。
- [x] 建立 repository / DTO，不讓 client 直接 import Prisma/domain DB layer。
- [x] Backfill/seed strategy idempotent，只處理 demo 或新表，不破壞真實資料。
- [x] Org manager API 不回逐字稿、memory text、client detail。
- [x] 動 schema 跑 `pnpm prisma:validate`、`pnpm prisma:generate`、local/development `db push` 或 migration dry-run。
- [x] API proof：建立 session、turn、memory、reflection；重新登入/清空 storage 後可讀。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不做 pgvector；不寫完整 RAG retrieval。

完成註記：2026-06-19 已新增 `InterviewSession`、`InterviewTurn`、`InterviewMemory`、`InterviewReflection` schema 與 owner-scoped BFF routes：`POST /api/ai/interview/sessions`、`GET /api/ai/interview/sessions/[sessionId]`、`POST /turns`、`POST /reflections`。Repository/DTO 位於 `src/lib/interview/interview-persistence-repository.ts`，turn append 沿用 Park-style memory extraction，reflection supportingMemoryIds 僅接受同 session memory。DB target 為目前 `.env` Supabase Postgres development target，已執行 additive `pnpm exec prisma db push` 且無 data-loss prompt。新增 `pnpm interview:persistence-qa` 覆蓋 unauth 401、member create/turn/memory/reflection、stateless snapshot read、manager 404 privacy guard 與 no raw audio payload。驗收：`pnpm prisma:validate`、`pnpm prisma:generate`、`pnpm exec prisma db push`、`pnpm interview:persistence-qa`、四個 PIM proof、`pnpm ai:usage-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed`、`pnpm build` 通過。下一張最低未完成卡為 PIM-007。

---

## Batch PIM-007 - Reflection + planning service/routes

目標：把 Park reflection 與 planning 從 prompt 內隱邏輯拆成可測、可審計、可重用的 application service。

- [x] 新增 reflection service，輸入 scoped memory，輸出 `InterviewReflection`，保留 supporting memory IDs。
- [x] 新增 planning service，輸入 current segment、retrieved memories、latest reflection、Issue/PQ context，輸出 `InterviewMicroPlan`。
- [x] 可選新增 `POST /api/ai/interview/reflections` 與 `POST /api/ai/interview/plans`，或先以 server-only service 接入 existing route。
- [x] Reflection output 必須分 confirmed facts / inferred patterns / unknowns。
- [x] Planning 不得跳段、不重問 confirmed fact、不把 inference 當 fact。
- [x] 每次 AI call 寫 `AiUsageLog`；缺 provider/quota/provider error 也記錄。
- [x] API/source proof：supporting memory IDs 存在，reflection 不含 raw private payload。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不做 CRM writeback；不做 voice transport。

完成註記：2026-06-19 已新增 `src/domains/interview/reflection-planning.ts` deterministic pure service，將 scoped persisted memories 轉為 `InterviewReflection`，並依 current segment、retrieved memories、latest reflection 產生 `InterviewMicroPlan`。新增 BFF routes：`POST /api/ai/interview/sessions/[sessionId]/reflections/generate` 與 `POST /api/ai/interview/sessions/[sessionId]/plans`。本輪不新增 provider call，因此無新增 `AiUsageLog` event；既有 AI route usage audit 仍通過。新增 `pnpm interview:reflection-planning-qa` 覆蓋 unauth 401、member generated reflection persisted、confirmed/inference/unknown 分流、supporting memory IDs、no raw private payload fields、plan 優先追問 unknown、不重問 confirmed fact、inference guard 與 manager 404 privacy guard。驗收：`pnpm interview:reflection-planning-qa`、四個 PIM proof、`pnpm ai:usage-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm run lint:changed`、新增檔案 ESLint、`pnpm build` 通過。下一張最低未完成卡為 PIM-008。

---

## Batch PIM-008 - Confirmation card + CRM/writeback boundary

目標：讓兩個 AI 訪談的「已確認/推論/未知」都有可操作出口，且不發生 inference-to-fact leakage。

- [x] `/interview` 顧問陪談結束/段落結束顯示 confirmation card。
- [x] confirmed fact + user checked 才可寫回 CRM candidate；inference 只能保存為 interview insight。
- [x] unknown 轉成 follow-up question/task 或 Theater narrator question。
- [x] 高敏感資料寫回需要 explicit confirmation、reason/riskAccepted 或標記為不可寫回。
- [x] 所有 writeback 建立 audit/interaction event。
- [x] API proof：inference checked 不會變成 CRM fact；confirmed fact checked 才可 writeback。
- [x] Browser proof：desktop/mobile 可勾選、取消、保存、錯誤狀態。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

範圍外：不做完整 CRM 欄位 allowlist 外的自動寫入。

完成註記：2026-06-19 已新增 Park memory writeback boundary pure service、owner-scoped BFF preview/save route 與 `/interview` 段落確認卡。Confirmed fact 只有在 CRM-bound session、使用者勾選且高敏感項具 reason/riskAccepted 時才建立 `InteractionEvent` CRM candidate；inference 勾選只建立 `INTERVIEW_INSIGHT` metadata，unknown 轉 `FOLLOW_UP_TASK`，不寫入 Client 欄位。API proof `pnpm interview:writeback-qa` 驗證 unauth 401、高敏感未核准被 blocked、inference checked 不會變 CRM fact、confirmed checked 才建立 CRM candidate event，並用 DB metadata count 證明 inference CRM fact = 0。Browser proof `pnpm interview:writeback-browser-qa` 覆蓋 desktop 可選客戶、產生確認卡、勾選、未填理由保存被擋、補理由後保存成功，mobile 無水平 overflow。截圖：`docs/06_audits-and-reports/screenshots/pim/pim-008-writeback/pim-008-interview-desktop.png`、`docs/06_audits-and-reports/screenshots/pim/pim-008-writeback/pim-008-interview-mobile.png`。下一張最低未完成卡為 PIM-009。

---

## Batch PIM-009 - Cross-mode QA, docs sync, rollback notes

目標：把文字、語音 shell、顧問陪談、劇場場域建構、persistence、privacy 共同驗收完，並更新文件真相源。

- [ ] 顧問陪談文字模式 multi-turn proof：不重問 confirmed fact，output draft 帶 memory evidence。
- [ ] 劇場場域建構 proof：build packet 分 confirmed/inference/unknown，NPC <= 4。
- [ ] 語音 shell proof：mic consent、permission denied、fallback、correction UI。
- [ ] Persistence proof：清空 browser storage 後 session/memory 可從 DB 恢復。
- [ ] Privacy proof：org manager aggregate API 不回 transcript/memory/client private payload。
- [ ] Rollback note：voice provider disabled、memory persistence disabled、schema rollback 或 migration revert strategy。
- [ ] 更新 `AGENTS.md`、`PLN-018`、必要 report / issue-question。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、必要 Prisma 與 Browser QA。

範圍外：不宣稱 production raw audio recording ready；不宣稱 public RAG ready。

---

## Current Blockers

- Realtime voice 若接 provider，需要可用 OpenAI Realtime model、ephemeral session policy 與 usage/cost evidence。
- Raw audio retention 需要 legal/compliance approval；預設不可保存。
- Prisma schema 改動需要 local/development db push 或 migration proof；production DB mutation 仍需明確 approval。
- Theater Route B 完整 schema migration 仍依 `PLN-015`/ITA-003/ITA-006 管理。
- Supabase pgvector 仍需 operator 確認，PIM 不應把 pgvector 當第一階段依賴。
