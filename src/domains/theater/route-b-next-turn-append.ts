import type { TheaterRouteBVisibilityScope } from "./route-b-handoff";
import type { TheaterRouteBNextTurnProviderRunResult } from "./route-b-next-turn-provider";

export type TheaterRouteBNextTurnAppendCandidate = Extract<
  TheaterRouteBNextTurnProviderRunResult,
  { status: "SUCCESS" }
>["appendCandidate"];

export interface TheaterRouteBNextTurnAppendConfirmationInput {
  usageLogId: string;
  confirmedByAdvisor: boolean;
  confirmationReason?: string;
  candidate: TheaterRouteBNextTurnAppendCandidate;
}

export interface BuildTheaterRouteBNextTurnAppendConfirmationOptions {
  availableRouteBCharacterIds: Iterable<string>;
  input: TheaterRouteBNextTurnAppendConfirmationInput;
}

export type TheaterRouteBNextTurnAppendRejectionCode =
  | "ADVISOR_CONFIRMATION_REQUIRED"
  | "USAGE_LOG_REQUIRED"
  | "INVALID_APPEND_CANDIDATE"
  | "INVALID_CHARACTER_SPEAKER"
  | "INVALID_PRIVATE_ADDRESSEE"
  | "NARRATOR_SCOPE_INVALID";

export type TheaterRouteBNextTurnAppendConfirmation =
  | {
      status: "READY";
      actionId: "route-b-next-turn-append-confirmation";
      usageLogId: string;
      actorKind: "CHARACTER" | "NARRATOR";
      visibilityScope: Extract<TheaterRouteBVisibilityScope, "GROUP" | "PRIVATE">;
      speakerRouteBCharacterId?: string;
      addresseeRouteBCharacterId?: string;
      content: string;
      metadata: {
        source: "theater_route_b_next_turn_append_candidate";
        actionId: "route-b-next-turn-append-confirmation";
        usageLogId: string;
        confirmedByAdvisor: true;
        confirmationReason?: string;
        generatedTextAllowed: true;
        requiresAdvisorConfirmation: true;
        providerUsageLogRequired: true;
        noProviderCallInAppend: true;
        providerCallAttemptedInAppend: false;
        statePatchCount: number;
        writesConfirmedCrmFact: false;
        storesRawProviderPayload: false;
        rawPrivateTranscriptIncluded: false;
      };
      privacyProof: {
        ownerOnlyWriteRequired: true;
        confirmedByAdvisor: true;
        usageLogIdRequired: true;
        noProviderCallInAppend: true;
        storesRawProviderPayload: false;
        rawPrivateTranscriptIncluded: false;
        writesConfirmedCrmFact: false;
      };
    }
  | {
      status: "REJECTED";
      errorCode: TheaterRouteBNextTurnAppendRejectionCode;
      message: string;
    };

const HIDDEN_TEXT = "[removed]";

