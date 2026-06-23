# PLN-024 — 人物關係圖（關係網絡）修復與升級 Batch Tasks v1.0

- 類型：計畫與批次（PLN）
- KEY：`REL`
- 研究依據：`docs/07_research-and-design/RES-024_relationship-network-graph-creation-gap-research-v1.0.md`
- 驗收：`docs/08_acceptance-and-qa/ACC-016_relationship-network-graph-acceptance-framework-v1.0.md`
- 對齊：`AGENTS.md` Full-site BFF（BFF-103 CRM completion）、`PLN-010`（家庭關係圖多世代擴充）
- 建立日期：2026-06-20

本檔是 `AGENTS.md` 「Relationship Network Graph Batch Tasks」workstream 的完整任務卡來源。單一勾選真相以 `AGENTS.md` 鏡像為準（與本檔同步）。每張卡都是可獨立驗收的清單；完成即就地把 `[ ]` 改成 `[x]` 並註記變更檔案。

---

## Context

修復 `/crm/[clientId]/relationships` 人物關係圖的建立/持久化 bug，並把「單一父指標的樹」升級為可表達網絡的「節點＋邊」模型。本條只做**關係圖資料來源收斂、建立/持久化修復、edge 語意與佈局、edge model 與驗收**；不改 SPIN 狀態機、不改 Theater enum/scoring、不刪合規欄位（`complianceChecklist`、`sensitivityLevel`、`kycStatus`）、不外洩 email/phone 到 org manager aggregate 或 client-facing 介面。

REL-1（REL-001/002）為**不動 schema 的最小修復**；REL-3（REL-004）才動 schema，且需可確認 DB target（local/development/已授權 staging）與 migration/rollback note。

---

## Current Relationship Graph Gaps

- **G1/G2/G3 已於 2026-06-20 REL-001/002 最小修復完成**：runtime 不再讀寫 `Client.parentMemberId`；長輩直接掛主客戶時會畫成長輩→主客戶 edge；parent mode 改走 BFF create + re-parent。
- **G5/G6 已於 2026-06-20 REL-003 完成**：BFF review builder 推導 typed edges，`RelationshipMap` 改吃同一份 truth，配偶/手足/社會關係不再被當成前端自算樹。
- **G7/G8 已於 2026-06-20 REL-005 完成**：同 rank layout hint、keyboard/aria toolbar、desktop/mobile/reduced-motion/dark cross-state Browser proof 已補齊。
- **G4a 已於 2026-06-23 REL-004a 完成**：no-schema shadow contract + backfill dry-run 已固化 `RelationshipEdgeDraft` DTO、metadata allowlist、idempotent candidate generation 與 `pnpm client:relationship-edge-shadow-qa`。Formal REL-004 仍需 migration/rollback approval 才能動 schema。
- **G4 剩餘 schema gap**：正式 `RelationshipEdge` edge table 尚未建立；目前先由 `FamilyMember.parentMemberId` + `relation` deterministic 推導雙親、配偶、手足、社會關係 edge。REL-004 需 migration/rollback approval。

---

## Batch REL-001 — 最小修復：移除幽靈欄位、修長輩連線（不動 schema）

- [x] 移除 / 廢用 `Client.parentMemberId`（`src/domains/client/types.ts:99`），並清掉其讀取點：`RelationshipMap.tsx:149-159` 的 client-parent edge 區塊、`RelationshipMap.tsx:180` 的 `isClientParent` dead code；source audit confirmed `relationship-graph.ts` `getParentLabel` only depends on `FamilyMember.parentMemberId`.
- [x] 修 `RelationshipMap.tsx:186` 長輩 early-return：長輩（generation<0）直接掛主客戶時，畫成方向正確的 `PARENT_OF`（長輩→主客戶）邊，不再 return 掉、不再漂浮。
- [x] edge label / 方向統一：父母→客戶用一致語意（不再把父→客戶硬寫成「子女」與其他成員 `member.relation` 兩套邏輯）。
- [x] 確認 `RelationshipMap` 仍只讀 `client.family` 既有欄位，不新增 client-store 業務持久化來源。
- [x] 不改 SPIN 狀態機、不改 Theater enum/scoring、不刪合規欄位。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。
- [x] Browser proof：`/crm/[clientId]/relationships` 長輩節點有連線、無漂浮孤立；desktop/mobile 無水平 overflow、console error 0。

