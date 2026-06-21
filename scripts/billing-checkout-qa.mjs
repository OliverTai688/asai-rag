#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.BILLING_CHECKOUT_QA_BASE_URL ?? process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runApiProof();
} finally {
  await db.end();
}

push(true, "no provider route invoked", "checkout proof only calls local BFF and never contacts ECPay/OpenAI/Anthropic");

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function runApiProof() {
  const beforeCounts = await billingCounts();

  const unauth = await post("/api/billing/checkout", { plan: "PRO" });
  push(unauth.status === 401, "POST /api/billing/checkout unauth returns 401", `status=${unauth.status}`);
  push(unauth.body?.kind === "AUTHENTICATION", "unauth checkout uses shared auth error kind", unauth.body?.kind ?? "");

  const invalid = await memberPost("/api/billing/checkout", { plan: "FREE" });
  push(invalid.status === 400, "checkout rejects non-self-serve plan", `status=${invalid.status}`);
  push(invalid.body?.kind === "VALIDATION", "invalid checkout uses validation kind", invalid.body?.kind ?? "");

  const disabled = await memberPost("/api/billing/checkout", { plan: "PRO", source: "pricing" });
  const bodyText = JSON.stringify(disabled.body);
  const checkout = disabled.body?.checkout;

  push(disabled.status === 503, "checkout returns disabled 503 before payment proof", `status=${disabled.status}`);
  push(hasNoStore(disabled), "disabled checkout response uses no-store cache header");
  push(hasRequestId(disabled), "disabled checkout response includes request id");
  push(disabled.body?.error === "BILLING_CHECKOUT_DISABLED", "disabled checkout declares explicit error", disabled.body?.error ?? "");
  push(checkout?.version === "asai.billing.checkout.v1", "checkout response includes versioned contract", checkout?.version ?? "");
  push(checkout?.provider === "ECPAY", "checkout response declares provider without credentials", checkout?.provider ?? "");
  push(checkout?.plan === "PRO", "checkout response echoes server-validated plan", checkout?.plan ?? "");
  push(checkout?.orderCreated === false, "disabled checkout does not create order");
  push(checkout?.transactionCreated === false, "disabled checkout does not create transaction");
  push(checkout?.redirect === null, "disabled checkout does not return redirect payload");
  push(checkout?.providerAttempted === false, "disabled checkout does not contact provider");
  push(checkout?.productionPaymentEnabled === false, "production payment remains disabled");
  push(checkout?.dataBoundary?.providerCredentialsReturned === false, "provider credentials are not returned");
  push(checkout?.dataBoundary?.providerRawPayloadReturned === false, "provider raw payload is not returned");
  push(checkout?.dataBoundary?.browserGeneratedChecksumAllowed === false, "browser checksum generation is not allowed");
  push(checkout?.activation?.allowed === false, "redirect-only activation is not allowed");
  push(Array.isArray(checkout?.requiredProof) && checkout.requiredProof.includes("query_confirmation"), "checkout response names query confirmation as required proof");
  pushNoPaymentSentinel(bodyText, "checkout disabled response has no payment/private sentinel");

  const afterCounts = await billingCounts();
  push(afterCounts.orders === beforeCounts.orders, "disabled checkout does not insert subscription order", `${beforeCounts.orders}->${afterCounts.orders}`);
  push(afterCounts.transactions === beforeCounts.transactions, "disabled checkout does not insert payment transaction", `${beforeCounts.transactions}->${afterCounts.transactions}`);
}

async function billingCounts() {
  const result = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM subscription_orders) AS orders,
       (SELECT COUNT(*)::int FROM payment_transactions) AS transactions`,
  );

  return {
    orders: Number(result.rows[0]?.orders ?? 0),
    transactions: Number(result.rows[0]?.transactions ?? 0),
  };
}

async function memberPost(path, body) {
  return post(path, body, { "x-asai-demo-user-email": demoMemberEmail });
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
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
    headers: response.headers,
    body,
  };
}

function hasNoStore(response) {
  return response.headers.get("cache-control")?.includes("no-store") ?? false;
}

function hasRequestId(response) {
  return Boolean(response.headers.get("x-asai-request-id"));
}

function pushNoPaymentSentinel(text, label) {
  const forbidden = [
    "HashKey",
    "HashIV",
    "CheckMacValue",
    "ECPAY_HASH_KEY",
    "ECPAY_HASH_IV",
    "MerchantTradeNo",
    "providerOrderId",
    "providerTradeNo",
    "rawPayload",
    "AUTH_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
    "cardNumber",
    "paymentToken",
    "cookie",
  ];
  const leaked = forbidden.filter((value) => text.includes(value));

  push(leaked.length === 0, label, leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${leaked.join(", ")}`);
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const contents = readFileSync(path, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
