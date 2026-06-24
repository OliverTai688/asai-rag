import type {
  TheaterRouteBHandoffPacket,
  TheaterRouteBMaterial,
  TheaterRouteBPersonaHint,
  TheaterRouteBRelation,
  TheaterRouteBTurnRef,
  TheaterRouteBVisibilityScope,
} from "./route-b-handoff";
import {
  buildRelationshipEdgeShadowRuntimeGrounding,
  type TheaterRouteBRelationshipEdgeShadowRuntimeGrounding,
} from "./route-b-next-turn";
import {
  buildRouteBObjectionRedLineLibrarySummary,
  ROUTE_B_SEVERE_RED_LINES,
  type TheaterRouteBSevereRedLine,
} from "./route-b-objection-red-line-library";

export {
  buildRouteBObjectionRedLineLibrarySummary,
  buildRouteBRedLineReviewPlan,
  getRouteBObjectionLibrary,
  getRouteBRedLineLibrary,
  ROUTE_B_OBJECTION_LIBRARY,
  ROUTE_B_OBJECTION_IDS,
  ROUTE_B_RED_LINE_IDS,
  ROUTE_B_RED_LINE_RULES,
  ROUTE_B_SEVERE_RED_LINES,
  selectRouteBObjectionPrompts,
} from "./route-b-objection-red-line-library";
export type {
  RouteBObjectionId,
  RouteBObjectionPrompt,
  RouteBObjectionRedLineLibrarySummary,
  RouteBObjectionSelectionInput,
  RouteBRedLineDetectionMode,
  RouteBRedLineReviewFindingPlan,
  RouteBRedLineRule,
  RouteBRedLineRuleId,
  RouteBRedLineSeverity,
  TheaterRouteBSevereRedLine,
} from "./route-b-objection-red-line-library";

export const ROUTE_B_FEEDBACK_PERSPECTIVE_IDS = [
  "COACH_EAR",
  "CLIENT_EYES",
  "SILENT_NEED",
  "COMPLIANCE_CONSCIENCE",
  "DECISION_BRIDGE",
] as const;

export type TheaterRouteBFeedbackPerspectiveId = (typeof ROUTE_B_FEEDBACK_PERSPECTIVE_IDS)[number];

export interface TheaterRouteBFeedbackPerspective {
  id: TheaterRouteBFeedbackPerspectiveId;
  label: string;
  purpose: string;
  evidenceFocus: Array<"GROUP_TURN_PATTERN" | "PRIVATE_LANE_BOUNDARY" | "UNKNOWN_GAP" | "COMPLIANCE_RED_LINE" | "DECISION_NEXT_STEP">;
}

export interface TheaterRouteBFeedbackInputPreview {
  sceneId: string;
  characterCount: number;
  historyCount: number;
  historyVisibilitySummary: Record<TheaterRouteBVisibilityScope, number>;
  materialCounts: {
    confirmedFacts: number;
    inferredSignals: number;
    unknownGaps: number;
  };
}

export interface TheaterRouteBFeedbackOutputSectionContract {
  perspectiveId: TheaterRouteBFeedbackPerspectiveId;
  label: string;
  requiredFields: Array<"observation" | "evidenceBasis" | "advisorMove" | "riskOrUnknown">;
}

export interface TheaterRouteBFeedbackContract {
  agentId: "asai.theater.route_b";
  registryReadiness: "internal-only";
  selectedPerspectives: TheaterRouteBFeedbackPerspective[];
  inputPreview: TheaterRouteBFeedbackInputPreview;
  relationshipEdgeShadowGrounding: TheaterRouteBRelationshipEdgeShadowRuntimeGrounding;
  outputContract: {
    qualitativeOnly: true;
    totalScoreAllowed: false;
    rankingAllowed: false;
    sections: TheaterRouteBFeedbackOutputSectionContract[];
    canMarkNotApplicable: true;
  };
  redLineReview: {
    severeSignals: TheaterRouteBSevereRedLine[];
    librarySummary: ReturnType<typeof buildRouteBObjectionRedLineLibrarySummary>;
    canMarkNotApplicable: true;
    legalAdviceIncluded: false;
    advisorReminder: string;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    successErrorAiUsageLogRequiredBeforeProviderEnablement: true;
    storesProviderBody: false;
  };
  persistenceEnvelope: {
    actorKind: "FEEDBACK";
    allowedWriteTargets: Array<"THEATER_FEEDBACK_SUMMARY" | "NARRATOR_QUEUE">;
    requiresAdvisorConfirmation: true;
    writesConfirmedCrmFact: false;
    storesPrivateLaneTurnContent: false;
  };
}

