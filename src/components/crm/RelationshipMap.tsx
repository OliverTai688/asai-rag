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
  type RelationshipGraphEdge,
  type RelationshipGraphEdgeType,
  type RelationshipGraphFactStatus,
  type RelationshipGraphPersonNode,
} from "@/domains/client/relationship-graph";
import { Client, RELATION_GENERATION } from "@/domains/client/types";
import { Users, User, Heart, Baby, Star, Crown, Smile, UserPlus } from "lucide-react";
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

function getGenerationStyle(generation: number) {
  const clamped = Math.max(-2, Math.min(2, generation));
  return GENERATION_STYLE[clamped] ?? GENERATION_STYLE["0"];
}

function getNodeIcon(relation: string, isRoot: boolean, iconClass: string) {
  if (isRoot) return <Star className={cn("w-5 h-5", "text-[#1565C0]")} />;
  if (relation === "配偶") return <Heart className={cn("w-5 h-5", "text-rose-500")} />;
  const gen = RELATION_GENERATION[relation] ?? 0;
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
  onAddChild?: (memberId: string) => void;
  onAddParent?: (memberId: string) => void;
  memberId: string;
};

type RelationshipEdgeData = {
  relationshipType: RelationshipGraphEdgeType;
  factStatus: RelationshipGraphFactStatus;
  layoutRole: "hierarchy" | "same-rank" | "association";
};

const PersonNode = ({
  data,
  selected,
}: {
  data: PersonNodeData;
  selected: boolean;
}) => {
  const style = data.isRoot
    ? { bg: "bg-[#EBF3FB] dark:bg-blue-950/40", border: "border-[#90CAF9]/40", icon: "text-[#1565C0]" }
    : getGenerationStyle(data.generation);

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-2xl border-2 transition-all shadow-sm flex items-center gap-3 min-w-[140px]",
        style.bg,
        style.border,
        selected && "border-[#1565C0] ring-2 ring-[#1565C0]/20"
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          data.isRoot ? "bg-white" : "bg-white/60 dark:bg-zinc-800/60"
        )}
      >
        {getNodeIcon(data.relation, !!data.isRoot, style.icon)}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-tight">{data.relation}</p>
        <p className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100">{data.label}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />

      {(data.onAddChild || data.onAddParent) && (
        <NodeToolbar isVisible={selected} position={Position.Bottom} className="flex gap-2">
          {data.onAddParent && (
            <button
              onClick={() => data.onAddParent!(data.memberId)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 text-white text-xs font-bold shadow-lg hover:bg-zinc-700 transition-colors"
            >
              <UserPlus className="w-3 h-3" /> 新增父節點
            </button>
          )}
          {data.onAddChild && (
            <button
              onClick={() => data.onAddChild!(data.memberId)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1A3A6B] text-white text-xs font-bold shadow-lg hover:bg-[#1565C0] transition-colors"
            >
              <UserPlus className="w-3 h-3" /> 新增子節點
            </button>
          )}
        </NodeToolbar>
      )}
    </div>
  );
};

const nodeTypes = { person: PersonNode };

interface RelationshipMapProps {
  client: Client;
  onAddChild?: (parentMemberId: string | null) => void;
  onAddParent?: (childMemberId: string | null) => void;
}

function buildGraph(
  client: Client,
  onAddChild?: (id: string | null) => void,
  onAddParent?: (id: string | null) => void
) {
  const review = buildClientRelationshipGraphReview(client);
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
    const direction = currentOffset % 2 === 0 ? 1 : -1;
    const distance = 220 + Math.floor(currentOffset / 2) * 180;
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

export function RelationshipMap({ client, onAddChild, onAddParent }: RelationshipMapProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(client, onAddChild, onAddParent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(client, onAddChild, onAddParent);
    setNodes(n);
    setEdges(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  return (
    <div className="w-full h-[600px] bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative shadow-inner">
      <ReactFlow
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
          className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute top-4 left-4 p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white dark:border-zinc-800 shadow-lg z-10">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1565C0]" /> 人物關係圖
        </h3>
        <p className="text-[10px] text-zinc-500 mt-1">點選節點可新增子節點</p>
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
    </div>
  );
}
