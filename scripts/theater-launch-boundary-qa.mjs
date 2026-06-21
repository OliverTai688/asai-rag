#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { Client as PgClient } from "pg";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

function loadDotEnvFile(fileName) {
  const envPath = path.join(process.cwd(), fileName);
  if (!existsSync(envPath)) {
    return;
  }

  const contents = require("node:fs").readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadDotEnvFile(".env.local");
loadDotEnvFile(".env");

const root = process.cwd();
const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://127.0.0.1:3038";
const demoEmail = process.env.DEMO_QA_EMAIL ?? "demo.member@asai.local";
const screenshotDir =
  process.env.DEMO_QA_SCREENSHOT_DIR ??
  path.join(
    root,
    "docs/06_audits-and-reports/screenshots/modern-ui/theater-launch-boundary",
  );

const checks = [];
const spawned = [];

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDevServer() {
  if (await fetchOk(baseUrl)) {
    pass("dev-server", `reachable at ${baseUrl}`);
    return;
  }

  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3000";
  console.log(`Starting dev server for QA at ${baseUrl}`);

  const child = spawn("pnpm", ["dev", "--hostname", host, "--port", port], {
    cwd: root,
    env: {
      ...process.env,
      ALLOW_DEV_AUTH_HEADER: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  spawned.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let i = 0; i < 90; i += 1) {
    if (await fetchOk(baseUrl)) {
      pass("dev-server", `started at ${baseUrl}`);
      return;
    }
    await wait(1_000);
  }

  throw new Error(`Dev server did not become reachable at ${baseUrl}`);
}

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? null;
}

async function countTheaterUsageLogs() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    pass("theater-usage-count", "DATABASE_URL/DIRECT_URL absent; count skipped");
    return null;
  }

  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      "select count(*)::int as count from ai_usage_logs where module = $1",
      ["THEATER"],
    );
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

async function assertFileContains(filePath, fragments) {
  const source = await readFile(path.join(root, filePath), "utf8");
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  if (missing.length > 0) {
    fail(filePath, `missing ${missing.join(", ")}`);
    throw new Error(`${filePath} missing expected launch-boundary fragments`);
  }
  pass(filePath, `verified ${fragments.length} boundary fragments`);
}

async function verifyStaticLaunchBoundaries() {
  await assertFileContains("src/app/api/ai/theater/route.ts", [
    "requireCurrentMember",
    "canUseAiModule",
    "ENABLE_LEGACY_THEATER_DEMO",
    "THEATER_ROUTE_B_REQUIRED",
    "persistTheaterCharacterSuccess",
    "persistTheaterFailure",
    "CONSERVATIVE",
    "SKEPTICAL",
    "BUSY",
    "EMOTIONAL",
  ]);

  await assertFileContains("src/app/api/ai/theater/score/route.ts", [
    "requireCurrentMember",
    "canUseAiModule",
    "ENABLE_LEGACY_THEATER_DEMO",
    "THEATER_ROUTE_B_REQUIRED",
    "persistTheaterScoreSuccess",
    "persistTheaterFailure",
  ]);

  await assertFileContains("src/app/api/theater/route-b/runtime/route.ts", [
    "ROUTE_B_PROVIDER_DISABLED",
    "providerCallAttempted: false",
    "aiUsageLogWritten: false",
    "routeBRuntimeRequestSchema",
    "validateRouteBHandoffBoundary",
  ]);
}

async function runPnpmScript(scriptName) {
  console.log(`\n--- pnpm ${scriptName} ---`);
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", [scriptName], {
      cwd: root,
      env: {
        ...process.env,
        ALLOW_DEV_AUTH_HEADER: "true",
        DEMO_QA_BASE_URL: baseUrl,
        DEMO_QA_SCREENSHOT_DIR: screenshotDir,
      },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        pass(`pnpm ${scriptName}`);
        resolve();
      } else {
        reject(new Error(`pnpm ${scriptName} exited with ${code}`));
      }
    });
  });
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    return chromium.launch();
  }
}

async function verifyTheaterHomeBoundary() {
  await mkdir(screenshotDir, { recursive: true });
  const browser = await launchBrowser();

  try {
    for (const viewport of [
      { label: "desktop", width: 1440, height: 1000 },
      { label: "mobile", width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
        extraHTTPHeaders: {
          "x-asai-demo-user-email": demoEmail,
        },
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });

      await page.goto(`${baseUrl}/theater`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });

      const text = await page.locator("body").innerText({ timeout: 15_000 });
      const expectedTexts = [
        "AI 劇場演練",
        "用劇場訪綱建場",
        "帶客戶資料建場",
        "從既有訪談轉入",
        "不必先完成 SPIN",
      ];
      const missing = expectedTexts.filter((fragment) => !text.includes(fragment));
      if (missing.length > 0) {
        fail(`/theater ${viewport.label}`, `missing ${missing.join(", ")}`);
        throw new Error(`/theater ${viewport.label} missing expected copy`);
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2,
      );
      if (overflow) {
        fail(`/theater ${viewport.label}`, "horizontal overflow");
        throw new Error(`/theater ${viewport.label} has horizontal overflow`);
      }

      await page.screenshot({
        fullPage: true,
        path: path.join(screenshotDir, `theater-launch-boundary-${viewport.label}.png`),
      });

      if (consoleErrors.length > 0) {
        fail(`/theater ${viewport.label}`, consoleErrors.slice(0, 3).join(" | "));
        throw new Error(`/theater ${viewport.label} has console errors`);
      }

      pass(`/theater ${viewport.label}`, "entry copy, no overflow, screenshot saved");
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function shutdown() {
  for (const child of spawned) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(143);
});

async function main() {
  console.log("BFF-204a theater launch-boundary QA");
  console.log(`baseUrl=${baseUrl}`);
  console.log(`screenshotDir=${screenshotDir}`);

  const beforeUsageCount = await countTheaterUsageLogs();
  await verifyStaticLaunchBoundaries();
  await ensureDevServer();
  await verifyTheaterHomeBoundary();

  for (const scriptName of [
    "ai:bff-audit",
    "ai:protocol-registry-qa",
    "theater:route-b-runtime-qa",
    "theater:route-b-session-ui-qa",
    "theater:route-b-interaction-qa",
  ]) {
    await runPnpmScript(scriptName);
  }

  const afterUsageCount = await countTheaterUsageLogs();
  if (
    beforeUsageCount !== null &&
    afterUsageCount !== null &&
    beforeUsageCount !== afterUsageCount
  ) {
    fail(
      "theater-ai-usage-unchanged",
      `before=${beforeUsageCount}, after=${afterUsageCount}`,
    );
    throw new Error("THEATER AiUsageLog count changed during guarded no-provider proof");
  }
  pass(
    "theater-ai-usage-unchanged",
    beforeUsageCount === null
      ? "count unavailable; skipped"
      : `THEATER AiUsageLog remained ${afterUsageCount}`,
  );

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} launch-boundary checks failed`);
  }

  console.log("\nBFF-204a theater launch-boundary QA PASS");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(shutdown);
