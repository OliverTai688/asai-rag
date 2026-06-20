#!/usr/bin/env node
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const managerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ??
    "docs/06_audits-and-reports/screenshots/pim/pim-010-draft-writeback",
);
const checks = [];
const consoleErrors = [];
let apiVisitPlanId = "";
let apiTheaterSessionId = "";

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
} catch (error) {
  push(false, "PIM-010 draft writeback QA crashed", error instanceof Error ? error.message : String(error));
} finally {
  await db.end();
}

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
  const beforeUsageCount = await countAiUsageLogs();
  const unauth = await postJson("/api/ai/interview/sessions/not-found/writebacks", {
    candidateIds: ["confirmed-0"],
    draftTargets: ["VISIT_PLAN_DRAFT"],
  });
  push(unauth.status === 401, "draft writeback unauth returns 401", `status=${unauth.status}`);

  const unique = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const client = await createClient(`PIM-010 草稿客戶 ${unique}`, `pim010-${unique}@asai.local`);
  if (!client?.id) return;

  await db.query(`UPDATE clients SET sensitivity = 'HIGHLY_SENSITIVE' WHERE id = $1`, [client.id]);

  const sessionId = await createInterviewSession(client.id, unique);
  if (!sessionId) return;

  await appendTurn(sessionId, "我確認客戶希望先釐清退休現金流是否足夠。");
  await appendTurn(sessionId, "他可能擔心家庭保費預算壓力，但這只是目前推論。");
  await appendTurn(sessionId, "我不確定哪位家人會一起參與下一次決策。");

  const reflection = await postJson(
    `/api/ai/interview/sessions/${sessionId}/reflections/generate`,
    { currentSegmentId: "current-situation" },
    demoEmail,
  );
  push(reflection.status === 201, "member generates deterministic reflection before draft writeback", `status=${reflection.status}`);

  const preview = await getJson(`/api/ai/interview/sessions/${sessionId}/writebacks`, demoEmail);
  const candidates = Array.isArray(preview.body?.candidates) ? preview.body.candidates : [];
  const candidateIds = candidates
    .filter((candidate) => ["CONFIRMED_FACT", "INFERENCE", "UNKNOWN"].includes(candidate.kind))
    .slice(0, 6)
    .map((candidate) => candidate.id);
  push(preview.status === 200 && candidateIds.length >= 2, "writeback preview returns selectable materials", `status=${preview.status} candidates=${candidateIds.length}`);

  const manager = await postJson(
    `/api/ai/interview/sessions/${sessionId}/writebacks`,
    {
      candidateIds,
      draftTargets: ["VISIT_PLAN_DRAFT"],
    },
    managerEmail,
  );
  push(manager.status === 404, "manager cannot use member-owned interview draft writeback", `status=${manager.status}`);

  const blocked = await postJson(
    `/api/ai/interview/sessions/${sessionId}/writebacks`,
    {
      candidateIds,
      draftTargets: ["VISIT_PLAN_DRAFT", "THEATER_BUILD_DRAFT"],
    },
    demoEmail,
  );
  push(blocked.status === 201, "high-sensitive draft request returns boundary result", `status=${blocked.status}`);
  push(
    blocked.body?.createdDrafts?.length === 0 &&
      blocked.body?.draftBlocked?.length === 2,
    "high-sensitive draft is blocked without reason/riskAccepted",
    `blocked=${blocked.body?.draftBlocked?.length ?? 0}`,
  );

  const approved = await postJson(
    `/api/ai/interview/sessions/${sessionId}/writebacks`,
    {
      candidateIds,
      approvals: candidateIds.map((candidateId) => ({
        candidateId,
        reason: "PIM-010 QA 明確確認此素材只用於準備包與劇場草稿。",
        riskAccepted: true,
      })),
      draftTargets: ["VISIT_PLAN_DRAFT", "THEATER_BUILD_DRAFT"],
      draftApproval: {
        reason: "PIM-010 QA 明確確認高敏感客戶只建立內部草稿，不寫成 CRM confirmed fact。",
        riskAccepted: true,
      },
    },
    demoEmail,
  );
  const approvedText = JSON.stringify(approved.body);
  const visitDraft = approved.body?.createdDrafts?.find((draft) => draft.target === "VISIT_PLAN_DRAFT");
  const theaterDraft = approved.body?.createdDrafts?.find((draft) => draft.target === "THEATER_BUILD_DRAFT");
  apiVisitPlanId = visitDraft?.id ?? "";
  apiTheaterSessionId = theaterDraft?.id ?? "";
  push(approved.status === 201, "approved draft writeback returns 201", `status=${approved.status}`);
  push(Boolean(apiVisitPlanId && visitDraft?.href?.startsWith("/pre-visit/")), "approved writeback creates VisitPlan draft", `visit=${apiVisitPlanId}`);
  push(Boolean(apiTheaterSessionId && theaterDraft?.href?.startsWith("/theater/")), "approved writeback creates Route B theater draft", `theater=${apiTheaterSessionId}`);
  pushNoPrivateSentinel(approvedText, "draft writeback response has no raw private sentinel");

  const proof = await getDbProof(apiVisitPlanId, apiTheaterSessionId, sessionId);
  push(proof.visitPlanCount === 1, "DB proof has one VisitPlan draft", JSON.stringify(proof));
  push(proof.visitQuestionCount >= 3, "DB proof keeps visit reasoning questions", JSON.stringify(proof));
  push(proof.theaterSessionCount === 1, "DB proof has one Route B theater session", JSON.stringify(proof));
  push(proof.theaterCharacterCount <= 4 && proof.theaterCharacterCount >= 1, "Route B theater draft keeps NPC count <= 4", JSON.stringify(proof));
  push(proof.confirmedCrmFactWrites === 0, "DB proof: draft writeback does not create confirmed CRM fact", JSON.stringify(proof));

  const afterUsageCount = await countAiUsageLogs();
  push(afterUsageCount === beforeUsageCount, "no-provider proof: AiUsageLog count unchanged", `before=${beforeUsageCount} after=${afterUsageCount}`);
}

