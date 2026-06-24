import type {
  RouteBRedLineRule,
  RouteBRedLineRuleId,
  TheaterRouteBFeedbackContract,
  TheaterRouteBFeedbackFamilyProfileGrounding,
  TheaterRouteBFeedbackPerspectiveId,
  TheaterRouteBSevereRedLine,
} from "./route-b-feedback";
import type { TheaterRouteBFamilyProfileRuntimeGrounding } from "./route-b-next-turn";
import {
  buildRouteBProviderPromptContext,
  type RouteBProviderPromptContext,
} from "./route-b-provider-prompt-context";

export type TheaterRouteBFeedbackProviderKind = "OPENAI" | "ANTHROPIC";
export type TheaterRouteBFeedbackProviderStatus = "SUCCESS" | "PROVIDER_ERROR";

export interface TheaterRouteBFeedbackProviderInput {
  agentId: "asai.theater.route_b";
  actionId: "route-b-feedback-provider";
  registryReadiness: "internal-only";
  selectedPerspectives: Array<{
    id: TheaterRouteBFeedbackPerspectiveId;
    label: string;
    purpose: string;
  }>;
  inputPreview: TheaterRouteBFeedbackContract["inputPreview"];
  outputRules: {
    qualitativeOnly: true;
    totalScoreAllowed: false;
    rankingAllowed: false;
    canMarkNotApplicable: true;
    requiresEvidenceBasis: true;
  };
  promptContext: RouteBProviderPromptContext;
  redLineReview: {
    severeSignals: Array<Pick<TheaterRouteBSevereRedLine, "id" | "label" | "severity" | "evidencePolicy">>;
    allRules: Array<
      Pick<
        RouteBRedLineRule,
        | "id"
        | "label"
        | "severity"
        | "detectionMode"
        | "evidencePolicy"
        | "falsePositiveHandling"
        | "advisorReminder"
        | "legalAdviceIncluded"
        | "writesConfirmedCrmFact"
      >
    >;
    canMarkNotApplicable: true;
    legalAdviceIncluded: false;
  };
  privacyBoundary: {
    usesInputPreviewOnly: true;
    includesTurnText: false;
    includesPrivateLaneContent: false;
    storesProviderBody: false;
  };
}

export interface TheaterRouteBFeedbackProviderSection {
  perspectiveId: TheaterRouteBFeedbackPerspectiveId;
  label: string;
  observation: string;
  evidenceBasis: string;
  advisorMove: string;
  riskOrUnknown: string;
}

export interface TheaterRouteBFeedbackProviderRedLineFinding {
  redLineId: RouteBRedLineRuleId;
  label: string;
  status: "OBSERVED" | "NOT_APPLICABLE" | "NEEDS_REVIEW";
  evidenceBasis: string;
}

export interface TheaterRouteBFeedbackProviderOutput {
  sections: TheaterRouteBFeedbackProviderSection[];
  redLineFindings: TheaterRouteBFeedbackProviderRedLineFinding[];
}

export interface TheaterRouteBFeedbackProviderTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface TheaterRouteBFeedbackProviderResponse {
  model: string;
  feedback: TheaterRouteBFeedbackProviderOutput;
  tokenUsage?: TheaterRouteBFeedbackProviderTokenUsage;
}

export interface TheaterRouteBFeedbackProviderAdapter {
  generate(input: TheaterRouteBFeedbackProviderInput): Promise<TheaterRouteBFeedbackProviderResponse>;
}

export interface TheaterRouteBFeedbackUsageLogDraft {
  agentId: "asai.theater.route_b";
  actionId: "route-b-feedback-provider";
  module: "THEATER";
  callKind: "FEEDBACK";
  providerKind: TheaterRouteBFeedbackProviderKind;
  outcome: TheaterRouteBFeedbackProviderStatus;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: "PROVIDER_ERROR";
  storesProviderBody: false;
  storesPrivateLaneContent: false;
}

export interface TheaterRouteBFeedbackUsageLogRecord extends TheaterRouteBFeedbackUsageLogDraft {
  usageLogId: string;
}

export interface TheaterRouteBFeedbackUsageLogger {
  writeSuccess(draft: TheaterRouteBFeedbackUsageLogDraft): Promise<TheaterRouteBFeedbackUsageLogRecord>;
  writeError(draft: TheaterRouteBFeedbackUsageLogDraft): Promise<TheaterRouteBFeedbackUsageLogRecord>;
}

