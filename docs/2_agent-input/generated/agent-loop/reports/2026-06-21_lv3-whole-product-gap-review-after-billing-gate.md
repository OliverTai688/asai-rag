# 2026-06-21 LV3 Whole-product Gap Review - After Billing Checkout Gate

## Scope
- Type: scheduled fifth-loop whole-product review.
- Trigger: `normalLoopsSinceLastWholeProductReview = 4`.
- Review target: client creation -> relationship graph -> visit preparation -> reasoning/evidence -> theater stage -> private/group interaction/state proposal -> AI interview / quick-capture / AI Meeting writeback.
- User preference applied: avoid docs-only/proof-only work when a safe source-backed slice exists.
- No source runtime implementation, Prisma schema change, DB write, provider call, production write, real email/notification/payment, external registry publication, public discovery endpoint, credential signing, or cross-org agent access.
- Web research: none. This review used repo-owned prompts, reports, AGENTS, PLN/ACC/AUD docs, and local source inventory.

## Anti-duplicate Review Gate
- Latest completed loops after the previous whole-product review:
  - `BFF-304a`: platform session separation, metadata-only responses, sensitive-read audit, break-glass proof.
  - Quiet `BFF-305`: converted public status/CTA gap into executable BFF-305a docs.
  - `BFF-305a`: public status, pricing CTA, private-beta lead capture BFF/API/DB/browser proof.
  - `BFF-401a`: checkout disabled/sandbox server-payload proof, no provider attempt, no order/transaction insert, no payment secrets.
- What changed since the last review:
  - Platform/public/billing front door can now fail closed instead of overclaiming readiness.
  - Billing still lacks BFF-402 notification/query/idempotency, but the immediate public/checkout disabled contract is no longer the only frontier.
  - `AMM` remains user-approved and documented in `AGENTS.md`, but AI Meeting / notes prototype files are still untracked and not accepted as product baseline.
  - Route B theater has stage-map, group/private turns, state proposals, and guarded runtime preflight; live director/character/feedback provider proof remains env-gated.
- Why this report is not duplicate work:
  - Prior review selected BFF-304a because platform/public/billing gates were open. Three source/proof loops closed most of that frontier.
  - This review re-ranks against the core LV3 immersive flow and points the next normal loop at a source-backed AMM contract slice, not another docs/proof-plan loop.

## Target Flow Inventory
| Flow step | Classification | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Client creation | mostly ready | BFF-103 client lifecycle, related-list proof, compliance fields preserved | Full relationship edge table remains schema/operator-gated |
| Relationship graph | ready with caveat | REL-001/002/003/005, relationship graph source review and write proof | REL-004 full edge model still not migrated |
| Visit preparation package | ready | BFF-104, BFF-202, previsit reasoning UI, persisted handoff | Provider live proof remains `AiUsageLog`-gated |
| Question list and reasoning evidence | ready | Visit/report/issues/quick-capture facts/inferences/unknowns/evidence DTOs | Future AMM summary must preserve citation/evidence boundaries |
| Preparation package -> theater stage | ready no-provider | TDF-004, ITA-003c/d/e/f, BFF-204a | Live AI role orchestration still provider/env-gated |
| Theater private/group interaction/state proposal | ready no-provider | ITA-003e/f, state proposal `requiresConfirmation=true` | AI character response and five-view feedback not live |
| AI interview / quick-capture writeback | ready no-provider + provider route guarded | PIM-010, PIM-011b/c, NAP-003b | AI Meeting is still prototype/uncommitted, no accepted meeting summary contract |
| Public/platform/billing release gates | partially ready | BFF-304a, BFF-305a, BFF-401a | BFF-402 notification/query/idempotency and BFF-403/404 remain |
| AI protocol readiness | internal-ready baseline | NAP-001..005, AUD-008, 11 internal-only manifests | No external registry approval; AMM prototype not registry-eligible |

