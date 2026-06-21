import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  BILLING_CHECKOUT_CONTRACT_VERSION,
  type BillingCheckoutDisabledDto,
  type BillingCheckoutInput,
} from "@/domains/subscription/checkout";

type JsonObject = Record<string, unknown>;

function asObject(value: Prisma.JsonValue | null | undefined): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function boolOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function stringOrDefault<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

export async function buildDisabledBillingCheckout(
  session: AppSession,
  input: BillingCheckoutInput,
): Promise<BillingCheckoutDisabledDto> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: {
      featureFlags: true,
      providerPolicy: true,
    },
  });

  const featureFlags = asObject(settings?.featureFlags);
  const providerPolicy = asObject(settings?.providerPolicy);
  const billingCheckoutEnabled = boolOrDefault(featureFlags.billingCheckoutEnabled, false);
  const paymentProviderMode = stringOrDefault(
    providerPolicy.paymentProviderMode,
    "ECPAY_TEST_ONLY",
    ["ECPAY_TEST_ONLY", "ECPAY_PRODUCTION_READY_DISABLED", "MANUAL_ONLY"] as const,
  );
  const mode = billingCheckoutEnabled && paymentProviderMode === "ECPAY_TEST_ONLY"
    ? "sandbox_disabled"
    : "production_disabled";

  return {
    version: BILLING_CHECKOUT_CONTRACT_VERSION,
    status: "disabled",
    mode,
    provider: "ECPAY",
    plan: input.plan,
    source: input.source,
    orderCreated: false,
    transactionCreated: false,
    redirect: null,
    productionPaymentEnabled: false,
    providerAttempted: false,
    dataBoundary: {
      providerCredentialsReturned: false,
      providerRawPayloadReturned: false,
      browserGeneratedChecksumAllowed: false,
      browserReceivesSignedPayload: false,
    },
    activation: {
      allowed: false,
      reason: "server_notification_or_query_required",
    },
    requiredProof: [
      "server_signed_payload",
      "notify_callback_verification",
      "query_confirmation",
      "idempotency",
    ],
    message:
      mode === "sandbox_disabled"
        ? `Checkout is gated for ${session.organization.slug}; sandbox provider proof is not complete.`
        : `Checkout is disabled for ${session.organization.slug}; production payment remains off until callback/query/idempotency proof is complete.`,
  };
}
