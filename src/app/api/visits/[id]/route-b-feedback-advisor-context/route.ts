import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getVisitRouteBFeedbackAdvisorContextForMember } from "@/lib/visits/route-b-feedback-advisor-context-repository";

interface VisitRouteBFeedbackAdvisorContextRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: VisitRouteBFeedbackAdvisorContextRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const result = await getVisitRouteBFeedbackAdvisorContextForMember(session, id);

    if (result.status === "VISIT_PLAN_NOT_FOUND") {
      return Response.json({ error: "VISIT_PLAN_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result.data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
