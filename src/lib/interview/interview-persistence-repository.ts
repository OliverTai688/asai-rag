import { z } from "zod";
import { createMemoryCandidatesFromTurn } from "@/domains/interview/memory";
import {
  buildQuickCaptureMemoryBridge,
  type QuickCaptureAssignment,
  type QuickCaptureBridge,
  type QuickCaptureOrigin,
} from "@/domains/interview/quick-capture";
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

export const createQuickCaptureBridgeInputSchema = z
  .object({
    captureId: z.string().trim().min(1).max(160).optional(),
    content: z.string().trim().min(1).max(12000),
    origin: z
      .enum(["POST_VISIT_NOTE", "GLOBAL_QUICK_CAPTURE", "MEETING_NOTE", "VOICE_TRANSCRIPT"])
      .default("POST_VISIT_NOTE"),
    assignment: z.enum(["PRIVATE_DRAFT", "CLIENT", "VISIT_PLAN", "FOLLOW_UP_REVIEW"]).default("PRIVATE_DRAFT"),
    clientId: z.string().trim().min(1).max(120).optional(),
    visitPlanId: z.string().trim().min(1).max(120).optional(),
    interviewSessionId: z.string().trim().min(1).max(120).optional(),
    clientProvidedScope: z
      .object({
        organizationId: z.string().trim().min(1).max(120).optional(),
        memberId: z.string().trim().min(1).max(120).optional(),
        unitId: z.string().trim().min(1).max(120).nullable().optional(),
        clientId: z.string().trim().min(1).max(120).nullable().optional(),
        visitPlanId: z.string().trim().min(1).max(120).nullable().optional(),
        interviewSessionId: z.string().trim().min(1).max(120).nullable().optional(),
      })
      .optional(),
    transcriptFinal: z.boolean().default(true),
    modality: z.enum(["TEXT", "VOICE_REALTIME", "VOICE_TRANSCRIPT_FALLBACK"]).default("TEXT"),
    outlineSegmentId: z.string().trim().min(1).max(120).optional(),
    issueTags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    approval: z
      .object({
        reason: z.string().trim().max(240).optional(),
        riskAccepted: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.assignment === "CLIENT" && !value.clientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clientId"],
        message: "clientId is required when assignment is CLIENT.",
      });
    }

    if (value.assignment === "VISIT_PLAN" && !value.visitPlanId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visitPlanId"],
        message: "visitPlanId is required when assignment is VISIT_PLAN.",
      });
    }
  });

export type CreateInterviewSessionInput = z.infer<typeof createInterviewSessionInputSchema>;
export type AppendInterviewTurnInput = z.infer<typeof appendInterviewTurnInputSchema>;
export type CreateInterviewReflectionInput = z.infer<typeof createInterviewReflectionInputSchema>;
export type CreateQuickCaptureBridgeInput = z.infer<typeof createQuickCaptureBridgeInputSchema>;

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

export interface QuickCaptureBridgeMemoryDto {
  id: string;
  dataClass: InterviewMemoryDto["dataClass"];
  kind: InterviewMemoryDto["kind"];
  source: InterviewMemoryDto["source"];
  visibilityScope: InterviewMemoryDto["visibilityScope"];
  confidence: InterviewMemoryDto["confidence"];
  importance: number;
  requiresConfirmation: boolean;
  supportingEvidence: {
    sourceLabel: string;
    sessionId: string;
    turnId: string;
  };
}

export interface QuickCaptureBridgeResultDto {
  status: "READY";
  capture: {
    id: string;
    origin: QuickCaptureOrigin;
    assignment: QuickCaptureAssignment;
    sourceLabel: string;
    sessionId: string;
    turnId: string;
    clientId: string | null;
    visitPlanId: string | null;
  };
  memoryCandidates: QuickCaptureBridgeMemoryDto[];
  preparationPackageSupplements: QuickCaptureBridge["preparationPackageSupplements"];
  narratorQuestions: Array<{
    id: string;
    label: string;
    evidenceMemoryIds: string[];
    requiresConfirmation: true;
  }>;
  theaterStateProposals: Array<{
    id: string;
    label: string;
    sourceMemoryIds: string[];
    requiresConfirmation: true;
    writesConfirmedCrmFact: false;
  }>;
  crmWritebackCandidates: QuickCaptureBridge["crmWritebackCandidates"];
  safety: QuickCaptureBridge["safety"] & {
    clientSensitivity: "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE" | null;
    scopeSource: "server_session";
  };
}