export type TheaterRouteBFeedbackProviderRunResult =
  | {
      status: "SUCCESS";
      providerCallAttempted: true;
      aiUsageLogWritten: true;
      usageLogId: string;
      providerKind: TheaterRouteBFeedbackProviderKind;
      model: string;
      feedback: TheaterRouteBFeedbackProviderOutput;
      storesProviderBody: false;
      successErrorAiUsageLogProofRequired: true;
    }
  | {
      status: "PROVIDER_ERROR";
      providerCallAttempted: true;
      aiUsageLogWritten: true;
      usageLogId: string;
      providerKind: TheaterRouteBFeedbackProviderKind;
      errorCode: "PROVIDER_ERROR";
      storesProviderBody: false;
      successErrorAiUsageLogProofRequired: true;
    };

export interface RunTheaterRouteBFeedbackProviderContractOptions {
  contract: TheaterRouteBFeedbackContract;
  providerKind: TheaterRouteBFeedbackProviderKind;
  provider: TheaterRouteBFeedbackProviderAdapter;
  usageLogger: TheaterRouteBFeedbackUsageLogger;
}

export async function runTheaterRouteBFeedbackProviderContract({
  contract,
  providerKind,
  provider,
  usageLogger,
}: RunTheaterRouteBFeedbackProviderContractOptions): Promise<TheaterRouteBFeedbackProviderRunResult> {
  const providerInput = buildTheaterRouteBFeedbackProviderInput(contract);

  try {
    const response = await provider.generate(providerInput);
    const usageRecord = await usageLogger.writeSuccess(
      buildTheaterRouteBFeedbackUsageLogDraft({
        providerKind,
        outcome: "SUCCESS",
        model: response.model,
        tokenUsage: response.tokenUsage,
      }),
    );

    assertUsageRecord(usageRecord, "SUCCESS");

    return {
      status: "SUCCESS",
      providerCallAttempted: true,
      aiUsageLogWritten: true,
      usageLogId: usageRecord.usageLogId,
      providerKind,
      model: response.model,
      feedback: response.feedback,
      storesProviderBody: false,
      successErrorAiUsageLogProofRequired: true,
    };
  } catch {
    const usageRecord = await usageLogger.writeError(
      buildTheaterRouteBFeedbackUsageLogDraft({
        providerKind,
        outcome: "PROVIDER_ERROR",
        errorCode: "PROVIDER_ERROR",
      }),
    );

    assertUsageRecord(usageRecord, "PROVIDER_ERROR");

    return {
      status: "PROVIDER_ERROR",
      providerCallAttempted: true,
      aiUsageLogWritten: true,
      usageLogId: usageRecord.usageLogId,
      providerKind,
      errorCode: "PROVIDER_ERROR",
      storesProviderBody: false,
      successErrorAiUsageLogProofRequired: true,
    };
  }
}

export function buildTheaterRouteBFeedbackProviderInput(
  contract: TheaterRouteBFeedbackContract,
): TheaterRouteBFeedbackProviderInput {
  const promptContext = buildFeedbackPromptContext(contract);

  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-feedback-provider",
    registryReadiness: "internal-only",
    selectedPerspectives: contract.selectedPerspectives.map((perspective) => ({
      id: perspective.id,
      label: perspective.label,
      purpose: perspective.purpose,
    })),
    inputPreview: contract.inputPreview,
    outputRules: {
      qualitativeOnly: contract.outputContract.qualitativeOnly,
      totalScoreAllowed: contract.outputContract.totalScoreAllowed,
      rankingAllowed: contract.outputContract.rankingAllowed,
      canMarkNotApplicable: contract.outputContract.canMarkNotApplicable,
      requiresEvidenceBasis: true,
    },
    promptContext,
    redLineReview: {
      severeSignals: contract.redLineReview.severeSignals.map((signal) => ({
        id: signal.id,
        label: signal.label,
        severity: signal.severity,
        evidencePolicy: signal.evidencePolicy,
      })),
      allRules: promptContext.redLineCues.map((rule) => ({
        id: rule.id,
        label: rule.label,
        severity: rule.severity,
        detectionMode: rule.detectionMode,
        evidencePolicy: rule.evidencePolicy,
        falsePositiveHandling: rule.falsePositiveHandling,
        advisorReminder: rule.advisorReminder,
        legalAdviceIncluded: rule.legalAdviceIncluded,
        writesConfirmedCrmFact: rule.writesConfirmedCrmFact,
      })),
      canMarkNotApplicable: contract.redLineReview.canMarkNotApplicable,
      legalAdviceIncluded: contract.redLineReview.legalAdviceIncluded,
    },
    privacyBoundary: {
      usesInputPreviewOnly: true,
      includesTurnText: false,
      includesPrivateLaneContent: false,
      storesProviderBody: false,
    },
  };
}

