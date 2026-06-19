import type { AuditAction, AuditSensitivity, OrganizationPlan, PlatformRole } from "@/generated/prisma/enums";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DecimalLike = { toString(): string } | null | undefined;

export interface PlatformReadSession {
  user: { id: string; name: string };
  role: PlatformRole;
  requireMfa: boolean;
}

export interface PlatformAuditFilters {
  organizationId?: string;
  action?: AuditAction;
  sensitivity?: AuditSensitivity;
}

const PLATFORM_READ_ROLES = new Set<PlatformRole>(["SUPER_ADMIN", "SUPPORT", "FINANCE"]);
const PLATFORM_AUDIT_ROLES = new Set<PlatformRole>(["SUPER_ADMIN", "SUPPORT"]);
const PLATFORM_PLAN_WRITE_ROLES = new Set<PlatformRole>(["SUPER_ADMIN"]);

export const platformPlanConfigPatchSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    maxMembers: z.number().int().min(1).max(10000).optional(),
    maxCollaborators: z.number().int().min(0).max(10000).optional(),
    maxUnits: z.number().int().min(1).max(10000).optional(),
    monthlyAiQuota: z.number().int().min(1).max(10000000).optional(),
    shareBrandingEnabled: z.boolean().optional(),
    clientPortalEnabled: z.boolean().optional(),
    impersonationAllowed: z.boolean().optional(),
    isActive: z.boolean().optional(),
    reason: z.string().trim().min(10).max(500),
    riskAccepted: z.literal(true),
  })
  .refine(
    (value) =>
      [
        "displayName",
        "maxMembers",
        "maxCollaborators",
        "maxUnits",
        "monthlyAiQuota",
        "shareBrandingEnabled",
        "clientPortalEnabled",
        "impersonationAllowed",
        "isActive",
      ].some((key) => key in value),
    {
      message: "At least one plan config field is required.",
      path: ["fields"],
    },
  );

export type PlatformPlanConfigPatch = z.infer<typeof platformPlanConfigPatchSchema>;

export function canReadPlatformSummary(session: PlatformReadSession) {
  return PLATFORM_READ_ROLES.has(session.role);
}

export function canReadPlatformAuditLogs(session: PlatformReadSession) {
  return PLATFORM_AUDIT_ROLES.has(session.role);
}

export function canUpdatePlatformPlanConfig(session: PlatformReadSession) {
  return PLATFORM_PLAN_WRITE_ROLES.has(session.role);
}

function numberOrZero(value: number | null | undefined) {
  return value ?? 0;
}

function decimalOrZero(value: DecimalLike) {
  return Number(value?.toString() ?? 0);
}

function ratio(used: number, quota: number) {
  if (quota <= 0) return 0;
  return Math.round((used / quota) * 100);
}

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function metadataKeys(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  return Object.keys(metadata).sort();
}

function displayActorName(name: string | null | undefined) {
  return name?.trim() || "系統";
}

function planConfigDto(config: {
  plan: OrganizationPlan;
  displayName: string;
  maxMembers: number;
  maxCollaborators: number;
  maxUnits: number;
  monthlyAiQuota: number;
  shareBrandingEnabled: boolean;
  clientPortalEnabled: boolean;
  impersonationAllowed: boolean;
  isActive: boolean;
  updatedAt?: Date;
}) {
  return {
    plan: config.plan,
    displayName: config.displayName,
    maxMembers: config.maxMembers,
    maxCollaborators: config.maxCollaborators,
    maxUnits: config.maxUnits,
    monthlyAiQuota: config.monthlyAiQuota,
    shareBrandingEnabled: config.shareBrandingEnabled,
    clientPortalEnabled: config.clientPortalEnabled,
    impersonationAllowed: config.impersonationAllowed,
    isActive: config.isActive,
    updatedAt: config.updatedAt?.toISOString() ?? null,
  };
}

