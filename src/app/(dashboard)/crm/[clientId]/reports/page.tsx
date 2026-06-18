"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { useClientRecord } from "@/components/crm/use-client-record";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormattedTime } from "@/components/ui/formatted-time";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReportStore } from "@/domains/report/store";
import { useMounted } from "@/lib/hooks/use-mounted";
import { Download, Eye, FileText, Loader2, Share2, Sparkles } from "lucide-react";
import {
  CompactMetric,
  EmptyRelatedState,
  IconAction,
  RecordSubpageHeader,
} from "../_components/record-subpage-ui";

export default function ClientReportsPage() {
  const { clientId } = useParams();
  const router = useRouter();
  const mounted = useMounted();
  const normalizedClientId = clientId as string;
  const { client } = useClientRecord(normalizedClientId);
  const allReports = useReportStore((state) => state.reports);
  const reports = useMemo(
    () => allReports.filter((report) => report.clientId === normalizedClientId),
    [allReports, normalizedClientId]
  );
  const addReport = useReportStore((state) => state.addReport);

  const [showGenDialog, setShowGenDialog] = useState(false);
  const [reportPrompt, setReportPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!client) return null;

  const sharedCount = reports.filter((report) => report.share).length;
  const latestReport = reports[0];

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
            content: markdown,
          },
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
    <div className="space-y-5">
      <RecordSubpageHeader
        eyebrow="Report library"
        title="報告歷史"
        description="集中查看此客戶的計畫、分析與分享狀態；生成流程維持單一短任務 dialog。"
        action={
          <Button
            variant="mono"
            className="w-full rounded-full sm:w-auto"
            onClick={() => setShowGenDialog(true)}
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            生成新報告
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric label="報告數" value={`${reports.length} 份`} helper="此客戶報告" />
        <CompactMetric label="已分享" value={`${sharedCount} 份`} helper="含分享 token" />
        <CompactMetric
          label="最近更新"
          value={
            mounted && latestReport ? new Date(latestReport.updatedAt).toLocaleDateString("zh-TW") : "--"
          }
          helper={latestReport?.sections[0]?.title ?? "尚無報告"}
        />
      </div>

      {!mounted || reports.length === 0 ? (
        <EmptyRelatedState
          icon={FileText}
          title={!mounted ? "載入報告記錄中" : "尚無報告記錄"}
          description={
            !mounted
              ? "報告資料會在客戶端同步後顯示。"
              : "生成第一份報告後，這裡會呈現標題、版本、更新時間與 row actions。"
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-hairline">
              {reports.map((report) => {
                const title = report.sections[0]?.title || "未命名報告";

                return (
                  <div
                    key={report.id}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-paper-2/60 md:grid-cols-[minmax(0,1fr)_120px_120px_132px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
                        <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                        <p className="text-xs text-muted-foreground">
                          <FormattedTime isoString={report.createdAt} format="date" /> ・ V
                          {report.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Badge variant={report.share ? "secondary" : "outline"} className="h-6 text-[11px]">
                        {report.share ? "已分享" : "未分享"}
                      </Badge>
                    </div>
                    <p className="flex items-center text-sm font-medium text-muted-foreground tabular-nums">
                      {report.sections.length} 區段
                    </p>
                    <div className="flex items-center justify-start gap-1 md:justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/reports/${report.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                        查看
                      </Button>
                      <IconAction
                        label={`下載 ${title}`}
                        icon={Download}
                        onClick={() => downloadMarkdown(report.sections[0].content, title)}
                      />
                      <IconAction label={`分享 ${title}`} icon={Share2} disabled />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showGenDialog} onOpenChange={setShowGenDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
              AI 生成報告
            </DialogTitle>
            <DialogDescription>
              輸入這次報告的具體用途，系統會產出可編輯的 Markdown 報告。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reportPrompt" className="text-sm font-semibold">
              報告需求指令
            </Label>
            <Textarea
              id="reportPrompt"
              placeholder="例如：請根據客戶目前 500 萬定期險缺口，生成一份重大傷病與家庭責任的面談摘要..."
              className="min-h-[128px]"
              value={reportPrompt}
              onChange={(event) => setReportPrompt(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGenDialog(false)}
            >
              取消
            </Button>
            <Button
              disabled={isLoading || !reportPrompt.trim()}
              onClick={handleGenerateReport}
              variant="mono"
              className="min-w-[120px]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "開始生成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
