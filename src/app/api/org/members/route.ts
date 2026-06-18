import { canReadOrgAggregate } from "@/lib/auth/policies";
import { authErrorResponse, requireOrgAdmin } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type ScopedUnitFilter = { in: string[] };

interface OrgScope {
  organizationId: string;
  unitId?: ScopedUnitFilter;
}

function getOrgScope(session: AppSession): OrgScope {
  const scope: OrgScope = { organizationId: session.organization.id };

  if (session.membership.role === "MANAGER" && session.membership.managedUnitIds.length > 0) {
    scope.unitId = { in: session.membership.managedUnitIds };
  }

  return scope;
}

export async function GET() {
  try {
    const session = await requireOrgAdmin();
    const scope = getOrgScope(session);
    const scopeAllowed = scope.unitId
      ? scope.unitId.in.every((unitId) => canReadOrgAggregate(session, { organizationId: session.organization.id, unitId }))
      : canReadOrgAggregate(session, { organizationId: session.organization.id });

    if (!scopeAllowed) {
      return Response.json({ error: "ORG_MEMBERS_FORBIDDEN" }, { status: 403 });
    }

    const [memberships, units] = await Promise.all([
      prisma.organizationMember.findMany({
        where: {
          organizationId: session.organization.id,
          ...(scope.unitId ? { primaryUnitId: scope.unitId } : {}),
        },
        select: {
          id: true,
          userId: true,
          primaryUnitId: true,
          role: true,
          status: true,
          region: true,
          title: true,
          isDefault: true,
          invitedAt: true,
          acceptedAt: true,
          createdAt: true,
          updatedAt: true,
          primaryUnit: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          managedUnitScopes: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              type: true,
            },
            orderBy: [{ type: "asc" }, { name: "asc" }],
          },
          user: {
            select: {
              id: true,
              name: true,
              status: true,
              avatarUrl: true,
              lastLoginAt: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      }),
      prisma.organizationUnit.findMany({
        where: {
          organizationId: session.organization.id,
          isActive: true,
          ...(scope.unitId ? { id: scope.unitId } : {}),
        },
        select: {
          id: true,
          parentId: true,
          type: true,
          name: true,
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
    ]);

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const memberScope = {
          organizationId: session.organization.id,
          ownerId: membership.userId,
          ...(scope.unitId ? { unitId: scope.unitId } : {}),
        };
        const usageScope = {
          organizationId: session.organization.id,
          userId: membership.userId,
          ...(scope.unitId ? { unitId: scope.unitId } : {}),
        };
        const [clientCount, visitPlanCount, reportCount, spinSessionCount, theaterSessionCount, aiUsageCount] =
          await Promise.all([
            prisma.client.count({ where: { ...memberScope, status: { not: "ARCHIVED" } } }),
            prisma.visitPlan.count({ where: memberScope }),
            prisma.report.count({ where: memberScope }),
            prisma.spinSession.count({ where: memberScope }),
            prisma.theaterSession.count({ where: memberScope }),
            prisma.aiUsageLog.count({ where: usageScope }),
          ]);

        return {
          membershipId: membership.id,
          userId: membership.user.id,
          displayName: membership.user.name,
          avatarUrl: membership.user.avatarUrl,
          userStatus: membership.user.status,
          role: membership.role,
          membershipStatus: membership.status,
          title: membership.title,
          region: membership.region,
          seat: {
            isDefault: membership.isDefault,
            invitedAt: membership.invitedAt?.toISOString() ?? null,
            acceptedAt: membership.acceptedAt?.toISOString() ?? null,
            joinedAt: membership.createdAt.toISOString(),
            updatedAt: membership.updatedAt.toISOString(),
            lastActiveAt: membership.user.lastLoginAt?.toISOString() ?? null,
          },
          unit: membership.primaryUnit
            ? {
                id: membership.primaryUnit.id,
                name: membership.primaryUnit.name,
                type: membership.primaryUnit.type,
              }
            : null,
          managedUnits: membership.managedUnitScopes.map((unit) => ({
            id: unit.id,
            name: unit.name,
            type: unit.type,
          })),
          aggregates: {
            clientCount,
            visitPlanCount,
            reportCount,
            spinSessionCount,
            theaterSessionCount,
            aiUsageCount,
          },
        };
      }),
    );

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
      units,
      members,
      totals: {
        members: members.length,
        activeMembers: members.filter((member) => member.membershipStatus === "ACTIVE" && member.userStatus === "ACTIVE")
          .length,
        units: units.length,
        clients: members.reduce((sum, member) => sum + member.aggregates.clientCount, 0),
        reports: members.reduce((sum, member) => sum + member.aggregates.reportCount, 0),
        aiUsage: members.reduce((sum, member) => sum + member.aggregates.aiUsageCount, 0),
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
