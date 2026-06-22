import type {
  TheaterRouteBFeedbackReview,
  TheaterRouteBFeedbackReviewRedLineFinding,
} from "./route-b-feedback-review";
import type {
  RouteBRedLineActionReasonCode,
  RouteBRedLineActionState,
} from "./route-b-red-line-action-workflow";

export type RouteBComplianceReviewIntakeStatus = "DETERMINISTIC_NO_PROVIDER";
export type RouteBComplianceReviewSourceSurface = "theater-route-b-feedback-review";
export type RouteBComplianceReviewCandidateReviewStatus =
  | "CANDIDATE_REVIEW_REQUIRED"
  | "NEEDS_EVIDENCE";
export type RouteBComplianceReviewCandidateActionState = Extract<
  RouteBRedLineActionState,
  "EVIDENCE_NEEDED" | "ESCALATE"
>;

export interface RouteBComplianceReviewEvidenceRef {
  id: string;
  label: "red-line-finding" | "advisor-action-context" | "safe-evidence-basis";
  sourceSurface: RouteBComplianceReviewSourceSurface;
  safeSummary: string;
}

export interface RouteBComplianceReviewCandidate {
  id: string;
  ruleId: TheaterRouteBFeedbackReviewRedLineFinding["redLineId"];
  label: string;
  severity: TheaterRouteBFeedbackReviewRedLineFinding["severity"];
  actionState: RouteBComplianceReviewCandidateActionState;
  advisorReasonCode: RouteBRedLineActionReasonCode;
  sourceSurface: RouteBComplianceReviewSourceSurface;
  sourceActionId: "route-b-red-line-action-feedback-consumption";
  sourceFeedbackReviewId: string;
  evidenceRefs: RouteBComplianceReviewEvidenceRef[];
  reviewStatus: RouteBComplianceReviewCandidateReviewStatus;
  safeSummary: string;
  createdAt: string;
  updatedAt: string;
  proof: {
    noLegalAdvice: true;
    noFormalFinding: true;
    triggersExternalNotification: false;
    providerCallAttempted: false;
    writesConfirmedCrmFact: false;
  };
}

export interface RouteBComplianceReviewIntake {
  id: string;
  agentId: "asai.theater.route_b";
  actionId: "route-b-red-line-compliance-review-intake";
  registryReadiness: "internal-only";
  sourceActionId: "route-b-red-line-action-feedback-consumption";
  sourceFeedbackReviewId: string;
  sessionId: string;
  status: RouteBComplianceReviewIntakeStatus;
  generatedAt: string;
  candidateCount: number;
  candidates: RouteBComplianceReviewCandidate[];
  sourceSurface: RouteBComplianceReviewSourceSurface;
  reviewBoundary: {
    disabledIntakeOnly: true;
    createsFormalFinding: false;
    triggersExternalNotification: false;
    providerCallAttempted: false;
    writesConfirmedCrmFact: false;
    requiresHumanReviewBeforeFormalAction: true;
  };
  providerBoundary: {
    providerCallAttempted: false;
    aiUsageLogWritten: false;
    successErrorAiUsageLogRequiredBeforeProviderEnablement: true;
  };
  persistenceBoundary: {
    persistsCandidateRecord: false;
    allowedFuturePersistenceFields: Array<
      | "ruleId"
      | "actionState"
      | "advisorReasonCode"
      | "sourceSurface"
      | "evidenceRefs"
      | "reviewStatus"
      | "safeSummary"
      | "createdAt"
      | "updatedAt"
    >;
    rawPrivateTranscriptAllowed: false;
    directPrivateDialogAllowed: false;
    rawProviderPayloadAllowed: false;
    personalContactAllowed: false;
    policyNumberAllowed: false;
    paymentDataAllowed: false;
  };
  privacyProof: {
    directPrivateDialogReturned: false;
    rawProviderPayloadReturned: false;
    rawPrivateTranscriptReturned: false;
    personalContactReturned: false;
    policyNumberReturned: false;
    paymentDataReturned: false;
  };
}

