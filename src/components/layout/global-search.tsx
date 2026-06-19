"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  MessageSquare,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useClientStore } from "@/domains/client/store";
import { useReportStore } from "@/domains/report/store";
import { useSpinStore } from "@/domains/spin/store";
import { useTheaterStore } from "@/domains/theater/store";
import type { Client } from "@/domains/client/types";
import type { Report } from "@/domains/report/types";
import type { SpinSession } from "@/domains/spin/types";
import type { TheaterSession } from "@/domains/theater/types";
import { cn } from "@/lib/utils";

type SearchKind = "client" | "spin" | "theater" | "report" | "shortcut";

type SearchResult = {
  id: string;
  kind: SearchKind;
  href: string;
  title: string;
  subtitle: string;
  meta: string;
  icon: LucideIcon;
  searchableText: string;
};

type SearchableReport = Report & {
  purpose?: string;
  goal?: string;
  interviewSessionId?: string;
};

type ResultSection = {
  title: string;
  results: SearchResult[];
};

const CLIENT_STATUS_LABELS: Record<Client["status"], string> = {
  PROSPECT: "潛在客戶",
  ACTIVE: "服務中",
  CLOSED: "已成交",
};

const SPIN_PHASE_LABELS: Record<SpinSession["phase"], string> = {
  SITUATION: "情境",
  PROBLEM: "問題",
  IMPLICATION: "影響",
  NEED_PAYOFF: "需求效益",
  COMPLETE: "已完成",
};

const THEATER_STATUS_LABELS: Record<TheaterSession["status"], string> = {
  ACTIVE: "進行中",
  COMPLETED: "已完成",
};

const THEATER_PERSONA_LABELS: Record<TheaterSession["personaType"], string> = {
  CONSERVATIVE: "保守型",
  SKEPTICAL: "懷疑型",
  BUSY: "忙碌型",
  EMOTIONAL: "情緒型",
};

const REPORT_PURPOSE_LABELS: Record<string, string> = {
  comprehensive: "全面需求分析",
  proposal: "方案建議書",
  policy_review: "保單健檢",
  family_protection: "家庭保障",
  retirement: "退休規劃",
  follow_up: "回訪追蹤",
};

