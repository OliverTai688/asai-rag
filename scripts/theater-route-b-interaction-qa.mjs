#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";
import { buildRouteBHandoffFixture } from "./fixtures/route-b-handoff-fixture.mjs";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/modern-ui/route-b-interaction-stage",
);
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const handoff = buildRouteBHandoffFixture("route_b_interaction_qa");
const checks = [];
const consoleErrors = [];

let createdSessionId = null;

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

mkdirSync(screenshotDir, { recursive: true });

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runProof();
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

async function runProof() {
  const beforeUsageCount = await countTheaterUsageLogs();
  const created = await memberPost("/api/theater/route-b/sessions", { handoff, isDemo: true });

  createdSessionId = created.body?.session?.id ?? null;
  push(created.status === 201 && Boolean(createdSessionId), "Route B interaction QA creates persisted session", `status=${created.status} session=${createdSessionId ?? ""}`);
  push(created.body?.session?.provider?.callAttempted === false, "session create remains no-provider");
  push(created.body?.session?.provider?.usageLogWritten === false, "session create does not fake AiUsageLog");
  pushNoPrivateSentinel(JSON.stringify(created.body), "session create response has no private sentinel");

  if (!createdSessionId) return;

  const unauthWrite = await postJson(`/api/theater/route-b/sessions/${createdSessionId}/turns`, {
    content: "unauth should fail",
    visibilityScope: "GROUP",
  });
  push(unauthWrite.status === 401, "Route B advisor turn unauth returns 401", `status=${unauthWrite.status}`);

  const invalidPrivateWrite = await memberPost(`/api/theater/route-b/sessions/${createdSessionId}/turns`, {
    content: "私聊必須指定對象",
    visibilityScope: "PRIVATE",
  });
  push(invalidPrivateWrite.status === 400, "private Route B advisor turn without addressee returns 400", `status=${invalidPrivateWrite.status}`);

  const groupWrite = await memberPost(`/api/theater/route-b/sessions/${createdSessionId}/turns`, {
    content: "先釐清家庭保障的共同優先順序。",
    visibilityScope: "GROUP",
  });
  push(groupWrite.status === 201, "owner can append group advisor turn", `status=${groupWrite.status}`);
  push(
    groupWrite.body?.turns?.some((turn) => turn.role === "ADVISOR" && turn.visibilityScope === "GROUP" && turn.content.includes("共同優先順序")),
    "group advisor turn is returned in sanitized snapshot",
  );
  pushNoPrivateSentinel(JSON.stringify(groupWrite.body), "group write response has no private sentinel");

  const privateWrite = await memberPost(`/api/theater/route-b/sessions/${createdSessionId}/turns`, {
    content: "私下確認林太太對現金流的底線。",
    visibilityScope: "PRIVATE",
    addresseeRouteBCharacterId: "character_spouse",
    statePatch: {
      targetRouteBCharacterId: "character_spouse",
      summary: "林太太對每月現金流更敏感，需要先確認保費承受區間。",
    },
  });
  const privateTurn = privateWrite.body?.turns?.find((turn) => turn.content.includes("現金流的底線"));
  push(privateWrite.status === 201, "owner can append private advisor turn with state patch", `status=${privateWrite.status}`);
  push(privateTurn?.visibilityScope === "PRIVATE", "private advisor turn persists PRIVATE visibility");
  push(privateTurn?.addresseeRouteBCharacterId === "character_spouse", "private advisor turn persists addressee routeBCharacterId");
  push(privateTurn?.speakerRouteBCharacterId === null, "advisor private turn does not impersonate a character speaker");
  push(privateTurn?.statePatchCount === 1, "private advisor turn carries one state patch proposal");
  push(privateWrite.body?.scene?.statePatchCount === 2, "scene statePatchCount includes appended proposal");
  push(!JSON.stringify(privateWrite.body).includes("\"writesConfirmedCrmFact\":true"), "state patch proposal does not write confirmed CRM fact");
  pushNoPrivateSentinel(JSON.stringify(privateWrite.body), "private write response has no private sentinel");

  const managerWrite = await managerPost(`/api/theater/route-b/sessions/${createdSessionId}/turns`, {
    content: "manager should not append to member-owned Route B session",
    visibilityScope: "GROUP",
  });
  push(managerWrite.status === 404, "manager cannot append advisor turn to member-owned Route B session", `status=${managerWrite.status}`);

  const dbProofAfterApi = await getInteractionDbProof(createdSessionId);
  push(dbProofAfterApi.groupAdvisorTurns >= 1, "DB proof has group advisor turn", JSON.stringify(dbProofAfterApi));
  push(dbProofAfterApi.privateAdvisorTurns === 1, "DB proof has one private advisor turn", JSON.stringify(dbProofAfterApi));
  push(dbProofAfterApi.advisorStatePatchTurns === 1, "DB proof has advisor state patch turn", JSON.stringify(dbProofAfterApi));
  push(dbProofAfterApi.confirmedCrmFactWrites === 0, "DB proof has zero confirmed CRM fact writes", JSON.stringify(dbProofAfterApi));

  const browser = await launchBrowser();
  try {
    await assertInteractiveStage(browser);
  } finally {
    await browser.close();
  }

  const dbProofAfterBrowser = await getInteractionDbProof(createdSessionId);
  push(dbProofAfterBrowser.groupAdvisorTurns >= 2, "browser proof writes an additional group advisor turn", JSON.stringify(dbProofAfterBrowser));

  const afterUsageCount = await countTheaterUsageLogs();
  push(afterUsageCount === beforeUsageCount, "Route B interaction shell writes no fake AiUsageLog", `before=${beforeUsageCount} after=${afterUsageCount}`);
}

