# 2026-06-20 LV3 Relationship Graph Layout / Interaction Polish

## Scope

- Loop type: normal LV3 implementation / proof loop.
- Selected slice: `REL-005 relationship graph layout/interaction polish`.
- LV3 connection: client profile -> relationship graph -> preparation package question handoff / theater readiness proof.
- Out of scope: REL-004 schema edge table, production migration, SPIN state machine, Theater Route B migration, provider calls.

## Candidate Score

1. `REL-005 relationship graph layout/interaction polish` — 20/25.
   - Strong continuity from REL-001/002/003, connects client -> relationship graph -> previsit/theater readiness, low schema/provider risk, directly improves ease of operation.
2. `BFF-202 Visit / report AI hardening` — 19/25.
   - Strong next fit for the user's previsit package direction, but provider success/error proof is higher cost and should follow after relationship graph source proof is stable.
3. `BFF-203 SPIN AI hardening` — 18/25.
   - Important for AI 了解客戶, but touches protected SPIN state-machine-adjacent routes and is less directly tied to this loop's relationship graph continuity.

## Changes

- `src/components/crm/RelationshipMap.tsx`
  - Relationship nodes are now keyboard-focusable `role=group` elements.
  - Node toolbar appears on selection or keyboard focus.
  - Add-parent/add-child actions now have `aria-label`, native `title` tooltip, visible focus ring classes, and reduced-motion-friendly transitions.
  - Same-rank layout spacing is deterministic for spouse, sibling, and social ties.
  - Graph shell and legend were reduced to hairline/no-shadow styling and graph/canvas labels were added.
- `scripts/client-relationship-graph-polish-qa.mjs`
  - New deterministic QA script creating empty, single-parent, and complex relationship clients via BFF.
  - Covers API edge types, preparation package suggested questions, theater readiness, desktop/mobile/reduced-motion/dark browser states, toolbar accessibility, overflow, and private sentinel boundaries.
- `package.json`
  - Added `pnpm client:relationship-graph-polish-qa`.
- `AGENTS.md`, `PLN-024`, `loop-state.json`, `issue-question.md`
  - REL-005 marked complete, no-schema REL status clarified, next loop recommendation moved to BFF-202.

## Validation

- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.
- `node --check scripts/client-relationship-graph-polish-qa.mjs`: pass.
- `git diff --check`: pass.
- `DEMO_QA_BASE_URL=http://localhost:3028 pnpm client:relationship-graph-polish-qa`: pass.
- `DEMO_QA_BASE_URL=http://localhost:3028 pnpm client:relationship-graph-qa`: pass.
- `DEMO_QA_BASE_URL=http://localhost:3028 pnpm client:relationship-graph-write-qa`: pass.

## Evidence

- New REL-005 screenshots:
  - `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/2026-06-20-relationship-graph-empty-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/2026-06-20-relationship-graph-single-parent-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/2026-06-20-relationship-graph-complex-desktop.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/2026-06-20-relationship-graph-complex-mobile.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/2026-06-20-relationship-graph-complex-reduced-motion.png`
  - `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/2026-06-20-relationship-graph-complex-dark.png`
- Regression screenshots refreshed by existing relationship graph QA/write QA under:
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph/`
  - `docs/06_audits-and-reports/screenshots/lv3-relationship-graph-write/`

## DB / Prisma

- Prisma schema: not changed.
- Prisma commands / migration / db push: not run.
- DB writes: non-destructive demo/test proof only via existing BFF routes (`POST /api/clients`, `POST /family-members`, existing relationship graph QA policy write).
- Provider calls: none. Proof scripts are deterministic BFF/browser checks; no `AiUsageLog` required beyond explicit no-provider proof.

## Git

- Local commit will be created after this report is staged.
- Push: `push skipped by user instruction`.

## Blockers

- REL-004 remains blocked by schema migration/rollback approval for a formal `RelationshipEdge` table.
- Production build blocker remains unrelated: Next/Turbopack Google Font path issue noted in `issue-question.md`.

## Next Recommended Loop

- `BFF-202 Visit / report AI hardening`: keep the redesigned previsit package UI and persisted VisitPlan BFF intact, then harden `/api/ai/visit` and `/api/ai/report` with current-member scope, quota/capability guard, success/error `AiUsageLog` proof, and facts/inferences/unknowns/recommendations DTO boundaries.
