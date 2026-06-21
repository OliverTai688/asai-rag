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
    "docs/06_audits-and-reports/screenshots/ai-meeting/amm-005c-notes-compat",
);
const runId = Date.now().toString(36);
const noteText = [
  `摘要：AMM-005c notes compatibility proof ${runId}`,
  "客戶反應：接受退休缺口先行盤點，但配偶意見仍是未知。",
  "下一步跟進：下次會議前補齊保單與醫療支出資料。",
].join("\n");
const rawSentinel = `AMM005C_RAW_PROVIDER_SENTINEL_${runId}`;
const checks = [];
const consoleErrors = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

mkdirSync(screenshotDir, { recursive: true });

let db = null;

try {
  db = new PgClient({ connectionString: dbUrl });
  await db.connect();

  const beforeUsageCount = await countAiUsageLogs();
  const client = await createClient();
  const visit = await createVisit(client.id);

  if (visit.id) {
    const desktopProof = await runDesktopNotesProof(visit.id);
    await runRefreshProof(visit.id, desktopProof.sessionId);
    await runMobileProof(visit.id, desktopProof.sessionId);
    await runApiBoundaryProof(visit.id, desktopProof.sessionId);
  }

  const afterUsageCount = await countAiUsageLogs();
  push(
    afterUsageCount === beforeUsageCount,
    "notes compatibility no-provider proof keeps AiUsageLog unchanged",
    `${beforeUsageCount}->${afterUsageCount}`,
  );
} catch (error) {
  push(false, "meeting notes compatibility QA crashed", error instanceof Error ? error.message : String(error));
} finally {
  if (db) {
    await db.end();
  }
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

async function runDesktopNotesProof(visitPlanId) {
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
    await page.getByTestId("post-visit-notes-textarea").waitFor({ timeout: 60000 });
    await page.getByTestId("post-visit-notes-textarea").fill(noteText);

    const saveResponsePromise = waitForVisitPatchResponse(page, visitPlanId);
    await page.getByTestId("post-visit-notes-save").click();
    const saveResponse = await saveResponsePromise;
    push(saveResponse.status() === 200, "owner saves legacy postVisitNotes from notes page", `status=${saveResponse.status()}`);

    await page.getByTestId("notes-meeting-bridge").waitFor({ timeout: 30000 });
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });
    const sessionId = await page.getByTestId("meeting-session-id").getAttribute("data-session-id");
    push(Boolean(sessionId), "notes page creates meeting session without raw session ID input", sessionId ? "session-ready" : "missing");

    const noteDraft = await page.getByTestId("meeting-note-input").inputValue();
    push(noteDraft.includes("AMM-005c notes compatibility proof"), "meeting manual note draft reflects saved notes context");

    const noteResponsePromise = waitForMeetingTurnResponse(page);
    await page.getByRole("button", { name: "加入筆記" }).click();
    const noteResponse = await noteResponsePromise;
    push(noteResponse.status() === 201, "notes bridge appends manual meeting note via BFF", `status=${noteResponse.status()}`);

    const summaryResponsePromise = waitForMeetingSummaryPostResponse(page);
    await page.getByRole("button", { name: "生成摘要" }).click();
    const summaryResponse = await summaryResponsePromise;
    push(
      summaryResponse.status() === 201 || summaryResponse.status() === 200,
      "notes bridge generates persisted meeting summary",
      `status=${summaryResponse.status()}`,
    );

    await page.getByTestId("meeting-summary-headline").waitFor({ timeout: 60000 });
    const providerSafety = await page.getByTestId("meeting-safety-provider").innerText();
    const overflow = await hasHorizontalOverflow(page);

    push(providerSafety.includes("未嘗試"), "notes bridge declares provider not attempted", providerSafety);
    push(!overflow, "desktop notes + meeting bridge has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("desktop:")).length === 0, "desktop console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-005c-notes-desktop.png"),
      fullPage: true,
    });

    return { sessionId: sessionId ?? "" };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runRefreshProof(visitPlanId, sessionId) {
  if (!sessionId) {
    push(false, "refresh proof has session id", "missing");
    return;
  }

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  attachConsole(page, "refresh");

  try {
    await page.goto(`${baseUrl}/pre-visit/${visitPlanId}/notes?sessionId=${encodeURIComponent(sessionId)}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByTestId("post-visit-notes-textarea").waitFor({ timeout: 60000 });
    await page.getByTestId("meeting-summary-headline").waitFor({ timeout: 60000 });
    const loadedNotes = await page.getByTestId("post-visit-notes-textarea").inputValue();
    const loadedSessionId = await page.getByTestId("meeting-session-id").getAttribute("data-session-id");
    const summaryText = await page.getByTestId("meeting-summary-headline").innerText();

    push(loadedNotes.includes(runId), "new browser context reads saved postVisitNotes");
    push(loadedSessionId === sessionId, "new browser context reads same meeting session on notes page");
    push(summaryText.length > 0, "new browser context reads persisted meeting summary on notes page");
    push(consoleErrors.filter((error) => error.startsWith("refresh:")).length === 0, "refresh console error count is zero");
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runMobileProof(visitPlanId, sessionId) {
  if (!sessionId) {
    push(false, "mobile proof has session id", "missing");
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
  attachConsole(page, "mobile");

  try {
    await page.goto(`${baseUrl}/pre-visit/${visitPlanId}/notes?sessionId=${encodeURIComponent(sessionId)}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByTestId("notes-meeting-bridge").waitFor({ timeout: 60000 });
    await page.getByTestId("meeting-summary-headline").waitFor({ timeout: 60000 });
    const overflow = await hasHorizontalOverflow(page);

    push(!overflow, "mobile notes + meeting bridge has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("mobile:")).length === 0, "mobile console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-005c-notes-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runApiBoundaryProof(visitPlanId, sessionId) {
  if (!sessionId) {
    push(false, "API boundary proof has session id", "missing");
    return;
  }

  const ownerVisit = await memberRequestJson("GET", `/api/visits/${visitPlanId}`, undefined, demoEmail);
  push(
    ownerVisit.status === 200 && ownerVisit.body?.visitPlan?.postVisitNotes?.includes(runId),
    "owner reads saved legacy postVisitNotes through visit BFF",
    `status=${ownerVisit.status}`,
  );

  const ownerLatest = await memberRequestJson(
    "GET",
    `/api/ai/meeting/sessions?visitPlanId=${encodeURIComponent(visitPlanId)}`,
    undefined,
    demoEmail,
  );
  push(
    ownerLatest.status === 200 && ownerLatest.body?.status === "found" && ownerLatest.body?.snapshot?.session?.id === sessionId,
    "owner latest-session lookup returns notes-page meeting session",
    `status=${ownerLatest.status}`,
  );

  const managerVisit = await memberRequestJson("GET", `/api/visits/${visitPlanId}`, undefined, managerEmail);
  push(managerVisit.status === 404, "manager cannot read member-owned visit notes", `status=${managerVisit.status}`);

  const managerSnapshot = await memberRequestJson("GET", `/api/ai/meeting/sessions/${sessionId}`, undefined, managerEmail);
  push(managerSnapshot.status === 404, "manager cannot read notes-page meeting session", `status=${managerSnapshot.status}`);

  const rawPayload = await memberRequestJson(
    "POST",
    `/api/ai/meeting/sessions/${sessionId}/turns`,
    {
      role: "USER",
      modality: "VOICE_TRANSCRIPT_FALLBACK",
      source: "VOICE_FINAL_TRANSCRIPT",
      content: `raw provider payload ${rawSentinel}`,
      transcriptFinal: true,
      rawProviderPayload: rawSentinel,
    },
    demoEmail,
  );
  push(rawPayload.status === 409, "raw provider meeting payload is blocked", `status=${rawPayload.status}`);
  push(!JSON.stringify(rawPayload.body).includes(rawSentinel), "blocked raw payload response does not echo sentinel");
}

async function createClient() {
  const response = await memberRequestJson("POST", "/api/clients", {
    name: `AMM-005c 筆記相容客戶 ${runId}`,
    email: `amm005c-${runId}@asai.local`,
    phone: "0912-005-005",
    birthDate: "1985-06-21",
    occupation: "AMM-005c QA",
    annualIncome: 1680000,
    status: "PROSPECT",
  });
  const id = response.body?.client?.id ?? "";
  push(response.status === 201 && Boolean(id), "member creates AMM-005c QA client", `status=${response.status}`);
  return { id };
}

async function createVisit(clientId) {
  const response = await memberRequestJson("POST", "/api/visits", {
    clientId,
    purpose: "CARE",
    visitTime: new Date(Date.now() + 86_400_000).toISOString(),
  });
  const id = response.body?.visitPlan?.id ?? "";
  push(response.status === 201 && Boolean(id), "member creates AMM-005c QA visit", `status=${response.status}`);
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

async function waitForVisitPatchResponse(page, visitPlanId) {
  return page.waitForResponse(
    (response) =>
      response.url().includes(`/api/visits/${visitPlanId}`) &&
      response.request().method() === "PATCH",
    { timeout: 60000 },
  );
}

async function waitForMeetingTurnResponse(page) {
  return page.waitForResponse(
    (response) => response.url().includes("/api/ai/meeting/sessions/") && response.url().endsWith("/turns"),
    { timeout: 60000 },
  );
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
  if (!db) throw new Error("DB_NOT_CONNECTED");
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
