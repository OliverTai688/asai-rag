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
const dbUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DIRECT_URL ??
  process.env.POSTGRES_URL_NON_POOLING;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-bff-crm-related-lists",
);
const runId = Date.now();
const qaStamp = `BFF-103d related-list ${runId}`;
const qaEmail = `bff103d-${runId}@asai.local`;
const qaPhone = "0912-103-104";
const qaPolicyProvider = "ASAI QA Life";
const qaReportSectionTitle = "BFF-103d 報告摘要";
const qaReportPrivateBody = `${qaStamp} private body must not appear in related-list DTO.`;

const checks = [];
const consoleErrors = [];
let createdClientId = "";
let createdReportId = "";
let createdVisitPlanId = "";
let usageCountBefore = 0;

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

mkdirSync(screenshotDir, { recursive: true });

const db = new PgClient({ connectionString: dbUrl });
db.on("error", (error) => {
  console.warn(`WARN DB client emitted after proof phase: ${error.code ?? error.message}`);
});
await db.connect();

try {
  usageCountBefore = await getAiUsageLogCount();
  await runApiProof();
} finally {
  await db.end().catch(() => {});
}

await runBrowserProof();

const usageCountAfter = await safeUsageCountAfter();
push(usageCountAfter === usageCountBefore, "no provider usage log changed", `${usageCountBefore}->${usageCountAfter}`);
push(true, "no provider route invoked", "script uses deterministic CRM, visit, and report BFF routes only");

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

async function runApiProof() {
  const unauth = await fetch(`${baseUrl}/api/clients/not-a-client/related-lists`);
  const unauthPayload = await readJson(unauth);
  push(unauth.status === 401, "GET related-lists unauth returns 401", `status=${unauth.status} error=${unauthPayload?.error ?? ""}`);

  const created = await memberRequestJson("POST", "/api/clients", {
    name: `${qaStamp} 客戶`,
    email: qaEmail,
    phone: qaPhone,
    birthDate: "1984-04-12",
    occupation: "家族企業第二代負責人",
    annualIncome: 3200000,
    status: "ACTIVE",
    notes: "BFF-103d deterministic QA client.",
  });
  createdClientId = created.body?.client?.id ?? "";
  push(created.status === 201 && Boolean(createdClientId), "POST /api/clients creates related-list QA client", `status=${created.status} client=${createdClientId}`);
  push(hasComplianceFields(created.body?.client), "created client response keeps compliance fields");

  if (!createdClientId) return;

  await markDemoRecords();

  const family = await memberRequestJson("POST", `/api/clients/${createdClientId}/family-members`, {
    name: `${qaStamp} 女兒`,
    relation: "女",
    age: 12,
  });
  push(family.status === 201, "POST family member creates dependent evidence", `status=${family.status}`);

  const policy = await memberRequestJson("POST", `/api/clients/${createdClientId}/policies`, {
    type: "壽險",
    provider: qaPolicyProvider,
    amount: 8000000,
  });
  push(policy.status === 201, "POST policy creates related-list policy source", `status=${policy.status}`);

  const visit = await memberRequestJson("POST", "/api/visits", {
    clientId: createdClientId,
    purpose: "CARE",
    visitTime: new Date(Date.now() + 86_400_000).toISOString(),
  });
  createdVisitPlanId = visit.body?.visitPlan?.id ?? "";
  push(visit.status === 201 && Boolean(createdVisitPlanId), "POST visit creates timeline source", `status=${visit.status} visit=${createdVisitPlanId}`);

  const report = await memberRequestJson("POST", "/api/reports", {
    clientId: createdClientId,
    purpose: "proposal",
    title: `${qaStamp} 報告`,
    sections: [
      {
        id: "bff-103d-summary",
        type: "summary",
        title: qaReportSectionTitle,
        content: qaReportPrivateBody,
      },
    ],
  });
  createdReportId = report.body?.report?.id ?? "";
  push(report.status === 201 && Boolean(createdReportId), "POST report creates report summary source", `status=${report.status} report=${createdReportId}`);

  await markDemoRecords();

  const related = await memberRequestJson("GET", `/api/clients/${createdClientId}/related-lists`);
  const serialized = JSON.stringify(related.body);
  push(related.status === 200, "GET related-lists member returns 200", `status=${related.status}`);
  push(hasComplianceFields(related.body?.client), "related-lists DTO keeps compliance fields");
  push(related.body?.client?.sensitivityLevel === "NORMAL", "related-lists DTO keeps sensitivity level");
  push(related.body?.lists?.policies?.items?.some((item) => item.provider === qaPolicyProvider), "policy related-list includes created policy source");
  push(related.body?.lists?.policies?.summary?.totalInsuredAmount >= 8000000, "policy summary totals insured amount");
  push(related.body?.lists?.reports?.items?.some((item) => item.id === createdReportId), "report related-list includes created report summary");
  push(!serialized.includes(qaReportPrivateBody), "report related-list omits report body content");
  push(!serialized.includes("internalSections") && !serialized.includes("clientSections"), "related-list DTO omits report section field names");
  push(related.body?.lists?.timeline?.items?.some((item) => item.type === "POLICY"), "timeline includes policy event");
  push(related.body?.lists?.timeline?.items?.some((item) => item.type === "VISIT"), "timeline includes visit event");
  push(related.body?.lists?.timeline?.items?.some((item) => item.type === "REPORT"), "timeline includes report event");
  push((related.body?.lists?.gapAnalysis?.items?.length ?? 0) >= 4, "gap-analysis returns deterministic categories");
  push(
    related.body?.lists?.gapAnalysis?.items?.some((item) =>
      item.evidence?.some((evidence) => ["FACT", "INFERENCE", "UNKNOWN"].includes(evidence.factStatus)),
    ),
    "gap-analysis keeps fact/inference/unknown evidence",
  );
  push(related.body?.sourceSummary?.provider === "none", "related-lists declares no provider usage");
  push(
    !serialized.includes(qaEmail) && !serialized.includes(qaPhone) && !serialized.includes("policyNumber"),
    "related-list DTO omits email, phone, and policy number",
  );

  const manager = await managerRequestJson("GET", `/api/clients/${createdClientId}/related-lists`);
  push(manager.status === 403, "manager cannot read member-owned related-list detail", `status=${manager.status}`);
}

