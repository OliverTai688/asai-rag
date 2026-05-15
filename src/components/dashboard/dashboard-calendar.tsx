"use client";

import { useCalendarStore } from "@/domains/calendar/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export function DashboardCalendar() {
  const { events, isGoogleConnected, setGoogleConnected } = useCalendarStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const todaysEvents = events.filter(event =>
    isSameDay(parseISO(event.start), selectedDate)
  );

  const handleConnectGoogle = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: '正在連接 Google Calendar...',
        success: () => {
          setGoogleConnected(true);
          return '成功串接 Google Calendar！';
        },
        error: '連接失敗',
      }
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6 md:p-7 flex flex-col md:flex-row gap-8">
        {/* Left Side: Week Selector */}
        <div className="w-full md:w-72 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[16px] text-[#0A2342] flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#1565C0]" strokeWidth={1.5} />
              行程安排
            </h3>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-[#546E7A] hover:text-[#1565C0] hover:bg-[#EBF3FB]"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-[#546E7A] hover:text-[#1565C0] hover:bg-[#EBF3FB]"
              >
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>

          {/* Week Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const hasEvents = events.some(e => isSameDay(parseISO(e.start), day));

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-xl transition-all duration-180 relative",
                    isSelected
                      ? "bg-[#1A3A6B] text-white shadow-md shadow-[#1A3A6B]/20"
                      : isToday
                        ? "bg-[#EBF3FB] text-[#1565C0]"
                        : "hover:bg-[#F7FAFF] text-[#546E7A] hover:text-[#0A2342]"
                  )}
                >
                  <span className="text-[9px] font-semibold uppercase mb-1 tracking-wide">
                    {format(day, "eee", { locale: zhTW })}
                  </span>
                  <span className={cn("text-[13px] font-bold", isSelected && "text-white")}>
                    {format(day, "d")}
                  </span>
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#C9A227]" />
                  )}
                  {hasEvents && isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#C9A227]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Google Calendar Connection */}
          {!isGoogleConnected ? (
            <div className="p-4 rounded-xl bg-[#EBF3FB] border border-[#90CAF9]/40 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-[#CFD8DC]">
                  <ExternalLink className="w-3.5 h-3.5 text-[#1565C0]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#0A2342]">串接外部日曆</p>
                  <p className="text-[11px] text-[#546E7A] leading-relaxed mt-0.5">
                    同步 Google Calendar，讓 AI 助理自動規劃行程。
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConnectGoogle}
                className="w-full rounded-xl h-9 text-[12px] font-semibold"
              >
                立即串接
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7]/40 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#1B5E20] shrink-0" strokeWidth={1.5} />
              <p className="text-[12px] font-semibold text-[#1B5E20]">Google Calendar 已同步</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-[#EBF3FB] self-stretch" />

        {/* Right Side: Events List */}
        <div className="flex-1 space-y-5 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-[#546E7A] uppercase tracking-widest mb-1">
                {format(selectedDate, "yyyy MMMM d", { locale: zhTW })}
              </p>
              <h4 className="font-bold text-[22px] text-[#0A2342]">
                {isSameDay(selectedDate, new Date()) ? "今日行程" : "當日行程"}
              </h4>
            </div>
            <Button size="sm" className="rounded-xl gap-1.5 text-[12px] font-semibold">
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              新增行程
            </Button>
          </div>

          <div className="space-y-2.5">
            {todaysEvents.length > 0 ? (
              todaysEvents.map((event) => (
                <div
                  key={event.id}
                  className="group flex items-center gap-4 p-4 rounded-xl hover:bg-[#F7FAFF] transition-all border border-[#CFD8DC]/60 hover:border-[#90CAF9]/60 hover:shadow-sm"
                >
                  <div className="flex flex-col items-center justify-center w-14 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-[#90CAF9] mb-1" strokeWidth={1.5} />
                    <span className="text-[11px] font-bold text-[#546E7A] tabular-nums">
                      {format(parseISO(event.start), "HH:mm")}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-[#EBF3FB] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-[13px] text-[#0A2342] group-hover:text-[#1565C0] transition-colors truncate">
                      {event.title}
                    </h5>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <span className="text-[10px] font-semibold text-[#546E7A] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" />
                        {event.type}
                      </span>
                      {event.source === 'GOOGLE' && (
                        <Badge variant="outline" className="text-[9px] py-0 h-4 border-[#CFD8DC] text-[#546E7A] rounded">
                          GOOGLE
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg opacity-0 group-hover:opacity-100 h-7 w-7 text-[#546E7A] hover:text-[#1565C0] hover:bg-[#EBF3FB]"
                  >
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-[#EBF3FB] rounded-xl">
                <div className="w-11 h-11 rounded-full bg-[#EBF3FB] flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-[#90CAF9]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-[13px] text-[#546E7A]">當日沒有安排行程</p>
                  <p className="text-[11px] text-[#90CAF9] mt-0.5">享受一段安靜的工作時光吧！</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
