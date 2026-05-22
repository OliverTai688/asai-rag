"use client";

import { useCalendarStore } from "@/domains/calendar/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export function DashboardCalendar() {
  const { events, isGoogleConnected, setGoogleConnected } = useCalendarStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todaysEvents = events.filter((event) => isSameDay(parseISO(event.start), selectedDate));

  const handleConnectGoogle = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: "正在連接 Google Calendar...",
      success: () => {
        setGoogleConnected(true);
        return "成功串接 Google Calendar！";
      },
      error: "連接失敗",
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-[#E6EDF3] bg-white px-5 py-3.5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[13px]">
            <CalendarIcon className="h-4 w-4 text-[#1565C0]" strokeWidth={1.5} />
            今日安排
          </CardTitle>
          <Button variant="ghost" size="icon-sm" className="text-[#7B8B9A]">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const hasEvents = events.some((event) => isSameDay(parseISO(event.start), day));

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative flex flex-col items-center rounded-md px-1 py-2 transition-colors",
                  isSelected
                    ? "bg-[#173762] text-white"
                    : "text-[#5F7080] hover:bg-[#F3F7FB] hover:text-[#0A2342]"
                )}
              >
                <span className="mb-1 text-[9px] font-semibold uppercase tracking-wide">
                  {format(day, "EEEEE", { locale: zhTW })}
                </span>
                <span className="text-[13px] font-semibold tabular-nums">{format(day, "d")}</span>
                {hasEvents && (
                  <span
                    className={cn(
                      "absolute bottom-1 h-1 w-1 rounded-full",
                      isSelected ? "bg-[#C9A227]" : "bg-[#9AAEC1]"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {!isGoogleConnected ? (
          <div className="rounded-md border border-[#E2EAF1] bg-[#FAFCFF] p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E2EAF1] bg-white">
                <ExternalLink className="h-3.5 w-3.5 text-[#1565C0]" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#0A2342]">串接外部日曆</p>
                <p className="mt-0.5 text-[11px] leading-4 text-[#5F7080]">
                  同步行程後，AI 可協助安排拜訪節奏。
                </p>
              </div>
            </div>
            <Button onClick={handleConnectGoogle} variant="outline" className="mt-3 h-8 w-full text-[12px]">
              立即串接
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-[#D7EAD8] bg-[#F4FAF4] p-3">
            <CheckCircle2 className="h-4 w-4 text-[#1B5E20]" strokeWidth={1.5} />
            <p className="text-[12px] font-semibold text-[#1B5E20]">Google Calendar 已同步</p>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7B8B9A]">
                {format(selectedDate, "yyyy MMM d", { locale: zhTW })}
              </p>
              <p className="text-sm font-semibold text-[#0A2342]">
                {isSameDay(selectedDate, new Date()) ? "今日行程" : "當日行程"}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">{todaysEvents.length} 件</Badge>
          </div>

          <div className="space-y-2">
            {todaysEvents.length > 0 ? (
              todaysEvents.map((event) => (
                <div
                  key={event.id}
                  className="group flex items-center gap-3 rounded-md border border-[#E2EAF1] bg-white p-3 transition-colors hover:border-[#B7C8D8]"
                >
                  <div className="flex w-12 shrink-0 items-center gap-1 text-[11px] font-semibold text-[#5F7080] tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-[#9AAEC1]" strokeWidth={1.5} />
                    {format(parseISO(event.start), "HH:mm")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="truncate text-[13px] font-semibold text-[#0A2342]">{event.title}</h5>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7B8B9A]">
                      {event.type}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#C5D2DE] transition-colors group-hover:text-[#1565C0]" strokeWidth={1.5} />
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-[#D8E1EA] px-4 py-8 text-center">
                <p className="text-[13px] font-semibold text-[#5F7080]">當日沒有安排行程</p>
                <p className="mt-1 text-[11px] text-[#7B8B9A]">保留一段安靜的整理時間。</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
