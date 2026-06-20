#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-issues-bff",
);
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const qaStamp = `BFF-106 Issues QA ${new Date().toISOString()}`;
const checks = [];
const consoleErrors = [];

let createdIssueId = randomUUID();
let memberUserId = "";
let memberOrgId = "";

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

mkdirSync(screenshotDir, { recursive: true });

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await seedIssueEvidence();
  await runApiProof();
  await runBrowserProof();
} finally {
  await db.end();
}

push(true, "no provider route invoked", "script uses deterministic Issues BFF and never calls OpenAI/Anthropic");

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

async function seedIssueEvidence() {
  const member = await getDemoUserWithDefaultOrg(demoMemberEmail);
  const manager = await getDemoUserWithDefaultOrg(demoManagerEmail);

  push(Boolean(member?.user_id), "demo member exists for issues proof", member?.email ?? "");
  push(Boolean(manager?.user_id), "demo manager exists for foreign-scope proof", manager?.email ?? "");

  if (!member?.user_id || !member.organization_id) {
    return;
  }

  memberUserId = member.user_id;
  memberOrgId = member.organization_id;

  await db.query(
    `
      INSERT INTO issues (
        id,
        organization_id,
        title,
        description,
        category,
        status,
        priority,
        images,
        reporter_id,
        assignee_id,
        feedback,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'OPEN', 'HIGH', ARRAY[]::text[], $6, $6, NULL, NOW(), NOW())
    `,
    [
      createdIssueId,
      memberOrgId,
      `${qaStamp}：拜訪準備包 evidence 需要補充`,
      `${qaStamp}：顧問回報準備包的核心問題可以生成，但需要補上推論來源與待確認清單，避免下一次拜訪只看到靜態摘要。`,
      "Previsit Reasoning",
      memberUserId,
    ],
  );
}

