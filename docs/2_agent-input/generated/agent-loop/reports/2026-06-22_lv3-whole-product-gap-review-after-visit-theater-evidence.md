# 2026-06-22 LV3 Whole-Product Gap Review after Visit Theater Evidence

## Scope

- Loop type: scheduled fifth-loop whole-product gap review.
- Cadence: `normalLoopsSinceLastWholeProductReview` reset from 4 to 0.
- Review target: client creation -> relationship graph -> visit preparation package -> question evidence -> theater stage -> group/private theater interaction -> interview/meeting writeback.
- This loop is allowed to be documentation-led by cadence, but it points the next normal loop at a source-backed implementation/proof slice rather than another docs-only or screenshot-only proof.

## What Changed Since Last Review

- Previous whole-product review selected `AMM-005c notes/postVisitNotes compatibility bridge`.
- AMM-005c source bridge was implemented and a no-DB contract fallback was added, but runtime Browser/API/DB proof remains blocked by DB DNS `ENOTFOUND`.
- The repeated AMM blocker was promoted to L4 root-cause analysis; the smallest operator action is a resolvable development/staging DB URL or restored DNS for `db.wwocdcicvpmbdmqvskzi.supabase.co`.
- The latest normal source slice added `VisitTheaterHandoff.sourceSummary.evidenceSummary`, proving preparation question evidence status/source and fact/inference/unknown material counts now flow into theater handoff.
- Therefore this report is not a duplicate AMM review. The product bottleneck moved from "notes bridge source exists but DB proof blocked" to "theater stage has grounded materials, but director/character orchestration is still not a real roleplay loop."

## Anti-Duplicate Gate

- Last completed loop: L2 source contract + executable L1 proof (`Visit -> Theater evidence summary`).
- Previous completed loop: L4 blocker analysis (`AMM-005c DB/DNS`).
- Prior loop: L1 executable no-DB AMM fallback.
- This scheduled review does not repeat those shapes: it records the AMM blocker as still blocked, preserves the self-runnable runtime command, and converts the next safe path into an ITA source/proof slice.

## Six-Frame Review

1. Advisor workflow and onboarding: client, relationship graph, visit package, meeting workspace, and notes bridge are operable, but theater still stops at a stage where the advisor can write turns; AI roles do not yet take turns.
2. Source-of-truth and BFF: CRM, relationship graph, visit plans, AMM sessions, and Route B sessions have server-owned contracts. The repeated AMM runtime proof is not trustworthy until DB DNS is restored.
3. AI reasoning and evidence: visit question evidence now reaches theater material summary. The missing reasoning loop is Route B director selection and character reply planning across group/private context.
4. Theater/relationship immersion: stage map, group/private advisor turn, private visibility, state proposals, and high-sensitivity gates exist. Missing: director -> character orchestration and later five-view feedback runtime.
5. QA, compliance, and release-proof: no-provider proof is strong; provider success/error `AiUsageLog` is accepted as a future live proof requirement. DB-backed AMM notes proof remains environment-blocked, not source-unknown.
6. NANDA / AgentFacts protocol: 11 manifests remain `internal-only`; source adoption is mostly complete. `asai.visit.preparation_package` gained visit-to-theater evidence proof, and `asai.theater.route_b` is the next module needing orchestration evidence.

## Top Gaps

| Rank | Gap | Frame | Class | Severity | Leverage | Status since prior review | Smallest next slice |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| 1 | Route B director/character orchestration contract missing | Theater/relationship immersion | source gap | 2 | 3 | changed: visit handoff evidence now feeds stage, but roles still do not answer | `ITA-003h Route B director/character orchestration contract (no-provider first)` |
| 2 | AMM-005c runtime Browser/API/DB proof blocked by DB DNS | Source/BFF + QA | operator/environment gap | 2 | 3 | still blocked; root cause sharper | Wait for resolvable dev/staging DB, then run `meeting:notes-compat-qa` |
| 3 | REL-004 formal `RelationshipEdge` model absent | Source/BFF | source + operator gap | 2 | 3 | unchanged; no-schema graph proof is done | Schema/migration/backfill slice after DB/migration approval |
| 4 | Route B five-view qualitative feedback runtime absent | AI reasoning + Theater | source/provider gap | 2 | 2 | unchanged; preflight only | After orchestration, implement guarded feedback contract and later provider success/error logs |
| 5 | AMM-007 pgvector retrieval absent | Source/BFF + NANDA | operator/environment gap | 1 | 2 | unchanged | Enable Supabase pgvector/operator path, keep lexical fallback until proof |
| 6 | Same-org shared meeting/theater memory needs visibility decision | QA/compliance | product decision | 2 | 2 | unchanged | Keep member-private until operator decides sharing scope |
| 7 | External NANDA publication blocked | NANDA | product/approval gap | 2 | 1 | unchanged by user instruction | No external registry/signing/public discovery before explicit approval |
| 8 | Production payment/email/notification env and real-operation proof incomplete | QA/release | production approval gap | 3 | 2 | unchanged | Manual env/provider setup + non-destructive QA before enablement |
| 9 | RAG / knowledge ingestion remains guarded disabled | AI evidence + NANDA | source/operator gap | 1 | 2 | unchanged | Only after privacy/ingestion/pgvector approval |
| 10 | Untracked notes/theater research/prototype files visible in worktree | QA/release | source ownership gap | 1 | 1 | changed: still present | Do not stage unless a loop explicitly selects and validates that scope |