const SHORTCUT_RESULTS: SearchResult[] = [
  {
    id: "shortcut-crm",
    kind: "shortcut",
    href: "/crm",
    title: "客戶管理",
    subtitle: "查看客戶清單與客戶 360",
    meta: "客戶",
    icon: Users,
    searchableText: "客戶 管理 CRM client 客戶清單 客戶 360",
  },
  {
    id: "shortcut-spin",
    kind: "shortcut",
    href: "/interview",
    title: "AI 了解客戶",
    subtitle: "開啟訪談與客戶理解流程",
    meta: "對話",
    icon: MessageSquare,
    searchableText: "AI 了解客戶 訪談 interview SPIN 對話 需求 探詢",
  },
  {
    id: "shortcut-theater",
    kind: "shortcut",
    href: "/theater",
    title: "AI 劇場演練",
    subtitle: "進入角色扮演與異議處理練習",
    meta: "演練",
    icon: Sparkles,
    searchableText: "AI 劇場 演練 theater roleplay 異議處理",
  },
  {
    id: "shortcut-reports",
    kind: "shortcut",
    href: "/reports",
    title: "分析報告",
    subtitle: "查看與產出客戶決策報告",
    meta: "報告",
    icon: FileText,
    searchableText: "分析 報告 report 決策 分享",
  },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const clients = useClientStore((state) => state.clients);
  const spinSessions = useSpinStore((state) => state.sessions);
  const theaterSessions = useTheaterStore((state) => state.sessions);
  const reports = useReportStore((state) => state.reports);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      setQuery("");
      setOpen((current) => !current);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const indexedResults = useMemo(
    () => [
      ...clients.map(clientToResult),
      ...spinSessions.map(spinSessionToResult),
      ...theaterSessions.map(theaterSessionToResult),
      ...reports.map(reportToResult),
    ],
    [clients, reports, spinSessions, theaterSessions]
  );

  const sections = useMemo(
    () => buildSections(query, indexedResults),
    [indexedResults, query]
  );

  function openSearch() {
    setQuery("");
    setOpen(true);
  }

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  return (
    <>
      <button
        type="button"
        aria-label="搜尋客戶、對話或報告"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={openSearch}
        className={cn(
          "relative hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-paper-2 px-3 text-left text-sm text-muted-foreground transition-colors md:flex",
          "hover:border-hairline-2 hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        )}
      >
        <Search className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">
          搜尋客戶、對話或報告
        </span>
        <kbd className="rounded border border-hairline bg-card px-1.5 py-0.5 font-sans text-[10px] font-semibold text-ink-3">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="全域搜尋"
        description="搜尋客戶、SPIN 對話、劇場演練與報告。"
        className="max-w-[640px] border border-hairline bg-card shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
      >
        <Command shouldFilter={false} className="rounded-xl bg-card">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="輸入客戶、對話或報告關鍵字..."
          />
          <CommandList className="max-h-[440px] p-1">
            <CommandEmpty className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-foreground">找不到符合的結果</p>
              <p className="mt-1 text-xs text-muted-foreground">
                試試客戶姓名、電話、Email、SPIN 階段或報告標題。
              </p>
            </CommandEmpty>
            {sections.map((section, index) => (
              <SearchSection
                key={section.title}
                section={section}
                showSeparator={index > 0}
                onSelect={handleSelect}
              />
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function SearchSection({
  section,
  showSeparator,
  onSelect,
}: {
  section: ResultSection;
  showSeparator: boolean;
  onSelect: (result: SearchResult) => void;
}) {
  if (section.results.length === 0) {
    return null;
  }

  return (
    <>
      {showSeparator ? <CommandSeparator className="mx-1 bg-hairline" /> : null}
      <CommandGroup heading={section.title} className="py-1">
        {section.results.map((result) => (
          <CommandItem
            key={result.id}
            value={result.searchableText}
            onSelect={() => onSelect(result)}
            className="min-h-14 rounded-lg px-3 py-2 data-selected:bg-paper-2"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2 text-ink">
              <result.icon className="size-4" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {result.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {result.subtitle}
              </span>
            </span>
            <span className="shrink-0 rounded-full border border-hairline bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {result.meta}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}

function buildSections(query: string, indexedResults: SearchResult[]): ResultSection[] {
  const trimmedQuery = query.trim();
  const matchingResults = trimmedQuery
    ? indexedResults.filter((result) => matchesQuery(result.searchableText, trimmedQuery))
    : indexedResults;

  return [
    {
      title: trimmedQuery ? "快速入口" : "常用入口",
      results: trimResults(
        SHORTCUT_RESULTS.filter((result) =>
          trimmedQuery ? matchesQuery(result.searchableText, trimmedQuery) : true
        ),
        trimmedQuery ? 4 : 4
      ),
    },
    {
      title: "客戶",
      results: trimResults(
        matchingResults.filter((result) => result.kind === "client"),
        trimmedQuery ? 6 : 4
      ),
    },
    {
      title: "對話與演練",
      results: trimResults(
        matchingResults.filter(
          (result) => result.kind === "spin" || result.kind === "theater"
        ),
        trimmedQuery ? 6 : 4
      ),
    },
    {
      title: "報告",
      results: trimResults(
        matchingResults.filter((result) => result.kind === "report"),
        trimmedQuery ? 6 : 4
      ),
    },
  ];
}

function trimResults(results: SearchResult[], limit: number) {
  return results.slice(0, limit);
}

function matchesQuery(searchableText: string, query: string) {
  const haystack = normalizeSearchText(searchableText);
  const needle = normalizeSearchText(query);
  return haystack.includes(needle);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_/.,，。:：()（）]+/g, "");
}

function clientToResult(client: Client): SearchResult {
  const tags = [...client.tags, ...client.aiTags].join(" ");
  return {
    id: `client-${client.id}`,
    kind: "client",
    href: `/crm/${client.id}`,
    title: client.name,
    subtitle: [client.occupation, client.email, client.phone].filter(Boolean).join(" · "),
    meta: CLIENT_STATUS_LABELS[client.status],
    icon: Users,
    searchableText: [
      client.name,
      client.email,
      client.phone,
      client.occupation,
      CLIENT_STATUS_LABELS[client.status],
      tags,
      client.family.map((member) => member.name).join(" "),
      client.existingPolicies.map((policy) => `${policy.provider} ${policy.type}`).join(" "),
    ].join(" "),
  };
}

function spinSessionToResult(session: SpinSession): SearchResult {
  const phaseLabel = SPIN_PHASE_LABELS[session.phase];
  const insights = [
    ...(session.summary?.keyInsights ?? []),
    ...(session.summary?.keyProblems ?? []),
    ...(session.summary?.suggestedActions ?? []),
  ].join(" ");

  return {
    id: `spin-${session.id}`,
    kind: "spin",
    href: `/spin/${session.id}`,
    title: `${session.clientName} 的 AI 了解客戶`,
    subtitle: `SPIN ${phaseLabel} 階段 · ${formatDate(session.updatedAt)}`,
    meta: "對話",
    icon: MessageSquare,
    searchableText: [
      session.id,
      session.clientName,
      session.mode,
      session.phase,
      phaseLabel,
      insights,
      Object.values(session.outputs).flat().join(" "),
    ].join(" "),
  };
}

function theaterSessionToResult(session: TheaterSession): SearchResult {
  const personaLabel = THEATER_PERSONA_LABELS[session.personaType];
  const statusLabel = THEATER_STATUS_LABELS[session.status];

  return {
    id: `theater-${session.id}`,
    kind: "theater",
    href: `/theater/${session.id}`,
    title: `${session.clientName} 的 AI 劇場演練`,
    subtitle: `${personaLabel} · ${statusLabel} · 張力 ${session.tension}`,
    meta: "演練",
    icon: Sparkles,
    searchableText: [
      session.id,
      session.clientName,
      session.personaType,
      personaLabel,
      session.difficulty,
      statusLabel,
      session.spinSessionId,
    ].join(" "),
  };
}

function reportToResult(report: Report): SearchResult {
  const searchableReport = report as SearchableReport;
  const purposeLabel = searchableReport.purpose
    ? REPORT_PURPOSE_LABELS[searchableReport.purpose] ?? "決策報告"
    : "決策報告";
  const firstSection = report.sections[0]?.title ?? searchableReport.goal ?? "客戶決策報告";

  return {
    id: `report-${report.id}`,
    kind: "report",
    href: `/reports/${report.id}`,
    title: `${report.clientName} · ${purposeLabel}`,
    subtitle: `${firstSection} · ${formatDate(report.updatedAt)}`,
    meta: "報告",
    icon: FileText,
    searchableText: [
      report.id,
      report.clientId,
      report.clientName,
      purposeLabel,
      searchableReport.goal,
      report.spinSessionId,
      report.theaterSessionId,
      searchableReport.interviewSessionId,
      report.sections.map((section) => `${section.title} ${section.content}`).join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function formatDate(isoString: string) {
  return isoString.slice(0, 10);
}
