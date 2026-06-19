import { z } from "zod";
import { createMemoryCandidatesFromTurn } from "@/domains/interview/memory";
import type { InterviewMemory as DomainInterviewMemory } from "@/domains/interview/types";
import { Prisma } from "@/generated/prisma/client";
import type { InterviewMemoryModel, InterviewReflectionModel, InterviewSessionModel, InterviewTurnModel } from "@/generated/prisma/models";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const createInterviewSessionInputSchema = z.object({
  clientId: z.string().trim().min(1).max(120).optional(),
  interviewKind: z.enum(["ADVISOR_COMPANION", "THEATER_FIELD_BUILD"]).default("ADVISOR_COMPANION"),
  outlineId: z.string().trim().min(1).max(120).default("advisor-companion"),
  currentSegmentId: z.string().trim().max(120).optional(),
  title: z.string().trim().max(160).optional(),
});

export const appendInterviewTurnInputSchema = z.object({
  role: z.enum(["USER", "ASSISTANT", "SYSTEM"]),
  modality: z.enum(["TEXT", "VOICE_REALTIME", "VOICE_TRANSCRIPT_FALLBACK"]).default("TEXT"),
  content: z.string().trim().min(1).max(12000),
  transcriptFinal: z.boolean().default(true),
  providerEventId: z.string().trim().max(160).optional(),
  outlineSegmentId: z.string().trim().max(120).optional(),
  occurredAt: z.string().datetime().optional(),
  issueTags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  pqQuestionIds: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export const createInterviewReflectionInputSchema = z.object({
  segmentId: z.string().trim().max(120).optional(),
  summary: z.string().trim().min(1).max(12000),
  confirmedFacts: z.array(z.string().trim().min(1).max(600)).max(40).default([]),
  inferredPatterns: z.array(z.string().trim().min(1).max(600)).max(40).default([]),
  unknowns: z.array(z.string().trim().min(1).max(600)).max(40).default([]),
  issueReadinessImpact: z.string().trim().max(3000).optional(),
  theaterBuildImpact: z.string().trim().max(3000).optional(),
  recommendedNextFocus: z.string().trim().min(1).max(3000),
  supportingMemoryIds: z.array(z.string().trim().min(1).max(160)).max(80).default([]),
});

export type CreateInterviewSessionInput = z.infer<typeof createInterviewSessionInputSchema>;
export type AppendInterviewTurnInput = z.infer<typeof appendInterviewTurnInputSchema>;
export type CreateInterviewReflectionInput = z.infer<typeof createInterviewReflectionInputSchema>;

export interface InterviewSessionSnapshotDto {
  session: InterviewSessionDto;
  turns: InterviewTurnDto[];
  memories: InterviewMemoryDto[];
  reflections: InterviewReflectionDto[];
}

export interface InterviewSessionDto {
  id: string;
  organizationId: string;
  unitId: string | null;
  clientId: string | null;
  ownerId: string | null;
  interviewKind: InterviewSessionModel["interviewKind"];
  status: InterviewSessionModel["status"];
  outlineId: string;
  currentSegmentId: string | null;
  title: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewTurnDto {
  id: string;
  organizationId: string;
  unitId: string | null;
  clientId: string | null;
  sessionId: string;
  actorId: string | null;
  role: InterviewTurnModel["role"];
  modality: InterviewTurnModel["modality"];
  content: string;
  transcriptFinal: boolean;
  providerEventId: string | null;
  outlineSegmentId: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface InterviewMemoryDto {
  id: string;
  organizationId: string;
  memberId: string;
  unitId: string | null;
  clientId: string | null;
  sessionId: string;
  turnId: string | null;
  interviewKind: InterviewMemoryModel["interviewKind"];
  kind: InterviewMemoryModel["kind"];
  source: InterviewMemoryModel["source"];
  dataClass: InterviewMemoryModel["dataClass"];
  visibilityScope: InterviewMemoryModel["visibilityScope"];
  text: string;
  evidenceText: string | null;
  confidence: InterviewMemoryModel["confidence"];
  importance: number;
  issueTags: string[];
  outlineSegmentId: string | null;
  pqQuestionIds: string[];
  embeddingStatus: InterviewMemoryModel["embeddingStatus"];
  retentionPolicy: InterviewMemoryModel["retentionPolicy"];
  supersedesMemoryId: string | null;
  supersededByMemoryId: string | null;
  createdAt: string;
}

export interface InterviewReflectionDto {
  id: string;
  organizationId: string;
  unitId: string | null;
  clientId: string | null;
  sessionId: string;
  interviewKind: InterviewReflectionModel["interviewKind"];
  segmentId: string | null;
  summary: string;
  confirmedFacts: string[];
  inferredPatterns: string[];
  unknowns: string[];
  issueReadinessImpact: string | null;
  theaterBuildImpact: string | null;
  recommendedNextFocus: string;
  supportingMemoryIds: string[];
  createdAt: string;
}

const sessionInclude = {
  turns: { orderBy: { occurredAt: "asc" } },
  memories: { orderBy: { createdAt: "asc" } },
  reflections: { orderBy: { createdAt: "asc" } },
} as const;

export async function createPersistentInterviewSession(
  session: AppSession,
  input: CreateInterviewSessionInput,
): Promise<InterviewSessionDto | null> {
  const clientScope = input.clientId ? await getOwnedClientScope(session, input.clientId) : null;

  if (input.clientId && !clientScope) {
    return null;
  }

  const record = await prisma.interviewSession.create({
    data: {
      organizationId: session.organization.id,
      unitId: clientScope?.unitId ?? session.membership.primaryUnitId,
      clientId: input.clientId ?? null,
      ownerId: session.user.id,
      interviewKind: input.interviewKind,
      status: "ACTIVE",
      outlineId: input.outlineId,
      currentSegmentId: input.currentSegmentId ?? null,
      title: input.title ?? null,
    },
  });

  return toSessionDto(record);
}

export async function getPersistentInterviewSessionSnapshot(
  session: AppSession,
  sessionId: string,
): Promise<InterviewSessionSnapshotDto | null> {
  const record = await prisma.interviewSession.findFirst({
    where: ownerSessionWhere(session, sessionId),
    include: sessionInclude,
  });

  if (!record) {
    return null;
  }

  return {
    session: toSessionDto(record),
    turns: record.turns.map(toTurnDto),
    memories: record.memories.map(toMemoryDto),
    reflections: record.reflections.map(toReflectionDto),
  };
}

export async function appendPersistentInterviewTurn(
  session: AppSession,
  sessionId: string,
  input: AppendInterviewTurnInput,
): Promise<{ turn: InterviewTurnDto; memories: InterviewMemoryDto[] } | null> {
  const result = await prisma.$transaction(async (tx) => {
    const interviewSession = await tx.interviewSession.findFirst({
      where: ownerSessionWhere(session, sessionId),
    });

    if (!interviewSession) {
      return null;
    }

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    const turn = await tx.interviewTurn.create({
      data: {
        organizationId: interviewSession.organizationId,
        unitId: interviewSession.unitId,
        clientId: interviewSession.clientId,
        sessionId: interviewSession.id,
        actorId: input.role === "USER" ? session.user.id : null,
        role: input.role,
        modality: input.modality,
        content: input.content,
        transcriptFinal: input.transcriptFinal,
        providerEventId: input.providerEventId ?? null,
        outlineSegmentId: input.outlineSegmentId ?? null,
        occurredAt,
      },
    });

    const memoryCandidates = createMemoryCandidatesFromTurn({
      organizationId: interviewSession.organizationId,
      memberId: session.user.id,
      unitId: interviewSession.unitId,
      clientId: interviewSession.clientId,
      interviewSessionId: interviewSession.id,
      turnId: turn.id,
      interviewKind: interviewSession.interviewKind,
      role: input.role,
      modality: input.modality,
      content: input.content,
      transcriptFinal: input.transcriptFinal,
      createdAt: turn.occurredAt.toISOString(),
      outlineSegmentId: input.outlineSegmentId,
      issueTags: input.issueTags,
      pqQuestionIds: input.pqQuestionIds,
    });

    if (memoryCandidates.length > 0) {
      await tx.interviewMemory.createMany({
        data: memoryCandidates.map(toMemoryCreateInput),
        skipDuplicates: true,
      });
    }

    await tx.interviewSession.update({
      where: { id: interviewSession.id },
      data: {
        currentSegmentId: input.outlineSegmentId ?? interviewSession.currentSegmentId,
      },
    });

    const memories = await tx.interviewMemory.findMany({
      where: {
        turnId: turn.id,
        organizationId: interviewSession.organizationId,
      },
      orderBy: { createdAt: "asc" },
    });

    return { turn, memories };
  });

  if (!result) {
    return null;
  }

  return {
    turn: toTurnDto(result.turn),
    memories: result.memories.map(toMemoryDto),
  };
}

export async function createPersistentInterviewReflection(
  session: AppSession,
  sessionId: string,
  input: CreateInterviewReflectionInput,
): Promise<InterviewReflectionDto | null> {
  const result = await prisma.$transaction(async (tx) => {
    const interviewSession = await tx.interviewSession.findFirst({
      where: ownerSessionWhere(session, sessionId),
    });

    if (!interviewSession) {
      return null;
    }

    const supportingMemoryIds =
      input.supportingMemoryIds.length > 0
        ? (
            await tx.interviewMemory.findMany({
              where: {
                id: { in: input.supportingMemoryIds },
                organizationId: interviewSession.organizationId,
                sessionId: interviewSession.id,
              },
              select: { id: true },
            })
          ).map((memory) => memory.id)
        : [];

    const reflection = await tx.interviewReflection.create({
      data: {
        organizationId: interviewSession.organizationId,
        unitId: interviewSession.unitId,
        clientId: interviewSession.clientId,
        sessionId: interviewSession.id,
        interviewKind: interviewSession.interviewKind,
        segmentId: input.segmentId ?? null,
        summary: input.summary,
        confirmedFacts: input.confirmedFacts,
        inferredPatterns: input.inferredPatterns,
        unknowns: input.unknowns,
        issueReadinessImpact: input.issueReadinessImpact ?? null,
        theaterBuildImpact: input.theaterBuildImpact ?? null,
        recommendedNextFocus: input.recommendedNextFocus,
        supportingMemoryIds,
      },
    });

    return reflection;
  });

  return result ? toReflectionDto(result) : null;
}

function ownerSessionWhere(session: AppSession, sessionId: string) {
  return {
    id: sessionId,
    organizationId: session.organization.id,
    ownerId: session.user.id,
  };
}

async function getOwnedClientScope(session: AppSession, clientId: string) {
  return prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      status: { not: "ARCHIVED" },
    },
    select: {
      id: true,
      unitId: true,
    },
  });
}

function toMemoryCreateInput(memory: DomainInterviewMemory): Prisma.InterviewMemoryCreateManyInput {
  return {
    id: memory.id,
    organizationId: memory.organizationId,
    memberId: memory.memberId,
    unitId: memory.unitId ?? null,
    clientId: memory.clientId ?? null,
    sessionId: memory.interviewSessionId,
    turnId: memory.turnId ?? null,
    interviewKind: memory.interviewKind,
    kind: memory.kind,
    source: memory.source,
    dataClass: memory.dataClass,
    visibilityScope: memory.visibilityScope,
    text: memory.text,
    evidenceText: memory.evidenceText ?? null,
    confidence: memory.confidence,
    importance: memory.importance,
    issueTags: memory.issueTags,
    outlineSegmentId: memory.outlineSegmentId ?? null,
    pqQuestionIds: memory.pqQuestionIds ?? [],
    embeddingStatus: memory.embeddingStatus,
    retentionPolicy: memory.retentionPolicy,
    supersedesMemoryId: memory.supersedesMemoryId ?? null,
    supersededByMemoryId: memory.supersededByMemoryId ?? null,
    createdAt: new Date(memory.createdAt),
  };
}

function toSessionDto(record: InterviewSessionModel): InterviewSessionDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    unitId: record.unitId,
    clientId: record.clientId,
    ownerId: record.ownerId,
    interviewKind: record.interviewKind,
    status: record.status,
    outlineId: record.outlineId,
    currentSegmentId: record.currentSegmentId,
    title: record.title,
    startedAt: record.startedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toTurnDto(record: InterviewTurnModel): InterviewTurnDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    unitId: record.unitId,
    clientId: record.clientId,
    sessionId: record.sessionId,
    actorId: record.actorId,
    role: record.role,
    modality: record.modality,
    content: record.content,
    transcriptFinal: record.transcriptFinal,
    providerEventId: record.providerEventId,
    outlineSegmentId: record.outlineSegmentId,
    occurredAt: record.occurredAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}

