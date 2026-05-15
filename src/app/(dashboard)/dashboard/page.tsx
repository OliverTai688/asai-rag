"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Star,
  Zap,
  Phone,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clientService } from "@/domains/client/service";
import { eventService } from "@/domains/event/service";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { TasksPanel } from "@/components/dashboard/tasks-panel";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { useSessionStore } from "@/domains/session/store";
import CountUp from "react-countup";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/* ── Sparkline mock data ── */
const sparkData = {
  spin:        [4,6,5,8,7,9,12],
  prospects:   [3,4,3,5,4,5,4],
  engagement:  [2,3,4,3,5,4,5],
  reports:     [14,16,18,19,20,22,24],
};

export default function DashboardPage() {
  const { user } = useSessionStore();
  const stats = useMemo(() => clientService.getDashboardStats(), []);
  const latestEvents = useMemo(() => eventService.getLatestEvents(8), []);

  return (
    <div className="space-y-7 pb-10">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A2342] dark:text-white">
            早安，{user?.name || "小明"}
          </h1>
          <p className="text-[#546E7A] dark:text-[#90CAF9] text-sm mt-1">
            這是您今天的銷售洞察與建議行動。
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="blue" className="gap-1.5 px-3 py-1 h-auto rounded-full text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-[#C9A227]" strokeWidth={1.5} />
            AI INSIGHT ACTIVE
          </Badge>
        </div>
      </div>

      {/* Dashboard Calendar */}
      <DashboardCalendar />

      {/* KPI Cards — stagger entrance */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.08 } },
          hidden: {},
        }}
      >
        <KPICard
          title="本週 SPIN 次數"
          value={12}
          unit="次"
          icon={MessageSquare}
          trend="+2 從上週"
          trendUp
          sparkData={sparkData.spin}
          accentColor="#1565C0"
          chartColor="#1565C0"
          bgColor="#EBF3FB"
        />
        <KPICard
          title="潛在客戶數"
          value={stats.prospectCount}
          unit="人"
          icon={Users}
          trend="佔總體 40%"
          trendUp
          sparkData={sparkData.prospects}
          accentColor="#1976D2"
          chartColor="#1976D2"
          bgColor="#E3F0FC"
        />
        <KPICard
          title="今日 Engagement"
          value={5}
          unit="次"
          icon={TrendingUp}
          trend="主要為報告開啟"
          trendUp
          sparkData={sparkData.engagement}
          accentColor="#0A2342"
          chartColor="#2196F3"
          bgColor="#D6E8F8"
        />
        <KPICard
          title="本月報告產出"
          value={24}
          unit="份"
          icon={FileText}
          trend="目標達成率 80%"
          trendUp
          sparkData={sparkData.reports}
          accentColor="#B8860B"
          chartColor="#C9A227"
          bgColor="#FDF3D0"
        />
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TasksPanel />
          <ActivityTimeline events={latestEvents} />
        </div>

        {/* Right column — AI Quick Actions */}
        <div className="space-y-4">
          <AIInsightPanel />
          <QuickActionsPanel />
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card with Sparkline ── */
function KPICard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendUp,
  sparkData,
  accentColor,
  chartColor,
  bgColor,
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  trend: string;
  trendUp?: boolean;
  sparkData: number[];
  accentColor: string;
  chartColor: string;
  bgColor: string;
}) {
  const sparkPoints = sparkData.map((v, i) => ({ i, v }));

  return (
    <motion.div
      variants={{
        hidden:  { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] } },
      }}
    >
    <Card className="hover:-translate-y-0.5 transition-transform duration-200 overflow-visible">
      <CardContent className="p-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            <Icon className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.5} />
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F7FAFF] border border-[#EBF3FB]">
            {trendUp && <ArrowUpRight className="w-3 h-3 text-[#1B5E20]" strokeWidth={2} />}
            <span className="text-[10px] font-semibold text-[#546E7A]">{trend}</span>
          </div>
        </div>

        <div className="mb-1">
          <p className="text-[11px] font-semibold text-[#546E7A] uppercase tracking-wide mb-1.5">{title}</p>
          <div className="flex items-end gap-1">
            <p className="text-4xl font-black leading-none tabular-nums" style={{ color: accentColor }}>
              <CountUp end={value} duration={1.4} useEasing delay={0} />
            </p>
            <span className="text-sm font-semibold text-[#546E7A] mb-1">{unit}</span>
          </div>
        </div>
      </CardContent>

      {/* Sparkline */}
      <div className="h-14 px-1 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkPoints} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${chartColor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #CFD8DC',
                borderRadius: 8,
                fontSize: 11,
                padding: '4px 8px',
              }}
              formatter={(v) => [v, title]}
              labelFormatter={() => ''}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={chartColor}
              strokeWidth={1.5}
              fill={`url(#grad-${chartColor.replace('#','')})`}
              dot={false}
              activeDot={{ r: 3, fill: chartColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
    </motion.div>
  );
}

/* ── AI Insight Panel ── */
const insights = [
  {
    id: 1,
    type: "high",
    label: "高優先",
    text: "王大明 上次 SPIN 對話距今已 5 天，建議今日主動回訪。",
    icon: Phone,
    color: "#1565C0",
    bg: "#EBF3FB",
  },
  {
    id: 2,
    type: "gold",
    label: "成交機會",
    text: "陳雅婷 報告開啟率達 3 次，購買意向顯著，可推進成交。",
    icon: Star,
    color: "#B8860B",
    bg: "#FDF3D0",
  },
  {
    id: 3,
    type: "info",
    label: "行動建議",
    text: "本週劇場演練完成率 0%，建議安排 15 分鐘練習提升表現。",
    icon: Zap,
    color: "#1B5E20",
    bg: "#E8F5E9",
  },
];

function AIInsightPanel() {
  return (
    <Card>
      <CardHeader className="border-b border-[#EBF3FB] bg-[#F7FAFF]/50 py-3.5 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C9A227]" strokeWidth={1.5} />
            <CardTitle className="text-[13px]">AI 每日洞察</CardTitle>
          </div>
          <Badge variant="gold" className="text-[9px] rounded-full px-2">智能生成</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex gap-3 p-3 rounded-xl hover:bg-[#F7FAFF] transition-colors group cursor-pointer">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: item.bg }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: item.color }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: item.color }}>
                  {item.label}
                </p>
                <p className="text-[12px] text-[#2C3E50] leading-relaxed">{item.text}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#CFD8DC] group-hover:text-[#1565C0] transition-colors shrink-0 mt-1.5" strokeWidth={1.5} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ── Quick Actions Panel ── */
const quickActions = [
  { label: "開始 SPIN 對話", href: "/spin", color: "#1565C0", bg: "#EBF3FB" },
  { label: "劇場演練", href: "/theater", color: "#B8860B", bg: "#FDF3D0" },
  { label: "新增客戶", href: "/crm", color: "#1B5E20", bg: "#E8F5E9" },
  { label: "生成報告", href: "/reports", color: "#0A2342", bg: "#D6E8F8" },
];

function QuickActionsPanel() {
  return (
    <Card>
      <CardHeader className="border-b border-[#EBF3FB] bg-[#F7FAFF]/50 py-3.5 px-5">
        <CardTitle className="text-[13px]">快速行動</CardTitle>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl transition-all hover:shadow-sm hover:-translate-y-0.5 text-center border border-[#EBF3FB] hover:border-[#90CAF9]/40"
            style={{ backgroundColor: action.bg }}
          >
            <span className="text-[12px] font-semibold leading-tight" style={{ color: action.color }}>
              {action.label}
            </span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
