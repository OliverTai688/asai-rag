#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

assertFileContains("src/domains/subscription/ledger.ts", [
  "asai.billing.ledger_idempotency.v1",
  "organization_provider_merchant_trade_no",
  'uniqueBy: ["organizationId", "provider", "merchantTradeNo"]',
  'mutation: "upsert_when_enabled"',
  'duplicateNotificationBehavior: "return_existing_transaction_without_plan_reactivation"',
  "duplicateWritePrevented: true",
  "requiresConfirmedLedger: true",
  'acceptedLedgerStatuses: ["PAID", "QUERY_CONFIRMED"]',
  "redirectOnlyActivationAllowed: false",
  "browserPlanAssumptionsAllowed: false",
  "organizationPlanUpdated: false",
  "failureRefundVoidStatusRetained: true",
  "destructivePaymentActionAllowed: false",
  "providerRawPayloadStored: false",
  "rawCheckMacValueStored: false",
  "aiUsageLogRequired: false",
  "providerCallAttempted: false",
]);

assertFileContains("src/domains/subscription/ecpay.ts", [
  "buildEcpayNotifyLedgerIdempotencyContract",
  "buildEcpayQueryLedgerIdempotencyContract",
  "buildPaymentTransactionPersistenceContract",
  "ledger: BillingLedgerIdempotencyContractDto",
  "const ledger = buildEcpayNotifyLedgerIdempotencyContract(input)",
  "const ledger = buildEcpayQueryLedgerIdempotencyContract(input)",
  "serverQueryBoundary: buildEcpayServerQueryBoundaryDto(input, ledger)",
  "transactionPersistence: buildPaymentTransactionPersistenceContract",
  "statusWhenVerified: ledger.ledgerTarget.statusWhenVerified",
  "ledgerWriteAttempted: false",
  "transactionCreated: false",
  "orderUpdated: false",
]);

assertFileContains("src/domains/subscription/payment-transaction-persistence.ts", [
  "asai.billing.payment_transaction_persistence.v1",
  "contractVersion: input.ledger.version",
  "scope: input.ledger.scope",
  "activationRequiresConfirmedLedger: true",
  "duplicateWritePrevented: true",
  "paymentTransactionUpsertAttempted: false",
  "rawProviderPayloadPersisted: false",
]);

assertFileContains("src/domains/subscription/plan-change.ts", [
  "BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION",
  "ledgerContractVersion: BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION",
  'ledgerScope: "organization_provider_merchant_trade_no"',
  'requiredLedgerStatusesBeforePlanMutation: ["PAID", "QUERY_CONFIRMED"]',
  "planUpdated: false",
  "organizationPlanUpdated: false",
  "dbWriteAttempted: false",
]);

assertFileContains("scripts/billing-ecpay-disabled-qa.mjs", [
  "ledger?.version === \"asai.billing.ledger_idempotency.v1\"",
  "ledger?.writePlan?.dbWriteAttempted === false",
  "ledger?.activationGate?.organizationPlanUpdated === false",
]);

assertFileContains("package.json", [
  '"billing:ledger-idempotency-qa": "node scripts/billing-ledger-idempotency-qa.mjs"',
]);

for (const filePath of [
  "src/domains/subscription/ledger.ts",
  "src/domains/subscription/plan-change.ts",
]) {
  assertFileOmits(filePath, [
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
}

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
  "no provider or AI call required",
  "ledger idempotency proof is a static source contract; AiUsageLog is not required for no-provider paths",
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
    `${filePath} guarded boundary omissions`,
    present.length === 0 ? `checked ${fragments.length} fragments` : `present=${present.join(", ")}`,
  );
}

function readFile(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
