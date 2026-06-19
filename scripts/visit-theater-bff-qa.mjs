#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_QA_EMAIL ?? "demo.member@asai.local";
const visitPlanId = process.env.DEMO_QA_VISIT_PLAN_ID ?? "demo_visit_wang_add_on";
const clientId = process.env.DEMO_QA_CLIENT_ID ?? "c_wang";
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-visit-theater-bff",
);

const checks = [];
const consoleErrors = [];

mkdirSync(screenshotDir, { recursive: true });

await runApiProof();
await runBrowserProof();

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
  const unauth = await fetch(`${baseUrl}/api/visits/${visitPlanId}/theater-handoff`);
  const unauthPayload = await readJson(unauth);
  push(unauth.status === 401, "handoff unauth returns 401", `status=${unauth.status} error=${unauthPayload?.error ?? ""}`);

  const missing = await fetch(`${baseUrl}/api/visits/not-a-real-plan/theater-handoff`, {
    headers: { "x-asai-demo-user-email": demoEmail },
  });
  const missingPayload = await readJson(missing);
  push(missing.status === 404, "handoff missing plan returns 404", `status=${missing.status} error=${missingPayload?.error ?? ""}`);

  const ok = await fetch(`${baseUrl}/api/visits/${visitPlanId}/theater-handoff`, {
    headers: { "x-asai-demo-user-email": demoEmail },
  });
  const payload = await readJson(ok);
  const serialized = JSON.stringify(payload);
  push(ok.status === 200, "handoff demo visit returns 200", `status=${ok.status}`);
  push(payload?.handoff?.status === "READY", "handoff status is READY", `status=${payload?.handoff?.status ?? ""}`);
  push((payload?.handoff?.knownMaterials?.length ?? 0) >= 8, "handoff has grounded materials", `count=${payload?.handoff?.knownMaterials?.length ?? 0}`);
  push(payload?.client?.name === "王大明", "handoff returns expected client summary", `client=${payload?.client?.name ?? ""}`);
  push(payload?.visitPlan?.id === visitPlanId, "handoff returns expected visit plan id", `visitPlan=${payload?.visitPlan?.id ?? ""}`);
  push(!serialized.includes("@") && !/09\d{2}/.test(serialized), "handoff response has no email/phone sentinel");
  push(
    !["rawPayload", "cookie", "secret", "authorization"].some((key) => serialized.toLowerCase().includes(key.toLowerCase())),
    "handoff response has no raw private sentinel",
  );
}

async function runBrowserProof() {
  const browser = await chromium.launch({ channel: "msedge" });
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
    await page.goto(`${baseUrl}/theater/build?clientId=${clientId}&visitPlanId=${visitPlanId}&source=previsit`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("heading", { name: "劇場訪綱建場" }).waitFor({ timeout: 30000 });

    const visibleChecks = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasTitle: text.includes("劇場訪綱建場"),
        hasHandoffNotice: text.includes("準備包已帶入"),
        hasClientName: text.includes("王大明"),
        hasVisitIntro: text.includes("已讀取「王大明」的拜訪準備包"),
        hasNoRawIdWorkflow: !text.includes("demo_visit_wang_add_on"),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    push(visibleChecks.hasTitle, "browser renders theater build title");
    push(visibleChecks.hasHandoffNotice, "browser renders visit handoff notice");
    push(visibleChecks.hasClientName, "browser renders client name");
    push(visibleChecks.hasVisitIntro, "browser renders visit package opening");
    push(visibleChecks.hasNoRawIdWorkflow, "browser does not expose raw visit plan id");
    push(!visibleChecks.horizontalOverflow, "desktop has no horizontal overflow");

    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-theater-build-visit-handoff-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    push(!mobileOverflow, "mobile has no horizontal overflow");
    await page.screenshot({
      path: resolve(screenshotDir, "2026-06-20-theater-build-visit-handoff-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}
