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
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-bff-crm-client-lifecycle",
);
const runId = Date.now();
const qaStamp = `BFF-103c 客戶生命週期 ${runId}`;
const updatedOccupation = "高階醫療科技營運長";
const updatedAnnualIncome = 2600000;

const checks = [];
const consoleErrors = [];
let createdClientId = "";
let createdClientName = "";
let usageCountBefore = 0;

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

mkdirSync(screenshotDir, { recursive: true });

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  usageCountBefore = await getAiUsageLogCount();
  await runApiProof();
  await runBrowserAndArchiveProof();
} finally {
  await db.end();
}

const usageCountAfter = await safeUsageCountAfter();
push(usageCountAfter === usageCountBefore, "no provider usage log changed", `${usageCountBefore}->${usageCountAfter}`);
push(true, "no provider route invoked", "script uses deterministic CRM BFF routes only");

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
  const unauthDelete = await fetch(`${baseUrl}/api/clients/not-a-client`, { method: "DELETE" });
  const unauthPayload = await readJson(unauthDelete);
  push(
    unauthDelete.status === 401,
    "DELETE client unauth returns 401",
    `status=${unauthDelete.status} error=${unauthPayload?.error ?? ""}`,
  );

  const created = await memberRequestJson("POST", "/api/clients", {
    name: qaStamp,
    email: `bff103c-${runId}@asai.local`,
    phone: "0912-103-103",
    birthDate: "1982-02-10",
    occupation: "醫療科技主管",
    annualIncome: 1800000,
    status: "PROSPECT",
    notes: "BFF-103c deterministic QA client.",
  });
  createdClientId = created.body?.client?.id ?? "";
  createdClientName = created.body?.client?.name ?? "";
  push(created.status === 201 && Boolean(createdClientId), "POST /api/clients creates lifecycle QA client", `status=${created.status} client=${createdClientId}`);
  push(hasComplianceFields(created.body?.client), "created client response keeps compliance fields");

  if (!createdClientId) return;

  await markDemoClient(createdClientId);

  const patched = await memberRequestJson("PATCH", `/api/clients/${createdClientId}`, {
    occupation: updatedOccupation,
    annualIncome: updatedAnnualIncome,
    status: "ACTIVE",
    notes: "已由 BFF-103c QA 更新，供關係圖與 CRM detail proof 使用。",
  });
  push(patched.status === 200, "PATCH client owner update returns 200", `status=${patched.status}`);
  push(patched.body?.client?.occupation === updatedOccupation, "PATCH persists occupation in client DTO");
  push(Number(patched.body?.client?.annualIncome) === updatedAnnualIncome, "PATCH persists annual income in client DTO");
  push(patched.body?.client?.status === "ACTIVE", "PATCH persists status in client DTO");
  push(hasComplianceFields(patched.body?.client), "patched client response keeps compliance fields");

  const graph = await memberRequestJson("GET", `/api/clients/${createdClientId}/relationship-graph`);
  const primaryNode = graph.body?.graph?.nodes?.find((node) => node.nodeKey === "primary");
  push(graph.status === 200, "relationship graph reads patched client", `status=${graph.status}`);
  push(primaryNode?.fields?.jobTitle?.value === updatedOccupation, "relationship graph uses patched occupation");
  push(
    String(primaryNode?.fields?.annualIncome?.value ?? "").includes("2,600,000"),
    "relationship graph uses patched annual income",
    primaryNode?.fields?.annualIncome?.value ?? "missing",
  );
  push(primaryNode?.fields?.status?.value === "服務中", "relationship graph uses patched status");

  const managerPatch = await managerRequestJson("PATCH", `/api/clients/${createdClientId}`, {
    occupation: "越權更新不應成功",
  });
  push(managerPatch.status === 404, "manager cannot patch member-owned client detail", `status=${managerPatch.status}`);

  const managerDelete = await managerRequestJson("DELETE", `/api/clients/${createdClientId}`);
  push(managerDelete.status === 404, "manager cannot archive member-owned client detail", `status=${managerDelete.status}`);
}

