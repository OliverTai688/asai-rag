# 2026-06-21 LV3 Whole-product Gap Review - DB Blocker / Build Fallback

## Scope

- Loop type: scheduled fifth-loop whole-product review.
- Trigger: `cadenceReview.normalLoopsSinceLastWholeProductReview` was 4.
- Product target: client -> relationship graph -> visit preparation package -> question rationale -> theater stage -> private/group theater interaction and state proposals -> AI interview and quick-capture writeback.
- Provider posture: no OpenAI/Anthropic call was made; no `AiUsageLog` write is required.
- DB posture: no DB write and no Prisma operation. `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` still returned `No answer`.
- Web research: not used. This review relied on repo owner docs, acceptance docs, recent loop reports, and the already-updated LV3 prompt quiet-continuation rule.

## Target-flow Inventory

| Target step | Classification | Evidence | Main missing proof or source |
| --- | --- | --- | --- |
| Client creation / lifecycle | ready with proof | BFF-103c proves create/update/archive with compliance fields preserved. | BFF-103d related-list recovery proof remains DB/DNS-blocked. |
| Relationship graph | ready for current no-schema model | REL-001/002/003/005 prove parent/elder/spouse/sibling/social edges, metadata, and interaction polish. | REL-004 formal edge table remains a future migration/product decision. |
| Visit preparation package | ready baseline | BFF-104, previsit redesign, BFF-202 visit/report AI hardening, and theater handoff proof exist. | Related-list inputs and post-visit quick-capture API proof are still incomplete while DB is blocked. |
| AI interview / quick capture | source-contract ready, BFF proof blocked | PIM-010 writes VisitPlan and Route B theater drafts; PIM-011a proves no-provider quick-capture domain contract. | PIM-011 BFF/API owner/manager/readback proof requires DB. |
| Theater stage | highest product gap | ITA-003c/d/e prove persisted Route B sessions, UI read surface, and advisor group/private turn shell. | No relationship-graph-centered operable stage map; proof requires DB-backed persisted sessions. |
| Navigation/onboarding | fixture/source ready | RAS-001..005 prove role-aware navigation contract, resolver, bootstrap, UI wiring, and cross-role fixture matrix. | Live staging/production auth matrix is not claimed. |
| Release proof | mixed | LCH-009 has release readiness, monitoring runbook, AI audit, full smoke history. | Current production build blocker is Next/Turbopack Google font path. |

## Five-frame Review

1. Advisor workflow / onboarding:
   - Main gap: the theater first screen still needs to feel like a customer relationship stage, not a generic chat surface. DB is required for honest persisted-stage proof.
2. Source-of-truth / BFF:
   - Main gap: the highest-value BFF proofs now share the same external blocker: Supabase DB DNS. BFF-103d, PIM-011 API proof, and ITA-003f/S1 cannot be claimed until persistence can be tested.
3. AI reasoning / evidence:
   - Main gap: preparation-package reasoning is strong, but post-visit quick-capture still lacks DB-backed memory/readback proof. Provider expansion must continue to require success/error `AiUsageLog`.
4. Theater / relationship immersion:
   - Main gap: Route B has session and advisor turns, but not a relationship-map stage with active speaker/addressee, click-to-private-chat, visibility badge, narrator questions, and state proposal affordance.
5. QA / compliance / release-proof:
   - Main gap: DB/DNS blocks the best LV3 proof, while `pnpm build` has a no-DB blocker that is release-critical and should become the fallback when DB remains unavailable.

## Top Gap Ranking

