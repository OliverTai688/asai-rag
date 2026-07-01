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
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/modern-ui/route-b-session-stage",
);
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const handoff = buildRouteBHandoffFixture("route_b_session_ui_qa");
const checks = [];
const consoleErrors = [];

let db = null;
let createdSessionId = null;

mkdirSync(screenshotDir, { recursive: true });

if (dbUrl) {
  db = new PgClient({ connectionString: dbUrl });
  await db.connect();
}

try {
  await runProof();
} finally {
  if (db) await db.end();
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
  push(created.status === 201 && Boolean(createdSessionId), "Route B session UI QA creates persisted session", `status=${created.status} session=${createdSessionId ?? ""}`);
  push(created.body?.session?.provider?.callAttempted === false, "session create remains no-provider");
  push(created.body?.session?.provider?.usageLogWritten === false, "session create does not fake AiUsageLog");
  pushNoPrivateSentinel(JSON.stringify(created.body), "session create response has no private sentinel");

  if (!createdSessionId) return;

  const managerRead = await managerGet(`/api/theater/route-b/sessions/${createdSessionId}`);
  push(managerRead.status === 404, "manager cannot read member-owned Route B session before UI proof", `status=${managerRead.status}`);

  const browser = await launchBrowser();
  try {
    await assertStageViewport(browser, "desktop", { width: 1440, height: 1000, isMobile: false });
    await assertStageViewport(browser, "mobile", { width: 390, height: 844, isMobile: true });
  } finally {
    await browser.close();
  }

  const afterUsageCount = await countTheaterUsageLogs();
  if (beforeUsageCount !== null && afterUsageCount !== null) {
    push(afterUsageCount === beforeUsageCount, "Route B session UI proof writes no fake AiUsageLog", `before=${beforeUsageCount} after=${afterUsageCount}`);
  } else {
    push(true, "AiUsageLog DB count skipped because DIRECT_URL/DATABASE_URL is unavailable");
  }
}

