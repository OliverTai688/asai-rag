import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { findMeetingPayloadViolations } from "@/lib/interview/meeting-session-repository";
import {
  getMeetingWritebackPreviewForMember,
  meetingWritebackInputSchema,
  saveMeetingWritebackConfirmation,
} from "@/lib/interview/meeting-writeback-repository";

interface MeetingWritebacksRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: MeetingWritebacksRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const preview = await getMeetingWritebackPreviewForMember(session, sessionId);

    if (!preview) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(preview);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: MeetingWritebacksRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
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

    const parsedBody = meetingWritebackInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_MEETING_WRITEBACK_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await saveMeetingWritebackConfirmation(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "summary_required") {
      return Response.json(
        {
          error: "MEETING_SUMMARY_REQUIRED",
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
