import type {
  Client as DbClient,
  ComplianceChecklist as DbComplianceChecklist,
  FamilyMember as DbFamilyMember,
  InteractionEvent as DbInteractionEvent,
  Policy as DbPolicy,
  Prisma,
  Report as DbReport,
  ReportShare as DbReportShare,
  VisitPlan as DbVisitPlan,
} from "@/generated/prisma/client";
import { ClientStatus, ReportStatus, VisitPlanStatus } from "@/generated/prisma/enums";
import type {
  ClientGapAnalysisRelatedList,
  ClientPolicyRelatedList,
  ClientPolicyRelatedListItem,
  ClientRelatedListsDto,
  ClientReportRelatedList,
  ClientReportRelatedListItem,
  ClientTimelineRelatedList,
  ClientTimelineRelatedListItem,
  RelatedListFactStatus,
  RelatedListPriority,
  RelatedListSourceReference,
} from "@/domains/client/related-lists";
import type { ClientComplianceChecklist } from "@/domains/client/types";
import { DEFAULT_CLIENT_COMPLIANCE } from "@/domains/client/types";
import { canReadClientDetail } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type ClientRelatedListsRecord = DbClient & {
  complianceChecklist: DbComplianceChecklist | null;
  familyMembers: DbFamilyMember[];
  policies: DbPolicy[];
  visitPlans: DbVisitPlan[];
  reports: Array<DbReport & { shares: Pick<DbReportShare, "id" | "accessCount" | "lastAccessedAt">[] }>;
  interactionEvents: DbInteractionEvent[];
};

export type ClientRelatedListsResult =
  | { status: "OK"; data: ClientRelatedListsDto }
  | { status: "FORBIDDEN" }
  | { status: "NOT_FOUND" };

const RELATED_LIST_INCLUDE = {
  complianceChecklist: true,
  familyMembers: {
    orderBy: { createdAt: "asc" },
  },
  policies: {
    orderBy: [{ expiresAt: "asc" }, { updatedAt: "desc" }],
  },
  visitPlans: {
    where: { status: { not: VisitPlanStatus.ARCHIVED } },
    orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }],
    take: 12,
  },
  reports: {
    where: { status: { not: ReportStatus.ARCHIVED } },
    include: {
      shares: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          accessCount: true,
          lastAccessedAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
  },
  interactionEvents: {
    orderBy: { occurredAt: "desc" },
    take: 20,
  },
} satisfies Prisma.ClientInclude;

const TIMELINE_LABELS: Record<string, string> = {
  CLIENT: "客戶",
  POLICY: "保單",
  VISIT: "拜訪",
  REPORT: "報告",
  SPIN: "AI 了解客戶",
  THEATER: "AI 劇場",
  SHARE_OPEN: "分享",
  TASK: "任務",
  SYSTEM: "系統",
  COMPLIANCE: "合規",
};

export async function getClientRelatedListsForMember(
  session: AppSession,
  clientId: string,
): Promise<ClientRelatedListsResult> {
  const record = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    include: RELATED_LIST_INCLUDE,
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  if (!canReadClientDetail(session, record)) {
    return { status: "FORBIDDEN" };
  }

  const typedRecord = record as ClientRelatedListsRecord;
  const complianceChecklist = toComplianceDto(typedRecord.complianceChecklist);
  const policies = buildPolicyRelatedList(typedRecord.policies);
  const reports = buildReportRelatedList(typedRecord.reports);
  const timeline = buildTimelineRelatedList(typedRecord);
  const gapAnalysis = buildGapAnalysisRelatedList(typedRecord, policies.items);

  return {
    status: "OK",
    data: {
      client: {
        id: typedRecord.id,
        name: typedRecord.name,
        status: typedRecord.status === ClientStatus.ARCHIVED ? "CLOSED" : typedRecord.status,
        occupation: typedRecord.occupation ?? "",
        annualIncome: decimalToNumber(typedRecord.annualIncome),
        familyCount: typedRecord.familyMembers.length,
        policyCount: typedRecord.policies.length,
        sensitivityLevel: typedRecord.sensitivity,
        kycStatus: complianceChecklist.kycStatus,
        complianceChecklist,
      },
      lists: {
        policies,
        timeline,
        reports,
        gapAnalysis,
      },
      sourceSummary: {
        generatedAt: new Date().toISOString(),
        counts: {
          familyMembers: typedRecord.familyMembers.length,
          policies: policies.items.length,
          visitPlans: typedRecord.visitPlans.length,
          reports: reports.items.length,
          timelineEvents: timeline.items.length,
          gapItems: gapAnalysis.items.length,
        },
        provider: "none",
        noProviderReason: "Deterministic CRM related-list DTO; no OpenAI/Anthropic provider route invoked.",
      },
    },
  };
}

