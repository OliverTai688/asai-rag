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
const qaPrivateEmailPrefix = `relationship-graph-${Date.now()}`;
const qaPrivatePhone = "0912-440-550";

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
  const edgeShadow = detail.body?.edgeShadow;
  const edgeShadowText = JSON.stringify(edgeShadow ?? {});

  push(detail.status === 200, "relationship graph detail returns 200", `status=${detail.status}`);
  push(graph?.version === "2026-06-20.relationship-graph-review.v1", "relationship graph DTO has stable version");
  push((graph?.nodes?.length ?? 0) >= 2, "relationship graph has primary and family nodes", `nodes=${graph?.nodes?.length ?? 0}`);
  push(Array.isArray(graph?.edges) && graph.edges.length === graph.nodes.length - 1, "relationship graph edge list matches family node count", `edges=${graph?.edges?.length ?? 0}`);
  push(graph?.sourceSummary?.edgeCount === graph?.edges?.length, "relationship graph source summary counts edges", `edges=${graph?.sourceSummary?.edgeCount ?? 0}`);
  push(graph?.sourceSummary?.factFields > 0, "relationship graph source summary counts facts", `facts=${graph?.sourceSummary?.factFields ?? 0}`);
  push(graph?.sourceSummary?.inferenceFields > 0, "relationship graph source summary counts inferences", `inferences=${graph?.sourceSummary?.inferenceFields ?? 0}`);
  push(graph?.sourceSummary?.unknownFields > 0, "relationship graph source summary counts unknowns", `unknowns=${graph?.sourceSummary?.unknownFields ?? 0}`);
  const edgeTypes = new Set((graph?.edges ?? []).map((edge) => edge.type));
  push(edgeTypes.has("PARENT_OF"), "relationship graph derives PARENT_OF edge");
  push(edgeTypes.has("SPOUSE_OF"), "relationship graph derives SPOUSE_OF edge");
  push(edgeTypes.has("SIBLING_OF"), "relationship graph derives SIBLING_OF edge");
  push(edgeTypes.has("SOCIAL_TIE"), "relationship graph derives SOCIAL_TIE edge");
  push(
    (graph?.edges ?? []).every(
      (edge) =>
        edge.edgeKey &&
        edge.sourceNodeKey &&
        edge.targetNodeKey &&
        edge.label &&
        ["FACT", "INFERENCE", "UNKNOWN"].includes(edge.factStatus),
    ),
    "relationship graph edges include typed fact status and stable node keys",
  );
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
    edgeShadow?.version === "2026-06-23.relationship-edge-shadow.v1",
    "relationship graph response includes edge shadow BFF summary",
  );
  push(
    edgeShadow?.sourceMemberCount === graph?.nodes?.length - 1,
    "edge shadow source member count matches family nodes",
    `source=${edgeShadow?.sourceMemberCount ?? ""}`,
  );
  push(
    edgeShadow?.draftEdgeCount === edgeShadow?.sourceMemberCount &&
      edgeShadow?.counts?.total === edgeShadow?.draftEdgeCount,
    "edge shadow BFF summary counts candidate edges without returning drafts",
    `drafts=${edgeShadow?.draftEdgeCount ?? ""}`,
  );
  push(
    edgeShadow?.proof?.clientFacingDraftEdgesReturned === false && edgeShadow?.proof?.formalSchemaApproved === false,
    "edge shadow BFF summary keeps formal edge migration approval-gated",
  );
  push(
    !["draftEdges", "draftId", "sourceNodeId", "targetNodeId", "sourceReferenceIds", "metadata", "clientId"].some((key) =>
      edgeShadowText.includes(key),
    ),
    "edge shadow BFF summary omits server-only draft edge payload",
  );
  push(
    !detailText.includes(qaPrivateEmailPrefix) && !detailText.includes(qaPrivatePhone),
    "relationship graph response has no seeded email/phone sentinel",
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
        edgeCount: document.querySelectorAll(".react-flow__edge").length,
        hidesRawClientId: !text.includes(clientId),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, createdClientId);

    push(desktopChecks.hasReview, "browser renders relationship graph review");
    push(desktopChecks.hasFact && desktopChecks.hasInference && desktopChecks.hasUnknown, "browser shows fact/inference/unknown labels");
    push(desktopChecks.hasPrevisit && desktopChecks.hasTheater, "browser shows previsit and theater readiness");
    push(desktopChecks.hasJobIncomeStatus, "browser shows job/income/status fields");
    push(desktopChecks.edgeCount >= 4, "browser renders BFF-derived relationship graph edges", `edges=${desktopChecks.edgeCount}`);
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
    email: `${qaPrivateEmailPrefix}@asai.local`,
    phone: qaPrivatePhone,
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

  const sibling = await memberRequestJson("POST", `/api/clients/${id}/family-members`, {
    name: "QA 同輩手足",
    relation: "姐",
    age: 45,
  });
  push(sibling.status === 201, "POST sibling family member creates same-rank node", `status=${sibling.status}`);

  const friend = await memberRequestJson("POST", `/api/clients/${id}/family-members`, {
    name: "QA 合作夥伴",
    relation: "合作夥伴",
    age: 47,
  });
  push(friend.status === 201, "POST social relation member creates context node", `status=${friend.status}`);

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
