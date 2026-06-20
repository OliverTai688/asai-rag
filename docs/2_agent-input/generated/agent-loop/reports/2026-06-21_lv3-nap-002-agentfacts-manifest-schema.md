# 2026-06-21 LV3 NAP-002 AgentFacts Manifest Schema Loop

## Scope

- Automation loop: ASAI LV3 immersive advisor-system.
- Loop type: implementation/proof slice, not fifth-loop whole-product review.
- Selected slice: `NAP-002 Internal AgentFacts-style manifest schema + ai:protocol-registry-qa`.
- User push policy: local commit only; `push skipped by user instruction`.

## Candidate score

1. `NAP-002 AgentFacts-style manifest schema + static QA` — 92/100. Converts the previous NAP-001 research inventory into source-tracked manifests and runnable proof across all AI modules without provider calls or DB writes.
2. `ITA-003g Route B provider/runtime preflight` — 84/100. High theater value, but live provider proof still needs explicit approval; guarded-disabled proof is less connected to the immediately previous gap.
3. `AI Meeting / notes baseline decision` — 78/100. Relevant to cross-surface immersion, but the worktree already has unrelated prototype files; safer to avoid mixing ownership in this loop.

## Selected slice

Built an internal `AgentProtocolManifest` source contract and static QA script so ASAI AI modules are capability-declared, least-disclosure, versioned, and explicitly `internal-only` before any external NANDA / third-party registry work.

## Changes

- Added `src/domains/ai-protocol/manifest.ts` with `AgentProtocolManifest` types and 11 manifests:
  `asai.chat.assistant`, `asai.interview.companion`, `asai.interview.quick_capture`, `asai.interview.realtime_voice`, `asai.spin.advisor`, `asai.visit.preparation_package`, `asai.report.generation`, `asai.theater.legacy`, `asai.theater.route_b`, `asai.rag.private_beta`, `asai.meeting.prototype`.
- Added `src/domains/ai-protocol/index.ts`.
- Added `scripts/ai-protocol-registry-qa.ts` and wrapper `scripts/ai-protocol-registry-qa.mjs`.
- Added `pnpm ai:protocol-registry-qa`.
- Updated `AGENTS.md`, `AUD-008`, and `loop-state.json` to mark NAP-002 completed and point the next slice at NAP-003/004.

## NANDA alignment

- New manifest fields cover identity, owner surface, module, version/status, capabilities, endpoints/actions, modalities, DTO refs, auth/session scope, data classes, privacy/redaction, quota/cost, `AiUsageLog` policy, proof commands, registry readiness, publication, signing, and revocation gates.
- All 11 manifests remain `internal-only`; none claim `registry-draft`, `external-ready`, or `external-registered`.
- Export targets are protocol-neutral but disabled: NANDA AgentFacts-style JSON, MCP descriptor, A2A Agent Card, and HTTPS metadata.
- Static QA blocks forbidden sentinel values including raw secret/token, raw prompt, raw provider payload, raw private transcript, email/phone, policy number, raw audio marker, payment data, cookie, and OTP.
- External publication still blocked by operator approval, signing/key rotation/revocation policy, public discovery endpoint approval, least-disclosure export proof, and Route B provider success/error `AiUsageLog` proof.

## Validation

- PASS `pnpm ai:protocol-registry-qa`
  - 11 manifests, expected ids present, duplicate ids 0.
  - All export targets disabled and publication gates closed.
  - Forbidden sentinel checks pass.
  - Readiness summary: `{"internal-only":11}`.
- PASS `pnpm ai:bff-audit`
  - 23 discovered AI/RAG routes.
  - 13 provider-ready routes, 10 no-provider routes, gaps 0.
  - DB summary read-only `AiUsageLog` aggregation passed.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## DB/Prisma

- No Prisma schema change.
- No DB write.
- `pnpm ai:bff-audit` performed read-only monthly `AiUsageLog` aggregation.
- No provider call was made.

## Evidence

- Source proof: `src/domains/ai-protocol/manifest.ts`.
- QA proof: `pnpm ai:protocol-registry-qa`, `pnpm ai:bff-audit`.
- Gap report updated: `docs/06_audits-and-reports/AUD-008_nanda-agentfacts-ai-module-inventory-v1.0.md`.
- `issue-question.md` unchanged; no new human decision beyond existing external registry/provider approval blockers.

## Git

- Branch: `codex/asai-lv3-automation`.
- Commit: local commit created after validation.
- Push: `push skipped by user instruction`.

## Blockers

- External NANDA / third-party registry publication, signing, public discovery endpoint, key rotation/revocation, and cross-org agent access still require operator approval.
- Route B live provider/director/character/feedback runtime still needs guarded provider proof with `AiUsageLog` success/error before external capability claims.
- AI Meeting / notes remains prototype and cannot be advertised as registry-ready.

## Next recommended loop

Run `NAP-003` or `NAP-004`: connect each manifest to source-owner/readiness adoption and add a platform-only internal registry reader/readiness DTO that exposes capability/readiness/proof status without raw prompt, provider payload, private transcript, client contact, policy number, or secret values.
