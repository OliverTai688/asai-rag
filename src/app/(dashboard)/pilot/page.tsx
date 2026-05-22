import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Compass,
  ExternalLink,
  FileText,
  Flag,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Users2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import {
  benchmarkSites,
  developmentGaps,
  experienceSteps,
  experienceSummary,
  readinessSignals,
} from "@/domains/experience/mocks";
import type { DevelopmentGap, ExperienceStatus } from "@/domains/experience/types";
import { cn } from "@/lib/utils";

const statusStyle: Record<ExperienceStatus, {
  label: string;
  badge: "success" | "warning" | "destructive";
  icon: typeof CheckCircle2;
  text: string;
}> = {
  ready: {
    label: "Ready",
    badge: "success",
    icon: CheckCircle2,
    text: "text-[#1B5E20]",
  },
  partial: {
    label: "Partial",
    badge: "warning",
    icon: CircleDashed,
    text: "text-[#E65100]",
  },
  missing: {
    label: "Missing",
    badge: "destructive",
    icon: AlertTriangle,
    text: "text-[#B71C1C]",
  },
};

const stepIcons = [Users, Target, MessageSquare, Activity, FileText, Users2];

const priorityStyle: Record<DevelopmentGap["priority"], string> = {
  P0: "bg-[#FFEBEE] text-[#B71C1C] border-[#FFCDD2]",
  P1: "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]",
  P2: "bg-[#EBF3FB] text-[#1565C0] border-[#90CAF9]",
};

