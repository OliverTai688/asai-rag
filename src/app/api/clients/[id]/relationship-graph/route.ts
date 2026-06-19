import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getClientRelationshipGraphForMember } from "@/lib/clients/relationship-graph-repository";

interface ClientRelationshipGraphRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: ClientRelationshipGraphRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const result = await getClientRelationshipGraphForMember(session, id);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "FORBIDDEN") {
      return Response.json({ error: "CLIENT_FORBIDDEN" }, { status: 403 });
    }

    return Response.json(result.data, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
