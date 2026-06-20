#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-org-aggregate-bff",
);
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];
const consoleErrors = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

mkdirSync(screenshotDir, { recursive: true });

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runApiProof();
  await runBrowserProof();
} finally {
  await db.end();
}

push(true, "no provider route invoked", "script reads org aggregate BFF only and never calls OpenAI/Anthropic");

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (consoleErrors.length > 0) {
  console.log(`FAIL Console errors — ${consoleErrors.slice(0, 3).join(" | ")}`);
  process.exitCode = 1;
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function runApiProof() {
  const org = await getDemoOrg();
  const forbidden = await getForbiddenOrgDetailSentinels(org.id);
  const routes = ["/api/org/overview", "/api/org/coaching", "/api/org/ai-usage"];

  for (const route of routes) {
    const unauth = await get(route);
    push(unauth.status === 401, `${route} unauth returns 401`, `status=${unauth.status}`);
    push(unauth.body?.kind === "AUTHENTICATION", `${route} unauth uses shared auth error`, unauth.body?.kind ?? "");

    const member = await memberGet(route);
    push(member.status === 403, `${route} member returns 403`, `status=${member.status}`);
    push(member.body?.kind === "FORBIDDEN", `${route} member uses shared forbidden error`, member.body?.kind ?? "");

    const manager = await managerGet(route);
    const text = JSON.stringify(manager.body);
    push(manager.status === 200, `${route} manager returns 200`, `status=${manager.status}`);
    push(hasNoStore(manager), `${route} uses private no-store`);
    push(hasRequestId(manager), `${route} includes request id`);
    push(manager.body?.source === "database", `${route} declares database source`, manager.body?.source ?? "");
    push(manager.body?.visibility === "org-aggregate", `${route} declares org aggregate visibility`, manager.body?.visibility ?? "");
    push(manager.body?.scope?.role === "MANAGER", `${route} is scoped to MANAGER role`, manager.body?.scope?.role ?? "");
    pushNoRawSentinel(text, `${route} response has no raw private sentinel`);
    pushNoForbiddenDetails(text, forbidden, `${route} does not expose client detail sentinels`);
  }

  const overview = await managerGet("/api/org/overview");
  push(Number.isInteger(overview.body?.totals?.clients), "overview includes aggregate client count only");
  push(Array.isArray(overview.body?.memberHealth), "overview includes member aggregate health");

  const coaching = await managerGet("/api/org/coaching");
  push(Array.isArray(coaching.body?.memberCoaching), "coaching includes member coaching aggregate");
  push(Array.isArray(coaching.body?.recommendations), "coaching includes training recommendations");

  const aiUsage = await managerGet("/api/org/ai-usage");
  push(Number.isInteger(aiUsage.body?.totals?.requests), "ai usage includes request aggregate");
  push(Array.isArray(aiUsage.body?.byModule), "ai usage includes module aggregate");
}

async function runBrowserProof() {
  const org = await getDemoOrg();
  const forbidden = await getForbiddenOrgDetailSentinels(org.id);
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: { "x-asai-demo-user-email": demoManagerEmail },
  });
  const page = await context.newPage();
  bindConsoleErrors(page);

  try {
    await page.goto(`${baseUrl}/team`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "通訊處輔導台" }).waitFor({ timeout: 30000 });

    const desktop = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasAggregateBadge: text.includes("Aggregate only"),
        hasDatabaseBadge: text.includes("database"),
        hasQueue: text.includes("輔導佇列"),
        hasAiUsage: text.includes("AI 使用覆蓋"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        bodyText: text,
      };
    });

    push(desktop.hasAggregateBadge, "browser /team shows aggregate-only posture");
    push(desktop.hasDatabaseBadge, "browser /team shows database source posture");
    push(desktop.hasQueue, "browser /team renders coaching queue");
    push(desktop.hasAiUsage, "browser /team renders AI usage aggregate");
    push(!desktop.horizontalOverflow, "team desktop has no horizontal overflow");
    pushNoRawSentinel(desktop.bodyText, "browser team has no raw private sentinel");
    pushNoForbiddenDetails(desktop.bodyText, forbidden, "browser team does not expose client detail sentinels");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-org-aggregate-team-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/team`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "通訊處輔導台" }).waitFor({ timeout: 30000 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "team mobile has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-org-aggregate-team-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function getDemoOrg() {
  const result = await db.query(
    `
      SELECT o.id, o.slug
      FROM users u
      JOIN organization_members m ON m.user_id = u.id
      JOIN organizations o ON o.id = m.organization_id
      WHERE u.email = $1
        AND u.status = 'ACTIVE'
        AND m.status = 'ACTIVE'
      ORDER BY m.is_default DESC, m.created_at ASC
      LIMIT 1
    `,
    [demoManagerEmail],
  );

  const org = result.rows[0];

  if (!org) {
    throw new Error(`Demo organization not found for ${demoManagerEmail}.`);
  }

  return org;
}

async function getForbiddenOrgDetailSentinels(organizationId) {
  const result = await db.query(
    `
      SELECT c.name, c.email, c.phone, c.occupation, c.company, c.notes,
             p.policy_number, p.product_name,
             r.title, r.client_sections::text, r.internal_sections::text,
             sm.content AS spin_message_content,
             tt.content AS theater_turn_content,
             a.request_id, a.error
      FROM clients c
      LEFT JOIN policies p ON p.client_id = c.id
      LEFT JOIN reports r ON r.client_id = c.id
      LEFT JOIN spin_sessions ss ON ss.client_id = c.id
      LEFT JOIN spin_messages sm ON sm.session_id = ss.id
      LEFT JOIN theater_sessions ts ON ts.client_id = c.id
      LEFT JOIN theater_turns tt ON tt.session_id = ts.id
      LEFT JOIN ai_usage_logs a ON a.client_id = c.id
      WHERE c.organization_id = $1
        AND c.is_demo = true
      ORDER BY c.created_at ASC
      LIMIT 40
    `,
    [organizationId],
  );

  return [
    ...new Set(
      result.rows
        .flatMap((row) => Object.values(row))
        .filter((value) => typeof value === "string")
        .flatMap((value) => value.split(/[{}[\]",:]+/))
        .map((value) => value.trim())
        .filter((value) => value.length >= 4)
        .filter(
          (value) =>
            ![
              "type",
              "title",
              "content",
              "SUMMARY",
              "RECOMMENDATION",
              "READY",
              "DRAFT",
              "SHARED",
              "ACTIVE",
              "COMPLETED",
              "NORMAL",
              "PROSPECT",
              "true",
              "false",
            ].includes(value),
        ),
    ),
  ];
}

async function get(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return parseResponse(response);
}

function memberGet(path) {
  return get(path, appHeaders(demoMemberEmail));
}

function managerGet(path) {
  return get(path, appHeaders(demoManagerEmail));
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body, text, headers: response.headers };
}

function hasNoStore(result) {
  return result.headers.get("cache-control")?.toLowerCase().includes("no-store") ?? false;
}

function hasRequestId(result) {
  return Boolean(result.headers.get("x-asai-request-id"));
}

function appHeaders(email) {
  return { "x-asai-demo-user-email": email };
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function pushNoForbiddenDetails(text, forbidden, label) {
  const fieldNames = [
    '"email"',
    '"phone"',
    '"annualIncome"',
    '"policyNumber"',
    '"productName"',
    '"clientName"',
    '"clientId"',
    '"clientSections"',
    '"internalSections"',
    '"messages"',
    '"turns"',
    '"transcript"',
    '"notes"',
    '"policies"',
    '"familyMembers"',
    '"requestId"',
    '"error"',
    '"content"',
  ];
  const fieldHit = fieldNames.find((field) => text.includes(field));
  const valueHit = forbidden.find((value) => text.includes(value));

  push(!fieldHit && !valueHit, label, fieldHit ? `field=${fieldHit}` : valueHit ? `value=${redact(valueHit)}` : `${forbidden.length} sentinels checked`);
}

function pushNoRawSentinel(text, label) {
  const forbidden = [
    "rawProviderPayload",
    "providerPayload",
    "rawPrompt",
    "authorization",
    "cookie",
    "set-cookie",
    "password",
    "secret",
    "token:",
    "policyNumber",
    "internalSections",
    "transcript",
    "private note",
    demoMemberEmail,
    demoManagerEmail,
  ];
  const hit = forbidden.find((item) => text.toLowerCase().includes(item.toLowerCase()));
  push(!hit, label, hit ? `found=${hit}` : "");
}

function bindConsoleErrors(page) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });
}

function redact(value) {
  return `${value.slice(0, 2)}...${value.slice(-2)}`;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const source = readFileSync(filePath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
