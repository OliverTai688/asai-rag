#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";
import { buildRouteBHandoffFixture } from "./fixtures/route-b-handoff-fixture.mjs";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage",
);
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const handoff = buildRouteBHandoffFixture("route_b_session_ui_qa");
const checks = [];
const consoleErrors = [];

let db = null;
let createdSessionId = null;

mkdirSync(screenshotDir, { recursive: true });

if (dbUrl) {
  db = new PgClient({ connectionString: dbUrl });
  await db.connect();
}

try {
  await runProof();
} finally {
  if (db) await db.end();
}

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

async function runProof() {
  const beforeUsageCount = await countTheaterUsageLogs();
  const created = await memberPost("/api/theater/route-b/sessions", { handoff, isDemo: true });

  createdSessionId = created.body?.session?.id ?? null;
  push(created.status === 201 && Boolean(createdSessionId), "Route B session UI QA creates persisted session", `status=${created.status} session=${createdSessionId ?? ""}`);
  push(created.body?.session?.provider?.callAttempted === false, "session create remains no-provider");
  push(created.body?.session?.provider?.usageLogWritten === false, "session create does not fake AiUsageLog");
  pushNoPrivateSentinel(JSON.stringify(created.body), "session create response has no private sentinel");

  if (!createdSessionId) return;

  const managerRead = await managerGet(`/api/theater/route-b/sessions/${createdSessionId}`);
  push(managerRead.status === 404, "manager cannot read member-owned Route B session before UI proof", `status=${managerRead.status}`);

  const browser = await launchBrowser();
  try {
    await assertStageViewport(browser, "desktop", { width: 1440, height: 1000, isMobile: false });
    await assertStageViewport(browser, "mobile", { width: 390, height: 844, isMobile: true });
  } finally {
    await browser.close();
  }

  const afterUsageCount = await countTheaterUsageLogs();
  if (beforeUsageCount !== null && afterUsageCount !== null) {
    push(afterUsageCount === beforeUsageCount, "Route B session UI proof writes no fake AiUsageLog", `before=${beforeUsageCount} after=${afterUsageCount}`);
  } else {
    push(true, "AiUsageLog DB count skipped because DIRECT_URL/DATABASE_URL is unavailable");
  }
}

async function assertStageViewport(browser, viewportName, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: viewport.isMobile,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoMemberEmail,
    },
  });
  const page = await context.newPage();
  bindConsoleErrors(page);

  try {
    await page.goto(`${baseUrl}/theater/${createdSessionId}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: /多角色劇場/ }).waitFor({ timeout: 30000 });

    const checksFromDom = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasRouteB: text.includes("Route B"),
        hasGroupLane: text.includes("群聊"),
        hasPrivateLane: text.includes("私聊"),
        hasFocusCharacter: text.includes("林先生"),
        hasDecisionMaker: text.includes("林太太"),
        hasProviderGuard: text.includes("guarded-disabled") && text.includes("callAttempted=false"),
        hasNoFakeUsage: text.includes("usageLogWritten=false"),
        hasVisibilityProof: text.includes("Scoped turn columns") && text.includes("Owner read"),
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    push(checksFromDom.hasRouteB, `${viewportName} stage renders Route B label`);
    push(checksFromDom.hasGroupLane, `${viewportName} stage renders group-chat lane`);
    push(checksFromDom.hasPrivateLane, `${viewportName} stage renders private-chat lane`);
    push(checksFromDom.hasFocusCharacter && checksFromDom.hasDecisionMaker, `${viewportName} stage renders focus and decision-maker characters`);
    push(checksFromDom.hasProviderGuard, `${viewportName} stage renders guarded-disabled provider proof`);
    push(checksFromDom.hasNoFakeUsage, `${viewportName} stage renders no fake AiUsageLog proof`);
    push(checksFromDom.hasVisibilityProof, `${viewportName} stage renders visibility proof`);
    push(!checksFromDom.hasHorizontalOverflow, `${viewportName} stage has no horizontal overflow`);

    const guardedButton = page.getByRole("button", { name: /待 provider proof/ }).first();
    push(await guardedButton.isDisabled(), `${viewportName} provider action is disabled until usage-log proof exists`);

    const bodyText = await page.locator("body").innerText();
    pushNoPrivateSentinel(bodyText, `${viewportName} stage text has no private sentinel`);

    await page.screenshot({
      path: resolve(screenshotDir, `route-b-session-stage-${viewportName}.png`),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
}

async function memberPost(path, body) {
  return postJson(path, body, {
    "x-asai-demo-user-email": demoMemberEmail,
  });
}

async function managerGet(path) {
  return getJson(path, {
    "x-asai-demo-user-email": demoManagerEmail,
  });
}

async function postJson(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function getJson(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers,
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function countTheaterUsageLogs() {
  if (!db) return null;
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs WHERE module = 'THEATER'");
  return Number(result.rows[0]?.count ?? 0);
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function pushNoPrivateSentinel(text, label) {
  push(
    !text.includes("@") &&
      !/09\d{2}/.test(text) &&
      !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp", "payment"].some((key) =>
        text.toLowerCase().includes(key.toLowerCase()),
      ),
    label,
  );
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

async function launchBrowser() {
  const preferredChannel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";
  try {
    return await chromium.launch({ channel: preferredChannel });
  } catch (error) {
    if (process.env.PLAYWRIGHT_CHANNEL) throw error;
    return chromium.launch({ channel: "chrome" });
  }
}

function bindConsoleErrors(page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
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
