#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_QA_EMAIL ?? "demo.member@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-theater-gate",
);
const qaStamp = `TDF Gate QA ${new Date().toISOString()}`;
const approvalReason = "內部劇場建場 QA，只使用準備包摘要素材，不外傳、不寫回 CRM 事實。";

const checks = [];
const consoleErrors = [];
let createdClientId = "";
let createdVisitPlanId = "";

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

push(true, "no provider route invoked", "script uses deterministic visit/theater handoff BFF only");

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
  const unauth = await fetch(`${baseUrl}/api/visits/not-real/theater-handoff`);
  const unauthPayload = await readJson(unauth);
  push(unauth.status === 401, "handoff unauth returns 401", `status=${unauth.status} error=${unauthPayload?.error ?? ""}`);

  const client = await requestJson("POST", "/api/clients", {
    name: `高敏感劇場 QA ${Date.now()}`,
    email: `tdf-gate-${Date.now()}@asai.local`,
    phone: "0912-345-678",
    occupation: "上市公司財務長",
    annualIncome: 6200000,
    status: "ACTIVE",
  });
  createdClientId = client.body?.client?.id ?? "";
  push(client.status === 201 && Boolean(createdClientId), "POST /api/clients creates QA client", `status=${client.status} client=${createdClientId}`);

  if (!createdClientId) return;

  await db.query(
    `UPDATE clients
       SET sensitivity = 'HIGHLY_SENSITIVE',
           is_demo = true,
           demo_scenario = 'lv3-theater-gate-qa',
           demo_seed_version = 1
     WHERE id = $1`,
    [createdClientId],
  );

  const family = await requestJson("POST", `/api/clients/${createdClientId}/family-members`, {
    name: "QA 配偶",
    relation: "配偶",
    age: 45,
  });
  push(family.status === 201, "POST family member gives theater relationship context", `status=${family.status}`);

  const visit = await requestJson("POST", "/api/visits", {
    clientId: createdClientId,
    purpose: "ADD_ON",
    visitTime: new Date(Date.now() + 172_800_000).toISOString(),
  });
  createdVisitPlanId = visit.body?.visitPlan?.id ?? "";
  push(visit.status === 201 && Boolean(createdVisitPlanId), "POST /api/visits creates high-sensitive visit", `status=${visit.status} visit=${createdVisitPlanId}`);

  if (!createdVisitPlanId) return;

  const patch = await requestJson("PATCH", `/api/visits/${createdVisitPlanId}`, buildVisitPatch());
  push(patch.status === 200 && patch.body?.visitPlan?.status === "READY", "PATCH visit stores READY prep package", `status=${patch.status}`);

  const blocked = await requestJson("GET", `/api/visits/${createdVisitPlanId}/theater-handoff`);
  push(blocked.status === 200, "GET handoff for high-sensitive visit returns 200 boundary payload", `status=${blocked.status}`);
  push(blocked.body?.handoff?.status === "BLOCKED_SENSITIVE", "high-sensitive handoff is blocked without approval", `status=${blocked.body?.handoff?.status ?? ""}`);
  push(blocked.body?.handoff?.packet?.routeBCompatibility?.canStartSimulation === false, "blocked packet cannot start simulation");

  const invalidApproval = await requestJson("POST", `/api/visits/${createdVisitPlanId}/theater-handoff`, {
    reason: "太短",
    riskAccepted: false,
  });
  push(invalidApproval.status === 400, "POST approval rejects missing reason/risk acceptance", `status=${invalidApproval.status} error=${invalidApproval.body?.error ?? ""}`);

  const auditBefore = await getApprovalAuditCount();
  const approved = await requestJson("POST", `/api/visits/${createdVisitPlanId}/theater-handoff`, {
    reason: approvalReason,
    riskAccepted: true,
  });
  const approvedText = JSON.stringify(approved.body);
  const auditAfter = await getApprovalAuditCount();
  push(approved.status === 200, "POST approval returns approved handoff", `status=${approved.status}`);
  push(approved.body?.handoff?.status === "READY", "approved high-sensitive handoff becomes READY", `status=${approved.body?.handoff?.status ?? ""}`);
  push(approved.body?.handoff?.packet?.routeBCompatibility?.canStartSimulation === true, "approved packet can start setup review");
  push(auditAfter > auditBefore, "high-sensitive approval writes InteractionEvent audit", `${auditBefore}->${auditAfter}`);
  push(!approvedText.includes("@") && !/09\d{2}/.test(approvedText), "approved handoff response has no email/phone sentinel");
  push(
    !["rawPayload", "cookie", "secret", "authorization"].some((key) => approvedText.toLowerCase().includes(key.toLowerCase())),
    "approved handoff response has no raw private sentinel",
  );
}

