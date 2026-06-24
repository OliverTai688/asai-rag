# 2026-06-24 LV3 Whole-product Gap Review - Family Profile Runtime

## Scope

- Type: scheduled fifth-loop whole-product calibration.
- Trigger: `cadenceReview.normalLoopsSinceLastWholeProductReview=4`, so this loop used `lv3-whole-product-gap-review-loop.md`.
- Goal: re-rank the immersive advisor workflow after REL-006d made family/person profile metadata advisor-editable and browser/API-proven.
- Push: push skipped by user instruction.

## What Changed Since The Last Review

- The prior fifth-loop review selected `REL-006 family/person metadata profile boundary` because family members could not yet carry job/title, financial dependency, status, decision role, relationship context, or fact status.
- Four normal loops since then closed that gap:
  - `REL-006`: no-schema `FamilyMember.metadata.profile` allowlist, BFF/DTO/read boundary, source review consumption.
  - `REL-006b`: family profile -> preparation/theater handoff source review.
  - `REL-006c`: family profile -> Route B session `sourceGrounding.familyProfiles` readback and stage panel.
  - `REL-006d`: advisor editor UI on `/crm/[clientId]/relationships` plus browser/API readback proof.
- This report is not duplicate work because the old selected gap is resolved. The sharper new source gap is later in the same chain: `familyProfiles` reaches the Route B session panel, but unlike meeting signals and edge shadow, it is not yet consumed by next-turn/provider runtime or feedback review/provider grounding.

## Anti-duplicate Gate

- Resolved since prior review: family/person profile metadata is no longer a source/UI input gap.
- Still blocked: formal `RelationshipEdge` table remains schema/migration approval; relationship confirmation persistence remains A/B/C product decision.
- New/changed: family profile runtime grounding is an unblocked no-schema source gap. It is not the same as formal `RelationshipEdge`, and it can move the product forward without DB migration or provider calls.
- Safe fallback if implementation is blocked: run `pnpm theater:family-profile-session-source-qa`, `pnpm theater:route-b-next-turn-dry-run`, and `pnpm theater:route-b-provider-prompt-context-dry-run` to prove the current boundary and confirm the missing runtime context.

## Six Frames

1. Advisor workflow/onboarding: 顧問已能在關係圖編輯人物 profile，下一個弱點是進入劇場後下一回合預覽沒有明確顯示「這些人物欄位已被 runtime 使用」。
2. Source-of-truth/BFF: `FamilyMember.metadata.profile` 與 Route B `sourceGrounding.familyProfiles` 已是 owner-scoped safe DTO；runtime consumer 尚未接上。
3. AI reasoning/evidence: preparation/theater handoff 有 FACT/INFERENCE/UNKNOWN 與 source counts；next-turn/provider prompt context 目前只採用 meeting signals 與 edge shadow，少了 family profile evidence。
4. Theater/relationship immersion: stage panel 有人物欄位來源，但角色下一句與 session-end feedback 還不能用這些欄位調整回應、旁白補問或回饋 evidence。
5. QA/compliance/release-proof: 最近 REL proof 均為 no-provider/no-schema/no confirmed fact write；下一張卡可用同樣模式補 executable runtime proof，不需要 production writes。
6. NANDA / AgentFacts protocol: `asai.theater.route_b` manifest 已列 `TheaterRouteBScene.sourceGrounding.familyProfiles`，但尚未列 next-turn/provider runtime grounding capability 或 feedback evidence refs；readiness 必須維持 `internal-only`。

## Candidate Score

1. `REL-006e family profile -> Route B next-turn/provider runtime grounding` - 29/30, selected next.
   - Severity 2, leverage 3: closes relationship graph -> theater runtime loop and mirrors already-proven meeting-signal / edge-shadow patterns.
   - Safety 10: no Prisma schema, no provider call required, no DB write, no relationship graph/VisitPlan/confirmed CRM fact write.
   - Verifiability 9: source audit already proves the gap; next loop can add deterministic QA around `route-b-next-turn`, provider prompt context, UI marker, and AgentFacts refs.
2. `REL-006f family profile -> Route B feedback review/provider grounding` - 27/30.
   - Severity 2, leverage 3: completes the session-end learning loop so feedback can cite profile grounding safely.
   - Slightly lower dependency order because feedback should consume the same grounding model after next-turn/provider context is defined.
3. Formal `REL-004 RelationshipEdge` table - 26/30 but blocked.
   - Severity 2, leverage 3: durable edge writes/backfill remain valuable, but require additive Prisma schema/migration/rollback approval and DB proof.
4. Relationship confirmation persistence - 25/30 but product-decision blocked.
   - Severity 2, leverage 3: durable advisor card state needs A/B/C decision; transient boundary remains correct.
5. AI interview/meeting writeback refinement into relationship graph candidates - 24/30.
   - Severity 2, leverage 2: important for interview -> writeback, but current untracked notes/research worktree needs explicit adoption or a selected AMM slice.

## Top 10 Gaps

