# 誠問 AI — 家庭關係圖多世代擴充計劃 v1.0

> 制定日期：2026-05-15  
> 負責模組：`src/domains/client/`、`src/components/crm/`

---

## 一、問題現況

### 1.1 現有資料結構限制

目前 `FamilyMember` 為**扁平陣列**，所有成員都直接掛在客戶（主客戶）底下，無法描述「誰是誰的孩子」。

```
主客戶
  ├─ 配偶
  ├─ 子（長子）       ← 無法知道長子有孩子
  └─ 孫子             ← 只能當作直接關係人，無法連結到長子
```

### 1.2 關係類型不足

現有 13 種 `RelationshipType` 缺少：
- **垂直向上**：祖父、祖母、外公、外婆
- **垂直向下**：孫子、孫女、外孫、外孫女
- **旁支水平**：叔叔/伯伯、舅舅、姑姑、阿姨、姪子、姪女、外甥、外甥女、表兄弟、表姐妹

### 1.3 視覺化佈局缺陷

`RelationshipMap.tsx` 使用**放射狀均分**佈局，所有節點以同心圓排列在主客戶周圍。三代以上成員在視覺上無法分層，閱讀困難。

---

## 二、目標

1. 支援**至少三代**的家庭樹（祖父母 → 父母（主客戶）→ 子女 → 孫輩）
2. 支援**旁支親屬**（兄弟姐妹的子女、父母的兄弟姐妹）
3. 關係圖改為**世代分層**的樹狀佈局，清晰呈現家族脈絡
4. 新增關係人時可選擇**連結至現有成員**（而非只連結至主客戶）
5. 向下相容：現有資料零遷移成本

---

## 三、技術選型研究

### 3.1 佈局引擎比較

| 方案 | 優點 | 缺點 | 建議 |
|------|------|------|------|
| **dagre** | 輕量、配置簡單、ReactFlow 官方範例 | 家族樹中配偶橫向連線較弱 | ✅ 首選 |
| **elkjs** | 強大的層級佈局、可處理複雜圖 | 非同步 API、包大、調試難 | 備選（若 dagre 不足） |
| **d3-hierarchy** | 專為單根樹設計、視覺效果好 | 需要單一根節點，配偶節點難處理 | 不適用 |
| 自訂算法 | 完全控制 | 開發成本高 | 不建議 |

**決策：採用 dagre（`@dagrejs/dagre`）**，原因：
- ReactFlow 官方推薦
- 支援有向圖，可同時處理縱向世代與橫向配偶關係
- npm 穩定、型別良好

### 3.2 資料模型設計原則

