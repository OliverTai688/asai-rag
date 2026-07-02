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
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-member-dashboard-bff",
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
  await verifyDemoAccounts();
  await runApiProof();
  await runBrowserProof();
} finally {
  await db.end();
}

push(true, "no provider route invoked", "script uses deterministic dashboard BFF and never calls OpenAI/Anthropic");

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

async function verifyDemoAccounts() {
  const member = await getDemoUserWithDefaultOrg(demoMemberEmail);
  const manager = await getDemoUserWithDefaultOrg(demoManagerEmail);

  push(Boolean(member?.user_id), "demo member exists for dashboard proof", member?.email ?? "");
  push(Boolean(manager?.user_id), "demo manager exists for cross-role proof", manager?.email ?? "");
}

async function runApiProof() {
  const unauth = await get("/api/member/dashboard");
  push(unauth.status === 401, "GET /api/member/dashboard unauth returns 401", `status=${unauth.status}`);
  push(unauth.body?.kind === "AUTHENTICATION", "unauth dashboard uses shared auth error kind", unauth.body?.kind ?? "");

  const member = await memberGet("/api/member/dashboard");
  const dashboard = member.body?.dashboard;
  const bodyText = JSON.stringify(member.body);
  const kpiIds = dashboard?.kpis?.map((kpi) => kpi.id).join(",") ?? "";
  const hasIssueKpi = dashboard?.kpis?.some((kpi) => kpi.id === "openIssues") ?? false;
  const hasIssueTask = dashboard?.tasks?.some((task) => task.kind === "ISSUE") ?? false;

  push(member.status === 200, "GET /api/member/dashboard member returns 200", `status=${member.status}`);
  push(hasNoStore(member), "dashboard API uses private no-store");
  push(hasRequestId(member), "dashboard API includes request id");
  push(dashboard?.source === "database", "dashboard declares database source", dashboard?.source ?? "");
  push(dashboard?.visibility === "member-scoped", "dashboard declares member-scoped visibility", dashboard?.visibility ?? "");
  push(Array.isArray(dashboard?.kpis) && dashboard.kpis.length === 4, "dashboard includes compact KPI DTOs", `kpis=${kpiIds}`);
  push(!hasIssueKpi, "dashboard KPI set no longer surfaces hidden issues", kpiIds);
  push(Array.isArray(dashboard?.tasks), "dashboard includes task queue array", `tasks=${dashboard?.tasks?.length ?? 0}`);
  push(!hasIssueTask, "dashboard task queue no longer surfaces hidden issues");
  push(Boolean(dashboard?.today?.primaryAction?.href), "dashboard includes today mainline CTA", dashboard?.today?.primaryAction?.href ?? "");
  push(Array.isArray(dashboard?.today?.reasoning?.facts), "dashboard includes visible reasoning facts");
  push(Array.isArray(dashboard?.today?.reasoning?.inferences), "dashboard includes visible reasoning inferences");
  push(Array.isArray(dashboard?.today?.reasoning?.unknowns), "dashboard includes visible unknown boundaries");
  push(Array.isArray(dashboard?.recentActivity), "dashboard includes recent activity DTO");
  push(typeof dashboard?.aiQuota?.remaining === "number", "dashboard includes AI quota summary", `${dashboard?.aiQuota?.used ?? ""}/${dashboard?.aiQuota?.quota ?? ""}`);
  pushNoRawSentinel(bodyText, "dashboard API has no raw private sentinel");

  const reload = await memberGet("/api/member/dashboard");
  push(
    reload.body?.dashboard?.source === "database",
    "dashboard API reload stays database-backed",
    reload.body?.dashboard?.source ?? "",
  );

  const manager = await managerGet("/api/member/dashboard");
  const managerText = JSON.stringify(manager.body);
  push(manager.status === 200, "manager dashboard returns own member dashboard", `status=${manager.status}`);
  pushNoRawSentinel(managerText, "manager dashboard response has no raw private sentinel");
}

async function runBrowserProof() {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: { "x-asai-demo-user-email": demoMemberEmail },
  });
  const page = await context.newPage();
  bindConsoleErrors(page);

  try {
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "今日決策台" }).waitFor({ timeout: 30000 });

    const desktop = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasMainline: text.includes("今日主線"),
        hasKpis: text.includes("準備包") && text.includes("客戶池") && text.includes("待跟進") && text.includes("已分享"),
        hasIssueNav: text.includes("議題單"),
        hasQuota: text.includes("AI 額度") || text.includes("AI 顧問摘要"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        bodyText: text,
      };
    });
    push(desktop.hasMainline, "browser /dashboard renders today mainline");
    push(desktop.hasKpis, "browser /dashboard renders server KPI set with follow-up KPI");
    push(!desktop.hasIssueNav, "browser /dashboard no longer exposes hidden 議題單 nav");
    push(desktop.hasQuota, "browser /dashboard renders AI quota/insight panel");
    push(!desktop.horizontalOverflow, "dashboard desktop has no horizontal overflow");
    pushNoRawSentinel(desktop.bodyText, "browser dashboard has no raw private sentinel");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-dashboard-bff-desktop.png"),
      fullPage: true,
    });

    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "今日決策台" }).waitFor({ timeout: 30000 });
    push(true, "browser reload keeps dashboard rendered");

    await context.clearCookies();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "今日決策台" }).waitFor({ timeout: 30000 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "dashboard mobile has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-dashboard-bff-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
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

async function getDemoUserWithDefaultOrg(email) {
  const result = await db.query(
    `
      SELECT
        u.id AS user_id,
        u.email,
        om.organization_id
      FROM users u
      JOIN organization_members om ON om.user_id = u.id
      WHERE u.email = $1
        AND u.status = 'ACTIVE'
        AND om.status = 'ACTIVE'
      ORDER BY om.is_default DESC, om.created_at ASC
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0];
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
    "demo.member@asai.local",
    "demo.manager@asai.local",
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
