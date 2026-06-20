# 2026-06-20 LV3 Whole-product Gap Review - Stage Map / RAS

## Scope

Scheduled fifth-loop whole-product review. This loop did not make runtime source changes; it recalibrated the ASAI LV3 flow after RAS-001 and the BFF-103d DB blocker.

Review target:

`新增客戶 -> 關係圖 -> 拜訪準備包 -> 問題清單/推論依據 -> 劇場舞台 -> 群/私聊/人物狀態 -> AI 訪談補強資料/準備包/劇場`

No new web research was performed in this loop. The review used repo docs and prior research reports, including `RES-026` for theater stage design.

## Target-flow Inventory

| Step | Classification | Evidence |
| --- | --- | --- |
| Client creation / lifecycle | ready with proof | BFF-103c update/archive proof preserves compliance fields and owner scope. |
| Relationship graph | ready with schema caveat | REL-001/002/003/005 fixed no-schema graph build/write/layout; REL-004 edge table remains schema gap. |
| Related-list inputs for prep | proof gap / operator-env gap | BFF-103d source exists, but full API/browser/AiUsageLog-unchanged proof is blocked by Supabase DNS/DB. |
| Visit preparation package | ready | BFF-104 and previsit redesign proof show persisted package, reasoning evidence, theater handoff CTA. |
| AI visit/report generation | ready with provider proof | BFF-202 proves session/quota/success-error `AiUsageLog` and provider-safe snapshot. |
| Previsit -> theater handoff | ready | TDF / ITA route B persisted session proof exists, high-sensitive gate exists. |
| Theater stage interaction | source gap | Advisor group/private turn and state proposal writes exist, but no relationship-graph-centered stage map and no AI role response loop. |
| AI interview -> workspace creation | ready with no-provider proof | PIM-010 creates persisted VisitPlan draft and Route B theater draft with confirmation gates. |
| Role-aware navigation | source gap | RAS-001 contract done; resolver/bootstrap/renderer/guard alignment still pending. |
| Release / build / external env | operator-env gap | DB DNS currently blocks BFF proof; production build font blocker remains tracked. |

## Top 10 Gaps

1. **Theater stage is not yet a relationship-graph-centered演練舞台**
   Severity 2 / Leverage 3 / Type: source gap.
   Evidence: ITA-003e gives advisor turns, private/group lanes, state proposals; `RES-026` notes stage UI still lacks graph map, focused role selection, speaking highlights, and director/character runtime.
   Next slice: `ITA-003f/S1 Route B relationship-graph stage map (no-provider)`.

2. **BFF-103d related-list proof blocked by Supabase DNS/DB**
   Severity 2 / Leverage 3 / Type: operator/environment gap.
   Evidence: implementation exists; first proof reached related-lists 200 and manager 403, then DB failed with `EHOSTUNREACH/P1001` and `ENOTFOUND`.
   Next slice: rerun `DEMO_QA_BASE_URL=http://localhost:3029 pnpm bff:crm-related-lists-qa` after DB recovers.

3. **Role-aware sidebar is contract-only**
   Severity 3 / Leverage 2 / Type: source gap.
   Evidence: RAS-001 contract proof exists, but no resolver/policy tests, bootstrap, renderer, or URL guard alignment.
   Next slice: `RAS-002 server-side sidebar resolver and policy tests`.

4. **Route B director / character / feedback provider loop is still guarded-disabled**
   Severity 2 / Leverage 3 / Type: operator/provider gap.
   Evidence: `/api/theater/route-b/runtime` currently returns guarded-disabled for DIRECTOR/CHARACTER/FEEDBACK and correctly writes no fake `AiUsageLog`.
   Next slice after stage map and provider approval: director provider route with success/error `AiUsageLog`.

5. **BFF-204 Theater AI hardening remains open**
   Severity 2 / Leverage 2 / Type: source/proof gap.
   Evidence: legacy `/api/ai/theater` and `/api/ai/theater/score` still need the same session/quota/success-error `AiUsageLog` gate as visit/report/SPIN, while preserving legacy enum/scoring protection.
   Next slice: BFF-204 route audit/hardening after Route B stage priority.