參考 [FamilySearch Family Tree Data Model](https://developers.familysearch.org/main/docs/the-family-tree-data-model) 與 [relatives-tree npm](https://www.npmjs.com/package/relatives-tree)：

- **Parent-child 關係**：子節點記錄 `parentMemberId`，指向父節點的 member id
- **配偶關係**：特殊處理，雙方互為配偶，邊為水平線
- **旁支**：透過 `parentMemberId` 鏈結至對應成員（如姪子連結至兄/弟/姐/妹節點）

---

## 四、開發計劃

### Phase 1 — 資料模型擴充（預估 0.5 天）

#### 1-A. 擴充 `RelationshipType`

**檔案**：`src/domains/client/types.ts`

新增以下關係類型，並依「世代」分組：

```typescript
// 上一代旁支
| "叔叔" | "伯伯" | "舅舅" | "姑姑" | "阿姨"

// 祖父母輩
| "祖父" | "祖母" | "外公" | "外婆"

// 孫輩
| "孫子" | "孫女" | "外孫" | "外孫女"

// 下一代旁支（兄弟姐妹之子）
| "姪子" | "姪女" | "外甥" | "外甥女"

// 同輩旁支
| "表哥" | "表弟" | "表姐" | "表妹" | "堂哥" | "堂弟" | "堂姐" | "堂妹"
```

#### 1-B. 新增 `parentMemberId` 欄位

**檔案**：`src/domains/client/types.ts`

```typescript
export interface FamilyMember {
  id: string;
  relation: RelationshipType | string;
  name: string;
  age?: number;
  phone?: string;
  linkedClientId?: string;
  parentMemberId?: string;   // ← 新增：連結至哪個成員（null = 連結至主客戶）
}
```

**說明**：
- `parentMemberId` 為 `undefined` 時，視為直接連結至**主客戶**（向下相容）
- `parentMemberId` 為某 `FamilyMember.id` 時，邊繪製在該成員與此成員之間

#### 1-C. 世代分層輔助常數

**檔案**：`src/domains/client/types.ts`（新增於底部）

```typescript
export const RELATION_GENERATION: Record<string, number> = {
  "祖父": -2, "祖母": -2, "外公": -2, "外婆": -2,
  "父": -1, "母": -1, "叔叔": -1, "伯伯": -1, "舅舅": -1, "姑姑": -1, "阿姨": -1,
  "兄": 0, "弟": 0, "姐": 0, "妹": 0,
  "表哥": 0, "表弟": 0, "表姐": 0, "表妹": 0,
  "堂哥": 0, "堂弟": 0, "堂姐": 0, "堂妹": 0,
  "配偶": 0,
  "子": 1, "女": 1, "姪子": 1, "姪女": 1, "外甥": 1, "外甥女": 1,
  "孫子": 2, "孫女": 2, "外孫": 2, "外孫女": 2,
};
// 未列出的預設為 0（同輩）
```

---

### Phase 2 — 佈局引擎導入（預估 0.5 天）

#### 2-A. 安裝 dagre

```bash
pnpm add @dagrejs/dagre
pnpm add -D @types/dagre
```

#### 2-B. 建立佈局工具函式

**新建檔案**：`src/lib/graph-layout.ts`

```typescript
import dagre from "@dagrejs/dagre";
import { Node, Edge } from "reactflow";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 72;

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const { x, y } = g.node(node.id);
    return {
      ...node,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });
}
```

---

### Phase 3 — 關係圖元件重構（預估 1 天）

**檔案**：`src/components/crm/RelationshipMap.tsx`

#### 3-A. 節點建構邏輯

改寫 `useMemo` 中的 nodes/edges 生成：

```
主客戶節點
  ├─ 遍歷 family，parentMemberId === undefined → 邊連至主客戶
  └─ parentMemberId 有值 → 邊連至對應成員
```

配偶節點在主客戶同一層（generation = 0），使用水平邊（`edgeType: "smoothstep"`）。

#### 3-B. 世代色彩與圖示系統

| 世代 | 背景色 | 圖示 |
|------|--------|------|
| -2（曾祖/祖輩） | 紫色系 `#EDE7F6` | `Crown` |
| -1（父母/叔伯） | 橙色系 `#FFF3E0` | `User` |
| 0（主客戶/配偶/同輩） | 藍色系 `#EBF3FB` | `Star` / `Heart` / `User` |
| +1（子女/姪甥） | 綠色系 `#E8F5E9` | `Baby` |
| +2（孫輩） | 黃色系 `#FFFDE7` | `Smile` |

#### 3-C. 邊的視覺風格

| 邊類型 | 樣式 |
|--------|------|
| 縱向親子 | 實線，`stroke: #90CAF9` |
| 配偶 | 虛線，`stroke: #F48FB1`，`strokeDasharray: 6` |
| 旁支（非直系） | 點線，`stroke: #CBD5E1`，`strokeDasharray: 3 3` |

#### 3-D. PersonNode 元件增強

新增 `generation` prop，根據世代動態調整背景色與邊框。

---

### Phase 4 — 新增關係人 UI 更新（預估 0.5 天）

**檔案**：`src/components/crm/AddRelationshipDialog.tsx`

#### 4-A. 新增「連結至」欄位

當 `family` 成員數 ≥ 1 時，顯示「連結至」下拉選單，選項包含「主客戶」以及所有現有家庭成員。

```
[姓名] [關係▼]
[年齡] [電話]
[連結至 ▼]  ← 新增，預設「主客戶」
```

#### 4-B. 關係選項依世代分組

使用 `<SelectGroup>` 將選項分組顯示：

```
─── 長輩 ───
祖父、祖母、外公、外婆、父、母、叔叔、伯伯、舅舅、姑姑、阿姨

─── 同輩 ───
配偶、兄、弟、姐、妹、表哥、表弟、表姐、表妹、堂哥、堂弟、堂姐、堂妹

─── 晚輩 ───
子、女、孫子、孫女、外孫、外孫女、姪子、姪女、外甥、外甥女

─── 其他 ───
親戚、朋友、合作夥伴、其他
```

#### 4-C. service 層更新

**檔案**：`src/domains/client/service.ts`

`addFamilyMember` 接受可選的 `parentMemberId`，透傳到 store。

---

### Phase 5 — 圖內快捷操作（預估 0.5 天，可後置）

在關係圖節點上懸停時顯示「＋ 新增子節點」按鈕，點擊開啟 `AddRelationshipDialog` 並預填 `parentMemberId`（降低操作步驟）。

實作方式：使用 ReactFlow 的 `onNodeMouseEnter` + `NodeToolbar` 元件。

---

## 五、向下相容策略

- 現有 `FamilyMember` 無 `parentMemberId` 欄位 → 佈局引擎自動視為連結至主客戶
- 舊的 `RelationshipType` 值（配偶、子、女⋯）繼續有效，`RelationshipType` 為聯合型別（union），新增不破壞舊值
- localStorage 現有資料無需遷移，讀取時 `parentMemberId` 為 `undefined` 即走舊路徑

---

## 六、測試要點

| 情境 | 驗證項目 |
|------|---------|
| 新增孫子（連結至子） | 圖中孫子節點在子節點下方，邊正確 |
| 新增叔叔（連結至主客戶，relation = 叔叔） | 叔叔節點在父母同層或上方 |
| 現有資料（無 parentMemberId） | 所有成員仍正確顯示，無報錯 |
| 多配偶（不支援）| 第二個「配偶」節點正常顯示，圖不崩潰 |
| 大家族（20 人以上）| dagre 佈局不重疊，效能可接受 |
| 刪除中間節點（如刪除「子」，其下有「孫子」） | 孫子節點改連至主客戶（fallback），或提示需先移除子節點 |

---

## 七、工作項目清單

```
Phase 1 — 資料模型（0.5 天）
  □ 1-A 擴充 RelationshipType（新增 20+ 種類型）
  □ 1-B 新增 FamilyMember.parentMemberId 欄位
  □ 1-C 新增 RELATION_GENERATION 輔助常數

Phase 2 — 佈局引擎（0.5 天）
  □ 2-A 安裝 @dagrejs/dagre
  □ 2-B 建立 src/lib/graph-layout.ts

Phase 3 — 關係圖重構（1 天）
  □ 3-A 改寫 nodes/edges 建構邏輯（支援 parentMemberId）
  □ 3-B 實作世代色彩與圖示系統
  □ 3-C 實作邊的視覺風格分類
  □ 3-D PersonNode 增加 generation prop

Phase 4 — 新增關係人 UI（0.5 天）
  □ 4-A AddRelationshipDialog 加入「連結至」欄位
  □ 4-B 關係選項依世代分組
  □ 4-C service.addFamilyMember 傳遞 parentMemberId

Phase 5 — 圖內快捷操作（0.5 天，可後置）
  □ 5-A 節點懸停顯示「＋」按鈕
  □ 5-B 點擊預填 parentMemberId 開啟 Dialog

總預估工時：3 天
```

---

## 八、參考資料

- [ReactFlow Dagre Tree 範例](https://reactflow.dev/examples/layout/dagre)
- [ReactFlow Entitree Flex（家庭樹）](https://reactflow.dev/examples/layout/entitree-flex)
- [ReactFlow 展開/收合節點](https://reactflow.dev/examples/layout/expand-collapse)
- [FamilySearch 家庭樹資料模型](https://developers.familysearch.org/main/docs/the-family-tree-data-model)
- [relatives-tree npm 套件](https://www.npmjs.com/package/relatives-tree)
- [react-family-tree npm 套件](https://www.npmjs.com/package/react-family-tree)
- [ELKJS & ReactFlow 家庭樹挑戰](https://test.charlestonwv.com/news/elkjs-and-reactflow-family-tree)
- [MyHeritage 大型家庭樹關係圖更新（2024）](https://blog.myheritage.com/2024/07/new-relationship-diagram-now-supports-very-large-family-trees/)
