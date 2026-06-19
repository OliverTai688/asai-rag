# 2026-06-19 Pre-visit Generation Fix

## Goal
- Fix the visible "準備包生成失敗" path on `/pre-visit/[planId]`, especially plans created from legacy demo client ids.

## Changes
- `/pre-visit` now refreshes the member-scoped DB client list before creating normal visit plans, matching the CRM data source.
- Visit plans created from URL params now resolve legacy demo ids such as `c_lin` to DB ids such as `demo_client_lin`.
- `/pre-visit/[planId]` refreshes client cache, sends the resolved DB client id to `/api/ai/visit`, upgrades the plan client id after success, and shows specific API error messages instead of a generic failure.

## DB / Prisma
- No schema change, no Prisma generate/validate needed.
- Non-destructive AI generation proof wrote normal `AiUsageLog` records through existing `/api/ai/visit` behavior.

## Verification
- `pnpm exec tsc --noEmit --pretty false` passed.
- `pnpm lint:changed` passed.
- `pnpm exec eslint src/domains/client/id-aliases.ts` passed.
- API proof: `POST /api/ai/visit` with `clientId=c_wang` returned 200.
- API proof: `POST /api/ai/visit` with `clientId=demo_client_lin` returned 200.
- Headless browser proof: `/pre-visit?clientId=c_lin&autoCreate=true` created a Lin plan, sent `clientId=demo_client_lin`, `/api/ai/visit` returned 200, page reached `準備完成`, console errors 0.
- Browser plugin note: in-app Browser webview attach timed out twice; proof was completed with local headless Edge/Playwright.

## Remaining Blockers / Issue-question
- No operator decision needed for this bug.
- Observed one transient `/api/ai/visit` 500 (`VISIT_AI_GENERATION_FAILED`) during proof; immediate retry with the same payload succeeded. A future batch can add explicit server-side retry only if each provider attempt remains covered by `AiUsageLog`.
