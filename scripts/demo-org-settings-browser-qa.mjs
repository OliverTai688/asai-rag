#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ??
    "docs/06_audits-and-reports/screenshots/launch-readiness/lch-007",
);

const checks = [];
const consoleErrors = [];

mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

try {
  await checkViewport("desktop", { width: 1440, height: 1000 });
  await checkViewport("mobile", { width: 390, height: 844, isMobile: true });
} finally {
  await browser.close();
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

async function checkViewport(label, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`${label}: ${message.text()}`);
    }
  });

  try {
    await context.clearCookies();
    await page.goto(`${baseUrl}/team/settings`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(500);

    await expectText(page, "通訊處設定", `${label} renders org settings title`);
    await expectText(page, "No client details", `${label} renders privacy badge`);
    await expectText(page, "Client Portal", `${label} renders client portal section`);
    await expectText(page, "目前角色可檢視通訊處政策", `${label} renders manager read-only notice`);

    const saveDisabled = await page.getByRole("button", { name: "儲存 org 設定" }).isDisabled();
    push(saveDisabled, `${label} save button is disabled for manager`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    push(!overflow, `${label} has no horizontal overflow`, overflow ? "document overflows horizontally" : "");

    await page.screenshot({ path: resolve(screenshotDir, `org-settings-${label}.png`), fullPage: true });
  } finally {
    await context.close();
  }
}

async function expectText(page, text, label) {
  const count = await page.getByText(text, { exact: false }).count();
  push(count > 0, label, count > 0 ? "" : `${text} not found`);
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
