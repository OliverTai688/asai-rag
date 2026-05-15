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

const colorMap: Record<string, { icon: string; bg: string; border: string }> = {
  SPIN:       { icon: "#1565C0", bg: "#EBF3FB", border: "#90CAF9" },
  THEATER:    { icon: "#B8860B", bg: "#FDF3D0", border: "#C9A227" },
  REPORT:     { icon: "#1B5E20", bg: "#E8F5E9", border: "#A5D6A7" },
  SHARE_OPEN: { icon: "#0A2342", bg: "#D6E8F8", border: "#1976D2" },
  SYSTEM:     { icon: "#546E7A", bg: "#F7FAFF", border: "#CFD8DC" },
};

export function ActivityTimeline({ events }: { events: InteractionEvent[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#EBF3FB] bg-[#F7FAFF]/50">
        <CardTitle>近期活動</CardTitle>
        <span className="text-[11px] text-[#546E7A] font-medium">最近 8 筆記錄</span>
      </CardHeader>
      <CardContent className="p-5">
        <div className="relative space-y-5 before:absolute before:inset-0 before:ml-[18px] before:h-full before:w-px before:bg-[#EBF3FB]">
          {events.map((event) => {
            const Icon = iconMap[event.type] || Info;
            const colors = colorMap[event.type] || colorMap.SYSTEM;
            return (
              <div key={event.id} className="relative flex items-start gap-3.5">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white z-10 shadow-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: colors.icon }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 space-y-0.5 pt-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#0A2342] leading-none truncate">{event.title}</p>
                    <time className="text-[10px] font-medium text-[#546E7A] shrink-0">
                      {formatDate(event.timestamp, "HH:mm")}
                    </time>
                  </div>
                  <p className="text-[12px] text-[#546E7A] leading-relaxed">
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
