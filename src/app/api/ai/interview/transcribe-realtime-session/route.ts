import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import {
  buildOpenAIRealtimeTranscriptionSecretRequest,
  INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS,
  INTERVIEW_REALTIME_TRANSCRIBE_MODEL,
  OPENAI_REALTIME_CLIENT_SECRET_URL,
  responseContainsServerSecret,
  sanitizeRealtimeClientSecretResponse,
} from "@/lib/interview/realtime-bff";

export const runtime = "nodejs";

// WebRTC SDP handshake endpoint the browser dials with the ephemeral secret.
const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

/**
 * Mints a short-lived, transcription-only OpenAI Realtime ephemeral secret so the
 * browser can stream microphone audio over WebRTC and receive live transcript deltas.
 *
 * The server API key never leaves this handler — only the sanitized ephemeral secret
 * is returned. Quota-guarded and usage-logged. The chunked `/transcribe` route remains
 * the reliable fallback when realtime is unavailable.
 */
export async function POST() {
  const startedAt = Date.now();

  try {
    const session = await requireCurrentMember();

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

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "REALTIME_PROVIDER_UNCONFIGURED" }, { status: 503 });
    }

    const providerResponse = await fetch(OPENAI_REALTIME_CLIENT_SECRET_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildOpenAIRealtimeTranscriptionSecretRequest()),
      cache: "no-store",
    });
    const providerBody = (await providerResponse.json().catch(() => ({}))) as unknown;

    if (!providerResponse.ok) {
      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        provider: AiProvider.OPENAI,
        module: AiModule.INTERVIEW,
        model: INTERVIEW_REALTIME_TRANSCRIBE_MODEL,
        latencyMs: Date.now() - startedAt,
        error: `Realtime transcription provider failed with ${providerResponse.status}`,
      });

      return Response.json(
        { error: "REALTIME_PROVIDER_ERROR", providerStatus: providerResponse.status },
        { status: 502 },
      );
    }

    const sanitized = sanitizeRealtimeClientSecretResponse(providerBody, {
      model: INTERVIEW_REALTIME_TRANSCRIBE_MODEL,
      ttlSeconds: INTERVIEW_REALTIME_CLIENT_SECRET_TTL_SECONDS,
      provider: "OPENAI",
    });

    if (responseContainsServerSecret(sanitized, process.env.OPENAI_API_KEY)) {
      throw new Error("Realtime transcription session sanitization failed.");
    }

    await writeAiUsageLogSafely({
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId ?? undefined,
      userId: session.user.id,
      provider: AiProvider.OPENAI,
      module: AiModule.INTERVIEW,
      model: INTERVIEW_REALTIME_TRANSCRIBE_MODEL,
      latencyMs: Date.now() - startedAt,
      requestId: sanitized.session.id,
    });

    return Response.json({
      clientSecret: sanitized.clientSecret,
      model: sanitized.model,
      callsUrl: OPENAI_REALTIME_CALLS_URL,
      usageLogged: true,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
