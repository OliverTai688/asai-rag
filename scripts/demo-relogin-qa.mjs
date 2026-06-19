#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_QA_EMAIL ?? "demo.member@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/launch-readiness/lch-005",
);

const checks = [];
const consoleErrors = [];

mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
  extraHTTPHeaders: {
    "x-asai-demo-user-email": demoEmail,
  },
});

try {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await context.clearCookies();
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await checkPage(page, "/crm", ["王大明"], "crm");
  await checkPage(page, "/crm/c_wang", ["王大明"], "crm-detail");
  await checkPage(page, "/pre-visit", ["王大明"], "pre-visit");
  await checkPage(page, "/reports", ["王大明"], "reports");
  await checkPage(page, "/spin", ["王大明"], "spin");
  await checkPage(page, "/theater", ["AI 劇場演練"], "theater");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  push(!overflow, "No horizontal overflow on final page", overflow ? "final page overflows horizontally" : "");
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

async function checkPage(page, path, expectedTexts, name) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(400);

  for (const text of expectedTexts) {
    const locator = page.getByText(text, { exact: false }).first();
    const count = await locator.count();
    push(count > 0, `${path} contains ${text}`, count > 0 ? "" : "text not found");
  }

  await page.screenshot({ path: resolve(screenshotDir, `${name}.png`), fullPage: true });
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