function buildPolicyRelatedList(records: DbPolicy[]): ClientPolicyRelatedList {
  const items = records.map(toPolicyRelatedListItem);
  const totalInsuredAmount = items.reduce((sum, item) => sum + item.insuredAmount, 0);

  return {
    summary: {
      count: items.length,
      totalInsuredAmount,
      largestInsuredAmount: items.reduce((largest, item) => Math.max(largest, item.insuredAmount), 0),
      activeCount: items.filter((item) => item.status === "ACTIVE").length,
      unknownStatusCount: items.filter((item) => item.status === "UNKNOWN").length,
    },
    items,
  };
}

function toPolicyRelatedListItem(record: DbPolicy): ClientPolicyRelatedListItem {
  const label = record.productName || record.category;

  return {
    id: record.id,
    category: record.category,
    productName: label,
    provider: record.provider,
    insuredAmount: decimalToNumber(record.insuredAmount),
    premium: decimalToNumber(record.premium),
    currency: record.currency,
    status: record.status,
    effectiveDate: toIso(record.effectiveDate),
    expiresAt: toIso(record.expiresAt),
    source: sourceReference({
      id: record.id,
      source: "policy",
      factStatus: "FACT",
      label,
      detail: `${record.provider}・${record.category}`,
    }),
  };
}

function buildReportRelatedList(records: ClientRelatedListsRecord["reports"]): ClientReportRelatedList {
  const items = records.map(toReportRelatedListItem);

  return {
    summary: {
      count: items.length,
      sharedCount: items.filter((item) => item.isShared || item.status === "SHARED").length,
      readyCount: items.filter((item) => item.status === "READY" || item.status === "SHARED").length,
      latestUpdatedAt: items[0]?.updatedAt,
    },
    items,
  };
}

function toReportRelatedListItem(
  record: DbReport & { shares: Pick<DbReportShare, "id" | "accessCount" | "lastAccessedAt">[] },
): ClientReportRelatedListItem {
  const internalSectionCount = countJsonArray(record.internalSections);
  const clientSectionCount = countJsonArray(record.clientSections);
  const latestShare = record.shares[0];

  return {
    id: record.id,
    title: record.title,
    status: record.status,
    version: record.version,
    sectionCount: internalSectionCount || clientSectionCount,
    clientSectionCount,
    isShared: Boolean(latestShare) || record.status === ReportStatus.SHARED,
    shareAccessCount: latestShare?.accessCount ?? 0,
    visitPlanId: record.visitPlanId ?? undefined,
    spinSessionId: record.spinSessionId ?? undefined,
    theaterSessionId: record.theaterSessionId ?? undefined,
    interviewSessionId: record.interviewSessionId ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    source: sourceReference({
      id: record.id,
      source: "report",
      factStatus: "FACT",
      label: record.title,
      detail: `${record.status}・V${record.version}`,
    }),
  };
}

