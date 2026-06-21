import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createMeetingSessionForMember,
  createMeetingSessionInputSchema,
  findMeetingPayloadViolations,
} from "@/lib/interview/meeting-session-repository";

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const body = await req.json().catch(() => null);
    const blockedPayloadPaths = findMeetingPayloadViolations(body);

    if (blockedPayloadPaths.length > 0) {
      return Response.json(
        {
          error: "MEETING_PAYLOAD_BLOCKED",
          blockedPayloadPaths,
        },
        { status: 409 },
      );
    }

    const parsedBody = createMeetingSessionInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_MEETING_SESSION_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const snapshot = await createMeetingSessionForMember(session, parsedBody.data);

    if (!snapshot) {
      return Response.json({ error: "MEETING_SCOPE_NOT_FOUND_OR_NOT_OWNED" }, { status: 404 });
    }

    return Response.json(snapshot, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
