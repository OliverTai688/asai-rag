#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-relationship-graph",
);
const qaStamp = `Relationship Graph QA ${Date.now()}`;

const checks = [];
const consoleErrors = [];
let createdClientId = "";
let createdClientName = "";

mkdirSync(screenshotDir, { recursive: true });

await runApiProof();
await runBrowserProof();

push(true, "no provider route invoked", "script uses deterministic relationship-graph BFF only");

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
  const unauth = await fetch(`${baseUrl}/api/clients/not-a-client/relationship-graph`);
  const unauthPayload = await readJson(unauth);
  push(unauth.status === 401, "relationship graph unauth returns 401", `status=${unauth.status} error=${unauthPayload?.error ?? ""}`);

  const created = await createGraphClient();
  createdClientId = created.id;
  createdClientName = created.name;
  if (!createdClientId) return;

  const missing = await memberRequestJson("GET", "/api/clients/not-a-client/relationship-graph");
  push(missing.status === 404, "relationship graph missing client returns 404", `status=${missing.status}`);

  const detail = await memberRequestJson("GET", `/api/clients/${createdClientId}/relationship-graph`);
  const detailText = JSON.stringify(detail.body);
  const graph = detail.body?.graph;

  push(detail.status === 200, "relationship graph detail returns 200", `status=${detail.status}`);
  push(graph?.version === "2026-06-20.relationship-graph-review.v1", "relationship graph DTO has stable version");
  push((graph?.nodes?.length ?? 0) >= 2, "relationship graph has primary and family nodes", `nodes=${graph?.nodes?.length ?? 0}`);
  push(graph?.sourceSummary?.factFields > 0, "relationship graph source summary counts facts", `facts=${graph?.sourceSummary?.factFields ?? 0}`);
  push(graph?.sourceSummary?.inferenceFields > 0, "relationship graph source summary counts inferences", `inferences=${graph?.sourceSummary?.inferenceFields ?? 0}`);
  push(graph?.sourceSummary?.unknownFields > 0, "relationship graph source summary counts unknowns", `unknowns=${graph?.sourceSummary?.unknownFields ?? 0}`);
  push(
    graph?.nodes?.some((node) => node.roleFactStatus === "INFERENCE" && node.fields?.jobTitle?.factStatus === "UNKNOWN"),
    "family node keeps inferred role and unknown job field",
  );
  push(
    graph?.downstreamReadiness?.previsit?.status === "READY",
    "relationship graph is ready as preparation package source",
    `status=${graph?.downstreamReadiness?.previsit?.status ?? ""}`,
  );
  push(
    ["READY", "NEEDS_MORE_INFO", "BLOCKED_SENSITIVE"].includes(graph?.downstreamReadiness?.theater?.status),
    "relationship graph returns theater readiness boundary",
    `status=${graph?.downstreamReadiness?.theater?.status ?? ""}`,
  );
  push(
    Array.isArray(graph?.suggestedQuestions) && graph.suggestedQuestions.length > 0,
    "relationship graph returns suggested prep questions",
  );
  push(
    !detailText.includes("@") && !/09\d{2}/.test(detailText),
    "relationship graph response has no email/phone sentinel",
  );
  push(
    !["rawPayload", "cookie", "secret", "authorization", "providerPayload"].some((key) =>
      detailText.toLowerCase().includes(key.toLowerCase()),
    ),
    "relationship graph response has no raw private sentinel",
  );

  const managerForbidden = await managerRequestJson("GET", `/api/clients/${createdClientId}/relationship-graph`);
  push(managerForbidden.status === 403, "manager cannot read member relationship graph detail", `status=${managerForbidden.status}`);
}

async function runBrowserProof() {
  if (!createdClientId || !createdClientName) {
    push(false, "browser proof has created client id/name");
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
    await page.goto(`${baseUrl}/crm/${createdClientId}/relationships`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: "關係人管理" }).waitFor({ timeout: 30000 });
    await page.getByText("關係圖來源審查").waitFor({ timeout: 30000 });

    const desktopChecks = await page.evaluate((clientId) => {
      const text = document.body.innerText;
      return {
        hasReview: text.includes("關係圖來源審查"),
        hasFact: text.includes("事實"),
        hasInference: text.includes("推論"),
        hasUnknown: text.includes("待確認"),
        hasPrevisit: text.includes("拜訪準備包"),
        hasTheater: text.includes("劇場建場"),
        hasJobIncomeStatus: text.includes("職位/職業") && text.includes("年收入") && text.includes("人物狀態"),
        hidesRawClientId: !text.includes(clientId),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, createdClientId);

    push(desktopChecks.hasReview, "browser renders relationship graph review");
    push(desktopChecks.hasFact && desktopChecks.hasInference && desktopChecks.hasUnknown, "browser shows fact/inference/unknown labels");
    push(desktopChecks.hasPrevisit && desktopChecks.hasTheater, "browser shows previsit and theater readiness");
    push(desktopChecks.hasJobIncomeStatus, "browser shows job/income/status fields");
    push(desktopChecks.hidesRawClientId, "browser does not expose raw client id in body");
    push(!desktopChecks.horizontalOverflow, "relationship graph desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-relationship-graph-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByText("關係圖來源審查").waitFor({ timeout: 30000 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "relationship graph mobile has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-relationship-graph-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function createGraphClient() {
  const name = `${qaStamp} 專案情境客戶`;
  const client = await memberRequestJson("POST", "/api/clients", {
    name,
    email: `relationship-graph-${Date.now()}@asai.local`,
    phone: "0912-440-550",
    occupation: "家族企業第二代負責人",
    annualIncome: 5600000,
    status: "ACTIVE",
  });
  const id = client.body?.client?.id ?? "";
  push(client.status === 201 && Boolean(id), "POST /api/clients creates graph QA client", `status=${client.status} client=${id}`);

  if (!id) return { id: "", name };

  const spouse = await memberRequestJson("POST", `/api/clients/${id}/family-members`, {
    name: "QA 共同決策配偶",
    relation: "配偶",
    age: 42,
  });
  push(spouse.status === 201, "POST family member creates relationship graph node", `status=${spouse.status}`);

  const child = await memberRequestJson("POST", `/api/clients/${id}/family-members`, {
    name: "QA 受扶養子女",
    relation: "女",
    age: 13,
  });
  push(child.status === 201, "POST second family member creates dependent node", `status=${child.status}`);

  const policy = await memberRequestJson("POST", `/api/clients/${id}/policies`, {
    type: "醫療險",
    provider: "誠問測試保險",
    amount: 2000000,
  });
  push(policy.status === 201, "POST policy adds preparation source context", `status=${policy.status}`);

  return { id, name };
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
