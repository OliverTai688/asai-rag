"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users2,
  ChevronRight,
  Crown,
  TrendingUp,
  AlertCircle,
  Zap,
  Target,
  PieChart,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisitStore } from "@/domains/visit/store";
import { useClientStore } from "@/domains/client/store";
import { teamService } from "@/domains/team/service";
import { motion } from "motion/react";

const MOCK_TEAM_MEMBERS = [
  {
    id: "me",
    name: "王小明 (您)",
    role: "Agent",
    region: "台北一區",
    avatar: "王",
    color: "bg-[#1A3A6B]",
    status: "online",
    tags: ["SPIN 高手", "連戰連捷"],
    stats: { 
      clients: 28, 
      closedThisMonth: 4, 
      revenue: 284000, 
      spinSessions: 12,
      visitPlans: { total: 15, completed: 8, draft: 7 },
      aiInsightHits: 42
    },
  },
  {
    id: "2",
    name: "李美玲",
    role: "Senior Agent",
    region: "台北二區",
    avatar: "李",
    color: "bg-orange-500",
    status: "online",
    tags: ["Top Performer", "儲蓄險王"],
    stats: { 
      clients: 42, 
      closedThisMonth: 7, 
      revenue: 512000, 
      spinSessions: 21,
      visitPlans: { total: 24, completed: 18, draft: 6 },
      aiInsightHits: 68
    },
  },
  {
    id: "3",
    name: "張大壯",
    role: "Manager",
    region: "全台",
    avatar: "張",
    color: "bg-emerald-500",
    status: "away",
    tags: ["管理職"],
    stats: { 
      clients: 15, 
      closedThisMonth: 2, 
      revenue: 198000, 
      spinSessions: 8,
      visitPlans: { total: 10, completed: 5, draft: 5 },
      aiInsightHits: 24
    },
  },
  {
    id: "4",
    name: "陳雅婷",
    role: "Agent",
    region: "新北區",
    avatar: "陳",
    color: "bg-pink-500",
    status: "online",
    tags: ["新人之星"],
    stats: { 
      clients: 19, 
      closedThisMonth: 3, 
      revenue: 167000, 
      spinSessions: 9,
      visitPlans: { total: 12, completed: 4, draft: 8 },
      aiInsightHits: 31
    },
  },
];

