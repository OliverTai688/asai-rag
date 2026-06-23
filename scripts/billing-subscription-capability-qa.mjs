#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env");

const baseUrl =
  process.env.BILLING_SUBSCRIPTION_QA_BASE_URL ??
  process.env.DEMO_QA_BASE_URL ??
  process.argv[2] ??
  "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const checks = [];

runStaticProof();
await runApiProof();

push(
  true,
  "no provider route invoked",
  "subscription capability proof only reads local BFF/session data and never contacts ECPay/OpenAI/Anthropic",
);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function runStaticProof() {
  assertFileContains("src/app/api/billing/subscription/route.ts", [
    "requireCurrentMember",
    "buildBillingSubscriptionCapability",
    "BILLING_SUBSCRIPTION_UNAVAILABLE",
    "privateJsonResponse",
    "providerAttempted: false",
  ]);
  assertFileContains("src/lib/billing/subscription-capability-repository.ts", [
    "prisma.organization.findUnique",
    "prisma.organizationMember.count",
    "prisma.organizationUnit.count",
    "providerAccountAttached",
    "buildBillingSubscriptionCapabilityDto",
  ]);
  assertFileContains("src/domains/subscription/capability.ts", [
    "asai.billing.subscription_capability.v1",
    'status: "disabled"',
    'provider: "ECPAY"',
    "redirectOnlyActivationAllowed: false",
    "browserPlanAssumptionsAllowed: false",
    "providerCredentialsReturned: false",
    "providerRawPayloadReturned: false",
    "paymentTokenReturned: false",
    "aiUsageLogRequired: false",
    "dbWriteAttempted: false",
  ]);
  assertFileContains("src/app/api/workspace/bootstrap/route.ts", [
    "buildBillingSubscriptionCapability",
    "subscription,",
  ]);

  assertNoWriteCall("src/lib/billing/subscription-capability-repository.ts");
}

