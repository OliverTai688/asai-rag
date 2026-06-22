import type { TheaterRouteBFeedbackReview } from "../theater/route-b-feedback-review";
import type {
  RouteBRedLineActionReasonCode,
  RouteBRedLineActionState,
} from "../theater/route-b-red-line-action-workflow";
import type { VisitQuestionEvidence } from "./types";

export interface VisitRouteBRedLineContextItem {
  id: string;
  source: "theater_route_b_red_line";
  status: "inference" | "unknown";
  label: string;
  detail: string;
  actionState: RouteBRedLineActionState;
  advisorReasonCode: RouteBRedLineActionReasonCode;
  evidenceNeeded: boolean;
  escalationRequested: boolean;
  noLegalAdvice: true;
  noFormalFinding: true;
  writesConfirmedCrmFact: false;
  triggersExternalNotification: false;
}

export interface VisitRouteBRedLineContext {
  agentId: "asai.visit.preparation_package";
  actionId: "route-b-red-line-action-visit-prep-consumption";
  registryReadiness: "internal-only";
  sourceAgentId: "asai.theater.route_b";
  sourceActionId: "route-b-red-line-action-feedback-consumption";
  sourceFeedbackReviewId: string;
  sourceSessionId: string;
  items: VisitRouteBRedLineContextItem[];
  summary: {
    itemCount: number;
    evidenceNeededCount: number;
    escalateCount: number;
    notApplicableCount: number;
    watchingCount: number;
  };
  outputContract: {
    factsInferencesUnknownsSeparated: true;
    advisorContextOnly: true;
    doesNotOverwriteVisitFacts: true;
    noLegalAdvice: true;
    noFormalFinding: true;
    writesConfirmedCrmFact: false;
    triggersExternalNotification: false;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    storesRawProviderPayload: false;
  };
  privacyProof: {
    rawPrivateTranscriptReturned: false;
    rawProviderPayloadReturned: false;
    personalContactReturned: false;
    policyNumberReturned: false;
  };
}

export function buildVisitRouteBRedLineContextFromFeedbackReview(
  review: TheaterRouteBFeedbackReview,
): VisitRouteBRedLineContext {
  const items = review.redLineFindings
    .filter((finding) => finding.actionContext !== undefined)
    .map((finding): VisitRouteBRedLineContextItem => {
      const actionContext = finding.actionContext;
      const actionState = actionContext?.state ?? "WATCHING";

      return {
        id: `route-b-red-line-${finding.redLineId}`,
        source: "theater_route_b_red_line",
        status: actionState === "EVIDENCE_NEEDED" || actionState === "ESCALATE" ? "unknown" : "inference",
        label: `劇場紅線提醒：${finding.label}`,
        detail: buildContextDetail({
          label: finding.label,
          actionState,
          advisorReasonCode: actionContext?.advisorReasonCode ?? "ADVISOR_REVIEWED",
        }),
        actionState,
        advisorReasonCode: actionContext?.advisorReasonCode ?? "ADVISOR_REVIEWED",
        evidenceNeeded: actionState === "EVIDENCE_NEEDED" || actionState === "ESCALATE",
        escalationRequested: actionState === "ESCALATE",
        noLegalAdvice: true,
        noFormalFinding: true,
        writesConfirmedCrmFact: false,
        triggersExternalNotification: false,
      };
    });

  return {
    agentId: "asai.visit.preparation_package",
    actionId: "route-b-red-line-action-visit-prep-consumption",
    registryReadiness: "internal-only",
    sourceAgentId: review.agentId,
    sourceActionId: "route-b-red-line-action-feedback-consumption",
    sourceFeedbackReviewId: review.id,
    sourceSessionId: review.sessionId,
    items,
    summary: {
      itemCount: items.length,
      evidenceNeededCount: items.filter((item) => item.actionState === "EVIDENCE_NEEDED").length,
      escalateCount: items.filter((item) => item.actionState === "ESCALATE").length,
      notApplicableCount: items.filter((item) => item.actionState === "NOT_APPLICABLE").length,
      watchingCount: items.filter((item) => item.actionState === "WATCHING").length,
    },
    outputContract: {
      factsInferencesUnknownsSeparated: true,
      advisorContextOnly: true,
      doesNotOverwriteVisitFacts: true,
      noLegalAdvice: true,
      noFormalFinding: true,
      writesConfirmedCrmFact: false,
      triggersExternalNotification: false,
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      storesRawProviderPayload: false,
    },
    privacyProof: {
      rawPrivateTranscriptReturned: false,
      rawProviderPayloadReturned: false,
      personalContactReturned: false,
      policyNumberReturned: false,
    },
  };
}

export function selectVisitRouteBRedLineQuestionEvidence(
  context: VisitRouteBRedLineContext | undefined,
  maxItems = 2,
): VisitQuestionEvidence[] {
  if (!context) return [];

  return context.items
    .filter((item) => item.actionState === "ESCALATE" || item.actionState === "EVIDENCE_NEEDED")
    .slice(0, maxItems)
    .map((item): VisitQuestionEvidence => ({
      id: item.id,
      source: item.source,
      status: item.status,
      label: item.label,
      detail: item.detail,
    }));
}

function buildContextDetail(input: {
  label: string;
  actionState: RouteBRedLineActionState;
  advisorReasonCode: RouteBRedLineActionReasonCode;
}) {
  if (input.actionState === "ESCALATE") {
    return `劇場演練曾將「${input.label}」標為需升級審閱；準備包只能把它列為顧問提醒與待補佐證，不得當作正式法遵結論。原因碼：${input.advisorReasonCode}。`;
  }

  if (input.actionState === "EVIDENCE_NEEDED") {
    return `劇場演練曾將「${input.label}」標為需要佐證；拜訪時先補問可審閱資料，不得寫成已確認客戶事實。原因碼：${input.advisorReasonCode}。`;
  }

  if (input.actionState === "NOT_APPLICABLE") {
    return `劇場演練曾將「${input.label}」標為不適用；準備包僅保留 audit posture，不延伸成客戶事實。原因碼：${input.advisorReasonCode}。`;
  }

  return `劇場演練正在觀察「${input.label}」；準備包僅作顧問提醒，不建立正式結論。原因碼：${input.advisorReasonCode}。`;
}