| Rank | Gap | Frame | Severity | Leverage | Blocker type | Owner | Existing evidence | Missing evidence | Smallest next slice |
| ---: | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | Route B theater lacks relationship-graph-centered stage map | Theater / relationship immersion | 2 | 3 | operator/environment gap | `PLN-015`, `ACC-006` | ITA-003c/d/e persisted session, UI read surface, advisor turn shell, S1a proof plan. | DB-backed API/browser proof with persisted session and stage map. | `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` after DB recovery. |
| 2 | BFF-103d CRM related-list proof is incomplete | Source-of-truth / BFF | 2 | 3 | operator/environment gap | `PLN-019`, `ACC-011`, issue-question | Partial proof reached related-lists 200 before DB failure; recovery proof plan exists. | Full API/browser/AiUsageLog-unchanged rerun. | Rerun `DEMO_QA_BASE_URL=http://localhost:3029 pnpm bff:crm-related-lists-qa` after DNS recovery. |
| 3 | PIM-011 quick-capture lacks BFF/API persistence proof | Advisor workflow / AI evidence | 2 | 3 | operator/environment gap | `PLN-018`, `ACC-010` | PIM-011a no-provider domain contract and PIM-011b proof plan exist. | Owner 201/200, manager/foreign denial, high-sensitive gate, refresh/new-context DB readback. | Implement PIM-011 BFF/API proof only when DB is available. |
| 4 | Production build has Next/Turbopack Google font blocker | QA / release-proof | 2 | 2 | source/environment gap | `PLN-017`, issue-question | Issue-question records failing `[next]/internal/font/google/*` / `@vercel/turbopack-next/internal/font/google/font` path. | Next 16 doc review, local/self-hosted font or supported config, `pnpm build` pass. | No-DB fallback: LCH-009 build-font release-hardening slice. |
| 5 | Untracked AI meeting / notes prototype is outside committed baseline | Source-of-truth / QA | 2 | 2 | source hygiene gap | Future AMM/quick-capture owner | Files exist in worktree but are not validated/staged by current loops. | Selected-scope ownership, validation, and proof. | Do not stage until an explicit AMM/notes slice owns the whole scope. |
| 6 | Route B director/character/feedback runtime still guarded-disabled | AI evidence / theater | 2 | 2 | product/provider approval | `PLN-015`, `ACC-006` | Runtime gate correctly returns guarded-disabled and writes no fake usage. | Explicit provider approval and success/error `AiUsageLog` proof. | Defer until after stage map or explicit provider go-ahead. |
| 7 | Live role/session browser matrix remains unproven | QA / compliance | 2 | 2 | environment/session gap | `PLN-021`, `ACC-013` | RAS-005 fixture/source/headless matrix passed. | Real staging/production auth sessions. | Run live matrix only when sessions/env are available. |
| 8 | REL-004 formal relationship edge table remains unresolved | Source-of-truth / relationship graph | 1 | 2 | product/migration decision | Relationship graph workstream | No-schema graph model is currently proven enough for stage map. | Migration/rollback approval and formal edge persistence. | Defer until DB target is stable and migration review is explicit. |
| 9 | Production provider/raw-audio/pgvector approvals remain bounded | QA / compliance | 2 | 1 | production approval | issue-question / PIM / RAG owners | Development proofs are clearly labelled. | Production migration/provider/raw-audio/vector approval. | Keep disabled/guarded until approved. |
| 10 | Notification / real email proof is still intentionally absent | QA / release-proof | 1 | 1 | production approval | `AUD-006`, LCH/BFF future work | Mock reminder route is tracked as non-production proof. | Real provider/job BFF and explicit approval. | Do not run real notification without approval. |

## Selected Slice And Top-3 Score Rationale

1. `ITA-003f/S1 Route B relationship-graph stage map`: 90 raw, blocked now. It connects graph -> previsit -> Route B stage -> private/group lane -> state proposal, and it is the clearest LV3 immersion gap. It cannot be honestly completed while Supabase DB/DNS is unresolved.
2. `BFF-103d CRM related-list recovery`: 84 raw, blocked now. It connects client detail, policies/timeline/reports/gap-analysis, preparation inputs, and theater readiness. It requires DB-backed API/browser proof and cannot be replaced with fixture proof.
3. `LCH-009 production build font blocker fallback`: 78 executable now if selected next. It does not connect as many LV3 product surfaces, but it is no-DB, release-critical, and prevents the system from continuing to pass `tsc`/lint while build remains broken.