## Candidate Score

1. `ITA-003h Route B director/character orchestration contract (no-provider first)` - 93/100.
   - Source-backed next slice, no DB/provider dependency, and directly unlocks the immersive theater loop.
   - Connects preparation/theater evidence, group/private turn history, role addressees, and state proposal boundaries.
   - Sets up future provider success/error `AiUsageLog` proof without calling provider in the first slice.
2. `AMM-005c runtime proof after DB recovery` - 74/100 while blocked, 94/100 after DB resolves.
   - High leverage but currently environment-blocked. Further automation evidence chasing would duplicate prior loops.
3. `REL-004 formal RelationshipEdge schema` - 82/100.
   - High architecture leverage for graph/theater, but needs schema migration/backfill/rollback approval and DB availability.

Selected next normal-loop slice: `ITA-003h Route B director/character orchestration contract (no-provider first)`.

## Next Implementation Slice Detail

Implement a reviewable source/proof slice that adds a pure domain contract or runtime dry-run for Route B orchestration:

- Input: latest Route B group/private advisor turn, visible scoped history, character cards, current speaker/addressee, unknowns, and state proposal context.
- Output: director selection candidate, speaker routeBCharacterId, addressee, visibility scope, character reply input plan, and persistence envelope.
- Required proof:
  - private history is only visible to the addressee.
  - named addressee must answer.
  - consecutive speaker guard prevents one role from dominating.
  - unknowns remain narrator questions or state proposals.
  - state proposals keep `requiresConfirmation=true` and `writesConfirmedCrmFact=false`.
  - `providerCallAttempted=false`, no fake `AiUsageLog`, no raw provider/private/contact/payment sentinel.
- Suggested command: `pnpm theater:route-b-orchestration-dry-run`.

## NANDA Alignment

- Active modules reviewed: `asai.visit.preparation_package`, `asai.theater.route_b`, `asai.meeting.prototype`, `asai.interview.quick_capture`, `asai.interview.companion`, `asai.report.generation`, `asai.spin.advisor`, `asai.chat.assistant`, `asai.rag.private_beta`.
- Registry readiness summary: all 11 manifests remain `internal-only`.
- Current proof: `pnpm ai:protocol-registry-qa` passed and confirms no external-ready/external-registered claims.
- Next protocol delta: if `ITA-003h` adds orchestration DTOs, update `asai.theater.route_b` proof metadata with the orchestration input/output boundary and dry-run command.
- External NANDA/third-party publication, signing, public discovery, and cross-org agent access remain blocked by explicit user instruction.

## Validation

- PASS `pnpm meeting:notes-compat-contract-dry-run`.
- PASS `pnpm visit:theater-handoff-dry-run`.
- PASS `pnpm theater:route-b-handoff-dry-run`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS DNS blocker check: `db.wwocdcicvpmbdmqvskzi.supabase.co` returned `ENOTFOUND`, so AMM-005c runtime proof was intentionally not retried.
- PASS `git diff --check`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## Residual Self-Runnable Evidence

When DB connectivity is fixed, AMM-005c residual Browser/API/DB proof can be checked by the user with:

```bash
DEMO_QA_BASE_URL=http://localhost:<dev-port> pnpm meeting:notes-compat-qa
```

This residual command does not block the next source-backed ITA slice.

## DB/Prisma

- No Prisma schema change in this review.
- No Prisma generate/validate/db push.
- No DB write, no production write, no destructive operation.
- No provider call; no new `AiUsageLog` rows required.

## Documentation Updates

- `docs/05_execution-plans/PLN-015_interview-theater-dual-agent-batch-tasks-v1.0.md`: added the `ITA-003h` next-slice review note.
- `docs/2_agent-input/generated/agent-loop/loop-state.json`: reset cadence and pointed next normal loop at `ITA-003h`.
- This report.

## Git

- Local commit required after validation.
- Push remains paused: `push skipped by user instruction`.

## Remaining Blockers

- Operator/environment: AMM-005c Browser/API/DB proof needs resolvable development/staging DB URL.
- Operator/environment: AMM-007 pgvector requires Supabase extension/index path.
- Operator/schema: REL-004 edge table requires migration/backfill/rollback approval.
- Production approval: real payment/email/notification enablement remains gated by manual env/provider setup and QA.
- Product approval: same-org shared meeting/theater memory and external NANDA publication remain unapproved.

## Next Recommended Loop

Run `ITA-003h Route B director/character orchestration contract (no-provider first)`.

Suggested prompt:

```text
Implement ITA-003h as a source-backed no-provider slice. Add a Route B director/character orchestration domain contract or dry-run that turns the latest group/private advisor turn plus scoped visible history into a director speaker/addressee/visibility directive and character reply input plan. Prove private-history scoping, named addressee answer obligation, consecutive-speaker guard, unknown-to-narrator/state proposal handling, `writesConfirmedCrmFact=false`, `providerCallAttempted=false`, no fake AiUsageLog, and no raw private/provider/contact/payment sentinel. Update `asai.theater.route_b` manifest proof metadata if DTO boundaries change. Do not retry AMM-005c runtime proof until DB DNS is fixed.
```

push skipped by user instruction
