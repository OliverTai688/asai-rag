# LV3 Whole Product Gap Review — After Route B Source Proof / Edge Persistence Source

Date: 2026-06-25T15:37:20Z  
Loop type: scheduled fifth-loop whole-product review  
Prompt: `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`  
Push: skipped by user instruction

## Scope

Reviewed the ASAI LV3 target flow after four normal proof/implementation loops:

`new client -> relationship graph -> preparation package -> questions/evidence -> theater stage -> private/group theater + person state -> AI interview/meeting writeback`

This review did not change product source code. It updates loop state, issue-question, and this report. The review is not a duplicate of the prior DB-regression review because the worktree now contains formal `RelationshipEdge` schema/repository/API/QA source and the relationship graph owner docs have advanced from "schema approval blocker" to "live HTTP proof still missing".

## Last Two Loops

- `2026-06-25_lv3-quick-note-bridge-session-source-type-render.md`: L2/L1 source-backed render model and QA proof.
- `2026-06-25_lv3-route-b-meeting-source-browser-harness.md`: L1 executable browser proof for desktop/mobile Route B meeting-signal source affordance.

Anti-repetition: this review is cadence-required. It does not repeat the Route B source propagation proof; it reranks the whole product after those proofs and redirects the next normal loop to the formal relationship edge persistence path.

## What Changed Since Last Review

- Resolved/advanced: AMM quick-note bridge now reaches visit signal deck, theater handoff/source review, Route B session source-type render model, and desktop/mobile browser harness proof.
- Changed: formal `RelationshipEdge` persistence is no longer merely theoretical. Dirty worktree source now includes Prisma model/enums, repository, API route, package script, and QA script. `ACC-016` D1 marks schema/repository/backfill/db-layer proof mostly complete.
- Still blocked: DB DNS preflight still returns `ENOTFOUND`; full live DB-backed graph/cross-flow proof cannot be claimed.
- New proof transition: `pnpm client:relationship-edge-shadow-qa` now fails because it correctly expects no formal `RelationshipEdge` schema, but the formal schema exists. The proof path must move from shadow/no-schema QA to formal edge persistence QA.

## Six-Frame Review

1. Advisor workflow / onboarding
   - Main gap: the advisor can see richer Route B source continuity, but the first graph workflow still lacks current live HTTP proof for durable formal relationship edges.
2. Source-of-truth / BFF
   - Main gap: formal `RelationshipEdge` server source exists but is uncommitted/dirty and not yet proven through live HTTP; shadow/no-schema QA is now obsolete for this branch state.
3. AI reasoning / evidence
   - Main gap: meeting/quick-note evidence is now visible and least-disclosure through Route B, but relationship-confirmation state is still deterministic preview/review unless a durable writeback policy is accepted.
4. Theater / relationship immersion
   - Main gap: theater stage grounding is strong for source reviews, yet durable relationship changes remain proposal/preview until formal edge and confirmation write policies are finalized.
5. QA / compliance / release proof
   - Main gap: DB DNS `ENOTFOUND` blocks live HTTP/DB proof; `pnpm client:relationship-edge-shadow-qa` failure shows a stale acceptance command rather than a product regression.
6. NANDA / AgentFacts protocol
   - Main gap: all AI modules remain internally describable and `internal-only`; external publication/signing/discovery is still intentionally blocked by operator policy.

## Top Gaps

1. Formal `RelationshipEdge` persistence proof convergence
   - Severity 2 / Leverage 3.
   - Type: source/proof gap.
   - Evidence: dirty source exists; `pnpm prisma:validate` passes; `ACC-016` D1 live HTTP proof remains unchecked; shadow QA fails because formal schema is present.
   - Next slice: isolate current formal edge source and run `client:relationship-edge-persistence-qa` if DB/dev server recovers; otherwise add/run a source-only formal edge route/repository QA fallback.

2. Runtime DB DNS/connectivity blocker
   - Severity 3 / Leverage 3.
   - Type: operator/environment gap.
   - Evidence: `db.wwocdcicvpmbdmqvskzi.supabase.co` DNS lookup returns `ENOTFOUND`.
   - Next slice: re-check before any live DB proof; if recovered, rerun formal edge HTTP proof and `lv3:cross-flow-no-provider-qa`.

3. Relationship confirmation durable policy
   - Severity 2 / Leverage 3.
   - Type: product decision / schema policy gap.
   - Evidence: visit/theater/meeting writeback cards remain guarded and no confirmed CRM fact writes are claimed.
   - Next slice: after formal edge proof, decide or explicitly defer relationship confirmation persistence target.

4. Dirty worktree adoption boundary
   - Severity 2 / Leverage 2.
   - Type: source hygiene / review risk.
   - Evidence: unrelated dirty docs/schema/UI/screenshots and untracked AMM notes prototype coexist with the formal edge files.
   - Next slice: stage only REL-004 files when adopting edge persistence; do not accidentally stage notes prototype or unrelated UI/docs.

