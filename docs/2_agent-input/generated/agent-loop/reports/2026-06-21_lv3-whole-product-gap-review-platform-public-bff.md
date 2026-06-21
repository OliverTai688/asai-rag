# 2026-06-21 LV3 Whole-product Gap Review - Platform / Public BFF Frontier

## Scope
- Type: scheduled fifth-loop whole-product review.
- Trigger: `normalLoopsSinceLastWholeProductReview = 4`.
- Review target: client creation -> relationship graph -> visit preparation -> reasoning/evidence -> theater stage -> private/group interaction/state proposal -> AI interview/quick-capture writeback.
- No source implementation, Prisma schema change, provider call, production write, real email/notification/payment, external registry publication, public discovery, or cross-org agent access.

## Anti-duplicate Review Gate
- Latest completed loops:
  - `BFF-303a`: client portal token lifecycle, response whitelist, revoked/expired/rotated proof.
  - `BFF-302a`: org write capability/audit proof.
  - `BFF-205a`: RAG guarded-disabled, Assistant/Interview hygiene proof.
  - `BFF-204a`: Theater launch boundary and Route B guarded proof.
- Prior whole-product review selected BFF-204/BFF-205 because Theater/RAG could be misread as live-ready. That risk is now materially reduced by proof commands and completion notes.
- This review is not duplicate work: the frontier moved from AI/Theater/client portal boundaries to the remaining platform/public/billing BFF gates required before a credible private-beta/release-readiness surface can be trusted.

## Target Flow Inventory
| Flow step | Classification | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Client creation | mostly ready | BFF-103 client lifecycle, related-list recovery, compliance fields preserved | REL-004 edge table schema still needs approval for full network model |
| Relationship graph | ready with source/proof caveat | REL-001/002/003/005, ACC-016 docs | Full edge model is operator/schema gated |
| Visit preparation | ready | BFF-104, BFF-202, previsit reasoning UI, theater handoff proof | Provider live proof still governed by `AiUsageLog` |
| Reasoning/evidence | ready | facts/inferences/unknowns in Visit/Report/Issues/Quick-capture | Must keep no raw provider/private transcript leakage in future changes |
| Theater stage | ready for no-provider Route B shell | ITA-003f/S1 stage map, BFF-204a, ITA-003g preflight | Live director/character/feedback provider remains approval blocker |
| Private/group chat and state proposal | ready no-provider | ITA-003e, stage map proof | AI orchestration and five-view feedback still guarded-disabled |
| AI interview/quick-capture writeback | ready no-provider + provider route guarded | PIM-010, PIM-011b/c, BFF-205a | Untracked AI meeting/notes prototype is not committed baseline |
| Client portal | ready BFF proof | BFF-303a | Client-user OTP/Auth.js remains future product/auth decision |
| Org/member dashboard/admin | mostly ready | BFF-101/301/302, RAS-005 | Live platform/admin release-readiness still incomplete |
| Platform/public/billing release gates | source/proof gap | BFF workstream has open BFF-304/305/401-404 | Highest next implementation frontier |

## Six-frame Findings
1. Advisor workflow and onboarding: member-facing core workflow is now operable, but operator/admin cannot yet inspect a reliable release-readiness or break-glass surface without relying on scattered scripts.
2. Source-of-truth and BFF: BFF-303 closed client portal, leaving BFF-304 platform APIs as the highest-risk unproven server-owned boundary.
3. AI reasoning and evidence: AI route boundaries are stronger after BFF-204/205; remaining AI risk is not missing docs but live provider approval for Route B/RAG and ensuring platform readiness reports do not overclaim provider availability.
4. Theater/relationship immersion: no-provider Route B stage map is credible; live multi-character AI and five-view qualitative feedback remain approval/proof gaps, not next safe source slice.
5. QA, compliance, and release-proof: release readiness cannot be trusted until platform session separation, sensitive read audit, break-glass reason/scope/expiry, public status, and billing disabled/sandbox posture are machine-checkable.
6. NANDA / AgentFacts protocol: all accepted AI modules remain internal-only with local adapter/export proof; `asai.meeting.prototype` remains prototype-only and must not be represented as registry-ready.

