import type {
  ClientRouteBSessionSourceReview,
  RouteBSessionFamilyProfileSourceReview,
  RouteBSessionMeetingSignalSourceReview,
  RouteBSessionRelationshipEdgeShadowSourceReview,
  RouteBSessionSourceReviewPayload,
} from "./client-route-b-session-source-review";
import type { TheaterRouteBFamilyProfileGroundingStatus } from "./route-b-handoff";

export type ClientRouteBSessionSourceConsumptionStatus =
  | "READY_FOR_ADVISOR_SOURCE_REVIEW"
  | "NEEDS_SESSION_SOURCE_REVIEW"
  | "BLOCKED_SENSITIVE";

export type RouteBSessionSourceReviewAdvisorPanelId =
  | "familyProfiles"
  | "meetingRelationshipSignals"
  | "relationshipEdgeShadow";

export type RouteBSessionSourceReviewPanelDestination =
  | "RouteBFamilyProfileGroundingPanel"
  | "RouteBMeetingSignalGroundingPanel"
  | "RouteBRelationshipEdgeShadowGroundingPanel";

export type RouteBSessionSourceReviewDataAttribute =
  | "data-route-b-family-profile-source-grounding"
  | "data-route-b-meeting-signal-source-grounding"
  | "data-route-b-edge-shadow-source-grounding";

export interface RouteBSessionSourceReviewAdvisorPanel {
  id: RouteBSessionSourceReviewAdvisorPanelId;
  label: string;
  source:
    | "TheaterRouteBScene.sourceGrounding.familyProfiles"
    | "TheaterRouteBScene.sourceGrounding.meetingRelationshipSignals"
    | "TheaterRouteBScene.sourceGrounding.relationshipEdgeShadow";
  destination: RouteBSessionSourceReviewPanelDestination;
  dataAttribute: RouteBSessionSourceReviewDataAttribute;
  status: "READY" | "EMPTY";
  summary: string;
  count: number;
  unknownCount: number;
  factStatusCounts: Record<string, number>;
  previewItems: Array<{
    id: string;
    label: string;
    factStatus?: string;
    sourceReferenceCount?: number;
  }>;
  noWriteBoundary: RouteBSessionSourceReviewNoWriteBoundary;
}

export interface RouteBSessionSourceReviewNoWriteBoundary {
  providerCallAttempted: false;
  databaseWriteAttempted: false;
  aiUsageLogWritten: false;
  aiUsageLogRequiredBeforeProviderEnablement: true;
  routeBSessionPersisted: false;
  sourceGroundingPersistedToDatabase: false;
  rawPrivateTranscriptIncluded: false;
  rawProviderPayloadIncluded: false;
  rawSourceReferenceIdsIncluded: false;
  rawMetadataIncluded: false;
  directPrivateDialogReturned: false;
  writesRelationshipGraph: false;
  writesVisitPlan: false;
  writesClientProfile: false;
  writesPolicy: false;
  writesConfirmedCrmFact: false;
}

export interface RouteBSessionSourceReviewConsumption {
  status: ClientRouteBSessionSourceConsumptionStatus;
  source: "ClientRouteBSessionSourceReview.sessionSourceReview";
  destinationSurface: "/theater/[sessionId]";
  destination: "advisor-visible Route B source grounding panels";
  reviewId: string | null;
  sessionId: string | null;
  routeBSceneId: string | null;
  routeBSourcePacketId: string | null;
  clientId: string | null;
  advisorVisiblePanelCount: number;
  advisorVisiblePanels: RouteBSessionSourceReviewAdvisorPanel[];
  sessionConsumption: {
    consumes: "RouteBSessionSnapshot.scene.sourceGrounding";
    currentPersistence: RouteBSessionSourceReviewPayload["persistenceBoundary"]["currentPersistence"] | "none";
    intendedPersistenceTarget: RouteBSessionSourceReviewPayload["persistenceBoundary"]["intendedPersistenceTarget"] | "none";
    stageDataAttributes: RouteBSessionSourceReviewDataAttribute[];
    routeBEnabled: false;
    providerCallsEnabled: false;
    routeBProductionStartAllowed: false;
    ownerScopedSessionRequired: true;
    browserSuppliedSessionIdTrusted: false;
    browserSuppliedPersonIdTrusted: false;
  };
  sourceCounts: {
    characterCount: number;
    relationshipCount: number;
    narratorQuestionCount: number;
    visibilityRuleCount: number;
    statePatchCount: number;
    familyProfileMembers: number;
    familyProfileFields: number;
    familyProfileUnknowns: number;
    meetingSignalCards: number;
    meetingSignalUnknowns: number;
    relationshipEdgeCandidates: number;
    relationshipEdgeUnsupportedRelations: number;
  };
  proof: RouteBSessionSourceReviewNoWriteBoundary & {
    sourceReviewStatus: ClientRouteBSessionSourceReview["status"];
    sessionSourceReviewPresent: boolean;
    advisorPanelsConnectedToStageSurface: boolean;
    factsInferencesUnknownsVisible: boolean;
    highSensitiveBlocked: boolean;
  };
}

