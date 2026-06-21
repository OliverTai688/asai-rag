import { z } from "zod";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import { findMeetingPayloadViolations } from "@/lib/interview/meeting-session-repository";
import { generateMeetingSummaryForMember, readMeetingSummaryForMember } from "@/lib/interview/meeting-summary-repository";

const generateMeetingSummaryInputSchema = z
  .object({
    mode: z.literal("DETERMINISTIC_NO_PROVIDER").default("DETERMINISTIC_NO_PROVIDER"),
    overwrite: z.boolean().default(true),
  })
  .strict();

interface MeetingSummaryRouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, ctx: MeetingSummaryRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const result = await readMeetingSummaryForMember(session, sessionId);

    if (!result) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "empty") {
      return Response.json(result);
    }

    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: MeetingSummaryRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { sessionId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
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

    const parsedBody = generateMeetingSummaryInputSchema.safeParse(body ?? {});

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_MEETING_SUMMARY_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await generateMeetingSummaryForMember(session, sessionId, parsedBody.data);

    if (!result) {
      return Response.json({ error: "MEETING_SESSION_NOT_FOUND" }, { status: 404 });
    }

    if (result.status === "source_empty") {
      return Response.json(
        {
          error: "MEETING_SUMMARY_SOURCE_EMPTY",
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    if (result.status === "already_exists") {
      return Response.json(
        {
          error: "MEETING_SUMMARY_ALREADY_EXISTS",
          summary: result.summary,
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    if (result.status === "safety_failed") {
      return Response.json(
        {
          error: "MEETING_SUMMARY_SAFETY_FAILED",
          safetyFailures: result.safetyFailures,
          safety: result.safety,
        },
        { status: 409 },
      );
    }

    return Response.json(result, { status: result.status === "created" ? 201 : 200 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
