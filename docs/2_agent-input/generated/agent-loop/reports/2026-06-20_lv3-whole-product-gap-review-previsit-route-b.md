# ASAI LV3 Whole-product Gap Review - Previsit / Route B Continuity

日期：2026-06-20  
輪次類型：scheduled fifth-loop whole-product gap review  
Automation：`10-agents-batch-task`  
Push：`push skipped by user instruction`

## Scope

本輪依 `loop-state.json` cadence 執行第五輪 whole-product review，而不是一般 implementation/proof loop。Review 目標是重新盤點以下完整 LV3 體驗鏈：

`新增客戶 -> 關係圖 -> 拜訪準備包 -> 問題清單/推論依據 -> 劇場舞台 -> 群聊/私聊/人物狀態更新 -> AI 訪談補強資料`

本輪不實作 broad source changes、不呼叫 OpenAI/Anthropic provider、不執行 DB/Prisma write。

## Whole-flow Inventory

| Surface | Classification | Evidence |
| --- | --- | --- |
| 新增客戶 | ready with BFF gaps | Client CRUD / compliance fields 已有 DB-backed proof；仍缺 client archive/update、related-list BFF 完整收斂。 |
| 關係圖 | ready with source gaps | `BFF-103a/b` 已完成 source review DTO 與 family remote write；仍缺主客戶 `parentMemberId` persistence、policy/timeline/report/gap-analysis related-list BFF 與 business/beneficiary taxonomy。 |
| 拜訪準備包 | ready | `BFF-104a` 與最新 previsit redesign 已讓 `/pre-visit/[planId]` 可見專案情境、核心問題、決策地圖、推論依據與 theater CTA；`pnpm visit:bff-qa` proof 通過。 |
| 準備包 -> 劇場 | ready with interaction gap | TDF-004/TDF-005、Route B handoff、schema adapter、persisted session、session UI proof 已完成；session stage 目前仍 read-only / provider guarded-disabled。 |
| 劇場群聊/私聊 | source/proof gap | `/theater/[sessionId]` 顯示 group/private lanes，但沒有 Route B persisted advisor turn append、角色 response turn、state patch write shell。 |
| 人物狀態/關係變化 | source gap | Route B state patches 已在 handoff/session DTO 可見，但尚未有顧問可提出/套用狀態更新的 persisted action；仍需證明不寫 confirmed CRM fact。 |
| AI 訪談補強 | ready with expansion gap | PIM-001..009 已完成 memory/reflection/writeback/cross-mode QA；目前 writeback 出口是 CRM candidate/insight/follow-up，尚未直接建立 `VisitPlanDraft` 或 `TheaterBuildDraft`。 |
| Navigation/onboarding | source/proof gap | AI-first sidebar 已完成；role-aware navigation RAS-001..005 尚未落地，manager/org/client/super admin projection 仍未 proof。 |
| BFF/security | source/proof gap | Visit/client/relationship/theater sessions 有 strong proof；`/reports` 仍 `useReportStore`，`/issues` 仍 `MOCK_ISSUES`，full-site BFF inventory BFF-001 未完成。 |
| Release proof | operator/environment gap | `pnpm build` 仍有 Next/Turbopack Google Font path blocker；尚缺 clean-browser LV3 end-to-end smoke。 |

## Top 10 Gaps

1. **Route B persisted interaction write shell missing**  
   Type: source/proof gap. Severity 2, leverage 3. Session UI 可讀多角色舞台，但還不能 append group/private advisor turns 或保存 interaction state，因此沉浸式 theater flow 尚未可操作。

2. **Route B provider success/error `AiUsageLog` proof missing**  
   Type: source/operator gap. Severity 3, leverage 3. Director/character/feedback provider path 必須在啟用前證明 success/error 都寫 usage，且不保存 raw provider payload。

3. **Route B state patch / relationship-change interaction missing**  
   Type: source gap. Severity 2, leverage 3. Handoff 與 session DTO 已有 statePatches，但 UI/API 尚不能讓顧問新增或確認人物狀態與關係張力變化。

4. **Interview cannot create persisted VisitPlan/TheaterBuild drafts directly**  
   Type: source gap. Severity 2, leverage 3. PIM writeback 已可建立 CRM candidate/insight/follow-up，但尚未把 AI 訪談變成「建立或補強準備包/劇場」的直接入口。

5. **Full-site BFF inventory missing**  
   Type: proof gap. Severity 2, leverage 3. 沒有完整 responsibility matrix，後續 proof 容易混入 DB-backed、Zustand local、static mock 與 demo seed。

6. **Reports / share action still local-store oriented**  
   Type: source gap. Severity 2, leverage 2. `/reports` 與 `/reports/[reportId]` 仍讀 `useReportStore`，share action 還未 server-owned。

7. **Issues page still static mock**  
   Type: source gap. Severity 2, leverage 2. `/issues` 使用 `MOCK_ISSUES`，尚未 member-scoped BFF，也未區分 issue fact / inference / unknown。