function buildFeedbackPromptContext(contract: TheaterRouteBFeedbackContract) {
  return buildRouteBProviderPromptContext({
    familyProfileGrounding: toRuntimeFamilyProfilePromptGrounding(contract.familyProfileGrounding),
    relationshipEdgeShadowGrounding: contract.relationshipEdgeShadowGrounding,
    personaHints: contract.selectedPerspectives.flatMap((perspective) => [perspective.label, perspective.purpose]),
    unknowns: [
      `unknown gaps: ${contract.inputPreview.materialCounts.unknownGaps}`,
      `private lane count: ${contract.inputPreview.historyVisibilitySummary.PRIVATE ?? 0}`,
      `relationship edge shadow candidates: ${contract.relationshipEdgeShadowGrounding.candidateEdgeCount}`,
      `family profile unknown fields: ${contract.familyProfileGrounding.unknownFieldCount}`,
    ],
    maxItems: 5,
  });
}

function toRuntimeFamilyProfilePromptGrounding(
  grounding: TheaterRouteBFeedbackFamilyProfileGrounding,
): TheaterRouteBFamilyProfileRuntimeGrounding {
  return {
    source: grounding.source,
    usedInNextTurnRuntime: grounding.usedInFeedbackReview,
    providerPromptUsage: "family-profile-context-only",
    profiledMemberCount: grounding.profiledMemberCount,
    fieldCount: grounding.fieldCount,
    knownFieldCount: grounding.knownFieldCount,
    unknownFieldCount: grounding.unknownFieldCount,
    sourceReferenceCount: grounding.sourceReferenceCount,
    factStatusCounts: grounding.factStatusCounts,
    fields: grounding.fields,
    unknownPrompts: grounding.unknownPrompts,
    boundary: {
      ownerScopedRelationshipGraphRequired: grounding.boundary.ownerScopedRelationshipGraphRequired,
      rawMetadataIncluded: grounding.boundary.rawMetadataIncluded,
      sourceReferenceIdsIncluded: grounding.boundary.sourceReferenceIdsIncluded,
      rawPrivateTranscriptIncluded: grounding.boundary.rawPrivateTranscriptIncluded,
      rawProviderPayloadIncluded: grounding.boundary.rawProviderPayloadIncluded,
      personalContactIncluded: grounding.boundary.personalContactIncluded,
      policyIdentifierIncluded: grounding.boundary.policyIdentifierIncluded,
      databaseWriteAttempted: grounding.boundary.databaseWriteAttempted,
      providerCallAttempted: grounding.boundary.providerCallAttempted,
      aiUsageLogWritten: grounding.boundary.aiUsageLogWritten,
      writesRelationshipGraph: grounding.boundary.writesRelationshipGraph,
      writesVisitPlan: grounding.boundary.writesVisitPlan,
      writesConfirmedCrmFact: grounding.boundary.writesConfirmedCrmFact,
    },
  };
}

function buildTheaterRouteBFeedbackUsageLogDraft(options: {
  providerKind: TheaterRouteBFeedbackProviderKind;
  outcome: TheaterRouteBFeedbackProviderStatus;
  model?: string;
  tokenUsage?: TheaterRouteBFeedbackProviderTokenUsage;
  errorCode?: "PROVIDER_ERROR";
}): TheaterRouteBFeedbackUsageLogDraft {
  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-feedback-provider",
    module: "THEATER",
    callKind: "FEEDBACK",
    providerKind: options.providerKind,
    outcome: options.outcome,
    model: options.model,
    inputTokens: normalizeTokenCount(options.tokenUsage?.inputTokens),
    outputTokens: normalizeTokenCount(options.tokenUsage?.outputTokens),
    errorCode: options.errorCode,
    storesProviderBody: false,
    storesPrivateLaneContent: false,
  };
}

function normalizeTokenCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.floor(value);
}

function assertUsageRecord(
  record: TheaterRouteBFeedbackUsageLogRecord,
  expectedOutcome: TheaterRouteBFeedbackProviderStatus,
) {
  if (!record.usageLogId || record.outcome !== expectedOutcome || record.storesProviderBody) {
    throw new Error("Route B feedback provider cannot return before AiUsageLog is written.");
  }
}
