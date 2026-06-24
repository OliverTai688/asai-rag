import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getVisitRouteBStateProposalContextForMember } from "@/lib/visits/route-b-state-proposal-context-repository";

interface VisitRouteBStateProposalContextRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: VisitRouteBStateProposalContextRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const result = await getVisitRouteBStateProposalContextForMember(session, id);

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
