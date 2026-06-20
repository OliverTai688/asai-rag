import { requireOrgAdmin } from "@/lib/auth/current-workspace";
import { privateJsonResponse } from "@/lib/api/response";
import { orgAggregateErrorResponse } from "@/lib/org/org-api-errors";
import { getOrgCoachingForSession } from "@/lib/org/org-aggregate-repository";

export async function GET() {
  try {
    const session = await requireOrgAdmin();
    const coaching = await getOrgCoachingForSession(session);

    return privateJsonResponse(coaching);
  } catch (error) {
    return orgAggregateErrorResponse(error, "ORG_COACHING_FORBIDDEN");
  }
}
