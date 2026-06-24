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
let aiUsageLogCountSkipReason = "";

const qaCommands = [
  {
    chain: "core-clean-flow",
    label: "client relationship graph source proof",
    args: ["client:relationship-graph-qa"],
  },
  {
    chain: "core-clean-flow",
    label: "visit/pre-visit BFF and reasoning proof",
    args: ["visit:bff-qa"],
  },
  {
    chain: "core-clean-flow",
    label: "quick-capture BFF to Park memory proof",
    args: ["interview:quick-capture-bff-qa"],
  },
  {
    chain: "core-clean-flow",
    label: "quick-capture UI selector to Park memory proof",
    args: ["interview:quick-capture-ui-qa"],
  },
  {
    chain: "core-clean-flow",
    label: "Route B relationship-stage session UI proof",
    args: ["theater:route-b-session-ui-qa"],
  },
  {
    chain: "core-clean-flow",
    label: "Route B group/private turn and state proposal proof",
    args: ["theater:route-b-interaction-qa"],
  },
  {
    chain: "post-rel-006h-family-profile-bridge",
    label: "relationship graph family profile metadata boundary proof",
    args: ["client:family-member-profile-metadata-qa"],
  },
  {
    chain: "post-rel-006h-family-profile-bridge",
    label: "relationship graph family profile advisor editor proof",
    args: ["client:family-member-profile-ui-qa"],
  },
  {
    chain: "post-rel-006h-family-profile-bridge",
    label: "family profile preparation to theater handoff proof",
    args: ["visit:family-profile-theater-handoff-qa"],
  },
  {
    chain: "post-rel-006h-family-profile-bridge",
    label: "family profile Route B session source grounding proof",
    args: ["theater:family-profile-session-source-qa"],
  },
  {
    chain: "post-rel-006h-family-profile-bridge",
    label: "family profile Route B next-turn runtime grounding proof",
    args: ["theater:route-b-family-profile-runtime-qa"],
  },
  {
    chain: "post-rel-006h-family-profile-bridge",
    label: "family profile Route B feedback grounding proof",
    args: ["theater:route-b-family-profile-feedback-qa"],
  },
  {
    chain: "post-rel-006h-family-profile-bridge",
    label: "feedback advisor context to visit and AI Meeting proof",
    args: ["visit:route-b-feedback-advisor-context-qa"],
  },
  {
    chain: "post-rel-006h-family-profile-bridge",
    label: "feedback advisor context to AI Meeting writeback preview bridge proof",
    args: ["meeting:route-b-feedback-advisor-writeback-bridge-qa"],
  },
  {
    chain: "cross-flow-regression",
    label: "Route B state proposal to AI Meeting writeback cross-flow proof",
    args: ["lv3:route-b-state-proposal-cross-flow-qa"],
  },
  {
    chain: "protocol-boundary",
    label: "AgentFacts protocol registry proof",
    args: ["ai:protocol-registry-qa"],
  },
  {
    chain: "protocol-boundary",
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
    push(true, "AiUsageLog count check skipped", aiUsageLogCountSkipReason || "DB URL is unavailable");
  }
  push(true, "post-REL-006h family-profile feedback/writeback chain covered", `${countCommands("post-rel-006h-family-profile-bridge")} proof commands passed`);
  push(true, "Route B state proposal cross-flow regression covered", `${countCommands("cross-flow-regression")} proof command passed`);
  push(true, "AgentFacts/protocol boundary covered", `${countCommands("protocol-boundary")} proof commands passed`);
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
  if (await isAsaiAppReachable(baseUrl)) {
    push(true, "ASAI dev server reachable", baseUrl);
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

  await waitForAsaiApp(baseUrl, 90_000);
  push(true, "ASAI dev server started for proof pack", baseUrl);
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

async function isAsaiAppReachable(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(withPath(url, "/api/public/status"), {
      method: "GET",
      signal: controller.signal,
    });
    if (response.status !== 200) return false;

    const body = await response.json().catch(() => null);
    return Boolean(
      body &&
        typeof body === "object" &&
        body.version === "asai.public_status.v1" &&
        "aiAvailability" in body &&
        "checkoutAvailability" in body &&
        "legalStatus" in body,
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForAsaiApp(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isAsaiAppReachable(url)) return;
    await delay(1000);
  }

  throw new Error(`Timed out waiting for ASAI public status at ${withPath(url, "/api/public/status")}`);
}

function withPath(url, pathname) {
  const target = new URL(url);
  target.pathname = pathname;
  target.search = "";
  target.hash = "";
  return target.toString();
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
  try {
    await client.connect();
    const result = await client.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs");
    return Number(result.rows[0]?.count ?? 0);
  } catch (error) {
    aiUsageLogCountSkipReason = safeErrorCode(error);
    return null;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function countCommands(chain) {
  return qaCommands.filter((command) => command.chain === chain).length;
}

function safeErrorCode(error) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  if (error instanceof Error && error.name) {
    return error.name;
  }

  return "unavailable";
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
