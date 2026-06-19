import { ClientStatus } from "@/generated/prisma/enums";
import type { ClientTheaterBuild } from "@/domains/theater/client-build";
import { buildClientTheaterBuild } from "@/domains/theater/client-build";
import { canReadClientDetail } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { toClientDto } from "@/lib/clients/client-dto";
import { prisma } from "@/lib/prisma";

const theaterClientInclude = {
  complianceChecklist: true,
  familyMembers: {
    orderBy: { createdAt: "asc" },
  },
  policies: {
    orderBy: { createdAt: "asc" },
  },
} as const;

export type TheaterClientBuildSourceResult =
  | { status: "OK"; data: TheaterClientBuildResponse }
  | { status: "FORBIDDEN" }
  | { status: "NOT_FOUND" };

export type TheaterClientBuildListItem = {
  id: string;
  name: string;
  occupation: string;
  annualIncome: number;
  sensitivityLevel: string;
  kycStatus: string;
  sourceCounts: ClientTheaterBuild["sourceSummary"]["sourceCounts"];
  warnings: string[];
  missing: string[];
};

export type TheaterClientBuildResponse = {
  client: {
    id: string;
    name: string;
    occupation: string;
    annualIncome: number;
    status: string;
    sensitivityLevel: string;
    kycStatus: string;
  };
  build: ClientTheaterBuild;
};

export async function listTheaterClientBuildOptionsForMember(session: AppSession): Promise<TheaterClientBuildListItem[]> {
  const records = await prisma.client.findMany({
    where: {
      organizationId: session.organization.id,
      ownerId: session.user.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    include: theaterClientInclude,
    orderBy: [{ lastInteractionAt: "desc" }, { updatedAt: "desc" }],
    take: 30,
  });

  return records.map((record) => {
    const client = toClientDto(record);
    const build = buildClientTheaterBuild({
      organizationId: session.organization.id,
      memberId: session.user.id,
      unitId: session.membership.primaryUnitId,
      client,
    });

    return {
      id: client.id,
      name: client.name,
      occupation: client.occupation,
      annualIncome: client.annualIncome,
      sensitivityLevel: client.sensitivityLevel,
      kycStatus: client.kycStatus,
      sourceCounts: build.sourceSummary.sourceCounts,
      warnings: build.warnings,
      missing: build.missing,
    };
  });
}

export async function getTheaterClientBuildForMember(
  session: AppSession,
  clientId: string,
): Promise<TheaterClientBuildSourceResult> {
  const record = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    include: theaterClientInclude,
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  if (!canReadClientDetail(session, record)) {
    return { status: "FORBIDDEN" };
  }

  const client = toClientDto(record);
  const build = buildClientTheaterBuild({
    organizationId: session.organization.id,
    memberId: session.user.id,
    unitId: session.membership.primaryUnitId,
    client,
  });

  return {
    status: "OK",
    data: {
      client: {
        id: client.id,
        name: client.name,
        occupation: client.occupation,
        annualIncome: client.annualIncome,
        status: client.status,
        sensitivityLevel: client.sensitivityLevel,
        kycStatus: client.kycStatus,
      },
      build,
    },
  };
}
