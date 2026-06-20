# 2026-06-21 LV3 Loop — BFF-103d CRM Related-list Recovery Proof

## Scope

- Loop type: normal LV3 implementation/proof loop, not fifth-loop whole-product review.
- Task level: L1 recovery proof with one tiny QA harness fix.
- Selected slice: `BFF-103d CRM related-list recovery proof`.
- Goal: complete the DB-backed proof that was previously blocked by Supabase DNS/connection failure, without broad source refactor.

## Last-two-loop Classification

- Previous loop: L2 implementation/proof, Route B relationship-graph stage map.
- Loop before previous: L1 release proof, Next/Turbopack build blocker resolved.
- Anti-repetition rationale: this loop is not another quiet docs/proof-plan loop. It completes a named blocked acceptance proof with live API/browser/DB evidence.

## Candidate Score

1. `BFF-103d CRM related-list recovery proof` — 88. DB is now reachable, and this completes a named ACC-011 recovery gate across client detail subpages, preparation/report inputs, and theater readiness signals.
2. `PIM-011 quick-capture -> Park memory BFF/API proof` — 84. High LV3 value because it connects interview/notes to memory/readback and downstream preparation/theater, but BFF-103d was the older blocked recovery item.
3. `ITA-003g Route B provider runtime contract preflight` — 78. Valuable for theater AI runtime, but live provider calls remain approval-bound, so it is less safe than no-provider BFF proof.

## Changes

- Fixed `scripts/bff-crm-related-lists-qa.mjs` reports page locator to use `.first()` because the same report section title can validly appear twice on the report subpage.
- Marked BFF-103 related-list DTO item complete in `AGENTS.md` and `PLN-019`.
- Added BFF-103d recovery evidence to `ACC-011`.
- Updated `issue-question.md` to mark the BFF-103d partial DB blocker resolved.
- Updated `loop-state.json` cadence from 2 to 3 and recommended PIM-011 BFF/API quick-capture proof next.

## Validation

- PASS DB readiness probe: `.env` loaded pg read `select 1`.
- PASS `DEMO_QA_BASE_URL=http://localhost:3000 pnpm bff:crm-related-lists-qa`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `git diff --check`
- PASS `loop-state.json` parse.

## Evidence

`pnpm bff:crm-related-lists-qa` proved:

- unauth related-lists request returns 401.
- member creates client/family/policy/visit/report evidence with status 201.
- `GET /api/clients/[id]/related-lists` returns 200 for owner.
- manager cannot read member-owned client detail, status 403.
- DTO keeps `complianceChecklist`, `sensitivityLevel`, and `kycStatus`.
- DTO includes policy source, insured amount summary, report summary source, timeline policy/visit/report events, and deterministic gap-analysis categories.
- gap-analysis retains fact/inference/unknown evidence.
- DTO omits raw report body, internal/client section names, email, phone, and policyNumber.
- Browser pages for policies, timeline, gap-analysis, and reports render server-owned data with no desktop horizontal overflow; gap-analysis mobile has no horizontal overflow.
- No provider route was invoked; `AiUsageLog` count stayed `147->147`.

Screenshots:

- `docs/06_audits-and-reports/screenshots/lv3-bff-crm-related-lists/2026-06-20-bff-103d-policies-desktop.png`
- `docs/06_audits-and-reports/screenshots/lv3-bff-crm-related-lists/2026-06-20-bff-103d-timeline-desktop.png`
- `docs/06_audits-and-reports/screenshots/lv3-bff-crm-related-lists/2026-06-20-bff-103d-gap-analysis-desktop.png`
- `docs/06_audits-and-reports/screenshots/lv3-bff-crm-related-lists/2026-06-20-bff-103d-gap-analysis-mobile.png`
- `docs/06_audits-and-reports/screenshots/lv3-bff-crm-related-lists/2026-06-20-bff-103d-reports-desktop.png`

## DB/Prisma

- DB writes: yes, non-destructive demo/test records only through the QA script.
- Prisma schema change: none.
- Prisma generate/db push: none.
- Provider calls: none.
- `AiUsageLog`: unchanged by design and proven unchanged.

## NANDA Alignment

- Not applicable this loop. No AI route, provider wrapper, agent runtime, or AI module manifest was changed.
- The selected BFF proof preserves downstream AI readiness by keeping facts/inferences/unknowns and source signals available without exposing raw private data.

## Git

- Current branch: `codex/asai-lv3-automation`.
- Push policy: `push skipped by user instruction`.
- Commit hash: recorded in final response after local commit, because this report is part of that commit.

## Blockers

- BFF-103d related-list DB blocker is resolved for the current environment.
- Environment caveat remains: DB direct host has no IPv4 A record; IPv4-only runtimes may still need pooler/env adjustment.
- Production approval blockers remain for live provider calls, production migrations, real email/notification, payment/refund, raw audio retention, and external registry publication.

## Next Recommended Loop

Primary:

```text
執行 PIM-011 quick-capture -> Park memory BFF/API proof：在 DB 可用狀態下補 owner create/read/readback、manager/foreign denial、高敏感 gate、no-provider/AiUsageLog unchanged、refresh/new-context memory retrieval、no raw private sentinel；不得 stage 既有 untracked meeting/notes prototype，除非本輪明確選擇並驗證整包。
```

Secondary:

```text
執行 ITA-003g Route B provider runtime contract preflight；若沒有 explicit operator approval，保持 guarded-disabled，不打 live provider。
```
