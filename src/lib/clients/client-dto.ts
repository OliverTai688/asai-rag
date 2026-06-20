import type {
  Client as DbClient,
  ComplianceChecklist as DbComplianceChecklist,
  FamilyMember as DbFamilyMember,
  Policy as DbPolicy,
  Prisma,
} from "@/generated/prisma/client";
import type { Client, ClientComplianceChecklist, FamilyMember, Policy } from "@/domains/client/types";
import { DEFAULT_CLIENT_COMPLIANCE } from "@/domains/client/types";

export type ClientRecord = DbClient & {
  complianceChecklist: DbComplianceChecklist | null;
  familyMembers: DbFamilyMember[];
  policies: DbPolicy[];
};

export function toClientDto(record: ClientRecord): Client {
  const complianceChecklist = toComplianceDto(record.complianceChecklist);

  return {
    id: record.id,
    name: record.name,
    email: record.email ?? "",
    phone: record.phone ?? "",
    birthDate: record.birthDate?.toISOString().slice(0, 10) ?? "",
    occupation: record.occupation ?? "",
    annualIncome: decimalToNumber(record.annualIncome),
    family: record.familyMembers.map(toFamilyDto),
    existingPolicies: record.policies.map(toPolicyDto),
    tags: record.tags,
    aiTags: record.aiTags,
    status: record.status === "ARCHIVED" ? "CLOSED" : record.status,
    notes: record.notes ?? undefined,
    complianceChecklist,
    sensitivityLevel: record.sensitivity,
    kycStatus: complianceChecklist.kycStatus,
    lastInteraction: (record.lastInteractionAt ?? record.updatedAt ?? record.createdAt).toISOString(),
  };
}

function toComplianceDto(record: DbComplianceChecklist | null): ClientComplianceChecklist {
  if (!record) {
    return DEFAULT_CLIENT_COMPLIANCE;
  }

  return {
    kycStatus: record.kycStatus,
    suitabilityStatus: record.suitabilityStatus,
    consentStatus: record.consentStatus,
    missingItems: record.missingItems,
    reviewedAt: record.reviewedAt?.toISOString(),
  };
}

function toFamilyDto(record: DbFamilyMember): FamilyMember {
  return {
    id: record.id,
    relation: record.relation,
    name: record.name,
    age: record.age ?? undefined,
    phone: record.phone ?? undefined,
    linkedClientId: record.linkedClientId ?? undefined,
    parentMemberId: record.parentMemberId ?? undefined,
  };
}

function toPolicyDto(record: DbPolicy): Policy {
  return {
    id: record.id,
    type: record.category,
    amount: decimalToNumber(record.insuredAmount),
    provider: record.provider,
  };
}

function decimalToNumber(value: Prisma.Decimal | null): number {
  if (!value) {
    return 0;
  }

  return Number(value.toString());
}
