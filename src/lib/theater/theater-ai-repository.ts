import type { Prisma } from "@/generated/prisma/client";
import {
  AiModule,
  AiProvider,
  InteractionEventType,
  TheaterTurnRole,
} from "@/generated/prisma/enums";
import type { AppSession } from "@/lib/auth/session";
import { writeAiUsageLogSafely, type AiUsageTrace } from "@/lib/ai/usage-log";
import { prisma } from "@/lib/prisma";

// Accept any plausible record id (cuid, seed key like `demo_theater_*`, etc.).
// The actual DB lookup decides ownership; non-DB ids simply resolve to a fallback.
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{6,120}$/;

export type TheaterAiTurn = {
  role: "agent" | "client";
  content: string;
};

export type TheaterAiBody = {
  sessionId?: string;
  clientId?: string;
  personaType?: string;
  difficulty?: string;
  tension?: number;
  clientContext?: unknown;
  spinOutputs?: unknown;
  history?: TheaterAiTurn[];
};

type TheaterAiUsage = {
  model: string;
  requestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
};

type TheaterCharacterSuccessInput = {
  session: AppSession;
  body: TheaterAiBody;
  assistantContent: string;
  usage: TheaterAiUsage;
};

type TheaterScoreSuccessInput = {
  session: AppSession;
  body: TheaterAiBody;
  score: unknown;
  usage: TheaterAiUsage;
};

type TheaterFailureInput = {
  session: AppSession;
  body: TheaterAiBody;
  model: string;
  requestId?: string;
  latencyMs: number;
  error: string;
};

export async function persistTheaterCharacterSuccess(input: TheaterCharacterSuccessInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const clientId = await resolveAllowedClientId(input, tx);
    const theaterSessionId = await resolveTheaterSessionId(tx, input.session, input.body.sessionId);

    const interactionEvent = await tx.interactionEvent.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        clientId,
        actorId: input.session.user.id,
        type: InteractionEventType.THEATER,
        title: "AI 劇場客戶回覆",
        description: trimForDescription(input.assistantContent),
        metadata: {
          source: "api/ai/theater",
          sessionId: input.body.sessionId,
          theaterSessionId,
          personaType: input.body.personaType,
          difficulty: input.body.difficulty,
          tension: input.body.tension,
          history: input.body.history?.slice(-8) ?? [],
          assistantContent: input.assistantContent,
          requestId: input.usage.requestId,
          legacyDemoGate: true,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    // The AI plays the client, so its reply is a CLIENT turn. Only persist when the
    // session is a real DB TheaterSession; otherwise the row is a fallback trace.
    let theaterTurnId: string | undefined;
    if (theaterSessionId) {
      const turn = await tx.theaterTurn.create({
        data: {
          sessionId: theaterSessionId,
          role: TheaterTurnRole.CLIENT,
          content: input.assistantContent,
          metadata: { source: "api/ai/theater", requestId: input.usage.requestId } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      theaterTurnId = turn.id;
    }

    await writeTheaterUsage(tx, input.session, clientId, input.usage, {
      traceSource: theaterSessionId ? "theater" : "interaction_event_fallback",
      theaterSessionId,
      theaterTurnId,
      interactionEventId: interactionEvent.id,
    });
    await incrementAiCounter(tx, input.session.organization.id);
  });
}

export async function persistTheaterScoreSuccess(input: TheaterScoreSuccessInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const clientId = await resolveAllowedClientId(input, tx);
    const theaterSessionId = await resolveTheaterSessionId(tx, input.session, input.body.sessionId);

    const interactionEvent = await tx.interactionEvent.create({
      data: {
        organizationId: input.session.organization.id,
        unitId: input.session.membership.primaryUnitId,
        clientId,
        actorId: input.session.user.id,
        type: InteractionEventType.THEATER,
        title: "AI 劇場評分回饋",
        description: "已生成 AI 劇場演練評分與話術回饋。",
        metadata: {
          source: "api/ai/theater/score",
          sessionId: input.body.sessionId,
          theaterSessionId,
          personaType: input.body.personaType,
          history: input.body.history?.slice(-12) ?? [],
          score: input.score,
          requestId: input.usage.requestId,
          legacyDemoGate: true,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    await writeTheaterUsage(tx, input.session, clientId, input.usage, {
      traceSource: theaterSessionId ? "theater" : "interaction_event_fallback",
      theaterSessionId,
      interactionEventId: interactionEvent.id,
    });
    await incrementAiCounter(tx, input.session.organization.id);
  });
}

export async function persistTheaterFailure(input: TheaterFailureInput): Promise<void> {
  const clientId = await resolveAllowedClientId(input, prisma);
  const theaterSessionId = await resolveTheaterSessionId(prisma, input.session, input.body.sessionId);

  await writeAiUsageLogSafely({
    organizationId: input.session.organization.id,
    unitId: input.session.membership.primaryUnitId ?? undefined,
    userId: input.session.user.id,
    clientId,
    provider: AiProvider.OPENAI,
    module: AiModule.THEATER,
    model: input.model,
    latencyMs: input.latencyMs,
    requestId: input.requestId,
    error: input.error,
    trace: {
      traceSource: theaterSessionId ? "theater" : "interaction_event_fallback",
      theaterSessionId,
    },
  });
}

async function resolveTheaterSessionId(
  db: Pick<typeof prisma, "theaterSession">,
  session: AppSession,
  sessionIdCandidate: string | undefined,
): Promise<string | undefined> {
  if (!sessionIdCandidate || !SESSION_ID_PATTERN.test(sessionIdCandidate)) {
    return undefined;
  }

  const dbSession = await db.theaterSession.findFirst({
    where: {
      id: sessionIdCandidate,
      organizationId: session.organization.id,
    },
    select: { id: true },
  });

  return dbSession?.id;
}

async function resolveAllowedClientId(
  input: { session: AppSession; body: TheaterAiBody },
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

async function writeTheaterUsage(
  tx: Prisma.TransactionClient,
  session: AppSession,
  clientId: string | undefined,
  usage: TheaterAiUsage,
  trace: AiUsageTrace,
) {
  await tx.aiUsageLog.create({
    data: {
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId,
      userId: session.user.id,
      clientId,
      provider: AiProvider.OPENAI,
      module: AiModule.THEATER,
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      latencyMs: usage.latencyMs,
      requestId: usage.requestId,
      traceSource: trace.traceSource,
      theaterSessionId: trace.theaterSessionId,
      theaterTurnId: trace.theaterTurnId,
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
    return trimmed || "AI 劇場已回覆。";
  }

  return `${trimmed.slice(0, 180)}...`;
}
