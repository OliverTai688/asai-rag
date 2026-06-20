# ASAI LV3 Whole-product Gap Review - NAP / Route B Runtime

Date: 2026-06-21
Loop type: scheduled fifth-loop whole-product review
Push policy: push skipped by user instruction

## Scope

This review used the fifth-loop whole-product prompt to re-rank ASAI LV3 gaps after the recent implementation/proof loops. It did not make broad source changes and did not call any OpenAI/Anthropic provider.

Target flow reviewed:

新增客戶 -> 建立關係圖 -> 生成拜訪準備包 -> 檢視問題清單與推論依據 -> 從準備包建立劇場舞台 -> 劇場私聊/群聊/人物狀態更新 -> AI 訪談建立或補強客戶資料、準備包、劇場。

## Anti-duplicate Gate

Latest completed loop reports reviewed:

- `2026-06-21_lv3-nap-004-platform-ai-protocol-readiness.md`
- `2026-06-21_lv3-nap-002-agentfacts-manifest-schema.md`
- `2026-06-21_lv3-nap-001-agentfacts-inventory.md`
- `2026-06-21_lv3-pim-011c-quick-capture-ui-selector.md`
- `2026-06-21_lv3-whole-product-gap-review-pim-ui-nap-routeb.md`

What changed since the previous whole-product review:

- `PIM-011c` is resolved: `/pre-visit/[planId]/notes` quick-capture UI now proves current-workspace selector flow, high-sensitive gate, no raw note echo, no horizontal overflow, and unchanged `AiUsageLog`.
- `NAP-001`, `NAP-002`, and `NAP-004` are resolved: AI module inventory, internal AgentFacts-style manifest schema, and platform-only registry/readiness API now exist.
- Route B has persisted session, session UI, interaction write shell, and relationship-graph stage map proof, but director/character/feedback runtime remains guarded-disabled or not implemented.
- The untracked AI Meeting / notes prototype is still outside committed/proven baseline and should not be staged unless selected as its own slice.

This report is not duplicate work because the last top candidate `PIM-011c` and the NAP platform-registry chain are now completed. The highest product gap has shifted from "advisor can capture context" to "Route B can orchestrate an actual multi-character AI stage safely, with usage proof."

## Six-frame Review

1. Advisor workflow and onboarding frame
   - Main gap: the clean LV3 flow now has better client/previsit/note entry points, but no fresh end-to-end browser proof after PIM/NAP that reaches an actionable Route B runtime stage.
   - Existing evidence: PIM quick-capture UI, previsit/package pages, Route B stage map/session UI reports.
   - Missing evidence: clean-context browser proof from prep package or interview context into a director/character/feedback-ready stage.

2. Source-of-truth and BFF frame
   - Main gap: Route B runtime endpoint has input summaries and guarded-disabled posture, but live director/character/feedback orchestration is still not a server-owned implemented contract.
   - Existing evidence: `POST /api/theater/route-b/runtime`, persisted Route B sessions/turns, `TheaterRouteBHandoffPacket`.
   - Missing evidence: runtime DTO contract for all provider intents, scoped history, visibility, state patches, and success/error ownership.

3. AI reasoning and evidence frame
   - Main gap: visit/interview/quick-capture evidence handling is stronger than theater runtime evidence; Route B still lacks provider-safe prompt construction and `AiUsageLog` success/error proof.
   - Existing evidence: NAP manifests/readiness API, no-provider quick-capture and Route B shell proofs.
   - Missing evidence: director/character/feedback usage plan executed or explicitly guarded-disabled with stable reason codes.

4. Theater/relationship immersion frame
   - Main gap: relationship graph can inform stage context, but the stage is not yet a true multi-character AI simulation with private/group lane orchestration and feedback runtime.
   - Existing evidence: stage map, group/private advisor turns, state proposal persistence.
   - Missing evidence: AI role reply orchestration, five-view qualitative feedback runtime, and relationship-state deltas that remain confirmation-bound.

