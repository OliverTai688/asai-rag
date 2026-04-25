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
    <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
        <CardTitle className="text-lg font-bold">今日任務</CardTitle>
        <ListTodo className="w-4 h-4 text-zinc-400" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {TASKS.map((task) => (
            <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
              <div className="flex-1 flex items-center gap-4">
                <Checkbox className="rounded-full border-zinc-300 dark:border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold leading-none">{task.title}</p>
                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-none bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {task.client}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {task.due}
                    </span>
                    {task.type === "BIRTHDAY" && (
                      <span className="flex items-center gap-1 text-pink-500/80">
                        <Gift className="w-3 h-3" /> 生日提醒
                      </span>
                    )}
                    {task.priority === "HIGH" && (
                      <span className="flex items-center gap-1 text-orange-500/80">
                        <TriangleAlert className="w-3 h-3" /> 高優先
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-opacity">
                去處理
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
