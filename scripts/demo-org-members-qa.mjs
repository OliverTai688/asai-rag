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
  const members = await get("/api/org/members");
  const membersText = JSON.stringify(members.body);

  push(members.status === 200, "GET /api/org/members returns 200 for demo manager", `status=${members.status}`);
  push(members.body?.scope?.role === "MANAGER", "Members endpoint is scoped to MANAGER role", members.body?.scope?.role ?? "missing");
  push(Array.isArray(members.body?.members), "Members endpoint returns members array");
  push((members.body?.members?.length ?? 0) > 0, "Members endpoint returns at least one scoped member");
  push(Array.isArray(members.body?.units), "Members endpoint returns units array");
  push(Number.isInteger(members.body?.totals?.members), "Members endpoint returns aggregate totals");

  const firstMember = members.body?.members?.[0] ?? {};
  push(Boolean(firstMember.membershipId), "Member item includes membership id", firstMember.membershipId ?? "missing");
  push(Boolean(firstMember.userId), "Member item includes user id", firstMember.userId ?? "missing");
  push(Boolean(firstMember.displayName), "Member item includes display name", firstMember.displayName ?? "missing");
  push(Boolean(firstMember.role), "Member item includes role", firstMember.role ?? "missing");
  push(Boolean(firstMember.membershipStatus), "Member item includes membership status", firstMember.membershipStatus ?? "missing");
  push(Boolean(firstMember.seat), "Member item includes seat metadata");
  push(Boolean(firstMember.aggregates), "Member item includes aggregate metrics");

  const forbiddenFieldNames = [
    '"email"',
    '"settings"',
    '"clientName"',
    '"phone"',
    '"annualIncome"',
    '"policyNumber"',
    '"productName"',
    '"clientSections"',
    '"internalSections"',
    '"messages"',
    '"turns"',
    '"transcript"',
    '"notes"',
    '"policies"',
    '"familyMembers"',
  ];
  const forbiddenFieldLeaks = forbiddenFieldNames.filter((field) => membersText.includes(field));
  push(
    forbiddenFieldLeaks.length === 0,
    "Members endpoint omits forbidden client/private field names",
    forbiddenFieldLeaks.length === 0 ? forbiddenFieldNames.join(", ") : forbiddenFieldLeaks.join(", "),
  );

  const leaked = forbidden.filter((value) => membersText.includes(value));
  push(
    leaked.length === 0,
    "Members endpoint does not expose seeded client/policy/report sentinels",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${redact(leaked.slice(0, 4)).join(", ")}`,
  );

  console.log(
    JSON.stringify(
      {
        manager: demoEmail,
        organization: { id: org.id, slug: org.slug },
        response: {
          scope: members.body?.scope,
          totals: members.body?.totals,
          memberCount: members.body?.members?.length ?? 0,
          unitCount: members.body?.units?.length ?? 0,
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
            r.title, r.client_sections::text, r.internal_sections::text
     FROM clients c
     LEFT JOIN policies p ON p.client_id = c.id
     LEFT JOIN reports r ON r.client_id = c.id
     WHERE c.organization_id = $1
       AND c.is_demo = true
     ORDER BY c.created_at ASC
     LIMIT 20`,
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
        .filter((value) => !["type", "title", "content", "SUMMARY", "RECOMMENDATION"].includes(value)),
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
  checks.push({ status: condition ? "pass" : "fail", label: detail ? `${label}` : label, detail });
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