Selected for this review: document the DB blocker decision tree and promote the LCH-009 build-font blocker as the safe no-DB fallback, while keeping `ITA-003f/S1` as the primary next implementation as soon as DB recovers.

## Changes

- Updated `docs/2_agent-input/generated/agent-loop/loop-state.json`:
  - Reset `normalLoopsSinceLastWholeProductReview` to 0.
  - Recorded this report path.
  - Updated `nextRecommendedImplementationSlice` with primary DB-recovered slice and no-DB build fallback.
- Added this review report.
- Updated `docs/05_execution-plans/PLN-017_launch-readiness-implementation-batch-tasks-v1.0.md` with a whole-product review note for the build-font fallback.
- Updated `docs/2_agent-input/generated/agent-loop/issue-question.md` with the 2026-06-21 review summary and current DB/DNS status.

No source files were changed. No existing dirty MAN/sidebar/pre-visit files or untracked AMM/notes prototype files were staged.

## Validation

- `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co`: failed with `No answer`; DB-backed proof remains blocked.
- `git diff --check`: pass.
- `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8'))"`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.

## Evidence

- Current DB/DNS check: `db.wwocdcicvpmbdmqvskzi.supabase.co` still has no answer.
- Owner docs consulted: `PLN-015`, `PLN-017`, `PLN-018`, `PLN-019`, `PLN-020`, `PLN-021`, `ACC-006`, `ACC-010`, `ACC-011`, `ACC-013`, `AUD-006`.
- Recent loop evidence consulted: `2026-06-21_lv3-quiet-bff-103d-related-list-proof-plan.md`, `2026-06-20_lv3-quiet-route-b-stage-map-proof-plan.md`, `2026-06-20_lv3-quiet-pim-011b-bff-proof-plan.md`, and `2026-06-20_lv3-whole-product-gap-review-after-pim-011.md`.

## DB / Prisma

- DB writes: none.
- Prisma validate/generate/db push: none.
- Provider calls: none.
- `AiUsageLog`: unchanged by design because no OpenAI/Anthropic provider call was made.

## Git

- Push remains paused by user instruction: `push skipped by user instruction`.
- Local commit is created after validation and staging.

## Blockers

- Operator/environment: Supabase DB/DNS blocks persisted Route B stage map, BFF-103d, and PIM-011 BFF/API proof.
- Source/environment: production build remains blocked by the Next/Turbopack Google font path until a local/self-hosted or supported font strategy is proven.
- Product/provider approval: Route B director/character/feedback runtime still needs explicit provider approval and success/error `AiUsageLog` proof.
- Production approval: production migrations, raw audio retention, pgvector, real email/notification, and live provider proof remain approval-bound.

## Next Recommended Loop

If DB/DNS recovers:

```text
執行 ITA-003f/S1 Route B relationship-graph stage map (no-provider)：讓 /theater/[sessionId] 以 persisted Route B session DTO、characters、relationship evidence、stored turns 與 sceneState statePatches 呈現可操作舞台地圖；支援 click-to-private-chat、active speaker/addressee highlight、group/private visibility badge、narrator question/state proposal affordance；不呼叫 provider，證明 member owner 200、manager/foreign 404、private visibility、不寫 confirmed CRM fact、desktop/mobile no overflow、no private sentinel、AiUsageLog unchanged。
```

If DB/DNS remains blocked:

```text
執行 LCH-009 production build font blocker fallback：先讀 node_modules/next/dist/docs/ 中與 Next 16 fonts/build 相關文件，修復目前 next/font/google/Turbopack Google font path build blocker（優先 local/self-hosted font 或官方支援設定），跑 pnpm build 並保留 tsc/lint:changed；不得 staging unrelated AMM/notes prototype files，不得宣稱這是 LV3 theater/source proof。
```
