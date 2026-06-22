# 2026-06-22 LV3 Whole-product Gap Review after Route B Append Confirmation

## Scope

- Loop type: scheduled fifth-loop whole-product gap review.
- Cadence trigger: `normalLoopsSinceLastWholeProductReview=4`; this loop ran `lv3-whole-product-gap-review-loop.md` and resets the counter to `0`.
- Reviewed flow: client -> relationship graph -> visit preparation package -> reasoning trace -> Route B theater stage -> group/private interaction -> generated character/narrator append -> feedback/interview writeback.
- This review intentionally does not make broad product source changes. It updates owner docs so the next normal loop is source-backed and not another residual evidence pass.

## Anti-duplicate Review Gate

- Latest normal loops were implementation/proof slices: `ITA-003j` next-turn contract, `ITA-003k` next-turn UI, `ITA-003l` provider logging, and `ITA-003m` append confirmation.
- The previous whole-product review selected `ITA-003j`; that gap is now materially resolved through `ITA-003j/k/l/m`.
- This report is not a duplicate: it moves the bottleneck from "can the theater produce and append the next role turn safely?" to "can the finished roleplay produce a persisted, qualitative coaching review?"

## Six-frame Review

1. Advisor workflow / onboarding: the Route B stage now gives a visible next-turn preview and a gated append confirmation path. The next missing obvious action is a session-end "what did I learn / what should I adjust?" feedback panel.
2. Source-of-truth / BFF: `RouteBSessionSnapshot` and owner-scoped turn append are the right source. Feedback still exists as domain/provider contract only, not as persisted session review state.
3. AI reasoning / evidence: facts, inferences, unknowns, visibility, provider boundaries, and `usageLogId` are explicit for next-turn append. Feedback still needs persisted evidence basis per perspective, red-line not-applicable state, and no-score output proof.
4. Theater / relationship immersion: group/private stage interaction can now advance toward multi-character practice. The remaining immersion gap is reflective coaching: five-view feedback should summarize relationship dynamics and state-change risks without rewriting CRM facts.
5. QA / compliance / release proof: static/source commands are strong; DB/browser append proof remains residual and can be self-run after environment/provider wiring. The next slice must add its own feedback persistence/UI proof rather than collect extra screenshots.
6. NANDA / AgentFacts: all ASAI AI modules remain `internal-only`. `asai.theater.route_b` now declares next-turn/append boundaries, but lacks a persisted feedback review capability/action.

## Top Gaps

| Rank | Gap | Type | Severity | Leverage | Status vs prior review | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Route B feedback is not persisted or displayed as a session-end review UI | source/product | 2 | 3 | changed: now highest after ITA-003m closed append chain | `ITA-004c` |
| 2 | Live OpenAI/Anthropic next-turn route wiring is not yet connected to real append candidates | source/provider proof | 2 | 3 | still blocked by provider/live route wiring, not a docs gap | future `ITA-003n` |
| 3 | Objection library and red-line detection are not yet domain-owned | source/product | 2 | 2 | unchanged, but becomes more valuable once feedback persists | `ITA-005a` |
| 4 | Feedback output is not consumed by visit/meeting/interview preparation review | source/product | 2 | 2 | newly sharper after AMM and ITA progress | future ITA/AMM bridge |
| 5 | DB/browser live append evidence remains residual | operator/environment proof | 1 | 2 | unchanged; should be self-run, not a main loop | self-run command |
| 6 | Formal `RelationshipEdge` table is not migrated | schema/operator | 2 | 2 | unchanged; needs migration/rollback path | `REL-004` |
| 7 | AMM-005c notes compatibility runtime proof remains DB/DNS blocked | operator/environment proof | 2 | 2 | unchanged; already has fallback contract proof | self-run command |
| 8 | pgvector / retrieval-backed memory is not enabled | operator/environment | 2 | 2 | unchanged | `AMM-007` / `ITA-006` |
| 9 | Production payment/email/notification env proof remains manual | production approval | 2 | 1 | unchanged release hardening | LCH/BFF |
| 10 | External NANDA publication is not approved | product/operator | 1 | 1 | unchanged and intentionally blocked | NAP approval package |

## Candidate Score

1. `ITA-004c Route B feedback persistence + session-end UI` - 92/100.
   - Connects theater stage, five-view feedback, compliance red-line review, advisor coaching, and future interview/meeting review consumption. It is source-backed and can be no-provider first.
