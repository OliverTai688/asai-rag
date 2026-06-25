"use client";

import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Position,
  useNodesState,
  useEdgesState,
  Handle,
  NodeToolbar,
  MarkerType,
} from "reactflow";
import type { Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import {
  buildClientRelationshipGraphReview,
  type ClientRelationshipGraphReview,
  type RelationshipGraphEdge,
  type RelationshipGraphEdgeType,
  type RelationshipGraphFactStatus,
  type RelationshipGraphPersonNode,
} from "@/domains/client/relationship-graph";
import { Client, getRelationGeneration } from "@/domains/client/types";
import { ArrowUpRight, Users, User, Heart, Baby, Star, Crown, Smile, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyDagreLayout } from "@/lib/graph-layout";

// 世代色彩配置
const GENERATION_STYLE: Record<number, { bg: string; border: string; icon: string }> = {
  "-2": { bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-800", icon: "text-purple-500" },
  "-1": { bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800", icon: "text-orange-500" },
  "0":  { bg: "bg-white dark:bg-zinc-900", border: "border-zinc-100 dark:border-zinc-800", icon: "text-zinc-500" },
  "1":  { bg: "bg-green-50 dark:bg-green-950/40", border: "border-green-200 dark:border-green-800", icon: "text-green-500" },
  "2":  { bg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-200 dark:border-yellow-800", icon: "text-yellow-600" },
};

const RELATIONSHIP_GRAPH_ADVISOR_NODE_LIMIT = 24;
const THEATER_FOCUS_ROLE_LIMIT = 4;

function getGenerationStyle(generation: number) {
  const clamped = Math.max(-2, Math.min(2, generation));
  return GENERATION_STYLE[clamped] ?? GENERATION_STYLE["0"];
}

function getNodeIcon(relation: string, isRoot: boolean, iconClass: string) {
  if (isRoot) return <Star className={cn("w-5 h-5", "text-[#1565C0]")} />;
  if (relation === "配偶") return <Heart className={cn("w-5 h-5", "text-rose-500")} />;
  const gen = getRelationGeneration(relation);
  if (gen <= -2) return <Crown className={cn("w-5 h-5", iconClass)} />;
  if (gen === 1) return <Baby className={cn("w-5 h-5", iconClass)} />;
  if (gen >= 2) return <Smile className={cn("w-5 h-5", iconClass)} />;
  return <User className={cn("w-5 h-5", iconClass)} />;
}

type PersonNodeData = {
  label: string;
  relation: string;
  isRoot?: boolean;
  generation: number;
  linkedClient?: RelationshipGraphPersonNode["linkedClient"];
  onAddChild?: (memberId: string) => void;
  onAddParent?: (memberId: string) => void;
  memberId: string;
};

type RelationshipEdgeData = {
  relationshipType: RelationshipGraphEdgeType;
  factStatus: RelationshipGraphFactStatus;
  layoutRole: "hierarchy" | "same-rank" | "association";
};

type RelationshipGraphQualitySummary = {
  duplicateNodeCount: number;
  edgeCount: number;
  nodeCount: number;
  screenReaderSummary: string;
  sizeStatus: "compact" | "large";
  warnings: string[];
};

const PersonNode = ({
  data,
  selected,
}: {
  data: PersonNodeData;
  selected: boolean;
}) => {
  const [hasKeyboardFocus, setHasKeyboardFocus] = React.useState(false);
  const style = data.isRoot
    ? { bg: "bg-[#F6F8FA] dark:bg-blue-950/30", border: "border-[#1A3A6B]/30", icon: "text-[#1565C0]" }
    : getGenerationStyle(data.generation);
  const addParentLabel = `新增父節點：${data.label}`;
  const addChildLabel = `新增子節點：${data.label}`;
  const showToolbar = selected || hasKeyboardFocus;

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`關係圖節點：${data.relation} ${data.label}`}
      onFocus={() => setHasKeyboardFocus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) {
          setHasKeyboardFocus(false);
        }
      }}
      className={cn(
        "flex min-h-[72px] min-w-[190px] flex-col items-stretch gap-3 rounded-xl border px-4 py-3 shadow-none transition-colors motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3A6B] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950",
        style.bg,
        style.border,
        selected && "border-[#1565C0] ring-2 ring-[#1565C0]/20"
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline",
            data.isRoot ? "bg-white" : "bg-white/60 dark:bg-zinc-800/60"
          )}
        >
          {getNodeIcon(data.relation, !!data.isRoot, style.icon)}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-tight">{data.relation}</p>
          <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{data.label}</p>
        </div>
      </div>
      {data.linkedClient && <LinkedClientAffordance linkedClient={data.linkedClient} />}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />

      {(data.onAddChild || data.onAddParent) && (
        <NodeToolbar isVisible={showToolbar} position={Position.Bottom} className="flex gap-2">
          {data.onAddParent && (
            <button
              type="button"
              aria-label={addParentLabel}
              title={addParentLabel}
              onClick={() => data.onAddParent!(data.memberId)}
              className="flex min-h-10 items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white shadow-none transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3A6B] focus-visible:ring-offset-2 motion-reduce:transition-none dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <UserPlus className="w-3 h-3" /> 新增父節點
            </button>
          )}
          {data.onAddChild && (
            <button
              type="button"
              aria-label={addChildLabel}
              title={addChildLabel}
              onClick={() => data.onAddChild!(data.memberId)}
              className="flex min-h-10 items-center gap-1 rounded-full bg-[#1A3A6B] px-3 py-1.5 text-xs font-bold text-white shadow-none transition-colors hover:bg-[#1565C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3A6B] focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <UserPlus className="w-3 h-3" /> 新增子節點
            </button>
          )}
        </NodeToolbar>
      )}
    </div>
  );
};

