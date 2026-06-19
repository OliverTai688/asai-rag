# 2026-06-20 LV3 Theater Sensitive Gate

## Scope

ASAI LV3 immersive loop, normal implementation loop 2 after the 2026-06-20 whole-product review. This round focused on persisted pre-visit package -> theater build gate. It does not claim public launch Level 3 readiness.

## Candidate score

1. TDF-004a persisted visit package -> theater build gate: 17/20. Connects preparation package to theater, adds source review and high-sensitive approval proof, and reduces compliance risk with no provider dependency.
2. BFF-103a CRM relationship graph metadata/writeback: 13/20. Strengthens client -> relationship graph input quality, but less immediate than closing the theater gate after previsit persistence.
3. PIM writeback -> VisitPlan/TheaterBuildDraft: 12/20. Important for interview -> workspace creation, but should reuse the now-proven theater gate rather than run first.

## Selected slice

TDF-004a persisted visit package -> theater build high-sensitive gate.

## Changes

- Added `POST /api/visits/[id]/theater-handoff` for high-sensitive approval. It requires `riskAccepted=true` and a reason of at least 8 characters, then writes an `InteractionEvent` audit with metadata source `visit_theater_handoff_approval`.
- Kept `GET /api/visits/[id]/theater-handoff` read-only and shared the same handoff builder for GET/POST.
- Added a source review panel to `/theater/build?visitPlanId=...&source=previsit`, including source counts, known facts, inferences, unknowns, warnings, and high-sensitive approval controls.
- Added `pnpm visit:theater-gate-qa` to prove API and browser behavior.
- Updated loop state, TDF docs, and issue-question notes.

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `pnpm exec eslint scripts/visit-theater-gate-qa.mjs 'src/app/api/visits/[id]/theater-handoff/route.ts' 'src/app/(dashboard)/theater/build/page.tsx'`
- PASS `DEMO_QA_BASE_URL=http://localhost:3001 pnpm visit:theater-gate-qa`

## Evidence

- API proof covered unauth 401, high-sensitive blocked handoff, invalid approval 400, approved READY handoff, audit write, no email/phone sentinel, no raw private sentinel, and no-provider proof.
- Browser proof covered source review panel, high-sensitive gate, approval action, no raw visit ID in page body, desktop/mobile no horizontal overflow, and fact/inference/unknown review after approval.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-theater-gate/2026-06-20-theater-gate-approved-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-theater-gate/2026-06-20-theater-gate-approved-mobile.png`

## DB/Prisma

- No Prisma schema change, no `prisma:generate`, no `prisma db push`.
- QA created a demo/test client, family member, and visit through local dev APIs, then updated that newly created test client to `HIGHLY_SENSITIVE` for gate proof.
- Approved handoff wrote a non-destructive `InteractionEvent` audit record.
- No production write, no destructive DB operation, no provider call, no AiUsageLog required.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 6]`
- Commit pending at report write time.
- Push: `push skipped by user instruction`.

## Blockers

- Remaining TDF-004 blockers: `/theater` still needs a client selector without raw-ID workflow, manager/member 403 proof, and full owner-readable client-data build review.
- Production build remains separately blocked by the known Next/Turbopack Google Font path issue in `issue-question.md`.

## Next Recommended Loop

TDF-004b Theater client selector + owner-scoped client data build review. Build `/theater` selection/review entry, prove org manager cannot read member client detail, and preserve the high-sensitive gate added in this round.
