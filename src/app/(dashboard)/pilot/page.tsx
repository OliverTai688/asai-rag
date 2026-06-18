import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Compass,
  Flag,
  ShieldCheck,
  Target,
  Users,
  Users2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  demoDevelopmentGaps,
  demoExperienceSteps,
  demoExperienceSummary,
  demoReadinessSignals,
} from "@/domains/demo/seed-fixtures";
import type { DevelopmentGap, ExperienceStatus } from "@/domains/experience/types";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  ExperienceStatus,
  {
    label: string;
    badge: "success" | "warning" | "destructive";
    icon: typeof CheckCircle2;
  }
> = {
  ready: { label: "Ready", badge: "success", icon: CheckCircle2 },
  partial: { label: "Partial", badge: "warning", icon: CircleDashed },
  missing: { label: "Missing", badge: "destructive", icon: AlertCircle },
};

const priorityMeta: Record<DevelopmentGap["priority"], string> = {
  P0: "border-ink bg-ink text-paper",
  P1: "border-hairline bg-muted text-ink",
  P2: "border-hairline bg-card text-muted-foreground",
};

const stepIcons = [Users, Target, ClipboardList, Compass, Flag, Users2];

export default function PilotPage() {
  const nextGap = demoDevelopmentGaps[0];

  return (
    <div className="space-y-6 pb-10">
      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div className="max-w-3xl space-y-3">
          <Badge variant="outline" className="w-fit rounded-full border-hairline text-[11px]">
            {demoExperienceSummary.version}
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">體驗版入口</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              直接跑完一條保險顧問工作流：客戶洞察、訪前準備、SPIN、演練、報告與主管追蹤。
            </p>
          </div>
        </div>

        <Card className="min-w-0 border-hairline bg-card">
          <CardContent className="min-w-0 space-y-4 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Demo readiness</p>
                <p className="font-mono text-3xl font-semibold tabular-nums text-ink">
                  {demoExperienceSummary.readiness}%
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full border border-hairline bg-paper">
                <Compass className="size-4 text-muted-foreground" />
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${demoExperienceSummary.readiness}%` }}
              />
            </div>
            <Link
              href={demoExperienceSummary.primaryRoute}
              className={buttonVariants({
                variant: "mono",
                className: "h-10 max-w-full justify-center gap-2 sm:w-full sm:justify-between",
              })}
            >
              開始主路徑
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {demoReadinessSignals.map((signal) => {
          const StatusIcon = statusMeta[signal.status].icon;

          return (
            <Card key={signal.label} className="border-hairline bg-card">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{signal.label}</p>
                  <StatusIcon className="size-4 text-muted-foreground" />
                </div>
                <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                  {signal.value}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">{signal.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-hairline bg-card">
          <CardContent className="p-0">
            <div className="flex flex-col gap-2 border-b border-hairline p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">可執行體驗路徑</h2>
                <p className="text-sm text-muted-foreground">
                  每一步都能進入對應工作頁，不停在展示說明。
                </p>
              </div>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", className: "h-10 w-fit" })}
              >
                回到總覽
              </Link>
            </div>

            <div className="divide-y divide-hairline">
              {demoExperienceSteps.map((step, index) => {
                const StepIcon = stepIcons[index] ?? Flag;
                const StatusIcon = statusMeta[step.status].icon;

                return (
                  <div
                    key={step.id}
                    className="grid gap-4 p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full border border-hairline bg-paper">
                      <StepIcon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {step.order}
                        </span>
                        <h3 className="font-semibold text-ink">{step.title}</h3>
                        <Badge variant={statusMeta[step.status].badge} className="rounded-full text-[11px]">
                          <StatusIcon className="size-3" />
                          {statusMeta[step.status].label}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-hairline text-[11px]">
                          {step.metric}
                        </Badge>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{step.outcome}</p>
                    </div>
                    <Link
                      href={step.route}
                      className={buttonVariants({
                        variant: index === 1 ? "mono" : "outline",
                        className: "h-10 justify-between lg:w-36",
                      })}
                    >
                      {step.routeLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-6">
          <Card className="border-hairline bg-card">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">下一個開發阻擋</h2>
                  <p className="text-sm text-muted-foreground">依 beta 必要性排序。</p>
                </div>
                <Wrench className="size-4 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                <div className="rounded-md border border-hairline p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", priorityMeta[nextGap.priority])}>
                      {nextGap.priority}
                    </span>
                    <h3 className="font-medium text-ink">{nextGap.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{nextGap.detail}</p>
                  <p className="mt-3 text-sm font-medium text-ink">{nextGap.nextAction}</p>
                </div>
                {demoDevelopmentGaps.slice(1, 4).map((gap) => (
                  <div key={gap.title} className="flex items-start justify-between gap-3 border-t border-hairline pt-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{gap.title}</p>
                      <p className="text-xs text-muted-foreground">{gap.nextAction}</p>
                    </div>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", priorityMeta[gap.priority])}>
                      {gap.priority}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline bg-card">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-ink">體驗邊界</h2>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                目前適合展示流程與價值路徑；正式 beta 前仍需登入、組織隔離、核心資料入庫與 AI 狀態治理。
              </p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
