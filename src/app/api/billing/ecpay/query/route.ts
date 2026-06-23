import { buildDisabledEcpayQueryDto, ecpayQueryInputSchema } from "@/domains/subscription/ecpay";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, ecpayQueryInputSchema, {
    error: "INVALID_BILLING_ECPAY_QUERY_INPUT",
    message: "A server-owned ECPay merchant trade number is required.",
  });

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    await requireCurrentMember();

    return privateJsonResponse(
      {
        error: "BILLING_ECPAY_QUERY_DISABLED",
        query: buildDisabledEcpayQueryDto(parsed.data),
      },
      { status: 503 },
    );
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
    }

    if (isDatabaseUnavailableError(error)) {
      return apiErrorResponse({
        error: "BILLING_ECPAY_AUTH_UNAVAILABLE",
        kind: "INTERNAL",
        status: 503,
        message: "Workspace authentication data is temporarily unavailable. ECPay query confirmation was not attempted.",
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
