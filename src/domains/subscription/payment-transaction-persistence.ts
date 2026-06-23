import type { BillingLedgerEventSource, BillingLedgerIdempotencyContractDto } from "./ledger";
import type { PaymentProvider, PaymentTransactionStatus } from "./types";

export const BILLING_PAYMENT_TRANSACTION_PERSISTENCE_CONTRACT_VERSION =
  "asai.billing.payment_transaction_persistence.v1";
export const BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION =
  "asai.billing.payment_transaction_upsert_boundary.v1";

type AcceptedPaymentTransactionStatus = Extract<PaymentTransactionStatus, "PAID" | "QUERY_CONFIRMED">;
type PaymentTransactionUpsertKind = "NOTIFICATION" | "QUERY";

export type BillingPaymentTransactionUpsertBoundaryDto = {
  version: typeof BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION;
  status: "guarded_disabled";
  provider: Extract<PaymentProvider, "ECPAY">;
  source: BillingLedgerEventSource;
  table: "PaymentTransaction";
  operation: "upsert_payload_boundary_only";
  enabled: false;
  uniqueBy: ["organizationId", "provider", "merchantTradeNo"];
  allowedCreateColumns: [
    "organizationId",
    "orderId",
    "provider",
    "kind",
    "status",
    "merchantTradeNo",
    "providerTradeNo",
    "amount",
    "currency",
    "verifiedAt",
  ];
  allowedUpdateColumns: ["status", "providerTradeNo", "amount", "currency", "verifiedAt"];
  serverResolvedInputs: {
    organizationIdRequired: true;
    organizationIdFromClientTrusted: false;
    orderIdRequired: false;
    amountFromClientTrusted: false;
    providerStatusFromClientTrusted: false;
    browserRedirectTrusted: false;
  };
  writePreconditions: {
    acceptedStatusesBeforeDraft: ["PAID", "QUERY_CONFIRMED"];
    requiresCheckMacValidationForNotify: boolean;
    requiresServerQueryConfirmationForQuery: boolean;
    requiresLedgerIdempotencyContract: true;
  };
  dataBoundary: {
    allowlistedProviderSummaryOnly: true;
    providerCredentialsReturned: false;
    providerOpaquePayloadStored: false;
    providerChecksumStored: false;
    paymentTokenStored: false;
    cardDataStored: false;
    rawPaymentDataStored: false;
    rawPrivateTranscriptStored: false;
  };
  safety: {
    dbWriteAttempted: false;
    providerCallAttempted: false;
    paymentTransactionUpsertAttempted: false;
    subscriptionOrderUpdated: false;
    organizationPlanUpdated: false;
    fakeUsageLogAllowed: false;
  };
};

export type BillingPaymentTransactionUpsertBoundaryDraftDto = {
  version: typeof BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION;
  status: "draft_only";
  provider: Extract<PaymentProvider, "ECPAY">;
  source: BillingLedgerEventSource;
  table: "PaymentTransaction";
  operation: "upsert_payload_boundary_only";
  uniqueScope: {
    organizationId: string;
    provider: Extract<PaymentProvider, "ECPAY">;
    merchantTradeNo: string;
  };
  createValues: {
    organizationId: string;
    orderId: string | null;
    provider: Extract<PaymentProvider, "ECPAY">;
    kind: PaymentTransactionUpsertKind;
    status: AcceptedPaymentTransactionStatus;
    merchantTradeNo: string;
    providerTradeNo: string | null;
    amount: string;
    currency: "TWD";
    verifiedAt: string;
  };
  updateValues: {
    status: AcceptedPaymentTransactionStatus;
    providerTradeNo: string | null;
    amount: string;
    currency: "TWD";
    verifiedAt: string;
  };
  guardEvidence: {
    enabled: false;
    dbWriteAttempted: false;
    providerCallAttempted: false;
    paymentTransactionUpsertAttempted: false;
    subscriptionOrderUpdated: false;
    organizationPlanUpdated: false;
    clientSuppliedOrganizationTrusted: false;
    clientSuppliedAmountTrusted: false;
    providerOpaquePayloadStored: false;
    providerChecksumStored: false;
    paymentTokenStored: false;
    fakeUsageLogAllowed: false;
  };
};

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
  upsertPayloadBoundary: BillingPaymentTransactionUpsertBoundaryDto;
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
    upsertPayloadBoundary: buildPaymentTransactionUpsertBoundary(input.source),
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

