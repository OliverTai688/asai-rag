import { z } from "zod";
import { canReadOrgAggregate } from "@/lib/auth/policies";
import { authErrorResponse, requireOrgAdmin } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type ScopedUnitFilter = { in: string[] };

interface OrgScope {
  organizationId: string;
  unitId?: ScopedUnitFilter;
}

const unitInputSchema = z.object({
  type: z.enum(["HEADQUARTERS", "REGION", "BRANCH"]),
  name: z.string().trim().min(2).max(80),
  parentId: z.string().trim().min(1).optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .nullable(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  logoUrl: z.string().trim().url().optional().nullable(),
  reason: z.string().trim().min(4).max(240).optional().nullable(),
});

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

function canWriteOrgUnits(session: AppSession) {
  return session.membership.role === "OWNER" || session.membership.role === "ADMIN";
}

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toUnitDto(unit: {
  id: string;
  parentId: string | null;
  type: "HEADQUARTERS" | "REGION" | "BRANCH";
  name: string;
  slug: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { primaryMembers: number; clients: number; reports: number };
}) {
  return {
    id: unit.id,
    parentId: unit.parentId,
    type: unit.type,
    name: unit.name,
    slug: unit.slug,
    logoUrl: unit.logoUrl,
    brandColor: unit.brandColor,
    isActive: unit.isActive,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
    aggregates: unit._count
      ? {
          memberCount: unit._count.primaryMembers,
          clientCount: unit._count.clients,
          reportCount: unit._count.reports,
        }
      : undefined,
  };
}

async function getPlanUsage(session: AppSession) {
  const activeUnits = await prisma.organizationUnit.count({
    where: {
      organizationId: session.organization.id,
      isActive: true,
    },
  });

  return {
    activeUnits,
    maxUnits: session.planCapability.maxUnits,
    allowed: activeUnits < session.planCapability.maxUnits,
    remaining: Math.max(0, session.planCapability.maxUnits - activeUnits),
  };
}

async function validateParentUnit(
  session: AppSession,
  input: z.infer<typeof unitInputSchema>,
): Promise<{ id: string; type: "HEADQUARTERS" | "REGION" | "BRANCH" } | null | Response> {
  if (input.type === "HEADQUARTERS") {
    if (input.parentId) {
      return Response.json({ error: "HEADQUARTERS_PARENT_NOT_ALLOWED" }, { status: 400 });
    }

    const existingHeadquarters = await prisma.organizationUnit.count({
      where: {
        organizationId: session.organization.id,
        type: "HEADQUARTERS",
        isActive: true,
      },
    });

    if (existingHeadquarters > 0) {
      return Response.json({ error: "HEADQUARTERS_ALREADY_EXISTS" }, { status: 409 });
    }

    return null;
  }

  if (!input.parentId) {
    return Response.json({ error: "PARENT_UNIT_REQUIRED" }, { status: 400 });
  }

  const parent = await prisma.organizationUnit.findFirst({
    where: {
      id: input.parentId,
      organizationId: session.organization.id,
      isActive: true,
    },
    select: { id: true, type: true },
  });

  if (!parent) {
    return Response.json({ error: "PARENT_UNIT_NOT_FOUND" }, { status: 404 });
  }

  if (input.type === "REGION" && parent.type !== "HEADQUARTERS") {
    return Response.json({ error: "REGION_PARENT_MUST_BE_HEADQUARTERS" }, { status: 400 });
  }

  if (input.type === "BRANCH" && !["HEADQUARTERS", "REGION"].includes(parent.type)) {
    return Response.json({ error: "BRANCH_PARENT_MUST_BE_HEADQUARTERS_OR_REGION" }, { status: 400 });
  }

  return parent;
}

export async function GET() {
  try {
    const session = await requireOrgAdmin();
    const scope = getOrgScope(session);

    if (!isScopeAllowed(session, scope)) {
      return Response.json({ error: "ORG_UNITS_FORBIDDEN" }, { status: 403 });
    }

    const [units, planUsage] = await Promise.all([
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
          slug: true,
          logoUrl: true,
          brandColor: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              primaryMembers: true,
              clients: true,
              reports: true,
            },
          },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      getPlanUsage(session),
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
      planUsage,
      permissions: {
        canCreateUnit: canWriteOrgUnits(session) && planUsage.allowed,
        canManageUnits: canWriteOrgUnits(session),
      },
      units: units.map(toUnitDto),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireOrgAdmin();

    if (!canWriteOrgUnits(session)) {
      return Response.json({ error: "ORG_UNITS_WRITE_FORBIDDEN" }, { status: 403 });
    }

    const parsedBody = unitInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_ORG_UNIT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const planUsage = await getPlanUsage(session);

    if (!planUsage.allowed) {
      return Response.json(
        {
          error: "MAX_UNITS_REACHED",
          message: "此方案的組織層級名額已滿，請升級方案或聯絡管理員調整上限。",
          planUsage,
        },
        { status: 403 },
      );
    }

    const input = parsedBody.data;
    const parent = await validateParentUnit(session, input);

    if (parent instanceof Response) {
      return parent;
    }

    const slug = input.slug ?? normalizeSlug(input.name);

    if (!slug) {
      return Response.json({ error: "INVALID_ORG_UNIT_SLUG" }, { status: 400 });
    }

    const existingSlug = await prisma.organizationUnit.findUnique({
      where: {
        organizationId_slug: {
          organizationId: session.organization.id,
          slug,
        },
      },
      select: { id: true },
    });

    if (existingSlug) {
      return Response.json({ error: "ORG_UNIT_SLUG_CONFLICT" }, { status: 409 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.organization.id },
      select: { isDemo: true, demoScenario: true, demoSeedVersion: true },
    });

    const unit = await prisma.$transaction(async (tx) => {
      const createdUnit = await tx.organizationUnit.create({
        data: {
          organizationId: session.organization.id,
          parentId: parent?.id ?? null,
          type: input.type,
          name: input.name,
          slug,
          brandColor: input.brandColor ?? null,
          logoUrl: input.logoUrl ?? null,
          isDemo: organization?.isDemo ?? false,
          demoScenario: organization?.isDemo ? organization.demoScenario : null,
          demoSeedVersion: organization?.isDemo ? organization.demoSeedVersion : null,
          settings: input.reason ? { createdReason: input.reason } : undefined,
        },
        select: {
          id: true,
          parentId: true,
          type: true,
          name: true,
          slug: true,
          logoUrl: true,
          brandColor: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: session.organization.id,
          actorUserId: session.user.id,
          action: "SUPPORT_NOTE",
          sensitivity: "MEDIUM",
          resourceType: "ORG_UNIT",
          resourceId: createdUnit.id,
          reason: input.reason ?? "Org unit created by owner/admin.",
          metadata: {
            unitType: input.type,
            parentUnitId: parent?.id ?? null,
            parentType: parent?.type ?? null,
            slug,
            planUsageBeforeCreate: {
              activeUnits: planUsage.activeUnits,
              maxUnits: planUsage.maxUnits,
              remaining: planUsage.remaining,
            },
          },
        },
      });

      return createdUnit;
    });

    return Response.json({ unit: toUnitDto(unit), planUsage: await getPlanUsage(session) }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