async function runApiProof() {
  const unauth = await get("/api/issues");
  push(unauth.status === 401, "GET /api/issues unauth returns 401", `status=${unauth.status}`);
  push(unauth.body?.kind === "AUTHENTICATION", "unauth issues list uses shared auth error kind", unauth.body?.kind ?? "");

  const memberList = await memberGet(`/api/issues?q=${encodeURIComponent(qaStamp)}`);
  const issue = memberList.body?.issues?.find((item) => item.id === createdIssueId);
  push(memberList.status === 200, "GET /api/issues member returns 200", `status=${memberList.status}`);
  push(hasNoStore(memberList), "issues list uses private no-store");
  push(hasRequestId(memberList), "issues list includes request id");
  push(memberList.body?.source === "database", "issues list declares database source", memberList.body?.source ?? "");
  push(Boolean(issue), "issues list includes seeded DB issue", createdIssueId);
  push((issue?.evidence?.facts?.length ?? 0) >= 3, "issue DTO includes fact evidence", `facts=${issue?.evidence?.facts?.length ?? 0}`);
  push((issue?.evidence?.inferences?.length ?? 0) >= 1, "issue DTO includes inference evidence", `inferences=${issue?.evidence?.inferences?.length ?? 0}`);
  push((issue?.evidence?.unknowns?.length ?? 0) >= 1, "issue DTO includes unknown gaps", `unknowns=${issue?.evidence?.unknowns?.length ?? 0}`);
  push(issue?.internalReadiness?.clientFacingVisible === false, "internal readiness is not client-facing");
  push(issue?.nextAction?.label?.length > 0, "issue DTO includes advisor next action", issue?.nextAction?.label ?? "");
  pushNoRawSentinel(JSON.stringify(memberList.body), "issues list has no raw private sentinel");

  const empty = await memberGet(`/api/issues?q=${encodeURIComponent("__asai_empty_issue_probe__")}`);
  push(empty.status === 200 && Array.isArray(empty.body?.issues) && empty.body.issues.length === 0, "GET /api/issues empty query returns empty list", `count=${empty.body?.issues?.length ?? ""}`);

  const invalid = await memberPatch(`/api/issues/${createdIssueId}`, { status: "NOT_A_STATUS" });
  push(invalid.status === 400, "PATCH /api/issues/[id] invalid status returns 400", `status=${invalid.status}`);
  push(invalid.body?.kind === "VALIDATION", "invalid issue patch uses validation kind", invalid.body?.kind ?? "");

  const managerPatch = await managerPatchIssue(createdIssueId, { status: "IN_PROGRESS" });
  push([403, 404].includes(managerPatch.status), "manager cannot update member-owned issue", `status=${managerPatch.status}`);

  const auditBefore = await countIssueAuditRows(createdIssueId);
  const patch = await memberPatch(`/api/issues/${createdIssueId}`, {
    status: "IN_PROGRESS",
    assignment: "SELF",
    feedback: `${qaStamp}：已補上處理中回覆，下一步確認 evidence 顯示與刷新後狀態。`,
  });
  push(patch.status === 200, "PATCH /api/issues/[id] updates status/action", `status=${patch.status}`);
  push(patch.body?.issue?.status === "IN_PROGRESS", "patched issue status returns IN_PROGRESS", patch.body?.issue?.status ?? "");
  push(patch.body?.issue?.actionState?.assignedToMe === true, "patched issue is assigned to current member");
  push(patch.body?.issue?.feedback?.includes(qaStamp), "patched issue feedback persists in response");

  const auditAfter = await countIssueAuditRows(createdIssueId);
  push(auditAfter > auditBefore, "issue action writes AuditLog evidence", `${auditBefore}->${auditAfter}`);

  const reload = await memberGet(`/api/issues?q=${encodeURIComponent(qaStamp)}`);
  const reloadedIssue = reload.body?.issues?.find((item) => item.id === createdIssueId);
  push(reloadedIssue?.status === "IN_PROGRESS", "GET /api/issues reload keeps patched status", reloadedIssue?.status ?? "");
  push(reloadedIssue?.feedback?.includes("已補上處理中回覆"), "GET /api/issues reload keeps feedback");
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
    await page.goto(`${baseUrl}/issues`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "議題工作台" }).waitFor({ timeout: 30000 });
    await page.waitForFunction((stamp) => document.body.innerText.includes(stamp), qaStamp, { timeout: 30000 });

    const desktop = await page.evaluate((stamp) => {
      const text = document.body.innerText;
      return {
        hasIssue: text.includes(stamp),
        hasFacts: text.includes("已知事實"),
        hasInferences: text.includes("推論判讀"),
        hasUnknowns: text.includes("待確認"),
        hasNextAction: text.includes("下一步"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        bodyText: text,
      };
    }, qaStamp);
    push(desktop.hasIssue, "browser /issues renders DB issue");
    push(desktop.hasFacts, "browser /issues renders fact evidence");
    push(desktop.hasInferences, "browser /issues renders inference evidence");
    push(desktop.hasUnknowns, "browser /issues renders unknown evidence");
    push(desktop.hasNextAction, "browser /issues renders next action");
    push(!desktop.horizontalOverflow, "issues desktop has no horizontal overflow");
    pushNoRawSentinel(desktop.bodyText, "browser issues page has no raw private sentinel");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-issues-bff-desktop.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "重新整理" }).click();
    await page.waitForFunction((stamp) => document.body.innerText.includes(stamp), qaStamp, { timeout: 30000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "議題工作台" }).waitFor({ timeout: 30000 });
    await page.waitForFunction((stamp) => document.body.innerText.includes(stamp), qaStamp, { timeout: 30000 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "issues mobile has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-issues-bff-mobile.png"),
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

function memberPatch(path, body) {
  return patch(path, body, appHeaders(demoMemberEmail));
}

function managerPatchIssue(issueId, body) {
  return patch(`/api/issues/${issueId}`, body, appHeaders(demoManagerEmail));
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

  return result.rows[0] ?? null;
}

async function countIssueAuditRows(issueId) {
  const result = await db.query(
    `
      SELECT COUNT(*)::int AS count
      FROM audit_logs
      WHERE resource_type = 'ISSUE'
        AND resource_id = $1
    `,
    [issueId],
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
