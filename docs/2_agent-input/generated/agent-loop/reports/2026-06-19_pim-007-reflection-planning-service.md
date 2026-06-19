# 2026-06-19 PIM-007 Reflection + Planning Service Report

## 本輪戰役

- Workstream: Realtime Voice x Park-style Interview Memory
- Batch / task: PIM-007 - Reflection + planning service/routes
- 選擇原因: PIM-006 已完成 persisted memory stream；下一個上線阻擋是 reflection/planning 仍混在 prompt 內隱邏輯，缺少可測、可審計、可重用的 service 與 BFF proof。

## 方法論研究

- Park et al. `Generative Agents` paper: memory stream 應保存 experience，reflection 將記憶合成高階結論，planning 將反思與當下狀態轉為下一步行動；本輪將三者明確拆成 service contract。
- OpenAI Structured Outputs official docs: 若後續改用 provider 生成 reflection/planning，應使用 JSON schema/structured output 保證 `confirmedFacts`、`inferredPatterns`、`unknowns` 等欄位穩定；本輪先使用 deterministic service，不新增 provider call。
- Prisma CRUD / createMany docs: 延續 PIM-006 的 DB-backed memory stream 與 same-session supportingMemoryIds 驗證；本輪不改 schema、不需 db push。
- Next.js bundled Route Handler docs: 新增 nested BFF route，以 `route.ts` + native `Request`/`Response` pattern 實作。

## 完成內容

- 新增 pure service:
  - `src/domains/interview/reflection-planning.ts`
  - 支援 `ADVISOR_COMPANION` 與 `THEATER_FIELD_BUILD` outline。
  - `buildInterviewReflection()` 將 scoped memories 分成 confirmed facts / inferred patterns / unknowns，保留 supporting memory IDs。
  - `buildInterviewPlanningResult()` 依 current segment、retrieved memories、latest reflection 產生 `InterviewMicroPlan`。
- 新增 application/repository wrapper:
  - `src/lib/interview/interview-reflection-planning-repository.ts`
  - 將 persisted DTO 轉為 domain memory/reflection。
  - owner-scoped 讀取 snapshot，不讓 org manager 讀 private transcript/memory text。
- 新增 BFF routes:
  - `POST /api/ai/interview/sessions/[sessionId]/reflections/generate`
  - `POST /api/ai/interview/sessions/[sessionId]/plans`
- 新增 QA script:
  - `pnpm interview:reflection-planning-qa`
- 文件同步:
  - `AGENTS.md`
  - `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
  - `docs/2_agent-input/generated/agent-loop/issue-question.md`

## DB / Prisma

- 是否修改 schema: 否
- Prisma generate: `pnpm build` 內執行並通過
- db push: 未執行
- DB target: 目前 `.env` Supabase Postgres development target；未輸出任何 secret
- Seed/backfill: 不需要；QA 只新增 demo member 的 interview session/turn/reflection proof data
- Production migration approval: 本輪無 schema 變更；PIM-006 production migration approval 仍未消除

## 驗收指令與結果

- `pnpm interview:reflection-planning-qa`: pass
  - unauth planning 401
  - member 建立 session / append turns
  - generated reflection persisted
  - reflection 分離 confirmed facts / inferences / unknowns
  - reflection 保留 supporting memory IDs
  - reflection response 不含 raw private payload fields
  - plan 優先追問 unknown
  - plan 不重問 confirmed fact
  - plan 包含 inference-to-fact guard
  - manager 無法用 member private memory 生成 plan
- `pnpm interview:memory-dry-run`: pass
- `pnpm interview:park-loop-dry-run`: pass
- `pnpm interview:theater-build-dry-run`: pass
- `pnpm interview:persistence-qa`: pass
- `pnpm interview:realtime-bff-qa`: pass
- `pnpm ai:usage-audit`: pass
- `pnpm exec tsc --noEmit --pretty false`: pass
- `pnpm run lint:changed`: pass
- 新增檔案 explicit ESLint: pass
- `pnpm build`: pass

## 風險與剩餘 blocker

- 本輪不新增 provider call，因此沒有新增 `AiUsageLog` event；若下一輪改用 provider reflection/planning，必須補 success/error usage evidence。
- PIM-008 confirmation card / CRM writeback boundary 尚未完成；confirmed fact 仍未進入人工核准寫回流程。
- Live OpenAI Realtime provider proof 尚未執行；需要 operator approval 與 usage/cost evidence。
- Production migration approval 仍是 PIM-006 之後的 production 上線缺口。

## 下一輪建議入口

- PIM-008 - Confirmation card + CRM/writeback boundary:
  - `/interview` 段落/結束顯示 confirmation card。
  - confirmed fact + user checked 才可寫回 CRM candidate。
  - inference 僅保留 interview insight；unknown 轉 follow-up task / Theater narrator question。
  - 高敏感資料需 explicit confirmation / reason / riskAccepted。
