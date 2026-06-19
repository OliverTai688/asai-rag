# 2026-06-20 LV3 Pre-visit BFF Workspace Loop

## Scope

- 本輪類型：LV3 immersive implementation/proof loop。
- Selected slice：`BFF-104a Visit / Pre-visit server-owned workspace`。
- 目標：讓 `/pre-visit` list/detail/create/update/notes 使用 member-scoped BFF 與 DB-backed `VisitPlan`，並保留 `/api/ai/visit` 作 provider-generation route；生成後保存準備包資料走 deterministic `/api/visits/[id]` PATCH。

## Candidate Score

1. `BFF-104a Visit / Pre-visit server-owned workspace` — 15/15。直接連接 relationship/client context -> preparation package -> persisted theater handoff，且可用 API/browser proof 驗證 refresh/new context。
2. `TDF-004a Persisted visit package -> theater build gate` — 13/15。高槓桿且連接 package -> theater，但依賴本輪先有 server-owned visit package。
3. `BFF-103a CRM relationship graph writeback completion` — 12/15。補強 client -> relationship graph，但本輪先解決 pre-visit local truth 才能讓後續 theater source 更穩。

## Changes

- 新增 `GET/POST /api/visits` 與 `GET/PATCH /api/visits/[id]`。
- 擴充 `visit-plan-repository`：create/list/update zod schemas、member-scoped list/create/update、JSON DTO parsing 與 no-ARCHIVED guard。
- `VisitService` 新增 remote fetch/create/update helpers，Zustand visit/client store 作 remote-confirmed UI cache。
- `/pre-visit` list/create/autoCreate 改讀寫 BFF；Quickstart demo branch 保留 local fixture。
- `/pre-visit/[planId]` detail 改以 BFF 載入，AI generated package 成功後 PATCH 保存 objectives/questions/reasoning/objections/materials/status，材料勾選也同步 BFF。
- `/pre-visit/[planId]/notes` 改以 BFF 載入與保存，reload 後可恢復 post-visit notes。
- 新增 `pnpm visit:bff-qa` deterministic API/browser proof。
- 更新 `AGENTS.md`、`PLN-019`、`issue-question.md`、`loop-state.json`。

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `DEMO_QA_BASE_URL=http://localhost:3001 pnpm visit:bff-qa`

## Evidence

- QA created demo proof visit: `cmql9m0wr0001aj61r3ztp5yk`
- API proof covered:
  - unauth `GET /api/visits` -> 401
  - demo `GET /api/clients` -> 200
  - demo `POST /api/visits` -> 201 DRAFT
  - demo `PATCH /api/visits/[id]` -> READY with reasoning evidence + notes
  - demo `GET /api/visits/[id]` reload retains objective proof stamp
  - demo `GET /api/visits/[id]/theater-handoff` -> READY handoff
  - raw private sentinel: no `rawPayload`, `cookie`, `secret`, `authorization`
- Browser proof covered:
  - `/pre-visit/[planId]` renders persisted objective/reasoning/theater action
  - `/pre-visit/[planId]/notes` reload keeps persisted notes
  - desktop/mobile no horizontal overflow
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-previsit-bff/2026-06-20-previsit-bff-detail-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-previsit-bff/2026-06-20-previsit-bff-notes-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-previsit-bff/2026-06-20-previsit-bff-detail-mobile.png`

## DB/Prisma

- Prisma schema/generate/db push：not run；本輪無 schema 變更。
- DB write：`pnpm visit:bff-qa` 對 demo workspace 執行非破壞性新增/更新 `VisitPlan` proof。第一次 QA selector 失敗前已留下另一筆可辨識 demo proof plan；未刪除，因本輪不得做 destructive DB 操作。
- Provider/AiUsageLog：no provider call。本輪 QA 不呼叫 `/api/ai/visit`、OpenAI 或 Anthropic；無 AiUsageLog 寫入需求。

## Git

- Branch：`codex/asai-lv3-automation`
- Commit：pending local commit after final validation.
- Push：`push skipped by user instruction`

## Blockers

- 無本輪阻擋。
- 仍有既有 build blocker：`pnpm build` 卡 Next/Turbopack Google Font path，另輪處理。
- 後續若要 live provider proof，仍需 operator 明確允許外部 provider call 與 usage/cost evidence。

## Next Recommended Loop

`TDF-004a Persisted visit package -> theater build gate`：在 `/theater/build` 補完整 persisted visitPlan selector/review、高敏感 `reason` + `riskAccepted` 控制、stage source summary，並證明 READY 準備包可建 theater draft，高敏感資料未接受風險前會被阻擋。
