#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "billing-payment-transaction-upsert-boundary-qa");
const checks = [];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

try {
  assertFileContains("src/domains/subscription/payment-transaction-persistence.ts", [
    "asai.billing.payment_transaction_upsert_boundary.v1",
    "BillingPaymentTransactionUpsertBoundaryDto",
    "BillingPaymentTransactionUpsertBoundaryDraftDto",
    "buildPaymentTransactionUpsertBoundary",
    "buildPaymentTransactionUpsertBoundaryDraft",
    'operation: "upsert_payload_boundary_only"',
    'allowedCreateColumns: [',
    '"organizationId"',
    '"orderId"',
    '"provider"',
    '"kind"',
    '"status"',
    '"merchantTradeNo"',
    '"providerTradeNo"',
    '"amount"',
    '"currency"',
    '"verifiedAt"',
    'allowedUpdateColumns: ["status", "providerTradeNo", "amount", "currency", "verifiedAt"]',
    "organizationIdFromClientTrusted: false",
    "amountFromClientTrusted: false",
    "providerStatusFromClientTrusted: false",
    "browserRedirectTrusted: false",
    "requiresLedgerIdempotencyContract: true",
    "providerOpaquePayloadStored: false",
    "providerChecksumStored: false",
    "rawPaymentDataStored: false",
    "paymentTransactionUpsertAttempted: false",
    "organizationPlanUpdated: false",
    "fakeUsageLogAllowed: false",
  ]);

  assertFileContains("src/lib/platform/platform-release-readiness-repository.ts", [
    "payment_transaction_upsert_payload_boundary",
    "Payment transaction upsert payload boundary",
    "pnpm billing:payment-transaction-upsert-boundary-qa",
    "BFF-402g guarded contract is proven; live DB upsert proof pending",
  ]);

  assertFileContains("scripts/bff-release-readiness-qa.mjs", [
    "payment_transaction_upsert_payload_boundary",
    "Payment transaction upsert payload boundary",
  ]);

  assertFileContains("package.json", [
    '"billing:payment-transaction-upsert-boundary-qa": "node scripts/billing-payment-transaction-upsert-boundary-qa.mjs"',
  ]);

  for (const filePath of [
    "src/domains/subscription/payment-transaction-persistence.ts",
    "scripts/billing-payment-transaction-upsert-boundary-dry-run.ts",
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
      "ECPAY_HASH_KEY",
      "ECPAY_HASH_IV",
    ]);
  }

  execFileSync(
    "pnpm",
    [
      "exec",
      "tsc",
      "--target",
      "ES2022",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "--esModuleInterop",
      "--skipLibCheck",
      "--strict",
      "--outDir",
      outDir,
      "scripts/billing-payment-transaction-upsert-boundary-dry-run.ts",
      "src/domains/subscription/payment-transaction-persistence.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );

  execFileSync("node", [join(outDir, "scripts", "billing-payment-transaction-upsert-boundary-dry-run.js")], {
    cwd: root,
    stdio: "inherit",
  });

  push(true, "no provider, DB mutation, or AI call required", "upsert payload boundary is a guarded draft only");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

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
    `${filePath} guarded upsert boundary omissions`,
    present.length === 0 ? `checked ${fragments.length} fragments` : `present=${present.join(", ")}`,
  );
}

function readFile(filePath) {
  return readFileSync(join(root, filePath), "utf8");
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
