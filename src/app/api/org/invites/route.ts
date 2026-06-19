import { createHash } from "node:crypto";
import { z } from "zod";
import { authErrorResponse, requireOrgAdmin } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { checkInviteLimit } from "@/domains/subscription/plan-config";
import type { InviteRole, PlanConfig } from "@/domains/subscription/types";
import { prisma } from "@/lib/prisma";

const inviteInputSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(80).optional().nullable(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER", "AGENT", "COLLABORATOR"]),
  primaryUnitId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(80).optional().nullable(),
  reason: z.string().trim().min(4).max(240),
  riskAccepted: z.literal(true),
});

function canInviteMembers(session: AppSession) {
  return session.membership.role === "OWNER" || session.membership.role === "ADMIN";
}

function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  const prefix = localPart.slice(0, 2);
  const suffix = localPart.length > 4 ? localPart.slice(-1) : "";

  return `${prefix}${"*".repeat(Math.max(2, localPart.length - prefix.length - suffix.length))}${suffix}@${domain}`;
}

function hashEmail(email: string) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

function toPlanConfig(session: AppSession): PlanConfig {
  return {
    plan: session.planCapability.plan,
    displayName: session.planCapability.plan,
    maxMembers: session.planCapability.maxMembers,
    maxCollaborators: session.planCapability.maxCollaborators,
    maxUnits: session.planCapability.maxUnits,
    monthlyAiQuota: session.planCapability.monthlyAiQuota,
    shareBrandingEnabled: session.planCapability.shareBrandingEnabled,
    clientPortalEnabled: session.planCapability.clientPortalEnabled,
    impersonationAllowed: true,
  };
}

async function getSeatUsage(organizationId: string) {
  const [collaborators, nonCollaborators] = await Promise.all([
    prisma.organizationMember.count({
      where: {
        organizationId,
        role: "COLLABORATOR",
        status: { in: ["ACTIVE", "INVITED"] },
      },
    }),
    prisma.organizationMember.count({
      where: {
        organizationId,
        role: { not: "COLLABORATOR" },
        status: { in: ["ACTIVE", "INVITED"] },
      },
    }),
  ]);

  return {
    activeCollaborators: collaborators,
    activeMembers: nonCollaborators,
  };
}

async function validatePrimaryUnit(session: AppSession, primaryUnitId: string | null | undefined) {
  if (!primaryUnitId) return null;

  const unit = await prisma.organizationUnit.findFirst({
    where: {
      id: primaryUnitId,
      organizationId: session.organization.id,
      isActive: true,
    },
    select: { id: true, name: true, type: true },
  });

  if (!unit) {
    return Response.json({ error: "ORG_INVITE_UNIT_NOT_FOUND" }, { status: 404 });
  }

  return unit;
}

export async function POST(req: Request) {
  try {
    const session = await requireOrgAdmin();

    if (!canInviteMembers(session)) {
      return Response.json({ error: "ORG_INVITES_WRITE_FORBIDDEN" }, { status: 403 });
    }

    const parsedBody = inviteInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_ORG_INVITE_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const input = parsedBody.data;
    const email = input.email.toLowerCase();
    const emailMasked = maskEmail(email);
    const emailHash = hashEmail(email);
    const primaryUnit = await validatePrimaryUnit(session, input.primaryUnitId);

    if (primaryUnit instanceof Response) {
      return primaryUnit;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        status: true,
        memberships: {
          where: { organizationId: session.organization.id },
          select: { id: true, role: true, status: true },
          take: 1,
        },
      },
    });
    const existingMembership = existingUser?.memberships[0] ?? null;

    if (existingMembership?.status === "ACTIVE") {
      return Response.json({ error: "ORG_MEMBER_ALREADY_ACTIVE", emailMasked }, { status: 409 });
    }

    const isExistingPendingInvite = existingMembership?.status === "INVITED";
    const seatUsage = await getSeatUsage(session.organization.id);
    const planDecision = isExistingPendingInvite
      ? {
          allowed: true,
          used:
            input.role === "COLLABORATOR"
              ? seatUsage.activeCollaborators
              : seatUsage.activeMembers,
          limit:
            input.role === "COLLABORATOR"
              ? session.planCapability.maxCollaborators
              : session.planCapability.maxMembers,
        }
      : checkInviteLimit(toPlanConfig(session), seatUsage, input.role as InviteRole);

    if (!planDecision.allowed) {
      return Response.json(
        {
          error: planDecision.code,
          message: planDecision.message,
          emailMasked,
          planUsage: {
            activeMembers: seatUsage.activeMembers,
            activeCollaborators: seatUsage.activeCollaborators,
            maxMembers: session.planCapability.maxMembers,
            maxCollaborators: session.planCapability.maxCollaborators,
          },
        },
        { status: 403 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email,
            name: input.name ?? email.split("@")[0] ?? "Invited user",
            status: "ACTIVE",
            isDemo: session.organization.slug.startsWith("demo-"),
            demoScenario: session.organization.slug.startsWith("demo-") ? "quickstart-insurance-advisor" : null,
            demoSeedVersion: session.organization.slug.startsWith("demo-") ? 1 : null,
          },
          select: { id: true, name: true, status: true },
        }));

      const membership = await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: session.organization.id,
            userId: user.id,
          },
        },
        create: {
          organizationId: session.organization.id,
          userId: user.id,
          primaryUnitId: primaryUnit?.id ?? null,
          role: input.role,
          status: "INVITED",
          title: input.title ?? null,
          region: input.region ?? null,
          invitedAt: new Date(),
          isDefault: false,
        },
        update: {
          primaryUnitId: primaryUnit?.id ?? null,
          role: input.role,
          status: "INVITED",
          title: input.title ?? null,
          region: input.region ?? null,
          invitedAt: new Date(),
          acceptedAt: null,
        },
        select: {
          id: true,
          role: true,
          status: true,
          primaryUnitId: true,
          invitedAt: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: session.organization.id,
          actorUserId: session.user.id,
          action: "SUPPORT_NOTE",
          sensitivity: "MEDIUM",
          resourceType: "ORG_INVITE",
          resourceId: membership.id,
          reason: input.reason,
          metadata: {
            emailHash,
            emailMasked,
            role: input.role,
            primaryUnitId: primaryUnit?.id ?? null,
            limitDecision: {
              allowed: planDecision.allowed,
              code: planDecision.code ?? null,
              used: planDecision.used ?? null,
              limit: planDecision.limit ?? null,
            },
            riskAccepted: input.riskAccepted,
            delivery: "not_sent",
          },
        },
      });

      return { membership, user };
    });

    return Response.json(
      {
        invite: {
          membershipId: result.membership.id,
          emailMasked,
          userId: result.user.id,
          displayName: result.user.name,
          role: result.membership.role,
          status: result.membership.status,
          primaryUnit: primaryUnit
            ? {
                id: primaryUnit.id,
                name: primaryUnit.name,
                type: primaryUnit.type,
              }
            : null,
          invitedAt: result.membership.invitedAt?.toISOString() ?? null,
          updatedAt: result.membership.updatedAt.toISOString(),
          delivery: "not_sent",
        },
        planUsage: {
          activeMembers: seatUsage.activeMembers,
          activeCollaborators: seatUsage.activeCollaborators,
          maxMembers: session.planCapability.maxMembers,
          maxCollaborators: session.planCapability.maxCollaborators,
        },
      },
      { status: isExistingPendingInvite ? 200 : 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
