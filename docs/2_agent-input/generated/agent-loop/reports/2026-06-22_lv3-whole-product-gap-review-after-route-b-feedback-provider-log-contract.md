# 2026-06-22 LV3 Whole-product Gap Review after Route B Feedback Provider Log Contract

## Scope

- Loop type: scheduled fifth-loop whole-product gap review.
- Cadence trigger: `normalLoopsSinceLastWholeProductReview=4`; this loop ran `lv3-whole-product-gap-review-loop.md` and resets the counter to `0`.
- Reviewed flow: client / relationship graph -> visit preparation package -> reasoning trace -> Route B theater stage -> group/private interaction -> character state proposals -> AI feedback / interview writeback.
- This review intentionally did not implement product source. It converts the current gap into the next source-backed slice and avoids turning the next loop into docs-only proof collection.

## Recent Progress Since Last Whole-product Review

- `ITA-003h`: no-provider Route B orchestration contract now produces director selection, character reply input, persistence envelope, narrator queue, and no-provider boundary.
- `ITA-003i`: guarded runtime BFF preview now exposes least-disclosure `runtimeInputPreview.orchestration`.
- `ITA-004a`: five-view qualitative feedback contract and runtime preview are in place, with no score/ranking and red-line review labels.
- `ITA-004b`: injected feedback provider contract proves success/error usage logging before returning success/error result.

The bottleneck has moved from "can Route B reason safely?" to "does the theater session actually consume the reasoning contract and advance a roleplay turn?"

## Six-frame Review

1. Advisor workflow / onboarding: Route B can be created from preparation / interview material and the session page shows stage map, group/private lanes, and an advisor composer. The next missing user-visible action is "let the stage answer back" as a character or narrator turn.
2. Source-of-truth / BFF: `RouteBSessionSnapshot` is the correct server-owned DTO; advisor turns can persist, but orchestration/feedback results are still previews/contracts rather than consumed into session state.
3. AI reasoning / evidence: fact/inference/unknown, visibility, provider boundary, and usage-log contracts are explicit. The missing piece is a durable next-turn draft/result that can be inspected without leaking raw private/provider material.
4. Theater / relationship immersion: relationship stage map and private/group lanes exist, but the theater is still advisor-only. It lacks the director -> character/narrator loop that makes multi-character practice feel alive.
5. QA / compliance / release proof: provider success/error logging contract passes in injected mode. DB-backed runtime proof remains blocked by the Supabase host DNS, so residual evidence should be self-runnable after DB connectivity returns.
6. NANDA / AgentFacts: 11 manifests remain `internal-only`; Route B manifest includes orchestration, feedback, and feedback-provider-log contract refs. External publication remains explicitly unapproved.

## Top Gaps

| Rank | Gap | Type | Severity | Leverage | Next owner |
| --- | --- | --- | --- | --- | --- |
| 1 | Route B session does not consume orchestration into a next character/narrator turn | source/product | 3 | 3 | `ITA-003j` |
| 2 | Route B feedback is not persisted or displayed as session-end review UI | source/product | 2 | 3 | `ITA-004c` |
| 3 | Objection library and red-line detection are not yet domain-owned | source/product | 2 | 2 | `ITA-005a` |
| 4 | AMM-005c and ITA-003i DB-backed runtime proof remain DNS-blocked | environment | 2 | 2 | user/operator self-run after DB recovery |
| 5 | Formal `RelationshipEdge` table is still not migrated | schema/operator | 2 | 2 | `REL-004` |
| 6 | pgvector / retrieval-backed memory remains unenabled | environment/operator | 2 | 2 | `AMM-007` / `ITA-006` |
| 7 | Meeting/notes prototype files are present but not part of this review scope | worktree hygiene | 1 | 1 | future AMM-owned review only |
| 8 | Production payment/email/notification still needs env/provider setup proof | release/operator | 2 | 1 | BFF/LCH release hardening |
| 9 | Shared cross-surface theater/meeting memory is not yet a protocol contract | architecture | 2 | 2 | NAP/AMM/ITA bridge |
| 10 | External NANDA publication is not approved | operator/product | 1 | 1 | approval package only |

