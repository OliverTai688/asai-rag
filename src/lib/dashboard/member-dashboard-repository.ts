import type { Prisma } from "@/generated/prisma/client";
import {
  ClientStatus,
  ReportStatus,
  VisitPlanStatus,
} from "@/generated/prisma/enums";
import type {
  DashboardActivityDto,
  DashboardActivityKind,
  DashboardAgendaItemDto,
  DashboardAiQuotaSummaryDto,
  DashboardInsightDto,
  DashboardKpiDto,
  DashboardPriority,
  DashboardScanDto,
  DashboardTaskDto,
  DashboardTodayMainlineDto,
  MemberDashboardDto,
} from "@/domains/dashboard/types";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// 客戶超過此天數未互動即視為「待跟進」，作為業務員的下一步行動訊號。
const FOLLOW_UP_STALE_DAYS = 30;

const dashboardClientSelect = {
  id: true,
  name: true,
  occupation: true,
  annualIncome: true,
  status: true,
  sensitivity: true,
  lastInteractionAt: true,
  updatedAt: true,
  createdAt: true,
  complianceChecklist: {
    select: {
      kycStatus: true,
      suitabilityStatus: true,
      consentStatus: true,
      missingItems: true,
      reviewedAt: true,
    },
  },
  _count: {
    select: {
      familyMembers: true,
      policies: true,
      visitPlans: true,
      reports: true,
    },
  },
} as const;

const dashboardVisitSelect = {
  id: true,
  clientId: true,
  purpose: true,
  status: true,
  scheduledAt: true,
  updatedAt: true,
  objectives: true,
  spinQuestions: true,
  client: {
    select: {
      id: true,
      name: true,
      organizationId: true,
      ownerId: true,
      status: true,
    },
  },
} as const;

const dashboardReportSelect = {
  id: true,
  clientId: true,
  title: true,
  status: true,
  updatedAt: true,
  client: {
    select: {
      id: true,
      name: true,
      organizationId: true,
      ownerId: true,
      status: true,
    },
  },
} as const;

const dashboardActivitySelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  occurredAt: true,
  clientId: true,
  client: {
    select: {
      id: true,
      name: true,
      ownerId: true,
      organizationId: true,
    },
  },
} as const;

const dashboardAiUsageSelect = {
  module: true,
  totalTokens: true,
} as const;

type DashboardClientRecord = Prisma.ClientGetPayload<{ select: typeof dashboardClientSelect }>;
type DashboardVisitRecord = Prisma.VisitPlanGetPayload<{ select: typeof dashboardVisitSelect }>;
type DashboardReportRecord = Prisma.ReportGetPayload<{ select: typeof dashboardReportSelect }>;
type DashboardActivityRecord = Prisma.InteractionEventGetPayload<{ select: typeof dashboardActivitySelect }>;
type DashboardAiUsageRecord = Prisma.AiUsageLogGetPayload<{ select: typeof dashboardAiUsageSelect }>;

const VISIT_STATUS_LABELS: Record<VisitPlanStatus, string> = {
  DRAFT: "待準備",
  READY: "可拜訪",
  COMPLETED: "已完成",
  ARCHIVED: "已封存",
};

