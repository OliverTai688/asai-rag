# ASAI LV3 Automation Setup

Date: 2026-06-20

## Scope

Create an ASAI automation pattern modeled after the NuvaClub night loop, but tuned for the ASAI
LV3 immersive advisor workflow:

新增客戶 -> 關係圖 -> 拜訪準備包 -> 推論問題清單 -> 劇場舞台 -> 私聊/群聊/人物狀態調整
-> AI 訪談反向建立或補強客戶、準備包、劇場。

## NuvaClub Reference

Reviewed local Codex automation configs:

- `$HOME/.codex/automations/nuvaclub-night-loop-every-20-minutes/automation.toml`
- `$HOME/.codex/automations/nuvaclub-ai-branch-phase-loop/automation.toml`
- `$HOME/.codex/automations/10-agents-batch-task/automation.toml`

Reviewed NuvaClub repo agent-loop prompts:

- `docs/2_agent-input/generated/agent-loop/prompts/launch-hardening-loop.md`
- `docs/2_agent-input/generated/agent-loop/prompts/whole-site-gap-review-loop.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

## Changes

- Added `docs/2_agent-input/generated/agent-loop/loop-state.json`.
- Added `docs/2_agent-input/generated/agent-loop/prompts/lv3-immersive-loop.md`.
- Added `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`.
- Updated the ASAI Codex app automation `10-agents-batch-task` into an active ASAI LV3 immersive loop.

## Automation Policy

- Four normal implementation/proof loops, then one whole-product LV3 gap review loop.
- Normal loops score top candidate slices and pick one reviewable slice.
- Highest reward goes to cross-surface LV3 flow improvements:
  client -> relationship graph, graph -> preparation package, package -> theater, interview -> writeback.
- Every loop must preserve compliance fields, SPIN state machine, Theater migration boundaries, and
  `AiUsageLog` requirements.
- Every loop must leave report/evidence and update issue-question only for real human decisions,
  approvals, environment blockers, or external-service blockers.
- Normal source loops follow the repo rule to run `pnpm exec tsc --noEmit --pretty false`,
  `pnpm lint:changed`, commit, and push unless validation or git is blocked.

## DB / Prisma

- No schema changes in this setup slice.
- No Prisma generate.
- No db push.
- No seed/backfill.

## Validation

- `node -e "JSON.parse(...loop-state.json...)"`: pass.
- `git diff --check`: pass.
- `pnpm exec tsc --noEmit --pretty false`: pass.
- `pnpm lint:changed`: pass; no changed lintable files vs `origin/main`.

## Blockers

- None for creating the automation structure.
- Future LV3 implementation loops may require production approvals, external provider env, or
  product decisions depending on the selected slice.

## Git

- Branch: `codex/asai-lv3-automation`
- Initial setup commit: `9c67124`
- Push target: `origin/codex/asai-lv3-automation`
- Note: this report was finalized after the initial setup commit, so the final thread response is
  authoritative for the latest commit hash.

## Next Recommended Loop

Run `docs/2_agent-input/generated/agent-loop/prompts/lv3-immersive-loop.md` and score the current
candidate queue. The first strong implementation candidate is likely:

`lv3-client-to-relationship-graph` or `lv3-relationship-to-previsit-package`, whichever has the
clearest existing source foothold and proof path after reading the latest reports.