export default function TeamPage() {
  const { plans } = useVisitStore();
  const { clients } = useClientStore();

  const aggregatedStats = useMemo(() => 
    teamService.aggregateStats(plans, clients), 
  [plans, clients]);

  const sortedMembers = useMemo(() => 
    [...MOCK_TEAM_MEMBERS].sort((a, b) => b.stats.revenue - a.stats.revenue),
  []);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            團隊指揮中心
          </motion.h1>
          <p className="text-zinc-500 font-medium">聚合團隊訪前規劃與客戶洞察，掌握每一份成交機會。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-2xl border-zinc-200">
            導出月報表
          </Button>
          <Button className="rounded-2xl bg-[#1A3A6B] hover:bg-[#1565C0] shadow-lg shadow-[#1565C0]/20">
            <Users2 className="w-4 h-4 mr-2" /> 邀請成員
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "進行中規劃", value: aggregatedStats.totalActivePlans, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "已完成拜訪", value: aggregatedStats.totalCompletedVisits, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "AI 風險預警", value: aggregatedStats.totalRiskPoints, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "潛在成交機會", value: aggregatedStats.totalOpportunities, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", kpi.bg)}>
                    <kpi.icon className={cn("w-6 h-6", kpi.color)} />
                  </div>
                  <Badge variant="secondary" className="bg-zinc-50 text-zinc-400 border-none text-[10px] font-bold">
                    THIS MONTH
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{kpi.label}</p>
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-black">{kpi.value}</p>
                    <span className="text-xs font-bold text-emerald-500 mb-1.5 flex items-center">
                      <ArrowUpRight className="w-3 h-3" /> +12%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Team Insights & Heatmap */}
        <div className="lg:col-span-2 space-y-8">
          {/* Team Client Needs Heatmap */}
          <Card className="rounded-[2.5rem] border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#1A3A6B]" /> 團隊客群需求熱點
                </CardTitle>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Aggregated from AI Insights</p>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {aggregatedStats.clientHeatmap.map((item, i) => (
                  <div 
                    key={item.tag}
                    className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-50 border border-zinc-100 hover:border-[#1A3A6B]/20 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-[#1A3A6B]">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{item.tag}</p>
                      <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / Math.max(clients.length, 1)) * 100}%` }}
                          className="bg-[#1A3A6B] h-full rounded-full"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-[#1A3A6B]">{item.count}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Clients</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Member List */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold px-2">成員表現追蹤</h3>
            {MOCK_TEAM_MEMBERS.map((member) => (
              <Card
                key={member.id}
                className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden group bg-white"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    {/* Member Info */}
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <div className="relative">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg", member.color)}>
                          {member.avatar}
                        </div>
                        <span className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                          member.status === "online" ? "bg-green-400" : "bg-zinc-300"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{member.name}</p>
                          <Badge variant="outline" className="text-[9px] py-0 h-4 border-zinc-200 font-bold text-zinc-400 uppercase">
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium">{member.region}</p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
                      <div className="text-center sm:text-left">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">訪前規劃</p>
                        <p className="text-lg font-black text-zinc-800">
                          {member.stats.visitPlans.completed} <span className="text-zinc-300 text-sm font-bold">/ {member.stats.visitPlans.total}</span>
                        </p>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">AI 洞察</p>
                        <p className="text-lg font-black text-[#1A3A6B]">{member.stats.aiInsightHits}</p>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">SPIN 對話</p>
                        <p className="text-lg font-black text-zinc-800">{member.stats.spinSessions}</p>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">本月營收</p>
                        <p className="text-lg font-black text-emerald-600">${(member.stats.revenue / 1000).toFixed(0)}k</p>
                      </div>
                    </div>

                    {/* Action */}
                    <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-zinc-50 shrink-0">
                      <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-[#1A3A6B] transition-colors" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Leaderboard & Performance */}
        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-md overflow-hidden bg-white">
            <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <h3 className="font-black text-sm uppercase tracking-[0.2em] text-zinc-400">本月戰神榜</h3>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <CardContent className="p-6 space-y-3">
              {sortedMembers.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-[2rem] transition-all",
                    i === 0 ? "bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 shadow-sm" : "hover:bg-zinc-50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm",
                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                    i === 1 ? "bg-zinc-200 text-zinc-600" :
                    i === 2 ? "bg-orange-200 text-orange-800" :
                    "bg-zinc-100 text-zinc-400"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{member.name}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">
                      {member.stats.closedThisMonth} 件成交 • {member.stats.spinSessions} SPIN
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#1A3A6B] leading-none">
                      ${(member.stats.revenue / 1000).toFixed(0)}k
                    </p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
            <div className="p-6 bg-zinc-50 text-center">
              <Button variant="link" className="text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-[#1A3A6B]">
                查看完整排名
              </Button>
            </div>
          </Card>

          {/* AI Productivity Card */}
          <Card className="rounded-[2.5rem] border-none shadow-md bg-[#1A3A6B] text-white overflow-hidden p-8 relative">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400 fill-current" />
                <h3 className="font-bold text-lg">AI 增效統計</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold opacity-70 uppercase tracking-wider">
                    <span>訪前規劃覆蓋率</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} className="bg-yellow-400 h-full rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold opacity-70 uppercase tracking-wider">
                    <span>客戶 AI 洞察率</span>
                    <span>92%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: "92%" }} className="bg-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-medium opacity-50 italic">
                * 基於團隊過去 30 天的活動數據與 AI 生成紀錄
              </p>
            </div>
            <Activity className="absolute -bottom-8 -right-8 w-32 h-32 text-white/5 rotate-12" />
          </Card>
        </div>
      </div>
    </div>
  );
}
