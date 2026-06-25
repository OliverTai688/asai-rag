# 2026-06-25 LV3 REL-009 Relationship Graph Polish A11y Guardrails

## Scope
- Loop type: LV3 normal implementation/proof loop.
- Selected slice: REL-009 residual relationship graph polish after BFF convergence.
- Goal: make client -> relationship graph more reviewable and handoff-safe by adding canvas a11y/fallback markers, graph size metadata, duplicate posture, and theater focus-limit guardrails without schema/provider changes.

## Candidate score
- REL-009 graph polish/a11y/limit/dedup: 8.7/10. Connects client -> relationship graph -> theater handoff readiness; source/UI proofable; no schema/provider risk.
- AMM quick-note server-owned BFF/writeback boundary: 8.0/10. Important, but broader source area has prototype/untracked work and higher scope risk.
- Full cross-flow 21-command residual proof run: 7.5/10. Useful evidence, but recent loops were proof-heavy and this round needed product/source improvement.

## Changes
- `src/components/crm/RelationshipMap.tsx`
  - Added relationship graph advisor node limit and theater focus role limit constants.
  - Added graph quality summary: node count, edge count, duplicate count, size status, warnings, and screen-reader description.
  - Added `role="region"`, `aria-describedby`, `data-relationship-graph-a11y`, graph count/status attributes, and `data-theater-focus-limit`.
  - Added visible guardrail panel: graph size, list fallback, theater focus limit, and over-limit/duplicate warnings.
- `scripts/client-relationship-graph-polish-qa.mjs`
  - Added source-contract checks for a11y/fallback, guardrail panel, limits, and summary linkage.
  - Added runtime browser assertions for graph region fallback, guardrail text, theater focus limit, size status, and node-count markers.
  - Added explicit `RELATIONSHIP_GRAPH_POLISH_SOURCE_ONLY=1` fallback mode for DB/API outage.
  - Made API fetch failure report as a structured failed check instead of crashing with an undifferentiated stack trace.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - Advanced normal cadence count to 4 and set next heartbeat to fifth-loop whole-product review.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
  - Logged current DB connectivity blocker for full relationship graph browser/API proof.

## Validation
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
  - Existing unrelated warning remains in `scripts/public-status-degraded-qa.mjs` (`existsSync` unused); exit code 0.
- PARTIAL/PASS fallback: `RELATIONSHIP_GRAPH_POLISH_SOURCE_ONLY=1 DEMO_QA_BASE_URL=http://127.0.0.1:3000 pnpm client:relationship-graph-polish-qa`
  - 9/9 source/no-provider checks passed.
- FAIL full runtime proof due environment: `DEMO_QA_BASE_URL=http://127.0.0.1:3000 pnpm client:relationship-graph-polish-qa`
  - API setup failed because current dev server returns 500 for `POST /api/clients`.
  - `.next/dev/logs/next-development.log` shows Prisma cannot reach `db.wwocdcicvpmbdmqvskzi.supabase.co`.

## Evidence
- Source-contract proof confirms:
  - `data-relationship-graph-a11y`
  - `data-relationship-graph-guardrail-panel`
  - `data-theater-focus-limit`
  - `RELATIONSHIP_GRAPH_ADVISOR_NODE_LIMIT`
  - `THEATER_FOCUS_ROLE_LIMIT`
  - `aria-describedby`
  - `螢幕閱讀 fallback`
- No provider route invoked; no OpenAI/Anthropic call; no `AiUsageLog` write required.

## DB/Prisma
- No Prisma schema change.
- No Prisma generate/db push.
- Full DB-backed API/browser proof was attempted but blocked by runtime DB connectivity, so no new proof data was created in DB this loop.

## Git
- Local commit created for this loop; final response records the exact hash.
- Push skipped by user instruction.

## Blockers
- Runtime environment blocker: current localhost dev server cannot reach Supabase DB host. Rerun full proof when DB connectivity recovers:
  - `DEMO_QA_BASE_URL=http://127.0.0.1:<asai-port> pnpm client:relationship-graph-polish-qa`

## Next Recommended Loop
- Cadence is now 4 normal loops since the last whole-product review. Next heartbeat should run:
  - `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`
- In that review, first re-check DB connectivity. If recovered, rerun full relationship graph polish proof; otherwise pick a no-DB source-backed AMM/relationship/previsit bridge.
