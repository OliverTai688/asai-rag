"use client";

import { InteractionEvent } from "@/domains/event/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { MessageSquare, Theater, FileText, Share2, Info } from "lucide-react";

const iconMap = {
  SPIN: MessageSquare,
  THEATER: Theater,
  REPORT: FileText,
  SHARE_OPEN: Share2,
  SYSTEM: Info,
};

const toneMap: Record<string, string> = {
  SPIN: "text-primary",
  THEATER: "text-foreground",
  REPORT: "text-foreground",
  SHARE_OPEN: "text-primary",
  SYSTEM: "text-muted-foreground",
};

export function ActivityTimeline({ events }: { events: InteractionEvent[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-hairline bg-card px-5 py-3.5">
        <CardTitle>近期活動</CardTitle>
        <span className="text-[11px] text-muted-foreground font-medium">最近 8 筆記錄</span>
      </CardHeader>
      <CardContent className="p-5">
        <div className="relative space-y-5 before:absolute before:inset-0 before:ml-[18px] before:h-full before:w-px before:bg-hairline">
          {events.map((event) => {
            const Icon = iconMap[event.type] || Info;
            const tone = toneMap[event.type] || toneMap.SYSTEM;
            return (
              <div key={event.id} className="relative flex items-start gap-3.5">
                <div
                  className="z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-card"
                >
                  <Icon className={`h-3.5 w-3.5 ${tone}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 space-y-0.5 pt-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-foreground leading-none truncate">{event.title}</p>
                    <time className="text-[10px] font-medium text-muted-foreground shrink-0">
                      {formatDate(event.timestamp, "HH:mm")}
                    </time>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-semibold mr-1.5">[{event.clientName}]</span>
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
