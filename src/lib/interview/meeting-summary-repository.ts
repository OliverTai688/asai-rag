import type {
  MeetingActionItem,
  MeetingCitation,
  MeetingParticipant,
  MeetingSummary,
  MeetingSummaryGuardEvidence,
  MeetingSummaryItem,
} from "../../domains/interview/meeting";

export const MEETING_SUMMARY_SCHEMA_VERSION = "asai.meeting.summary.v1";
export const MEETING_INTERVIEW_KIND = "CLIENT_MEETING";
export const MEETING_AI_MODULE = "MEETING";

export type MeetingPersistenceProvider = "MOCK" | "OPENAI" | "ANTHROPIC";

export interface MeetingSummarySessionScope {
  organizationId: string;
  unitId?: string | null;
  clientId?: string | null;
  sessionId: string;
  ownerId?: string | null;
}

export interface BuildMeetingSummaryPersistenceDraftInput {
  scope: MeetingSummarySessionScope;
  summary: MeetingSummary;
  provider?: MeetingPersistenceProvider | null;
  model?: string | null;
  usageLogId?: string | null;
}

export interface MeetingSummaryPersistenceDraft {
  schemaVersion: typeof MEETING_SUMMARY_SCHEMA_VERSION;
  aiUsageLogModule: typeof MEETING_AI_MODULE;
  interviewKind: typeof MEETING_INTERVIEW_KIND;
  organizationId: string;
  unitId: string | null;
  clientId: string | null;
  sessionId: string;
  ownerId: string | null;
  generatedBy: MeetingSummaryGuardEvidence["generatedBy"];
  headline: string;
  summary: string;
  decisions: MeetingSummaryItem[];
  actionItems: MeetingActionItem[];
  openQuestions: MeetingSummaryItem[];
  participants: MeetingParticipant[];
  citations: MeetingCitation[];
  sourceTurnIds: string[];
  sourceMemoryIds: string[];
  provider: MeetingPersistenceProvider | null;
  model: string | null;
  usageLogId: string | null;
  guardEvidence: MeetingSummaryGuardEvidence;
}

export function buildMeetingSummaryPersistenceDraft(
  input: BuildMeetingSummaryPersistenceDraftInput,
): MeetingSummaryPersistenceDraft {
  const citations = allSummaryCitations(input.summary);

  return {
    schemaVersion: MEETING_SUMMARY_SCHEMA_VERSION,
    aiUsageLogModule: MEETING_AI_MODULE,
    interviewKind: MEETING_INTERVIEW_KIND,
    organizationId: input.scope.organizationId,
    unitId: normalizeOptionalId(input.scope.unitId),
    clientId: normalizeOptionalId(input.scope.clientId),
    sessionId: input.scope.sessionId,
    ownerId: normalizeOptionalId(input.scope.ownerId),
    generatedBy: input.summary.guardEvidence.generatedBy,
    headline: input.summary.headline,
    summary: input.summary.summary,
    decisions: input.summary.decisions,
    actionItems: input.summary.actionItems,
    openQuestions: input.summary.openQuestions,
    participants: input.summary.participants,
    citations,
    sourceTurnIds: uniqueStrings(citations.map((citation) => citation.turnId)),
    sourceMemoryIds: uniqueStrings(citations.flatMap((citation) => citation.memoryIds)),
    provider: input.provider ?? null,
    model: input.model ?? null,
    usageLogId: normalizeOptionalId(input.usageLogId),
    guardEvidence: input.summary.guardEvidence,
  };
}

export function assertMeetingSummaryPersistenceDraftSafety(
  draft: MeetingSummaryPersistenceDraft,
  knownTurnIds: Iterable<string>,
): string[] {
  const failures: string[] = [];
  const allowedTurnIds = new Set(knownTurnIds);
  const citedTurnIds = new Set(draft.citations.map((citation) => citation.turnId));

  if (!draft.organizationId.trim()) failures.push("missing organizationId");
  if (!draft.sessionId.trim()) failures.push("missing sessionId");
  if (draft.schemaVersion !== MEETING_SUMMARY_SCHEMA_VERSION) failures.push("schema version mismatch");
  if (draft.aiUsageLogModule !== MEETING_AI_MODULE) failures.push("AiUsageLog module mismatch");
  if (draft.interviewKind !== MEETING_INTERVIEW_KIND) failures.push("interview kind mismatch");
  if (draft.guardEvidence.providerCallAttempted) failures.push("provider call attempted");
  if (draft.guardEvidence.dbWriteAttempted) failures.push("db write attempted");
  if (draft.guardEvidence.storesAudioBinary) failures.push("audio binary storage attempted");
  if (draft.guardEvidence.storesPrivateTranscript) failures.push("raw private transcript storage attempted");
  if (draft.guardEvidence.writesConfirmedCrmFact) failures.push("confirmed CRM write attempted");
  if (draft.provider && !draft.usageLogId) failures.push("provider summary requires usageLogId");
  if (!draft.provider && draft.usageLogId) failures.push("usageLogId set without provider");

  for (const citation of draft.citations) {
    if (!allowedTurnIds.has(citation.turnId)) {
      failures.push(`unknown citation turn ${citation.turnId}`);
    }
  }

  for (const sourceTurnId of draft.sourceTurnIds) {
    if (!citedTurnIds.has(sourceTurnId)) {
      failures.push(`sourceTurnIds contains uncited turn ${sourceTurnId}`);
    }
  }

  if (hasPrivateSentinel(draft)) {
    failures.push("private sentinel leaked into persistence draft");
  }

  return failures;
}

function allSummaryCitations(summary: MeetingSummary): MeetingCitation[] {
  const byKey = new Map<string, MeetingCitation>();
  const items: Array<MeetingSummaryItem | MeetingActionItem> = [
    ...summary.decisions,
    ...summary.actionItems,
    ...summary.openQuestions,
  ];

  for (const item of items) {
    for (const citation of item.citations) {
      const key = `${citation.turnId}:${citation.occurredAt}:${citation.snippet}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          ...citation,
          memoryIds: uniqueStrings(citation.memoryIds),
        });
      }
    }
  }

  return [...byKey.values()];
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function uniqueStrings(values: Iterable<string | null | undefined>): string[] {
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    seen.add(normalized);
  }

  return [...seen];
}

function hasPrivateSentinel(value: MeetingSummaryPersistenceDraft): boolean {
  const serialized = JSON.stringify(value);
  return ["sk-", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "policyNumber", "cookie", "otp"].some((sentinel) =>
    serialized.includes(sentinel),
  );
}
