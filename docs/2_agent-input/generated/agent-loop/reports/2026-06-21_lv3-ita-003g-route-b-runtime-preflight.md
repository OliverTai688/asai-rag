# 2026-06-21 LV3 ITA-003g Route B Runtime Preflight Loop

## Scope

- Automation loop: ASAI LV3 immersive advisor-system.
- Loop type: normal LV3 implementation/proof loop, not fifth-loop whole-product review.
- Task level: L2 implementation/proof.
- Selected slice: `ITA-003g Route B director/character/feedback runtime preflight`.
- Provider posture: no-provider / guarded-disabled. No OpenAI/Anthropic call was made.
- User push policy: local commit only; `push skipped by user instruction`.

## Last-two-loop Classification

- Previous loop: L4 scheduled whole-product gap review (`2026-06-21_lv3-whole-product-gap-review-nap-routeb-runtime.md`).
- Loop before previous: L2 implementation/proof (`NAP-004 platform AI protocol readiness`).
- Anti-repetition rationale: this loop is not another quiet documentation or NAP registry slice. It implements the review-selected Route B runtime preflight contract and adds HTTP proof without provider calls.

## Candidate Score

1. `ITA-003g Route B director/character/feedback runtime preflight` - 92/100.
   - Highest LV3 immersion leverage because it prepares the missing director/character/feedback path while preserving private/group visibility and state boundaries.
   - Safe without provider approval because it proves guarded-disabled contracts and no fake usage logs.
2. `NAP-003 per-AI source adoption/alignment` - 89/100.
   - Strong protocol leverage, but the last completed implementation already focused on NAP registry readiness.
3. `Clean end-to-end LV3 no-provider browser proof` - 86/100.
   - Useful after Route B runtime posture is clearer; this loop first narrows that runtime contract.

## Changes

- Updated `src/app/api/theater/route-b/runtime/route.ts`.
  - Adds `runtimeInputPreview` safe DTO for `DIRECTOR`, `CHARACTER`, and `FEEDBACK`.
  - Preview includes AgentFacts source alignment, action id, input contract, missing fields, visibility summary, provider boundary, and success/error `AiUsageLog` plan.
  - Missing director utterance and unknown character id now return `400 ROUTE_B_RUNTIME_PREFLIGHT_INVALID` before provider/quota gating.
  - Provider-disabled path still returns `503 ROUTE_B_PROVIDER_DISABLED` with `providerCallAttempted=false` and `aiUsageLogWritten=false`.
- Updated `scripts/theater-route-b-runtime-qa.mjs`.
  - Adds assertions for source alignment, safe input contract, missing-field 400s, visibility summary, five-view feedback preview, provider-enabled blocked source branch, private/provider sentinel 0, and unchanged THEATER `AiUsageLog`.
- Updated `src/domains/ai-protocol/manifest.ts`.
  - `asai.theater.route_b` now declares Route B runtime preflight capability, director/character/feedback actions, `RouteBRuntimeRequest` input, `RouteBRuntimeInputPreview` output, source-alignment evidence, and explicit provider approval blocker.
- Updated owner docs:
  - `AGENTS.md`
  - `docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`
  - `docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`

## NANDA Alignment

- Module id / owner surface: `asai.theater.route_b`, `/theater/[sessionId]`.
- Capabilities/actions touched:
  - `route-b-runtime-preflight`
  - `route-b-director`
  - `route-b-character`
  - `route-b-feedback`
- Endpoint/action contract: `POST /api/theater/route-b/runtime` with `DIRECTOR`, `CHARACTER`, `FEEDBACK`, and `SESSION_DRAFT`.
- DTO boundary:
  - Input: `RouteBRuntimeRequest`, `TheaterRouteBHandoffPacket`, scoped history refs.
  - Output: `RouteBRuntimeInputPreview`, safe summaries only.
  - No raw private transcript, raw provider body, provider payload, contact value, policy identifier, secret, token, cookie, or OTP is returned.
- Auth/session scope: app member session via `requireCurrentMember`; Route B runtime remains member workspace scoped.
- Data classes: `STAGE_STATE`, `CLIENT_FACTS`, `CLIENT_INFERENCES`, `CLIENT_UNKNOWNS`.
- Quota/cost and `AiUsageLog` policy:
  - No provider call in this loop.
  - Guarded-disabled response writes no `AiUsageLog` and proves THEATER count unchanged.
  - If provider is explicitly enabled later, director/character/feedback require success/error `AiUsageLog` before any production claim.
- Registry readiness: `internal-only`.
- External publication blockers: live provider success/error proof, operator provider approval, external registry publication/signing/public discovery/cross-org approval.

## Validation

Passed:

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm ai:protocol-registry-qa`
- `pnpm ai:bff-audit`
- `DEMO_QA_BASE_URL=http://localhost:3000 pnpm theater:route-b-runtime-qa`
- `DEMO_QA_BASE_URL=http://localhost:3000 pnpm ai:protocol-readiness-qa`
- `pnpm lint:changed`
- `git diff --check`

## DB / Prisma / Provider

- Prisma schema change: none.
- Prisma generate/db push: none.
- DB write: none.
- DB read: targeted QA reads `AiUsageLog` THEATER count before/after.
- Provider calls: none.
- `AiUsageLog`: unchanged by design and proven unchanged by targeted QA.

## Evidence

- Runtime source: `src/app/api/theater/route-b/runtime/route.ts`.
- Manifest source: `src/domains/ai-protocol/manifest.ts`.
- Targeted QA: `scripts/theater-route-b-runtime-qa.mjs`.
- Owner docs: `AGENTS.md`, `PLN-015`, `ACC-006`.

## Git

- Stage only this loop's related files.
- Commit locally after validation.
- push skipped by user instruction.

## Blockers

- Operator/production approval: live Route B provider usage is still blocked until explicit approval.
- Source gap: AI role reply orchestration and five-view feedback runtime are still not implemented.
- Protocol gap: NAP-003 remains incomplete for other AI modules and legacy Theater.
- External publication approval: NANDA / third-party registry publication, signing, discovery, and cross-org access remain disabled.

## Next Recommended Loop

Primary no-provider prompt:

`執行 NAP-003 per-AI source adoption/alignment。先讀 AGENTS.md、AUD-008、manifest source、NAP-004 report、本 report。將 CHAT、INTERVIEW、VISIT、REPORT、SPIN、THEATER legacy/Route B、RAG 的 manifests 對齊 source owner proof、endpoint/action proof、quota/usage proof 與 blocker；跑 ai:bff-audit、ai:protocol-registry-qa、tsc、lint:changed，寫 report，local commit；push skipped by user instruction。`

Provider-approved alternate:

`若 operator 明確批准 live Route B provider usage，執行 Route B director/character/feedback provider success/error AiUsageLog proof；否則不得呼叫 provider。`
