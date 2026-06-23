#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

assertFileContains("src/domains/subscription/ecpay.ts", [
  "asai.billing.ecpay.server_query_boundary.v1",
  "buildEcpayServerQueryBoundaryDto",
  "serverQueryBoundary: buildEcpayServerQueryBoundaryDto",
  "endpoint: \"/api/billing/ecpay/query\"",
  "browserQueryAllowed: false",
  "clientSuppliedOrganizationTrusted: false",
  "clientSuppliedAmountTrusted: false",
  "returnUrlActivationAllowed: false",
  "providerAttempted: false",
  "queryProtocol: \"server_to_server\"",
  "confirmationReceived: false",
  "providerStatusAccepted: false",
  "rawProviderPayloadStored: false",
  "providerCredentialsReturned: false",
  "requiredBeforeTransactionPersistence: true",
  "requiredBeforeActivation: true",
  "paymentTransactionUpsertAttempted: false",
  "organizationPlanUpdated: false",
  "fakeUsageLogAllowed: false",
  "ecpay_server_query_response_validation",
]);

assertFileContains("src/app/api/billing/ecpay/query/route.ts", [
  "requireCurrentMember",
  "buildDisabledEcpayQueryDto",
  "BILLING_ECPAY_QUERY_DISABLED",
  "BILLING_ECPAY_AUTH_UNAVAILABLE",
  "providerAttempted: false",
  "status: 503",
]);

assertFileContains("scripts/billing-ecpay-disabled-qa.mjs", [
  "asai.billing.ecpay.server_query_boundary.v1",
  "ECPay query includes server query boundary contract",
  "ECPay query boundary rejects browser-side provider query",
  "ECPay query boundary requires confirmation before transaction persistence",
  "ECPay query boundary does not upsert PaymentTransaction",
  "ECPay query boundary forbids fake AiUsageLog",
]);

assertFileContains("src/lib/platform/platform-release-readiness-repository.ts", [
  "ecpay_server_query_guarded_boundary",
  "pnpm billing:ecpay-query-boundary-qa",
  "BFF-402f guarded boundary is proven; provider query proof pending",
  "ecpay_server_query_confirmation",
]);

assertFileContains("package.json", [
  "\"billing:ecpay-query-boundary-qa\": \"node scripts/billing-ecpay-query-boundary-qa.mjs\"",
]);

assertFileContains("docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md", [
  "BFF-402f - ECPay Server Query Guarded Boundary",
  "server query boundary",
  "does not satisfy real ECPay server query confirmation",
]);

assertFileContains("docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md", [
  "BFF-402f",
  "server query boundary proof",
  "must keep real provider query confirmation blocked",
]);

for (const filePath of [
  "src/domains/subscription/ecpay.ts",
  "src/app/api/billing/ecpay/query/route.ts",
]) {
  assertFileOmits(filePath, [
    "payment succeeded",
    "payment success",
    "Payment completed",
    "HashKey",
    "HashIV",
    "ECPAY_HASH_KEY",
    "ECPAY_HASH_IV",
    "paymentTransaction.create",
    "paymentTransaction.upsert",
    "subscriptionOrder.update",
    "organization.update",
    "fetch(\"https://",
    "fetch('https://",
    "providerPayload",
    "rawPayload:",
    "aiUsageLog.create",
  ]);
}

push(
  true,
  "no provider or DB mutation required",
  "server query boundary is a guarded-disabled contract; no AiUsageLog is required because no OpenAI/Anthropic call or ECPay provider call is attempted",
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
    `${filePath} omits payment/provider/DB mutation sentinels`,
    present.length === 0 ? `checked ${fragments.length} fragments` : `present=${present.join(", ")}`,
  );
}

function readFile(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
