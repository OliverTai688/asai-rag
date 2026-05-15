"use client";

import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import {
  Bot,
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { assistantService } from "@/domains/assistant/service";
import { useState, useEffect } from "react";

const HEATS = [
  { name: "王大明", engagement: 95, color: "bg-[#1A3A6B]" },
  { name: "蔡佩芬", engagement: 82, color: "bg-orange-500" },
  { name: "羅德華", engagement: 74, color: "bg-blue-500" },
  { name: "李國樑", engagement: 68, color: "bg-green-500" },
  { name: "林建華", engagement: 45, color: "bg-zinc-400" },
];

type RiskAlerts = ReturnType<typeof assistantService.getRiskAlerts>;

export function AssistantInsights() {
  const [alerts, setAlerts] = useState<RiskAlerts | null>(null);

  useEffect(() => {
    setAlerts(assistantService.getRiskAlerts());
  }, []);

  return (
    <div className="space-y-6">
      {/* Block 1: Risk Alerts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Bot className="w-4 h-4 text-[#1565C0]" />
          <span className="font-bold text-xs">智能風險提示</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
            <p className="text-[10px] font-bold text-red-600 mb-1">
              跟進逾期 ({alerts?.overdue.count ?? "—"}人)
            </p>
            <p className="text-[9px] text-zinc-500 font-medium">
              {alerts?.overdue.description ?? "計算中..."}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
            <p className="text-[10px] font-bold text-orange-600 mb-1">
              SPIN 缺口 ({alerts?.spinGap.count ?? "—"}人)
            </p>
            <p className="text-[9px] text-zinc-500 font-medium">
              {alerts?.spinGap.description ?? "計算中..."}
            </p>
          </div>
        </div>
      </div>

      {/* Block 3: Engagement Heat */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1565C0]" />
            <span className="font-bold text-xs">客戶互動熱度</span>
          </div>
        </div>
        <div className="space-y-3 px-1">
          {HEATS.slice(0, 3).map((item) => (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <User className="w-2.5 h-2.5 text-zinc-500" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                </div>
                <span className="text-zinc-500">{item.engagement}%</span>
              </div>
              <Progress value={item.engagement}>
                <ProgressTrack className="h-1 bg-zinc-100 dark:bg-zinc-800">
                  <ProgressIndicator className={item.color} />
                </ProgressTrack>
              </Progress>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
