#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_QA_EMAIL ?? "demo.member@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new Client({ connectionString: dbUrl });
const checks = [];

await db.connect();

try {
  const org = await getDemoOrg();
  const before = await getCounts(org.id);
  const unique = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const clientName = `LCH-005 寫入驗證客戶 ${unique}`;

  const created = await post("/api/clients", {
    name: clientName,
    email: `lch005-${unique}@asai.local`,
    phone: "0912-345-678",
    birthDate: "1988-08-08",
    occupation: "上線驗證測試",
    annualIncome: 1800000,
    status: "PROSPECT",
  });

  push(created.status === 201, "POST /api/clients creates demo test client", `status=${created.status}`);
  const clientId = created.body?.client?.id;
  push(Boolean(clientId), "Created client id is returned", clientId ?? "missing");

  const detail = await get(`/api/clients/${clientId}`);
  push(detail.status === 200, "GET created client returns 200", `status=${detail.status}`);
  push(detail.body?.client?.name === clientName, "Created client survives API reread", detail.body?.client?.name ?? "missing");
  push(
    detail.body?.client?.complianceChecklist?.kycStatus === "MISSING",
    "Created client has initialized compliance checklist",
    detail.body?.client?.complianceChecklist?.kycStatus ?? "missing",
  );

  const output = await post("/api/ai/interview/outputs", {
    clientId,
    materials: [
      `${clientName} 是 demo member 新增的上線驗證客戶。`,
      "家庭責任包含配偶與一名子女，主要想確認醫療與收入中斷風險。",
    ],
    messages: [
      { role: "user", content: "客戶擔心預算，但願意先了解保障缺口。" },
      { role: "assistant", content: "我會先整理已知事實、待確認問題與下一步對話卡。" },
    ],
  });

  push(output.status === 200, "POST /api/ai/interview/outputs generates AI output", `status=${output.status}`);
  push(Array.isArray(output.body?.clientProfile?.knownFacts), "AI output includes clientProfile.knownFacts");
  push(Array.isArray(output.body?.conversationPrepCard?.firstQuestions), "AI output includes prep questions");

  const after = await getCounts(org.id, clientId);
  push(after.clients_for_created_id === 1, "Created client is persisted in DB", `count=${after.clients_for_created_id}`);
  push(after.interview_usage > before.interview_usage, "INTERVIEW AiUsageLog count increases", `${before.interview_usage}->${after.interview_usage}`);
  push(after.client_interaction_events > 0, "AI output InteractionEvent is linked to created client", `count=${after.client_interaction_events}`);
  push(after.monthly_ai_used > before.monthly_ai_used, "monthlyAiUsed increments after AI output", `${before.monthly_ai_used}->${after.monthly_ai_used}`);

  console.log(
    JSON.stringify(
      {
        clientId,
        clientName,
        before,
        after,
        outputSummary: {
          knownFacts: output.body?.clientProfile?.knownFacts?.length ?? 0,
          prepQuestions: output.body?.conversationPrepCard?.firstQuestions?.length ?? 0,
          issueReadiness: output.body?.issueReadiness?.length ?? 0,
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

async function getDemoOrg() {
  const result = await db.query(
    `SELECT o.id, o.slug, o.monthly_ai_used
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

async function getCounts(organizationId, clientId = "") {
  const result = await db.query(
    `SELECT
      (SELECT COUNT(*)::int FROM ai_usage_logs WHERE organization_id = $1 AND module = 'INTERVIEW') AS interview_usage,
      (SELECT monthly_ai_used FROM organizations WHERE id = $1) AS monthly_ai_used,
      (SELECT COUNT(*)::int FROM clients WHERE id = NULLIF($2, '')) AS clients_for_created_id,
      (SELECT COUNT(*)::int FROM interaction_events WHERE organization_id = $1 AND client_id = NULLIF($2, '') AND type = 'VISIT') AS client_interaction_events`,
    [organizationId, clientId],
  );

  return result.rows[0];
}

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "x-asai-demo-user-email": demoEmail,
    },
  });
  return parseResponse(response);
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": demoEmail,
    },
    body: JSON.stringify(body),
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
