#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

assertFileContains("src/domains/subscription/payment-transaction-persistence.ts", [
  "asai.billing.payment_transaction_persistence.v1",
  'table: "PaymentTransaction"',
  'uniqueBy: ["organizationId", "provider", "merchantTradeNo"]',
  'mutation: "upsert_when_enabled"',
  'reason: "provider_confirmation_disabled"',
  'acceptedStatusesBeforeUpsert: ["PAID", "QUERY_CONFIRMED"]',
  "requiresCheckMacValidationForNotify: input.source === \"ecpay_notify\"",
  "requiresServerQueryConfirmationForQuery: input.source === \"ecpay_query\"",
  "clientSuppliedOrganizationTrusted: false",
  "clientSuppliedAmountTrusted: false",
  "amountFromClientTrusted: false",
  "providerStatusFromClientTrusted: false",
  "dbWriteAttempted: false",
  "paymentTransactionUpsertAttempted: false",
  "transactionCreated: false",
  "transactionUpdated: false",
  "subscriptionOrderUpdated: false",
  "organizationPlanUpdated: false",
  "redirectOnlyActivationAllowed: false",
  "activationRequiresConfirmedLedger: true",
  "rawProviderPayloadPersisted: false",
  "rawCheckMacValueStored: false",
  "rawPrivateTranscriptStored: false",
  "paymentTokenStored: false",
  "allowlistedProviderSummaryOnly: true",
  "providerCallAttempted: false",
  "aiUsageLogRequired: false",
  "fakeUsageLogAllowed: false",
  "payment_transaction_db_upsert",
  "manual_review_failure_refund_void",
]);

assertFileContains("src/domains/subscription/ecpay.ts", [
  "buildPaymentTransactionPersistenceContract",
  "transactionPersistence: BillingPaymentTransactionPersistenceContractDto",
  "transactionPersistence: buildPaymentTransactionPersistenceContract",
  'source: "ecpay_notify"',
  'source: "ecpay_query"',
  "statusWhenVerified: ledger.ledgerTarget.statusWhenVerified",
  "paymentTransactionUpsertAttempted: false",
  "organizationPlanUpdated: false",
]);

assertFileContains("src/lib/platform/platform-release-readiness-repository.ts", [
  "payment_transaction_persistence_guarded_contract",
  "Payment transaction persistence guarded contract",
  "pnpm billing:payment-transaction-persistence-qa",
  "payment_transaction_persistence",
  "BFF-402g guarded contract is proven; live DB upsert proof pending",
]);

assertFileContains("scripts/billing-ecpay-disabled-qa.mjs", [
  "asai.billing.payment_transaction_persistence.v1",
  "ECPay notify ${label} includes PaymentTransaction persistence contract",
  "ECPay query includes PaymentTransaction persistence contract",
]);

assertFileContains("scripts/bff-release-readiness-qa.mjs", [
  "payment_transaction_persistence_guarded_contract",
  "BFF-402g guarded contract is proven; live DB upsert proof pending",
]);

assertFileContains("package.json", [
  '"billing:payment-transaction-persistence-qa": "node scripts/billing-payment-transaction-persistence-qa.mjs"',
]);

assertFileContains("docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md", [
  "BFF-402g - PaymentTransaction Persistence Guarded Contract",
  "asai.billing.payment_transaction_persistence.v1",
]);

assertFileContains("docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md", [
  "BFF-402g",
  "payment_transaction_persistence_guarded_contract",
]);

assertFileOmits("src/domains/subscription/payment-transaction-persistence.ts", [
  "prisma.",
  ".create(",
  ".createMany(",
  ".update(",
  ".updateMany(",
  ".upsert(",
  ".delete(",
  ".deleteMany(",
  "paymentTransaction.",
  "subscriptionOrder.",
  "HashKey",
  "HashIV",
  "ECPAY_HASH_KEY",
  "ECPAY_HASH_IV",
  "CheckMacValue:",
  "providerPayload",
  "rawPayload:",
]);

assertFileOmits("src/domains/subscription/ecpay.ts", [
  "prisma.",
  ".create(",
  ".createMany(",
  ".update(",
  ".updateMany(",
  ".upsert(",
  ".delete(",
  ".deleteMany(",
  "paymentTransaction.",
  "subscriptionOrder.",
  "HashKey",
  "HashIV",
  "ECPAY_HASH_KEY",
  "ECPAY_HASH_IV",
  "providerPayload",
  "rawPayload:",
]);

push(
  true,
  "no provider, DB mutation, or AI call required",
  "PaymentTransaction persistence proof is a guarded source contract; AiUsageLog is not required for this no-provider path",
);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function assertFileContains(filePath, fragments) {
  const contents = readFile(filePath);

  for (const fragment of fragments) {
    push(contents.includes(fragment), `${filePath} contains ${fragment}`);
  }
}

function assertFileOmits(filePath, fragments) {
  const contents = readFile(filePath);
  const present = fragments.filter((fragment) => contents.includes(fragment));

  push(
    present.length === 0,
    `${filePath} guarded persistence omissions`,
    present.length === 0 ? `checked ${fragments.length} fragments` : `present=${present.join(", ")}`,
  );
}

function readFile(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
