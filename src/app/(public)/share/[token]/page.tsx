"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FormattedTime } from "@/components/ui/formatted-time";
import { Markdown } from "@/components/ui/markdown";
import type { Report, ReportSection, ShareBranding, ShareCtaConfig, SharePortalConfig } from "@/domains/report/types";

const fallbackBranding: ShareBranding = {
  organizationName: "誠問 AI",
  brandColor: "#1A3A6B",
  poweredByLabel: "誠問 AI",
};

const fallbackPortal: SharePortalConfig = {
  enabled: true,
  loginHref: "/client-login",
  visibleScopes: ["授權報告", "預約下一步", "回覆顧問", "補充資料"],
};

const fallbackCta: ShareCtaConfig = {
  primaryLabel: "查看建議重點",
  primaryHref: "#recommendation",
  secondaryLabel: "登入客戶入口",
  secondaryHref: "/client-login",
};

export default function ShareReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const trackedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/share/${token}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { report: Report };
      })
      .then((body) => {
        if (!isMounted) return;
        if (!body?.report) {
          setStatus("missing");
          return;
        }
        setReport(body.report);
        setStatus("ready");
      })
      .catch(() => {
        if (isMounted) setStatus("missing");
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (status !== "ready" || trackedRef.current) return;
    trackedRef.current = true;
    fetch(`/api/share/${token}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "OPEN", payload: { source: "share-page" } }),
    }).catch(() => undefined);
  }, [status, token]);

  const clientSections = useMemo(() => report?.sections ?? [], [report]);
  const recommendation = clientSections.find((section) => section.type === "recommendation");
  const share = report?.share;
  const branding = share?.branding ?? fallbackBranding;
  const portal = share?.portal ?? fallbackPortal;
  const cta = share?.ctaConfig ?? fallbackCta;
  const accent = sanitizeAccentColor(branding.brandColor);

  if (status === "loading") {
    return <ShareReportLoading />;
  }

  if (!report) {
    return <MissingReport />;
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-hairline pb-4">
          <div className="flex items-center gap-3">
            <BrandMark branding={branding} accent={accent} />
            <div>
              <p className="text-sm font-semibold leading-none">{branding.organizationName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {branding.unitName ? `${branding.unitName}・` : ""}Secure client report
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              客戶版
            </Badge>
            {portal.enabled ? (
              <Link
                href={portal.loginHref}
                className="hidden h-9 items-center rounded-full border border-hairline px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
              >
                客戶登入
              </Link>
            ) : null}
          </div>
        </header>

        <section className="grid min-h-[calc(100svh-92px)] content-center gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Decision report</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {report.clientName} 的決策建議報告
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              這份報告整理本次需求釐清後的重點、風險缺口與建議方向。請先閱讀建議重點，再與您的顧問確認下一步配置。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={cta.primaryHref}
                className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {cta.primaryLabel}
                <ArrowDown className="ml-2 h-4 w-4" />
              </a>
              {cta.secondaryHref && cta.secondaryLabel ? (
                <Link
                  href={cta.secondaryHref}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-hairline px-5 text-sm font-medium text-ink transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {cta.secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>

          <aside className="rounded-lg border border-hairline bg-background p-4" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Report status</p>
            <div className="mt-4 space-y-3">
              <MetaLine icon={<Calendar className="h-4 w-4" />} label="產出日期">
                <FormattedTime isoString={report.createdAt} format="date" />
              </MetaLine>
              <MetaLine icon={<Clock className="h-4 w-4" />} label="預估閱讀">
                {Math.max(3, Math.ceil(clientSections.length * 1.2))} 分鐘
              </MetaLine>
              <MetaLine icon={<LockKeyhole className="h-4 w-4" />} label="連結狀態">
                已建立安全連結
              </MetaLine>
            </div>
          </aside>
        </section>

        <section className="border-y border-hairline py-5">
          <div className="grid gap-4 text-sm leading-6 text-muted-foreground sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
            <p className="font-semibold text-ink">閱讀前提醒</p>
            <p>
              本頁含有個人保障與財務需求相關資訊，請勿轉傳給非必要人員。內容供諮詢與討論使用，實際投保仍需依保單條款、核保結果與法規要求確認。
            </p>
          </div>
        </section>

        <ClientPortalScope portal={portal} />

        <ReportNavigation sections={clientSections} />

        <article className="space-y-8 py-10 sm:py-14">
          {clientSections.map((section, index) => (
            <ReportSectionBlock key={section.id} index={index} section={section} highlight={section.id === recommendation?.id} />
          ))}
        </article>

        <section id="next-step" className="border-t border-hairline py-10 sm:py-12">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next step</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">與顧問確認可執行方案</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                建議下一步是逐項確認保障缺口、預算範圍與投保順序。若有資料需要修正，請直接回覆分享此連結給您的顧問。
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {portal.enabled ? (
                <Link
                  href={portal.loginHref}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  登入回覆顧問
                </Link>
              ) : null}
              <a
                href="#recommendation"
                className="inline-flex h-11 items-center justify-center rounded-full border border-hairline px-5 text-sm font-medium text-ink transition hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                回到建議重點
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-hairline py-6 text-xs leading-6 text-muted-foreground">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <p>
              由{branding.poweredByLabel ?? "誠問 AI"}協助整理。顧問仍需依客戶最新資料、法規與商品條款完成最終確認。
            </p>
            <p className="font-medium text-ink">Report V{report.version}.0</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function BrandMark({ accent, branding }: { accent: string; branding: ShareBranding }) {
  if (branding.logoUrl) {
    return (
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-hairline bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={branding.logoUrl} alt={`${branding.organizationName} logo`} className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background" style={{ color: accent }}>
      <ShieldCheck className="h-4 w-4" />
    </span>
  );
}

function ClientPortalScope({ portal }: { portal: SharePortalConfig }) {
  if (!portal.enabled) return null;

  return (
    <section className="border-b border-hairline py-5">
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <MessageSquareText className="h-4 w-4" />
          客戶入口
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex flex-wrap gap-2">
            {portal.visibleScopes.map((scope) => (
              <Badge key={scope} variant="outline" className="rounded-full border-hairline">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {scope}
              </Badge>
            ))}
          </div>
          <Link
            href={portal.loginHref}
            className="inline-flex h-10 items-center justify-center rounded-full border border-hairline px-4 text-sm font-medium text-ink transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            登入查看授權資料
          </Link>
        </div>
      </div>
    </section>
  );
}

function sanitizeAccentColor(color?: string) {
  if (!color) return "#1A3A6B";
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#1A3A6B";
}

function ReportNavigation({ sections }: { sections: ReportSection[] }) {
  if (sections.length === 0) return null;

  return (
    <nav className="sticky top-0 z-10 -mx-5 border-b border-hairline bg-paper/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10" aria-label="報告章節">
      <div className="flex gap-2 overflow-x-auto">
        {sections.map((section, index) => (
          <a
            key={section.id}
            href={`#${section.type}`}
            className="inline-flex h-11 shrink-0 items-center rounded-full border border-hairline bg-background px-3 text-xs font-medium text-muted-foreground transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {String(index + 1).padStart(2, "0")} {section.title}
          </a>
        ))}
      </div>
    </nav>
  );
}

