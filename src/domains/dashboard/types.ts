export type DashboardSource = "database";
export type DashboardVisibility = "member-scoped";

export type DashboardPriority = "HIGH" | "MEDIUM" | "LOW";
export type DashboardTaskKind = "ISSUE" | "VISIT" | "REPORT" | "COMPLIANCE";
export type DashboardActivityKind =
  | "SPIN"
  | "THEATER"
  | "REPORT"
  | "SHARE_OPEN"
  | "VISIT"
  | "TASK"
  | "SYSTEM"
  | "COMPLIANCE";

export interface DashboardActionDto {
  label: string;
  href: string;
}

export interface DashboardEvidenceDto {
  label: string;
  text: string;
  source: string;
}

export interface DashboardTodayMainlineDto {
  label: string;
  title: string;
  summary: string;
  priority: DashboardPriority;
  primaryAction: DashboardActionDto;
  supportItems: Array<{
    label: string;
    value: string;
    kind: "time" | "gap" | "signal";
  }>;
  reasoning: {
    facts: DashboardEvidenceDto[];
    inferences: DashboardEvidenceDto[];
    unknowns: DashboardEvidenceDto[];
  };
}

export interface DashboardKpiDto {
  id: "readyVisits" | "activeClients" | "openIssues" | "sharedReports";
  title: string;
  value: number;
  unit: string;
  detail: string;
  trend: string;
  href: string;
}

export interface DashboardScanDto {
  label: string;
  value: string;
  href: string;
}

export interface DashboardTaskDto {
  id: string;
  kind: DashboardTaskKind;
  title: string;
  clientId?: string;
  clientName?: string;
  dueLabel: string;
  priority: DashboardPriority;
  href: string;
  sourceReferences: DashboardEvidenceDto[];
}

export interface DashboardActivityDto {
  id: string;
  kind: DashboardActivityKind;
  title: string;
  description: string;
  clientId?: string;
  clientName?: string;
  occurredAt: string;
}

export interface DashboardAgendaItemDto {
  id: string;
  title: string;
  clientName: string;
  timeLabel: string;
  statusLabel: string;
  href: string;
}

export interface DashboardInsightDto {
  id: string;
  label: string;
  text: string;
  href: string;
  priority: DashboardPriority;
}

export interface DashboardAiQuotaSummaryDto {
  used: number;
  quota: number;
  remaining: number;
  percentUsed: number;
  periodLabel: string;
  totalCallsThisMonth: number;
  totalTokensThisMonth: number;
  moduleCounts: Partial<Record<"CHAT" | "INTERVIEW" | "MEETING" | "SPIN" | "THEATER" | "VISIT" | "REPORT" | "RAG", number>>;
}

export interface MemberDashboardDto {
  generatedAt: string;
  source: DashboardSource;
  visibility: DashboardVisibility;
  viewer: {
    name: string;
    role: string;
    organizationName: string;
  };
  today: DashboardTodayMainlineDto;
  kpis: DashboardKpiDto[];
  scans: DashboardScanDto[];
  tasks: DashboardTaskDto[];
  recentActivity: DashboardActivityDto[];
  agenda: DashboardAgendaItemDto[];
  insights: DashboardInsightDto[];
  aiQuota: DashboardAiQuotaSummaryDto;
}