async function runBrowserProof() {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();
  attachConsole(page, "desktop");

  try {
    const client = await createClient(`PIM-010 Browser ${Date.now().toString(36)}`, "");
    if (!client?.id) {
      push(false, "browser proof has client id");
      return;
    }

    await page.goto(`${baseUrl}/interview`, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator("#interview-client-select").selectOption(client.id);
    await page.getByRole("button", { name: "開始陪談" }).click();
    await expectText(page, "已連結 CRM", "browser creates DB-backed interview session");

    await page.getByPlaceholder(/輸入業務員/).fill("我確認客戶想先釐清退休金缺口。");
    await page.getByRole("button", { name: "送出回答" }).click();
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "整理面板" }).click();
    await page.getByRole("button", { name: "產生確認卡" }).click();
    await expectText(page, "建立準備包草稿", "browser shows VisitPlan draft action");
    await expectText(page, "建立劇場草稿", "browser shows theater draft action");

    const candidateCheckbox = page.locator('[data-testid^="confirmation-candidate-"]').first();
    await candidateCheckbox.waitFor({ state: "visible", timeout: 30000 });
    await candidateCheckbox.check();
    await page.getByRole("button", { name: "建立準備包草稿" }).click();
    await page.waitForURL(/\/pre-visit\/[^/]+$/, { timeout: 60000 });
    await page.getByRole("heading", { name: /拜訪準備包/ }).waitFor({ timeout: 30000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!overflow, "browser-created VisitPlan detail has no horizontal overflow");
    await page.screenshot({ path: resolve(screenshotDir, "pim-010-visit-draft-desktop.png"), fullPage: true });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function createClient(name, email) {
  const unique = Date.now().toString(36);
  const response = await postJson(
    "/api/clients",
    {
      name,
      email: email || `pim010-browser-${unique}@asai.local`,
      phone: "0912-345-678",
      birthDate: "1988-08-08",
      occupation: "PIM-010 QA",
      annualIncome: 1200000,
      status: "PROSPECT",
    },
    demoEmail,
  );

  push(response.status === 201 && typeof response.body?.client?.id === "string", "member creates QA client", `status=${response.status}`);
  return response.body?.client;
}

async function createInterviewSession(clientId, unique) {
  const response = await postJson(
    "/api/ai/interview/sessions",
    {
      clientId,
      interviewKind: "ADVISOR_COMPANION",
      outlineId: "advisor-companion-v1",
      currentSegmentId: "current-situation",
      title: `PIM-010 QA ${unique}`,
    },
    demoEmail,
  );
  const sessionId = response.body?.session?.id;
  push(response.status === 201 && typeof sessionId === "string", "member creates client-bound interview session", `status=${response.status}`);
  return sessionId;
}

async function appendTurn(sessionId, content) {
  const response = await postJson(
    `/api/ai/interview/sessions/${sessionId}/turns`,
    {
      role: "USER",
      modality: "TEXT",
      content,
      transcriptFinal: true,
      outlineSegmentId: "current-situation",
    },
    demoEmail,
  );
  push(response.status === 201, `append interview turn: ${content.slice(0, 18)}`, `status=${response.status}`);
}

async function getDbProof(visitPlanId, theaterSessionId, interviewSessionId) {
  const result = await db.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM visit_plans WHERE id = $1) AS visit_plan_count,
        (SELECT jsonb_array_length(COALESCE(spin_questions::jsonb, '[]'::jsonb))::int FROM visit_plans WHERE id = $1) AS visit_question_count,
        (SELECT COUNT(*)::int FROM theater_sessions WHERE id = $2 AND route_b_enabled = true) AS theater_session_count,
        (SELECT COUNT(*)::int FROM theater_characters WHERE session_id = $2) AS theater_character_count,
        (
          SELECT COUNT(*)::int
          FROM interaction_events
          WHERE metadata->>'sessionId' = $3
            AND metadata->>'source' = 'interview_confirmation_card'
            AND metadata->>'confirmedCrmFactWrite' = 'true'
        ) AS confirmed_crm_fact_writes
    `,
    [visitPlanId || "missing", theaterSessionId || "missing", interviewSessionId],
  );
  const row = result.rows[0] ?? {};

  return {
    visitPlanCount: Number(row.visit_plan_count ?? 0),
    visitQuestionCount: Number(row.visit_question_count ?? 0),
    theaterSessionCount: Number(row.theater_session_count ?? 0),
    theaterCharacterCount: Number(row.theater_character_count ?? 0),
    confirmedCrmFactWrites: Number(row.confirmed_crm_fact_writes ?? 0),
  };
}

async function countAiUsageLogs() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs");
  return Number(result.rows[0]?.count ?? 0);
}

async function postJson(path, body, userEmail) {
  return requestJson(path, {
    method: "POST",
    body,
    userEmail,
  });
}

async function getJson(path, userEmail) {
  return requestJson(path, {
    method: "GET",
    userEmail,
  });
}

async function requestJson(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...(options.userEmail ? { "x-asai-demo-user-email": options.userEmail } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }

  return {
    status: response.status,
    body,
    text,
  };
}

function attachConsole(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`${label}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(`${label}: ${error.message}`));
}

async function expectText(page, text, label) {
  await page.getByText(text, { exact: false }).waitFor({ state: "visible", timeout: 30000 });
  push(true, label);
}

function pushNoPrivateSentinel(text, label) {
  push(
    !text.includes("@") &&
      !/09\d{2}/.test(text) &&
      !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp", "payment"].some((key) =>
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
