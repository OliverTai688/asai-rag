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

function isScopeAllowed(session: AppSession, scope: OrgScope) {
  return scope.unitId
    ? scope.unitId.in.every((unitId) => canReadOrgAggregate(session, { organizationId: session.organization.id, unitId }))
    : canReadOrgAggregate(session, { organizationId: session.organization.id });
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

export async function GET() {
  try {
    const session = await requireOrgAdmin();
    const scope = getOrgScope(session);

    if (!isScopeAllowed(session, scope)) {
      return Response.json({ error: "ORG_AI_USAGE_FORBIDDEN" }, { status: 403 });
    }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const usageScope = {
      ...scope,
      createdAt: { gte: monthStart },
    };

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
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
