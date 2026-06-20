import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  appendSpinMessageForMember,
  appendSpinMessageInputSchema,
} from "@/lib/spin/spin-session-repository";

interface SpinSessionMessagesRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: Request, ctx: SpinSessionMessagesRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const parsedBody = appendSpinMessageInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_SPIN_MESSAGE_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const snapshot = await appendSpinMessageForMember(session, sessionId, parsedBody.data);

    if (!snapshot) {
      return Response.json({ error: "SPIN_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(snapshot, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
