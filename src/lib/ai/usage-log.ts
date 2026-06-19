import { prisma } from "@/lib/prisma";
import { AiModule, AiProvider } from "@/generated/prisma/enums";

/**
 * Per-turn trace linkage (RES-022 Route B). Lets a single AiUsageLog row be joined
 * back to the conversation/session/turn that produced it for super-admin auditing.
 */
export type AiUsageTraceSource =
  | "assistant"
  | "interview"
  | "theater"
  | "interaction_event_fallback";

export interface AiUsageTrace {
  traceSource?: AiUsageTraceSource;
  assistantConversationId?: string;
  assistantMessageId?: string;
  interviewSessionId?: string;
  interviewTurnId?: string;
  theaterSessionId?: string;
  theaterTurnId?: string;
  interactionEventId?: string;
}

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
  trace?: AiUsageTrace;
}

/**
 * Maps an {@link AiUsageTrace} to the flat scalar trace columns on AiUsageLog.
 * Exported so transactional writers (chat/interview/theater repositories) can
 * inline the same trace shape into their own `aiUsageLog.create` calls.
 */
export function aiUsageTraceColumns(trace: AiUsageTrace | undefined) {
  if (!trace) {
    return {};
  }

  return {
    traceSource: trace.traceSource,
    assistantConversationId: trace.assistantConversationId,
    assistantMessageId: trace.assistantMessageId,
    interviewSessionId: trace.interviewSessionId,
    interviewTurnId: trace.interviewTurnId,
    theaterSessionId: trace.theaterSessionId,
    theaterTurnId: trace.theaterTurnId,
    interactionEventId: trace.interactionEventId,
  };
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
      ...aiUsageTraceColumns(input.trace),
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
