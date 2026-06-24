# ACC-016 — 人物關係圖（關係網絡）驗收框架 v1.0

- 類型：驗收與 QA（ACC）
- 對應計畫：`docs/05_execution-plans/PLN-024_relationship-network-graph-batch-tasks-v1.0.md`（REL workstream）
- 研究依據：`docs/07_research-and-design/RES-024_relationship-network-graph-creation-gap-research-v1.0.md`
- 建立日期：2026-06-20

本框架定義 REL-001..REL-005 的驗收條目。每張 batch 卡完成前須通過對應段落，並保存 proof（API response、DB 查詢、Browser 截圖、command output）。2026-06-23 fifth-loop review 新增 REL-004a，作為正式 edge table migration 前的不動 schema contract / dry-run bridge；2026-06-24 fifth-loop review 新增 REL-004e/REL-004f/REL-004g，作為正式 edge table 前的 Route B session source-grounding/readback、next-turn/runtime grounding、feedback review/provider grounding bridge。

---

## A. 通用閘門（每張卡必過）

- [ ] `pnpm exec tsc --noEmit --pretty false` 無新增 error。
- [ ] `pnpm lint:changed` 在動過的檔案中不新增 lint 問題。
- [ ] 未刪除/弱化合規欄位 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [ ] 未改 SPIN 狀態機、未改 Theater enum/scoring 型別。
- [ ] Browser QA：desktop（1440×1000）與 mobile（390×844）console error 0、無水平 overflow。

## B. 建立/持久化正確性（REL-001 / REL-002）

- [ ] 幽靈欄位 `Client.parentMemberId` 不再被任何 runtime 程式碼讀寫（grep 證明）。
- [ ] 長輩（父/母/祖父母）直接掛主客戶時，畫面有方向正確的連線，無漂浮孤立節點。
- [ ] 新增子節點與新增父節點都經 BFF；API proof：unauth 401、foreign client 403/404、缺欄位 400、成功 200/201。
- [ ] **Persist proof（核心）**：清空 browser storage / 新 browser context 後，新增的父母與子女關係仍從 DB 讀回，不再 refresh 消失。
- [ ] edge label 與方向一致（不再父→客戶硬寫「子女」、其他成員用 `member.relation` 兩套）。

## C. 網絡語意與收斂（REL-003）

- [ ] BFF 推導的 edge list 含 `type` 與 `factStatus`，與 `relationship-graph.ts` review 同源（畫面與 BFF 真相一致）。
- [ ] 配偶以同 rank 結合線/union 呈現，非有向父子箭頭。
- [ ] 雙親、手足、社會關係可正確呈現；node/edge 數與 `client.family` 對應一致。
- [ ] edge list / node DTO 不含 email、phone 等私密欄位（sentinel 掃描 0）。

## D. Edge model readiness and persistence（REL-004a / REL-004）

### D0. Shadow contract / dry-run（REL-004a，不動 schema）

- [x] `RelationshipEdgeDraft` / backfill DTO 位於 domain/repository/server boundary；UI 不直接 import Prisma，也不改 Prisma schema 或 `src/generated`。
- [x] Dry-run 從既有 `FamilyMember.parentMemberId` + `relation` 推導 candidate edges，輸出 deterministic count、duplicate guard、unsupported relationship warnings；重跑 idempotent。
- [x] Candidate edge metadata allowlist 不含 email、phone、raw private transcript、raw provider payload、policy number、secret/token；僅保留 FACT/INFERENCE/UNKNOWN、安全摘要與 source references。
- [x] `pnpm client:relationship-edge-shadow-qa` 覆蓋單親、雙親、配偶、手足、社會關係、unknown/inference sentinel、no schema/no DB write/no provider proof。
- [x] REL-004 migration approval / rollback note 未被 REL-004a 視為已完成；REL-004a 只證明 contract readiness。

