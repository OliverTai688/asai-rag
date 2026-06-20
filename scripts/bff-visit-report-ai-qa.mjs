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
  throw new Error("Missing DIRECT_URL or DATABASE_URL for visit/report AI BFF QA.");
}

const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000, max: 1 });

try {
  const privateSentinels = await loadPrivateSentinels();
  const before = await countUsage();

  const unauthVisit = await postJson("/api/ai/visit", {
    purpose: "ADD_ON",
    clientId: demoClientId,
  });
  check(unauthVisit.status === 401, "visit requires app session", `status=${unauthVisit.status}`);

  const invalidVisit = await postJson(
    "/api/ai/visit",
    {
      purpose: "ADD_ON",
      clientId: "",
    },
    demoEmail,
  );
  check(invalidVisit.status === 400, "visit validates request body", `status=${invalidVisit.status}`);
  check(invalidVisit.body?.error === "INVALID_VISIT_INPUT", "visit returns stable invalid input code");

  const invalidReport = await postJson(
    "/api/ai/report",
    {
      prompt: "",
      clientId: demoClientId,
      responseFormat: "json",
    },
    demoEmail,
  );
  check(invalidReport.status === 400, "report validates request body", `status=${invalidReport.status}`);
  check(invalidReport.body?.error === "INVALID_REPORT_INPUT", "report returns stable invalid input code");

  const quotaVisit = await postJson(
    "/api/ai/visit",
    {
      purpose: "ADD_ON",
      clientId: demoClientId,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-quota-exceeded": "true" },
  );
  check(quotaVisit.status === 429, "visit quota guard can block before provider", `status=${quotaVisit.status}`);
  check(quotaVisit.body?.error === "QUOTA_EXCEEDED", "visit quota response is explicit");

  const quotaReport = await postJson(
    "/api/ai/report",
    {
      prompt: "請產出簡短摘要。",
      clientId: demoClientId,
      responseFormat: "json",
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-quota-exceeded": "true" },
  );
  check(quotaReport.status === 429, "report quota guard can block before provider", `status=${quotaReport.status}`);
  check(quotaReport.body?.error === "QUOTA_EXCEEDED", "report quota response is explicit");

  const afterGuards = await countUsage();
  check(
    afterGuards.VISIT.total === before.VISIT.total && afterGuards.REPORT.total === before.REPORT.total,
    "400/429 guard paths do not write fake AiUsageLog",
    `visit ${before.VISIT.total}->${afterGuards.VISIT.total}, report ${before.REPORT.total}->${afterGuards.REPORT.total}`,
  );

  const visit = await postJson(
    "/api/ai/visit",
    {
      purpose: "ADD_ON",
      clientId: demoClientId,
    },
    demoEmail,
  );
  check(visit.status === 200, "visit generation succeeds for demo member", `status=${visit.status}`);
  check(Array.isArray(visit.body?.objectives), "visit response has objectives array");
  check(Array.isArray(visit.body?.spinQuestions), "visit response has SPIN questions array");
  check(hasEvidenceSummary(visit.body?.evidenceSummary), "visit response includes facts/inferences/unknowns/recommendations DTO");
  check(
    visit.body?.spinQuestions?.some((question) => Array.isArray(question?.reasoning?.evidence) && question.reasoning.evidence.length > 0),
    "visit questions include reasoning evidence",
  );
  check(omitsSentinels(visit.body, privateSentinels), "visit response omits email/phone private sentinels");

  const report = await postJson(
    "/api/ai/report",
    {
      prompt: "請產出一段 120 字內的加保前摘要，聚焦教育金與醫療保障缺口。",
      clientId: demoClientId,
      responseFormat: "json",
    },
    demoEmail,
  );
  check(report.status === 200, "report generation succeeds for demo member", `status=${report.status}`);
  check(typeof report.body?.markdown === "string" && report.body.markdown.length > 20, "report response returns markdown in JSON DTO");
  check(hasEvidenceSummary(report.body?.evidenceSummary), "report response includes facts/inferences/unknowns/recommendations DTO");
  check(omitsSentinels(report.body, privateSentinels), "report response omits email/phone private sentinels");

  const afterSuccess = await countUsage();
  check(
    afterSuccess.VISIT.success >= before.VISIT.success + 1,
    "VISIT success AiUsageLog increased",
    `${before.VISIT.success}->${afterSuccess.VISIT.success}`,
  );
  check(
    afterSuccess.REPORT.success >= before.REPORT.success + 1,
    "REPORT success AiUsageLog increased",
    `${before.REPORT.success}->${afterSuccess.REPORT.success}`,
  );

  const visitProviderError = await postJson(
    "/api/ai/visit",
    {
      purpose: "ADD_ON",
      clientId: demoClientId,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-provider-error": "true" },
  );
  check(visitProviderError.status === 500, "visit provider error path returns 500", `status=${visitProviderError.status}`);
  check(visitProviderError.body?.error === "VISIT_AI_GENERATION_FAILED", "visit provider error response is sanitized");

  const reportProviderError = await postJson(
    "/api/ai/report",
    {
      prompt: "請產出簡短摘要。",
      clientId: demoClientId,
      responseFormat: "json",
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-provider-error": "true" },
  );
  check(reportProviderError.status === 500, "report provider error path returns 500", `status=${reportProviderError.status}`);
  check(reportProviderError.body?.error === "REPORT_AI_GENERATION_FAILED", "report provider error response is sanitized");
  check(omitsSentinels(visitProviderError.body, privateSentinels), "visit provider error omits private sentinels");
  check(omitsSentinels(reportProviderError.body, privateSentinels), "report provider error omits private sentinels");

  const afterError = await countUsage();
  check(
    afterError.VISIT.error >= afterSuccess.VISIT.error + 1,
    "VISIT provider error AiUsageLog increased",
    `${afterSuccess.VISIT.error}->${afterError.VISIT.error}`,
  );
  check(
    afterError.REPORT.error >= afterSuccess.REPORT.error + 1,
    "REPORT provider error AiUsageLog increased",
    `${afterSuccess.REPORT.error}->${afterError.REPORT.error}`,
  );

  printChecks();

  if (checks.some((item) => item.status === "fail")) {
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}

async function postJson(path, body, userEmail, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userEmail ? { "x-asai-demo-user-email": userEmail } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
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
       count(*)::int AS total,
       count(*) FILTER (WHERE error IS NULL)::int AS success,
       count(*) FILTER (WHERE error IS NOT NULL)::int AS error
     FROM ai_usage_logs
     WHERE module IN ('VISIT', 'REPORT')
     GROUP BY module`,
  );

  const result = {
    VISIT: { total: 0, success: 0, error: 0 },
    REPORT: { total: 0, success: 0, error: 0 },
  };

  for (const row of rows) {
    if (row.module === "VISIT" || row.module === "REPORT") {
      result[row.module] = {
        total: row.total,
        success: row.success,
        error: row.error,
      };
    }
  }

  return result;
}

async function loadPrivateSentinels() {
  const { rows } = await pool.query(
    `SELECT c.email, c.phone, array_remove(array_agg(f.phone), NULL) AS family_phones
     FROM clients c
     LEFT JOIN family_members f ON f.client_id = c.id
     WHERE c.id = $1
     GROUP BY c.id, c.email, c.phone`,
    [demoClientId],
  );

  const row = rows[0] ?? {};
  return [row.email, row.phone, ...(row.family_phones ?? [])].filter((value) => typeof value === "string" && value.length >= 4);
}

function hasEvidenceSummary(value) {
  return (
    value &&
    Array.isArray(value.facts) &&
    Array.isArray(value.inferences) &&
    Array.isArray(value.unknowns) &&
    Array.isArray(value.recommendations)
  );
}

function omitsSentinels(payload, sentinels) {
  const text = JSON.stringify(payload ?? {});
  return sentinels.every((sentinel) => !text.includes(sentinel));
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
