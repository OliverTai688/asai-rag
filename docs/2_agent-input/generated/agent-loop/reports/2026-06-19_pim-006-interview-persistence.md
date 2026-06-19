# 2026-06-19 PIM-006 Interview Persistence Report

## 本輪戰役

- Workstream: Realtime Voice x Park-style Interview Memory
- Batch / task: PIM-006 - Prisma persistence for turns/memory/reflection
- 選擇原因: PIM-005 已完成 Realtime session BFF 與 event mirror；下一個上線阻擋是 memory stream 仍未 DB 化，導致清空 browser storage 或重新登入後無法延續訪談。

## 方法論研究

- Prisma official db push docs: `prisma db push` 可將 Prisma schema 直接同步到 DB；Prisma v7 不再自動 generate，因此本輪先跑 `prisma:generate` 再做 additive db push。
- Prisma prototyping workflow: `db push` 適合 prototype / development target；production migration 仍需另走 migration approval。
- Prisma referential actions docs: relation onDelete/onUpdate 需明確設計；本輪 session/turn/memory/reflection 使用 org cascade、client/unit set-null、session cascade，避免 orphan data 與 cross-org leakage。
- Next.js bundled Route Handler docs: 新增 API route 依 `route.ts` handler pattern，dynamic params 使用 repo 現有 `params: Promise<...>` style。

## 完成內容

- Prisma schema 新增:
  - `InterviewSession`
  - `InterviewTurn`
  - `InterviewMemory`
  - `InterviewReflection`
  - `InterviewKind` / `InterviewSessionStatus` / `InterviewTurnRole` / `InterviewModality` / memory/reflection related enums
- 新增 owner-scoped repository / DTO:
  - `src/lib/interview/interview-persistence-repository.ts`
- 新增 BFF routes:
  - `POST /api/ai/interview/sessions`
  - `GET /api/ai/interview/sessions/[sessionId]`
  - `POST /api/ai/interview/sessions/[sessionId]/turns`
  - `POST /api/ai/interview/sessions/[sessionId]/reflections`
- 新增 QA script:
  - `pnpm interview:persistence-qa`
- 文件同步:
  - `AGENTS.md`
  - `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
  - `docs/2_agent-input/generated/agent-loop/issue-question.md`

## DB / Prisma

- DB target 判斷: 目前 `.env` 指向 Supabase Postgres development target（host: `db.wwocdcicvpmbdmqvskzi.supabase.co`, db: `postgres`）；未輸出任何 secret。
- Schema 變更摘要: 新增訪談 session/turn/memory/reflection 四張表與相關 enum / relation / index；全部 records 都含 `organizationId`，session/turn/memory/reflection 支援 `unitId` / `clientId`。
- Prisma generate: `pnpm prisma:generate` 通過。
- Prisma db push: `pnpm exec prisma db push` 通過，無 data-loss prompt，未使用 `--accept-data-loss` 或 `--force-reset`。
- Seed/backfill: 不需要 backfill；新表 additive，QA 僅新增 demo member 測試資料，不清除真實資料。
- Production migration approval: 仍需要；本輪未做 production DB mutation。

## 驗收指令與結果

- `pnpm prisma:validate`: pass
- `pnpm prisma:generate`: pass
- `pnpm exec prisma db push`: pass
- `pnpm interview:persistence-qa`: pass
  - unauth create 401
  - member create session 201
  - append turn 201
  - Park-style memory candidate created
  - reflection linked to same-session supportingMemoryIds
  - stateless GET snapshot returns turns/memories/reflections
  - manager GET private member snapshot returns 404
  - no raw audio payload in proof
- `pnpm interview:memory-dry-run`: pass
- `pnpm interview:park-loop-dry-run`: pass
- `pnpm interview:theater-build-dry-run`: pass
- `pnpm interview:realtime-bff-qa`: pass
- `pnpm ai:usage-audit`: pass
- `pnpm exec tsc --noEmit --pretty false`: pass
- `pnpm run lint:changed`: pass
- `pnpm build`: pass

## 風險與剩餘 blocker

- Production schema migration 尚未核准；本輪只同步目前 `.env` development target。
- PIM-007 尚未把 reflection/planning 拆成可重用 application service；目前 persistence 已能存 reflection，但生成/規劃仍需下一輪接入。
- PIM-008 confirmation card / CRM writeback boundary 尚未完成；confirmed fact 仍未進入人工核准寫回流程。
- Live OpenAI Realtime provider proof 尚未執行；PIM-005/PIM-006 目前 proof 使用 dry-run / BFF / DB persistence。

## 下一輪建議入口

- PIM-007 - Reflection + planning service/routes:
  - 將 DB-backed memories retrieval 接入 reflection/planning service。
  - 確保 planning 不跳段、不重問 confirmed fact、不把 inference 當 fact。
  - 若新增 provider call，維持 `AiUsageLog` success/error evidence。
