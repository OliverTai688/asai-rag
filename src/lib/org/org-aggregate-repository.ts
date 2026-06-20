import type { Prisma } from "@/generated/prisma/client";
import type {
  OrgAggregateOrganizationDto,
  OrgAggregateScopeDto,
  OrgAiUsageDto,
  OrgCoachingDto,
  OrgCountGroupDto,
  OrgOverviewDto,
  OrgTeamDashboardDto,
  OrgTeamMemberQueueDto,
} from "@/domains/org/types";
import { canReadOrgAggregate } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type ScopedUnitFilter = { in: string[] };

interface OrgAggregateScope {
  organizationId: string;
  unitId?: ScopedUnitFilter;
}

interface RecommendedFocus {
  key: string;
  label: string;
  gap: number;
}

export class OrgAggregateForbiddenError extends Error {
  constructor() {
    super("Org aggregate access is forbidden for the current session.");
    this.name = "OrgAggregateForbiddenError";
  }
}

export function getOrgAggregateScope(session: AppSession): OrgAggregateScope {
  const scope: OrgAggregateScope = { organizationId: session.organization.id };

  if (session.membership.role === "MANAGER" && session.membership.managedUnitIds.length > 0) {
    scope.unitId = { in: session.membership.managedUnitIds };
  }

  return scope;
}

export function assertCanReadOrgAggregate(session: AppSession, scope = getOrgAggregateScope(session)) {
  const allowed = scope.unitId
    ? scope.unitId.in.every((unitId) =>
        canReadOrgAggregate(session, { organizationId: session.organization.id, unitId }),
      )
    : canReadOrgAggregate(session, { organizationId: session.organization.id });

  if (!allowed) {
    throw new OrgAggregateForbiddenError();
  }
}

