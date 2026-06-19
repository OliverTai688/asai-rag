# 2026-06-20 LV3 Whole Product Gap Review - Theater Runtime

## Scope

Scheduled fifth-loop whole-product review for the ASAI LV3 immersive advisor-system automation. This was a review, prioritization, and handoff-planning loop, not a broad source implementation loop.

Review target:

新增客戶 -> 建立關係圖 -> 生成拜訪準備包 -> 檢視問題清單與推論依據 -> 從準備包建立劇場舞台 -> 劇場私聊/群聊/人物狀態更新 -> AI 訪談建立或補強客戶資料、準備包、劇場。

No web research was used. The review used repo source, `AGENTS.md`, current PLNs/ACCs/audits/research docs, latest loop reports, `package.json`, and source reality checks.

## Inventory

| Target step | Classification | Evidence |
| --- | --- | --- |
| 新增客戶 | ready | `GET/POST /api/clients`, detail hydration, family/policy create BFF, compliance initialization, demo write proof. |
| 建立關係圖 | ready with source/write gap | `BFF-103a` added relationship graph review DTO, per-node role/job/income/status/context, fact/inference/unknown labels, source refs, API/browser proof. Edit/delete still uses local store methods. |
| 生成拜訪準備包 | ready | `BFF-104a` moved visit list/detail/create/update/notes to member-scoped BFF; `/api/ai/visit` remains provider-generation route with usage logging. |
| 檢視問題清單與推論依據 | ready | Previsit command center and BFF proof show reasoning evidence, source labels, unknowns, persisted notes, theater CTA. |
| 準備包建立劇場舞台 | ready with runtime blocker | Persisted package -> theater handoff, high-sensitive gate, client selector, client-data build review, manager 403, no private sentinel, desktop/mobile proof all exist. The output still lands before a true Route B multi-character runtime. |
| 劇場私聊/群聊/人物狀態更新 | source gap | Source still uses legacy `personaType`, numeric `tension`, two-role `agent/client` turns, score JSON, and Zustand session/turn state; no `addressee`, `visibilityScope`, multi-character director, private/group scope, or person state update contract. |
| AI 訪談建立/補強資料 | ready with expansion gap | PIM-001..009 completed memory, persistence, reflection/planning, confirmation/writeback and cross-mode QA. Writeback creates CRM candidate/insight/task events, not VisitPlan/TheaterBuildDraft artifacts. |
| Navigation/onboarding | proof/source gap | AI-first sidebar done. Role-aware navigation resolver and cross-role route/sidebar alignment remain open. |
| BFF/security/privacy | source/proof gap | Many vertical BFFs are in place. BFF-001 inventory, BFF-002 shared API foundation, reports/issues BFF, and beta-critical BFF matrix remain open. |
| QA/release evidence | operator/environment gap | Targeted API/browser proofs exist. `pnpm build` remains blocked by the known Next/Turbopack Google Font path issue; no single clean-browser full LV3 path proof exists yet. |

## Top 10 Gaps

| Rank | Gap | Type | Severity | Leverage | Owner | Evidence | Next slice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Theater runtime is not Route B multi-character | source gap | 2 | 3 | TDF-005 / ITA-003 | `src/domains/theater/types.ts` has one persona, tension, two roles; `prisma.schema` has no character/addressee/visibility on theater turns. | `TDF-005a` handoff packet + migration compatibility brief before schema changes. |
| 2 | Theater lacks private/group visibility and person state update boundary | source gap | 2 | 3 | TDF-005 / ITA-003 | Theater UI/API routes do not model private vs group chat, visible history, state changes, or relationship changes. | Define visibility scope, state update events, rollback, and audit/AiUsageLog strategy in TDF-005a. |
| 3 | Theater session/turn runtime is still local-first in UI | source gap | 2 | 3 | ITA-003 / BFF | `useTheaterStore` creates `theater_${Date.now()}` sessions and keeps turns/scores in Zustand; DB `TheaterSession` remains legacy-shaped. | After TDF-005a, implement Route B BFF/persistence migration slice. |
| 4 | AI interview writeback cannot create VisitPlan or TheaterBuildDraft | source gap | 2 | 3 | PIM / BFF-104 / TDF | PIM writeback safely creates CRM candidate/insight/task events, but not preparation package or theater stage drafts. | Add confirmation targets for `VISIT_PLAN_DRAFT` and `THEATER_BUILD_DRAFT` after Route B handoff contract is stable. |
| 5 | Relationship graph edit/delete is not remote-confirmed | source gap | 2 | 2 | BFF-103 | `deleteFamilyMember` / `updateFamilyMember` still mutate local store; new graph review DTO is read-only. | `BFF-103b` family update/delete/re-parent BFF with graph review reload proof. |
| 6 | TDF-004 remains unclosed despite subproofs | proof gap | 1 | 2 | TDF-006 | Client selector, high-sensitive gate, and source review proof exist, but TDF-004 checklist is not fully ticked and cross-state QA is not consolidated. | Run TDF-006 cross-state QA after or alongside TDF-005a. |
| 7 | Reports/issues still have incomplete BFF coverage | source gap | 2 | 2 | BFF-105 / BFF-106 | BFF board still marks reports/share action and issues BFF open. | Implement reports or issues BFF after theater runtime path is contractually safe. |
| 8 | Full-site BFF inventory/shared API foundation are open | proof gap | 2 | 3 | BFF-001 / BFF-002 | `AUD-006` is not present; shared response/error/sanitize helper work remains open. | Run a focused beta-critical BFF inventory once LV3 runtime path stabilizes. |
| 9 | Role-aware navigation is not aligned with route guard matrix | source gap | 2 | 2 | RAS-001..005 | RAS progress board remains open; sidebar hide/show is not yet a server-side navigation contract. | Define role-aware navigation contract/resolver before broader beta proof. |
| 10 | Production build and full clean-browser LV3 proof are blocked | operator/environment gap | 2 | 2 | LCH-009 / ALA | `issue-question.md` records `pnpm build` blocker around Next/Turbopack Google Font path; no full LV3 script exists. | Separate build-font hardening loop, then full LV3 clean-browser proof. |