function LinkedClientAffordance({
  linkedClient,
}: {
  linkedClient: NonNullable<RelationshipGraphPersonNode["linkedClient"]>;
}) {
  const commonClassName =
    "flex min-h-8 items-center gap-1.5 rounded-md border border-hairline bg-white/70 px-2.5 py-1.5 text-left text-[11px] font-semibold text-zinc-700 shadow-none dark:bg-zinc-900/70 dark:text-zinc-200";

  if (linkedClient.canNavigate && linkedClient.href) {
    return (
      <a
        href={linkedClient.href}
        aria-label={`開啟${linkedClient.label}的 CRM 客戶資料`}
        title={`開啟${linkedClient.label}的 CRM 客戶資料`}
        data-linked-client-affordance="readable"
        data-linked-client-state="readable"
        className={cn(
          commonClassName,
          "transition-colors hover:border-[#1A3A6B]/40 hover:text-[#1A3A6B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3A6B] focus-visible:ring-offset-2 motion-reduce:transition-none"
        )}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{linkedClient.label}</span>
        {linkedClient.status && (
          <span className="shrink-0 border-l border-hairline pl-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            {linkedClient.status}
          </span>
        )}
      </a>
    );
  }

  return (
    <span
      aria-label="此關係人也是 CRM 客戶，但目前無權檢視明細"
      title="此關係人也是 CRM 客戶，但目前無權檢視明細"
      data-linked-client-affordance="unavailable"
      data-linked-client-state="unavailable"
      className={cn(commonClassName, "text-zinc-500 dark:text-zinc-400")}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{linkedClient.label}</span>
    </span>
  );
}

const nodeTypes = { person: PersonNode };

interface RelationshipMapProps {
  client: Client;
  graphReview?: ClientRelationshipGraphReview;
  onAddChild?: (parentMemberId: string | null) => void;
  onAddParent?: (childMemberId: string | null) => void;
}