async function assertStageViewport(browser, viewportName, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: viewport.isMobile,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoMemberEmail,
    },
  });
  const page = await context.newPage();
  bindConsoleErrors(page);

  try {
    await page.goto(`${baseUrl}/theater/${createdSessionId}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: /多角色劇場/ }).waitFor({ timeout: 30000 });

    const checksFromDom = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasRouteB: text.includes("Route B"),
        hasRelationshipStageMap: text.includes("客戶關係舞台") && /relationship\s+stage\s+map/i.test(text),
        hasGroupLane: text.includes("群聊"),
        hasPrivateLane: text.includes("私聊"),
        hasFocusCharacter: text.includes("林先生"),
        hasDecisionMaker: text.includes("林太太"),
        hasProviderGuard: text.includes("guarded-disabled"),
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    push(checksFromDom.hasRouteB, `${viewportName} stage renders Route B label`);
    push(checksFromDom.hasRelationshipStageMap, `${viewportName} stage renders relationship stage map`);
    push(checksFromDom.hasGroupLane, `${viewportName} stage renders group-chat lane`);
    push(checksFromDom.hasPrivateLane, `${viewportName} stage renders private-chat lane`);
    push(checksFromDom.hasFocusCharacter && checksFromDom.hasDecisionMaker, `${viewportName} stage renders focus and decision-maker characters`);
    push(checksFromDom.hasProviderGuard, `${viewportName} stage renders guarded-disabled provider proof`);
    push(!checksFromDom.hasHorizontalOverflow, `${viewportName} stage has no horizontal overflow`);

    await page.getByRole("button", { name: "關係證據" }).click();
    const openPopover = page.locator('[data-slot="popover-content"][data-open]');
    const relationshipEvidenceText = await openPopover.innerText({ timeout: 10000 });
    const hasRelationshipEvidence =
      relationshipEvidenceText.includes("關係證據") &&
      relationshipEvidenceText.includes("林先生與林太太是共同決策關係。") &&
      relationshipEvidenceText.includes("factStatus") &&
      relationshipEvidenceText.includes("visibilityScope");
    push(hasRelationshipEvidence, `${viewportName} stage renders relationship evidence in icon popover`);
    push(!(await hasHorizontalOverflow(page)), `${viewportName} relationship evidence popover has no horizontal overflow`);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Provider guard" }).first().click();
    const providerProofText = await openPopover.innerText({ timeout: 10000 });
    const hasNoFakeUsage = /usageLogWritten\s+false/.test(providerProofText);
    const hasProviderCallProof = /providerCallAttempted\s+false/.test(providerProofText);
    const hasStateProposalBoundary =
      /requiresConfirmation\s+true/.test(providerProofText) &&
      /writesConfirmedCrmFact\s+false/.test(providerProofText);
    const hasVisibilityProof =
      providerProofText.includes("Scoped turn columns") &&
      providerProofText.includes("Owner read") &&
      /Raw provider payload\s+false/.test(providerProofText);
    push(hasProviderCallProof, `${viewportName} stage renders provider no-call proof in icon popover`);
    push(hasNoFakeUsage, `${viewportName} stage renders no fake AiUsageLog proof in icon popover`);
    push(hasStateProposalBoundary, `${viewportName} stage renders state proposal write boundary in icon popover`);
    push(hasVisibilityProof, `${viewportName} stage renders visibility proof in icon popover`);
    push(!(await hasHorizontalOverflow(page)), `${viewportName} provider guard popover has no horizontal overflow`);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "下一回合預覽" }).click();
    const nextTurnPreviewText = await openPopover.innerText({ timeout: 10000 });
    push(nextTurnPreviewText.includes("下一回合預覽"), `${viewportName} next-turn preview opens from icon popover`);
    push(!(await hasHorizontalOverflow(page)), `${viewportName} next-turn preview popover has no horizontal overflow`);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "進階" }).click();
    const advancedDrawer = page.locator('[data-theater-advanced-drawer="true"]');
    await advancedDrawer.waitFor({ state: "visible", timeout: 10000 });
    const advancedText = await advancedDrawer.innerText();
    push(
      advancedText.includes("進階面板") && Boolean(await page.locator('[data-route-b-advanced-tabs="true"]').count()),
      `${viewportName} advanced sheet opens icon-tab focused panel`,
    );
    for (const tabLabel of ["來源證據", "質化回饋", "合規紅線", "舞台脈絡"]) {
      await page.getByRole("tab", { name: tabLabel }).click();
      push(!(await hasHorizontalOverflow(page)), `${viewportName} advanced ${tabLabel} tab has no horizontal overflow`);
      if (tabLabel === "來源證據") {
        const sourceBrowser = page.locator('[data-route-b-source-browser="true"]');
        await sourceBrowser.waitFor({ state: "visible", timeout: 10000 });
        push(await sourceBrowser.isVisible(), `${viewportName} source evidence tab renders single source browser`);
        let visibleSourceTabCount = 0;
        for (const sourceLabel of ["會議訊號", "人物 profile", "關係邊"]) {
          const sourceTab = page.getByRole("tab", { name: sourceLabel });
          if ((await sourceTab.count()) === 0) continue;
          visibleSourceTabCount += 1;
          await sourceTab.click();
          push(!(await hasHorizontalOverflow(page)), `${viewportName} source browser ${sourceLabel} view has no horizontal overflow`);
        }
        push(visibleSourceTabCount > 0, `${viewportName} source browser exposes at least one source tab`);
      }
      if (tabLabel === "質化回饋") {
        const reviewBrowser = page.locator('[data-route-b-review-browser="true"]');
        await reviewBrowser.waitFor({ state: "visible", timeout: 10000 });
        push(await reviewBrowser.isVisible(), `${viewportName} review tab renders single review browser`);
        for (const reviewLabel of ["五視角回顧", "待審閱候選"]) {
          await page.getByRole("tab", { name: reviewLabel }).click();
          push(!(await hasHorizontalOverflow(page)), `${viewportName} review browser ${reviewLabel} view has no horizontal overflow`);
        }
      }
      if (tabLabel === "合規紅線") {
        const redLineBrowser = page.locator('[data-route-b-red-line-browser="true"]');
        await redLineBrowser.waitFor({ state: "visible", timeout: 10000 });
        push(await redLineBrowser.isVisible(), `${viewportName} risk tab renders single red-line browser`);
        const firstRuleTab = redLineBrowser.getByRole("tab").first();
        if ((await firstRuleTab.count()) > 0) {
          await firstRuleTab.click();
          push(!(await hasHorizontalOverflow(page)), `${viewportName} red-line browser first rule view has no horizontal overflow`);
        }
      }
      if (tabLabel === "舞台脈絡") {
        const contextBrowser = page.locator('[data-route-b-context-browser="true"]');
        await contextBrowser.waitFor({ state: "visible", timeout: 10000 });
        push(await contextBrowser.isVisible(), `${viewportName} context tab renders single context browser`);
        let visibleContextTabCount = 0;
        for (const contextLabel of ["Provider guard", "導演開場", "關係脈絡", "旁白補問", "可見性規則"]) {
          const contextTab = contextBrowser.getByRole("tab", { name: contextLabel });
          if ((await contextTab.count()) === 0) continue;
          visibleContextTabCount += 1;
          await contextTab.click();
          push(!(await hasHorizontalOverflow(page)), `${viewportName} context browser ${contextLabel} view has no horizontal overflow`);
        }
        push(visibleContextTabCount > 0, `${viewportName} context browser exposes icon tabs`);
      }
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    await page.getByRole("button", { name: /與 林太太 私聊/ }).click();
    await page.getByRole("button", { name: "Route B 發話設定" }).click();
    const advisorSettings = page.locator('[data-route-b-composer-settings="advisor"]');
    await advisorSettings.waitFor({ state: "visible", timeout: 10000 });
    push(await advisorSettings.isVisible(), `${viewportName} composer settings opens scoped controls popover`);
    const scopeSelect = advisorSettings.getByLabel("選擇 Route B 發話範圍");
    const addresseeSelect = advisorSettings.getByLabel("選擇 Route B 私聊對象");
    await addresseeSelect.waitFor({ state: "visible", timeout: 10000 });
    push((await scopeSelect.inputValue()) === "PRIVATE", `${viewportName} stage-map character click switches composer to private`);
    push((await addresseeSelect.inputValue()) === "character_spouse", `${viewportName} stage-map character click selects decision-maker addressee`);
    push(!(await hasHorizontalOverflow(page)), `${viewportName} composer settings popover has no horizontal overflow`);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Comment" }).click();
    await page.getByRole("button", { name: "Route B comment 設定" }).click();
    const commentSettings = page.locator('[data-route-b-composer-settings="comment"]');
    await commentSettings.waitFor({ state: "visible", timeout: 10000 });
    push(await commentSettings.isVisible(), `${viewportName} comment settings opens scoped controls popover`);
    push(
      (await commentSettings.getByLabel("選擇 Route B comment 注記範圍").count()) === 1 &&
        (await commentSettings.getByLabel("選擇 Route B comment 注記對象").count()) === 1,
      `${viewportName} comment settings keeps annotation controls in popover`,
    );
    push(!(await hasHorizontalOverflow(page)), `${viewportName} comment settings popover has no horizontal overflow`);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "對話模式" }).click();

    const guardedButton = page.getByRole("button", { name: /待 provider proof/ }).first();
    push(await guardedButton.isDisabled(), `${viewportName} provider action is disabled until usage-log proof exists`);

    const bodyText = await page.locator("body").innerText();
    pushNoPrivateSentinel(bodyText, `${viewportName} stage text has no private sentinel`);
    await page.waitForTimeout(200);

    await page.screenshot({
      path: resolve(screenshotDir, `route-b-session-stage-${viewportName}.png`),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

async function memberPost(path, body) {
  return postJson(path, body, {
    "x-asai-demo-user-email": demoMemberEmail,
  });
}

async function managerGet(path) {
  return getJson(path, {
    "x-asai-demo-user-email": demoManagerEmail,
  });
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

async function getJson(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers,
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function countTheaterUsageLogs() {
  if (!db) return null;
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs WHERE module = 'THEATER'");
  return Number(result.rows[0]?.count ?? 0);
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function pushNoPrivateSentinel(text, label) {
  push(
    !text.includes("@") &&
      !/(^|\D)09\d{8}(\D|$)/.test(text) &&
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