## Candidate Score

1. `ITA-003j Route B next-turn consumption / persisted role reply loop` - 94/100.
   - Best connects preparation package -> theater stage -> group/private roleplay. It is source-backed, can be no-provider first, and uses existing orchestration contract rather than inventing a new proof document.
2. `ITA-004c Route B feedback persistence + session-end UI` - 86/100.
   - Strong review/coaching value after ITA-004b, but lower immediacy than making the theater produce the next roleplay turn.
3. `ITA-005a objection/red-line source library` - 81/100.
   - Useful for compliance and feedback depth, but it is a supporting layer until next-turn consumption exists.

Selected next normal slice: `ITA-003j`.

## Selected Next Slice Contract

`ITA-003j` should add a source-backed Route B next-turn boundary:

- Input: persisted `RouteBSessionSnapshot`, latest advisor group/private turn, and current `buildTheaterRouteBOrchestrationPlan()`.
- Output: a `CHARACTER` or `NARRATOR` next-turn draft with speaker/addressee/visibility, character input boundary, state proposal envelope, and least-disclosure evidence.
- Provider posture: guarded no-provider first; `providerCallAttempted=false`, `aiUsageLogWritten=false`, and no fake usage log. If a real OpenAI/Anthropic call is wired later, success/error must write `AiUsageLog` before returning.
- Persistence posture: DB available -> append/read owner-scoped proof; DB `ENOTFOUND` -> pure domain/API dry-run proof and explicit self-runnable residual DB command.

## Validation

- PASS `node -e dns.lookup(...)`: DB host still returns `ENOTFOUND`.
- PASS `pnpm theater:route-b-feedback-provider-dry-run`.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `jq empty docs/2_agent-input/generated/agent-loop/loop-state.json`.
- PASS `git diff --check`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## DB / Prisma

- No DB writes.
- No Prisma schema changes.
- No provider calls.
- No `AiUsageLog` row required for this review. Existing ITA-004b injected proof proves usage-log equivalent records without calling a provider or DB.

## NANDA Alignment

- `asai.theater.route_b` remains `internal-only`.
- Current manifest coverage includes Route B runtime, persisted session, turn write shell, orchestration preview, feedback preview, and feedback provider logging contract.
- Next manifest delta for `ITA-003j`: add a next-turn consumption capability/action and DTO refs for the draft/result boundary, without claiming external readiness.
- External NANDA / third-party registry publication, signing, public discovery, and cross-org access remain blocked by explicit user instruction.

## Blockers

- Environment: Supabase DB host `db.wwocdcicvpmbdmqvskzi.supabase.co` still does not resolve from this runtime. When DB connectivity returns, the user can self-run `pnpm theater:route-b-runtime-qa` and `DEMO_QA_BASE_URL=http://localhost:<dev-port> pnpm meeting:notes-compat-qa` for residual runtime evidence.
- Product/source: Route B next-turn consumption, feedback persistence/UI, and objection/red-line library remain implementation gaps.
- Operator: external NANDA publication and production env/provider setup remain unapproved/manual.

## Next Recommended Loop

執行 `ITA-003j Route B next-turn consumption / persisted role reply loop (guarded no-provider first)`。先讀 `AGENTS.md`、本 report、`PLN-015` ITA-003/004 notes、`ACC-006` §5.3/5.4/6、`src/domains/theater/route-b-orchestration.ts`、`src/domains/theater/route-b-session.ts`、`src/lib/theater/route-b-session-bff-repository.ts` 與 `/theater/[sessionId]` source。新增 source-backed next-turn contract consuming persisted `RouteBSessionSnapshot` + latest advisor turn, producing CHARACTER/NARRATOR turn draft with visibility/persistence/provider boundary; if DB is reachable, wire owner-scoped append/read proof; if DB remains `ENOTFOUND`, complete pure contract/API dry-run proof. Do not call provider unless success/error `AiUsageLog` is implemented in the same slice. Run targeted dry-run/API proof, `pnpm ai:protocol-registry-qa`, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint:changed`, write report, local commit, and record `push skipped by user instruction`.

## Git

- Push skipped by user instruction.