2. `ITA-003n live next-turn provider route wiring` - 87/100.
   - High product value, but depends on live provider/env and DB/browser proof. It should follow after feedback persistence or run only if provider env is confirmed.
3. `ITA-005a objection/red-line source library` - 84/100.
   - Strong compliance and coaching value, but best implemented after there is a persisted feedback surface to consume the library.

Selected next normal slice: `ITA-004c`.

## Selected Next Slice Contract

`ITA-004c` should add a source-backed Route B feedback persistence and session-end UI slice:

- Input: persisted `RouteBSessionSnapshot`, selected five perspectives, current feedback contract/provider result envelope, and safe red-line review state.
- Output: owner-scoped persisted feedback review with qualitative perspective sections, evidence basis, red-line signals/not-applicable state, `requiresAdvisorConfirmation=true`, and `writesConfirmedCrmFact=false`.
- UI: `/theater/[sessionId]` session-end panel that can generate/read feedback without raw IDs and shows empty/loading/error states.
- Provider posture: no-provider/deterministic persistence first is acceptable. If live provider is wired, success/error must write `AiUsageLog` before returning.
- Proof posture: add a runnable feedback persistence/UI proof command; use existing `theater:route-b-feedback-*` commands as regression. Do not spend the loop only collecting residual append screenshots.

## NANDA Alignment

- Active module: `asai.theater.route_b`, owner surface `/theater/[sessionId]`, registry readiness `internal-only`.
- Current manifest coverage includes persisted session, advisor turns, stage map, orchestration runtime preview, feedback source/provider contracts, next-turn draft/UI/provider contract, and append confirmation.
- Next manifest delta: add `route-b-feedback-persistence` capability/action/endpoint/DTO/evidence refs and proof command.
- External NANDA / third-party registry publication, public discovery, signing, and cross-org agent access remain approval-blocked.

## Validation

- PASS `pnpm theater:route-b-next-turn-append-dry-run`.
- PASS `pnpm theater:route-b-feedback-provider-dry-run`.
- PASS `pnpm theater:route-b-feedback-dry-run`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm ai:bff-audit`; known DB summary may still warn on Supabase DNS in this runtime.
- PASS `git diff --check`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## Residual Evidence Delegated

- Route B live append browser/DB evidence is residual after provider candidate route wiring. When DB/provider wiring is available, self-run `pnpm theater:route-b-next-turn-append-dry-run` for source contract and the future ITA-003n/004c browser proof command rather than spending another review loop on screenshots.
- AMM-005c runtime proof remains self-runnable after DB DNS recovery: `DEMO_QA_BASE_URL=http://localhost:<dev-port> pnpm meeting:notes-compat-qa`.

## DB / Prisma

- No DB writes.
- No Prisma schema changes.
- No provider calls.
- No `AiUsageLog` rows required for this review.

## Docs Updated

- `AGENTS.md`: added the post-ITA-003m whole-product review note and next slice.
- `docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`: added the post-append review note.
- `docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`: added ITA-004c feedback persistence/session-end UI acceptance.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: cadence reset to `0` and next slice set to ITA-004c.

## Blockers

- Source blocker: feedback persistence and session-end UI are not implemented yet.
- Operator/environment blocker: DB/browser residual evidence and live provider route proof depend on environment/provider wiring.
- Product/operator blocker: external NANDA publication remains unapproved.
- Production approval blocker: production payment/email/notification enablement still needs manual env/provider setup proof.

## Next Recommended Loop

執行 `ITA-004c Route B feedback persistence + session-end UI`。先讀 `AGENTS.md`、本 report、`PLN-015` ITA-004 notes、`ACC-006` §6.1-6.3、`src/domains/theater/route-b-feedback.ts`、`src/domains/theater/route-b-feedback-provider.ts`、`src/domains/theater/route-b-session.ts`、`src/lib/theater/route-b-session-bff-repository.ts` 與 `/theater/[sessionId]` source。新增 owner-scoped feedback review persistence/API/UI，保持 qualitative-only/no score、red-line not-applicable、requiresAdvisorConfirmation、`writesConfirmedCrmFact=false`、no raw private/provider payload；先 no-provider deterministic proof 可接受，若接 live provider 必須 success/error `AiUsageLog`。跑新 proof command、`pnpm theater:route-b-feedback-dry-run`、`pnpm theater:route-b-feedback-provider-dry-run`、`pnpm ai:protocol-registry-qa`、`pnpm ai:bff-audit`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`，寫 report、本地 commit，並記錄 `push skipped by user instruction`。

## Git

- Push skipped by user instruction.
