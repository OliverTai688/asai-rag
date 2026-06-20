"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useClientRelatedLists } from "@/components/crm/use-client-related-lists";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import type { ClientGapAnalysisRelatedListItem, RelatedListPriority } from "@/domains/client/related-lists";
import { formatCurrency } from "@/lib/format";
import {
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  CompactMetric,
  EmptyRelatedState,
  RecordSubpageHeader,
} from "../_components/record-subpage-ui";

export default function GapAnalysisPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { data, isLoading, error } = useClientRelatedLists(clientId);

  if (!data && isLoading) {
    return (
      <EmptyRelatedState
        icon={Loader2}
        title="載入保障缺口 related-list"
        description="正在依保單、家庭、年收入與合規缺項推導缺口。"
      />
    );
  }

  if (!data && error) {
    return (
      <EmptyRelatedState
        icon={AlertTriangle}
        title="保障缺口暫時無法讀取"
        description="請稍後重試；目前先不顯示未連到客戶資料的預設缺口。"
      />
    );
  }

  const gapAnalysis = data?.lists.gapAnalysis;
  const summary = gapAnalysis?.summary;
  const gaps = gapAnalysis?.items ?? [];
  const topGap = gaps.find((item) => item.priority === "HIGH") ?? gaps[0];

  return (
    <div className="space-y-5">
      <RecordSubpageHeader
        eyebrow="Recommendation view"
        title="保障缺口分析"
        description="把缺口視覺化收斂成可排序的建議清單，讓下一次訪談能聚焦在最需要補足的保障。"
        action={
          <Link
            href={`/pre-visit?clientId=${clientId}&autoCreate=true`}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
          >
            <CalendarPlus className="h-4 w-4" strokeWidth={1.5} />
            轉成拜訪規劃
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric label="總缺口" value={formatCurrency(summary?.totalGap ?? 0)} helper="建議保額減現有保額" />
        <CompactMetric label="完成率" value={`${summary?.completionRate ?? 0}%`} helper="四類保障加權概況" />
        <CompactMetric label="優先項" value={`${summary?.urgentCount ?? 0} 項`} helper="完成率低於 50%" />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]">
        <Card>
          <CardHeader className="border-b border-hairline pb-4">
            <CardTitle>缺口清單</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gaps.map((category) => (
              <GapCategoryCard key={category.id} category={category} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-hairline pb-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" strokeWidth={1.5} />
              建議行動
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RecommendationItem
              icon={ShieldCheck}
              title={topGap ? `先釐清 ${topGap.category}` : "先補齊保障資料"}
              description={topGap ? topGap.rationale : "目前缺少可推導的保單與家庭資料，下一次拜訪先確認現有保障。"}
            />
            <RecommendationItem
              icon={ArrowRight}
              title="把缺口轉成訪談問題"
              description="下一次訪談先確認家庭責任、共同決策人與可接受預算，再討論方案。"
            />
            <RecommendationItem
              icon={CheckCircle2}
              title="把未知留在準備包"
              description={`${summary?.unknownCount ?? 0} 個項目含 unknown evidence，應進準備包問題清單，不可當成已確認事實。`}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function GapCategoryCard({ category }: { category: ClientGapAnalysisRelatedListItem }) {
  const priorityMeta = getPriorityMeta(category.priority);

  return (
    <div className="rounded-md border border-hairline bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{category.category}</p>
            <Badge variant={priorityMeta.variant} className="h-5 text-[10px]">
              {priorityMeta.label}・完成 {category.completionRate}%
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{category.rationale}</p>
        </div>
        <p className="text-sm font-semibold text-foreground tabular-nums">
          缺口 {formatCurrency(category.gap)}
        </p>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>現有 {formatCurrency(category.currentCoverage)}</span>
          <span>建議 {formatCurrency(category.suggestedCoverage)}</span>
        </div>
        <Progress value={category.completionRate}>
          <ProgressTrack className="h-2">
            <ProgressIndicator className={category.priority === "HIGH" ? "bg-primary" : "bg-foreground"} />
          </ProgressTrack>
        </Progress>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {category.evidence.slice(0, 3).map((evidence) => (
          <Badge
            key={evidence.id}
            variant={evidence.factStatus === "UNKNOWN" ? "warning" : "outline"}
            className="h-6 text-[11px]"
          >
            {evidence.factStatus === "FACT" ? "事實" : evidence.factStatus === "INFERENCE" ? "推論" : "未知"}・{evidence.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function getPriorityMeta(priority: RelatedListPriority): {
  label: string;
  variant: "warning" | "outline" | "secondary";
} {
  if (priority === "HIGH") return { label: "高優先", variant: "warning" };
  if (priority === "MEDIUM") return { label: "待確認", variant: "secondary" };
  return { label: "觀察", variant: "outline" };
}

function RecommendationItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-hairline bg-card p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
