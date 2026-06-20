"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useClientRelatedLists } from "@/components/crm/use-client-related-lists";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientTimelineRelatedListItem } from "@/domains/client/related-lists";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarPlus,
  CheckSquare,
  FileText,
  Info,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Share2,
  Theater,
} from "lucide-react";
import {
  CompactMetric,
  EmptyRelatedState,
  RecordSubpageHeader,
} from "../_components/record-subpage-ui";

const eventMeta: Record<string, { label: string; icon: React.ElementType; tone: string }> = {
  CLIENT: { label: "客戶", icon: Info, tone: "text-muted-foreground" },
  POLICY: { label: "保單", icon: ShieldCheck, tone: "text-primary" },
  VISIT: { label: "拜訪", icon: CalendarPlus, tone: "text-primary" },
  SPIN: { label: "AI 了解客戶", icon: MessageSquare, tone: "text-primary" },
  THEATER: { label: "AI 劇場", icon: Theater, tone: "text-foreground" },
  REPORT: { label: "報告", icon: FileText, tone: "text-foreground" },
  SHARE_OPEN: { label: "分享", icon: Share2, tone: "text-primary" },
  TASK: { label: "任務", icon: CheckSquare, tone: "text-foreground" },
  SYSTEM: { label: "系統", icon: Info, tone: "text-muted-foreground" },
  COMPLIANCE: { label: "合規", icon: ShieldCheck, tone: "text-primary" },
};

export default function ClientTimelinePage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { data, isLoading, error } = useClientRelatedLists(clientId);
  const events = data?.lists.timeline.items ?? [];
  const latestEvent = events[0];
  const typeLabels = data?.lists.timeline.summary.typeLabels ?? [];

  if (!data && isLoading) {
    return (
      <EmptyRelatedState
        icon={Loader2}
        title="載入活動 related-list"
        description="正在彙整客戶、保單、拜訪、報告與互動事件。"
      />
    );
  }

  if (!data && error) {
    return (
      <EmptyRelatedState
        icon={AlertTriangle}
        title="活動時間軸暫時無法讀取"
        description="請稍後重試；目前先不顯示可能過期的本機活動暫存。"
      />
    );
  }

  return (
    <div className="space-y-5">
      <RecordSubpageHeader
        eyebrow="Activity feed"
        title="活動時間軸"
        description="把 SPIN、劇場演練、報告與分享開啟紀錄收成同一條可掃描的客戶活動流。"
        action={
          <Link
            href={`/pre-visit?clientId=${clientId}&autoCreate=true`}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
          >
            <CalendarPlus className="h-4 w-4" strokeWidth={1.5} />
            安排下一次拜訪
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric label="活動數" value={`${events.length} 筆`} helper="目前客戶互動紀錄" />
        <CompactMetric
          label="最近活動"
          value={latestEvent ? formatDate(latestEvent.occurredAt, "MM/dd") : "--"}
          helper={latestEvent?.title ?? "尚無活動"}
        />
        <CompactMetric
          label="事件類型"
          value={`${typeLabels.length} 類`}
          helper={typeLabels.join("、") || "待建立"}
        />
      </div>

      {events.length === 0 ? (
        <EmptyRelatedState
          icon={Info}
          title="尚無互動紀錄"
          description="當此客戶完成 SPIN、劇場演練或報告分享後，活動會自動出現在這裡。"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-hairline">
              {events.map((event) => (
                <TimelineRow key={event.id} event={event} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TimelineRow({ event }: { event: ClientTimelineRelatedListItem }) {
  const meta = eventMeta[event.type] ?? { label: event.label, icon: Info, tone: "text-muted-foreground" };
  const Icon = meta.icon;

  return (
    <article className="grid gap-3 px-5 py-4 transition-colors hover:bg-paper-2/60 md:grid-cols-[132px_minmax(0,1fr)_96px]">
      <time className="text-sm font-semibold text-foreground tabular-nums">
        {formatDate(event.occurredAt, "MM/dd HH:mm")}
      </time>
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
          <Icon className={cn("h-4 w-4", meta.tone)} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.description}</p>
        </div>
      </div>
      <div className="flex items-start justify-start md:justify-end">
        <Badge variant="secondary" className="h-6 text-[11px]">
          {meta.label}
        </Badge>
      </div>
    </article>
  );
}