8. **Role-aware sidebar unresolved**  
   Type: source/proof gap. Severity 2, leverage 2. AI-first sidebar 可用，但 member/org/admin/client/platform surfaces 仍缺 server-side resolver 與 cross-role guard proof。

9. **Build blocker still prevents release-grade proof**  
   Type: operator/environment gap. Severity 2, leverage 2. `pnpm build` 仍卡 Next/Turbopack Google Font path，阻斷 release candidate evidence pack。

10. **Relationship graph taxonomy and root persistence incomplete**  
   Type: product/source gap. Severity 1, leverage 2. 關係圖 metadata 已可用，但 business role / beneficiary / family taxonomy 與主客戶 parent persistence 仍待整理。

## Candidate Scores

| Candidate slice | Score | Rationale |
| --- | ---: | --- |
| `ITA-003e Route B persisted interaction write shell` | 20 | 直接補上 theater core workflow 的群聊/私聊/狀態更新入口；可保持 no-provider proof，連接 previsit package -> persisted stage -> interaction。 |
| `BFF-001 Full-site data-source inventory and responsibility matrix` | 18 | 高安全、低風險，會揭露 reports/issues/admin/local-store 真相源缺口並避免後續 proof 污染。 |
| `PIM/BFF interview -> VisitPlanDraft / TheaterBuildDraft` | 17 | 強化 AI 訪談建立準備包/劇場的核心目標，但應在 Route B session 最小可互動後接上更順。 |

## Selected Next Slice

Selected next implementation slice：`ITA-003e Route B persisted interaction write shell`

Acceptance shape:

- 新增 owner-scoped Route B session interaction endpoint，例如 `POST /api/theater/route-b/sessions/[sessionId]/turns` 或等價 route。
- 先只允許 advisor/system deterministic turn append、lane selection 與 state patch proposal persistence；不呼叫 provider。
- Group turn 可被全角色看到；private turn 只對 speaker/addressee/director 可見。
- State patch proposal 必須 `requiresConfirmation=true`，且 `writesConfirmedCrmFact=false`。
- Proof 覆蓋 member 201、manager/foreign 404、invalid visibility 400、private visibility 不外洩、response no raw private sentinel、`AiUsageLog` THEATER count before/after 不變。
- UI 可先最小化：Route B stage 的 group/private lane 可以送出顧問訊息或狀態筆記，provider action 仍顯示 guarded-disabled。

Fallback：若 interaction write shell 被 provider/env/session 條件阻擋，改跑 `BFF-001 Full-site data-source inventory and responsibility matrix`。

## Changes

- Updated `loop-state.json`:
  - `normalLoopsSinceLastWholeProductReview = 0`
  - `lastWholeProductReviewReport` 指向本 report
  - `nextRecommendedImplementationSlice` 改為 `ITA-003e Route B persisted interaction write shell`
- Updated `AGENTS.md` ITA / BFF notes with the new next-slice and fallback.
- Updated `PLN-015` ITA-003 notes with `ITA-003e` acceptance shape.
- Updated `PLN-019` BFF-001 fallback note after previsit redesign.
- Added this report.

## Validation

- PASS `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"`
- PASS `git diff --check`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`

## Evidence

Source/read proof used in this review:

- `src/app/(dashboard)/theater/[sessionId]/page.tsx` renders Route B stage, group/private labels, visibility proof, and provider guarded-disabled action.
- `src/app/api/theater/route-b/sessions/[sessionId]/route.ts` currently supports read only.
- `src/lib/theater/route-b-session-bff-repository.ts` maps persisted session/turn/visibility data but has no append endpoint.
- `src/app/api/theater/route-b/runtime/route.ts` returns guarded-disabled for provider intents when provider flag is off.
- `/reports` pages import `useReportStore`; there is no `src/app/api/reports`.
- `/issues` uses `MOCK_ISSUES`; there is no `src/app/api/issues`.
- `/interview` writeback route exists, but no `VisitPlanDraft` / `TheaterBuildDraft` persisted writeback target exists.

No web research was needed in this review; current repo docs/source and previous reports were sufficient.

## DB/Prisma

- No Prisma schema change.
- No `prisma generate`.
- No `prisma db push`.
- No destructive DB command.
- No provider call; no `AiUsageLog` row required.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 19]`.
- Local commit is created after validation.
- Push: `push skipped by user instruction`.

## Blockers

- Source gap: Route B interaction write shell, provider success/error usage proof, state patch UI/API.
- Source/proof gap: full-site BFF inventory, reports BFF, issues BFF, role-aware sidebar.
- Operator/environment gap: live provider proof, production migration approval, `pnpm build` font blocker.
- Product decision: future legal/compliance beta packet, role taxonomy, production provider/payment/email rollout boundaries.

## Next Recommended Loop

Run a normal LV3 implementation/proof loop for:

`ITA-003e Route B persisted interaction write shell`

If blocked, run:

`BFF-001 Full-site data-source inventory and responsibility matrix`
