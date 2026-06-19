"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ListTodo, Clock, Gift, TriangleAlert } from "lucide-react";

type Task = {
  id: string;
  type: "FOLLOW_UP" | "BIRTHDAY" | "RENEWAL";
  title: string;
  client: string;
  due: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
};

const TASKS: Task[] = [
  { id: "t1", type: "FOLLOW_UP", title: "發送保障缺口建議報告", client: "王大明", due: "今日 14:00", priority: "HIGH" },
  { id: "t2", type: "BIRTHDAY", title: "生日祝福聯繫", client: "李國樑", due: "今日", priority: "MEDIUM" },
  { id: "t3", type: "FOLLOW_UP", title: "確認 SPIN 對話後續意向", client: "陳雅婷", due: "明日 10:00", priority: "MEDIUM" },
  { id: "t4", type: "RENEWAL", title: "定期壽險續約通知", client: "蔡佩芬", due: "後日", priority: "HIGH" },
];

export function TasksPanel() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-hairline bg-card px-5 py-3.5">
        <div>
          <CardTitle>今日任務</CardTitle>
          <p className="mt-1 text-[12px] text-muted-foreground">依成交機會與時效排序</p>
        </div>
        <ListTodo className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-hairline">
          {TASKS.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-4 p-4 transition-colors hover:bg-paper-2"
            >
              <div className="flex-1 flex items-center gap-3.5 min-w-0">
                <Checkbox
                  aria-label={`完成任務：${task.title}`}
                  className="rounded-full border-hairline shrink-0 data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-foreground leading-none">{task.title}</p>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-4 bg-card"
                    >
                      {task.client}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={1.5} /> {task.due}
                    </span>
                    {task.type === "BIRTHDAY" && (
                      <span className="flex items-center gap-1 text-foreground">
                        <Gift className="w-3 h-3" strokeWidth={1.5} /> 生日提醒
                      </span>
                    )}
                    {task.priority === "HIGH" && (
                      <span className="flex items-center gap-1 text-foreground">
                        <TriangleAlert className="w-3 h-3" strokeWidth={1.5} /> 高優先
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label={`處理任務：${task.title}`}
                className="opacity-100 text-[11px] font-semibold text-primary transition-opacity hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                去處理
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