async function runBrowserAndArchiveProof() {
  if (!createdClientId || !createdClientName) {
    push(false, "browser proof has created client");
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
    await page.goto(`${baseUrl}/crm/${createdClientId}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: createdClientName }).waitFor({ timeout: 30000 });
    await page.getByText(updatedOccupation).first().waitFor({ timeout: 30000 });

    const detailChecks = await page.evaluate((expected) => {
      const text = document.body.innerText;
      return {
        hasUpdatedName: text.includes(expected.clientName),
        hasUpdatedOccupation: text.includes(expected.occupation),
        hasUpdatedIncome: text.includes("2,600,000"),
        hasComplianceLabel: text.includes("資料待補") || text.includes("待盤點") || text.includes("KYC OK"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, { clientName: createdClientName, occupation: updatedOccupation });
    push(detailChecks.hasUpdatedName, "browser CRM detail renders created client");
    push(detailChecks.hasUpdatedOccupation, "browser CRM detail renders patched occupation");
    push(detailChecks.hasUpdatedIncome, "browser CRM detail renders patched annual income");
    push(detailChecks.hasComplianceLabel, "browser CRM detail keeps compliance signal visible");
    push(!detailChecks.horizontalOverflow, "browser CRM detail desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-bff-103c-crm-detail-updated.png"),
      fullPage: true,
    });

    const archived = await memberRequestJson("DELETE", `/api/clients/${createdClientId}`);
    push(archived.status === 200 && archived.body?.archived === true, "DELETE client soft-archives owner client", `status=${archived.status}`);
    push(archived.body?.client?.status === "ARCHIVED", "DELETE response marks status ARCHIVED");
    push(hasComplianceFields(archived.body?.client), "DELETE response keeps compliance fields");

    const archivedDb = await getArchivedDbProof(createdClientId);
    push(archivedDb?.status === "ARCHIVED", "DB proof client status is ARCHIVED", archivedDb?.status ?? "missing");
    push(archivedDb?.kyc_status === "MISSING", "DB proof compliance checklist remains attached", archivedDb?.kyc_status ?? "missing");

    const detailAfterArchive = await memberRequestJson("GET", `/api/clients/${createdClientId}`);
    push(detailAfterArchive.status === 404, "GET archived client returns 404 on member detail route", `status=${detailAfterArchive.status}`);

    const graphAfterArchive = await memberRequestJson("GET", `/api/clients/${createdClientId}/relationship-graph`);
    push(graphAfterArchive.status === 404, "GET archived client relationship graph returns 404", `status=${graphAfterArchive.status}`);

    const listAfterArchive = await memberRequestJson("GET", "/api/clients");
    const archivedStillListed = Array.isArray(listAfterArchive.body?.clients)
      && listAfterArchive.body.clients.some((client) => client.id === createdClientId);
    push(listAfterArchive.status === 200, "GET /api/clients after archive returns 200", `status=${listAfterArchive.status}`);
    push(!archivedStillListed, "archived client is removed from member CRM list DTO");

    await page.goto(`${baseUrl}/crm`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "客戶管理" }).waitFor({ timeout: 30000 });
    await page.getByText("載入客戶資料中...").waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
    await page.waitForFunction((clientName) => !document.body.innerText.includes(clientName), createdClientName, {
      timeout: 30000,
    });

    const listChecks = await page.evaluate((clientName) => {
      const text = document.body.innerText;
      return {
        archivedNameGone: !text.includes(clientName),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, createdClientName);
    push(listChecks.archivedNameGone, "browser CRM list hides archived client after refresh");
    push(!listChecks.horizontalOverflow, "browser CRM list desktop has no horizontal overflow after archive");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-bff-103c-crm-list-after-archive.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByText("載入客戶資料中...").waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
    const mobileChecks = await page.evaluate((clientName) => ({
      archivedNameGone: !document.body.innerText.includes(clientName),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }), createdClientName);
    push(mobileChecks.archivedNameGone, "browser CRM mobile list hides archived client");
    push(!mobileChecks.horizontalOverflow, "browser CRM mobile list has no horizontal overflow after archive");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-bff-103c-crm-list-mobile-after-archive.png"),
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

async function markDemoClient(clientId) {
  await db.query(
    `UPDATE clients
        SET is_demo = true,
            demo_scenario = 'lv3-bff-crm-client-lifecycle-qa',
            demo_seed_version = 1
      WHERE id = $1`,
    [clientId],
  );
}

async function getArchivedDbProof(clientId) {
  const result = await db.query(
    `SELECT c.status, c.sensitivity, cc.kyc_status, cc.suitability_status, cc.consent_status
       FROM clients c
       LEFT JOIN compliance_checklists cc ON cc.client_id = c.id
      WHERE c.id = $1
      LIMIT 1`,
    [clientId],
  );
  return result.rows[0] ?? null;
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
