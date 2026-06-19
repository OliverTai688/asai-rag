#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new Client({ connectionString: dbUrl });
await db.connect();

try {
  const org = await getDemoOrg();
  const forbidden = await getForbiddenOrgDetailSentinels(org.id);
  const [coaching, aiUsage] = await Promise.all([get("/api/org/coaching"), get("/api/org/ai-usage")]);
  const coachingText = JSON.stringify(coaching.body);
  const aiUsageText = JSON.stringify(aiUsage.body);
  const combinedText = `${coachingText}\n${aiUsageText}`;

  push(coaching.status === 200, "GET /api/org/coaching returns 200 for demo manager", `status=${coaching.status}`);
  push(aiUsage.status === 200, "GET /api/org/ai-usage returns 200 for demo manager", `status=${aiUsage.status}`);
  push(coaching.body?.scope?.role === "MANAGER", "Coaching endpoint is scoped to MANAGER role", coaching.body?.scope?.role ?? "missing");
  push(aiUsage.body?.scope?.role === "MANAGER", "AI usage endpoint is scoped to MANAGER role", aiUsage.body?.scope?.role ?? "missing");

  push(Number.isInteger(coaching.body?.totals?.members), "Coaching endpoint returns aggregate member total");
  push(Number.isFinite(coaching.body?.completion?.spinCompletionRate), "Coaching endpoint returns completion metrics");
  push(Array.isArray(coaching.body?.blockers?.activeSpinPhases), "Coaching endpoint returns stuck-stage aggregate");
  push(Array.isArray(coaching.body?.memberCoaching), "Coaching endpoint returns member coaching aggregate");
  push(Array.isArray(coaching.body?.recommendations), "Coaching endpoint returns training recommendations");

  push(Number.isInteger(aiUsage.body?.totals?.requests), "AI usage endpoint returns aggregate request total");
  push(Number.isInteger(aiUsage.body?.totals?.totalTokens), "AI usage endpoint returns aggregate token total");
  push(Array.isArray(aiUsage.body?.byModule), "AI usage endpoint returns module aggregates");
  push(Array.isArray(aiUsage.body?.byMember), "AI usage endpoint returns member aggregates");
  push(Array.isArray(aiUsage.body?.byUnit), "AI usage endpoint returns unit aggregates");

  const forbiddenFieldNames = [
    '"email"',
    '"phone"',
    '"annualIncome"',
    '"policyNumber"',
    '"productName"',
    '"clientName"',
    '"clientId"',
    '"clientSections"',
    '"internalSections"',
    '"messages"',
    '"turns"',
    '"transcript"',
    '"notes"',
    '"policies"',
    '"familyMembers"',
    '"requestId"',
    '"error"',
    '"content"',
  ];
  const forbiddenFieldLeaks = forbiddenFieldNames.filter((field) => combinedText.includes(field));
  push(
    forbiddenFieldLeaks.length === 0,
    "Org aggregate endpoints omit forbidden client/private field names",
    forbiddenFieldLeaks.length === 0 ? forbiddenFieldNames.join(", ") : forbiddenFieldLeaks.join(", "),
  );

  const leaked = forbidden.filter((value) => combinedText.includes(value));
  push(
    leaked.length === 0,
    "Org aggregate endpoints do not expose seeded client/policy/report/message/AI sentinels",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${redact(leaked.slice(0, 4)).join(", ")}`,
  );

  console.log(
    JSON.stringify(
      {
        manager: demoEmail,
        organization: { id: org.id, slug: org.slug },
        response: {
          coaching: {
            scope: coaching.body?.scope,
            totals: coaching.body?.totals,
            completion: coaching.body?.completion,
            memberCoachingCount: coaching.body?.memberCoaching?.length ?? 0,
          },
          aiUsage: {
            scope: aiUsage.body?.scope,
            totals: aiUsage.body?.totals,
            moduleCount: aiUsage.body?.byModule?.length ?? 0,
            memberCount: aiUsage.body?.byMember?.length ?? 0,
            unitCount: aiUsage.body?.byUnit?.length ?? 0,
          },
        },
        forbiddenSentinelsChecked: forbidden.length,
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

async function getDemoOrg() {
  const result = await db.query(
    `SELECT o.id, o.slug
     FROM users u
     JOIN organization_members m ON m.user_id = u.id
     JOIN organizations o ON o.id = m.organization_id
     WHERE u.email = $1 AND u.status = 'ACTIVE' AND m.status = 'ACTIVE'
     ORDER BY m.is_default DESC, m.created_at ASC
     LIMIT 1`,
    [demoEmail],
  );

  const org = result.rows[0];

  if (!org) {
    throw new Error(`Demo organization not found for ${demoEmail}.`);
  }

  return org;
}

async function getForbiddenOrgDetailSentinels(organizationId) {
  const result = await db.query(
    `SELECT c.name, c.email, c.phone, c.occupation, c.company, c.notes,
            p.policy_number, p.product_name,
            r.title, r.client_sections::text, r.internal_sections::text,
            sm.content AS spin_message_content,
            tt.content AS theater_turn_content,
            a.request_id, a.error
     FROM clients c
     LEFT JOIN policies p ON p.client_id = c.id
     LEFT JOIN reports r ON r.client_id = c.id
     LEFT JOIN spin_sessions ss ON ss.client_id = c.id
     LEFT JOIN spin_messages sm ON sm.session_id = ss.id
     LEFT JOIN theater_sessions ts ON ts.client_id = c.id
     LEFT JOIN theater_turns tt ON tt.session_id = ts.id
     LEFT JOIN ai_usage_logs a ON a.client_id = c.id
     WHERE c.organization_id = $1
       AND c.is_demo = true
     ORDER BY c.created_at ASC
     LIMIT 40`,
    [organizationId],
  );

  return [
    ...new Set(
      result.rows
        .flatMap((row) => Object.values(row))
        .filter((value) => typeof value === "string")
        .flatMap((value) => value.split(/[{}[\\]",:]+/))
        .map((value) => value.trim())
        .filter((value) => value.length >= 4)
        .filter(
          (value) =>
            ![
              "type",
              "title",
              "content",
              "SUMMARY",
              "RECOMMENDATION",
              "READY",
              "DRAFT",
              "SHARED",
              "ACTIVE",
              "COMPLETED",
            ].includes(value),
        ),
    ),
  ];
}

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body };
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function redact(values) {
  return values.map((value) => `${value.slice(0, 2)}...${value.slice(-2)}`);
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