5. Full live graph -> prep -> theater proof freshness
   - Severity 2 / Leverage 3.
   - Type: proof gap.
   - Evidence: source pieces are strong, but current full live evidence cannot be refreshed while DB DNS fails.
   - Next slice: rerun after formal edge source is validated and DB recovers.

6. AMM notes prototype vs accepted source
   - Severity 2 / Leverage 2.
   - Type: source-of-truth gap.
   - Evidence: accepted `/pre-visit/[planId]/notes` and `CLIENT_MEETING` boundaries exist; untracked local notes prototype must not become truth source without an AMM-owned BFF/writeback slice.
   - Next slice: keep prototype quarantined unless selected explicitly.

7. Route B provider-backed runtime
   - Severity 2 / Leverage 2.
   - Type: provider/env proof gap.
   - Evidence: deterministic/provider-disabled paths are strong; live provider success/error still needs `AiUsageLog` proof under approved env.
   - Next slice: defer until provider proof is the selected slice.

8. Public launch readiness
   - Severity 2 / Leverage 2.
   - Type: production approval gap.
   - Evidence: LV3 maturity is not public launch readiness; payment/email/notification/provider/public registry gates remain separate.
   - Next slice: keep release readiness gates distinct from LV3 loop claims.

## Candidate Score

1. REL-004 formal RelationshipEdge persistence proof convergence — 8.8/10.
   - Source exists and owner docs moved forward; one focused loop can turn dirty source into reviewable proof or a precise DB-blocked fallback.
2. Full DB-backed graph/cross-flow rerun — 8.5/10 if DB recovers; currently blocked by DNS `ENOTFOUND`.
3. Relationship confirmation durable persistence policy — 8.0/10; high leverage but should follow formal edge proof or explicit product decision.

Selected review conclusion: next normal loop should do REL-004 formal RelationshipEdge persistence proof convergence.

## Validation

- PASS `git status --short --branch` at start.
- PASS DB DNS blocker proof: `DNS_FAIL ENOTFOUND`.
- PASS `pnpm prisma:validate`.
- PASS `pnpm ai:protocol-registry-qa` — 11 agents, all `internal-only`.
- PASS `pnpm ai:protocol-readiness-qa` — HTTP API proof skipped because `DEMO_QA_BASE_URL` not set.
- FAIL (expected transition signal) `pnpm client:relationship-edge-shadow-qa` — fails with `REL-004a must not add RelationshipEdge Prisma schema` because the formal schema now exists in the dirty worktree. This is not a regression in shadow logic; it means the next proof path must become formal edge persistence.
- PASS `git diff --check`.
- PASS loop-state JSON parse.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed` with 0 errors and 1 pre-existing unrelated warning in `scripts/public-status-degraded-qa.mjs`.

## DB / Prisma

- No DB write/read by this review loop.
- No Prisma db push/generate by this review loop.
- `pnpm prisma:validate` was run because formal edge schema is present in the current worktree; it passed.
- Runtime DB DNS remains unavailable: `ENOTFOUND`.

## NANDA Alignment

- Active AI modules reviewed: `asai.chat.assistant`, `asai.interview.companion`, `asai.interview.quick_capture`, `asai.interview.realtime_voice`, `asai.spin.advisor`, `asai.visit.preparation_package`, `asai.theater.route_b`, `asai.meeting.prototype`, and related registry projections.
- `pnpm ai:protocol-registry-qa` and `pnpm ai:protocol-readiness-qa` pass.
- All 11 agents remain `internal-only`.
- No external NANDA/third-party registry publication, public discovery endpoint, signing, revocation, or cross-org access was attempted.

## Changes

- Updated `docs/2_agent-input/generated/agent-loop/loop-state.json`.
- Updated `docs/2_agent-input/generated/agent-loop/issue-question.md`.
- Added this review report.

## Residual Evidence Delegated

When DB DNS/dev server are healthy, run:

1. `DEMO_QA_BASE_URL=http://127.0.0.1:<asai-port> pnpm client:relationship-edge-persistence-qa`
2. `DEMO_QA_BASE_URL=http://127.0.0.1:<asai-port> pnpm lv3:cross-flow-no-provider-qa`

Do not claim those proofs until they pass in the current environment.

## Next Recommended Loop

Run the normal LV3 immersive loop and select:

`REL-004 formal RelationshipEdge persistence proof convergence`

Implementation/proof rules:

- Isolate only the formal edge files already in the dirty worktree.
- Re-check DB DNS first.
- If DB/server works, run the live HTTP QA command.
- If DB remains `ENOTFOUND`, add or run a source-only formal edge route/repository QA that proves authz scope, metadata allowlist, no email/phone/policy/provider/private sentinel, no provider call, and no confirmed CRM fact write.
- Do not keep running obsolete shadow/no-schema QA as the main proof once formal schema is present.
- Do not stage unrelated dirty files.

push skipped by user instruction
