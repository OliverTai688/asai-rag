# ASAI LV3 Automation Push Hold

Date: 2026-06-20

## Scope

User requested: `先不用git push`.

This round updates ASAI LV3 automation policy so future loops still validate, stage, and create local
commits, but do not push until the user explicitly restores push.

## Changes

- Updated root `AGENTS.md` fixed closeout rules with a temporary operator override for commit-only
  loops.
- Updated normal LV3 loop prompt to stop after local commit and report `push skipped by user
  instruction`.
- Updated whole-product gap-review prompt with the same commit-only policy.
- Updated `loop-state.json` git policy:
  - `commitEachLoop: true`
  - `pushEachLoop: false`
  - `commitAndPushEachLoop: false`
  - push hold reason recorded.
- Updated `issue-question.md` so future agents treat the push hold as a resolved user decision, not
  a validation failure.
- Updated Codex App heartbeat automation `10-agents-batch-task` with the same no-push instruction.

## Validation

- PASS: `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"`
- PASS: `git diff --check`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`

## DB/Prisma

- No Prisma schema changes.
- No Prisma generate/validate/db push required.
- No DB reads or writes required.

## Git

- Local commit required.
- Push target: `push skipped by user instruction`.

## Blockers

- None. Push is intentionally paused by user instruction.

## Next Recommended Loop

Continue the ASAI LV3 automation from the current cadence state. The next implementation loop should
score `lv3-previsit-to-theater-stage` against `lv3-client-to-relationship-graph`, then commit locally
and skip push until the user restores push.
