import { z } from "zod";
import type { PlanType } from "./types";

export const BILLING_CHECKOUT_CONTRACT_VERSION = "asai.billing.checkout.v1";

export const selfServeCheckoutPlans = ["STARTER", "PRO"] as const satisfies readonly PlanType[];

export type SelfServeCheckoutPlan = (typeof selfServeCheckoutPlans)[number];

export const billingCheckoutInputSchema = z.object({
  plan: z.enum(selfServeCheckoutPlans),
  source: z.enum(["pricing", "workspace", "manual"]).default("pricing"),
});

export type BillingCheckoutInput = z.infer<typeof billingCheckoutInputSchema>;

export type BillingCheckoutDisabledDto = {
  version: typeof BILLING_CHECKOUT_CONTRACT_VERSION;
  status: "disabled";
  mode: "production_disabled" | "sandbox_disabled";
  provider: "ECPAY";
  plan: SelfServeCheckoutPlan;
  source: BillingCheckoutInput["source"];
  orderCreated: false;
  transactionCreated: false;
  redirect: null;
  productionPaymentEnabled: false;
  providerAttempted: false;
  dataBoundary: {
    providerCredentialsReturned: false;
    providerRawPayloadReturned: false;
    browserGeneratedChecksumAllowed: false;
    browserReceivesSignedPayload: false;
  };
  activation: {
    allowed: false;
    reason: "server_notification_or_query_required";
  };
  requiredProof: Array<"server_signed_payload" | "notify_callback_verification" | "query_confirmation" | "idempotency">;
  message: string;
};
