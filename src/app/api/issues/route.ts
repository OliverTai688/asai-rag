import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import {
  listIssuesForMember,
  listIssuesQuerySchema,
} from "@/lib/issues/issues-repository";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentMember();
    const url = new URL(req.url);
    const parsed = listIssuesQuerySchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
    });

    if (!parsed.success) {
      return apiErrorResponse(
        apiErrors.validation("INVALID_ISSUE_FILTERS", parsed.error.flatten().fieldErrors),
      );
    }

    const payload = await listIssuesForMember(session, parsed.data);

    return privateJsonResponse(payload);
  } catch (error) {
    return issueAuthErrorResponse(error);
  }
}

function issueAuthErrorResponse(error: unknown): Response {
  if (error instanceof AuthRequiredError) {
    return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
  }

  throw error;
}
