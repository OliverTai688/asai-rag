export type OrgAggregateSource = "database";
export type OrgAggregateVisibility = "org-aggregate";

export interface OrgAggregateOrganizationDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface OrgAggregateScopeDto {
  role: string;
  unitIds: string[];
  scopedToManagedUnits: boolean;
}

export interface OrgAggregateUnitDto {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
}

export interface OrgOverviewUnitHealthDto extends OrgAggregateUnitDto {
  memberCount: number;
  clientCount: number;
  visitPlanCount: number;
  reportCount: number;
  aiUsageCount: number;
}

export interface OrgOverviewMemberHealthDto {
  memberId: string;
  displayName: string;
  role: string;
  status: string;
  primaryUnitId: string | null;
  clientCount: number;
  visitPlanCount: number;
  spinSessionCount: number;
  theaterSessionCount: number;
  reportCount: number;
  aiUsageCount: number;
  needsCoaching: boolean;
}

export interface OrgOverviewDto {
  source: OrgAggregateSource;
  visibility: OrgAggregateVisibility;
  generatedAt: string;
  organization: OrgAggregateOrganizationDto;
  scope: OrgAggregateScopeDto;
  totals: {
    members: number;
    activeMembers: number;
    units: number;
    clients: number;
    visitPlans: number;
    reports: number;
    aiUsageThisMonth: number;
  };
  coaching: {
    visitPlansReady: number;
    spinCompleted: number;
    theaterCompleted: number;
    reportsReady: number;
    membersNeedingCoaching: number;
  };
  unitHealth: OrgOverviewUnitHealthDto[];
  memberHealth: OrgOverviewMemberHealthDto[];
}

export interface OrgCountGroupDto<T extends string | null = string | null> {
  key: T;
  count: number;
}

export interface OrgCoachingMemberDto {
  membershipId: string;
  userId: string;
  displayName: string;
  role: string;
  title: string | null;
  userStatus: string;
  lastActiveAt: string | null;
  unit: Omit<OrgAggregateUnitDto, "parentId"> | null;
  metrics: {
    visitPlans: number;
    readyVisitPlans: number;
    visitReadinessRate: number;
    spinSessions: number;
    completedSpinSessions: number;
    spinCompletionRate: number;
    theaterSessions: number;
    completedTheaterSessions: number;
    theaterCompletionRate: number;
    reports: number;
    readyReports: number;
    reportReadinessRate: number;
  };
  needsCoaching: boolean;
  recommendedFocus: {
    key: string;
    label: string;
  };
}

export interface OrgCoachingDto {
  source: OrgAggregateSource;
  visibility: OrgAggregateVisibility;
  generatedAt: string;
  organization: OrgAggregateOrganizationDto;
  scope: OrgAggregateScopeDto;
  totals: {
    members: number;
    units: number;
    visitPlans: number;
    spinSessions: number;
    theaterSessions: number;
    reports: number;
  };
  completion: {
    visitReadinessRate: number;
    visitCompletionRate: number;
    spinCompletionRate: number;
    theaterCompletionRate: number;
    reportReadinessRate: number;
    reportShareRate: number;
  };
  blockers: {
    visitPlanStatuses: OrgCountGroupDto[];
    activeSpinPhases: OrgCountGroupDto[];
    theaterPersonaLoad: OrgCountGroupDto[];
    theaterHighTensionCount: number;
  };
  recommendations: Array<{
    key: string;
    label: string;
    affectedMembers: number;
  }>;
  memberCoaching: OrgCoachingMemberDto[];
}

export interface OrgAiUsageDto {
  source: OrgAggregateSource;
  visibility: OrgAggregateVisibility;
  generatedAt: string;
  organization: OrgAggregateOrganizationDto;
  scope: OrgAggregateScopeDto & {
    periodStart: string;
  };
  totals: {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    averageLatencyMs: number;
  };
  byModule: Array<{
    module: string;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    averageLatencyMs: number;
    errorCount: number;
  }>;
  byProvider: Array<{
    provider: string;
    requests: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
  byMember: Array<{
    userId: string | null;
    displayName: string;
    role: string | null;
    title: string | null;
    userStatus: string | null;
    unit: Omit<OrgAggregateUnitDto, "parentId"> | null;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    averageLatencyMs: number;
  }>;
  byUnit: Array<{
    unitId: string | null;
    name: string;
    type: string | null;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    averageLatencyMs: number;
  }>;
}

export interface OrgTeamMemberQueueDto {
  id: string;
  name: string;
  role: string;
  region: string;
  avatar: string;
  stats: {
    closedThisMonth: number;
    revenue: number;
    spinSessions: number;
    visitPlans: {
      total: number;
      completed: number;
      draft: number;
    };
    aiInsightHits: number;
  };
  signal: {
    completionRate: number;
    riskScore: number;
    reason: string;
    nextAction: string;
    status: string;
  };
}

export interface OrgTeamDashboardDto {
  source: OrgAggregateSource;
  visibility: OrgAggregateVisibility;
  generatedAt: string;
  organization: OrgAggregateOrganizationDto;
  scope: OrgAggregateScopeDto;
  units: Array<{
    id: string;
    label: string;
    members: number;
    risk: string;
  }>;
  seats: {
    used: number;
    limit: number;
    pendingInvites: number;
    collaboratorLimit: number;
  };
  aiUsage: {
    used: number;
    quota: number;
    coachingPrompts: number;
    theaterSessions: number;
  };
  totals: {
    planCoverage: number;
    draftPlans: number;
    insights: number;
    membersNeedingCoaching: number;
  };
  coachingQueue: OrgTeamMemberQueueDto[];
  trainingActions: Array<{
    title: string;
    owner: string;
    timing: string;
    detail: string;
  }>;
}
