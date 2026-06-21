import { AuthRequiredError, requireCurrentMember } from "@/lib/auth/current-workspace";
import { apiErrors } from "@/lib/api/errors";
import { apiErrorResponse, privateJsonResponse } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { buildDisabledBillingCheckout } from "@/lib/billing/checkout-repository";
import { billingCheckoutInputSchema } from "@/domains/subscription/checkout";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireCurrentMember();
    const parsed = await parseJsonBody(request, billingCheckoutInputSchema, {
      error: "INVALID_BILLING_CHECKOUT_INPUT",
      message: "A self-serve paid plan is required.",
    });

    if (!parsed.success) {
      return parsed.response;
    }

    const checkout = await buildDisabledBillingCheckout(session, parsed.data);

    return privateJsonResponse(
      {
        error: "BILLING_CHECKOUT_DISABLED",
        checkout,
      },
      { status: 503 },
    );
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return apiErrorResponse(apiErrors.unauthenticated(error.code, error.message));
    }

    throw error;
  }
}
