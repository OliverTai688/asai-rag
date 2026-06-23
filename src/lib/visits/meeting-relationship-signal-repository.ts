import type { MeetingDataClass } from "@/domains/interview/meeting";
import {
  meetingWritebackCandidateToRelationshipSignal,
  buildVisitMeetingRelationshipSignalDeck,
  type VisitMeetingRelationshipSignalDeck,
  type VisitMeetingRelationshipSignalInput,
} from "@/domains/visit/meeting-relationship-signal";
import type { AppSession } from "@/lib/auth/session";
import { findLatestMeetingSessionForMember } from "@/lib/interview/meeting-session-repository";
import { readMeetingSummaryForMember } from "@/lib/interview/meeting-summary-repository";
import { getMeetingWritebackPreviewForMember } from "@/lib/interview/meeting-writeback-repository";
import { getVisitPlanForMember } from "@/lib/visits/visit-plan-repository";

export type VisitMeetingRelationshipSignalStatus =
  | "READY"
  | "NO_MEETING_SESSION"
  | "SUMMARY_REQUIRED"
  | "NO_SIGNAL_CARDS";

export interface VisitMeetingRelationshipSignalBffDto {
  status: VisitMeetingRelationshipSignalStatus;
  visitPlanId: string;
  clientId: string;
  deck: VisitMeetingRelationshipSignalDeck;
  source: {
    matchedBy: "visitPlanId";
    sourceActionId: "meeting-notes-relationship-confirmation-signal";
    sourceMeetingUpdatedAt?: string;
    sourceSummaryUpdatedAt?: string;
    acceptedWorkspaceHref: string;
    summaryEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/summary";
    writebackEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/writebacks";
  };
  summary: {
    quickNoteSignalCount: number;
    summarySignalCount: number;
    writebackCandidateSignalCount: number;
    cardCount: number;
    highPriorityCount: number;
    unknownCount: number;
    inferenceCount: number;
  };
  proof: {
    ownerScopedVisitPlan: true;
    ownerScopedMeetingSessionLookup: true;
    browserSuppliedSessionId: false;
    browserSuppliedPersonId: false;
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    aiUsageLogWritten: false;
    persistedToDatabase: false;
    writesRelationshipGraph: false;
    writesVisitPlan: false;
    writesConfirmedCrmFact: false;
    storesRawPrivateTranscript: false;
    storesRawProviderPayload: false;
  };
}

export type GetVisitMeetingRelationshipSignalResult =
  | { status: "OK"; data: VisitMeetingRelationshipSignalBffDto }
  | { status: "VISIT_PLAN_NOT_FOUND" };

export async function getVisitMeetingRelationshipSignalDeckForMember(
  session: AppSession,
  visitPlanId: string,
): Promise<GetVisitMeetingRelationshipSignalResult> {
  const source = await getVisitPlanForMember(session, visitPlanId);

  if (!source) {
    return { status: "VISIT_PLAN_NOT_FOUND" };
  }

  const latestMeeting = await findLatestMeetingSessionForMember(session, {
    visitPlanId: source.visitPlan.id,
    currentSegmentId: "capture",
  });

  if (!latestMeeting) {
    return {
      status: "OK",
      data: buildDto({
        status: "NO_MEETING_SESSION",
        visitPlanId: source.visitPlan.id,
        clientId: source.client.id,
        signals: [],
        quickNoteSignalCount: 0,
        summarySignalCount: 0,
        writebackCandidateSignalCount: 0,
      }),
    };
  }

  const quickNoteSignals = latestMeeting.memories
    .filter((memory) => memory.issueTags.includes("visit-meeting-quick-note"))
    .slice(-8)
    .map((memory): VisitMeetingRelationshipSignalInput => ({
      id: `quick-note-${memory.id}`,
      sourceType: "MEETING_QUICK_NOTE",
      dataClass: toMeetingDataClass(memory.dataClass),
      text: memory.text,
      sourceReferenceIds: [memory.id, memory.turnId ?? latestMeeting.session.id],
    }));

  const summaryResult = await readMeetingSummaryForMember(session, latestMeeting.session.id);
  const summarySignals: VisitMeetingRelationshipSignalInput[] =
    summaryResult?.status === "found"
      ? [
          {
            id: `summary-${summaryResult.summary.id}`,
            sourceType: "MEETING_SUMMARY_DECISION",
            dataClass: "INFERENCE",
            text: `${summaryResult.summary.headline}。${summaryResult.summary.summary}`,
            sourceReferenceIds: [summaryResult.summary.id, ...summaryResult.summary.sourceTurnIds.slice(0, 4)],
          },
        ]
      : [];

  const writebackPreview = await getMeetingWritebackPreviewForMember(session, latestMeeting.session.id);
  const writebackSignals =
    writebackPreview?.status === "ready"
      ? writebackPreview.candidates
          .filter((candidate) => candidate.target !== "BLOCKED")
          .slice(0, 12)
          .map(meetingWritebackCandidateToRelationshipSignal)
      : [];
  const signals = uniqueSignals([...quickNoteSignals, ...summarySignals, ...writebackSignals]);
  const status = resolveStatus({
    hasMeeting: true,
    hasSummary: summaryResult?.status === "found",
    cardCount: buildVisitMeetingRelationshipSignalDeck({
      visitPlanId: source.visitPlan.id,
      clientId: source.client.id,
      signals,
    }).summary.cardCount,
  });

  return {
    status: "OK",
    data: buildDto({
      status,
      visitPlanId: source.visitPlan.id,
      clientId: source.client.id,
      sourceMeetingUpdatedAt: latestMeeting.session.updatedAt,
      sourceSummaryUpdatedAt: summaryResult?.status === "found" ? summaryResult.summary.updatedAt : undefined,
      signals,
      quickNoteSignalCount: quickNoteSignals.length,
      summarySignalCount: summarySignals.length,
      writebackCandidateSignalCount: writebackSignals.length,
    }),
  };
}

