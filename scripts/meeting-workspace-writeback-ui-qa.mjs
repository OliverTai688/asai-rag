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
    "docs/06_audits-and-reports/screenshots/ai-meeting/amm-006b-writebacks",
);
const runId = Date.now().toString(36);
const rawSentinel = `AMM006B_RAW_PROVIDER_SENTINEL_${runId}`;
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

  if (visit.id) {
    const desktopProof = await runDesktopProof(visit.id);
    await runMobileProof(visit.id, desktopProof.sessionId);
    await runApiBoundaryProof(client.id, desktopProof.sessionId);
  }

  const afterUsageCount = await countAiUsageLogs();
  push(
    afterUsageCount === beforeUsageCount,
    "meeting workspace writeback no-provider proof keeps AiUsageLog unchanged",
    `${beforeUsageCount}->${afterUsageCount}`,
  );
} catch (error) {
  push(false, "meeting workspace writeback UI QA crashed", error instanceof Error ? error.message : String(error));
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
    await page.goto(`${baseUrl}/pre-visit/${visitPlanId}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("button", { name: "AI 會議", exact: true }).waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "AI 會議", exact: true }).click();
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });

    const sessionId = await page.getByTestId("meeting-session-id").getAttribute("data-session-id");
    push(Boolean(sessionId), "desktop writeback proof creates/resumes meeting session", sessionId ? "session-created" : "missing");

    const preSummaryPanel = await page.getByTestId("meeting-writeback-panel").innerText();
    push(preSummaryPanel.includes("先生成摘要"), "desktop writeback panel shows summary-required UI state");

    const confirmedResponse = await appendFinalTranscript(
      page,
      `AMM-006b confirmed：客戶確認醫療保障第一順位，保費預算上限每月八千元 ${runId}`,
    );
    push(
      confirmedResponse.status() === 201,
      "desktop appends high-sensitive confirmed final transcript",
      `status=${confirmedResponse.status()}`,
    );

    const inferenceResponse = await appendFinalTranscript(
      page,
      `AMM-006b inference：推論客戶可能擔心方案太複雜，先準備家庭責任圖說明 ${runId}`,
    );
    push(
      inferenceResponse.status() === 201,
      "desktop appends inference final transcript",
      `status=${inferenceResponse.status()}`,
    );

    const unknownResponse = await appendFinalTranscript(
      page,
      `AMM-006b unknown：不確定是否邀請配偶一起參與，需要下次補問 ${runId}`,
    );
    push(
      unknownResponse.status() === 201,
      "desktop appends action/unknown final transcript",
      `status=${unknownResponse.status()}`,
    );

    const summaryResponsePromise = waitForMeetingSummaryPostResponse(page);
    await page.getByRole("button", { name: "生成摘要" }).click();
    const summaryResponse = await summaryResponsePromise;
    push(
      summaryResponse.status() === 201 || summaryResponse.status() === 200,
      "desktop generates deterministic meeting summary before writeback cards",
      `status=${summaryResponse.status()}`,
    );

    await page.getByTestId("meeting-writeback-candidate").first().waitFor({ timeout: 60000 });
    const candidateCount = await page.getByTestId("meeting-writeback-candidate").count();
    push(candidateCount >= 3, "desktop renders meeting writeback confirmation cards", `cards=${candidateCount}`);

    await page.getByRole("button", { name: "全選可寫回" }).click();
    const writebackResponsePromise = waitForMeetingWritebackPostResponse(page);
    await page.getByTestId("meeting-writeback-submit").click();
    const writebackResponse = await writebackResponsePromise;
    push(writebackResponse.status() === 201, "desktop posts selected writeback candidates", `status=${writebackResponse.status()}`);

    await page.getByTestId("meeting-writeback-result").waitFor({ timeout: 60000 });
    const createdCount = Number(await page.getByTestId("meeting-writeback-created-count").innerText());
    const blockedCount = Number(await page.getByTestId("meeting-writeback-blocked-count").innerText());
    const overflow = await hasHorizontalOverflow(page);

    push(createdCount >= 1, "desktop writeback UI shows created events", `created=${createdCount}`);
    push(blockedCount >= 1, "desktop writeback UI shows high-sensitive missing reason blocked", `blocked=${blockedCount}`);
    push(!overflow, "desktop meeting writeback workspace has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("desktop:")).length === 0, "desktop console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-006b-meeting-writeback-desktop.png"),
      fullPage: true,
    });

    return { sessionId: sessionId ?? "" };
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
    await page.goto(`${baseUrl}/pre-visit/${visitPlanId}/meeting?sessionId=${encodeURIComponent(sessionId)}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByTestId("meeting-workspace").waitFor({ timeout: 60000 });
    await page.getByTestId("meeting-writeback-candidate").first().waitFor({ timeout: 60000 });
    const overflow = await hasHorizontalOverflow(page);

    push(!overflow, "mobile meeting writeback workspace has no horizontal overflow");
    push(consoleErrors.filter((error) => error.startsWith("mobile:")).length === 0, "mobile console error count is zero");

    await page.screenshot({
      path: resolve(screenshotDir, "amm-006b-meeting-writeback-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runApiBoundaryProof(clientId, sessionId) {
  if (!sessionId) {
    push(false, "API boundary proof has session id", "missing");
    return;
  }

  const ownerPreview = await memberRequestJson("GET", `/api/ai/meeting/sessions/${sessionId}/writebacks`, undefined, demoEmail);
  const candidates = Array.isArray(ownerPreview.body?.candidates) ? ownerPreview.body.candidates : [];
  const confirmed = candidates.find((item) => item.kind === "CONFIRMED_FACT" && item.target === "CRM_CANDIDATE");

  push(ownerPreview.status === 200 && ownerPreview.body?.status === "ready", "owner reads ready writeback preview after UI summary", `status=${ownerPreview.status}`);
  push(Boolean(confirmed?.id), "API preview includes confirmed CRM candidate");

  const managerPreview = await memberRequestJson("GET", `/api/ai/meeting/sessions/${sessionId}/writebacks`, undefined, managerEmail);
  push(managerPreview.status === 404, "manager cannot preview member-private meeting writebacks", `status=${managerPreview.status}`);

  const rawPayloadBefore = await countMeetingWritebackEvents(sessionId);
  const rawPayload = await memberRequestJson(
    "POST",
    `/api/ai/meeting/sessions/${sessionId}/writebacks`,
    {
      candidateIds: confirmed?.id ? [confirmed.id] : ["decision-missing"],
      providerPayload: `raw provider payload ${rawSentinel}`,
    },
    demoEmail,
  );
  const rawPayloadAfter = await countMeetingWritebackEvents(sessionId);

  push(rawPayload.status === 409, "raw provider/private writeback payload is blocked", `status=${rawPayload.status}`);
  push(rawPayloadBefore === rawPayloadAfter, "blocked raw writeback payload creates no events", `${rawPayloadBefore}->${rawPayloadAfter}`);
  push(!JSON.stringify(rawPayload.body).includes(rawSentinel), "blocked raw writeback response does not echo sentinel");

  if (confirmed?.id) {
    const approved = await memberRequestJson(
      "POST",
      `/api/ai/meeting/sessions/${sessionId}/writebacks`,
      {
        candidateIds: [confirmed.id],
        approvals: [
          {
            candidateId: confirmed.id,
            reason: "AMM-006b QA：顧問確認此醫療保障資訊只建立為 CRM 候選，不直接寫正式事實。",
            riskAccepted: true,
          },
        ],
      },
      demoEmail,
    );

    push(approved.status === 201, "approved confirmed writeback creates CRM candidate audit event", `status=${approved.status}`);
    push(
      approved.body?.createdEvents?.some?.((event) => event.candidateId === confirmed.id && event.target === "CRM_CANDIDATE"),
      "approved confirmed writeback result is CRM candidate only",
    );
  }

  const dbProof = await getEventProof(clientId, sessionId);
  push(dbProof.crmCandidates >= 1, "DB has CRM candidate audit event for approved confirmed meeting item", `count=${dbProof.crmCandidates}`);
  push(dbProof.inferenceCrmFacts === 0, "DB proof: meeting inference never persisted as CRM fact", `count=${dbProof.inferenceCrmFacts}`);
  push(dbProof.actionTasks >= 1, "DB has task event for meeting action item", `count=${dbProof.actionTasks}`);
  push(dbProof.unknownTasks >= 1, "DB has task event for meeting unknown/open question", `count=${dbProof.unknownTasks}`);
  push(dbProof.confirmedCrmFactWrites === 0, "DB metadata keeps writesConfirmedCrmFact=false", `count=${dbProof.confirmedCrmFactWrites}`);
}

async function createClient() {
  const response = await memberRequestJson("POST", "/api/clients", {
    name: `AMM-006b UI 客戶 ${runId}`,
    email: `amm006b-${runId}@asai.local`,
    phone: "0912-006-006",
    birthDate: "1987-06-21",
    occupation: "AMM-006b QA",
    annualIncome: 1720000,
    status: "PROSPECT",
  });
  const id = response.body?.client?.id ?? "";
  push(response.status === 201 && Boolean(id), "member creates AMM-006b QA client", `status=${response.status}`);
  return { id };
}

async function createVisit(clientId) {
  const response = await memberRequestJson("POST", "/api/visits", {
    clientId,
    purpose: "CARE",
    visitTime: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  });
  const id = response.body?.visitPlan?.id ?? "";
  push(response.status === 201 && Boolean(id), "member creates AMM-006b QA visit", `status=${response.status}`);
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
  await page.getByRole("tab", { name: "會議" }).click();
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

async function waitForMeetingWritebackPostResponse(page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/api/ai/meeting/sessions/") &&
      response.url().endsWith("/writebacks") &&
      response.request().method() === "POST",
    { timeout: 60000 },
  );
}

async function countMeetingWritebackEvents(sessionId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM interaction_events
     WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
       AND metadata->>'sessionId' = $1`,
    [sessionId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function getEventProof(clientId, sessionId) {
  const result = await db.query(
    `SELECT
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'target' = 'CRM_CANDIDATE'
          AND metadata->>'crmWritebackCandidate' = 'true'
      )::int AS crm_candidates,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'candidateKind' = 'INFERENCE'
          AND metadata->>'crmWritebackCandidate' = 'true'
      )::int AS inference_crm_facts,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'candidateKind' = 'ACTION_ITEM'
          AND metadata->>'target' = 'FOLLOW_UP_TASK'
      )::int AS action_tasks,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'candidateKind' = 'UNKNOWN'
          AND metadata->>'target' = 'FOLLOW_UP_TASK'
      )::int AS unknown_tasks,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'writesConfirmedCrmFact' != 'false'
      )::int AS confirmed_crm_fact_writes
     FROM interaction_events
     WHERE client_id = $1`,
    [clientId, sessionId],
  );

  const row = result.rows[0] ?? {};
  return {
    crmCandidates: Number(row.crm_candidates ?? 0),
    inferenceCrmFacts: Number(row.inference_crm_facts ?? 0),
    actionTasks: Number(row.action_tasks ?? 0),
    unknownTasks: Number(row.unknown_tasks ?? 0),
    confirmedCrmFactWrites: Number(row.confirmed_crm_fact_writes ?? 0),
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