export interface BuildRouteBComplianceReviewIntakeOptions {
  feedbackReview: TheaterRouteBFeedbackReview;
  now?: Date;
}

const REVIEW_ACTION_STATES = new Set<RouteBRedLineActionState>(["EVIDENCE_NEEDED", "ESCALATE"]);

export function buildRouteBComplianceReviewIntakeFromFeedbackReview(
  options: BuildRouteBComplianceReviewIntakeOptions,
): RouteBComplianceReviewIntake {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const candidates = options.feedbackReview.redLineFindings
    .map((finding) => buildCandidate(finding, options.feedbackReview, generatedAt))
    .filter((candidate): candidate is RouteBComplianceReviewCandidate => Boolean(candidate));

  return {
    id: `route_b_compliance_review_intake_${options.feedbackReview.sessionId}`,
    agentId: "asai.theater.route_b",
    actionId: "route-b-red-line-compliance-review-intake",
    registryReadiness: "internal-only",
    sourceActionId: "route-b-red-line-action-feedback-consumption",
    sourceFeedbackReviewId: options.feedbackReview.id,
    sessionId: options.feedbackReview.sessionId,
    status: "DETERMINISTIC_NO_PROVIDER",
    generatedAt,
    candidateCount: candidates.length,
    candidates,
    sourceSurface: "theater-route-b-feedback-review",
    reviewBoundary: {
      disabledIntakeOnly: true,
      createsFormalFinding: false,
      triggersExternalNotification: false,
      providerCallAttempted: false,
      writesConfirmedCrmFact: false,
      requiresHumanReviewBeforeFormalAction: true,
    },
    providerBoundary: {
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      successErrorAiUsageLogRequiredBeforeProviderEnablement: true,
    },
    persistenceBoundary: {
      persistsCandidateRecord: false,
      allowedFuturePersistenceFields: [
        "ruleId",
        "actionState",
        "advisorReasonCode",
        "sourceSurface",
        "evidenceRefs",
        "reviewStatus",
        "safeSummary",
        "createdAt",
        "updatedAt",
      ],
      rawPrivateTranscriptAllowed: false,
      directPrivateDialogAllowed: false,
      rawProviderPayloadAllowed: false,
      personalContactAllowed: false,
      policyNumberAllowed: false,
      paymentDataAllowed: false,
    },
    privacyProof: {
      directPrivateDialogReturned: false,
      rawProviderPayloadReturned: false,
      rawPrivateTranscriptReturned: false,
      personalContactReturned: false,
      policyNumberReturned: false,
      paymentDataReturned: false,
    },
  };
}

export function isRouteBComplianceReviewIntake(value: unknown): value is RouteBComplianceReviewIntake {
  const record = asRecord(value);
  const reviewBoundary = asRecord(record.reviewBoundary);
  const providerBoundary = asRecord(record.providerBoundary);
  const persistenceBoundary = asRecord(record.persistenceBoundary);
  const privacyProof = asRecord(record.privacyProof);

  return (
    record.agentId === "asai.theater.route_b" &&
    record.actionId === "route-b-red-line-compliance-review-intake" &&
    record.registryReadiness === "internal-only" &&
    record.sourceActionId === "route-b-red-line-action-feedback-consumption" &&
    typeof record.sessionId === "string" &&
    Array.isArray(record.candidates) &&
    record.candidates.every(isRouteBComplianceReviewCandidate) &&
    reviewBoundary.disabledIntakeOnly === true &&
    reviewBoundary.createsFormalFinding === false &&
    reviewBoundary.triggersExternalNotification === false &&
    reviewBoundary.providerCallAttempted === false &&
    reviewBoundary.writesConfirmedCrmFact === false &&
    providerBoundary.providerCallAttempted === false &&
    providerBoundary.aiUsageLogWritten === false &&
    persistenceBoundary.persistsCandidateRecord === false &&
    persistenceBoundary.rawPrivateTranscriptAllowed === false &&
    persistenceBoundary.rawProviderPayloadAllowed === false &&
    privacyProof.directPrivateDialogReturned === false &&
    privacyProof.rawProviderPayloadReturned === false &&
    privacyProof.rawPrivateTranscriptReturned === false
  );
}

