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

const colorMap: Record<string, { icon: string; bg: string; border: string }> = {
  SPIN:       { icon: "#1565C0", bg: "#F8FAFC", border: "#D8E1EA" },
  THEATER:    { icon: "#8B6B10", bg: "#F8FAFC", border: "#D8E1EA" },
  REPORT:     { icon: "#1B5E20", bg: "#F8FAFC", border: "#D8E1EA" },
  SHARE_OPEN: { icon: "#0A2342", bg: "#F8FAFC", border: "#D8E1EA" },
  SYSTEM:     { icon: "#5F7080", bg: "#F8FAFC", border: "#D8E1EA" },
};

export function ActivityTimeline({ events }: { events: InteractionEvent[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#E6EDF3] bg-white px-5 py-3.5">
        <CardTitle>近期活動</CardTitle>
        <span className="text-[11px] text-[#7B8B9A] font-medium">最近 8 筆記錄</span>
      </CardHeader>
      <CardContent className="p-5">
        <div className="relative space-y-5 before:absolute before:inset-0 before:ml-[18px] before:h-full before:w-px before:bg-[#E6EDF3]">
          {events.map((event) => {
            const Icon = iconMap[event.type] || Info;
            const colors = colorMap[event.type] || colorMap.SYSTEM;
            return (
              <div key={event.id} className="relative flex items-start gap-3.5">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border z-10"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: colors.icon }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 space-y-0.5 pt-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#0A2342] leading-none truncate">{event.title}</p>
                    <time className="text-[10px] font-medium text-[#7B8B9A] shrink-0">
                      {formatDate(event.timestamp, "HH:mm")}
                    </time>
                  </div>
                  <p className="text-[12px] text-[#5F7080] leading-relaxed">
                    <span className="text-[#1565C0] font-semibold mr-1.5">[{event.clientName}]</span>
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