export function buildTheaterRouteBNextTurnAppendConfirmation({
  availableRouteBCharacterIds,
  input,
}: BuildTheaterRouteBNextTurnAppendConfirmationOptions): TheaterRouteBNextTurnAppendConfirmation {
  const usageLogId = input.usageLogId.trim();
  const availableIds = new Set(Array.from(availableRouteBCharacterIds).map((id) => id.trim()).filter(Boolean));
  const candidate = input.candidate;

  if (!input.confirmedByAdvisor) {
    return rejected(
      "ADVISOR_CONFIRMATION_REQUIRED",
      "Route B next-turn append requires explicit advisor confirmation.",
    );
  }

  if (!isSafeUsageLogId(usageLogId)) {
    return rejected("USAGE_LOG_REQUIRED", "Route B next-turn append requires a safe AiUsageLog id.");
  }

  if (
    candidate.generatedTextAllowed !== true ||
    candidate.requiresAdvisorConfirmation !== true ||
    candidate.writesConfirmedCrmFact !== false ||
    candidate.storesRawProviderPayload !== false ||
    candidate.rawPrivateTranscriptIncluded !== false
  ) {
    return rejected("INVALID_APPEND_CANDIDATE", "Route B next-turn append candidate failed safety flags.");
  }

  if (candidate.actorKind !== "CHARACTER" && candidate.actorKind !== "NARRATOR") {
    return rejected("INVALID_APPEND_CANDIDATE", "Route B next-turn append candidate has an unsupported actor kind.");
  }

  if (candidate.visibilityScope !== "GROUP" && candidate.visibilityScope !== "PRIVATE") {
    return rejected("INVALID_APPEND_CANDIDATE", "Route B next-turn append candidate has an unsupported visibility scope.");
  }

  if (candidate.actorKind === "CHARACTER") {
    const speakerRouteBCharacterId = candidate.speakerRouteBCharacterId?.trim();
    if (!speakerRouteBCharacterId || !availableIds.has(speakerRouteBCharacterId)) {
      return rejected("INVALID_CHARACTER_SPEAKER", "Route B character append requires a known speaker.");
    }
  }

  if (candidate.actorKind === "NARRATOR") {
    if (candidate.speakerRouteBCharacterId || candidate.addresseeRouteBCharacterId || candidate.visibilityScope !== "GROUP") {
      return rejected("NARRATOR_SCOPE_INVALID", "Route B narrator append must stay group-scoped without a character speaker.");
    }
  }

  if (candidate.visibilityScope === "PRIVATE") {
    const addresseeRouteBCharacterId = candidate.addresseeRouteBCharacterId?.trim();
    if (!addresseeRouteBCharacterId || !availableIds.has(addresseeRouteBCharacterId)) {
      return rejected("INVALID_PRIVATE_ADDRESSEE", "Route B private append requires a known addressee.");
    }
  } else if (candidate.addresseeRouteBCharacterId && !availableIds.has(candidate.addresseeRouteBCharacterId.trim())) {
    return rejected("INVALID_PRIVATE_ADDRESSEE", "Route B group append candidate references an unknown addressee.");
  }

  const content = sanitizeRouteBText(candidate.content);
  if (!content) {
    return rejected("INVALID_APPEND_CANDIDATE", "Route B next-turn append candidate must contain safe content.");
  }

  const confirmationReason = sanitizeRouteBText(input.confirmationReason ?? "");

  return {
    status: "READY",
    actionId: "route-b-next-turn-append-confirmation",
    usageLogId,
    actorKind: candidate.actorKind,
    visibilityScope: candidate.visibilityScope,
    speakerRouteBCharacterId: candidate.speakerRouteBCharacterId,
    addresseeRouteBCharacterId: candidate.addresseeRouteBCharacterId,
    content,
    metadata: {
      source: "theater_route_b_next_turn_append_candidate",
      actionId: "route-b-next-turn-append-confirmation",
      usageLogId,
      confirmedByAdvisor: true,
      ...(confirmationReason ? { confirmationReason } : {}),
      generatedTextAllowed: true,
      requiresAdvisorConfirmation: true,
      providerUsageLogRequired: true,
      noProviderCallInAppend: true,
      providerCallAttemptedInAppend: false,
      statePatchCount: normalizeCount(candidate.statePatchCount),
      writesConfirmedCrmFact: false,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
    },
    privacyProof: {
      ownerOnlyWriteRequired: true,
      confirmedByAdvisor: true,
      usageLogIdRequired: true,
      noProviderCallInAppend: true,
      storesRawProviderPayload: false,
      rawPrivateTranscriptIncluded: false,
      writesConfirmedCrmFact: false,
    },
  };
}

function rejected(
  errorCode: TheaterRouteBNextTurnAppendRejectionCode,
  message: string,
): Extract<TheaterRouteBNextTurnAppendConfirmation, { status: "REJECTED" }> {
  return { status: "REJECTED", errorCode, message };
}

function isSafeUsageLogId(value: string): boolean {
  return (
    /^[A-Za-z0-9._:-]{8,160}$/.test(value) &&
    !/(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment)/i.test(value)
  );
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function sanitizeRouteBText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, HIDDEN_TEXT)
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, HIDDEN_TEXT)
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment)\b/gi, HIDDEN_TEXT)
    .trim();
}
