import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { InterviewMeetingSummaryModel } from "@/generated/prisma/models";
import { InteractionEventType } from "@/generated/prisma/enums";
import type { MeetingActionItem, MeetingSummaryItem } from "@/domains/interview/meeting";
import {
  buildMeetingWritebackCandidates,
  evaluateMeetingWriteback,
  type MeetingClientSensitivity,
  type MeetingWritebackCandidate,
  type MeetingWritebackDecision,
} from "@/domains/interview/meeting-writeback-boundary";
import { canWriteClient } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getMeetingSessionSnapshotForMember } from "./meeting-session-repository";

export const meetingWritebackInputSchema = z
  .object({
    candidateIds: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
    approvals: z
      .array(
        z.object({
          candidateId: z.string().trim().min(1).max(120),
          reason: z.string().trim().max(600).optional(),
          riskAccepted: z.boolean().default(false),
        }),
      )
      .max(50)
      .default([]),
  })
  .strict();

export type MeetingWritebackInput = z.infer<typeof meetingWritebackInputSchema>;

export interface MeetingWritebackSafety {
  scopeSource: "server_session";
  visibilityScope: "member-private";
  providerCallAttempted: false;
  aiUsageLogRequired: false;
  aiUsageLogWritten: false;
  storesAudioBinary: false;
  storesRawProviderPayload: false;
  storesRawPrivateTranscriptSidecar: false;
  writesConfirmedCrmFact: false;
  crmFactRequiresHumanConfirmation: true;
  inferenceNeverCrmFact: true;
  actionItemsCreateTasksOnly: true;
}

export interface MeetingWritebackPreview {
  status: "ready";
  sessionId: string;
  clientId: string | null;
  clientSensitivity: MeetingClientSensitivity;
  summary: {
    id: string;
    headline: string;
    schemaVersion: string;
    sourceTurnIds: string[];
    sourceMemoryIds: string[];
  };
  sourceCounts: {
    decisions: number;
    actionItems: number;
    openQuestions: number;
  };
  candidates: MeetingWritebackCandidate[];
  safety: MeetingWritebackSafety;
}

export interface MeetingWritebackSummaryRequired {
  status: "summary_required";
  sessionId: string;
  clientId: string | null;
  candidates: [];
  safety: MeetingWritebackSafety;
}

export type MeetingWritebackPreviewResult = MeetingWritebackPreview | MeetingWritebackSummaryRequired;

export interface MeetingWritebackResult extends Omit<MeetingWritebackPreview, "status"> {
  status: "saved";
  createdEvents: {
    id: string;
    candidateId: string;
    target: MeetingWritebackCandidate["target"];
    title: string;
    occurredAt: string;
  }[];
  blocked: {
    candidateId: string;
    reason: string;
  }[];
  skipped: string[];
}

