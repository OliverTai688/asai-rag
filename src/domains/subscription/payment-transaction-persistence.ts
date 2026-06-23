import type { BillingLedgerEventSource, BillingLedgerIdempotencyContractDto } from "./ledger";
import type { PaymentProvider, PaymentTransactionStatus } from "./types";

export const BILLING_PAYMENT_TRANSACTION_PERSISTENCE_CONTRACT_VERSION =
  "asai.billing.payment_transaction_persistence.v1";

export type BillingPaymentTransactionPersistenceContractDto = {
  version: typeof BILLING_PAYMENT_TRANSACTION_PERSISTENCE_CONTRACT_VERSION;
  status: "guarded_disabled";
  provider: Extract<PaymentProvider, "ECPAY">;
  source: BillingLedgerEventSource;
  table: "PaymentTransaction";
  lookup: {
    uniqueBy: ["organizationId", "provider", "merchantTradeNo"];
    merchantTradeNo: string;
    providerTradeNoAccepted: boolean;
    rawProviderTradeNoStored: false;
    clientSuppliedOrganizationTrusted: false;
    clientSuppliedAmountTrusted: false;
  };
  verifiedWritePreconditions: {
    requiresCheckMacValidationForNotify: boolean;
    requiresServerQueryConfirmationForQuery: boolean;
    acceptedStatusesBeforeUpsert: ["PAID", "QUERY_CONFIRMED"];
    statusWhenVerified: PaymentTransactionStatus;
    amountFromClientTrusted: false;
    providerStatusFromClientTrusted: false;
  };
  upsertPlan: {
    mutation: "upsert_when_enabled";
    enabled: false;
    reason: "provider_confirmation_disabled";
    dbWriteAttempted: false;
    paymentTransactionUpsertAttempted: false;
    transactionCreated: false;
    transactionUpdated: false;
    subscriptionOrderUpdated: false;
    organizationPlanUpdated: false;
    redirectOnlyActivationAllowed: false;
  };
  ledgerDependency: {
    contractVersion: BillingLedgerIdempotencyContractDto["version"];
    scope: BillingLedgerIdempotencyContractDto["scope"];
    ledgerWriteAttempted: false;
    activationRequiresConfirmedLedger: true;
    duplicateWritePrevented: true;
  };
  dataBoundary: {
    providerCredentialsReturned: false;
    providerRawPayloadReturned: false;
    providerRawPayloadStored: false;
    rawProviderPayloadPersisted: false;
    rawCheckMacValueStored: false;
    rawPrivateTranscriptStored: false;
    paymentTokenStored: false;
    rawCookieStored: false;
    rawSecretStored: false;
    rawOtpStored: false;
    allowlistedProviderSummaryOnly: true;
  };
  audit: {
    auditEvidenceRequired: true;
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    fakeUsageLogAllowed: false;
  };
  remainingProof: Array<
    | "provider_env_and_credentials"
    | "ecpay_server_query_response_validation"
    | "payment_transaction_db_upsert"
    | "confirmed_activation"
    | "manual_review_failure_refund_void"
  >;
};

export function buildPaymentTransactionPersistenceContract(input: {
  source: BillingLedgerEventSource;
  merchantTradeNo: string;
  providerTradeNoAccepted: boolean;
  statusWhenVerified: PaymentTransactionStatus;
  ledger: BillingLedgerIdempotencyContractDto;
}): BillingPaymentTransactionPersistenceContractDto {
  return {
    version: BILLING_PAYMENT_TRANSACTION_PERSISTENCE_CONTRACT_VERSION,
    status: "guarded_disabled",
    provider: "ECPAY",
    source: input.source,
    table: "PaymentTransaction",
    lookup: {
      uniqueBy: ["organizationId", "provider", "merchantTradeNo"],
      merchantTradeNo: input.merchantTradeNo,
      providerTradeNoAccepted: input.providerTradeNoAccepted,
      rawProviderTradeNoStored: false,
      clientSuppliedOrganizationTrusted: false,
      clientSuppliedAmountTrusted: false,
    },
    verifiedWritePreconditions: {
      requiresCheckMacValidationForNotify: input.source === "ecpay_notify",
      requiresServerQueryConfirmationForQuery: input.source === "ecpay_query",
      acceptedStatusesBeforeUpsert: ["PAID", "QUERY_CONFIRMED"],
      statusWhenVerified: input.statusWhenVerified,
      amountFromClientTrusted: false,
      providerStatusFromClientTrusted: false,
    },
    upsertPlan: {
      mutation: "upsert_when_enabled",
      enabled: false,
      reason: "provider_confirmation_disabled",
      dbWriteAttempted: false,
      paymentTransactionUpsertAttempted: false,
      transactionCreated: false,
      transactionUpdated: false,
      subscriptionOrderUpdated: false,
      organizationPlanUpdated: false,
      redirectOnlyActivationAllowed: false,
    },
    ledgerDependency: {
      contractVersion: input.ledger.version,
      scope: input.ledger.scope,
      ledgerWriteAttempted: false,
      activationRequiresConfirmedLedger: true,
      duplicateWritePrevented: true,
    },
    dataBoundary: {
      providerCredentialsReturned: false,
      providerRawPayloadReturned: false,
      providerRawPayloadStored: false,
      rawProviderPayloadPersisted: false,
      rawCheckMacValueStored: false,
      rawPrivateTranscriptStored: false,
      paymentTokenStored: false,
      rawCookieStored: false,
      rawSecretStored: false,
      rawOtpStored: false,
      allowlistedProviderSummaryOnly: true,
    },
    audit: {
      auditEvidenceRequired: true,
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      fakeUsageLogAllowed: false,
    },
    remainingProof: [
      "provider_env_and_credentials",
      "ecpay_server_query_response_validation",
      "payment_transaction_db_upsert",
      "confirmed_activation",
      "manual_review_failure_refund_void",
    ],
  };
}
