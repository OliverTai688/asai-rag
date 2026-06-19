#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ??
    "docs/06_audits-and-reports/screenshots/pim/pim-008-writeback",
);
const checks = [];
const consoleErrors = [];

mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

try {
  await checkDesktopFlow();
  await checkMobileLayout();
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

async function checkDesktopFlow() {
  const context = await newContext({ width: 1440, height: 1000 });
  const page = await context.newPage();
  attachConsole(page, "desktop");

  try {
    const client = await createClient("desktop");
    await page.goto(`${baseUrl}/interview`, { waitUntil: "networkidle", timeout: 60000 });
    await expectText(page, "段落確認卡", "desktop renders confirmation card");
    await page.locator("#interview-client-select").selectOption(client.id);
    await page.getByRole("button", { name: "開始陪談" }).click();
    await expectText(page, "已建立 DB-backed 訪談", "desktop creates DB-backed session from selector");

    await page.getByPlaceholder("輸入業務員的回答...").fill("我確認客戶醫療保障缺口需要在下次會議先釐清。");
    await page.getByRole("button", { name: "送出", exact: true }).click();
    await page.waitForTimeout(2500);

    await page.getByRole("button", { name: "產生確認卡" }).click();
    await expectText(page, "CRM 候選", "desktop confirmation card shows CRM candidate");
    const candidateCheckbox = page.locator('[data-testid^="confirmation-candidate-"]').first();
    await candidateCheckbox.waitFor({ state: "visible", timeout: 30000 });
    await candidateCheckbox.check();
    push(true, "desktop candidate can be checked");
    await page.getByRole("button", { name: "保存" }).click();
    await expectText(page, "阻擋 1 筆", "desktop blocks high-sensitivity save without approval");

    await page.getByLabel(/高敏感寫回理由/).fill("業務員確認此醫療保障資訊可作為下次會議準備候選。");
    await page.getByRole("button", { name: "保存" }).click();
    await expectText(page, "已建立 1 筆互動事件", "desktop saves approved confirmation event");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    push(!overflow, "desktop has no horizontal overflow", overflow ? "document overflows horizontally" : "");
    await page.screenshot({ path: resolve(screenshotDir, "pim-008-interview-desktop.png"), fullPage: true });
  } finally {
    await context.close();
  }
}

async function checkMobileLayout() {
  const context = await newContext({ width: 390, height: 844, isMobile: true });
  const page = await context.newPage();
  attachConsole(page, "mobile");

  try {
    await page.goto(`${baseUrl}/interview`, { waitUntil: "networkidle", timeout: 60000 });
    await expectText(page, "段落確認卡", "mobile renders confirmation card");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    push(!overflow, "mobile has no horizontal overflow", overflow ? "document overflows horizontally" : "");
    await page.screenshot({ path: resolve(screenshotDir, "pim-008-interview-mobile.png"), fullPage: true });
  } finally {
    await context.close();
  }
}

async function newContext(viewport) {
  return browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
}

async function createClient(label) {
  const unique = `${label}-${Date.now().toString(36)}`;
  const response = await fetch(`${baseUrl}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-asai-demo-user-email": demoEmail,
    },
    body: JSON.stringify({
      name: `PIM-008 Browser ${unique}`,
      email: `pim008-browser-${unique}@asai.local`,
      phone: "0912-345-678",
      birthDate: "1988-08-08",
      occupation: "確認卡瀏覽器驗證",
      annualIncome: 1200000,
      status: "PROSPECT",
    }),
  });
  const body = await response.json();

  if (!response.ok || typeof body.client?.id !== "string") {
    throw new Error(`Unable to create browser QA client: ${response.status}`);
  }

  return body.client;
}

function attachConsole(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`${label}: ${message.text()}`);
    }
  });
}

async function expectText(page, text, label) {
  await page.getByText(text, { exact: false }).waitFor({ state: "visible", timeout: 30000 });
  push(true, label);
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
