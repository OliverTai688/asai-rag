import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  getClientForMember,
  updateClientForMember,
  updateClientInputSchema,
} from "@/lib/clients/client-repository";

interface ClientRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: ClientRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const client = await getClientForMember(session, id);

    if (!client) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ client });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: Request, ctx: ClientRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const parsedBody = updateClientInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_CLIENT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const client = await updateClientForMember(session, id, parsedBody.data);

    if (!client) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ client });
  } catch (error) {
    return authErrorResponse(error);
  }
}
