# 2026-06-20 LV3 Loop - BFF Visit/Report AI Hardening

## Scope

- Loop type: normal LV3 implementation/proof loop.
- Selected slice: `BFF-202 Visit / Report AI Hardening`.
- Goal: keep the redesigned previsit package and persisted VisitPlan BFF intact while hardening `/api/ai/visit` and `/api/ai/report` with explicit evidence DTO boundaries, provider-safe client context, quota/error proof, and `AiUsageLog` success/error evidence.

## Candidate Score

| rank | candidate | score | reason |
| --- | --- | ---: | --- |
| 1 | `BFF-202 Visit / Report AI Hardening` | 22/25 | Directly strengthens the previsit package and report generation surfaces, connects client/profile/relationship facts to generated outputs, and had a clear existing route foothold with missing targeted proof. |
| 2 | `BFF-203 SPIN AI Hardening` | 19/25 | Important for AI 了解客戶, but SPIN state machine and legacy UI source risks make it a slightly higher-risk next slice. |
| 3 | `ITA-003f Route B provider orchestration` | 18/25 | High LV3 theater value, but depends on provider orchestration and multi-role runtime cost controls; BFF-202 was the narrower source/proof slice. |

## Changes

- Added `src/domains/visit/ai-evidence-dto.ts` with:
  - `AiEvidenceSummaryDto` split into `facts`, `inferences`, `unknowns`, `recommendations`.
  - `buildProviderSafeClientSnapshot()` to keep provider prompts away from email, phone, raw notes, raw provider payloads, and whole-client DTO leakage.
- Updated `/api/ai/visit`:
  - Keeps current response arrays for backward compatibility.
  - Adds `evidenceSummary` DTO.
  - Uses provider-safe client snapshot in prompt.
  - Adds non-production QA controls for forced quota and real invalid-model provider-error proof.
- Updated `/api/ai/report`:
  - Keeps markdown response as default compatibility mode.
  - Adds `responseFormat: "json"` returning `{ markdown, evidenceSummary }`.
  - Uses provider-safe client snapshot in prompt.
  - Adds the same non-production quota/provider-error QA controls.
- Updated CRM report subpage to request JSON DTO and save the returned markdown.
- Added `pnpm bff:visit-report-ai-qa`.
- Synced BFF-202 status in `AGENTS.md`, `PLN-019`, `AUD-005`, `issue-question.md`, and `loop-state.json`.

## Validation

- Pass: `node --check scripts/bff-visit-report-ai-qa.mjs`
- Pass: `pnpm exec tsc --noEmit --pretty false`
- Pass: `pnpm lint:changed`
- Pass: targeted ESLint for new/changed BFF-202 files.
- Pass: `pnpm ai:bff-audit`
- Pass: `DEMO_QA_BASE_URL=http://localhost:3020 pnpm bff:visit-report-ai-qa`

Note: first QA attempt against `http://localhost:3000` failed with 404 because that port was held by another `next-server (v15.5.10)`, not this Next 16 workspace. A fresh `pnpm dev --port 3020` server was started and used for the passing proof.

## Evidence

`pnpm bff:visit-report-ai-qa` covered:

- `/api/ai/visit` unauth `401`.
- Visit/report invalid input `400`.
- Visit/report forced quota `429`, with no fake `AiUsageLog`.
- Visit/report provider success `200`.
- Visit/report response DTO has `facts`, `inferences`, `unknowns`, `recommendations`.
- Visit response still has SPIN question reasoning evidence.
- Visit/report response omits email/phone private sentinels.
- Visit/report invalid-model provider error returns sanitized `500`.
- `AiUsageLog` increments:
  - final targeted QA: `VISIT` success `14 -> 15`, error `4 -> 5`.
  - final targeted QA: `REPORT` success `1 -> 2`, error `1 -> 2`.
  - final `pnpm ai:bff-audit` DB aggregate: `VISIT` total `20` (`15` success / `5` error), `REPORT` total `4` (`2` success / `2` error).

## DB/Prisma

- Prisma schema: not changed.
- Prisma generate/validate/db push: not needed.
- DB writes: eight normal `AiUsageLog` rows were created by two passing targeted provider proof runs:
  - two VISIT success rows,
  - two REPORT success rows,
  - two VISIT invalid-model provider error rows,
  - two REPORT invalid-model provider error rows.
- No production write, destructive DB operation, email, notification, payment, or remote deletion.

## Git

- Branch: `codex/asai-lv3-automation`.
- Push: `push skipped by user instruction`.
- Commit: created after this report in the loop finalization step.

## Blockers

- Remaining blocker type: next loop is cadence-gated to a whole-product gap review before further implementation.
- Known product blockers still outside this slice: SPIN UI/source hardening, CRM related-list/archive/update completion, Route B provider orchestration/five-view feedback runtime, and production build font/Turbopack blocker.

## Next Recommended Loop

Run `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md` as the scheduled fifth-loop whole-product review, then select the next highest source/proof gap across client -> relationship graph -> previsit -> theater -> interview/writeback.
