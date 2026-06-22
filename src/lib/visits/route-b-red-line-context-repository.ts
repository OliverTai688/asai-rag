import { buildVisitTheaterHandoff } from "@/domains/theater/visit-handoff";
import {
  isTheaterRouteBFeedbackReview,
} from "@/domains/theater/route-b-feedback-review";
import {
  buildVisitRouteBRedLineContextFromFeedbackReview,
  type VisitRouteBRedLineContext,
} from "@/domains/visit/route-b-red-line-context";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getVisitPlanForMember } from "@/lib/visits/visit-plan-repository";

export type VisitRouteBRedLineContextStatus =
  | "READY"
  | "NO_ROUTE_B_SESSION"
  | "NO_FEEDBACK_REVIEW"
  | "NO_ACTION_CONTEXT";

export interface VisitRouteBRedLineContextBffDto {
  status: VisitRouteBRedLineContextStatus;
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
  routeBRedLineContext?: VisitRouteBRedLineContext;
  source: {
    matchedBy: "routeBSourcePacketId";
    sourceActionId: "route-b-red-line-action-feedback-consumption";
    sourceTheaterSessionId?: string;
    sourceFeedbackReviewId?: string;
    feedbackReviewUpdatedAt?: string;
  };
  summary: VisitRouteBRedLineContext["summary"];
  proof: {
    ownerScopedVisitPlan: true;
    ownerScopedTheaterSessionLookup: true;
    browserSuppliedTheaterSessionId: false;
    browserSuppliedPersonId: false;
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesConfirmedCrmFact: false;
    triggersExternalNotification: false;
  };
}

export type GetVisitRouteBRedLineContextResult =
  | { status: "OK"; data: VisitRouteBRedLineContextBffDto }
  | { status: "VISIT_PLAN_NOT_FOUND" };

const emptySummary: VisitRouteBRedLineContext["summary"] = {
  itemCount: 0,
  evidenceNeededCount: 0,
  escalateCount: 0,
  notApplicableCount: 0,
  watchingCount: 0,
};

export async function getVisitRouteBRedLineContextForMember(
  session: AppSession,
  visitPlanId: string,
): Promise<GetVisitRouteBRedLineContextResult> {
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
      id: true,
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
        sourceTheaterSessionId: routeBSession.id,
        feedbackReviewUpdatedAt: routeBSession.updatedAt.toISOString(),
      }),
    };
  }

  const routeBRedLineContext = buildVisitRouteBRedLineContextFromFeedbackReview(feedbackReview);
  const status: VisitRouteBRedLineContextStatus =
    routeBRedLineContext.summary.itemCount > 0 ? "READY" : "NO_ACTION_CONTEXT";

  return {
    status: "OK",
    data: {
      status,
      visitPlanId: source.visitPlan.id,
      clientId: source.client.id,
      sourcePacketId,
      routeBRedLineContext,
      source: {
        matchedBy: "routeBSourcePacketId",
        sourceActionId: "route-b-red-line-action-feedback-consumption",
        sourceTheaterSessionId: routeBSession.id,
        sourceFeedbackReviewId: routeBRedLineContext.sourceFeedbackReviewId,
        feedbackReviewUpdatedAt: routeBSession.updatedAt.toISOString(),
      },
      summary: routeBRedLineContext.summary,
      proof: buildProof(),
    },
  };
}

function buildEmptyContextDto(input: {
  status: VisitRouteBRedLineContextStatus;
  visitPlanId: string;
  clientId: string;
  sourcePacketId: string;
  sourceTheaterSessionId?: string;
  feedbackReviewUpdatedAt?: string;
}): VisitRouteBRedLineContextBffDto {
  return {
    status: input.status,
    visitPlanId: input.visitPlanId,
    clientId: input.clientId,
    sourcePacketId: input.sourcePacketId,
    source: {
      matchedBy: "routeBSourcePacketId",
      sourceActionId: "route-b-red-line-action-feedback-consumption",
      sourceTheaterSessionId: input.sourceTheaterSessionId,
      feedbackReviewUpdatedAt: input.feedbackReviewUpdatedAt,
    },
    summary: emptySummary,
    proof: buildProof(),
  };
}

function buildProof(): VisitRouteBRedLineContextBffDto["proof"] {
  return {
    ownerScopedVisitPlan: true,
    ownerScopedTheaterSessionLookup: true,
    browserSuppliedTheaterSessionId: false,
    browserSuppliedPersonId: false,
    providerCallAttempted: false,
    aiUsageLogWritten: false,
    writesConfirmedCrmFact: false,
    triggersExternalNotification: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