const noWriteBoundary: RouteBSessionSourceReviewNoWriteBoundary = {
  providerCallAttempted: false,
  databaseWriteAttempted: false,
  aiUsageLogWritten: false,
  aiUsageLogRequiredBeforeProviderEnablement: true,
  routeBSessionPersisted: false,
  sourceGroundingPersistedToDatabase: false,
  rawPrivateTranscriptIncluded: false,
  rawProviderPayloadIncluded: false,
  rawSourceReferenceIdsIncluded: false,
  rawMetadataIncluded: false,
  directPrivateDialogReturned: false,
  writesRelationshipGraph: false,
  writesVisitPlan: false,
  writesClientProfile: false,
  writesPolicy: false,
  writesConfirmedCrmFact: false,
};

export function buildClientRouteBSessionSourceConsumption(
  review: ClientRouteBSessionSourceReview,
): RouteBSessionSourceReviewConsumption {
  const payload = review.sessionSourceReview;
  const advisorVisiblePanels = payload ? buildAdvisorVisiblePanels(payload) : [];
  const highSensitiveBlocked = review.status === "BLOCKED_SENSITIVE";

  return {
    status: highSensitiveBlocked
      ? "BLOCKED_SENSITIVE"
      : advisorVisiblePanels.length
        ? "READY_FOR_ADVISOR_SOURCE_REVIEW"
        : "NEEDS_SESSION_SOURCE_REVIEW",
    source: "ClientRouteBSessionSourceReview.sessionSourceReview",
    destinationSurface: "/theater/[sessionId]",
    destination: "advisor-visible Route B source grounding panels",
    reviewId: payload?.reviewId ?? null,
    sessionId: payload?.sessionShape.sessionId ?? null,
    routeBSceneId: payload?.sessionShape.routeBSceneId ?? null,
    routeBSourcePacketId: payload?.sessionShape.routeBSourcePacketId ?? null,
    clientId: payload?.sessionShape.clientId ?? null,
    advisorVisiblePanelCount: advisorVisiblePanels.length,
    advisorVisiblePanels,
    sessionConsumption: {
      consumes: "RouteBSessionSnapshot.scene.sourceGrounding",
      currentPersistence: payload?.persistenceBoundary.currentPersistence ?? "none",
      intendedPersistenceTarget: payload?.persistenceBoundary.intendedPersistenceTarget ?? "none",
      stageDataAttributes: advisorVisiblePanels.map((panel) => panel.dataAttribute),
      routeBEnabled: false,
      providerCallsEnabled: false,
      routeBProductionStartAllowed: false,
      ownerScopedSessionRequired: true,
      browserSuppliedSessionIdTrusted: false,
      browserSuppliedPersonIdTrusted: false,
    },
    sourceCounts: buildSourceCounts(payload),
    proof: {
      ...noWriteBoundary,
      sourceReviewStatus: review.status,
      sessionSourceReviewPresent: Boolean(payload),
      advisorPanelsConnectedToStageSurface: hasRequiredStageHooks(advisorVisiblePanels),
      factsInferencesUnknownsVisible: hasVisibleFamilyFactStatuses(payload),
      highSensitiveBlocked,
    },
  };
}

function buildAdvisorVisiblePanels(payload: RouteBSessionSourceReviewPayload): RouteBSessionSourceReviewAdvisorPanel[] {
  const panels: RouteBSessionSourceReviewAdvisorPanel[] = [];
  const familyProfiles = payload.sourceGroundingReview.familyProfiles;
  const meetingSignals = payload.sourceGroundingReview.meetingRelationshipSignals;
  const edgeShadow = payload.sourceGroundingReview.relationshipEdgeShadow;

  if (familyProfiles) panels.push(buildFamilyProfilePanel(familyProfiles));
  if (meetingSignals) panels.push(buildMeetingSignalPanel(meetingSignals));
  if (edgeShadow) panels.push(buildRelationshipEdgePanel(edgeShadow));

  return panels;
}

function buildFamilyProfilePanel(
  familyProfiles: RouteBSessionFamilyProfileSourceReview,
): RouteBSessionSourceReviewAdvisorPanel {
  return {
    id: "familyProfiles",
    label: "人物 profile 來源",
    source: familyProfiles.source,
    destination: "RouteBFamilyProfileGroundingPanel",
    dataAttribute: "data-route-b-family-profile-source-grounding",
    status: familyProfiles.fieldCount > 0 ? "READY" : "EMPTY",
    summary: `${familyProfiles.memberCount} 位人物・${familyProfiles.fieldCount} 個欄位・${familyProfiles.unknownFieldCount} 個待確認`,
    count: familyProfiles.fieldCount,
    unknownCount: familyProfiles.unknownFieldCount,
    factStatusCounts: normalizeFamilyFactStatusCounts(familyProfiles.byFactStatus),
    previewItems: familyProfiles.fieldPreviews.slice(0, 4).map((field) => ({
      id: field.stageFieldId,
      label: `${field.person}・${field.label}`,
      factStatus: field.factStatus,
      sourceReferenceCount: field.sourceReferenceCount,
    })),
    noWriteBoundary,
  };
}

