# 2026-06-20 - LV3 Route B Persisted Session Proof

## Scope
- Loop type: normal LV3 implementation/proof loop.
- Selected slice: ITA-003c Route B persisted session read/write proof.
- LV3 target surface: preparation/theater handoff -> persisted multi-character stage state.

## Candidate Score
- ITA-003c Route B persisted session read/write proof: 19/20. Connects handoff packet, theater schema, member-scoped BFF, DB proof, private/group visibility boundary, and no-provider proof.
- BFF-001 full-site inventory fallback: 17/20. Safe and reviewable if DB target could not be confirmed, but lower direct product impact than persisted theater state.
- ITA-003d Route B session UI/read surface: 16/20. High UX impact, but depended on first proving DB-backed session read/write.

## Selected Slice
- Confirmed current `.env` DB target as development Supabase Postgres (`db.wwocdcicvpmbdmqvskzi.supabase.co/postgres`) per existing operator-approved demo/test boundary.
- Applied non-destructive Prisma sync with no `--accept-data-loss`.
- Added DB-backed Route B session creation and owner-scoped read DTO while provider calls remain guarded-disabled.

## Changes
- Added shared Route B boundary guard: `src/lib/theater/route-b-boundary.ts`.
- Added member-scoped Route B session BFF repository: `src/lib/theater/route-b-session-bff-repository.ts`.
- Added `POST /api/theater/route-b/sessions` and `GET /api/theater/route-b/sessions/[sessionId]`.
- Updated Route B persistence adapter so `TheaterCharacter.id` is session-scoped while `routeBCharacterId` remains the logical character id.
- Extracted shared Route B QA fixture and added `pnpm theater:route-b-persistence-qa`.
- Updated `AGENTS.md`, `PLN-015`, `issue-question.md`, and `loop-state.json`.

## Validation
- `pnpm prisma:validate`: pass.
- `pnpm prisma:generate`: pass.
- `pnpm exec prisma db push --skip-generate`: fail, Prisma 7 CLI does not support the option.
- `pnpm exec prisma db push`: pass, DB in sync, no `--accept-data-loss`.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass.
- Targeted ESLint for new Route B API/repository/QA files: pass.
- `DEMO_QA_BASE_URL=http://localhost:3021 pnpm theater:route-b-runtime-qa`: pass.
- `DEMO_QA_BASE_URL=http://localhost:3021 pnpm theater:route-b-persistence-qa`: pass.

## Evidence
- Runtime QA: unauth 401, invalid 400, dry-run draft 200, director/character/feedback guarded-disabled 503, no private sentinel, no fake `AiUsageLog`.
- Persistence QA: unauth 401, invalid 400, create 201, owner read 200, manager read 404.
- DB proof: one `theater_sessions` row, three `theater_characters` rows, one director-only opening `theater_turn`, session-scoped DB character ids.
- Usage proof: `AiUsageLog` THEATER count stayed unchanged during persistence QA (`before=10`, `after=10`).

## DB / Prisma
- Development Supabase Postgres target was synced with the additive Route B schema using `pnpm exec prisma db push`.
- No destructive DB command, no reset/drop/delete, and no production write.
- QA creates additive demo/test Route B sessions only.

## Git
- Push policy: `push skipped by user instruction`.
- Commit: pending at report write time.

## Blockers
- Provider success/error path still needs `AiUsageLog` proof before enabling `ENABLE_ROUTE_B_THEATER_PROVIDER`.
- Theater session UI still needs to consume the persisted DTO and present group/private lane affordances.
- Production schema migration / rollback plan still needs explicit approval.

## Next Recommended Loop
- ITA-003d Route B persisted session UI/read surface: wire the theater stage entry or `/theater/[sessionId]` to the persisted DTO, render scene/characters/opening turn and group/private lanes in guarded-disabled mode, and keep provider calls disabled until success/error usage proof exists.
