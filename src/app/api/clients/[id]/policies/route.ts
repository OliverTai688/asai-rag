import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createPolicyForClient,
  createPolicyInputSchema,
} from "@/lib/clients/client-repository";

interface PolicyRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: PolicyRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const parsedBody = createPolicyInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_POLICY_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const client = await createPolicyForClient(session, id, parsedBody.data);

    if (!client) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ client }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
