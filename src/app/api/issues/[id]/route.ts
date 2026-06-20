import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import {
  updateIssueForMember,
  updateIssueInputSchema,
} from "@/lib/issues/issues-repository";

interface IssueRouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, ctx: IssueRouteContext) {
  try {
    const session = await requireCurrentMember();
    const { id } = await ctx.params;
    const parsed = await parseJsonBody(req, updateIssueInputSchema, {
      error: "INVALID_ISSUE_ACTION",
      message: "Issue action input is invalid.",
    });

    if (!parsed.success) {
      return parsed.response;
    }

    const issue = await updateIssueForMember(session, id, parsed.data);

    if (!issue) {
      return apiErrorResponse(apiErrors.notFound("ISSUE_NOT_FOUND", "Issue was not found."));
    }

    return privateJsonResponse({ issue });
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