export async function getOrgOverviewForSession(session: AppSession): Promise<OrgOverviewDto> {
  const scope = getOrgAggregateScope(session);
  assertCanReadOrgAggregate(session, scope);

  const monthStart = getMonthStart();
  const [
    units,
    memberships,
    clientCount,
    visitPlanCount,
    readyVisitPlanCount,
    reportCount,
    readyReportCount,
    spinCompletedCount,
    theaterCompletedCount,
    aiUsageThisMonth,
  ] = await Promise.all([
    prisma.organizationUnit.findMany({
      where: {
        organizationId: session.organization.id,
        isActive: true,
        ...(scope.unitId ? { id: scope.unitId } : {}),
      },
      select: { id: true, name: true, type: true, parentId: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.organizationMember.findMany({
      where: {
        organizationId: session.organization.id,
        status: "ACTIVE",
        ...(scope.unitId ? { primaryUnitId: scope.unitId } : {}),
      },
      select: {
        id: true,
        role: true,
        primaryUnitId: true,
        user: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.client.count({ where: { ...scope, status: { not: "ARCHIVED" } } }),
    prisma.visitPlan.count({ where: scope }),
    prisma.visitPlan.count({ where: { ...scope, status: { in: ["READY", "COMPLETED"] } } }),
    prisma.report.count({ where: scope }),
    prisma.report.count({ where: { ...scope, status: { in: ["READY", "SHARED"] } } }),
    prisma.spinSession.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.theaterSession.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.aiUsageLog.count({
      where: {
        ...scope,
        createdAt: { gte: monthStart },
      },
    }),
  ]);

  const [unitCounts, memberCounts] = await Promise.all([
    Promise.all(
      units.map(async (unit) => {
        const unitScope = { organizationId: session.organization.id, unitId: unit.id };
        const [members, clients, visitPlans, reports, aiUsage] = await Promise.all([
          prisma.organizationMember.count({
            where: {
              organizationId: session.organization.id,
              primaryUnitId: unit.id,
              status: "ACTIVE",
            },
          }),
          prisma.client.count({ where: { ...unitScope, status: { not: "ARCHIVED" } } }),
          prisma.visitPlan.count({ where: unitScope }),
          prisma.report.count({ where: unitScope }),
          prisma.aiUsageLog.count({ where: unitScope }),
        ]);

        return {
          unitId: unit.id,
          name: unit.name,
          type: unit.type,
          parentId: unit.parentId,
          memberCount: members,
          clientCount: clients,
          visitPlanCount: visitPlans,
          reportCount: reports,
          aiUsageCount: aiUsage,
        };
      }),
    ),
    Promise.all(
      memberships.map(async (membership) => {
        const memberScope = {
          organizationId: session.organization.id,
          ownerId: membership.user.id,
          ...(scope.unitId ? { unitId: scope.unitId } : {}),
        };
        const usageScope = {
          organizationId: session.organization.id,
          userId: membership.user.id,
          ...(scope.unitId ? { unitId: scope.unitId } : {}),
        };
        const [clients, visitPlans, spinSessions, theaterSessions, reports, aiUsage] = await Promise.all([
          prisma.client.count({ where: { ...memberScope, status: { not: "ARCHIVED" } } }),
          prisma.visitPlan.count({ where: memberScope }),
          prisma.spinSession.count({ where: memberScope }),
          prisma.theaterSession.count({ where: memberScope }),
          prisma.report.count({ where: memberScope }),
          prisma.aiUsageLog.count({ where: usageScope }),
        ]);

        return {
          memberId: membership.user.id,
          displayName: membership.user.name,
          role: membership.role,
          status: membership.user.status,
          primaryUnitId: membership.primaryUnitId,
          clientCount: clients,
          visitPlanCount: visitPlans,
          spinSessionCount: spinSessions,
          theaterSessionCount: theaterSessions,
          reportCount: reports,
          aiUsageCount: aiUsage,
          needsCoaching: visitPlans === 0 || reports === 0 || spinSessions === 0,
        };
      }),
    ),
  ]);

  return {
    source: "database",
    visibility: "org-aggregate",
    generatedAt: new Date().toISOString(),
    organization: toOrganizationDto(session),
    scope: toScopeDto(session, scope),
    totals: {
      members: memberships.length,
      activeMembers: memberships.filter((membership) => membership.user.status === "ACTIVE").length,
      units: units.length,
      clients: clientCount,
      visitPlans: visitPlanCount,
      reports: reportCount,
      aiUsageThisMonth,
    },
    coaching: {
      visitPlansReady: readyVisitPlanCount,
      spinCompleted: spinCompletedCount,
      theaterCompleted: theaterCompletedCount,
      reportsReady: readyReportCount,
      membersNeedingCoaching: memberCounts.filter((member) => member.needsCoaching).length,
    },
    unitHealth: unitCounts.map((unit) => ({
      id: unit.unitId,
      name: unit.name,
      type: unit.type,
      parentId: unit.parentId,
      memberCount: unit.memberCount,
      clientCount: unit.clientCount,
      visitPlanCount: unit.visitPlanCount,
      reportCount: unit.reportCount,
      aiUsageCount: unit.aiUsageCount,
    })),
    memberHealth: memberCounts,
  };
}

export async function getOrgCoachingForSession(session: AppSession): Promise<OrgCoachingDto> {
  const scope = getOrgAggregateScope(session);
  assertCanReadOrgAggregate(session, scope);

  const [
    memberships,
    units,
    visitPlans,
    readyVisitPlans,
    completedVisitPlans,
    spinSessions,
    completedSpinSessions,
    theaterSessions,
    completedTheaterSessions,
    reports,
    readyReports,
    sharedReports,
    visitStatusGroups,
    spinPhaseGroups,
    theaterPersonaGroups,
    theaterHighTensionCount,
  ] = await Promise.all([
    prisma.organizationMember.findMany({
      where: {
        organizationId: session.organization.id,
        status: "ACTIVE",
        ...(scope.unitId ? { primaryUnitId: scope.unitId } : {}),
      },
      select: {
        id: true,
        userId: true,
        primaryUnitId: true,
        role: true,
        title: true,
        primaryUnit: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, name: true, status: true, lastLoginAt: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.organizationUnit.findMany({
      where: {
        organizationId: session.organization.id,
        isActive: true,
        ...(scope.unitId ? { id: scope.unitId } : {}),
      },
      select: { id: true, name: true, type: true, parentId: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.visitPlan.count({ where: scope }),
    prisma.visitPlan.count({ where: { ...scope, status: { in: ["READY", "COMPLETED"] } } }),
    prisma.visitPlan.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.spinSession.count({ where: scope }),
    prisma.spinSession.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.theaterSession.count({ where: scope }),
    prisma.theaterSession.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.report.count({ where: scope }),
    prisma.report.count({ where: { ...scope, status: { in: ["READY", "SHARED"] } } }),
    prisma.report.count({ where: { ...scope, status: "SHARED" } }),
    prisma.visitPlan.groupBy({
      by: ["status"],
      where: scope,
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.spinSession.groupBy({
      by: ["phase"],
      where: { ...scope, status: { not: "COMPLETED" } },
      _count: { _all: true },
      orderBy: { phase: "asc" },
    }),
    prisma.theaterSession.groupBy({
      by: ["personaType"],
      where: scope,
      _count: { _all: true },
      orderBy: { personaType: "asc" },
    }),
    prisma.theaterSession.count({ where: { ...scope, tension: { gte: 7 }, status: { not: "COMPLETED" } } }),
  ]);

  const memberCoaching = await Promise.all(
    memberships.map(async (membership) => {
      const memberScope = {
        organizationId: session.organization.id,
        ownerId: membership.userId,
        ...(scope.unitId ? { unitId: scope.unitId } : {}),
      };
      const [
        memberVisitPlans,
        memberReadyVisitPlans,
        memberSpinSessions,
        memberCompletedSpin,
        memberTheaterSessions,
        memberCompletedTheater,
        memberReports,
        memberReadyReports,
      ] = await Promise.all([
        prisma.visitPlan.count({ where: memberScope }),
        prisma.visitPlan.count({ where: { ...memberScope, status: { in: ["READY", "COMPLETED"] } } }),
        prisma.spinSession.count({ where: memberScope }),
        prisma.spinSession.count({ where: { ...memberScope, status: "COMPLETED" } }),
        prisma.theaterSession.count({ where: memberScope }),
        prisma.theaterSession.count({ where: { ...memberScope, status: "COMPLETED" } }),
        prisma.report.count({ where: memberScope }),
        prisma.report.count({ where: { ...memberScope, status: { in: ["READY", "SHARED"] } } }),
      ]);
      const focus = pickRecommendedFocus({
        readyVisitPlans: memberReadyVisitPlans,
        visitPlans: memberVisitPlans,
        completedSpin: memberCompletedSpin,
        spinSessions: memberSpinSessions,
        completedTheater: memberCompletedTheater,
        theaterSessions: memberTheaterSessions,
        readyReports: memberReadyReports,
        reports: memberReports,
      });

      return {
        membershipId: membership.id,
        userId: membership.user.id,
        displayName: membership.user.name,
        role: membership.role,
        title: membership.title,
        userStatus: membership.user.status,
        lastActiveAt: membership.user.lastLoginAt?.toISOString() ?? null,
        unit: membership.primaryUnit
          ? {
              id: membership.primaryUnit.id,
              name: membership.primaryUnit.name,
              type: membership.primaryUnit.type,
            }
          : null,
        metrics: {
          visitPlans: memberVisitPlans,
          readyVisitPlans: memberReadyVisitPlans,
          visitReadinessRate: ratio(memberReadyVisitPlans, memberVisitPlans),
          spinSessions: memberSpinSessions,
          completedSpinSessions: memberCompletedSpin,
          spinCompletionRate: ratio(memberCompletedSpin, memberSpinSessions),
          theaterSessions: memberTheaterSessions,
          completedTheaterSessions: memberCompletedTheater,
          theaterCompletionRate: ratio(memberCompletedTheater, memberTheaterSessions),
          reports: memberReports,
          readyReports: memberReadyReports,
          reportReadinessRate: ratio(memberReadyReports, memberReports),
        },
        needsCoaching: focus.key !== "maintain_momentum",
        recommendedFocus: {
          key: focus.key,
          label: focus.label,
        },
      };
    }),
  );

  const recommendationFocus = pickRecommendedFocus({
    readyVisitPlans,
    visitPlans,
    completedSpin: completedSpinSessions,
    spinSessions,
    completedTheater: completedTheaterSessions,
    theaterSessions,
    readyReports,
    reports,
  });

  return {
    source: "database",
    visibility: "org-aggregate",
    generatedAt: new Date().toISOString(),
    organization: toOrganizationDto(session),
    scope: toScopeDto(session, scope),
    totals: {
      members: memberships.length,
      units: units.length,
      visitPlans,
      spinSessions,
      theaterSessions,
      reports,
    },
    completion: {
      visitReadinessRate: ratio(readyVisitPlans, visitPlans),
      visitCompletionRate: ratio(completedVisitPlans, visitPlans),
      spinCompletionRate: ratio(completedSpinSessions, spinSessions),
      theaterCompletionRate: ratio(completedTheaterSessions, theaterSessions),
      reportReadinessRate: ratio(readyReports, reports),
      reportShareRate: ratio(sharedReports, reports),
    },
    blockers: {
      visitPlanStatuses: visitStatusGroups.map((group) => toCountGroup(group.status, group._count._all)),
      activeSpinPhases: spinPhaseGroups.map((group) => toCountGroup(group.phase, group._count._all)),
      theaterPersonaLoad: theaterPersonaGroups.map((group) => toCountGroup(group.personaType, group._count._all)),
      theaterHighTensionCount,
    },
    recommendations: [
      {
        key: recommendationFocus.key,
        label: recommendationFocus.label,
        affectedMembers: memberCoaching.filter((member) => member.needsCoaching).length,
      },
    ],
    memberCoaching,
  };
}

export async function getOrgAiUsageForSession(session: AppSession): Promise<OrgAiUsageDto> {
  const scope = getOrgAggregateScope(session);
  assertCanReadOrgAggregate(session, scope);

  const monthStart = getMonthStart();
  const usageScope = {
    ...scope,
    createdAt: { gte: monthStart },
  } satisfies Prisma.AiUsageLogWhereInput;

  const [totals, byModule, byMember, byUnit, byProvider, errorCounts, memberships, units] = await Promise.all([
    prisma.aiUsageLog.aggregate({
      where: usageScope,
      _count: { _all: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        latencyMs: true,
        costUsd: true,
      },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["module"],
      where: usageScope,
      _count: { _all: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        latencyMs: true,
        costUsd: true,
      },
      orderBy: { module: "asc" },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["userId"],
      where: { ...usageScope, userId: { not: null } },
      _count: { _all: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        latencyMs: true,
        costUsd: true,
      },
      orderBy: { userId: "asc" },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["unitId"],
      where: usageScope,
      _count: { _all: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        latencyMs: true,
        costUsd: true,
      },
      orderBy: { unitId: "asc" },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["provider"],
      where: usageScope,
      _count: { _all: true },
      _sum: {
        totalTokens: true,
        costUsd: true,
      },
      orderBy: { provider: "asc" },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["module"],
      where: { ...usageScope, error: { not: null } },
      _count: { _all: true },
      orderBy: { module: "asc" },
    }),
    prisma.organizationMember.findMany({
      where: {
        organizationId: session.organization.id,
        ...(scope.unitId ? { primaryUnitId: scope.unitId } : {}),
      },
      select: {
        userId: true,
        role: true,
        title: true,
        primaryUnitId: true,
        primaryUnit: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.organizationUnit.findMany({
      where: {
        organizationId: session.organization.id,
        isActive: true,
        ...(scope.unitId ? { id: scope.unitId } : {}),
      },
      select: { id: true, name: true, type: true },
    }),
  ]);

  const memberByUserId = new Map(memberships.map((membership) => [membership.userId, membership]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const errorCountByModule = new Map(errorCounts.map((group) => [group.module, group._count._all]));

  return {
    source: "database",
    visibility: "org-aggregate",
    generatedAt: new Date().toISOString(),
    organization: toOrganizationDto(session),
    scope: {
      ...toScopeDto(session, scope),
      periodStart: monthStart.toISOString(),
    },
    totals: {
      requests: totals._count._all,
      promptTokens: numberOrZero(totals._sum.promptTokens),
      completionTokens: numberOrZero(totals._sum.completionTokens),
      totalTokens: numberOrZero(totals._sum.totalTokens),
      estimatedCostUsd: decimalOrZero(totals._sum.costUsd),
      averageLatencyMs: average(numberOrZero(totals._sum.latencyMs), totals._count._all),
    },
    byModule: byModule.map((group) => ({
      module: group.module,
      requests: group._count._all,
      promptTokens: numberOrZero(group._sum.promptTokens),
      completionTokens: numberOrZero(group._sum.completionTokens),
      totalTokens: numberOrZero(group._sum.totalTokens),
      estimatedCostUsd: decimalOrZero(group._sum.costUsd),
      averageLatencyMs: average(numberOrZero(group._sum.latencyMs), group._count._all),
      errorCount: errorCountByModule.get(group.module) ?? 0,
    })),
    byProvider: byProvider.map((group) => ({
      provider: group.provider,
      requests: group._count._all,
      totalTokens: numberOrZero(group._sum.totalTokens),
      estimatedCostUsd: decimalOrZero(group._sum.costUsd),
    })),
    byMember: byMember.map((group) => {
      const membership = group.userId ? memberByUserId.get(group.userId) : null;

      return {
        userId: group.userId,
        displayName: membership?.user.name ?? "未指派",
        role: membership?.role ?? null,
        title: membership?.title ?? null,
        userStatus: membership?.user.status ?? null,
        unit: membership?.primaryUnit
          ? {
              id: membership.primaryUnit.id,
              name: membership.primaryUnit.name,
              type: membership.primaryUnit.type,
            }
          : null,
        requests: group._count._all,
        promptTokens: numberOrZero(group._sum.promptTokens),
        completionTokens: numberOrZero(group._sum.completionTokens),
        totalTokens: numberOrZero(group._sum.totalTokens),
        estimatedCostUsd: decimalOrZero(group._sum.costUsd),
        averageLatencyMs: average(numberOrZero(group._sum.latencyMs), group._count._all),
      };
    }),
    byUnit: byUnit.map((group) => {
      const unit = group.unitId ? unitById.get(group.unitId) : null;

      return {
        unitId: group.unitId,
        name: unit?.name ?? "未分配單位",
        type: unit?.type ?? null,
        requests: group._count._all,
        promptTokens: numberOrZero(group._sum.promptTokens),
        completionTokens: numberOrZero(group._sum.completionTokens),
        totalTokens: numberOrZero(group._sum.totalTokens),
        estimatedCostUsd: decimalOrZero(group._sum.costUsd),
        averageLatencyMs: average(numberOrZero(group._sum.latencyMs), group._count._all),
      };
    }),
  };
}

export async function getOrgTeamDashboardForSession(session: AppSession): Promise<OrgTeamDashboardDto> {
  const [overview, coaching, aiUsage, planConfig, pendingInvites] = await Promise.all([
    getOrgOverviewForSession(session),
    getOrgCoachingForSession(session),
    getOrgAiUsageForSession(session),
    prisma.planConfig.findUnique({
      where: { plan: session.organization.plan },
      select: { maxCollaborators: true },
    }),
    prisma.organizationMember.count({
      where: {
        organizationId: session.organization.id,
        status: "INVITED",
      },
    }),
  ]);
  const usageByMember = new Map(aiUsage.byMember.map((member) => [member.userId, member]));
  const coachingQueue = coaching.memberCoaching
    .map<OrgTeamMemberQueueDto>((member) => {
      const draftPlans = Math.max(0, member.metrics.visitPlans - member.metrics.readyVisitPlans);
      const completionRate = Math.round(member.metrics.visitReadinessRate * 100);
      const usage = usageByMember.get(member.userId);
      const signal = getTeamCoachingSignal({
        completionRate,
        draftPlans,
        spinSessions: member.metrics.spinSessions,
        focusLabel: member.recommendedFocus.label,
      });

      return {
        id: member.userId,
        name: member.displayName,
        role: member.title ?? member.role,
        region: member.unit?.name ?? "未分配單位",
        avatar: member.displayName.trim().slice(0, 1) || "員",
        stats: {
          closedThisMonth: member.metrics.readyReports,
          revenue: 0,
          spinSessions: member.metrics.spinSessions,
          visitPlans: {
            total: member.metrics.visitPlans,
            completed: member.metrics.readyVisitPlans,
            draft: draftPlans,
          },
          aiInsightHits: usage?.requests ?? 0,
        },
        signal,
      };
    })
    .sort((a, b) => b.signal.riskScore - a.signal.riskScore);

  const draftPlans = coachingQueue.reduce((sum, member) => sum + member.stats.visitPlans.draft, 0);

  return {
    source: "database",
    visibility: "org-aggregate",
    generatedAt: new Date().toISOString(),
    organization: overview.organization,
    scope: overview.scope,
    units: [
      {
        id: "all",
        label: overview.scope.scopedToManagedUnits ? "管理範圍" : "全通訊處",
        members: overview.totals.activeMembers,
        risk:
          overview.coaching.membersNeedingCoaching > 0
            ? `${overview.coaching.membersNeedingCoaching} 人需介入`
            : "節奏穩定",
      },
      ...overview.unitHealth.map((unit) => ({
        id: unit.id,
        label: unit.name,
        members: unit.memberCount,
        risk: getUnitRiskLabel(unit),
      })),
    ],
    seats: {
      used: overview.totals.members,
      limit: session.organization.seatLimit,
      pendingInvites,
      collaboratorLimit: planConfig?.maxCollaborators ?? 0,
    },
    aiUsage: {
      used: aiUsage.totals.requests,
      quota: session.organization.monthlyAiQuota,
      coachingPrompts: aiUsage.byModule
        .filter((item) => ["CHAT", "INTERVIEW", "SPIN"].includes(item.module))
        .reduce((sum, item) => sum + item.requests, 0),
      theaterSessions: coaching.totals.theaterSessions,
    },
    totals: {
      planCoverage: Math.round(coaching.completion.visitReadinessRate * 100),
      draftPlans,
      insights: aiUsage.totals.requests,
      membersNeedingCoaching: coachingQueue.filter((member) => member.signal.status !== "穩定").length,
    },
    coachingQueue,
    trainingActions: buildTrainingActions(coachingQueue, coaching.recommendations[0]?.label),
  };
}

function toOrganizationDto(session: AppSession): OrgAggregateOrganizationDto {
  return {
    id: session.organization.id,
    name: session.organization.name,
    slug: session.organization.slug,
    plan: session.organization.plan,
  };
}

function toScopeDto(session: AppSession, scope: OrgAggregateScope): OrgAggregateScopeDto {
  return {
    role: session.membership.role,
    unitIds: scope.unitId?.in ?? [],
    scopedToManagedUnits: Boolean(scope.unitId),
  };
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(2));
}

function toCountGroup<T extends string | null>(key: T, count: number): OrgCountGroupDto<T> {
  return { key, count };
}

function pickRecommendedFocus(metrics: {
  readyVisitPlans: number;
  visitPlans: number;
  completedSpin: number;
  spinSessions: number;
  completedTheater: number;
  theaterSessions: number;
  readyReports: number;
  reports: number;
}): RecommendedFocus {
  const gaps = [
    {
      key: "visit_preparation",
      label: "補強拜訪準備完成率",
      gap: metrics.visitPlans - metrics.readyVisitPlans,
    },
    {
      key: "spin_completion",
      label: "推進 SPIN 對話收斂",
      gap: metrics.spinSessions - metrics.completedSpin,
    },
    {
      key: "theater_practice",
      label: "增加劇場演練完成數",
      gap: metrics.theaterSessions - metrics.completedTheater,
    },
    {
      key: "report_readiness",
      label: "提高報告可交付率",
      gap: metrics.reports - metrics.readyReports,
    },
  ].sort((a, b) => b.gap - a.gap);

  return gaps[0]?.gap > 0 ? gaps[0] : { key: "maintain_momentum", label: "維持目前節奏", gap: 0 };
}

function getTeamCoachingSignal(input: {
  completionRate: number;
  draftPlans: number;
  spinSessions: number;
  focusLabel: string;
}) {
  const riskScore =
    (100 - input.completionRate) * 0.45 + input.draftPlans * 4 + (input.spinSessions < 10 ? 14 : 0);

  if (input.completionRate < 45) {
    return {
      completionRate: input.completionRate,
      riskScore: Math.round(riskScore),
      reason: "訪前規劃完成率偏低",
      nextAction: "安排 20 分鐘規劃檢查",
      status: "優先輔導",
    };
  }

  if (input.draftPlans >= 7) {
    return {
      completionRate: input.completionRate,
      riskScore: Math.round(riskScore),
      reason: "草稿堆積，需要收斂拜訪準備",
      nextAction: "一起清理待完成準備包",
      status: "需要跟進",
    };
  }

  if (input.spinSessions < 10) {
    return {
      completionRate: input.completionRate,
      riskScore: Math.round(riskScore),
      reason: "SPIN 對話量低於團隊節奏",
      nextAction: "安排一次劇場演練",
      status: "節奏偏低",
    };
  }

  return {
    completionRate: input.completionRate,
    riskScore: Math.round(riskScore),
    reason: input.focusLabel,
    nextAction: "整理成團隊範例",
    status: "穩定",
  };
}

function getUnitRiskLabel(unit: { visitPlanCount: number; aiUsageCount: number }) {
  if (unit.visitPlanCount === 0) return "需建立準備包";
  if (unit.aiUsageCount === 0) return "AI 使用低";
  return "節奏穩定";
}

function buildTrainingActions(queue: OrgTeamMemberQueueDto[], orgFocus = "維持目前節奏") {
  const [first, second, third] = queue;

  return [
    {
      title: orgFocus,
      owner: first?.name ?? "團隊",
      timing: "今日",
      detail: first ? first.signal.nextAction : "先觀察本週團隊節奏。",
    },
    {
      title: second?.signal.status ?? "最佳做法萃取",
      owner: second?.name ?? "團隊",
      timing: "明日早會",
      detail: second?.signal.nextAction ?? "將穩定工作流整理成團隊範本。",
    },
    {
      title: third?.signal.status ?? "AI 使用覆蓋",
      owner: third?.name ?? "團隊",
      timing: "本週五",
      detail: third?.signal.reason ?? "檢查 AI 使用與劇場演練覆蓋率。",
    },
  ];
}

function numberOrZero(value: number | null | undefined) {
  return value ?? 0;
}

function decimalOrZero(value: { toString(): string } | null | undefined) {
  return Number(value?.toString() ?? 0);
}

function average(total: number, count: number) {
  if (count === 0) return 0;
  return Math.round(total / count);
}
