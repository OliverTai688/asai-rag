import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createSpinSessionForMember,
  createSpinSessionInputSchema,
  listSpinSessionsForMember,
  spinNoProviderProof,
} from "@/lib/spin/spin-session-repository";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const snapshots = await listSpinSessionsForMember(session);

    return Response.json({
      sessions: snapshots.map((snapshot) => snapshot.session),
      proof: spinNoProviderProof("GET /api/spin/sessions uses persisted spin_sessions and does not call a provider."),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsedBody = createSpinSessionInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_SPIN_SESSION_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const snapshot = await createSpinSessionForMember(session, parsedBody.data);

    if (!snapshot) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(snapshot, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
