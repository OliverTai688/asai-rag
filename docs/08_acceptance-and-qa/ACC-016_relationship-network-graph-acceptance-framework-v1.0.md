# ACC-016 — 人物關係圖（關係網絡）驗收框架 v1.0

- 類型：驗收與 QA（ACC）
- 對應計畫：`docs/05_execution-plans/PLN-024_relationship-network-graph-batch-tasks-v1.0.md`（REL workstream）
- 研究依據：`docs/07_research-and-design/RES-024_relationship-network-graph-creation-gap-research-v1.0.md`
- 建立日期：2026-06-20

本框架定義 REL-001..REL-005 的驗收條目。每張 batch 卡完成前須通過對應段落，並保存 proof（API response、DB 查詢、Browser 截圖、command output）。

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

## D. Edge model 持久化（REL-004，動 schema）

- [ ] `RelationshipEdge` 全表帶可驗證 `organizationId`（經 client）；UI 不直接 import Prisma。
- [ ] `pnpm prisma:validate`、`pnpm prisma:generate` 通過；`db push`/migration dry-run 附 rollback note。
- [ ] 既有 `FamilyMember.parentMemberId` backfill 成 `PARENT_OF` edge，idempotent、不破壞真實資料。
- [ ] 多親/配偶/社會邊建立後重新登入仍可讀。

## E. 佈局/互動/可及性（REL-005）

- [ ] 配偶同 rank、手足排序、社會邊不破壞世代階層。
- [ ] 所有 icon-only / 節點 toolbar action 具 tooltip 與 `aria-label`；keyboard 可操作；focus ring 可見。
- [ ] 尊重 `prefers-reduced-motion`；dark mode 基本可讀。
- [ ] 跨狀態截圖（空/單親/雙親/配偶/社會關係）存 `docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph/`。

## F. 隱私/權限紅線（跨卡）

- [ ] org manager aggregate API 不回關係人姓名以外的客戶私密明細。
- [ ] 高敏感客戶關係資料進劇場仍走 reason/riskAccepted gate。
- [ ] client-facing / share 介面不外洩內部關係圖私密欄位。
