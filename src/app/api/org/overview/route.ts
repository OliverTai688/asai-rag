import { requireOrgAdmin } from "@/lib/auth/current-workspace";
import { privateJsonResponse } from "@/lib/api/response";
import { orgAggregateErrorResponse } from "@/lib/org/org-api-errors";
import { getOrgOverviewForSession } from "@/lib/org/org-aggregate-repository";

export async function GET() {
  try {
    const session = await requireOrgAdmin();
    const overview = await getOrgOverviewForSession(session);

    return privateJsonResponse(overview);
  } catch (error) {
    return orgAggregateErrorResponse(error, "ORG_OVERVIEW_FORBIDDEN");
  }
}
