# 2026-06-20 LV3 Pre-Visit Command Center Redesign

## Scope

User-directed LV3 implementation/proof loop. Latest instruction explicitly allowed fresh web research and full interface restructuring for the pre-visit preparation package. This loop redesigns the preparation package detail surface as an insurance-advisor command center and keeps AI/provider routes, SPIN state machine, compliance fields, and DB schema unchanged.

## Candidate score

1. `lv3-previsit-to-theater-stage` / research-backed previsit command center — 19/20
   - Connects preparation package, reasoning evidence, relationship graph summary, and theater launch in one reviewable surface.
   - Matches the latest user request most directly.
   - Uses existing `buildVisitTheaterHandoff` proof path; no provider call or production write.

2. `lv3-relationship-to-previsit-package` — 17/20
   - Strong source/proof candidate, but would likely touch generation/BFF contracts and provider paths while the immediate UX bottleneck was the preparation package surface.

3. `lv3-client-to-relationship-graph` — 16/20
   - Important upstream slice, but less aligned to the explicit previsit redesign request and carries broader source/data ownership risk.

## Selected slice

Selected `lv3-previsit-to-theater-stage`: rebuild `/pre-visit/[planId]` into a preparation command center that can be reviewed manually and can hand off to `/theater/build?clientId=...&visitPlanId=...&source=previsit`.

## Research basis

- Microsoft Dynamics 365 meeting prep card emphasizes matched account/opportunity summaries, recent communications, key contacts, risks, and next follow-up actions: https://learn.microsoft.com/en-us/dynamics365/sales/view-meeting-prep-card
- Microsoft Dynamics 365 Sales AI meeting prep frames preparation as richer summaries, critical insights, and key talking points tailored to meeting context: https://www.microsoft.com/en-us/dynamics-365/blog/business-leader/2025/10/29/maximize-every-moment-with-ai-meeting-prep-for-sales/
- Salesforce financial-services meeting prep notes that relationship managers review emails, call notes, and past conversations; AI summaries consolidate recent interactions into concise overviews: https://www.salesforce.com/financial-services/client-meeting-prep/
- HubSpot Sales Workspace gates meeting prep on CRM/contact context, reinforcing that prep should remain anchored to actual CRM relationships: https://knowledge.hubspot.com/prospecting/create-and-manage-your-sales-workspace
- HubSpot discovery guidance emphasizes open-ended questions across pain, process, goals, qualification, disqualification, and next steps: https://blog.hubspot.com/sales/discovery-questions

## Changes

- Replaced the pre-visit detail accordion-first layout with a low-noise command center:
  - black mission brief with objective, success criteria, first question, and next step
  - theater launch panel with readiness, NPC count, unknown count, missing items, and direct launch CTA
  - compact readiness metrics for completeness, relationship nodes, evidence, and materials
  - relationship graph summary showing client occupation, annual income, KYC status, tags, and key family nodes
  - SPIN question runway with visible reasoning summary and evidence labels
  - evidence board grouped by confirmed / inference / unknown
  - objection, material, timing, and notes panels
- Preserved Quickstart flow and existing `/api/ai/visit` generation behavior.
- Added previsit screenshots under `docs/06_audits-and-reports/screenshots/lv3-previsit/`.
- Updated loop cadence and next-slice recommendation in `loop-state.json`.

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm exec eslint 'src/app/(dashboard)/pre-visit/[planId]/page.tsx'`
- PASS `pnpm visit:theater-handoff-dry-run`
- PASS `pnpm visit:reasoning-dry-run`
- PASS browser proof via `playwright-core` + local dev auth header:
  - visible checks: command center, relationship summary, evidence board, question runway, theater launch panel, and theater CTA all present
  - desktop horizontal overflow: false
  - mobile horizontal overflow: false
  - console errors: 0
  - theater CTA navigated to `/theater/build?clientId=c_wang&visitPlanId=...&source=previsit&demo=quickstart`

`pnpm lint:changed` is run after report/state updates in the final engineering gate.

## Evidence

- Desktop screenshot: `docs/06_audits-and-reports/screenshots/lv3-previsit/2026-06-20-previsit-command-center-desktop.png`
- Mobile screenshot: `docs/06_audits-and-reports/screenshots/lv3-previsit/2026-06-20-previsit-command-center-mobile.png`
- No-provider proof: this UI slice did not call OpenAI/Anthropic. Existing `/api/ai/visit` was not modified; Quickstart browser proof used local fixture data.

## DB/Prisma

- No Prisma schema change.
- No Prisma generate / validate required.
- No DB write, db push, migration, seed, email, notification, payment, or remote deletion.

## Git

- Branch: `codex/asai-lv3-automation`
- Push policy: `push skipped by user instruction`
- Commit pending final validation.

## Blockers

- Remaining product blocker: `/theater/build` currently receives `visitPlanId` in URL but does not yet load the exact preparation package server-side from a BFF contract. Current proof still gives a safe launch path via `clientId` and UI handoff preview.
- No operator approval blocker in this slice.

## Next Recommended Loop

Build a BFF-backed `/theater/build` `visitPlanId` handoff so the stage draft reads the exact preparation package, relationship evidence, objections, and unknowns server-side without relying on client-only Zustand state. If upstream source ownership is preferred first, switch to `lv3-client-to-relationship-graph`.
