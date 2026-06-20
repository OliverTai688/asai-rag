# ASAI LV3 Whole-product Gap Review - BFF Issues / Dashboard Continuity

日期：2026-06-20  
輪次類型：scheduled fifth-loop whole-product gap review  
Automation：`10-agents-batch-task`  
Push：`push skipped by user instruction`

## Scope

本輪依 `loop-state.json` cadence 執行第五輪 whole-product review，而不是一般 implementation/proof loop。Review 目標是重新盤點以下完整 LV3 體驗鏈：

`新增客戶 -> 關係圖 -> 拜訪準備包 -> 問題清單/推論依據 -> 劇場舞台 -> 群聊/私聊/人物狀態更新 -> AI 訪談補強資料`

本輪不做 broad source changes、不呼叫 OpenAI/Anthropic provider、不執行 DB/Prisma write、不做 production mutation。

## Whole-flow Inventory

| Surface | Classification | Evidence |
| --- | --- | --- |
| 新增客戶 | ready with BFF follow-ups | `GET/POST /api/clients` 與 CRM list/detail 有 proof；BFF-103 仍需 archive/update、policy/timeline/gap related-list 與 local store cleanup。 |
| 關係圖 | ready with source follow-ups | `pnpm client:relationship-graph-qa` 與 `pnpm client:relationship-graph-write-qa` 已證明來源審查與 family write path；仍缺 taxonomy/root persistence 完整收斂。 |
| 拜訪準備包 | ready | `pnpm visit:bff-qa` 證明 `/pre-visit` list/detail/notes/create/update、reasoning evidence 與 theater CTA server-owned。 |
| 問題清單/推論依據 | ready inside previsit; gap in cross-surface issue system | 準備包頁已顯示核心問題與依據；但 `/issues` 仍為 static `MOCK_ISSUES`，尚未有 member-scoped issue readiness / fact-inference-unknown BFF。 |
| 報告與分享 | ready | `pnpm bff:reports-qa` 證明 `/api/reports` list/create/detail/update/share、public share client-safe sections、ShareEvent audit。 |
| 準備包 -> 劇場 | ready | `pnpm visit:theater-bff-qa`、`pnpm visit:theater-gate-qa`、`pnpm theater:client-build-qa`、Route B session UI/interaction proof 已完成。 |
| 劇場群聊/私聊/狀態更新 | ready for deterministic advisor turns; provider gap remains | `pnpm theater:route-b-interaction-qa` 證明 group/private advisor turns 與 state patch proposal persistence；director/character/feedback provider orchestration 仍 disabled。 |
| AI 訪談補強資料 | ready for CRM writeback; expansion gap remains | PIM-001..009 與 `pnpm interview:cross-mode-qa` 已完成 memory/reflection/writeback；尚未直接建立 persisted VisitPlan/TheaterBuild drafts。 |
| Navigation/onboarding | ready for AI-first member shell; role-aware gap remains | AIS 已完成；RAS-001..005 尚未落地，跨 role sidebar / route guard projection 未 proof。 |
| BFF/security/privacy | mixed | Reports/visits/relationships/theater handoff are strong; `/issues`、dashboard、team、admin/pilot seed、notification mock route 仍是 source blockers。 |
| Release proof | operator/environment gap | `pnpm build` 仍有 Next/Turbopack Google Font blocker；provider/live/billing/email production proof 需 explicit approval。 |

## Top 10 Gaps

1. **`/issues` remains static `MOCK_ISSUES`**  
   Type: source gap. Severity 2, leverage 3. Owner: BFF-106. Evidence: `src/app/(dashboard)/issues/page.tsx` still declares `MOCK_ISSUES`; no `/api/issues`. Next slice: member-scoped Issues BFF with fact/inference/unknown/IRL/next-action DTO and browser proof.

2. **Dashboard decision center is still client-side aggregate/local truth**  
   Type: source/proof gap. Severity 2, leverage 3. Owner: BFF-101. Evidence: `/dashboard` calls `clientService.getDashboardStats()`, `eventService.getLatestEvents()` and `useSessionStore`. Next slice: `GET /api/member/dashboard` after or alongside Issues BFF.

3. **Route B provider orchestration and feedback remain guarded-disabled**  
   Type: operator/environment gap. Severity 3, leverage 3. Owner: ITA-003f / ITA-004 / BFF-204. Evidence: Route B deterministic session/turn proof is complete, but director/character/feedback provider success/error `AiUsageLog` proof requires explicit provider/cost approval. Next slice only after approval.

4. **Team page still uses `MOCK_TEAM_MEMBERS`**  
   Type: source/privacy gap. Severity 2, leverage 2. Owner: BFF-301. Evidence: `src/app/(dashboard)/team/team-page-client.tsx` still aggregates local member fixtures. Next slice: org aggregate repository extraction and manager/member/browser proof.

5. **Interview cannot directly create persisted VisitPlan/TheaterBuild drafts**  
   Type: source gap. Severity 2, leverage 3. Owner: PIM follow-up / BFF visit-theater bridge. Evidence: PIM writeback creates CRM candidate/insight/follow-up, but no persisted `VisitPlanDraft` or `TheaterBuildDraft` route exists. Next slice: interview writeback target for preparation package/theater draft, with confirmation cards.

6. **SPIN legacy session remains local/Zustand with mock outline fallback**  
   Type: source gap. Severity 2, leverage 2. Owner: BFF-203. Evidence: `/spin/[sessionId]` still calls `/api/mock/ai/spin-outline`; AI usage route audit passes, but production proof still should not rely on mock outline or local seed truth.

