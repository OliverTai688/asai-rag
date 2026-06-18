"use client";

import { useCalendarStore } from "@/domains/calendar/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
      <CardHeader className="border-b border-hairline bg-card px-5 py-3.5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[13px]">
            <CalendarIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
            今日安排
          </CardTitle>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="新增行程">
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              }
            />
            <TooltipContent>新增行程</TooltipContent>
          </Tooltip>
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
                aria-label={`查看 ${format(day, "M 月 d 日 EEEE", { locale: zhTW })} 行程`}
                className={cn(
                  "relative flex flex-col items-center rounded-md px-1 py-2 transition-colors",
                  isSelected
                    ? "bg-ink text-paper"
                    : "text-muted-foreground hover:bg-paper-2 hover:text-foreground"
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
                      isSelected ? "bg-paper" : "bg-muted-foreground/45"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {!isGoogleConnected ? (
          <div className="rounded-md border border-hairline bg-paper-2/60 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-card">
                <ExternalLink className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground">串接外部日曆</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  同步行程後，AI 可協助安排拜訪節奏。
                </p>
              </div>
            </div>
            <Button onClick={handleConnectGoogle} variant="outline" className="mt-3 h-8 w-full text-[12px]">
              立即串接
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-hairline bg-paper-2/60 p-3">
            <CheckCircle2 className="h-4 w-4 text-foreground" strokeWidth={1.5} />
            <p className="text-[12px] font-semibold text-foreground">Google Calendar 已同步</p>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {format(selectedDate, "yyyy MMM d", { locale: zhTW })}
              </p>
              <p className="text-sm font-semibold text-foreground">
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
                  className="group flex items-center gap-3 rounded-md border border-hairline bg-card p-3 transition-colors hover:border-hairline-2 hover:bg-paper-2"
                >
                  <div className="flex w-12 shrink-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    {format(parseISO(event.start), "HH:mm")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="truncate text-[13px] font-semibold text-foreground">{event.title}</h5>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {event.type}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary" strokeWidth={1.5} />
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-hairline px-4 py-8 text-center">
                <p className="text-[13px] font-semibold text-muted-foreground">當日沒有安排行程</p>
                <p className="mt-1 text-[11px] text-muted-foreground">保留一段安靜的整理時間。</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
