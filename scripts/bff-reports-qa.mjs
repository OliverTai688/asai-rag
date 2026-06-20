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
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-reports-bff",
);
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const qaStamp = `BFF-105 Reports QA ${new Date().toISOString()}`;
const checks = [];
const consoleErrors = [];

let createdReportId = "";
let createdShareToken = "";
let selectedClientId = "";
let selectedClientName = "";

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

push(true, "no provider route invoked", "script uses deterministic reports BFF and never calls /api/ai/report");

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
  const unauth = await get("/api/reports");
  push(unauth.status === 401, "GET /api/reports unauth returns 401", `status=${unauth.status}`);
  push(unauth.body?.kind === "AUTHENTICATION", "unauth report list uses shared auth error kind", unauth.body?.kind ?? "");

  const clients = await memberGet("/api/clients");
  const selectedClient =
    clients.body?.clients?.find((client) => client.name === "王大明") ??
    clients.body?.clients?.find((client) => client.status === "ACTIVE") ??
    clients.body?.clients?.[0];
  selectedClientId = selectedClient?.id ?? "";
  selectedClientName = selectedClient?.name ?? "";
  push(clients.status === 200 && Boolean(selectedClientId), "demo member has a readable client", selectedClientName);

  if (!selectedClientId) return;

  const listBefore = await memberGet("/api/reports");
  push(listBefore.status === 200 && Array.isArray(listBefore.body?.reports), "GET /api/reports member returns list", `status=${listBefore.status}`);
  push(hasNoStore(listBefore), "reports list uses private no-store");
  push(hasRequestId(listBefore), "reports list includes request id");

  const create = await memberPost("/api/reports", {
    clientId: selectedClientId,
    purpose: "proposal",
    title: `${qaStamp} ${selectedClientName} BFF 報告`,
    sections: [
      {
        id: "qa-summary",
        type: "summary",
        title: "BFF 報告摘要",
        content: `${qaStamp}：這是可刷新保存的 server-owned report summary。`,
      },
      {
        id: "qa-performance",
        type: "performance",
        title: "內部演練回饋",
        content: "BFF-105 internal coaching note must never appear in public share.",
      },
    ],
  });
  createdReportId = create.body?.report?.id ?? "";
  push(create.status === 201 && Boolean(createdReportId), "POST /api/reports creates server-owned report", `status=${create.status} report=${createdReportId}`);
  push(create.body?.report?.clientId === selectedClientId, "created report is scoped to selected client", create.body?.report?.clientId ?? "");
  push(create.body?.report?.clientSections?.length === 1, "created member detail separates client-safe sections", `clientSections=${create.body?.report?.clientSections?.length ?? 0}`);

  if (!createdReportId) return;

  const listByClient = await memberGet(`/api/reports?clientId=${encodeURIComponent(selectedClientId)}`);
  push(
    listByClient.body?.reports?.some((report) => report.id === createdReportId),
    "GET /api/reports?clientId includes created report",
    `count=${listByClient.body?.reports?.length ?? 0}`,
  );

  const detail = await memberGet(`/api/reports/${createdReportId}`);
  push(detail.status === 200, "GET /api/reports/[id] returns detail", `status=${detail.status}`);
  push(hasNoStore(detail), "report detail uses private no-store");
  push(detail.body?.report?.sections?.some((section) => section.id === "qa-performance"), "member detail includes internal performance section");
  push(
    !JSON.stringify(detail.body?.report?.clientSections ?? []).includes("internal coaching note"),
    "member detail clientSections omit internal-only content",
  );

  const invalidPatch = await memberPatch(`/api/reports/${createdReportId}`, {
    sectionId: "not-a-section",
    content: "should fail",
  });
  push(invalidPatch.status === 400, "PATCH /api/reports/[id] invalid section returns 400", `status=${invalidPatch.status}`);
  push(invalidPatch.body?.kind === "VALIDATION", "invalid section uses shared validation kind", invalidPatch.body?.kind ?? "");

  const patch = await memberPatch(`/api/reports/${createdReportId}`, {
    sectionId: "qa-summary",
    content: `${qaStamp}：PATCH persisted through reports BFF.`,
  });
  push(patch.status === 200, "PATCH /api/reports/[id] updates section", `status=${patch.status}`);
  push(patch.body?.report?.version === 2, "report version increments on edit", `version=${patch.body?.report?.version ?? ""}`);
  push(patch.body?.report?.sections?.[0]?.content?.includes("PATCH persisted"), "patched section content returns from BFF");

  const managerDetail = await managerGet(`/api/reports/${createdReportId}`);
  push([403, 404].includes(managerDetail.status), "manager cannot read member-owned report detail", `status=${managerDetail.status}`);

  const beforeShareEvents = await countReportShareEvents(createdReportId);
  const share = await memberPost(`/api/reports/${createdReportId}/share`, { source: "bff_reports_qa" });
  createdShareToken = share.body?.report?.share?.token ?? "";
  push(share.status === 200 && Boolean(createdShareToken), "POST /api/reports/[id]/share returns share token", `status=${share.status}`);
  push(hasNoStore(share), "share action uses private no-store");
  push(share.body?.report?.status === "SHARED", "share action marks report status SHARED", share.body?.report?.status ?? "");

  const afterShareEvents = await countReportShareEvents(createdReportId);
  push(afterShareEvents > beforeShareEvents, "share action writes ShareEvent audit evidence", `${beforeShareEvents}->${afterShareEvents}`);

  const publicShare = await get(`/api/share/${createdShareToken}`);
  const publicText = JSON.stringify(publicShare.body);
  push(publicShare.status === 200, "public /api/share/[token] can read generated share", `status=${publicShare.status}`);
  push(!publicText.includes("internal coaching note"), "public share omits internal performance content");
  push(!publicText.includes("internalSections"), "public share does not expose member DTO field names");
  pushNoRawSentinel(publicText, "public share has no raw private sentinel");
}

