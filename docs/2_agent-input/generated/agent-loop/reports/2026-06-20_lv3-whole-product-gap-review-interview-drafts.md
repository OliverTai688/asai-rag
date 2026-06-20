# 2026-06-20 LV3 Whole-product Gap Review - Interview Drafts

## Scope

輪次類型：scheduled fifth-loop whole-product calibration.
Automation：`10-agents-batch-task`
Push：`push skipped by user instruction`

本輪依 cadence 重新盤點完整 LV3 沉浸式顧問流程：

`新增客戶 -> 關係圖 -> 拜訪準備包 -> 推論/問題清單 -> 劇場舞台 -> 私聊/群聊/人物狀態更新 -> AI 訪談建立或補強資料/準備包/劇場`

本輪不做 broad source implementation、不呼叫 OpenAI/Anthropic、不做 DB/Prisma write、不碰既有未追蹤 notes/meeting worktree。

## Inventory

| Step | Classification | Evidence |
| --- | --- | --- |
| 新增客戶 | ready | CRM list/detail 與 client create 已有 member-scoped BFF proof，合規欄位保留。 |
| 關係圖 | ready with schema expansion gap | REL-001/002/003/005 已完成 no-schema persistence、typed edge、metadata/source review、desktop/mobile proof；REL-004 edge table 仍需 migration approval。 |
| 拜訪準備包 | ready | BFF-104、previsit redesign、BFF-202 已完成 server-owned list/detail/notes、reasoning evidence、provider-safe AI generation DTO。 |
| 問題清單與推論依據 | ready | Previsit first screen 可見 facts/inferences/unknowns、核心問題、reasoning evidence 與 theater CTA。 |
| 準備包 -> 劇場 | ready | TDF/ITA 已完成 client/visit handoff、高敏感 gate、Route B persisted session、UI/read surface 與 advisor group/private/state patch write shell。 |
| 劇場 AI 角色回覆/五視角回饋 | operator/source gap | Route B director/character/feedback provider orchestration 尚未啟用；需要 provider/cost approval 與 success/error `AiUsageLog` proof。 |
| AI 訪談 -> CRM | ready | PIM-006..009 已有 persisted session/memory/reflection/writeback，confirmed/inference/unknown boundary 與 browser/API proof。 |
| AI 訪談 -> 準備包/劇場 | source gap | Interview writeback 目前建立 CRM candidate、interview insight、follow-up task，尚未直接建立 persisted `VisitPlan` 或 theater build draft。 |
| Navigation/onboarding | source/proof gap | Sidebar 已把 `AI 了解客戶` 指向 `/interview`；RAS role-aware resolver 尚未完成，legacy `/spin` 仍需 feature-flag/source-truth cleanup。 |
| BFF/security/privacy | ready with remaining blockers | AI route audit、dashboard/issues/team/reports/share/visit BFF 已有 proof；remaining blockers 是 SPIN mock outline/local seed、admin/pilot demo seed、notification mock success、CRM related-list/archive/update。 |
| Release proof | environment gap | `issue-question.md` 仍記錄 Next/Turbopack Google Font build blocker；完整 clean-browser LV3 E2E proof 尚未收齊。 |

## Top 10 Gaps

1. **AI 訪談無法直接建立準備包或劇場草稿**
   Type: source gap. Severity 2, leverage 3. PIM writeback 已安全，但出口仍停在 CRM candidate/insight/task，未完成使用者要求的 interview -> preparation/theater creation loop.

2. **Route B AI 角色回覆與五視角回饋未啟用**
   Type: operator/source gap. Severity 3, leverage 3. Stage 與顧問寫入已存在，但 director/character/feedback provider path 需要 approval、成本與 `AiUsageLog` success/error proof.

3. **Legacy SPIN source truth 仍混入 mock/local**
   Type: source/proof gap. Severity 2, leverage 3. `/api/ai/spin` route-level audit pass，但 `/spin/[sessionId]` 仍呼叫 `/api/mock/ai/spin-outline`，`src/domains/spin/store.ts` 仍用 demo seed/local truth.

4. **Role-aware navigation / `/interview` vs `/spin` IA 未收斂**
   Type: source/proof gap. Severity 2, leverage 2. Sidebar 已以 `/interview` 作 `AI 了解客戶` 主入口，但 RAS 未落地；legacy SPIN 應由 feature flag 控制。

5. **CRM related-list/archive/update BFF 未完全收斂**
   Type: source gap. Severity 2, leverage 2. Relationship graph 已強，但 policies/timeline/gap-analysis/archive/update 仍是 BFF-103 remaining work.

6. **REL-004 edge table schema expansion 需要 approval**
   Type: operator/source gap. Severity 1, leverage 2. 目前 deterministic typed edges 足以支撐 LV3 proof；完整 edge model 仍需 migration/rollback approval.

7. **Admin/pilot still demo-seed facing**
   Type: source gap. Severity 2, leverage 1. `AUD-006` 標出 admin/pilot imports demo seed；不應作 production proof.

8. **Notification reminder route is mock success**
   Type: source/operator gap. Severity 2, leverage 1. Real email/notification 需 explicit approval；目前 mock success 不能作正式 proof.

