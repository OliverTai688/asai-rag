export interface MeetingSessionLookupCandidate {
  id: string;
  metadata: unknown;
}

export interface MeetingSessionLookupScope {
  visitPlanId?: string | null;
}

export function selectLatestMeetingSessionCandidate<T extends MeetingSessionLookupCandidate>(
  candidates: readonly T[],
  scope: MeetingSessionLookupScope,
): T | null {
  const targetVisitPlanId = normalizeVisitPlanId(scope.visitPlanId);

  return (
    candidates.find((candidate) => readMeetingSessionMetadataVisitPlanId(candidate.metadata) === targetVisitPlanId) ??
    null
  );
}

export function readMeetingSessionMetadataVisitPlanId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const visitPlanId = (value as { visitPlanId?: unknown }).visitPlanId;
  return normalizeVisitPlanId(visitPlanId);
}

function normalizeVisitPlanId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
