import type { Prisma } from "@/generated/prisma/client";
import { AiModule, AiProvider, InteractionEventType } from "@/generated/prisma/enums";
import type { AppSession } from "@/lib/auth/session";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import { prisma } from "@/lib/prisma";

export type TheaterBuildAiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TheaterBuildAiBody = {
  sessionId?: string;
  clientId?: string;
  currentSegmentId?: string;
  messages?: TheaterBuildAiMessage[];
  knownMaterials?: string[];
};

type TheaterBuildUsage = {
  model: string;
  requestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
};

type SuccessInput = {
  session: AppSession;
  body: TheaterBuildAiBody;
  assistantContent: string;
  usage: TheaterBuildUsage;
};

type FailureInput = {
  session: AppSession;
  body: TheaterBuildAiBody;
  model: string;
  requestId?: string;
  latencyMs: number;
  error: string;
};

export async function persistTheaterBuildSuccess(input: SuccessInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.interactionEvent.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        actorId: input.session.user.id,
        type: InteractionEventType.THEATER,
        title: "AI 劇場場域建構（訪綱 B）",
        description: trimForDescription(input.assistantContent),
        metadata: {
          source: "api/ai/theater-build",
          sessionId: input.body.sessionId,
          currentSegmentId: input.body.currentSegmentId,
          requestId: input.usage.requestId,
        } as Prisma.InputJsonValue,
      },
    });

    await tx.organization.update({
      where: { id: input.session.organization.id },
      data: { monthlyAiUsed: { increment: 1 } },
    });
  });

  await writeAiUsageLogSafely({
    organizationId: input.session.organization.id,
    unitId: input.session.membership.primaryUnitId ?? undefined,
    userId: input.session.user.id,
    provider: AiProvider.OPENAI,
    module: AiModule.THEATER,
    model: input.usage.model,
    requestId: input.usage.requestId,
    promptTokens: input.usage.promptTokens,
    completionTokens: input.usage.completionTokens,
    totalTokens: input.usage.totalTokens,
    latencyMs: input.usage.latencyMs,
  });
}

export async function persistTheaterBuildFailure(input: FailureInput): Promise<void> {
  await writeAiUsageLogSafely({
    organizationId: input.session.organization.id,
    unitId: input.session.membership.primaryUnitId ?? undefined,
    userId: input.session.user.id,
    provider: AiProvider.OPENAI,
    module: AiModule.THEATER,
    model: input.model,
    requestId: input.requestId,
    latencyMs: input.latencyMs,
    error: input.error,
  });
}

function trimForDescription(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 400 ? `${normalized.slice(0, 400)}…` : normalized;
}
