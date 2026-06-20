"use client";

import { Suspense, type ElementType } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  FileText,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { TasksPanel } from "@/components/dashboard/tasks-panel";
import { DashboardWelcomeCard } from "@/components/demo/dashboard-welcome-card";
import type {
  DashboardActionDto,
  DashboardAgendaItemDto,
  DashboardAiQuotaSummaryDto,
  DashboardInsightDto,
  DashboardKpiDto,
  DashboardPriority,
  DashboardScanDto,
  DashboardTodayMainlineDto,
  MemberDashboardDto,
} from "@/domains/dashboard/types";

interface DashboardPageClientProps {
  initialDashboard: MemberDashboardDto;
  demoMode: string;
}

const kpiIconMap: Record<DashboardKpiDto["id"], ElementType> = {
  readyVisits: MessageSquare,
  activeClients: Users,
  openIssues: TrendingUp,
  sharedReports: FileText,
};

const supportIconMap: Record<DashboardTodayMainlineDto["supportItems"][number]["kind"], ElementType> = {
  time: CalendarDays,
  gap: ShieldCheck,
  signal: Sparkles,
};

const insightIconMap: Record<DashboardPriority, ElementType> = {
  HIGH: Phone,
  MEDIUM: Star,
  LOW: Zap,
};

export function DashboardPageClient({ initialDashboard, demoMode }: DashboardPageClientProps) {
  const isQuickstartEntry = demoMode === "quickstart";

  if (demoMode === "completed") {
    return (
      <div className="pb-10">
        <Suspense fallback={<div className="rounded-lg border border-hairline bg-card p-5 text-sm font-semibold text-muted-foreground">載入體驗入口...</div>}>
          <DashboardWelcomeCard />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader dashboard={initialDashboard} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <TodayMainlineCard today={initialDashboard.today} />
        <TodayContextPanel scans={initialDashboard.scans} />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {initialDashboard.kpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} icon={kpiIconMap[kpi.id]} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <TasksPanel tasks={initialDashboard.tasks} />
          <ActivityTimeline events={initialDashboard.recentActivity} />
        </div>

        <div className="space-y-4">
          <AIInsightPanel insights={initialDashboard.insights} quota={initialDashboard.aiQuota} />
          <DashboardAgendaPanel agenda={initialDashboard.agenda} primaryAction={initialDashboard.today.primaryAction} />
        </div>
      </div>

      {isQuickstartEntry && (
        <Suspense fallback={<div className="rounded-lg border border-hairline bg-card p-5 text-sm font-semibold text-muted-foreground">載入體驗入口...</div>}>
          <DashboardWelcomeCard />
        </Suspense>
      )}
    </div>
  );
}

function PageHeader({ dashboard }: { dashboard: MemberDashboardDto }) {
  return (
    <div className="flex flex-col gap-3 border-b border-hairline pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Decision Center
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground">
          今日決策台
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          早安，{dashboard.viewer.name}。今天只先鎖定一條主線，其餘資訊留在掃描層。
        </p>
      </div>
      <div className="flex w-fit items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
        {dashboard.aiQuota.remaining} 次 AI 額度可用
      </div>
    </div>
  );
}

function TodayMainlineCard({ today }: { today: DashboardTodayMainlineDto }) {
  return (
    <Card className="min-h-[280px] border-hairline bg-card">
      <CardContent className="flex h-full flex-col justify-between gap-6 p-5 md:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-ink text-paper">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {today.label}
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                  {today.title}
                </h2>
              </div>
            </div>
            <Badge variant="outline" className="h-7 bg-card text-[11px]">
              {toPriorityLabel(today.priority)}・今日
            </Badge>
          </div>

          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {today.summary}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-2 sm:grid-cols-3">
            {today.supportItems.map((item) => {
              const Icon = supportIconMap[item.kind];
              return (
                <div
                  key={`${item.label}:${item.value}`}
                  className="flex min-h-16 items-center gap-3 rounded-md border border-hairline bg-paper-2/60 px-3 py-2.5"
                >
                  <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            href={today.primaryAction.href}
            className={buttonVariants({
              variant: "mono",
              size: "lg",
              className: "h-11 w-full rounded-full px-5 text-sm font-semibold lg:w-auto",
            })}
          >
            {today.primaryAction.label}
            <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function TodayContextPanel({ scans }: { scans: DashboardScanDto[] }) {
  return (
    <Card className="min-h-[280px]">
      <CardHeader className="border-b border-hairline bg-card px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[13px]">今日掃描</CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground">次級訊號</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {scans.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className="group flex min-h-14 items-center justify-between gap-3 rounded-md border border-hairline bg-card px-3 py-2.5 transition-colors hover:border-hairline-2 hover:bg-paper-2"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {row.label}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{row.value}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" strokeWidth={1.5} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function KPICard({ kpi, icon: Icon }: { kpi: DashboardKpiDto; icon: ElementType }) {
  return (
    <Link href={kpi.href} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <Card size="sm" className="hover:translate-y-0">
        <CardContent className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{kpi.title}</p>
              <div className="mt-2 flex items-end gap-1">
                <p className="text-[26px] font-semibold leading-none tabular-nums text-foreground">
                  {kpi.value}
                </p>
                <span className="mb-0.5 text-xs font-semibold text-muted-foreground">{kpi.unit}</span>
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
              <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2">
            <span className="truncate text-[11px] font-medium text-muted-foreground">{kpi.detail}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-paper-2 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              <ArrowUpRight className="h-3 w-3" strokeWidth={1.8} />
              {kpi.trend}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AIInsightPanel({
  insights,
  quota,
}: {
  insights: DashboardInsightDto[];
  quota: DashboardAiQuotaSummaryDto;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-hairline bg-card px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <CardTitle className="text-[13px]">AI 顧問摘要</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">{quota.percentUsed}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {insights.map((item) => {
          const Icon = insightIconMap[item.priority];
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group flex gap-3 rounded-md border border-transparent p-3 transition-colors hover:border-hairline hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-hairline bg-card">
                <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-semibold text-foreground">{item.label}</p>
                <p className="text-[12px] leading-5 text-muted-foreground">{item.text}</p>
              </div>
              <ArrowRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" strokeWidth={1.5} />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DashboardAgendaPanel({
  agenda,
  primaryAction,
}: {
  agenda: DashboardAgendaItemDto[];
  primaryAction: DashboardActionDto;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-hairline bg-card px-5 py-3.5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[13px]">
            <CalendarDays className="h-4 w-4 text-primary" strokeWidth={1.5} />
            今日安排
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">{agenda.length} 件</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {agenda.length > 0 ? (
          agenda.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-center gap-3 rounded-md border border-hairline bg-card p-3 transition-colors hover:border-hairline-2 hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="w-16 shrink-0 text-[11px] font-semibold text-muted-foreground tabular-nums">
                {item.timeLabel}
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="truncate text-[13px] font-semibold text-foreground">{item.clientName}</h5>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {item.statusLabel}・{item.title}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary" strokeWidth={1.5} />
            </Link>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-hairline px-4 py-8 text-center">
            <p className="text-[13px] font-semibold text-muted-foreground">今日沒有排程中的準備包</p>
            <Link
              href={primaryAction.href}
              className="mt-3 inline-flex text-[12px] font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {primaryAction.label}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function toPriorityLabel(priority: DashboardPriority): string {
  if (priority === "HIGH") return "高優先";
  if (priority === "MEDIUM") return "中優先";
  return "低優先";
}
