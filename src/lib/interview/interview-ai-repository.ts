import type { Prisma } from "@/generated/prisma/client";
import { AiModule, AiProvider, InteractionEventType } from "@/generated/prisma/enums";
import type { AppSession } from "@/lib/auth/session";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import { prisma } from "@/lib/prisma";

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

    await tx.interactionEvent.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        clientId,
        actorId: input.session.user.id,
        type: InteractionEventType.VISIT,
        title: "AI 顧問陪談回合",
        description: trimForDescription(input.assistantContent),
        metadata: {
          source: "api/ai/interview",
          sessionId: input.body.sessionId,
          currentSegmentId: input.body.currentSegmentId,
          messages: input.body.messages?.slice(-12) ?? [],
          knownMaterials: input.body.knownMaterials ?? [],
          assistantContent: input.assistantContent,
          requestId: input.usage.requestId,
        } as Prisma.InputJsonValue,
      },
    });

    await writeInterviewUsage(tx, input.session, clientId, input.usage);
    await incrementAiCounter(tx, input.session.organization.id);
  });
}

export async function persistInterviewOutputSuccess(input: InterviewOutputSuccessInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const clientId = await resolveAllowedClientId(input, tx);

    await tx.interactionEvent.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        clientId,
        actorId: input.session.user.id,
        type: InteractionEventType.VISIT,
        title: "AI 顧問陪談輸出草稿",
        description: "已生成客戶輪廓表、對話準備卡、SPIN 候選題與合規提醒草稿。",
        metadata: {
          source: "api/ai/interview/outputs",
          sessionId: input.body.sessionId,
          materials: input.body.materials ?? [],
          messages: input.body.messages?.slice(-12) ?? [],
          output: input.output,
          requestId: input.usage.requestId,
        } as Prisma.InputJsonValue,
      },
    });

    await writeInterviewUsage(tx, input.session, clientId, input.usage);
    await incrementAiCounter(tx, input.session.organization.id);
  });
}

export async function persistInterviewFailure(input: InterviewAiFailureInput): Promise<void> {
  const clientId = await resolveAllowedClientId(input, prisma);

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
  });
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
    return trimmed || "AI 顧問陪談已回覆。";
  }

  return `${trimmed.slice(0, 180)}...`;
}
