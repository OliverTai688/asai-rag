# 2026-06-20 LV3 BFF Full-site Data-source Inventory Loop

## Scope

- 本輪類型：LV3 implementation/proof fallback slice。
- 目標：完成 BFF-001 全站資料來源盤點與 responsibility matrix，避免後續 LV3 proof 混入 mock/local truth。
- 邊界：不改業務 runtime、不重寫 BFF route、不呼叫 OpenAI/Anthropic provider、不做 DB/Prisma write。

## Candidate score

| Candidate | Score | Reason |
| --- | ---: | --- |
| BFF-001 Full-site data-source inventory and responsibility matrix | 19/20 | provider approval 不足時最安全；可連接 client、relationship graph、previsit、theater、reports、issues、team 等多表面；產出 source/proof baseline 與 QA gate。 |
| ITA-003f Route B provider orchestration + AiUsageLog success/error proof | 15/20 | flow impact 最高，但需要 explicit provider/cost approval；本輪不得 mock success 或假寫 usage。 |
| BFF-105 Reports / share action BFF | 17/20 | 直接補 reports/share 核心 surface，但依賴 BFF-002 shared foundation；先做 BFF-001 可避免重寫時漏掉 source blocker。 |

## Selected slice

Selected：BFF-001 Full-site data-source inventory and responsibility matrix。

理由：上一輪建議的 ITA-003f 已被 provider approval 阻擋；BFF-001 是 prompt 指定 fallback，且能把 `/reports`、`/issues`、`/team`、admin/pilot seed、SPIN mock fallback、notification mock route 與 domain store seed 全部轉成可追蹤的 blocker。

## Changes

- 新增 `docs/06_audits-and-reports/AUD-006_full-site-bff-data-source-inventory-v1.0.md`。
- 新增 `scripts/full-site-bff-inventory-qa.mjs` 與 `pnpm bff:inventory-qa`。
- 更新 `AGENTS.md` 與 `docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md`，BFF-001 標記完成並留下 completion note。
- 更新 `docs/2_agent-input/generated/agent-loop/loop-state.json`，normal loop cadence 由 1 改為 2，下一輪建議 BFF-002。
- 更新 `docs/2_agent-input/generated/agent-loop/issue-question.md`，記錄 BFF-001 resolved 與新增 source blockers。

## Validation

- `pnpm bff:inventory-qa`：PASS，掃到 13 個既有風險 path，全部已在 AUD-006 點名。
- `pnpm exec tsc --noEmit --pretty false`：PASS。
- `pnpm lint:changed`：PASS。
- `pnpm exec eslint scripts/full-site-bff-inventory-qa.mjs`：PASS。
- `git diff --check`：PASS。

## Evidence

- Audit：`docs/06_audits-and-reports/AUD-006_full-site-bff-data-source-inventory-v1.0.md`。
- QA script：`scripts/full-site-bff-inventory-qa.mjs`。
- Key blockers recorded：`/reports` local store/share action、`/issues` `MOCK_ISSUES`、`/team` `MOCK_TEAM_MEMBERS`、admin/pilot demo seed、SPIN mock outline fallback、notification reminder mock success、domain store demo seed、calendar seeded local events。

## DB/Prisma

- No Prisma schema change.
- No `prisma generate`.
- No DB push.
- No production write, email, notification, payment/refund, remote delete or destructive operation.

## Provider / AiUsageLog

- No OpenAI/Anthropic provider call.
- No `AiUsageLog` write required. Route B provider orchestration remains guarded by explicit provider/cost approval.

## Git

- Start status: clean on `codex/asai-lv3-automation`, ahead of origin by 21 commits.
- End status: clean after local commit; branch ahead of origin by 22 commits.
- Commit: local commit created; exact post-amend hash is recorded in the final response.
- Push policy: `push skipped by user instruction`.

## Blockers

- Product/source blockers: `/reports`, `/issues`, `/team`, admin/pilot seed, SPIN mock fallback, notification mock route remain unresolved implementation blockers.
- Provider blocker: Route B director/character/feedback provider calls require explicit provider/cost approval and success/error `AiUsageLog`.
- Build blocker remains separate: Next/Turbopack Google Font path.

## Next Recommended Loop

BFF-002 Shared API foundation：新增 shared response/error/validation/sanitize helpers，先接 2-3 條低風險 endpoint proof，為 BFF-105 reports 和 BFF-106 issues 做一致 contract 地基。