7. **Role-aware navigation projection is still not implemented**  
   Type: source/proof gap. Severity 2, leverage 2. Owner: RAS-001..005. Evidence: AI-first sidebar exists, but resolver/bootstrap/route guard alignment across member/org/client/platform has no proof. Next slice: RAS-001 contract/resolver foundation.

8. **CRM related-list BFF remains incomplete**  
   Type: source gap. Severity 2, leverage 2. Owner: BFF-103. Evidence: policy/timeline/gap-analysis related-list and client archive/update still pending. Next slice: CRM related-list / archive/update BFF continuation.

9. **Admin/pilot demo seed and notification mock route remain production-adjacent blockers**  
   Type: source/product gap. Severity 2, leverage 1. Owner: BFF-304 / pilot posture / notification BFF. Evidence: admin/pilot import `seed-fixtures`; `POST /api/notifications/visit-reminder` is mock success. Next slice: mark demo-only or replace with guarded disabled/provider-job BFF.

10. **Production build blocker remains unresolved**  
    Type: operator/environment gap. Severity 2, leverage 2. Owner: launch readiness / build hardening. Evidence: prior reports record Next/Turbopack Google Font path blocker. Next slice: self-host font or Next 16 font build strategy proof.

## Candidate Scores

| Candidate slice | Score | Rationale |
| --- | ---: | --- |
| `BFF-106 Issues BFF` | 21 | Removes a visible static mock, creates server-owned issue readiness / fact-inference-unknown DTO, supports dashboard/previsit/org coaching follow-ups, and needs no provider approval. |
| `BFF-101 Member dashboard BFF` | 19 | Improves first-screen onboarding and single decision-center DTO, but is stronger after `/issues` has a real server source for task/readiness signals. |
| `PIM/BFF interview -> VisitPlanDraft / TheaterBuildDraft` | 18 | Directly connects AI interview to preparation package/theater creation, but needs a more careful writeback/draft product boundary than BFF-106. |

Blocked high-severity slice: `ITA-003f / ITA-004 Route B provider + five-view feedback` remains severity 3 / leverage 3, but requires explicit provider/cost approval and success/error `AiUsageLog` proof before implementation.

## Selected Next Slice

Selected next implementation slice：`BFF-106 Issues BFF`

Acceptance shape:

- Add member-scoped `GET /api/issues` and a status/action endpoint such as `PATCH /api/issues/[id]`.
- DTO separates `fact`、`inference`、`unknown`、`sourceReferences`、internal IRL/readiness and advisor `nextAction`.
- `/issues` becomes BFF/cache-first; Zustand or local state may only hold selected issue/filter UI.
- Client-facing reports/share must not expose internal IRL score.
- API/browser proof covers unauth 401、member success、foreign/manager forbidden or 404、empty state、status/action write audit、refresh/new context、desktop/mobile no overflow、no raw private sentinel、no mock/local truth.

Fallback：若 BFF-106 unexpectedly depends on missing schema/product decision, choose `BFF-101 Member dashboard BFF` with an issues-ready placeholder that is explicitly server-owned and not mock success.

## Changes

- Updated `loop-state.json`:
  - `normalLoopsSinceLastWholeProductReview = 0`
  - `lastWholeProductReviewReport` points to this report
  - `nextRecommendedImplementationSlice` changed to `BFF-106 Issues BFF`
- Updated `AGENTS.md` BFF-106 with fifth-loop review note and acceptance boundary.
- Updated `PLN-019` BFF-106 with next-slice acceptance details.
- Updated `issue-question.md` with the resolved review cadence and next-slice decision.
- Added this review report.

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `git diff --check`

## Evidence

Repo source/read proof used in this review:

- `src/app/(dashboard)/issues/page.tsx` uses `MOCK_ISSUES`.
- `src/app/(dashboard)/dashboard/page.tsx` calls local `clientService.getDashboardStats()`, `eventService.getLatestEvents()` and `useSessionStore`.
- `src/app/(dashboard)/team/team-page-client.tsx` uses `MOCK_TEAM_MEMBERS`.
- `src/app/(dashboard)/spin/[sessionId]/page.tsx` calls `/api/mock/ai/spin-outline`.
- `src/app/(dashboard)/reports/*` and CRM reports subpage now fetch `/api/reports`, matching BFF-105 proof.
- `scripts/theater-route-b-interaction-qa.mjs` and `/api/theater/route-b/sessions/[sessionId]/turns` prove deterministic Route B interaction writes exist.
- `AUD-005` shows AI usage route audit currently passes for chat/interview/theater/SPIN/visit/report and guarded-disabled RAG; remaining SPIN issue is local/mock source, not missing usage logging.

No web research was needed; current repo source, docs, audits and prior reports were sufficient.

## DB / Prisma

- No Prisma schema change.
- No `prisma generate`.
- No `prisma db push`.
- No provider call; no `AiUsageLog` row required.
- No production write, email, notification, payment/refund, remote delete or destructive operation.

## Git

- Local commit required after validation.
- Push: `push skipped by user instruction`.

## Blockers

- Source blockers: `/issues` static mock, dashboard local aggregate, `/team` mock aggregate, SPIN mock outline/local seed, CRM remaining related-list BFF, admin/pilot demo seed, notification mock success.
- Operator/environment blockers: Route B provider/live Realtime provider proof, production migration approval, production build font blocker, production billing/email/notification approvals.
- Product decision blockers: client-facing visibility of issue readiness, interview-to-draft confirmation boundary, role-aware legacy SPIN exposure, beta scope/legal packet.

## Next Recommended Loop

Run a normal LV3 implementation/proof loop for:

`BFF-106 Issues BFF`
