"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Share2, Eye, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useReportStore } from "@/domains/report/store";
import { clientService } from "@/domains/client/service";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { FormattedTime } from "@/components/ui/formatted-time";
import { useMounted } from "@/lib/hooks/use-mounted";

export default function ClientReportsPage() {
  const { clientId } = useParams();
  const client = clientService.getClientById(clientId as string);
  const allReports = useReportStore((state) => state.reports);
  const reports = useMemo(() => allReports.filter(r => r.clientId === clientId), [allReports, clientId]);
  const addReport = useReportStore((state) => state.addReport);

  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [reportPrompt, setReportPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const mounted = useMounted();

  if (!client) return null;

  const handleGenerateReport = async () => {
    if (!reportPrompt.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: reportPrompt, client }),
      });

      if (!response.ok) throw new Error("生成失敗");

      const markdown = await response.text();
      
      const newReport = {
        id: nanoid(),
        clientId: client.id,
        clientName: client.name,
        sections: [
          {
            id: nanoid(),
            type: "summary" as const,
            title: "AI 生成報告",
            content: markdown
          }
        ],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addReport(newReport);
      setShowGenDialog(false);
      setReportPrompt("");
      toast.success("報告生成成功！");
    } catch (error) {
      console.error(error);
      toast.error("報告生成發生錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold mb-1">報告歷史</h3>
          <p className="text-zinc-500 font-medium">查看與分享該客戶的所有計畫與分析報告。</p>
        </div>
        <Button 
          className="rounded-full bg-[#1A3A6B] hover:bg-[#1565C0] gap-2 px-6 h-12 shadow-lg shadow-[#D6E8F8] transition-all active:scale-95"
          onClick={() => setShowGenDialog(true)}
        >
          <Sparkles className="w-4 h-4" /> 生成新報告
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(!mounted || reports.length === 0) ? (
          <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[2rem] space-y-4">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-zinc-300" />
            </div>
            <p className="text-zinc-400 font-medium">
              {!mounted ? "載入報告記錄中..." : "尚無報告記錄，點擊上方按鈕開始生成"}
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="rounded-[2rem] border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[#EBF3FB] dark:group-hover:bg-[#1A3A6B]/20 group-hover:text-[#1A3A6B] transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-none mb-1 group-hover:text-[#1A3A6B] transition-colors">
                      {report.sections[0]?.title || "未命名報告"}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-medium uppercase">
                      <FormattedTime isoString={report.createdAt} format="date" /> | V{report.version} {report.share && "| 已分享"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/reports/${report.id}`}>
                    <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-zinc-100">
                      <Eye className="w-4 h-4 text-zinc-500" />
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-9 h-9 rounded-xl hover:bg-zinc-100"
                    onClick={() => downloadMarkdown(report.sections[0].content, report.sections[0].title)}
                  >
                    <Download className="w-4 h-4 text-zinc-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-zinc-100">
                    <Share2 className="w-4 h-4 text-zinc-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showGenDialog} onOpenChange={setShowGenDialog}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1A3A6B]" /> AI 生成報告
            </DialogTitle>
            <DialogDescription className="font-medium">
              請輸入您的具體需求（例如：針對長照缺口生成一份面談摘要），AI 將為您撰寫專業的 Markdown 報告。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">報告需求指令</Label>
              <Textarea 
                placeholder="例如：請根據客戶目前 500 萬的定期險缺口，生成一份轉定期為終身的建議書要點..."
                className="rounded-2xl border-zinc-200 min-h-[120px] focus:ring-[#1565C0]"
                value={reportPrompt}
                onChange={(e) => setReportPrompt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenDialog(false)} className="rounded-xl h-11 px-6 font-bold">取消</Button>
            <Button 
              disabled={isLoading || !reportPrompt.trim()}
              onClick={handleGenerateReport}
              className="rounded-xl bg-[#1A3A6B] hover:bg-[#1565C0] h-11 px-8 font-bold gap-2 min-w-[120px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "開始生成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
