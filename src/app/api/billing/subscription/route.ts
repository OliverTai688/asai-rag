import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import { buildBillingSubscriptionCapability } from "@/lib/billing/subscription-capability-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const subscription = await buildBillingSubscriptionCapability(session);

    return privateJsonResponse({ subscription });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
    }

    if (isDatabaseUnavailableError(error)) {
      return apiErrorResponse({
        error: "BILLING_SUBSCRIPTION_UNAVAILABLE",
        kind: "INTERNAL",
        status: 503,
        message:
          "Workspace subscription capability is temporarily unavailable. Payment provider calls, plan activation, and DB writes were not attempted.",
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
