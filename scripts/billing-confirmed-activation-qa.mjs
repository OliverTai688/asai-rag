#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

assertFileContains("src/domains/subscription/confirmed-activation.ts", [
  "asai.billing.confirmed_activation.v1",
  'table: "Organization"',
  'field: "plan"',
  'mutation: "update_when_enabled"',
  'requiresConfirmedLedger: true',
  'requiresPaymentTransactionPersistence: true',
  'requiresPaymentTransactionWriteProof: true',
  'acceptedStatusesBeforeActivation: ["PAID", "QUERY_CONFIRMED"]',
  'requiresCheckMacValidationForNotify: input.source === "ecpay_notify"',
  'requiresServerQueryConfirmationForQuery: input.source === "ecpay_query"',
  "transactionStatusFromClientTrusted: false",
  "planFromClientTrusted: false",
  "amountFromClientTrusted: false",
  "redirectReturnUrlTrusted: false",
  "browserPaymentResultTrusted: false",
  "clientSuppliedPlanTrusted: false",
  "clientSuppliedOrganizationTrusted: false",
  "localStoragePlanTrusted: false",
  'reason: "confirmed_transaction_or_provider_query_disabled"',
  "planActivated: false",
  "organizationPlanUpdated: false",
  "paymentTransactionUpsertAttempted:",
  "subscriptionOrderUpdated: false",
  "redirectOnlyActivationAllowed: false",
  "browserPlanAssumptionsAllowed: false",
  "ledgerContractVersion: input.ledger.version",
  "transactionPersistenceContractVersion: input.transactionPersistence.version",
  "activationRequiresPaymentTransactionWrite: true",
  "transactionPersistenceWriteAttempted:",
  "rawPaymentDataStored: false",
  "rawCheckMacValueStored: false",
  "allowlistedActivationSummaryOnly: true",
  "providerCallAttempted: false",
  "aiUsageLogRequired: false",
  "fakeUsageLogAllowed: false",
  "organization_plan_activation_write",
]);

assertFileContains("src/domains/subscription/ecpay.ts", [
  "buildConfirmedActivationContract",
  "confirmedActivation: BillingConfirmedActivationContractDto",
  "confirmedActivation: buildConfirmedActivationContract",
  "const transactionPersistence = buildPaymentTransactionPersistenceContract",
  'source: "ecpay_notify"',
  'source: "ecpay_query"',
  "transactionPersistence,",
]);

assertFileContains("scripts/billing-ecpay-disabled-qa.mjs", [
  "asai.billing.confirmed_activation.v1",
  "ECPay notify ${label} includes confirmed activation contract",
  "ECPay query includes confirmed activation contract",
]);

assertFileContains("src/lib/platform/platform-release-readiness-repository.ts", [
  "confirmed_activation_guarded_contract",
  "Confirmed activation guarded contract",
  "pnpm billing:confirmed-activation-qa",
  "BFF-402h guarded contract is proven; live activation proof pending",
]);

assertFileContains("scripts/bff-release-readiness-qa.mjs", [
  "confirmed_activation_guarded_contract",
  "BFF-402h guarded contract is proven; live activation proof pending",
]);

assertFileContains("package.json", [
  '"billing:confirmed-activation-qa": "node scripts/billing-confirmed-activation-qa.mjs"',
]);

assertFileContains("docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md", [
  "BFF-402h - Confirmed Activation Guarded Contract",
  "asai.billing.confirmed_activation.v1",
]);

assertFileContains("docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md", [
  "BFF-402h",
  "confirmed_activation_guarded_contract",
]);

assertFileOmits("src/domains/subscription/confirmed-activation.ts", [
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
  "confirmed activation proof is a guarded source contract; AiUsageLog is not required for this no-provider path",
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
    `${filePath} guarded activation omissions`,
    present.length === 0 ? `checked ${fragments.length} fragments` : `present=${present.join(", ")}`,
  );
}

function readFile(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
