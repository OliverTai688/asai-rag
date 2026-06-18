"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { TrendingUp, User } from "lucide-react";

const HEATS = [
  { name: "王大明", engagement: 95 },
  { name: "蔡佩芬", engagement: 82 },
  { name: "羅德華", engagement: 74 },
  { name: "李國樑", engagement: 68 },
  { name: "林建華", engagement: 45 },
];

export function EngagementHeatList() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-hairline bg-card px-5 py-3.5">
        <CardTitle className="text-[13px]">客戶互動熱度</CardTitle>
        <TrendingUp className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          {HEATS.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full border border-hairline bg-paper-2 flex items-center justify-center">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-foreground">{item.name}</span>
                </div>
                <span className="tabular-nums text-muted-foreground">{item.engagement}%</span>
              </div>
              <Progress value={item.engagement}>
                <ProgressTrack className="h-1.5 bg-paper-2">
                  <ProgressIndicator className="bg-primary" />
                </ProgressTrack>
              </Progress>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
