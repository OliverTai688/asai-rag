import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createInterviewReportInputSchema,
  createReportFromInterview,
  listReportsForClient,
} from "@/lib/report/report-repository";

interface ClientReportsRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: ClientReportsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const reports = await listReportsForClient(session, id);

    if (reports === null) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    return Response.json(
      { reports },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request, ctx: ClientReportsRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const parsedBody = createInterviewReportInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_INTERVIEW_REPORT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const report = await createReportFromInterview(session, id, parsedBody.data);

    if (!report) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ report }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
