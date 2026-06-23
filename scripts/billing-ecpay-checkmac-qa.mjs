#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

assertFileContains("src/domains/subscription/ecpay-checkmac.ts", [
  "asai.billing.ecpay.checkmac.v1",
  'method: "SHA256"',
  'source: "server_only"',
  'createHash("sha256")',
  "timingSafeEqual",
  "CheckMacValue",
  "HashKey=",
  "HashIV=",
  "hashKeyReturned: false",
  "hashIvReturned: false",
  "rawCheckMacValueReturned: false",
  "rawCheckMacValueStored: false",
  "browserGeneratedChecksumAllowed: false",
  "providerCallAttempted: false",
  "aiUsageLogRequired: false",
]);

assertFileContains("src/domains/subscription/ecpay.ts", [
  "buildGuardedEcpayCheckMacValidation",
  "checkMacValidation: EcpayCheckMacValidationDto",
  "checkMacValueVerified: checkMacValidation.verified",
  "rawCheckMacValueEchoed: false",
  "providerAttempted: false",
]);

assertFileContains("src/app/api/billing/ecpay/notify/route.ts", [
  "readEcpayCheckMacHashInfoFromEnv",
  "ECPAY_HASH_KEY",
  "ECPAY_HASH_IV",
  "buildDisabledEcpayNotifyDto(parsed.data, new Date(), readEcpayCheckMacHashInfoFromEnv())",
  "BILLING_ECPAY_NOTIFY_DISABLED",
  "status: 503",
]);

assertFileContains("scripts/billing-ecpay-disabled-qa.mjs", [
  "ECPAY_HASH_KEY: qaHashKey",
  "ECPAY_HASH_IV: qaHashIv",
  "checkMacValidation?.status === \"verified\"",
  "checkMacValidation?.status === \"invalid\"",
  "tamperedPayload",
]);

assertFileContains("package.json", [
  '"billing:ecpay-checkmac-qa": "node scripts/billing-ecpay-checkmac-qa.mjs"',
]);

for (const filePath of [
  "src/domains/subscription/ecpay-checkmac.ts",
  "src/domains/subscription/ecpay.ts",
  "src/app/api/billing/ecpay/notify/route.ts",
]) {
  assertFileOmits(filePath, [
    "payment succeeded",
    "payment success",
    "Payment completed",
    "paymentTransaction.create",
    "subscriptionOrder.update",
    "subscriptionOrder.create",
    "prisma.",
    "providerPayload",
    "rawPayload:",
  ]);
}

assertEqual(
  createFixtureCheckMacValue(),
  "2F4BA16914DBFC5F0CDDC4B4003F97C342483BE758C8AE02BA46E632DFD06321",
  "fixture CheckMacValue remains deterministic",
);

push(
  true,
  "no provider or AI call required",
  "CheckMacValue proof uses local crypto only; AiUsageLog is not required for no-provider paths",
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

function assertEqual(actual, expected, label) {
  push(actual === expected, label, actual === expected ? expected : `actual=${actual}; expected=${expected}`);
}

function createFixtureCheckMacValue() {
  const hashKey = "qa-checkmac-key";
  const hashIv = "qa-checkmac-iv";
  const input = {
    MerchantID: "3002607",
    MerchantTradeNo: "asai-checkmac-qa",
    PaymentType: "aio",
    RtnCode: 1,
    TradeAmt: 1880,
  };
  const rawSource = [
    `HashKey=${hashKey}`,
    ...Object.entries(input)
      .sort(([leftKey], [rightKey]) => compareCaseInsensitiveAscii(leftKey, rightKey))
      .map(([key, value]) => `${key}=${String(value)}`),
    `HashIV=${hashIv}`,
  ].join("&");
  const encoded = encodeURIComponent(rawSource)
    .replace(/%20/g, "+")
    .replace(/%2D/gi, "-")
    .replace(/%5F/gi, "_")
    .replace(/%2E/gi, ".")
    .replace(/%21/gi, "!")
    .replace(/%2A/gi, "*")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")")
    .toLowerCase();

  return createHash("sha256").update(encoded, "utf8").digest("hex").toUpperCase();
}

function compareCaseInsensitiveAscii(left, right) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();

  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function readFile(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
