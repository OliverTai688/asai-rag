"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Flag,
  MessageSquare,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdvisorIssueDto,
  AdvisorIssueEvidenceItem,
  AdvisorIssueListDto,
  AdvisorIssuePriority,
  AdvisorIssueStatus,
} from "@/domains/issues/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<AdvisorIssueStatus, { label: string; className: string; icon: typeof AlertCircle }> = {
  OPEN: { label: "待處理", className: "border-red-200 bg-red-50 text-red-700", icon: AlertCircle },
  IN_PROGRESS: { label: "處理中", className: "border-sky-200 bg-sky-50 text-sky-700", icon: Clock },
  RESOLVED: { label: "已解決", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  CLOSED: { label: "已結案", className: "border-zinc-200 bg-zinc-50 text-zinc-700", icon: Flag },
};

const PRIORITY_META: Record<AdvisorIssuePriority, { label: string; className: string }> = {
  LOW: { label: "低", className: "text-zinc-500" },
  MEDIUM: { label: "中", className: "text-amber-700" },
  HIGH: { label: "高", className: "text-red-700" },
  URGENT: { label: "緊急", className: "text-red-800" },
};

interface IssuesPageClientProps {
  initialIssues: AdvisorIssueListDto;
}

export function IssuesPageClient({ initialIssues }: IssuesPageClientProps) {
  const [issueList, setIssueList] = useState(initialIssues);
  const [selectedIssueId, setSelectedIssueId] = useState(initialIssues.issues[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const visibleIssues = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return issueList.issues;

    return issueList.issues.filter((issue) => {
      const text = [
        issue.title,
        issue.description,
        issue.category,
        issue.reporterName,
        issue.assigneeName ?? "",
        issue.feedback ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [issueList.issues, searchQuery]);

  const selectedIssue =
    issueList.issues.find((issue) => issue.id === selectedIssueId) ??
    visibleIssues[0] ??
    issueList.issues[0] ??
    null;
  const feedbackDraft = selectedIssue
    ? feedbackDrafts[selectedIssue.id] ?? selectedIssue.feedback ?? ""
    : "";

  async function refreshIssues() {
    setIsRefreshing(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/issues", { cache: "no-store" });
      const body = (await response.json()) as AdvisorIssueListDto & { message?: string };

      if (!response.ok) {
        setErrorMessage(body.message ?? "議題同步失敗，請稍後再試。");
        return;
      }

      setIssueList(body);
      setSelectedIssueId((current) =>
        body.issues.some((issue) => issue.id === current) ? current : body.issues[0]?.id ?? "",
      );
    } catch {
      setErrorMessage("議題同步失敗，請稍後再試。");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function updateIssue(issue: AdvisorIssueDto, action: "IN_PROGRESS" | "RESOLVED" | "FEEDBACK") {
    const actionKey = `${issue.id}:${action}`;
    setUpdatingAction(actionKey);
    setErrorMessage("");

    const payload =
      action === "FEEDBACK"
        ? { feedback: feedbackDraft }
        : {
            status: action,
            feedback: feedbackDraft,
            assignment: action === "IN_PROGRESS" && !issue.actionState.assignedToMe ? "SELF" : undefined,
          };

    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { issue?: AdvisorIssueDto; message?: string };

      if (!response.ok || !body.issue) {
        setErrorMessage(body.message ?? "議題更新失敗，請稍後再試。");
        return;
      }

      const updatedIssue = body.issue;
      setIssueList((current) => ({
        ...current,
        issues: current.issues.map((item) => (item.id === updatedIssue.id ? updatedIssue : item)),
        generatedAt: new Date().toISOString(),
      }));
      setFeedbackDrafts((current) => ({
        ...current,
        [updatedIssue.id]: updatedIssue.feedback ?? "",
      }));
      setSelectedIssueId(updatedIssue.id);
    } catch {
      setErrorMessage("議題更新失敗，請稍後再試。");
    } finally {
      setUpdatingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            已同步・{formatDateTime(issueList.generatedAt)}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">議題工作台</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              追蹤回報、處理狀態、推論依據與下一步，避免重要問題停在口頭提醒。
            </p>
          </div>
        </div>
        <Button onClick={refreshIssues} disabled={isRefreshing} className="h-11 px-5">
          <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
          重新整理
        </Button>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.35fr)]">
        <section className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜尋議題、回報人或處理回覆"
              className="h-11 border-hairline bg-paper pl-10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="space-y-3 lg:max-h-[calc(100vh-290px)] lg:overflow-y-auto lg:pr-1">
            {visibleIssues.map((issue) => (
              <IssueListItem
                key={issue.id}
                issue={issue}
                selected={selectedIssue?.id === issue.id}
                onSelect={() => setSelectedIssueId(issue.id)}
              />
            ))}

            {visibleIssues.length === 0 && (
              <Card className="border-dashed border-hairline bg-paper">
                <CardContent className="space-y-2 p-6 text-center">
                  <p className="text-sm font-semibold text-ink">目前沒有符合條件的議題</p>
                  <p className="text-xs text-muted-foreground">調整搜尋字詞或重新整理後再檢查。</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section>
          {selectedIssue ? (
            <IssueDetail
              issue={selectedIssue}
              feedbackDraft={feedbackDraft}
              updatingAction={updatingAction}
              onFeedbackChange={(value) =>
                setFeedbackDrafts((current) => ({ ...current, [selectedIssue.id]: value }))
              }
              onUpdate={updateIssue}
            />
          ) : (
            <Card className="border-hairline bg-paper">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                尚無議題資料。
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function IssueListItem({
  issue,
  selected,
  onSelect,
}: {
  issue: AdvisorIssueDto;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = STATUS_META[issue.status];
  const priority = PRIORITY_META[issue.priority];
  const StatusIcon = status.icon;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`查看議題：${issue.title}`}
      className={cn(
        "cursor-pointer border-hairline bg-paper transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected && "border-ink bg-muted/30",
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline" className={cn("gap-1 rounded-full px-2.5 py-1 text-xs", status.className)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </Badge>
          <span className={cn("text-xs font-semibold", priority.className)}>
            {priority.label}優先
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{issue.title}</h2>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{issue.description}</p>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{issue.reporterName}</span>
          </span>
          <span>{formatDate(issue.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function IssueDetail({
  issue,
  feedbackDraft,
  updatingAction,
  onFeedbackChange,
  onUpdate,
}: {
  issue: AdvisorIssueDto;
  feedbackDraft: string;
  updatingAction: string | null;
  onFeedbackChange: (value: string) => void;
  onUpdate: (issue: AdvisorIssueDto, action: "IN_PROGRESS" | "RESOLVED" | "FEEDBACK") => void;
}) {
  const status = STATUS_META[issue.status];
  const priority = PRIORITY_META[issue.priority];

  return (
    <Card className="border-hairline bg-paper">
      <CardHeader className="border-b border-hairline p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("rounded-full px-3 py-1", status.className)}>
                {status.label}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {issue.category}
              </Badge>
              <span className={cn("text-xs font-semibold", priority.className)}>
                {priority.label}優先
              </span>
            </div>
            <CardTitle className="max-w-3xl text-2xl font-semibold leading-tight text-ink">
              {issue.title}
            </CardTitle>
          </div>
          <div className="rounded-md border border-hairline px-3 py-2 text-left text-xs text-muted-foreground md:text-right">
            <div>內部成熟度 L{issue.internalReadiness.level}</div>
            <div className="font-semibold text-ink">{issue.internalReadiness.label}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="space-y-3">
            <div className="text-sm leading-relaxed text-ink">{issue.description}</div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>回報：{issue.reporterName}</span>
              <span>承辦：{issue.assigneeName ?? "尚未指派"}</span>
              <span>更新：{formatDateTime(issue.updatedAt)}</span>
            </div>
          </div>
          <div className="rounded-md border border-hairline p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">下一步</p>
            <p className="mt-2 text-sm font-semibold text-ink">{issue.nextAction.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{issue.nextAction.description}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <EvidenceColumn title="已知事實" items={issue.evidence.facts} />
          <EvidenceColumn title="推論判讀" items={issue.evidence.inferences} />
          <EvidenceColumn title="待確認" items={issue.evidence.unknowns} />
        </div>

        {issue.internalReadiness.missingDimensions.length > 0 && (
          <div className="rounded-md border border-hairline bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">仍需補齊</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {issue.internalReadiness.missingDimensions.map((item) => (
                <Badge key={item} variant="outline" className="rounded-full">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 border-t border-hairline pt-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-ink">處理回覆</h3>
          </div>
          <Textarea
            value={feedbackDraft}
            onChange={(event) => onFeedbackChange(event.target.value)}
            placeholder="輸入目前判斷、需要補的資料或處理進度"
            className="min-h-28 border-hairline bg-background"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="h-11 flex-1"
              disabled={updatingAction === `${issue.id}:FEEDBACK`}
              onClick={() => onUpdate(issue, "FEEDBACK")}
            >
              儲存回覆
            </Button>
            <Button
              className="h-11 flex-1"
              disabled={updatingAction === `${issue.id}:IN_PROGRESS` || issue.status === "IN_PROGRESS"}
              onClick={() => onUpdate(issue, "IN_PROGRESS")}
            >
              標記處理中
            </Button>
            <Button
              variant="monoOutline"
              className="h-11 flex-1"
              disabled={updatingAction === `${issue.id}:RESOLVED` || issue.status === "RESOLVED"}
              onClick={() => onUpdate(issue, "RESOLVED")}
            >
              標記已解決
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceColumn({ title, items }: { title: string; items: AdvisorIssueEvidenceItem[] }) {
  return (
    <div className="rounded-md border border-hairline p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="space-y-1">
              <p className="text-sm font-semibold text-ink">{item.label}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p>
              <p className="text-[11px] text-muted-foreground/70">{item.source}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">目前沒有此類 evidence。</p>
        )}
      </div>
    </div>
  );
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(dateIso: string) {
  const date = new Date(dateIso);
  const datePart = formatDate(dateIso);
  const timePart = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${datePart} ${timePart}`;
}
