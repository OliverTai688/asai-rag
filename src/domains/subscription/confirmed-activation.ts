import type { BillingLedgerEventSource, BillingLedgerIdempotencyContractDto } from "./ledger";
import type { BillingPaymentTransactionPersistenceContractDto } from "./payment-transaction-persistence";
import type { PaymentProvider, PaymentTransactionStatus } from "./types";

export const BILLING_CONFIRMED_ACTIVATION_CONTRACT_VERSION =
  "asai.billing.confirmed_activation.v1";

export type BillingConfirmedActivationContractDto = {
  version: typeof BILLING_CONFIRMED_ACTIVATION_CONTRACT_VERSION;
  status: "guarded_disabled";
  provider: Extract<PaymentProvider, "ECPAY">;
  source: BillingLedgerEventSource;
  activationTarget: {
    table: "Organization";
    field: "plan";
    mutation: "update_when_enabled";
    merchantTradeNo: string;
  };
  confirmedTransactionPreconditions: {
    requiresConfirmedLedger: true;
    requiresPaymentTransactionPersistence: true;
    requiresPaymentTransactionWriteProof: true;
    requiresCheckMacValidationForNotify: boolean;
    requiresServerQueryConfirmationForQuery: boolean;
    acceptedStatusesBeforeActivation: ["PAID", "QUERY_CONFIRMED"];
    statusWhenVerified: PaymentTransactionStatus;
    transactionStatusFromClientTrusted: false;
    planFromClientTrusted: false;
    amountFromClientTrusted: false;
  };
  blockedClientSignals: {
    redirectReturnUrlTrusted: false;
    browserPaymentResultTrusted: false;
    clientSuppliedPlanTrusted: false;
    clientSuppliedAmountTrusted: false;
    clientSuppliedOrganizationTrusted: false;
    localStoragePlanTrusted: false;
  };
  activationPlan: {
    mutation: "update_when_enabled";
    enabled: false;
    reason: "confirmed_transaction_or_provider_query_disabled";
    dbWriteAttempted: false;
    planActivated: false;
    organizationPlanUpdated: false;
    paymentTransactionUpsertAttempted: false;
    subscriptionOrderUpdated: false;
    redirectOnlyActivationAllowed: false;
    browserPlanAssumptionsAllowed: false;
  };
  dependencies: {
    ledgerContractVersion: BillingLedgerIdempotencyContractDto["version"];
    ledgerScope: BillingLedgerIdempotencyContractDto["scope"];
    transactionPersistenceContractVersion: BillingPaymentTransactionPersistenceContractDto["version"];
    transactionPersistenceTable: BillingPaymentTransactionPersistenceContractDto["table"];
    activationRequiresConfirmedLedger: true;
    activationRequiresPaymentTransactionWrite: true;
    ledgerWriteAttempted: false;
    transactionPersistenceWriteAttempted: false;
  };
  dataBoundary: {
    providerCredentialsReturned: false;
    providerRawPayloadReturned: false;
    providerRawPayloadStored: false;
    rawPaymentDataStored: false;
    rawCheckMacValueStored: false;
    rawPrivateTranscriptStored: false;
    paymentTokenStored: false;
    rawCookieStored: false;
    rawSecretStored: false;
    rawOtpStored: false;
    allowlistedActivationSummaryOnly: true;
  };
  audit: {
    auditEvidenceRequired: true;
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    fakeUsageLogAllowed: false;
  };
  remainingProof: Array<
    | "ecpay_server_query_response_validation"
    | "payment_transaction_db_upsert"
    | "organization_plan_activation_write"
    | "production_payment_env_callback"
    | "manual_review_failure_refund_void"
  >;
};

export function buildConfirmedActivationContract(input: {
  source: BillingLedgerEventSource;
  merchantTradeNo: string;
  statusWhenVerified: PaymentTransactionStatus;
  ledger: BillingLedgerIdempotencyContractDto;
  transactionPersistence: BillingPaymentTransactionPersistenceContractDto;
}): BillingConfirmedActivationContractDto {
  return {
    version: BILLING_CONFIRMED_ACTIVATION_CONTRACT_VERSION,
    status: "guarded_disabled",
    provider: "ECPAY",
    source: input.source,
    activationTarget: {
      table: "Organization",
      field: "plan",
      mutation: "update_when_enabled",
      merchantTradeNo: input.merchantTradeNo,
    },
    confirmedTransactionPreconditions: {
      requiresConfirmedLedger: true,
      requiresPaymentTransactionPersistence: true,
      requiresPaymentTransactionWriteProof: true,
      requiresCheckMacValidationForNotify: input.source === "ecpay_notify",
      requiresServerQueryConfirmationForQuery: input.source === "ecpay_query",
      acceptedStatusesBeforeActivation: ["PAID", "QUERY_CONFIRMED"],
      statusWhenVerified: input.statusWhenVerified,
      transactionStatusFromClientTrusted: false,
      planFromClientTrusted: false,
      amountFromClientTrusted: false,
    },
    blockedClientSignals: {
      redirectReturnUrlTrusted: false,
      browserPaymentResultTrusted: false,
      clientSuppliedPlanTrusted: false,
      clientSuppliedAmountTrusted: false,
      clientSuppliedOrganizationTrusted: false,
      localStoragePlanTrusted: false,
    },
    activationPlan: {
      mutation: "update_when_enabled",
      enabled: false,
      reason: "confirmed_transaction_or_provider_query_disabled",
      dbWriteAttempted: false,
      planActivated: false,
      organizationPlanUpdated: false,
      paymentTransactionUpsertAttempted:
        input.transactionPersistence.upsertPlan.paymentTransactionUpsertAttempted,
      subscriptionOrderUpdated: false,
      redirectOnlyActivationAllowed: false,
      browserPlanAssumptionsAllowed: false,
    },
    dependencies: {
      ledgerContractVersion: input.ledger.version,
      ledgerScope: input.ledger.scope,
      transactionPersistenceContractVersion: input.transactionPersistence.version,
      transactionPersistenceTable: input.transactionPersistence.table,
      activationRequiresConfirmedLedger: true,
      activationRequiresPaymentTransactionWrite: true,
      ledgerWriteAttempted: input.ledger.writePlan.dbWriteAttempted,
      transactionPersistenceWriteAttempted:
        input.transactionPersistence.upsertPlan.paymentTransactionUpsertAttempted,
    },
    dataBoundary: {
      providerCredentialsReturned: false,
      providerRawPayloadReturned: false,
      providerRawPayloadStored: false,
      rawPaymentDataStored: false,
      rawCheckMacValueStored: false,
      rawPrivateTranscriptStored: false,
      paymentTokenStored: false,
      rawCookieStored: false,
      rawSecretStored: false,
      rawOtpStored: false,
      allowlistedActivationSummaryOnly: true,
    },
    audit: {
      auditEvidenceRequired: true,
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      fakeUsageLogAllowed: false,
    },
    remainingProof: [
      "ecpay_server_query_response_validation",
      "payment_transaction_db_upsert",
      "organization_plan_activation_write",
      "production_payment_env_callback",
      "manual_review_failure_refund_void",
    ],
  };
}
