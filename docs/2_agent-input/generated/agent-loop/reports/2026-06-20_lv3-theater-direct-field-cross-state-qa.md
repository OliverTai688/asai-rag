# 2026-06-20 - LV3 Theater Direct Field Cross-State QA

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `TDF-006 cross-state QA and docs sync`.
- Goal: consolidate the direct theater setup proof after the TDF-004/TDF-005 subproofs: empty `/theater` direct field build, legacy SPIN quickstart transfer, client-build selector/review, previsit high-sensitive gate/audit, and Route B handoff boundaries.

## Candidate Score

1. `TDF-006 cross-state theater QA and docs sync` - 17/20
   - Connects direct setup, legacy SPIN transfer, previsit package handoff, client-data build, and Route B handoff proof.
   - Adds browser/API/DB proof for already implemented LV3-critical theater paths.
   - Reduces privacy/compliance risk by rechecking high-sensitive gate, owner scope, and no raw private sentinels.
2. `ITA-003a Route B schema/runtime migration draft` - 16/20
   - Highest theater-runtime leverage for private/group chat and state updates, but schema/provider risk is better taken after TDF-006 consolidated the existing path.
3. `BFF-103b family edit/delete/re-parent remote-confirmed graph write path` - 15/20
   - Strong client -> relationship graph value and BFF hardening, but less directly connected to the current previsit/client -> theater proof gap.

## Selected Slice

`TDF-006 cross-state QA and docs sync`.

This loop intentionally did not start the Route B Prisma/runtime migration. It kept the proof on current implemented surfaces and left production multi-character Theater to ITA-003/ITA-006.

## Changes

- Added `scripts/theater-direct-field-qa.mjs`.
  - Browser proof for `/theater` desktop/mobile three-entry setup.
  - Proves empty-material direct outline mode can click `開始建場` and reach `/theater/build`.
  - Proves `/theater/build` starts as independent field build with `場域建構包`, text/voice builder, and no source-sensitive gate.
  - Proves legacy SPIN quickstart CTA points to theater auto-create path and reaches the quickstart theater view.
  - Aggregates existing `theater:route-b-handoff-dry-run`, `visit:theater-gate-qa`, and `theater:client-build-qa`.
- Added package script `pnpm theater:direct-field-qa`.
- Marked TDF-006 complete in `AGENTS.md` and `PLN-020`.
- Updated `loop-state.json` cadence counter to 2 and refreshed next recommended slice.

## Validation

- `pnpm exec eslint scripts/theater-direct-field-qa.mjs`: pass.
- `DEMO_QA_BASE_URL=http://localhost:3010 pnpm theater:direct-field-qa`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.
- `git diff --check`: pass.

## Evidence

`pnpm theater:direct-field-qa` final proof included:

- `/theater` desktop/mobile direct, client, and interview setup entries visible with accessible button names.
- Direct outline `開始建場` enabled without existing SPIN/interview material.
- `/theater/build` reachable from direct outline and not blocked by source-sensitive gate.
- Legacy SPIN quickstart CTA reaches theater quickstart view and preserves generated concern/response content.
- Route B handoff dry-run: 20 PASS checks, including NPC cap, private/group visibility, state patch safety, AiUsageLog requirements, and no-provider proof.
- Previsit high-sensitive gate QA: unauth 401, blocked without approval, invalid approval 400, approved audit write `InteractionEvent`, no email/phone/raw-private sentinel, desktop/mobile no overflow.
- Client-build QA: unauth 401, owner-readable client selector, manager 403 for member client detail, high-sensitive client blocked, no raw private sentinel, desktop/mobile no overflow.

Screenshots:

- `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/tdf-006-theater-direct-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/tdf-006-theater-direct-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/2026-06-20-theater-gate-approved-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/2026-06-20-theater-gate-approved-mobile.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/2026-06-20-theater-client-build-desktop.png`
- `docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field/2026-06-20-theater-client-build-mobile.png`

## DB / Prisma

- Prisma schema changed: no.
- Prisma validate/generate/db push: not required.
- DB operations: `visit:theater-gate-qa` and `theater:client-build-qa` performed approved LCH demo/test non-destructive writes against the current `.env` development Supabase target through local dev server APIs: demo/test clients, family member, policy, visit plan update, and one `InteractionEvent` audit for high-sensitive theater handoff approval.
- No destructive DB operation.
- Provider calls: none. No new `AiUsageLog` row required because this proof avoided OpenAI/Anthropic routes; Route B handoff dry-run still verifies future director/character/feedback calls require `AiUsageLog`.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 11]`.
- Local commit: pending until final git step.
- Push: `push skipped by user instruction`.

## Blockers

- Source blocker: production Route B multi-character Theater runtime/schema is not implemented.
- Source blocker: relationship graph edit/delete/re-parent remains a future BFF write path.
- Operator/environment blocker: `pnpm build` remains blocked by the known Next/Turbopack Google Font path issue.
- Production approval blocker: production schema migrations, live provider proof, true notifications/email/payment, and raw audio retention remain approval-gated.

## Next Recommended Loop

Recommended next prompt:

`ITA-003a Route B schema/runtime migration draft using TDF-005a handoff contract and TDF-006 cross-state proof: consume TheaterRouteBHandoffPacket into persisted TheaterScene/TheaterCharacter/TheaterTurn visibility scope with local Prisma validate/generate only, then add director/character provider route proof with AiUsageLog. If schema risk is deferred, run BFF-103b family edit/delete/re-parent remote-confirmed relationship graph write path.`
