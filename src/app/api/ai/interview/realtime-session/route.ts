import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import { prisma } from "@/lib/prisma";
import {
  buildOpenAIRealtimeClientSecretRequest,
  createDryRunRealtimeClientSecret,
  INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS,
  INTERVIEW_REALTIME_MODEL,
  OPENAI_REALTIME_CLIENT_SECRET_URL,
  realtimeSessionRequestSchema,
  responseContainsServerSecret,
  sanitizeRealtimeClientSecretResponse,
} from "@/lib/interview/realtime-bff";

export const runtime = "nodejs";

const SESSION_INSTRUCTIONS = `你是「誠問 AI 訪談 Agent」的中文即時語音模式。
規則：
1. 全程使用繁體中文與自然口語。
2. 一次只問一個問題，回答簡短，不急著下結論。
3. 區分已確認事實、合理推論與待確認，不把推論說成事實。
4. 不做商品建議、不保證、不製造恐懼壓迫。
5. 若使用者打斷，立刻停止目前回覆並回到聆聽。`;

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const session = await requireCurrentMember();
    const parsedBody = realtimeSessionRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_REALTIME_SESSION_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    const quota = shouldForceQuotaExceededForQa(req, body)
      ? { allowed: false, code: "QUOTA_EXCEEDED" as const, remaining: 0 }
      : canUseAiModule(session, AiModule.INTERVIEW);

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

    const clientId = await resolveAllowedClientId(session.organization.id, session.user.id, body.clientId);
    const dryRun = body.dryRun === true && process.env.NODE_ENV !== "production";

    if (dryRun) {
      const response = createDryRunRealtimeClientSecret({
        sessionId: body.sessionId,
        model: INTERVIEW_REALTIME_MODEL,
        ttlSeconds: INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS,
      });

      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        clientId,
        provider: AiProvider.MOCK,
        module: AiModule.INTERVIEW,
        model: INTERVIEW_REALTIME_MODEL,
        latencyMs: Date.now() - startedAt,
        requestId: response.session.id,
      });

      return Response.json({
        ...response,
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId,
        clientId,
        usageLogged: true,
        mode: "dry-run",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        clientId,
        provider: AiProvider.OPENAI,
        module: AiModule.INTERVIEW,
        model: INTERVIEW_REALTIME_MODEL,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "REALTIME_PROVIDER_UNCONFIGURED" }, { status: 503 });
    }

    const providerResponse = await fetch(OPENAI_REALTIME_CLIENT_SECRET_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildOpenAIRealtimeClientSecretRequest({
          instructions: SESSION_INSTRUCTIONS,
          model: INTERVIEW_REALTIME_MODEL,
          ttlSeconds: INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS,
        }),
      ),
      cache: "no-store",
    });
    const providerBody = (await providerResponse.json().catch(() => ({}))) as unknown;

    if (!providerResponse.ok) {
      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        clientId,
        provider: AiProvider.OPENAI,
        module: AiModule.INTERVIEW,
        model: INTERVIEW_REALTIME_MODEL,
        latencyMs: Date.now() - startedAt,
        error: `Realtime provider failed with ${providerResponse.status}`,
      });

      return Response.json(
        {
          error: "REALTIME_PROVIDER_ERROR",
          providerStatus: providerResponse.status,
        },
        { status: 502 },
      );
    }

    const sanitized = sanitizeRealtimeClientSecretResponse(providerBody, {
      model: INTERVIEW_REALTIME_MODEL,
      ttlSeconds: INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS,
      provider: "OPENAI",
    });

    if (responseContainsServerSecret(sanitized, process.env.OPENAI_API_KEY)) {
      throw new Error("Realtime session sanitization failed.");
    }

    await writeAiUsageLogSafely({
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId ?? undefined,
      userId: session.user.id,
      clientId,
      provider: AiProvider.OPENAI,
      module: AiModule.INTERVIEW,
      model: INTERVIEW_REALTIME_MODEL,
      latencyMs: Date.now() - startedAt,
      requestId: sanitized.session.id,
    });

    return Response.json({
      ...sanitized,
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
        provider: AiProvider.OPENAI,
        module: AiModule.INTERVIEW,
        model: INTERVIEW_REALTIME_MODEL,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Realtime session request failed",
      });
    } catch {
      return authErrorResponse(error);
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Realtime session request failed" },
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

function shouldForceQuotaExceededForQa(req: Request, body: { dryRun?: boolean }): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    body.dryRun === true &&
    req.headers.get("x-asai-qa-force-quota-exceeded") === "true"
  );
}
