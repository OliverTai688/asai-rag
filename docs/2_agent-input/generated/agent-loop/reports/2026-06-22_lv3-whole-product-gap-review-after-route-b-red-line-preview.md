# 2026-06-22 LV3 Whole-product Gap Review after Route B Red-line Preview

## Scope

- Loop type: scheduled fifth-loop whole-product gap review.
- Cadence trigger: `normalLoopsSinceLastWholeProductReview=4`; this loop ran `lv3-whole-product-gap-review-loop.md` and resets the counter to `0`.
- Reviewed flow: client -> relationship graph -> visit preparation package -> reasoning trace -> Route B theater stage -> group/private interaction -> provider next-turn candidate -> advisor-confirmed append -> feedback/red-line review -> interview/meeting writeback.
- This is a scheduled review, so docs-only output is allowed. It still points the next normal loop at a source-backed implementation/proof slice, not another screenshot or proof-plan loop.

## Anti-duplicate Review Gate

- Latest normal loops were L2 source/proof slices: `ITA-004c` feedback persistence, `ITA-005a` objection/red-line library, `ITA-005b` provider prompt context, and `ITA-005c` severe red-line stage preview.
- The prior whole-product review selected feedback persistence; that is now materially resolved through `ITA-004c`.
- This report is not duplicate work: the bottleneck moved from "can Route B remember and review a session?" to "can Route B generate an actual provider-backed character/narrator turn while preserving the prompt-context, red-line, append-confirmation, and `AiUsageLog` contracts?"
- User preference check: residual screenshots or operator-runnable DB checks should not consume the next loop. The recommended next slice must change source behavior and include mandatory provider logging proof.

## Six-frame Review

1. Advisor workflow / onboarding: the stage now shows relationship context, next-turn preview, append gate, five-view review, and red-line watchlist. The main missing action is still the live "generate role reply" step; without it, the advisor is rehearsing against a structured shell.
2. Source-of-truth / BFF: session, turns, next-turn draft, append confirmation, feedback review, and severe red-line preview are source-owned. The provider candidate is still only an injected contract; there is no owner-scoped runtime route that returns a real candidate with a DB `AiUsageLog` id.
3. AI reasoning / evidence: prompt context now includes 12 objection cues, 18 red-line rules, severe immediate cues, no legal advice, no CRM fact write, and visibility-safe prompt boundaries. Missing evidence is live success/error logging before candidate return.
4. Theater / relationship immersion: group/private turns, relationship stage map, state proposals, and feedback exist. The immersion gap is that characters do not yet respond with generated text that can be appended through the confirmed path.
5. QA / compliance / release proof: static/source proof is strong. Mandatory next proof is provider success/error `AiUsageLog` and guarded failure paths; residual browser screenshots can be operator-run after the live route lands.
6. NANDA / AgentFacts protocol: 11 internal manifests remain `internal-only`. `asai.theater.route_b` declares next-turn, provider contract, append confirmation, prompt context, feedback, and red-line preview refs; it still needs a live provider route/action proof ref before any stronger readiness claim.

## Top Gaps

| Rank | Gap | Type | Severity | Leverage | Status vs prior review | Owner |
| --- | --- | --- | ---: | ---: | --- | --- |
| 1 | Route B live next-turn provider route is not wired to real OpenAI/Anthropic success/error `AiUsageLog` and append candidate handoff | source/provider proof | 3 | 3 | changed: now highest after red-line prompt/UI chain landed | `ITA-003n` |
| 2 | Severe red-line preview has no advisor action workflow for evidence, not-applicable reason, escalation note, or post-review handoff | source/product/compliance | 3 | 2 | new sharper gap after `ITA-005c`; preview is watchlist-only | future `ITA-005d` |
| 3 | Feedback/red-line review is not consumed by visit preparation, interview planning, or meeting notes follow-up | source/product | 2 | 3 | unchanged but now sequenced after `ITA-004c/005a-c` | ITA/AMM bridge |
| 4 | Route B live provider feedback remains contract-only, not a real feedback provider route with persisted provider result | source/provider proof | 2 | 2 | still open; lower than next-turn because stage has deterministic review | future `ITA-004d` |
| 5 | AMM-005c notes compatibility runtime proof remains DB/DNS-sensitive | operator/environment proof | 2 | 2 | known blocker; residual check can be user-run after DB is stable | AMM self-run |
| 6 | Formal `RelationshipEdge` table is not migrated | schema/operator | 2 | 2 | unchanged; needs migration/rollback plan | `REL-004` |
| 7 | pgvector / retrieval-backed memory is not enabled | operator/environment | 2 | 2 | unchanged | `AMM-007` / `ITA-006` |
| 8 | Cross-flow clean-browser LV3 proof is stale relative to the latest Route B red-line/provider chain | proof gap | 1 | 3 | changed by recent theater work; should follow provider route, not precede it | LV3 proof pack |
| 9 | Production payment/email/notification env proof remains manual | production approval | 2 | 1 | unchanged release-hardening track | LCH/BFF |
| 10 | External NANDA / third-party registry publication remains unapproved | product/operator | 1 | 1 | unchanged and intentionally blocked | NAP approval package |

## Candidate Score

1. `ITA-003n live Route B next-turn provider route wiring` - 94/100.
   - Connects provider prompt context -> Route B next-turn provider -> `AiUsageLog` -> append candidate -> existing advisor confirmation path. It unlocks the core immersive theater behavior and touches multiple target-flow steps.
