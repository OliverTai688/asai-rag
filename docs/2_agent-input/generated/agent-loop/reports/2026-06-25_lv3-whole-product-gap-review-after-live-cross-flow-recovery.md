# 2026-06-25 LV3 whole-product gap review after live cross-flow recovery

## Scope

- Loop type: scheduled fifth-loop whole-product gap review.
- Trigger: `normalLoopsSinceLastWholeProductReview=4`; this loop used `lv3-whole-product-gap-review-loop.md`.
- Selected slice: L4/L3 architecture, experience, source-of-truth, theater immersion, QA, compliance, and NANDA readiness review.
- Source changes: none by this loop. Existing dirty source/docs were read as current workspace context but not staged by this loop.
- Provider/Prisma: no provider calls, no Prisma schema/generate/db push.

## What Changed Since Last Review

- The last four normal loops completed a client-built Route B source chain: handoff -> session source review -> advisor-visible consumption -> stage fixture -> render harness.
- Supabase DB DNS recovered in this loop. DNS preflight resolved `db.wwocdcicvpmbdmqvskzi.supabase.co` to IPv6 instead of `ENOTFOUND`.
- Full live DB-backed no-provider proof passed after using a warmed local ASAI dev server: `DEMO_QA_BASE_URL=http://127.0.0.1:3050 pnpm lv3:cross-flow-no-provider-qa` passed 21/21 commands and kept `AiUsageLog` unchanged at `182->182`.
- Direct cold-start `pnpm lv3:cross-flow-no-provider-qa` still timed out at `/api/public/status`; `pnpm public:status-qa` passed 89/89, so this is a proof-harness cold-start reliability issue, not a DB/source regression.
- Workspace dirty changes also show new Route B stage graph UI direction and quick-capture notes prototype direction. They are not committed here.

This report is not duplicate work: the previous review was blocked by DB DNS and recommended another no-DB Route B source slice. This review confirms live DB-backed flow recovery and re-ranks the next source gap.

## Recent Loop Classification

- `LV3-TDF-004j`: L2 implementation + executable L1 browser/render proof.
- `LV3-TDF-004i`: L2 implementation + executable source/fixture proof.

Anti-repetition result: scheduled review is allowed, and it adds new root-cause/evidence changes: DB recovery, full live proof pass, cold-start harness gap, and REL-007 priority.

## Six-Frame Review

1. Advisor workflow/onboarding: clean client -> graph -> preparation -> theater -> meeting context proof now passes live DB-backed no-provider proof. Remaining workflow risk is relationship graph data integrity during creation, not DB availability.
2. Source-of-truth/BFF: client/visit/meeting/theater BFFs are substantially proven. Open source gap: `POST /api/clients/[id]/family-members` parent validation and relation normalization are incomplete (`REL-007`).
3. AI reasoning/evidence: facts/inferences/unknowns, question evidence, family profile grounding, meeting reviewContext, state proposal, and no-write boundaries are well covered. Provider paths still require success/error `AiUsageLog`.
4. Theater/relationship immersion: Route B has stage map UI proof, private/group turn proof, state proposal proof, source grounding, and feedback/meeting bridges. Reconcile QA has stale marker expectations after the new `RouteBStageGraph` extraction.
5. QA/compliance/release proof: full no-provider live proof passes with warmed dev server; direct cold-start wrapper is flaky at public-status readiness. Compliance fields were not touched.
6. NANDA/AgentFacts: internal manifests and registry QA pass; AI modules remain `internal-only`, with no external publication/signing/public discovery.

## Top Gaps

| Rank | Gap | Class | Sev | Lev | Evidence | Smallest next slice |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | Family member parent/relation integrity is incomplete on create | source gap | 3 | 3 | `RES-024` N1/N2 and `PLN-024` REL-007; live graph proof passes normal paths but does not cover invalid parent/cycle create. | `REL-007`: shared POST/PATCH parent validation, relation normalization/UNKNOWN generation, dangling fallback, update `client:relationship-graph-write-qa`. |
| 2 | Full cross-flow proof direct cold-start is flaky | proof gap | 2 | 3 | Cold `pnpm lv3:cross-flow-no-provider-qa` timed out at `/api/public/status`; warmed server full proof passed. | Warm `/` or extend first public-status timeout in wrapper; keep self-runnable warmed command. |
| 3 | Theater stage-map reconcile QA has stale marker expectations | proof gap | 2 | 2 | `pnpm theater:route-b-stage-map-acceptance-reconcile-qa` fails only on old inline `aria-label` marker; `theater:route-b-session-ui-qa` passes new stage graph behavior. | Update reconcile script to inspect `RouteBStageGraph` component markers. |
| 4 | Formal `RelationshipEdge` table remains undecided | product/schema | 2 | 3 | REL-004a-g and REL-006 chain prove no-schema consumers; durable edge writes/backfill still need approval/defer. | Operator approves additive schema/migration or explicitly defers. |
| 5 | Relationship confirmation persistence remains undecided | product/schema | 2 | 3 | Transient boundary exists; refresh/new-context durability needs A/B/C. | Operator chooses A JSON subdocument, B dedicated table, or C defer. |
| 6 | `/notes` quick-capture board is local-state prototype | source-of-truth gap | 2 | 2 | Dirty `/notes` now renders local Zustand `NotesBoard`; no QuickNote BFF/persistence/Park-memory proof. | AMM/quick-capture slice: server-owned QuickNote BFF or explicitly prototype-only quarantine. |
| 7 | Route B provider runtime is still guarded/private-beta only | provider/proof | 2 | 2 | No-provider runtime and prompt context pass; live provider needs success/error `AiUsageLog` proof and enablement approval. | Provider proof with `ENABLE_ROUTE_B_THEATER_PROVIDER` only when env approved and logging evidence is captured. |
| 8 | External AgentFacts/NANDA publication remains paused | operator/protocol | 2 | 2 | Registry QA internal-only passes; user said do not publish. | Continue internal manifests; no external discovery/signing. |
| 9 | ReactFlow warning remains in live browser logs | UX/proof | 1 | 1 | Full proof logs React Flow nodeTypes/edgeTypes warning during relationship graph browser render, but assertions pass. | Memoize node/edge types as polish if touching graph UI. |
| 10 | Public launch readiness is not implied by LV3 maturity | release boundary | 2 | 2 | Payment/email/notification/provider/public launch blockers remain separate despite live private-beta proof. | Keep launch readiness gates separate from LV3 immersive maturity. |

