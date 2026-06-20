#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-cross-flow-no-provider",
);
const startedProcesses = [];
const checks = [];

const qaCommands = [
  {
    label: "client relationship graph source proof",
    args: ["client:relationship-graph-qa"],
  },
  {
    label: "visit/pre-visit BFF and reasoning proof",
    args: ["visit:bff-qa"],
  },
  {
    label: "quick-capture BFF to Park memory proof",
    args: ["interview:quick-capture-bff-qa"],
  },
  {
    label: "quick-capture UI selector to Park memory proof",
    args: ["interview:quick-capture-ui-qa"],
  },
  {
    label: "Route B relationship-stage session UI proof",
    args: ["theater:route-b-session-ui-qa"],
  },
  {
    label: "Route B group/private turn and state proposal proof",
    args: ["theater:route-b-interaction-qa"],
  },
  {
    label: "AI BFF audit and no-provider posture inventory",
    args: ["ai:bff-audit"],
  },
];

mkdirSync(screenshotDir, { recursive: true });

installShutdownHandlers();

try {
  await ensureDevServer();
  const beforeUsageCount = await countAiUsageLogs();

  for (const command of qaCommands) {
    await runPnpmScript(command);
  }

  const afterUsageCount = await countAiUsageLogs();
  if (beforeUsageCount !== null && afterUsageCount !== null) {
    push(afterUsageCount === beforeUsageCount, "proof pack writes no new AiUsageLog", `${beforeUsageCount}->${afterUsageCount}`);
  } else {
    push(true, "AiUsageLog count check skipped because DB URL is unavailable");
  }
  push(true, "LV3 cross-flow proof pack completed", `${qaCommands.length} proof commands passed`);
} catch (error) {
  push(false, "LV3 cross-flow proof pack failed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await shutdownStartedProcesses();
}

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function ensureDevServer() {
  if (await isReachable(baseUrl)) {
    push(true, "dev server reachable", baseUrl);
    return;
  }

  const url = new URL(baseUrl);
  const port = url.port || (url.protocol === "https:" ? "443" : "3000");
  const hostname = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
  const child = spawn(pnpmBin, ["dev", "--hostname", hostname, "--port", port], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ALLOW_DEV_AUTH_HEADER: process.env.ALLOW_DEV_AUTH_HEADER ?? "true",
      DEMO_QA_BASE_URL: baseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  startedProcesses.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk}`));

  await waitForReachable(baseUrl, 90_000);
  push(true, "dev server started for proof pack", baseUrl);
}

async function runPnpmScript(command) {
  console.log(`\n== ${command.label} ==`);
  const startedAt = Date.now();
  await runCommand(pnpmBin, command.args, {
    ...process.env,
    ALLOW_DEV_AUTH_HEADER: process.env.ALLOW_DEV_AUTH_HEADER ?? "true",
    DEMO_QA_BASE_URL: baseUrl,
    DEMO_QA_SCREENSHOT_DIR: screenshotDir,
  });
  push(true, command.label, `${Math.round((Date.now() - startedAt) / 1000)}s`);
}

function runCommand(command, args, env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(`${command} ${args.join(" ")} exited with ${code ?? `signal ${signal ?? "unknown"}`}`),
      );
    });

    child.on("error", rejectPromise);
  });
}

async function isReachable(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForReachable(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) return;
    await delay(1000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

async function countAiUsageLogs() {
  if (!dbUrl) return null;

  const client = new PgClient({ connectionString: dbUrl });
  await client.connect();
  try {
    const result = await client.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs");
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function installShutdownHandlers() {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, async () => {
      await shutdownStartedProcesses();
      process.kill(process.pid, signal);
    });
  }
}

async function shutdownStartedProcesses() {
  await Promise.all(
    startedProcesses.splice(0).map(
      (child) =>
        new Promise((resolvePromise) => {
          if (child.exitCode !== null || child.killed) {
            resolvePromise();
            return;
          }

          child.once("exit", resolvePromise);
          child.kill("SIGTERM");
          setTimeout(() => {
            if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
          }, 5000).unref();
        }),
    ),
  );
}
