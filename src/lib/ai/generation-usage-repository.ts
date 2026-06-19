import { AiProvider, type AiModule } from "@/generated/prisma/enums";
import type { AppSession } from "@/lib/auth/session";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import { prisma } from "@/lib/prisma";

export type AiGenerationUsage = {
  model: string;
  requestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
};

export async function persistAiGenerationSuccess(input: {
  session: AppSession;
  module: AiModule;
  clientId?: string;
  usage: AiGenerationUsage;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.aiUsageLog.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        userId: input.session.user.id,
        clientId: input.clientId,
        provider: AiProvider.OPENAI,
        module: input.module,
        model: input.usage.model,
        promptTokens: input.usage.promptTokens,
        completionTokens: input.usage.completionTokens,
        totalTokens: input.usage.totalTokens,
        latencyMs: input.usage.latencyMs,
        requestId: input.usage.requestId,
      },
    });

    await tx.organization.update({
      where: { id: input.session.organization.id },
      data: {
        monthlyAiUsed: { increment: 1 },
      },
    });
  });
}

export async function persistAiGenerationFailure(input: {
  session: AppSession;
  module: AiModule;
  model: string;
  clientId?: string;
  requestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  error: string;
}): Promise<void> {
  await writeAiUsageLogSafely({
    organizationId: input.session.organization.id,
    unitId: input.session.membership.primaryUnitId ?? undefined,
    userId: input.session.user.id,
    clientId: input.clientId,
    provider: AiProvider.OPENAI,
    module: input.module,
    model: input.model,
    requestId: input.requestId,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.totalTokens,
    latencyMs: input.latencyMs,
    error: input.error,
  });
}

export function normalizeAiError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  return error.message.slice(0, 500);
}
