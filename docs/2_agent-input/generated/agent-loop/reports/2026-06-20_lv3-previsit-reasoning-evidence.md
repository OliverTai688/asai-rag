# 2026-06-20 LV3 Pre-visit Reasoning Evidence

## Scope

Normal LV3 implementation/proof loop for the immersive advisor workflow.

Selected slice: `lv3-relationship-to-previsit-package` + `lv3-previsit-reasoning-trace`.

The goal was to make the visit preparation package show why each SPIN question was suggested,
using server-scoped client facts, relationship graph data, policy data, visit purpose, AI gap tags,
and explicit unknowns.

## Candidate Score

1. `lv3-relationship-to-previsit-package` / `lv3-previsit-reasoning-trace`: 16
   - +7 connects relationship graph/client facts to the preparation package.
   - +5 creates visible reasoning trace for preparation questions.
   - +4 adds API/browser/source proof for a LV3-critical flow.
   - No production mutation or Theater Route B risk.
2. `lv3-previsit-to-theater-stage`: 10
   - +7 connects preparation package to theater.
   - +3 would clarify next batch docs, but actual stage creation still risks colliding with TDF/ITA Route B boundaries.
3. `lv3-client-to-relationship-graph`: 9
   - +7 connects client creation to relationship graph.
   - +4 usability value, but this loop had a clearer existing source foothold in `/api/ai/visit`.
   - -2 because deeper graph editing belongs to a separate CRM/BFF slice.

## Changes

- Added `VisitQuestionReasoning` and evidence labels to `src/domains/visit/types.ts`.
- Added `src/domains/visit/reasoning.ts`, a deterministic helper that enriches SPIN questions with:
  - confirmed evidence from client profile, relationship graph, and policies;
  - inference evidence from visit purpose and AI tags;
  - unknown evidence for advisor confirmation.
- Updated `POST /api/ai/visit` to enrich parsed provider output server-side before returning JSON.
- Updated `/pre-visit/[planId]` to show each question's `推論依據`, evidence badges, and `現場確認` note.
- Added `pnpm visit:reasoning-dry-run`.
- Extended `pnpm demo:ai-generation-qa` so future AI generation QA checks question reasoning evidence.
- Updated `loop-state.json` cadence counter from 0 to 1.

## Validation

- `pnpm visit:reasoning-dry-run`: pass.
  - Evidence sources: `ai_tag`, `client_profile`, `policy`, `relationship_graph`, `unknown`, `visit_purpose`.
  - Evidence statuses: `confirmed`, `inference`, `unknown`.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.
- Explicit ESLint for new untracked files: pass.
- API proof against `http://localhost:3010/api/ai/visit`: pass.
  - Status 200.
  - 8 questions.
  - 24 evidence items.
  - Sources include relationship graph and policy.
  - Statuses include confirmed / inference / unknown.
  - `VISIT` success `AiUsageLog` increased `10 -> 11`.
- Browser proof with demo auth header against `http://localhost:3010/pre-visit?clientId=c_wang&autoCreate=true`: pass.
  - Generated a preparation package.
  - Opened the SPIN section.
  - Visible `推論依據`, `已知`, `推論`, `待確認`, `現場確認`.
  - Console errors: 0.
  - Horizontal overflow: false.
  - Latest `VISIT` aggregate after API/browser proof: success 13, error 3.

## Evidence

- Source-level proof: `pnpm visit:reasoning-dry-run`.
- API proof: local one-shot `/api/ai/visit` call with demo member header.
- Browser proof: headless Chromium/Edge with `x-asai-demo-user-email`.

In-app Browser limitation: dashboard routes require Auth.js session or `x-asai-demo-user-email`;
the in-app Browser normal navigation cannot reliably attach that header, so authenticated visual
proof used the repo's established headless-browser pattern.

## DB / Prisma

- Schema changed: no.
- Prisma validate/generate: not required.
- db push: not run.
- DB writes: no schema/data mutation. AI generation proof wrote normal `AiUsageLog` rows through
  the existing `/api/ai/visit` success path.

## Git

- Branch: `codex/asai-lv3-automation`.
- Commit/push: pending at report creation time.

## Blockers

- No new product decision or operator approval is required for this slice.
- Next theater-stage work must stay inside TDF/ITA boundaries and must not start Route B migration
  without the required migration/rollback/AiUsageLog proof.

## Next Recommended Loop

Score `lv3-previsit-to-theater-stage` against `lv3-client-to-relationship-graph`.
The strongest next slice is likely a preparation-package-to-theater setup draft handoff that reuses
confirmed/inference/unknown evidence without creating a full multi-character Theater session yet.
