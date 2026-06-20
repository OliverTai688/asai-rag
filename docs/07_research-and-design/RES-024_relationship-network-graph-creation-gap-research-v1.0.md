# RES-024 — 人物關係圖建立機制缺陷與關係網絡實作研究 v1.0

- 類型：研究與設計（RES）
- 主題：`/crm/[clientId]/relationships` 人物關係圖的建立/渲染 bug 診斷、關係網絡（network / genogram）實作方法研究、開發缺口盤點
- 狀態：研究版（research draft）；REL-1 最小 no-schema 修復與 REL-2 BFF edge 推導/渲染收斂已於 2026-06-20 完成，REL-3 edge schema model 待後續 approval
- 建立日期：2026-06-20
- 範圍：診斷現況 bug、研究可行做法、列出開發缺口與建議切片。**本文件不改 code、不動 Prisma schema、不呼叫 provider。**
- 可執行任務卡：`docs/05_execution-plans/PLN-024_relationship-network-graph-batch-tasks-v1.0.md`（REL workstream，AGENTS.md 鏡像）
- 驗收框架：`docs/08_acceptance-and-qa/ACC-016_relationship-network-graph-acceptance-framework-v1.0.md`
- 相關：`src/components/crm/RelationshipMap.tsx`、`src/components/crm/AddRelationshipDialog.tsx`、`src/app/(dashboard)/crm/[clientId]/relationships/page.tsx`、`src/domains/client/relationship-graph.ts`、`src/lib/clients/relationship-graph-repository.ts`、`src/domains/client/types.ts`、`prisma/schema.prisma`（`FamilyMember`）、BFF workstream `PLN-019`（BFF-103 CRM completion）、`PLN-010`（家庭關係圖多世代擴充）

---

## 0. 一句話結論

人物關係圖的「建立機制 bug」不是渲染小問題，而是**資料模型不足以表達網絡**：目前只有一個單向、單一父指標 `FamilyMember.parentMemberId`（自我參照樹）。2026-06-20 的 REL-1 最小修復已先解除 `Client.parentMemberId` 幽靈欄位 runtime 依賴、長輩漂浮 edge、parent mode local-only 寫入；但要做成真正的關係網絡，仍必須把「單一父指標的樹」升級為「節點＋邊」的關係圖模型。

---

## 1. 現況事實（程式碼層級）

### 1.1 兩套並存、不一致的實作

| 實作 | 檔案 | 性質 | 資料來源 | 問題 |
| --- | --- | --- | --- | --- |
| 互動關係圖 | `src/components/crm/RelationshipMap.tsx` | ReactFlow + `@dagrejs/dagre` TB 樹狀佈局，可新增子/父節點 | 讀 `client.family` + 幽靈 `client.parentMemberId` | 邊計算與持久化有 bug（見 §2） |
| 新增關係人對話框 | `src/components/crm/AddRelationshipDialog.tsx` | child / parent 兩種 mode | child 走 BFF `createFamilyMemberRemote`；**parent 走 local `addFamilyMember`/`updateClient`** | 兩條路徑不一致，parent 不落 DB |
| 關係圖來源審查 | `src/domains/client/relationship-graph.ts` + `relationship-graph-repository.ts` | BFF read-only，fact/inference/unknown 分層 | `/api/clients/[id]/relationship-graph`（DB） | 只讀、唯讀，不負責建立 |

> 換句話說：**畫面上看到的圖（RelationshipMap）和 BFF 真相（relationship-graph review）是兩個不同的世界**。互動建立流程沒有統一收斂到 BFF。

### 1.2 資料模型現況

- DB（`prisma/schema.prisma:642`）`FamilyMember` 只有 `parentMemberId String?`，沒有 edge / relation-type 表。
- DB `Client`（`schema.prisma:590`）**沒有** `parent_member_id` 欄位。
- 型別（`src/domains/client/types.ts`）：`FamilyMember.parentMemberId?`（line 71）存在；`Client.parentMemberId?`（line 99）也存在 —— 但 DTO `toClientDto()` 從未填它。
- 世代用字串表查（`RELATION_GENERATION`，types.ts:46）：長輩負數、同輩 0、晚輩正數；佈局靠 dagre 把 edge source→target 排成上下階層。

---

## 2. Bug 診斷（依嚴重度）

