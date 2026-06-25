import { ClientStatus } from "@/generated/prisma/enums";
import type { ClientRelationshipGraphReview } from "@/domains/client/relationship-graph";
import { buildClientRelationshipGraphReview } from "@/domains/client/relationship-graph";
import type { RelationshipEdgeShadowBffSummary } from "@/domains/client/relationship-edge-shadow";
import {
  buildRelationshipEdgeShadowBackfill,
  toRelationshipEdgeShadowBffSummary,
} from "@/domains/client/relationship-edge-shadow";
import { canReadClientDetail } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { toClientDto } from "@/lib/clients/client-dto";
import { prisma } from "@/lib/prisma";
import type { Client, FamilyMemberLinkedClientSummary } from "@/domains/client/types";

const relationshipGraphInclude = {
  complianceChecklist: true,
  familyMembers: {
    orderBy: { createdAt: "asc" },
  },
  policies: {
    orderBy: { createdAt: "asc" },
  },
} as const;

export type ClientRelationshipGraphResult =
  | { status: "OK"; data: ClientRelationshipGraphResponse }
  | { status: "FORBIDDEN" }
  | { status: "NOT_FOUND" };

export type ClientRelationshipGraphResponse = {
  client: {
    name: string;
    status: string;
    sensitivityLevel: string;
    kycStatus: string;
  };
  graph: ClientRelationshipGraphReview;
  edgeShadow: RelationshipEdgeShadowBffSummary;
};

export async function getClientRelationshipGraphForMember(
  session: AppSession,
  clientId: string,
): Promise<ClientRelationshipGraphResult> {
  const record = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    include: relationshipGraphInclude,
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  if (!canReadClientDetail(session, record)) {
    return { status: "FORBIDDEN" };
  }

  const client = await attachReadableLinkedClients(session, toClientDto(record));
  const graph = buildClientRelationshipGraphReview(client);
  const edgeShadow = toRelationshipEdgeShadowBffSummary(buildRelationshipEdgeShadowBackfill(client));

  return {
    status: "OK",
    data: {
      client: {
        name: client.name,
        status: client.status,
        sensitivityLevel: client.sensitivityLevel,
        kycStatus: client.kycStatus,
      },
      graph,
      edgeShadow,
    },
  };
}

async function attachReadableLinkedClients(session: AppSession, client: Client): Promise<Client> {
  const linkedClientIds = uniqueClientIds(client.family.map((member) => member.linkedClientId));

  if (linkedClientIds.length === 0) {
    return client;
  }

  const linkedRecords = await prisma.client.findMany({
    where: {
      id: { in: linkedClientIds },
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    select: {
      id: true,
      name: true,
      status: true,
      organizationId: true,
      unitId: true,
      ownerId: true,
    },
  });

  const linkedById = new Map<string, FamilyMemberLinkedClientSummary>();

  linkedRecords.forEach((record) => {
    if (!canReadClientDetail(session, record)) return;

    linkedById.set(record.id, {
      availability: "READABLE",
      displayName: record.name,
      status: record.status as Client["status"],
      href: `/crm/${record.id}`,
    });
  });

  return {
    ...client,
    family: client.family.map((member) => {
      if (!member.linkedClientId) {
        return member;
      }

      return {
        ...member,
        linkedClient: linkedById.get(member.linkedClientId) ?? {
          availability: "UNAVAILABLE",
          displayName: "已連結 CRM 客戶",
        },
      };
    }),
  };
}

function uniqueClientIds(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}
