# 2026-06-25 LV3 Cross-flow Harness Hardening

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Cadence: `normalLoopsSinceLastWholeProductReview` 2 -> 3.
- Selected slice: LV3 proof harness base-url/cold-start hardening.
- Goal: make `pnpm lv3:cross-flow-no-provider-qa` verify the correct ASAI app before proof execution, avoid wrong-app `localhost:3000` and cold-start false failures, and keep no-provider `AiUsageLog` unchanged proof explicit.

## Strategic Review

- Recent loop 1: TDF Route B stage graph reconciliation, source/proof.
- Recent loop 2: AMM notes hub quarantine boundary, source/proof.
- Recent loop 3: whole-product review after relationship BFF convergence.
- Current bottleneck: live DB proof recovered, but cross-flow wrapper could still fail or hit the wrong dev server during cold start.
- Anti-repetition: this is executable QA source and runtime proof hardening, not docs-only evidence. Next loop should return to product source/UI work rather than another proof-harness slice.

## Candidate Score

1. LV3 proof harness base-url/cold-start hardening - 8.9/10. Directly resolves a repeated evidence reliability blocker across client -> relationship graph -> preparation -> theater proof packs, without provider calls or schema work.
2. Relationship graph residual polish - 8.2/10. Valuable product/source polish after BFF convergence, but lower priority while the proof wrapper could still produce false failures.
3. AMM quick-note server-owned BFF/writeback boundary - 7.8/10. Important next AMM step, but larger product/schema-adjacent surface and less directly tied to the current open blocker.

## Changes

- Updated `scripts/lv3-cross-flow-no-provider-qa.mjs`.
  - Default base URL now uses `http://127.0.0.1:3085` unless `DEMO_QA_BASE_URL` or `LV3_CROSS_FLOW_BASE_URL` is explicit.
  - Added ASAI public-status signature verification for `version=asai.public_status.v1` plus public status DTO keys.
  - Added root warmup before proof execution.
  - Added existing ASAI dev-server discovery for `127.0.0.1:3000` / `localhost:3000` before spawning another `next dev`.
  - Added occupied wrong-app default-port handling and explicit wrong-base fail-fast.
  - Added `LV3_CROSS_FLOW_PREFLIGHT_ONLY=true` for lightweight runtime proof of base URL, warmup, public status, and `AiUsageLog` unchanged.
- Added `scripts/lv3-cross-flow-harness-qa.mjs` as a static executable proof for the harness contract.
- Updated `issue-question.md` to resolve the cold-start proof-harness blocker.
- Updated `loop-state.json` with cadence 3 and next slice recommendation.

## Validation

- PASS `node --check scripts/lv3-cross-flow-no-provider-qa.mjs`
- PASS `node --check scripts/lv3-cross-flow-harness-qa.mjs`
- PASS `node scripts/lv3-cross-flow-harness-qa.mjs` - 8/8 checks.
- PASS `LV3_CROSS_FLOW_PREFLIGHT_ONLY=true pnpm lv3:cross-flow-no-provider-qa`
  - Reused existing ASAI dev server: `http://127.0.0.1:3085 -> http://127.0.0.1:3000`.
  - Warmed `/`, verified `/api/public/status`, and kept `AiUsageLog` 184->184.
- PASS `LV3_CROSS_FLOW_COVERAGE=meeting-review-context-chain pnpm lv3:cross-flow-no-provider-qa`
  - Selected 7/21 commands, passed 7/7 meeting reviewContext chain.
  - Kept `AiUsageLog` 184->184.
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
  - Existing warning only: `scripts/public-status-degraded-qa.mjs` unused `existsSync`; no error and not introduced by this loop.
- PASS `git diff --check`

Observed/fixed edge: first runtime attempt after moving default port to 3085 exposed that Next 16 refuses a second `next dev` in the same repo when another dev server is already running at 3000. The harness now discovers and reuses the existing ASAI dev server when its public-status signature matches.

## Evidence

- Preflight runtime proof:
  - `PASS existing ASAI dev server discovered before spawning new proof server`
  - `PASS ASAI app root warmup attempted before proof pack`
  - `PASS ASAI public status signature verified after warmup`
  - `PASS proof pack writes no new AiUsageLog - 184->184`
- Filtered chain proof:
  - `PASS meeting reviewContext cross-flow chain covered - 7/7 proof commands passed`
  - `PASS AgentFacts/protocol boundary covered - 2/2 selected proof commands passed`
  - `PASS LV3 cross-flow proof pack completed - 7/21 proof commands passed`
- Self-runnable residual evidence:
  - `DEMO_QA_BASE_URL=http://127.0.0.1:<free-port> pnpm lv3:cross-flow-no-provider-qa`

## DB/Prisma

- Prisma/schema: none.
- DB writes: none.
- Provider calls: none.
- `AiUsageLog`: read-only count checks only; unchanged 184->184 in preflight and filtered proof.

## NANDA Alignment

- No external NANDA / third-party registry publication.
- No manifest status was upgraded.
- The filtered proof reran `pnpm ai:protocol-registry-qa` and `pnpm ai:bff-audit`, confirming internal-only AgentFacts/protocol boundary posture remains covered.
- This loop strengthens the reliability of the internal cross-flow proof pack used to verify AI module boundaries without exposing raw prompts, private transcript, provider payload, or secret material.

## Git

- Branch: `codex/asai-lv3-automation`.
- Commit: pending at report write time.
- Push: push skipped by user instruction.

## Blockers

- Public launch readiness is still not claimed by this LV3 loop.
- Full 21-command cross-flow proof remains self-runnable residual evidence, not rerun in full this loop to keep the slice narrow.
- Pre-existing unrelated dirty worktree remains and was not staged.

## Next Recommended Loop

Run a product/source slice instead of another proof-harness loop:

`REL-010 relationship graph residual polish`: add graph size/dedup guard plus keyboard/a11y/source-marker polish after BFF convergence, with targeted source/browser proof and no schema/provider calls. Fallback: AMM quick-note server-owned BFF/writeback boundary if relationship graph polish is already covered elsewhere.
