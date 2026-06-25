import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createFamilyMemberForClient,
  createFamilyMemberInputSchema,
} from "@/lib/clients/client-repository";

interface FamilyMemberRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: FamilyMemberRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const parsedBody = createFamilyMemberInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_FAMILY_MEMBER_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await createFamilyMemberForClient(session, id, parsedBody.data);

    if (!result) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ client: result }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
