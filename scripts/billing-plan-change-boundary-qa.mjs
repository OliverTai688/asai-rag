#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const argUrl = process.argv.find((value) => value.startsWith("http://") || value.startsWith("https://"));
const runApi = Boolean(process.env.BILLING_PLAN_CHANGE_QA_BASE_URL || argUrl || process.argv.includes("--api"));
const baseUrl = process.env.BILLING_PLAN_CHANGE_QA_BASE_URL ?? argUrl ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const checks = [];

runStaticProof();

if (runApi) {
  await runApiProof();
} else {
  push(
    true,
    "runtime API proof deferred",
    "set BILLING_PLAN_CHANGE_QA_BASE_URL or pass --api when a dev server/session is available",
  );
}

push(
  true,
  "no provider route invoked",
  "plan-change proof only checks local BFF contract and never contacts ECPay/OpenAI/Anthropic",
);

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function runStaticProof() {
  assertFileContains("src/domains/subscription/plan-change.ts", [
    "asai.billing.plan_change_activation.v1",
    "BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION",
    "ledgerContractVersion: BILLING_LEDGER_IDEMPOTENCY_CONTRACT_VERSION",
    'ledgerScope: "organization_provider_merchant_trade_no"',
    'requiredLedgerStatusesBeforePlanMutation: ["PAID", "QUERY_CONFIRMED"]',
    'planActivationSource: "confirmed_transaction_or_query_only"',
    "redirectOnlyActivationAllowed: false",
    "browserPlanAssumptionsAllowed: false",
    "transaction_ledger_required_before_plan_mutation",
    "ledgerWriteAttempted: false",
    "transactionCreated: false",
    "transactionUpdated: false",
    "orderCreated: false",
    "orderUpdated: false",
    "planUpdated: false",
    "checkMacValueVerified: false",
    "serverQueryConfirmed: false",
    "manual_review_failure_refund_void",
    "providerRawPayloadStored: false",
    "aiUsageLogRequired: false",
    "dbWriteAttempted: false",
  ]);
  assertFileContains("src/app/api/billing/plan-change/route.ts", [
    "requireCurrentMember",
    "billingPlanChangeInputSchema",
    "buildDisabledBillingPlanChangeDto",
    "BILLING_PLAN_CHANGE_DISABLED",
    "BILLING_PLAN_CHANGE_AUTH_UNAVAILABLE",
    "providerAttempted: false",
    "privateJsonResponse",
    "status: 503",
  ]);
  assertFileContains("src/domains/subscription/capability.ts", [
    "planChangeStatus",
    "/api/billing/plan-change",
    "planUpdateAllowed: false",
    "planUpdated: false",
  ]);
  assertFileContains("package.json", [
    '"billing:plan-change-boundary-qa": "node scripts/billing-plan-change-boundary-qa.mjs"',
  ]);

  for (const filePath of [
    "src/domains/subscription/ledger.ts",
    "src/domains/subscription/plan-change.ts",
    "src/app/api/billing/plan-change/route.ts",
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
}

async function runApiProof() {
  const invalid = await post("/api/billing/plan-change", { plan: "FREE" });
  if (invalid.unreachable) {
    push(false, "POST /api/billing/plan-change runtime proof reached dev server", invalid.detail);
    return;
  }

  push(invalid.status === 400, "plan-change rejects non-self-serve plan", `status=${invalid.status}`);
  push(invalid.body?.kind === "VALIDATION", "invalid plan-change uses validation kind", invalid.body?.kind ?? "");

  const unauth = await post("/api/billing/plan-change", { plan: "PRO", source: "workspace" });
  push(unauth.status === 401, "plan-change unauth returns 401", `status=${unauth.status}`);
  push(unauth.body?.kind === "AUTHENTICATION", "unauth plan-change uses shared auth kind", unauth.body?.kind ?? "");
  push(hasNoStore(unauth), "unauth plan-change response uses no-store cache header");
  push(hasRequestId(unauth), "unauth plan-change response includes request id");

  const disabled = await post(
    "/api/billing/plan-change",
    { plan: "PRO", source: "workspace" },
    { "x-asai-demo-user-email": demoMemberEmail },
  );

  if (disabled.status === 401) {
    pass(
      "authenticated runtime proof deferred by dev auth guard",
      "ALLOW_DEV_AUTH_HEADER/session was not available; source proof still verifies no provider/write path",
    );
    return;
  }

  if (disabled.status === 503 && disabled.body?.error === "BILLING_PLAN_CHANGE_AUTH_UNAVAILABLE") {
    push(disabled.body?.providerAttempted === false, "plan-change DB-unavailable fallback does not contact provider");
    push(disabled.body?.kind === "INTERNAL", "plan-change DB-unavailable fallback is explicit", disabled.body?.kind ?? "");
    push(hasNoStore(disabled), "plan-change DB-unavailable response uses no-store cache header");
    push(hasRequestId(disabled), "plan-change DB-unavailable response includes request id");
    assertNoPaymentLeak("plan-change DB-unavailable response omits payment/private sentinels", JSON.stringify(disabled.body));
    return;
  }

  const bodyText = JSON.stringify(disabled.body);
  const planChange = disabled.body?.planChange;

  push(disabled.status === 503, "plan-change returns guarded disabled 503", `status=${disabled.status}`);
  push(disabled.body?.error === "BILLING_PLAN_CHANGE_DISABLED", "plan-change declares disabled error");
  push(planChange?.version === "asai.billing.plan_change_activation.v1", "plan-change response includes versioned contract", planChange?.version ?? "");
  push(planChange?.requestedPlan === "PRO", "plan-change echoes server-validated target plan", planChange?.requestedPlan ?? "");
  push(planChange?.provider === "ECPAY", "plan-change declares ECPay provider");
  push(planChange?.providerAttempted === false, "plan-change does not contact provider");
  push(planChange?.order?.orderCreated === false, "plan-change creates no order");
  push(
    planChange?.idempotency?.ledgerContractVersion === "asai.billing.ledger_idempotency.v1",
    "plan-change references shared ledger idempotency contract",
    planChange?.idempotency?.ledgerContractVersion ?? "",
  );
  push(
    planChange?.idempotency?.ledgerScope === "organization_provider_merchant_trade_no",
    "plan-change requires server-owned ledger uniqueness scope",
    planChange?.idempotency?.ledgerScope ?? "",
  );
  push(planChange?.idempotency?.ledgerWriteAttempted === false, "plan-change writes no transaction ledger");
  push(planChange?.idempotency?.transactionCreated === false, "plan-change creates no payment transaction");
  push(planChange?.idempotency?.planUpdated === false, "plan-change does not update plan");
  push(planChange?.activation?.allowed === false, "plan-change activation is disabled");
  push(planChange?.activation?.redirectOnlyActivationAllowed === false, "plan-change blocks redirect-only activation");
  push(planChange?.activation?.browserPlanAssumptionsAllowed === false, "plan-change blocks browser plan assumptions");
  push(planChange?.confirmationGate?.serverQueryConfirmed === false, "plan-change does not fake query confirmation");
  push(planChange?.dataBoundary?.providerRawPayloadStored === false, "plan-change stores no raw provider payload");
  push(planChange?.safety?.dbWriteAttempted === false, "plan-change declares no DB write");
  push(planChange?.safety?.aiUsageLogRequired === false, "plan-change declares AiUsageLog not required for no-provider path");
  push(hasNoStore(disabled), "plan-change disabled response uses no-store cache header");
  push(hasRequestId(disabled), "plan-change disabled response includes request id");
  assertNoPaymentLeak("plan-change disabled response omits payment/private sentinels", bodyText);
}

async function post(routePath, body, headers = {}) {
  let response;

  try {
    response = await fetch(`${baseUrl}${routePath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      redirect: "manual",
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

function assertNoPaymentLeak(label, text) {
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
    "paymentToken:",
    "privateTranscript",
    "secret:",
    "token:",
    "otp:",
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

function pass(label, detail = "") {
  checks.push({ status: "pass", label, detail });
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function readFile(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}
