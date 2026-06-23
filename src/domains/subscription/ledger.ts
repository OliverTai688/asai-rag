import { mapEcpayTradeStatus } from "./billing";
import type { EcpayNotifyInput, EcpayQueryInput } from "./ecpay";
import type { PaymentProvider, PaymentTransactionStatus } from "./types";

export const BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION =
  "asai.billing.ledger_idempotency.v1";

export type BillingLedgerEventSource = "ecpay_notify" | "ecpay_query";

export type BillingLedgerIdempotencyContractDto = {
  version: typeof BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION;
  provider: Extract<PaymentProvider, "ECPAY">;
  source: BillingLedgerEventSource;
  scope: "organization_provider_merchant_trade_no";
  lookup: {
    uniqueBy: ["organizationId", "provider", "merchantTradeNo"];
    merchantTradeNo: string;
    providerTradeNoAccepted: boolean;
    rawProviderTradeNoStored: false;
  };
  ledgerTarget: {
    table: "PaymentTransaction";
    mutation: "upsert_when_enabled";
    statusWhenVerified: PaymentTransactionStatus;
    duplicateNotificationBehavior: "return_existing_transaction_without_plan_reactivation";
  };
  writePlan: {
    enabled: false;
    reason: "provider_confirmation_disabled";
    dbWriteAttempted: false;
    transactionCreated: false;
    transactionUpdated: false;
    duplicateWritePrevented: true;
  };
  activationGate: {
    allowed: false;
    requiresConfirmedLedger: true;
    acceptedLedgerStatuses: ["PAID", "QUERY_CONFIRMED"];
    redirectOnlyActivationAllowed: false;
    browserPlanAssumptionsAllowed: false;
    organizationPlanUpdated: false;
  };
  manualReview: {
    failureRefundVoidStatusRetained: true;
    destructivePaymentActionAllowed: false;
  };
  dataBoundary: {
    providerCredentialsReturned: false;
    providerRawPayloadReturned: false;
    providerRawPayloadStored: false;
    rawCheckMacValueStored: false;
    paymentTokenReturned: false;
    rawCookieStored: false;
    rawSecretStored: false;
  };
  audit: {
    auditEvidenceRequired: true;
    aiUsageLogRequired: false;
    providerCallAttempted: false;
  };
};

export function buildEcpayNotifyLedgerIdempotencyContract(
  input: EcpayNotifyInput,
): BillingLedgerIdempotencyContractDto {
  return buildLedgerIdempotencyContract({
    source: "ecpay_notify",
    merchantTradeNo: input.MerchantTradeNo,
    providerTradeNoAccepted: Boolean(input.TradeNo),
    statusWhenVerified: mapEcpayTradeStatus(String(input.RtnCode ?? "")),
  });
}

export function buildEcpayQueryLedgerIdempotencyContract(
  input: EcpayQueryInput,
): BillingLedgerIdempotencyContractDto {
  return buildLedgerIdempotencyContract({
    source: "ecpay_query",
    merchantTradeNo: input.merchantTradeNo,
    providerTradeNoAccepted: false,
    statusWhenVerified: "QUERY_CONFIRMED",
  });
}

function buildLedgerIdempotencyContract(input: {
  source: BillingLedgerEventSource;
  merchantTradeNo: string;
  providerTradeNoAccepted: boolean;
  statusWhenVerified: PaymentTransactionStatus;
}): BillingLedgerIdempotencyContractDto {
  return {
    version: BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION,
    provider: "ECPAY",
    source: input.source,
    scope: "organization_provider_merchant_trade_no",
    lookup: {
      uniqueBy: ["organizationId", "provider", "merchantTradeNo"],
      merchantTradeNo: input.merchantTradeNo,
      providerTradeNoAccepted: input.providerTradeNoAccepted,
      rawProviderTradeNoStored: false,
    },
    ledgerTarget: {
      table: "PaymentTransaction",
      mutation: "upsert_when_enabled",
      statusWhenVerified: input.statusWhenVerified,
      duplicateNotificationBehavior: "return_existing_transaction_without_plan_reactivation",
    },
    writePlan: {
      enabled: false,
      reason: "provider_confirmation_disabled",
      dbWriteAttempted: false,
      transactionCreated: false,
      transactionUpdated: false,
      duplicateWritePrevented: true,
    },
    activationGate: {
      allowed: false,
      requiresConfirmedLedger: true,
      acceptedLedgerStatuses: ["PAID", "QUERY_CONFIRMED"],
      redirectOnlyActivationAllowed: false,
      browserPlanAssumptionsAllowed: false,
      organizationPlanUpdated: false,
    },
    manualReview: {
      failureRefundVoidStatusRetained: true,
      destructivePaymentActionAllowed: false,
    },
    dataBoundary: {
      providerCredentialsReturned: false,
      providerRawPayloadReturned: false,
      providerRawPayloadStored: false,
      rawCheckMacValueStored: false,
      paymentTokenReturned: false,
      rawCookieStored: false,
      rawSecretStored: false,
    },
    audit: {
      auditEvidenceRequired: true,
      aiUsageLogRequired: false,
      providerCallAttempted: false,
    },
  };
}
