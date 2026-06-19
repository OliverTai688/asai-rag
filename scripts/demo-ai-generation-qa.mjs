#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Pool } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoClientId = process.env.DEMO_QA_CLIENT_ID ?? "c_wang";
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];

if (!connectionString) {
  throw new Error("Missing DIRECT_URL or DATABASE_URL for AI generation QA.");
}

const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000, max: 1 });

try {
  const before = await countUsage();

  const unauthVisit = await postJson("/api/ai/visit", {
    purpose: "ADD_ON",
    clientId: demoClientId,
  });
  check(unauthVisit.status === 401, "visit requires app session", `status=${unauthVisit.status}`);

  const unauthSpin = await postJson("/api/ai/spin", {
    phase: "SITUATION",
    mode: "SELF_CLARIFY",
    clientId: demoClientId,
    messages: [],
  });
  check(unauthSpin.status === 401, "spin requires app session", `status=${unauthSpin.status}`);

  const visit = await postJson(
    "/api/ai/visit",
    {
      purpose: "ADD_ON",
      clientId: demoClientId,
    },
    demoEmail,
  );
  check(visit.status === 200, "visit generation succeeds for demo member", `status=${visit.status}`);
  check(
    Array.isArray(visit.body?.objectives) && Array.isArray(visit.body?.spinQuestions),
    "visit response has expected planning arrays",
  );
  check(
    visit.body?.spinQuestions?.some((question) => Array.isArray(question?.reasoning?.evidence) && question.reasoning.evidence.length > 0),
    "visit response includes question reasoning evidence",
  );

  const report = await postJson(
    "/api/ai/report",
    {
      prompt: "請產出一段 120 字內的加保前摘要，聚焦教育金與醫療保障缺口。",
      clientId: demoClientId,
    },
    demoEmail,
  );
  check(report.status === 200, "report generation succeeds for demo member", `status=${report.status}`);
  check(typeof report.text === "string" && report.text.includes("教育"), "report response returns markdown text");

  const spin = await postJson(
    "/api/ai/spin",
    {
      phase: "SITUATION",
      mode: "SELF_CLARIFY",
      clientId: demoClientId,
      messages: [{ role: "user", content: "請用一句話協助我整理客戶背景。" }],
    },
    demoEmail,
  );
  check(spin.status === 200, "spin generation succeeds for demo member", `status=${spin.status}`);
  check(typeof spin.text === "string" && spin.text.length > 20, "spin response returns streamed text");

  const spinSuggestions = await postJson(
    "/api/ai/spin-suggestions",
    {
      phase: "SITUATION",
      mode: "QUESTION_DESIGN",
      clientId: demoClientId,
      lastUserMessage: "客戶有兩個孩子，想確認教育金缺口。",
    },
    demoEmail,
  );
  check(
    spinSuggestions.status === 200,
    "spin suggestions generation succeeds for demo member",
    `status=${spinSuggestions.status}`,
  );
  check(
    Array.isArray(spinSuggestions.body?.suggestions),
    "spin suggestions response returns suggestions array",
  );

  const after = await countUsage();
  check(
    after.VISIT.success >= before.VISIT.success + 1,
    "VISIT success AiUsageLog increased",
    `${before.VISIT.success}->${after.VISIT.success}`,
  );
  check(
    after.REPORT.success >= before.REPORT.success + 1,
    "REPORT success AiUsageLog increased",
    `${before.REPORT.success}->${after.REPORT.success}`,
  );
  check(
    after.SPIN.success >= before.SPIN.success + 2,
    "SPIN success AiUsageLog increased for chat and suggestions",
    `${before.SPIN.success}->${after.SPIN.success}`,
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

async function countUsage() {
  const { rows } = await pool.query(
    `SELECT
       module::text AS module,
       count(*) FILTER (WHERE error IS NULL)::int AS success,
       count(*) FILTER (WHERE error IS NOT NULL)::int AS error
     FROM ai_usage_logs
     WHERE module IN ('VISIT', 'REPORT', 'SPIN')
     GROUP BY module`,
  );

  const result = {
    VISIT: { success: 0, error: 0 },
    REPORT: { success: 0, error: 0 },
    SPIN: { success: 0, error: 0 },
  };

  for (const row of rows) {
    if (row.module === "VISIT" || row.module === "REPORT" || row.module === "SPIN") {
      result[row.module] = {
        success: row.success,
        error: row.error,
      };
    }
  }

  return result;
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
