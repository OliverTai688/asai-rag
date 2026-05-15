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
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#EBF3FB] bg-[#F7FAFF]/50">
        <CardTitle>今日任務</CardTitle>
        <ListTodo className="w-4 h-4 text-[#546E7A]" strokeWidth={1.5} />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#EBF3FB]">
          {TASKS.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 hover:bg-[#F7FAFF] transition-colors group"
            >
              <div className="flex-1 flex items-center gap-3.5 min-w-0">
                <Checkbox
                  className="rounded-full border-[#CFD8DC] shrink-0 data-[state=checked]:bg-[#1A3A6B] data-[state=checked]:border-[#1A3A6B]"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-[#0A2342] leading-none">{task.title}</p>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-4 border-[#CFD8DC] text-[#546E7A] bg-[#F7FAFF]"
                    >
                      {task.client}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#546E7A] font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={1.5} /> {task.due}
                    </span>
                    {task.type === "BIRTHDAY" && (
                      <span className="flex items-center gap-1 text-[#B8860B]">
                        <Gift className="w-3 h-3" strokeWidth={1.5} /> 生日提醒
                      </span>
                    )}
                    {task.priority === "HIGH" && (
                      <span className="flex items-center gap-1 text-[#E65100]">
                        <TriangleAlert className="w-3 h-3" strokeWidth={1.5} /> 高優先
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold text-[#1565C0] hover:text-[#0A2342] transition-all">
                去處理
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
