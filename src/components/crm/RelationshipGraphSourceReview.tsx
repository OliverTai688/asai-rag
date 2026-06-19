"use client";

import type {
  ClientRelationshipGraphReview,
  RelationshipGraphFactStatus,
  RelationshipGraphPersonRole,
} from "@/domains/client/relationship-graph";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleHelp, GitBranch, Sparkles, TriangleAlert } from "lucide-react";

interface RelationshipGraphSourceReviewProps {
  graph: ClientRelationshipGraphReview;
}

const STATUS_LABELS: Record<RelationshipGraphFactStatus, string> = {
  FACT: "事實",
  INFERENCE: "推論",
  UNKNOWN: "待確認",
};

const ROLE_ACCENT: Record<RelationshipGraphPersonRole, string> = {
  FOCUS_CLIENT: "border-l-ink",
  DECISION_MAKER: "border-l-[#1A3A6B]",
  INFLUENCER: "border-l-[#5B6B7C]",
  DEPENDENT: "border-l-[#7A6A3A]",
  CONTEXT_PERSON: "border-l-muted-foreground",
};

export function RelationshipGraphSourceReview({ graph }: RelationshipGraphSourceReviewProps) {
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
              每個人物都標出職位、年收入、狀態與關係脈絡的來源品質，準備包與劇場只把事實當事實使用。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">節點 {graph.sourceSummary.nodeCount}</Badge>
            <Badge variant="success">事實 {graph.sourceSummary.factFields}</Badge>
            <Badge variant="warning">推論 {graph.sourceSummary.inferenceFields}</Badge>
            <Badge variant="outline">待確認 {graph.sourceSummary.unknownFields}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <DownstreamReadiness
            label="拜訪準備包"
            status={graph.downstreamReadiness.previsit.status}
            reason={graph.downstreamReadiness.previsit.reason}
          />
          <DownstreamReadiness
            label="劇場建場"
            status={graph.downstreamReadiness.theater.status}
            reason={graph.downstreamReadiness.theater.reason}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {graph.nodes.map((node) => (
            <div
              key={node.nodeKey}
              className={cn(
                "rounded-lg border border-hairline border-l-2 bg-paper px-4 py-3",
                ROLE_ACCENT[node.role],
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{node.displayName}</p>
                  <p className="text-xs text-muted-foreground">{node.relation}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Badge variant={node.roleFactStatus === "INFERENCE" ? "warning" : "secondary"}>
                    {node.roleLabel}
                  </Badge>
                  <FactBadge status={node.roleFactStatus} />
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{node.roleRationale}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.values(node.fields).map((item) => (
                  <div key={item.label} className="rounded-md border border-hairline bg-paper-2 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
                      <FactBadge status={item.factStatus} compact />
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                    {item.rationale ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.rationale}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <EvidenceColumn
            title="可進準備包的來源"
            icon="fact"
            items={[
              ...graph.evidenceBuckets.facts.map((item) => ({ text: item, status: "FACT" as const })),
              ...graph.evidenceBuckets.inferences.map((item) => ({ text: item, status: "INFERENCE" as const })),
            ].slice(0, 8)}
          />
          <EvidenceColumn
            title="待確認問題"
            icon="unknown"
            items={[
              ...graph.suggestedQuestions.map((item) => ({ text: item, status: "UNKNOWN" as const })),
              ...graph.evidenceBuckets.unknowns.map((item) => ({ text: item, status: "UNKNOWN" as const })),
            ].slice(0, 8)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DownstreamReadiness({
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
    <div className="rounded-lg border border-hairline bg-paper-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-semibold text-foreground">{label}</p>
        </div>
        <Badge variant={status === "READY" ? "success" : status === "BLOCKED_SENSITIVE" ? "destructive" : "outline"}>
          {status === "READY" ? "可使用" : status === "BLOCKED_SENSITIVE" ? "需 gate" : "需補問"}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{reason}</p>
    </div>
  );
}

function EvidenceColumn({
  title,
  icon,
  items,
}: {
  title: string;
  icon: "fact" | "unknown";
  items: Array<{ text: string; status: RelationshipGraphFactStatus }>;
}) {
  const Icon = icon === "fact" ? Sparkles : CircleHelp;

  return (
    <div className="rounded-lg border border-hairline bg-paper px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.status}-${index}`} className="flex gap-2 rounded-md bg-paper-2 px-3 py-2">
            <FactBadge status={item.status} compact />
            <p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
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