2. `ITA-005d compliance ops action flow for severe red-line handling` - 88/100.
   - Strong compliance value and good source/UI slice, but it should consume the current red-line preview after the provider candidate path is no longer blocked.
3. `ITA/AMM feedback-to-prep consumption bridge` - 84/100.
   - Useful cross-surface follow-through, but it depends on having at least one real generated theater turn or provider-backed review to summarize.

Selected next normal slice: `ITA-003n`.

## Selected Next Slice Contract

`ITA-003n` should wire a real owner-scoped Route B next-turn provider route:

- Input: persisted `RouteBSessionSnapshot`, existing `GET /next-turn` draft, `RouteBProviderPromptContext`, quota/session/org scope, and model/provider config.
- Endpoint: prefer `POST /api/theater/route-b/sessions/[sessionId]/next-turn/provider-candidate` or equivalent owner-scoped route. It must not accept raw client/org/session truth from the browser beyond the session id and optional provider mode controls.
- Success path: call the provider only after quota and input guards pass; write `AiUsageLog` success before returning; return append candidate with `usageLogId`, `requiresAdvisorConfirmation=true`, `writesConfirmedCrmFact=false`, `storesRawProviderPayload=false`, and `rawPrivateTranscriptIncluded=false`.
- Error path: provider/malformed/schema errors write sanitized error `AiUsageLog` before returning; no append candidate is created; no raw provider body or private transcript is stored.
- Guard paths: unauth, owner/manager denial, missing advisor turn, blocked draft, provider disabled, quota exceeded, and raw sentinel input must not call provider or write fake usage.
- UI: `/theater/[sessionId]` can enable the existing append-confirmation flow only when the provider candidate includes a safe `usageLogId`.
- Proof: add `pnpm theater:route-b-next-turn-provider-route-qa` or equivalent. Also run `pnpm theater:route-b-next-turn-provider-dry-run`, `pnpm theater:route-b-next-turn-append-dry-run`, `pnpm theater:route-b-provider-prompt-context-dry-run`, `pnpm ai:protocol-registry-qa`, `pnpm ai:bff-audit`, `pnpm exec tsc --noEmit --pretty false`, and `pnpm lint:changed`.

## NANDA Alignment

- Active module: `asai.theater.route_b`, owner surface `/theater/[sessionId]`, registry readiness `internal-only`.
- Current manifest coverage includes persisted session/turns, stage map, runtime preflight, orchestration, next-turn draft/UI/provider contract, append confirmation, feedback persistence, objection/red-line library, provider prompt context, and severe red-line preview.
- Next manifest delta: add live provider route endpoint/action/proof refs for `route-b-next-turn-provider-candidate` and require success/error `AiUsageLog` evidence before returning candidates.
- External NANDA / third-party registry publication, signing, public discovery, and cross-org agent access remain approval-blocked.

## Validation

- PASS `git diff --check`.
- PASS `pnpm theater:route-b-severe-red-line-preview-dry-run`.
- PASS `pnpm theater:route-b-provider-prompt-context-dry-run`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm ai:bff-audit` (`routeCount=30`, `routesWithGaps=[]`, DB summary pass).
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## Residual Evidence Delegated

- AMM-005c runtime proof remains self-runnable after DB DNS/connection is stable: `DEMO_QA_BASE_URL=http://localhost:<dev-port> pnpm meeting:notes-compat-qa`.
- Route B residual browser screenshot collection should wait until `ITA-003n` lands. After that, use the new provider-route QA plus the existing `/theater/[sessionId]` UI instead of spending a loop only collecting screenshots.

## DB / Prisma

- No DB writes in this review.
- No Prisma schema changes.
- No provider calls in this review; no `AiUsageLog` rows are required for the review itself.

## Docs Updated

- `docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`: added the post-`ITA-005c` review note and `ITA-003n` next-slice boundary.
- `docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`: added `ITA-003n` live provider route acceptance.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: cadence reset to `0` and next slice set to `ITA-003n`.

## Blockers

- Source/provider blocker: `ITA-003n` is not implemented yet.
- Product/compliance blocker: formal red-line action workflow remains future `ITA-005d`.
- Operator/environment blocker: DB/provider/browser residual evidence should be self-run only after the source route lands.
- Product/operator blocker: external NANDA publication remains unapproved.

## Next Recommended Loop

執行 `ITA-003n live Route B next-turn provider route wiring`。先讀 `AGENTS.md`、本 report、`PLN-015` ITA-003/005 notes、`ACC-006` `ITA-003n` acceptance、`src/domains/theater/route-b-next-turn.ts`、`src/domains/theater/route-b-next-turn-provider.ts`、`src/domains/theater/route-b-next-turn-append.ts`、`src/domains/theater/route-b-provider-prompt-context.ts`、`src/lib/theater/route-b-session-bff-repository.ts`、`src/app/api/theater/route-b/sessions/[sessionId]/next-turn/route.ts` 與 `/theater/[sessionId]` source。新增 owner-scoped provider-candidate route、success/error `AiUsageLog` proof、guarded-disabled/no-fake-usage paths、UI append enablement only with safe `usageLogId`，並更新 `asai.theater.route_b` manifest。若 provider env 不可用，先完成 route disabled/error/quota guard proof，然後改選 `ITA-005d` source-backed compliance action flow，不要回到 docs-only evidence.

## Git

- Push skipped by user instruction.
