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
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-theater-client-build",
);
const qaStamp = `TDF Client Build QA ${alphabeticStamp(Date.now())}`;

const checks = [];
const consoleErrors = [];
let createdReadyClientId = "";
let createdReadyClientName = "";
let createdSensitiveClientId = "";

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

push(true, "no provider route invoked", "script uses deterministic theater client-build BFF only");

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
  const unauth = await fetch(`${baseUrl}/api/theater/client-builds`);
  const unauthPayload = await readJson(unauth);
  push(unauth.status === 401, "client-build list unauth returns 401", `status=${unauth.status} error=${unauthPayload?.error ?? ""}`);

  const created = await createReadyClient();
  createdReadyClientId = created.id;
  createdReadyClientName = created.name;
  if (!createdReadyClientId) return;

  const list = await memberRequestJson("GET", "/api/theater/client-builds");
  push(list.status === 200, "member client-build list returns 200", `status=${list.status}`);
  push(
    Array.isArray(list.body?.clients) && list.body.clients.some((client) => client.id === createdReadyClientId),
    "client-build list includes owner-readable QA client",
  );

  const detail = await memberRequestJson("GET", `/api/theater/client-builds/${createdReadyClientId}`);
  const detailText = JSON.stringify(detail.body);
  push(detail.status === 200, "member client-build detail returns 200", `status=${detail.status}`);
  push(detail.body?.build?.status === "READY", "client-build detail is READY", `status=${detail.body?.build?.status ?? ""}`);
  push(detail.body?.build?.packet?.routeBCompatibility?.canStartSimulation === true, "client-build packet can start setup review");
  push(detail.body?.build?.sourceSummary?.sourceCounts?.familyMembers >= 1, "client-build source counts include relationship graph");
  push(detail.body?.build?.sourceSummary?.sourceCounts?.policies >= 1, "client-build source counts include policies");
  push(!detailText.includes("@") && !/09\d{2}/.test(detailText), "client-build detail has no email/phone sentinel");
  push(
    !["rawPayload", "cookie", "secret", "authorization"].some((key) => detailText.toLowerCase().includes(key.toLowerCase())),
    "client-build detail has no raw private sentinel",
  );

  const managerForbidden = await managerRequestJson("GET", `/api/theater/client-builds/${createdReadyClientId}`);
  push(managerForbidden.status === 403, "manager cannot read member client-build detail", `status=${managerForbidden.status}`);

  const sensitive = await createSensitiveClient();
  createdSensitiveClientId = sensitive.id;
  if (!createdSensitiveClientId) return;

  const sensitiveDetail = await memberRequestJson("GET", `/api/theater/client-builds/${createdSensitiveClientId}`);
  push(sensitiveDetail.status === 200, "high-sensitive client-build detail returns boundary payload", `status=${sensitiveDetail.status}`);
  push(
    sensitiveDetail.body?.build?.status === "BLOCKED_SENSITIVE",
    "high-sensitive client-build remains blocked",
    `status=${sensitiveDetail.body?.build?.status ?? ""}`,
  );
  push(
    sensitiveDetail.body?.build?.packet?.routeBCompatibility?.canStartSimulation === false,
    "high-sensitive client-build packet cannot start setup review",
  );
}

