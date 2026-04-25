"use client";

import { InteractionEvent } from "@/domains/event/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { MessageSquare, Theater, FileText, Share2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  SPIN: MessageSquare,
  THEATER: Theater,
  REPORT: FileText,
  SHARE_OPEN: Share2,
  SYSTEM: Info,
};

const colorMap = {
  SPIN: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
  THEATER: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  REPORT: "text-green-600 bg-green-50 dark:bg-green-900/20",
  SHARE_OPEN: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  SYSTEM: "text-zinc-600 bg-zinc-50 dark:bg-zinc-900/20",
};

export function ActivityTimeline({ events }: { events: InteractionEvent[] }) {
  return (
    <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
        <CardTitle className="text-lg font-bold">近期活動</CardTitle>
        <span className="text-xs text-zinc-500 font-medium">最近 8 筆記錄</span>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-zinc-100 dark:before:bg-zinc-800">
          {events.map((event) => {
            const Icon = iconMap[event.type] || Info;
            return (
              <div key={event.id} className="relative flex items-start gap-4 pl-1">
                <div className={cn("mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white dark:border-zinc-950 z-10", colorMap[event.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1 pt-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold leading-none">{event.title}</p>
                    <time className="text-[10px] font-medium text-zinc-400">
                      {formatDate(event.timestamp, "HH:mm")}
                    </time>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    <span className="text-zinc-900 dark:text-zinc-300 mr-2">[{event.clientName}]</span>
                    {event.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
