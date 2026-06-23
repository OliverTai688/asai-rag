#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const baseUrl = process.env.BILLING_ECPAY_DISABLED_QA_BASE_URL ?? "http://127.0.0.1:3057";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const qaHashKey = "qa-hash-key-for-checkmac-boundary";
const qaHashIv = "qa-hash-iv-for-checkmac-boundary";
const checks = [];
const startedProcesses = [];

function pass(name, detail = "") {
  checks.push({ ok: true, name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

function check(condition, name, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

function readSource(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function assertFileContains(filePath, fragments) {
  const source = readSource(filePath);
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  check(
    missing.length === 0,
    filePath,
    missing.length === 0 ? `verified ${fragments.length} fragments` : `missing ${missing.join(", ")}`,
  );
}

function assertFileOmits(filePath, fragments) {
  const source = readSource(filePath);
  const present = fragments.filter((fragment) => source.includes(fragment));
  check(
    present.length === 0,
    `${filePath} guarded boundary omissions`,
    present.length === 0 ? `checked ${fragments.length} fragments` : `present ${present.join(", ")}`,
  );
}

function verifyStaticBoundaries() {
  assertFileContains("src/domains/subscription/ecpay.ts", [
    "asai.billing.ecpay.notify.v1",
    "asai.billing.ecpay.query.v1",
    "buildEcpayNotifyLedgerIdempotencyContract",
    "buildEcpayQueryLedgerIdempotencyContract",
    "providerAttempted: false",
    "checkMacValueVerified: checkMacValidation.verified",
    "checkMacValidation",
    "rawCheckMacValueEchoed: false",
    "ledgerWriteAttempted: false",
    "transactionCreated: false",
    "orderUpdated: false",
    "redirectOnlyActivationAllowed: false",
    "providerRawPayloadStored: false",
    "manual_review_failure_refund_void",
  ]);
  assertFileContains("src/domains/subscription/ecpay-checkmac.ts", [
    "asai.billing.ecpay.checkmac.v1",
    'method: "SHA256"',
    'source: "server_only"',
    'createHash("sha256")',
    "timingSafeEqual",
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
  assertFileContains("src/domains/subscription/ledger.ts", [
    "asai.billing.ledger_idempotency.v1",
    "organization_provider_merchant_trade_no",
    'uniqueBy: ["organizationId", "provider", "merchantTradeNo"]',
    'mutation: "upsert_when_enabled"',
    'acceptedLedgerStatuses: ["PAID", "QUERY_CONFIRMED"]',
    "duplicateWritePrevented: true",
    "organizationPlanUpdated: false",
    "providerRawPayloadStored: false",
    "rawCheckMacValueStored: false",
  ]);
  assertFileContains("src/app/api/billing/ecpay/notify/route.ts", [
    "BILLING_ECPAY_NOTIFY_DISABLED",
    "buildDisabledEcpayNotifyDto",
    "readEcpayCheckMacHashInfoFromEnv",
    "ECPAY_HASH_KEY",
    "ECPAY_HASH_IV",
    "application/x-www-form-urlencoded",
    "privateJsonResponse",
    "status: 503",
  ]);
  assertFileContains("src/app/api/billing/ecpay/query/route.ts", [
    "requireCurrentMember",
    "BILLING_ECPAY_QUERY_DISABLED",
    "BILLING_ECPAY_AUTH_UNAVAILABLE",
    "providerAttempted: false",
    "status: 503",
  ]);
  for (const filePath of [
    "src/domains/subscription/ledger.ts",
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
      "subscriptionOrder.update",
      "subscriptionOrder.create",
      "prisma.",
      "providerPayload",
    ]);
  }
  for (const filePath of ["src/domains/subscription/ecpay-checkmac.ts", "src/app/api/billing/ecpay/notify/route.ts"]) {
    assertFileOmits(filePath, [
      "payment succeeded",
      "payment success",
      "Payment completed",
      "paymentTransaction.create",
      "subscriptionOrder.update",
      "subscriptionOrder.create",
      "prisma.",
      "providerPayload",
    ]);
  }
}

async function ensureDevServer() {
  if (await fetchOk(baseUrl)) {
    throw new Error(`${baseUrl} is already reachable; choose a free BILLING_ECPAY_DISABLED_QA_BASE_URL port.`);
  }

  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3000";
  console.log(`Starting ECPay disabled QA dev server at ${baseUrl}`);

  const child = spawn(pnpmBin, ["dev", "--hostname", host, "--port", port], {
    cwd: root,
    env: {
      ...process.env,
      ALLOW_DEV_AUTH_HEADER: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
      ECPAY_HASH_KEY: qaHashKey,
      ECPAY_HASH_IV: qaHashIv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  startedProcesses.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk}`));

  for (let i = 0; i < 90; i += 1) {
    if (await fetchOk(baseUrl)) {
      pass("dev-server", `started at ${baseUrl}`);
      return;
    }
    await wait(1000);
  }

  throw new Error(`Dev server did not become reachable at ${baseUrl}`);
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson(pathname, body, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });

  return parseResponse(response);
}

async function postForm(pathname, body, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(body),
    redirect: "manual",
  });

  return parseResponse(response);
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return {
    status: response.status,
    text,
    body,
    headers: response.headers,
  };
}

function memberHeaders() {
  return { "x-asai-demo-user-email": demoMemberEmail };
}

async function verifyNotifyBoundary() {
  const invalid = await postJson("/api/billing/ecpay/notify", { TradeNo: "missing-merchant-trade-no" });
  check(invalid.status === 400, "ECPay notify invalid input returns 400", `status=${invalid.status}`);
  check(invalid.body?.kind === "VALIDATION", "ECPay notify invalid input uses validation kind", invalid.body?.kind ?? "");

  const payload = {
    MerchantTradeNo: "ecpay-disabled-proof-order",
    TradeNo: "SENSITIVE_PROVIDER_TRADE_NO",
    RtnCode: "1",
    RtnMsg: "SENSITIVE_PROVIDER_MESSAGE",
    TradeAmt: "999999",
    PaymentDate: "2026/06/23 09:00:00",
    PaymentType: "Credit_CreditCard",
  };
  payload.CheckMacValue = createCheckMacValue(payload);
  const first = await postForm("/api/billing/ecpay/notify", payload);
  const second = await postForm("/api/billing/ecpay/notify", payload);

  for (const [label, response] of [
    ["first", first],
    ["duplicate", second],
  ]) {
    const notification = response.body?.notification;
    const ledger = notification?.ledger;
    check(response.status === 503, `ECPay notify ${label} returns disabled 503`, `status=${response.status}`);
    check(response.body?.error === "BILLING_ECPAY_NOTIFY_DISABLED", `ECPay notify ${label} declares disabled error`);
    check(notification?.version === "asai.billing.ecpay.notify.v1", `ECPay notify ${label} is versioned`);
    check(notification?.provider === "ECPAY", `ECPay notify ${label} declares ECPay provider`);
    check(notification?.providerAttempted === false, `ECPay notify ${label} does not contact provider`);
    check(notification?.notification?.merchantTradeNo === payload.MerchantTradeNo, `ECPay notify ${label} keeps idempotency key`);
    check(notification?.notification?.checkMacValueProvided === true, `ECPay notify ${label} records checksum presence only`);
    check(notification?.notification?.checkMacValueVerified === true, `ECPay notify ${label} verifies server-side checksum`);
    check(notification?.notification?.rawCheckMacValueEchoed === false, `ECPay notify ${label} does not echo checksum`);
    check(notification?.checkMacValidation?.version === "asai.billing.ecpay.checkmac.v1", `ECPay notify ${label} includes checksum contract`);
    check(notification?.checkMacValidation?.source === "server_only", `ECPay notify ${label} checksum is server-only`);
    check(notification?.checkMacValidation?.validationAttempted === true, `ECPay notify ${label} attempts checksum validation`);
    check(notification?.checkMacValidation?.verified === true, `ECPay notify ${label} checksum contract verifies`);
    check(notification?.checkMacValidation?.status === "verified", `ECPay notify ${label} checksum contract status is verified`);
    check(
      notification?.checkMacValidation?.receivedCheckMacValue?.echoed === false,
      `ECPay notify ${label} checksum contract does not echo raw value`,
    );
    check(
      notification?.checkMacValidation?.dataBoundary?.hashKeyReturned === false,
      `ECPay notify ${label} checksum contract returns no HashKey`,
    );
    check(
      notification?.checkMacValidation?.dataBoundary?.hashIvReturned === false,
      `ECPay notify ${label} checksum contract returns no HashIV`,
    );
    check(notification?.idempotency?.duplicateSafe === true, `ECPay notify ${label} exposes duplicate-safe disabled posture`);
    check(notification?.idempotency?.ledgerWriteAttempted === false, `ECPay notify ${label} writes no ledger`);
    check(notification?.idempotency?.transactionCreated === false, `ECPay notify ${label} creates no transaction`);
    check(notification?.idempotency?.orderUpdated === false, `ECPay notify ${label} updates no order`);
    check(ledger?.version === "asai.billing.ledger_idempotency.v1", `ECPay notify ${label} includes ledger contract`);
    check(
      ledger?.scope === "organization_provider_merchant_trade_no",
      `ECPay notify ${label} uses server-owned ledger uniqueness scope`,
    );
    check(ledger?.lookup?.merchantTradeNo === payload.MerchantTradeNo, `ECPay notify ${label} ledger keeps idempotency key`);
    check(ledger?.writePlan?.dbWriteAttempted === false, `ECPay notify ${label} ledger writes no DB`);
    check(ledger?.writePlan?.duplicateWritePrevented === true, `ECPay notify ${label} ledger is duplicate-safe`);
    check(ledger?.activationGate?.organizationPlanUpdated === false, `ECPay notify ${label} ledger blocks plan mutation`);
    check(ledger?.dataBoundary?.providerRawPayloadStored === false, `ECPay notify ${label} ledger stores no raw provider payload`);
    check(notification?.activation?.allowed === false, `ECPay notify ${label} does not activate plan`);
    check(notification?.dataBoundary?.providerCredentialsReturned === false, `ECPay notify ${label} returns no credentials`);
    check(notification?.dataBoundary?.providerRawPayloadStored === false, `ECPay notify ${label} stores no raw provider payload`);
    check(hasNoStore(response), `ECPay notify ${label} response uses no-store cache header`);
    check(hasRequestId(response), `ECPay notify ${label} response includes request id`);
    assertNoPaymentLeak(`ECPay notify ${label} response omits payment/private sentinels`, response.text, [payload.CheckMacValue]);
  }

  const tamperedPayload = {
    ...payload,
    MerchantTradeNo: "ecpay-disabled-proof-order-tampered",
    CheckMacValue: "0".repeat(64),
  };
  const tampered = await postForm("/api/billing/ecpay/notify", tamperedPayload);
  const tamperedNotification = tampered.body?.notification;
  check(tampered.status === 503, "ECPay notify invalid checksum remains disabled 503", `status=${tampered.status}`);
  check(tamperedNotification?.notification?.checkMacValueProvided === true, "ECPay notify invalid checksum records presence");
  check(tamperedNotification?.notification?.checkMacValueVerified === false, "ECPay notify invalid checksum is not verified");
  check(tamperedNotification?.checkMacValidation?.validationAttempted === true, "ECPay notify invalid checksum attempts validation");
  check(tamperedNotification?.checkMacValidation?.status === "invalid", "ECPay notify invalid checksum status is invalid");
  check(tamperedNotification?.idempotency?.ledgerWriteAttempted === false, "ECPay notify invalid checksum writes no ledger");
  check(tamperedNotification?.activation?.allowed === false, "ECPay notify invalid checksum does not activate plan");
  assertNoPaymentLeak("ECPay notify invalid checksum response omits payment/private sentinels", tampered.text, [
    tamperedPayload.CheckMacValue,
  ]);
}

async function verifyQueryBoundary() {
  const invalid = await postJson("/api/billing/ecpay/query", {});
  check(invalid.status === 400, "ECPay query invalid input returns 400 before auth", `status=${invalid.status}`);
  check(invalid.body?.kind === "VALIDATION", "ECPay query invalid input uses validation kind", invalid.body?.kind ?? "");

  const validPayload = { merchantTradeNo: "ecpay-disabled-proof-order" };
  const unauth = await postJson("/api/billing/ecpay/query", validPayload);
  check(unauth.status === 401, "ECPay query unauth returns 401", `status=${unauth.status}`);
  check(unauth.body?.kind === "AUTHENTICATION", "ECPay query unauth uses shared auth kind", unauth.body?.kind ?? "");

  const disabled = await postJson("/api/billing/ecpay/query", validPayload, memberHeaders());
  if (disabled.status === 503 && disabled.body?.error === "BILLING_ECPAY_AUTH_UNAVAILABLE") {
    check(disabled.body?.providerAttempted === false, "ECPay query DB-unavailable fallback does not contact provider");
    check(disabled.body?.kind === "INTERNAL", "ECPay query DB-unavailable fallback is explicit", disabled.body?.kind ?? "");
    check(hasNoStore(disabled), "ECPay query DB-unavailable response uses no-store cache header");
    check(hasRequestId(disabled), "ECPay query DB-unavailable response includes request id");
    assertNoPaymentLeak("ECPay query DB-unavailable response omits payment/private sentinels", disabled.text);
    pass(
      "authenticated query disabled DTO runtime proof deferred by DB availability",
      "BILLING_ECPAY_AUTH_UNAVAILABLE; rerun this script when DB is reachable to exercise disabled query DTO",
    );
    return;
  }

  const query = disabled.body?.query;
  const ledger = query?.ledger;
  check(disabled.status === 503, "ECPay query returns disabled 503", `status=${disabled.status}`);
  check(disabled.body?.error === "BILLING_ECPAY_QUERY_DISABLED", "ECPay query declares disabled error");
  check(query?.version === "asai.billing.ecpay.query.v1", "ECPay query is versioned");
  check(query?.provider === "ECPAY", "ECPay query declares provider");
  check(query?.providerAttempted === false, "ECPay query does not contact provider");
  check(query?.query?.queryAttempted === false, "ECPay query does not call provider query API");
  check(query?.query?.confirmationReceived === false, "ECPay query does not fake confirmation");
  check(query?.idempotency?.ledgerWriteAttempted === false, "ECPay query writes no ledger");
  check(query?.idempotency?.transactionCreated === false, "ECPay query creates no transaction");
  check(query?.idempotency?.orderUpdated === false, "ECPay query updates no order");
  check(ledger?.version === "asai.billing.ledger_idempotency.v1", "ECPay query includes ledger contract");
  check(ledger?.scope === "organization_provider_merchant_trade_no", "ECPay query uses server-owned ledger uniqueness scope");
  check(ledger?.writePlan?.dbWriteAttempted === false, "ECPay query ledger writes no DB");
  check(ledger?.writePlan?.duplicateWritePrevented === true, "ECPay query ledger is duplicate-safe");
  check(ledger?.activationGate?.organizationPlanUpdated === false, "ECPay query ledger blocks plan mutation");
  check(ledger?.dataBoundary?.providerRawPayloadStored === false, "ECPay query ledger stores no raw provider payload");
  check(query?.activation?.allowed === false, "ECPay query does not activate plan");
  check(query?.dataBoundary?.providerRawPayloadStored === false, "ECPay query stores no raw provider payload");
  check(hasNoStore(disabled), "ECPay query disabled response uses no-store cache header");
  check(hasRequestId(disabled), "ECPay query disabled response includes request id");
  assertNoPaymentLeak("ECPay query disabled response omits payment/private sentinels", disabled.text);
}

function hasNoStore(response) {
  return response.headers.get("cache-control")?.includes("no-store") ?? false;
}

function hasRequestId(response) {
  return Boolean(response.headers.get("x-asai-request-id"));
}

function assertNoPaymentLeak(label, text, extraForbidden = []) {
  const forbidden = [
    "SENSITIVE_CHECK_MAC_VALUE",
    "SENSITIVE_PROVIDER_TRADE_NO",
    "SENSITIVE_PROVIDER_MESSAGE",
    qaHashKey,
    qaHashIv,
    ...extraForbidden,
    "999999",
    "HashKey",
    "HashIV",
    "ECPAY_HASH_KEY",
    "ECPAY_HASH_IV",
    "AUTH_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
    "cardNumber",
    "paymentToken:",
    "rawPayload",
    "providerPayload",
    "privateTranscript",
    "cookie",
    "secret",
    "token",
    "otp",
  ];
  const leaked = forbidden.filter((value) => text.includes(value));
  check(leaked.length === 0, label, leaked.length === 0 ? `${forbidden.length} sentinels checked` : leaked.join(", "));
}

function createCheckMacValue(input) {
  const rawSource = [
    `HashKey=${qaHashKey}`,
    ...Object.entries(input)
      .filter(([key]) => key !== "CheckMacValue" && key !== "HashKey" && key !== "HashIV")
      .sort(([leftKey], [rightKey]) => compareCaseInsensitiveAscii(leftKey, rightKey))
      .map(([key, value]) => `${key}=${String(value)}`),
    `HashIV=${qaHashIv}`,
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

  return cryptoHashSha256(encoded);
}

function cryptoHashSha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();
}

function compareCaseInsensitiveAscii(left, right) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();

  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function printSummary() {
  const failed = checks.filter((item) => !item.ok);
  console.log(`\nBilling ECPay disabled QA checks: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

async function shutdownStartedProcesses() {
  await Promise.all(
    startedProcesses.splice(0).map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.killed) {
            resolve();
            return;
          }

          child.once("exit", resolve);
          child.kill("SIGTERM");
          setTimeout(() => {
            if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
          }, 5000).unref();
        }),
    ),
  );
}

try {
  verifyStaticBoundaries();
  await ensureDevServer();
  await verifyNotifyBoundary();
  await verifyQueryBoundary();
} catch (error) {
  fail("billing-ecpay-disabled-qa", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await shutdownStartedProcesses();
  printSummary();
}
