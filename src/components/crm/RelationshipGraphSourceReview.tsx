"use client";

import { useState } from "react";
import type {
  ClientRelationshipGraphReview,
  RelationshipGraphFactStatus,
  RelationshipGraphPersonNode,
  RelationshipGraphPersonRole,
} from "@/domains/client/relationship-graph";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, CircleHelp, GitBranch, Sparkles, TriangleAlert } from "lucide-react";

interface RelationshipGraphSourceReviewProps {
  graph: ClientRelationshipGraphReview;
}

type TabKey = "people" | "facts" | "questions";

const STATUS_LABELS: Record<RelationshipGraphFactStatus, string> = {
  FACT: "事實",
  INFERENCE: "推論",
  UNKNOWN: "待確認",
};

const ROLE_DOT: Record<RelationshipGraphPersonRole, string> = {
  FOCUS_CLIENT: "bg-ink",
  DECISION_MAKER: "bg-[#1A3A6B]",
  INFLUENCER: "bg-[#5B6B7C]",
  DEPENDENT: "bg-[#7A6A3A]",
  CONTEXT_PERSON: "bg-muted-foreground",
};

export function RelationshipGraphSourceReview({ graph }: RelationshipGraphSourceReviewProps) {
  const [tab, setTab] = useState<TabKey>("people");

  const factItems = [
    ...graph.evidenceBuckets.facts.map((text) => ({ text, status: "FACT" as const })),
    ...graph.evidenceBuckets.inferences.map((text) => ({ text, status: "INFERENCE" as const })),
  ].slice(0, 10);

  const questionItems = [
    ...graph.suggestedQuestions.map((text) => ({ text, status: "UNKNOWN" as const })),
    ...graph.evidenceBuckets.unknowns.map((text) => ({ text, status: "UNKNOWN" as const })),
  ].slice(0, 10);

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "people", label: "人物", count: graph.nodes.length },
    { key: "facts", label: "可進準備包", count: factItems.length },
    { key: "questions", label: "待確認", count: questionItems.length },
  ];

  return (
    <Card>
      <CardHeader className="border-b border-hairline pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" strokeWidth={1.5} />
              關係圖來源審查
            </CardTitle>
            <CardDescription>
              點人物看職位、狀態與關係脈絡的來源品質；準備包與劇場只把事實當事實使用。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="success">事實 {graph.sourceSummary.factFields}</Badge>
            <Badge variant="warning">推論 {graph.sourceSummary.inferenceFields}</Badge>
            <Badge variant="outline">待確認 {graph.sourceSummary.unknownFields}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <ReadinessChip
            label="拜訪準備包"
            status={graph.downstreamReadiness.previsit.status}
            reason={graph.downstreamReadiness.previsit.reason}
          />
          <ReadinessChip
            label="劇場建場"
            status={graph.downstreamReadiness.theater.status}
            reason={graph.downstreamReadiness.theater.reason}
          />
        </div>

        <div
          role="tablist"
          aria-label="關係圖來源檢視"
          className="inline-flex flex-wrap gap-1 rounded-full border border-hairline bg-paper-2 p-1"
        >
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  active
                    ? "bg-ink text-paper shadow-none"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-paper/20 text-paper" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        <div
          key={tab}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
        >
          {tab === "people" ? (
            <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
              {graph.nodes.map((node) => (
                <PersonRow key={node.nodeKey} node={node} />
              ))}
            </div>
          ) : tab === "facts" ? (
            <EvidenceList
              icon="fact"
              items={factItems}
              emptyText="尚無可直接進準備包的事實線索。"
            />
          ) : (
            <EvidenceList
              icon="unknown"
              items={questionItems}
              emptyText="目前沒有待確認問題，關係人資料相對完整。"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PersonRow({ node }: { node: RelationshipGraphPersonNode }) {
  const counts = Object.values(node.fields).reduce(
    (acc, item) => {
      acc[item.factStatus] += 1;
      return acc;
    },
    { FACT: 0, INFERENCE: 0, UNKNOWN: 0 } as Record<RelationshipGraphFactStatus, number>,
  );

  return (
    <Popover>
      <PopoverTrigger
        className="flex w-full items-center gap-3 bg-paper px-4 py-3 text-left transition-colors hover:bg-paper-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2 text-sm font-semibold text-foreground">
          {node.displayName.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{node.displayName}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{node.relation}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", ROLE_DOT[node.role])} aria-hidden="true" />
            {node.roleLabel}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground sm:flex">
          {counts.FACT > 0 ? <span className="text-[#1B5E20]">事實 {counts.FACT}</span> : null}
          {counts.INFERENCE > 0 ? <span className="text-[#7A6A3A]">推論 {counts.INFERENCE}</span> : null}
          {counts.UNKNOWN > 0 ? <span>待確認 {counts.UNKNOWN}</span> : null}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{node.displayName}</p>
            <p className="text-xs text-muted-foreground">{node.relation}</p>
          </div>
          <Badge variant={node.roleFactStatus === "INFERENCE" ? "warning" : "secondary"}>
            {node.roleLabel}
          </Badge>
        </div>
        <div className="px-4 py-2">
          <p className="py-1 text-[11px] leading-relaxed text-muted-foreground">{node.roleRationale}</p>
          <dl className="divide-y divide-hairline">
            {Object.values(node.fields).map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-3 py-2">
                <dt className="w-20 shrink-0 text-[11px] font-medium text-muted-foreground">{item.label}</dt>
                <dd className="min-w-0 flex-1 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="min-w-0 text-sm font-medium text-foreground">{item.value}</span>
                    <FactBadge status={item.factStatus} compact />
                  </div>
                  {item.rationale ? (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.rationale}</p>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReadinessChip({
  label,
  status,
  reason,
}: {
  label: string;
  status: "READY" | "NEEDS_MORE_INFO" | "BLOCKED_SENSITIVE";
  reason: string;
}) {
  const icon =
    status === "READY" ? (
      <CheckCircle2 className="h-4 w-4 text-[#1B5E20]" strokeWidth={1.5} />
    ) : status === "BLOCKED_SENSITIVE" ? (
      <TriangleAlert className="h-4 w-4 text-[#B71C1C]" strokeWidth={1.5} />
    ) : (
      <CircleHelp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
    );

  return (
    <div className="flex items-start gap-2 rounded-lg border border-hairline bg-paper-2 px-3 py-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <Badge
            variant={status === "READY" ? "success" : status === "BLOCKED_SENSITIVE" ? "destructive" : "outline"}
            className="h-5 text-[10px]"
          >
            {status === "READY" ? "可使用" : status === "BLOCKED_SENSITIVE" ? "需 gate" : "需補問"}
          </Badge>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{reason}</p>
      </div>
    </div>
  );
}

function EvidenceList({
  icon,
  items,
  emptyText,
}: {
  icon: "fact" | "unknown";
  items: Array<{ text: string; status: RelationshipGraphFactStatus }>;
  emptyText: string;
}) {
  const Icon = icon === "fact" ? Sparkles : CircleHelp;

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-hairline px-4 py-6 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
      {items.map((item, index) => (
        <div key={`${item.status}-${index}`} className="flex items-start gap-2 bg-paper px-4 py-2.5">
          <FactBadge status={item.status} compact />
          <p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function FactBadge({
  status,
  compact = false,
}: {
  status: RelationshipGraphFactStatus;
  compact?: boolean;
}) {
  return (
    <Badge
      variant={status === "FACT" ? "success" : status === "INFERENCE" ? "warning" : "outline"}
      className={cn(compact && "h-4 px-1.5 text-[10px]")}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
