"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormattedTime } from "@/components/ui/formatted-time";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { clientService } from "@/domains/client/service";
import {
  getQuickstartSpinFixture,
  getQuickstartTheaterFixture,
} from "@/domains/demo/quickstart";
import { reportService } from "@/domains/report/service";
import { useReportStore } from "@/domains/report/store";
import type { Report } from "@/domains/report/types";
import { useSpinStore } from "@/domains/spin/store";
import { useTheaterStore } from "@/domains/theater/store";
import type { SpinSession } from "@/domains/spin/types";

export default function ReportListPage() {
  return (
    <Suspense fallback={<ReportListLoading />}>
      <ReportListContent />
    </Suspense>
  );
}

function ReportListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reports = useReportStore((state) => state.reports);
  const addReport = useReportStore((state) => state.addReport);
  const spinSessions = useSpinStore((state) => state.sessions);
  const scoresBySession = useTheaterStore((state) => state.scoresBySession);
  const [query, setQuery] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const quickstartCreatedRef = useRef(false);

  useEffect(() => {
    const shouldAutoCreate = searchParams.get("demo") === "quickstart" && searchParams.get("autoCreate") === "true";
    if (!shouldAutoCreate || quickstartCreatedRef.current) return;
    quickstartCreatedRef.current = true;

    const clientId = searchParams.get("clientId") ?? "c_wang";
    const spinId = searchParams.get("spinId");
    const theaterId = searchParams.get("theaterId");
    const spinFixture = getQuickstartSpinFixture(spinId ?? "quickstart-spin").session;
    const theaterFixture = getQuickstartTheaterFixture(theaterId ?? "quickstart-theater", spinFixture.id).score;
    const spin =
      spinSessions.find((session) => session.id === spinId) ??
      spinSessions.find((session) => session.clientId === clientId) ??
      spinFixture;
    const theaterScore = theaterId ? scoresBySession[theaterId] : Object.values(scoresBySession)[0];
    const clientName = spin.clientName ?? clientService.getClientById(clientId)?.name ?? "王大明";

    const newReport = reportService.generateReport({
      clientId,
      clientName,
      spinSession: spin,
      theaterScore: theaterScore ?? theaterFixture,
    });

    addReport(newReport);
    router.replace(`/reports/${newReport.id}?demo=quickstart`);
  }, [addReport, router, scoresBySession, searchParams, spinSessions]);

  const filteredReports = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((report) => report.clientName.toLowerCase().includes(term) || report.id.toLowerCase().includes(term));
  }, [query, reports]);

  const sortedSpinSessions = useMemo(() => {
    return spinSessions.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [spinSessions]);

  const stats = {
    total: reports.length,
    shared: reports.filter((report) => report.share).length,
    updated: reports[0]?.updatedAt,
  };

  const handleGenerateFromSpin = (spin: SpinSession) => {
    const theaterScore = Object.values(scoresBySession)[0];
    const newReport = reportService.generateReport({
      clientId: spin.clientId,
      clientName: spin.clientName,
      spinSession: spin,
      theaterScore,
    });

    addReport(newReport);
    setSourceOpen(false);
    toast.success(`${spin.clientName} 的報告已生成`);
    router.push(`/reports/${newReport.id}`);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Report library</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">決策報告</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            管理由 SPIN 與劇場演練產出的客戶報告，快速進入編輯、預覽與分享流程。
          </p>
        </div>
        <Dialog open={sourceOpen} onOpenChange={setSourceOpen}>
          <DialogTrigger render={<Button type="button" variant="mono" className="h-10 rounded-full" />}>
            <Plus className="mr-2 h-4 w-4" />
            生成報告
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>選擇資料來源</DialogTitle>
            </DialogHeader>
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {sortedSpinSessions.length ? (
                sortedSpinSessions.map((spin) => (
                  <button
                    key={spin.id}
                    type="button"
                    className="grid min-h-16 w-full gap-2 rounded-lg border border-hairline bg-background p-4 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1fr_auto] sm:items-center"
                    onClick={() => handleGenerateFromSpin(spin)}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink">{spin.clientName}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        <FormattedTime isoString={spin.createdAt} format="date" />・{Object.values(spin.outputs).flat().length} 個 SPIN 線索
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-hairline bg-muted/20 p-6 text-center text-sm leading-6 text-muted-foreground">
                  請先完成一筆 SPIN 澄清，再生成客戶報告。
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {searchParams.get("demo") === "quickstart" ? <QuickstartGuide currentStepId="report" /> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="全部報告" value={String(stats.total)} helper="本機工作區" />
        <Metric label="已分享" value={String(stats.shared)} helper="已建立公開 token" />
        <Metric label="最近更新" value={stats.updated ? "今日" : "--"} helper={stats.updated ? "依更新時間排序" : "尚無報告"} />
      </section>

      <Card className="border-hairline shadow-none">
        <CardContent className="p-0">
          <div className="grid gap-3 border-b border-hairline p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋客戶或報告 ID"
                className="h-10 rounded-full border-hairline pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">{filteredReports.length} 份報告</p>
          </div>

          {filteredReports.length ? (
            <div className="divide-y divide-hairline">
              {filteredReports.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyReportState hasQuery={Boolean(query.trim())} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ helper, label, value }: { helper: string; label: string; value: string }) {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ReportRow({ report }: { report: Report }) {
  return (
    <div className="grid gap-3 p-4 transition hover:bg-muted/20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <Link href={`/reports/${report.id}`} className="grid min-w-0 gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground">
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{report.clientName} 決策報告</span>
          <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>V{report.version}.0</span>
            <span>{report.sections.length} 區塊</span>
            <span>更新 <FormattedTime isoString={report.updatedAt} format="date" /></span>
          </span>
        </span>
      </Link>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {report.share ? (
          <Badge variant="outline" className="rounded-full">
            分享 {report.share.accessCount} 次
          </Badge>
        ) : (
          <Badge variant="outline" className="rounded-full text-muted-foreground">
            未分享
          </Badge>
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={`/reports/${report.id}`}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-muted-foreground transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`開啟 ${report.clientName} 報告`}
              />
            }
          >
            <ArrowUpRight className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>開啟報告</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-muted-foreground transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${report.clientName} 更多操作`}
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>更多操作</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function EmptyReportState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-hairline">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-ink">{hasQuery ? "沒有符合條件的報告" : "尚無報告記錄"}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {hasQuery ? "調整搜尋條件後再試一次。" : "完成 SPIN 澄清後，可以從資料來源生成第一份決策報告。"}
      </p>
    </div>
  );
}

function ReportListLoading() {
  return <div className="p-10 text-center text-sm font-medium text-muted-foreground">載入報告庫...</div>;
}
