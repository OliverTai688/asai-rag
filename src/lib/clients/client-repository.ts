import { z } from "zod";
import { ClientStatus } from "@/generated/prisma/enums";
import { canReadClientDetail, canWriteClient } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { toClientDto } from "./client-dto";

export const createClientInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(8).max(40).optional().or(z.literal("")),
  birthDate: z.string().trim().optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  annualIncome: z.coerce.number().min(0).max(999999999).default(0),
  status: z.enum(["PROSPECT", "ACTIVE", "CLOSED"]).default("PROSPECT"),
});

export const updateClientInputSchema = createClientInputSchema.partial();

export const createFamilyMemberInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  relation: z.string().trim().min(1).max(40),
  age: z.coerce.number().int().min(0).max(130).optional(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  parentMemberId: z.string().trim().optional().or(z.literal("")),
});

export const createPolicyInputSchema = z.object({
  type: z.string().trim().min(1).max(80),
  provider: z.string().trim().min(1).max(120),
  amount: z.coerce.number().min(0).max(999999999).default(0),
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;
export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;
export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberInputSchema>;
export type CreatePolicyInput = z.infer<typeof createPolicyInputSchema>;

const clientInclude = {
  complianceChecklist: true,
  familyMembers: {
    orderBy: { createdAt: "asc" },
  },
  policies: {
    orderBy: { createdAt: "asc" },
  },
} as const;

export async function listClientsForMember(session: AppSession) {
  const records = await prisma.client.findMany({
    where: {
      organizationId: session.organization.id,
      ownerId: session.user.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    include: clientInclude,
    orderBy: [{ lastInteractionAt: "desc" }, { updatedAt: "desc" }],
  });

  return records.map(toClientDto);
}

export async function createClientForMember(session: AppSession, input: CreateClientInput) {
  const record = await prisma.client.create({
    data: {
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId,
      ownerId: session.user.id,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      occupation: input.occupation || null,
      annualIncome: input.annualIncome,
      status: input.status,
      sensitivity: "NORMAL",
      tags: [],
      aiTags: [],
      lastInteractionAt: new Date(),
      complianceChecklist: {
        create: {
          kycStatus: "MISSING",
          suitabilityStatus: "MISSING",
          consentStatus: "MISSING",
          missingItems: ["KYC", "適合度評估", "個資同意"],
        },
      },
    },
    include: clientInclude,
  });

  return toClientDto(record);
}

export async function getClientForMember(session: AppSession, clientId: string) {
  const record = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    include: clientInclude,
  });

  if (!record || !canReadClientDetail(session, record)) {
    return null;
  }

  return toClientDto(record);
}

export async function updateClientForMember(session: AppSession, clientId: string, input: UpdateClientInput) {
  const current = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    select: {
      organizationId: true,
      unitId: true,
      ownerId: true,
    },
  });

  if (!current || !canWriteClient(session, current)) {
    return null;
  }

  const record = await prisma.client.update({
    where: { id: clientId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.birthDate !== undefined ? { birthDate: input.birthDate ? new Date(input.birthDate) : null } : {}),
      ...(input.occupation !== undefined ? { occupation: input.occupation || null } : {}),
      ...(input.annualIncome !== undefined ? { annualIncome: input.annualIncome } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      lastInteractionAt: new Date(),
    },
    include: clientInclude,
  });

  return toClientDto(record);
}

export async function createFamilyMemberForClient(
  session: AppSession,
  clientId: string,
  input: CreateFamilyMemberInput,
) {
  const current = await getWritableClientScope(session, clientId);

  if (!current) {
    return null;
  }

  await prisma.familyMember.create({
    data: {
      clientId,
      name: input.name,
      relation: input.relation,
      age: input.age ?? null,
      phone: input.phone || null,
      parentMemberId: input.parentMemberId || null,
    },
  });

  return getClientForMember(session, clientId);
}

export async function createPolicyForClient(
  session: AppSession,
  clientId: string,
  input: CreatePolicyInput,
) {
  const current = await getWritableClientScope(session, clientId);

  if (!current) {
    return null;
  }

  await prisma.policy.create({
    data: {
      clientId,
      category: input.type,
      provider: input.provider,
      insuredAmount: input.amount,
      status: "UNKNOWN",
    },
  });

  return getClientForMember(session, clientId);
}

async function getWritableClientScope(session: AppSession, clientId: string) {
  const current = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    select: {
      organizationId: true,
      unitId: true,
      ownerId: true,
    },
  });

  if (!current || !canWriteClient(session, current)) {
    return null;
  }

  return current;
}
