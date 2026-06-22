import type {
  RouteBComplianceReviewCandidate,
  RouteBComplianceReviewIntake,
} from "./route-b-compliance-review-intake";

export type RouteBComplianceReviewQueueStatus = "DETERMINISTIC_NO_PROVIDER";

export interface RouteBComplianceReviewQueueSessionRef {
  sessionId: string;
  routeBSceneId: string | null;
  routeBSourcePacketId: string | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteBComplianceReviewQueueInputItem {
  session: RouteBComplianceReviewQueueSessionRef;
  intake: RouteBComplianceReviewIntake;
}

export interface RouteBComplianceReviewQueueItem extends RouteBComplianceReviewQueueSessionRef {
  intakeId: string;
  sourceFeedbackReviewId: string;
  candidateCount: number;
  needsEvidenceCount: number;
  escalationCount: number;
  topSeverity: RouteBComplianceReviewCandidate["severity"] | "NONE";
  candidates: RouteBComplianceReviewCandidate[];
}

export interface RouteBComplianceReviewQueue {
  id: "route_b_compliance_review_queue";
  agentId: "asai.theater.route_b";
  actionId: "route-b-red-line-compliance-review-queue";
  registryReadiness: "internal-only";
  sourceActionId: "route-b-red-line-compliance-review-intake";
  status: RouteBComplianceReviewQueueStatus;
  generatedAt: string;
  itemCount: number;
  candidateCount: number;
  needsEvidenceCount: number;
  escalationCount: number;
  items: RouteBComplianceReviewQueueItem[];
  reviewBoundary: {
    disabledQueueOnly: true;
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
    persistsQueueRecord: false;
    persistsCandidateRecord: false;
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

export interface BuildRouteBComplianceReviewQueueOptions {
  intakes: RouteBComplianceReviewQueueInputItem[];
  now?: Date;
}

const SEVERITY_RANK: Record<RouteBComplianceReviewCandidate["severity"] | "NONE", number> = {
  NONE: 0,
  STANDARD: 1,
  SEVERE: 2,
};

export function buildRouteBComplianceReviewQueue(
  options: BuildRouteBComplianceReviewQueueOptions,
): RouteBComplianceReviewQueue {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const items = options.intakes
    .map((input) => buildQueueItem(input))
    .filter((item): item is RouteBComplianceReviewQueueItem => Boolean(item))
    .sort(compareQueueItems);

  const candidateCount = items.reduce((sum, item) => sum + item.candidateCount, 0);
  const needsEvidenceCount = items.reduce((sum, item) => sum + item.needsEvidenceCount, 0);
  const escalationCount = items.reduce((sum, item) => sum + item.escalationCount, 0);

  return {
    id: "route_b_compliance_review_queue",
    agentId: "asai.theater.route_b",
    actionId: "route-b-red-line-compliance-review-queue",
    registryReadiness: "internal-only",
    sourceActionId: "route-b-red-line-compliance-review-intake",
    status: "DETERMINISTIC_NO_PROVIDER",
    generatedAt,
    itemCount: items.length,
    candidateCount,
    needsEvidenceCount,
    escalationCount,
    items,
    reviewBoundary: {
      disabledQueueOnly: true,
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
      persistsQueueRecord: false,
      persistsCandidateRecord: false,
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

export function isRouteBComplianceReviewQueue(value: unknown): value is RouteBComplianceReviewQueue {
  const record = asRecord(value);
  const reviewBoundary = asRecord(record.reviewBoundary);
  const providerBoundary = asRecord(record.providerBoundary);
  const persistenceBoundary = asRecord(record.persistenceBoundary);
  const privacyProof = asRecord(record.privacyProof);

  return (
    record.id === "route_b_compliance_review_queue" &&
    record.agentId === "asai.theater.route_b" &&
    record.actionId === "route-b-red-line-compliance-review-queue" &&
    record.registryReadiness === "internal-only" &&
    record.sourceActionId === "route-b-red-line-compliance-review-intake" &&
    record.status === "DETERMINISTIC_NO_PROVIDER" &&
    typeof record.generatedAt === "string" &&
    typeof record.itemCount === "number" &&
    typeof record.candidateCount === "number" &&
    typeof record.needsEvidenceCount === "number" &&
    typeof record.escalationCount === "number" &&
    Array.isArray(record.items) &&
    record.items.every(isRouteBComplianceReviewQueueItem) &&
    reviewBoundary.disabledQueueOnly === true &&
    reviewBoundary.createsFormalFinding === false &&
    reviewBoundary.triggersExternalNotification === false &&
    reviewBoundary.providerCallAttempted === false &&
    reviewBoundary.writesConfirmedCrmFact === false &&
    providerBoundary.providerCallAttempted === false &&
    providerBoundary.aiUsageLogWritten === false &&
    persistenceBoundary.persistsQueueRecord === false &&
    persistenceBoundary.persistsCandidateRecord === false &&
    persistenceBoundary.rawPrivateTranscriptAllowed === false &&
    persistenceBoundary.rawProviderPayloadAllowed === false &&
    privacyProof.directPrivateDialogReturned === false &&
    privacyProof.rawProviderPayloadReturned === false &&
    privacyProof.rawPrivateTranscriptReturned === false
  );
}

function buildQueueItem(input: RouteBComplianceReviewQueueInputItem): RouteBComplianceReviewQueueItem | null {
  if (input.intake.candidateCount <= 0) return null;

  const needsEvidenceCount = input.intake.candidates.filter(
    (candidate) => candidate.reviewStatus === "NEEDS_EVIDENCE",
  ).length;
  const escalationCount = input.intake.candidates.filter(
    (candidate) => candidate.actionState === "ESCALATE",
  ).length;
  const topSeverity = input.intake.candidates.reduce<RouteBComplianceReviewQueueItem["topSeverity"]>(
    (current, candidate) => (SEVERITY_RANK[candidate.severity] > SEVERITY_RANK[current] ? candidate.severity : current),
    "NONE",
  );

  return {
    ...input.session,
    intakeId: input.intake.id,
    sourceFeedbackReviewId: input.intake.sourceFeedbackReviewId,
    candidateCount: input.intake.candidateCount,
    needsEvidenceCount,
    escalationCount,
    topSeverity,
    candidates: input.intake.candidates,
  };
}

function compareQueueItems(a: RouteBComplianceReviewQueueItem, b: RouteBComplianceReviewQueueItem) {
  const scoreA = a.escalationCount * 100 + a.needsEvidenceCount * 10 + SEVERITY_RANK[a.topSeverity];
  const scoreB = b.escalationCount * 100 + b.needsEvidenceCount * 10 + SEVERITY_RANK[b.topSeverity];
  if (scoreA !== scoreB) return scoreB - scoreA;

  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

function isRouteBComplianceReviewQueueItem(value: unknown): value is RouteBComplianceReviewQueueItem {
  const record = asRecord(value);

  return (
    typeof record.sessionId === "string" &&
    (typeof record.routeBSceneId === "string" || record.routeBSceneId === null) &&
    (typeof record.routeBSourcePacketId === "string" || record.routeBSourcePacketId === null) &&
    (typeof record.clientId === "string" || record.clientId === null) &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.intakeId === "string" &&
    typeof record.sourceFeedbackReviewId === "string" &&
    typeof record.candidateCount === "number" &&
    typeof record.needsEvidenceCount === "number" &&
    typeof record.escalationCount === "number" &&
    typeof record.topSeverity === "string" &&
    Array.isArray(record.candidates)
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
