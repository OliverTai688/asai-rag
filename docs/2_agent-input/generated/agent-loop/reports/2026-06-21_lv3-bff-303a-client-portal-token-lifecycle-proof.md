# 2026-06-21 LV3 BFF-303a Client Portal Token Lifecycle Proof

## Scope
- Loop type: normal LV3 implementation/proof loop.
- Last-two classification: previous two loops were BFF-302a and BFF-205a implementation/proof loops; this loop stays implementation/proof but changes surface to client-facing portal/session isolation.
- Task level: L2 BFF lifecycle/source/proof slice. Anti-repetition: not docs-only, not another org/AI boundary pass.
- Selected slice: `BFF-303a client portal token lifecycle and isolation proof`.

## Candidate Score
1. `BFF-303a client portal token lifecycle and isolation proof` — 91/100. It was the recommended next slice, closes client-facing token lifecycle, bootstrap safe DTO, response whitelist, and portal-to-internal API isolation.
2. `BFF-102 member settings BFF hardening` — 82/100. Useful for member admin maturity, but less directly tied to public/client portal launch gates.
3. `AI meeting / quick-capture workspace baseline` — 80/100. Strong LV3 product value, but current untracked AI meeting/notes prototype files make it a less safe stageable slice for this loop.

## Changes
- `src/lib/report/report-repository.ts`
  - Added share action input: `ensure`, `rotate`, `revoke`.
  - Added optional `expiresInDays` 1-365.
  - Rotate/revoke now expire active share links and write `ShareEvent` audit labels.
  - Revoke moves report back to `READY`; ensure/reuse and rotate keep report `SHARED`.
- `scripts/bff-client-portal-qa.mjs`
  - Added full API/browser proof for BFF-303.
  - Static checks cover share repository/session/response boundaries.
  - API proof covers authorized, missing, invalid, expired, rotated, revoked, response whitelist, internal API isolation, and audit events.
  - Browser proof covers authorized share, client-login authorized, expired/invalid/revoked missing states, desktop/mobile overflow, and screenshots.
- `package.json`
  - Added `pnpm bff:client-portal-qa`.
- `AGENTS.md` and `PLN-019`
  - Marked BFF-303 complete with completion notes.
- `loop-state.json`
  - Incremented normal loop cadence to 4; next heartbeat should run fifth-loop whole-product gap review.

## Validation
- PASS: `node --check scripts/bff-client-portal-qa.mjs`
- PASS: `DEMO_QA_BASE_URL=http://127.0.0.1:3042 pnpm bff:client-portal-qa`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`
- PASS: `git diff --check`

## Evidence
- API proof result summary:
  - Missing client portal session: 401.
  - Authorized public share and client bootstrap: 200.
  - Bootstrap session type: `client`.
  - Client-safe sections returned; private sentinels not present.
  - Client token rejected by workspace/member/org/platform APIs: 401/403.
  - Client portal response created: 201.
  - Invalid response type rejected: 400.
  - Unsafe response payload keys not persisted.
  - Invalid, expired, rotated-old, and revoked share/session tokens rejected: 404/401.
  - Rotate and revoke audit events created.
  - Revoke leaves 0 active shares.
  - Browser console errors: 0.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-client-portal-bff/bff-303-authorized-share-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-client-portal-bff/bff-303-client-login-authorized-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-client-portal-bff/bff-303-revoked-share-mobile.png`

## DB/Prisma
- Prisma schema/generate/db push: not run, no schema changes.
- DB operations: non-destructive demo/test writes only, within previously approved demo/test proof boundary.
- Created identifiable BFF-303 QA report/share rows, an expired proof share row, client portal `InteractionEvent`, and `ShareEvent` rotate/revoke audit evidence.
- Provider calls: none. No OpenAI/Anthropic route called; no `AiUsageLog` required for this script.

## Git
- Commit: local commit created for this loop; final response carries the exact hash.
- Push: push skipped by user instruction.
- Unrelated pre-existing dirty files were intentionally not staged.

## Blockers
- No new product decision blocker.
- Remaining blocker types are unchanged: production/provider/public discovery/external registry/payment/email/notification approvals, plus any future decision to select the untracked AI meeting/notes prototype.

## Next Recommended Loop
- Because `normalLoopsSinceLastWholeProductReview` is now 4, the next heartbeat should run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`.
- After that review, likely implementation candidates are BFF-304 platform BFF completion, BFF-305 public BFF completion, BFF-401 billing checkout disabled/sandbox posture, or BFF-102 member settings hardening.
- Continue to skip push until the user explicitly restores push permission.
