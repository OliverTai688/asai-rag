import { requireOrgAdmin } from "@/lib/auth/current-workspace";
import { privateJsonResponse } from "@/lib/api/response";
import { orgAggregateErrorResponse } from "@/lib/org/org-api-errors";
import { getOrgAiUsageForSession } from "@/lib/org/org-aggregate-repository";

export async function GET() {
  try {
    const session = await requireOrgAdmin();
    const aiUsage = await getOrgAiUsageForSession(session);

    return privateJsonResponse(aiUsage);
  } catch (error) {
    return orgAggregateErrorResponse(error, "ORG_AI_USAGE_FORBIDDEN");
  }
}