## Six-frame Findings
1. Advisor workflow and onboarding: first successful member flow is credible, but meeting capture is still not a first-class, low-noise continuation from visit notes.
2. Source-of-truth and BFF: core client/relationship/previsit/theater BFFs are much stronger; AMM lacks an accepted product DTO and proof command.
3. AI reasoning and evidence: visit/report/interview evidence labels exist; meeting summary must add citation-first structure before provider generation.
4. Theater/relationship immersion: Route B no-provider theater is operable; live AI role orchestration remains important but provider env is not present in this shell.
5. QA, compliance, and release-proof: BFF-402 payment notification/query/idempotency is still a severity-3 release gap, but it does not connect the immersive core flow.
6. NANDA / AgentFacts protocol: all accepted AI modules remain `internal-only`; `asai.meeting.prototype` is listed as prototype-only and not registry-eligible until AMM source/proof exists.

## Top Gaps
| Rank | Gap | Class | Severity | Leverage | What changed / status | Owner surface | Smallest next slice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AI Meeting / notes prototype not accepted as committed product baseline | source gap | 2 | 3 | User approved AMM, but files remain untracked and no accepted contract/proof exists | `AGENTS.md` AMM, future `PLN-023` baseline | `AMM-001a formal meeting contract + no-provider summary skeleton proof` |
| 2 | Billing notification/query/idempotency missing after disabled checkout | source/proof + production approval gap | 3 | 2 | BFF-401a closed fail-closed checkout, but real activation must still trust notification/query only | `PLN-019`, `ACC-011` | `BFF-402a invalid/duplicate notify + query-disabled/idempotency proof` |
| 3 | Route B live director/character/feedback provider proof absent | operator/environment gap | 2 | 3 | Runtime preflight exists; provider env missing in shell and live success/error `AiUsageLog` not proven | `PLN-015`, `ACC-006`, `AUD-008` | `ITA-003h provider-enabled role orchestration proof` when env is available |
| 4 | Meeting summary citation/evidence boundary undefined | source gap | 2 | 3 | PIM quick-capture has evidence; AMM summary could accidentally promote raw notes/inferences | AMM workstream | Include in `AMM-001a` mapping helper |
| 5 | Full release-readiness BFF gate still blocked | proof gap | 3 | 2 | Platform/public/checkout gates improved; billing lifecycle still prevents pass | `PLN-019` | `BFF-404a` after BFF-402/403 |
| 6 | Relationship graph full edge model not migrated | operator/schema gap | 2 | 2 | No-schema proof is good; full edge table still requires migration/rollback approval | `PLN-024`, `ACC-016` | REL-004 only with explicit schema path |
| 7 | Live WebRTC/voice meeting proof not validated | operator/environment gap | 2 | 2 | Realtime BFF dry-run exists; AMM first version should remain mic-only and no raw audio | AMM / PIM | Defer until AMM-002+ and provider/browser permission setup |
| 8 | External NANDA registry/public discovery/signing | product/operator approval gap | 2 | 2 | NAP-005 local-only export complete; external remains forbidden | NAP / issue-question | Operator approval package only, not an automation slice |
| 9 | Cross-role live auth/browser matrix | operator/environment gap | 3 | 2 | RAS fixture/source proof exists; live staging matrix not claimed | RAS / release docs | Live auth QA after staging access |
| 10 | Production email/notification/payment enablement | production approval gap | 3 | 2 | Code implementation allowed; real env/provider enablement still manual and approval-gated | release/billing docs | Disabled/sandbox/code-only proof until env is ready |

## Selected Next Implementation Slice
Selected: `AMM-001a formal meeting contract + no-provider summary skeleton proof`.

Top-3 scoring rationale:
1. `AMM-001a` - 91/100: connects visit notes, interview memory, future meeting summary, CRM/previsit/theater writeback, and NANDA manifest readiness; safe no-provider source work exists; avoids adopting unverified prototype wholesale.
2. `BFF-402a` - 89/100: highest release-risk blocker after BFF-401a, but less connected to the LV3 immersive advisor core flow and likely depends on payment env / provider settings for full proof.
3. `ITA-003h` - 86/100: high immersion leverage and live provider proof is approved, but current shell env lacks provider keys/Route B provider flag; implementation should wait until env is present or be strictly guarded-disabled.