export default function PilotPage() {
  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-xl border border-[#CFD8DC] bg-white p-6 shadow-sm dark:border-[rgba(144,202,249,0.15)] dark:bg-[#0F2744]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="blue" className="h-auto rounded-full px-3 py-1 text-[11px] font-semibold">
                <Compass className="h-3.5 w-3.5" />
                體驗版中樞
              </Badge>
              <Badge variant="gold" className="h-auto rounded-full px-3 py-1 text-[11px] font-semibold">
                {experienceSummary.version}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0A2342] dark:text-white">
              把保險拜訪做成可準備、可演練、可追蹤的閉環
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#546E7A] dark:text-[#90CAF9]">
              {experienceSummary.promise}
            </p>
          </div>

          <div className="grid min-w-[260px] grid-cols-[96px_1fr] items-center gap-4 rounded-lg border border-[#EBF3FB] bg-[#F7FAFF] p-4 dark:border-[rgba(144,202,249,0.12)] dark:bg-[#1A3A6B]/20">
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-[#0A1929]">
              <div className="text-center">
                <div className="text-3xl font-black text-[#1565C0]">{experienceSummary.readiness}%</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#546E7A]">Ready</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-[#D6E8F8]">
                <div
                  className="h-full rounded-full bg-[#1565C0]"
                  style={{ width: `${experienceSummary.readiness}%` }}
                />
              </div>
              <Link
                href={experienceSummary.primaryRoute}
                className={buttonVariants({ className: "w-full justify-between" })}
              >
                開始主路徑
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <QuickstartGuide currentStepId="overview" />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {readinessSignals.map((signal) => {
          const StatusIcon = statusStyle[signal.status].icon;
          return (
            <Card key={signal.label} className="rounded-lg">
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#546E7A]">
                      {signal.label}
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#0A2342] dark:text-white">
                      {signal.value}
                    </p>
                  </div>
                  <StatusIcon className={cn("h-5 w-5", statusStyle[signal.status].text)} />
                </div>
                <p className="text-xs leading-5 text-[#546E7A] dark:text-[#90CAF9]">
                  {signal.detail}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0A2342] dark:text-white">六步體驗路徑</h2>
            <p className="text-sm text-[#546E7A] dark:text-[#90CAF9]">
              從客戶洞察開始，最後回到追蹤與主管輔導。
            </p>
          </div>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", className: "w-fit" })}
          >
            <BarChart3 className="h-4 w-4" />
            回到總覽
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {experienceSteps.map((step, index) => {
            const StepIcon = stepIcons[index] ?? Flag;
            const StatusIcon = statusStyle[step.status].icon;
            return (
              <Card key={step.id} className="rounded-lg">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#EBF3FB] text-[#1565C0] dark:bg-[#1A3A6B]/40 dark:text-[#90CAF9]">
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#C9A227]">
                          {step.order}
                        </span>
                        <Badge variant={statusStyle[step.status].badge} className="h-5 text-[10px]">
                          <StatusIcon className="h-3 w-3" />
                          {statusStyle[step.status].label}
                        </Badge>
                        <Badge variant="ghost" className="h-5 text-[10px]">
                          {step.metric}
                        </Badge>
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-[#0A2342] dark:text-white">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#546E7A] dark:text-[#90CAF9]">
                        {step.description}
                      </p>
                      <p className="mt-3 rounded-lg border border-[#EBF3FB] bg-[#F7FAFF] px-3 py-2 text-xs font-medium text-[#0A2342] dark:border-[rgba(144,202,249,0.12)] dark:bg-[#1A3A6B]/20 dark:text-[#E8F0FE]">
                        {step.outcome}
                      </p>
                      <Link
                        href={step.route}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "mt-4",
                        })}
                      >
                        {step.routeLabel}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-[#C9A227]" />
              Top 3 標竿定位
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {benchmarkSites.map((site) => (
              <div
                key={site.name}
                className="rounded-lg border border-[#EBF3FB] bg-[#F7FAFF] p-4 dark:border-[rgba(144,202,249,0.12)] dark:bg-[#1A3A6B]/20"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-[#0A2342] dark:text-white">{site.name}</h3>
                    <p className="mt-1 text-xs font-medium text-[#546E7A] dark:text-[#90CAF9]">
                      {site.position}
                    </p>
                  </div>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit" })}
                  >
                    來源
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {site.capabilities.map((capability) => (
                    <Badge key={capability} variant="secondary" className="h-6 rounded-full">
                      {capability}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#0A2342] dark:text-[#E8F0FE]">
                  {site.implication}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-[#1565C0]" />
              待開發缺口
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {developmentGaps.map((gap) => {
              const StatusIcon = statusStyle[gap.status].icon;
              return (
                <div key={gap.title} className="rounded-lg border border-[#EBF3FB] p-4 dark:border-[rgba(144,202,249,0.12)]">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black", priorityStyle[gap.priority])}>
                        {gap.priority}
                      </span>
                      <h3 className="font-bold text-[#0A2342] dark:text-white">{gap.title}</h3>
                    </div>
                    <StatusIcon className={cn("h-4 w-4 shrink-0", statusStyle[gap.status].text)} />
                  </div>
                  <p className="text-xs leading-5 text-[#546E7A] dark:text-[#90CAF9]">
                    {gap.detail}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#0A2342] dark:text-[#E8F0FE]">
                    {gap.nextAction}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-lg">
          <CardContent className="p-5">
            <ShieldCheck className="mb-4 h-6 w-6 text-[#1B5E20]" />
            <h3 className="font-bold text-[#0A2342] dark:text-white">合規邊界</h3>
            <p className="mt-2 text-sm leading-6 text-[#546E7A] dark:text-[#90CAF9]">
              體驗版可展示 KYC / 適合度設計方向，但正式 beta 前需補資料權限、稽核軌跡與免責聲明。
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-5">
            <Compass className="mb-4 h-6 w-6 text-[#1565C0]" />
            <h3 className="font-bold text-[#0A2342] dark:text-white">下一個開發點</h3>
            <p className="mt-2 text-sm leading-6 text-[#546E7A] dark:text-[#90CAF9]">
              建立固定 demo scenario state，讓同一位客戶在 CRM、訪前規劃、SPIN、報告與追蹤間資料一致。
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-5">
            <Flag className="mb-4 h-6 w-6 text-[#C9A227]" />
            <h3 className="font-bold text-[#0A2342] dark:text-white">文件來源</h3>
            <p className="mt-2 text-sm leading-6 text-[#546E7A] dark:text-[#90CAF9]">
              詳細研究與工程拆解已整理在 `docs/audit-report.md` 與 `docs/dev-report.md`。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
