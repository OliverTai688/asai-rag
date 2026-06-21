import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  appendMeetingTurnForMember,
  appendMeetingTurnInputSchema,
  findMeetingPayloadViolations,
} from "@/lib/interview/meeting-session-repository";

interface MeetingTurnsRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: Request, ctx: MeetingTurnsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const blockedPayloadPaths = findMeetingPayloadViolations(body);

    if (blockedPayloadPaths.length > 0) {
      return Response.json(
        {
          error: "MEETING_PAYLOAD_BLOCKED",
          blockedPayloadPaths,
        },
        { status: 409 },
      );
    }

    const parsedBody = appendMeetingTurnInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_MEETING_TURN_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await appendMeetingTurnForMember(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
