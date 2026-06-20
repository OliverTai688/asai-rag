# 2026-06-21 LV3 NAP-003a Provider-ready Source Adoption

## Scope

- Loop type: normal LV3 implementation/proof loop, not fifth-loop whole-product review.
- Task level: L2 implementation/proof.
- Selected slice: `NAP-003a provider-ready AI source adoption for CHAT / VISIT / REPORT / SPIN`.
- User push policy: local commit only; push skipped by user instruction.

## Last-two Classification

- Previous loop: L3 quiet gap-research documentation loop for `NAP-003 source adoption matrix`.
- Loop before previous: L2 implementation/proof loop for `ITA-003g Route B runtime preflight`.
- Anti-repetition: this loop converts the quiet matrix into manifest/source QA proof instead of writing another quiet research report.

## Candidate Score

| Rank | Candidate | Score | Reason |
| --- | --- | ---: | --- |
| 1 | NAP-003a provider-ready AI source adoption for CHAT / VISIT / REPORT / SPIN | 92 | Highest safety leverage for active provider modules; binds route owners, DTO/evidence boundaries, quota, `AiUsageLog`, and SPIN state-machine proof without provider calls. |
| 2 | NAP-003b interview memory + quick-capture source adoption | 88 | Strong LV3 writeback/onboarding leverage, but source ownership spans more routes and memory/writeback surfaces. |
| 3 | NAP-003c theater + RAG source adoption | 86 | Product-critical, but live Theater Route B provider/five-view feedback and RAG launch posture remain approval/guard blockers. |

## Changes

- Added `AgentProtocolSourceAdoptionStatus` and optional `proof.sourceAdoption` to `AgentProtocolManifest`.
- Marked four provider-ready manifests as source-adopted:
  - `asai.chat.assistant`
  - `asai.visit.preparation_package`
  - `asai.report.generation`
  - `asai.spin.advisor`
- Added NAP-003a registry QA checks for required source owners, evidence refs, proof commands, and adoption notes.
- Updated `AGENTS.md`, `AUD-008`, and `loop-state.json` so the next safe slice becomes `NAP-003b interview memory + quick-capture source adoption`.

## NANDA Alignment

- All four updated agents remain `registry.readiness=internal-only`.
- No external NANDA / third-party registry publication, signing, public discovery endpoint, or cross-org agent access was added.
- No raw prompt, raw provider payload, private transcript, contact value, policy identifier, cookie, secret, token, OTP, or payment data was added.
- VISIT/REPORT retain provider-enabled proof commands in their manifest, but this no-provider slice does not run provider success paths.

## Validation

- Passed:
  - `pnpm ai:protocol-registry-qa`
  - `pnpm ai:bff-audit`
  - `pnpm spin:source-truth-qa`
  - `pnpm bff:reports-qa`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm lint:changed`
  - `git diff --check`
- Intentionally skipped:
  - `pnpm bff:visit-report-ai-qa`, because it calls `/api/ai/visit` and `/api/ai/report` success paths and requires provider/AiUsage rows; this slice explicitly has a no-provider boundary.

## DB / Prisma / Provider

- Prisma schema: not changed.
- Prisma generate/db push: not run.
- DB writes: implementation made no DB writes. Targeted non-provider QA wrote demo/test evidence only: `pnpm spin:source-truth-qa` created a server-owned SPIN session/messages; `pnpm bff:reports-qa` created one report/share event for BFF proof.
- Provider calls: none.

## Evidence

- Source: `src/domains/ai-protocol/manifest.ts`
- QA: `scripts/ai-protocol-registry-qa.ts`
- Audit doc: `docs/06_audits-and-reports/AUD-008_nanda-agentfacts-ai-module-inventory-v1.0.md`
- Workstream state: `AGENTS.md`
- Browser evidence refreshed by `pnpm bff:reports-qa`:
  - `docs/06_audits-and-reports/screenshots/lv3-reports-bff/2026-06-20-reports-bff-list-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-reports-bff/2026-06-20-reports-bff-detail-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-reports-bff/2026-06-20-reports-bff-detail-mobile.png`

## Git

- Local commit: pending final staging.
- Push: skipped by user instruction.

## Blockers

- Source blockers: remaining `NAP-003b/c` adoption for interview, quick-capture, realtime voice, theater legacy/Route B remainder, RAG, and meeting prototype.
- Operator blockers: external registry publication, signing, public discovery endpoint, credential/key lifecycle, and cross-org access approval.
- Provider blockers: live Route B provider success/error proof and five-view feedback runtime still require explicit provider approval.

## Next Recommended Loop

Run `NAP-003b interview memory + quick-capture source adoption`: map INTERVIEW / INTERVIEW_OUTPUTS / quick-capture / realtime voice manifests to memory, reflection, writeback, confirmation, UI selector, event mirror, and live-WebRTC blocker source refs; keep default no-provider/guarded proof unless operator explicitly approves live provider usage.
