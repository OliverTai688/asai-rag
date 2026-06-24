import type {
  VisitRouteBStateProposalContext,
  VisitRouteBStateProposalContextItem,
} from "../visit/route-b-state-proposal-context";

export type MeetingRouteBStateProposalWritebackBridgeStatus =
  | "NO_CONTEXT"
  | "NO_STATE_PROPOSALS"
  | "SUMMARY_REQUIRED"
  | "READY_FOR_ADVISOR_REVIEW";

export interface MeetingRouteBStateProposalWritebackBridgeCard {
  id: string;
  source: "theater_route_b_state_proposal";
  target: "MEETING_WRITEBACK_PREVIEW_CONTEXT";
  status: "inference" | "unknown";
  cardType: "writeback_context_evidence_needed" | "writeback_context_next_question";
  targetLabel: string;
  label: string;
  detail: string;
  followUpQuestion: string;
  evidenceNeeded: boolean;
  requiresConfirmation: true;
  persistedSummaryRequired: true;
  advisorConfirmationRequired: true;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
  writesConfirmedCrmFact: false;
}

export interface MeetingRouteBStateProposalWritebackBridge {
  agentId: "asai.meeting.prototype";
  actionId: "route-b-state-proposal-writeback-preview-bridge";
  registryReadiness: "internal-only";
  sourceAgentId: "asai.theater.route_b";
  sourceActionId: "route-b-state-proposal-persistence";
  status: MeetingRouteBStateProposalWritebackBridgeStatus;
  cards: MeetingRouteBStateProposalWritebackBridgeCard[];
  summary: {
    cardCount: number;
    unknownCount: number;
    inferenceCount: number;
    evidenceNeededCount: number;
    nextQuestionCount: number;
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
    writesConfirmedCrmFact: false;
    storesRawProviderPayload: false;
    storesRawPrivateTranscriptSidecar: false;
    returnsSourcePacketId: false;
    returnsRawTheaterSessionId: false;
    returnsRawPersonId: false;
  };
}

export function buildMeetingRouteBStateProposalWritebackBridge(input: {
  context?: VisitRouteBStateProposalContext | null;
  hasPersistedSummary: boolean;
}): MeetingRouteBStateProposalWritebackBridge {
  const cards = (input.context?.items ?? []).map(mapStateProposalItemToWritebackBridgeCard);
  const status = resolveBridgeStatus(Boolean(input.context), cards.length, input.hasPersistedSummary);

  return {
    agentId: "asai.meeting.prototype",
    actionId: "route-b-state-proposal-writeback-preview-bridge",
    registryReadiness: "internal-only",
    sourceAgentId: "asai.theater.route_b",
    sourceActionId: "route-b-state-proposal-persistence",
    status,
    cards,
    summary: {
      cardCount: cards.length,
      unknownCount: cards.filter((card) => card.status === "unknown").length,
      inferenceCount: cards.filter((card) => card.status === "inference").length,
      evidenceNeededCount: cards.filter((card) => card.evidenceNeeded).length,
      nextQuestionCount: cards.filter((card) => card.cardType === "writeback_context_next_question").length,
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
): MeetingRouteBStateProposalWritebackBridgeStatus {
  if (!hasContext) return "NO_CONTEXT";
  if (cardCount === 0) return "NO_STATE_PROPOSALS";
  if (!hasPersistedSummary) return "SUMMARY_REQUIRED";
  return "READY_FOR_ADVISOR_REVIEW";
}

function mapStateProposalItemToWritebackBridgeCard(
  item: VisitRouteBStateProposalContextItem,
): MeetingRouteBStateProposalWritebackBridgeCard {
  return {
    id: `meeting-writeback-context-${item.id}`,
    source: item.source,
    target: "MEETING_WRITEBACK_PREVIEW_CONTEXT",
    status: item.status,
    cardType: item.cardType === "evidence_needed"
      ? "writeback_context_evidence_needed"
      : "writeback_context_next_question",
    targetLabel: item.targetLabel,
    label: item.label,
    detail: item.detail,
    followUpQuestion: item.followUpQuestion,
    evidenceNeeded: item.evidenceNeeded,
    requiresConfirmation: true,
    persistedSummaryRequired: true,
    advisorConfirmationRequired: true,
    writesRelationshipGraph: false,
    writesVisitPlan: false,
    writesConfirmedCrmFact: false,
  };
}
