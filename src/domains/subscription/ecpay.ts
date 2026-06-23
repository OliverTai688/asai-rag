import { z } from "zod";
import {
  buildEcpayNotifyLedgerIdempotencyContract,
  buildEcpayQueryLedgerIdempotencyContract,
  type BillingLedgerIdempotencyContractDto,
} from "./ledger";
import {
  buildGuardedEcpayCheckMacValidation,
  type EcpayCheckMacHashInfo,
  type EcpayCheckMacValidationDto,
} from "./ecpay-checkmac";
import {
  buildPaymentTransactionPersistenceContract,
  type BillingPaymentTransactionPersistenceContractDto,
} from "./payment-transaction-persistence";
import {
  buildConfirmedActivationContract,
  type BillingConfirmedActivationContractDto,
} from "./confirmed-activation";

export const BILLING_ECPAY_NOTIFY_CONTRACT_VERSION = "asai.billing.ecpay.notify.v1";
export const BILLING_ECPAY_QUERY_CONTRACT_VERSION = "asai.billing.ecpay.query.v1";
export const BILLING_ECPAY_SERVER_QUERY_BOUNDARY_VERSION =
  "asai.billing.ecpay.server_query_boundary.v1";

export const ecpayNotifyInputSchema = z
  .object({
    MerchantTradeNo: z.string().trim().min(1).max(64),
    TradeNo: z.string().trim().min(1).max(64).optional(),
    RtnCode: z.coerce.number().int().optional(),
    RtnMsg: z.string().trim().max(120).optional(),
    TradeAmt: z.coerce.number().int().nonnegative().optional(),
    PaymentDate: z.string().trim().max(64).optional(),
    PaymentType: z.string().trim().max(64).optional(),
    CheckMacValue: z.string().trim().min(1).max(256).optional(),
  })
  .passthrough();

export const ecpayQueryInputSchema = z.object({
  merchantTradeNo: z.string().trim().min(1).max(64),
});

export type EcpayNotifyInput = z.infer<typeof ecpayNotifyInputSchema>;
export type EcpayQueryInput = z.infer<typeof ecpayQueryInputSchema>;

type DataBoundaryDto = {
  providerCredentialsReturned: false;
  providerRawPayloadReturned: false;
  providerRawPayloadStored: false;
  browserGeneratedChecksumAllowed: false;
  paymentTokenReturned: false;
};

type ActivationBoundaryDto = {
  allowed: false;
  reason: "server_notification_query_not_verified" | "ecpay_provider_disabled";
  redirectOnlyActivationAllowed: false;
};

export type DisabledEcpayNotifyDto = {
  version: typeof BILLING_ECPAY_NOTIFY_CONTRACT_VERSION;
  status: "disabled";
  source: "guarded_disabled";
  provider: "ECPAY";
  providerAttempted: false;
  receivedAt: string;
  notification: {
    merchantTradeNo: string;
    providerTradeNoAccepted: boolean;
    returnCodeAccepted: number | null;
    amountAccepted: boolean;
    paymentDateAccepted: boolean;
    checkMacValueProvided: boolean;
    checkMacValueVerified: boolean;
    rawCheckMacValueEchoed: false;
  };
  checkMacValidation: EcpayCheckMacValidationDto;
  idempotency: {
    key: string;
    duplicateSafe: true;
    ledgerWriteAttempted: false;
    duplicateLedgerWritePrevented: true;
    transactionCreated: false;
    orderUpdated: false;
  };
  ledger: BillingLedgerIdempotencyContractDto;
  transactionPersistence: BillingPaymentTransactionPersistenceContractDto;
  confirmedActivation: BillingConfirmedActivationContractDto;
  activation: ActivationBoundaryDto;
  dataBoundary: DataBoundaryDto;
  requiredProof: Array<
    "checkmac_validation" | "server_query_confirmation" | "transaction_ledger_idempotency" | "manual_review_failure_refund_void"
  >;
};

