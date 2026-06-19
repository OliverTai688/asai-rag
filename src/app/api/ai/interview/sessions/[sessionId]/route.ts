import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getPersistentInterviewSessionSnapshot } from "@/lib/interview/interview-persistence-repository";

interface InterviewSessionRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: InterviewSessionRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const snapshot = await getPersistentInterviewSessionSnapshot(session, sessionId);

    if (!snapshot) {
      return Response.json({ error: "INTERVIEW_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(snapshot);
  } catch (error) {
    return authErrorResponse(error);
  }
}