export const ROUTE_B_FEEDBACK_PERSPECTIVES: TheaterRouteBFeedbackPerspective[] = [
  {
    id: "COACH_EAR",
    label: "教練的耳朵",
    purpose: "辨識顧問問句、追問與回應節奏是否讓客戶願意多說。",
    evidenceFocus: ["GROUP_TURN_PATTERN", "DECISION_NEXT_STEP"],
  },
  {
    id: "CLIENT_EYES",
    label: "客戶的眼睛",
    purpose: "從客戶視角指出哪裡被理解、哪裡感到壓迫或不清楚。",
    evidenceFocus: ["GROUP_TURN_PATTERN", "PRIVATE_LANE_BOUNDARY"],
  },
  {
    id: "SILENT_NEED",
    label: "沉默裡的需求",
    purpose: "把未知、迴避與未被問出口的家庭決策脈絡變成下一步問題。",
    evidenceFocus: ["UNKNOWN_GAP", "DECISION_NEXT_STEP"],
  },
  {
    id: "COMPLIANCE_CONSCIENCE",
    label: "守門的良心",
    purpose: "檢查是否出現應立即停下來釐清或升級的人身保險紅線。",
    evidenceFocus: ["COMPLIANCE_RED_LINE", "PRIVATE_LANE_BOUNDARY"],
  },
  {
    id: "DECISION_BRIDGE",
    label: "決策的橋",
    purpose: "把本輪練習轉成下一次拜訪可採取、可確認、可交接的橋接動作。",
    evidenceFocus: ["DECISION_NEXT_STEP", "UNKNOWN_GAP"],
  },
];

export interface BuildTheaterRouteBFeedbackContractOptions {
  handoff: TheaterRouteBHandoffPacket;
  history?: TheaterRouteBTurnRef[];
  selectedPerspectiveIds?: TheaterRouteBFeedbackPerspectiveId[];
}

export function buildTheaterRouteBFeedbackContract(
  options: BuildTheaterRouteBFeedbackContractOptions,
): TheaterRouteBFeedbackContract {
  const selectedPerspectives = selectFeedbackPerspectives(options.selectedPerspectiveIds);

  return {
    agentId: "asai.theater.route_b",
    registryReadiness: "internal-only",
    selectedPerspectives,
    inputPreview: buildFeedbackInputPreview(options.handoff, options.history ?? []),
    relationshipEdgeShadowGrounding: buildRelationshipEdgeShadowRuntimeGrounding(
      options.handoff.scene.sourceGrounding?.relationshipEdgeShadow,
    ),
    outputContract: {
      qualitativeOnly: true,
      totalScoreAllowed: false,
      rankingAllowed: false,
      canMarkNotApplicable: true,
      sections: selectedPerspectives.map((perspective) => ({
        perspectiveId: perspective.id,
        label: perspective.label,
        requiredFields: ["observation", "evidenceBasis", "advisorMove", "riskOrUnknown"],
      })),
    },
    redLineReview: {
      severeSignals: ROUTE_B_SEVERE_RED_LINES,
      librarySummary: buildRouteBObjectionRedLineLibrarySummary(),
      canMarkNotApplicable: true,
      legalAdviceIncluded: false,
      advisorReminder: "此回饋是演練與合規提醒，不是法律意見；嚴重紅線需由顧問依公司流程升級確認。",
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      successErrorAiUsageLogRequiredBeforeProviderEnablement: true,
      storesProviderBody: false,
    },
    persistenceEnvelope: {
      actorKind: "FEEDBACK",
      allowedWriteTargets: ["THEATER_FEEDBACK_SUMMARY", "NARRATOR_QUEUE"],
      requiresAdvisorConfirmation: true,
      writesConfirmedCrmFact: false,
      storesPrivateLaneTurnContent: false,
    },
  };
}

