#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const managerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ??
    "docs/06_audits-and-reports/screenshots/ai-meeting/amm-005b-global-entrypoints",
);
const runId = Date.now().toString(36);
const rawSentinel = `AMM005B_RAW_PROVIDER_SENTINEL_${runId}`;
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
  const beforeUsageCount = await countAiUsageLogs();
  const client = await createClient();
  const visit = await createVisit(client.id);

  if (client.id && visit.id) {
    const dashboardProof = await runDashboardEntrypointProof(visit.id);
    const crmProof = await runCrmEntrypointProof(client.id);
    await runMobileCrmProof(client.id, crmProof.sessionId);
    await runApiBoundaryProof(client.id, dashboardProof.sessionId, crmProof.sessionId);
  }

  const afterUsageCount = await countAiUsageLogs();
  push(
    afterUsageCount === beforeUsageCount,
    "global meeting entrypoint no-provider proof keeps AiUsageLog unchanged",
    `${beforeUsageCount}->${afterUsageCount}`,
  );
} catch (error) {
  push(false, "meeting global entrypoints QA crashed", error instanceof Error ? error.message : String(error));
} finally {
  await db.end();
}

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (consoleErrors.length > 0) {
  console.log(`FAIL Console errors - ${consoleErrors.slice(0, 5).join(" | ")}`);
  process.exitCode = 1;
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function runDashboardEntrypointProof(visitPlanId) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  attachConsole(page, "dashboard");

  try {
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByTestId("dashboard-meeting-entrypoint").waitFor({ timeout: 30000 });
    const dashboardHref = await page.getByTestId("dashboard-meeting-entrypoint").getAttribute("href");
    push(
      dashboardHref === `/pre-visit/${visitPlanId}/meeting`,
      "dashboard recent meeting entrypoint targets the seeded visit plan",
      dashboardHref ?? "missing",
    );

    await page.getByTestId("dashboard-meeting-entrypoint").click();
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });

    const sessionId = await page.getByTestId("meeting-session-id").getAttribute("data-session-id");
    push(Boolean(sessionId), "dashboard entrypoint opens meeting workspace without raw ID input", sessionId ? "session-created" : "missing");
    push(page.url().includes(`/pre-visit/${visitPlanId}/meeting?sessionId=`), "dashboard entrypoint writes resumable session URL", page.url());

    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });
    const reloadedSessionId = await page.getByTestId("meeting-session-id").getAttribute("data-session-id");
    push(reloadedSessionId === sessionId, "dashboard meeting refresh preserves the same session", `${sessionId}->${reloadedSessionId}`);

    const overflow = await hasHorizontalOverflow(page);
    push(!overflow, "dashboard meeting entrypoint desktop has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("dashboard:")).length === 0, "dashboard meeting console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-005b-dashboard-meeting-desktop.png"),
      fullPage: true,
    });

    return { sessionId: sessionId ?? "" };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runCrmEntrypointProof(clientId) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  attachConsole(page, "crm");

  try {
    await page.goto(`${baseUrl}/crm/${clientId}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByTestId("crm-meeting-entrypoint").waitFor({ timeout: 30000 });
    await page.getByTestId("crm-meeting-entrypoint").click();
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });

    const sessionId = await page.getByTestId("meeting-session-id").getAttribute("data-session-id");
    push(Boolean(sessionId), "CRM entrypoint opens client-scoped meeting workspace", sessionId ? "session-created" : "missing");
    push(page.url().includes(`/crm/${clientId}/meeting?sessionId=`), "CRM entrypoint writes resumable session URL", page.url());

    const transcriptResponse = await appendFinalTranscript(
      page,
      `AMM-005b CRM direct meeting：客戶確認最近會議要先談家庭責任與醫療保障 ${runId}`,
    );
    push(transcriptResponse.status() === 201, "CRM direct meeting appends final transcript", `status=${transcriptResponse.status()}`);

    const summaryResponsePromise = waitForMeetingSummaryPostResponse(page);
    await page.getByRole("button", { name: "生成摘要" }).click();
    const summaryResponse = await summaryResponsePromise;
    push(
      summaryResponse.status() === 201 || summaryResponse.status() === 200,
      "CRM direct meeting generates deterministic summary",
      `status=${summaryResponse.status()}`,
    );

    await page.getByTestId("meeting-summary-headline").waitFor({ timeout: 60000 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByTestId("meeting-summary-headline").waitFor({ timeout: 60000 });
    const persistedText = await page.getByTestId("meeting-summary-headline").innerText();
    push(persistedText.length > 0, "CRM meeting summary survives refresh/new browser context", persistedText.slice(0, 80));

    const dbProof = await getClientMeetingSessionProof(clientId, sessionId ?? "");
    push(dbProof.clientId === clientId, "DB proof: CRM meeting session is linked to selected client", dbProof.clientId ?? "missing");
    push(dbProof.visitPlanId === null, "DB proof: CRM direct meeting does not require a visitPlanId", String(dbProof.visitPlanId));

    const overflow = await hasHorizontalOverflow(page);
    push(!overflow, "CRM meeting entrypoint desktop has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("crm:")).length === 0, "CRM meeting console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-005b-crm-meeting-desktop.png"),
      fullPage: true,
    });

    return { sessionId: sessionId ?? "" };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runMobileCrmProof(clientId, sessionId) {
  if (!sessionId) {
    push(false, "mobile CRM proof has session id", "missing");
    return;
  }

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  attachConsole(page, "mobile-crm");

  try {
    await page.goto(`${baseUrl}/crm/${clientId}/meeting?sessionId=${encodeURIComponent(sessionId)}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });
    await page.getByTestId("meeting-summary-headline").waitFor({ timeout: 60000 });
    const overflow = await hasHorizontalOverflow(page);

    push(!overflow, "CRM meeting entrypoint mobile has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("mobile-crm:")).length === 0, "CRM meeting mobile console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-005b-crm-meeting-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runApiBoundaryProof(clientId, dashboardSessionId, crmSessionId) {
  const managerReadDashboard = await memberRequestJson("GET", `/api/ai/meeting/sessions/${dashboardSessionId}`, undefined, managerEmail);
  push(managerReadDashboard.status === 404, "manager cannot read dashboard-created member-private meeting", `status=${managerReadDashboard.status}`);

  const managerReadCrm = await memberRequestJson("GET", `/api/ai/meeting/sessions/${crmSessionId}`, undefined, managerEmail);
  push(managerReadCrm.status === 404, "manager cannot read CRM-created member-private meeting", `status=${managerReadCrm.status}`);

  const managerCreateCrm = await memberRequestJson(
    "POST",
    "/api/ai/meeting/sessions",
    {
      clientId,
      title: "manager must not create foreign client meeting",
    },
    managerEmail,
  );
  push(managerCreateCrm.status === 404, "manager cannot create meeting for member-owned client", `status=${managerCreateCrm.status}`);

  const rawCreate = await memberRequestJson("POST", "/api/ai/meeting/sessions", {
    clientId,
    providerPayload: `raw provider payload ${rawSentinel}`,
  });
  push(rawCreate.status === 409, "raw provider payload is blocked before meeting session create", `status=${rawCreate.status}`);
  push(!JSON.stringify(rawCreate.body).includes(rawSentinel), "blocked create response does not echo raw sentinel");
}

async function createClient() {
  const response = await memberRequestJson("POST", "/api/clients", {
    name: `AMM-005b 全站會議客戶 ${runId}`,
    email: `amm005b-${runId}@asai.local`,
    phone: "0912-005-005",
    birthDate: "1986-06-21",
    occupation: "AMM-005b QA",
    annualIncome: 1680000,
    status: "PROSPECT",
  });
  const id = response.body?.client?.id ?? "";
  push(response.status === 201 && Boolean(id), "member creates AMM-005b QA client", `status=${response.status}`);
  return { id };
}

async function createVisit(clientId) {
  const response = await memberRequestJson("POST", "/api/visits", {
    clientId,
    purpose: "CARE",
    visitTime: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  });
  const id = response.body?.visitPlan?.id ?? "";
  push(response.status === 201 && Boolean(id), "member creates AMM-005b QA visit for dashboard", `status=${response.status}`);
  if (id) {
    await db.query("UPDATE visit_plans SET scheduled_at = $1 WHERE id = $2", [new Date("2000-01-01T09:00:00.000Z"), id]);
  }
  return { id };
}

async function memberRequestJson(method, path, body, email = demoEmail) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": email,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function waitForMeetingTurnResponse(page) {
  return page.waitForResponse(
    (response) => response.url().includes("/api/ai/meeting/sessions/") && response.url().endsWith("/turns"),
    { timeout: 60000 },
  );
}

