import { z } from "zod";
import { selectLatestMeetingSessionCandidate } from "@/domains/interview/meeting-session-lookup";
import type {
  AppendInterviewTurnInput,
  InterviewMemoryDto,
  InterviewSessionSnapshotDto,
  InterviewTurnDto,
} from "@/lib/interview/interview-persistence-repository";
import {
  appendInterviewTurnInputSchema,
  appendPersistentInterviewTurn,
  createPersistentInterviewSession,
  getPersistentInterviewSessionSnapshot,
} from "@/lib/interview/interview-persistence-repository";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const createMeetingSessionInputSchema = z
  .object({
    clientId: z.string().trim().min(1).max(120).optional(),
    visitPlanId: z.string().trim().min(1).max(120).optional(),
    currentSegmentId: z.string().trim().max(120).default("capture"),
    title: z.string().trim().max(160).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.clientId && value.visitPlanId && value.clientId.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clientId"],
        message: "clientId cannot be blank when visitPlanId is present.",
      });
    }
  });

export const appendMeetingTurnInputSchema = appendInterviewTurnInputSchema.extend({
  source: z.enum(["MANUAL_NOTE", "TEXT_INPUT", "VOICE_FINAL_TRANSCRIPT"]).default("TEXT_INPUT"),
});

export const appendVisitMeetingQuickNoteInputSchema = z
  .object({
    content: z.string().trim().min(1).max(12000),
    occurredAt: z.string().datetime().optional(),
  })
  .strict();

export type CreateMeetingSessionInput = z.infer<typeof createMeetingSessionInputSchema>;
export type AppendMeetingTurnInput = z.infer<typeof appendMeetingTurnInputSchema>;
export type AppendVisitMeetingQuickNoteInput = z.infer<typeof appendVisitMeetingQuickNoteInputSchema>;

export interface MeetingCaptureSafety {
  scopeSource: "server_session";
  visibilityScope: "member-private";
  providerCallAttempted: false;
  aiUsageLogRequired: false;
  rawAudioStored: false;
  rawProviderPayloadStored: false;
  rawPrivateTranscriptSidecarStored: false;
  writesConfirmedCrmFact: false;
}

export interface MeetingSessionSnapshotDto extends InterviewSessionSnapshotDto {
  memoryRail: MeetingMemoryRailDto;
  safety: MeetingCaptureSafety;
}

export interface MeetingTurnAppendDto {
  turn: InterviewTurnDto;
  memories: InterviewMemoryDto[];
  memoryRail: MeetingMemoryRailDto;
  safety: MeetingCaptureSafety;
}

export interface VisitMeetingQuickNoteAppendDto {
  status: "READY";
  appended: {
    sessionId: string;
    turnId: string;
    sourceLabel: "visit_meeting_quick_note";
    reusedExistingSession: boolean;
  };
  snapshot: MeetingSessionSnapshotDto;
  safety: MeetingCaptureSafety & {
    routeOwnedVisitPlanScope: true;
    browserSuppliedSessionId: false;
    rawPrivateTranscriptStored: false;
    storesRawProviderPayload: false;
  };
  writebackBridge: VisitMeetingQuickNoteWritebackBridgeDto;
}

export interface VisitMeetingQuickNoteWritebackBridgeDto {
  sourceActionId: "visit-meeting-quick-note-writeback-bridge";
  status: "summary_required";
  acceptedWorkspaceHref: string;
  targetSurface: "/pre-visit/[planId]/meeting";
  summaryEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/summary";
  writebackEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/writebacks";
  requirements: {
    persistedSummaryRequired: true;
    advisorConfirmationRequired: true;
    reasonRiskAcceptedForSensitive: true;
  };
  safety: {
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    browserSuppliedSessionId: false;
    rawPrivateTranscriptStored: false;
    storesRawProviderPayload: false;
    writesConfirmedCrmFact: false;
    directCrmWriteDisabled: true;
  };
}

export interface MeetingMemoryRailDto {
  total: number;
  confirmed: number;
  inferences: number;
  unknowns: number;
  memberPrivate: number;
  clientLinked: number;
}

export function findMeetingPayloadViolations(value: unknown): string[] {
  const violations = new Set<string>();

  scanMeetingPayload(value, "$", violations);

  return [...violations].sort();
}