REL-004a evidence（2026-06-23）：`pnpm client:relationship-edge-shadow-qa` pass，9 draft edges、duplicateDraftIds 0、warningCodes `UNSUPPORTED_ROOT_RELATION` / `MISSING_PARENT_MEMBER`，proof flags `schemaChanged=false`、`databaseWriteAttempted=false`、`providerCallAttempted=false`、`generatedClientFacingPayload=false`。

### D0.5. Shadow BFF summary（REL-004b，不動 schema）

- [x] `/api/clients/[id]/relationship-graph` response 以 current-member scoped repository 回傳 `edgeShadow` summary，不新增 route/provider，也不繞過 `canReadClientDetail`。
- [x] Summary 只含 version、source count、candidate count、warning code、counts 與 proof flags；不得含 `draftEdges`、draft id、source/target node id、source references、metadata、client id。
- [x] Proof flags 必須維持 `schemaChanged=false`、`databaseWriteAttempted=false`、`providerCallAttempted=false`、`clientFacingDraftEdgesReturned=false`、`formalSchemaApproved=false`。
- [x] `pnpm client:relationship-edge-shadow-bff-qa` 通過，且 `client:relationship-graph-qa` 包含 edgeShadow API contract 斷言。

REL-004b evidence（2026-06-23）：`pnpm client:relationship-edge-shadow-qa` pass，BFF summary 無 server-only draft payload；`pnpm client:relationship-edge-shadow-bff-qa` pass，source-level contract 確認 repository 掛載 summary、Graph QA 已覆蓋 `edgeShadow`、Prisma schema 仍未新增 `RelationshipEdge`。

### D0.6. Shadow handoff consumer（REL-004c，不動 schema）

- [x] `buildVisitTheaterHandoff()` 從 server/domain `client` 產生 `relationshipEdgeShadow` summary，並放入 `sourceSummary.evidenceSummary`、`sourceCounts.relationshipEdgeShadowCandidates` 與 theater `knownMaterials`。
- [x] Handoff payload 不含 `draftEdges`、draft id、source/target node id、source references、metadata；只含 candidate/type/status counts、warning code 與 proof boundary。
- [x] Handoff warning/missing 明確顯示 formal `RelationshipEdge` schema 未核可；劇場只能用摘要，不得寫回 relationship graph、VisitPlan 或 confirmed CRM fact。
- [x] `pnpm visit:theater-handoff-dry-run` 通過，且輸出 `providerCallAttempted=false`、`databaseWriteAttempted=false`、`clientFacingDraftEdgesReturned=false`、`formalSchemaApproved=false`。

REL-004c evidence（2026-06-23）：`pnpm visit:theater-handoff-dry-run` pass，5 candidate edges、`UNSUPPORTED_ROOT_RELATION` warning、summary 進入 theater knownMaterials/sourceSummary，server-only draft payload sentinel 0；no provider/no DB/no writeback boundary 維持。

### D0.7. Shadow theater build source review（REL-004d，不動 schema）

- [x] `/theater/build?visitPlanId=...` 來源審查解析 `relationship_edge_shadow_summary=true` knownMaterial，顯示 candidate count、source member count、edge type/status counts 與 warning code。
- [x] UI copy 明確標示 formal `RelationshipEdge` schema 尚未核可；此區只作 readiness/source review，不回傳草稿邊內容、不寫回 relationship graph、VisitPlan、CRM fact 或 DB。
- [x] `pnpm visit:edge-shadow-theater-build-qa` 通過，且檢查 theater build source review 未渲染 server-only draft internals（source/target node id、source references、metadata、policy number、raw provider/private fields）。
- [x] `pnpm visit:theater-handoff-dry-run` 仍通過，證明 handoff 端 no-provider/no-DB/no-write/no-draft-payload boundary 未退化。

REL-004d evidence（2026-06-23）：`pnpm visit:edge-shadow-theater-build-qa` pass，劇場建立頁來源審查具 `data-edge-shadow-readiness` panel、關係邊候選計數與 formal-schema/no-write boundary；`pnpm visit:theater-handoff-dry-run` pass，仍無 provider/DB/writeback。

