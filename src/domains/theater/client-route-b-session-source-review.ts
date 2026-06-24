import {
  buildClientRouteBNextTurnContext,
  type BuildClientRouteBNextTurnContextInput,
  type ClientRouteBNextTurnContext,
} from "./client-route-b-next-turn-context";
import type {
  TheaterRouteBFamilyProfileGroundingSummary,
  TheaterRouteBMeetingSignalGroundingSummary,
  TheaterRouteBRelationshipEdgeShadowGroundingSummary,
  TheaterRouteBSourceGrounding,
} from "./route-b-handoff";
import type { RouteBSessionSnapshot } from "./route-b-session";

export type ClientRouteBSessionSourceReviewStatus =
  | "READY_FOR_SESSION_SOURCE_REVIEW"
  | "NEEDS_HANDOFF_REVIEW"
  | "BLOCKED_SENSITIVE";

export type BuildClientRouteBSessionSourceReviewInput = BuildClientRouteBNextTurnContextInput;

export interface ClientRouteBSessionSourceReview {
  status: ClientRouteBSessionSourceReviewStatus;
  nextTurnContext: ClientRouteBNextTurnContext;
  sessionSourceReview?: RouteBSessionSourceReviewPayload;
  proof: {
    source: "client-route-b-next-turn-context";
    handoffStatus: ClientRouteBNextTurnContext["proof"]["handoffStatus"];
    providerCallAttempted: false;
    databaseWriteAttempted: false;
    aiUsageLogWritten: false;
    aiUsageLogRequiredBeforeProviderEnablement: true;
    routeBProductionStartAllowed: false;
    routeBSessionPersisted: false;
    sceneStatePersistedToDatabase: false;
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
    factsInferencesUnknownsSeparated: boolean;
    familyProfileGroundingReviewed: boolean;
    sessionSourceGroundingReady: boolean;
    highSensitiveBlocked: boolean;
  };
}

export interface RouteBSessionSourceReviewPayload {
  reviewId: string;
  source: "ClientRouteBNextTurnContext.sessionSnapshot.scene.sourceGrounding";
  destination: "RouteBSessionSnapshot.scene.sourceGrounding";
  sessionShape: {
    sessionId: string;
    routeBSceneId: string | null;
    routeBSourcePacketId: string | null;
    clientId: string | null;
    routeBEnabled: false;
    status: string;
    providerCallsEnabled: false;
    providerUsageLogRequiredFor: string[];
  };
  sceneShape: {
    characterCount: number;
    relationshipCount: number;
    narratorQuestionCount: number;
    visibilityRuleCount: number;
    statePatchCount: number;
    sourceGroundingKeys: Array<keyof TheaterRouteBSourceGrounding>;
  };
  sourceGroundingReview: {
    familyProfiles?: RouteBSessionFamilyProfileSourceReview;
    meetingRelationshipSignals?: RouteBSessionMeetingSignalSourceReview;
    relationshipEdgeShadow?: RouteBSessionRelationshipEdgeShadowSourceReview;
  };
  persistenceBoundary: {
    currentPersistence: "not-written-this-loop";
    intendedPersistenceTarget: "owner-scoped RouteBSession.sceneState.sourceGrounding";
    ownerScopedSessionRequired: true;
    browserSuppliedSessionIdTrusted: false;
    browserSuppliedPersonIdTrusted: false;
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    aiUsageLogRequiredBeforeProviderEnablement: true;
    databaseWriteAttempted: false;
    routeBSessionPersisted: false;
    sceneStatePersistedToDatabase: false;
    sourceGroundingPersistedToDatabase: false;
    storesRawProviderPayload: false;
    rawPrivateTranscriptIncluded: false;
    rawSourceReferenceIdsIncluded: false;
    rawMetadataIncluded: false;
    directPrivateDialogReturned: false;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesClientProfile: false;
    writesPolicy: false;
    writesConfirmedCrmFact: false;
  };
}

export interface RouteBSessionFamilyProfileSourceReview {
  source: "TheaterRouteBScene.sourceGrounding.familyProfiles";
  memberCount: number;
  fieldCount: number;
  knownFieldCount: number;
  unknownFieldCount: number;
  sourceReferenceCount: number;
  byFactStatus: TheaterRouteBFamilyProfileGroundingSummary["byFactStatus"];
  fieldPreviews: Array<{
    stageFieldId: string;
    person: string;
    relation: string;
    label: string;
    factStatus: string;
    sourceReferenceCount: number;
  }>;
  boundary: TheaterRouteBFamilyProfileGroundingSummary["boundary"];
}

