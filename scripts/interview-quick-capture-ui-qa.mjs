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
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ??
    "docs/06_audits-and-reports/screenshots/pim/pim-011c-quick-capture-ui",
);
const runId = Date.now().toString(36);
const qaRawToken = `PIM011C_RAW_DO_NOT_ECHO_${runId}`;
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
    await db.query(`UPDATE clients SET sensitivity = 'HIGHLY_SENSITIVE' WHERE id = $1`, [client.id]);
    await runDesktopProof(visit.id);
    await runMobileProof(visit.id);
  }

  const afterUsageCount = await countAiUsageLogs();
  push(afterUsageCount === beforeUsageCount, "quick-capture UI proof does not create AiUsageLog", `${beforeUsageCount}->${afterUsageCount}`);
} catch (error) {
  push(false, "quick-capture UI QA crashed", error instanceof Error ? error.message : String(error));
} finally {
  await db.end();
}

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (consoleErrors.length > 0) {
  console.log(`FAIL Console errors - ${consoleErrors.slice(0, 3).join(" | ")}`);
  process.exitCode = 1;
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function runDesktopProof(visitPlanId) {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  attachConsole(page, "desktop");

  try {
    await page.goto(`${baseUrl}/pre-visit/${visitPlanId}/notes`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "拜訪後筆記" }).waitFor({ timeout: 30000 });
    await page.getByPlaceholder(/摘要/).fill(`摘要：客戶確認想先看退休金缺口。\n下一步跟進：${qaRawToken}`);
    await page.getByLabel("歸拜訪").check();

    const blockedResponsePromise = waitForQuickCaptureResponse(page);
    await page.getByRole("button", { name: "送進 Park 記憶" }).click();
    const blockedResponse = await blockedResponsePromise;
    const blockedBody = await blockedResponse.json();
    await page.getByTestId("quick-capture-blocked").waitFor({ timeout: 30000 });
    push(blockedResponse.status() === 409, "desktop high-sensitive visit capture is blocked without approval", `status=${blockedResponse.status()}`);
    push(blockedBody?.status === "BLOCKED", "desktop blocked response returns safe status", `status=${blockedBody?.status ?? "missing"}`);
    pushNoRawEcho(JSON.stringify(blockedBody), "desktop blocked API response does not echo raw note");

    await page.getByPlaceholder(/若內容涉及高敏感資料/).fill("PIM-011c QA：只建立內部記憶與待確認交接。");
    await page.getByLabel(/我確認這則筆記只建立內部記憶/).check();
    const readyResponsePromise = waitForQuickCaptureResponse(page);
    await page.getByRole("button", { name: "送進 Park 記憶" }).click();
    const readyResponse = await readyResponsePromise;
    const readyBody = await readyResponse.json();
    const resultPanel = page.getByTestId("quick-capture-result");
    await resultPanel.waitFor({ timeout: 30000 });
    const resultText = await resultPanel.innerText();
    const overflow = await hasHorizontalOverflow(page);

    push(readyResponse.status() === 201 && readyBody?.status === "READY", "desktop approved capture returns READY 201", `status=${readyResponse.status()}`);
    push(Boolean(readyBody?.capture?.sessionId && readyBody?.capture?.turnId), "desktop ready response returns session and turn ids");
    push((readyBody?.memoryCandidates?.length ?? 0) >= 1, "desktop ready response returns memory candidates", `count=${readyBody?.memoryCandidates?.length ?? 0}`);
    push(readyBody?.safety?.scopeSource === "server_session", "desktop ready response declares server session scope");
    push(readyBody?.safety?.providerCallAttempted === false, "desktop ready response declares no provider call");
    pushNoRawEcho(JSON.stringify(readyBody), "desktop ready API response does not echo raw note");
    pushNoRawEcho(resultText, "desktop result panel does not echo raw note");
    push(!overflow, "desktop notes quick-capture UI has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "pim-011c-notes-desktop.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runMobileProof(visitPlanId) {
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
  attachConsole(page, "mobile");

  try {
    await page.goto(`${baseUrl}/pre-visit/${visitPlanId}/notes`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "拜訪後筆記" }).waitFor({ timeout: 30000 });
    await page.getByPlaceholder(/摘要/).fill(`摘要：不確定誰會一起決策？\n下一步跟進：mobile ${qaRawToken}`);
    await page.getByLabel("轉待確認").check();
    await page.getByPlaceholder(/若內容涉及高敏感資料/).fill("PIM-011c mobile QA：只建立待確認題與劇場狀態提案。");
    await page.getByLabel(/我確認這則筆記只建立內部記憶/).check();

    const responsePromise = waitForQuickCaptureResponse(page);
    await page.getByRole("button", { name: "送進 Park 記憶" }).click();
    const response = await responsePromise;
    const body = await response.json();
    const resultPanel = page.getByTestId("quick-capture-result");
    await resultPanel.waitFor({ timeout: 30000 });
    const resultText = await resultPanel.innerText();
    const overflow = await hasHorizontalOverflow(page);

    push(response.status() === 201 && body?.status === "READY", "mobile follow-up review capture returns READY 201", `status=${response.status()}`);
    push((body?.theaterStateProposals?.length ?? 0) >= 1, "mobile follow-up review creates theater state proposal", `count=${body?.theaterStateProposals?.length ?? 0}`);
    pushNoRawEcho(JSON.stringify(body), "mobile ready API response does not echo raw note");
    pushNoRawEcho(resultText, "mobile result panel does not echo raw note");
    push(!overflow, "mobile notes quick-capture UI has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "pim-011c-notes-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function createClient() {
  const response = await memberRequestJson("POST", "/api/clients", {
    name: `PIM-011c UI 客戶 ${runId}`,
    email: `pim011c-${runId}@asai.local`,
    phone: "0912-011-011",
    birthDate: "1986-06-21",
    occupation: "PIM-011c QA",
    annualIncome: 1800000,
    status: "PROSPECT",
  });
  const id = response.body?.client?.id ?? "";
  push(response.status === 201 && Boolean(id), "member creates PIM-011c QA client", `status=${response.status}`);
  return { id };
}

async function createVisit(clientId) {
  const response = await memberRequestJson("POST", "/api/visits", {
    clientId,
    purpose: "CARE",
    visitTime: new Date(Date.now() + 86_400_000).toISOString(),
  });
  const id = response.body?.visitPlan?.id ?? "";
  push(response.status === 201 && Boolean(id), "member creates PIM-011c QA visit", `status=${response.status}`);
  return { id };
}

async function memberRequestJson(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": demoEmail,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function waitForQuickCaptureResponse(page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/api/ai/interview/quick-captures") &&
      response.request().method() === "POST",
    { timeout: 60000 },
  );
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
    if (message.type() === "error" && !text.includes("status of 409 (Conflict)")) {
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

function pushNoRawEcho(text, label) {
  push(!String(text).includes(qaRawToken), label);
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