export type DisabledEcpayQueryDto = {
  version: typeof BILLING_ECPAY_QUERY_CONTRACT_VERSION;
  status: "disabled";
  source: "guarded_disabled";
  provider: "ECPAY";
  providerAttempted: false;
  queriedAt: string;
  query: {
    merchantTradeNo: string;
    queryAttempted: false;
    confirmationReceived: false;
    providerStatusAccepted: false;
  };
  idempotency: {
    key: string;
    ledgerWriteAttempted: false;
    duplicateSafe: true;
    transactionCreated: false;
    orderUpdated: false;
  };
  ledger: BillingLedgerIdempotencyContractDto;
  serverQueryBoundary: EcpayServerQueryBoundaryDto;
  transactionPersistence: BillingPaymentTransactionPersistenceContractDto;
  confirmedActivation: BillingConfirmedActivationContractDto;
  activation: ActivationBoundaryDto;
  dataBoundary: DataBoundaryDto;
  requiredProof: Array<
    "server_query_confirmation" | "transaction_ledger_idempotency" | "manual_review_failure_refund_void"
  >;
};

export type EcpayServerQueryBoundaryDto = {
  version: typeof BILLING_ECPAY_SERVER_QUERY_BOUNDARY_VERSION;
  status: "guarded_disabled";
  provider: "ECPAY";
  endpoint: "/api/billing/ecpay/query";
  merchantTradeNo: string;
  serverOwnership: {
    browserQueryAllowed: false;
    clientSuppliedOrganizationTrusted: false;
    clientSuppliedAmountTrusted: false;
    returnUrlActivationAllowed: false;
  };
  providerQuery: {
    providerAttempted: false;
    queryProtocol: "server_to_server";
    confirmationReceived: false;
    providerStatusAccepted: false;
    rawProviderPayloadStored: false;
    providerCredentialsReturned: false;
  };
  confirmationGate: {
    requiredBeforeTransactionPersistence: true;
    requiredBeforeActivation: true;
    acceptedLedgerStatuses: ["PAID", "QUERY_CONFIRMED"];
    paymentTransactionUpsertAttempted: false;
    organizationPlanUpdated: false;
  };
  ledger: BillingLedgerIdempotencyContractDto;
  aiUsageLogPolicy: {
    required: false;
    reason: "no_openai_or_anthropic_provider_call";
    fakeUsageLogAllowed: false;
  };
  remainingProof: Array<
    | "provider_env_and_credentials"
    | "ecpay_server_query_response_validation"
    | "payment_transaction_upsert"
    | "confirmed_activation"
    | "manual_review_failure_refund_void"
  >;
};

export function buildDisabledEcpayNotifyDto(
  input: EcpayNotifyInput,
  now = new Date(),
  checkMacHashInfo: EcpayCheckMacHashInfo | null = null,
): DisabledEcpayNotifyDto {
  const checkMacValidation = buildGuardedEcpayCheckMacValidation(input, checkMacHashInfo);
  const ledger = buildEcpayNotifyLedgerIdempotencyContract(input);
  const transactionPersistence = buildPaymentTransactionPersistenceContract({
    source: "ecpay_notify",
    merchantTradeNo: input.MerchantTradeNo,
    providerTradeNoAccepted: Boolean(input.TradeNo),
    statusWhenVerified: ledger.ledgerTarget.statusWhenVerified,
    ledger,
  });

  return {
    version: BILLING_ECPAY_NOTIFY_CONTRACT_VERSION,
    status: "disabled",
    source: "guarded_disabled",
    provider: "ECPAY",
    providerAttempted: false,
    receivedAt: now.toISOString(),
    notification: {
      merchantTradeNo: input.MerchantTradeNo,
      providerTradeNoAccepted: Boolean(input.TradeNo),
      returnCodeAccepted: input.RtnCode ?? null,
      amountAccepted: input.TradeAmt !== undefined,
      paymentDateAccepted: Boolean(input.PaymentDate),
      checkMacValueProvided: Boolean(input.CheckMacValue),
      checkMacValueVerified: checkMacValidation.verified,
      rawCheckMacValueEchoed: false,
    },
    checkMacValidation,
    idempotency: {
      key: input.MerchantTradeNo,
      duplicateSafe: true,
      ledgerWriteAttempted: false,
      duplicateLedgerWritePrevented: true,
      transactionCreated: false,
      orderUpdated: false,
    },
    ledger,
    transactionPersistence,
    confirmedActivation: buildConfirmedActivationContract({
      source: "ecpay_notify",
      merchantTradeNo: input.MerchantTradeNo,
      statusWhenVerified: ledger.ledgerTarget.statusWhenVerified,
      ledger,
      transactionPersistence,
    }),
    activation: {
      allowed: false,
      reason: "server_notification_query_not_verified",
      redirectOnlyActivationAllowed: false,
    },
    dataBoundary: disabledPaymentDataBoundary(),
    requiredProof: [
      "checkmac_validation",
      "server_query_confirmation",
      "transaction_ledger_idempotency",
      "manual_review_failure_refund_void",
    ],
  };
}

