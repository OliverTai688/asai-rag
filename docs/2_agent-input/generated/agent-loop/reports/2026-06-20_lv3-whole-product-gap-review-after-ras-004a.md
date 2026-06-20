# 2026-06-20 LV3 Whole-product Gap Review - After RAS-004a

## Scope

This was the scheduled fifth-loop ASAI LV3 whole-product review, not a runtime implementation slice. The review checked the target flow from client creation to relationship graph, preparation package, reasoning trace, Route B theater stage, group/private theater interaction, and AI interview writeback.

No provider call was made. No DB write or Prisma operation was performed. A DNS check still shows the Supabase host `db.wwocdcicvpmbdmqvskzi.supabase.co` is not resolvable in this environment, so DB-backed proof remains blocked.

## Current Flow Inventory

| Surface | Status | Notes |
| --- | --- | --- |
| Client lifecycle | Proven | CRM create/update/archive and compliance fields are server-owned proof surfaces. |
| Relationship graph | Mostly proven | BFF review, family edit/delete, typed edges, layout polish, and no-schema persistence are proven; REL-004 edge table remains schema approval. |
| Previsit preparation package | Proven | Server-owned VisitPlan and redesigned preparation package UI show project context, questions, evidence, unknowns, and theater handoff. |
| Reasoning/evidence trace | Proven enough for LV3 | Question rationale and facts/inferences/unknowns are visible without raw provider payloads. |
| Previsit/interview to Route B | Proven shell | Previsit and interview can create DB-backed Route B session drafts with high-sensitive gates. |
| Theater stage runtime | Main gap | Persisted Route B session supports read surface and advisor group/private turns, but not a relationship-graph-centered stage map or AI character/director/feedback orchestration. |
| AI interview creation/refinement | Proven shell | PIM-010 can write VisitPlan and Route B drafts; live Realtime provider proof and meeting memory are later gaps. |
| Role-aware navigation | Partial | RAS-001/002/003/004a prove contract/resolver/bootstrap/renderer model; sidebar UI wiring and Browser QA remain. |

## Top 10 Gaps

1. **Route B relationship-graph stage map** - The theater page still does not feel like a professional simulation stage. It needs a character/relationship map, click-to-private-chat, active speaker/addressee highlights, visibility badges, and state proposal affordances.
2. **Supabase DB/DNS blocker** - DB-dependent browser/API proof is currently blocked by unresolved host lookup. This blocks ITA-003f/S1 and BFF-103d proof recovery.
3. **RAS-004b sidebar UI wiring** - The renderer contract exists, but `src/components/layout/sidebar.tsx` still does not consume it. This is the best safe fallback while DB is blocked.
4. **BFF-103d related-list proof recovery** - CRM policy/timeline/report/gap-analysis related-list proof started but stopped when DB DNS failed.
5. **Route B provider orchestration** - Director/character/feedback provider success/error paths still need `AiUsageLog`; guarded-disabled proof must remain until explicitly enabled.
6. **AI meeting module source gap** - Meeting memory/summary/citation work is useful for post-visit continuity, but current AMM docs are still untracked/unproven in this branch.
7. **Quick-capture notes UX** - Notes should become a lightweight capture surface, but this is an adjacent source gap and should not supersede theater stage proof.
8. **REL-004 relationship edge table** - A formal `RelationshipEdge` schema would improve persistence semantics, but it requires migration/rollback approval.
9. **Production build blocker** - Next/Turbopack Google Font build failure still prevents clean production build proof.
10. **Cross-role Browser matrix** - RAS-005 still needs member/org admin/super admin/client browser and hand-typed URL proof after sidebar UI wiring.

## Top 3 Candidate Slices

| Candidate | Score | Rationale |
| --- | ---: | --- |
| `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` | 88 | Highest product leverage: connects relationship graph + preparation package + interview writeback into the theater surface users actually experience. Blocked right now by DB DNS. |
| `RAS-004b sidebar UI wiring` | 84 | Best safe fallback: no DB/provider, directly turns RAS contracts into visible low-friction navigation, and improves onboarding across all core surfaces. Must isolate existing sidebar `/notes` dirty diff. |
| `BFF-103d related-list proof recovery` | 76 | Important source-truth recovery for CRM subviews that feed preparation context, but it cannot resume until DB/DNS is healthy. |

## Selected Review Outcome

Primary product-level target remains `ITA-003f/S1`. Because the current DB host still fails DNS resolution, the next normal loop should run `RAS-004b sidebar UI wiring` unless the DB recovers before the loop starts. If DB recovers, switch back to `ITA-003f/S1`; after DB recovers, rerun `DEMO_QA_BASE_URL=http://localhost:3029 pnpm bff:crm-related-lists-qa` for BFF-103d recovery.

## Changes

- Updated cadence state in `docs/2_agent-input/generated/agent-loop/loop-state.json`.
- Added this review report.
- Updated `docs/2_agent-input/generated/agent-loop/issue-question.md` with the RAS-004a fifth-loop decision.
- Added concise review notes to `AGENTS.md`, `PLN-015`, and `PLN-021`.

## Validation

Passed:

- `git diff --check`
- JSON parse check for `loop-state.json`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint:changed`

## DB/Prisma

- DB writes: none.
- Prisma schema/generate/db push: none.
- Provider calls: none.
- DNS evidence: `nslookup db.wwocdcicvpmbdmqvskzi.supabase.co` returned `No answer` in this loop context.

## Git

Push remains paused by user instruction: `push skipped by user instruction`.

## Next Recommended Loop

Run `RAS-004b sidebar UI wiring` if DB remains unavailable. If DB/DNS recovers before the next loop starts, run `ITA-003f/S1 Route B relationship-graph stage map (no-provider)` instead.