6. **REL-004 formal edge table is still a schema/migration gap**
   Severity 1 / Leverage 2 / Type: production approval / schema gap.
   Evidence: current graph uses deterministic edges from `FamilyMember.parentMemberId + relation`; sufficient for stage map, but formal `RelationshipEdge` table needs migration/rollback approval.
   Next slice: defer until DB target stable and migration review is explicit.

7. **Member settings / org settings split is not fully proven across UI and API**
   Severity 2 / Leverage 2 / Type: source/proof gap.
   Evidence: BFF-102 remains open; RAS/RBAC docs warn `/settings` and `/team/settings` must not mix member private settings with org-wide settings.
   Next slice: BFF-102 after RAS-002/003 or as release-hardening fallback.

8. **Client portal / share token lifecycle is incomplete**
   Severity 2 / Leverage 2 / Type: source/proof gap.
   Evidence: public share works, but BFF-303 remains open for expiry/rotation/revocation and client portal bootstrap boundaries.
   Next slice: BFF-303 for client-facing LV3 trust boundary.

9. **Production build still has Next/Turbopack Google Font blocker**
   Severity 2 / Leverage 2 / Type: source/operator-env gap.
   Evidence: issue-question tracks build blocker for `[next]/internal/font/google/*`.
   Next slice: self-host font or Next 16 font build fix in a release-hardening loop.

10. **Live Realtime voice and Route B live provider proof still need operator approval**
   Severity 1 / Leverage 2 / Type: operator/provider gap.
   Evidence: PIM realtime persistence and no-provider proofs exist; live voice/provider proof requires model/env/cost approval and `AiUsageLog` evidence.
   Next slice: only after explicit provider approval.

## Recommended Next Slices

Primary, if Supabase DB/DNS is available:

1. `ITA-003f/S1 Route B relationship-graph stage map (no-provider)`.
   - Build `/theater/[sessionId]` stage map from Route B characters / relationship evidence.
   - Support click-person-to-private-lane, speaking/focused highlights, visibility badges, guarded-disabled runtime state.
   - Do not call provider.
   - Proof: member read, manager 404, private visibility, state proposals still `writesConfirmedCrmFact=false`, desktop/mobile no overflow.

Safe fallback, if DB/DNS remains blocked:

2. `RAS-002 server-side sidebar resolver and policy tests`.
   - Convert RAS-001 contract into resolver/policy helpers.
   - Fixture proof for collaborator/member/manager/org admin/org owner/support/finance/super admin/client viewer.
   - Do not claim route guard/browser auth completion.

Separate recovery proof after DB returns:

3. Rerun BFF-103d full proof.

## Docs Updated

- `AGENTS.md`: added ITA stage-map and RAS-002 fallback notes.
- `docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`: added ITA-003f/S1 next-slice note.
- `docs/05_execution-plans/PLN-021_role-aware-sidebar-navigation-batch-tasks-v1.0.md`: added RAS-002 fallback note.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence counter and updated next recommendation.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`: recorded this scheduled review and next slice/fallback.

## Validation

- PASS: `git diff --check`.
- PASS: `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` confirmed DB DNS still has no answer.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.

## DB / Prisma

- No DB read/write.
- No Prisma schema changes.
- No `prisma db push`.
- No OpenAI/Anthropic provider calls; no `AiUsageLog` write needed.

## Git

- Push skipped by user instruction.
- Local commit: report is included in the loop commit; exact hash is recorded in final response / `git log -1`.

## Next Recommended Loop

If DB is available, run:

```text
執行 ITA-003f/S1 Route B relationship-graph stage map (no-provider)：讓 /theater/[sessionId] 以 Route B characters / relationship evidence 呈現可操作舞台地圖，支援點人物進私聊、發言/焦點高亮、visibility badge 與 guarded-disabled runtime 狀態；不呼叫 provider，補 member/manager/privacy/mobile proof。
```

If DB remains unavailable, run:

```text
執行 RAS-002 server-side sidebar resolver and policy tests：把 RAS-001 contract 轉成 resolver/policy helper，用 fixtures 驗證 collaborator/member/manager/org admin/org owner/support/finance/super admin/client viewer 的可見性與資料邊界；不宣稱 browser auth/route guard 完成。
```
