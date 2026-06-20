# 2026-06-21 LV3 NAP-004 Platform AI Protocol Readiness Loop

## Scope

- Automation loop: ASAI LV3 immersive advisor-system.
- Loop type: implementation/proof slice, not fifth-loop whole-product review.
- Selected slice: `NAP-004 Internal registry and readiness API`.
- User push policy: local commit only; `push skipped by user instruction`.

## Candidate score

1. `NAP-004 platform-only internal registry reader/readiness API` — 94/100. Turns NAP-002 manifests into platform-readable source/API proof, connects AI registry readiness to release readiness, and stays inside no-provider/no-publication safety bounds.
2. `NAP-003 per-AI source alignment/adoption` — 86/100. Important next source hardening, but lower immediate proof value than making the registry visible through a protected platform surface.
3. `ITA-003g Route B provider/runtime preflight` — 82/100. High theater payoff, but live provider proof still needs explicit operator approval; guarded-disabled proof is less connected to the current NAP chain.

## Selected slice

Built a platform-only internal AI protocol readiness reader and API so ASAI can inspect all AI module manifests, readiness states, blockers, proof commands, and least-disclosure safety boundaries without claiming external NANDA compatibility or exposing private payloads.

## Changes

- Added `src/domains/ai-protocol/registry.ts` with `getAgentProtocolRegistryReadiness()`.
- Exported the registry reader from `src/domains/ai-protocol/index.ts`.
- Added `src/app/api/platform/ai-protocol/registry/route.ts`.
- Added `aiProtocol` projection to `src/lib/platform/platform-release-readiness-repository.ts`.
- Added `scripts/ai-protocol-readiness-qa.mjs` and `pnpm ai:protocol-readiness-qa`.
- Updated `AGENTS.md` NAP workstream status and `loop-state.json` cadence/next recommendation.

## NANDA alignment

- All 11 agents remain `internal-only`; `externalReadyCount=0`, `externalRegisteredCount=0`, and publication is disabled on every export target.
- DTO scope is `platform` and `least-disclosure`; public discovery is disabled and external publication is not approved.
- API output includes capability summaries, endpoint/action counts, DTO refs, auth scopes, data classes, quota/cost posture, proof commands, and blockers.
- API output omits raw prompt, raw provider payload, private transcript, client contact value, policy identifier value, secrets, credentials, payment data, cookies, and OTP.
- No OpenAI/Anthropic provider call was added; no new `AiUsageLog` row is required for this no-provider/read-only proof.

## Validation

- PASS `pnpm ai:protocol-readiness-qa`
  - Source DTO: 11 agents, all `internal-only`, no external-ready/registered claims, private sentinel 0.
  - Static route proof: platform session guard, platform read-role guard, private no-store response, no Prisma/provider/request body dependency.
  - Release readiness source proof: `aiProtocol` uses the internal registry reader and carries blockers.
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm ai:protocol-readiness-qa`
  - `/api/platform/ai-protocol/registry`: member app session 403, platform session 200, no-store, total/readiness matches source DTO, private sentinel 0.
  - `/api/platform/release-readiness`: platform session 200, `aiProtocol.summary.totalAgents=11`, all `internal-only`, private sentinel 0.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm ai:bff-audit`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## DB/Prisma

- No Prisma schema change.
- No Prisma generate/db push.
- No DB write.
- `pnpm ai:bff-audit` and release readiness HTTP proof performed read-only platform/usage queries.
- No provider call was made.

## Evidence

- Source proof: `src/domains/ai-protocol/registry.ts`.
- Platform API proof: `src/app/api/platform/ai-protocol/registry/route.ts`.
- Release readiness proof: `src/lib/platform/platform-release-readiness-repository.ts`.
- QA proof: `pnpm ai:protocol-readiness-qa`, `DEMO_QA_BASE_URL=http://localhost:3000 pnpm ai:protocol-readiness-qa`, `pnpm ai:protocol-registry-qa`, `pnpm ai:bff-audit`.
- `issue-question.md` unchanged; no new human decision beyond existing external registry/publication/signing/cross-org approval blockers.

## Git

- Branch: `codex/asai-lv3-automation`.
- Commit: local commit created after validation.
- Push: `push skipped by user instruction`.

## Blockers

- External NANDA / third-party registry publication, public discovery, signing, revocation/key rotation, and cross-org agent access still require operator approval.
- NAP-003 per-AI source alignment remains open.
- NAP-005 local-only adapter/export dry-run remains open.

## Next recommended loop

Cadence counter is now 4, so the next automation loop should run `lv3-whole-product-gap-review-loop.md` before more implementation. After that review, compare `NAP-003`, `NAP-005`, and Route B provider/runtime proof against whole-product gaps.