function planConfigPatchData(patch: PlatformPlanConfigPatch) {
  return {
    ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
    ...(patch.maxMembers !== undefined ? { maxMembers: patch.maxMembers } : {}),
    ...(patch.maxCollaborators !== undefined ? { maxCollaborators: patch.maxCollaborators } : {}),
    ...(patch.maxUnits !== undefined ? { maxUnits: patch.maxUnits } : {}),
    ...(patch.monthlyAiQuota !== undefined ? { monthlyAiQuota: patch.monthlyAiQuota } : {}),
    ...(patch.shareBrandingEnabled !== undefined ? { shareBrandingEnabled: patch.shareBrandingEnabled } : {}),
    ...(patch.clientPortalEnabled !== undefined ? { clientPortalEnabled: patch.clientPortalEnabled } : {}),
    ...(patch.impersonationAllowed !== undefined ? { impersonationAllowed: patch.impersonationAllowed } : {}),
    ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
  };
}

function changedPlanFields(before: ReturnType<typeof planConfigDto>, after: ReturnType<typeof planConfigDto>) {
  const fields = [
    "displayName",
    "maxMembers",
    "maxCollaborators",
    "maxUnits",
    "monthlyAiQuota",
    "shareBrandingEnabled",
    "clientPortalEnabled",
    "impersonationAllowed",
    "isActive",
  ] as const;

  return fields.filter((field) => before[field] !== after[field]);
}

function planConfigDiff(
  config: ReturnType<typeof planConfigDto>,
  fields: ReturnType<typeof changedPlanFields>,
): Prisma.InputJsonObject {
  const values: Record<string, string | number | boolean | null> = {};

  for (const field of fields) {
    values[field] = config[field];
  }

  return values as Prisma.InputJsonObject;
}

async function organizationHealth(organizationId: string) {
  const currentMonth = monthStart();
  const recent = daysAgo(30);
  const [
    members,
    activeMembers,
    units,
    clients,
    reports,
    shares,
    openBillingOrders,
    aiUsage,
    highSensitivityAuditEvents30d,
  ] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId } }),
    prisma.organizationMember.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.organizationUnit.count({ where: { organizationId, isActive: true } }),
    prisma.client.count({ where: { organizationId, status: { not: "ARCHIVED" } } }),
    prisma.report.count({ where: { organizationId } }),
    prisma.reportShare.count({ where: { organizationId } }),
    prisma.subscriptionOrder.count({
      where: {
        organizationId,
        status: { in: ["PENDING", "FAILED"] },
      },
    }),
    prisma.aiUsageLog.aggregate({
      where: { organizationId, createdAt: { gte: currentMonth } },
      _count: { _all: true },
      _sum: { totalTokens: true, costUsd: true },
    }),
    prisma.auditLog.count({
      where: {
        organizationId,
        createdAt: { gte: recent },
        sensitivity: { in: ["HIGH", "BREAK_GLASS"] },
      },
    }),
  ]);

  return {
    members,
    activeMembers,
    units,
    clients,
    reports,
    shares,
    openBillingOrders,
    aiRequestsThisMonth: aiUsage._count._all,
    aiTokensThisMonth: numberOrZero(aiUsage._sum.totalTokens),
    aiCostUsdThisMonth: decimalOrZero(aiUsage._sum.costUsd),
    highSensitivityAuditEvents30d,
  };
}

export async function listPlatformOrganizations(session: PlatformReadSession) {
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      seatLimit: true,
      monthlyAiQuota: true,
      monthlyAiUsed: true,
      isDemo: true,
      demoScenario: true,
      trialEndsAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ isDemo: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const items = await Promise.all(
    organizations.map(async (organization) => {
      const health = await organizationHealth(organization.id);

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        status: organization.status,
        isDemo: organization.isDemo,
        demoScenario: organization.demoScenario,
        trialEndsAt: organization.trialEndsAt?.toISOString() ?? null,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
        usage: {
          monthlyAiQuota: organization.monthlyAiQuota,
          monthlyAiUsed: organization.monthlyAiUsed,
          usagePercent: ratio(organization.monthlyAiUsed, organization.monthlyAiQuota),
          seatLimit: organization.seatLimit,
          activeSeats: health.activeMembers,
        },
        health,
      };
    }),
  );

  return {
    scope: {
      role: session.role,
      requireMfa: session.requireMfa,
      actorName: session.user.name,
    },
    totals: {
      organizations: items.length,
      activeOrganizations: items.filter((item) => item.status === "ACTIVE").length,
      demoOrganizations: items.filter((item) => item.isDemo).length,
      activeMembers: items.reduce((sum, item) => sum + item.health.activeMembers, 0),
      clients: items.reduce((sum, item) => sum + item.health.clients, 0),
      aiRequestsThisMonth: items.reduce((sum, item) => sum + item.health.aiRequestsThisMonth, 0),
      aiCostUsdThisMonth: items.reduce((sum, item) => sum + item.health.aiCostUsdThisMonth, 0),
      highSensitivityAuditEvents30d: items.reduce(
        (sum, item) => sum + item.health.highSensitivityAuditEvents30d,
        0,
      ),
    },
    organizations: items,
  };
}

