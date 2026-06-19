import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createInterviewReflectionInputSchema,
  createPersistentInterviewReflection,
} from "@/lib/interview/interview-persistence-repository";

interface InterviewReflectionsRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: Request, ctx: InterviewReflectionsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsedBody = createInterviewReflectionInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_INTERVIEW_REFLECTION_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const reflection = await createPersistentInterviewReflection(session, sessionId, parsedBody.data);

    if (!reflection) {
      return Response.json({ error: "INTERVIEW_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ reflection }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
