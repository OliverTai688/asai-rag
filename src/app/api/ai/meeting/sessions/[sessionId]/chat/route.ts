import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { generateProviderMemoryChatForSession } from "@/lib/interview/meeting-memory-chat-provider";
import {
  answerMeetingMemoryChatForSession,
  findMeetingMemoryChatPayloadViolations,
  meetingMemoryChatInputSchema,
} from "@/lib/interview/meeting-memory-chat-repository";

interface MeetingMemoryChatRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: Request, ctx: MeetingMemoryChatRouteContext) {
  const startedAt = Date.now();

  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const blockedPayloadPaths = findMeetingMemoryChatPayloadViolations(body);

    if (blockedPayloadPaths.length > 0) {
      return Response.json(
        {
          error: "MEETING_MEMORY_CHAT_PAYLOAD_BLOCKED",
          blockedPayloadPaths,
        },
        { status: 409 },
      );
    }

    const parsedBody = meetingMemoryChatInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_MEETING_MEMORY_CHAT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (parsedBody.data.mode === "PROVIDER_JSON") {
      const providerResult = await generateProviderMemoryChatForSession(req, session, sessionId, parsedBody.data, startedAt);
      return providerResult.response;
    }

    const result = await answerMeetingMemoryChatForSession(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "client_scope_missing") {
      return Response.json(
        {
          error: "MEETING_CLIENT_SCOPE_REQUIRED",
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    if (result.status === "grounding_empty") {
      return Response.json(
        {
          error: "MEETING_MEMORY_GROUNDING_EMPTY",
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    if (result.status === "safety_failed") {
      return Response.json(
        {
          error: "MEETING_MEMORY_CHAT_SAFETY_FAILED",
          safetyFailures: result.safetyFailures,
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