## Candidate Implementation Slices

1. `TDF-005a Route B handoff packet and migration compatibility brief` - score 18
   - +7 connects graph/package/setup draft to the real theater runtime.
   - +5 moves theater toward private/group conversation, person state updates, and visibility boundaries.
   - +6 reduces compliance/migration risk by defining compatibility and rollback before schema work.
   - +3 updates owner docs so ITA-003 can proceed safely.

2. `PIM/BFF writeback -> VisitPlan/TheaterBuildDraft` - score 16
   - +7 connects AI interview to preparation package and theater creation.
   - +6 strengthens server-owned workspace creation.
   - +3 uses existing PIM proof, but needs stable theater handoff target first.

3. `BFF-103b family edit/delete/re-parent remote-confirmed graph write path` - score 15
   - +7 strengthens client -> relationship graph.
   - +6 replaces local graph writes with member-scoped BFF.
   - +4 can produce API/browser proof quickly, but it does not unlock private/group theater.

4. `TDF-006 cross-state QA and docs sync` - score 12
   - Useful to close TDF-004 subproofs, but less leverage than defining Route B handoff.

5. `BFF-001 beta-critical data-source inventory` - score 11
   - High long-term leverage, but less directly connected to the immersive theater runtime gap.

## Selected Next Slice

Next recommended implementation/proof slice:

`TDF-005a Route B handoff packet and migration compatibility brief`

Acceptance target for the next normal loop:

- Add or update a concise migration/compatibility brief for legacy `personaType`, numeric `tension`, score JSON, and new Route B scene/characters/turn visibility.
- Define `TheaterSetupDraft -> TheaterScene -> TheaterCharacter[]` handoff contract without performing schema migration.
- Define director input: scene state, scoped history, character cards, visibility rules, advisor utterance, and state-update options.
- Define character input: character card, addressee, visibility scope, director directive, and visible history only.
- Define private/group visibility scopes and person state update boundaries so private chat cannot leak into group context.
- Define `AiUsageLog` strategy for director, character, and feedback calls.
- Define rollback note: Route B disabled means `/theater` stops at setup draft review and does not claim production multi-character simulation.
- Update `PLN-015` ITA-003 references to prevent duplicate task ownership.
- No provider call, no Prisma migration, no DB write unless the next loop explicitly chooses a safe pure-contract proof.

## Docs Updated

- Added this review report.
- Updated `docs/2_agent-input/generated/agent-loop/loop-state.json`:
  - `normalLoopsSinceLastWholeProductReview = 0`
  - `lastWholeProductReviewReport = docs/2_agent-input/generated/agent-loop/reports/2026-06-20_lv3-whole-product-gap-review-theater-runtime.md`
  - `nextRecommendedImplementationSlice = TDF-005a Route B handoff packet and migration compatibility brief`
- Updated `AGENTS.md` TDF gap notes and TDF-005 review note.
- Updated `docs/05_execution-plans/PLN-020_theater-direct-field-guide-batch-tasks-v1.0.md` TDF-005 review note.

No new `issue-question.md` item was required. Existing items already cover push pause, production DB approval, live provider approval, raw audio approval, and the build blocker.

## Validation

- `git diff --check`: pass
- `pnpm exec tsc --noEmit --pretty false`: pass
- `pnpm lint:changed`: pass

## DB / Prisma

- Prisma schema changed: no.
- Prisma validate/generate/db push: not required.
- DB operations: none.
- Provider calls: none.
- AiUsageLog: no new rows required because this was a no-provider review loop.

## Git

- Local commit: pending until final git step.
- Push: `push skipped by user instruction`.

## Remaining Blockers

- Source blocker: Route B theater runtime, private/group visibility, state updates, and multi-character persistence are not implemented.
- Source blocker: relationship graph edit/delete remains local-first.
- Proof blocker: TDF-006 cross-state QA and full LV3 clean-browser proof are still missing.
- Operator/environment blocker: production build font path issue remains open.
- Production approval blocker: live provider proof, raw audio retention, production schema migrations, email/notification/payment remain approval-gated.

## Next Recommended Loop

Run `TDF-005a Route B handoff packet and migration compatibility brief` as the next normal LV3 implementation/proof loop. Keep it no-schema/no-provider unless the user explicitly chooses to enter ITA-003 migration work.