export async function getMemberDashboardForSession(session: AppSession): Promise<MemberDashboardDto> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const clientWhere = {
    organizationId: session.organization.id,
    ownerId: session.user.id,
    status: { not: ClientStatus.ARCHIVED },
  } satisfies Prisma.ClientWhereInput;

  const [clients, visits, reports, recentEvents, aiUsageRows] = await prisma.$transaction([
    prisma.client.findMany({
      where: clientWhere,
      select: dashboardClientSelect,
      orderBy: [{ lastInteractionAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
    }),
    prisma.visitPlan.findMany({
      where: {
        organizationId: session.organization.id,
        status: { not: VisitPlanStatus.ARCHIVED },
        client: clientWhere,
      },
      select: dashboardVisitSelect,
      orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }],
      take: 100,
    }),
    prisma.report.findMany({
      where: {
        organizationId: session.organization.id,
        status: { not: ReportStatus.ARCHIVED },
        client: clientWhere,
      },
      select: dashboardReportSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.interactionEvent.findMany({
      where: {
        organizationId: session.organization.id,
        OR: [
          { actorId: session.user.id },
          {
            client: {
              organizationId: session.organization.id,
              ownerId: session.user.id,
              status: { not: ClientStatus.ARCHIVED },
            },
          },
        ],
      },
      select: dashboardActivitySelect,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.aiUsageLog.findMany({
      where: {
        organizationId: session.organization.id,
        userId: session.user.id,
        createdAt: { gte: monthStart },
      },
      select: dashboardAiUsageSelect,
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const tasks = buildTaskQueue(now, clients, visits, reports);
  const aiQuota = buildAiQuotaSummary(session, now, aiUsageRows);

  return {
    generatedAt: now.toISOString(),
    source: "database",
    visibility: "member-scoped",
    viewer: {
      name: session.user.name,
      role: session.membership.role,
      organizationName: session.organization.name,
    },
    today: buildTodayMainline(now, tasks, clients, visits),
    kpis: buildKpis(now, clients, visits, reports),
    scans: buildScans(now, clients, visits, reports),
    tasks,
    recentActivity: recentEvents.map(toActivityDto),
    agenda: buildAgenda(visits),
    insights: buildInsights(tasks, clients, aiQuota),
    aiQuota,
  };
}

function buildKpis(
  now: Date,
  clients: DashboardClientRecord[],
  visits: DashboardVisitRecord[],
  reports: DashboardReportRecord[],
): DashboardKpiDto[] {
  const activeClients = clients.filter((client) => client.status === ClientStatus.ACTIVE).length;
  const prospectClients = clients.filter((client) => client.status === ClientStatus.PROSPECT).length;
  const readyVisits = visits.filter((visit) => visit.status === VisitPlanStatus.READY).length;
  const draftVisits = visits.filter((visit) => visit.status === VisitPlanStatus.DRAFT).length;
  const followUpClients = clients.filter((client) => isStaleFollowUp(client, now)).length;
  const sharedReports = reports.filter((report) => report.status === ReportStatus.SHARED).length;
  const draftReports = reports.filter((report) => report.status === ReportStatus.DRAFT).length;

  return [
    {
      id: "readyVisits",
      title: "準備包",
      value: readyVisits,
      unit: "份",
      detail: `${draftVisits} 份待補`,
      trend: readyVisits > 0 ? "可拜訪" : "待建立",
      href: "/pre-visit",
    },
    {
      id: "activeClients",
      title: "客戶池",
      value: activeClients,
      unit: "人",
      detail: `${prospectClients} 位潛客`,
      trend: `${clients.length} 筆`,
      href: "/crm",
    },
    {
      id: "followUps",
      title: "待跟進",
      value: followUpClients,
      unit: "人",
      detail: `逾 ${FOLLOW_UP_STALE_DAYS} 天未聯繫`,
      trend: followUpClients > 0 ? "需接觸" : "都在追蹤",
      href: "/crm",
    },
    {
      id: "sharedReports",
      title: "已分享",
      value: sharedReports,
      unit: "份",
      detail: `${draftReports} 份草稿`,
      trend: reports.length > 0 ? "報告庫" : "待產出",
      href: "/reports",
    },
  ];
}

// 同一位客戶只保留第一筆（呼叫端已先排序），避免累積的重複 demo 資料
// 讓首頁任務列出現多筆相同客戶、相同標題的雜訊。
function dedupeByClient<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function buildTaskQueue(
  now: Date,
  clients: DashboardClientRecord[],
  visits: DashboardVisitRecord[],
  reports: DashboardReportRecord[],
): DashboardTaskDto[] {
  const visitTasks = dedupeByClient(
    visits.filter((visit) => visit.status === VisitPlanStatus.DRAFT || visit.status === VisitPlanStatus.READY),
    (visit) => visit.clientId,
  )
    .slice(0, 5)
    .map((visit): DashboardTaskDto => {
      const spinQuestionCount = Array.isArray(visit.spinQuestions) ? visit.spinQuestions.length : 0;
      const isReady = visit.status === VisitPlanStatus.READY;

      return {
        id: `visit:${visit.id}`,
        kind: "VISIT",
        title: isReady ? `${visit.client.name} 的準備包可進劇場演練` : `${visit.client.name} 的拜訪準備包待補齊`,
        clientId: visit.clientId,
        clientName: visit.client.name,
        dueLabel: formatDueLabel(visit.scheduledAt),
        priority: isReady ? "HIGH" : "MEDIUM",
        href: `/pre-visit/${visit.id}`,
        sourceReferences: [
          {
            label: "準備包狀態",
            text: VISIT_STATUS_LABELS[visit.status],
            source: "VisitPlan.status",
          },
          {
            label: "問題清單",
            text: `${spinQuestionCount} 題已保存`,
            source: "VisitPlan.spinQuestions",
          },
        ],
      };
    });

  const reportTasks = dedupeByClient(
    reports.filter((report) => report.status === ReportStatus.DRAFT || report.status === ReportStatus.SHARED),
    (report) => report.clientId,
  )
    .slice(0, 4)
    .map((report): DashboardTaskDto => ({
      id: `report:${report.id}`,
      kind: "REPORT",
      title:
        report.status === ReportStatus.SHARED
          ? `${report.client.name} 的報告已分享，安排追蹤`
          : `${report.client.name} 的報告草稿待整理`,
      clientId: report.clientId,
      clientName: report.client.name,
      dueLabel: report.status === ReportStatus.SHARED ? "追蹤回覆" : "草稿",
      priority: report.status === ReportStatus.SHARED ? "MEDIUM" : "LOW",
      href: `/reports/${report.id}`,
      sourceReferences: [
        {
          label: "報告狀態",
          text: report.status,
          source: "Report.status",
        },
      ],
    }));

  const complianceTasks = clients
    .filter((client) => hasComplianceGap(client))
    .slice(0, 4)
    .map((client): DashboardTaskDto => ({
      id: `client-compliance:${client.id}`,
      kind: "COMPLIANCE",
      title: `${client.name} 的 KYC / 適合度資料待確認`,
      clientId: client.id,
      clientName: client.name,
      dueLabel: "合規缺口",
      priority: client.sensitivity === "HIGHLY_SENSITIVE" ? "HIGH" : "MEDIUM",
      href: `/crm/${client.id}`,
      sourceReferences: [
        {
          label: "合規狀態",
          text: [
            `KYC ${client.complianceChecklist?.kycStatus ?? "MISSING"}`,
            `適合度 ${client.complianceChecklist?.suitabilityStatus ?? "MISSING"}`,
            `同意 ${client.complianceChecklist?.consentStatus ?? "MISSING"}`,
          ].join(" / "),
          source: "Client.complianceChecklist",
        },
      ],
    }));

  const followUpTasks = clients
    .filter((client) => isStaleFollowUp(client, now))
    .slice(0, 4)
    .map((client): DashboardTaskDto => {
      const days = daysSinceInteraction(client, now);
      const contactedLabel = days === null ? "尚未有互動紀錄" : `已 ${days} 天未聯繫`;

      return {
        id: `follow-up:${client.id}`,
        kind: "FOLLOW_UP",
        title: `${client.name} ${contactedLabel}，安排下一次接觸`,
        clientId: client.id,
        clientName: client.name,
        dueLabel: "待跟進",
        priority: client.status === ClientStatus.ACTIVE ? "MEDIUM" : "LOW",
        href: `/crm/${client.id}`,
        sourceReferences: [
          {
            label: "最近互動",
            text: contactedLabel,
            source: "Client.lastInteractionAt",
          },
          {
            label: "客戶狀態",
            text: `${client.status} / ${client._count.policies} 張保單`,
            source: "Client.status / Client._count",
          },
        ],
      };
    });

  return [...visitTasks, ...reportTasks, ...complianceTasks, ...followUpTasks]
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
    .slice(0, 8);
}

function buildTodayMainline(
  now: Date,
  tasks: DashboardTaskDto[],
  clients: DashboardClientRecord[],
  visits: DashboardVisitRecord[],
): DashboardTodayMainlineDto {
  const topTask = tasks[0];

  if (topTask) {
    return {
      label: "今日主線",
      title: topTask.title,
      summary: buildMainlineSummary(topTask),
      priority: topTask.priority,
      primaryAction: { label: toPrimaryActionLabel(topTask.kind), href: topTask.href },
      supportItems: [
        { label: "優先級", value: toPriorityLabel(topTask.priority), kind: "signal" },
        { label: "期限", value: topTask.dueLabel, kind: "time" },
        { label: "來源", value: toTaskKindLabel(topTask.kind), kind: "gap" },
      ],
      reasoning: {
        facts: topTask.sourceReferences.slice(0, 2),
        inferences: [
          {
            label: "下一步推論",
            text: `${toTaskKindLabel(topTask.kind)} 是目前最接近可行動的訊號，先處理可降低今日工作切換成本。`,
            source: "member-dashboard task ranking",
          },
        ],
        unknowns: [
          {
            label: "仍待確認",
            text: "AI 不會假設客戶已同意下一步，顧問仍需在實際聯繫前確認狀態與時間。",
            source: "advisor confirmation boundary",
          },
        ],
      },
    };
  }

  const activeClient = clients.find((client) => client.status === ClientStatus.ACTIVE) ?? clients[0];
  const readyVisitCount = visits.filter((visit) => visit.status === VisitPlanStatus.READY).length;
  const followUpCount = clients.filter((client) => isStaleFollowUp(client, now)).length;

  return {
    label: "今日主線",
    title: activeClient ? `${activeClient.name} 客戶資料已同步，選一個下一步` : "先建立第一位客戶",
    summary: activeClient
      ? "目前沒有高優先待辦。建議從準備包、關係圖或報告草稿中選一個可完成的下一步。"
      : "Dashboard 尚無 owner-scoped client 資料。先新增客戶，再建立關係圖與拜訪準備包。",
    priority: "LOW",
    primaryAction: activeClient
      ? { label: "查看客戶工作台", href: `/crm/${activeClient.id}` }
      : { label: "新增客戶", href: "/crm" },
    supportItems: [
      { label: "準備包", value: `${readyVisitCount} 份可用`, kind: "signal" },
      { label: "待跟進", value: `${followUpCount} 人`, kind: "gap" },
      { label: "客戶池", value: `${clients.length} 人`, kind: "signal" },
    ],
    reasoning: {
      facts: [
        {
          label: "客戶資料來源",
          text: `${clients.length} 筆 owner-scoped client record。`,
          source: "Client.ownerId",
        },
      ],
      inferences: [
        {
          label: "低切換下一步",
          text: "沒有高優先任務時，先補一個客戶工作流缺口比開新戰線更穩。",
          source: "member-dashboard fallback ranking",
        },
      ],
      unknowns: [
        {
          label: "待顧問選擇",
          text: "系統尚不知道你今天想先推進拜訪、報告或關係圖。",
          source: "advisor intent",
        },
      ],
    },
  };
}

function buildScans(
  now: Date,
  clients: DashboardClientRecord[],
  visits: DashboardVisitRecord[],
  reports: DashboardReportRecord[],
): DashboardScanDto[] {
  const relationshipGaps = clients.filter((client) => client._count.familyMembers === 0).length;
  const readyVisits = visits.filter((visit) => visit.status === VisitPlanStatus.READY).length;
  const sharedReports = reports.filter((report) => report.status === ReportStatus.SHARED).length;
  const followUpClients = clients.filter((client) => isStaleFollowUp(client, now)).length;

  return [
    { label: "關係圖", value: `${relationshipGaps} 位客戶尚未建立關係圖`, href: "/crm" },
    { label: "拜訪準備", value: `${readyVisits} 份準備包可直接使用`, href: "/pre-visit" },
    { label: "報告追蹤", value: `${sharedReports} 份報告已分享`, href: "/reports" },
    { label: "待跟進客戶", value: `${followUpClients} 位逾 ${FOLLOW_UP_STALE_DAYS} 天未聯繫`, href: "/crm" },
  ];
}

function buildAgenda(visits: DashboardVisitRecord[]): DashboardAgendaItemDto[] {
  const sorted = visits
    .filter((visit) => visit.status !== VisitPlanStatus.COMPLETED)
    .slice()
    .sort((a, b) => nullableDateTime(a.scheduledAt) - nullableDateTime(b.scheduledAt));

  return dedupeByClient(sorted, (visit) => visit.clientId)
    .slice(0, 5)
    .map((visit) => ({
      id: visit.id,
      title: visit.status === VisitPlanStatus.READY ? "拜訪準備包可用" : "準備包待完成",
      clientName: visit.client.name,
      timeLabel: formatDueLabel(visit.scheduledAt),
      statusLabel: VISIT_STATUS_LABELS[visit.status],
      href: `/pre-visit/${visit.id}`,
    }));
}

function buildInsights(
  tasks: DashboardTaskDto[],
  clients: DashboardClientRecord[],
  quota: DashboardAiQuotaSummaryDto,
): DashboardInsightDto[] {
  const topTask = tasks[0];
  const complianceGaps = clients.filter(hasComplianceGap).length;

  return [
    {
      id: "next-task",
      label: topTask ? toPriorityLabel(topTask.priority) : "低噪音",
      text: topTask
        ? `${topTask.title}。先完成這一步，再決定是否需要進準備包或演練。`
        : "目前沒有高優先 task queue 訊號，可以先整理關係圖或建立下一份準備包。",
      href: topTask?.href ?? "/crm",
      priority: topTask?.priority ?? "LOW",
    },
    {
      id: "compliance",
      label: complianceGaps > 0 ? "合規缺口" : "合規掃描",
      text: complianceGaps > 0 ? `${complianceGaps} 位客戶仍有 KYC / 適合度 / 同意狀態待補。` : "目前 owner-scoped 客戶沒有新的合規缺口 task。",
      href: "/crm",
      priority: complianceGaps > 0 ? "MEDIUM" : "LOW",
    },
    {
      id: "quota",
      label: "AI 額度",
      text:
        quota.percentUsed >= 80
          ? `本月已使用 ${quota.used}/${quota.quota}，剩餘 ${quota.remaining}（低於 20%），建議購買加值以免中斷。`
          : `本月已使用 ${quota.used}/${quota.quota}，剩餘 ${quota.remaining}。`,
      href: "/settings",
      priority: quota.percentUsed >= 80 ? "HIGH" : "LOW",
    },
  ];
}

function buildAiQuotaSummary(
  session: AppSession,
  now: Date,
  usageRows: DashboardAiUsageRecord[],
): DashboardAiQuotaSummaryDto {
  const quota = Math.max(0, session.organization.monthlyAiQuota || session.planCapability.monthlyAiQuota || 0);
  const used = Math.max(0, session.organization.monthlyAiUsed);
  const remaining = Math.max(0, quota - used);
  const moduleCounts: DashboardAiQuotaSummaryDto["moduleCounts"] = {};

  for (const row of usageRows) {
    moduleCounts[row.module] = (moduleCounts[row.module] ?? 0) + 1;
  }

  return {
    used,
    quota,
    remaining,
    percentUsed: quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0,
    periodLabel: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    totalCallsThisMonth: usageRows.length,
    totalTokensThisMonth: usageRows.reduce((total, row) => total + (row.totalTokens ?? 0), 0),
    moduleCounts,
  };
}

function toActivityDto(record: DashboardActivityRecord): DashboardActivityDto {
  return {
    id: record.id,
    kind: record.type as DashboardActivityKind,
    title: record.title,
    description: record.description,
    clientId: record.clientId ?? undefined,
    clientName: record.client?.name,
    occurredAt: record.occurredAt.toISOString(),
  };
}

function priorityWeight(priority: DashboardPriority): number {
  if (priority === "HIGH") return 3;
  if (priority === "MEDIUM") return 2;
  return 1;
}

function toPriorityLabel(priority: DashboardPriority): string {
  if (priority === "HIGH") return "高優先";
  if (priority === "MEDIUM") return "中優先";
  return "低優先";
}

function toTaskKindLabel(kind: DashboardTaskDto["kind"]): string {
  if (kind === "FOLLOW_UP") return "跟進";
  if (kind === "VISIT") return "準備包";
  if (kind === "REPORT") return "報告";
  return "合規";
}

function toPrimaryActionLabel(kind: DashboardTaskDto["kind"]): string {
  if (kind === "FOLLOW_UP") return "安排接觸";
  if (kind === "VISIT") return "打開準備包";
  if (kind === "REPORT") return "查看報告";
  return "補齊資料";
}

function buildMainlineSummary(task: DashboardTaskDto): string {
  const references = task.sourceReferences.map((item) => item.text).filter(Boolean).slice(0, 2).join("；");
  return references
    ? `${references}。先完成這一步，再決定是否進拜訪準備或劇場演練。`
    : "此項目來自 server-owned task queue，先處理可降低今日工作風險。";
}

function daysSinceInteraction(client: DashboardClientRecord, now: Date): number | null {
  if (!client.lastInteractionAt) return null;

  const diff = now.getTime() - client.lastInteractionAt.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function isStaleFollowUp(client: DashboardClientRecord, now: Date): boolean {
  if (client.status === ClientStatus.ARCHIVED) return false;

  const days = daysSinceInteraction(client, now);
  return days === null || days >= FOLLOW_UP_STALE_DAYS;
}

function hasComplianceGap(client: DashboardClientRecord): boolean {
  const checklist = client.complianceChecklist;
  if (!checklist) return true;

  return (
    checklist.kycStatus !== "COMPLETE" ||
    checklist.suitabilityStatus !== "COMPLETE" ||
    checklist.consentStatus !== "COMPLETE" ||
    checklist.missingItems.length > 0
  );
}

function nullableDateTime(value: Date | null): number {
  return value?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function formatDueLabel(value: Date | null): string {
  if (!value) return "未排程";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const time = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;

  if (diffDays === 0) return `今日 ${time}`;
  if (diffDays === 1) return `明日 ${time}`;
  if (diffDays === -1) return `昨日 ${time}`;

  return `${value.getMonth() + 1}/${value.getDate()} ${time}`;
}
