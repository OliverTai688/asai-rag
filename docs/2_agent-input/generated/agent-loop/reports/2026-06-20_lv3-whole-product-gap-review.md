# 2026-06-20 LV3 Whole Product Gap Review

## Scope

Scheduled fifth-loop whole-product review for the ASAI LV3 immersive advisor-system automation. This was a review and prioritization loop, not a broad source implementation loop.

Review target:

新增客戶 -> 建立關係圖 -> 生成拜訪準備包 -> 檢視問題清單與推論依據 -> 從準備包建立劇場舞台 -> 劇場私聊/群聊/人物狀態更新 -> AI 訪談建立或補強客戶資料、準備包與劇場。

No web research was used in this review. The review used repo source, current PLNs/ACCs/research docs, latest loop reports, `package.json`, and source reality checks.

## Inventory

| Target step | Classification | Evidence |
| --- | --- | --- |
| 新增客戶 | ready | LCH-002 DB-backed `GET/POST /api/clients`, detail hydration, family/policy write proof, compliance checklist initialization. |
| 建立關係圖 | source gap | Family graph exists and family-member create BFF exists, but person metadata is still thin: no fact/inference/unknown labels per node, no job/income/status for related people, delete/edit can still use local store methods. |
| 生成拜訪準備包 | source gap | `/api/ai/visit` is session-scoped, quota guarded, writes `AiUsageLog`, and adds reasoning evidence, but `/pre-visit` list/detail/notes/create/update are still Zustand/client-store first. |
| 檢視問題清單與推論依據 | ready with persistence gap | Recent previsit command center shows question reasoning/evidence and has API/browser proof, but generated output can remain local unless attached to a persisted `VisitPlan`. |
| 準備包建立劇場舞台 | ready with incomplete product gate | `GET /api/visits/[id]/theater-handoff` provides member-scoped persisted package -> theater build proof, but full TDF-004 client selector and high-sensitivity reason/riskAccepted UI are incomplete. |
| 劇場私聊/群聊/人物狀態更新 | source gap | Current theater session is still legacy persona/tension/score. Route B multi-character director, private/group visibility, and state-change persistence remain ITA-003/006. |
| AI 訪談建立/補強資料 | ready with expansion gap | PIM-001..009 completed memory, reflection, persistence, writeback, and cross-mode QA. It can write CRM candidate events safely, but cannot yet create/update VisitPlan or Theater stage through confirmation cards. |
| Navigation/onboarding | proof/source gap | AI-first sidebar is complete. Role-aware navigation resolver and cross-role route/sidebar alignment remain RAS-001..005. |
| BFF/security/privacy | source gap | Many vertical slices are BFF-backed, but BFF-001 full data-source inventory and BFF-002 shared API foundation are still open. |
| QA/release evidence | operator/environment gap | LV3 source proofs exist for many slices, but `pnpm build` remains blocked by the Next/Turbopack Google Font path issue in `issue-question.md`; no single clean-browser end-to-end proof covers the full LV3 target flow yet. |

## Top 10 Gaps

| Rank | Gap | Type | Severity | Leverage | Owner | Evidence | Next slice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `/pre-visit` is not yet a server-owned workspace | source gap | 2 | 3 | BFF-104 | Source check shows `/pre-visit`, detail, and notes use `useVisitStore`; only theater handoff has `GET /api/visits/[id]/theater-handoff`. | Implement `BFF-104a`: `GET/POST /api/visits`, `GET/PATCH /api/visits/[id]`, notes write path, and BFF/cache-first list/detail/notes. |
| 2 | Generated visit package can be visible but not persisted through the UI flow | source gap | 2 | 3 | BFF-104 / BFF-202 | `/api/ai/visit` returns enriched output and logs usage, but detail page writes generated data to local plan state. | Add explicit persisted save/update contract after generation without storing raw prompt/provider payload. |
| 3 | Package -> theater handoff exists only for persisted plans; UI creation can still produce local-only plans | source gap | 2 | 3 | BFF-104 / TDF-004 | Recent `visit:theater-bff-qa` proves persisted plan handoff; it does not cover locally generated Quickstart/store plans after refresh. | Make previsit creation persist first, then launch `/theater/build?visitPlanId=...` from DB-backed ID. |
| 4 | Relationship graph lacks rich per-person metadata and evidence classification | source gap | 2 | 3 | BFF-103 / CRM graph | `FamilyMember` supports relation/name/age/phone/parentMemberId, but not role/job/income/status/factStatus/source references. | Add a scoped CRM graph metadata slice before deeper AI graph writeback. |
| 5 | Theater still lacks private/group chat and relationship/state changes | source gap | 2 | 3 | ITA-003 / TDF-005 | `TheaterSession` and store still use legacy `personaType`, `tension`, `role: agent/client`, numeric score. | Start TDF-005 migration/compatibility brief, then ITA-003 Route B schema/director slice. |
| 6 | High-sensitivity theater build gate is source-level but not fully operable in UI | source gap | 3 | 2 | TDF-004 | Handoff pure service blocks sensitive packets, but `/theater/build` still lacks complete reason/riskAccepted UI and review flow. | Finish TDF-004 selector + sensitivity approval + API/browser proof. |
| 7 | AI interview writeback does not yet create VisitPlan or Theater stage artifacts | source gap | 2 | 3 | PIM extension / BFF-104 / TDF-004 | PIM writeback safely creates CRM candidate events and follow-up tasks, not persisted preparation packages or theater stage drafts. | Add confirmation-card targets for `VISIT_PLAN_DRAFT` and `THEATER_BUILD_DRAFT` after BFF-104 exists. |
| 8 | Full-site data-source responsibility matrix is missing | proof gap | 2 | 3 | BFF-001 | Source checks still find store/local fallback in key surfaces; no `AUD-006` matrix exists. | Run focused BFF-001 inventory, with visit/previsit rows prioritized for the next implementation slice. |
| 9 | Role-aware sidebar and route/sidebar contract are not aligned | source gap | 2 | 2 | RAS-001..005 | AI-first sidebar is done, but RAS progress board is still open. | Define role-aware navigation contract and resolver after LV3 core workspace handoff is server-owned. |
| 10 | Production build and full LV3 clean-browser proof are not complete | operator/environment gap | 2 | 2 | LCH-009 / issue-question | `issue-question.md` records `pnpm build` blocker around Next/Turbopack Google Font path. | Separate build-font hardening loop, then full LV3 clean-browser proof script. |