export function buildPaymentTransactionUpsertBoundary(
  source: BillingLedgerEventSource,
): BillingPaymentTransactionUpsertBoundaryDto {
  return {
    version: BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION,
    status: "guarded_disabled",
    provider: "ECPAY",
    source,
    table: "PaymentTransaction",
    operation: "upsert_payload_boundary_only",
    enabled: false,
    uniqueBy: ["organizationId", "provider", "merchantTradeNo"],
    allowedCreateColumns: [
      "organizationId",
      "orderId",
      "provider",
      "kind",
      "status",
      "merchantTradeNo",
      "providerTradeNo",
      "amount",
      "currency",
      "verifiedAt",
    ],
    allowedUpdateColumns: ["status", "providerTradeNo", "amount", "currency", "verifiedAt"],
    serverResolvedInputs: {
      organizationIdRequired: true,
      organizationIdFromClientTrusted: false,
      orderIdRequired: false,
      amountFromClientTrusted: false,
      providerStatusFromClientTrusted: false,
      browserRedirectTrusted: false,
    },
    writePreconditions: {
      acceptedStatusesBeforeDraft: ["PAID", "QUERY_CONFIRMED"],
      requiresCheckMacValidationForNotify: source === "ecpay_notify",
      requiresServerQueryConfirmationForQuery: source === "ecpay_query",
      requiresLedgerIdempotencyContract: true,
    },
    dataBoundary: {
      allowlistedProviderSummaryOnly: true,
      providerCredentialsReturned: false,
      providerOpaquePayloadStored: false,
      providerChecksumStored: false,
      paymentTokenStored: false,
      cardDataStored: false,
      rawPaymentDataStored: false,
      rawPrivateTranscriptStored: false,
    },
    safety: {
      dbWriteAttempted: false,
      providerCallAttempted: false,
      paymentTransactionUpsertAttempted: false,
      subscriptionOrderUpdated: false,
      organizationPlanUpdated: false,
      fakeUsageLogAllowed: false,
    },
  };
}

export function buildPaymentTransactionUpsertBoundaryDraft(input: {
  organizationId: string;
  orderId?: string | null;
  source: BillingLedgerEventSource;
  merchantTradeNo: string;
  providerTradeNo?: string | null;
  amount: string;
  currency?: "TWD";
  statusWhenVerified: AcceptedPaymentTransactionStatus;
  verifiedAt: string;
}): BillingPaymentTransactionUpsertBoundaryDraftDto {
  const currency = input.currency ?? "TWD";
  const providerTradeNo = input.providerTradeNo ?? null;

  return {
    version: BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION,
    status: "draft_only",
    provider: "ECPAY",
    source: input.source,
    table: "PaymentTransaction",
    operation: "upsert_payload_boundary_only",
    uniqueScope: {
      organizationId: input.organizationId,
      provider: "ECPAY",
      merchantTradeNo: input.merchantTradeNo,
    },
    createValues: {
      organizationId: input.organizationId,
      orderId: input.orderId ?? null,
      provider: "ECPAY",
      kind: paymentTransactionKindForSource(input.source),
      status: input.statusWhenVerified,
      merchantTradeNo: input.merchantTradeNo,
      providerTradeNo,
      amount: input.amount,
      currency,
      verifiedAt: input.verifiedAt,
    },
    updateValues: {
      status: input.statusWhenVerified,
      providerTradeNo,
      amount: input.amount,
      currency,
      verifiedAt: input.verifiedAt,
    },
    guardEvidence: {
      enabled: false,
      dbWriteAttempted: false,
      providerCallAttempted: false,
      paymentTransactionUpsertAttempted: false,
      subscriptionOrderUpdated: false,
      organizationPlanUpdated: false,
      clientSuppliedOrganizationTrusted: false,
      clientSuppliedAmountTrusted: false,
      providerOpaquePayloadStored: false,
      providerChecksumStored: false,
      paymentTokenStored: false,
      fakeUsageLogAllowed: false,
    },
  };
}

function paymentTransactionKindForSource(source: BillingLedgerEventSource): PaymentTransactionUpsertKind {
  return source === "ecpay_notify" ? "NOTIFICATION" : "QUERY";
}
