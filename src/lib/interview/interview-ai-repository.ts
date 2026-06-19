import type { Prisma } from "@/generated/prisma/client";
import {
  AiModule,
  AiProvider,
  InteractionEventType,
  InterviewModality,
  InterviewTurnRole,
} from "@/generated/prisma/enums";
import type { AppSession } from "@/lib/auth/session";
import { writeAiUsageLogSafely, type AiUsageTrace } from "@/lib/ai/usage-log";
import { prisma } from "@/lib/prisma";

// Accept any plausible record id; the DB lookup (scoped to org + owner) decides
// whether it is a real persistent session. Non-DB ids resolve to a fallback trace.
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{6,120}$/;

export type InterviewAiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type InterviewAiBody = {
  clientId?: string;
  sessionId?: string;
  currentSegmentId?: string;
  messages?: InterviewAiMessage[];
  knownMaterials?: string[];
  materials?: string[];
  memoryEvidence?: unknown;
  microPlan?: unknown;
};

type InterviewAiUsage = {
  model: string;
  requestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
};

type InterviewAiSuccessInput = {
  session: AppSession;
  body: InterviewAiBody;
  assistantContent: string;
  usage: InterviewAiUsage;
};

type InterviewOutputSuccessInput = {
  session: AppSession;
  body: InterviewAiBody;
  output: unknown;
  usage: InterviewAiUsage;
};

type InterviewAiFailureInput = {
  session: AppSession;
  body: InterviewAiBody;
  model: string;
  requestId?: string;
  latencyMs: number;
  error: string;
};

