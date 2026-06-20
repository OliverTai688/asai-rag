import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { getMemberDashboardForSession } from "@/lib/dashboard/member-dashboard-repository";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const dashboard = await getMemberDashboardForSession(session);

    return privateJsonResponse({ dashboard });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
    }

    throw error;
  }
}