function toMemoryDto(record: InterviewMemoryModel): InterviewMemoryDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    memberId: record.memberId,
    unitId: record.unitId,
    clientId: record.clientId,
    sessionId: record.sessionId,
    turnId: record.turnId,
    interviewKind: record.interviewKind,
    kind: record.kind,
    source: record.source,
    dataClass: record.dataClass,
    visibilityScope: record.visibilityScope,
    text: record.text,
    evidenceText: record.evidenceText,
    confidence: record.confidence,
    importance: record.importance,
    issueTags: record.issueTags,
    outlineSegmentId: record.outlineSegmentId,
    pqQuestionIds: record.pqQuestionIds,
    embeddingStatus: record.embeddingStatus,
    retentionPolicy: record.retentionPolicy,
    supersedesMemoryId: record.supersedesMemoryId,
    supersededByMemoryId: record.supersededByMemoryId,
    createdAt: record.createdAt.toISOString(),
  };
}

function toReflectionDto(record: InterviewReflectionModel): InterviewReflectionDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    unitId: record.unitId,
    clientId: record.clientId,
    sessionId: record.sessionId,
    interviewKind: record.interviewKind,
    segmentId: record.segmentId,
    summary: record.summary,
    confirmedFacts: record.confirmedFacts,
    inferredPatterns: record.inferredPatterns,
    unknowns: record.unknowns,
    issueReadinessImpact: record.issueReadinessImpact,
    theaterBuildImpact: record.theaterBuildImpact,
    recommendedNextFocus: record.recommendedNextFocus,
    supportingMemoryIds: record.supportingMemoryIds,
    createdAt: record.createdAt.toISOString(),
  };
}
