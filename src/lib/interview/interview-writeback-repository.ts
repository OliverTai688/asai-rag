import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { InteractionEventType } from "@/generated/prisma/enums";
import {
  buildInterviewConfirmationCandidates,
  evaluateInterviewWriteback,
  type InterviewConfirmationCandidate,
  type InterviewWritebackDecision,
} from "@/domains/interview/writeback-boundary";
import { buildInterviewReflection } from "@/domains/interview/reflection-planning";
import type { InterviewMemory, InterviewMemoryImportance, InterviewReflection } from "@/domains/interview/types";
import { canWriteClient } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getPersistentInterviewSessionSnapshot,
  type InterviewMemoryDto,
  type InterviewReflectionDto,
} from "./interview-persistence-repository";

export const interviewWritebackInputSchema = z.object({
  candidateIds: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  approvals: z
    .array(
      z.object({
        candidateId: z.string().trim().min(1).max(80),
        reason: z.string().trim().max(600).optional(),
        riskAccepted: z.boolean().default(false),
      }),
    )
    .max(40)
    .default([]),
});

export type InterviewWritebackInput = z.infer<typeof interviewWritebackInputSchema>;

export interface InterviewWritebackPreview {
  sessionId: string;
  clientId: string | null;
  reflection: InterviewReflection;
  candidates: InterviewConfirmationCandidate[];
}

export interface InterviewWritebackResult extends InterviewWritebackPreview {
  createdEvents: {
    id: string;
    candidateId: string;
    target: InterviewConfirmationCandidate["target"];
    title: string;
    occurredAt: string;
  }[];
  blocked: {
    candidateId: string;
    reason: string;
  }[];
  skipped: string[];
}

export async function getInterviewWritebackPreview(
  session: AppSession,
  sessionId: string,
): Promise<InterviewWritebackPreview | null> {
  const snapshot = await getPersistentInterviewSessionSnapshot(session, sessionId);

  if (!snapshot) {
    return null;
  }

  const reflection = snapshot.reflections.at(-1)
    ? toDomainReflection(snapshot.reflections.at(-1) as InterviewReflectionDto)
    : buildInterviewReflection({
        organizationId: snapshot.session.organizationId,
        interviewSessionId: snapshot.session.id,
        interviewKind: snapshot.session.interviewKind,
        currentSegmentId: snapshot.session.currentSegmentId,
        memories: snapshot.memories.map(toDomainMemory),
      });
  const candidates = buildInterviewConfirmationCandidates({
    sessionId: snapshot.session.id,
    interviewKind: snapshot.session.interviewKind,
    clientId: snapshot.session.clientId,
    reflection,
  });

  return {
    sessionId: snapshot.session.id,
    clientId: snapshot.session.clientId,
    reflection,
    candidates,
  };
}