export async function getPlatformOrganization(session: PlatformReadSession, organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      logoUrl: true,
      brandColor: true,
      seatLimit: true,
      monthlyAiQuota: true,
      monthlyAiUsed: true,
      paymentProvider: true,
      isDemo: true,
      demoScenario: true,
      demoSeedVersion: true,
      demoDataSeededAt: true,
      trialStartsAt: true,
      trialEndsAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!organization) {
    return null;
  }

  const [health, units, planConfig, auditSummary, aiSummary] = await Promise.all([
    organizationHealth(organization.id),
    prisma.organizationUnit.findMany({
      where: { organizationId: organization.id, isActive: true },
      select: {
        id: true,
        parentId: true,
        type: true,
        name: true,
        slug: true,
        isDemo: true,
        createdAt: true,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.planConfig.findUnique({
      where: { plan: organization.plan },
      select: {
        plan: true,
        displayName: true,
        maxMembers: true,
        maxCollaborators: true,
        maxUnits: true,
        monthlyAiQuota: true,
        shareBrandingEnabled: true,
        clientPortalEnabled: true,
        impersonationAllowed: true,
        isActive: true,
      },
    }),
    prisma.auditLog.groupBy({
      by: ["action", "sensitivity"],
      where: { organizationId: organization.id, createdAt: { gte: daysAgo(30) } },
      _count: { _all: true },
      orderBy: [{ action: "asc" }, { sensitivity: "asc" }],
    }),
    prisma.aiUsageLog.groupBy({
      by: ["module"],
      where: { organizationId: organization.id, createdAt: { gte: monthStart() } },
      _count: { _all: true },
      _sum: { totalTokens: true, costUsd: true },
      orderBy: { module: "asc" },
    }),
  ]);

  return {
    scope: {
      role: session.role,
      requireMfa: session.requireMfa,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      status: organization.status,
      logoUrl: organization.logoUrl,
      brandColor: organization.brandColor,
      paymentProvider: organization.paymentProvider,
      isDemo: organization.isDemo,
      demoScenario: organization.demoScenario,
      demoSeedVersion: organization.demoSeedVersion,
      demoDataSeededAt: organization.demoDataSeededAt?.toISOString() ?? null,
      trialStartsAt: organization.trialStartsAt?.toISOString() ?? null,
      trialEndsAt: organization.trialEndsAt?.toISOString() ?? null,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    },
    usage: {
      monthlyAiQuota: organization.monthlyAiQuota,
      monthlyAiUsed: organization.monthlyAiUsed,
      usagePercent: ratio(organization.monthlyAiUsed, organization.monthlyAiQuota),
      seatLimit: organization.seatLimit,
      activeSeats: health.activeMembers,
    },
    health,
    planConfig,
    units: units.map((unit) => ({
      id: unit.id,
      parentId: unit.parentId,
      type: unit.type,
      name: unit.name,
      slug: unit.slug,
      isDemo: unit.isDemo,
      createdAt: unit.createdAt.toISOString(),
    })),
    aiUsageByModule: aiSummary.map((group) => ({
      module: group.module,
      requests: group._count._all,
      totalTokens: numberOrZero(group._sum.totalTokens),
      estimatedCostUsd: decimalOrZero(group._sum.costUsd),
    })),
    auditSummary30d: auditSummary.map((group) => ({
      action: group.action,
      sensitivity: group.sensitivity,
      count: group._count._all,
    })),
  };
}

export async function getPlatformAiUsage() {
  const currentMonth = monthStart();
  const [totals, byOrganization, byModule, byProvider, errorCounts, organizations] = await Promise.all([
    prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: currentMonth } },
      _count: { _all: true },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true, latencyMs: true, costUsd: true },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: currentMonth } },
      _count: { _all: true },
      _sum: { totalTokens: true, costUsd: true, latencyMs: true },
      orderBy: { organizationId: "asc" },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["module"],
      where: { createdAt: { gte: currentMonth } },
      _count: { _all: true },
      _sum: { totalTokens: true, costUsd: true, latencyMs: true },
      orderBy: { module: "asc" },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["provider"],
      where: { createdAt: { gte: currentMonth } },
      _count: { _all: true },
      _sum: { totalTokens: true, costUsd: true },
      orderBy: { provider: "asc" },
    }),
    prisma.aiUsageLog.groupBy({
      by: ["organizationId", "module"],
      where: { createdAt: { gte: currentMonth }, error: { not: null } },
      _count: { _all: true },
      orderBy: [{ organizationId: "asc" }, { module: "asc" }],
    }),
    prisma.organization.findMany({
      select: { id: true, name: true, slug: true, plan: true, status: true, isDemo: true },
    }),
  ]);

  const orgById = new Map(organizations.map((organization) => [organization.id, organization]));
  const errorsByOrgModule = new Map(
    errorCounts.map((group) => [`${group.organizationId}:${group.module}`, group._count._all]),
  );

  return {
    periodStart: currentMonth.toISOString(),
    totals: {
      requests: totals._count._all,
      promptTokens: numberOrZero(totals._sum.promptTokens),
      completionTokens: numberOrZero(totals._sum.completionTokens),
      totalTokens: numberOrZero(totals._sum.totalTokens),
      estimatedCostUsd: decimalOrZero(totals._sum.costUsd),
      averageLatencyMs: totals._count._all
        ? Math.round(numberOrZero(totals._sum.latencyMs) / totals._count._all)
        : 0,
      errorCount: errorCounts.reduce((sum, group) => sum + group._count._all, 0),
    },
    byOrganization: byOrganization.map((group) => {
      const organization = orgById.get(group.organizationId);
      const orgErrorCount = errorCounts
        .filter((item) => item.organizationId === group.organizationId)
        .reduce((sum, item) => sum + item._count._all, 0);

      return {
        organization: organization
          ? {
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
              plan: organization.plan,
              status: organization.status,
              isDemo: organization.isDemo,
            }
          : { id: group.organizationId, name: "Unknown organization", slug: null, plan: null, status: null, isDemo: false },
        requests: group._count._all,
        totalTokens: numberOrZero(group._sum.totalTokens),
        estimatedCostUsd: decimalOrZero(group._sum.costUsd),
        averageLatencyMs: group._count._all
          ? Math.round(numberOrZero(group._sum.latencyMs) / group._count._all)
          : 0,
        errorCount: orgErrorCount,
      };
    }),
    byModule: byModule.map((group) => ({
      module: group.module,
      requests: group._count._all,
      totalTokens: numberOrZero(group._sum.totalTokens),
      estimatedCostUsd: decimalOrZero(group._sum.costUsd),
      averageLatencyMs: group._count._all
        ? Math.round(numberOrZero(group._sum.latencyMs) / group._count._all)
        : 0,
    })),
    byProvider: byProvider.map((group) => ({
      provider: group.provider,
      requests: group._count._all,
      totalTokens: numberOrZero(group._sum.totalTokens),
      estimatedCostUsd: decimalOrZero(group._sum.costUsd),
    })),
    errorHeatmap: errorCounts.map((group) => ({
      organizationId: group.organizationId,
      module: group.module,
      errorCount: errorsByOrgModule.get(`${group.organizationId}:${group.module}`) ?? 0,
    })),
  };
}

