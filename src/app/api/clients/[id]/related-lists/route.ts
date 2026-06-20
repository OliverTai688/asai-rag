import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getClientRelatedListsForMember } from "@/lib/clients/client-related-lists-repository";

interface ClientRelatedListsRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: ClientRelatedListsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const result = await getClientRelatedListsForMember(session, id);

    if (result.status === "NOT_FOUND") {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "FORBIDDEN") {
      return Response.json({ error: "CLIENT_FORBIDDEN" }, { status: 403 });
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
