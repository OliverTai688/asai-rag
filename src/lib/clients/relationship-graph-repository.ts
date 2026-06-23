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

  const client = toClientDto(record);
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
