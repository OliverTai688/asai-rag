import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  generateInterviewPlan,
  generateInterviewPlanInputSchema,
} from "@/lib/interview/interview-reflection-planning-repository";

interface GenerateInterviewPlanRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: Request, ctx: GenerateInterviewPlanRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsedBody = generateInterviewPlanInputSchema.safeParse(await req.json().catch(() => ({})));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_INTERVIEW_PLAN_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await generateInterviewPlan(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "INTERVIEW_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