export async function saveInterviewWritebackConfirmation(
  session: AppSession,
  sessionId: string,
  input: InterviewWritebackInput,
): Promise<InterviewWritebackResult | null> {
  const preview = await getInterviewWritebackPreview(session, sessionId);

  if (!preview) {
    return null;
  }

  const decisions = evaluateInterviewWriteback({
    sessionId,
    interviewKind: preview.reflection.interviewKind,
    reflection: preview.reflection,
    clientId: preview.clientId,
    selectedCandidateIds: input.candidateIds,
    approvals: input.approvals,
  });

  const createdEvents = await prisma.$transaction(async (tx) => {
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

    const result: InterviewWritebackResult["createdEvents"] = [];

    for (const decision of decisions) {
      if (decision.status !== "CREATABLE") continue;
      const candidate = decision.candidate;
      const requiresClient = candidate.target === "CRM_CANDIDATE";

      if (requiresClient && (!clientScope || !canWriteClient(session, clientScope))) {
        continue;
      }

      const event = await tx.interactionEvent.create({
        data: {
          organizationId: session.organization.id,
          unitId: clientScope?.unitId ?? session.membership.primaryUnitId,
          clientId: clientScope?.id ?? preview.clientId,
          actorId: session.user.id,
          type: toInteractionEventType(candidate.target),
          title: toInteractionEventTitle(candidate.target),
          description: candidate.text,
          metadata: toWritebackMetadata(sessionId, preview.reflection, decision),
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

  return {
    ...preview,
    createdEvents,
    blocked: decisions
      .filter((decision) => decision.status === "BLOCKED")
      .map((decision) => ({
        candidateId: decision.candidate.id,
        reason: decision.blockedReason ?? "此候選被寫回邊界阻擋。",
      })),
    skipped: decisions
      .filter((decision) => decision.status === "SKIPPED")
      .map((decision) => decision.candidate.id),
  };
}

function toInteractionEventType(target: InterviewConfirmationCandidate["target"]): InteractionEventType {
  if (target === "FOLLOW_UP_TASK" || target === "THEATER_NARRATOR_QUESTION") {
    return InteractionEventType.TASK;
  }

  if (target === "CRM_CANDIDATE") {
    return InteractionEventType.VISIT;
  }

  return InteractionEventType.COMPLIANCE;
}

function toInteractionEventTitle(target: InterviewConfirmationCandidate["target"]): string {
  const titles: Record<InterviewConfirmationCandidate["target"], string> = {
    CRM_CANDIDATE: "訪談確認寫回候選",
    INTERVIEW_INSIGHT: "訪談推論洞察",
    FOLLOW_UP_TASK: "訪談待追問事項",
    THEATER_NARRATOR_QUESTION: "劇場旁白補問",
    BLOCKED: "訪談寫回被阻擋",
  };

  return titles[target];
}

function toWritebackMetadata(
  sessionId: string,
  reflection: InterviewReflection,
  decision: InterviewWritebackDecision,
): Prisma.InputJsonValue {
  return {
    source: "interview_confirmation_card",
    sessionId,
    reflectionSegmentId: reflection.segmentId,
    candidateId: decision.candidate.id,
    candidateKind: decision.candidate.kind,
    target: decision.candidate.target,
    sensitivity: decision.candidate.sensitivity,
    supportingMemoryIds: decision.candidate.supportingMemoryIds,
    reason: decision.reason,
    riskAccepted: decision.riskAccepted,
    crmWritebackCandidate: decision.candidate.target === "CRM_CANDIDATE",
    confirmedFactOnly: decision.candidate.kind === "CONFIRMED_FACT",
    inferenceNeverCrmFact: decision.candidate.kind === "INFERENCE",
  };
}

function toDomainMemory(memory: InterviewMemoryDto): InterviewMemory {
  return {
    id: memory.id,
    organizationId: memory.organizationId,
    memberId: memory.memberId,
    unitId: memory.unitId,
    clientId: memory.clientId,
    interviewSessionId: memory.sessionId,
    turnId: memory.turnId,
    interviewKind: memory.interviewKind,
    createdAt: memory.createdAt,
    kind: memory.kind,
    source: memory.source,
    dataClass: memory.dataClass,
    visibilityScope: memory.visibilityScope,
    text: memory.text,
    evidenceText: memory.evidenceText ?? undefined,
    confidence: memory.confidence,
    importance: clampImportance(memory.importance),
    issueTags: memory.issueTags,
    outlineSegmentId: memory.outlineSegmentId ?? undefined,
    pqQuestionIds: memory.pqQuestionIds,
    embeddingStatus: memory.embeddingStatus,
    retentionPolicy: memory.retentionPolicy,
    supersedesMemoryId: memory.supersedesMemoryId ?? undefined,
    supersededByMemoryId: memory.supersededByMemoryId ?? undefined,
  };
}

function toDomainReflection(reflection: InterviewReflectionDto): InterviewReflection {
  return {
    id: reflection.id,
    organizationId: reflection.organizationId,
    interviewSessionId: reflection.sessionId,
    interviewKind: reflection.interviewKind,
    segmentId: reflection.segmentId ?? undefined,
    summary: reflection.summary,
    confirmedFacts: reflection.confirmedFacts,
    inferredPatterns: reflection.inferredPatterns,
    unknowns: reflection.unknowns,
    issueReadinessImpact: reflection.issueReadinessImpact ?? undefined,
    theaterBuildImpact: reflection.theaterBuildImpact ?? undefined,
    recommendedNextFocus: reflection.recommendedNextFocus,
    supportingMemoryIds: reflection.supportingMemoryIds,
  };
}

function clampImportance(value: number): InterviewMemoryImportance {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return Math.round(value) as InterviewMemoryImportance;
}
