import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { apiErrors } from "@/lib/api/errors";
import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  billingPlanChangeInputSchema,
  buildDisabledBillingPlanChangeDto,
} from "@/domains/subscription/plan-change";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, billingPlanChangeInputSchema, {
    error: "INVALID_BILLING_PLAN_CHANGE_INPUT",
    message: "A self-serve target plan is required before starting a plan change.",
  });

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const session = await requireCurrentMember();
    const planChange = buildDisabledBillingPlanChangeDto({
      request: parsed.data,
      currentPlan: session.organization.plan,
    });

    return privateJsonResponse(
      {
        error: "BILLING_PLAN_CHANGE_DISABLED",
        planChange,
      },
      { status: 503 },
    );
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
    }

    if (isDatabaseUnavailableError(error)) {
      return apiErrorResponse({
        error: "BILLING_PLAN_CHANGE_AUTH_UNAVAILABLE",
        kind: "INTERNAL",
        status: 503,
        message:
          "Workspace authentication data is temporarily unavailable. Plan activation, payment provider calls, and billing DB writes were not attempted.",
        providerAttempted: false,
      });
    }

    throw error;
  }
}

function isDatabaseUnavailableError(error: unknown): boolean {
  const errorCode = isRecord(error) && typeof error.code === "string" ? error.code : "";
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);

  return [
    "P1001",
    "DatabaseNotReachable",
    "Can't reach database server",
    "ENOTFOUND",
    "ECONNREFUSED",
    "ETIMEDOUT",
  ].some((fragment) => errorCode === fragment || message.includes(fragment));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
