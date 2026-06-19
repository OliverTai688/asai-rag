import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  appendInterviewTurnInputSchema,
  appendPersistentInterviewTurn,
} from "@/lib/interview/interview-persistence-repository";

interface InterviewTurnsRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: Request, ctx: InterviewTurnsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsedBody = appendInterviewTurnInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_INTERVIEW_TURN_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await appendPersistentInterviewTurn(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "INTERVIEW_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
