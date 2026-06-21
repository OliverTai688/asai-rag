## 2026-06-21 - LV3 Whole-product gap review: BFF-204 theater/RAG hardening

### Scope
- Type: scheduled fifth-loop whole-product gap review.
- Trigger: `normalLoopsSinceLastWholeProductReview = 4`, so the loop used `lv3-whole-product-gap-review-loop.md`.
- Goal: review the immersive advisor flow after cross-flow proof, NAP source adoption, and NAP-005 local-only export proof, then select the next implementation slice.
- No source code, Prisma schema, provider call, production write, email, notification, payment, external registry publication, public discovery, or cross-org agent access.

### Candidate score
1. `BFF-204a legacy theater launch gate and guarded Route B boundary proof` - Impact 5 / Risk 4 / Leverage 5 / Readiness 4 = 18. Theater is the highest-risk core surface because it bridges preparation packages into practice; the missing proof is launch boundary clarity, not another architecture draft.
2. `BFF-205a RAG guarded-disabled + assistant/interview persistence hygiene proof` - Impact 4 / Risk 4 / Leverage 4 / Readiness 4 = 16. RAG and assistant/interview hygiene are release-critical, but this is secondary because RAG is already intentionally disabled_guarded and can be proven after theater boundary.
3. `AMM/quick-capture notes workspace baseline decision` - Impact 4 / Risk 3 / Leverage 4 / Readiness 2 = 13. AI meeting and notes prototypes are valuable, but their docs/files are currently untracked and should not be treated as committed baseline without selecting an AMM slice.

### Selected slice
- Selected next normal implementation: `BFF-204a legacy theater launch gate and guarded Route B boundary proof`.
- Required next-loop proof:
  - `/theater` list/session basic browser flow.
  - `/api/ai/theater` and `/api/ai/theater/score` audit posture.
  - Route B guarded runtime/interactions proof.
  - no-provider `AiUsageLog` unchanged proof.
  - staging/demo gate remains visible; no production-ready or live multi-character provider claim.

### Six-frame gap findings
1. Advisor workflow/onboarding: the clean client -> graph -> previsit -> quick-capture -> Route B no-provider journey is proven; the next user-facing risk is whether entering theater feels live-ready when it is still guarded.
2. Source-of-truth/BFF: BFF contracts are broadly stronger, but BFF-204 and BFF-205 remain unchecked; the untracked AI meeting/notes prototype must not become implicit source-of-truth.
3. AI reasoning/evidence: NAP manifests and local-only adapter/export proof are complete; remaining AI evidence risk is fake RAG retrieval or Theater provider readiness claims without usage logs.
4. Theater/relationship immersion: Route B setup, persistence, and interaction shell exist, but live director/character/five-view feedback still needs approval/provider/cost evidence.
5. QA/compliance/release-proof: private beta evidence still needs ACC-014 style gate evidence after BFF-204/205; production email/payment/notification and live provider approvals remain outside automation authority.
6. NANDA/AgentFacts: all current AI modules stay internal-only; no external registry publication, signing, public discovery, or cross-org access is approved.

### Changes
- Added whole-product review notes to `AGENTS.md` and `PLN-019_full-site-bff-batch-tasks-v1.0.md`.
- Reset loop cadence counter in `loop-state.json` to 0 and pointed the next implementation slice to BFF-204a.
- Added this concise report.

### Validation
- Pass:
  - `node -e "JSON.parse(...loop-state.json)"` - pass.
  - `git diff --check -- <this-loop-files>` - pass.
  - `pnpm exec tsc --noEmit --pretty false` - pass.
  - `pnpm lint:changed` - pass; linted 177 changed files vs `origin/main` with no new lint failure.
  - `pnpm ai:bff-audit` - pass; 23 AI/RAG routes, 0 gaps, `/api/ai/theater`, `/api/ai/theater/score`, and `/api/rag` posture included.
  - `pnpm ai:protocol-registry-qa` - pass; 11 manifests match inventory and remain internal-only.

### Evidence
- Prior completed proof referenced, not rerun as a substitute for BFF-204a:
  - `pnpm lv3:cross-flow-no-provider-qa` from `2026-06-21_lv3-cross-flow-no-provider-proof-pack.md`.
  - NAP-003c and NAP-005 reports for source adoption and local-only adapter/export dry-run.
- This review is a planning/proof-selection loop; BFF-204a proof still needs the next implementation loop.
- Current posture proof: `ai:bff-audit` and `ai:protocol-registry-qa` confirm Theater legacy / Route B / RAG manifests remain auditable, internal-only, and non-published.

### DB/Prisma
- No DB write.
- No Prisma schema change.
- No provider call; no `AiUsageLog` expected.

### Git
- Push policy: push skipped by user instruction.
- Commit hash: pending at report creation.

### Blockers
- Live Route B provider/director/character/five-view feedback requires explicit operator approval and success/error `AiUsageLog` evidence.
- Provider-backed RAG retrieval remains disabled_guarded until privacy, source, provider, and usage proof are approved.
- AI meeting / notes prototype is untracked and must be selected explicitly before staging or claiming it as product baseline.
- Production email, notification, payment/refund, destructive DB operations, external registry publication, public discovery, and cross-org agent access remain blocked by policy.

### Next Recommended Loop
- Run `BFF-204a legacy theater launch gate and guarded Route B boundary proof`.
- Fallback if theater env/session proof is blocked: `BFF-205a RAG guarded-disabled + assistant/interview persistence hygiene proof`.
