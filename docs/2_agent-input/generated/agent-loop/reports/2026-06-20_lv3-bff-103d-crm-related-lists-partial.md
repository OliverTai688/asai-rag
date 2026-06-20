# 2026-06-20 LV3 BFF-103d CRM Related Lists Partial

## Scope

Normal LV3 implementation/proof loop. Selected slice: BFF-103d CRM related-list DTO source-truth for policy/timeline/report/gap-analysis CRM subpages.

## Candidate Score

1. BFF-103d CRM related-list DTO source-truth — 23/25. Connects client detail, policies, timeline, reports, gap-analysis, and future prep-package inputs with a member-scoped source DTO. No provider call, no schema change.
2. RAS-001 role-aware navigation contract / legacy SPIN visibility — 18/25. Useful IA cleanup, but less direct source/proof value for the core client -> prep flow.
3. ITA-003f Route B provider orchestration — 17/25. High theater value, but requires provider success/error `AiUsageLog` proof and is riskier while DB connectivity is unstable.

## Changes

- Added `ClientRelatedListsDto` in `src/domains/client/related-lists.ts`.
- Added `getClientRelatedListsForMember()` in `src/lib/clients/client-related-lists-repository.ts`.
- Added `GET /api/clients/[id]/related-lists`.
- Added `useClientRelatedLists()` and wired CRM `policies`, `timeline`, and `gap-analysis` pages to the aggregate DTO.
- Added `pnpm bff:crm-related-lists-qa`.
- Updated `PLN-019`, `AGENTS.md`, `issue-question.md`, and `loop-state.json`.

## Validation

- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed`.
- FAIL / BLOCKED: `DEMO_QA_BASE_URL=http://localhost:3029 pnpm bff:crm-related-lists-qa`.
  - First run reached partial proof: unauth related-lists 401; member client/family/policy/visit/report create 201; related-lists 200; manager 403; policies/timeline desktop screenshots saved.
  - Browser gap-analysis proof then failed when Prisma lost DB connectivity: `EHOSTUNREACH/P1001`.
  - Subsequent reruns failed at DB DNS: `ENOTFOUND db.wwocdcicvpmbdmqvskzi.supabase.co`; `/api/clients` also returned 500.

## Evidence

- Partial screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-bff-crm-related-lists/2026-06-20-bff-103d-policies-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-bff-crm-related-lists/2026-06-20-bff-103d-timeline-desktop.png`
- Dev server log showed related-list API 200 and manager 403 before DB connectivity dropped.

## DB / Prisma

- No schema changes.
- No `prisma db push`.
- Partial QA created identifiable demo/test records before DB connectivity dropped: demo client, family member, policy, visit plan, and report. They were non-destructive proof writes under the existing demo/test authorization.
- No OpenAI/Anthropic provider route was invoked by the implementation or QA script. Final `AiUsageLog` count proof could not be completed because DB DNS was unavailable.

## Git

- Push skipped by user instruction.
- Commit pending at report creation time.

## Blockers

- External DB/DNS blocker: Supabase Postgres host currently resolves as `ENOTFOUND` or becomes unreachable as `EHOSTUNREACH/P1001`.
- BFF-103 related-list checklist remains unchecked until full targeted QA passes.

## Next Recommended Loop

Rerun BFF-103d proof after DB recovers:

```bash
ALLOW_DEV_AUTH_HEADER=true PORT=3029 pnpm dev
DEMO_QA_BASE_URL=http://localhost:3029 pnpm bff:crm-related-lists-qa
```

If DB remains unavailable, fallback to `RAS-001 role-aware navigation contract / legacy SPIN visibility`, which can be implemented and validated mostly without DB writes.