export interface RouteBSessionMeetingSignalSourceReview {
  source: "TheaterRouteBScene.sourceGrounding.meetingRelationshipSignals";
  cardCount: number;
  unknownCount: number;
  narratorQuestionCount: number;
  boundary: TheaterRouteBMeetingSignalGroundingSummary["boundary"];
}

export interface RouteBSessionRelationshipEdgeShadowSourceReview {
  source: "TheaterRouteBScene.sourceGrounding.relationshipEdgeShadow";
  sourceMemberCount: number;
  candidateEdgeCount: number;
  warningCodes: string[];
  unsupportedRelationCount: number;
  formalSchemaApproved: boolean;
  persistedToDatabase: boolean;
  boundary: TheaterRouteBRelationshipEdgeShadowGroundingSummary["boundary"];
}

export function buildClientRouteBSessionSourceReview(
  input: BuildClientRouteBSessionSourceReviewInput,
): ClientRouteBSessionSourceReview {
  const nextTurnContext = buildClientRouteBNextTurnContext({
    ...input,
    routeBEnabled: false,
  });

  if (!nextTurnContext.sessionSnapshot || nextTurnContext.status !== "READY_FOR_PROVIDER_DISABLED_PREVIEW") {
    return {
      status: nextTurnContext.status === "BLOCKED_SENSITIVE" ? "BLOCKED_SENSITIVE" : "NEEDS_HANDOFF_REVIEW",
      nextTurnContext,
      proof: buildSourceReviewProof(nextTurnContext, undefined),
    };
  }

  const sessionSourceReview = buildSessionSourceReviewPayload(nextTurnContext.sessionSnapshot);

  return {
    status: "READY_FOR_SESSION_SOURCE_REVIEW",
    nextTurnContext,
    sessionSourceReview,
    proof: buildSourceReviewProof(nextTurnContext, sessionSourceReview),
  };
}

function buildSessionSourceReviewPayload(snapshot: RouteBSessionSnapshot): RouteBSessionSourceReviewPayload {
  const sourceGrounding = snapshot.scene.sourceGrounding;
  const sourceGroundingKeys = getSourceGroundingKeys(sourceGrounding);

  return {
    reviewId: `route_b_session_source_review_${stableHash(`${snapshot.session.id}:${sourceGroundingKeys.join("|")}`)}`,
    source: "ClientRouteBNextTurnContext.sessionSnapshot.scene.sourceGrounding",
    destination: "RouteBSessionSnapshot.scene.sourceGrounding",
    sessionShape: {
      sessionId: snapshot.session.id,
      routeBSceneId: snapshot.session.routeBSceneId,
      routeBSourcePacketId: snapshot.session.routeBSourcePacketId,
      clientId: snapshot.session.clientId,
      routeBEnabled: false,
      status: snapshot.session.status,
      providerCallsEnabled: false,
      providerUsageLogRequiredFor: [...snapshot.session.provider.usageLogRequiredFor],
    },
    sceneShape: {
      characterCount: snapshot.characters.length,
      relationshipCount: countArray(snapshot.scene.relationships),
      narratorQuestionCount: countArray(snapshot.scene.narratorQuestions),
      visibilityRuleCount: countArray(snapshot.scene.visibilityRules),
      statePatchCount: snapshot.scene.statePatchCount,
      sourceGroundingKeys,
    },
    sourceGroundingReview: {
      ...(sourceGrounding?.familyProfiles
        ? { familyProfiles: buildFamilyProfileSourceReview(sourceGrounding.familyProfiles) }
        : {}),
      ...(sourceGrounding?.meetingRelationshipSignals
        ? { meetingRelationshipSignals: buildMeetingSignalSourceReview(sourceGrounding.meetingRelationshipSignals) }
        : {}),
      ...(sourceGrounding?.relationshipEdgeShadow
        ? { relationshipEdgeShadow: buildRelationshipEdgeShadowSourceReview(sourceGrounding.relationshipEdgeShadow) }
        : {}),
    },
    persistenceBoundary: {
      currentPersistence: "not-written-this-loop",
      intendedPersistenceTarget: "owner-scoped RouteBSession.sceneState.sourceGrounding",
      ownerScopedSessionRequired: true,
      browserSuppliedSessionIdTrusted: false,
      browserSuppliedPersonIdTrusted: false,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      aiUsageLogRequiredBeforeProviderEnablement: true,
      databaseWriteAttempted: false,
      routeBSessionPersisted: false,
      sceneStatePersistedToDatabase: false,
      sourceGroundingPersistedToDatabase: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      rawSourceReferenceIdsIncluded: false,
      rawMetadataIncluded: false,
      directPrivateDialogReturned: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesClientProfile: false,
      writesPolicy: false,
      writesConfirmedCrmFact: false,
    },
  };
}

