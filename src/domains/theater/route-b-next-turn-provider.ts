import type { TheaterRouteBVisibilityScope } from "./route-b-handoff";
import type { TheaterRouteBNextTurnDraft } from "./route-b-next-turn";
import {
  buildRouteBProviderPromptContext,
  type RouteBProviderPromptContext,
} from "./route-b-provider-prompt-context";

export type TheaterRouteBNextTurnProviderKind = "OPENAI" | "ANTHROPIC";
export type TheaterRouteBNextTurnProviderStatus = "SUCCESS" | "PROVIDER_ERROR";
export type TheaterRouteBNextTurnProviderCallKind = "CHARACTER" | "NARRATOR";

export interface TheaterRouteBNextTurnProviderInput {
  agentId: "asai.theater.route_b";
  actionId: "route-b-next-turn-provider";
  registryReadiness: "internal-only";
  session: {
    sessionId: string;
    routeBSceneId: string | null;
    latestAdvisorTurnId: string;
    latestAdvisorTurnVisibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
  };
  nextTurn: {
    role: "CHARACTER" | "NARRATOR";
    speakerRouteBCharacterId?: string;
    speakerDisplayName?: string;
    addresseeRouteBCharacterId?: string;
    visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
    directorDirective?: string;
    rationale: string[];
    guardEvidence: TheaterRouteBNextTurnDraft["nextTurn"]["guardEvidence"];
  };
  persistenceEnvelope: {
    actorKind: "CHARACTER" | "NARRATOR";
    statePatchCount: number;
    requiresAdvisorConfirmation: true;
    writesConfirmedCrmFact: false;
    allowedWriteTargets: TheaterRouteBNextTurnDraft["persistenceEnvelope"]["allowedWriteTargets"];
  };
  promptContext: RouteBProviderPromptContext;
  outputRules: {
    generatedTextAllowed: true;
    appendRequiresAdvisorConfirmation: true;
    canCreateTheaterTurnCandidate: true;
    writesConfirmedCrmFact: false;
    storesRawProviderPayload: false;
    rawPrivateTranscriptAllowed: false;
  };
  privacyBoundary: {
    usesNextTurnPreviewOnly: true;
    includesRawPrivateTranscript: false;
    includesDirectPrivateDialog: false;
    storesProviderBody: false;
  };
}

export interface TheaterRouteBNextTurnProviderTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface TheaterRouteBNextTurnProviderResponse {
  model: string;
  content: string;
  tokenUsage?: TheaterRouteBNextTurnProviderTokenUsage;
}

export interface TheaterRouteBNextTurnProviderAdapter {
  generate(input: TheaterRouteBNextTurnProviderInput): Promise<TheaterRouteBNextTurnProviderResponse>;
}

export interface TheaterRouteBNextTurnUsageLogDraft {
  agentId: "asai.theater.route_b";
  actionId: "route-b-next-turn-provider";
  module: "THEATER";
  callKind: TheaterRouteBNextTurnProviderCallKind;
  providerKind: TheaterRouteBNextTurnProviderKind;
  outcome: TheaterRouteBNextTurnProviderStatus;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: "PROVIDER_ERROR";
  storesProviderBody: false;
  storesPrivateLaneContent: false;
  storesRawPrivateTranscript: false;
  writesConfirmedCrmFact: false;
}

export interface TheaterRouteBNextTurnUsageLogRecord extends TheaterRouteBNextTurnUsageLogDraft {
  usageLogId: string;
}

export interface TheaterRouteBNextTurnUsageLogger {
  writeSuccess(draft: TheaterRouteBNextTurnUsageLogDraft): Promise<TheaterRouteBNextTurnUsageLogRecord>;
  writeError(draft: TheaterRouteBNextTurnUsageLogDraft): Promise<TheaterRouteBNextTurnUsageLogRecord>;
}

