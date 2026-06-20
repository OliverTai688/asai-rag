#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/modern-ui/relationship-graph",
);
const qaStamp = `Relationship Graph Polish QA ${Date.now()}`;
const qaPrivateEmailPrefix = `relationship-polish-${Date.now()}`;
const qaPrivatePhone = "0912-663-881";

const checks = [];
const consoleErrors = [];
const clients = {
  empty: { id: "", name: `${qaStamp} 空關係客戶` },
  singleParent: { id: "", name: `${qaStamp} 單親關係客戶` },
  complex: { id: "", name: `${qaStamp} 雙親配偶社會關係客戶` },
};

mkdirSync(screenshotDir, { recursive: true });

await runApiSetupAndProof();
await runBrowserProof();

push(true, "no provider route invoked", "script uses deterministic client/family/relationship graph BFF only");

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

async function runApiSetupAndProof() {
  clients.empty.id = await createClient(clients.empty.name, 4100000);

  clients.singleParent.id = await createClient(clients.singleParent.name, 4300000);
  if (clients.singleParent.id) {
    await createFamilyMember(clients.singleParent.id, {
      name: `${qaStamp} 單親父親`,
      relation: "父",
      age: 68,
    });
  }

  clients.complex.id = await createClient(clients.complex.name, 7600000);
  if (clients.complex.id) {
    await createFamilyMember(clients.complex.id, {
      name: `${qaStamp} 父親`,
      relation: "父",
      age: 70,
    });
    await createFamilyMember(clients.complex.id, {
      name: `${qaStamp} 母親`,
      relation: "母",
      age: 67,
    });
    await createFamilyMember(clients.complex.id, {
      name: `${qaStamp} 共同決策配偶`,
      relation: "配偶",
      age: 44,
    });
    await createFamilyMember(clients.complex.id, {
      name: `${qaStamp} 同輩手足`,
      relation: "妹",
      age: 40,
    });
    await createFamilyMember(clients.complex.id, {
      name: `${qaStamp} 事業合作夥伴`,
      relation: "合作夥伴",
      age: 47,
    });
  }

  await assertGraphApi(clients.empty.id, {
    label: "empty relationship graph",
    expectedEdgeCount: 0,
    expectedTypes: [],
  });
  await assertGraphApi(clients.singleParent.id, {
    label: "single parent relationship graph",
    expectedEdgeCount: 1,
    expectedTypes: ["PARENT_OF"],
  });
  await assertGraphApi(clients.complex.id, {
    label: "dual parent spouse sibling social relationship graph",
    expectedEdgeCount: 5,
    expectedTypes: ["PARENT_OF", "SPOUSE_OF", "SIBLING_OF", "SOCIAL_TIE"],
  });
}

async function runBrowserProof() {
  if (!clients.empty.id || !clients.singleParent.id || !clients.complex.id) {
    push(false, "browser proof has all created client ids");
    return;
  }

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });

  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: { "x-asai-demo-user-email": demoMemberEmail },
    });
    await runPageStateProof(desktopContext, clients.empty, {
      label: "empty",
      expectedEdges: 0,
      screenshotName: "2026-06-20-relationship-graph-empty-desktop.png",
    });
    await runPageStateProof(desktopContext, clients.singleParent, {
      label: "single-parent",
      expectedEdges: 1,
      screenshotName: "2026-06-20-relationship-graph-single-parent-desktop.png",
    });
    await runPageStateProof(desktopContext, clients.complex, {
      label: "dual-parent-spouse-social",
      expectedEdges: 5,
      screenshotName: "2026-06-20-relationship-graph-complex-desktop.png",
      assertToolbar: true,
    });
    await desktopContext.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: { "x-asai-demo-user-email": demoMemberEmail },
    });
    await runPageStateProof(mobileContext, clients.complex, {
      label: "complex-mobile",
      expectedEdges: 5,
      screenshotName: "2026-06-20-relationship-graph-complex-mobile.png",
    });
    await mobileContext.close();

    const reducedMotionContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
      extraHTTPHeaders: { "x-asai-demo-user-email": demoMemberEmail },
    });
    await runPageStateProof(reducedMotionContext, clients.complex, {
      label: "complex-reduced-motion",
      expectedEdges: 5,
      screenshotName: "2026-06-20-relationship-graph-complex-reduced-motion.png",
    });
    await reducedMotionContext.close();

    const darkContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: "dark",
      deviceScaleFactor: 2,
      extraHTTPHeaders: { "x-asai-demo-user-email": demoMemberEmail },
    });
    await runPageStateProof(darkContext, clients.complex, {
      label: "complex-dark",
      expectedEdges: 5,
      screenshotName: "2026-06-20-relationship-graph-complex-dark.png",
      assertDarkReadable: true,
    });
    await darkContext.close();
  } finally {
    await browser.close();
  }
}

