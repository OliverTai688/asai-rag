import { canReadOrgAggregate } from "@/lib/auth/policies";
import { authErrorResponse, requireOrgAdmin } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type ScopeWhere = {
  organizationId: string;
  unitId?: { in: string[] };
};

function getAggregateScope(session: AppSession): ScopeWhere {
  const scope: ScopeWhere = { organizationId: session.organization.id };

  if (session.membership.role === "MANAGER" && session.membership.managedUnitIds.length > 0) {
    scope.unitId = { in: session.membership.managedUnitIds };
  }

  return scope;
}

export async function GET() {
  try {
    const session = await requireOrgAdmin();
    const scope = getAggregateScope(session);

    const scopeAllowed = scope.unitId
      ? scope.unitId.in.every((unitId) => canReadOrgAggregate(session, { organizationId: session.organization.id, unitId }))
      : canReadOrgAggregate(session, { organizationId: session.organization.id });

    if (!scopeAllowed) {
      return Response.json({ error: "ORG_AGGREGATE_FORBIDDEN" }, { status: 403 });
    }

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
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
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
          const [clients, visitPlans, spinSessions, theaterSessions, reports, aiUsage] = await Promise.all([
            prisma.client.count({ where: { ...memberScope, status: { not: "ARCHIVED" } } }),
            prisma.visitPlan.count({ where: memberScope }),
            prisma.spinSession.count({ where: memberScope }),
            prisma.theaterSession.count({ where: memberScope }),
            prisma.report.count({ where: memberScope }),
            prisma.aiUsageLog.count({
              where: {
                organizationId: session.organization.id,
                userId: membership.user.id,
                ...(scope.unitId ? { unitId: scope.unitId } : {}),
              },
            }),
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
      unitHealth: unitCounts,
      memberHealth: memberCounts,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
