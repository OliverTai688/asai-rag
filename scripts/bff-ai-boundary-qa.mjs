#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { Client as PgClient } from "pg";

const root = process.cwd();

loadEnvFile(".env.local");
loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://127.0.0.1:3039";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? process.env.DEMO_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const spawned = [];
const checks = [];

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

function loadEnvFile(fileName) {
  const envPath = path.join(root, fileName);
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
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
  console.log(`Starting dev server for BFF-205 QA at ${baseUrl}`);

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

function readSource(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function assertFileContains(filePath, fragments) {
  const source = readSource(filePath);
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  if (missing.length > 0) {
    fail(filePath, `missing ${missing.join(", ")}`);
    throw new Error(`${filePath} missing BFF-205 boundary fragments`);
  }
  pass(filePath, `verified ${fragments.length} boundary fragments`);
}

function assertFileOmits(filePath, fragments) {
  const source = readSource(filePath);
  const found = fragments.filter((fragment) => source.includes(fragment));
  if (found.length > 0) {
    fail(filePath, `forbidden ${found.join(", ")}`);
    throw new Error(`${filePath} contains forbidden BFF-205 fragments`);
  }
  pass(filePath, `omits ${fragments.length} forbidden private fragments`);
}

function verifyStaticBoundaries() {
  assertFileContains("src/app/api/rag/route.ts", [
    "requireCurrentMember",
    "canUseAiModule",
    "RAG_DISABLED_FOR_PRIVATE_BETA",
    'launchPosture: "disabled_guarded"',
    "providerAttempted: false",
  ]);

  assertFileContains("src/app/api/ai/chat/route.ts", [
    "requireCurrentMember",
    "canUseAiModule",
    "chatRequestSchema",
    "ensureAssistantConversation",
    "persistAssistantChatSuccess",
    "persistAssistantChatFailure",
    "ASSISTANT_TOOLS",
    "executeAssistantTool",
    "writeAiUsageLogSafely",
    "ALLOWED_TOOL_ROUTES",
  ]);

  assertFileContains("src/lib/assistant/assistant-chat-repository.ts", [
    "organizationId: input.session.organization.id",
    "ownerId: input.session.user.id",
    "resolveAllowedClientId",
    "assistantMessage.create",
    "aiUsageLog.create",
    'traceSource: "assistant"',
  ]);
  assertFileOmits("src/lib/assistant/assistant-chat-repository.ts", [
    "rawProviderPayload",
    "rawToolPayload",
    "policyNumber",
    "phone",
    "email",
    "cookie",
    "authorization",
  ]);

  assertFileContains("src/lib/assistant/assistant-tools.ts", [
    "listClientsForMember",
    "canReadOrgAggregate",
    "toClientSummary",
    "CLIENT_NOT_FOUND",
    "NO_PERMISSION",
  ]);
  assertFileOmits("src/lib/assistant/assistant-tools.ts", [
    "policyNumber",
    "rawProviderPayload",
    "rawToolPayload",
    "privateTranscript",
    "cookie",
    "authorization",
  ]);

  assertFileContains("src/app/api/ai/interview/outputs/route.ts", [
    "outputDraftSchema",
    "knownFacts",
    "unknownsToConfirm",
    "likelyIssues",
    "persistInterviewOutputSuccess",
    "persistInterviewFailure",
    "buildAdvisorMemoryLoopContext",
    "loadInterviewClientContext",
  ]);

  assertFileContains("src/app/api/ai/interview/quick-captures/route.ts", [
    "requireCurrentMember",
    "createPersistentQuickCaptureBridge",
    "createQuickCaptureBridgeInputSchema",
    "Cache-Control",
    "no-store",
  ]);

  assertFileContains("src/domains/interview/quick-capture.ts", [
    "clientProvidedScopeIgnored",
    "providerCallAttempted: false",
    "aiUsageLogRequired: false",
    "rawAudioStored: false",
    "rawPrivateTranscriptStored: false",
    "writesConfirmedCrmFact: false",
  ]);

  assertFileContains("src/domains/ai-protocol/manifest.ts", [
    'agentId: "asai.chat.assistant"',
    'agentId: "asai.interview.companion"',
    'agentId: "asai.interview.quick_capture"',
    'agentId: "asai.rag.private_beta"',
    "RAG_DISABLED_FOR_PRIVATE_BETA",
    "disabled_guarded",
  ]);
}

function resolveDatabaseUrl() {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? null;
}

async function countAiUsageByModule() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    pass("ai-usage-count", "DIRECT_URL/DATABASE_URL absent; module count skipped");
    return null;
  }

  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select module, count(*)::int as total
       from ai_usage_logs
       where module in ('CHAT', 'INTERVIEW', 'RAG')
       group by module`,
    );
    return rows.reduce(
      (acc, row) => ({
        ...acc,
        [row.module]: Number(row.total ?? 0),
      }),
      { CHAT: 0, INTERVIEW: 0, RAG: 0 },
    );
  } finally {
    await client.end();
  }
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
        DEMO_MEMBER_QA_EMAIL: demoMemberEmail,
        DEMO_MANAGER_QA_EMAIL: demoManagerEmail,
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

async function shutdown() {
  for (const child of spawned) {
    if (!child.killed) child.kill("SIGTERM");
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
  console.log("BFF-205a RAG / assistant / interview boundary QA");
  console.log(`baseUrl=${baseUrl}`);

  verifyStaticBoundaries();
  const beforeUsage = await countAiUsageByModule();
  await ensureDevServer();

  for (const scriptName of [
    "ai:bff-audit",
    "ai:protocol-registry-qa",
    "rag:launch-posture-qa",
    "interview:quick-capture-bff-qa",
  ]) {
    await runPnpmScript(scriptName);
  }

  const afterUsage = await countAiUsageByModule();
  if (beforeUsage && afterUsage) {
    for (const moduleName of ["RAG", "INTERVIEW"]) {
      if (beforeUsage[moduleName] !== afterUsage[moduleName]) {
        fail(
          `${moduleName.toLowerCase()}-usage-unchanged`,
          `before=${beforeUsage[moduleName]}, after=${afterUsage[moduleName]}`,
        );
        throw new Error(`${moduleName} AiUsageLog count changed during guarded/no-provider BFF-205 proof`);
      }
      pass(
        `${moduleName.toLowerCase()}-usage-unchanged`,
        `${beforeUsage[moduleName]} -> ${afterUsage[moduleName]}`,
      );
    }
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} BFF-205 boundary checks failed`);
  }

  console.log("\nBFF-205a RAG / assistant / interview boundary QA PASS");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(shutdown);
