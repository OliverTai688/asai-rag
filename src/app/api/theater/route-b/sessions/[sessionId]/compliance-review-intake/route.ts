import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getRouteBComplianceReviewIntakeForMember } from "@/lib/theater/route-b-session-bff-repository";

interface RouteBComplianceReviewIntakeRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: RouteBComplianceReviewIntakeRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const result = await getRouteBComplianceReviewIntakeForMember(session, sessionId);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "ROUTE_B_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "EMPTY") {
      return Response.json(
        {
          status: "EMPTY",
          actionId: "route-b-red-line-compliance-review-intake",
          providerCallAttempted: false,
          aiUsageLogWritten: false,
          writesConfirmedCrmFact: false,
          triggersExternalNotification: false,
          noFormalFinding: true,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
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
