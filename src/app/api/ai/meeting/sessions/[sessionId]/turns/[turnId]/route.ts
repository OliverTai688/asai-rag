import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  deleteMeetingNoteTurnForMember,
  findMeetingPayloadViolations,
  updateMeetingNoteInputSchema,
  updateMeetingNoteTurnForMember,
} from "@/lib/interview/meeting-session-repository";

interface MeetingTurnRouteContext {
  params: Promise<{ sessionId: string; turnId: string }>;
}

export async function PATCH(req: Request, ctx: MeetingTurnRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId, turnId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const blockedPayloadPaths = findMeetingPayloadViolations(body);

    if (blockedPayloadPaths.length > 0) {
      return Response.json({ error: "MEETING_PAYLOAD_BLOCKED", blockedPayloadPaths }, { status: 409 });
    }

    const parsedBody = updateMeetingNoteInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        { error: "INVALID_MEETING_NOTE_INPUT", issues: parsedBody.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await updateMeetingNoteTurnForMember(session, sessionId, turnId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "MEETING_NOTE_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(_req: Request, ctx: MeetingTurnRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId, turnId } = await ctx.params;
    const result = await deleteMeetingNoteTurnForMember(session, sessionId, turnId);

    if (!result) {
      return Response.json({ error: "MEETING_NOTE_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result, { status: 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
