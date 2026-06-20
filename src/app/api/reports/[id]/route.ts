import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import {
  getReportForMember,
  updateReportForMember,
  updateReportInputSchema,
} from "@/lib/report/report-repository";

interface ReportRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: ReportRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const report = await getReportForMember(session, id);

    if (!report) {
      return apiErrorResponse(apiErrors.notFound("REPORT_NOT_FOUND", "Report was not found."));
    }

    return privateJsonResponse({ report });
  } catch (error) {
    return reportAuthErrorResponse(error);
  }
}

export async function PATCH(req: Request, ctx: ReportRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const parsed = await parseJsonBody(req, updateReportInputSchema, {
      error: "INVALID_REPORT_UPDATE",
      message: "Report update input is invalid.",
    });

    if (!parsed.success) {
      return parsed.response;
    }

    const result = await updateReportForMember(session, id, parsed.data);

    if (!result) {
      return apiErrorResponse(apiErrors.notFound("REPORT_NOT_FOUND", "Report was not found."));
    }

    if ("error" in result) {
      return apiErrorResponse(
        apiErrors.validation(result.error, { sectionId: ["Report section was not found."] }),
      );
    }

    return privateJsonResponse({ report: result });
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
