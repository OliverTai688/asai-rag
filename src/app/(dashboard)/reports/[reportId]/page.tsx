"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit3,
  Eye,
  FileText,
  Printer,
  Save,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { SpotlightTour } from "@/components/demo/spotlight-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormattedTime } from "@/components/ui/formatted-time";
import { Markdown } from "@/components/ui/markdown";
import { Textarea } from "@/components/ui/textarea";
import { clientService } from "@/domains/client/service";
import { demoQuickstart, getQuickstartStep } from "@/domains/demo/quickstart";
import { reportTourSteps } from "@/domains/demo/tour-steps";
import { getReportPurposeMeta, SECTION_TYPE_LABELS } from "@/domains/report/blueprints";
import { reportService } from "@/domains/report/service";
import { useReportStore } from "@/domains/report/store";
import type { Report, ReportSection } from "@/domains/report/types";
import { cn } from "@/lib/utils";

type ReportMode = "edit" | "preview" | "share";
type PreviewAudience = "internal" | "client";

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ReportEditorPage() {
  return (
    <Suspense fallback={<ReportLoading />}>
      <ReportEditorContent />
    </Suspense>
  );
}

function ReportEditorContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = normalizeParam(params.reportId);
  const report = useReportStore((state) => state.reports.find((item) => item.id === reportId));
  const updateSection = useReportStore((state) => state.updateSection);
  const generateShareToken = useReportStore((state) => state.generateShareToken);
  const [mode, setMode] = useState<ReportMode>("preview");
  const [audience, setAudience] = useState<PreviewAudience>("internal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const isQuickstart = searchParams.get("demo") === "quickstart";

  useEffect(() => {
    if (!report && isQuickstart) {
      router.replace(`/reports?clientId=${demoQuickstart.clientId}&autoCreate=true&demo=quickstart`);
    }
  }, [isQuickstart, report, router]);

  if (!report || !reportId) {
    return <ReportMissing isQuickstart={isQuickstart} />;
  }

  const client = clientService.getClientById(report.clientId);
  const clientSections = reportService.getClientSections(report);
  const displaySections = audience === "internal" ? report.sections : clientSections;
  const shareUrl = typeof window !== "undefined" && report.share ? `${window.location.origin}/share/${report.share.token}` : "";

  const handleStartEdit = (section: ReportSection) => {
    setMode("edit");
    setEditingId(section.id);
    setEditValue(section.content);
  };

  const handleSaveEdit = (sectionId: string) => {
    updateSection(report.id, sectionId, editValue);
    setEditingId(null);
    toast.success("區塊已更新");
  };

  const handleShare = async () => {
    const token = report.share?.token || generateShareToken(report.id);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("分享連結已複製");
    } catch {
      toast.info("分享連結已建立", { description: url });
    }
    setMode("share");
  };

  if (isQuickstart) {
    return (
      <QuickstartReportView
        audience={audience}
        client={client}
        displaySections={displaySections}
        onAudienceChange={setAudience}
        onShare={handleShare}
        report={report}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-5 border-b border-hairline pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <Link
            href="/reports"
            className="mb-4 inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回報告庫
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">V{report.version}.0</Badge>
            <Badge variant="outline" className="rounded-full">{getReportPurposeMeta(report.purpose).label}</Badge>
            <Badge variant="outline" className="rounded-full">{audience === "internal" ? "內部版" : "客戶版"}</Badge>
            {report.share ? <Badge variant="outline" className="rounded-full">已分享</Badge> : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{report.clientName} 決策報告</h1>
          {report.goal ? (
            <p className="mt-3 text-sm leading-6 text-ink">目標：{report.goal}</p>
          ) : null}
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            最後更新 <FormattedTime isoString={report.updatedAt} format="datetime" />
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            預覽列印
          </Button>
          <Button type="button" variant="mono" className="h-10 rounded-full" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            建立分享連結
          </Button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="space-y-3">
          <ModeButton active={mode === "edit"} icon={<Edit3 className="h-4 w-4" />} label="編輯" onClick={() => setMode("edit")} />
          <ModeButton active={mode === "preview"} icon={<Eye className="h-4 w-4" />} label="預覽" onClick={() => setMode("preview")} />
          <ModeButton active={mode === "share"} icon={<Share2 className="h-4 w-4" />} label="分享" onClick={() => setMode("share")} />

          <Card className="border-hairline shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Audience</p>
              <div className="mt-3 grid gap-2">
                {[
                  { label: "內部視角", value: "internal" as const },
                  { label: "客戶演示", value: "client" as const },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={cn(
                      "min-h-10 rounded-full border border-hairline px-3 text-left text-sm font-medium transition",
                      audience === item.value ? "bg-ink text-paper" : "bg-background text-muted-foreground hover:bg-muted/30",
                    )}
                    onClick={() => setAudience(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0">
          {mode === "share" ? (
            <SharePanel report={report} shareUrl={shareUrl} onCreateShare={handleShare} />
          ) : (
            <ReportSections
              audience={audience}
              displaySections={displaySections}
              editValue={editValue}
              editingId={editingId}
              mode={mode}
              onCancelEdit={() => setEditingId(null)}
              onEditValueChange={setEditValue}
              onSaveEdit={handleSaveEdit}
              onStartEdit={handleStartEdit}
            />
          )}
        </main>

        <aside className="space-y-4">
          <Card className="border-hairline shadow-none">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-ink">文件摘要</h2>
              <div className="mt-4 space-y-3">
                <SummaryLine label="客戶" value={report.clientName} />
                <SummaryLine label="區塊" value={`${displaySections.length} 個`} />
                <SummaryLine label="分享次數" value={String(report.share?.accessCount ?? 0)} />
              </div>
            </CardContent>
          </Card>

          {client ? (
            <Card className="border-hairline shadow-none">
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-ink">客戶脈絡</h2>
                <div className="mt-4 space-y-3">
                  <SummaryLine label="職業" value={client.occupation} />
                  <SummaryLine label="家庭" value={`${client.family.length} 人`} />
                  <SummaryLine label="KYC" value={client.kycStatus} />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-full border border-hairline px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-ink text-paper" : "bg-background text-muted-foreground hover:bg-muted/30",
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function ReportSections({
  audience,
  displaySections,
  editValue,
  editingId,
  mode,
  onCancelEdit,
  onEditValueChange,
  onSaveEdit,
  onStartEdit,
}: {
  audience: PreviewAudience;
  displaySections: ReportSection[];
  editValue: string;
  editingId: string | null;
  mode: ReportMode;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onSaveEdit: (sectionId: string) => void;
  onStartEdit: (section: ReportSection) => void;
}) {
  return (
    <div className="space-y-3">
      {displaySections.map((section, index) => {
        const isEditing = mode === "edit" && editingId === section.id;
        return (
          <Card key={section.id} className="border-hairline shadow-none">
            <CardContent className="p-0">
              <div className="grid gap-3 border-b border-hairline p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}・{SECTION_TYPE_LABELS[section.type] ?? section.type}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-ink">{section.title}</h2>
                </div>
                {mode === "edit" ? (
                  <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => onStartEdit(section)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    編輯區塊
                  </Button>
                ) : section.isEdited ? (
                  <Badge variant="outline" className="rounded-full">已編輯</Badge>
                ) : null}
              </div>
              <div className="p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editValue}
                      onChange={(event) => onEditValueChange(event.target.value)}
                      className="min-h-56 resize-y rounded-lg border-hairline bg-background text-base leading-7 focus-visible:ring-ring"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" className="h-10 rounded-full" onClick={onCancelEdit}>取消</Button>
                      <Button type="button" variant="mono" className="h-10 rounded-full" onClick={() => onSaveEdit(section.id)}>
                        <Save className="mr-2 h-4 w-4" />
                        儲存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Markdown content={section.content} isInternal={audience === "internal"} className="text-sm leading-7" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SharePanel({ onCreateShare, report, shareUrl }: { onCreateShare: () => void | Promise<void>; report: Report; shareUrl: string }) {
  const handleCopy = async () => {
    if (!shareUrl) {
      await onCreateShare();
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("分享連結已複製");
    } catch {
      toast.info("分享連結", { description: shareUrl });
    }
  };

  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline">
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">分享設定</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">產生客戶可讀的安全分享頁，保留閱讀次數追蹤，不修改分享 token 邏輯。</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-hairline bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Share URL</p>
          <p className="mt-2 break-all text-sm font-medium text-ink">{shareUrl || "尚未建立分享連結"}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="mono" className="h-10 rounded-full" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            {shareUrl ? "複製連結" : "建立分享連結"}
          </Button>
          {shareUrl ? (
            <Link href={shareUrl.replace(typeof window !== "undefined" ? window.location.origin : "", "")} className="inline-flex h-10 items-center rounded-full border border-hairline px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted/30">
              開啟客戶頁
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MetricMini label="閱讀次數" value={String(report.share?.accessCount ?? 0)} />
          <MetricMini label="狀態" value={report.share ? "已建立" : "未建立"} />
          <MetricMini label="客戶版區塊" value={String(reportService.getClientSections(report).length)} />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function QuickstartReportView({
  audience,
  client,
  displaySections,
  onAudienceChange,
  onShare,
  report,
}: {
  audience: PreviewAudience;
  client: ReturnType<typeof clientService.getClientById> | null;
  displaySections: ReportSection[];
  onAudienceChange: (value: PreviewAudience) => void;
  onShare: () => void | Promise<void>;
  report: Report;
}) {
  const step = getQuickstartStep("report");
  const highlights = [
    { label: "客戶", value: report.clientName, detail: client?.occupation ?? "示範客戶" },
    { label: "報告版本", value: `V${report.version}.0`, detail: audience === "internal" ? "內部視角" : "客戶演示" },
    { label: "下一步", value: "回到總覽", detail: "完成 quickstart 閉環" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <SpotlightTour steps={reportTourSteps} />
      <QuickstartGuide currentStepId="report" compact nextHref="/dashboard?demo=completed" nextLabel="完成 Demo：回到總覽" />

      <section className="rounded-lg border border-hairline bg-card shadow-none">
        <div className="border-b border-hairline p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quickstart Report</p>
              <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{step.screenTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{step.bodyCopy}</p>
            </div>
            <Button type="button" variant="mono" className="h-10 rounded-full" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              建立分享連結
            </Button>
          </div>
        </div>

        <div data-tour="report-highlights" className="grid gap-3 border-b border-hairline p-5 sm:grid-cols-3 sm:p-6">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-lg border border-hairline bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-ink">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid w-full grid-cols-2 rounded-lg border border-hairline bg-muted/20 p-1 sm:inline-grid sm:w-auto">
            {[
              { label: "內部摘要", value: "internal" as const },
              { label: "客戶版", value: "client" as const },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onAudienceChange(tab.value)}
                className={cn(
                  "min-h-9 rounded-md px-4 text-sm font-semibold transition-colors",
                  audience === tab.value ? "bg-background text-ink shadow-sm" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div data-tour="report-sections" className="mt-5 space-y-3">
            {displaySections.map((section, index) => (
              <details key={section.id} className="group rounded-lg border border-hairline bg-background">
                <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-ink">{section.title}</span>
                    <span className="mt-0.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{SECTION_TYPE_LABELS[section.type] ?? section.type}</span>
                  </span>
                  <ChevronDown className="mt-1 h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-hairline px-4 py-4 sm:px-5">
                  <Markdown content={section.content} isInternal={audience === "internal"} className="text-sm leading-7" />
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-hairline bg-muted/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-ink">Quickstart 收束重點</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              這份報告代表一次拜訪的輸出已完成。接著回到總覽，看 dashboard 如何接上後續追蹤。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReportMissing({ isQuickstart }: { isQuickstart: boolean }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <FileText className="h-8 w-8 text-muted-foreground" />
      <h1 className="mt-4 text-lg font-semibold text-ink">{isQuickstart ? "載入 Quickstart 決策報告..." : "找不到報告"}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">請回報告庫重新開啟或生成報告。</p>
      <Button type="button" variant="mono" className="mt-5 rounded-full" onClick={() => window.location.assign("/reports")}>
        回報告庫
      </Button>
    </div>
  );
}

function ReportLoading() {
  return <div className="p-10 text-center text-sm font-medium text-muted-foreground">載入報告...</div>;
}
