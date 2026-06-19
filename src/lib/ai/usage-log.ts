import { prisma } from "@/lib/prisma";
import { AiModule, AiProvider } from "@/generated/prisma/enums";

export interface AiUsageLogInput {
  organizationId: string;
  unitId?: string;
  userId?: string;
  clientId?: string;
  provider: AiProvider;
  module: AiModule;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  costUsd?: string;
  requestId?: string;
  error?: string;
}

export async function writeAiUsageLog(input: AiUsageLogInput): Promise<void> {
  await prisma.aiUsageLog.create({
    data: {
      organizationId: input.organizationId,
      unitId: input.unitId,
      userId: input.userId,
      clientId: input.clientId,
      provider: input.provider,
      module: input.module,
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      latencyMs: input.latencyMs,
      costUsd: input.costUsd,
      requestId: input.requestId,
      error: input.error,
    },
  });
}

export async function writeAiUsageLogSafely(input: AiUsageLogInput): Promise<void> {
  try {
    await writeAiUsageLog(input);
  } catch (error) {
    console.error("AiUsageLog write failed:", error);
  }
}
