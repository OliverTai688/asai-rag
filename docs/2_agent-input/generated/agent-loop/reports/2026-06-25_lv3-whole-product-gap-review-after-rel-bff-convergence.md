# 2026-06-25 LV3 whole-product gap review after relationship BFF convergence

## Scope

- Loop type: scheduled fifth-loop whole-product gap review.
- Trigger: `normalLoopsSinceLastWholeProductReview=4`; this loop executed `lv3-whole-product-gap-review-loop.md`.
- Selected slice: L4/L3 product architecture, source-of-truth, theater immersion, QA, compliance, and NANDA readiness review.
- Source changes: none by this loop. Pre-existing dirty/untracked source and docs were read as current workspace context but not staged by this loop.
- Provider/Prisma: no provider calls, no Prisma schema/generate/db push, no production write.

## What Changed Since Last Review

- `REL-007`, `REL-008`, and `REL-009` moved the client relationship graph from fragile local/UI assumptions toward BFF-backed source review and write proof.
- `/crm/[clientId]/relationships` now has evidence for BFF source convergence, linked-client navigation, parent/relation hardening, and no-provider write proof.
- The next highest LV3 risk is no longer basic graph rendering. It is the boundary between accepted source surfaces and immersive/creation surfaces: `/notes` still renders a local-state prototype while AgentFacts/QA expect quarantine, and Route B theater stage proof still has stale stage-map reconciliation.
- This review is not a duplicate documentation loop: it uses the changed source landscape after relationship BFF convergence to re-rank the next implementation slice.

## Recent Loop Classification

- `REL-009 BFF-backed relationship map`: L2 source/UI slice + executable API/browser proof.
- `REL-008 linked-client map navigation`: L2 source/UI slice + executable source/browser proof.
- `REL-008 linked-client relationship network`: L2 source/BFF slice + executable API proof.
- `REL-007 family parent/relation hardening`: L2 BFF integrity slice + executable write proof.

Anti-repetition result: this scheduled review is allowed by cadence and shifts the next normal loop from relationship graph convergence to source-boundary/theater-readiness gaps.

## Six-Frame Review

1. Advisor workflow/onboarding: the client -> relationship graph path is materially stronger, but global note capture can still steer advisors into a local prototype instead of the accepted meeting/previsit notes workspace.
2. Source-of-truth/BFF: relationship graph BFF convergence improved. Remaining source gaps are `/notes` prototype quarantine, graph scale/a11y residuals, and undecided durable `RelationshipEdge` / confirmation persistence models.
3. AI reasoning/evidence: AgentFacts manifests are broad and internal-only, but `meeting:notes-hub-quarantine-qa` shows one manifest/evidence claim is not satisfied by the current source.
4. Theater/relationship immersion: Route B has many source and no-provider proofs, but the stage still needs a more operable relationship-map-centered rehearsal surface and the reconcile script is stale.
5. QA/compliance/release proof: direct proof reliability still depends on explicit base URL / warmed server discipline; stale acceptance markers and the notes quarantine failure should not be reported as pass.
6. NANDA/AgentFacts: `ai:protocol-registry-qa` and `ai:protocol-readiness-qa` pass; all 11 agents remain `internal-only`; no external publication, signing, public discovery, or cross-org access was attempted.

## Top Gaps

| Rank | Gap | Class | Sev | Lev | Evidence | Smallest next slice |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `/notes` route contradicts the accepted notes source boundary | source/proof | 3 | 3 | `src/app/(dashboard)/notes/page.tsx` imports `@/components/notes/notes-board`; `pnpm meeting:notes-hub-quarantine-qa` fails 7 route-source checks while manifest evidence expects quarantine. | Replace `/notes` with a safe hub that points to `/pre-visit/[planId]/notes`, disables local note store, and passes `meeting:notes-hub-quarantine-qa`. |
| 2 | Route B theater stage is not yet the primary operable relationship rehearsal workspace | product/source/proof | 3 | 3 | `RES-026` calls for a relationship-map-centered multi-character stage; `pnpm theater:route-b-stage-map-acceptance-reconcile-qa` still fails on stale private-chat marker. | No-provider Route B stage source-boundary slice: update stage map/private lane proof and reconcile script around current components. |
| 3 | Cross-flow proof harness remains base-url/cold-start fragile | proof | 2 | 3 | REL-009 first proof hit another app on `localhost:3000`; previous cold-start wrapper timed out at `/api/public/status`, while warmed dedicated server proof passed. | Require explicit ASAI base URL or add ASAI public-status signature/auto-warm guard before running browser/API proof. |
| 4 | Relationship graph residual polish remains after BFF convergence | source/proof | 2 | 2 | `PLN-024` residual N7/N8/N9: full refetch/perf, canvas a11y partial, no graph size/dup limit. | Graph polish slice: partial refresh or revalidate strategy, canvas keyboard/a11y affordance, graph limit/dedup proof. |
| 5 | Formal `RelationshipEdge` durable table remains undecided | product/schema | 2 | 3 | Shadow/no-schema consumers exist; formal table/backfill/migration still need approval or explicit defer. | Operator chooses approve additive schema + rollback/DB proof, or defer. |
| 6 | Relationship confirmation persistence remains undecided | product/schema | 2 | 3 | Confirmation/state boundaries exist but refresh/new-context durability is still A/B/C. | Operator chooses JSON subdocument, dedicated table, or defer. |
| 7 | Provider-backed Route B runtime is still guarded | provider/proof | 2 | 2 | No-provider and provider-candidate paths exist; live provider director/character/feedback proof requires success/error `AiUsageLog` and env approval. | Run provider proof only with approved env/flag and usage-log evidence. |
| 8 | AgentFacts manifest can drift from source proof | protocol/proof | 2 | 2 | Registry QA passed because manifest contains expected refs; `meeting:notes-hub-quarantine-qa` failed source contract. | Pair protocol QA with targeted source contract commands when changing AI entrypoints. |
| 9 | External NANDA publication remains paused | operator/protocol | 2 | 2 | `ai:protocol-readiness-qa` reports 11 internal-only agents and publication-disabled export gates. | Continue internal manifests only until explicit approval. |
| 10 | LV3 maturity still does not imply public launch readiness | release boundary | 2 | 2 | Monitoring/auth/payment/email/notification/provider/public launch approvals remain separate in launch docs. | Keep launch readiness gates separate from LV3 immersive maturity. |

