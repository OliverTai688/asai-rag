import { buildVisitTheaterHandoff } from "@/domains/theater/visit-handoff";
import { isTheaterRouteBFeedbackReview } from "@/domains/theater/route-b-feedback-review";
import {
  buildVisitRouteBFeedbackAdvisorContextFromFeedbackReview,
  type VisitRouteBFeedbackAdvisorContext,
  type VisitRouteBFeedbackAdvisorContextStatus,
} from "@/domains/visit/route-b-feedback-advisor-context";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getVisitPlanForMember } from "@/lib/visits/visit-plan-repository";

export interface VisitRouteBFeedbackAdvisorContextBffDto {
  status: VisitRouteBFeedbackAdvisorContextStatus;
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
  routeBFeedbackAdvisorContext?: VisitRouteBFeedbackAdvisorContext;
  source: {
    matchedBy: "routeBSourcePacketId";
    sourceActionId: "route-b-feedback-persistence";
    feedbackReviewUpdatedAt?: string;
  };
  summary: VisitRouteBFeedbackAdvisorContext["summary"];
  proof: {
    ownerScopedVisitPlan: true;
    ownerScopedTheaterSessionLookup: true;
    browserSuppliedTheaterSessionId: false;
    browserSuppliedPersonId: false;
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesClientProfile: false;
    writesPolicy: false;
    writesConfirmedCrmFact: false;
  };
}

export type GetVisitRouteBFeedbackAdvisorContextResult =
  | { status: "OK"; data: VisitRouteBFeedbackAdvisorContextBffDto }
  | { status: "VISIT_PLAN_NOT_FOUND" };

const emptySummary: VisitRouteBFeedbackAdvisorContext["summary"] = {
  itemCount: 0,
  confirmedCount: 0,
  inferenceCount: 0,
  unknownCount: 0,
  profiledMemberCount: 0,
  fieldCount: 0,
};

export async function getVisitRouteBFeedbackAdvisorContextForMember(
  session: AppSession,
  visitPlanId: string,
): Promise<GetVisitRouteBFeedbackAdvisorContextResult> {
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

  const feedbackReview = asRecord(routeBSession.sceneState).feedbackReview;

  if (!isTheaterRouteBFeedbackReview(feedbackReview)) {
    return {
      status: "OK",
      data: buildEmptyContextDto({
        status: "NO_FEEDBACK_REVIEW",
        visitPlanId: source.visitPlan.id,
        clientId: source.client.id,
        sourcePacketId,
        feedbackReviewUpdatedAt: routeBSession.updatedAt.toISOString(),
      }),
    };
  }

  const routeBFeedbackAdvisorContext = buildVisitRouteBFeedbackAdvisorContextFromFeedbackReview(feedbackReview);

  if (routeBFeedbackAdvisorContext.summary.itemCount === 0) {
    return {
      status: "OK",
      data: buildEmptyContextDto({
        status: "NO_FEEDBACK_PROFILE_CONTEXT",
        visitPlanId: source.visitPlan.id,
        clientId: source.client.id,
        sourcePacketId,
        feedbackReviewUpdatedAt: routeBSession.updatedAt.toISOString(),
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
      routeBFeedbackAdvisorContext,
      source: {
        matchedBy: "routeBSourcePacketId",
        sourceActionId: "route-b-feedback-persistence",
        feedbackReviewUpdatedAt: routeBSession.updatedAt.toISOString(),
      },
      summary: routeBFeedbackAdvisorContext.summary,
      proof: buildProof(),
    },
  };
}

function buildEmptyContextDto(input: {
  status: VisitRouteBFeedbackAdvisorContextStatus;
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
  feedbackReviewUpdatedAt?: string;
}): VisitRouteBFeedbackAdvisorContextBffDto {
  return {
    status: input.status,
    visitPlanId: input.visitPlanId,
    clientId: input.clientId,
    sourcePacketId: input.sourcePacketId,
    source: {
      matchedBy: "routeBSourcePacketId",
      sourceActionId: "route-b-feedback-persistence",
      feedbackReviewUpdatedAt: input.feedbackReviewUpdatedAt,
    },
    summary: emptySummary,
    proof: buildProof(),
  };
}

function buildProof(): VisitRouteBFeedbackAdvisorContextBffDto["proof"] {
  return {
    ownerScopedVisitPlan: true,
    ownerScopedTheaterSessionLookup: true,
    browserSuppliedTheaterSessionId: false,
    browserSuppliedPersonId: false,
    providerCallAttempted: false,
    aiUsageLogWritten: false,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesClientProfile: false,
    writesPolicy: false,
    writesConfirmedCrmFact: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
