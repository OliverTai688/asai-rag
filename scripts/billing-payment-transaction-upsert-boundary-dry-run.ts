import {
  BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION,
  buildPaymentTransactionPersistenceContract,
  buildPaymentTransactionUpsertBoundaryDraft,
} from "../src/domains/subscription/payment-transaction-persistence";
import {
  buildEcpayNotifyLedgerIdempotencyContract,
  buildEcpayQueryLedgerIdempotencyContract,
} from "../src/domains/subscription/ledger";

const notifyLedger = buildEcpayNotifyLedgerIdempotencyContract({
  MerchantTradeNo: "ecpay-boundary-order-notify",
  TradeNo: "ecpay-provider-trade-redacted",
  RtnCode: 1,
  RtnMsg: "paid",
  TradeAmt: 18800,
  PaymentDate: "2026/06/23 19:30:00",
  PaymentType: "Credit_CreditCard",
  CheckMacValue: "QA_CHECKMAC_VALUE_SHOULD_NOT_APPEAR_IN_OUTPUT",
});
const queryLedger = buildEcpayQueryLedgerIdempotencyContract({
  merchantTradeNo: "ecpay-boundary-order-query",
});

const notifyContract = buildPaymentTransactionPersistenceContract({
  source: "ecpay_notify",
  merchantTradeNo: "ecpay-boundary-order-notify",
  providerTradeNoAccepted: true,
  statusWhenVerified: notifyLedger.ledgerTarget.statusWhenVerified,
  ledger: notifyLedger,
});
const queryContract = buildPaymentTransactionPersistenceContract({
  source: "ecpay_query",
  merchantTradeNo: "ecpay-boundary-order-query",
  providerTradeNoAccepted: false,
  statusWhenVerified: queryLedger.ledgerTarget.statusWhenVerified,
  ledger: queryLedger,
});

const notifyDraft = buildPaymentTransactionUpsertBoundaryDraft({
  organizationId: "org_demo_boundary",
  orderId: "order_demo_boundary",
  source: "ecpay_notify",
  merchantTradeNo: "ecpay-boundary-order-notify",
  providerTradeNo: "ecpay-provider-trade-redacted",
  amount: "18800.00",
  statusWhenVerified: "PAID",
  verifiedAt: "2026-06-23T11:44:13.523Z",
});
const queryDraft = buildPaymentTransactionUpsertBoundaryDraft({
  organizationId: "org_demo_boundary",
  source: "ecpay_query",
  merchantTradeNo: "ecpay-boundary-order-query",
  amount: "18800.00",
  statusWhenVerified: "QUERY_CONFIRMED",
  verifiedAt: "2026-06-23T11:44:13.523Z",
});

const failures: string[] = [];

if (notifyContract.upsertPayloadBoundary.version !== BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION) {
  failures.push("notify contract boundary version mismatch");
}
if (queryContract.upsertPayloadBoundary.version !== BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION) {
  failures.push("query contract boundary version mismatch");
}
if (!notifyContract.upsertPayloadBoundary.writePreconditions.requiresCheckMacValidationForNotify) {
  failures.push("notify boundary must require checksum validation");
}
if (!queryContract.upsertPayloadBoundary.writePreconditions.requiresServerQueryConfirmationForQuery) {
  failures.push("query boundary must require server query confirmation");
}
if (notifyContract.upsertPayloadBoundary.safety.paymentTransactionUpsertAttempted) {
  failures.push("contract attempted a PaymentTransaction upsert");
}
if (queryContract.upsertPayloadBoundary.safety.organizationPlanUpdated) {
  failures.push("contract attempted organization plan activation");
}
if (notifyDraft.createValues.kind !== "NOTIFICATION") failures.push("notify draft kind mismatch");
if (queryDraft.createValues.kind !== "QUERY") failures.push("query draft kind mismatch");
if (notifyDraft.uniqueScope.organizationId !== "org_demo_boundary") failures.push("notify draft lost org scope");
if (queryDraft.createValues.orderId !== null) failures.push("query draft should tolerate missing order id");
if (notifyDraft.createValues.status !== "PAID") failures.push("notify draft status mismatch");
if (queryDraft.updateValues.status !== "QUERY_CONFIRMED") failures.push("query draft status mismatch");

for (const draft of [notifyDraft, queryDraft]) {
  if (draft.guardEvidence.enabled) failures.push(`${draft.source} draft unexpectedly enabled`);
  if (draft.guardEvidence.dbWriteAttempted) failures.push(`${draft.source} draft wrote DB`);
  if (draft.guardEvidence.providerCallAttempted) failures.push(`${draft.source} draft called provider`);
  if (draft.guardEvidence.paymentTransactionUpsertAttempted) {
    failures.push(`${draft.source} draft attempted upsert`);
  }
  if (draft.guardEvidence.organizationPlanUpdated) failures.push(`${draft.source} draft activated plan`);
  if (draft.guardEvidence.clientSuppliedOrganizationTrusted) {
    failures.push(`${draft.source} draft trusted client organization`);
  }
  if (draft.guardEvidence.providerOpaquePayloadStored) {
    failures.push(`${draft.source} draft stored provider opaque payload`);
  }
  if (draft.guardEvidence.paymentTokenStored) failures.push(`${draft.source} draft stored payment token`);
}

const serialized = JSON.stringify({ notifyContract, queryContract, notifyDraft, queryDraft });
const privateSentinels = [
  "QA_CHECKMAC_VALUE_SHOULD_NOT_APPEAR_IN_OUTPUT",
  "HashKey",
  "HashIV",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "sk-",
  "cookie",
  "OTP",
  "paymentTokenValue",
  "cardNumber",
];
for (const sentinel of privateSentinels) {
  if (serialized.includes(sentinel)) failures.push(`private sentinel leaked: ${sentinel}`);
}

if (failures.length > 0) {
  console.error(`payment transaction upsert boundary dry-run failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      version: BILLING_PAYMENT_TRANSACTION_UPSERT_BOUNDARY_VERSION,
      notifyKind: notifyDraft.createValues.kind,
      queryKind: queryDraft.createValues.kind,
      allowedCreateColumns: notifyContract.upsertPayloadBoundary.allowedCreateColumns.length,
      allowedUpdateColumns: notifyContract.upsertPayloadBoundary.allowedUpdateColumns.length,
      providerCallAttempted: notifyDraft.guardEvidence.providerCallAttempted,
      dbWriteAttempted: notifyDraft.guardEvidence.dbWriteAttempted,
      paymentTransactionUpsertAttempted: notifyDraft.guardEvidence.paymentTransactionUpsertAttempted,
      organizationPlanUpdated: notifyDraft.guardEvidence.organizationPlanUpdated,
      fakeUsageLogAllowed: notifyDraft.guardEvidence.fakeUsageLogAllowed,
    },
    null,
    2,
  ),
);