### Bug A — 幽靈欄位 `Client.parentMemberId`，新增父節點靜默丟失（CRITICAL）
- `Client.parentMemberId` 在 `types.ts:99` 宣告，被 `RelationshipMap.tsx:149/180`、`relationship-graph.ts` 的 `getParentLabel` 讀取，被 `AddRelationshipDialog.tsx:98` 用 `clientService.updateClient(...)` 寫入。
- 但它**不在 Prisma `Client` model、不在 `toClientDto()`**，所以：
  1. `updateClient` 只改了 local Zustand store；
  2. DB 完全沒有這個欄位；
  3. **重新整理 / 清空 storage / 換 browser context 後，父節點關係完全消失**。
- 這就是使用者說的「建立機制有 bug」的核心：新增父節點看起來成功（local 有了），但不是持久化的事實。

### Bug B — 長輩節點被 early-return，永遠沒有連線（HIGH）
- `RelationshipMap.tsx:186`：`if (!member.parentMemberId && generation < 0) return;`
- 任何「長輩」（父/母/祖父母，generation < 0）若直接掛在主客戶下（`parentMemberId` 為空），就會 **return 掉、不產生任何 edge** → 在畫布上變成孤立節點。
- 截圖中漂浮的「父 ji3」就是這條規則造成的：它是長輩、沒有 parentMemberId，所以沒有任何線連到主客戶。

### Bug C — parent mode 不走 BFF（HIGH）
- `AddRelationshipDialog.tsx:85-103`：child mode 用 `createFamilyMemberRemote`（BFF，落 DB）；parent mode 用 `addFamilyMember` + `updateClient`/`updateFamilyMember`（**全是 local store mutator**）。
- 註解自己也寫了：「Parent mode remains a local graph helper until the relationship re-parent API is added.」——這是一個**已知未完成、但仍出現在 UI 上的功能**，使用者會誤以為它是正式功能。

### Bug D — 邊語意/方向錯亂（MEDIUM）
- `RelationshipMap.tsx:154` 把父→客戶的 edge label 寫死成「子女」，但其他成員 edge 用的是 `member.relation`（line 199）——同一張圖兩種命名邏輯。
- 配偶被畫成 animated 虛線的「父→子」式有向邊（line 188-209），而非同輩、無方向的**婚姻/伴侶結合（pair-bond）**。標準 genogram 中配偶應該是同一 rank 的水平結合線，不是箭頭。

### Bug E — 單一父指標無法表達網絡（MEDIUM，根因）
- 現模型是「以主客戶為 root 的自我參照樹」。它**無法表達**：
  - 客戶的「兩位」父母（只能掛一個方向）；
  - 一個子女同時連到父與母（共同父母）；
  - 手足之間的關係（只能各自連回 root，看不出兄弟姐妹關係）；
  - 非家庭的社會關係（朋友、合作夥伴目前全部塌縮成「掛在主客戶下」）；
  - 離婚 / 同居 / 監護 等 genogram 常見關係。
- 真正的關係網絡需要 **edge list（節點＋邊）**，而不是單一 parent 指標。

### Bug F — edge id 可能碰撞（LOW）
- `RelationshipMap.tsx:195` edge id = `e-${sourceId}-${member.id}`；當多個成員都掛在同一 source（client.id），且 `client.parentMemberId` 為 undefined 時，`e-undefined-...` 類 id 有 React duplicate key 風險。

### 截圖對照
截圖 `/crm/cmqliym4t...zj9/relationships`：父(ji3)、母(kdf) 皆為長輩（orange，generation -1）。只有母→主客戶 有「子女」連線（很可能是 Bug A 的 local-only `client.parentMemberId` 邊，且只能存一個，後寫的 win），父則因 Bug B 漂浮孤立。重新整理後兩條關係都會掉回 DB 真相（皆無父母連線）。這完整重現了 A+B+C 的合併症狀。

---

## 3. 關係網絡實作方法研究（web）

### 3.1 渲染 / 互動函式庫

