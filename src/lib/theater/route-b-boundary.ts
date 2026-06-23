import type {
  TheaterRouteBHandoffPacket,
  TheaterRouteBMeetingSignalGroundingSummary,
} from "@/domains/theater/route-b-handoff";

export function validateRouteBHandoffBoundary(handoff: TheaterRouteBHandoffPacket): string | undefined {
  if (handoff.scene.statePatches.some((patch) => patch.writesConfirmedCrmFact !== false)) {
    return "Route B state patches cannot write confirmed CRM facts.";
  }

  const meetingSignalGroundingIssue = validateMeetingSignalGroundingBoundary(
    handoff.scene.sourceGrounding?.meetingRelationshipSignals,
  );

  if (meetingSignalGroundingIssue) {
    return meetingSignalGroundingIssue;
  }

  if (handoff.aiUsagePlan.noProviderDuringHandoffBuild !== true) {
    return "Route B handoff must prove no provider call during handoff build.";
  }

  const invalidUsagePlan = handoff.aiUsagePlan.calls.some(
    (call) =>
      call.requiresAiUsageLog !== true ||
      call.logOn !== "SUCCESS_AND_PROVIDER_ERROR" ||
      call.storesRawProviderPayload !== false,
  );

  if (invalidUsagePlan) {
    return "Route B director/character/feedback calls must require AiUsageLog and avoid raw provider payload storage.";
  }

  return undefined;
}

export function isTheaterRouteBHandoffPacket(value: unknown): value is TheaterRouteBHandoffPacket {
  if (!isRecord(value)) return false;
  if (!hasString(value, "id") || !hasString(value, "sourcePacketId")) return false;
  if (!isRecord(value.scene) || !hasString(value.scene, "id")) return false;
  if (!Array.isArray(value.scene.characters) || value.scene.characters.length === 0) return false;
  if (!Array.isArray(value.scene.statePatches)) return false;
  if (!isRecord(value.aiUsagePlan) || !Array.isArray(value.aiUsagePlan.calls)) return false;
  if (!isRecord(value.runtimeActivation)) return false;

  return true;
}

function validateMeetingSignalGroundingBoundary(
  summary?: TheaterRouteBMeetingSignalGroundingSummary,
): string | undefined {
  if (!summary) return undefined;

  const boundary = summary.boundary;
  const cards = Array.isArray(summary.cards) ? summary.cards : null;
  const narratorQuestions = Array.isArray(summary.narratorQuestions) ? summary.narratorQuestions : null;

  if (!cards || !narratorQuestions) {
    return "Route B meeting-signal grounding must include cards and narratorQuestions arrays.";
  }

  if (cards.some(hasForbiddenGroundingCardShape)) {
    return "Route B meeting-signal grounding cards cannot include raw source ids, meeting session ids, person ids, or source reference ids.";
  }

  if (
    !boundary ||
    boundary.ownerScopedVisitPlanRequired !== true ||
    boundary.browserSuppliedSessionId !== false ||
    boundary.browserSuppliedPersonId !== false ||
    boundary.providerCallAttempted !== false ||
    boundary.aiUsageLogWritten !== false ||
    boundary.storesRawProviderPayload !== false ||
    boundary.rawTranscriptStored !== false ||
    boundary.writesRelationshipGraph !== false ||
    boundary.writesVisitPlan !== false ||
    boundary.writesConfirmedCrmFact !== false
  ) {
    return "Route B meeting-signal grounding must keep owner scope, no-provider, no-raw, and no-write boundary flags.";
  }

  if (containsForbiddenGroundingValue(summary)) {
    return "Route B meeting-signal grounding cannot include raw transcript, provider, contact, policy, or payment sentinels.";
  }

  return undefined;
}

function hasForbiddenGroundingCardShape(card: unknown): boolean {
  if (!isRecord(card)) return true;

  return ["id", "meetingSessionId", "personId", "sourceReferenceIds", "rawTranscript", "rawProviderPayload"].some((key) =>
    Object.prototype.hasOwnProperty.call(card, key),
  );
}

function containsForbiddenGroundingValue(value: unknown): boolean {
  if (typeof value === "string") {
    return (
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
      /09\d{2}[-\s]?\d{3}[-\s]?\d{3}/.test(value) ||
      /\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber|rawTranscript)\b/i.test(value)
    );
  }

  if (Array.isArray(value)) {
    return value.some(containsForbiddenGroundingValue);
  }

  if (isRecord(value)) {
    return Object.values(value).some(containsForbiddenGroundingValue);
  }

  return false;
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string" && record[key].trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