## Top Gaps
| Rank | Gap | Class | Severity | Leverage | What changed / status | Owner doc | Smallest next slice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Platform BFF session separation, metadata, sensitive-read audit, break-glass | source/proof gap | 3 | 3 | New top frontier after BFF-303 closed client portal | `PLN-019`, `ACC-011` | `BFF-304a platform session separation + metadata/audit proof` |
| 2 | Public BFF status/CTA/lead boundary | source/proof gap | 2 | 3 | Still open; now behind platform because platform gates release admin truth | `PLN-019`, `ACC-011` | `BFF-305a public status and CTA availability proof` |
| 3 | Billing checkout / subscription capability disabled-or-sandbox posture | production approval + source gap | 3 | 2 | Still blocked for production credentials; safe disabled/sandbox BFF slice exists | `PLN-019`, ACC-011 billing gates | `BFF-401a checkout disabled/sandbox server-payload proof` |
| 4 | Release readiness BFF aggregation | proof gap | 3 | 3 | Blocked until BFF-304 and billing/public gates are clearer | `PLN-019` | `BFF-404a release-readiness aggregator after BFF-304/305/401` |
| 5 | Route B live director/character/feedback provider and five-view runtime | operator approval gap | 2 | 3 | Still blocked; BFF-204/ITA-003g reduced false-readiness risk | `PLN-015`, `ACC-006` | Provider-approved success/error `AiUsageLog` proof only after operator approval |
| 6 | AI meeting / notes prototype not committed baseline | source/proof gap | 2 | 2 | Still untracked; PIM-011c already covers committed quick-capture UI | `AUD-008`, future AMM owner docs | Select AMM explicitly or keep prototype excluded |
| 7 | Relationship graph full edge model | operator/schema gap | 2 | 2 | REL no-schema proof is good; REL-004 still needs migration/rollback approval | `PLN-024`, `ACC-016` | REL-004 only with schema approval |
| 8 | Live platform/staging auth matrix | operator/environment gap | 3 | 2 | RAS fixture proof exists, live auth/session matrix not claimed | `PLN-021`, `ACC-013` | Cross-role live auth QA after staging access |
| 9 | External NANDA registry/public discovery/signing | operator/product approval gap | 2 | 2 | NAP-005 local-only proof exists; external state still forbidden | `AUD-008`, issue-question | Operator approval package, not an automation source slice |
| 10 | Production email/notification/payment | production approval gap | 3 | 2 | Still outside authority | release/billing docs | Disabled/sandbox posture only until explicit approval |

## Selected Next Implementation Slice
Selected: `BFF-304a platform session separation + metadata/audit proof`.

Top-3 score rationale:
1. `BFF-304a` - 94/100: severity 3 + leverage 3; closes the next release-facing authz/audit gap after client portal BFF completion, and unlocks later BFF-404 readiness aggregation.
2. `BFF-305a public status and CTA availability proof` - 84/100: important public-safe boundary, but less severe than platform break-glass/sensitive-read audit.
3. `BFF-401a checkout disabled/sandbox server-payload proof` - 81/100: high payment risk, but production credentials remain approval-gated; should follow platform/public gates or be done in disabled posture only.

`BFF-304a` acceptance outline:
- App/member/org/client portal sessions calling platform APIs return 401/403.
- Platform success returns only organization metadata, AI usage aggregate, audit metadata, and release-readiness aggregate fields.
- Sensitive reads write `AuditLog` and return a proof id.
- Break-glass/impersonation requires reason, target, scope, expiry, actor, and risk acceptance; invalid/missing/expired inputs fail closed.
- Response sentinel checks prove no client name, phone/email, report body, private transcript, policy number, provider raw payload, secret, token, or raw payment data.
- If live platform session is unavailable, deterministic source/fixture proof is allowed only as fallback and must not be called live platform auth proof.

## NANDA / AgentFacts Readiness Summary
- Current accepted AI modules remain `internal-only`.
- `NAP-003a/b/c` source adoption and `NAP-005` local-only adapter/export proof are complete.
- No module is `external-ready` or `external-registered`.
- `asai.theater.route_b` still needs operator-approved live provider success/error `AiUsageLog` before any external capability claim for director/character/feedback.
- `asai.rag.private_beta` remains guarded-disabled; no provider-backed retrieval claim.
- `asai.meeting.prototype` is prototype-only, not accepted as product or registry baseline.

## Docs Updated
- `AGENTS.md`: added BFF-304a whole-product review note.
- `docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md`: added BFF-304a next-slice note.
- `docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md`: added Platform BFF Completion Gates.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence to 0 and pointed next slice to BFF-304a.

## Validation
- PASS: `git diff --check`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed`

## DB/Prisma
- No Prisma schema change.
- No Prisma validate/generate/db push.
- No DB read/write proof in this review loop.
- No provider call; no `AiUsageLog` expected.

## Git
- Commit: local commit created after validation; final response carries the exact hash.
- Push: push skipped by user instruction.
- Unrelated pre-existing dirty files were intentionally not staged.

## Blockers
- Source/proof: BFF-304/305/401/404 remain open.
- Operator/environment: live platform auth matrix, staging access, production provider/payment/email/notification approvals.
- Product decision: external NANDA publication/signing/public discovery/cross-org access.
- Production approval: destructive DB operations, production writes, real payment/refund, real email/notification.

## Next Recommended Loop
Run `BFF-304a platform session separation + metadata/audit proof`.

Suggested prompt:
> Execute BFF-304a only. Prove platform app-session separation, metadata/aggregate-only platform responses, sensitive-read `AuditLog` proof id, and break-glass reason/scope/expiry/actor/target validation. If live platform auth/session is unavailable, use deterministic source/fixture proof and state clearly that it is not live platform auth proof. Do not enable production impersonation, real payment/email/notification, external registry publication, or provider-backed RAG/Route B.
