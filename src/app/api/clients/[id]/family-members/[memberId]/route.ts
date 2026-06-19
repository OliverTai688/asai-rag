import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  deleteFamilyMemberForClient,
  updateFamilyMemberForClient,
  updateFamilyMemberInputSchema,
} from "@/lib/clients/client-repository";

interface FamilyMemberItemRouteContext {
  params: Promise<{ id: string; memberId: string }>;
}

export async function PATCH(req: Request, ctx: FamilyMemberItemRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id, memberId } = await ctx.params;
    const parsedBody = updateFamilyMemberInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_FAMILY_MEMBER_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await updateFamilyMemberForClient(session, id, memberId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "FAMILY_MEMBER_NOT_FOUND" }, { status: 404 });
    }

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ client: result });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(_req: Request, ctx: FamilyMemberItemRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id, memberId } = await ctx.params;
    const client = await deleteFamilyMemberForClient(session, id, memberId);

    if (!client) {
      return Response.json({ error: "FAMILY_MEMBER_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ client });
  } catch (error) {
    return authErrorResponse(error);
  }
}
