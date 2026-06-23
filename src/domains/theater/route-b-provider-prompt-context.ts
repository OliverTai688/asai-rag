import type { TheaterRouteBCharacterRole } from "./route-b-handoff";
import type { TheaterRouteBMeetingSignalRuntimeGrounding } from "./route-b-next-turn";
import {
  buildRouteBObjectionRedLineLibrarySummary,
  getRouteBRedLineLibrary,
  selectRouteBObjectionPrompts,
  type RouteBObjectionId,
  type RouteBObjectionSelectionInput,
  type RouteBRedLineRuleId,
  type RouteBRedLineSeverity,
} from "./route-b-objection-red-line-library";

export interface RouteBProviderPromptObjectionCue {
  id: RouteBObjectionId;
  label: string;
  sampleLine: string;
  underlyingConcern: string;
  advisorResponseDirection: string;
  applicableRoles: TheaterRouteBCharacterRole[];
  triggerSignals: string[];
  factBoundary: "roleplay-inference-not-confirmed-fact";
}

export interface RouteBProviderPromptRedLineCue {
  id: RouteBRedLineRuleId;
  label: string;
  severity: RouteBRedLineSeverity;
  detectionMode: "IMMEDIATE" | "POST_REVIEW";
  triggerSignals: string[];
  evidencePolicy: "requires-evidence-or-mark-not-applicable";
  falsePositiveHandling: "can-mark-not-applicable-but-keep-audit-record";
  advisorReminder: string;
  legalAdviceIncluded: false;
  writesConfirmedCrmFact: false;
}

export interface RouteBProviderPromptContextInput extends RouteBObjectionSelectionInput {
  meetingRelationshipSignalGrounding?: TheaterRouteBMeetingSignalRuntimeGrounding;
}

export interface RouteBProviderPromptContext {
  agentId: "asai.theater.route_b";
  actionId: "route-b-provider-prompt-context";
  registryReadiness: "internal-only";
  librarySummary: ReturnType<typeof buildRouteBObjectionRedLineLibrarySummary>;
  meetingRelationshipSignalGrounding: TheaterRouteBMeetingSignalRuntimeGrounding;
  selectedObjections: RouteBProviderPromptObjectionCue[];
  redLineCues: RouteBProviderPromptRedLineCue[];
  promptRules: {
    useAsRoleplayCoachingContext: true;
    useMeetingRelationshipSignalsAsRuntimeEvidence: true;
    doNotTreatObjectionsAsConfirmedCrmFacts: true;
    doNotProvideLegalAdvice: true;
    immediateSevereRedLineIds: RouteBRedLineRuleId[];
    postReviewRedLineIds: RouteBRedLineRuleId[];
    canMarkNotApplicableButKeepAuditRecord: true;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    successErrorAiUsageLogRequiredBeforeProviderEnablement: true;
    storesRawProviderPayload: false;
    rawPrivateTranscriptAllowed: false;
    directPrivateDialogAllowed: false;
  };
}

export function buildRouteBProviderPromptContext(
  input: RouteBProviderPromptContextInput = {},
): RouteBProviderPromptContext {
  const librarySummary = buildRouteBObjectionRedLineLibrarySummary();
  const meetingRelationshipSignalGrounding =
    input.meetingRelationshipSignalGrounding ?? buildEmptyMeetingRelationshipSignalGrounding();
  const selectedObjections = selectRouteBObjectionPrompts(input).map((prompt) => ({
    id: prompt.id,
    label: sanitizePromptText(prompt.label),
    sampleLine: sanitizePromptText(prompt.sampleClientLines[0] ?? ""),
    underlyingConcern: sanitizePromptText(prompt.underlyingConcern),
    advisorResponseDirection: sanitizePromptText(prompt.advisorResponseDirection),
    applicableRoles: prompt.applicableRoles,
    triggerSignals: prompt.triggerSignals.map(sanitizePromptText),
    factBoundary: prompt.factBoundary,
  }));
  const redLineCues = getRouteBRedLineLibrary().map((rule) => ({
    id: rule.id,
    label: sanitizePromptText(rule.label),
    severity: rule.severity,
    detectionMode: rule.detectionMode,
    triggerSignals: rule.triggerSignals.map(sanitizePromptText),
    evidencePolicy: rule.evidencePolicy,
    falsePositiveHandling: rule.falsePositiveHandling,
    advisorReminder: sanitizePromptText(rule.advisorReminder),
    legalAdviceIncluded: rule.legalAdviceIncluded,
    writesConfirmedCrmFact: rule.writesConfirmedCrmFact,
  }));

  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-provider-prompt-context",
    registryReadiness: "internal-only",
    librarySummary,
    meetingRelationshipSignalGrounding,
    selectedObjections,
    redLineCues,
    promptRules: {
      useAsRoleplayCoachingContext: true,
      useMeetingRelationshipSignalsAsRuntimeEvidence: true,
      doNotTreatObjectionsAsConfirmedCrmFacts: true,
      doNotProvideLegalAdvice: true,
      immediateSevereRedLineIds: librarySummary.immediateDetectionIds,
      postReviewRedLineIds: librarySummary.postReviewDetectionIds,
      canMarkNotApplicableButKeepAuditRecord: true,
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      successErrorAiUsageLogRequiredBeforeProviderEnablement: true,
      storesRawProviderPayload: false,
      rawPrivateTranscriptAllowed: false,
      directPrivateDialogAllowed: false,
    },
  };
}

function buildEmptyMeetingRelationshipSignalGrounding(): TheaterRouteBMeetingSignalRuntimeGrounding {
  return {
    source: "RouteBSessionSnapshot.scene.sourceGrounding.meetingRelationshipSignals",
    usedInNextTurnRuntime: false,
    providerPromptUsage: "roleplay-evidence-context-only",
    cardCount: 0,
    unknownCount: 0,
    narratorQuestionCount: 0,
    cards: [],
    narratorQuestions: [],
    boundary: {
      rawMeetingSessionIdIncluded: false,
      rawPersonIdIncluded: false,
      sourceReferenceIdsIncluded: false,
      rawTranscriptIncluded: false,
      rawProviderPayloadIncluded: false,
      personalContactIncluded: false,
      policyIdentifierIncluded: false,
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
    },
  };
}

function sanitizePromptText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[removed]")
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber)\b/gi, "[removed]")
    .slice(0, 240)
    .trim();
}
