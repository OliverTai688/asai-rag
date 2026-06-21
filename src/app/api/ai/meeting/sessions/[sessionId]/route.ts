import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getMeetingSessionSnapshotForMember } from "@/lib/interview/meeting-session-repository";

interface MeetingSessionRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: MeetingSessionRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const snapshot = await getMeetingSessionSnapshotForMember(session, sessionId);

    if (!snapshot) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(snapshot);
  } catch (error) {
    return authErrorResponse(error);
  }
}