async function appendFinalTranscript(page, text) {
  await page.getByTestId("meeting-transcript-input").fill(text);
  const responsePromise = waitForMeetingTurnResponse(page);
  await page.getByRole("button", { name: "加入 final transcript" }).click();
  return responsePromise;
}

async function waitForMeetingSummaryPostResponse(page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/api/ai/meeting/sessions/") &&
      response.url().endsWith("/summary") &&
      response.request().method() === "POST",
    { timeout: 60000 },
  );
}

async function getClientMeetingSessionProof(clientId, sessionId) {
  const result = await db.query(
    `SELECT client_id, metadata->>'visitPlanId' AS visit_plan_id
     FROM interview_sessions
     WHERE id = $1
       AND client_id = $2
       AND interview_kind = 'CLIENT_MEETING'
     LIMIT 1`,
    [sessionId, clientId],
  );
  const row = result.rows[0] ?? {};
  return {
    clientId: row.client_id ?? null,
    visitPlanId: row.visit_plan_id ?? null,
  };
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  } catch {
    return chromium.launch();
  }
}

function attachConsole(page, scope) {
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") {
      consoleErrors.push(`${scope}: ${text}`);
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(`${scope}: ${error.message}`));
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

async function countAiUsageLogs() {
  const result = await db.query(`SELECT COUNT(*)::int AS count FROM ai_usage_logs`);
  return Number(result.rows[0]?.count ?? 0);
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}