function buildCandidate(
  finding: TheaterRouteBFeedbackReviewRedLineFinding,
  feedbackReview: TheaterRouteBFeedbackReview,
  generatedAt: string,
): RouteBComplianceReviewCandidate | null {
  const actionContext = finding.actionContext;
  if (!actionContext || !REVIEW_ACTION_STATES.has(actionContext.state)) return null;

  const actionState = actionContext.state as RouteBComplianceReviewCandidateActionState;
  const reviewStatus = actionState === "EVIDENCE_NEEDED" ? "NEEDS_EVIDENCE" : "CANDIDATE_REVIEW_REQUIRED";
  const updatedAt = sanitizeIsoTimestamp(actionContext.updatedAt, generatedAt);

  return {
    id: `route_b_compliance_candidate_${feedbackReview.sessionId}_${finding.redLineId.toLowerCase()}`,
    ruleId: finding.redLineId,
    label: finding.label,
    severity: finding.severity,
    actionState,
    advisorReasonCode: actionContext.advisorReasonCode,
    sourceSurface: "theater-route-b-feedback-review",
    sourceActionId: "route-b-red-line-action-feedback-consumption",
    sourceFeedbackReviewId: feedbackReview.id,
    evidenceRefs: [
      {
        id: `${finding.redLineId}:finding`,
        label: "red-line-finding",
        sourceSurface: "theater-route-b-feedback-review",
        safeSummary: `${finding.label} remains ${finding.status}.`,
      },
      {
        id: `${finding.redLineId}:action-context`,
        label: "advisor-action-context",
        sourceSurface: "theater-route-b-feedback-review",
        safeSummary: `${actionState} / ${actionContext.advisorReasonCode}.`,
      },
      {
        id: `${finding.redLineId}:safe-evidence-basis`,
        label: "safe-evidence-basis",
        sourceSurface: "theater-route-b-feedback-review",
        safeSummary: finding.evidenceBasis,
      },
    ],
    reviewStatus,
    safeSummary: buildSafeSummary(finding.label, actionState, actionContext.advisorReasonCode),
    createdAt: generatedAt,
    updatedAt,
    proof: {
      noLegalAdvice: true,
      noFormalFinding: true,
      triggersExternalNotification: false,
      providerCallAttempted: false,
      writesConfirmedCrmFact: false,
    },
  };
}

function buildSafeSummary(
  label: string,
  actionState: RouteBComplianceReviewCandidateActionState,
  advisorReasonCode: RouteBRedLineActionReasonCode,
) {
  if (actionState === "EVIDENCE_NEEDED") {
    return `${label} 已被標示為需要佐證；此項只是待審閱候選，不代表正式法遵處置。`;
  }

  return `${label} 已被標示為升級審閱；此項只是待審閱候選，不會發出真實通知。Reason: ${advisorReasonCode}.`;
}

function isRouteBComplianceReviewCandidate(value: unknown): value is RouteBComplianceReviewCandidate {
  const record = asRecord(value);
  const proof = asRecord(record.proof);

  return (
    typeof record.id === "string" &&
    typeof record.ruleId === "string" &&
    typeof record.label === "string" &&
    (record.actionState === "EVIDENCE_NEEDED" || record.actionState === "ESCALATE") &&
    typeof record.advisorReasonCode === "string" &&
    record.sourceSurface === "theater-route-b-feedback-review" &&
    record.sourceActionId === "route-b-red-line-action-feedback-consumption" &&
    Array.isArray(record.evidenceRefs) &&
    typeof record.safeSummary === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    proof.noLegalAdvice === true &&
    proof.noFormalFinding === true &&
    proof.triggersExternalNotification === false &&
    proof.providerCallAttempted === false &&
    proof.writesConfirmedCrmFact === false
  );
}

function sanitizeIsoTimestamp(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return fallback;

  return new Date(timestamp).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