## Top-3 Candidate Slice Scores

| Candidate | Score | Why |
| --- | ---: | --- |
| `AMM notes-hub source-boundary quarantine` | 9.2 | Direct source/proof contradiction, affects AI meeting/notes creation entry, aligns with AgentFacts, no provider/DB required, and has a ready failing acceptance command. |
| `TDF Route B rehearsal stage source/proof reconciliation` | 9.0 | Strong LV3 immersion leverage now that relationship graph source is stronger; connects preparation/relationship sources to theater, and can fix stale stage-map proof. |
| `LV3 proof harness base-url/cold-start hardening` | 8.4 | Improves repeatable evidence and prevents wrong-app localhost false failures, but product source contradictions should be fixed first. |

## Selected Next Implementation Slice

Next normal loop should select:

`AMM notes-hub source-boundary quarantine`

Acceptance shape:

- Replace the global `/notes` route with an explicit safe hub/quarantine page.
- Include `data-testid="notes-hub-quarantine"`, `data-local-note-store="disabled"`, and `data-accepted-notes-source="/pre-visit/[planId]/notes"`.
- Link advisors into `/pre-visit` / accepted `CLIENT_MEETING` workspace rather than rendering local `NotesBoard`.
- Do not import `@/components/notes`, `@/domains/note/store`, `useNoteStore`, seed notes, or localStorage-backed note UI from the accepted global route.
- Run `pnpm meeting:notes-hub-quarantine-qa`, `pnpm ai:protocol-registry-qa`, `pnpm exec tsc --noEmit --pretty false`, and `pnpm lint:changed`.
- No provider call, no DB write, no fake `AiUsageLog`, no production side effects.

## Validation

- PASS: `git status --short --branch` at start.
- PASS: `pnpm ai:protocol-registry-qa`; manifest count 11, all expected agents present, publication disabled, no agent claims external-ready/registered.
- PASS: `pnpm ai:protocol-readiness-qa`; all agents remain `internal-only`, public discovery disabled, HTTP proof skipped because `DEMO_QA_BASE_URL` is unset.
- FAIL / logged source gap: `pnpm meeting:notes-hub-quarantine-qa`; `/notes` still imports local notes prototype and lacks quarantine markers.
- FAIL / logged proof gap: `pnpm theater:route-b-stage-map-acceptance-reconcile-qa`; stale marker `aria-label={\`與 ${character.displayName} 私聊\`}` no longer matches current source.
- PASS: `git diff --check`.
- PASS: `pnpm exec tsc --noEmit --pretty false`.
- PASS: `pnpm lint:changed` (exit 0; one existing warning in `scripts/public-status-degraded-qa.mjs` for unused `existsSync`).

## DB / Prisma

- No Prisma schema change, no `prisma:generate`, no `prisma db push`.
- No DB write/read proof was required for this review.
- No production write, real email, notification, payment/refund, destructive DB operation, or remote deletion.

## NANDA Alignment

- No AI manifest source was changed by this review.
- Current registry posture remains internal-only and least-disclosure.
- `ai:protocol-registry-qa` passing is necessary but not sufficient: targeted source-contract QA caught a drift in the notes entrypoint. Next source slice should close that drift before broader readiness claims.
- External NANDA / third-party registry publication remains blocked by user instruction.

## Git / Push

- Local commit is created after validation.
- Push: `push skipped by user instruction`.

## Next Recommended Prompt

Run the normal LV3 immersive loop and implement `AMM notes-hub source-boundary quarantine`: make `/notes` a safe entry hub to accepted previsit/CLIENT_MEETING notes, remove local prototype imports from the route, and pass `meeting:notes-hub-quarantine-qa` plus normal tsc/lint gates.

push skipped by user instruction
