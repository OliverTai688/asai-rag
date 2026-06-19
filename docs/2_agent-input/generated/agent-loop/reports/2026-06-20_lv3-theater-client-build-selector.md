# 2026-06-20 LV3 Theater Client Build Selector

## Scope

ASAI LV3 normal implementation/proof loop. This round focused on `/theater` client selector + owner-scoped client-data build review. It does not claim public launch Level 3 readiness.

## Candidate score

1. TDF-004b Theater client selector + owner-scoped client-data build review: 17/20. Connects client data -> theater, removes raw-ID workflow, adds manager 403 and high-sensitive blocked proof, and improves operability.
2. BFF-103a CRM relationship graph metadata/writeback: 14/20. Strong upstream graph slice for client -> graph -> previsit/theater, but the theater entry still had a direct gate gap.
3. PIM writeback -> VisitPlan/TheaterBuildDraft: 12/20. Important interview -> workspace bridge, but safer after theater client/previsit gates are stable.

## Selected slice

TDF-004b `/theater` client selector + owner-scoped client-data build review.

## Changes

- Added `src/domains/theater/client-build.ts` to build a deterministic client-data theater packet with fact/inference/unknown boundaries.
- Added `src/lib/theater/client-build-repository.ts` to read client/family/policy data through current member scope and return 403 for same-org non-owner detail access.
- Added `GET /api/theater/client-builds` and `GET /api/theater/client-builds/[clientId]`.
- Updated `/theater` client mode to load client-build options, show a source review before entering build, and block high-sensitive direct build.
- Updated `/theater/build?clientId=...&source=client` to use the same client-build BFF instead of `/api/clients/[id]`.
- Added `pnpm theater:client-build-qa`.
- Updated loop state, issue-question, TDF docs, and AGENTS notes.

## Validation

- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`
- PASS `pnpm exec eslint scripts/theater-client-build-qa.mjs src/domains/theater/client-build.ts src/lib/theater/client-build-repository.ts src/app/api/theater/client-builds/route.ts 'src/app/api/theater/client-builds/[clientId]/route.ts' 'src/app/(dashboard)/theater/page.tsx' 'src/app/(dashboard)/theater/build/page.tsx'`
- PASS `DEMO_QA_BASE_URL=http://localhost:3001 pnpm theater:client-build-qa`

## Evidence

- API proof covered unauth 401, member list/detail 200, manager detail 403, high-sensitive detail `BLOCKED_SENSITIVE`, no email/phone sentinel, no raw private sentinel, and no-provider proof.
- Browser proof covered `/theater` client selector review, fact/inference/unknown sections, primary action to `/theater/build`, build page source review, desktop/mobile no horizontal overflow, and no raw client ID in body.
- Screenshots:
  - `docs/06_audits-and-reports/screenshots/lv3-theater-client-build/2026-06-20-theater-client-build-desktop.png`
  - `docs/06_audits-and-reports/screenshots/lv3-theater-client-build/2026-06-20-theater-client-build-mobile.png`

## DB/Prisma

- No Prisma schema change, no `prisma:generate`, no `prisma db push`.
- QA created demo/test clients through local dev APIs, added family/policy evidence for one client, and updated a newly created test client to `HIGHLY_SENSITIVE` for blocked proof.
- No production write, no destructive DB operation, no provider call, no AiUsageLog required.

## Git

- Start status: `## codex/asai-lv3-automation...origin/codex/asai-lv3-automation [ahead 7]`
- Commit pending at report write time.
- Push: `push skipped by user instruction`.

## Blockers

- Remaining source blocker: relationship graph nodes still lack richer role/job/income/status/factStatus/source metadata, so upstream graph quality limits previsit/theater grounding.
- Route B multi-character session, private/group chat, and state-change persistence remain TDF-005/ITA-003 work.
- Production build remains separately blocked by the known Next/Turbopack Google Font path issue in `issue-question.md`.

## Next Recommended Loop

BFF-103a Relationship graph metadata/writeback. Enrich relationship graph node metadata and proof its client -> graph -> previsit/theater source boundaries without weakening compliance fields.
