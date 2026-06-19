"use client";

import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { useClientStore } from "@/domains/client/store";
import type { Client } from "@/domains/client/types";
import {
  getQuickstartSpinFixture,
  getQuickstartTheaterFixture,
} from "@/domains/demo/quickstart";
import { DEFAULT_REPORT_PURPOSE, REPORT_PURPOSES } from "@/domains/report/blueprints";
import { reportService } from "@/domains/report/service";
import { useReportStore } from "@/domains/report/store";
import type { Report, ReportPurpose } from "@/domains/report/types";
import { useSpinStore } from "@/domains/spin/store";
import { useTheaterStore } from "@/domains/theater/store";
import type { SpinSession } from "@/domains/spin/types";
import { cn } from "@/lib/utils";

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
  const clients = useClientStore((state) => state.clients);
  const [query, setQuery] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [purpose, setPurpose] = useState<ReportPurpose>(DEFAULT_REPORT_PURPOSE);
  const [goal, setGoal] = useState("");
  const blankReportIdPrefix = useId().replace(/[^a-zA-Z0-9]/g, "");
  const blankReportCounterRef = useRef(0);
  const quickstartCreatedRef = useRef(false);

  useEffect(() => {
    void clientService.fetchClients().catch(() => undefined);
  }, []);

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

  const sortedClients = useMemo(() => {
    return clients.slice().sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  }, [clients]);

  const goalValue = goal.trim() || undefined;

  const handleGenerateFromSpin = (spin: SpinSession) => {
    const theaterScore = Object.values(scoresBySession)[0];
    const newReport = reportService.generateReport({
      clientId: spin.clientId,
      clientName: spin.clientName,
      purpose,
      goal: goalValue,
      client: clientService.getClientById(spin.clientId),
      spinSession: spin,
      theaterScore,
    });

    addReport(newReport);
    setSourceOpen(false);
    toast.success(`${spin.clientName} 的報告已生成`);
    router.push(`/reports/${newReport.id}`);
  };

  const handleGenerateForClient = (client: Client) => {
    const spin = sortedSpinSessions.find((session) => session.clientId === client.id);
    const theaterScore = Object.values(scoresBySession)[0];
    const newReport = reportService.generateReport({
      clientId: client.id,
      clientName: client.name,
      purpose,
      goal: goalValue,
      client,
      spinSession: spin,
      theaterScore,
    });

    addReport(newReport);
    setSourceOpen(false);
    toast.success(`${client.name} 的報告已生成`);
    router.push(`/reports/${newReport.id}`);
  };

  const handleGenerateBlank = () => {
    blankReportCounterRef.current += 1;
    const newReport = reportService.generateReport({
      clientId: `adhoc_${blankReportIdPrefix}_${blankReportCounterRef.current}`,
      clientName: "未命名客戶",
      purpose,
      goal: goalValue,
    });

    addReport(newReport);
    setSourceOpen(false);
    toast.success("空白報告已生成，可直接編輯");
    router.push(`/reports/${newReport.id}`);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Report library</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">決策報告</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            隨時生成客戶決策報告，可從客戶資料、SPIN 對話或空白範本開始，快速進入編輯、預覽與分享流程。
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
            <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  報告用途
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {REPORT_PURPOSES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={purpose === item.id}
                      className={cn(
                        "rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        purpose === item.id
                          ? "border-ink bg-ink/[0.03] ring-1 ring-ink"
                          : "border-hairline bg-background hover:bg-muted/30",
                      )}
                      onClick={() => setPurpose(item.id)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{item.label}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{item.estimatedPages}</span>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <label htmlFor="report-goal" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  報告目標（選填）
                </label>
                <Input
                  id="report-goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="例如：為家庭新成員補足保障缺口"
                  className="h-10 rounded-lg border-hairline"
                />
              </section>

              <div className="border-t border-hairline pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  資料來源
                </p>
                <Button
                  type="button"
                  variant="mono"
                  className="h-11 w-full rounded-lg"
                  onClick={handleGenerateBlank}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  直接建立空白報告
                </Button>
              </div>

              {sortedClients.length ? (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    從客戶生成
                  </p>
                  {sortedClients.map((client) => {
                    const linkedSpin = sortedSpinSessions.find((session) => session.clientId === client.id);
                    return (
                      <button
                        key={client.id}
                        type="button"
                        className="grid min-h-14 w-full gap-2 rounded-lg border border-hairline bg-background p-4 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1fr_auto] sm:items-center"
                        onClick={() => handleGenerateForClient(client)}
                      >
                        <span>
                          <span className="block text-sm font-semibold text-ink">{client.name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {client.occupation || "客戶資料"}
                            {linkedSpin ? "・已串接 SPIN 對話" : "・直接生成"}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </section>
              ) : null}

              {sortedSpinSessions.length ? (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    從 SPIN 對話生成
                  </p>
                  {sortedSpinSessions.map((spin) => (
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
                  ))}
                </section>
              ) : null}
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
        {hasQuery ? "調整搜尋條件後再試一次。" : "點擊「生成報告」即可隨時建立第一份決策報告，可選客戶、SPIN 對話或空白報告。"}
      </p>
    </div>
  );
}

function ReportListLoading() {
  return <div className="p-10 text-center text-sm font-medium text-muted-foreground">載入報告庫...</div>;
}
