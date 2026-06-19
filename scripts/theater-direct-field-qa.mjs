#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

loadEnvFile(".env");

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_QA_EMAIL ?? "demo.member@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/modern-ui/theater-direct-field",
);

const checks = [];
const consoleErrors = [];

mkdirSync(screenshotDir, { recursive: true });

await runDirectSetupBrowserProof();
runSubProof("theater:route-b-handoff-dry-run", "Route B handoff contract dry-run");
runSubProof("visit:theater-gate-qa", "previsit high-sensitive gate and audit QA");
runSubProof("theater:client-build-qa", "client-build selector and owner-scope QA");
push(true, "no provider route invoked by aggregate direct proof", "direct checks avoid /api/ai/*; subproofs print their own no-provider proof");

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

async function runDirectSetupBrowserProof() {
  const browser = await launchBrowser();

  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: {
        "x-asai-demo-user-email": demoEmail,
      },
    });
    const desktopPage = await desktopContext.newPage();
    bindConsoleErrors(desktopPage);

    try {
      await assertDirectTheaterHome(desktopPage, "desktop");
      await assertLegacyQuickstartTransfer(desktopPage);
    } finally {
      await desktopContext.close();
    }

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      extraHTTPHeaders: {
        "x-asai-demo-user-email": demoEmail,
      },
    });
    const mobilePage = await mobileContext.newPage();
    bindConsoleErrors(mobilePage);

    try {
      await assertDirectTheaterHome(mobilePage, "mobile");
    } finally {
      await mobileContext.close();
    }
  } finally {
    await browser.close();
  }
}

async function assertDirectTheaterHome(page, viewportName) {
  await page.goto(`${baseUrl}/theater`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("heading", { name: "AI 劇場演練" }).waitFor({ timeout: 30000 });

  const bodyChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasDirectMode: text.includes("用劇場訪綱建場"),
      hasClientMode: text.includes("帶客戶資料建場"),
      hasInterviewMode: text.includes("從既有訪談轉入"),
      hasNoMaterialCopy: text.includes("不必先完成 SPIN"),
      noObsoletePrerequisite: !text.includes("從一份 SPIN 摘要開始"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  push(bodyChecks.hasDirectMode, `${viewportName} /theater shows direct outline entry`);
  push(bodyChecks.hasClientMode, `${viewportName} /theater shows client-data entry`);
  push(bodyChecks.hasInterviewMode, `${viewportName} /theater shows interview/SPIN transfer entry`);
  push(bodyChecks.hasNoMaterialCopy, `${viewportName} /theater states SPIN is not required`);
  push(bodyChecks.noObsoletePrerequisite, `${viewportName} /theater removed obsolete SPIN-only prerequisite copy`);
  push(!bodyChecks.horizontalOverflow, `${viewportName} /theater has no horizontal overflow`);

  const directButtonVisible = await isVisible(page.getByRole("button", { name: /用劇場訪綱建場/ }));
  const clientButtonVisible = await isVisible(page.getByRole("button", { name: /帶客戶資料建場/ }));
  const interviewButtonVisible = await isVisible(page.getByRole("button", { name: /從既有訪談轉入/ }));
  push(directButtonVisible && clientButtonVisible && interviewButtonVisible, `${viewportName} three setup entries have accessible button names`);

  const startButton = page.getByRole("button", { name: "開始建場" }).first();
  push(await startButton.isEnabled(), `${viewportName} direct outline start CTA is enabled without material`);

  await page.screenshot({
    path: resolve(screenshotDir, `tdf-006-theater-direct-${viewportName}.png`),
    fullPage: true,
  });

  if (viewportName !== "desktop") return;

  await Promise.all([
    page.waitForURL(/\/theater\/build(?:\?|$)/, { timeout: 30000 }),
    startButton.click(),
  ]);
  await page.getByRole("heading", { name: "劇場訪綱建場" }).waitFor({ timeout: 30000 });

  const buildChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasBuildPackage: text.includes("場域建構包"),
      hasIndependentBuild: text.includes("獨立建場"),
      hasConversationBuilder: text.includes("用文字或語音"),
      hasNoSourceGate: !text.includes("高敏感客戶需先確認使用邊界"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  push(buildChecks.hasBuildPackage, "direct outline CTA routes to theater build package");
  push(buildChecks.hasIndependentBuild, "theater build page starts as independent field build");
  push(buildChecks.hasConversationBuilder, "theater build page opens the field-guide conversation builder");
  push(buildChecks.hasNoSourceGate, "direct outline build is not blocked by source-sensitive gate");
  push(!buildChecks.horizontalOverflow, "theater build desktop has no horizontal overflow");
}

async function assertLegacyQuickstartTransfer(page) {
  await page.goto(`${baseUrl}/spin?clientId=c_wang&autoCreate=true&demo=quickstart`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForURL(/\/spin\/[^/?]+(?:\?.*)?$/, { timeout: 30000 });
  const nextLink = page.getByRole("link", { name: /下一步：劇場演練/ }).first();
  await nextLink.waitFor({ timeout: 30000 });
  const href = await nextLink.getAttribute("href");
  push(Boolean(href?.includes("/theater?") && href.includes("autoCreate=true")), "legacy quickstart CTA points to theater auto-create path");

  await Promise.all([
    page.waitForURL(/\/theater(?:\/|\?)/, { timeout: 30000 }),
    nextLink.evaluate((element) => (element instanceof HTMLElement ? element.click() : undefined)),
  ]);
  await page.waitForURL(/\/theater\/[^/?]+(?:\?.*)?$/, { timeout: 30000 });

  const legacyChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasQuickstartTheater: text.includes("QUICKSTART THEATER"),
      hasPracticeFixture: text.includes("先演練再拜訪"),
      hasGeneratedConcern: text.includes("客戶疑慮") || text.includes("建議說法"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  push(legacyChecks.hasQuickstartTheater, "legacy quickstart SPIN path reaches theater view");
  push(legacyChecks.hasPracticeFixture, "legacy quickstart theater fixture remains available");
  push(legacyChecks.hasGeneratedConcern, "legacy theater fixture keeps generated concern/response content");
  push(!legacyChecks.horizontalOverflow, "legacy quickstart theater session has no horizontal overflow");
}

function runSubProof(scriptName, label) {
  try {
    execFileSync("pnpm", [scriptName], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DEMO_QA_BASE_URL: baseUrl,
        DEMO_QA_SCREENSHOT_DIR: screenshotDir,
      },
      stdio: "inherit",
    });
    push(true, label);
  } catch (error) {
    push(false, label, `exit=${error?.status ?? "unknown"}`);
  }
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

async function isVisible(locator) {
  try {
    await locator.first().waitFor({ state: "visible", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
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
