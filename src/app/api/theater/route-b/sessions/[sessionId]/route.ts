import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getRouteBSessionForMember } from "@/lib/theater/route-b-session-bff-repository";

interface RouteBSessionRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: RouteBSessionRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const result = await getRouteBSessionForMember(session, sessionId);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "ROUTE_B_SESSION_NOT_FOUND" }, { status: 404 });
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