function buildTimelineRelatedList(record: ClientRelatedListsRecord): ClientTimelineRelatedList {
  const items: ClientTimelineRelatedListItem[] = [
    {
      id: `client-created-${record.id}`,
      type: "CLIENT",
      label: TIMELINE_LABELS.CLIENT,
      title: "客戶資料建立",
      description: `${record.name} 已建立為 CRM 客戶。`,
      occurredAt: record.createdAt.toISOString(),
      source: sourceReference({
        id: record.id,
        source: "client_profile",
        factStatus: "FACT",
        label: "CRM 客戶資料",
        detail: "由 clients.createdAt 產生。",
      }),
    },
    ...record.policies.map((policy) => ({
      id: `policy-${policy.id}`,
      type: "POLICY",
      label: TIMELINE_LABELS.POLICY,
      title: `保單盤點：${policy.productName || policy.category}`,
      description: `${policy.provider}・${formatAmount(decimalToNumber(policy.insuredAmount), policy.currency)}`,
      occurredAt: policy.createdAt.toISOString(),
      source: sourceReference({
        id: policy.id,
        source: "policy",
        factStatus: "FACT",
        label: policy.productName || policy.category,
        detail: "由 policies.createdAt 產生。",
      }),
    })),
    ...record.visitPlans.map((visit) => ({
      id: `visit-${visit.id}`,
      type: "VISIT",
      label: TIMELINE_LABELS.VISIT,
      title: toVisitTitle(visit),
      description: toVisitDescription(visit),
      occurredAt: (visit.scheduledAt ?? visit.updatedAt).toISOString(),
      source: sourceReference({
        id: visit.id,
        source: "visit",
        factStatus: "FACT",
        label: toVisitTitle(visit),
        detail: `status=${visit.status}`,
      }),
    })),
    ...record.reports.map((report) => ({
      id: `report-${report.id}`,
      type: "REPORT",
      label: TIMELINE_LABELS.REPORT,
      title: `報告更新：${report.title}`,
      description: `${report.status}・V${report.version}`,
      occurredAt: report.updatedAt.toISOString(),
      source: sourceReference({
        id: report.id,
        source: "report",
        factStatus: "FACT",
        label: report.title,
        detail: "由 reports.updatedAt 產生，不含報告內文。",
      }),
    })),
    ...record.interactionEvents.map((event) => ({
      id: `event-${event.id}`,
      type: event.type,
      label: TIMELINE_LABELS[event.type] ?? event.type,
      title: event.title,
      description: event.description,
      occurredAt: event.occurredAt.toISOString(),
      source: sourceReference({
        id: event.id,
        source: "timeline",
        factStatus: "FACT",
        label: event.title,
        detail: `interaction_events.${event.type}`,
      }),
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const uniqueTypes = Array.from(new Set(items.map((item) => item.label)));

  return {
    summary: {
      count: items.length,
      latestAt: items[0]?.occurredAt,
      typeLabels: uniqueTypes,
    },
    items: items.slice(0, 30),
  };
}

function buildGapAnalysisRelatedList(
  record: ClientRelatedListsRecord,
  policies: ClientPolicyRelatedListItem[],
): ClientGapAnalysisRelatedList {
  const annualIncome = decimalToNumber(record.annualIncome);
  const dependentCount = record.familyMembers.filter((member) => isDependentRelation(member.relation)).length;
  const baselineIncome = annualIncome > 0 ? annualIncome : 1_000_000;
  const categories = [
    {
      id: "death-protection",
      category: "身故保障",
      currentCoverage: sumCoverage(policies, ["壽", "身故", "life", "death", "定期"]),
      suggestedCoverage: Math.max(baselineIncome * 8 + dependentCount * 2_000_000, 5_000_000),
      rationale: dependentCount > 0
        ? "家庭責任仍在，先以年收入與扶養人數估算身故保障基準。"
        : "缺少扶養資訊時，以年收入倍數先建立身故保障討論基準。",
      evidence: [
        incomeEvidence(record.id, annualIncome),
        familyEvidence(record.familyMembers.length, dependentCount),
      ],
    },
    {
      id: "critical-illness",
      category: "重大疾病",
      currentCoverage: sumCoverage(policies, ["重大", "癌", "醫療", "illness", "cancer", "health"]),
      suggestedCoverage: Math.max(baselineIncome * 1.5, 2_000_000),
      rationale: "用重大疾病與醫療支出風險先抓可討論缺口，避免直接跳到商品。",
      evidence: [incomeEvidence(record.id, annualIncome), policyEvidence(policies, "重大疾病/醫療")],
    },
    {
      id: "disability",
      category: "意外身障",
      currentCoverage: sumCoverage(policies, ["意外", "失能", "disability", "accident"]),
      suggestedCoverage: Math.max(baselineIncome * 4, 3_000_000),
      rationale: "失能風險通常影響收入持續性，先用年收入倍數估算保障討論範圍。",
      evidence: [incomeEvidence(record.id, annualIncome), policyEvidence(policies, "意外/失能")],
    },
    {
      id: "long-term-care",
      category: "長照保障",
      currentCoverage: sumCoverage(policies, ["長照", "long-term", "care"]),
      suggestedCoverage: Math.max(baselineIncome * 2, 2_000_000),
      rationale: "長照資訊多半需要現場確認，先列為未知與第二階段討論題。",
      evidence: [policyEvidence(policies, "長照"), complianceEvidence(record.complianceChecklist)],
    },
  ];

  const items = categories.map((item) => {
    const suggestedCoverage = Math.round(item.suggestedCoverage);
    const gap = Math.max(0, suggestedCoverage - item.currentCoverage);
    const completionRate = suggestedCoverage > 0
      ? Math.min(100, Math.round((item.currentCoverage / suggestedCoverage) * 100))
      : 100;

    return {
      ...item,
      suggestedCoverage,
      gap,
      completionRate,
      priority: toGapPriority(completionRate, item.evidence),
    };
  });

  const totalCurrentCoverage = items.reduce((sum, item) => sum + item.currentCoverage, 0);
  const totalSuggestedCoverage = items.reduce((sum, item) => sum + item.suggestedCoverage, 0);
  const totalGap = Math.max(0, totalSuggestedCoverage - totalCurrentCoverage);

  return {
    summary: {
      totalCurrentCoverage,
      totalSuggestedCoverage,
      totalGap,
      completionRate: totalSuggestedCoverage > 0 ? Math.round((totalCurrentCoverage / totalSuggestedCoverage) * 100) : 100,
      urgentCount: items.filter((item) => item.priority === "HIGH").length,
      unknownCount: items.filter((item) => item.evidence.some((evidence) => evidence.factStatus === "UNKNOWN")).length,
    },
    items,
  };
}

function sumCoverage(policies: ClientPolicyRelatedListItem[], keywords: string[]): number {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  return policies.reduce((sum, policy) => {
    const text = `${policy.category} ${policy.productName}`.toLowerCase();
    return normalizedKeywords.some((keyword) => text.includes(keyword)) ? sum + policy.insuredAmount : sum;
  }, 0);
}

function incomeEvidence(clientId: string, annualIncome: number): RelatedListSourceReference {
  if (annualIncome <= 0) {
    return sourceReference({
      id: `${clientId}-annual-income-unknown`,
      source: "client_profile",
      factStatus: "UNKNOWN",
      label: "年收入待確認",
      detail: "CRM 尚未有可用年收入，缺口建議使用保守基準。",
    });
  }

  return sourceReference({
    id: `${clientId}-annual-income`,
    source: "client_profile",
    factStatus: "FACT",
    label: "年收入",
    detail: `CRM 已記錄年收入 ${formatAmount(annualIncome, "TWD")}。`,
  });
}

function familyEvidence(familyCount: number, dependentCount: number): RelatedListSourceReference {
  if (familyCount === 0) {
    return sourceReference({
      id: "family-unknown",
      source: "family",
      factStatus: "UNKNOWN",
      label: "家庭責任待確認",
      detail: "關係圖尚無家庭成員，需在拜訪中確認扶養與決策人。",
    });
  }

  return sourceReference({
    id: "family-count",
    source: "family",
    factStatus: dependentCount > 0 ? "FACT" : "INFERENCE",
    label: "關係圖",
    detail: dependentCount > 0 ? `已記錄 ${dependentCount} 位晚輩/扶養相關成員。` : `已記錄 ${familyCount} 位關係人，扶養責任仍需確認。`,
  });
}

function policyEvidence(
  policies: ClientPolicyRelatedListItem[],
  label: string,
): RelatedListSourceReference {
  return sourceReference({
    id: `policy-${label}`,
    source: "policy",
    factStatus: policies.length > 0 ? "FACT" : "UNKNOWN",
    label,
    detail: policies.length > 0 ? `已從 ${policies.length} 張保單盤點推導。` : "尚無保單盤點，需先補現有保障。",
  });
}

function complianceEvidence(record: DbComplianceChecklist | null): RelatedListSourceReference {
  const checklist = toComplianceDto(record);
  const missing = checklist.missingItems.join("、") || "無";

  return sourceReference({
    id: "compliance-checklist",
    source: "compliance",
    factStatus: checklist.missingItems.length > 0 ? "UNKNOWN" : "FACT",
    label: "合規待補",
    detail: checklist.missingItems.length > 0 ? `待補：${missing}` : "KYC / 適合度 / 同意狀態已有紀錄。",
  });
}

function toGapPriority(
  completionRate: number,
  evidence: RelatedListSourceReference[],
): RelatedListPriority {
  if (completionRate < 50) return "HIGH";
  if (completionRate < 75 || evidence.some((item) => item.factStatus === "UNKNOWN")) return "MEDIUM";
  return "LOW";
}

function isDependentRelation(relation: string): boolean {
  return ["子", "女", "孫", "外孫", "姪", "甥"].some((keyword) => relation.includes(keyword));
}

function sourceReference(input: {
  id: string;
  source: RelatedListSourceReference["source"];
  factStatus: RelatedListFactStatus;
  label: string;
  detail: string;
}): RelatedListSourceReference {
  return input;
}

function toComplianceDto(record: DbComplianceChecklist | null): ClientComplianceChecklist {
  if (!record) {
    return DEFAULT_CLIENT_COMPLIANCE;
  }

  return {
    kycStatus: record.kycStatus,
    suitabilityStatus: record.suitabilityStatus,
    consentStatus: record.consentStatus,
    missingItems: record.missingItems,
    reviewedAt: record.reviewedAt?.toISOString(),
  };
}

function toVisitTitle(visit: DbVisitPlan): string {
  if (visit.status === VisitPlanStatus.READY) return "拜訪準備包已完成";
  if (visit.status === VisitPlanStatus.COMPLETED) return "拜訪已完成";
  return "拜訪準備包草稿";
}

function toVisitDescription(visit: DbVisitPlan): string {
  const scheduled = visit.scheduledAt ? `・${visit.scheduledAt.toISOString().slice(0, 10)}` : "";
  return `${visit.purpose}${scheduled}`;
}

function countJsonArray(value: Prisma.JsonValue | null): number {
  return Array.isArray(value) ? value.length : 0;
}

function decimalToNumber(value: Prisma.Decimal | null): number {
  if (!value) return 0;
  return Number(value.toString());
}

function toIso(value: Date | null): string | undefined {
  return value?.toISOString();
}

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
