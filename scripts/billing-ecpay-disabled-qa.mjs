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
    "asai.billing.ecpay.server_query_boundary.v1",
    "buildPaymentTransactionPersistenceContract",
    "buildConfirmedActivationContract",
    "buildEcpayNotifyLedgerIdempotencyContract",
    "buildEcpayQueryLedgerIdempotencyContract",
    "buildEcpayServerQueryBoundaryDto",
    "providerAttempted: false",
    "serverQueryBoundary",
    "browserQueryAllowed: false",
    "clientSuppliedOrganizationTrusted: false",
    "paymentTransactionUpsertAttempted: false",
    "transactionPersistence",
    "confirmedActivation",
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
  assertFileContains("src/domains/subscription/payment-transaction-persistence.ts", [
    "asai.billing.payment_transaction_persistence.v1",
    'table: "PaymentTransaction"',
    'uniqueBy: ["organizationId", "provider", "merchantTradeNo"]',
    'mutation: "upsert_when_enabled"',
    'acceptedStatusesBeforeUpsert: ["PAID", "QUERY_CONFIRMED"]',
    "requiresCheckMacValidationForNotify: input.source === \"ecpay_notify\"",
    "requiresServerQueryConfirmationForQuery: input.source === \"ecpay_query\"",
    "clientSuppliedOrganizationTrusted: false",
    "clientSuppliedAmountTrusted: false",
    "paymentTransactionUpsertAttempted: false",
    "subscriptionOrderUpdated: false",
    "organizationPlanUpdated: false",
    "redirectOnlyActivationAllowed: false",
    "rawProviderPayloadPersisted: false",
    "rawCheckMacValueStored: false",
    "allowlistedProviderSummaryOnly: true",
    "providerCallAttempted: false",
    "aiUsageLogRequired: false",
    "fakeUsageLogAllowed: false",
  ]);
  assertFileContains("src/domains/subscription/confirmed-activation.ts", [
    "asai.billing.confirmed_activation.v1",
    'table: "Organization"',
    'field: "plan"',
    'mutation: "update_when_enabled"',
    'requiresConfirmedLedger: true',
    'requiresPaymentTransactionPersistence: true',
    'requiresPaymentTransactionWriteProof: true',
    'acceptedStatusesBeforeActivation: ["PAID", "QUERY_CONFIRMED"]',
    "redirectReturnUrlTrusted: false",
    "browserPaymentResultTrusted: false",
    "clientSuppliedPlanTrusted: false",
    "clientSuppliedOrganizationTrusted: false",
    "localStoragePlanTrusted: false",
    "planActivated: false",
    "organizationPlanUpdated: false",
    "paymentTransactionUpsertAttempted:",
    "redirectOnlyActivationAllowed: false",
    "browserPlanAssumptionsAllowed: false",
    "activationRequiresPaymentTransactionWrite: true",
    "transactionPersistenceWriteAttempted:",
    "allowlistedActivationSummaryOnly: true",
    "providerCallAttempted: false",
    "aiUsageLogRequired: false",
    "fakeUsageLogAllowed: false",
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
    "src/domains/subscription/payment-transaction-persistence.ts",
    "src/domains/subscription/confirmed-activation.ts",
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
    const transactionPersistence = notification?.transactionPersistence;
    const confirmedActivation = notification?.confirmedActivation;
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
    check(
      transactionPersistence?.version === "asai.billing.payment_transaction_persistence.v1",
      `ECPay notify ${label} includes PaymentTransaction persistence contract`,
    );
    check(
      transactionPersistence?.source === "ecpay_notify",
      `ECPay notify ${label} persistence contract records notify source`,
    );
    check(
      transactionPersistence?.lookup?.merchantTradeNo === payload.MerchantTradeNo,
      `ECPay notify ${label} persistence contract keeps idempotency key`,
    );
    check(
      transactionPersistence?.verifiedWritePreconditions?.requiresCheckMacValidationForNotify === true,
      `ECPay notify ${label} persistence requires checksum validation`,
    );
    check(
      transactionPersistence?.verifiedWritePreconditions?.amountFromClientTrusted === false,
      `ECPay notify ${label} persistence does not trust client amount`,
    );
    check(
      transactionPersistence?.upsertPlan?.paymentTransactionUpsertAttempted === false,
      `ECPay notify ${label} does not upsert PaymentTransaction`,
    );
    check(
      transactionPersistence?.upsertPlan?.subscriptionOrderUpdated === false,
      `ECPay notify ${label} persistence does not update subscription order`,
    );
    check(
      transactionPersistence?.dataBoundary?.rawProviderPayloadPersisted === false,
      `ECPay notify ${label} persistence stores no raw provider payload`,
    );
    check(
      transactionPersistence?.audit?.fakeUsageLogAllowed === false,
      `ECPay notify ${label} persistence forbids fake AiUsageLog`,
    );
    check(
      confirmedActivation?.version === "asai.billing.confirmed_activation.v1",
      `ECPay notify ${label} includes confirmed activation contract`,
    );
    check(
      confirmedActivation?.source === "ecpay_notify",
      `ECPay notify ${label} activation contract records notify source`,
    );
    check(
      confirmedActivation?.confirmedTransactionPreconditions?.requiresConfirmedLedger === true,
      `ECPay notify ${label} activation requires confirmed ledger`,
    );
    check(
      confirmedActivation?.confirmedTransactionPreconditions?.requiresPaymentTransactionPersistence === true,
      `ECPay notify ${label} activation requires PaymentTransaction persistence`,
    );
    check(
      confirmedActivation?.confirmedTransactionPreconditions?.requiresCheckMacValidationForNotify === true,
      `ECPay notify ${label} activation requires checksum validation`,
    );
    check(
      confirmedActivation?.blockedClientSignals?.redirectReturnUrlTrusted === false,
      `ECPay notify ${label} activation rejects redirect-only signal`,
    );
    check(
      confirmedActivation?.blockedClientSignals?.clientSuppliedPlanTrusted === false,
      `ECPay notify ${label} activation rejects client plan signal`,
    );
    check(
      confirmedActivation?.activationPlan?.planActivated === false,
      `ECPay notify ${label} activation does not activate plan`,
    );
    check(
      confirmedActivation?.activationPlan?.organizationPlanUpdated === false,
      `ECPay notify ${label} activation does not update organization plan`,
    );
    check(
      confirmedActivation?.dependencies?.transactionPersistenceWriteAttempted === false,
      `ECPay notify ${label} activation sees no transaction write proof`,
    );
    check(
      confirmedActivation?.dataBoundary?.allowlistedActivationSummaryOnly === true,
      `ECPay notify ${label} activation keeps allowlisted summary only`,
    );
    check(
      confirmedActivation?.audit?.fakeUsageLogAllowed === false,
      `ECPay notify ${label} activation forbids fake AiUsageLog`,
    );
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
  const transactionPersistence = query?.transactionPersistence;
  const confirmedActivation = query?.confirmedActivation;
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
  check(
    query?.serverQueryBoundary?.version === "asai.billing.ecpay.server_query_boundary.v1",
    "ECPay query includes server query boundary contract",
  );
  check(
    query?.serverQueryBoundary?.endpoint === "/api/billing/ecpay/query",
    "ECPay query boundary points to server-owned query endpoint",
  );
  check(
    query?.serverQueryBoundary?.serverOwnership?.browserQueryAllowed === false,
    "ECPay query boundary rejects browser-side provider query",
  );
  check(
    query?.serverQueryBoundary?.serverOwnership?.clientSuppliedOrganizationTrusted === false,
    "ECPay query boundary does not trust client organization scope",
  );
  check(
    query?.serverQueryBoundary?.providerQuery?.providerAttempted === false,
    "ECPay query boundary does not call provider",
  );
  check(
    query?.serverQueryBoundary?.providerQuery?.confirmationReceived === false,
    "ECPay query boundary does not fake provider confirmation",
  );
  check(
    query?.serverQueryBoundary?.confirmationGate?.requiredBeforeTransactionPersistence === true,
    "ECPay query boundary requires confirmation before transaction persistence",
  );
  check(
    query?.serverQueryBoundary?.confirmationGate?.paymentTransactionUpsertAttempted === false,
    "ECPay query boundary does not upsert PaymentTransaction",
  );
  check(
    query?.serverQueryBoundary?.confirmationGate?.organizationPlanUpdated === false,
    "ECPay query boundary blocks organization plan update",
  );
  check(
    query?.serverQueryBoundary?.aiUsageLogPolicy?.fakeUsageLogAllowed === false,
    "ECPay query boundary forbids fake AiUsageLog",
  );
  check(
    transactionPersistence?.version === "asai.billing.payment_transaction_persistence.v1",
    "ECPay query includes PaymentTransaction persistence contract",
  );
  check(transactionPersistence?.source === "ecpay_query", "ECPay query persistence contract records query source");
  check(
    transactionPersistence?.verifiedWritePreconditions?.requiresServerQueryConfirmationForQuery === true,
    "ECPay query persistence requires server query confirmation",
  );
  check(
    transactionPersistence?.verifiedWritePreconditions?.providerStatusFromClientTrusted === false,
    "ECPay query persistence does not trust client provider status",
  );
  check(
    transactionPersistence?.upsertPlan?.paymentTransactionUpsertAttempted === false,
    "ECPay query persistence does not upsert PaymentTransaction",
  );
  check(
    transactionPersistence?.upsertPlan?.organizationPlanUpdated === false,
    "ECPay query persistence blocks organization plan update",
  );
  check(
    transactionPersistence?.ledgerDependency?.activationRequiresConfirmedLedger === true,
    "ECPay query persistence requires confirmed ledger before activation",
  );
  check(
    transactionPersistence?.dataBoundary?.rawProviderPayloadPersisted === false,
    "ECPay query persistence stores no raw provider payload",
  );
  check(
    transactionPersistence?.audit?.aiUsageLogRequired === false,
    "ECPay query persistence requires no AiUsageLog for no-provider proof",
  );
  check(
    confirmedActivation?.version === "asai.billing.confirmed_activation.v1",
    "ECPay query includes confirmed activation contract",
  );
  check(confirmedActivation?.source === "ecpay_query", "ECPay query activation contract records query source");
  check(
    confirmedActivation?.confirmedTransactionPreconditions?.requiresConfirmedLedger === true,
    "ECPay query activation requires confirmed ledger",
  );
  check(
    confirmedActivation?.confirmedTransactionPreconditions?.requiresPaymentTransactionPersistence === true,
    "ECPay query activation requires PaymentTransaction persistence",
  );
  check(
    confirmedActivation?.confirmedTransactionPreconditions?.requiresServerQueryConfirmationForQuery === true,
    "ECPay query activation requires server query confirmation",
  );
  check(
    confirmedActivation?.blockedClientSignals?.browserPaymentResultTrusted === false,
    "ECPay query activation rejects browser payment result",
  );
  check(
    confirmedActivation?.blockedClientSignals?.localStoragePlanTrusted === false,
    "ECPay query activation rejects local storage plan signal",
  );
  check(
    confirmedActivation?.activationPlan?.planActivated === false,
    "ECPay query activation does not activate plan",
  );
  check(
    confirmedActivation?.activationPlan?.organizationPlanUpdated === false,
    "ECPay query activation blocks organization plan update",
  );
  check(
    confirmedActivation?.dependencies?.activationRequiresPaymentTransactionWrite === true,
    "ECPay query activation requires live transaction write before enablement",
  );
  check(
    confirmedActivation?.dataBoundary?.rawPaymentDataStored === false,
    "ECPay query activation stores no raw payment data",
  );
  check(
    confirmedActivation?.audit?.fakeUsageLogAllowed === false,
    "ECPay query activation forbids fake AiUsageLog",
  );
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