## Batch REL-002 — 建立流程收斂到 BFF（child + parent 一致持久化）

- [x] `AddRelationshipDialog.tsx` parent mode 改走 BFF：用 `createFamilyMemberRemote` 建立新成員，並用既有 `PATCH /api/clients/[id]/family-members/[memberId]` re-parent，不再用 local-only `addFamilyMember`/`updateClient`。
- [x] child / parent 兩 mode 都 server-confirmed；client store local write method 改為 remote-confirmed cache update 或標 dev-only（對齊 BFF-103）。
- [x] 所有 write 由 server session 推導 organization/owner；DTO 保留 `complianceChecklist`、`sensitivityLevel`、`kycStatus`。
- [x] API proof：unauth 401、跨 org/foreign client 403/404、缺欄位 400、成功 200/201。
- [x] Persist proof：清空 browser storage / 新 browser context 後，新增的父母/子女關係仍在（不再 refresh 消失）。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20 REL-001/002）：變更檔案 `src/domains/client/types.ts`、`src/components/crm/RelationshipMap.tsx`、`src/components/crm/AddRelationshipDialog.tsx`、`src/domains/client/service.ts`、`scripts/client-relationship-graph-write-qa.mjs`、`scripts/client-relationship-graph-qa.mjs`。Proof：`pnpm client:relationship-graph-write-qa`、`pnpm client:relationship-graph-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

## Batch REL-003 — BFF edge 推導 + 渲染收斂 + 配偶 union（不動 schema）

- [x] BFF 由既有 `FamilyMember`（`parentMemberId` + `relation`）推導 edge list：`PARENT_OF` / `SPOUSE_OF` / `SIBLING_OF` / `CHILD_OF` / `SOCIAL_TIE`，附 `factStatus`（FACT/INFERENCE/UNKNOWN，對齊 `relationship-graph.ts`）。
- [x] `RelationshipMap` 改吃 BFF 推導的 nodes/edges，而非前端各自重算；與 `relationship-graph.ts` review 收斂為同一份真相（解 G6）。
- [x] 配偶改 genogram union/同 rank 結合線（pair-bond），非有向父子邊；edge label 統一。
- [x] 社會關係（朋友/合作夥伴）以關聯線呈現，可選擇不參與階層 rank。
- [x] API/source proof：edge list 不外洩 email/phone；node/edge 數與 `client.family` 一致。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。
- [x] Browser proof：配偶、雙親、手足關係渲染正確；desktop/mobile 無 overflow、console error 0。

完成註記（2026-06-20 REL-003）：變更檔案 `src/domains/client/relationship-graph.ts`、`src/components/crm/RelationshipMap.tsx`、`src/components/crm/RelationshipGraphSourceReview.tsx`、`scripts/client-relationship-graph-qa.mjs`。Proof：`pnpm client:relationship-graph-qa`、`pnpm client:relationship-graph-write-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`、`git diff --check`。

## Batch REL-004a — RelationshipEdge shadow contract + backfill dry-run（不動 schema）

- [x] 在 domain/repository 邊界定義 server-only `RelationshipEdgeDraft` / backfill DTO（`sourceNodeId`、`targetNodeId`、`type`、`factStatus`、`label?`、`metadata` allowlist、`sourceReferenceIds`），不改 Prisma schema、不手改 `src/generated`、不寫 DB。
- [x] Backfill dry-run 從既有 `FamilyMember.parentMemberId` + `relation` 推導未來 `RelationshipEdge` candidates，輸出 deterministic count / duplicate guard / unsupported relationship warnings；重跑結果 idempotent。
- [x] Metadata allowlist 不含 email、phone、raw private transcript、raw provider payload、policy number、secret/token；edge 只標 FACT/INFERENCE/UNKNOWN 與安全摘要。
- [x] 新增 `pnpm client:relationship-edge-shadow-qa`，覆蓋單親、雙親、配偶、手足、社會關係、unknown/inference sentinel、no schema/no DB write/no provider proof。
- [x] 更新 `ACC-016` 的 REL-004a 驗收，並把 REL-004 migration approval / rollback note 保持為正式 schema 前置條件。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-23 REL-004a）：新增 `src/domains/client/relationship-edge-shadow.ts`、`scripts/client-relationship-edge-shadow-qa.mjs`、`scripts/client-relationship-edge-shadow-qa.ts` 與 package script `client:relationship-edge-shadow-qa`。Proof 輸出 9 個 deterministic draft edges（PARENT_OF 3、SPOUSE_OF 1、SIBLING_OF 1、SOCIAL_TIE 4；FACT 6、INFERENCE 1、UNKNOWN 2），涵蓋 parentMemberId backfill、root elder/descendant、配偶、手足、社會關係、ambiguous relation、missing parent fallback、duplicate guard、metadata allowlist、private sentinel、no schema/no DB/no provider。未改 Prisma schema、不呼叫 provider、不寫 DB；REL-004 正式 edge table 仍需 migration/rollback approval。

## Batch REL-004b — RelationshipEdge shadow BFF summary（不動 schema）

- [x] `/api/clients/[id]/relationship-graph` 的 BFF response 新增 `edgeShadow` summary，沿用 current-member scoped repository 與既有 `canReadClientDetail` gate，不新增 route/provider。
- [x] Summary 只回 version、source count、candidate count、warning code、counts 與 proof flags；不回 `draftEdges`、source/target node id、source references、metadata、client id。
- [x] Proof flags 明確標記 no schema/no DB/no provider、client-facing draft edges 未回傳、formal schema 未核可。
- [x] 更新 `client:relationship-graph-qa` 對 edgeShadow 的 API contract 斷言；新增 `pnpm client:relationship-edge-shadow-bff-qa` 做不需 dev server 的 source-level BFF proof。
- [x] 跑 `pnpm client:relationship-edge-shadow-qa`、`pnpm client:relationship-edge-shadow-bff-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-23 REL-004b）：`ClientRelationshipGraphResponse` 新增 BFF-safe `edgeShadow` summary，由 `toRelationshipEdgeShadowBffSummary(buildRelationshipEdgeShadowBackfill(client))` 產生；完整 `RelationshipEdgeDraft` 仍留在 server-side dry-run contract，不進 client payload。Formal REL-004 schema/migration 仍需 approval。