function buildGraph(
  client: Client,
  graphReview?: ClientRelationshipGraphReview,
  onAddChild?: (id: string | null) => void,
  onAddParent?: (id: string | null) => void
) {
  const review = graphReview ?? buildClientRelationshipGraphReview(client);
  const nodes: Node<PersonNodeData>[] = [];
  const nodeIdByKey = new Map<string, string>();

  review.nodes.forEach((reviewNode) => {
    nodeIdByKey.set(reviewNode.nodeKey, getReactFlowNodeId(client, reviewNode));
  });

  review.nodes.forEach((reviewNode) => {
    const isRoot = reviewNode.nodeKey === "primary";
    const reactFlowNodeId = getReactFlowNodeId(client, reviewNode);

    nodes.push({
      id: reactFlowNodeId,
      type: "person",
      data: {
        label: reviewNode.displayName,
        relation: reviewNode.relation,
        isRoot,
        generation: reviewNode.generation,
        linkedClient: reviewNode.linkedClient,
        memberId: reactFlowNodeId,
        onAddChild: onAddChild ? () => onAddChild(isRoot ? null : reactFlowNodeId) : undefined,
        onAddParent: onAddParent ? () => onAddParent(isRoot ? null : reactFlowNodeId) : undefined,
      },
      position: { x: 0, y: 0 },
    });
  });

  const edges = review.edges.flatMap((edge): Edge<RelationshipEdgeData>[] => {
    const source = nodeIdByKey.get(edge.sourceNodeKey);
    const target = nodeIdByKey.get(edge.targetNodeKey);

    if (!source || !target) return [];

    return [
      {
        id: edge.edgeKey,
        source,
        target,
        label: getRelationshipEdgeLabel(edge),
        labelStyle: { fill: "#52525b", fontWeight: 700, fontSize: 10 },
        style: getRelationshipEdgeStyle(edge),
        markerEnd: getRelationshipEdgeMarker(edge),
        type: edge.type === "SPOUSE_OF" ? "straight" : undefined,
        data: {
          relationshipType: edge.type,
          factStatus: edge.factStatus,
          layoutRole: getRelationshipEdgeLayoutRole(edge.type),
        },
      },
    ];
  });

  const hierarchyEdges = edges.filter((edge) => edge.data?.layoutRole === "hierarchy");
  const laidOutNodes = applySameRankHints(applyDagreLayout(nodes, hierarchyEdges, "TB"), edges);
  return { nodes: laidOutNodes, edges };
}

function normalizeGraphNodeIdentity(node: RelationshipGraphPersonNode): string {
  return `${node.relation}:${node.displayName.trim().toLocaleLowerCase("zh-TW")}`;
}

function buildGraphQualitySummary(review: ClientRelationshipGraphReview): RelationshipGraphQualitySummary {
  const seen = new Set<string>();
  let duplicateNodeCount = 0;

  for (const node of review.nodes) {
    if (node.nodeKey === "primary") continue;

    const identity = normalizeGraphNodeIdentity(node);
    if (seen.has(identity)) {
      duplicateNodeCount += 1;
    } else {
      seen.add(identity);
    }
  }

  const nodeCount = review.nodes.length;
  const edgeCount = review.edges.length;
  const sizeStatus = nodeCount > RELATIONSHIP_GRAPH_ADVISOR_NODE_LIMIT ? "large" : "compact";
  const warnings: string[] = [];

  if (sizeStatus === "large") {
    warnings.push(`關係人已超過建議 ${RELATIONSHIP_GRAPH_ADVISOR_NODE_LIMIT} 位，建議先用下方清單整理重點。`);
  }

  if (duplicateNodeCount > 0) {
    warnings.push(`偵測到 ${duplicateNodeCount} 個可能重複的關係人名稱與關係，請用下方清單確認。`);
  }

  const screenReaderSummary = [
    `人物關係圖含 ${nodeCount} 個節點與 ${edgeCount} 條關係線。`,
    "每個節點可用 Tab 聚焦，聚焦後可新增父節點或子節點。",
    "下方關係人清單提供同一資料的鍵盤與螢幕閱讀 fallback。",
    `從圖面建立劇場時，角色焦點建議上限為 ${THEATER_FOCUS_ROLE_LIMIT} 位。`,
    ...warnings,
  ].join(" ");

  return {
    duplicateNodeCount,
    edgeCount,
    nodeCount,
    screenReaderSummary,
    sizeStatus,
    warnings,
  };
}

