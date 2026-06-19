import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { getTheaterClientBuildForMember } from "@/lib/theater/client-build-repository";

interface TheaterClientBuildRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(_req: Request, ctx: TheaterClientBuildRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { clientId } = await ctx.params;
    const result = await getTheaterClientBuildForMember(session, clientId);

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
