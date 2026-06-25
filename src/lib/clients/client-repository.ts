import { z } from "zod";
import { ClientStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import {
  familyMemberProfileInputSchema,
  mergeFamilyMemberProfileIntoMetadata,
} from "@/domains/client/family-member-profile";
import { normalizeRelationshipType } from "@/domains/client/types";
import { canReadClientDetail, canWriteClient } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { toArchivedClientDto, toClientDto } from "./client-dto";

export const createClientInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(8).max(40).optional().or(z.literal("")),
  birthDate: z.string().trim().optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  annualIncome: z.coerce.number().min(0).max(999999999).default(0),
  status: z.enum(["PROSPECT", "ACTIVE", "CLOSED"]).default("PROSPECT"),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const updateClientInputSchema = createClientInputSchema.partial();

export const createFamilyMemberInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  relation: z.string().trim().min(1).max(40),
  age: z.coerce.number().int().min(0).max(130).optional(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  parentMemberId: z.string().trim().optional().or(z.literal("")),
  profile: familyMemberProfileInputSchema.nullish(),
});

export const updateFamilyMemberInputSchema = createFamilyMemberInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required." },
);

export const createPolicyInputSchema = z.object({
  type: z.string().trim().min(1).max(80),
  provider: z.string().trim().min(1).max(120),
  amount: z.coerce.number().min(0).max(999999999).default(0),
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;
export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;
export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberInputSchema>;
export type UpdateFamilyMemberInput = z.infer<typeof updateFamilyMemberInputSchema>;
export type CreatePolicyInput = z.infer<typeof createPolicyInputSchema>;

type FamilyMemberParentValidationError =
  | "FAMILY_MEMBER_PARENT_NOT_FOUND"
  | "FAMILY_MEMBER_PARENT_SELF"
  | "FAMILY_MEMBER_PARENT_CYCLE";

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
      notes: input.notes || null,
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
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      lastInteractionAt: new Date(),
    },
    include: clientInclude,
  });

  return toClientDto(record);
}

export async function archiveClientForMember(session: AppSession, clientId: string) {
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
      status: ClientStatus.ARCHIVED,
      lastInteractionAt: new Date(),
    },
    include: clientInclude,
  });

  return toArchivedClientDto(record);
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

  const members = await prisma.familyMember.findMany({
    where: { clientId },
    select: { id: true, parentMemberId: true },
  });
  const nextParentMemberId = input.parentMemberId?.trim() || null;
  const parentValidationError = validateFamilyParentMemberId(members, null, nextParentMemberId);

  if (parentValidationError) {
    return { error: parentValidationError };
  }

  await prisma.familyMember.create({
    data: {
      clientId,
      name: input.name,
      relation: normalizeRelationshipType(input.relation),
      age: input.age ?? null,
      phone: input.phone || null,
      parentMemberId: nextParentMemberId,
      ...(input.profile !== undefined
        ? { metadata: toNullableInputJson(mergeFamilyMemberProfileIntoMetadata(null, input.profile) ?? null) }
        : {}),
    },
  });

  return getClientForMember(session, clientId);
}

export async function updateFamilyMemberForClient(
  session: AppSession,
  clientId: string,
  memberId: string,
  input: UpdateFamilyMemberInput,
) {
  const current = await getWritableClientScope(session, clientId);

  if (!current) {
    return null;
  }

  const members = await prisma.familyMember.findMany({
    where: { clientId },
    select: { id: true, parentMemberId: true, metadata: true },
  });
  const target = members.find((member) => member.id === memberId);

  if (!target) {
    return null;
  }

  const nextParentMemberId =
    input.parentMemberId === undefined ? undefined : input.parentMemberId.trim() || null;

  if (nextParentMemberId !== undefined) {
    const parentValidationError = validateFamilyParentMemberId(members, memberId, nextParentMemberId);

    if (parentValidationError) {
      return { error: parentValidationError };
    }
  }

  await prisma.$transaction([
    prisma.familyMember.update({
      where: { id: memberId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.relation !== undefined ? { relation: normalizeRelationshipType(input.relation) } : {}),
        ...(input.age !== undefined ? { age: input.age ?? null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(nextParentMemberId !== undefined ? { parentMemberId: nextParentMemberId } : {}),
        ...(input.profile !== undefined
          ? {
              metadata: toNullableInputJson(
                mergeFamilyMemberProfileIntoMetadata(target.metadata, input.profile) ?? null,
              ),
            }
          : {}),
      },
    }),
    prisma.client.update({
      where: { id: clientId },
      data: { lastInteractionAt: new Date() },
    }),
  ]);

  return getClientForMember(session, clientId);
}

export async function deleteFamilyMemberForClient(
  session: AppSession,
  clientId: string,
  memberId: string,
) {
  const current = await getWritableClientScope(session, clientId);

  if (!current) {
    return null;
  }

  const target = await prisma.familyMember.findFirst({
    where: { id: memberId, clientId },
    select: { id: true, parentMemberId: true },
  });

  if (!target) {
    return null;
  }

  await prisma.$transaction([
    prisma.familyMember.updateMany({
      where: { clientId, parentMemberId: memberId },
      data: { parentMemberId: target.parentMemberId ?? null },
    }),
    prisma.familyMember.delete({
      where: { id: memberId },
    }),
    prisma.client.update({
      where: { id: clientId },
      data: { lastInteractionAt: new Date() },
    }),
  ]);

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

function wouldCreateFamilyCycle(
  members: Array<{ id: string; parentMemberId: string | null }>,
  memberId: string,
  proposedParentId: string,
) {
  let currentParentId: string | null | undefined = proposedParentId;
  const seen = new Set<string>();

  while (currentParentId) {
    if (currentParentId === memberId) return true;
    if (seen.has(currentParentId)) return true;
    seen.add(currentParentId);
    currentParentId = members.find((member) => member.id === currentParentId)?.parentMemberId;
  }

  return false;
}

function validateFamilyParentMemberId(
  members: Array<{ id: string; parentMemberId: string | null }>,
  memberId: string | null,
  proposedParentId: string | null,
): FamilyMemberParentValidationError | null {
  if (!proposedParentId) return null;

  if (memberId && proposedParentId === memberId) {
    return "FAMILY_MEMBER_PARENT_SELF";
  }

  if (!members.some((member) => member.id === proposedParentId)) {
    return "FAMILY_MEMBER_PARENT_NOT_FOUND";
  }

  if (memberId && wouldCreateFamilyCycle(members, memberId, proposedParentId)) {
    return "FAMILY_MEMBER_PARENT_CYCLE";
  }

  return null;
}

function toNullableInputJson(
  value: Record<string, unknown> | null,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}
