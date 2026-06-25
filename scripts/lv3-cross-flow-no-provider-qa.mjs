#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const configuredBaseUrl = process.env.DEMO_QA_BASE_URL ?? process.env.LV3_CROSS_FLOW_BASE_URL;
let baseUrl = configuredBaseUrl ?? `http://127.0.0.1:${readPositiveInteger("LV3_CROSS_FLOW_DEFAULT_PORT", 3085)}`;
const baseUrlExplicit = Boolean(configuredBaseUrl);
const publicStatusTimeoutMs = readPositiveInteger("LV3_CROSS_FLOW_STATUS_TIMEOUT_MS", 10_000);
const serverStartTimeoutMs = readPositiveInteger("LV3_CROSS_FLOW_SERVER_TIMEOUT_MS", 180_000);
const warmupTimeoutMs = readPositiveInteger("LV3_CROSS_FLOW_WARMUP_TIMEOUT_MS", 45_000);
const preflightOnly = process.env.LV3_CROSS_FLOW_PREFLIGHT_ONLY === "true";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotDir = resolve(
  process.env.DEMO_QA_SCREENSHOT_DIR ?? "docs/06_audits-and-reports/screenshots/lv3-cross-flow-no-provider",
);
const coverageFilter = process.env.LV3_CROSS_FLOW_COVERAGE?.trim() || "";
const MEETING_REVIEW_CONTEXT_COVERAGE = "meeting-review-context-chain";
const MEETING_REVIEW_CONTEXT_EXPECTED_COMMANDS = 7;
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
    coverage: [MEETING_REVIEW_CONTEXT_COVERAGE],
    requiresDevServer: false,
  },
  {
    chain: "meeting-review-context-cross-flow",
    label: "meeting reviewContext relationship signal contract proof",
    args: ["visit:meeting-relationship-signal-dry-run"],
    coverage: [MEETING_REVIEW_CONTEXT_COVERAGE],
    requiresDevServer: false,
  },
  {
    chain: "meeting-review-context-cross-flow",
    label: "meeting reviewContext relationship signal BFF/UI proof",
    args: ["visit:meeting-relationship-signal-bff-ui-qa"],
    coverage: [MEETING_REVIEW_CONTEXT_COVERAGE],
    requiresDevServer: false,
  },
  {
    chain: "meeting-review-context-cross-flow",
    label: "meeting reviewContext preparation to theater handoff proof",
    args: ["visit:meeting-signal-theater-handoff-qa"],
    coverage: [MEETING_REVIEW_CONTEXT_COVERAGE],
    requiresDevServer: false,
  },
  {
    chain: "meeting-review-context-cross-flow",
    label: "meeting reviewContext Route B session source grounding proof",
    args: ["theater:meeting-signal-session-source-qa"],
    coverage: [MEETING_REVIEW_CONTEXT_COVERAGE],
    requiresDevServer: false,
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
    coverage: [MEETING_REVIEW_CONTEXT_COVERAGE],
    requiresDevServer: false,
  },
  {
    chain: "protocol-boundary",
    label: "AI BFF audit and no-provider posture inventory",
    args: ["ai:bff-audit"],
    coverage: [MEETING_REVIEW_CONTEXT_COVERAGE],
    requiresDevServer: false,
  },
];

const selectedQaCommands = selectQaCommands();

mkdirSync(screenshotDir, { recursive: true });

installShutdownHandlers();

