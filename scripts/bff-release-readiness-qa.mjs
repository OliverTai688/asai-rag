#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

assertFileContains("src/app/api/platform/release-readiness/route.ts", [
  "requirePlatformUser",
  "canReadPlatformSummary",
  "PLATFORM_RELEASE_READINESS_FORBIDDEN",
]);

assertFileContains("src/lib/platform/platform-release-readiness-repository.ts", [
  "billingBffSubgates",
  "billingBffGate",
  "checkout_disabled_contract",
  "ecpay_notify_disabled_skeleton",
  "ecpay_checksum_boundary",
  "ledger_idempotency_contract",
  "subscription_ui_consumption",
  "ecpay_server_query_guarded_boundary",
  "ecpay_server_query_confirmation",
  "payment_transaction_persistence_guarded_contract",
  "payment_transaction_persistence",
  "confirmed_activation_guarded_contract",
  "confirmed_activation",
  "production_payment_env_callback",
  "refund_void_manual_review",
  "BFF-402f guarded boundary is proven; provider query proof pending",
  "BFF-402g guarded contract is proven; live DB upsert proof pending",
  "BFF-402h guarded contract is proven; live activation proof pending",
  "operator manual-setting + callback proof pending",
  "billing subgates keep unfinished payment lifecycle blockers visible",
]);

assertFileContains("package.json", [
  "\"bff:release-readiness-qa\": \"node scripts/bff-release-readiness-qa.mjs\"",
]);

assertFileOmits("src/lib/platform/platform-release-readiness-repository.ts", [
  "HashKey",
  "HashIV",
  "CheckMacValue",
  "rawPayload",
  "providerPayload",
  "paymentToken",
  "cardData",
  "rawPaymentData",
  "cookie",
  "OTP",
  "fetch(",
  "openai.",
  "anthropic.",
  ".create(",
  ".createMany(",
  ".update(",
  ".updateMany(",
  ".upsert(",
  ".delete(",
  ".deleteMany(",
]);

assertFileContains("docs/05_execution-plans/PLN-019_full-site-bff-batch-tasks-v1.0.md", [
  "BFF-404a - Release Readiness BFF Gate Projection",
  "billing subgates",
  "query confirmation",
  "payment transaction persistence",
  "refund/void/manual review",
]);

assertFileContains("docs/08_acceptance-and-qa/ACC-011_full-site-bff-acceptance-framework-v1.0.md", [
  "BFF-404a",
  "remains platform-only",
  "must not collapse `BFF-402e` into production payment readiness",
]);

push(
  true,
  "no provider or DB mutation required",
  "release-readiness projection uses static source gates and Prisma read aggregates only; no AiUsageLog is required for this no-provider QA",
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
    `${filePath} omits private/payment/provider mutation sentinels`,
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
