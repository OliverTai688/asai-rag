"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  Sparkles, 
  Zap, 
  Bot 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clientService } from "@/domains/client/service";
import { eventService } from "@/domains/event/service";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { EngagementHeatList } from "@/components/dashboard/engagement-heat-list";
import { TasksPanel } from "@/components/dashboard/tasks-panel";
import { useSessionStore } from "@/domains/session/store";

export default function DashboardPage() {
  const { user } = useSessionStore();
  const stats = useMemo(() => clientService.getDashboardStats(), []);
  const latestEvents = useMemo(() => eventService.getLatestEvents(8), []);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">早安，{user?.name || "小明"}</h1>
          <p className="text-zinc-500 font-medium">這是您今天的銷售洞察與建議行動。</p>
        </div>
        <div className="flex items-center gap-2">
           <Badge className="bg-indigo-600 text-white border-none py-1 px-4 rounded-full font-bold animate-pulse">
             AI INSIGHT ACTIVE
           </Badge>
        </div>
      </div>

      {/* AI Recommendation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-1000">
         <Card className="lg:col-span-2 rounded-[32px] border-none bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
               <Sparkles className="w-40 h-40" />
            </div>
            <CardContent className="p-8 relative z-10">
               <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-white/10 rounded-xl">
                     <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-black text-xs uppercase tracking-widest opacity-70">優先建議行動</span>
               </div>
               <h3 className="text-2xl font-black mb-4 leading-tight">
                  客戶「林大為」的報告已被開啟 3 次，<br />
                  建議立即進行主動聯繫，敲定簽約時間。
               </h3>
               <div className="flex gap-3">
                  <Button size="lg" className="bg-white text-indigo-600 hover:bg-zinc-100 rounded-2xl font-black px-8">
                     立即撥號
                  </Button>
                  <Button variant="ghost" className="text-white hover:bg-white/10 rounded-2xl font-bold">
                     查看報告參與度
                  </Button>
               </div>
            </CardContent>
         </Card>
         <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 p-8 space-y-4 shadow-sm bg-white dark:bg-zinc-900 border-2 border-dashed border-indigo-100 dark:border-indigo-900/20 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
               <Bot className="w-5 h-5 text-indigo-600" />
               <span className="font-bold text-sm">智能風險提示</span>
            </div>
            <div className="space-y-4">
               <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                  <p className="text-xs font-bold text-red-600 mb-1">跟進逾期 (2人)</p>
                  <p className="text-[11px] text-zinc-500 font-medium">張美英、李國華 已超過 7 天未聯繫。</p>
               </div>
               <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                  <p className="text-xs font-bold text-orange-600 mb-1">SPIN 缺口 (5人)</p>
                  <p className="text-[11px] text-zinc-500 font-medium">有 5 位高價值客戶尚未完成風險缺口定義。</p>
               </div>
            </div>
         </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI 
          className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20" 
          title="本週 SPIN 次數" 
          value="12" 
          icon={MessageSquare} 
          trend="+2 從上週" 
          iconColor="text-indigo-600"
        />
        <KPI 
          className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20" 
          title="潛在客戶數" 
          value={stats.prospectCount.toString()} 
          icon={Users} 
          trend="佔總體 40%" 
          iconColor="text-orange-600"
        />
        <KPI 
          className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20" 
          title="今日 engagement" 
          value="5" 
          icon={TrendingUp} 
          trend="主要為報告開啟" 
          iconColor="text-blue-600"
        />
        <KPI 
          className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20" 
          title="本月報告產出" 
          value="24" 
          icon={FileText} 
          trend="目標達成率 80%" 
          iconColor="text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Today Tasks */}
          <TasksPanel />
          
          {/* Recent Activities */}
          <ActivityTimeline events={latestEvents} />
        </div>

        <div className="space-y-8">
          {/* Engagement Ranking */}
          <EngagementHeatList />

          {/* Quick Schedule/Reminder Mock */}
          <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-bold">本週行事曆</CardTitle>
              <Calendar className="w-4 h-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 text-center">
                    <p className="text-xs text-zinc-500 font-bold uppercase">MON</p>
                    <p className="text-xl font-black">24</p>
                  </div>
                  <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl">
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">王大明 - SPIN 對話</p>
                    <p className="text-[10px] font-bold text-indigo-600/60 uppercase">10:30 AM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 text-center">
                    <p className="text-xs text-zinc-500 font-bold uppercase">WED</p>
                    <p className="text-xl font-black">26</p>
                  </div>
                  <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">蔡佩芬 - 加保簽約</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">02:00 PM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPI({ title, value, icon: Icon, trend, className, iconColor }: { 
  title: string; 
  value: string; 
  icon: any; 
  trend: string; 
  className?: string; 
  iconColor?: string; 
}) {
  return (
    <Card className={`border shadow-sm rounded-[32px] overflow-hidden transition-all hover:translate-y-[-2px] ${className} bg-white dark:bg-zinc-900`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="bg-white/50 dark:bg-zinc-800/50 px-2 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-1">
            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{trend}</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-400" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-500 mb-1">{title}</p>
          <p className="text-3xl font-black tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