function ReportSectionBlock({ highlight, index, section }: { highlight: boolean; index: number; section: ReportSection }) {
  return (
    <section id={highlight ? "recommendation" : section.type} className="scroll-mt-20 rounded-lg border border-hairline bg-background">
      <div className="grid gap-3 border-b border-hairline p-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {String(index + 1).padStart(2, "0")}・{section.type}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{section.title}</h2>
        </div>
        {highlight ? (
          <Badge variant="outline" className="w-fit rounded-full">
            建議重點
          </Badge>
        ) : null}
      </div>
      <div className="p-5 sm:p-6">
        <Markdown content={section.content} className="text-sm leading-7 prose-headings:text-ink prose-p:text-muted-foreground prose-li:text-muted-foreground" />
      </div>
    </section>
  );
}

function MetaLine({ children, icon, label }: { children: React.ReactNode; icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold text-ink">{children}</p>
      </div>
    </div>
  );
}

function MissingReport() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-10 text-center text-ink">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-background">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">報告不存在或已過期</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">請聯繫您的專業顧問，確認是否已有新的分享連結。</p>
      </div>
    </main>
  );
}

function ShareReportLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-10 text-center text-ink">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-background">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-5 text-sm font-medium text-muted-foreground">載入安全報告...</p>
      </div>
    </main>
  );
}
