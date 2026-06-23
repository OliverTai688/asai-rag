import { buildBillingSubscriptionCapabilityDto } from "@/domains/subscription/capability";
import type { BillingSubscriptionCapabilityDto } from "@/domains/subscription/capability";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function buildBillingSubscriptionCapability(
  session: AppSession,
): Promise<BillingSubscriptionCapabilityDto> {
  const [
    organization,
    activeMembers,
    pendingMembers,
    activeCollaborators,
    activeUnits,
  ] = await prisma.$transaction([
    prisma.organization.findUnique({
      where: { id: session.organization.id },
      select: {
        paymentProvider: true,
        providerSubscriptionId: true,
      },
    }),
    prisma.organizationMember.count({
      where: {
        organizationId: session.organization.id,
        status: "ACTIVE",
      },
    }),
    prisma.organizationMember.count({
      where: {
        organizationId: session.organization.id,
        status: "INVITED",
      },
    }),
    prisma.organizationMember.count({
      where: {
        organizationId: session.organization.id,
        role: "COLLABORATOR",
        status: "ACTIVE",
      },
    }),
    prisma.organizationUnit.count({
      where: {
        organizationId: session.organization.id,
        isActive: true,
      },
    }),
  ]);

  return buildBillingSubscriptionCapabilityDto(session, {
    paymentProvider: organization?.paymentProvider ?? null,
    providerAccountAttached: Boolean(organization?.providerSubscriptionId),
    activeMembers,
    pendingMembers,
    activeCollaborators,
    activeUnits,
  });
}
