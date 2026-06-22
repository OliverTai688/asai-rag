# 2026-06-22 LV3 Visit Theater Evidence Summary Contract

## Scope

- Loop type: normal LV3 implementation/proof loop, not fifth-loop review.
- Task level: L2 source contract + executable L1 proof.
- Selected slice: `Visit -> Theater evidence summary contract`.
- Goal: keep development moving while AMM-005c runtime proof is blocked, by strengthening the no-DB/no-provider contract that connects relationship/preparation reasoning into the theater stage packet.

## Anti-Repetition Gate

- Last loop: L4 blocker analysis for repeated AMM-005c DB/DNS `ENOTFOUND`.
- Previous loop: L1 executable no-DB AMM-005c contract fallback.
- This loop is not another documentation/proof-plan loop. It changes domain source, strengthens the executable dry-run, and updates internal AgentFacts proof metadata.

## Candidate Score

1. `Visit -> Theater evidence summary contract` - 91/100.
   - Changes domain source and executable proof without DB/provider dependency.
   - Connects relationship graph, visit preparation reasoning, and theater stage handoff.
   - Improves fact/inference/unknown traceability before Route B consumes the stage packet.
2. `Role-aware / navigation source fallback` - 78/100.
   - Safe and source-backed, but less directly tied to the LV3 immersive advisor flow.
   - Most RAS work is already complete.
3. `Retry AMM-005c runtime proof` - 18/100.
   - Still blocked by DB DNS `ENOTFOUND`.
   - Would repeat the same partial evidence loop.

## Changes

- `VisitTheaterHandoff.sourceSummary` now includes:
  - `questionEvidenceByStatus` for confirmed / inference / unknown question evidence.
  - `questionEvidenceSources` for relationship graph, policy, AI tag, unknown, client profile, and visit purpose provenance.
  - `theaterMaterialCounts` for fact / inference / unknown materials handed to the theater builder.
- `pnpm visit:theater-handoff-dry-run` now verifies:
  - relationship question evidence reaches theater relationships.
  - need-payoff unknown reasoning stays unknown in the theater packet.
  - inference signals such as education-fund gaps do not become confirmed facts.
  - high-sensitive clients remain blocked without reason/riskAccepted.
  - private email/phone sentinels are not emitted.
- `asai.visit.preparation_package` internal AgentFacts-style manifest now lists the visit-theater handoff source ref, evidence summary DTO, and proof command.

## Validation

- PASS `pnpm visit:theater-handoff-dry-run`.
- PASS `pnpm visit:reasoning-dry-run`.
- PASS `pnpm theater:route-b-handoff-dry-run`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.
- PASS `git diff --check` on this loop's changed files.

## Evidence

- Targeted dry-run output showed:
  - `questionEvidenceByStatus`: confirmed 6, inference 5, unknown 1.
  - `questionEvidenceSources`: ai_tag, client_profile, policy, relationship_graph, unknown, visit_purpose.
  - `theaterMaterialCounts`: facts 18, inferences 13, unknowns 4.
  - high-sensitive without approval: `BLOCKED_SENSITIVE`.
  - high-sensitive with reason/riskAccepted: `READY`.
- DNS check still returns `ENOTFOUND` for `db.wwocdcicvpmbdmqvskzi.supabase.co`; AMM-005c runtime proof was not retried as a completion claim.

## DB/Prisma

- No Prisma schema change.
- No Prisma generate/validate/db push.
- No DB write, no production write, no destructive operation.

## NANDA Alignment

- Touched agent-like workflow: `asai.visit.preparation_package`.
- Owner surface: `/pre-visit` and Visit -> Theater handoff into Route B stage creation.
- Capabilities/actions touched: question rationale evidence and visit-to-theater stage handoff proof.
- DTO boundary: `VisitTheaterHandoff.sourceSummary.evidenceSummary`.
- Auth/session/data classes: no runtime session or persisted data changed; source contract carries client facts, inferences, unknowns, and high-sensitivity approval state only.
- Quota/cost/AiUsageLog: no provider call; no `AiUsageLog` required. Provider-ready visit generation remains success/error logged through existing route policy.
- Registry readiness: still `internal-only`; no external NANDA/third-party publication, signing, public discovery, or cross-org access.

## Git

- Local commit required after validation.
- Push remains paused: `push skipped by user instruction`.

## Blockers

- Environment/DB: AMM-005c Browser/API/DB proof still needs a resolvable development/staging DB URL.
- Production approval: none introduced.
- Product decision: none introduced.

## Next Recommended Loop

- Cadence counter is now 4, so the next heartbeat should run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`.
- The review should include this new Visit -> Theater evidence summary contract and the still-open AMM-005c DB/DNS blocker.
- If DB DNS is fixed after the review, the self-runnable residual command remains:

```bash
DEMO_QA_BASE_URL=http://localhost:<dev-port> pnpm meeting:notes-compat-qa
```

push skipped by user instruction