export async function createMeetingSessionForMember(
  session: AppSession,
  input: CreateMeetingSessionInput,
): Promise<MeetingSessionSnapshotDto | null> {
  const scope = await resolveMeetingCaptureScope(session, input);

  if (!scope) {
    return null;
  }

  const meetingSession = await createPersistentInterviewSession(session, {
    clientId: scope.clientId ?? undefined,
    interviewKind: "CLIENT_MEETING",
    outlineId: "client-meeting",
    currentSegmentId: input.currentSegmentId,
    title: input.title ?? "客戶會議",
  });

  if (!meetingSession) {
    return null;
  }

  await prisma.interviewSession.update({
    where: { id: meetingSession.id },
    data: {
      metadata: {
        source: "meeting_capture_bff",
        visitPlanId: scope.visitPlanId,
        captureVersion: "AMM-002a",
        providerCallAttempted: false,
        aiUsageLogRequired: false,
        rawAudioStored: false,
        rawProviderPayloadStored: false,
        rawPrivateTranscriptSidecarStored: false,
        writesConfirmedCrmFact: false,
      },
    },
  });

  return getMeetingSessionSnapshotForMember(session, meetingSession.id);
}

export async function findLatestMeetingSessionForMember(
  session: AppSession,
  input: CreateMeetingSessionInput,
): Promise<MeetingSessionSnapshotDto | null> {
  const scope = await resolveMeetingCaptureScope(session, input);

  if (!scope) {
    return null;
  }

  const recentSessions = await prisma.interviewSession.findMany({
    where: {
      organizationId: session.organization.id,
      ownerId: session.user.id,
      interviewKind: "CLIENT_MEETING",
      status: "ACTIVE",
      ...(scope.clientId ? { clientId: scope.clientId } : { clientId: null }),
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      metadata: true,
    },
  });

  const matchingSession = selectLatestMeetingSessionCandidate(recentSessions, {
    visitPlanId: scope.visitPlanId,
  });

  if (!matchingSession) {
    return null;
  }

  return getMeetingSessionSnapshotForMember(session, matchingSession.id);
}

export async function getMeetingSessionSnapshotForMember(
  session: AppSession,
  sessionId: string,
): Promise<MeetingSessionSnapshotDto | null> {
  const snapshot = await getPersistentInterviewSessionSnapshot(session, sessionId);

  if (!snapshot || snapshot.session.interviewKind !== "CLIENT_MEETING") {
    return null;
  }

  return {
    ...snapshot,
    memoryRail: buildMeetingMemoryRail(snapshot.memories),
    safety: meetingCaptureSafety(),
  };
}

