# 2026-06-22 LV3 Visit Route B Red-line Context BFF/UI

## Scope

- Loop type: LV3 normal implementation/proof loop, cadence 1 -> 2.
- Selected slice: `ITA/AMM-005h visit preparation BFF/UI red-line context autoload`.
- Goal: make a visit preparation package safely consume persisted Route B feedback review context without raw browser-supplied theater session or person ids.
- Boundary: no formal legal finding, no real notification, no live detection, no confirmed CRM fact write, no external registry publication, no provider call.
- Push policy: push skipped by user instruction.

## Candidate Score

1. `ITA/AMM-005h visit-prep BFF/UI owner-scoped Route B feedback autoload` - 96/100. It directly connects theater feedback -> visit preparation UI, closes the ACC-006 6.10 BFF/UI owner-scoped join gap, and replaces raw-ID workflow with a source-backed route.
2. `AI Meeting notes Route B context consumer audit/adopt` - 88/100. It is the next high-value downstream consumer, but the notes prototype has dirty/untracked files and should be explicitly audited before staging.
3. `Formal compliance workflow / notification routing` - 76/100. Product-important, but legal finding, live detection, and real notification remain approval-bound.

## Selected Slice

- Added a member-owned BFF lookup path: `visitPlanId -> routeBSourcePacketId -> owner/org/client-scoped TheaterSession.sceneState.feedbackReview -> VisitRouteBRedLineContextBffDto`.
- The browser supplies only the visit plan id from the route. It does not supply theater session id, feedback review id, person id, org id, owner id, or client id.
- The UI shows the resulting context as advisor reminders in the visit preparation page, not as compliance conclusions.

## Changes

- Added `src/lib/visits/route-b-red-line-context-repository.ts`.
- Added `GET /api/visits/[id]/route-b-red-line-context`.
- Updated `/pre-visit/[planId]` with a `劇場紅線回帶` panel for summary and top reminders.
- Added `pnpm visit:route-b-red-line-context-bff-qa`.
- Updated `asai.visit.preparation_package` AgentFacts-style manifest with the new endpoint, repository, DTO refs, proof command, and internal-only evidence.
- Updated `ACC-006`, `PLN-015`, `loop-state.json`, and `issue-question.md`.

## Validation

- PASS `pnpm visit:route-b-red-line-context-bff-qa` - 34 assertions.
- PASS `pnpm visit:route-b-red-line-context-dry-run` - 22 checks.
- PASS `pnpm ai:protocol-registry-qa`.
- PASS `pnpm ai:bff-audit`.
- PASS `pnpm exec tsc --noEmit --pretty false`.
- PASS `pnpm lint:changed`.

## Evidence

- `visit:route-b-red-line-context-bff-qa` verifies:
  - route requires `requireCurrentMember()`;
  - route uses `Cache-Control: no-store`;
  - repository starts from owner-scoped visit plan lookup;
  - theater session lookup is scoped by `organizationId`, `ownerId`, `clientId`, and `routeBSourcePacketId`;
  - UI fetches `/api/visits/${planId}/route-b-red-line-context`;
  - panel does not render raw theater session or feedback review ids;
  - no provider call, no fake `AiUsageLog`, no formal/legal finding, no notification, no confirmed CRM fact write.
- Browser visual confirmation for a live matching Route B session is residual evidence only. Operator can run one dev-server check on `/pre-visit/<visitPlanId>` after generating Route B feedback; this should not consume another docs-only loop.

## NANDA Alignment

- Updated internal AgentFacts-style manifest for `asai.visit.preparation_package`.
- Registry readiness remains `internal-only`.
- New endpoint posture is `deterministic-no-provider`; therefore no `AiUsageLog` is required or faked.
- Capability evidence now describes Route B feedback review consumption through a protocol-neutral DTO boundary instead of ad hoc UI state.

## DB / Prisma

- No Prisma schema change.
- No `prisma db push`.
- No destructive DB operation.
- Runtime BFF is read-only for this slice; it reads owner-scoped visit plan and matching Route B theater session feedback review.

## Git

- Pre-existing dirty files were left unstaged: manual/index docs, legacy sidebar, and AI meeting/notes prototype files.
- This loop will stage only the visit Route B BFF/UI, manifest, QA, loop-state, issue-question, and report files.
- Local commit required; push skipped by user instruction.

## Blockers

- AI Meeting notes consumer remains unimplemented. Before using it as the second downstream consumer, the dirty notes prototype must be audited/adopted as an explicit slice.
- Formal compliance review workflow, real notifications, live detection, and external NANDA/third-party registry publication still require explicit approval and should not be inferred from this UI panel.

## Next Recommended Loop

Audit/adopt the dirty AI Meeting notes prototype, then implement AI meeting notes as the second safe consumer of Route B red-line context. Preserve facts/inferences/unknowns/evidence-needed labels, keep provider calls behind `AiUsageLog`, and do not create legal findings or real notifications.
