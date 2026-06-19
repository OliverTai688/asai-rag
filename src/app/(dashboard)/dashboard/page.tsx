"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Suspense } from "react";
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
import { clientService } from "@/domains/client/service";
import { eventService } from "@/domains/event/service";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { TasksPanel } from "@/components/dashboard/tasks-panel";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { useSessionStore } from "@/domains/session/store";
import { DashboardWelcomeCard } from "@/components/demo/dashboard-welcome-card";

export default function DashboardPage() {
  const { user } = useSessionStore();
  const demoMode = useDashboardDemoMode();
  const isQuickstartEntry = demoMode === "quickstart";
  const stats = useMemo(() => clientService.getDashboardStats(), []);
  const latestEvents = useMemo(() => eventService.getLatestEvents(8), []);

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
      <PageHeader userName={user?.name || "小明"} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <TodayMainlineCard />
        <TodayContextPanel />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KPICard title="SPIN" value={12} unit="次" icon={MessageSquare} trend="+2" detail="本週對話" />
        <KPICard title="潛客" value={stats.prospectCount} unit="人" icon={Users} trend="40%" detail="需培養" />
        <KPICard title="互動" value={5} unit="次" icon={TrendingUp} trend="今日" detail="報告開啟" />
        <KPICard title="報告" value={24} unit="份" icon={FileText} trend="80%" detail="本月達成" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <TasksPanel />
          <ActivityTimeline events={latestEvents} />
        </div>

        <div className="space-y-4">
          <AIInsightPanel />
          <DashboardCalendar />
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

function useDashboardDemoMode() {
  return useSyncExternalStore(
    subscribeToDashboardLocationChanges,
    getDashboardDemoMode,
    () => ""
  );
}

function getDashboardDemoMode() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("demo") ?? "";
}

function subscribeToDashboardLocationChanges(onStoreChange: () => void) {
  const urlChangeEvent = "asai-url-change";
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(urlChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(urlChangeEvent, onStoreChange);
  };
}

function PageHeader({ userName }: { userName: string }) {
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
          早安，{userName}。今天只先鎖定一條主線，其餘資訊留在掃描層。
        </p>
      </div>
      <div className="flex w-fit items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
        AI 洞察在線
      </div>
    </div>
  );
}

function TodayMainlineCard() {
  const items = [
    { label: "14:00 前", value: "完成王大明回訪", icon: Phone },
    { label: "2 項", value: "KYC 資料待補", icon: ShieldCheck },
    { label: "1 場", value: "下午拜訪需準備", icon: CalendarDays },
  ];

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
                  今日主線
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                  王大明加保拜訪，先補齊家庭保障缺口
                </h2>
              </div>
            </div>
            <Badge variant="outline" className="h-7 bg-card text-[11px]">
              高優先・今日
            </Badge>
          </div>

          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            王大明的 SPIN 距今 5 天，家庭責任與教育金缺口仍未處理。先生成拜訪準備包，再安排 14:00 前回訪。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-2 sm:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex min-h-16 items-center gap-3 rounded-md border border-hairline bg-paper-2/60 px-3 py-2.5"
              >
                <item.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/pre-visit"
            className={buttonVariants({
              variant: "mono",
              size: "lg",
              className: "h-11 w-full rounded-full px-5 text-sm font-semibold lg:w-auto",
            })}
          >
            開始拜訪規劃
            <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function TodayContextPanel() {
  const rows = [
    { label: "次要機會", value: "陳雅婷報告開啟 3 次", href: "/reports" },
    { label: "練習缺口", value: "本週尚未完成劇場演練", href: "/theater" },
    { label: "客戶池", value: "5 位潛客待分級", href: "/crm" },
  ];

  return (
    <Card className="min-h-[280px]">
      <CardHeader className="border-b border-hairline bg-card px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[13px]">今日掃描</CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground">次級訊號</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {rows.map((row) => (
          <a
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
          </a>
        ))}

        <div className="rounded-md border border-dashed border-hairline px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            設計原則
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
            第一屏只保留一個主行動；其餘入口維持可掃描，但不與主線競爭。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function KPICard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  detail,
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  trend: string;
  detail: string;
}) {
  return (
    <Card size="sm" className="hover:translate-y-0">
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
            <div className="mt-2 flex items-end gap-1">
              <p className="text-[26px] font-semibold leading-none tabular-nums text-foreground">
                {value}
              </p>
              <span className="mb-0.5 text-xs font-semibold text-muted-foreground">{unit}</span>
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
            <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2">
          <span className="truncate text-[11px] font-medium text-muted-foreground">{detail}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-paper-2 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
            <ArrowUpRight className="h-3 w-3" strokeWidth={1.8} />
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

const insights = [
  {
    id: 1,
    label: "高優先",
    text: "王大明 上次 SPIN 對話距今已 5 天，建議今日主動回訪。",
    icon: Phone,
  },
  {
    id: 2,
    label: "成交機會",
    text: "陳雅婷 報告開啟率達 3 次，購買意向顯著，可推進成交。",
    icon: Star,
  },
  {
    id: 3,
    label: "行動建議",
    text: "本週劇場演練完成率 0%，建議安排 15 分鐘練習提升表現。",
    icon: Zap,
  },
];

function AIInsightPanel() {
  return (
    <Card>
      <CardHeader className="border-b border-hairline bg-card px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <CardTitle className="text-[13px]">AI 顧問摘要</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">今日</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="group flex gap-3 rounded-md border border-transparent p-3 transition-colors hover:border-hairline hover:bg-paper-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-hairline bg-card">
                <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-semibold text-foreground">{item.label}</p>
                <p className="text-[12px] leading-5 text-muted-foreground">{item.text}</p>
              </div>
              <ArrowRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" strokeWidth={1.5} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