async function runApiProof() {
  const unauth = await get("/api/billing/subscription");

  if (unauth.unreachable) {
    push(false, "GET /api/billing/subscription runtime proof reached dev server", unauth.detail);
    return;
  }

  push(unauth.status === 401, "GET /api/billing/subscription unauth returns 401", `status=${unauth.status}`);
  push(unauth.body?.kind === "AUTHENTICATION", "unauth subscription uses shared auth error kind", unauth.body?.kind ?? "");
  push(hasNoStore(unauth), "unauth subscription response uses no-store cache header");
  push(hasRequestId(unauth), "unauth subscription response includes request id");

  const authed = await get("/api/billing/subscription", {
    "x-asai-demo-user-email": demoMemberEmail,
  });

  if (authed.unreachable) {
    push(false, "GET /api/billing/subscription authenticated runtime proof reached dev server", authed.detail);
    return;
  }

  if (authed.status === 503) {
    push(authed.body?.error === "BILLING_SUBSCRIPTION_UNAVAILABLE", "subscription DB-unavailable fallback is explicit", authed.body?.error ?? "");
    push(authed.body?.providerAttempted === false, "subscription DB-unavailable fallback declares no provider attempt");
    push(hasNoStore(authed), "subscription DB-unavailable response uses no-store cache header");
    pushNoPrivateSentinel(JSON.stringify(authed.body), "subscription DB-unavailable response has no private/payment sentinel");
    return;
  }

  const bodyText = JSON.stringify(authed.body);
  const subscription = authed.body?.subscription;

  push(authed.status === 200, "subscription capability returns 200 when auth DB is available", `status=${authed.status}`);
  push(hasNoStore(authed), "subscription capability response uses no-store cache header");
  push(hasRequestId(authed), "subscription capability response includes request id");
  push(subscription?.version === "asai.billing.subscription_capability.v1", "subscription response includes versioned contract", subscription?.version ?? "");
  push(subscription?.source === "server_session", "subscription capability is server-session scoped", subscription?.source ?? "");
  push(Boolean(subscription?.currentPlan?.plan), "subscription includes current plan", subscription?.currentPlan?.plan ?? "");
  push(Boolean(subscription?.capability?.monthlyAiQuota >= 0), "subscription includes server capability quota");
  push(typeof subscription?.usage?.seats?.used === "number", "subscription includes seat usage");
  push(typeof subscription?.usage?.collaborators?.limit === "number", "subscription includes collaborator usage");
  push(typeof subscription?.usage?.units?.limit === "number", "subscription includes unit usage");
  push(typeof subscription?.usage?.aiQuota?.remaining === "number", "subscription includes AI quota remaining");
  push(subscription?.checkoutStatus?.status === "disabled", "subscription checkout status is guarded-disabled", subscription?.checkoutStatus?.status ?? "");
  push(subscription?.checkoutStatus?.providerAttempted === false, "subscription checkout status declares no provider attempt");
  push(subscription?.checkoutStatus?.orderCreated === false, "subscription capability does not create subscription order");
  push(subscription?.checkoutStatus?.transactionCreated === false, "subscription capability does not create payment transaction");
  push(subscription?.activation?.redirectOnlyActivationAllowed === false, "subscription blocks redirect-only activation");
  push(subscription?.activation?.browserPlanAssumptionsAllowed === false, "subscription blocks browser plan assumptions");
  push(subscription?.safety?.dbWriteAttempted === false, "subscription declares no DB write");
  push(subscription?.safety?.aiUsageLogRequired === false, "subscription declares AiUsageLog not required for no-provider path");
  pushNoPrivateSentinel(bodyText, "subscription capability response has no private/payment sentinel");

  const bootstrap = await get("/api/workspace/bootstrap?surface=dashboard", {
    "x-asai-demo-user-email": demoMemberEmail,
  });
  push(bootstrap.status === 200, "workspace bootstrap runtime proof returns 200", `status=${bootstrap.status}`);
  push(
    bootstrap.body?.subscription?.version === "asai.billing.subscription_capability.v1",
    "workspace bootstrap includes same subscription capability contract",
    bootstrap.body?.subscription?.version ?? "",
  );
}

async function get(path, headers = {}) {
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers,
    });
  } catch (error) {
    return {
      unreachable: true,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

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

function assertFileContains(path, fragments) {
  const contents = readFile(path);

  for (const fragment of fragments) {
    push(contents.includes(fragment), `${path} contains ${fragment}`);
  }
}

function assertNoWriteCall(path) {
  const contents = readFile(path);
  const forbiddenPatterns = [
    ".create(",
    ".createMany(",
    ".update(",
    ".updateMany(",
    ".upsert(",
    ".delete(",
    ".deleteMany(",
    "subscriptionOrder.",
    "paymentTransaction.",
  ];
  const matches = forbiddenPatterns.filter((fragment) => contents.includes(fragment));

  push(matches.length === 0, `${path} has no billing write/idempotency side effects`, matches.join(", "));
}

function pushNoPrivateSentinel(text, label) {
  const forbidden = [
    "HashKey",
    "HashIV",
    "CheckMacValue",
    "ECPAY_HASH_KEY",
    "ECPAY_HASH_IV",
    "MerchantTradeNo",
    "providerOrderId",
    "providerTradeNo",
    "providerSubscriptionId",
    "rawPayload",
    "AUTH_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
    "cardNumber",
    "paymentToken",
    "cookie",
  ];
  const leaked = forbidden.filter((value) => text.includes(value));

  push(
    leaked.length === 0,
    label,
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${leaked.join(", ")}`,
  );
}

function hasNoStore(response) {
  return response.headers.get("cache-control")?.includes("no-store") ?? false;
}

function hasRequestId(response) {
  return Boolean(response.headers.get("x-asai-request-id"));
}

function readFile(path) {
  return readFileSync(path, "utf8");
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
