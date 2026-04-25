"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_REPORTS = [
  { id: "r1", title: "保障缺口分析建議書", date: "2026-04-24", version: "v1.2", shared: true },
  { id: "r2", title: "拜訪後記：初訪摘要", date: "2026-04-10", version: "v1.0", shared: false },
];

export default function ClientReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold mb-1">報告歷史</h3>
          <p className="text-zinc-500 font-medium">查看與分享該客戶的所有計畫與分析報告。</p>
        </div>
        <Button className="rounded-full bg-indigo-600">生成新報告</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {MOCK_REPORTS.map((report) => (
          <Card key={report.id} className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden group">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-600 transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-none mb-1 group-hover:text-indigo-600 transition-colors">{report.title}</h4>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase">{report.date} | {report.version} {report.shared && "| 已分享"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl"><Eye className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl"><Download className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl"><Share2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