export type TheaterRouteBNextTurnProviderRunResult =
  | {
      status: "SUCCESS";
      providerCallAttempted: true;
      aiUsageLogWritten: true;
      usageLogId: string;
      providerKind: TheaterRouteBNextTurnProviderKind;
      model: string;
      appendCandidate: {
        actorKind: "CHARACTER" | "NARRATOR";
        speakerRouteBCharacterId?: string;
        addresseeRouteBCharacterId?: string;
        visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
        content: string;
        statePatchCount: number;
        generatedTextAllowed: true;
        requiresAdvisorConfirmation: true;
        writesConfirmedCrmFact: false;
        storesRawProviderPayload: false;
        rawPrivateTranscriptIncluded: false;
      };
      successErrorAiUsageLogProofRequired: true;
    }
  | {
      status: "PROVIDER_ERROR";
      providerCallAttempted: true;
      aiUsageLogWritten: true;
      usageLogId: string;
      providerKind: TheaterRouteBNextTurnProviderKind;
      errorCode: "PROVIDER_ERROR";
      appendCandidateCreated: false;
      generatedTextAllowed: false;
      storesRawProviderPayload: false;
      rawPrivateTranscriptIncluded: false;
      successErrorAiUsageLogProofRequired: true;
    }
  | {
      status: "BLOCKED_DRAFT";
      providerCallAttempted: false;
      aiUsageLogWritten: false;
      blockedReason: string;
      appendCandidateCreated: false;
      generatedTextAllowed: false;
      successErrorAiUsageLogProofRequired: true;
    };

export interface RunTheaterRouteBNextTurnProviderContractOptions {
  draft: TheaterRouteBNextTurnDraft;
  providerKind: TheaterRouteBNextTurnProviderKind;
  provider: TheaterRouteBNextTurnProviderAdapter;
  usageLogger: TheaterRouteBNextTurnUsageLogger;
}