export async function appendMeetingTurnForMember(
  session: AppSession,
  sessionId: string,
  input: AppendMeetingTurnInput,
): Promise<MeetingTurnAppendDto | null> {
  const snapshot = await getMeetingSessionSnapshotForMember(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const result = await appendPersistentInterviewTurn(session, sessionId, toInterviewTurnInput(input));

  if (!result) {
    return null;
  }

  return {
    ...result,
    memoryRail: buildMeetingMemoryRail(result.memories),
    safety: meetingCaptureSafety(),
  };
}

export async function appendVisitMeetingQuickNoteForMember(
  session: AppSession,
  visitPlanId: string,
  input: AppendVisitMeetingQuickNoteInput,
): Promise<VisitMeetingQuickNoteAppendDto | null> {
  const latestSnapshot = await findLatestMeetingSessionForMember(session, {
    visitPlanId,
    currentSegmentId: "capture",
  });
  const baseSnapshot =
    latestSnapshot ??
    (await createMeetingSessionForMember(session, {
      visitPlanId,
      currentSegmentId: "capture",
      title: "AI 拜訪會議",
    }));

  if (!baseSnapshot) {
    return null;
  }

  const appendResult = await appendMeetingTurnForMember(session, baseSnapshot.session.id, {
    role: "USER",
    modality: "TEXT",
    source: "MANUAL_NOTE",
    content: input.content,
    transcriptFinal: true,
    outlineSegmentId: "capture",
    occurredAt: input.occurredAt,
    issueTags: ["visit-meeting-quick-note", "post-visit-note"],
    pqQuestionIds: [],
  });

  if (!appendResult) {
    return null;
  }

  const snapshot = await getMeetingSessionSnapshotForMember(session, baseSnapshot.session.id);

  if (!snapshot) {
    return null;
  }

  return {
    status: "READY",
    appended: {
      sessionId: snapshot.session.id,
      turnId: appendResult.turn.id,
      sourceLabel: "visit_meeting_quick_note",
      reusedExistingSession: Boolean(latestSnapshot),
    },
    snapshot,
    safety: {
      ...meetingCaptureSafety(),
      routeOwnedVisitPlanScope: true,
      browserSuppliedSessionId: false,
      rawPrivateTranscriptStored: false,
      storesRawProviderPayload: false,
    },
    writebackBridge: buildVisitMeetingQuickNoteWritebackBridge(visitPlanId),
  };
}

export function buildVisitMeetingQuickNoteWritebackBridge(
  visitPlanId: string,
): VisitMeetingQuickNoteWritebackBridgeDto {
  return {
    sourceActionId: "visit-meeting-quick-note-writeback-bridge",
    status: "summary_required",
    acceptedWorkspaceHref: `/pre-visit/${encodeURIComponent(visitPlanId)}/meeting`,
    targetSurface: "/pre-visit/[planId]/meeting",
    summaryEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/summary",
    writebackEndpointPattern: "/api/ai/meeting/sessions/[sessionId]/writebacks",
    requirements: {
      persistedSummaryRequired: true,
      advisorConfirmationRequired: true,
      reasonRiskAcceptedForSensitive: true,
    },
    safety: {
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      browserSuppliedSessionId: false,
      rawPrivateTranscriptStored: false,
      storesRawProviderPayload: false,
      writesConfirmedCrmFact: false,
      directCrmWriteDisabled: true,
    },
  };
}

function toInterviewTurnInput(input: AppendMeetingTurnInput): AppendInterviewTurnInput {
  return {
    role: input.role,
    modality: input.source === "VOICE_FINAL_TRANSCRIPT" ? "VOICE_TRANSCRIPT_FALLBACK" : input.modality,
    content: input.content,
    transcriptFinal: input.transcriptFinal,
    providerEventId: input.providerEventId,
    outlineSegmentId: input.outlineSegmentId ?? "capture",
    occurredAt: input.occurredAt,
    issueTags: input.issueTags,
    pqQuestionIds: input.pqQuestionIds,
  };
}

async function resolveMeetingCaptureScope(session: AppSession, input: CreateMeetingSessionInput) {
  if (input.visitPlanId) {
    const visitPlan = await prisma.visitPlan.findFirst({
      where: {
        id: input.visitPlanId,
        organizationId: session.organization.id,
        ownerId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        clientId: true,
      },
    });

    if (!visitPlan || (input.clientId && input.clientId !== visitPlan.clientId)) {
      return null;
    }

    return {
      clientId: visitPlan.clientId,
      visitPlanId: visitPlan.id,
    };
  }

  return {
    clientId: input.clientId ?? null,
    visitPlanId: null,
  };
}

function meetingCaptureSafety(): MeetingCaptureSafety {
  return {
    scopeSource: "server_session",
    visibilityScope: "member-private",
    providerCallAttempted: false,
    aiUsageLogRequired: false,
    rawAudioStored: false,
    rawProviderPayloadStored: false,
    rawPrivateTranscriptSidecarStored: false,
    writesConfirmedCrmFact: false,
  };
}

function buildMeetingMemoryRail(memories: InterviewMemoryDto[]): MeetingMemoryRailDto {
  return {
    total: memories.length,
    confirmed: memories.filter((memory) => memory.dataClass === "FACT" || memory.dataClass === "CONFIRMED").length,
    inferences: memories.filter((memory) => memory.dataClass === "INFERENCE").length,
    unknowns: memories.filter((memory) => memory.dataClass === "UNKNOWN").length,
    memberPrivate: memories.filter((memory) => memory.visibilityScope === "MEMBER_PRIVATE").length,
    clientLinked: memories.filter((memory) => Boolean(memory.clientId)).length,
  };
}

function scanMeetingPayload(value: unknown, path: string, violations: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanMeetingPayload(item, `${path}[${index}]`, violations));
    return;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (
      /sk-[a-z0-9_-]{12,}/i.test(value) ||
      /authorization\s*[:=]?\s*bearer/i.test(value) ||
      normalized.includes("raw provider payload") ||
      normalized.includes("provider payload") ||
      normalized.includes("raw audio") ||
      normalized.includes("payment data") ||
      /\botp\b/i.test(value)
    ) {
      violations.add(path);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.includes("audiobase64") ||
      normalizedKey.includes("rawaudio") ||
      normalizedKey.includes("audiobinary") ||
      normalizedKey.includes("providereventpayload") ||
      normalizedKey.includes("providerpayload") ||
      normalizedKey.includes("rawpayload") ||
      normalizedKey.includes("rawprivatetranscript") ||
      normalizedKey.includes("privatetranscripttext") ||
      normalizedKey.includes("cookie") ||
      normalizedKey.includes("authorization") ||
      normalizedKey.includes("secret") ||
      normalizedKey.includes("token") ||
      normalizedKey.includes("otp") ||
      normalizedKey.includes("payment")
    ) {
      violations.add(`${path}.${key}`);
      continue;
    }

    scanMeetingPayload(child, `${path}.${key}`, violations);
  }
}
