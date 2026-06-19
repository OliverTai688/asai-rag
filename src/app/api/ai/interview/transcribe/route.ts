import OpenAI from "openai";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "whisper-1";

// Hard cap on accepted audio payload — a single voice chunk, not a file upload.
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
// Skip near-silent / empty blobs so we do not pay for noise.
const MIN_AUDIO_BYTES = 1200;

/**
 * Server-side Chinese speech-to-text for the interview voice mode.
 *
 * The browser Web Speech API depends on an external cloud speech service that is
 * unreachable in several supported browsers (notably Edge on macOS, which returns a
 * `network` error). Routing audio through OpenAI keeps transcription working in every
 * browser, scoped to the current member, quota-guarded, and logged for cost tracking.
 * Raw audio is never persisted — only the returned transcript text leaves this handler.
 */
export async function POST(req: Request) {
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
      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const formData = await req.formData().catch(() => null);
    const audio = formData?.get("audio");

    if (!(audio instanceof File)) {
      return Response.json({ error: "INVALID_AUDIO_INPUT" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: "AUDIO_TOO_LARGE" }, { status: 413 });
    }

    // Too small to contain speech — return empty transcript without calling the provider.
    if (audio.size < MIN_AUDIO_BYTES) {
      return Response.json({ text: "" });
    }

    try {
      const transcription = await client.audio.transcriptions.create({
        file: audio,
        model: MODEL,
        language: "zh",
      });

      const text = (transcription.text ?? "").trim();

      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        provider: AiProvider.OPENAI,
        module: AiModule.INTERVIEW,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        trace: { traceSource: "interview" },
      });

      await prisma.organization.update({
        where: { id: session.organization.id },
        data: { monthlyAiUsed: { increment: 1 } },
      });

      return Response.json({ text });
    } catch (error) {
      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        provider: AiProvider.OPENAI,
        module: AiModule.INTERVIEW,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Interview transcription failed",
        trace: { traceSource: "interview" },
      });

      return Response.json(
        { error: error instanceof Error ? error.message : "Interview transcription failed" },
        { status: 500 },
      );
    }
  } catch (error) {
    return authErrorResponse(error);
  }
}
