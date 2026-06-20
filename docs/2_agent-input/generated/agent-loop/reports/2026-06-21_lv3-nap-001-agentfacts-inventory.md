# 2026-06-21 LV3 NAP-001 AgentFacts Inventory Loop

## Scope

- Automation: `10-agents-batch-task`
- Loop type: quiet gap-research documentation loop, not fifth-loop whole-product review.
- Selected slice: `NAP-001 AI module inventory and NANDA mapping`.
- Task level: L3 research-to-implementation translation.
- User context: heartbeat continuation had no new human decision or immediate notification value, so this round converted NANDA / AgentFacts gaps into owner documentation and next implementation inputs.

## Last-two Loop Classification

- Previous loop: L2 implementation/proof, `PIM-011c` quick-capture UI selector bridge.
- Loop before previous: L4 scheduled whole-product gap review.
- Anti-repetition note: this is not repeating implementation UI work; it is the prompt-approved quiet research/documentation path for a heartbeat with no immediate user action needed.

## Candidate Score

| Rank | Candidate | Score | Reason |
| --- | --- | ---: | --- |
| 1 | `NAP-001` AI module inventory and NANDA / AgentFacts mapping | 89 | Cross-AI leverage, no provider/DB/source risk, directly unlocks NAP-002 manifest/schema QA. |
| 2 | `ITA-003g` Route B provider/runtime preflight | 83 | Strong theater payoff, but live provider proof needs explicit operator approval or guarded-disabled scope. |
| 3 | AI Meeting / notes baseline decision | 78 | Relevant to quick-capture and meeting source gaps, but current worktree contains unrelated prototype files, so not safe to fold into this quiet doc loop. |

## Six-frame Gap Review

1. Advisor onboarding: advisors need a unified map of what each AI can safely do.
2. BFF/source of truth: route audit exists, but module identity/capability contracts do not.
3. Reasoning/evidence: facts/inferences/unknowns exist across DTOs but are not declared in a cross-module manifest.
4. Theater immersion: legacy Theater and Route B need separate capability/readiness identities.
5. QA/compliance: existing `AiUsageLog` proof can seed manifest evidence; missing static registry QA remains.
6. NANDA / AgentFacts: external publication is blocked until internal manifest, redaction, signing, revocation, and operator approval exist.

## Selected Slice

`NAP-001` was selected because it connects all ASAI AI surfaces without touching runtime source. The output is a reviewable `AUD-008` inventory that future slices can use to create `AgentProtocolManifest`, per-module manifests, and a platform-only readiness registry.

## Changes

- Added `docs/06_audits-and-reports/AUD-008_nanda-agentfacts-ai-module-inventory-v1.0.md`.
- Updated `AGENTS.md` NAP workstream status and checked off `NAP-001`.
- Added `AUD-008` to `docs/00_manual-and-index/MAN-001_document-index.md`.
- Updated `docs/2_agent-input/generated/agent-loop/loop-state.json` cadence and next slice recommendation.
- This report was added under `docs/2_agent-input/generated/agent-loop/reports/`.

## Evidence

- Project research basis:
  - Project NANDA GitHub: https://github.com/projnanda
  - NANDA Adapter: https://github.com/projnanda/adapter
  - Beyond DNS / Verified AgentFacts: https://arxiv.org/abs/2507.14263
  - NANDA enterprise architecture paper: https://arxiv.org/html/2508.03101v1
  - AI agent registry survey: https://arxiv.org/html/2508.03095v1
- Route audit baseline:
  - `node scripts/ai-usage-route-audit.mjs`
  - `overall=pass`
  - `routeCount=23`
  - `providerReadyRouteCount=13`
  - `noProviderRouteCount=10`
  - `routesWithGaps=[]`
  - `modules=CHAT, INTERVIEW, RAG, REPORT, SPIN, THEATER, VISIT`

## NANDA Alignment

- No ASAI AI module is claimed as externally NANDA-compatible or externally registered.
- All modules are currently marked `internal-only`.
- `AUD-008` defines the least-disclosure blocklist for raw prompts, raw provider payloads, raw/private transcripts, policy numbers, emails, phones, secrets, tokens, payment data, and raw audio.
- NAP-002 should create an internal manifest/schema and static QA before any registry/export surface exists.

## Validation

- PASS `node scripts/ai-usage-route-audit.mjs`
  - `overall=pass`
  - `routeCount=23`
  - `providerReadyRouteCount=13`
  - `noProviderRouteCount=10`
  - `routesWithGaps=[]`
- PASS `node -e "JSON.parse(...loop-state.json...)"`
- PASS `git diff --check`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`

## DB / Prisma

- DB operations: none.
- Prisma schema/generate/db push: none.
- Provider calls: none.
- `AiUsageLog` proof posture: no-provider documentation loop; route audit confirms existing provider-ready/no-provider coverage.

## Git

- Branch: `codex/asai-lv3-automation`.
- Push: skipped by user instruction.
- Commit: local commit generated after report validation; exact hash is recorded in the final automation response.

## Blockers

- `AgentProtocolManifest` schema and `pnpm ai:protocol-registry-qa` do not exist yet.
- External NANDA / third-party registry publication, public discovery endpoint, credential signing, key rotation, and cross-org agent access require operator approval.
- Route B provider runtime still needs success/error `AiUsageLog` proof before external live capability claims.
- AI Meeting / notes prototype remains outside this loop and should not be represented as registry-ready until selected and validated.

## Next Recommended Loop

Run `NAP-002 Internal AgentFacts-style manifest schema`: create the internal manifest type/schema, add least-disclosure static QA, and introduce `pnpm ai:protocol-registry-qa` without publishing any external registry.