export async function listPlatformAuditLogs(filters: PlatformAuditFilters) {
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.sensitivity ? { sensitivity: filters.sensitivity } : {}),
    },
    select: {
      id: true,
      organizationId: true,
      action: true,
      sensitivity: true,
      resourceType: true,
      resourceId: true,
      reason: true,
      metadata: true,
      createdAt: true,
      impersonationSessionId: true,
      organization: { select: { id: true, name: true, slug: true } },
      actor: { select: { id: true, name: true, status: true } },
      target: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    filters,
    auditLogs: logs.map((log) => ({
      id: log.id,
      organization: log.organization
        ? {
            id: log.organization.id,
            name: log.organization.name,
            slug: log.organization.slug,
          }
        : null,
      organizationId: log.organizationId,
      action: log.action,
      sensitivity: log.sensitivity,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      reason: log.reason,
      actor: log.actor
        ? {
            id: log.actor.id,
            displayName: displayActorName(log.actor.name),
            status: log.actor.status,
          }
        : null,
      target: log.target
        ? {
            id: log.target.id,
            displayName: displayActorName(log.target.name),
            status: log.target.status,
          }
        : null,
      impersonationSessionId: log.impersonationSessionId,
      metadataKeys: metadataKeys(log.metadata),
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function updatePlatformPlanConfig(
  session: PlatformReadSession,
  plan: OrganizationPlan,
  patch: PlatformPlanConfigPatch,
) {
  const data = planConfigPatchData(patch);

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.planConfig.findUnique({
      where: { plan },
      select: {
        plan: true,
        displayName: true,
        maxMembers: true,
        maxCollaborators: true,
        maxUnits: true,
        monthlyAiQuota: true,
        shareBrandingEnabled: true,
        clientPortalEnabled: true,
        impersonationAllowed: true,
        isActive: true,
        updatedAt: true,
      },
    });

    if (!current) {
      return null;
    }

    const updated = await tx.planConfig.update({
      where: { plan },
      data,
      select: {
        plan: true,
        displayName: true,
        maxMembers: true,
        maxCollaborators: true,
        maxUnits: true,
        monthlyAiQuota: true,
        shareBrandingEnabled: true,
        clientPortalEnabled: true,
        impersonationAllowed: true,
        isActive: true,
        updatedAt: true,
      },
    });

    const before = planConfigDto(current);
    const after = planConfigDto(updated);
    const changedFields = changedPlanFields(before, after);

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: "PLAN_UPDATE",
        sensitivity: "HIGH",
        resourceType: "PLAN_CONFIG",
        resourceId: plan,
        reason: patch.reason,
        metadata: {
          plan,
          actorRole: session.role,
          changedFields,
          before: planConfigDiff(before, changedFields),
          after: planConfigDiff(after, changedFields),
          riskAccepted: patch.riskAccepted,
        },
      },
    });

    return { before, after, changedFields };
  });

  if (!result) {
    return null;
  }

  return {
    planConfig: result.after,
    audit: {
      action: "PLAN_UPDATE",
      sensitivity: "HIGH",
      changedFields: result.changedFields,
      reason: patch.reason,
    },
  };
}

