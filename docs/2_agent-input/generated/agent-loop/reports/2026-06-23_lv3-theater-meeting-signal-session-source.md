# 2026-06-23 LV3 Theater Meeting Signal Session Source

## Scope

- 本輪類型：normal LV3 L2 implementation/proof slice；cadence 尚未進第五輪校準（啟動時 counter=3）。
- Selected slice：`LV3-THEATER-MEETING-SIGNAL-STAGE-SESSION-001`，把 `/theater/build` 的 meeting-derived relationship signal stage cards 帶入 Route B session source grounding，讓 persisted stage 能顯示場景依據，同時不寫 CRM/VisitPlan/relationship graph。
- User preference applied：避免 docs-only proof；殘餘 live browser/API/DB evidence 若只剩可重跑檢查，交給 operator 自行跑 command。

## Candidate Score

1. `LV3-THEATER-MEETING-SIGNAL-STAGE-SESSION-001` — 46/50。連接 preparation package -> theater build -> Route B persisted session，屬 source/proof slice；可驗證 no raw ID、no provider、no graph/writeback。
2. Relationship confirmation advisor-state persistence — 35/50。價值高，但仍需要 product/schema decision：VisitPlan JSON subdocument 或 dedicated table/migration。
3. Residual live browser/API/DB evidence sweep — 30/50。可由 operator 自行重跑，不應取代本輪 source 行為交付。

## Changes

- `src/domains/theater/route-b-handoff.ts` 新增 `TheaterRouteBMeetingSignalGroundingSummary` / `TheaterRouteBSourceGrounding`，並在 handoff scene 上輸出 `sourceGrounding.meetingRelationshipSignals`。
- `/theater/build` 將 meeting signal stage cards 與 narrator questions 轉成 safe source grounding 後建立 Route B session。
- Route B session repository 將 source grounding 寫入 `sceneState` 與 metadata；BFF readback / public snapshot / next-turn snapshot 都保留 safe subset。
- `/theater/[sessionId]` 新增 meeting-signal source grounding panel，顯示 grounded cards、unknown count、narrator question count 與 no-provider/no-write flags。
- Boundary validation 與 QA script 擴充，檢查 no browser-supplied session/person id、no raw transcript/provider/contact/policy leakage、no provider/no fake `AiUsageLog`、no relationship graph/VisitPlan/confirmed CRM fact write。
- AgentFacts manifest 與 registry QA 更新 Route B source grounding capability / evidence refs。

## Validation

- PASS `pnpm theater:meeting-signal-session-source-qa`
- PASS `pnpm theater:route-b-schema-dry-run`
- PASS `pnpm ai:protocol-registry-qa`
- PASS `pnpm ai:bff-audit`
- PASS `pnpm exec tsc --noEmit --pretty false`
- PASS `pnpm lint:changed`（exit 0；仍列出既有 `scripts/public-status-degraded-qa.mjs` unused import warning）

## Evidence

- New static/source proof command：`pnpm theater:meeting-signal-session-source-qa`
- Schema/session dry-run proof：`pnpm theater:route-b-schema-dry-run`
- Registry proof：`pnpm ai:protocol-registry-qa`
- Residual live API/DB proof handoff：operator 可在 dev server/DB 可用時自行跑 `DEMO_QA_BASE_URL=http://localhost:3000 pnpm theater:route-b-persistence-qa`

## DB/Prisma

- No Prisma schema change.
- No `prisma db push`.
- No production write, destructive DB action, real email/notification/payment, remote deletion, provider call, or external NANDA publication.
- No OpenAI/Anthropic provider call in this slice; `AiUsageLog` not required and no fake usage log was written.

## NANDA Alignment

- Updated internal AgentFacts-style Route B manifest version to `2026-06-23.meeting-signal-source-grounding`.
- Added capability/action/evidence refs for `route-b-meeting-signal-source-grounding`.
- Registry readiness remains internal; no public discovery endpoint, credential signing, external registry publication, or cross-org agent access.
- Remaining registry gap: live external registration remains blocked by operator approval; relationship-confirmation persistence still needs product/schema decision before claiming refresh/new-context persistence.

## Git

- Related files should be staged only after validation.
- Push policy: `push skipped by user instruction`.

## Blockers

- Product/schema blocker remains: relationship confirmation card advisor-state persistence needs decision between VisitPlan-owned JSON subdocument and dedicated table/migration.
- Live Browser/API/DB proof is self-runnable if needed; not blocking this source/proof slice.

## Next Recommended Loop

- Cadence counter is now 4, so next loop should execute `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`.
- Review should score the whole client -> meeting/prep signals -> theater build -> Route B session grounding flow, then pick the next non-docs source/proof slice that connects at least two core surfaces.

