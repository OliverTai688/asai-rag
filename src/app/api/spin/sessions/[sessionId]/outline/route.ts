import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { buildSpinOutlineForMember, spinNoProviderProof } from "@/lib/spin/spin-session-repository";

interface SpinSessionOutlineRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_req: Request, ctx: SpinSessionOutlineRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const result = await buildSpinOutlineForMember(session, sessionId);

    if (!result) {
      return Response.json({ error: "SPIN_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({
      outline: result.outline,
      session: result.snapshot.session,
      proof: spinNoProviderProof("POST /api/spin/sessions/[sessionId]/outline is deterministic and reads persisted SPIN state only."),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
