import { canReadOrgAggregate } from "@/lib/auth/policies";
import { authErrorResponse, requireOrgAdmin } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type ScopedUnitFilter = { in: string[] };

interface OrgScope {
  organizationId: string;
  unitId?: ScopedUnitFilter;
}

interface CountGroup<T extends string | null> {
  key: T;
  count: number;
}

function getOrgScope(session: AppSession): OrgScope {
  const scope: OrgScope = { organizationId: session.organization.id };

  if (session.membership.role === "MANAGER" && session.membership.managedUnitIds.length > 0) {
    scope.unitId = { in: session.membership.managedUnitIds };
  }

  return scope;
}

function isScopeAllowed(session: AppSession, scope: OrgScope) {
  return scope.unitId
    ? scope.unitId.in.every((unitId) => canReadOrgAggregate(session, { organizationId: session.organization.id, unitId }))
    : canReadOrgAggregate(session, { organizationId: session.organization.id });
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(2));
}

function toCountGroup<T extends string | null>(key: T, count: number): CountGroup<T> {
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
}) {
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

export async function GET() {
  try {
    const session = await requireOrgAdmin();
    const scope = getOrgScope(session);

    if (!isScopeAllowed(session, scope)) {
      return Response.json({ error: "ORG_COACHING_FORBIDDEN" }, { status: 403 });
    }

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
        const [memberVisitPlans, memberReadyVisitPlans, memberSpinSessions, memberCompletedSpin, memberTheaterSessions, memberCompletedTheater, memberReports, memberReadyReports] =
          await Promise.all([
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

    return Response.json({
      organization: {
        id: session.organization.id,
        name: session.organization.name,
        slug: session.organization.slug,
        plan: session.organization.plan,
      },
      scope: {
        role: session.membership.role,
        unitIds: scope.unitId?.in ?? [],
        scopedToManagedUnits: Boolean(scope.unitId),
      },
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
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