// ---------------------------------------------------------------------------
// Per-turn AI usage (RES-022 TAU-003)
// ---------------------------------------------------------------------------

const AI_MODULE_VALUES = new Set(Object.values(AiModule) as string[]);
const AI_PROVIDER_VALUES = new Set(Object.values(AiProvider) as string[]);

export const platformAiTurnFilterSchema = z.object({
  module: z
    .string()
    .trim()
    .refine((value) => AI_MODULE_VALUES.has(value), { message: "Unknown AI module" })
    .optional(),
  provider: z
    .string()
    .trim()
    .refine((value) => AI_PROVIDER_VALUES.has(value), { message: "Unknown AI provider" })
    .optional(),
  organizationId: z.string().trim().max(80).optional(),
  userId: z.string().trim().max(80).optional(),
  clientId: z.string().trim().max(80).optional(),
  errorsOnly: z.boolean().optional(),
  sinceDays: z.coerce.number().int().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export type PlatformAiTurnFilters = {
  module?: AiModule;
  provider?: AiProvider;
  organizationId?: string;
  userId?: string;
  clientId?: string;
  errorsOnly?: boolean;
  sinceDays?: number;
  limit?: number;
};

export function canReadPlatformTurnUsage(session: PlatformReadSession) {
  return PLATFORM_READ_ROLES.has(session.role);
}

type AiTurnUsageRow = {
  id: string;
  createdAt: Date;
  module: AiModule;
  provider: AiProvider;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  costUsd: DecimalLike;
  requestId: string | null;
  error: string | null;
  traceSource: string | null;
  assistantConversationId: string | null;
  assistantMessageId: string | null;
  interviewSessionId: string | null;
  interviewTurnId: string | null;
  theaterSessionId: string | null;
  theaterTurnId: string | null;
  interactionEventId: string | null;
  organization: { id: string; name: string; slug: string | null } | null;
  user: { id: string; name: string | null } | null;
  unit: { id: string; name: string | null } | null;
  client: { id: string } | null;
};

function toTurnUsageDto(log: AiTurnUsageRow) {
  return {
    usageLogId: log.id,
    createdAt: log.createdAt.toISOString(),
    organization: log.organization
      ? { id: log.organization.id, name: log.organization.name, slug: log.organization.slug }
      : null,
    user: log.user ? { id: log.user.id, name: log.user.name } : null,
    unit: log.unit ? { id: log.unit.id, name: log.unit.name } : null,
    // Client name is private PII — expose only the id here. Content/identity replay
    // is gated behind break-glass + AuditLog, not the default turn-usage view.
    client: log.client ? { id: log.client.id, name: null } : null,
    module: log.module,
    provider: log.provider,
    model: log.model,
    promptTokens: log.promptTokens,
    completionTokens: log.completionTokens,
    totalTokens: log.totalTokens,
    latencyMs: log.latencyMs,
    costUsd: log.costUsd?.toString() ?? null,
    requestId: log.requestId,
    error: log.error,
    trace: {
      source: log.traceSource,
      conversationId: log.assistantConversationId,
      messageId: log.assistantMessageId,
      interviewSessionId: log.interviewSessionId,
      interviewTurnId: log.interviewTurnId,
      theaterSessionId: log.theaterSessionId,
      theaterTurnId: log.theaterTurnId,
      interactionEventId: log.interactionEventId,
    },
    preview: {
      // Default super-admin view shows cost/trace metadata only, never raw content.
      redacted: true,
    },
  };
}

export async function getPlatformAiTurnUsage(filters: PlatformAiTurnFilters = {}) {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const since = filters.sinceDays ? daysAgo(filters.sinceDays) : monthStart();

  const logs = await prisma.aiUsageLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.provider ? { provider: filters.provider } : {}),
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.errorsOnly ? { error: { not: null } } : {}),
    },
    select: {
      id: true,
      createdAt: true,
      module: true,
      provider: true,
      model: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      latencyMs: true,
      costUsd: true,
      requestId: true,
      error: true,
      traceSource: true,
      assistantConversationId: true,
      assistantMessageId: true,
      interviewSessionId: true,
      interviewTurnId: true,
      theaterSessionId: true,
      theaterTurnId: true,
      interactionEventId: true,
      organization: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
      client: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const turns = logs.map(toTurnUsageDto);

  return {
    filters: {
      module: filters.module ?? null,
      provider: filters.provider ?? null,
      organizationId: filters.organizationId ?? null,
      userId: filters.userId ?? null,
      clientId: filters.clientId ?? null,
      errorsOnly: filters.errorsOnly ?? false,
      since: since.toISOString(),
      limit,
    },
    counts: {
      returned: turns.length,
      errorTurns: turns.filter((turn) => turn.error).length,
      zeroTokenTurns: turns.filter((turn) => !turn.totalTokens).length,
      missingTraceTurns: turns.filter((turn) => !turn.trace.source).length,
    },
    turns,
  };
}