function getReactFlowNodeId(client: Client, node: RelationshipGraphPersonNode): string {
  if (node.nodeKey === "primary") return client.id;

  const memberIndex = getFamilyIndexFromNodeKey(node.nodeKey);
  return memberIndex === null ? node.nodeKey : client.family[memberIndex]?.id ?? node.nodeKey;
}

function getFamilyIndexFromNodeKey(nodeKey: string): number | null {
  const match = /^member-(\d+)$/.exec(nodeKey);
  if (!match) return null;

  const index = Number(match[1]) - 1;
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function getRelationshipEdgeLabel(edge: RelationshipGraphEdge): string {
  if (edge.type === "SPOUSE_OF") return "配偶結合";
  return edge.label;
}

function getRelationshipEdgeStyle(edge: RelationshipGraphEdge) {
  if (edge.type === "SPOUSE_OF") {
    return { stroke: "#F48FB1", strokeWidth: 2, strokeDasharray: "6 4" };
  }

  if (edge.type === "SIBLING_OF") {
    return { stroke: "#71717a", strokeWidth: 1.5, strokeDasharray: "4 4" };
  }

  if (edge.type === "SOCIAL_TIE") {
    return {
      stroke: edge.factStatus === "UNKNOWN" ? "#a1a1aa" : "#64748b",
      strokeWidth: 1.5,
      strokeDasharray: "3 5",
    };
  }

  return { stroke: "#90CAF9", strokeWidth: 2 };
}

function getRelationshipEdgeMarker(edge: RelationshipGraphEdge) {
  if (edge.type === "PARENT_OF" || edge.type === "CHILD_OF") {
    return { type: MarkerType.ArrowClosed, color: "#90CAF9", width: 16, height: 16 };
  }

  return undefined;
}

function getRelationshipEdgeLayoutRole(type: RelationshipGraphEdgeType): RelationshipEdgeData["layoutRole"] {
  if (type === "PARENT_OF" || type === "CHILD_OF") return "hierarchy";
  if (type === "SPOUSE_OF" || type === "SIBLING_OF") return "same-rank";
  return "association";
}

function applySameRankHints(
  nodes: Node<PersonNodeData>[],
  edges: Edge<RelationshipEdgeData>[],
): Node<PersonNodeData>[] {
  const nextNodes = nodes.map((node) => ({ ...node, position: { ...node.position } }));
  const nodeById = new Map(nextNodes.map((node) => [node.id, node]));
  const offsetCountBySource = new Map<string, number>();

  return nextNodes.map((node) => {
    const sameRankEdge = edges.find(
      (edge) => edge.target === node.id && edge.data?.layoutRole === "same-rank",
    );

    if (!sameRankEdge) return node;

    const source = nodeById.get(sameRankEdge.source);
    if (!source) return node;

    const currentOffset = offsetCountBySource.get(source.id) ?? 0;
    const direction = getSameRankDirection(sameRankEdge, currentOffset);
    const distance = getSameRankDistance(sameRankEdge, currentOffset);
    offsetCountBySource.set(source.id, currentOffset + 1);

    return {
      ...node,
      position: {
        x: source.position.x + direction * distance,
        y: source.position.y,
      },
    };
  });
}

function getSameRankDirection(edge: Edge<RelationshipEdgeData>, offsetIndex: number): number {
  if (edge.data?.relationshipType === "SPOUSE_OF") return 1;
  if (edge.data?.relationshipType === "SIBLING_OF") return offsetIndex % 2 === 0 ? -1 : 1;
  return offsetIndex % 2 === 0 ? 1 : -1;
}

function getSameRankDistance(edge: Edge<RelationshipEdgeData>, offsetIndex: number): number {
  const baseDistance =
    edge.data?.relationshipType === "SPOUSE_OF"
      ? 210
      : edge.data?.relationshipType === "SIBLING_OF"
        ? 230
        : 320;
  return baseDistance + Math.floor(offsetIndex / 2) * 160;
}

export function RelationshipMap({ client, graphReview, onAddChild, onAddParent }: RelationshipMapProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(client, graphReview, onAddChild, onAddParent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, graphReview]
  );
  const graphQuality = useMemo(
    () => buildGraphQualitySummary(graphReview ?? buildClientRelationshipGraphReview(client)),
    [client, graphReview]
  );
  const graphSummaryId = React.useId();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(client, graphReview, onAddChild, onAddParent);
    setNodes(n);
    setEdges(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, graphReview]);

  return (
    <div
      aria-describedby={graphSummaryId}
      aria-label="人物關係圖互動區"
      className="relative h-[600px] w-full overflow-hidden rounded-xl border border-hairline bg-zinc-50 shadow-none dark:bg-zinc-950"
      data-relationship-graph-a11y="canvas-with-list-fallback"
      data-relationship-graph-duplicate-count={graphQuality.duplicateNodeCount}
      data-relationship-graph-edge-count={graphQuality.edgeCount}
      data-relationship-graph-node-count={graphQuality.nodeCount}
      data-relationship-graph-size-status={graphQuality.sizeStatus}
      data-theater-focus-limit={THEATER_FOCUS_ROLE_LIMIT}
      role="region"
    >
      <p
        className="sr-only"
        data-relationship-graph-accessibility-summary=""
        id={graphSummaryId}
      >
        {graphQuality.screenReaderSummary}
      </p>
      <ReactFlow
        aria-label="人物關係圖互動畫布"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls
          showInteractive={false}
          aria-label="人物關係圖縮放控制"
          className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute left-4 top-4 z-10 rounded-xl border border-hairline bg-white/90 p-4 shadow-none backdrop-blur-md dark:bg-zinc-900/90">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1565C0]" /> 人物關係圖
        </h3>
        <p className="text-[10px] text-zinc-500 mt-1">點選或聚焦節點可新增父/子節點</p>
        <div className="mt-2 space-y-1">
          {[
            { color: "bg-purple-200", label: "祖父母輩" },
            { color: "bg-orange-200", label: "父母 / 叔伯" },
            { color: "bg-blue-200", label: "主客戶 / 配偶" },
            { color: "bg-green-200", label: "子女 / 姪甥" },
            { color: "bg-yellow-200", label: "孫輩" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
              <span className="text-[9px] text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 rounded-xl border border-hairline bg-white/90 p-3 text-xs text-zinc-500 shadow-none backdrop-blur-md dark:bg-zinc-900/90 dark:text-zinc-400 sm:left-auto sm:max-w-[280px]"
        data-relationship-graph-guardrail-panel=""
      >
        <div className="font-bold text-zinc-900 dark:text-zinc-100">
          圖面 {graphQuality.nodeCount} 人・{graphQuality.edgeCount} 線
        </div>
        <div className="mt-1 text-[11px] leading-5">
          下方清單是鍵盤與螢幕閱讀 fallback；劇場焦點上限 {THEATER_FOCUS_ROLE_LIMIT} 位。
        </div>
        <div className="mt-1 text-[11px] leading-5">
          {graphQuality.warnings.length > 0
            ? graphQuality.warnings.join(" ")
            : `目前在建議上限 ${RELATIONSHIP_GRAPH_ADVISOR_NODE_LIMIT} 位內。`}
        </div>
      </div>
    </div>
  );
}
