import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import {
  createReportForMember,
  createReportInputSchema,
  listReportsForMember,
} from "@/lib/report/report-repository";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentMember();
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId")?.trim() || undefined;
    const reports = await listReportsForMember(session, { clientId });

    return privateJsonResponse({ reports });
  } catch (error) {
    return reportAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsed = await parseJsonBody(req, createReportInputSchema, {
      error: "INVALID_REPORT_INPUT",
      message: "Report input is invalid.",
    });

    if (!parsed.success) {
      return parsed.response;
    }

    const report = await createReportForMember(session, parsed.data);

    if (!report) {
      return apiErrorResponse(apiErrors.notFound("CLIENT_NOT_FOUND", "Client was not found."));
    }

    return privateJsonResponse({ report }, { status: 201 });
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