## Candidate Implementation Slices

1. `BFF-104a Visit / Pre-visit server-owned workspace` - score 15  
   Severity 2, leverage 3, dependency priority 3, proofability 3, risk 1. This unlocks preparation generation persistence, theater handoff, clean refresh/new-context proof, and later interview writeback targets.

2. `TDF-004 completion: client-data build selector + high-sensitivity approval UI` - score 13  
   Severity 3, leverage 2, dependency priority 2, proofability 2, risk 2. It removes the biggest compliance-operability gap for real customer data entering theater.

3. `BFF-103 relationship graph metadata and safe graph write path` - score 12  
   Severity 2, leverage 3, dependency priority 2, proofability 2, risk 1. It improves the upstream graph that powers preparation and theater, but it should follow or pair with server-owned previsit.

4. `TDF-005 / ITA-003 Route B handoff and migration brief` - score 11  
   Severity 2, leverage 3, dependency priority 2, proofability 1, risk 3. It is core to private/group theater, but higher risk because it touches protected theater migration constraints.

5. `PIM writeback expansion to VisitPlan/TheaterBuildDraft` - score 10  
   Severity 2, leverage 3, dependency priority 1, proofability 2, risk 2. Best after BFF-104 and TDF-004 provide stable targets.

## Selected Next Slice

Next recommended implementation slice:

`BFF-104a Visit / Pre-visit server-owned workspace`

Acceptance target for the next loop:

- Add `GET/POST /api/visits`.
- Add `GET/PATCH /api/visits/[id]` and notes write path.
- Keep `/api/ai/visit` as the provider-generation route; add a separate save/update path for generated preparation package data.
- Migrate `/pre-visit`, `/pre-visit/[planId]`, and notes to BFF/cache-first.
- Prove refresh/new browser context keeps generated package, reasoning evidence, notes, and theater CTA.
- Prove no raw prompt/provider payload, cookie, token, email/phone sentinel, or private transcript leakage.
- Keep `AiUsageLog` only for actual provider generation; CRUD/save routes are deterministic no-provider paths.

## Docs Updated

- Added this review report.
- Updated `loop-state.json` cadence review state.
- Updated `PLN-019` / `AGENTS.md` BFF-104 notes to point the next implementation loop at `BFF-104a`.

No new `issue-question.md` item was required. Existing operator/environment blockers already cover push pause, production DB approvals, live provider approvals, and the `pnpm build` blocker.

## Validation

- PASS `git diff --check`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`

## DB/Prisma

- Prisma schema changed: no.
- Prisma validate/generate/db push: not required.
- DB operations: none.
- Provider calls: none.
- AiUsageLog: no new rows required because this was a no-provider review loop.

## Git

- Branch: `codex/asai-lv3-automation`
- Commit: pending final local commit.
- Push: `push skipped by user instruction`

## Next Recommended Loop

Run `BFF-104a Visit / Pre-visit server-owned workspace` as the next normal LV3 implementation/proof loop. After that, score `TDF-004 completion` against `BFF-103 relationship graph metadata`.