export function buildDisabledEcpayQueryDto(input: EcpayQueryInput, now = new Date()): DisabledEcpayQueryDto {
  const ledger = buildEcpayQueryLedgerIdempotencyContract(input);
  const transactionPersistence = buildPaymentTransactionPersistenceContract({
    source: "ecpay_query",
    merchantTradeNo: input.merchantTradeNo,
    providerTradeNoAccepted: ledger.lookup.providerTradeNoAccepted,
    statusWhenVerified: ledger.ledgerTarget.statusWhenVerified,
    ledger,
  });

  return {
    version: BILLING_ECPAY_QUERY_CONTRACT_VERSION,
    status: "disabled",
    source: "guarded_disabled",
    provider: "ECPAY",
    providerAttempted: false,
    queriedAt: now.toISOString(),
    query: {
      merchantTradeNo: input.merchantTradeNo,
      queryAttempted: false,
      confirmationReceived: false,
      providerStatusAccepted: false,
    },
    idempotency: {
      key: input.merchantTradeNo,
      ledgerWriteAttempted: false,
      duplicateSafe: true,
      transactionCreated: false,
      orderUpdated: false,
    },
    ledger,
    serverQueryBoundary: buildEcpayServerQueryBoundaryDto(input, ledger),
    transactionPersistence,
    confirmedActivation: buildConfirmedActivationContract({
      source: "ecpay_query",
      merchantTradeNo: input.merchantTradeNo,
      statusWhenVerified: ledger.ledgerTarget.statusWhenVerified,
      ledger,
      transactionPersistence,
    }),
    activation: {
      allowed: false,
      reason: "ecpay_provider_disabled",
      redirectOnlyActivationAllowed: false,
    },
    dataBoundary: disabledPaymentDataBoundary(),
    requiredProof: [
      "server_query_confirmation",
      "transaction_ledger_idempotency",
      "manual_review_failure_refund_void",
    ],
  };
}

export function buildEcpayServerQueryBoundaryDto(
  input: EcpayQueryInput,
  ledger = buildEcpayQueryLedgerIdempotencyContract(input),
): EcpayServerQueryBoundaryDto {
  return {
    version: BILLING_ECPAY_SERVER_QUERY_BOUNDARY_VERSION,
    status: "guarded_disabled",
    provider: "ECPAY",
    endpoint: "/api/billing/ecpay/query",
    merchantTradeNo: input.merchantTradeNo,
    serverOwnership: {
      browserQueryAllowed: false,
      clientSuppliedOrganizationTrusted: false,
      clientSuppliedAmountTrusted: false,
      returnUrlActivationAllowed: false,
    },
    providerQuery: {
      providerAttempted: false,
      queryProtocol: "server_to_server",
      confirmationReceived: false,
      providerStatusAccepted: false,
      rawProviderPayloadStored: false,
      providerCredentialsReturned: false,
    },
    confirmationGate: {
      requiredBeforeTransactionPersistence: true,
      requiredBeforeActivation: true,
      acceptedLedgerStatuses: ["PAID", "QUERY_CONFIRMED"],
      paymentTransactionUpsertAttempted: false,
      organizationPlanUpdated: false,
    },
    ledger,
    aiUsageLogPolicy: {
      required: false,
      reason: "no_openai_or_anthropic_provider_call",
      fakeUsageLogAllowed: false,
    },
    remainingProof: [
      "provider_env_and_credentials",
      "ecpay_server_query_response_validation",
      "payment_transaction_upsert",
      "confirmed_activation",
      "manual_review_failure_refund_void",
    ],
  };
}

function disabledPaymentDataBoundary(): DataBoundaryDto {
  return {
    providerCredentialsReturned: false,
    providerRawPayloadReturned: false,
    providerRawPayloadStored: false,
    browserGeneratedChecksumAllowed: false,
    paymentTokenReturned: false,
  };
}