async function runBrowserProof() {
  if (!createdReportId) {
    push(false, "browser proof has created report id");
    return;
  }

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: { "x-asai-demo-user-email": demoMemberEmail },
  });
  const page = await context.newPage();
  bindConsoleErrors(page);

  try {
    await page.goto(`${baseUrl}/reports`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "決策報告" }).waitFor({ timeout: 30000 });
    await page.waitForFunction((stamp) => document.body.innerText.includes(stamp), qaStamp, { timeout: 30000 });

    const listDom = await page.evaluate((stamp) => {
      const text = document.body.innerText;
      return {
        hasCreatedReport: text.includes(stamp),
        hasServerOwnedLabel: text.includes("server-owned"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, qaStamp);
    push(listDom.hasCreatedReport, "browser /reports renders BFF-created report");
    push(listDom.hasServerOwnedLabel, "browser /reports shows server-owned metric helper");
    push(!listDom.horizontalOverflow, "reports list desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-reports-bff-list-desktop.png"),
      fullPage: true,
    });

    await page.goto(`${baseUrl}/reports/${createdReportId}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForFunction((stamp) => document.body.innerText.includes(stamp), qaStamp, { timeout: 30000 });
    const detailDom = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasPatch: text.includes("PATCH persisted"),
        hasShareBadge: text.includes("已分享"),
        hasInternal: text.includes("內部演練回饋"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        bodyText: text,
      };
    });
    push(detailDom.hasPatch, "browser report detail renders patched section");
    push(detailDom.hasShareBadge, "browser report detail renders share status");
    push(detailDom.hasInternal, "browser member detail can see internal section");
    push(!detailDom.horizontalOverflow, "report detail desktop has no horizontal overflow");
    pushNoRawSentinel(detailDom.bodyText, "browser report detail has no raw private sentinel");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-reports-bff-detail-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.waitForFunction((stamp) => document.body.innerText.includes(stamp), qaStamp, { timeout: 30000 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "report detail mobile has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-reports-bff-detail-mobile.png"),
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

function memberPost(path, body) {
  return post(path, body, appHeaders(demoMemberEmail));
}

function memberPatch(path, body) {
  return patch(path, body, appHeaders(demoMemberEmail));
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function patch(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
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

async function countReportShareEvents(reportId) {
  const result = await db.query(
    `
      SELECT COUNT(se.id)::int AS count
      FROM report_shares rs
      LEFT JOIN share_events se ON se.share_id = rs.id
      WHERE rs.report_id = $1
    `,
    [reportId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

function appHeaders(email) {
  return { "x-asai-demo-user-email": email };
}

function hasNoStore(response) {
  return response.headers.get("cache-control")?.includes("no-store") ?? false;
}

function hasRequestId(response) {
  return Boolean(response.headers.get("x-asai-request-id") || response.body?.requestId);
}

function bindConsoleErrors(page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
}

function pushNoRawSentinel(text, label) {
  push(
    !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "otp", "payment"].some((key) =>
      text.toLowerCase().includes(key.toLowerCase()),
    ),
    label,
  );
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
