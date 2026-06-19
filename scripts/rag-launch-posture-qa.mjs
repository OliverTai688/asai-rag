#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Pool } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const disabledCode = "RAG_DISABLED_FOR_PRIVATE_BETA";
const checks = [];

if (!connectionString) {
  throw new Error("Missing DIRECT_URL or DATABASE_URL for RAG launch posture QA.");
}

const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000, max: 1 });

try {
  const before = await countRagUsage();

  const unauth = await postJson("/api/rag", {
    question: "請搜尋保單重點。",
  });
  check(unauth.status === 401, "RAG requires app session", `status=${unauth.status}`);

  const invalid = await postJson(
    "/api/rag",
    {
      question: " ",
    },
    demoEmail,
  );
  check(invalid.status === 400, "RAG validates question input", `status=${invalid.status}`);
  check(invalid.body?.error === "INVALID_RAG_INPUT", "RAG returns deterministic invalid input code");

  const disabled = await postJson(
    "/api/rag",
    {
      question: "請根據知識庫整理教育金規劃提醒。",
    },
    demoEmail,
  );
  check(disabled.status === 503, "RAG is explicitly disabled for private beta", `status=${disabled.status}`);
  check(disabled.body?.error === disabledCode, "RAG returns disabled launch code");
  check(disabled.body?.launchPosture === "disabled_guarded", "RAG exposes guarded disabled posture");
  check(disabled.body?.providerAttempted === false, "RAG does not attempt provider while disabled");

  const after = await countRagUsage();
  check(
    after.total === before.total,
    "RAG AiUsageLog count stays unchanged while provider is disabled",
    `${before.total}->${after.total}`,
  );

  printChecks();

  if (checks.some((item) => item.status === "fail")) {
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}

async function postJson(path, body, userEmail) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userEmail ? { "x-asai-demo-user-email": userEmail } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsedBody;

  try {
    parsedBody = JSON.parse(text);
  } catch {
    parsedBody = undefined;
  }

  return {
    status: response.status,
    body: parsedBody,
    text,
  };
}

async function countRagUsage() {
  const { rows } = await pool.query(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE error IS NULL)::int AS success,
       count(*) FILTER (WHERE error IS NOT NULL)::int AS error
     FROM ai_usage_logs
     WHERE module = 'RAG'`,
  );

  return {
    total: rows[0]?.total ?? 0,
    success: rows[0]?.success ?? 0,
    error: rows[0]?.error ?? 0,
  };
}

function check(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}

function printChecks() {
  for (const item of checks) {
    const prefix = item.status === "pass" ? "PASS" : "FAIL";
    console.log(`${prefix} ${item.label}${item.detail ? ` — ${item.detail}` : ""}`);
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
