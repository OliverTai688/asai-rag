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
  const forbidden = await getForbiddenClientDetailSentinels(org.id);
  const overview = await get("/api/org/overview");
  const overviewText = JSON.stringify(overview.body);

  push(overview.status === 200, "GET /api/org/overview returns 200 for demo manager", `status=${overview.status}`);
  push(overview.body?.scope?.role === "MANAGER", "Overview is scoped to MANAGER role", overview.body?.scope?.role ?? "missing");
  push(Number.isInteger(overview.body?.totals?.clients), "Overview exposes aggregate client count only");
  push(Array.isArray(overview.body?.unitHealth), "Overview exposes unit health array");
  push(Array.isArray(overview.body?.memberHealth), "Overview exposes member health array");
  push(Boolean(overview.body?.coaching), "Overview exposes coaching summary");

  const leaked = forbidden.filter((value) => overviewText.includes(value));
  push(
    leaked.length === 0,
    "Overview does not expose member client detail sentinels",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${redact(leaked.slice(0, 4)).join(", ")}`,
  );

  const detailFields = ["email", "phone", "annualIncome", "notes", "policies", "familyMembers", "clientSections", "internalSections"];
  const detailFieldLeaks = detailFields.filter((field) => overviewText.includes(`"${field}"`));
  push(
    detailFieldLeaks.length === 0,
    "Overview response omits client detail field names",
    detailFieldLeaks.length === 0 ? detailFields.join(", ") : detailFieldLeaks.join(", "),
  );

  const clients = await get("/api/clients");
  const clientsText = JSON.stringify(clients.body);
  const clientLeaks = forbidden.filter((value) => clientsText.includes(value));
  push(clients.status === 200, "GET /api/clients remains member-owned route for manager session", `status=${clients.status}`);
  push(
    clientLeaks.length === 0,
    "Manager member-owned clients route does not leak other members' seeded client details",
    clientLeaks.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${redact(clientLeaks.slice(0, 4)).join(", ")}`,
  );

  console.log(
    JSON.stringify(
      {
        manager: demoEmail,
        organization: { id: org.id, slug: org.slug },
        overview: {
          totals: overview.body?.totals,
          coaching: overview.body?.coaching,
          unitHealthCount: overview.body?.unitHealth?.length ?? 0,
          memberHealthCount: overview.body?.memberHealth?.length ?? 0,
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

async function getForbiddenClientDetailSentinels(organizationId) {
  const result = await db.query(
    `SELECT c.name, c.email, c.phone, c.occupation, c.company, c.notes, p.policy_number, p.product_name
     FROM clients c
     LEFT JOIN policies p ON p.client_id = c.id
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
        .map((value) => value.trim())
        .filter((value) => value.length >= 3),
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
