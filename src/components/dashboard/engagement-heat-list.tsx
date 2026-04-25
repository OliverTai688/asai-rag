"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { TrendingUp, User } from "lucide-react";

const HEATS = [
  { name: "王大明", engagement: 95, color: "bg-indigo-600" },
  { name: "蔡佩芬", engagement: 82, color: "bg-orange-500" },
  { name: "羅德華", engagement: 74, color: "bg-blue-500" },
  { name: "李國樑", engagement: 68, color: "bg-green-500" },
  { name: "林建華", engagement: 45, color: "bg-zinc-400" },
];

export function EngagementHeatList() {
  return (
    <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
        <CardTitle className="text-lg font-bold">客戶互動熱度</CardTitle>
        <TrendingUp className="w-4 h-4 text-zinc-400" />
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-5">
          {HEATS.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <User className="w-3 h-3 text-zinc-500" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                </div>
                <span className="text-zinc-500">{item.engagement}%</span>
              </div>
              <Progress value={item.engagement}>
                <ProgressTrack className="h-1.5 bg-zinc-100 dark:bg-zinc-800">
                  <ProgressIndicator className={item.color} />
                </ProgressTrack>
              </Progress>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
