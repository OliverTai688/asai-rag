import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import { prisma } from "@/lib/prisma";
import {
  findRealtimeEventPayloadViolations,
  INTERVIEW_REALTIME_MODEL,
  mirrorRealtimeEventToMemoryCandidates,
  realtimeEventSchema,
} from "@/lib/interview/realtime-bff";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const session = await requireCurrentMember();
    const rawBody = await req.json().catch(() => null);
    const violations = findRealtimeEventPayloadViolations(rawBody);

    if (violations.length > 0) {
      return Response.json(
        {
          error: "REALTIME_EVENT_REJECTED_SECRET_OR_RAW_AUDIO",
          rejectedFields: violations,
          rawAudioStored: false,
        },
        { status: 400 },
      );
    }

    const parsedBody = realtimeEventSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_REALTIME_EVENT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const quota = canUseAiModule(session, AiModule.INTERVIEW);

    if (!quota.allowed) {
      return Response.json(
        {
          error: quota.code,
          remaining: quota.remaining,
          message: "AI 使用額度已用完，請聯絡管理員或升級方案。",
        },
        { status: 429 },
      );
    }

    const body = parsedBody.data;
    const clientId = await resolveAllowedClientId(session.organization.id, session.user.id, body.clientId);
    const mirrored = mirrorRealtimeEventToMemoryCandidates(body, {
      organizationId: session.organization.id,
      memberId: session.user.id,
      unitId: session.membership.primaryUnitId,
      clientId,
    });

    await writeAiUsageLogSafely({
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId ?? undefined,
      userId: session.user.id,
      clientId,
      provider: AiProvider.MOCK,
      module: AiModule.INTERVIEW,
      model: `${INTERVIEW_REALTIME_MODEL}:event-mirror`,
      latencyMs: Date.now() - startedAt,
      requestId: mirrored.mirroredEventId,
    });

    return Response.json({
      ...mirrored,
      memoryCandidates: mirrored.memoryCandidates.map((memory) => ({
        id: memory.id,
        kind: memory.kind,
        dataClass: memory.dataClass,
        source: memory.source,
        confidence: memory.confidence,
        retentionPolicy: memory.retentionPolicy,
        visibilityScope: memory.visibilityScope,
        text: memory.text,
        clientId: memory.clientId,
        interviewSessionId: memory.interviewSessionId,
      })),
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId,
      clientId,
      usageLogged: true,
    });
  } catch (error) {
    try {
      const session = await requireCurrentMember();
      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        provider: AiProvider.MOCK,
        module: AiModule.INTERVIEW,
        model: `${INTERVIEW_REALTIME_MODEL}:event-mirror`,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Realtime event mirror failed",
      });
    } catch {
      return authErrorResponse(error);
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Realtime event mirror failed" },
      { status: 500 },
    );
  }
}

async function resolveAllowedClientId(
  organizationId: string,
  userId: string,
  clientId?: string,
): Promise<string | undefined> {
  if (!clientId) return undefined;

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId,
      ownerId: userId,
    },
    select: { id: true },
  });

  return client?.id;
}
