import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  generateAndPersistInterviewReflection,
  generateInterviewReflectionInputSchema,
} from "@/lib/interview/interview-reflection-planning-repository";

interface GenerateInterviewReflectionRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: Request, ctx: GenerateInterviewReflectionRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsedBody = generateInterviewReflectionInputSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_INTERVIEW_REFLECTION_GENERATION_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await generateAndPersistInterviewReflection(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "INTERVIEW_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
