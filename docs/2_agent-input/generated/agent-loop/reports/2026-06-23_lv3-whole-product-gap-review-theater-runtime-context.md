# 2026-06-23 LV3 Whole-Product Gap Review - Theater Runtime Context

## Scope

- Automation: `10-agents-batch-task`
- Loop type: scheduled fifth-loop whole-product architecture / experience / interface / safety review.
- LV3 target: advisor-system maturity across client -> relationship signals -> preparation -> theater -> Route B session runtime.
- Push policy: local commit only; push skipped by user instruction.

## Recent Loop Delta

- Recent normal loops connected meeting-derived relationship signals from prep/BFF UI into theater handoff, stage review UI, and persisted Route B session `scene.sourceGrounding.meetingRelationshipSignals`.
- The last two normal loops were L2 source-backed implementation/proof slices, not docs-only loops:
  - `LV3-THEATER-MEETING-SIGNAL-STAGE-REVIEW-001`: surfaced meeting signal cards in theater stage review.
  - `LV3-THEATER-MEETING-SIGNAL-STAGE-SESSION-001`: persisted meeting signal source grounding into Route B session snapshot and readback UI.
- This review is therefore cadence-required and not a repetition of checklist/proof-only work. It should reset cadence and point the next normal loop to source implementation.

## Candidate Score

| Candidate | Score | Reason |
| --- | ---: | --- |
| `LV3-THEATER-MEETING-SIGNAL-RUNTIME-CONTEXT-001` | 47/50 | Connects persisted meeting signal source grounding to Route B next-turn/provider runtime, bridges theater session UI + provider prompt context + AgentFacts, and can be proven with no-provider dry-runs plus usage-log guarded live-path checks. |
| `LV3-RELATIONSHIP-CONFIRMATION-PERSISTENCE-001` | 39/50 | Would close advisor-state relationship confirmation persistence, but still needs product decision on VisitPlan JSON subdocument vs dedicated table/migration. |
| `LV3-ROUTE-B-STAGE-MAP-ACCEPTANCE-RECONCILE-001` | 34/50 | Source and QA indicate stage-map behavior exists, but owner acceptance checkboxes are stale; useful as evidence hygiene, lower leverage than runtime context consumption. |

## Selected Slice

Selected next normal slice:

`LV3-THEATER-MEETING-SIGNAL-RUNTIME-CONTEXT-001`: carry persisted `RouteBSessionSnapshot.scene.sourceGrounding.meetingRelationshipSignals` into `buildTheaterRouteBNextTurnDraft()` and `RouteBProviderPromptContext` as least-disclosure runtime grounding.

Acceptance boundary added to `ACC-006`:

- Next-turn draft emits safe card/unknown/narrator-question summary only.
- Provider prompt context or next-turn provider input consumes that summary without raw ids, transcripts, provider payloads, contact data, or policy details.
- Provider-disabled path remains no-provider/no-fake-usage.
- Live provider path still writes THEATER `AiUsageLog` success/error before returning any candidate.
- Theater session preview can expose only a safe marker/summary that runtime grounding was used.
- AgentFacts manifest remains internal-only and gains proof/evidence refs.

## Whole-Product Gaps

1. `S2/L3 source`: Meeting signal grounding is persisted and visible, but not yet consumed by Route B next-turn/provider runtime. This is now the most valuable next cross-surface source slice.
2. `S2/L3 product decision`: Relationship confirmation advisor-state persistence remains unresolved; `issue-question.md` already records the VisitPlan JSON vs dedicated table decision.
3. `S1/L2 proof/docs`: Route B stage map acceptance appears stale compared with current source/QA proof; reconcile after runtime context work if no higher-value source slice is available.
4. `S2/L2 source/proof`: Formal RelationshipEdge persistence/migration remains gated; derived relationships can continue to power theater/prep until that product decision lands.
5. `S2/L2 environment`: Live browser/API/DB residual evidence can be self-run by operator when needed; do not spend an implementation loop only chasing screenshots when source proof and dry-runs are available.
6. `S1/L2 NANDA`: AI modules remain internal-only or registry-draft. No external AgentFacts/NANDA publication is approved.

## NANDA Alignment

- This review keeps the theater AI module in `internal-only` registry readiness.
- The next source slice must update the AgentFacts-style manifest with runtime context capability/evidence refs, while preserving least-disclosure claims and no external publication.
- Provider calls remain governed by existing THEATER `AiUsageLog` success/error requirements.

## Validation

Commands run:

- PASS: `git diff --check`
- PASS: `pnpm exec tsc --noEmit --pretty false`
- PASS: `pnpm lint:changed` exited 0. It reported one existing branch-level warning in `scripts/public-status-degraded-qa.mjs` (`existsSync` unused), outside this loop's staged files.

Targeted implementation proof is intentionally deferred to the selected next source slice because this review only updates owner acceptance/reporting state.

## DB / Prisma

- No DB writes.
- No Prisma schema, generate, validate, or db push.
- No provider call.

## Git

- Start status included unrelated pre-existing changes in manual docs, sidebar, AI meeting docs, and notes prototype files; those were not touched or staged.
- This loop should stage only:
  - `docs/08_acceptance-and-qa/ACC-006_interview-theater-dual-agent-acceptance-framework-v1.0.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - this report
- Push skipped by user instruction.

## Blockers

- Product decision: relationship confirmation persistence shape remains open.
- External publication: NANDA/AgentFacts external registry remains blocked until explicit operator approval.
- Residual live evidence: operator can run live browser/API/DB proof from a dev server when desired; it should not displace the next source-backed runtime-context implementation.

## Next Recommended Loop

Run the normal `lv3-immersive-loop.md` and select `LV3-THEATER-MEETING-SIGNAL-RUNTIME-CONTEXT-001`.

Recommended proof commands for the next implementation loop:

- `pnpm theater:route-b-next-turn-dry-run`
- `pnpm theater:route-b-provider-prompt-context-dry-run`
- `pnpm theater:route-b-next-turn-provider-dry-run`
- `pnpm theater:meeting-signal-session-source-qa`
- `pnpm ai:protocol-registry-qa`
- `pnpm ai:bff-audit`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint:changed`