### D0.8. Shadow Route B session source grounding（REL-004e，不動 schema）

- [x] Route B session create/snapshot/readback path 帶入 BFF-safe `relationshipEdgeShadow` source-grounding summary；只含 candidate count、type/status counts、warning code、formal schema/no-write boundary。
- [x] Session payload / UI 不含 `draftEdges`、draft id、source/target node id、source references、metadata、policy number、raw provider/private fields。
- [x] `/theater/[sessionId]` 顯示 compact edge readiness / source-grounding panel，並明確標示 formal `RelationshipEdge` schema 尚未核可，劇場不可寫回 relationship graph、VisitPlan 或 confirmed CRM fact。
- [x] `pnpm theater:relationship-edge-shadow-session-source-qa` 或等價 proof 通過，且輸出 `providerCallAttempted=false`、`databaseWriteAttempted=false`、`relationshipGraphWriteAttempted=false`、`clientFacingDraftEdgesReturned=false`、`formalSchemaApproved=false`。

REL-004e evidence（2026-06-24）：`pnpm theater:relationship-edge-shadow-session-source-qa` pass，確認 Route B handoff contract、session create/readback、`data-route-b-edge-shadow-source-grounding` UI hook、AgentFacts manifest 與 no-provider/no-DB/no-write/no-draft-payload boundary；`pnpm visit:theater-handoff-dry-run` 仍維持 handoff least-disclosure summary。

### D0.9. Shadow next-turn/runtime grounding（REL-004f，不動 schema）

- [x] `buildTheaterRouteBNextTurnDraft()` 從 `RouteBSessionSnapshot.scene.sourceGrounding.relationshipEdgeShadow` 產出 safe runtime grounding；不得回 `draftEdges`、draft id、source/target node id、source references、metadata、raw private transcript 或 raw provider payload。
- [x] Runtime grounding 只含 source member/candidate counts、edge type/status counts、warning code、unsupported relation count 與 formal-schema/no-write boundary。
- [x] `buildRouteBProviderPromptContext()` 消費 `relationshipEdgeShadowGrounding` 作為 roleplay readiness evidence，且 prompt rules 明確 `useRelationshipEdgeShadowAsRuntimeEvidence=true`；不得把 edge shadow 當 confirmed CRM fact。
- [x] `/theater/[sessionId]` next-turn preview 顯示 `data-route-b-next-turn-edge-shadow-runtime-grounding` safe panel，並標示 raw draft edges / client-facing draft edges / formal schema / graph write 皆為 false。
- [x] `pnpm theater:route-b-next-turn-dry-run`、`pnpm theater:route-b-provider-prompt-context-dry-run`、`pnpm theater:route-b-next-turn-ui-contract-qa`、`pnpm theater:relationship-edge-shadow-session-source-qa` 通過，且輸出 `providerCallAttempted=false`、`aiUsageLogWritten=false`、`writesRelationshipGraph=false`、`writesVisitPlan=false`、`writesConfirmedCrmFact=false`。

REL-004f evidence（2026-06-24）：Route B next-turn draft、provider prompt context 與 session UI source proof 皆帶 relationship edge shadow runtime grounding；AgentFacts manifest 新增 internal-only runtime evidence refs。此 proof 不改 schema、不呼叫 provider、不寫 DB、不寫 relationship graph/VisitPlan/CRM confirmed fact，也不代表正式 `RelationshipEdge` migration approval。

### D0.10. Shadow feedback review/provider grounding（REL-004g，不動 schema）