function buildMeetingSignalPanel(
  meetingSignals: RouteBSessionMeetingSignalSourceReview,
): RouteBSessionSourceReviewAdvisorPanel {
  return {
    id: "meetingRelationshipSignals",
    label: "會議關係訊號來源",
    source: meetingSignals.source,
    destination: "RouteBMeetingSignalGroundingPanel",
    dataAttribute: "data-route-b-meeting-signal-source-grounding",
    status: meetingSignals.cardCount > 0 ? "READY" : "EMPTY",
    summary: `${meetingSignals.cardCount} 張訊號卡・${meetingSignals.unknownCount} 個未知・${meetingSignals.narratorQuestionCount} 題旁白補問`,
    count: meetingSignals.cardCount,
    unknownCount: meetingSignals.unknownCount,
    factStatusCounts: {},
    previewItems: [
      {
        id: "meeting-signal-card-count",
        label: `安全 stage card count=${meetingSignals.cardCount}`,
        sourceReferenceCount: 0,
      },
    ],
    noWriteBoundary,
  };
}

function buildRelationshipEdgePanel(
  edgeShadow: RouteBSessionRelationshipEdgeShadowSourceReview,
): RouteBSessionSourceReviewAdvisorPanel {
  return {
    id: "relationshipEdgeShadow",
    label: "關係邊 readiness",
    source: edgeShadow.source,
    destination: "RouteBRelationshipEdgeShadowGroundingPanel",
    dataAttribute: "data-route-b-edge-shadow-source-grounding",
    status: edgeShadow.candidateEdgeCount > 0 ? "READY" : "EMPTY",
    summary: `${edgeShadow.sourceMemberCount} 位成員・${edgeShadow.candidateEdgeCount} 條 edge shadow・${edgeShadow.unsupportedRelationCount} 個 unsupported`,
    count: edgeShadow.candidateEdgeCount,
    unknownCount: edgeShadow.warningCodes.length,
    factStatusCounts: {},
    previewItems: edgeShadow.warningCodes.slice(0, 4).map((warningCode) => ({
      id: `edge-warning-${warningCode}`,
      label: warningCode,
    })),
    noWriteBoundary,
  };
}

function buildSourceCounts(payload: RouteBSessionSourceReviewPayload | undefined) {
  const familyProfiles = payload?.sourceGroundingReview.familyProfiles;
  const meetingSignals = payload?.sourceGroundingReview.meetingRelationshipSignals;
  const edgeShadow = payload?.sourceGroundingReview.relationshipEdgeShadow;

  return {
    characterCount: payload?.sceneShape.characterCount ?? 0,
    relationshipCount: payload?.sceneShape.relationshipCount ?? 0,
    narratorQuestionCount: payload?.sceneShape.narratorQuestionCount ?? 0,
    visibilityRuleCount: payload?.sceneShape.visibilityRuleCount ?? 0,
    statePatchCount: payload?.sceneShape.statePatchCount ?? 0,
    familyProfileMembers: familyProfiles?.memberCount ?? 0,
    familyProfileFields: familyProfiles?.fieldCount ?? 0,
    familyProfileUnknowns: familyProfiles?.unknownFieldCount ?? 0,
    meetingSignalCards: meetingSignals?.cardCount ?? 0,
    meetingSignalUnknowns: meetingSignals?.unknownCount ?? 0,
    relationshipEdgeCandidates: edgeShadow?.candidateEdgeCount ?? 0,
    relationshipEdgeUnsupportedRelations: edgeShadow?.unsupportedRelationCount ?? 0,
  };
}

function normalizeFamilyFactStatusCounts(counts: Record<TheaterRouteBFamilyProfileGroundingStatus, number>) {
  return {
    FACT: counts.FACT,
    INFERENCE: counts.INFERENCE,
    UNKNOWN: counts.UNKNOWN,
  };
}

function hasVisibleFamilyFactStatuses(payload: RouteBSessionSourceReviewPayload | undefined): boolean {
  const counts = payload?.sourceGroundingReview.familyProfiles?.byFactStatus;
  if (!counts) return false;
  return counts.FACT > 0 && counts.INFERENCE > 0 && counts.UNKNOWN > 0;
}

function hasRequiredStageHooks(panels: RouteBSessionSourceReviewAdvisorPanel[]): boolean {
  const attributes = new Set(panels.map((panel) => panel.dataAttribute));
  return attributes.has("data-route-b-family-profile-source-grounding");
}
