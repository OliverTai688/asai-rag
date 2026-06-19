import type { Prisma } from "@/generated/prisma/client";
import { AiModule, AiProvider, MessageRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { AppSession } from "@/lib/auth/session";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";

type AssistantChatMessageInput = {
  role: "user" | "assistant";
  content: string;
};

type AssistantChatContextInput = {
  route?: string;
  clientId?: string;
  clientName?: string;
  conversationId?: string;
};

type AssistantChatBody = {
  messages: AssistantChatMessageInput[];
  context?: AssistantChatContextInput;
};

type PersistAssistantChatBaseInput = {
  session: AppSession;
  body: AssistantChatBody;
  model: string;
  requestId?: string;
  latencyMs: number;
};

type PersistAssistantChatSuccessInput = PersistAssistantChatBaseInput & {
  conversationId: string;
  clientId?: string;
  assistantContent: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

type PersistAssistantChatFailureInput = PersistAssistantChatBaseInput & {
  conversationId?: string;
  clientId?: string;
  error: string;
};

export type EnsureAssistantConversationResult = {
  conversationId: string;
  clientId?: string;
};

/**
 * Resolve the DB conversation a chat turn belongs to BEFORE streaming starts so the
 * resulting AiUsageLog row can trace back to a first-class conversation/message.
 *
 * When the client supplies `context.conversationId` (its local-store conversation id)
 * we reuse the matching DB conversation instead of creating a fresh one every turn
 * (RES-022 §2.1), keying on `metadata.clientConversationId`.
 */
export async function ensureAssistantConversation(input: {
  session: AppSession;
  body: AssistantChatBody;
}): Promise<EnsureAssistantConversationResult> {
  const clientId = await resolveAllowedClientId(input, prisma);
  const clientConversationId = input.body.context?.conversationId;
  const latestUserMessage = [...input.body.messages].reverse().find((message) => message.role === "user");

  if (clientConversationId) {
    const existing = await prisma.assistantConversation.findFirst({
      where: {
        organizationId: input.session.organization.id,
        ownerId: input.session.user.id,
        metadata: { path: ["clientConversationId"], equals: clientConversationId },
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      if (latestUserMessage) {
        await prisma.assistantMessage.create({
          data: {
            conversationId: existing.id,
            role: MessageRole.USER,
            content: latestUserMessage.content,
            metadata: { source: "request" } as Prisma.InputJsonValue,
          },
        });
      }

      return { conversationId: existing.id, clientId };
    }
  }

  const created = await prisma.assistantConversation.create({
    data: {
      organizationId: input.session.organization.id,
      unitId: input.session.membership.primaryUnitId,
      ownerId: input.session.user.id,
      clientId,
      title: buildConversationTitle(latestUserMessage?.content),
      routeContext: input.body.context?.route,
      metadata: buildConversationMetadata(input.body.context) as Prisma.InputJsonValue,
      messages: {
        create: input.body.messages.slice(-12).map((message) => ({
          role: toMessageRole(message.role),
          content: message.content,
          metadata: { source: "request" } as Prisma.InputJsonValue,
        })),
      },
    },
    select: { id: true },
  });

  return { conversationId: created.id, clientId };
}

export async function persistAssistantChatSuccess(input: PersistAssistantChatSuccessInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const assistantMessage = await tx.assistantMessage.create({
      data: {
        conversationId: input.conversationId,
        role: MessageRole.ASSISTANT,
        content: input.assistantContent,
        metadata: { source: "openai", requestId: input.requestId } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    await tx.assistantConversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    });

    await tx.aiUsageLog.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        userId: input.session.user.id,
        clientId: input.clientId,
        provider: AiProvider.OPENAI,
        module: AiModule.CHAT,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.totalTokens,
        latencyMs: input.latencyMs,
        requestId: input.requestId,
        traceSource: "assistant",
        assistantConversationId: input.conversationId,
        assistantMessageId: assistantMessage.id,
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

export async function persistAssistantChatFailure(input: PersistAssistantChatFailureInput): Promise<void> {
  const clientId = input.clientId ?? (await resolveAllowedClientId(input, prisma));

  await writeAiUsageLogSafely({
    organizationId: input.session.organization.id,
    unitId: input.session.membership.primaryUnitId ?? undefined,
    userId: input.session.user.id,
    clientId,
    provider: AiProvider.OPENAI,
    module: AiModule.CHAT,
    model: input.model,
    latencyMs: input.latencyMs,
    requestId: input.requestId,
    error: input.error,
    trace: {
      traceSource: "assistant",
      assistantConversationId: input.conversationId,
    },
  });
}

function toMessageRole(role: AssistantChatMessageInput["role"]): MessageRole {
  return role === "assistant" ? MessageRole.ASSISTANT : MessageRole.USER;
}

function buildConversationTitle(content: string | undefined): string {
  if (!content) {
    return "誠問 AI 對話";
  }

  return content.length > 28 ? `${content.slice(0, 28)}...` : content;
}

function buildConversationMetadata(context: AssistantChatContextInput | undefined): Record<string, string> {
  const metadata: Record<string, string> = {};

  if (context?.conversationId) {
    metadata.clientConversationId = context.conversationId;
  }

  if (context?.clientName) {
    metadata.clientName = context.clientName;
  }

  return metadata;
}

async function resolveAllowedClientId(
  input: { session: AppSession; body: AssistantChatBody },
  db: Pick<typeof prisma, "client">,
): Promise<string | undefined> {
  const clientId = input.body.context?.clientId;

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
