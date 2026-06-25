import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  backfillRelationshipEdgesForClient,
  listRelationshipEdgesForClient,
} from "@/lib/clients/relationship-edge-repository";

interface RelationshipEdgesRouteContext {
  params: Promise<{ id: string }>;
}

const NO_STORE_HEADERS = { "cache-control": "no-store" } as const;

export async function GET(_req: Request, ctx: RelationshipEdgesRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const result = await listRelationshipEdgesForClient(session, id);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404, headers: NO_STORE_HEADERS });
    }
    if (result.status === "FORBIDDEN") {
      return Response.json({ error: "CLIENT_FORBIDDEN" }, { status: 403, headers: NO_STORE_HEADERS });
    }

    return Response.json({ edges: result.data }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(_req: Request, ctx: RelationshipEdgesRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const result = await backfillRelationshipEdgesForClient(session, id);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404, headers: NO_STORE_HEADERS });
    }
    if (result.status === "FORBIDDEN") {
      return Response.json({ error: "CLIENT_FORBIDDEN" }, { status: 403, headers: NO_STORE_HEADERS });
    }

    return Response.json(result.data, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return authErrorResponse(error);
  }
}
