"use client";

import { useReportStore } from "@/domains/report/store";
import { useSpinStore } from "@/domains/spin/store";
import { useTheaterStore } from "@/domains/theater/store";
import { reportService } from "@/domains/report/service";
import { clientService } from "@/domains/client/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ChevronRight, 
  Clock, 
  Share2, 
  Eye,
  PlusCircle
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormattedTime } from "@/components/ui/formatted-time";
import { buttonVariants } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from "@/components/ui/dialog";
import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import {
  getQuickstartSpinFixture,
  getQuickstartTheaterFixture,
} from "@/domains/demo/quickstart";

export default function ReportListPage() {
  const router = useRouter();
  const { reports, addReport } = useReportStore();
  const { sessions: spinSessions } = useSpinStore();
  const { scoresBySession } = useTheaterStore();
  const quickstartCreatedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldAutoCreate = params.get("demo") === "quickstart" && params.get("autoCreate") === "true";
    if (!shouldAutoCreate || quickstartCreatedRef.current) return;
    quickstartCreatedRef.current = true;

    const clientId = params.get("clientId") ?? "c_wang";
    const spinId = params.get("spinId");
    const theaterId = params.get("theaterId");
    const spinFixture = getQuickstartSpinFixture(spinId ?? "quickstart-spin").session;
    const theaterFixture = getQuickstartTheaterFixture(theaterId ?? "quickstart-theater", spinFixture.id).score;
    const spin =
      spinSessions.find((session) => session.id === spinId) ??
      spinSessions.find((session) => session.clientId === clientId) ??
      spinFixture;
    const theaterScore = theaterId ? scoresBySession[theaterId] : Object.values(scoresBySession)[0];
    const clientName = spin?.clientName ?? clientService.getClientById(clientId)?.name ?? "王大明";

    const newReport = reportService.generateReport({
      clientId,
      clientName,
      spinSession: spin,
      theaterScore: theaterScore ?? theaterFixture,
    });

    addReport(newReport);
    router.replace(`/reports/${newReport.id}?demo=quickstart`);
  }, [addReport, router, scoresBySession, spinSessions]);

  const handleGenerateFromSpin = (spinId: string) => {
    const spin = spinSessions.find(s => s.id === spinId)!;
    // 找看看有沒有對應的演練評分
    const theaterScore = Object.values(scoresBySession)[0]; // 簡化：取第一個評分

    const newReport = reportService.generateReport({
      clientId: spin.clientId,
      clientName: spin.clientName,
      spinSession: spin,
      theaterScore,
    });

    addReport(newReport);
    toast.success(`${spin.clientName} 的報告已成功生成！`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">決策報告 (Reports)</h1>
          <p className="text-zinc-500 font-medium">將分析數據轉化為專業提案。支持內部研討與客戶分享。</p>
        </div>
        
        <Dialog>
          <DialogTrigger>
            <div className="inline-flex items-center justify-center rounded-full bg-[#1A3A6B] hover:bg-[#1565C0] h-11 px-6 shadow-lg shadow-[#1565C0]/20 text-white font-medium text-sm cursor-pointer transition-colors">
              <PlusCircle className="w-5 h-5 mr-2" /> 生成報告
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>選擇資料來源</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
               {spinSessions.map(spin => (
                 <button 
                  key={spin.id}
                  onClick={() => handleGenerateFromSpin(spin.id)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 hover:bg-[#EBF3FB] dark:hover:bg-[#0A2342]/10 transition-all text-left"
                 >
                    <div className="flex flex-col">
                       <span className="font-bold">{spin.clientName}</span>
                       <span className="text-[10px] text-zinc-400 font-bold uppercase"><FormattedTime isoString={spin.createdAt} format="date" /> SPIN SESSION</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                 </button>
               ))}
               {spinSessions.length === 0 && (
                 <p className="text-center py-10 text-zinc-400 text-sm font-medium italic">請先完成 SPIN 思考後再來生成報告</p>
               )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <QuickstartGuide currentStepId="report" />

      {reports.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-zinc-900 rounded-[40px] border-2 border-dashed border-zinc-100 dark:border-zinc-800">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 scale-125">
            <FileText className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-xl font-black mb-2 tracking-tight">尚無報告記錄</h3>
          <p className="text-zinc-500 max-w-xs mx-auto mb-8 font-medium">從 CRM 或 SPIN 頁面開始，將 AI 的洞察凝結成一份專業報告。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card key={report.id} className="rounded-[32px] border-zinc-200 dark:border-zinc-800 hover:shadow-xl transition-all group overflow-hidden bg-white dark:bg-zinc-900">
              <CardContent className="p-0">
                <Link href={`/reports/${report.id}`}>
                   <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 relative">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                            <FileText className="w-5 h-5 text-[#1565C0]" />
                         </div>
                         <div>
                            <h4 className="font-bold text-lg leading-none">{report.clientName}</h4>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">決策報告 V{report.version}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-white dark:bg-zinc-800 border-zinc-200 text-[10px] py-0 px-2 font-black">
                           {report.sections.length} 個區塊
                        </Badge>
                        {report.share && (
                           <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] py-0 px-2 font-black">
                              已分享 {report.share.accessCount} 次
                           </Badge>
                        )}
                      </div>
                   </div>
                </Link>
                <div className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                         <Clock className="w-3 h-3" /> <FormattedTime isoString={report.updatedAt} format="date" />
                      </div>
                   </div>
                   <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="rounded-xl w-8 h-8 text-zinc-400">
                         <Share2 className="w-4 h-4" />
                      </Button>
                      <Link
                        href={`/reports/${report.id}`}
                        className={buttonVariants({ variant: "ghost", size: "icon", className: "rounded-xl w-8 h-8 text-[#1565C0]" })}
                      >
                         <Eye className="w-4 h-4" />
                      </Link>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