async function runBrowserProof() {
  if (!createdClientId || !createdReportId) {
    push(false, "browser proof has created client/report");
    return;
  }

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoMemberEmail,
    },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/crm/${createdClientId}/policies`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByRole("heading", { name: "現有保障" }).waitFor({ timeout: 30000 });
    await page.getByText(qaPolicyProvider).waitFor({ timeout: 30000 });
    const policyChecks = await page.evaluate((provider) => {
      const text = document.body.innerText;
      return {
        hasProvider: text.includes(provider),
        hasConfirmedTotal: text.includes("8,000,000"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, qaPolicyProvider);
    push(policyChecks.hasProvider, "browser policies page renders related-list policy provider");
    push(policyChecks.hasConfirmedTotal, "browser policies page renders related-list amount");
    push(!policyChecks.horizontalOverflow, "browser policies page desktop has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-bff-103d-policies-desktop.png"),
      fullPage: true,
    });

    await page.goto(`${baseUrl}/crm/${createdClientId}/timeline`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByRole("heading", { name: "活動時間軸" }).waitFor({ timeout: 30000 });
    await page.getByText(/保單盤點/).first().waitFor({ timeout: 30000 });
    const timelineChecks = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasPolicy: text.includes("保單盤點"),
        hasVisit: text.includes("拜訪"),
        hasReport: text.includes("報告更新"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    push(timelineChecks.hasPolicy, "browser timeline page renders policy source event");
    push(timelineChecks.hasVisit, "browser timeline page renders visit source event");
    push(timelineChecks.hasReport, "browser timeline page renders report source event");
    push(!timelineChecks.horizontalOverflow, "browser timeline page desktop has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-bff-103d-timeline-desktop.png"),
      fullPage: true,
    });

    await page.goto(`${baseUrl}/crm/${createdClientId}/gap-analysis`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByRole("heading", { name: "保障缺口分析" }).waitFor({ timeout: 30000 });
    await page.getByText("身故保障", { exact: true }).first().waitFor({ timeout: 30000 });
    const gapChecks = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasCategory: text.includes("身故保障"),
        hasEvidenceBadge: text.includes("事實") || text.includes("未知") || text.includes("推論"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    push(gapChecks.hasCategory, "browser gap-analysis page renders deterministic categories");
    push(gapChecks.hasEvidenceBadge, "browser gap-analysis page renders provenance badges");
    push(!gapChecks.horizontalOverflow, "browser gap-analysis page desktop has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-bff-103d-gap-analysis-desktop.png"),
      fullPage: true,
    });

    await page.goto(`${baseUrl}/crm/${createdClientId}/reports`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByRole("heading", { name: "報告歷史" }).waitFor({ timeout: 30000 });
    await page.getByText(qaReportSectionTitle).first().waitFor({ timeout: 30000 });
    const reportChecks = await page.evaluate((sectionTitle) => {
      const text = document.body.innerText;
      return {
        hasReport: text.includes(sectionTitle),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, qaReportSectionTitle);
    push(reportChecks.hasReport, "browser reports page renders server-owned report row");
    push(!reportChecks.horizontalOverflow, "browser reports page desktop has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-bff-103d-reports-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/crm/${createdClientId}/gap-analysis`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByRole("heading", { name: "保障缺口分析" }).waitFor({ timeout: 30000 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "browser gap-analysis page mobile has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-bff-103d-gap-analysis-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

function hasComplianceFields(client) {
  return Boolean(
    client
      && client.complianceChecklist
      && client.sensitivityLevel
      && client.kycStatus,
  );
}

async function markDemoRecords() {
  if (!createdClientId) return;

  await db.query(
    `UPDATE clients
        SET is_demo = true,
            demo_scenario = 'lv3-bff-crm-related-lists-qa',
            demo_seed_version = 1
      WHERE id = $1`,
    [createdClientId],
  );

  await db.query(
    `UPDATE reports
        SET is_demo = true,
            demo_scenario = 'lv3-bff-crm-related-lists-qa',
            demo_seed_version = 1
      WHERE client_id = $1`,
    [createdClientId],
  );

  await db.query(
    `UPDATE visit_plans
        SET is_demo = true,
            demo_scenario = 'lv3-bff-crm-related-lists-qa',
            demo_seed_version = 1
      WHERE client_id = $1`,
    [createdClientId],
  );
}

async function getAiUsageLogCount() {
  const result = await db.query(`SELECT COUNT(*)::int AS count FROM ai_usage_logs`);
  return result.rows[0]?.count ?? 0;
}

async function safeUsageCountAfter() {
  const checkDb = new PgClient({ connectionString: dbUrl });
  try {
    await checkDb.connect();
    const result = await checkDb.query(`SELECT COUNT(*)::int AS count FROM ai_usage_logs`);
    return result.rows[0]?.count ?? -1;
  } finally {
    await checkDb.end().catch(() => {});
  }
}

async function memberRequestJson(method, path, body) {
  return requestJson(method, path, demoMemberEmail, body);
}

async function managerRequestJson(method, path, body) {
  return requestJson(method, path, demoManagerEmail, body);
}

async function requestJson(method, path, email, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": email,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
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