## Batch REL-004c — Edge shadow summary -> preparation/theater handoff（不動 schema）

- [x] `buildVisitTheaterHandoff()` server/domain path 從 `client` deterministic 產生 `relationshipEdgeShadow` summary，放入 `sourceSummary.evidenceSummary` 與 `sourceCounts.relationshipEdgeShadowCandidates`。
- [x] `knownMaterials` 帶入 least-disclosure `relationship_edge_shadow_summary=true`，只含 candidate count、type/status counts、warning code、formal schema/proof boundary；不含 `draftEdges`、draft id、source/target node id、source references、metadata。
- [x] Handoff warnings/missing 明確標示 formal `RelationshipEdge` schema 尚未核可、劇場只可用安全摘要、不寫回關係圖/VisitPlan/CRM fact。
- [x] 更新 `pnpm visit:theater-handoff-dry-run`，覆蓋 edgeShadow summary、warning、no-provider/no-DB/no-write/no-draft-payload boundary。
- [x] 跑 `pnpm visit:theater-handoff-dry-run`、`pnpm client:relationship-edge-shadow-bff-qa`、`pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-23 REL-004c）：準備包 -> 劇場 handoff 現在會消費 RelationshipEdge shadow summary 作為 edge-model readiness evidence；仍不暴露 draft edge internals、不寫 DB、不寫 confirmed CRM fact、不宣稱 formal schema approval。

## Batch REL-004 — 完整 edge model（動 schema，需 approval）

- [ ] Prisma 新增 `RelationshipEdge`（`id`、`clientId`、`sourceNodeId`、`targetNodeId`、`type`、`factStatus`、`label?`、`metadata?`），全表帶可驗證 `organizationId`（經 client）；保留 `FamilyMember` 既有欄位作 compatibility。
- [ ] 支援多親、配偶結合、手足、離婚/監護、社會關係；主客戶本身為節點，不再依賴幽靈 `Client.parentMemberId`。
- [ ] Repository / DTO 邊界：UI 不直接 import Prisma；read/write 都 server-scoped。
- [ ] Backfill 策略 idempotent：把既有 `FamilyMember.parentMemberId` 轉成 `PARENT_OF` edge，不破壞真實資料、不重複。
- [ ] 動 schema 跑 `pnpm prisma:validate`、`pnpm prisma:generate`，在可確認 DB target 做 `db push` 或 migration dry-run，並附 migration/rollback note。
- [ ] API/persist proof：建立多親/配偶/社會邊後重新登入仍可讀。
- [ ] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

## Batch REL-005 — 佈局/互動 polish + 驗收 + 文件同步

- [x] 佈局：dagre/elk 處理同 rank 配偶與手足排序；社會邊不破壞世代階層；尊重 `prefers-reduced-motion`。
- [x] 互動 polish：新增/刪除節點、新增父/子節點 toolbar 都有 tooltip/aria-label；keyboard 可操作。
- [x] 跨狀態 Browser QA：空關係、單親、雙親、配偶、含社會關係；desktop/mobile console error 0、無水平 overflow。
- [x] 依 `ACC-016` 完成驗收；截圖存 `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/`。
- [x] 更新 `AGENTS.md`、本檔（PLN-024）、必要 report / issue-question 完成狀態。
- [x] 跑 `pnpm exec tsc --noEmit --pretty false`、`pnpm lint:changed`。

完成註記（2026-06-20 REL-005）：變更檔案 `src/components/crm/RelationshipMap.tsx`、`scripts/client-relationship-graph-polish-qa.mjs`、`package.json`。`RelationshipMap` 將節點改為可 focus 的 `role=group`，keyboard focus 時也顯示新增父/子節點 toolbar；toolbar actions 補 `aria-label`、native `title` tooltip、可見 focus ring 與 reduced-motion-friendly transition。同 rank layout hint 對配偶、手足、社會關係採 deterministic spacing，圖例與畫布補可辨識 label，視覺收斂為 hairline/無陰影。`pnpm client:relationship-graph-polish-qa` 建立空關係、單親、雙親＋配偶＋手足＋社會關係三組 demo client，驗證 API edge types、準備包 question handoff、劇場 readiness、desktop/mobile/reduced-motion/dark proof、toolbar aria/title/focus、no overflow、console error 0、email/phone sentinel 0。未改 Prisma schema、不呼叫 provider。

---

## Current Relationship Graph Blockers

- REL-004 動 schema 需可確認 DB target（local/development/已授權 staging）與 migration/rollback approval；無法確認時先做 REL-004a no-schema shadow contract / backfill dry-run，不執行 Prisma migration 或 DB write。
- 若改 route/layout/server action/session 行為，先讀 `node_modules/next/dist/docs/` 對應 Next.js 版本文件。
- 高敏感客戶關係資料進劇場仍走既有 reason/riskAccepted gate（TDF-004），不得繞過。
- 與 `PLN-023`（AI Meeting Module）為不同 workstream，勿混改其檔案。
