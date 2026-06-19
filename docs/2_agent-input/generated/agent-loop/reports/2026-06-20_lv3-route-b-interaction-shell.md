# 2026-06-20 LV3 Route B Interaction Shell

## Scope

本輪為一般 LV3 implementation/proof loop，承接第五輪 whole-product review 後的最高槓桿切片：讓已 persisted 的 Route B 劇場從 read-only guarded stage 進一步成為可操作的群聊/私聊/人物狀態 proposal 舞台。未啟用 provider，不宣稱 AI 角色已可正式回覆。

## Candidate Score

1. `ITA-003e Route B persisted interaction write shell` — 22/20：連接 previsit/theater stage/interaction 三個核心表面；新增 DB-backed owner-scoped source/proof；直接補足群聊、私聊、人物狀態更新；可用 API/browser/DB/AiUsageLog proof 驗收；無需 provider。
2. `BFF-001 full-site data-source inventory` — 17/20：降低 mock/local truth 風險，安全可推進，但對沉浸式劇場體驗增益較間接。
3. `ITA-003f provider orchestration + AiUsageLog proof` — 16/20：最接近真 AI 劇場，但需要 provider/cost/error-path proof，風險高於先完成 persisted interaction shell。

## Selected Slice

選擇 `ITA-003e Route B persisted interaction write shell`。

## Changes

- 新增 `POST /api/theater/route-b/sessions/[sessionId]/turns`。
- 新增 `appendRouteBAdvisorTurnForMember()`：owner 可 append 顧問 `AGENT` turn，支援 `GROUP` / `PRIVATE` visibility、私聊 addressee、state patch proposal。
- state patch proposal 同步持久化到 turn `statePatches` 與 session `sceneState.statePatches`，固定 `requiresConfirmation=true`、`writesConfirmedCrmFact=false`。
- `/theater/[sessionId]` Route B stage 新增顧問互動 composer；私聊 lane 會顯示指定角色私聊 turn；provider guard 仍 disabled。
- 新增 `pnpm theater:route-b-interaction-qa`，覆蓋 API/browser/DB/AiUsageLog proof。

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `DEMO_QA_BASE_URL=http://localhost:3025 pnpm theater:route-b-interaction-qa`
- PASS in-app Browser background DOM check：Route B stage / composer / group-private turns / provider guard visible，console error 0。

## Evidence

- QA session evidence：`route_b_session_b0a765f083da412c979fe6a9a8548a55`
- Final targeted QA proof highlights:
  - unauth turn write 401
  - member group/private turn write 201
  - invalid private without addressee 400
  - manager write to member-owned session 404
  - DB proof groupAdvisorTurns=2, privateAdvisorTurns=1, advisorStatePatchTurns=2, confirmedCrmFactWrites=0
  - `AiUsageLog` THEATER count before=10 after=10
- Screenshot: `docs/06_audits-and-reports/screenshots/modern-ui/route-b-interaction-stage/route-b-interaction-stage-desktop.png`

## DB/Prisma

- Prisma schema: no change.
- Prisma generate / validate / db push: not run; not needed.
- DB operations: non-destructive demo/test inserts only via local dev QA (`TheaterSession`, `TheaterCharacter`, `TheaterTurn` state proposal evidence). No delete, reset, raw secret, raw provider payload, payment, email, or production write.
- Provider: no OpenAI/Anthropic call; explicit no-provider proof, `AiUsageLog` unchanged.

## Git

- Branch: `codex/asai-lv3-automation`
- Push: `push skipped by user instruction`

## Blockers

- Provider/cost approval and real provider runtime proof still required before enabling Route B director/character/feedback calls.
- Production Route B migration / rollback approval remains separate.
- `pnpm build` remains blocked by existing Next/Turbopack Google Font path issue.

## Next Recommended Loop

`ITA-003f Route B provider orchestration + AiUsageLog success/error proof`：behind explicit provider flag, connect advisor turns to director/character response orchestration; prove success and provider-error paths both write `AiUsageLog`, preserve visibility, and store no raw provider payload. If provider approval is not available, fallback to `BFF-001` full-site data-source inventory.
