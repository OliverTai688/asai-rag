#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client as PgClient } from "pg";

const root = process.cwd();
const require = createRequire(`${root}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

loadEnvFile(".env.local");
loadEnvFile(".env");

const baseUrl = process.env.PUBLIC_STATUS_QA_BASE_URL ?? process.env.DEMO_QA_BASE_URL ?? "http://127.0.0.1:3044";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = path.join(root, "docs/06_audits-and-reports/screenshots/lv3-public-bff");
const spawned = [];
const checks = [];
const consoleErrors = [];

let db;

function pass(name, detail = "") {
  checks.push({ ok: true, name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

function push(condition, name, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

function loadEnvFile(fileName) {
  const envPath = path.join(root, fileName);
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function readSource(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function assertFileContains(filePath, fragments) {
  const source = readSource(filePath);
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  push(missing.length === 0, filePath, missing.length === 0 ? `verified ${fragments.length} fragments` : `missing ${missing.join(", ")}`);
}

function verifyStaticBoundaries() {
  assertFileContains("src/app/api/public/status/route.ts", ["getPublicStatus", "public, max-age=60"]);
  assertFileContains("src/lib/public/status-repository.ts", [
    "findUnique",
    "leadCapture",
    "not_public_discovery",
    "productionPaymentEnabled: false",
  ]);
  assertFileContains("src/lib/public/pricing-repository.ts", ["getPublicStatus", "availability", "checkoutAvailability"]);
  assertFileContains("src/app/api/public/lead/route.ts", [
    "createPublicLeadCapture",
    "consentAccepted",
    "privacyAccepted",
    "website",
  ]);
  assertFileContains("src/lib/public/lead-repository.ts", [
    "EMAIL_LIMIT_PER_HOUR",
    "IP_LIMIT_PER_HOUR",
    "hashPublicLeadValue",
    "publicLead.create",
  ]);
  assertFileContains("src/app/page.tsx", ["getPublicStatus", "data-public-cta-mode", "data-checkout-status"]);
  assertFileContains("src/components/subscription/PricingSection.tsx", [
    "data-public-pricing-status",
    "data-public-lead-form",
    "data-plan-cta-mode",
    "status.checkoutAvailability",
  ]);
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

async function ensureDevServer() {
  if (await fetchOk(baseUrl)) {
    pass("dev-server", `reachable at ${baseUrl}`);
    return;
  }

  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3000";
  console.log(`Starting dev server for public status QA at ${baseUrl}`);

  const child = spawn("pnpm", ["dev", "--hostname", host, "--port", port], {
    cwd: root,
    env: {
      ...process.env,
      ALLOW_DEV_AUTH_HEADER: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  spawned.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let i = 0; i < 90; i += 1) {
    if (await fetchOk(baseUrl)) {
      pass("dev-server", `started at ${baseUrl}`);
      return;
    }
    await wait(1_000);
  }

  throw new Error(`Dev server did not become reachable at ${baseUrl}`);
}

async function connectDb() {
  if (!dbUrl) throw new Error("Missing DIRECT_URL or DATABASE_URL for public pricing DB consistency proof.");
  db = new PgClient({ connectionString: dbUrl });
  await db.connect();
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body, headers: response.headers, text };
}

async function get(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
  return parseResponse(response);
}

async function post(pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  return parseResponse(response);
}

function postValidLead(email, consentVersion) {
  return post("/api/public/lead", {
    email,
    name: "Rate Limit QA",
    source: "pricing",
    consentVersion,
    consentAccepted: true,
    privacyAccepted: true,
  });
}

function assertNoPrivatePublicLeak(label, text) {
  const forbidden = [
    "AUTH_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "providerPolicy",
    "featureFlags",
    "supportPolicy",
    "stripeCustomerId",
    "stripeSubscriptionId",
    "providerCustomerId",
    "providerSubscriptionId",
    "providerTradeNo",
    "CheckMacValue",
    "HashKey",
    "HashIV",
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
  push(leaked.length === 0, label, leaked.length === 0 ? `${forbidden.length} sentinels checked` : leaked.join(", "));
}

async function verifyApi() {
  const [statusResponse, pricingResponse] = await Promise.all([get("/api/public/status"), get("/api/public/pricing")]);
  const status = statusResponse.body;
  const pricing = pricingResponse.body;

  push(statusResponse.status === 200, "GET /api/public/status returns 200", `status=${statusResponse.status}`);
  push(pricingResponse.status === 200, "GET /api/public/pricing returns 200", `status=${pricingResponse.status}`);
  push(
    statusResponse.headers.get("cache-control")?.includes("public") === true,
    "public status is cache-aware",
    statusResponse.headers.get("cache-control") ?? "missing",
  );
  push(
    pricingResponse.headers.get("cache-control")?.includes("public") === true,
    "public pricing is cache-aware",
    pricingResponse.headers.get("cache-control") ?? "missing",
  );
  push(status?.version === "asai.public_status.v1", "status DTO version is explicit", status?.version ?? "missing");
  push(status?.maintenance?.status === "operational", "status DTO includes maintenance posture", status?.maintenance?.status ?? "missing");
  push(Boolean(status?.aiAvailability?.authenticatedOnly), "status DTO marks AI authenticated-only");
  push(status?.aiAvailability?.usageLoggingRequired === true, "status DTO keeps AiUsageLog policy visible");
  push(status?.checkoutAvailability?.provider === "ECPAY", "status DTO exposes public payment provider label");
  push(status?.checkoutAvailability?.checkoutEnabled === false, "public status keeps checkout action disabled");
  push(status?.checkoutAvailability?.productionPaymentEnabled === false, "public status keeps production payment disabled");
  push(status?.primaryCta?.checkoutActionEnabled === false, "primary CTA does not open checkout");
  push(status?.leadCapture?.status === "enabled_private_beta", "public lead capture is enabled for private beta");
  push(status?.leadCapture?.endpointEnabled === true, "public lead endpoint is enabled");
  push(status?.leadCapture?.endpoint === "/api/public/lead", "public lead endpoint is explicit");
  push(Boolean(status?.leadCapture?.consentVersion), "public lead consent version is explicit");
  push(status?.externalRegistry?.status === "not_public_discovery", "status endpoint is not external registry discovery");

  push(Array.isArray(pricing?.plans), "pricing DTO includes plans array");
  push(pricing?.plans?.length === 4, "pricing DTO returns four public plans", `count=${pricing?.plans?.length ?? 0}`);
  push(pricing?.source === "database", "pricing DTO reads DB-backed PlanConfig", `source=${pricing?.source ?? "missing"}`);
  push(pricing?.billing?.provider === "ECPAY", "pricing DTO exposes ECPay provider", pricing?.billing?.provider ?? "missing");
  push(pricing?.billing?.checkoutEnabled === status?.checkoutAvailability?.checkoutEnabled, "pricing checkout matches status");
  push(pricing?.availability?.primaryCta?.mode === status?.primaryCta?.mode, "pricing primary CTA mode matches status");
  push(pricing?.availability?.leadCapture?.status === "enabled_private_beta", "pricing availability exposes lead capture");

  const dbPlans = await getDbPlanConfigs();
  for (const plan of ["FREE", "STARTER", "PRO", "ENTERPRISE"]) {
    const apiPlan = pricing?.plans?.find((item) => item.id === plan);
    const dbPlan = dbPlans.get(plan);
    push(Boolean(apiPlan), `${plan} exists in pricing DTO`);
    push(Boolean(dbPlan), `${plan} exists in plan_configs table`);

    if (apiPlan && dbPlan) {
      push(apiPlan.capabilities.maxMembers === dbPlan.max_members, `${plan} maxMembers matches DB`);
      push(apiPlan.capabilities.maxCollaborators === dbPlan.max_collaborators, `${plan} maxCollaborators matches DB`);
      push(apiPlan.capabilities.maxUnits === dbPlan.max_units, `${plan} maxUnits matches DB`);
      push(apiPlan.capabilities.monthlyAiQuota === dbPlan.monthly_ai_quota, `${plan} monthlyAiQuota matches DB`);
      push(apiPlan.ctaMode === "enterprise_contact" || apiPlan.ctaMode === status.primaryCta.mode, `${plan} CTA mode is shared or enterprise contact`);
    }
  }

  assertNoPrivatePublicLeak("status response omits private sentinels", statusResponse.text);
  assertNoPrivatePublicLeak("pricing response omits private sentinels", pricingResponse.text);

  return { status, pricing };
}

async function verifyLeadCaptureApi(status) {
  const consentVersion = status?.leadCapture?.consentVersion ?? "public-beta-2026-06-21";
  const timestamp = Date.now();
  const invalid = await post("/api/public/lead", {
    email: `public-lead-invalid-${timestamp}@example.test`,
    source: "pricing",
    consentVersion,
    consentAccepted: false,
    privacyAccepted: false,
  });
  push(invalid.status === 400, "lead endpoint rejects missing consent", `status=${invalid.status}`);

  const honeypotEmail = `public-lead-honeypot-${timestamp}@example.test`;
  const honeypotBefore = await getPublicLeadCountByEmail(honeypotEmail);
  const honeypot = await post("/api/public/lead", {
    email: honeypotEmail,
    name: "Do Not Store",
    source: "pricing",
    consentVersion,
    consentAccepted: true,
    privacyAccepted: true,
    website: "https://spam.example.test",
  });
  const honeypotAfter = await getPublicLeadCountByEmail(honeypotEmail);
  push(honeypot.status === 202, "lead endpoint accepts honeypot without reveal", `status=${honeypot.status}`);
  push(honeypotAfter === honeypotBefore, "honeypot lead is not persisted", `${honeypotBefore}->${honeypotAfter}`);

  const validEmail = `public-lead-valid-${timestamp}@example.test`;
  const before = await getPublicLeadCountByEmail(validEmail);
  const valid = await post("/api/public/lead", {
    email: validEmail,
    name: "Public Lead QA",
    company: "ASAI QA",
    message: "Interested in private beta.",
    planInterest: "UNSURE",
    source: "pricing",
    consentVersion,
    consentAccepted: true,
    privacyAccepted: true,
  });
  const after = await getPublicLeadCountByEmail(validEmail);
  push(valid.status === 201, "lead endpoint stores consented lead", `status=${valid.status}`);
  push(after === before + 1, "lead endpoint persists one allowlisted row", `${before}->${after}`);
  push(Boolean(valid.body?.lead?.id), "lead response returns public-safe receipt id");
  push(!valid.text.includes(validEmail), "lead response does not echo email");
  assertNoPrivatePublicLeak("lead response omits private sentinels", valid.text);

  const rateEmail = `public-lead-rate-${timestamp}@example.test`;
  const first = await postValidLead(rateEmail, consentVersion);
  const second = await postValidLead(rateEmail, consentVersion);
  const third = await postValidLead(rateEmail, consentVersion);
  push(first.status === 201, "lead rate proof first request succeeds", `status=${first.status}`);
  push(second.status === 201, "lead rate proof second request succeeds", `status=${second.status}`);
  push(third.status === 429, "lead rate proof third request is limited", `status=${third.status}`);
}

async function getDbPlanConfigs() {
  const result = await db.query(
    `SELECT plan, max_members, max_collaborators, max_units, monthly_ai_quota
     FROM plan_configs
     WHERE is_active = true`,
  );

  return new Map(result.rows.map((row) => [row.plan, row]));
}

async function getPublicLeadCountByEmail(email) {
  const result = await db.query("SELECT count(*)::int AS count FROM public_leads WHERE email = $1", [email]);
  return Number(result.rows[0]?.count ?? 0);
}

async function verifyBrowser(status) {
  mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    attachConsoleGuards(page);

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const landingDesktop = await publicCtaChecks(page);
    push(landingDesktop.text.includes(status.primaryCta.label), "landing desktop renders public CTA label");
    push(landingDesktop.modes.every((mode) => mode === status.primaryCta.mode), "landing desktop CTA mode matches status");
    push(landingDesktop.checkoutStatuses.every((mode) => mode === status.checkoutAvailability.status), "landing desktop checkout status matches status");
    push(!landingDesktop.horizontalOverflow, "landing desktop has no horizontal overflow");
    await page.screenshot({ path: path.join(screenshotDir, "bff-305a-landing-desktop.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const landingMobile = await publicCtaChecks(page);
    push(!landingMobile.horizontalOverflow, "landing mobile has no horizontal overflow");
    await page.screenshot({ path: path.join(screenshotDir, "bff-305a-landing-mobile.png"), fullPage: true });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${baseUrl}/pricing`, { waitUntil: "networkidle" });
    const pricingDesktop = await pricingCtaChecks(page);
    push(pricingDesktop.text.includes(status.checkoutAvailability.label), "pricing desktop renders checkout posture label");
    push(pricingDesktop.publicCtaMode === status.primaryCta.mode, "pricing desktop public CTA mode matches status");
    push(pricingDesktop.checkoutStatus === status.checkoutAvailability.status, "pricing desktop checkout status matches status");
    push(pricingDesktop.planModes.includes("enterprise_contact"), "pricing desktop keeps enterprise contact CTA mode");
    push(pricingDesktop.planModes.filter((mode) => mode === status.primaryCta.mode).length >= 3, "pricing desktop plan CTAs share public status mode");
    push(pricingDesktop.leadForm === true, "pricing desktop renders public lead form");
    push(pricingDesktop.leadConsentVersion === status.leadCapture.consentVersion, "pricing lead form consent version matches status");
    push(!pricingDesktop.text.includes("前往付款"), "pricing desktop does not render checkout payment step by default");
    push(!pricingDesktop.horizontalOverflow, "pricing desktop has no horizontal overflow");
    await page.screenshot({ path: path.join(screenshotDir, "bff-305a-pricing-desktop.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/pricing`, { waitUntil: "networkidle" });
    const pricingMobile = await pricingCtaChecks(page);
    push(!pricingMobile.horizontalOverflow, "pricing mobile has no horizontal overflow");
    await page.screenshot({ path: path.join(screenshotDir, "bff-305a-pricing-mobile.png"), fullPage: true });
  } finally {
    await browser.close();
  }
}

function attachConsoleGuards(page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
}

async function publicCtaChecks(page) {
  return page.evaluate(() => ({
    text: document.body.innerText,
    modes: Array.from(document.querySelectorAll("[data-public-cta]")).map((node) => node.getAttribute("data-public-cta-mode")),
    checkoutStatuses: Array.from(document.querySelectorAll("[data-public-cta]")).map((node) => node.getAttribute("data-checkout-status")),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
}

async function pricingCtaChecks(page) {
  return page.evaluate(() => {
    const statusNode = document.querySelector("[data-public-pricing-status]");
    return {
      text: document.body.innerText,
      publicCtaMode: statusNode?.getAttribute("data-public-cta-mode") ?? null,
      checkoutStatus: statusNode?.getAttribute("data-checkout-status") ?? null,
      planModes: Array.from(document.querySelectorAll("[data-plan-cta-mode]")).map((node) => node.getAttribute("data-plan-cta-mode")),
      leadForm: Boolean(document.querySelector("[data-public-lead-form]")),
      leadConsentVersion: document.querySelector("[data-public-lead-form]")?.getAttribute("data-lead-consent-version") ?? null,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
}

function printSummary() {
  if (consoleErrors.length > 0) {
    fail("browser console errors", consoleErrors.slice(0, 3).join(" | "));
  } else {
    pass("browser console errors", "0");
  }

  const failed = checks.filter((check) => !check.ok);
  console.log(`\nPublic status BFF QA checks: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

try {
  verifyStaticBoundaries();
  await ensureDevServer();
  await connectDb();
  const { status } = await verifyApi();
  await verifyLeadCaptureApi(status);
  await verifyBrowser(status);
} catch (error) {
  fail("public-status-qa", error.stack ?? error.message);
  process.exitCode = 1;
} finally {
  if (db) await db.end().catch(() => {});
  for (const child of spawned) {
    child.kill("SIGTERM");
  }
  printSummary();
}
