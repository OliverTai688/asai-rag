import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  appendVisitMeetingQuickNoteForMember,
  appendVisitMeetingQuickNoteInputSchema,
  findMeetingPayloadViolations,
} from "@/lib/interview/meeting-session-repository";

interface VisitMeetingQuickNotesRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: VisitMeetingQuickNotesRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id: visitPlanId } = await ctx.params;
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

    const parsedBody = appendVisitMeetingQuickNoteInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_MEETING_QUICK_NOTE_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await appendVisitMeetingQuickNoteForMember(session, visitPlanId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "VISIT_MEETING_QUICK_NOTE_SCOPE_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(result, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
