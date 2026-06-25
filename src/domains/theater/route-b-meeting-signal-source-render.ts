import type {
  TheaterRouteBMeetingSignalGroundingCard,
  TheaterRouteBMeetingSignalGroundingSummary,
} from "./route-b-handoff";

export interface TheaterRouteBMeetingSignalSourceTypeChip {
  sourceType: string;
  count: number;
  label: string;
}

export interface TheaterRouteBMeetingSignalSourceRenderCard {
  stageCardId: string;
  status: TheaterRouteBMeetingSignalGroundingCard["status"];
  action: string;
  priority: string;
  sourceLabel: string;
  sourceType: string | null;
  summary: string;
  narratorQuestion?: string;
}

export interface TheaterRouteBMeetingSignalSourceRenderModel {
  componentName: "RouteBMeetingSignalGroundingPanel";
  dataAttribute: "data-route-b-meeting-signal-source-grounding";
  sourceTypeDataAttribute: "data-route-b-meeting-signal-source-type-summary";
  cardCount: number;
  unknownCount: number;
  narratorQuestionCount: number;
  sourceTypeChips: TheaterRouteBMeetingSignalSourceTypeChip[];
  cards: TheaterRouteBMeetingSignalSourceRenderCard[];
  narratorQuestions: string[];
  boundary: TheaterRouteBMeetingSignalGroundingSummary["boundary"];
  proof: {
    sourceTypesVisibleToAdvisor: boolean;
    rawMeetingSessionIdIncluded: false;
    rawPersonIdIncluded: false;
    sourceReferenceIdsIncluded: false;
    rawPrivateTranscriptIncluded: false;
    rawProviderPayloadIncluded: false;
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesConfirmedCrmFact: false;
  };
}

const MAX_SOURCE_TYPE_LENGTH = 96;
const REDACTED_SOURCE_TYPE = "REDACTED_SOURCE_TYPE";
const FORBIDDEN_SOURCE_TYPE_PATTERN =
  /(?:session|person|token|secret|cookie|otp|payload|transcript|private|email|phone|raw)/i;

export function buildRouteBMeetingSignalSourceRenderModel(
  grounding: TheaterRouteBMeetingSignalGroundingSummary,
): TheaterRouteBMeetingSignalSourceRenderModel {
  const sourceTypeChips = buildSourceTypeChips(grounding.bySourceType);
  const cards = grounding.cards.map(toRenderCard);

  return {
    componentName: "RouteBMeetingSignalGroundingPanel",
    dataAttribute: "data-route-b-meeting-signal-source-grounding",
    sourceTypeDataAttribute: "data-route-b-meeting-signal-source-type-summary",
    cardCount: grounding.cardCount,
    unknownCount: grounding.unknownCount,
    narratorQuestionCount: grounding.narratorQuestionCount,
    sourceTypeChips,
    cards,
    narratorQuestions: grounding.narratorQuestions,
    boundary: { ...grounding.boundary },
    proof: {
      sourceTypesVisibleToAdvisor: sourceTypeChips.length > 0 || cards.some((card) => Boolean(card.sourceType)),
      rawMeetingSessionIdIncluded: false,
      rawPersonIdIncluded: false,
      sourceReferenceIdsIncluded: false,
      rawPrivateTranscriptIncluded: false,
      rawProviderPayloadIncluded: false,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
    },
  };
}

function buildSourceTypeChips(bySourceType: Record<string, number> | undefined) {
  return Object.entries(bySourceType ?? {})
    .map(([sourceType, count]) => ({
      sourceType: normalizeSourceType(sourceType) ?? REDACTED_SOURCE_TYPE,
      count: Math.max(0, Math.floor(Number(count) || 0)),
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => left.sourceType.localeCompare(right.sourceType))
    .map((item) => ({
      ...item,
      label: `${item.sourceType} x${item.count}`,
    }));
}

function toRenderCard(card: TheaterRouteBMeetingSignalGroundingCard): TheaterRouteBMeetingSignalSourceRenderCard {
  return {
    stageCardId: card.stageCardId,
    status: card.status,
    action: card.action,
    priority: card.priority,
    sourceLabel: card.sourceLabel,
    sourceType: normalizeSourceType(card.sourceType),
    summary: card.summary,
    ...(card.narratorQuestion ? { narratorQuestion: card.narratorQuestion } : {}),
  };
}

function normalizeSourceType(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/[^A-Za-z0-9_./:-]/g, "_").slice(0, MAX_SOURCE_TYPE_LENGTH);
  if (!normalized || FORBIDDEN_SOURCE_TYPE_PATTERN.test(normalized)) {
    return REDACTED_SOURCE_TYPE;
  }

  return normalized;
}
