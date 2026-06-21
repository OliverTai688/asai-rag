#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { Client as PgClient } from "pg";

const root = process.cwd();
const require = createRequire(`${root}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

loadEnvFile(".env.local");
loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://127.0.0.1:3042";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const screenshotDir = path.resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-client-portal-bff",
);
const qaStamp = `BFF-303 Client Portal QA ${new Date().toISOString()}`;
const spawned = [];
const checks = [];
const consoleErrors = [];

let createdReportId = "";
let createdClientId = "";
let createdClientName = "";
let initialShareToken = "";
let rotatedShareToken = "";
let expiredShareToken = "";

mkdirSync(screenshotDir, { recursive: true });

function pass(name, detail = "") {
  checks.push({ ok: true, name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

function loadEnvFile(fileName) {
  const envPath = path.join(root, fileName);
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function readSource(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function assertFileContains(filePath, fragments) {
  const source = readSource(filePath);
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  if (missing.length > 0) {
    fail(filePath, `missing ${missing.join(", ")}`);
    throw new Error(`${filePath} missing BFF-303 fragments`);
  }
  pass(filePath, `verified ${fragments.length} BFF-303 fragments`);
}

function verifyStaticBoundaries() {
  assertFileContains("src/lib/report/report-repository.ts", [
    'action: z.enum(["ensure", "rotate", "revoke"])',
    "expiresInDays",
    "rotate_revoke_previous_share_link",
    "revoke_share_link",
    "ReportStatus.READY",
    "ReportStatus.SHARED",
  ]);

  assertFileContains("src/lib/share/share-repository.ts", [
    "getSharedReportByToken",
    "recordShareEvent",
    "isExpired",
    "sanitizeShareEventPayload",
    "clientSections",
  ]);

  assertFileContains("src/lib/auth/session.ts", [
    "CLIENT_PORTAL_TOKEN_HEADER",
    "CLIENT_PORTAL_TOKEN_COOKIE",
    "getClientSession",
    "expiresAt",
  ]);

  assertFileContains("src/app/api/client-portal/responses/route.ts", [
    "allowedTypes",
    "SUPPLEMENT",
    "QUESTION",
    "BOOKING_INTENT",
    "sanitizeClientPortalResponseMetadata",
  ]);
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDevServer() {
  if (await fetchOk(baseUrl)) {
    pass("dev-server", `reachable at ${baseUrl}`);
    return;
  }

  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3000";
  console.log(`Starting dev server for BFF-303 QA at ${baseUrl}`);

  const child = spawn("pnpm", ["dev", "--hostname", host, "--port", port], {
    cwd: root,
    env: {
      ...process.env,
      ALLOW_DEV_AUTH_HEADER: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  spawned.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let i = 0; i < 90; i += 1) {
    if (await fetchOk(baseUrl)) {
      pass("dev-server", `started at ${baseUrl}`);
      return;
    }
    await wait(1_000);
  }

  throw new Error(`Dev server did not become reachable at ${baseUrl}`);
}

function resolveDatabaseUrl() {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? null;
}

async function connectDb() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL for BFF-303 DB proof.");
  }

  const db = new PgClient({ connectionString: databaseUrl });
  await db.connect();
  return db;
}

async function get(pathname, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers, redirect: "manual" });
  return parseResponse(response);
}

async function memberGet(pathname) {
  return get(pathname, { "x-asai-demo-user-email": demoMemberEmail });
}

async function post(pathname, body, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  return parseResponse(response);
}

async function memberPost(pathname, body) {
  return post(pathname, body, { "x-asai-demo-user-email": demoMemberEmail });
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body, headers: response.headers, text };
}

function serialize(value) {
  return JSON.stringify(value ?? {});
}

function assertNoClientPrivateLeak(label, text) {
  const forbidden = [
    "internalSections",
    "內部演練回饋",
    "performance",
    "policy_number",
    "insured_amount",
    "annualIncome",
    "phone",
    "email",
    "actorUserId",
    "ownerId",
    "rawPayload",
    "providerPayload",
    "authorization",
    "cookie",
    "secret",
    "otp",
    "payment",
  ];
  const leaked = forbidden.filter((value) => text.includes(value));
  if (leaked.length === 0) pass(label, `${forbidden.length} sentinels checked`);
  else fail(label, `leaked ${leaked.join(", ")}`);
}

async function runApiProof(db) {
  const unauthBootstrap = await get("/api/client-portal/bootstrap");
  if (unauthBootstrap.status === 401) pass("bootstrap-missing-session", "401");
  else fail("bootstrap-missing-session", `status=${unauthBootstrap.status}`);

  const clients = await memberGet("/api/clients");
  const selectedClient =
    clients.body?.clients?.find((client) => client.name === "王大明") ??
    clients.body?.clients?.find((client) => client.status === "ACTIVE") ??
    clients.body?.clients?.[0];
  createdClientId = selectedClient?.id ?? "";
  createdClientName = selectedClient?.name ?? "";
  if (clients.status === 200 && createdClientId) pass("member-client-selected", createdClientName);
  else fail("member-client-selected", `status=${clients.status}`);

  const createReport = await memberPost("/api/reports", {
    clientId: createdClientId,
    purpose: "proposal",
    title: `${qaStamp} ${createdClientName} 客戶入口測試報告`,
    sections: [
      {
        id: "bff303-summary",
        type: "summary",
        title: "客戶版摘要",
        content: `${qaStamp}：這是 BFF-303 token lifecycle 測試報告。`,
      },
      {
        id: "bff303-internal",
        type: "performance",
        title: "內部演練回饋",
        content: "BFF-303 internal-only content must never appear in client portal or public share.",
      },
    ],
  });
  createdReportId = createReport.body?.report?.id ?? "";
  if (createReport.status === 201 && createdReportId) pass("member-report-created", createdReportId);
  else fail("member-report-created", `status=${createReport.status}`);

  const share = await memberPost(`/api/reports/${createdReportId}/share`, {
    action: "ensure",
    source: "bff_client_portal_qa",
    expiresInDays: 30,
  });
  initialShareToken = share.body?.report?.share?.token ?? "";
  if (share.status === 200 && initialShareToken) pass("member-share-created", redact(initialShareToken));
  else fail("member-share-created", `status=${share.status}`);

  expiredShareToken = await createExpiredShare(db, initialShareToken, createdReportId);
  pass("expired-share-created", redact(expiredShareToken));

  const publicShare = await get(`/api/share/${initialShareToken}`);
  if (publicShare.status === 200) pass("public-share-authorized", "200");
  else fail("public-share-authorized", `status=${publicShare.status}`);
  assertNoClientPrivateLeak("public-share-private-leak", serialize(publicShare.body));

  const bootstrap = await get("/api/client-portal/bootstrap", { "x-asai-client-token": initialShareToken });
  if (bootstrap.status === 200) pass("client-bootstrap-authorized", "200");
  else fail("client-bootstrap-authorized", `status=${bootstrap.status}`);
  if (bootstrap.body?.session?.type === "client") pass("client-bootstrap-session-type", "client");
  else fail("client-bootstrap-session-type", bootstrap.body?.session?.type ?? "missing");
  if ((bootstrap.body?.report?.sections?.length ?? 0) > 0) pass("client-bootstrap-client-sections", `${bootstrap.body.report.sections.length} sections`);
  else fail("client-bootstrap-client-sections", "missing");
  assertNoClientPrivateLeak("client-bootstrap-private-leak", serialize(bootstrap.body));

  await assertClientTokenCannotEnterInternalApis(initialShareToken);

  const beforeResponses = await countUnsafePortalResponses(db, createdReportId);
  const response = await post(
    "/api/client-portal/responses",
    {
      type: "BOOKING_INTENT",
      message: "我想預約下週確認保障缺口。",
      payload: {
        preferredTime: "next week",
        contactMethod: "phone",
        topic: "coverage gap",
        unsafeRawPrivatePayload: "must-not-persist",
        secret: "must-not-persist",
      },
    },
    { "x-asai-client-token": initialShareToken },
  );
  if (response.status === 201 && response.body?.response?.id) pass("client-response-created", response.body.response.id);
  else fail("client-response-created", `status=${response.status}`);

  const invalidResponse = await post(
    "/api/client-portal/responses",
    { type: "UNSAFE", message: "bad" },
    { "x-asai-client-token": initialShareToken },
  );
  if (invalidResponse.status === 400) pass("client-response-type-whitelist", "400");
  else fail("client-response-type-whitelist", `status=${invalidResponse.status}`);

  const afterResponses = await countUnsafePortalResponses(db, createdReportId);
  if (afterResponses.responseEvents > beforeResponses.responseEvents) {
    pass("client-response-event-count", `${beforeResponses.responseEvents}->${afterResponses.responseEvents}`);
  } else {
    fail("client-response-event-count", `${beforeResponses.responseEvents}->${afterResponses.responseEvents}`);
  }
  if (afterResponses.unsafeEvents === 0) pass("client-response-payload-whitelist", "unsafe keys not persisted");
  else fail("client-response-payload-whitelist", `unsafe=${afterResponses.unsafeEvents}`);

  const invalidShare = await get("/api/share/not-a-real-share-token");
  if (invalidShare.status === 404) pass("invalid-share-token", "404");
  else fail("invalid-share-token", `status=${invalidShare.status}`);

  const expiredShare = await get(`/api/share/${expiredShareToken}`);
  if (expiredShare.status === 404) pass("expired-share-token", "404");
  else fail("expired-share-token", `status=${expiredShare.status}`);
  const expiredSession = await post("/api/client-portal/session", { token: expiredShareToken });
  if (expiredSession.status === 404) pass("expired-client-session-token", "404");
  else fail("expired-client-session-token", `status=${expiredSession.status}`);

  const rotate = await memberPost(`/api/reports/${createdReportId}/share`, {
    action: "rotate",
    source: "bff_client_portal_qa_rotate",
    expiresInDays: 30,
  });
  rotatedShareToken = rotate.body?.report?.share?.token ?? "";
  if (rotate.status === 200 && rotatedShareToken && rotatedShareToken !== initialShareToken) {
    pass("share-token-rotated", `${redact(initialShareToken)} -> ${redact(rotatedShareToken)}`);
  } else {
    fail("share-token-rotated", `status=${rotate.status}, token=${redact(rotatedShareToken || "missing")}`);
  }

  const oldAfterRotate = await get(`/api/share/${initialShareToken}`);
  if (oldAfterRotate.status === 404) pass("rotated-old-share-invalid", "404");
  else fail("rotated-old-share-invalid", `status=${oldAfterRotate.status}`);
  const oldSessionAfterRotate = await post("/api/client-portal/session", { token: initialShareToken });
  if (oldSessionAfterRotate.status === 404) pass("rotated-old-session-invalid", "404");
  else fail("rotated-old-session-invalid", `status=${oldSessionAfterRotate.status}`);

  const newAfterRotate = await get(`/api/share/${rotatedShareToken}`);
  if (newAfterRotate.status === 200) pass("rotated-new-share-authorized", "200");
  else fail("rotated-new-share-authorized", `status=${newAfterRotate.status}`);
  assertNoClientPrivateLeak("rotated-new-share-private-leak", serialize(newAfterRotate.body));

  await runBrowserAuthorizedProof(rotatedShareToken, expiredShareToken);

  const revoke = await memberPost(`/api/reports/${createdReportId}/share`, {
    action: "revoke",
    source: "bff_client_portal_qa_revoke",
  });
  if (revoke.status === 200 && revoke.body?.report?.status === "READY") pass("share-token-revoked", "report status READY");
  else fail("share-token-revoked", `status=${revoke.status}, report=${revoke.body?.report?.status ?? "missing"}`);

  const revokedShare = await get(`/api/share/${rotatedShareToken}`);
  if (revokedShare.status === 404) pass("revoked-share-invalid", "404");
  else fail("revoked-share-invalid", `status=${revokedShare.status}`);
  const revokedBootstrap = await get("/api/client-portal/bootstrap", { "x-asai-client-token": rotatedShareToken });
  if (revokedBootstrap.status === 401) pass("revoked-client-bootstrap-invalid", "401");
  else fail("revoked-client-bootstrap-invalid", `status=${revokedBootstrap.status}`);
  const revokedResponse = await post(
    "/api/client-portal/responses",
    { type: "QUESTION", message: "revoked token should fail" },
    { "x-asai-client-token": rotatedShareToken },
  );
  if (revokedResponse.status === 401) pass("revoked-client-response-invalid", "401");
  else fail("revoked-client-response-invalid", `status=${revokedResponse.status}`);

  await runBrowserRevokedProof(rotatedShareToken);

  const lifecycle = await getShareLifecycle(db, createdReportId);
  if (lifecycle.rotateEvents > 0) pass("share-rotate-event-audit", `rotateEvents=${lifecycle.rotateEvents}`);
  else fail("share-rotate-event-audit", "missing");
  if (lifecycle.revokeEvents > 0) pass("share-revoke-event-audit", `revokeEvents=${lifecycle.revokeEvents}`);
  else fail("share-revoke-event-audit", "missing");
  if (lifecycle.activeShares === 0) pass("share-revoke-no-active-shares", "0 active shares");
  else fail("share-revoke-no-active-shares", `active=${lifecycle.activeShares}`);

  console.log(
    JSON.stringify(
      {
        reportId: createdReportId,
        clientId: createdClientId,
        initialShareToken: redact(initialShareToken),
        rotatedShareToken: redact(rotatedShareToken),
        expiredShareToken: redact(expiredShareToken),
        lifecycle,
        responseCounts: afterResponses,
      },
      null,
      2,
    ),
  );
}

async function assertClientTokenCannotEnterInternalApis(token) {
  const cases = [
    ["/api/workspace/bootstrap", [401]],
    ["/api/member/dashboard", [401]],
    ["/api/org/overview", [401, 403]],
    ["/api/platform/organizations", [401, 403]],
  ];

  for (const [pathname, expectedStatuses] of cases) {
    const response = await get(pathname, { "x-asai-client-token": token });
    if (expectedStatuses.includes(response.status)) pass(`client-token-isolated ${pathname}`, `status=${response.status}`);
    else fail(`client-token-isolated ${pathname}`, `status=${response.status}`);
  }
}

async function runBrowserAuthorizedProof(token, expiredToken) {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  bindConsoleErrors(page);

  try {
    await page.goto(`${baseUrl}/share/${token}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction((stamp) => document.body.innerText.includes(stamp), qaStamp, { timeout: 30000 });
    const authorizedShare = await page.evaluate(() => ({
      hasClientScope: document.body.innerText.includes("客戶入口"),
      hasInternalContent: document.body.innerText.includes("internal-only content"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (authorizedShare.hasClientScope) pass("browser-authorized-share", "client portal scope visible");
    else fail("browser-authorized-share", "scope missing");
    if (!authorizedShare.hasInternalContent) pass("browser-authorized-share-omits-internal", "internal section hidden");
    else fail("browser-authorized-share-omits-internal", "internal text leaked");
    if (!authorizedShare.horizontalOverflow) pass("browser-authorized-share-no-overflow");
    else fail("browser-authorized-share-no-overflow", "horizontal overflow");
    await page.screenshot({ path: path.join(screenshotDir, "bff-303-authorized-share-desktop.png"), fullPage: true });

    await page.goto(`${baseUrl}/client-login?token=${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByRole("button", { name: /進入客戶頁/ }).click();
    await page.waitForFunction(() => document.body.innerText.includes("客戶入口已建立"), null, { timeout: 30000 });
    const loginOk = await page.evaluate(() => ({
      ready: document.body.innerText.includes("客戶入口已建立"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (loginOk.ready) pass("browser-client-login-authorized", "ready");
    else fail("browser-client-login-authorized", "ready message missing");
    if (!loginOk.horizontalOverflow) pass("browser-client-login-authorized-no-overflow");
    else fail("browser-client-login-authorized-no-overflow", "horizontal overflow");
    await page.screenshot({ path: path.join(screenshotDir, "bff-303-client-login-authorized-desktop.png"), fullPage: true });

    await page.goto(`${baseUrl}/share/${expiredToken}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("報告不存在或已過期"), null, { timeout: 30000 });
    const expiredShare = await page.evaluate(() => ({
      missing: document.body.innerText.includes("報告不存在或已過期"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (expiredShare.missing) pass("browser-expired-share-missing", "missing state");
    else fail("browser-expired-share-missing", "missing state absent");
    if (!expiredShare.horizontalOverflow) pass("browser-expired-share-no-overflow");
    else fail("browser-expired-share-no-overflow", "horizontal overflow");

    await page.goto(`${baseUrl}/share/not-a-real-share-token`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("報告不存在或已過期"), null, { timeout: 30000 });
    pass("browser-invalid-share-missing", "missing state");
  } finally {
    await browser.close();
  }
}

async function runBrowserRevokedProof(token) {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  bindConsoleErrors(page);

  try {
    await page.goto(`${baseUrl}/share/${token}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes("報告不存在或已過期"), null, { timeout: 30000 });
    const revokedShare = await page.evaluate(() => ({
      missing: document.body.innerText.includes("報告不存在或已過期"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (revokedShare.missing) pass("browser-revoked-share-missing", "mobile missing state");
    else fail("browser-revoked-share-missing", "missing state absent");
    if (!revokedShare.horizontalOverflow) pass("browser-revoked-share-no-overflow");
    else fail("browser-revoked-share-no-overflow", "horizontal overflow");
    await page.screenshot({ path: path.join(screenshotDir, "bff-303-revoked-share-mobile.png"), fullPage: true });

    await page.goto(`${baseUrl}/client-login?token=${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByRole("button", { name: /進入客戶頁/ }).click();
    await page.waitForFunction(() => document.body.innerText.includes("授權連結無效或已過期"), null, { timeout: 30000 });
    pass("browser-client-login-revoked", "error state");
  } finally {
    await browser.close();
  }
}

function bindConsoleErrors(page) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    if (text.includes("Failed to load resource") && text.includes("404")) return;

    consoleErrors.push(text);
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });
}

async function createExpiredShare(db, sourceToken, reportId) {
  const token = `bff303-expired-${Date.now().toString(36)}`;
  const id = `bff303_expired_${Date.now().toString(36)}`;
  const result = await db.query(
    `INSERT INTO report_shares (
       id,
       organization_id,
       unit_id,
       report_id,
       token,
       expires_at,
       access_count,
       cta_config,
       is_demo,
       demo_scenario,
       demo_seed_version,
       created_at,
       updated_at
     )
     SELECT $4,
            organization_id,
            unit_id,
            $2,
            $3,
            now() - interval '1 day',
            0,
            cta_config,
            true,
            demo_scenario,
            demo_seed_version,
            now(),
            now()
     FROM report_shares
     WHERE token = $1
     LIMIT 1
     RETURNING token`,
    [sourceToken, reportId, token, id],
  );

  const row = result.rows[0];
  if (!row?.token) {
    throw new Error("Failed to create expired BFF-303 share proof row.");
  }

  return row.token;
}

async function countUnsafePortalResponses(db, reportId) {
  const result = await db.query(
    `SELECT
       (COUNT(*) FILTER (
         WHERE ie.metadata->>'source' = 'client_portal'
           AND ie.metadata->>'reportId' = $1
       ))::int AS response_events,
       (COUNT(*) FILTER (
         WHERE ie.metadata->>'source' = 'client_portal'
           AND ie.metadata->>'reportId' = $1
           AND (
             ie.metadata ? 'unsafeRawPrivatePayload'
             OR ie.metadata ? 'secret'
             OR ie.metadata ? 'rawPayload'
             OR ie.metadata ? 'providerPayload'
           )
       ))::int AS unsafe_events
     FROM interaction_events ie`,
    [reportId],
  );
  const row = result.rows[0] ?? {};
  return {
    responseEvents: Number(row.response_events ?? 0),
    unsafeEvents: Number(row.unsafe_events ?? 0),
  };
}

async function getShareLifecycle(db, reportId) {
  const result = await db.query(
    `SELECT
       (COUNT(DISTINCT rs.id) FILTER (WHERE rs.expires_at IS NULL OR rs.expires_at > now()))::int AS active_shares,
       (COUNT(se.id) FILTER (WHERE se.payload->>'label' = 'rotate_revoke_previous_share_link'))::int AS rotate_events,
       (COUNT(se.id) FILTER (WHERE se.payload->>'label' = 'revoke_share_link'))::int AS revoke_events
     FROM report_shares rs
     LEFT JOIN share_events se ON se.share_id = rs.id
     WHERE rs.report_id = $1`,
    [reportId],
  );
  const row = result.rows[0] ?? {};
  return {
    activeShares: Number(row.active_shares ?? 0),
    rotateEvents: Number(row.rotate_events ?? 0),
    revokeEvents: Number(row.revoke_events ?? 0),
  };
}

function redact(token) {
  if (!token || token.length < 8) return token;
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

async function main() {
  verifyStaticBoundaries();
  await ensureDevServer();

  const db = await connectDb();
  try {
    await runApiProof(db);
  } finally {
    await db.end();
  }

  pass("no-provider", "script does not call OpenAI/Anthropic routes");
}

try {
  await main();
} finally {
  for (const child of spawned) {
    child.kill("SIGTERM");
  }
}

if (consoleErrors.length > 0) {
  fail("browser-console-errors", consoleErrors.slice(0, 3).join(" | "));
} else {
  pass("browser-console-errors", "0");
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
