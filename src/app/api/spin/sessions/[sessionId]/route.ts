import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  getSpinSessionForMember,
  updateSpinSessionForMember,
  updateSpinSessionInputSchema,
} from "@/lib/spin/spin-session-repository";

interface SpinSessionRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: SpinSessionRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const snapshot = await getSpinSessionForMember(session, sessionId);

    if (!snapshot) {
      return Response.json({ error: "SPIN_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(snapshot);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: Request, ctx: SpinSessionRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsedBody = updateSpinSessionInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_SPIN_SESSION_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await updateSpinSessionForMember(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "SPIN_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 409 });
    }

    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
