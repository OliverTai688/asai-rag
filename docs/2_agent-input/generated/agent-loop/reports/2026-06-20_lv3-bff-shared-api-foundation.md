# 2026-06-20 LV3 BFF Shared API Foundation Loop

## Scope

- 本輪類型：normal LV3 implementation/proof loop。
- Selected slice：BFF-002 Shared API foundation。
- 目標：建立後續 BFF route 可重用的 error/response/validation/sanitize foundation，並用 3 個低風險 surface 做 proof。
- 邊界：不改 Prisma schema、不呼叫 OpenAI/Anthropic provider、不做 production write、不重寫 reports/issues route。

## Candidate score

| Candidate | Score | Reason |
| --- | ---: | --- |
| BFF-002 Shared API foundation | 20/20 | BFF-001 已揭露 reports/issues/team/local truth；先統一 no-store、request-id、sanitized error、Zod validation 與 whitelist sanitizer，可降低後續 BFF route privacy risk。 |
| BFF-105 Reports / share action BFF | 18/20 | 最直接補 `/reports` local truth 並連接 advisor report/share surface，但依賴 shared foundation 才能避免 contract 分裂。 |
| BFF-106 Issues BFF | 17/20 | 可移除 production-facing `MOCK_ISSUES`，但 reports/share 對 LV3 client -> prep -> report/share 流程更關鍵。 |

## Selected slice

Selected：BFF-002 Shared API foundation。

理由：這是 BFF-001 後最低未完成 dependency，且能直接支援下一輪 BFF-105 / BFF-106。Route B provider orchestration 仍需 explicit provider/cost approval，不適合本輪。

## Changes

- 新增 `src/lib/api/errors.ts`：auth/forbidden/not found/validation/rate limit/quota/conflict/payload/provider/internal error builders。
- 新增 `src/lib/api/response.ts`：`jsonResponse`、`privateJsonResponse`、`apiErrorResponse`、request id header、private no-store headers。
- 新增 `src/lib/api/validation.ts`：`parseJsonBody` 與 flattened Zod issues。
- 新增 `src/lib/api/sanitize.ts`：share event payload、client portal response metadata、audit metadata whitelist sanitizer。
- 接入 low-risk surfaces：
  - `/api/member/settings`：private response + shared Zod parse。
  - `/api/share/[token]`：private no-store shared response + sanitized 404 error。
  - `/api/share/[token]/events`：shared parse/error/response + share event sanitizer。
  - `/api/client-portal/responses`：shared parse/error/private response + client response metadata sanitizer。
- 新增 `pnpm bff:foundation-qa` 與 `pnpm bff:foundation-api-qa`。
- 同步 `AGENTS.md`、`PLN-019`、`AUD-006`、`loop-state.json`、`issue-question.md`。

## Validation

- `pnpm bff:foundation-qa`：PASS。
- `DEMO_QA_BASE_URL=http://localhost:3026 pnpm bff:foundation-api-qa`：PASS。
- `DEMO_QA_BASE_URL=http://localhost:3026 pnpm share:token-qa`：PASS。
- `DEMO_QA_BASE_URL=http://localhost:3026 pnpm client-portal:qa`：PASS。
- `pnpm exec tsc --noEmit --pretty false`：PASS。
- `pnpm lint:changed`：PASS。
- `pnpm exec eslint src/lib/api/errors.ts src/lib/api/response.ts src/lib/api/validation.ts src/lib/api/sanitize.ts src/app/api/member/settings/route.ts 'src/app/api/share/[token]/route.ts' 'src/app/api/share/[token]/events/route.ts' src/app/api/client-portal/responses/route.ts scripts/bff-foundation-qa.mjs scripts/bff-foundation-api-qa.mjs`：PASS。
- `git diff --check`：PASS。

## Evidence

- Source QA proved helper files and selected route integrations exist; error helpers omit `stack`、`process.env`、`rawPayload`、`providerPayload` literals.
- API QA on fresh `ALLOW_DEV_AUTH_HEADER=true pnpm dev --port 3026` proved:
  - `/api/member/settings` unauth 401, member 200 with `Cache-Control: no-store` and `x-asai-request-id`.
  - invalid member PATCH returns 400 `kind=VALIDATION`, no stack/env/raw payload.
  - `/api/share/[token]` valid 200 and missing 404 `kind=NOT_FOUND`, both no-store/request-id.
  - share event invalid type returns 400 `kind=VALIDATION`.
  - client portal response invalid type returns 400 `kind=VALIDATION`; valid response 201 no-store/request-id.
- `share:token-qa` proved share event unsafe payload key count remains 0.
- `client-portal:qa` proved client response metadata unsafe payload key count remains 0.
- First API attempt against pre-existing `localhost:3000` returned 500s, so proof was rerun on a fresh local dev server at `localhost:3026`.

## DB/Prisma

- No Prisma schema change.
- No `prisma generate`.
- No `prisma db push`.
- DB operations: non-destructive demo/test writes only from share/client portal QA (`ShareEvent` and `InteractionEvent` evidence). No delete/reset/production write.

## Provider / AiUsageLog

- No OpenAI/Anthropic provider call.
- No `AiUsageLog` write required.
- Route B provider orchestration remains blocked until explicit provider/cost approval.

## Git

- Start status: clean on `codex/asai-lv3-automation`, ahead of origin by 22 commits.
- End status: clean after local commit; branch ahead of origin by 23 commits.
- Commit: local commit created; exact hash is recorded in final response.
- Push policy: `push skipped by user instruction`.

## Blockers

- Source blockers remain: `/reports` local store/share action, `/issues` static mock, `/team` static mock, admin/pilot seed, SPIN mock outline fallback, notification mock success.
- Operator/environment blocker: Route B provider proof still requires explicit provider/cost approval; `pnpm build` font blocker remains separate.

## Next Recommended Loop

BFF-105 Reports / share action BFF：使用本輪 shared API foundation 建立 member-scoped `/api/reports` list/detail/share action，讓 `/reports` 與 `/reports/[reportId]` 脫離 local report store truth，並保留 public `/api/share/[token]` client-safe boundary。