| 函式庫 | 定位 | 適合 | 注意 |
| --- | --- | --- | --- |
| **React Flow**（現用） | node-based UI / 流程圖 / 樹 | 階層、可編輯節點、自訂節點 React 元件 | 本身不做佈局，需搭 dagre / elk / d3-hierarchy；對「家族＋社會混合網絡」需要自訂 edge/union 節點 |
| **dagre / @dagrejs/dagre**（現用） | 有向圖階層佈局 | 單根樹、上下世代 | 不處理配偶配對、手足排序、非樹社會邊 |
| **elkjs** | 進階佈局引擎（port 自 Java ELK） | 大量參數、較佳的階層/正交佈局 | 體積較大、設定較重；React Flow 有官方 elk 範例 |
| **d3-hierarchy / d3-dag** | tree / DAG 佈局 | 單根 tree、family tree | d3-hierarchy 需單一 root；d3-dag 處理多父 DAG |
| **d3-force** | 力導向物理佈局 | 社會關係網、探索式「誰連到誰」 | 非確定性佈局，不適合需要穩定世代排列的家系圖 |
| **vis-network** | 互動網絡畫布（物理） | 可編輯節點、grouping、探索式關係網 | 偏一般 network，不內建 genogram 語意 |
| **Cytoscape.js** | 圖分析 + 多種佈局 | 需要圖演算法（中心性、路徑）時 | API 較重，偏分析 |
| **Sigma.js** | WebGL 大圖渲染 | 數千節點以上 | 我們的家系規模用不到 |
| **GoJS genogram 範例** | 商業，內建 genogram（婚姻 union 節點、自訂佈局） | 標準家系圖（pedigree） | 商業授權；可作**資料模型與視覺規範的參考**，不一定要採用 |

**2026 經驗法則**：圖分析用 Cytoscape、互動網絡用 vis-network、超大圖用 Sigma；**階層/家系**用 React Flow + dagre/elk 或 d3-dag。我們已在 React Flow + dagre 上，**重點不在換函式庫，而在補資料模型與佈局語意**。

### 3.2 標準 genogram / pedigree 的資料模型重點
- genogram 是「擴充版家系圖」，每個人、每段關係都帶資訊（職業、健康、情感強度等）。
- 關鍵：**婚姻/結合用 union 節點**（夫妻先連到一個 union，子女再從 union 往下），而不是把配偶當成彼此的父子。GoJS 官方 genogram 範例即用此法解決「夫妻同 rank、子女掛在夫妻之間」的佈局。
- 關係要**分型別**（parent-of / spouse-of / sibling-of / guardian-of / social-tie…），用 edge list 表達，而非單一 parent 指標。

---

## 4. 建議資料模型（節點＋邊）

把「樹指標」升級為「關係圖」。最小可行版本：

```text
RelationshipNode（沿用既有 FamilyMember 或新增）
  id, clientId(organizationId 透過 client), name, relation(角色標籤), age?, phone?,
  linkedClientId?,  // 已是現有欄位，可指向另一個 CRM client
  generationHint?   // 可選；佈局 fallback

RelationshipEdge（新增 — 這是缺的核心）
  id, clientId,
  sourceNodeId, targetNodeId,
  type: PARENT_OF | SPOUSE_OF | SIBLING_OF | CHILD_OF | GUARDIAN_OF | SOCIAL_TIE | OTHER,
  factStatus: FACT | INFERENCE | UNKNOWN,   // 與 relationship-graph review 對齊
  label?, metadata?
```

- 主客戶本身就是一個節點（不再需要幽靈 `Client.parentMemberId`）。
- 「客戶的父母」= 兩條 `PARENT_OF`（父→客戶、母→客戶）。
- 「配偶」= 一條 `SPOUSE_OF`（同 rank，渲染成水平結合線或 union 節點）。
- 佈局：以 edge `type` 決定 rank 與方向（PARENT_OF 決定上下、SPOUSE_OF 同 rank、SIBLING_OF 同 rank），再交給 dagre/elk；社會關係邊可選擇不參與階層、只畫關聯線。
- 與既有 `relationship-graph.ts` 的 FACT/INFERENCE/UNKNOWN 分層天然對齊，便於下游（拜訪準備包、劇場建場）引用。

> 漸進策略：可先**不動 schema**，在 BFF 層用既有 `FamilyMember` 推導出 edge list（把 `parentMemberId` 與 `relation` 對映成 PARENT_OF/SPOUSE_OF 等），修掉渲染 bug；待確認 DB target 與 approval 後，再加 `RelationshipEdge` 表做完整多邊模型。

---

## 5. 開發缺口（Gap）盤點