function buildFamilyProfileSourceReview(
  familyProfiles: TheaterRouteBFamilyProfileGroundingSummary,
): RouteBSessionFamilyProfileSourceReview {
  return {
    source: "TheaterRouteBScene.sourceGrounding.familyProfiles",
    memberCount: familyProfiles.memberCount,
    fieldCount: familyProfiles.fieldCount,
    knownFieldCount: familyProfiles.knownFieldCount,
    unknownFieldCount: familyProfiles.unknownFieldCount,
    sourceReferenceCount: familyProfiles.sourceReferenceCount,
    byFactStatus: { ...familyProfiles.byFactStatus },
    fieldPreviews: familyProfiles.fields.slice(0, 8).map((field) => ({
      stageFieldId: field.stageFieldId,
      person: field.person,
      relation: field.relation,
      label: field.label,
      factStatus: field.factStatus,
      sourceReferenceCount: field.sourceReferenceCount,
    })),
    boundary: { ...familyProfiles.boundary },
  };
}

function buildMeetingSignalSourceReview(
  meetingSignals: TheaterRouteBMeetingSignalGroundingSummary,
): RouteBSessionMeetingSignalSourceReview {
  return {
    source: "TheaterRouteBScene.sourceGrounding.meetingRelationshipSignals",
    cardCount: meetingSignals.cardCount,
    unknownCount: meetingSignals.unknownCount,
    narratorQuestionCount: meetingSignals.narratorQuestionCount,
    boundary: { ...meetingSignals.boundary },
  };
}

function buildRelationshipEdgeShadowSourceReview(
  edgeShadow: TheaterRouteBRelationshipEdgeShadowGroundingSummary,
): RouteBSessionRelationshipEdgeShadowSourceReview {
  return {
    source: "TheaterRouteBScene.sourceGrounding.relationshipEdgeShadow",
    sourceMemberCount: edgeShadow.sourceMemberCount,
    candidateEdgeCount: edgeShadow.candidateEdgeCount,
    warningCodes: [...edgeShadow.warningCodes],
    unsupportedRelationCount: edgeShadow.unsupportedRelationCount,
    formalSchemaApproved: edgeShadow.boundary.formalSchemaApproved,
    persistedToDatabase: edgeShadow.boundary.persistedToDatabase,
    boundary: { ...edgeShadow.boundary },
  };
}

function buildSourceReviewProof(
  nextTurnContext: ClientRouteBNextTurnContext,
  sessionSourceReview: RouteBSessionSourceReviewPayload | undefined,
): ClientRouteBSessionSourceReview["proof"] {
  return {
    source: "client-route-b-next-turn-context",
    handoffStatus: nextTurnContext.proof.handoffStatus,
    providerCallAttempted: false,
    databaseWriteAttempted: false,
    aiUsageLogWritten: false,
    aiUsageLogRequiredBeforeProviderEnablement: true,
    routeBProductionStartAllowed: false,
    routeBSessionPersisted: false,
    sceneStatePersistedToDatabase: false,
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
    factsInferencesUnknownsSeparated: hasSeparatedFactStatus(sessionSourceReview),
    familyProfileGroundingReviewed: Boolean(sessionSourceReview?.sourceGroundingReview.familyProfiles),
    sessionSourceGroundingReady: Boolean(sessionSourceReview?.sceneShape.sourceGroundingKeys.length),
    highSensitiveBlocked: nextTurnContext.status === "BLOCKED_SENSITIVE",
  };
}

function hasSeparatedFactStatus(sessionSourceReview: RouteBSessionSourceReviewPayload | undefined): boolean {
  const counts = sessionSourceReview?.sourceGroundingReview.familyProfiles?.byFactStatus;
  if (!counts) return false;
  return counts.FACT > 0 && counts.INFERENCE > 0 && counts.UNKNOWN > 0;
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function getSourceGroundingKeys(
  sourceGrounding: TheaterRouteBSourceGrounding | undefined,
): Array<keyof TheaterRouteBSourceGrounding> {
  if (!sourceGrounding) return [];
  return (Object.keys(sourceGrounding) as Array<keyof TheaterRouteBSourceGrounding>).filter(
    (key) => sourceGrounding[key] !== undefined,
  );
}

function stableHash(value: string) {
  let hash = 5381;
  for (const char of value) {
    hash = (hash * 33) ^ char.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}
