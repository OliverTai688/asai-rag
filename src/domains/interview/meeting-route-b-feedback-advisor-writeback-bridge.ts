import type {
  VisitRouteBFeedbackAdvisorContext,
  VisitRouteBFeedbackAdvisorContextItem,
} from "../visit/route-b-feedback-advisor-context";

export type MeetingRouteBFeedbackAdvisorWritebackBridgeStatus =
  | "NO_CONTEXT"
  | "NO_FEEDBACK_PROFILE_ITEMS"
  | "SUMMARY_REQUIRED"
  | "READY_FOR_ADVISOR_REVIEW";

export interface MeetingRouteBFeedbackAdvisorWritebackBridgeCard {
  id: string;
  source: "theater_route_b_feedback_profile";
  target: "MEETING_WRITEBACK_PREVIEW_CONTEXT";
  status: "confirmed" | "inference" | "unknown";
  cardType:
    | "writeback_context_confirmed_profile"
    | "writeback_context_inference_profile"
    | "writeback_context_unknown_profile";
  targetLabel: string;
  fieldLabel: string;
  label: string;
  detail: string;
  followUpQuestion: string;
  requiresConfirmation: true;
  persistedSummaryRequired: true;
  advisorConfirmationRequired: true;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
  writesClientProfile: false;
  writesPolicy: false;
  writesConfirmedCrmFact: false;
}

export interface MeetingRouteBFeedbackAdvisorWritebackBridge {
  agentId: "asai.meeting.prototype";
  actionId: "route-b-feedback-advisor-writeback-preview-bridge";
  registryReadiness: "internal-only";
  sourceAgentId: "asai.visit.preparation_package";
  sourceActionId: "route-b-feedback-family-profile-advisor-context";
  status: MeetingRouteBFeedbackAdvisorWritebackBridgeStatus;
  cards: MeetingRouteBFeedbackAdvisorWritebackBridgeCard[];
  summary: {
    cardCount: number;
    confirmedCount: number;
    inferenceCount: number;
    unknownCount: number;
    profiledMemberCount: number;
    fieldCount: number;
  };
  requirements: {
    persistedSummaryRequired: true;
    advisorWritebackSelectionRequired: true;
    advisorConfirmationRequired: true;
    directWritebackDisabled: true;
  };
  safety: {
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    aiUsageLogWritten: false;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesClientProfile: false;
    writesPolicy: false;
    writesConfirmedCrmFact: false;
    storesRawProviderPayload: false;
    storesRawPrivateTranscriptSidecar: false;
    returnsSourcePacketId: false;
    returnsRawTheaterSessionId: false;
    returnsRawPersonId: false;
  };
}

export function buildMeetingRouteBFeedbackAdvisorWritebackBridge(input: {
  context?: VisitRouteBFeedbackAdvisorContext | null;
  hasPersistedSummary: boolean;
}): MeetingRouteBFeedbackAdvisorWritebackBridge {
  const cards = (input.context?.items ?? []).map(mapFeedbackAdvisorItemToWritebackBridgeCard);
  const status = resolveBridgeStatus(Boolean(input.context), cards.length, input.hasPersistedSummary);

  return {
    agentId: "asai.meeting.prototype",
    actionId: "route-b-feedback-advisor-writeback-preview-bridge",
    registryReadiness: "internal-only",
    sourceAgentId: "asai.visit.preparation_package",
    sourceActionId: "route-b-feedback-family-profile-advisor-context",
    status,
    cards,
    summary: {
      cardCount: cards.length,
      confirmedCount: cards.filter((card) => card.status === "confirmed").length,
      inferenceCount: cards.filter((card) => card.status === "inference").length,
      unknownCount: cards.filter((card) => card.status === "unknown").length,
      profiledMemberCount: input.context?.summary.profiledMemberCount ?? 0,
      fieldCount: input.context?.summary.fieldCount ?? 0,
    },
    requirements: {
      persistedSummaryRequired: true,
      advisorWritebackSelectionRequired: true,
      advisorConfirmationRequired: true,
      directWritebackDisabled: true,
    },
    safety: {
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      aiUsageLogWritten: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesClientProfile: false,
      writesPolicy: false,
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
      storesRawPrivateTranscriptSidecar: false,
      returnsSourcePacketId: false,
      returnsRawTheaterSessionId: false,
      returnsRawPersonId: false,
    },
  };
}

function resolveBridgeStatus(
  hasContext: boolean,
  cardCount: number,
  hasPersistedSummary: boolean,
): MeetingRouteBFeedbackAdvisorWritebackBridgeStatus {
  if (!hasContext) return "NO_CONTEXT";
  if (cardCount === 0) return "NO_FEEDBACK_PROFILE_ITEMS";
  if (!hasPersistedSummary) return "SUMMARY_REQUIRED";
  return "READY_FOR_ADVISOR_REVIEW";
}

function mapFeedbackAdvisorItemToWritebackBridgeCard(
  item: VisitRouteBFeedbackAdvisorContextItem,
): MeetingRouteBFeedbackAdvisorWritebackBridgeCard {
  return {
    id: `meeting-feedback-profile-writeback-context-${item.id}`,
    source: item.source,
    target: "MEETING_WRITEBACK_PREVIEW_CONTEXT",
    status: item.status,
    cardType: mapFeedbackAdvisorCardType(item.status),
    targetLabel: item.memberLabel,
    fieldLabel: item.fieldLabel,
    label: item.label,
    detail: item.detail,
    followUpQuestion: item.followUpQuestion,
    requiresConfirmation: true,
    persistedSummaryRequired: true,
    advisorConfirmationRequired: true,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesClientProfile: false,
    writesPolicy: false,
    writesConfirmedCrmFact: false,
  };
}

function mapFeedbackAdvisorCardType(
  status: VisitRouteBFeedbackAdvisorContextItem["status"],
): MeetingRouteBFeedbackAdvisorWritebackBridgeCard["cardType"] {
  if (status === "confirmed") return "writeback_context_confirmed_profile";
  if (status === "inference") return "writeback_context_inference_profile";
  return "writeback_context_unknown_profile";
}
