#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const baseUrl = process.env.PUBLIC_STATUS_DEGRADED_QA_BASE_URL ?? "http://127.0.0.1:3055";
const invalidDbUrl = "postgresql://asai_invalid:asai_invalid@invalid-db-host.asai.local:5432/asai_invalid";
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

function verifyStaticBoundaries() {
  assertFileContains("src/lib/public/status-repository.ts", [
    "isPublicDatabaseUnavailableError",
    "source: dbAvailable ? (settings ? \"database\" : \"fallback\") : \"degraded_local\"",
    "dbAvailable",
    "degradedReason",
    "publicLeadCaptureEnabled",
  ]);
  assertFileContains("src/lib/public/pricing-repository.ts", [
    "isPublicDatabaseUnavailableError",
    "source = \"degraded_local\"",
    "DEFAULT_PLAN_CONFIGS",
  ]);
  assertFileContains("src/app/api/bff/notifications/route.ts", [
    "buildDisabledNotificationsBffDto",
    "privateJsonResponse",
  ]);
  assertFileContains("src/domains/notifications/bff.ts", [
    "triggersExternalNotification: false",
    "realNotificationSent: false",
    "providerCallAttempted: false",
  ]);
}

async function ensureDevServer() {
  if (await fetchOk(baseUrl)) {
    throw new Error(`${baseUrl} is already reachable; choose a free PUBLIC_STATUS_DEGRADED_QA_BASE_URL port.`);
  }

  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3000";
  console.log(`Starting degraded public status QA dev server at ${baseUrl}`);

  const child = spawn(pnpmBin, ["dev", "--hostname", host, "--port", port], {
    cwd: root,
    env: {
      ...process.env,
      ALLOW_DEV_AUTH_HEADER: "true",
      DATABASE_URL: invalidDbUrl,
      DIRECT_URL: invalidDbUrl,
      POSTGRES_PRISMA_URL: invalidDbUrl,
      POSTGRES_URL: invalidDbUrl,
      POSTGRES_URL_NON_POOLING: invalidDbUrl,
      NEXT_PUBLIC_APP_URL: baseUrl,
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

async function get(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, text, body, headers: response.headers };
}

function assertNoPrivateLeak(label, text) {
  const forbidden = [
    "AUTH_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
    "invalid-db-host.asai.local",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "providerPolicy",
    "featureFlags",
    "rawPayload",
    "rawProvider",
    "providerConfig",
    "paymentData",
    "organizationId",
    "clientId",
    "policyNumber",
    "transcript",
    "privateTranscript",
  ];
  const leaked = forbidden.filter((value) => text.includes(value));
  check(leaked.length === 0, label, leaked.length === 0 ? `${forbidden.length} sentinels checked` : leaked.join(", "));
}

async function verifyApiAndPages() {
  const [statusResponse, pricingResponse, notificationsResponse] = await Promise.all([
    get("/api/public/status"),
    get("/api/public/pricing"),
    get("/api/bff/notifications"),
  ]);

  const status = statusResponse.body;
  const pricing = pricingResponse.body;
  const notifications = notificationsResponse.body;

  check(statusResponse.status === 200, "degraded GET /api/public/status returns 200", `status=${statusResponse.status}`);
  check(pricingResponse.status === 200, "degraded GET /api/public/pricing returns 200", `status=${pricingResponse.status}`);
  check(notificationsResponse.status === 200, "GET /api/bff/notifications returns 200", `status=${notificationsResponse.status}`);

  check(status?.source === "degraded_local", "status source is degraded_local", status?.source ?? "missing");
  check(status?.dbAvailable === false, "status marks dbAvailable=false", String(status?.dbAvailable));
  check(status?.degradedReason === "database_unavailable", "status degraded reason is database_unavailable");
  check(status?.checkoutAvailability?.checkoutEnabled === false, "degraded status disables checkout");
  check(status?.checkoutAvailability?.productionPaymentEnabled === false, "degraded status disables production payment");
  check(status?.aiAvailability?.status === "disabled", "degraded status disables public AI availability");
  check(status?.leadCapture?.endpointEnabled === false, "degraded status disables lead persistence");
  check(status?.leadCapture?.endpoint === null, "degraded status removes lead endpoint");
  check(status?.externalRegistry?.status === "not_public_discovery", "status remains not public discovery");

  check(pricing?.source === "degraded_local", "pricing source is degraded_local", pricing?.source ?? "missing");
  check(Array.isArray(pricing?.plans) && pricing.plans.length === 4, "pricing returns fallback plan list");
  check(pricing?.billing?.checkoutEnabled === false, "pricing billing checkout disabled");
  check(
    pricing?.availability?.primaryCta?.mode === status?.primaryCta?.mode,
    "pricing CTA mode matches degraded status",
    `${pricing?.availability?.primaryCta?.mode ?? "missing"} vs ${status?.primaryCta?.mode ?? "missing"}`,
  );
  check(
    pricing?.availability?.leadCapture?.endpointEnabled === false,
    "pricing availability keeps lead persistence disabled",
  );

  check(notifications?.version === "asai.notifications.bff.v1", "notification BFF version is explicit");
  check(notifications?.source === "disabled_no_delivery", "notification source is disabled_no_delivery");
  check(notifications?.unreadCount === 0, "notification unread count is zero");
  check(Array.isArray(notifications?.notifications) && notifications.notifications.length === 0, "notification list is empty");
  check(notifications?.delivery?.enabled === false, "notification delivery disabled");
  check(notifications?.delivery?.realNotificationSent === false, "notification BFF sends no real notification");
  check(notifications?.proof?.triggersExternalNotification === false, "notification proof forbids external delivery");

  assertNoPrivateLeak("degraded status response omits private sentinels", statusResponse.text);
  assertNoPrivateLeak("degraded pricing response omits private sentinels", pricingResponse.text);
  assertNoPrivateLeak("notification response omits private sentinels", notificationsResponse.text);

  const [home, pricingPage] = await Promise.all([get("/"), get("/pricing")]);
  check(home.status < 500, "degraded landing page renders without 500", `status=${home.status}`);
  check(pricingPage.status < 500, "degraded pricing page renders without 500", `status=${pricingPage.status}`);
  check(home.text.includes(`data-public-cta-mode="${status.primaryCta.mode}"`), "landing CTA mode matches degraded status");
  check(home.text.includes(`data-checkout-status="${status.checkoutAvailability.status}"`), "landing checkout status matches degraded status");
  check(pricingPage.text.includes("data-public-pricing-status"), "pricing page renders public pricing status boundary");
  check(pricingPage.text.includes(`data-public-cta-mode="${status.primaryCta.mode}"`), "pricing page CTA mode matches degraded status");
  check(!pricingPage.text.includes("data-public-lead-form"), "pricing page does not render degraded lead form");
}

function printSummary() {
  const failed = checks.filter((item) => !item.ok);
  console.log(`\nPublic status degraded QA checks: ${checks.length - failed.length}/${checks.length} passed`);
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
  await verifyApiAndPages();
} catch (error) {
  fail("public-status-degraded-qa", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await shutdownStartedProcesses();
  printSummary();
}