5. QA, compliance, and release-proof frame
   - Main gap: no destructive/prod writes were made, but release proof still depends on Route B runtime, client portal expiry/revocation, billing callback hardening, and monitoring.
   - Existing evidence: TypeScript/lint cadence, no-provider proofs, platform readiness API.
   - Missing evidence: Route B provider guarded/live QA, end-to-end no-overflow proof, production approval boundaries.

6. NANDA / AgentFacts protocol frame
   - Main gap: modules are now internally described and platform-readable, but NAP-003 per-AI source adoption and NAP-005 local-only adapter/export dry-run remain open.
   - Existing evidence: AgentFacts-style manifests and `/api/platform/ai-protocol/registry`.
   - Missing evidence: per-module source owner links, action contract adoption in source files, adapter dry-run, and publication/no-publication policy proof.

## Top 10 Gaps

| Rank | Gap | Class | Severity | Leverage | Status since prior review | Owner doc | Existing evidence | Missing evidence | Smallest next slice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Route B director/character/feedback runtime preflight | source gap / operator gap | 2 | 3 | Changed: stage and quick-capture are ready, runtime remains guarded-disabled/not implemented | `PLN-015`, `ACC-006`, BFF-204 | Route B session, turns, stage map, runtime guarded route | provider-safe runtime contract, success/error `AiUsageLog`, AI role orchestration | `ITA-003g` guarded-disabled/no-provider runtime preflight; live provider only with explicit approval |
| 2 | NAP-003 per-AI source alignment | source/proof gap | 2 | 3 | Changed: manifests/readiness API complete, source adoption still open | `AGENTS.md` NAP, NAP plan | NAP-001/002/004 reports | source owner annotations, endpoint/action mapping in code | `NAP-003` source alignment for active AI modules |
| 3 | Clean end-to-end LV3 browser proof after PIM/NAP/Route B | proof gap | 2 | 3 | New ordering: now meaningful after PIM-011c and NAP-004 | loop reports / ACC docs | individual browser/API proofs | one clean-context target-flow walkthrough | end-to-end no-provider proof after `ITA-003g` preflight |
| 4 | NAP-005 local-only adapter/export dry-run | proof gap | 2 | 2 | Still open | `AGENTS.md` NAP | manifest registry/schema | adapter export dry-run, least-disclosure bundle, no external publish | local-only adapter/export QA |
| 5 | AI Meeting / notes prototype baseline decision | product decision / source gap | 2 | 2 | Still outside baseline | untracked AMM docs/source | dirty worktree files only | selected owner doc, validation, staging decision | choose or defer AMM as its own committed slice |
| 6 | Formal relationship-edge schema/backfill | source/operator gap | 2 | 2 | Still deferred | relationship graph plans | runtime graph/stage use | formal persisted edge model/backfill | `REL-004` schema/backfill only with DB approval |
| 7 | Client portal expiry/revocation and beta access proof | source/proof gap | 2 | 2 | Still open | launch readiness plans | report/share surfaces | expiry/revocation API/browser proof | portal access hardening slice |
| 8 | Realtime voice provider/audio retention policy | operator/product gap | 2 | 2 | Still open | PIM voice docs | text fallback/memory proofs | provider approval, retention boundary, no raw audio policy | voice-live guarded provider proof |
| 9 | Release readiness aggregation gate | proof gap | 2 | 2 | Changed: NAP registry added, full release gate still broader | LCH/BFF plans | platform AI protocol readiness | billing/portal/monitoring/full smoke aggregation | BFF-404 readiness gate expansion |
| 10 | Billing/ECPay callback/idempotency | operator/source gap | 2 | 1 | Still blocked by payment approval | launch/payment docs | payment disabled posture | callback/idempotency test proof | test-only payment callback hardening with explicit approval |

## Top 3 Candidate Scores

