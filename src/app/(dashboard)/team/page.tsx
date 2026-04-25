"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users2,
  TrendingUp,
  Award,
  Target,
  MoreVertical,
  Phone,
  Mail,
  ChevronRight,
  Crown,
  Zap,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TEAM_MEMBERS = [
  {
    id: "1",
    name: "王小明",
    role: "Agent",
    region: "台北一區",
    avatar: "王",
    color: "bg-indigo-500",
    stats: { clients: 28, closedThisMonth: 4, revenue: 284000, spinSessions: 12 },
    tags: ["SPIN 高手", "連戰連捷"],
    status: "online",
  },
  {
    id: "2",
    name: "李美玲",
    role: "Senior Agent",
    region: "台北二區",
    avatar: "李",
    color: "bg-orange-500",
    stats: { clients: 42, closedThisMonth: 7, revenue: 512000, spinSessions: 21 },
    tags: ["Top Performer", "儲蓄險王"],
    status: "online",
  },
  {
    id: "3",
    name: "張大壯",
    role: "Manager",
    region: "全台",
    avatar: "張",
    color: "bg-emerald-500",
    stats: { clients: 15, closedThisMonth: 2, revenue: 198000, spinSessions: 8 },
    tags: ["管理職"],
    status: "away",
  },
  {
    id: "4",
    name: "陳雅婷",
    role: "Agent",
    region: "新北區",
    avatar: "陳",
    color: "bg-pink-500",
    stats: { clients: 19, closedThisMonth: 3, revenue: 167000, spinSessions: 9 },
    tags: ["新人之星"],
    status: "online",
  },
  {
    id: "5",
    name: "林俊宏",
    role: "Agent",
    region: "桃園區",
    avatar: "林",
    color: "bg-violet-500",
    stats: { clients: 23, closedThisMonth: 1, revenue: 89000, spinSessions: 5 },
    tags: [],
    status: "offline",
  },
];

const TEAM_STATS = [
  { label: "本月總成交", value: "17 件", icon: Target, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  { label: "本月總業績", value: "NT$1.25M", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
  { label: "SPIN 使用率", value: "84%", icon: Zap, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
  { label: "客戶滿意度", value: "4.8 / 5", icon: Award, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-900/20" },
];

export default function TeamPage() {
  const sortedMembers = [...TEAM_MEMBERS].sort(
    (a, b) => b.stats.revenue - a.stats.revenue
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">團隊管理</h1>
          <p className="text-zinc-500 font-medium">查看成員業績、AI 使用狀況與排行榜。</p>
        </div>
        <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700 h-11 px-6 shadow-lg shadow-indigo-500/20">
          <Users2 className="w-5 h-5 mr-2" /> 邀請成員
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TEAM_STATS.map((stat) => (
          <Card key={stat.label} className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-6">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <h3 className="font-black text-sm uppercase tracking-widest text-zinc-400">本月排行榜</h3>
          </div>
          <CardContent className="p-4 space-y-2">
            {sortedMembers.map((member, i) => (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl",
                  i === 0 ? "bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black",
                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                    i === 1 ? "bg-zinc-300 text-zinc-700" :
                    i === 2 ? "bg-amber-600 text-white" :
                    "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                  )}
                >
                  {i + 1}
                </div>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black", member.color)}>
                  {member.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-none">{member.name}</p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{member.stats.closedThisMonth} 件成交</p>
                </div>
                <p className="text-sm font-black text-zinc-700 dark:text-zinc-200">
                  {(member.stats.revenue / 10000).toFixed(0)}萬
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Member Cards */}
        <div className="lg:col-span-2 space-y-4">
          {TEAM_MEMBERS.map((member) => (
            <Card
              key={member.id}
              className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all overflow-hidden group"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg", member.color)}>
                      {member.avatar}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900",
                        member.status === "online" ? "bg-green-400" :
                        member.status === "away" ? "bg-yellow-400" : "bg-zinc-300"
                      )}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold leading-none">{member.name}</p>
                      <Badge variant="outline" className="text-[9px] py-0 h-4 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-500">
                        {member.role}
                      </Badge>
                      {member.tags.map((tag) => (
                        <Badge key={tag} className="text-[9px] py-0 h-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-none font-bold">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-400 font-medium mt-1">{member.region}</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <Phone className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <Mail className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <MoreVertical className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-center">
                    <p className="text-lg font-black">{member.stats.clients}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">客戶數</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-green-600">{member.stats.closedThisMonth}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">本月成交</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-indigo-600">{member.stats.spinSessions}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">SPIN 次數</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
