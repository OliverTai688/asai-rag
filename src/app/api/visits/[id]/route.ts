import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  getVisitPlanForMember,
  updateVisitPlanForMember,
  updateVisitPlanInputSchema,
} from "@/lib/visits/visit-plan-repository";

interface VisitRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: VisitRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const visit = await getVisitPlanForMember(session, id);

    if (!visit) {
      return Response.json({ error: "VISIT_PLAN_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(
      visit,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: Request, ctx: VisitRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const parsedBody = updateVisitPlanInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_VISIT_PLAN_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const visit = await updateVisitPlanForMember(session, id, parsedBody.data);

    if (!visit) {
      return Response.json({ error: "VISIT_PLAN_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(visit);
  } catch (error) {
    return authErrorResponse(error);
  }
}