1. Family profile next-turn/provider runtime grounding: source gap, new. Owner: REL-006e / Route B runtime. Evidence: `route-b-next-turn.ts` consumes meeting and edge shadow, not family profiles. Missing: runtime summary, provider prompt context, UI preview marker, manifest refs, QA.
2. Family profile feedback review/provider grounding: source gap, new. Owner: REL-006f / Route B feedback. Evidence: feedback review consumes edge shadow only. Missing: feedback contract/provider input/review evidence, UI panel, QA.
3. Formal `RelationshipEdge` persistence: operator/schema gap, still blocked. Owner: REL-004. Evidence: REL-004a-g no-schema proofs. Missing: approval, migration/rollback, DB proof.
4. Relationship confirmation persistence: product decision, still blocked. Owner: Visit/preparation confirmation. Evidence: transient state boundary proof. Missing: A/B/C product answer.
5. First-run cross-flow browser smoke after newest family profile work: residual proof gap. Owner: LV3 cross-flow QA. Evidence: REL-006d browser proof covers editor; full clean browser path remains optional residual. Missing: operator-run clean flow if desired.
6. AI interview/meeting notes prototype adoption boundary: product/source ownership gap. Owner: AMM/notes. Evidence: unrelated untracked notes/research files exist. Missing: explicit selected AMM slice or ignore/adoption decision.
7. AMM pgvector retrieval: operator/environment gap, still blocked. Owner: AMM-007. Evidence: deterministic lexical memory path. Missing: Supabase pgvector/index enablement and embedding write proof.
8. Live provider evidence for Route B runtime/feedback where product requires it: proof/operator-env gap. Owner: ITA Route B. Evidence: guarded routes and no-provider dry-runs. Missing: live provider success/error `AiUsageLog` proof and cost evidence.
9. External NANDA / third-party registry publication: external approval gap, intentionally paused. Owner: NAP. Evidence: internal manifests and registry QA. Missing: explicit approval, signing, public discovery, cross-org policy.
10. Production payment/email/notification enablement: external/manual env gap. Owner: BFF/manual-setting. Evidence: guarded disabled contracts. Missing: provider env/callback and explicit high-risk approvals.

## Owner Doc Updates

- Added `REL-006e` and `REL-006f` to `AGENTS.md` and `PLN-024`.
- Added acceptance criteria `D2.8` and `D2.9` to `ACC-016`.
- Updated `loop-state.json` cadence back to 0 and pointed the next normal loop at `REL-006e`.
- Did not update `issue-question.md` because this review introduces no new operator decision; the existing formal `RelationshipEdge` and relationship confirmation blockers remain accurate.

## Source Evidence

- `src/domains/theater/route-b-next-turn.ts` currently builds runtime grounding for `meetingRelationshipSignals` and `relationshipEdgeShadow`, and passes only those into next-turn input summary.
- `src/domains/theater/route-b-provider-prompt-context.ts` only accepts `meetingRelationshipSignalGrounding` and `relationshipEdgeShadowGrounding`.
- `src/domains/theater/route-b-feedback-review.ts` builds feedback grounding from relationship edge shadow; family profile feedback evidence is absent.
- `src/domains/ai-protocol/manifest.ts` names `TheaterRouteBScene.sourceGrounding.familyProfiles`, but runtime next-turn/provider/feedback refs still need dedicated proof entries.

## Validation

- PASS: `pnpm theater:family-profile-session-source-qa`.
- PASS: `pnpm theater:route-b-next-turn-dry-run`.
- PASS: `pnpm theater:route-b-provider-prompt-context-dry-run`.
- PASS: `pnpm ai:protocol-registry-qa`.
- PASS: `git diff --check`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed` (exit 0; existing unrelated warning remains in `scripts/public-status-degraded-qa.mjs`).

## DB/Prisma

- No DB writes.
- No Prisma schema change.
- No Prisma generate/validate/db push.
- No provider call.
- No `src/generated` changes.

## NANDA Alignment

- Active AI modules remain `internal-only`.
- `asai.theater.route_b` already declares family profile source grounding, but next loop must add capability/proof refs for runtime context before claiming that next-turn/provider/feedback consumes family profile evidence.
- No external registry publication, public discovery endpoint, signing, credentialing, or cross-org agent access was attempted.

## Residual Self-runnable Evidence

- Re-run current family profile session source proof: `pnpm theater:family-profile-session-source-qa`.
- Re-run current next-turn/provider baseline: `pnpm theater:route-b-next-turn-dry-run && pnpm theater:route-b-provider-prompt-context-dry-run`.
- If a full browser smoke is desired after a dev server starts: create/edit a family profile under `/crm/[clientId]/relationships`, generate a preparation/theater handoff, open `/theater/[sessionId]`, then check the existing family profile source panel plus next-turn preview for no horizontal overflow and console error 0. This is residual evidence; it does not replace the required source implementation for REL-006e.

## Blockers

- Product/schema: formal `RelationshipEdge` table approval, migration/rollback, DB proof.
- Product/data-model: relationship confirmation persistence A/B/C answer.
- Operator/env: AMM pgvector extension/index path.
- External publication: NANDA/third-party registry remains unapproved.
- Worktree hygiene: unrelated dirty/untracked files remain intentionally unstaged.

## Next Recommended Loop

Implement `REL-006e family profile -> Route B next-turn/provider runtime grounding`:

- Add `TheaterRouteBFamilyProfileRuntimeGrounding` beside the existing meeting/edge runtime grounding types.
- Consume `RouteBSessionSnapshot.scene.sourceGrounding.familyProfiles` in `buildTheaterRouteBNextTurnDraft()`.
- Add `familyProfileGrounding` and `promptRules.useFamilyProfilesAsRuntimeEvidence=true` to `buildRouteBProviderPromptContext()`.
- Show `data-route-b-next-turn-family-profile-runtime-grounding` in `/theater/[sessionId]`.
- Update AgentFacts manifest/registry QA refs and run the REL-006e proof set without provider calls or fake `AiUsageLog`.

push skipped by user instruction