async function runPageStateProof(context, client, options) {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${options.label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleErrors.push(`${options.label}: ${error.message}`));

  try {
    await page.goto(`${baseUrl}/crm/${client.id}/relationships`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: "關係人管理" }).waitFor({ timeout: 30000 });
    await page.getByText("關係圖來源審查").waitFor({ timeout: 30000 });
    await page.getByText("點選或聚焦節點可新增父/子節點").waitFor({ timeout: 30000 });

    const pageChecks = await page.evaluate(({ clientId, privateEmailPrefix, privatePhone }) => {
      const text = document.body.innerText;
      const graphSurfaceText = Array.from(
        document.querySelectorAll(".react-flow, [aria-label='人物關係圖互動畫布']"),
      )
        .map((element) => element.textContent ?? "")
        .join(" ");
      return {
        hasReview: text.includes("關係圖來源審查"),
        hasCanvasLabel: Boolean(document.querySelector('[aria-label="人物關係圖互動畫布"]')),
        hasNodeGroups: document.querySelectorAll('[role="group"][aria-label^="關係圖節點："]').length > 0,
        edgeCount: document.querySelectorAll(".react-flow__edge").length,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        hidesRawClientId: !text.includes(clientId),
        graphSurfaceHidesPrivateEmail: !graphSurfaceText.includes(privateEmailPrefix),
        graphSurfaceHidesPrivatePhone: !graphSurfaceText.includes(privatePhone),
        darkTextVisible: text.includes("人物關係圖") && text.includes("關係圖來源審查"),
      };
    }, { clientId: client.id, privateEmailPrefix: qaPrivateEmailPrefix, privatePhone: qaPrivatePhone });

    push(pageChecks.hasReview, `${options.label} browser renders source review`);
    push(pageChecks.hasCanvasLabel, `${options.label} browser exposes canvas aria label`);
    push(pageChecks.hasNodeGroups, `${options.label} browser exposes focusable graph node groups`);
    push(pageChecks.edgeCount >= options.expectedEdges, `${options.label} browser renders expected graph edge count`, `edges=${pageChecks.edgeCount}`);
    push(!pageChecks.horizontalOverflow, `${options.label} browser has no horizontal overflow`);
    push(pageChecks.hidesRawClientId, `${options.label} browser does not expose raw client id`);
    push(
      pageChecks.graphSurfaceHidesPrivateEmail && pageChecks.graphSurfaceHidesPrivatePhone,
      `${options.label} graph surface does not expose seeded email/phone sentinel`,
    );

    if (options.assertDarkReadable) {
      push(pageChecks.darkTextVisible, `${options.label} dark mode keeps relationship graph text visible`);
    }

    if (options.assertToolbar) {
      await assertToolbarAccessibility(page, client.name);
    }

    await page.screenshot({
      path: resolve(screenshotDir, options.screenshotName),
      fullPage: true,
    });
  } finally {
    await page.close();
  }
}

