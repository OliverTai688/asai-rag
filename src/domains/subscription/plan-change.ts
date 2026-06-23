import { z } from "zod";
import type { OrganizationPlan } from "@/generated/prisma/enums";
import { selfServeCheckoutPlans, type SelfServeCheckoutPlan } from "./checkout";
import { BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION } from "./ledger";

export const BILLING_PLAN_CHANGE_CONTRACT_VERSION =
  "asai.billing.plan_change_activation.v1";

const planChangeSources = ["subscription_panel", "workspace", "settings", "manual"] as const;

export const billingPlanChangeInputSchema = z.object({
  plan: z.enum(selfServeCheckoutPlans),
  source: z.enum(planChangeSources).default("subscription_panel"),
});

export type BillingPlanChangeInput = z.infer<typeof billingPlanChangeInputSchema>;

export type BillingPlanChangeDisabledDto = {
  version: typeof BILLING_PLAN_CHANGE_CONTRACT_VERSION;
  status: "disabled";
  mode: "guarded_disabled";
  provider: "ECPAY";
  requestedPlan: SelfServeCheckoutPlan;
  currentPlan: OrganizationPlan;
  source: BillingPlanChangeInput["source"];
  providerAttempted: false;
  productionPaymentEnabled: false;
  createdAt: string;
  order: {
    orderCreated: false;
    orderUpdated: false;
    merchantTradeNoCreated: false;
    pendingOnlyUntilProviderConfirmation: true;
  };
  idempotency: {
    strategy: "transaction_ledger_required_before_plan_mutation";
    ledgerContractVersion: typeof BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION;
    ledgerScope: "organization_provider_merchant_trade_no";
    requiredLedgerStatusesBeforePlanMutation: ["PAID", "QUERY_CONFIRMED"];
    keySource: "server_derived_when_enabled";
    duplicateSafe: true;
    duplicateLedgerWritePrevented: true;
    ledgerWriteAttempted: false;
    transactionCreated: false;
    transactionUpdated: false;
    orderUpdated: false;
    planUpdated: false;
  };
  activation: {
    allowed: false;
    planActivationSource: "confirmed_transaction_or_query_only";
    redirectOnlyActivationAllowed: false;
    browserPlanAssumptionsAllowed: false;
    sessionPlanMutationAllowed: false;
    organizationPlanUpdated: false;
  };
  confirmationGate: {
    checkMacValueVerified: false;
    serverQueryConfirmed: false;
    notificationVerified: false;
    providerStatusAccepted: false;
    requiredBeforeActivation: Array<
      | "server_signed_payload"
      | "checkmac_validation"
      | "server_query_confirmation"
      | "transaction_ledger_idempotency"
      | "manual_review_failure_refund_void"
    >;
  };
  manualReview: {
    failureRefundVoidStatusRetained: true;
    destructivePaymentActionAllowed: false;
  };
  dataBoundary: {
    providerCredentialsReturned: false;
    providerRawPayloadReturned: false;
    providerRawPayloadStored: false;
    paymentTokenReturned: false;
    rawCookieReturned: false;
    rawSecretReturned: false;
  };
  safety: {
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    dbWriteAttempted: false;
    readOnlyDbAccess: true;
    rawPaymentDataStored: false;
  };
  message: string;
};

export function buildDisabledBillingPlanChangeDto(input: {
  request: BillingPlanChangeInput;
  currentPlan: OrganizationPlan;
  now?: Date;
}): BillingPlanChangeDisabledDto {
  return {
    version: BILLING_PLAN_CHANGE_CONTRACT_VERSION,
    status: "disabled",
    mode: "guarded_disabled",
    provider: "ECPAY",
    requestedPlan: input.request.plan,
    currentPlan: input.currentPlan,
    source: input.request.source,
    providerAttempted: false,
    productionPaymentEnabled: false,
    createdAt: (input.now ?? new Date()).toISOString(),
    order: {
      orderCreated: false,
      orderUpdated: false,
      merchantTradeNoCreated: false,
      pendingOnlyUntilProviderConfirmation: true,
    },
    idempotency: {
      strategy: "transaction_ledger_required_before_plan_mutation",
      ledgerContractVersion: BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION,
      ledgerScope: "organization_provider_merchant_trade_no",
      requiredLedgerStatusesBeforePlanMutation: ["PAID", "QUERY_CONFIRMED"],
      keySource: "server_derived_when_enabled",
      duplicateSafe: true,
      duplicateLedgerWritePrevented: true,
      ledgerWriteAttempted: false,
      transactionCreated: false,
      transactionUpdated: false,
      orderUpdated: false,
      planUpdated: false,
    },
    activation: {
      allowed: false,
      planActivationSource: "confirmed_transaction_or_query_only",
      redirectOnlyActivationAllowed: false,
      browserPlanAssumptionsAllowed: false,
      sessionPlanMutationAllowed: false,
      organizationPlanUpdated: false,
    },
    confirmationGate: {
      checkMacValueVerified: false,
      serverQueryConfirmed: false,
      notificationVerified: false,
      providerStatusAccepted: false,
      requiredBeforeActivation: [
        "server_signed_payload",
        "checkmac_validation",
        "server_query_confirmation",
        "transaction_ledger_idempotency",
        "manual_review_failure_refund_void",
      ],
    },
    manualReview: {
      failureRefundVoidStatusRetained: true,
      destructivePaymentActionAllowed: false,
    },
    dataBoundary: {
      providerCredentialsReturned: false,
      providerRawPayloadReturned: false,
      providerRawPayloadStored: false,
      paymentTokenReturned: false,
      rawCookieReturned: false,
      rawSecretReturned: false,
    },
    safety: {
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      dbWriteAttempted: false,
      readOnlyDbAccess: true,
      rawPaymentDataStored: false,
    },
    message:
      "Plan changes are disabled until server-signed checkout, ECPay notification/query confirmation, and transaction-ledger idempotency proof are complete.",
  };
}