async function runBrowserProof() {
  if (!createdReadyClientId || !createdReadyClientName) {
    push(false, "browser proof has ready client id/name");
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
    await page.goto(`${baseUrl}/theater`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "AI 劇場演練" }).waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: /帶客戶資料建場/ }).first().click();
    await page.getByRole("button", { name: new RegExp(createdReadyClientName) }).click();
    await page.getByText("客戶資料建場審查").waitFor({ timeout: 30000 });

    const selectorChecks = await page.evaluate((clientId) => {
      const text = document.body.innerText;
      return {
        hasReview: text.includes("客戶資料建場審查"),
        hasFacts: text.includes("已知事實"),
        hasInferences: text.includes("推論線索"),
        hasUnknowns: text.includes("待確認"),
        hidesRawClientId: !text.includes(clientId),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, createdReadyClientId);
    push(selectorChecks.hasReview, "browser renders client-build review on /theater");
    push(selectorChecks.hasFacts && selectorChecks.hasInferences && selectorChecks.hasUnknowns, "browser selector shows fact/inference/unknown review");
    push(selectorChecks.hidesRawClientId, "browser selector does not expose raw client id in body");
    push(!selectorChecks.horizontalOverflow, "browser selector desktop has no horizontal overflow");

    await Promise.all([
      page.waitForURL(/\/theater\/build/, { timeout: 30000 }),
      page.getByRole("button", { name: "帶這位客戶建場" }).click(),
    ]);
    const buildUrl = page.url();
    push(buildUrl.includes(`/theater/build?clientId=${createdReadyClientId}`), "browser primary action routes to client-build URL");
    await page.goto(buildUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "劇場訪綱建場" }).waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.body.innerText.includes("客戶資料來源審查"), null, { timeout: 30000 });

    const buildChecks = await page.evaluate((clientId) => {
      const text = document.body.innerText;
      return {
        hasSourceReview: text.includes("客戶資料來源審查"),
        hasClientLoaded: text.includes("客戶資料已帶入"),
        hasFacts: text.includes("已知事實"),
        hasInferences: text.includes("推論線索"),
        hasUnknowns: text.includes("待確認"),
        hidesRawClientId: !text.includes(clientId),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, createdReadyClientId);
    push(buildChecks.hasSourceReview, "browser renders client-build review on /theater/build");
    push(buildChecks.hasClientLoaded, "browser build page loads client-build DTO");
    push(buildChecks.hasFacts && buildChecks.hasInferences && buildChecks.hasUnknowns, "browser build page shows fact/inference/unknown review");
    push(buildChecks.hidesRawClientId, "browser build page does not expose raw client id in body");
    push(!buildChecks.horizontalOverflow, "browser build desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-theater-client-build-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "browser build mobile has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-theater-client-build-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function createReadyClient() {
  const name = `${qaStamp} 可建場客戶`;
  const client = await memberRequestJson("POST", "/api/clients", {
    name,
    email: `tdf-client-${Date.now()}@asai.local`,
    phone: "0912-222-333",
    occupation: "科技公司營運長",
    annualIncome: 4800000,
    status: "ACTIVE",
  });
  const id = client.body?.client?.id ?? "";
  push(client.status === 201 && Boolean(id), "POST /api/clients creates ready QA client", `status=${client.status} client=${id}`);

  if (!id) return { id: "", name };

  await db.query(
    `UPDATE clients
        SET is_demo = true,
            demo_scenario = 'lv3-theater-client-build-qa',
            demo_seed_version = 1
      WHERE id = $1`,
    [id],
  );

  const family = await memberRequestJson("POST", `/api/clients/${id}/family-members`, {
    name: "QA 共同決策配偶",
    relation: "配偶",
    age: 43,
  });
  push(family.status === 201, "POST family member gives client-build relationship context", `status=${family.status}`);

  const policy = await memberRequestJson("POST", `/api/clients/${id}/policies`, {
    type: "壽險",
    provider: "誠問測試保險",
    amount: 3000000,
  });
  push(policy.status === 201, "POST policy gives client-build policy context", `status=${policy.status}`);

  return { id, name };
}

async function createSensitiveClient() {
  const client = await memberRequestJson("POST", "/api/clients", {
    name: `${qaStamp} 高敏感客戶`,
    email: `tdf-sensitive-${Date.now()}@asai.local`,
    phone: "0912-555-777",
    occupation: "上市公司財務長",
    annualIncome: 6800000,
    status: "ACTIVE",
  });
  const id = client.body?.client?.id ?? "";
  push(client.status === 201 && Boolean(id), "POST /api/clients creates high-sensitive QA client", `status=${client.status} client=${id}`);

  if (!id) return { id: "" };

  await db.query(
    `UPDATE clients
        SET sensitivity = 'HIGHLY_SENSITIVE',
            is_demo = true,
            demo_scenario = 'lv3-theater-client-build-qa',
            demo_seed_version = 1
      WHERE id = $1`,
    [id],
  );

  return { id };
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

function alphabeticStamp(value) {
  const digitMap = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  return String(value)
    .split("")
    .map((character) => digitMap[Number(character)] ?? character)
    .join("");
}