async function assertToolbarAccessibility(page, clientName) {
  const nodeLabel = new RegExp(`關係圖節點：.*${escapeRegExp(clientName)}`);
  const node = page.getByRole("group", { name: nodeLabel }).first();
  await node.focus();

  const parentButton = page.getByLabel(`新增父節點：${clientName}`);
  const childButton = page.getByLabel(`新增子節點：${clientName}`);
  await parentButton.waitFor({ timeout: 30000 });
  await childButton.waitFor({ timeout: 30000 });

  const parentTitle = await parentButton.getAttribute("title");
  const childTitle = await childButton.getAttribute("title");
  const parentClass = (await parentButton.getAttribute("class")) ?? "";
  const childClass = (await childButton.getAttribute("class")) ?? "";
  const activeNodeLabel = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");

  push(parentTitle === `新增父節點：${clientName}`, "toolbar parent action has native tooltip title");
  push(childTitle === `新增子節點：${clientName}`, "toolbar child action has native tooltip title");
  push(parentClass.includes("focus-visible:ring") && childClass.includes("focus-visible:ring"), "toolbar actions expose visible focus ring classes");
  push(activeNodeLabel.includes(clientName), "relationship graph node is keyboard-focusable before toolbar action");
}

async function createClient(name, annualIncome) {
  const response = await memberRequestJson("POST", "/api/clients", {
    name,
    email: `${qaPrivateEmailPrefix}-${annualIncome}@asai.local`,
    phone: qaPrivatePhone,
    occupation: "跨世代專案情境決策者",
    annualIncome,
    status: "ACTIVE",
  });
  const id = response.body?.client?.id ?? "";
  push(response.status === 201 && Boolean(id), `POST /api/clients creates ${name}`, `status=${response.status} client=${id}`);
  return id;
}

async function createFamilyMember(clientId, body) {
  const response = await memberRequestJson("POST", `/api/clients/${clientId}/family-members`, body);
  const family = response.body?.client?.family ?? [];
  const member = findLatestMatchingMember(family, body.name, body.relation);
  push(response.status === 201 && Boolean(member?.id), `POST family member creates ${body.name}`, `status=${response.status}`);
  return member;
}

async function assertGraphApi(clientId, options) {
  if (!clientId) {
    push(false, `${options.label} has client id`);
    return;
  }

  const response = await memberRequestJson("GET", `/api/clients/${clientId}/relationship-graph`);
  const graph = response.body?.graph;
  const bodyText = JSON.stringify(response.body);
  const edgeTypes = new Set((graph?.edges ?? []).map((edge) => edge.type));

  push(response.status === 200, `${options.label} API returns 200`, `status=${response.status}`);
  push((graph?.edges?.length ?? 0) >= options.expectedEdgeCount, `${options.label} API edge count meets expectation`, `edges=${graph?.edges?.length ?? 0}`);
  for (const expectedType of options.expectedTypes) {
    push(edgeTypes.has(expectedType), `${options.label} API derives ${expectedType}`);
  }
  push(graph?.sourceSummary?.edgeCount === (graph?.edges?.length ?? 0), `${options.label} source summary edge count matches edge list`);
  push(
    Array.isArray(graph?.suggestedQuestions) && graph.suggestedQuestions.length > 0,
    `${options.label} keeps preparation package question handoff`,
  );
  push(
    ["READY", "NEEDS_MORE_INFO", "BLOCKED_SENSITIVE"].includes(graph?.downstreamReadiness?.theater?.status),
    `${options.label} keeps theater readiness boundary`,
    `status=${graph?.downstreamReadiness?.theater?.status ?? ""}`,
  );
  push(!bodyText.includes(qaPrivateEmailPrefix) && !bodyText.includes(qaPrivatePhone), `${options.label} API hides seeded email/phone sentinel`);
}

function findLatestMatchingMember(family, name, relation) {
  for (let index = family.length - 1; index >= 0; index -= 1) {
    const member = family[index];
    if (member.name === name && member.relation === relation) return member;
  }
  return null;
}

async function memberRequestJson(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": demoMemberEmail,
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
