import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  getInterviewWritebackPreview,
  interviewWritebackInputSchema,
  saveInterviewWritebackConfirmation,
} from "@/lib/interview/interview-writeback-repository";

interface InterviewWritebacksRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: InterviewWritebacksRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const preview = await getInterviewWritebackPreview(session, sessionId);

    if (!preview) {
      return Response.json({ error: "INTERVIEW_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(preview);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: InterviewWritebacksRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsedBody = interviewWritebackInputSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_INTERVIEW_WRITEBACK_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await saveInterviewWritebackConfirmation(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "INTERVIEW_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