function selectFeedbackPerspectives(selectedPerspectiveIds?: TheaterRouteBFeedbackPerspectiveId[]) {
  if (!selectedPerspectiveIds || selectedPerspectiveIds.length === 0) {
    return ROUTE_B_FEEDBACK_PERSPECTIVES;
  }

  const selected = ROUTE_B_FEEDBACK_PERSPECTIVES.filter((perspective) =>
    selectedPerspectiveIds.includes(perspective.id),
  );

  return selected.length > 0 ? selected : ROUTE_B_FEEDBACK_PERSPECTIVES;
}

function buildFeedbackInputPreview(
  handoff: TheaterRouteBHandoffPacket,
  history: TheaterRouteBTurnRef[],
): TheaterRouteBFeedbackInputPreview {
  return {
    sceneId: handoff.scene.id,
    characterCount: handoff.scene.characters.length,
    historyCount: history.length,
    historyVisibilitySummary: summarizeFeedbackHistoryVisibility(history),
    materialCounts: {
      confirmedFacts: countConfirmedFacts(handoff),
      inferredSignals: countInferredSignals(handoff),
      unknownGaps: countUnknownGaps(handoff),
    },
  };
}

export function summarizeFeedbackHistoryVisibility(
  history: Array<{ visibilityScope: TheaterRouteBVisibilityScope }>,
) {
  return history.reduce<Record<TheaterRouteBVisibilityScope, number>>(
    (summary, turn) => {
      summary[turn.visibilityScope] += 1;
      return summary;
    },
    { GROUP: 0, PRIVATE: 0, DIRECTOR_ONLY: 0, NARRATOR: 0 },
  );
}

function countConfirmedFacts(handoff: TheaterRouteBHandoffPacket) {
  const characterFacts = handoff.scene.characters.flatMap((character) => character.knownFacts).filter(isConfirmed).length;
  const confirmedRelationships = handoff.scene.relationships.filter(isConfirmedRelation).length;
  return characterFacts + confirmedRelationships;
}

function countInferredSignals(handoff: TheaterRouteBHandoffPacket) {
  const personaHints = handoff.scene.characters.flatMap((character) => character.personaHints).filter(isInferredHint).length;
  const inferredObjections = handoff.scene.objections.filter((item) => item.factStatus === "INFERENCE").length;
  const inferredState = handoff.scene.statePatches.filter((patch) => patch.factStatus === "INFERENCE").length;
  return personaHints + inferredObjections + inferredState;
}

function countUnknownGaps(handoff: TheaterRouteBHandoffPacket) {
  const characterUnknowns = handoff.scene.characters.flatMap((character) => character.unknowns).filter(isUnknown).length;
  const narratorQuestions = handoff.scene.narratorQuestions.filter(isUnknown).length;
  const unknownState = handoff.scene.statePatches.filter((patch) => patch.factStatus === "UNKNOWN").length;
  const unknownRelationships = handoff.scene.relationships.filter((relation) => relation.factStatus === "UNKNOWN").length;
  return characterUnknowns + narratorQuestions + unknownState + unknownRelationships;
}

function isConfirmed(material: TheaterRouteBMaterial) {
  return material.factStatus === "CONFIRMED" || material.factStatus === "FACT";
}

function isConfirmedRelation(relation: TheaterRouteBRelation) {
  return relation.factStatus === "CONFIRMED";
}

function isInferredHint(hint: TheaterRouteBPersonaHint) {
  return hint.factStatus === "INFERENCE";
}

function isUnknown(material: TheaterRouteBMaterial) {
  return material.factStatus === "UNKNOWN";
}