- [x] `buildTheaterRouteBFeedbackContract()` 從 Route B session source grounding 產出 safe `relationshipEdgeShadowGrounding`；不得回 `draftEdges`、draft id、source/target node id、source references、metadata、raw private transcript 或 raw provider payload。
- [x] `buildTheaterRouteBFeedbackProviderInput()` / feedback prompt context 消費 `relationshipEdgeShadowGrounding` 作為 session-end feedback evidence，且不得把 edge shadow 當 confirmed CRM fact。
- [x] `buildTheaterRouteBFeedbackReview()` 寫入 feedback-specific grounding，所有 `EDGE_SHADOW` evidence 都只含 counts/warnings/boundaries。
- [x] `/theater/[sessionId]` feedback review panel 顯示 `data-route-b-feedback-edge-shadow-grounding` safe panel，並標示 raw draft edges / client-facing draft edges / formal schema / graph write / DB write 皆為 false。
- [x] `pnpm theater:route-b-feedback-dry-run`、`pnpm theater:route-b-feedback-provider-dry-run`、`pnpm theater:route-b-feedback-review-qa`、`pnpm theater:relationship-edge-shadow-session-source-qa` 通過，且輸出 `providerCallAttempted=false`、`aiUsageLogWritten=false`、`databaseWriteAttempted=false`、`writesRelationshipGraph=false`、`writesVisitPlan=false`、`writesConfirmedCrmFact=false`。

REL-004g evidence（2026-06-24）：Route B feedback contract、feedback provider prompt context、feedback review evidence 與 session UI review panel 皆帶 relationship edge shadow grounding；AgentFacts manifest 新增 internal-only feedback evidence refs。此 proof 不改 schema、不呼叫 provider、不寫 DB、不寫 relationship graph/VisitPlan/CRM confirmed fact，也不代表正式 `RelationshipEdge` migration approval。

### D1. Edge model 持久化（REL-004，動 schema）

- [ ] `RelationshipEdge` 全表帶可驗證 `organizationId`（經 client）；UI 不直接 import Prisma。
- [ ] `pnpm prisma:validate`、`pnpm prisma:generate` 通過；`db push`/migration dry-run 附 rollback note。
- [ ] 既有 `FamilyMember.parentMemberId` backfill 成 `PARENT_OF` edge，idempotent、不破壞真實資料。
- [ ] 多親/配偶/社會邊建立後重新登入仍可讀。

### D2. Family/person profile metadata boundary（REL-006，不動 schema）

- [ ] Family member profile metadata 只能走 allowlist：職位/職業、年收入或財務依賴、人物狀態/決策角色、關係脈絡、factStatus、source refs。
- [ ] Metadata 不得包含 email、phone、raw private transcript、raw provider payload、policy number、secret/token/payment data。
- [ ] BFF update/read 由 current member + client ownership 推導 scope；manager/foreign client 不得寫入或讀取 private profile details。
- [ ] Relationship graph source review 對已確認 metadata 顯示 FACT/INFERENCE/UNKNOWN，缺值仍保留待確認，不得把 inference 升格為 confirmed CRM fact。
- [ ] Proof 必須顯示不改 Prisma schema、不寫 RelationshipEdge table、不寫 VisitPlan、不寫 confirmed CRM fact、不呼叫 provider、不偽造 `AiUsageLog`。
- [ ] 若改 UI，desktop/mobile console error 0、無水平 overflow，且關係圖/來源審查不要求 raw ID workflow。

## E. 佈局/互動/可及性（REL-005）

- [ ] 配偶同 rank、手足排序、社會邊不破壞世代階層。
- [ ] 所有 icon-only / 節點 toolbar action 具 tooltip 與 `aria-label`；keyboard 可操作；focus ring 可見。
- [ ] 尊重 `prefers-reduced-motion`；dark mode 基本可讀。
- [ ] 跨狀態截圖（空/單親/雙親/配偶/社會關係）存 `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/`。

## F. 隱私/權限紅線（跨卡）

- [ ] org manager aggregate API 不回關係人姓名以外的客戶私密明細。
- [ ] 高敏感客戶關係資料進劇場仍走 reason/riskAccepted gate。
- [ ] client-facing / share 介面不外洩內部關係圖私密欄位。