export interface QuickCaptureBridgeBlockedDto {
  status: "BLOCKED";
  capture: {
    id: string;
    origin: QuickCaptureOrigin;
    assignment: QuickCaptureAssignment;
    sourceLabel: string;
    clientId: string | null;
    visitPlanId: string | null;
  };
  blockedReason: string;
  safety: QuickCaptureBridge["safety"] & {
    clientSensitivity: "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE" | null;
    scopeSource: "server_session";
  };
}

export type QuickCaptureBridgePersistenceDto = QuickCaptureBridgeResultDto | QuickCaptureBridgeBlockedDto;

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

export async function createPersistentQuickCaptureBridge(
  session: AppSession,
  input: CreateQuickCaptureBridgeInput,
): Promise<QuickCaptureBridgePersistenceDto | null> {
  const captureId = input.captureId ?? `quick_capture_${crypto.randomUUID()}`;
  const scope = await resolveQuickCaptureScope(session, input);

  if (!scope) {
    return null;
  }

  const preliminaryBridge = buildQuickCaptureMemoryBridge({
    captureId,
    content: input.content,
    origin: input.origin,
    assignment: input.assignment,
    serverScope: scope.serverScope,
    clientProvidedScope: input.clientProvidedScope,
    transcriptFinal: input.transcriptFinal,
    modality: input.modality,
    outlineSegmentId: input.outlineSegmentId,
    issueTags: input.issueTags,
    approval: input.approval,
  });
  const highSensitiveClientBlocked =
    scope.clientSensitivity === "HIGHLY_SENSITIVE" &&
    input.assignment !== "PRIVATE_DRAFT" &&
    !hasQuickCaptureApproval(input.approval);

  if (preliminaryBridge.status === "BLOCKED" || highSensitiveClientBlocked) {
    return toQuickCaptureBlockedDto({
      bridge: preliminaryBridge,
      input,
      clientSensitivity: scope.clientSensitivity,
      blockedReason:
        preliminaryBridge.status === "BLOCKED"
          ? preliminaryBridge.blockedReason ?? "Quick-capture bridge blocked."
          : "High-sensitive client quick-capture needs a reason or riskAccepted before it can be linked.",
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const interviewSession =
      input.interviewSessionId
        ? await tx.interviewSession.findFirst({
            where: ownerSessionWhere(session, input.interviewSessionId),
          })
        : await tx.interviewSession.create({
            data: {
              organizationId: session.organization.id,
              unitId: scope.serverScope.unitId,
              clientId: scope.serverScope.clientId,
              ownerId: session.user.id,
              interviewKind: "ADVISOR_COMPANION",
              status: "ACTIVE",
              outlineId: "quick-capture-bridge",
              currentSegmentId: input.outlineSegmentId ?? null,
              title: quickCaptureSessionTitle(input.origin, input.assignment),
              metadata: {
                source: "quick_capture_bridge",
                captureId,
                origin: input.origin,
                assignment: input.assignment,
                visitPlanId: scope.serverScope.visitPlanId,
                providerCallAttempted: false,
              },
            },
          });

    if (!interviewSession) {
      return null;
    }

    const occurredAt = new Date();
    const turn = await tx.interviewTurn.create({
      data: {
        organizationId: interviewSession.organizationId,
        unitId: interviewSession.unitId,
        clientId: interviewSession.clientId,
        sessionId: interviewSession.id,
        actorId: session.user.id,
        role: "USER",
        modality: input.modality,
        content: quickCaptureTurnAnchor(input.origin, input.assignment, captureId),
        transcriptFinal: input.transcriptFinal,
        providerEventId: null,
        outlineSegmentId: input.outlineSegmentId ?? null,
        metadata: {
          source: "quick_capture_bridge",
          captureId,
          providerCallAttempted: false,
          rawAudioStored: false,
          rawProviderPayloadStored: false,
        },
        occurredAt,
      },
    });

    const bridge = buildQuickCaptureMemoryBridge({
      captureId,
      content: input.content,
      origin: input.origin,
      assignment: input.assignment,
      serverScope: {
        ...scope.serverScope,
        interviewSessionId: interviewSession.id,
      },
      clientProvidedScope: input.clientProvidedScope,
      createdAt: occurredAt.toISOString(),
      sourceTurnId: turn.id,
      transcriptFinal: input.transcriptFinal,
      modality: input.modality,
      outlineSegmentId: input.outlineSegmentId,
      issueTags: input.issueTags,
      approval: input.approval,
    });

    if (bridge.status === "BLOCKED") {
      return null;
    }

    await tx.interviewMemory.createMany({
      data: bridge.memoryCandidates.map(toMemoryCreateInput),
      skipDuplicates: true,
    });

    const memories = await tx.interviewMemory.findMany({
      where: {
        turnId: turn.id,
        organizationId: interviewSession.organizationId,
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      bridge,
      turn,
      memories,
    };
  });

  if (!result) {
    return null;
  }

  return toQuickCaptureReadyDto({
    bridge: result.bridge,
    input,
    turn: toTurnDto(result.turn),
    memories: result.memories.map(toMemoryDto),
    clientSensitivity: scope.clientSensitivity,
  });
}

function ownerSessionWhere(session: AppSession, sessionId: string) {
  return {
    id: sessionId,
    organizationId: session.organization.id,
    ownerId: session.user.id,
  };
}

async function resolveQuickCaptureScope(session: AppSession, input: CreateQuickCaptureBridgeInput) {
  const baseScope = {
    organizationId: session.organization.id,
    memberId: session.user.id,
    unitId: session.membership.primaryUnitId,
    clientId: null as string | null,
    visitPlanId: null as string | null,
    interviewSessionId: input.interviewSessionId ?? null,
  };

  if (input.visitPlanId) {
    const visit = await prisma.visitPlan.findFirst({
      where: {
        id: input.visitPlanId,
        organizationId: session.organization.id,
        ownerId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        unitId: true,
        clientId: true,
        client: {
          select: {
            id: true,
            ownerId: true,
            sensitivity: true,
            status: true,
          },
        },
      },
    });

    if (
      !visit ||
      visit.client.ownerId !== session.user.id ||
      visit.client.status === "ARCHIVED" ||
      (input.clientId && input.clientId !== visit.clientId)
    ) {
      return null;
    }

    return {
      serverScope: {
        ...baseScope,
        unitId: visit.unitId ?? baseScope.unitId,
        clientId: visit.clientId,
        visitPlanId: visit.id,
      },
      clientSensitivity: visit.client.sensitivity,
    };
  }

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: {
        id: input.clientId,
        organizationId: session.organization.id,
        ownerId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        unitId: true,
        sensitivity: true,
      },
    });

    if (!client) {
      return null;
    }

    return {
      serverScope: {
        ...baseScope,
        unitId: client.unitId ?? baseScope.unitId,
        clientId: client.id,
      },
      clientSensitivity: client.sensitivity,
    };
  }

  return {
    serverScope: baseScope,
    clientSensitivity: null,
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

function hasQuickCaptureApproval(approval: CreateQuickCaptureBridgeInput["approval"]): boolean {
  return Boolean(approval?.riskAccepted || approval?.reason?.trim());
}

function quickCaptureSessionTitle(origin: QuickCaptureOrigin, assignment: QuickCaptureAssignment): string {
  const originLabel: Record<QuickCaptureOrigin, string> = {
    POST_VISIT_NOTE: "拜訪後筆記",
    GLOBAL_QUICK_CAPTURE: "快速捕捉",
    MEETING_NOTE: "會議筆記",
    VOICE_TRANSCRIPT: "語音捕捉",
  };

  const assignmentLabel: Record<QuickCaptureAssignment, string> = {
    PRIVATE_DRAFT: "私人草稿",
    CLIENT: "歸客戶",
    VISIT_PLAN: "歸拜訪",
    FOLLOW_UP_REVIEW: "待確認",
  };

  return `${originLabel[origin]} - ${assignmentLabel[assignment]}`;
}

function quickCaptureTurnAnchor(origin: QuickCaptureOrigin, assignment: QuickCaptureAssignment, captureId: string): string {
  return `quick-capture anchor:${origin}:${assignment}:${captureId}`;
}

function toQuickCaptureBlockedDto(input: {
  bridge: QuickCaptureBridge;
  input: CreateQuickCaptureBridgeInput;
  clientSensitivity: "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE" | null;
  blockedReason: string;
}): QuickCaptureBridgeBlockedDto {
  return {
    status: "BLOCKED",
    capture: {
      id: input.bridge.captureId,
      origin: input.input.origin,
      assignment: input.input.assignment,
      sourceLabel: input.bridge.sourceLabel,
      clientId: input.bridge.scope.clientId ?? null,
      visitPlanId: input.bridge.scope.visitPlanId ?? null,
    },
    blockedReason: input.blockedReason,
    safety: {
      ...input.bridge.safety,
      highSensitiveGatePassed: false,
      clientSensitivity: input.clientSensitivity,
      scopeSource: "server_session",
    },
  };
}

function toQuickCaptureReadyDto(input: {
  bridge: QuickCaptureBridge;
  input: CreateQuickCaptureBridgeInput;
  turn: InterviewTurnDto;
  memories: InterviewMemoryDto[];
  clientSensitivity: "NORMAL" | "SENSITIVE" | "HIGHLY_SENSITIVE" | null;
}): QuickCaptureBridgeResultDto {
  return {
    status: "READY",
    capture: {
      id: input.bridge.captureId,
      origin: input.input.origin,
      assignment: input.input.assignment,
      sourceLabel: input.bridge.sourceLabel,
      sessionId: input.turn.sessionId,
      turnId: input.turn.id,
      clientId: input.bridge.scope.clientId ?? null,
      visitPlanId: input.bridge.scope.visitPlanId ?? null,
    },
    memoryCandidates: input.memories.map((memory) => ({
      id: memory.id,
      dataClass: memory.dataClass,
      kind: memory.kind,
      source: memory.source,
      visibilityScope: memory.visibilityScope,
      confidence: memory.confidence,
      importance: memory.importance,
      requiresConfirmation: memory.dataClass !== "FACT" || Boolean(memory.clientId),
      supportingEvidence: {
        sourceLabel: input.bridge.sourceLabel,
        sessionId: memory.sessionId,
        turnId: input.turn.id,
      },
    })),
    preparationPackageSupplements: input.bridge.preparationPackageSupplements,
    narratorQuestions: input.bridge.narratorQuestions.map((_, index) => ({
      id: `narrator_question_${index + 1}_${input.bridge.captureId}`,
      label: "待確認題",
      evidenceMemoryIds: input.memories.map((memory) => memory.id),
      requiresConfirmation: true,
    })),
    theaterStateProposals: input.bridge.theaterStateProposals.map((proposal) => ({
      id: proposal.id,
      label: proposal.summary.startsWith("待確認") ? "待確認狀態 proposal" : "關係/狀態推論 proposal",
      sourceMemoryIds: proposal.sourceMemoryIds,
      requiresConfirmation: true,
      writesConfirmedCrmFact: false,
    })),
    crmWritebackCandidates: input.bridge.crmWritebackCandidates,
    safety: {
      ...input.bridge.safety,
      clientSensitivity: input.clientSensitivity,
      scopeSource: "server_session",
    },
  };
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
