# 2026-06-20 LV3 VisitPlan Theater BFF Handoff

## Scope

Normal LV3 implementation/proof loop. This loop completes a narrow persisted `VisitPlan` -> theater build handoff slice. It does not claim full BFF-104 Visit / Pre-visit BFF completion and does not claim TDF-004 full customer-data build completion.

## Candidate score

1. `lv3-previsit-to-theater-stage` / persisted `visitPlanId` theater BFF handoff — 26
   - +7 connects preparation package to theater.
   - +6 moves a critical path from client-only/Zustand handoff toward DB/BFF-owned behavior for persisted visit plans.
   - +6 reduces privacy/compliance risk by deriving session/org/member scope server-side and not returning email/phone/raw private sentinels.
   - +4 adds API/browser proof for the LV3-critical path.
   - +3 updates docs/report so the next loop can safely continue.

2. BFF-104 full Visit / Pre-visit BFF — 22
   - Stronger long-term path, but too broad for one loop because list/detail/create/update/notes/generation persistence would touch several routes and UI flows.

3. `lv3-client-to-relationship-graph` — 16
   - Important upstream source slice, but the immediate blocker after the command-center redesign was package -> theater server ownership.

## Selected slice

Selected `lv3-previsit-to-theater-stage`: add a member-scoped API that reads a persisted DB `VisitPlan` and builds a theater handoff packet, then let `/theater/build?visitPlanId=...` prioritize that server-owned handoff before falling back to legacy `clientId` materials.

## Changes

- Added `src/lib/visits/visit-plan-repository.ts`.
  - Reads DB `VisitPlan` with client, family, policies, and compliance data.
  - Uses `requireCurrentMember()` caller context via repository caller and `canReadClientDetail()` policy.
  - Converts DB JSON fields into domain `VisitPlan`, including compatibility for demo seed string arrays.
- Added `GET /api/visits/[id]/theater-handoff`.
  - Returns client-safe summary, visit source counts, known materials, warnings/missing items, and `TheaterBuildPacket`.
  - Does not return email/phone and does not expose raw prompt/provider/cookie/secret/token payloads.
- Updated `/theater/build` to:
  - read `visitPlanId` first;
  - seed materials from persisted visit handoff;
  - show a small handoff status notice;
  - keep the existing `clientId` fallback for local/Quickstart flows.
- Added `pnpm visit:theater-bff-qa`.
- Updated `AGENTS.md`, `PLN-020`, and `loop-state.json`.

## Validation

- PASS `pnpm exec eslint 'src/lib/visits/visit-plan-repository.ts' 'src/app/api/visits/[id]/theater-handoff/route.ts' 'src/app/(dashboard)/theater/build/page.tsx'`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `DEMO_QA_BASE_URL=http://localhost:3001 pnpm visit:theater-bff-qa`
  - unauth handoff: 401 `UNAUTHENTICATED`
  - missing visit plan: 404 `VISIT_PLAN_NOT_FOUND`
  - demo persisted visit plan: 200
  - handoff status: `READY`
  - knownMaterials: 21
  - NPC count: 3
  - email/phone sentinel: 0
  - raw private sentinel: 0
  - browser title / handoff notice / client name / visit intro visible
  - raw visit plan id not visible in UI
  - desktop/mobile horizontal overflow: false
  - console errors: 0

Final `pnpm lint:changed` is run after docs/report updates in the engineering closeout gate.

## Evidence

- QA command: `DEMO_QA_BASE_URL=http://localhost:3001 pnpm visit:theater-bff-qa`
- Desktop screenshot: `docs/06_audits-and-reports/screenshots/lv3-visit-theater-bff/2026-06-20-theater-build-visit-handoff-desktop.png`
- Mobile screenshot: `docs/06_audits-and-reports/screenshots/lv3-visit-theater-bff/2026-06-20-theater-build-visit-handoff-mobile.png`
- No-provider proof: no OpenAI/Anthropic call was added or executed by this slice. The new API is deterministic and uses persisted DB `VisitPlan` + client data.

## DB/Prisma

- Prisma schema changed: no.
- Prisma validate/generate/db push: not required.
- DB operation during proof: read-only API proof against existing demo seeded `VisitPlan`.
- No production write, email, notification, payment, refund, migration, remote deletion, or destructive DB operation.

## Git

- Branch: `codex/asai-lv3-automation`
- Push policy: `push skipped by user instruction`
- Commit pending final validation.

## Blockers

- Source/product blocker: full BFF-104 remains incomplete. `/pre-visit` list/detail/create/update/notes still need BFF/cache-first migration.
- Product blocker: TDF-004 remains incomplete because the full `/theater` customer-data build flow still lacks client selector, high-sensitivity reason/riskAccepted UI, and complete setup draft review.
- Cadence: `normalLoopsSinceLastWholeProductReview` is now 4, so the next automation turn should run the whole-product gap review prompt.

## Next Recommended Loop

Run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md` next. After that review, likely continuation is either BFF-104 full Visit / Pre-visit BFF or TDF-004 full client-data build flow.
