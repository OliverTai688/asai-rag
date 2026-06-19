# Agent Loop Report — PIM-003 Theater Build Memory Loop

Date: 2026-06-19

## 本輪戰役名稱

Realtime Voice × Park-style Interview Memory — PIM-003 劇場場域建構 Park memory loop

## 選擇原因

PIM-002 已把顧問陪談接上 request-local Park memory loop；下一個最低未完成且會阻擋兩個 AI 訪談落地的項目，是讓劇場場域建構同樣產生可追溯、可審計、且不把推論冒充為事實的 build packet。此切片先做 source-level contract/proof，不碰 legacy Theater enum/scoring，也不需要 DB 或 Realtime 外部服務。

## 對應 batch / task

- `AGENTS.md` → Batch PIM-003
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md` → Batch PIM-003
- 方法論參照：Park et al. Generative Agents memory stream / reflection / planning，以及 simulation role-play 的 scenario / role / debrief safety 原則。

## 實際完成內容

- 新增 `THEATER_FIELD_BUILD` runtime outline：聚焦客戶、角色關係、異議敏感點、補齊未知與開演門檻。
- 新增 `TheaterBuildPacket` / `TheaterBuildReflection` / `TheaterBuildCharacterSeed` contract。
- 新增 `buildTheaterFieldBuildContext()` pure service：
  - 將場景、角色、關係、異議、敏感資料、未知缺口轉為 `InterviewMemory`。
  - 反思焦點客戶、場景、NPC 必要性、confirmed facts / inferred patterns / unknowns。
  - 資料不足時輸出 `NEEDS_MORE_INFO` 與 narrator questions，不允許開始劇場。
  - READY packet 僅把 confirmed facts 放入 facts；inferred persona 保留推論語氣。
  - Route B compatibility 明確標示 `npcCount <= 4` 與 migration note。
- 新增 `pnpm interview:theater-build-dry-run`，覆蓋 READY / blocked fixture、NPC 上限、unknown narrator questions、inference-to-fact leakage guard。
- 同步 `AGENTS.md`、`PLN-018`、`issue-question.md`。

## 修改檔案

- `package.json`
- `scripts/interview-theater-build-dry-run.mjs`
- `scripts/interview-theater-build-dry-run.ts`
- `src/domains/interview/index.ts`
- `src/domains/interview/outlines/index.ts`
- `src/domains/interview/outlines/theater-field-build.ts`
- `src/domains/interview/theater-build.ts`
- `src/domains/interview/types.ts`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-19_pim-003-theater-build-memory-loop.md`

## DB / Prisma 操作

- DB target 判斷：本輪未讀取或 mutate DB；僅 source-level pure service 與 dry-run。
- Schema 變更摘要：無。
- Prisma generate 結果：未因 schema 修改執行；`pnpm build` 依既有 script 執行 `prisma generate`，成功。
- db push 結果：未執行。
- Seed/backfill 結果：未執行。
- Production migration approval：不需要。

## 驗收指令與結果

- `pnpm interview:theater-build-dry-run`：通過。
- `pnpm interview:park-loop-dry-run`：通過。
- `pnpm interview:memory-dry-run`：通過。
- `pnpm exec tsc --noEmit --pretty false`：通過。
- `pnpm run lint:changed`：通過。
- `pnpm exec eslint src/domains/interview/theater-build.ts src/domains/interview/outlines/theater-field-build.ts scripts/interview-theater-build-dry-run.ts`：通過。
- `pnpm build`：通過。

## 失敗與風險

- 無驗收失敗。
- `lint:changed` 以 repo 既有 diff 基準列出大量歷史變更；因此本輪另外對新增 PIM-003 檔案跑了 targeted ESLint。
- PIM-003 尚未接 API route 或 UI；目前是可被 PIM-004/PIM-007/ITA Route B 後續使用的 domain contract 與 source-level proof。

## 剩餘上線 blocker

- PIM-004：`/interview` 中文語音 UX shell、consent、permission denied fallback、transcript correction placeholder。
- PIM-005：Realtime session BFF 需要 provider env、quota/session guard 與 token policy。
- PIM-006：DB persistence 需要 DB target / schema approval；production mutation 仍需人工 approval。
- Theater Route B full migration 仍需依 `PLN-015` ITA-003/ITA-006 另行推進，不在本輪完成。

## 下一輪建議入口

PIM-004 — `/interview` 中文語音 UX shell。先完成文字/語音 mode toggle、mic consent、live stage、transcript correction UI 與 memory rail fallback，不接 production Realtime provider。