export async function persistInterviewTurnSuccess(input: InterviewAiSuccessInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const clientId = await resolveAllowedClientId(input, tx);
    const interviewSessionId = await resolveInterviewSessionId(tx, input.session, input.body.sessionId);

    const interactionEvent = await tx.interactionEvent.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        clientId,
        actorId: input.session.user.id,
        type: InteractionEventType.VISIT,
        title: "AI 了解客戶回合",
        description: trimForDescription(input.assistantContent),
        metadata: {
          source: "api/ai/interview",
          sessionId: input.body.sessionId,
          interviewSessionId,
          currentSegmentId: input.body.currentSegmentId,
          messages: input.body.messages?.slice(-12) ?? [],
          knownMaterials: input.body.knownMaterials ?? [],
          memoryEvidence: input.body.memoryEvidence,
          microPlan: input.body.microPlan,
          assistantContent: input.assistantContent,
          requestId: input.usage.requestId,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    // Persist the assistant reply as a first-class InterviewTurn so super-admin
    // turn-usage can join the AiUsageLog row back to the conversation turn.
    let interviewTurnId: string | undefined;
    if (interviewSessionId) {
      const turn = await tx.interviewTurn.create({
        data: {
          organizationId: input.session.organization.id,
          unitId: input.session.membership.primaryUnitId,
          clientId,
          sessionId: interviewSessionId,
          actorId: input.session.user.id,
          role: InterviewTurnRole.ASSISTANT,
          modality: InterviewModality.TEXT,
          content: input.assistantContent,
          outlineSegmentId: input.body.currentSegmentId,
          providerEventId: input.usage.requestId,
          metadata: { source: "api/ai/interview" } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      interviewTurnId = turn.id;
    }

    await writeInterviewUsage(tx, input.session, clientId, input.usage, {
      traceSource: interviewSessionId ? "interview" : "interaction_event_fallback",
      interviewSessionId,
      interviewTurnId,
      interactionEventId: interactionEvent.id,
    });
    await incrementAiCounter(tx, input.session.organization.id);
  });
}

export async function persistInterviewOutputSuccess(input: InterviewOutputSuccessInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const clientId = await resolveAllowedClientId(input, tx);
    const interviewSessionId = await resolveInterviewSessionId(tx, input.session, input.body.sessionId);

    const interactionEvent = await tx.interactionEvent.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        clientId,
        actorId: input.session.user.id,
        type: InteractionEventType.VISIT,
        title: "AI 了解客戶輸出草稿",
        description: "已生成客戶輪廓表、對話準備卡、SPIN 候選題與合規提醒草稿。",
        metadata: {
          source: "api/ai/interview/outputs",
          sessionId: input.body.sessionId,
          interviewSessionId,
          materials: input.body.materials ?? [],
          messages: input.body.messages?.slice(-12) ?? [],
          memoryEvidence: input.body.memoryEvidence,
          microPlan: input.body.microPlan,
          output: input.output,
          requestId: input.usage.requestId,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    await writeInterviewUsage(tx, input.session, clientId, input.usage, {
      traceSource: interviewSessionId ? "interview" : "interaction_event_fallback",
      interviewSessionId,
      interactionEventId: interactionEvent.id,
    });
    await incrementAiCounter(tx, input.session.organization.id);
  });
}

export async function persistInterviewFailure(input: InterviewAiFailureInput): Promise<void> {
  const clientId = await resolveAllowedClientId(input, prisma);
  const interviewSessionId = await resolveInterviewSessionId(prisma, input.session, input.body.sessionId);

  await writeAiUsageLogSafely({
    organizationId: input.session.organization.id,
    unitId: input.session.membership.primaryUnitId ?? undefined,
    userId: input.session.user.id,
    clientId,
    provider: AiProvider.OPENAI,
    module: AiModule.INTERVIEW,
    model: input.model,
    latencyMs: input.latencyMs,
    requestId: input.requestId,
    error: input.error,
    trace: {
      traceSource: interviewSessionId ? "interview" : "interaction_event_fallback",
      interviewSessionId,
    },
  });
}

async function resolveInterviewSessionId(
  db: Pick<typeof prisma, "interviewSession">,
  session: AppSession,
  sessionIdCandidate: string | undefined,
): Promise<string | undefined> {
  if (!sessionIdCandidate || !SESSION_ID_PATTERN.test(sessionIdCandidate)) {
    return undefined;
  }

  const dbSession = await db.interviewSession.findFirst({
    where: {
      id: sessionIdCandidate,
      organizationId: session.organization.id,
      ownerId: session.user.id,
    },
    select: { id: true },
  });

  return dbSession?.id;
}

async function resolveAllowedClientId(
  input: { session: AppSession; body: InterviewAiBody },
  db: Pick<typeof prisma, "client">,
): Promise<string | undefined> {
  const clientId = input.body.clientId;

  if (!clientId) {
    return undefined;
  }

  const client = await db.client.findFirst({
    where: {
      id: clientId,
      organizationId: input.session.organization.id,
      ownerId: input.session.user.id,
    },
    select: { id: true },
  });

  return client?.id;
}

async function writeInterviewUsage(
  tx: Prisma.TransactionClient,
  session: AppSession,
  clientId: string | undefined,
  usage: InterviewAiUsage,
  trace: AiUsageTrace,
) {
  await tx.aiUsageLog.create({
    data: {
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId,
      userId: session.user.id,
      clientId,
      provider: AiProvider.OPENAI,
      module: AiModule.INTERVIEW,
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      latencyMs: usage.latencyMs,
      requestId: usage.requestId,
      traceSource: trace.traceSource,
      interviewSessionId: trace.interviewSessionId,
      interviewTurnId: trace.interviewTurnId,
      interactionEventId: trace.interactionEventId,
    },
  });
}

async function incrementAiCounter(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.organization.update({
    where: { id: organizationId },
    data: {
      monthlyAiUsed: { increment: 1 },
    },
  });
}

function trimForDescription(content: string): string {
  const trimmed = content.trim();

  if (trimmed.length <= 180) {
    return trimmed || "AI 了解客戶已回覆。";
  }

  return `${trimmed.slice(0, 180)}...`;
}