1. `ITA-003g Route B director/character/feedback runtime preflight` - 92/100
   - Highest LV3 immersion leverage: connects relationship graph, previsit package, interview memory, private/group lanes, state proposals, and feedback into one professional theater surface.
   - Safe first version can be guarded-disabled/no-provider, proving contract, DTO boundaries, and no fake usage log. Live provider proof waits for explicit approval.

2. `NAP-003 per-AI source adoption and alignment` - 89/100
   - High protocol leverage: turns completed manifests/readiness API into source-level adoption across AI modules.
   - Lower immediate user-facing payoff than Route B runtime, but reduces future registry and compliance ambiguity.

3. `Clean end-to-end LV3 no-provider browser proof` - 86/100
   - Valuable product proof now that PIM-011c and NAP-004 are complete.
   - Best executed after `ITA-003g` narrows Route B runtime posture, otherwise it would restate the current theater gap.

## Selected Next Slice

Recommended next implementation/proof slice:

`ITA-003g Route B director/character/feedback runtime preflight (guarded-disabled/no-provider unless explicit provider approval), with source alignment for asai.theater.route_b in the AgentFacts manifest chain.`

Acceptance intent:

- Keep provider calls disabled unless the operator explicitly approves live OpenAI/Anthropic usage.
- Prove `DIRECTOR`, `CHARACTER`, and `FEEDBACK` requests have typed scoped inputs, stable reason codes, visibility-safe history, state patch boundaries, and no raw private transcript/provider payload leakage.
- If provider is disabled, prove no provider call and no fake `AiUsageLog`.
- If provider is explicitly enabled in a later loop, prove both success and error paths write `AiUsageLog`.
- Do not alter legacy Theater enum/scoring outside approved Route B boundaries.

Fallback if operator wants a no-theater source hardening loop:

`NAP-003 per-AI source adoption/alignment` for all active ASAI AI modules.

## NANDA / AgentFacts Readiness

Current readiness:

- Internal module inventory exists.
- AgentFacts-style manifest schema exists.
- Platform-only registry/readiness API exists and is included in readiness posture.
- Current posture remains internal-only; no external registry publication, signing, public discovery, or cross-org access is approved.

Remaining protocol gaps:

- `NAP-003`: source alignment/adoption for per-AI module manifests.
- `NAP-005`: local-only adapter/export dry-run.
- Route B runtime should align its director/character/feedback actions with the `asai.theater.route_b` manifest once `ITA-003g` proceeds.

## Changes

- Added this whole-product review report.
- Updated `loop-state.json` cadence counter to 0 and pointed the next recommended slice to `ITA-003g`.
- No `issue-question.md` update was required because Route B provider approval is already recorded as an operator blocker.

## Validation

Passed:

- `git diff --check` - pass
- `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"` - pass
- `pnpm exec tsc --noEmit --pretty false` - pass
- `pnpm lint:changed` - pass

## DB/Prisma

No DB or Prisma operation was performed in this review loop.

## Git

Planned staged files:

- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-21_lv3-whole-product-gap-review-nap-routeb-runtime.md`
- push skipped by user instruction.

## Blockers

- Live Route B provider runtime requires explicit operator approval before any OpenAI/Anthropic call.
- External NANDA/public AgentFacts publication remains out of scope without approval.
- AI Meeting / notes prototype remains untracked/unproven baseline and must not be staged accidentally.
- Production payment/email/notification/destructive DB operations remain disallowed without explicit approval.

## Next Recommended Loop

Use this prompt:

`執行 ASAI LV3 implementation/proof slice: ITA-003g Route B director/character/feedback runtime preflight。先讀 AGENTS.md、PLN-015、ACC-006、AUD-007、NAP manifest/readiness docs 與本 report。不得呼叫 provider，除非 operator 明確批准。完成 guarded-disabled/no-provider runtime contract proof、Route B action manifest source alignment、targeted QA、tsc、lint:changed、report、local commit；push skipped by user instruction。`