| Gap | 描述 | 影響 | 建議優先 |
| --- | --- | --- | --- |
| G1 幽靈欄位 | `Client.parentMemberId` runtime 依賴已移除 | REL-1 完成 | Done |
| G2 長輩孤立 | 長輩 root edge 已改為長輩→主客戶 | REL-1 完成 | Done |
| G3 建立路徑不一致 | parent mode 已改走 BFF create + re-parent | REL-1 完成 | Done |
| G4 單一父指標 | BFF 已可由既有 `FamilyMember` 推導 typed edge；仍無正式 edge 表 | 多親/離婚/監護等完整網絡仍待 REL-3 schema | P2 |
| G5 配偶/union 語意 | 配偶已改由 `SPOUSE_OF` 同 rank edge 呈現 | 仍可在 REL-005 強化 genogram layout polish | Done / P2 polish |
| G6 兩套實作未收斂 | RelationshipMap 已改吃 relationship-graph review builder 的 nodes/edges | 仍需 REL-005 做跨狀態 UI polish | Done / P2 polish |
| G7 佈局僅 dagre 樹 | 不處理同輩/社會邊 | 複雜家庭排版差 | P2 |
| G8 缺驗收 | 無關係圖 create/persist 的 API/Browser proof | 回歸風險 | P1 |

---

## 6. 建議切片（給後續 batch，符合 BFF-103 CRM completion 範圍）

> 對齊 `AGENTS.md` 的 BFF-103（CRM BFF completion）「Client store local write methods 改成 remote-confirmed」與「保留合規欄位」要求。

- **REL-1（P0，最小修復，不動 schema）— 已完成 2026-06-20**
  - 移除 / 廢用幽靈 `Client.parentMemberId` runtime 依賴。
  - 修長輩 root edge：長輩直接掛主客戶時，畫成 `PARENT_OF`（長輩→客戶）邊。
  - parent mode 改走 BFF（`createFamilyMemberRemote` + 既有 `PATCH family-members/[memberId]` re-parent），不再 local-only。
  - Proof：`pnpm client:relationship-graph-write-qa` 與 `pnpm client:relationship-graph-qa` 通過。

- **REL-2（P1，BFF edge 推導 + 渲染收斂）— 已完成 2026-06-20**
  - BFF 由 `FamilyMember` 推導 edge list（PARENT_OF/SPOUSE_OF/SIBLING_OF…），RelationshipMap 改吃 BFF edge，而非自己在前端重算。
  - 配偶改 union/同 rank 結合線；edge label 統一。

- **REL-3（P2，完整 edge model，需 schema approval）**
  - 新增 `RelationshipEdge` 表（type + factStatus），支援多親、社會關係、離婚/監護。
  - 動 schema → `pnpm prisma:validate` / `generate` / 在可確認的 dev/local target `db push`；補 migration/rollback note。

---

## 7. 風險與紅線
- 不得移除/弱化合規欄位（`complianceChecklist`、`sensitivityLevel`、`kycStatus`）；關係圖節點不可外洩 email/phone 到 org manager aggregate 或 client-facing 介面。
- 改 route/layout/session 行為前先讀 `node_modules/next/dist/docs/`。
- 動 DB 前確認 target 為 local/development/已授權 staging；production 破壞性操作需明確 approval。
- 高敏感客戶進劇場仍走既有 reason/riskAccepted gate（見 TDF-004）。

---

## 8. Sources（web research）
- [The Best React Chart Libraries for 2026 — usedatabrain](https://www.usedatabrain.com/blog/react-chart-libraries)
- [react-flow-family-tree — GitHub (harrykhh)](https://github.com/harrykhh/react-flow-family-tree)
- [ReactFlow for Family Tree Visualization — tva.sg](https://www.tva.sg/insights/reactflow-family-tree-visualization)
- [React Flow: Everything you need to know — Synergy Codes](https://www.synergycodes.com/blog/react-flow-everything-you-need-to-know)
- [Cytoscape.js vs vis-network vs Sigma.js 2026 — PkgPulse](https://www.pkgpulse.com/guides/cytoscape-vs-vis-network-vs-sigma-graph-visualization-2026)
- [Layouting overview — React Flow](https://reactflow.dev/learn/layouting/layouting)
- [Dagre Tree example — React Flow](https://reactflow.dev/examples/layout/dagre)
- [Elkjs Tree example — React Flow](https://reactflow.dev/examples/layout/elkjs)
- [Genogram Family Tree (union nodes, custom layout) — GoJS](https://gojs.net/latest/samples/genogram.html)
- [dagre-d3 — GitHub](https://github.com/dagrejs/dagre-d3)
