import OpenAI from "openai";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";
import {
  appendMeetingTurnForMember,
  getMeetingSessionSnapshotForMember,
} from "@/lib/interview/meeting-session-repository";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "whisper-1";

// Whisper accepts up to 25MB per request; a full meeting recording is transcribed once at the end.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
// Skip near-silent / empty blobs so we do not pay for noise.
const MIN_AUDIO_BYTES = 1200;

interface MeetingTranscribeRouteContext {
  params: Promise<{ sessionId: string }>;
}

/**
 * Server-side speech-to-text for the meeting mode (錄製整場會議 / 上傳音檔).
 *
 * Client meeting audio is streamed to OpenAI, transcribed once, and only the transcript
 * text is persisted (as a VOICE_FINAL_TRANSCRIPT turn on the current member's meeting
 * session). Raw audio is never stored. The handler is member-scoped, quota-guarded, and
 * writes an AiUsageLog on both success and failure. Set
 * `ENABLE_MEETING_AUDIO_TRANSCRIPTION=false` to hard-disable it (returns a guarded 503
 * with no provider call), e.g. before compliance sign-off.
 */
export async function POST(req: Request, ctx: MeetingTranscribeRouteContext) {
  const startedAt = Date.now();

  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;

    if (process.env.ENABLE_MEETING_AUDIO_TRANSCRIPTION === "false") {
      return Response.json(
        {
          error: "MEETING_AUDIO_TRANSCRIPTION_DISABLED",
          transcriptionEnabled: false,
          providerCallAttempted: false,
          rawAudioStored: false,
          message: "語音轉文字服務尚未啟用，請改為貼上逐字稿。",
        },
        { status: 503 },
      );
    }

    // Confirm the session belongs to the current member before touching the provider.
    const snapshot = await getMeetingSessionSnapshotForMember(session, sessionId);
    if (!snapshot) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    const quota = canUseAiModule(session, AiModule.MEETING);
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

    if (audio.size < MIN_AUDIO_BYTES) {
      return Response.json({ error: "AUDIO_TOO_SHORT" }, { status: 422 });
    }

    let text: string;
    try {
      const transcription = await client.audio.transcriptions.create({
        file: audio,
        model: MODEL,
        language: "zh",
      });
      text = (transcription.text ?? "").trim();

      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        provider: AiProvider.OPENAI,
        module: AiModule.MEETING,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        trace: { traceSource: "interview", interviewSessionId: sessionId },
      });

      await prisma.organization.update({
        where: { id: session.organization.id },
        data: { monthlyAiUsed: { increment: 1 } },
      });
    } catch (error) {
      await writeAiUsageLogSafely({
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId ?? undefined,
        userId: session.user.id,
        provider: AiProvider.OPENAI,
        module: AiModule.MEETING,
        model: MODEL,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Meeting transcription failed",
        trace: { traceSource: "interview", interviewSessionId: sessionId },
      });

      return Response.json(
        { error: error instanceof Error ? error.message : "Meeting transcription failed" },
        { status: 502 },
      );
    }

    if (!text) {
      return Response.json({ error: "EMPTY_TRANSCRIPT" }, { status: 422 });
    }

    // Persist transcript text only (VOICE_FINAL_TRANSCRIPT); raw audio is discarded.
    const result = await appendMeetingTurnForMember(session, sessionId, {
      role: "USER",
      modality: "VOICE_TRANSCRIPT_FALLBACK",
      source: "VOICE_FINAL_TRANSCRIPT",
      content: text,
      transcriptFinal: true,
      outlineSegmentId: "capture",
      occurredAt: new Date().toISOString(),
      issueTags: ["meeting-audio-transcript"],
      pqQuestionIds: [],
    });

    if (!result) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ text, rawAudioStored: false, ...result }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
