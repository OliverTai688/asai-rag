import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { generateProviderMemoryChatForClient } from "@/lib/interview/meeting-memory-chat-provider";
import {
  answerClientMemoryChatForMember,
  findMeetingMemoryChatPayloadViolations,
  meetingMemoryChatInputSchema,
} from "@/lib/interview/meeting-memory-chat-repository";

interface ClientMemoryChatRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function POST(req: Request, ctx: ClientMemoryChatRouteContext) {
  const startedAt = Date.now();

  try {
    const session = await requireCurrentMember();
    const { clientId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const blockedPayloadPaths = findMeetingMemoryChatPayloadViolations(body);

    if (blockedPayloadPaths.length > 0) {
      return Response.json(
        {
          error: "CLIENT_MEMORY_CHAT_PAYLOAD_BLOCKED",
          blockedPayloadPaths,
        },
        { status: 409 },
      );
    }

    const parsedBody = meetingMemoryChatInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_CLIENT_MEMORY_CHAT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (parsedBody.data.mode === "PROVIDER_JSON") {
      const providerResult = await generateProviderMemoryChatForClient(req, session, clientId, parsedBody.data, startedAt);
      return providerResult.response;
    }

    const result = await answerClientMemoryChatForMember(session, clientId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "CLIENT_MEMORY_CHAT_FORBIDDEN" }, { status: 403 });
    }

    if (result.status === "grounding_empty") {
      return Response.json(
        {
          error: "CLIENT_MEMORY_GROUNDING_EMPTY",
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    if (result.status === "safety_failed") {
      return Response.json(
        {
          error: "CLIENT_MEMORY_CHAT_SAFETY_FAILED",
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
