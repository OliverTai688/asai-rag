"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useClientRecord } from "@/components/crm/use-client-record";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { ArrowRight, CalendarPlus, CheckCircle2, ShieldCheck, Target } from "lucide-react";
import {
  CompactMetric,
  RecordSubpageHeader,
} from "../_components/record-subpage-ui";

const GAP_CATEGORIES = [
  {
    name: "身故保障",
    current: 5000000,
    suggested: 12000000,
    desc: "保障家庭十年內之生活與子女教育開銷",
  },
  {
    name: "重大疾病",
    current: 1000000,
    suggested: 3000000,
    desc: "支應高額自費藥物與三至五年之薪資損失",
  },
  {
    name: "意外身障",
    current: 2000000,
    suggested: 8000000,
    desc: "應對不預期之失能照護成本",
  },
  {
    name: "長照保障",
    current: 0,
    suggested: 2000000,
    desc: "老後失能之安養機構費用",
  },
];

export default function GapAnalysisPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { client } = useClientRecord(clientId);

  if (!client) return null;

  const totalCurrent = GAP_CATEGORIES.reduce((sum, item) => sum + item.current, 0);
  const totalSuggested = GAP_CATEGORIES.reduce((sum, item) => sum + item.suggested, 0);
  const totalGap = totalSuggested - totalCurrent;
  const urgentGaps = GAP_CATEGORIES.filter((item) => item.current / item.suggested < 0.6);

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
        <CompactMetric label="總缺口" value={formatCurrency(totalGap)} helper="建議保額減現有保額" />
        <CompactMetric label="完成率" value={`${Math.round((totalCurrent / totalSuggested) * 100)}%`} helper="四類保障加權概況" />
        <CompactMetric label="優先項" value={`${urgentGaps.length} 項`} helper="完成率低於 60%" />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]">
        <Card>
          <CardHeader className="border-b border-hairline pb-4">
            <CardTitle>缺口清單</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {GAP_CATEGORIES.map((category) => {
              const ratio = Math.round((category.current / category.suggested) * 100);
              const gap = category.suggested - category.current;

              return (
                <div key={category.name} className="rounded-md border border-hairline bg-card p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{category.name}</p>
                        <Badge variant={ratio < 60 ? "warning" : "outline"} className="h-5 text-[10px]">
                          完成 {ratio}%
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{category.desc}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      缺口 {formatCurrency(gap)}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>現有 {formatCurrency(category.current)}</span>
                      <span>建議 {formatCurrency(category.suggested)}</span>
                    </div>
                    <Progress value={ratio}>
                      <ProgressTrack className="h-2">
                        <ProgressIndicator className={ratio < 60 ? "bg-primary" : "bg-foreground"} />
                      </ProgressTrack>
                    </Progress>
                  </div>
                </div>
              );
            })}
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
              title="先補重大疾病與意外身障"
              description="用定期型商品降低保費壓力，先處理完成率低於 60% 的風險。"
            />
            <RecommendationItem
              icon={ArrowRight}
              title="把身故保障轉成家庭責任問題"
              description="下一次訪談先確認教育金、房貸與家庭生活費責任期間。"
            />
            <RecommendationItem
              icon={CheckCircle2}
              title="長照保障列為第二階段"
              description="先建立可承受月繳預算，再討論長照與退休現金流。"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
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
