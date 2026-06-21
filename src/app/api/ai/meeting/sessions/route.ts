import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createMeetingSessionForMember,
  createMeetingSessionInputSchema,
  findLatestMeetingSessionForMember,
  findMeetingPayloadViolations,
} from "@/lib/interview/meeting-session-repository";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentMember();
    const url = new URL(req.url);
    const input = {
      clientId: url.searchParams.get("clientId") ?? undefined,
      visitPlanId: url.searchParams.get("visitPlanId") ?? undefined,
      currentSegmentId: url.searchParams.get("currentSegmentId") ?? undefined,
    };
    const blockedPayloadPaths = findMeetingPayloadViolations(input);

    if (blockedPayloadPaths.length > 0) {
      return Response.json(
        {
          error: "MEETING_PAYLOAD_BLOCKED",
          blockedPayloadPaths,
        },
        { status: 409 },
      );
    }

    if (!input.clientId && !input.visitPlanId) {
      return Response.json({ error: "MEETING_SESSION_SCOPE_REQUIRED" }, { status: 400 });
    }

    const parsedQuery = createMeetingSessionInputSchema.safeParse(input);

    if (!parsedQuery.success) {
      return Response.json(
        {
          error: "INVALID_MEETING_SESSION_INPUT",
          issues: parsedQuery.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const snapshot = await findLatestMeetingSessionForMember(session, parsedQuery.data);

    if (!snapshot) {
      return Response.json({
        status: "empty",
        safety: {
          scopeSource: "server_session",
          visibilityScope: "member-private",
          providerCallAttempted: false,
          aiUsageLogRequired: false,
          rawAudioStored: false,
          rawProviderPayloadStored: false,
          rawPrivateTranscriptSidecarStored: false,
          writesConfirmedCrmFact: false,
        },
      });
    }

    return Response.json({ status: "found", snapshot });
  } catch (error) {
    return authErrorResponse(error);
  }
}

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