try {
  if (coverageFilter) {
    push(true, "LV3 cross-flow coverage filter applied", `${coverageFilter}: ${selectedQaCommands.length}/${qaCommands.length} proof commands selected`);
  }

  if (preflightOnly || selectedQaCommands.some((command) => command.requiresDevServer !== false)) {
    await ensureDevServer();
  } else {
    push(true, "ASAI dev server skipped for selected coverage", coverageFilter || "all selected commands marked serverless");
  }

  const beforeUsageCount = await countAiUsageLogs();

  if (preflightOnly) {
    push(true, "LV3 cross-flow preflight-only proof completed", `baseUrl=${baseUrl}`);
  } else {
    for (const command of selectedQaCommands) {
      await runPnpmScript(command);
    }
  }

  const afterUsageCount = await countAiUsageLogs();
  if (beforeUsageCount !== null && afterUsageCount !== null) {
    push(afterUsageCount === beforeUsageCount, "proof pack writes no new AiUsageLog", `${beforeUsageCount}->${afterUsageCount}`);
  } else {
    push(true, "AiUsageLog count check skipped", aiUsageLogCountSkipReason || "DB URL is unavailable");
  }
  if (!preflightOnly) {
    pushChainSummary(
      "post-rel-006h-family-profile-bridge",
      "post-REL-006h family-profile feedback/writeback chain covered",
    );
    push(
      countCoverage(MEETING_REVIEW_CONTEXT_COVERAGE) === MEETING_REVIEW_CONTEXT_EXPECTED_COMMANDS,
      "meeting reviewContext cross-flow chain covered",
      `${countCoverage(MEETING_REVIEW_CONTEXT_COVERAGE)}/${MEETING_REVIEW_CONTEXT_EXPECTED_COMMANDS} proof commands passed`,
    );
    pushChainSummary("meeting-review-context-cross-flow", "meeting reviewContext visit/theater source chain covered");
    pushChainSummary("cross-flow-regression", "Route B state proposal cross-flow regression covered");
    pushChainSummary("protocol-boundary", "AgentFacts/protocol boundary covered");
    push(true, "LV3 cross-flow proof pack completed", `${selectedQaCommands.length}/${qaCommands.length} proof commands passed`);
  }
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
  const preflight = await probeAsaiPublicStatus(baseUrl, publicStatusTimeoutMs);
  if (preflight.signatureOk) {
    push(true, "ASAI public status signature verified before proof pack", `${baseUrl}; ${preflight.detail}`);
    await warmAsaiApp(baseUrl);
    return;
  }

  if (!baseUrlExplicit) {
    const existingAsaiBaseUrl = await findReachableAsaiBaseUrl(["http://127.0.0.1:3000", "http://localhost:3000"]);
    if (existingAsaiBaseUrl) {
      push(
        true,
        "existing ASAI dev server discovered before spawning new proof server",
        `${baseUrl} -> ${existingAsaiBaseUrl}`,
      );
      baseUrl = existingAsaiBaseUrl;
      await warmAsaiApp(baseUrl);
      return;
    }
  }

  if (preflight.reachable) {
    if (baseUrlExplicit) {
      throw new Error(
        `Configured ASAI proof base URL is reachable but failed the public-status signature check: ${baseUrl}; ${preflight.detail}`,
      );
    }

    const replacementBaseUrl = await findAvailableBaseUrl(baseUrl);
    push(
      true,
      "default proof base URL occupied by non-ASAI app; using free ASAI proof port",
      `${baseUrl} -> ${replacementBaseUrl}; ${preflight.detail}`,
    );
    baseUrl = replacementBaseUrl;
  } else if (!baseUrlExplicit) {
    const replacementBaseUrl = await findAvailableBaseUrl(baseUrl);
    if (replacementBaseUrl !== baseUrl) {
      push(true, "default proof base URL moved to a free ASAI proof port", `${baseUrl} -> ${replacementBaseUrl}`);
      baseUrl = replacementBaseUrl;
    }
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

  await waitForAsaiApp(baseUrl, serverStartTimeoutMs);
  await warmAsaiApp(baseUrl);
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

async function probeAsaiPublicStatus(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(withPath(url, "/api/public/status"), {
      method: "GET",
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    const signatureOk = Boolean(
      response.status === 200 &&
      body &&
        typeof body === "object" &&
        body.version === "asai.public_status.v1" &&
        "aiAvailability" in body &&
        "checkoutAvailability" in body &&
        "legalStatus" in body,
    );
    const version =
      body && typeof body === "object" && "version" in body && typeof body.version === "string"
        ? body.version
        : "missing";
    return {
      reachable: true,
      signatureOk,
      detail: `status=${response.status} version=${version}`,
    };
  } catch {
    return {
      reachable: false,
      signatureOk: false,
      detail: "unreachable_or_timeout",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForAsaiApp(url, timeoutMs) {
  const startedAt = Date.now();
  let lastDetail = "not_checked";
  while (Date.now() - startedAt < timeoutMs) {
    const probe = await probeAsaiPublicStatus(url, publicStatusTimeoutMs);
    if (probe.signatureOk) {
      push(true, "ASAI public status signature verified after dev-server start", `${url}; ${probe.detail}`);
      return;
    }
    lastDetail = probe.detail;
    await delay(1000);
  }

  throw new Error(
    `Timed out waiting for ASAI public status at ${withPath(url, "/api/public/status")} after ${timeoutMs}ms; last=${lastDetail}`,
  );
}

async function warmAsaiApp(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), warmupTimeoutMs);
  let detail = "not_attempted";
  try {
    const response = await fetch(withPath(url, "/"), {
      method: "GET",
      signal: controller.signal,
    });
    detail = `root_status=${response.status}`;
  } catch {
    detail = "root_unreachable_or_timeout";
  } finally {
    clearTimeout(timeout);
  }

  push(true, "ASAI app root warmup attempted before proof pack", detail);

  const probe = await probeAsaiPublicStatus(url, publicStatusTimeoutMs);
  if (!probe.signatureOk) {
    throw new Error(`ASAI public status signature missing after warmup at ${url}; ${probe.detail}`);
  }
  push(true, "ASAI public status signature verified after warmup", `${url}; ${probe.detail}`);
}

async function findReachableAsaiBaseUrl(candidateUrls) {
  for (const candidateUrl of candidateUrls) {
    const probe = await probeAsaiPublicStatus(candidateUrl, publicStatusTimeoutMs);
    if (probe.signatureOk) return candidateUrl;
  }

  return null;
}

async function findAvailableBaseUrl(url) {
  const target = new URL(url);
  const protocol = target.protocol || "http:";
  const host = target.hostname === "localhost" ? "127.0.0.1" : target.hostname;
  const startingPort = Number(target.port || (protocol === "https:" ? "443" : "3000"));

  for (let offset = 0; offset < 30; offset += 1) {
    const candidatePort = startingPort + offset;
    if (await canBindPort(host, candidatePort)) {
      target.hostname = host;
      target.port = String(candidatePort);
      target.pathname = "";
      target.search = "";
      target.hash = "";
      return target.toString().replace(/\/$/, "");
    }
  }

  throw new Error(`No free ASAI proof port found near ${url}; set DEMO_QA_BASE_URL to a free localhost URL.`);
}

function canBindPort(host, port) {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.once("error", () => resolvePromise(false));
    server.once("listening", () => {
      server.close(() => resolvePromise(true));
    });
    server.listen(port, host);
  });
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
  return selectedQaCommands.filter((command) => command.chain === chain).length;
}

function countCoverage(coverage) {
  return selectedQaCommands.filter((command) => command.coverage?.includes(coverage)).length;
}

function pushChainSummary(chain, label) {
  const selectedCount = countCommands(chain);
  const totalCount = qaCommands.filter((command) => command.chain === chain).length;
  if (coverageFilter && selectedCount === 0) {
    push(true, `${label.replace(/ covered$/, "")} skipped by coverage filter`, coverageFilter);
    return;
  }

  const summaryLabel =
    coverageFilter && selectedCount < totalCount
      ? `${label.replace(/ covered$/, "")} selected proof subset covered`
      : label;
  const detail = coverageFilter
    ? `${selectedCount}/${totalCount} selected proof command${selectedCount === 1 ? "" : "s"} passed`
    : `${selectedCount} proof command${selectedCount === 1 ? "" : "s"} passed`;

  push(true, summaryLabel, detail);
}

function selectQaCommands() {
  if (!coverageFilter) return qaCommands;

  const selectedCommands = qaCommands.filter((command) => command.coverage?.includes(coverageFilter));
  if (selectedCommands.length === 0) {
    throw new Error(`No LV3 cross-flow proof commands matched coverage filter: ${coverageFilter}`);
  }

  return selectedCommands;
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

function readPositiveInteger(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
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
