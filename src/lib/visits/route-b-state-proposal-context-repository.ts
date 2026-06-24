import { buildVisitTheaterHandoff } from "@/domains/theater/visit-handoff";
import {
  buildVisitRouteBStateProposalContext,
  type VisitRouteBStateProposalContext,
  type VisitRouteBStateProposalContextStatus,
  type VisitRouteBStateProposalPatchSource,
} from "@/domains/visit/route-b-state-proposal-context";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getVisitPlanForMember } from "@/lib/visits/visit-plan-repository";

export interface VisitRouteBStateProposalContextBffDto {
  status: VisitRouteBStateProposalContextStatus;
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
  routeBStateProposalContext?: VisitRouteBStateProposalContext;
  source: {
    matchedBy: "routeBSourcePacketId";
    sourceActionId: "route-b-state-proposal-persistence";
    stateProposalUpdatedAt?: string;
  };
  summary: VisitRouteBStateProposalContext["summary"];
  proof: {
    ownerScopedVisitPlan: true;
    ownerScopedTheaterSessionLookup: true;
    browserSuppliedTheaterSessionId: false;
    browserSuppliedPersonId: false;
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesConfirmedCrmFact: false;
  };
}

export type GetVisitRouteBStateProposalContextResult =
  | { status: "OK"; data: VisitRouteBStateProposalContextBffDto }
  | { status: "VISIT_PLAN_NOT_FOUND" };

const emptySummary: VisitRouteBStateProposalContext["summary"] = {
  itemCount: 0,
  unknownCount: 0,
  inferenceCount: 0,
  evidenceNeededCount: 0,
  nextQuestionCount: 0,
  sceneProposalCount: 0,
  turnProposalCount: 0,
  privateScopeCount: 0,
  narratorQueueCount: 0,
  relationshipStateCount: 0,
};

export async function getVisitRouteBStateProposalContextForMember(
  session: AppSession,
  visitPlanId: string,
): Promise<GetVisitRouteBStateProposalContextResult> {
  const source = await getVisitPlanForMember(session, visitPlanId);

  if (!source) {
    return { status: "VISIT_PLAN_NOT_FOUND" };
  }

  const handoff = buildVisitTheaterHandoff({
    organizationId: session.organization.id,
    memberId: session.user.id,
    unitId: session.membership.primaryUnitId,
    client: source.client,
    visitPlan: source.visitPlan,
    sessionId: `visit_theater_${source.visitPlan.id}`,
  });
  const sourcePacketId = handoff.packet.id;

  const routeBSession = await prisma.theaterSession.findFirst({
    where: {
      organizationId: session.organization.id,
      ownerId: session.user.id,
      clientId: source.client.id,
      routeBEnabled: true,
      routeBSourcePacketId: sourcePacketId,
    },
    select: {
      sceneState: true,
      updatedAt: true,
      characters: {
        select: {
          routeBCharacterId: true,
          displayName: true,
        },
      },
      turns: {
        orderBy: { createdAt: "asc" },
        select: {
          statePatches: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!routeBSession) {
    return {
      status: "OK",
      data: buildEmptyContextDto({
        status: "NO_ROUTE_B_SESSION",
        visitPlanId: source.visitPlan.id,
        clientId: source.client.id,
        sourcePacketId,
      }),
    };
  }

  const patchSources = collectStateProposalPatchSources({
    sceneState: routeBSession.sceneState,
    turnStatePatches: routeBSession.turns.map((turn) => turn.statePatches),
  });
  const routeBStateProposalContext = buildVisitRouteBStateProposalContext({
    patchSources,
    characters: routeBSession.characters.map((character) => ({
      routeBCharacterId: character.routeBCharacterId,
      displayName: character.displayName,
    })),
  });

  if (routeBStateProposalContext.summary.itemCount === 0) {
    return {
      status: "OK",
      data: buildEmptyContextDto({
        status: "NO_STATE_PROPOSALS",
        visitPlanId: source.visitPlan.id,
        clientId: source.client.id,
        sourcePacketId,
        stateProposalUpdatedAt: routeBSession.updatedAt.toISOString(),
      }),
    };
  }

  return {
    status: "OK",
    data: {
      status: "READY",
      visitPlanId: source.visitPlan.id,
      clientId: source.client.id,
      sourcePacketId,
      routeBStateProposalContext,
      source: {
        matchedBy: "routeBSourcePacketId",
        sourceActionId: "route-b-state-proposal-persistence",
        stateProposalUpdatedAt: routeBSession.updatedAt.toISOString(),
      },
      summary: routeBStateProposalContext.summary,
      proof: buildProof(),
    },
  };
}

function collectStateProposalPatchSources(input: {
  sceneState: unknown;
  turnStatePatches: unknown[];
}): VisitRouteBStateProposalPatchSource[] {
  const sceneState = asRecord(input.sceneState);
  const scenePatches = Array.isArray(sceneState.statePatches) ? sceneState.statePatches : [];
  const turnPatches = input.turnStatePatches.flatMap((value) => {
    if (Array.isArray(value)) return value;
    const record = asRecord(value);
    return Array.isArray(record.statePatches) ? record.statePatches : [];
  });

  return [
    ...scenePatches.map((patch) => ({ origin: "scene_state" as const, patch })),
    ...turnPatches.map((patch) => ({ origin: "turn_state" as const, patch })),
  ];
}

function buildEmptyContextDto(input: {
  status: VisitRouteBStateProposalContextStatus;
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
  stateProposalUpdatedAt?: string;
}): VisitRouteBStateProposalContextBffDto {
  return {
    status: input.status,
    visitPlanId: input.visitPlanId,
    clientId: input.clientId,
    sourcePacketId: input.sourcePacketId,
    source: {
      matchedBy: "routeBSourcePacketId",
      sourceActionId: "route-b-state-proposal-persistence",
      stateProposalUpdatedAt: input.stateProposalUpdatedAt,
    },
    summary: emptySummary,
    proof: buildProof(),
  };
}

function buildProof(): VisitRouteBStateProposalContextBffDto["proof"] {
  return {
    ownerScopedVisitPlan: true,
    ownerScopedTheaterSessionLookup: true,
    browserSuppliedTheaterSessionId: false,
    browserSuppliedPersonId: false,
    providerCallAttempted: false,
    aiUsageLogWritten: false,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesConfirmedCrmFact: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
