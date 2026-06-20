import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import {
  shareReportForMember,
  shareReportInputSchema,
} from "@/lib/report/report-repository";

interface ReportShareRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: ReportShareRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const parsed = await parseJsonBody(req, shareReportInputSchema, {
      error: "INVALID_REPORT_SHARE_INPUT",
      message: "Report share input is invalid.",
      fallbackBody: {},
    });

    if (!parsed.success) {
      return parsed.response;
    }

    const report = await shareReportForMember(session, id, parsed.data);

    if (!report) {
      return apiErrorResponse(apiErrors.notFound("REPORT_NOT_FOUND", "Report was not found."));
    }

    return privateJsonResponse({ report });
  } catch (error) {
    return reportAuthErrorResponse(error);
  }
}

function reportAuthErrorResponse(error: unknown): Response {
  if (error instanceof AuthRequiredError) {
    return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
  }

  throw error;
}
