"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck,
  Clock,
  FileText,
  ListTodo,
  MessageSquare,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { DashboardTaskDto, DashboardTaskKind } from "@/domains/dashboard/types";

const taskIconMap: Record<DashboardTaskKind, ElementType> = {
  ISSUE: TriangleAlert,
  VISIT: MessageSquare,
  REPORT: FileText,
  COMPLIANCE: ShieldCheck,
};

const taskKindLabel: Record<DashboardTaskKind, string> = {
  ISSUE: "議題",
  VISIT: "準備包",
  REPORT: "報告",
  COMPLIANCE: "合規",
};

export function TasksPanel({ tasks }: { tasks: DashboardTaskDto[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-hairline bg-card px-5 py-3.5">
        <div>
          <CardTitle>今日任務</CardTitle>
          <p className="mt-1 text-[12px] text-muted-foreground">依優先級與工作流阻塞排序</p>
        </div>
        <ListTodo className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
      </CardHeader>
      <CardContent className="p-0">
        {tasks.length > 0 ? (
          <div className="divide-y divide-hairline">
            {tasks.map((task) => {
              const Icon = taskIconMap[task.kind];
              return (
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
                        {task.clientName && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 h-4 bg-card"
                          >
                            {task.clientName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.5} /> {task.dueLabel}
                        </span>
                        <span className="flex items-center gap-1 text-foreground">
                          <Icon className="w-3 h-3" strokeWidth={1.5} /> {taskKindLabel[task.kind]}
                        </span>
                        {task.priority === "HIGH" && (
                          <span className="flex items-center gap-1 text-foreground">
                            <TriangleAlert className="w-3 h-3" strokeWidth={1.5} /> 高優先
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={task.href}
                    aria-label={`處理任務：${task.title}`}
                    className="opacity-100 text-[11px] font-semibold text-primary transition-opacity hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    去處理
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-hairline bg-paper-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">今日沒有高優先任務</p>
              <p className="mt-1 text-xs text-muted-foreground">可以先整理關係圖或建立下一份拜訪準備包。</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