function buildDto(input: {
  status: VisitMeetingRelationshipSignalStatus;
  visitPlanId: string;
  clientId: string;
  sourceMeetingUpdatedAt?: string;
  sourceSummaryUpdatedAt?: string;
  signals: VisitMeetingRelationshipSignalInput[];
  quickNoteSignalCount: number;
  summarySignalCount: number;
  writebackCandidateSignalCount: number;
}): VisitMeetingRelationshipSignalBffDto {
  const deck = buildVisitMeetingRelationshipSignalDeck({
    visitPlanId: input.visitPlanId,
    clientId: input.clientId,
    signals: input.signals,
  });

  return {
    status: input.status,
    visitPlanId: input.visitPlanId,
    clientId: input.clientId,
    deck,
    source: {
      matchedBy: "visitPlanId",
      sourceActionId: "meeting-notes-relationship-confirmation-signal",
      sourceMeetingUpdatedAt: input.sourceMeetingUpdatedAt,
      sourceSummaryUpdatedAt: input.sourceSummaryUpdatedAt,
      acceptedWorkspaceHref: `/pre-visit/${encodeURIComponent(input.visitPlanId)}/meeting`,
      summaryEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/summary",
      writebackEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/writebacks",
    },
    summary: {
      quickNoteSignalCount: input.quickNoteSignalCount,
      summarySignalCount: input.summarySignalCount,
      writebackCandidateSignalCount: input.writebackCandidateSignalCount,
      cardCount: deck.summary.cardCount,
      highPriorityCount: deck.summary.highPriorityCount,
      unknownCount: deck.summary.unknownCount,
      inferenceCount: deck.summary.inferenceCount,
    },
    proof: {
      ownerScopedVisitPlan: true,
      ownerScopedMeetingSessionLookup: true,
      browserSuppliedSessionId: false,
      browserSuppliedPersonId: false,
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      aiUsageLogWritten: false,
      persistedToDatabase: false,
      writesRelationshipGraph: false,
      writesVisitPlan: false,
      writesConfirmedCrmFact: false,
      storesRawPrivateTranscript: false,
      storesRawProviderPayload: false,
    },
  };
}

function resolveStatus(input: { hasMeeting: boolean; hasSummary: boolean; cardCount: number }) {
  if (!input.hasMeeting) return "NO_MEETING_SESSION";
  if (input.cardCount > 0) return "READY";
  if (!input.hasSummary) return "SUMMARY_REQUIRED";
  return "NO_SIGNAL_CARDS";
}

function toMeetingDataClass(value: string): MeetingDataClass {
  if (value === "FACT" || value === "CONFIRMED") return "CONFIRMED";
  if (value === "INFERENCE") return "INFERENCE";
  if (value === "UNKNOWN") return "UNKNOWN";
  return "UNKNOWN";
}

function uniqueSignals(signals: VisitMeetingRelationshipSignalInput[]): VisitMeetingRelationshipSignalInput[] {
  const seen = new Set<string>();
  const result: VisitMeetingRelationshipSignalInput[] = [];

  for (const signal of signals) {
    const key = `${signal.sourceType}:${signal.id}:${signal.text.slice(0, 120)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(signal);
  }

  return result;
}