## Top-3 Candidate Slice Scores

1. `REL-007 family-member parent/relation integrity hardening` — 9.4/10.
   - Severity 3 data integrity/authz risk; leverage 3 because it protects relationship graph truth for preparation and theater; source-backed and now unblocked by DB.
2. `LV3 cross-flow cold-start proof harness reliability` — 8.3/10.
   - Improves repeatability of release evidence, but warmed full proof already passes and product data integrity is higher risk.
3. `theater stage-map reconcile QA update` — 7.5/10.
   - Useful proof maintenance after `RouteBStageGraph`, but live UI proof already passes; not as important as relationship graph write integrity.

## Selected Next Implementation Slice

Next normal loop should select:

`REL-007 family-member parent/relation integrity hardening`

Acceptance shape:

- Add shared parent validation for family member POST/PATCH: existence, same client, self, cycle.
- Return explicit 400/404 errors for invalid `parentMemberId` and do not create dangling/cross-client edges.
- Normalize `relation` to known generation keys or mark unknown generation explicitly; do not silently treat unknown relation as same-rank.
- Render fallback for pre-existing dangling parent references without edge-to-void.
- Update `pnpm client:relationship-graph-write-qa` to cover invalid parent/cross-client/cycle/normal create.
- Preserve compliance fields, SPIN state machine, Theater enum/scoring, no provider call, and no fake `AiUsageLog`.

## Validation

- PASS: `git status --short --branch` at start.
- PASS: DB DNS preflight resolved Supabase host to IPv6.
- PASS: `pnpm public:status-qa` (89/89).
- PASS with workaround: `DEMO_QA_BASE_URL=http://127.0.0.1:3050 pnpm lv3:cross-flow-no-provider-qa` (21/21; `AiUsageLog` `182->182`).
- PASS: `LV3_CROSS_FLOW_COVERAGE=meeting-review-context-chain pnpm lv3:cross-flow-no-provider-qa`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed` (exit 0; existing warning in `scripts/public-status-degraded-qa.mjs`).
- FAIL / logged proof gap: cold-start `pnpm lv3:cross-flow-no-provider-qa` timed out at `/api/public/status`.
- FAIL / logged proof gap: `pnpm theater:route-b-stage-map-acceptance-reconcile-qa` stale marker expectation after `RouteBStageGraph`.

## DB / Prisma

- No Prisma schema/generate/validate/db push.
- Non-destructive dev/demo QA writes occurred through existing proof scripts: public lead capture, demo/test client/family/policy, visit package, quick-capture session/memory, meeting session/summary reads, and Route B session/turns.
- No production write, real email, notification, payment/refund, destructive DB operation, or remote deletion.
- No provider call was made by this review loop; `AiUsageLog` remained unchanged during the full no-provider cross-flow proof.

## NANDA Alignment

- Internal AgentFacts/registry QA remains pass.
- Active AI modules remain `internal-only`; no NANDA/third-party external publication, public discovery endpoint, credential signing, or cross-org agent access was attempted.
- Provider-capable routes are still subject to success/error `AiUsageLog` proof before enablement claims.

## Residual Evidence Handoff

The user can rerun the full proof with a warmed server:

```bash
pnpm dev --hostname 127.0.0.1 --port 3050
# in another shell after /api/public/status is reachable:
DEMO_QA_BASE_URL=http://127.0.0.1:3050 pnpm lv3:cross-flow-no-provider-qa
```

Direct cold-start wrapper reliability remains a proof gap, not a product source gap.

## Git / Push

- Local commit created after validation.
- Push: `push skipped by user instruction`.

## Next Recommended Prompt

Run the normal LV3 immersive loop and implement `REL-007 family-member parent/relation integrity hardening`, unless the operator first approves formal `RelationshipEdge` schema/migration or answers relationship confirmation persistence A/B/C.

push skipped by user instruction