export async function runTheaterRouteBNextTurnProviderContract({
  draft,
  providerKind,
  provider,
  usageLogger,
}: RunTheaterRouteBNextTurnProviderContractOptions): Promise<TheaterRouteBNextTurnProviderRunResult> {
  const blockedReason = blockedDraftReason(draft);
  if (blockedReason) {
    return {
      status: "BLOCKED_DRAFT",
      providerCallAttempted: false,
      aiUsageLogWritten: false,
      blockedReason,
      appendCandidateCreated: false,
      generatedTextAllowed: false,
      successErrorAiUsageLogProofRequired: true,
    };
  }

  const providerInput = buildTheaterRouteBNextTurnProviderInput(draft);

  try {
    const response = await provider.generate(providerInput);
    const usageRecord = await usageLogger.writeSuccess(
      buildTheaterRouteBNextTurnUsageLogDraft({
        draft,
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
      appendCandidate: {
        actorKind: draft.persistenceEnvelope.actorKind,
        speakerRouteBCharacterId: draft.persistenceEnvelope.speakerRouteBCharacterId,
        addresseeRouteBCharacterId: draft.persistenceEnvelope.addresseeRouteBCharacterId,
        visibilityScope: providerInput.nextTurn.visibilityScope,
        content: sanitizeGeneratedText(response.content) || "角色回覆已產生，請顧問確認後再寫入劇場。",
        statePatchCount: draft.persistenceEnvelope.statePatchCount,
        generatedTextAllowed: true,
        requiresAdvisorConfirmation: true,
        writesConfirmedCrmFact: false,
        storesRawProviderPayload: false,
        rawPrivateTranscriptIncluded: false,
      },
      successErrorAiUsageLogProofRequired: true,
    };
  } catch {
    const usageRecord = await usageLogger.writeError(
      buildTheaterRouteBNextTurnUsageLogDraft({
        draft,
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
      appendCandidateCreated: false,
      generatedTextAllowed: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      successErrorAiUsageLogProofRequired: true,
    };
  }
}

export function buildTheaterRouteBNextTurnProviderInput(
  draft: TheaterRouteBNextTurnDraft,
): TheaterRouteBNextTurnProviderInput {
  const blockedReason = blockedDraftReason(draft);
  if (blockedReason) {
    throw new Error(blockedReason);
  }

  const latestAdvisorTurnId = draft.inputSummary.latestAdvisorTurnId;
  const latestAdvisorTurnVisibilityScope = draft.inputSummary.latestAdvisorTurnVisibilityScope;
  const visibilityScope = draft.nextTurn.visibilityScope;

  if (!latestAdvisorTurnId || !latestAdvisorTurnVisibilityScope || !visibilityScope) {
    throw new Error("Route B next-turn provider requires advisor turn and visibility scope.");
  }

  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-next-turn-provider",
    registryReadiness: "internal-only",
    session: {
      sessionId: draft.inputSummary.sessionId,
      routeBSceneId: draft.inputSummary.routeBSceneId,
      latestAdvisorTurnId,
      latestAdvisorTurnVisibilityScope,
    },
    nextTurn: {
      role: draft.nextTurn.role,
      speakerRouteBCharacterId: draft.nextTurn.speakerRouteBCharacterId,
      speakerDisplayName: draft.nextTurn.displayName,
      addresseeRouteBCharacterId: draft.nextTurn.addresseeRouteBCharacterId,
      visibilityScope,
      directorDirective: draft.nextTurn.directorDirective,
      rationale: draft.nextTurn.rationale,
      guardEvidence: draft.nextTurn.guardEvidence,
    },
    persistenceEnvelope: {
      actorKind: draft.persistenceEnvelope.actorKind,
      statePatchCount: draft.persistenceEnvelope.statePatchCount,
      requiresAdvisorConfirmation: true,
      writesConfirmedCrmFact: false,
      allowedWriteTargets: draft.persistenceEnvelope.allowedWriteTargets,
    },
    promptContext: buildNextTurnPromptContext(draft),
    outputRules: {
      generatedTextAllowed: true,
      appendRequiresAdvisorConfirmation: true,
      canCreateTheaterTurnCandidate: true,
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptAllowed: false,
    },
    privacyBoundary: {
      usesNextTurnPreviewOnly: true,
      includesRawPrivateTranscript: false,
      includesDirectPrivateDialog: false,
      storesProviderBody: false,
    },
  };
}

function buildNextTurnPromptContext(draft: TheaterRouteBNextTurnDraft) {
  const personaHints = [
    draft.nextTurn.displayName,
    draft.nextTurn.directorDirective,
    ...draft.nextTurn.rationale,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return buildRouteBProviderPromptContext({
    personaHints,
    unknowns: draft.nextTurn.rationale,
    meetingRelationshipSignalGrounding: draft.inputSummary.meetingRelationshipSignalGrounding,
    relationshipEdgeShadowGrounding: draft.inputSummary.relationshipEdgeShadowGrounding,
    maxItems: 4,
  });
}

function blockedDraftReason(draft: TheaterRouteBNextTurnDraft): string | undefined {
  if (draft.status !== "READY") return `Route B next-turn draft is not ready: ${draft.status}.`;
  if (!draft.inputSummary.latestAdvisorTurnId || !draft.inputSummary.latestAdvisorTurnVisibilityScope) {
    return "Route B next-turn provider requires a latest advisor turn.";
  }
  if (draft.nextTurn.role === "CHARACTER" && !draft.nextTurn.speakerRouteBCharacterId) {
    return "Route B next-turn provider requires a selected character speaker.";
  }
  if (!draft.nextTurn.visibilityScope) {
    return "Route B next-turn provider requires a visibility scope.";
  }
  return undefined;
}

function buildTheaterRouteBNextTurnUsageLogDraft(options: {
  draft: TheaterRouteBNextTurnDraft;
  providerKind: TheaterRouteBNextTurnProviderKind;
  outcome: TheaterRouteBNextTurnProviderStatus;
  model?: string;
  tokenUsage?: TheaterRouteBNextTurnProviderTokenUsage;
  errorCode?: "PROVIDER_ERROR";
}): TheaterRouteBNextTurnUsageLogDraft {
  return {
    agentId: "asai.theater.route_b",
    actionId: "route-b-next-turn-provider",
    module: "THEATER",
    callKind: options.draft.persistenceEnvelope.actorKind,
    providerKind: options.providerKind,
    outcome: options.outcome,
    model: options.model,
    inputTokens: normalizeTokenCount(options.tokenUsage?.inputTokens),
    outputTokens: normalizeTokenCount(options.tokenUsage?.outputTokens),
    errorCode: options.errorCode,
    storesProviderBody: false,
    storesPrivateLaneContent: false,
    storesRawPrivateTranscript: false,
    writesConfirmedCrmFact: false,
  };
}

function normalizeTokenCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.floor(value);
}

function assertUsageRecord(
  record: TheaterRouteBNextTurnUsageLogRecord,
  expectedOutcome: TheaterRouteBNextTurnProviderStatus,
) {
  if (
    !record.usageLogId ||
    record.outcome !== expectedOutcome ||
    record.storesProviderBody ||
    record.storesPrivateLaneContent ||
    record.storesRawPrivateTranscript ||
    record.writesConfirmedCrmFact
  ) {
    throw new Error("Route B next-turn provider cannot return before AiUsageLog is written.");
  }
}

function sanitizeGeneratedText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[removed]")
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment)\b/gi, "[removed]")
    .trim();
}