export async function getMeetingWritebackPreviewForMember(
  session: AppSession,
  sessionId: string,
): Promise<MeetingWritebackPreviewResult | null> {
  const snapshot = await getMeetingSessionSnapshotForMember(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const summary = await prisma.interviewMeetingSummary.findFirst({
    where: {
      sessionId: snapshot.session.id,
      organizationId: session.organization.id,
      ownerId: session.user.id,
    },
  });

  if (!summary) {
    return {
      status: "summary_required",
      sessionId: snapshot.session.id,
      clientId: snapshot.session.clientId,
      candidates: [],
      safety: meetingWritebackSafety(),
    };
  }

  const clientScope = summary.clientId
    ? await prisma.client.findFirst({
        where: {
          id: summary.clientId,
          organizationId: session.organization.id,
          status: { not: "ARCHIVED" },
        },
        select: {
          id: true,
          organizationId: true,
          unitId: true,
          ownerId: true,
          sensitivity: true,
        },
      })
    : null;
  const clientWritable = Boolean(clientScope && canWriteClient(session, clientScope));
  const decisions = summary.decisions as unknown as MeetingSummaryItem[];
  const actionItems = summary.actionItems as unknown as MeetingActionItem[];
  const openQuestions = summary.openQuestions as unknown as MeetingSummaryItem[];
  const candidates = buildMeetingWritebackCandidates({
    clientId: clientScope?.id ?? summary.clientId,
    clientWritable,
    clientSensitivity: clientScope?.sensitivity ?? null,
    decisions,
    actionItems,
    openQuestions,
  });

  return {
    status: "ready",
    sessionId: snapshot.session.id,
    clientId: clientScope?.id ?? null,
    clientSensitivity: clientScope?.sensitivity ?? null,
    summary: {
      id: summary.id,
      headline: summary.headline,
      schemaVersion: summary.schemaVersion,
      sourceTurnIds: summary.sourceTurnIds,
      sourceMemoryIds: summary.sourceMemoryIds,
    },
    sourceCounts: {
      decisions: decisions.length,
      actionItems: actionItems.length,
      openQuestions: openQuestions.length,
    },
    candidates,
    safety: meetingWritebackSafety(),
  };
}

export async function saveMeetingWritebackConfirmation(
  session: AppSession,
  sessionId: string,
  input: MeetingWritebackInput,
): Promise<MeetingWritebackResult | MeetingWritebackSummaryRequired | null> {
  const preview = await getMeetingWritebackPreviewForMember(session, sessionId);

  if (!preview) {
    return null;
  }

  if (preview.status === "summary_required") {
    return preview;
  }

  const summary = await prisma.interviewMeetingSummary.findUnique({
    where: { id: preview.summary.id },
  });

  if (!summary) {
    return {
      status: "summary_required",
      sessionId: preview.sessionId,
      clientId: preview.clientId,
      candidates: [],
      safety: meetingWritebackSafety(),
    };
  }

  const decisions = evaluateMeetingWriteback({
    clientId: preview.clientId,
    clientWritable: preview.clientId !== null,
    clientSensitivity: preview.clientSensitivity,
    decisions: summary.decisions as unknown as MeetingSummaryItem[],
    actionItems: summary.actionItems as unknown as MeetingActionItem[],
    openQuestions: summary.openQuestions as unknown as MeetingSummaryItem[],
    selectedCandidateIds: input.candidateIds,
    approvals: input.approvals,
  });
  const createdEvents = await createMeetingWritebackEvents(session, preview, summary, decisions);

  return {
    ...preview,
    status: "saved",
    createdEvents,
    blocked: decisions
      .filter((decision) => decision.status === "BLOCKED")
      .map((decision) => ({
        candidateId: decision.candidate.id,
        reason: decision.blockedReason ?? "此會議寫回候選被邊界阻擋。",
      })),
    skipped: decisions
      .filter((decision) => decision.status === "SKIPPED")
      .map((decision) => decision.candidate.id),
  };
}

async function createMeetingWritebackEvents(
  session: AppSession,
  preview: MeetingWritebackPreview,
  summary: InterviewMeetingSummaryModel,
  decisions: MeetingWritebackDecision[],
): Promise<MeetingWritebackResult["createdEvents"]> {
  return prisma.$transaction(async (tx) => {
    const clientScope = preview.clientId
      ? await tx.client.findFirst({
          where: {
            id: preview.clientId,
            organizationId: session.organization.id,
            status: { not: "ARCHIVED" },
          },
          select: {
            id: true,
            organizationId: true,
            unitId: true,
            ownerId: true,
          },
        })
      : null;
    const result: MeetingWritebackResult["createdEvents"] = [];

    for (const decision of decisions) {
      if (decision.status !== "CREATABLE") continue;

      const candidate = decision.candidate;
      if (candidate.target === "CRM_CANDIDATE" && (!clientScope || !canWriteClient(session, clientScope))) {
        continue;
      }

      const event = await tx.interactionEvent.create({
        data: {
          organizationId: session.organization.id,
          unitId: clientScope?.unitId ?? summary.unitId ?? session.membership.primaryUnitId,
          clientId: clientScope?.id ?? preview.clientId,
          actorId: session.user.id,
          type: toInteractionEventType(candidate.target),
          title: toInteractionEventTitle(candidate.target),
          description: candidate.text,
          metadata: toMeetingWritebackMetadata(preview, decision),
        },
        select: {
          id: true,
          title: true,
          occurredAt: true,
        },
      });

      if (clientScope) {
        await tx.client.update({
          where: { id: clientScope.id },
          data: { lastInteractionAt: new Date() },
        });
      }

      result.push({
        id: event.id,
        candidateId: candidate.id,
        target: candidate.target,
        title: event.title,
        occurredAt: event.occurredAt.toISOString(),
      });
    }

    return result;
  });
}

function meetingWritebackSafety(): MeetingWritebackSafety {
  return {
    scopeSource: "server_session",
    visibilityScope: "member-private",
    providerCallAttempted: false,
    aiUsageLogRequired: false,
    aiUsageLogWritten: false,
    storesAudioBinary: false,
    storesRawProviderPayload: false,
    storesRawPrivateTranscriptSidecar: false,
    writesConfirmedCrmFact: false,
    crmFactRequiresHumanConfirmation: true,
    inferenceNeverCrmFact: true,
    actionItemsCreateTasksOnly: true,
  };
}

function toInteractionEventType(target: MeetingWritebackCandidate["target"]): InteractionEventType {
  if (target === "FOLLOW_UP_TASK" || target === "THEATER_NARRATOR_QUESTION") {
    return InteractionEventType.TASK;
  }

  if (target === "CRM_CANDIDATE") {
    return InteractionEventType.VISIT;
  }

  return InteractionEventType.COMPLIANCE;
}

function toInteractionEventTitle(target: MeetingWritebackCandidate["target"]): string {
  const titles: Record<MeetingWritebackCandidate["target"], string> = {
    CRM_CANDIDATE: "會議確認寫回候選",
    INTERVIEW_INSIGHT: "會議推論洞察",
    FOLLOW_UP_TASK: "會議行動追蹤",
    THEATER_NARRATOR_QUESTION: "會議劇場旁白補問",
    BLOCKED: "會議寫回被阻擋",
  };

  return titles[target];
}

function toMeetingWritebackMetadata(
  preview: MeetingWritebackPreview,
  decision: MeetingWritebackDecision,
): Prisma.InputJsonValue {
  return {
    source: "meeting_writeback_confirmation_card",
    sessionId: preview.sessionId,
    summaryId: preview.summary.id,
    candidateId: decision.candidate.id,
    candidateKind: decision.candidate.kind,
    sourceType: decision.candidate.sourceType,
    sourceItemId: decision.candidate.sourceItemId,
    dataClass: decision.candidate.dataClass,
    target: decision.candidate.target,
    sensitivity: decision.candidate.sensitivity,
    citationTurnIds: decision.candidate.citationTurnIds,
    supportingMemoryIds: decision.candidate.supportingMemoryIds,
    reason: decision.reason ?? null,
    riskAccepted: decision.riskAccepted,
    crmWritebackCandidate: decision.candidate.target === "CRM_CANDIDATE",
    confirmedFactOnly: decision.candidate.kind === "CONFIRMED_FACT",
    inferenceNeverCrmFact: decision.candidate.kind === "INFERENCE",
    actionItemsCreateTasksOnly: decision.candidate.kind === "ACTION_ITEM",
    writesConfirmedCrmFact: false,
  };
}
