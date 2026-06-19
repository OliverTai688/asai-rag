#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
const shareToken = process.env.CLIENT_PORTAL_QA_TOKEN ?? "demo-share-wang";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_FULL_SMOKE_SCREENSHOT_DIR ??
    "docs/06_audits-and-reports/screenshots/launch-readiness/lch-009/full-smoke",
);
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

mkdirSync(screenshotDir, { recursive: true });

const db = new Client({ connectionString: dbUrl });
await db.connect();

try {
  const beforeUsage = await getCurrentMonthUsageCount();
  const commands = [
    {
      surface: "front_office",
      label: "Public pricing DB-backed API QA",
      script: "scripts/public-pricing-qa.mjs",
    },
    {
      surface: "member_admin",
      label: "Member admin empty-storage relogin QA",
      script: "scripts/demo-relogin-qa.mjs",
      env: {
        DEMO_QA_SCREENSHOT_DIR: resolve(screenshotDir, "member-admin"),
      },
    },
    {
      surface: "org_admin",
      label: "Org admin aggregate/coaching/AI usage QA",
      script: "scripts/demo-org-coaching-ai-usage-qa.mjs",
    },
    {
      surface: "super_admin",
      label: "Super admin platform read QA",
      script: "scripts/demo-platform-read-qa.mjs",
    },
    {
      surface: "client_portal",
      label: "Client portal token/session/response QA",
      script: "scripts/client-portal-qa.mjs",
    },
  ];

  const commandResults = commands.map(runQaCommand);

  for (const result of commandResults) {
    push(result.status === 0, `${result.surface} command passes`, `${result.script} exit=${result.status}`);
  }

  const browserProof = await runBrowserProof();
  const afterUsage = await getCurrentMonthUsageCount();

  push(browserProof.consoleErrors === 0, "Full smoke browser proof has no console errors", `${browserProof.consoleErrors}`);
  push(!browserProof.horizontalOverflow, "Full smoke browser proof has no horizontal overflow");
  push(afterUsage >= beforeUsage, "AiUsageLog current-month count is readable after full smoke", `${beforeUsage}->${afterUsage}`);

  console.log(
    JSON.stringify(
      {
        baseUrl,
        users: {
          member: demoMemberEmail,
          manager: demoManagerEmail,
          platform: demoPlatformEmail,
        },
        shareToken,
        commandResults: commandResults.map((result) => ({
          surface: result.surface,
          script: result.script,
          status: result.status,
        })),
        browserProof: {
          pages: browserProof.pages,
          consoleErrors: browserProof.consoleErrors,
          horizontalOverflow: browserProof.horizontalOverflow,
          screenshotDir,
        },
        aiUsageCurrentMonth: {
          before: beforeUsage,
          after: afterUsage,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await db.end();
}

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

function runQaCommand(command) {
  const env = {
    ...process.env,
    DEMO_QA_BASE_URL: baseUrl,
    ...command.env,
  };
  const result = spawnSync(process.execPath, [command.script, baseUrl], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  console.log(`\n--- ${command.label} (${command.script}) ---`);
  if (result.stdout) console.log(result.stdout.trim());
  if (result.stderr) console.error(result.stderr.trim());

  return {
    surface: command.surface,
    script: command.script,
    status: result.status ?? 1,
  };
}

async function runBrowserProof() {
  const browser = await chromium.launch({ channel: "msedge" });
  const pages = [
    {
      surface: "front_office",
      path: "/pricing",
      expectedText: "方案",
      screenshot: "front-office-pricing.png",
    },
    {
      surface: "member_admin",
      path: "/dashboard",
      expectedText: "今日決策台",
      email: demoMemberEmail,
      screenshot: "member-dashboard.png",
    },
    {
      surface: "org_admin",
      path: "/team",
      expectedText: "團隊",
      email: demoManagerEmail,
      screenshot: "org-team.png",
    },
    {
      surface: "super_admin",
      path: "/super-admin",
      expectedText: "Release readiness",
      email: demoPlatformEmail,
      screenshot: "super-admin.png",
    },
    {
      surface: "client_portal",
      path: `/share/${shareToken}`,
      expectedText: "王大明",
      screenshot: "client-share.png",
    },
  ];
  const consoleErrors = [];
  const pageResults = [];

  try {
    for (const target of pages) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
        extraHTTPHeaders: target.email ? { "x-asai-demo-user-email": target.email } : {},
      });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(`${target.surface}: ${message.text()}`);
        }
      });

      const response = await page.goto(`${baseUrl}${target.path}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      const locator = page.getByText(target.expectedText, { exact: false }).first();
      const hasExpectedText = (await locator.count()) > 0;
      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      const screenshotPath = resolve(screenshotDir, target.screenshot);

      mkdirSync(dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await context.close();

      push(Boolean(response?.ok()), `${target.surface} browser page returns OK`, `${target.path} status=${response?.status() ?? "missing"}`);
      push(hasExpectedText, `${target.surface} browser page shows expected text`, target.expectedText);
      push(!horizontalOverflow, `${target.surface} browser page has no horizontal overflow`);

      pageResults.push({
        surface: target.surface,
        path: target.path,
        status: response?.status() ?? null,
        expectedText: target.expectedText,
        screenshotPath,
        horizontalOverflow,
      });
    }
  } finally {
    await browser.close();
  }

  return {
    pages: pageResults,
    consoleErrors: consoleErrors.length,
    horizontalOverflow: pageResults.some((page) => page.horizontalOverflow),
  };
}

async function getCurrentMonthUsageCount() {
  const result = await db.query(
    `SELECT count(*)::int AS total
     FROM ai_usage_logs
     WHERE created_at >= date_trunc('month', now())`,
  );

  return result.rows[0]?.total ?? 0;
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