async function assertInteractiveStage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoMemberEmail,
    },
  });
  const page = await context.newPage();
  bindConsoleErrors(page);

  try {
    await page.goto(`${baseUrl}/theater/${createdSessionId}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: /多角色劇場/ }).waitFor({ timeout: 30000 });

    const initialDom = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasComposer: text.includes("寫入舞台") && text.includes("狀態對象"),
        hasApiGroupTurn: text.includes("共同優先順序"),
        hasApiPrivateTurn: text.includes("現金流的底線"),
        hasNoFakeUsage: text.includes("usageLogWritten=false"),
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    push(initialDom.hasComposer, "browser stage renders advisor interaction composer");
    push(initialDom.hasApiGroupTurn, "browser stage renders API-appended group turn");
    push(initialDom.hasApiPrivateTurn, "browser stage renders API-appended private turn");
    push(initialDom.hasNoFakeUsage, "browser stage keeps no fake AiUsageLog proof");
    push(!initialDom.hasHorizontalOverflow, "browser stage has no horizontal overflow");

    await page.getByLabel("Route B 顧問訊息").fill("用群聊確認本次會談優先順序。");
    await page.getByLabel("Route B 待確認狀態筆記").fill("林先生對長期保費承諾保持保留，需要下次確認。");
    const writeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/theater/route-b/sessions/${createdSessionId}/turns`) &&
        response.request().method() === "POST",
      { timeout: 30000 },
    );
    await page.getByRole("button", { name: /寫入 Route B 顧問互動/ }).click();
    const writeResponse = await writeResponsePromise;
    push(writeResponse.status() === 201, "browser submit posts advisor turn through Route B API", `status=${writeResponse.status()}`);
    await page.waitForFunction(
      (expectedText) => document.body.innerText.includes(expectedText),
      "用群聊確認本次會談優先順序。",
      { timeout: 30000 },
    );

    const bodyText = await page.locator("body").innerText();
    push(bodyText.includes("用群聊確認本次會談優先順序。"), "browser write refreshes Route B snapshot");
    pushNoPrivateSentinel(bodyText, "browser stage text has no private sentinel");

    await page.screenshot({
      path: resolve(screenshotDir, "route-b-interaction-stage-desktop.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
}

async function getInteractionDbProof(sessionId) {
  const result = await db.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM theater_turns WHERE session_id = $1 AND role = 'AGENT' AND "visibilityScope" = 'GROUP') AS group_advisor_turns,
        (SELECT COUNT(*)::int FROM theater_turns WHERE session_id = $1 AND role = 'AGENT' AND "visibilityScope" = 'PRIVATE' AND addressee_character_id IS NOT NULL) AS private_advisor_turns,
        (SELECT COUNT(*)::int FROM theater_turns WHERE session_id = $1 AND role = 'AGENT' AND state_patches IS NOT NULL) AS advisor_state_patch_turns,
        (SELECT COUNT(*)::int FROM theater_turns WHERE session_id = $1 AND state_patches::text LIKE '%"writesConfirmedCrmFact":true%') AS confirmed_crm_fact_writes
    `,
    [sessionId],
  );
  const row = result.rows[0] ?? {};

  return {
    groupAdvisorTurns: Number(row.group_advisor_turns ?? 0),
    privateAdvisorTurns: Number(row.private_advisor_turns ?? 0),
    advisorStatePatchTurns: Number(row.advisor_state_patch_turns ?? 0),
    confirmedCrmFactWrites: Number(row.confirmed_crm_fact_writes ?? 0),
  };
}

async function postJson(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

function memberPost(path, body) {
  return postJson(path, body, {
    "x-asai-demo-user-email": demoMemberEmail,
  });
}

function managerPost(path, body) {
  return postJson(path, body, {
    "x-asai-demo-user-email": demoManagerEmail,
  });
}

async function countTheaterUsageLogs() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs WHERE module = 'THEATER'");
  return Number(result.rows[0]?.count ?? 0);
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function pushNoPrivateSentinel(text, label) {
  push(
    !text.includes("@") &&
      !/(^|[^\d])09\d{2}[-\s]?\d{3}[-\s]?\d{3}($|[^\d])/.test(text) &&
      !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp", "payment"].some((key) =>
        text.toLowerCase().includes(key.toLowerCase()),
      ),
    label,
  );
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

async function launchBrowser() {
  const preferredChannel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";
  try {
    return await chromium.launch({ channel: preferredChannel });
  } catch (error) {
    if (process.env.PLAYWRIGHT_CHANNEL) throw error;
    return chromium.launch({ channel: "chrome" });
  }
}

function bindConsoleErrors(page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
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
