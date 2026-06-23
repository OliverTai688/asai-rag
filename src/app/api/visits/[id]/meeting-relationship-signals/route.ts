import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getVisitMeetingRelationshipSignalDeckForMember } from "@/lib/visits/meeting-relationship-signal-repository";

interface VisitMeetingRelationshipSignalsRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: VisitMeetingRelationshipSignalsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const result = await getVisitMeetingRelationshipSignalDeckForMember(session, id);

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