Acceptance outline for `AMM-001a`:
- Add or validate meeting pure types: `MeetingSummary`, `MeetingCitation`, `MeetingActionItem`, `MeetingParticipant`.
- Add a pure mapping helper from transcript turns + manual notes to a `MeetingSummary` skeleton.
- Citations must only reference existing turn/memory IDs and timestamps.
- Unknowns remain unknown; inferences remain inferences; no confirmed CRM fact is written.
- No provider call, no DB write, no raw audio persistence, no raw private transcript/provider payload/secret evidence.
- Add a deterministic dry-run script such as `pnpm meeting:contract-dry-run`.
- Do not stage existing untracked meeting/notes prototype files unless the next loop explicitly adopts and validates the whole AMM-owned source scope.

## NANDA / AgentFacts Readiness Summary
- Accepted AI modules remain `internal-only`; none are `external-ready` or `external-registered`.
- NAP-005 local adapter/export dry-run is complete and still local-only.
- `asai.theater.route_b` has source adoption and runtime preflight proof, but not live provider success/error proof.
- `asai.meeting.prototype` remains prototype-only and not registry-eligible.
- `AMM-001a` should either keep `asai.meeting.prototype` as prototype-only or create a distinct accepted AMM manifest/update only after source proof exists; no external NANDA publication is allowed.

## Docs Updated
- `AGENTS.md`: added AMM whole-product review note and next source-backed slice.
- `docs/2_agent-input/generated/agent-loop/issue-question.md`: recorded this scheduled review and next slice.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence to 0 and pointed next slice to `AMM-001a`.
- This report.

## Validation
- PASS: `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"`
- PASS: `git diff --check -- AGENTS.md docs/2_agent-input/generated/agent-loop/loop-state.json docs/2_agent-input/generated/agent-loop/issue-question.md docs/2_agent-input/generated/agent-loop/reports/2026-06-21_lv3-whole-product-gap-review-after-billing-gate.md`
- PASS: `git diff --check`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`

## DB / Prisma
- Prisma schema unchanged in this review.
- No Prisma validate/generate/db push.
- No DB read/write proof in this review.
- No provider call; no `AiUsageLog` expected.

## Git
- Stage only this loop's related files.
- Local commit required after validation.
- Push skipped by user instruction.
- Pre-existing unrelated dirty/untracked AMM/notes/manual/sidebar/previsit files are intentionally not staged.

## Remaining Blockers
- Source gap: AMM lacks accepted contract/proof and prototype adoption boundary.
- Release source/proof gap: BFF-402/BFF-403/BFF-404 remain open.
- Operator/environment gap: Route B live provider env, live WebRTC/voice browser proof, staging auth matrix, ECPay credentials/callback domain.
- Product/approval gap: external NANDA registry/public discovery/signing/cross-org access remains forbidden without explicit approval.
- Production approval gap: real payment/refund/void/destructive DB/remote deletion and real email/notification still require targeted approval/proof.

## Next Recommended Loop
Run `AMM-001a formal meeting contract + no-provider summary skeleton proof`.

Suggested prompt:
> Execute AMM-001a only. Add or validate AI Meeting pure contracts and a no-provider summary skeleton mapper: `MeetingSummary`, `MeetingCitation`, participants, action items, and transcript/manual-note -> summary skeleton. Add an executable dry-run proof that citations only point to existing turns/memories, unknowns do not become facts, inferences remain labeled, no provider is attempted, no DB write occurs, no raw audio/private transcript/provider payload is persisted, and existing untracked meeting/notes prototype files are not staged unless this loop explicitly adopts and validates the whole AMM-owned scope. Run `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, JSON/diff checks, and targeted dry-run proof. push skipped by user instruction.

push skipped by user instruction