9. **Realtime voice live provider proof is approval-gated**
   Type: operator/environment gap. Severity 2, leverage 2. PIM shell/BFF/event mirror 已完成；live Realtime provider 需 model/env/cost approval.

10. **Production build / clean E2E proof not complete**
    Type: environment/proof gap. Severity 2, leverage 2. Build blocker 與完整 clean-browser LV3 smoke 仍需獨立 loop。

## Candidate Scores

| Candidate slice | Score | Reason |
| --- | ---: | --- |
| `PIM-010 Interview -> VisitPlan / Theater draft writeback` | 23 | 連接 AI 訪談、準備包與劇場三個核心表面；可用 existing confirmation/writeback boundary；no-provider/no-schema 的 API/browser proof 可立即驗收。 |
| `BFF-203a SPIN source-truth hardening` | 21 | 移除 legacy `/spin` mock outline/local seed proof 污染，保護 SPIN 狀態機並補 AI 了解客戶舊入口的 source truth。 |
| `ITA-003f Route B provider orchestration` | 20 | 補齊劇場沉浸感最高，但需要 provider/cost approval 與 success/error `AiUsageLog`，目前不宜作無批准下一輪。 |
| `RAS-001 role-aware navigation contract` | 16 | 可解決 `/interview` 新主入口與 `SPIN 舊版` 常駐導覽的 IA 風險，但比 PIM-010 更偏導航/權限。 |
| `BFF-103c CRM related-list/archive/update` | 15 | 持續收斂 CRM source truth，但不如 PIM-010 直接打通 LV3 creation loop。 |

## Selected Slice

Selected next implementation/proof slice：

`PIM-010 Interview -> VisitPlan / Theater draft writeback`

Acceptance shape:

- 新增或擴充 interview writeback target：`VISIT_PLAN_DRAFT`、`THEATER_BUILD_DRAFT`。
- `VISIT_PLAN_DRAFT` 透過既有 `/api/visits` / visit repository 建立 persisted `VisitPlan` 草稿，保留 fact/inference/unknown/reasoning evidence。
- `THEATER_BUILD_DRAFT` 透過 existing Theater build packet / Route B session boundary 建立 stage draft 或 DB-backed Route B session；unknown 轉 narrator questions，NPC <= 4。
- 高敏感 client 仍需 reason/riskAccepted；inference 不得寫成 confirmed CRM fact。
- Proof：unauth 401、member 201、manager/foreign 404、高敏感缺 approval blocked、response no raw private sentinel、browser desktop/mobile no overflow。
- No-provider proof：不呼叫 OpenAI/Anthropic；`AiUsageLog` count before/after 不變。

Fallback：若 PIM-010 被 writeback boundary 或 route ownership 阻擋，改跑 `BFF-203a SPIN source-truth hardening`。

## Changes

- Updated `loop-state.json` cadence to reset fifth-loop counter and point next slice at PIM-010.
- Updated `issue-question.md` with this review outcome.
- Updated `AGENTS.md` and `PLN-018` with new `PIM-010` extension card.
- Updated `AGENTS.md` and `PLN-019` to clarify BFF-203 route-level pass vs remaining SPIN source-truth gap.
- Fixed `PLN-019` progress board drift by marking `BFF-202` complete.
- Added this report.

## Validation

- PASS `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"`
- PASS `git diff --check`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`

## Evidence

Source/read proof used:

- `AUD-006` marks `/pre-visit`, Route B session/turns, `/interview`, reports/issues/dashboard/team as server-owned or mixed with precise blockers.
- `AUD-005` shows `/api/ai/spin`, `/api/ai/spin-suggestions`, `/api/ai/visit`, `/api/ai/report`, interview routes and `/api/rag` all covered by AI BFF audit.
- `PLN-018` PIM-006..009 show persisted interview memory/reflection/writeback and cross-mode QA are complete.
- `PLN-015` ITA-003a..e shows Route B schema adapter, runtime gate, persisted sessions, session UI and advisor interaction write shell are complete; provider orchestration remains approval-gated.
- `PLN-024` REL-001/002/003/005 shows relationship graph no-schema repair, typed edge convergence and interaction polish are complete.
- Source check confirmed `/spin/[sessionId]` still calls `/api/mock/ai/spin-outline` and `src/domains/spin/store.ts` still initializes from demo seed.

No web research was needed in this review; repo source/docs were sufficient.

## DB/Prisma

- No Prisma schema change.
- No Prisma validate/generate required because this review did not touch schema.
- No `prisma db push`.
- No DB write.
- No provider call; no new `AiUsageLog` row required.

## Git

- Start status included pre-existing modified/untracked notes/meeting and sidebar/previsit files; they were not selected or staged.
- Local commit is created after validation.
- Push: `push skipped by user instruction`.

## Blockers

- Operator/source: Route B director/character/feedback provider orchestration needs explicit provider/cost approval and `AiUsageLog` proof.
- Source/proof: SPIN legacy source truth, RAS role-aware resolver, CRM related-list/archive/update.
- Operator/environment: live Realtime proof, production DB migrations, production build font blocker, real email/notification/payment.

## Next Recommended Loop

Run a normal LV3 implementation/proof loop for:

`PIM-010 Interview -> VisitPlan / Theater draft writeback`

Fallback:

`BFF-203a SPIN source-truth hardening`
