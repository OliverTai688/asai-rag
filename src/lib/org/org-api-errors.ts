import { AuthRequiredError } from "@/lib/auth/current-workspace";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse } from "@/lib/api/response";
import { OrgAggregateForbiddenError } from "@/lib/org/org-aggregate-repository";

export function orgAggregateErrorResponse(error: unknown, forbiddenCode: string): Response {
  if (error instanceof AuthRequiredError) {
    if (error.status === 401) {
      return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
    }

    return apiErrorResponse(apiErrors.forbidden(error.code, error.message));
  }

  if (error instanceof OrgAggregateForbiddenError) {
    return apiErrorResponse(apiErrors.forbidden(forbiddenCode, error.message));
  }

  throw error;
}