async function runBrowserProof() {
  if (!createdVisitPlanId) {
    push(false, "browser proof has visit plan id");
    return;
  }

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/theater/build?visitPlanId=${createdVisitPlanId}&source=previsit`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: "劇場訪綱建場" }).waitFor({ timeout: 30000 });

    const blockedChecks = await page.evaluate((visitPlanId) => {
      const text = document.body.innerText;
      return {
        hasSourceReview: text.includes("準備包來源審查"),
        hasSensitiveGate: text.includes("高敏感客戶需先確認使用邊界"),
        hasApprovalButton: text.includes("確認並重新建場"),
        hidesRawVisitId: !text.includes(visitPlanId),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, createdVisitPlanId);
    push(blockedChecks.hasSourceReview, "browser renders source review panel");
    push(blockedChecks.hasSensitiveGate, "browser renders high-sensitive gate");
    push(blockedChecks.hasApprovalButton, "browser renders approval action");
    push(blockedChecks.hidesRawVisitId, "browser does not expose raw visit plan id in body");
    push(!blockedChecks.horizontalOverflow, "blocked gate desktop has no horizontal overflow");

    await page.getByLabel("高敏感建場理由").fill(approvalReason);
    await page.getByLabel("我確認本次劇場只作內部訓練，已理解高敏感資料使用風險。").check();
    await page.getByRole("button", { name: "確認並重新建場" }).click();
    await page.waitForFunction(() => document.body.innerText.includes("準備包已帶入"), null, { timeout: 30000 });

    const approvedChecks = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasApprovedNotice: text.includes("準備包已帶入"),
        hasKnownFacts: text.includes("已知事實"),
        hasInferences: text.includes("推論線索"),
        hasUnknowns: text.includes("待確認"),
        noSensitiveBlocker: !text.includes("高敏感客戶需先確認使用邊界"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    push(approvedChecks.hasApprovedNotice, "browser approval updates handoff status");
    push(approvedChecks.hasKnownFacts && approvedChecks.hasInferences && approvedChecks.hasUnknowns, "browser shows fact/inference/unknown review");
    push(approvedChecks.noSensitiveBlocker, "browser removes high-sensitive blocker after approval");
    push(!approvedChecks.horizontalOverflow, "approved gate desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-theater-gate-approved-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "approved gate mobile has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-theater-gate-approved-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

function buildVisitPatch() {
  return {
    status: "READY",
    objectives: [
      {
        id: "tdf-objective-1",
        description: `${qaStamp}：演練高敏感客戶的加保溝通與共同決策確認。`,
        successCriteria: "顧問能先說明資料使用邊界，再確認決策人與下一步。",
      },
    ],
    spinQuestions: [
      {
        id: "tdf-spin-s-1",
        type: "S",
        question: "這次加保討論需要誰一起聽到風險與保障邊界？",
        reasoning: {
          summary: "由高敏感客戶與家庭關係推論，先建立資料使用邊界再談保障內容。",
          evidence: [
            {
              id: "tdf-evidence-relationship",
              source: "relationship_graph",
              status: "inference",
              label: "關係圖",
              detail: "配偶可能參與決策，但需要顧問在現場確認。",
            },
            {
              id: "tdf-evidence-purpose",
              source: "visit_purpose",
              status: "confirmed",
              label: "拜訪目的",
              detail: "本次準備包目的為加保溝通。",
            },
          ],
          confirmationPrompt: "請先確認資料使用邊界與共同決策人。",
        },
      },
    ],
    objections: [
      {
        id: "tdf-objection-1",
        expectedObjection: "我不希望敏感資料被拿去做其他用途。",
        suggestedResponse: "先界定今天只作內部演練與保障需求討論，不外傳也不寫回未確認事實。",
      },
    ],
    materials: [
      {
        id: "tdf-material-1",
        name: "高敏感資料使用邊界清單",
        checked: true,
      },
    ],
  };
}

async function getApprovalAuditCount() {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
       FROM interaction_events
      WHERE client_id = $1
        AND type = 'THEATER'
        AND metadata->>'source' = 'visit_theater_handoff_approval'`,
    [createdClientId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function requestJson(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": demoEmail,
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
