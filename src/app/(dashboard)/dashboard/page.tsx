"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
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
  const stats = useMemo(() => clientService.getDashboardStats(), []);
  const latestEvents = useMemo(() => eventService.getLatestEvents(8), []);

  if (demoMode === "completed") {
    return (
      <div className="pb-10">
        <Suspense fallback={<div className="rounded-lg border border-[#C7D4DF] bg-white p-5 text-sm font-semibold text-[#546E7A]">載入體驗入口...</div>}>
          <DashboardWelcomeCard />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B8B9A]">
            Command Center
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-[#0A2342] dark:text-white">
            今日指揮中心
          </h1>
          <p className="mt-1 text-sm text-[#546E7A] dark:text-[#90CAF9]">
            早安，{user?.name || "小明"}。先處理最有價值的客戶，再讓 AI 補齊後續節奏。
          </p>
        </div>
        <Badge variant="secondary" className="h-6 gap-1.5 px-2.5 text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1B5E20]" />
          AI 洞察在線
        </Badge>
      </div>

      <Suspense fallback={<div className="rounded-lg border border-[#C7D4DF] bg-white p-5 text-sm font-semibold text-[#546E7A]">載入體驗入口...</div>}>
        <DashboardWelcomeCard />
      </Suspense>

      <ExecutiveBrief />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="本週 SPIN 次數" value={12} unit="次" icon={MessageSquare} trend="+2 從上週" accentColor="#1565C0" />
        <KPICard title="潛在客戶數" value={stats.prospectCount} unit="人" icon={Users} trend="佔總體 40%" accentColor="#1976D2" />
        <KPICard title="今日 Engagement" value={5} unit="次" icon={TrendingUp} trend="報告開啟為主" accentColor="#0A2342" />
        <KPICard title="本月報告產出" value={24} unit="份" icon={FileText} trend="達成率 80%" accentColor="#8B6B10" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <TasksPanel />
          <ActivityTimeline events={latestEvents} />
        </div>

        <div className="space-y-4">
          <DashboardCalendar />
          <AIInsightPanel />
          <QuickActionsPanel />
        </div>
      </div>
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

function ExecutiveBrief() {
  const items = [
    { label: "下一步", value: "14:00 前回訪", icon: Phone },
    { label: "合規提醒", value: "KYC 補 2 項", icon: ShieldCheck },
    { label: "今日節奏", value: "1 場拜訪", icon: CalendarDays },
  ];

  return (
    <Card className="border-[#C7D4DF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAFC_58%,#F1F6FB_100%)]">
      <CardContent className="p-5">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#173762] text-white">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B8B9A]">
                  今日主線
                </p>
                <h2 className="text-lg font-semibold text-[#0A2342]">
                  先完成王大明回訪，再推進陳雅婷報告後續
                </h2>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-[#546E7A]">
              王大明的 SPIN 距今 5 天，保單續約風險仍未處理；陳雅婷報告已重複開啟，適合安排下一次方案確認。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-md border border-[#E2EAF1] bg-white/75 px-3 py-2.5"
              >
                <item.icon className="h-4 w-4 text-[#1565C0]" strokeWidth={1.5} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7B8B9A]">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-[#0A2342]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
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
  accentColor,
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  trend: string;
  accentColor: string;
}) {
  return (
    <div>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E2EAF1] bg-[#FAFCFF]">
              <Icon className="h-4 w-4" style={{ color: accentColor }} strokeWidth={1.5} />
            </div>
            <div className="flex items-center gap-1 rounded-md border border-[#E2EAF1] bg-white px-2 py-1">
              <ArrowUpRight className="h-3 w-3 text-[#1B5E20]" strokeWidth={1.8} />
              <span className="text-[11px] font-medium text-[#5F7080]">{trend}</span>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5F7080]">{title}</p>
            <div className="flex items-end gap-1">
            <p className="text-[34px] font-semibold leading-none tabular-nums text-[#0A2342]">
                {value}
              </p>
              <span className="mb-1 text-sm font-semibold text-[#5F7080]">{unit}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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
      <CardHeader className="border-b border-[#E6EDF3] bg-white px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#8B6B10]" strokeWidth={1.5} />
            <CardTitle className="text-[13px]">AI 顧問摘要</CardTitle>
          </div>
          <Badge variant="gold" className="text-[10px]">今日</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="group flex gap-3 rounded-md border border-transparent p-3 transition-colors hover:border-[#E2EAF1] hover:bg-[#FAFCFF]">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E2EAF1] bg-white">
                <Icon className="h-3.5 w-3.5 text-[#1565C0]" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-semibold text-[#0A2342]">{item.label}</p>
                <p className="text-[12px] leading-5 text-[#546E7A]">{item.text}</p>
              </div>
              <ArrowRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-[#C5D2DE] transition-colors group-hover:text-[#1565C0]" strokeWidth={1.5} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

const quickActions = [
  { label: "開始 SPIN", href: "/spin", icon: MessageSquare },
  { label: "劇場演練", href: "/theater", icon: Zap },
  { label: "新增客戶", href: "/crm", icon: Users },
  { label: "生成報告", href: "/reports", icon: FileText },
];

function QuickActionsPanel() {
  return (
    <Card>
      <CardHeader className="border-b border-[#E6EDF3] bg-white px-5 py-3.5">
        <CardTitle className="text-[13px]">快速行動</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 p-4">
        {quickActions.map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="flex items-center gap-2 rounded-md border border-[#E2EAF1] bg-white px-3 py-3 text-[12px] font-semibold text-[#0A2342] transition-colors hover:border-[#B7C8D8] hover:bg-[#FAFCFF]"
          >
            <action.icon className="h-3.5 w-3.5 text-[#1565C0]" strokeWidth={1.5} />
            {action.label}
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
