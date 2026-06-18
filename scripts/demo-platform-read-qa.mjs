#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
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
  await ensurePlatformUser(org.id);

  const forbidden = await getForbiddenSentinels(org.id);
  const memberSummary = await request("GET", "/api/platform/organizations", demoMemberEmail);
  push(
    memberSummary.status === 403,
    "Regular app session cannot read platform organizations",
    `status=${memberSummary.status}, error=${memberSummary.body?.error ?? "missing"}`,
  );

  const organizations = await request("GET", "/api/platform/organizations", demoPlatformEmail);
  push(organizations.status === 200, "Platform user GET /api/platform/organizations returns 200");
  push(Array.isArray(organizations.body?.organizations), "Organizations response returns organization list");
  push(Boolean(organizations.body?.totals), "Organizations response returns platform totals");

  const targetOrgId = organizations.body?.organizations?.find((item) => item.slug === org.slug)?.id ?? org.id;
  const organizationDetail = await request("GET", `/api/platform/organizations/${targetOrgId}`, demoPlatformEmail);
  push(organizationDetail.status === 200, "Platform user GET /api/platform/organizations/[id] returns 200");
  push(Boolean(organizationDetail.body?.health), "Organization detail returns tenant health summary");
  push(Array.isArray(organizationDetail.body?.units), "Organization detail returns unit summaries");

  const aiUsage = await request("GET", "/api/platform/ai-usage", demoPlatformEmail);
  push(aiUsage.status === 200, "Platform user GET /api/platform/ai-usage returns 200");
  push(Boolean(aiUsage.body?.totals), "Platform AI usage returns totals");
  push(Array.isArray(aiUsage.body?.byOrganization), "Platform AI usage returns tenant aggregate");

  const auditLogs = await request(
    "GET",
    `/api/platform/audit-logs?organizationId=${encodeURIComponent(targetOrgId)}`,
    demoPlatformEmail,
  );
  push(auditLogs.status === 200, "Platform user GET /api/platform/audit-logs returns 200");
  push(Array.isArray(auditLogs.body?.auditLogs), "Platform audit logs response returns list");

  const allBodies = [organizations.body, organizationDetail.body, aiUsage.body, auditLogs.body].map((body) =>
    JSON.stringify(body),
  );
  const forbiddenFieldNames = [
    '"email"',
    '"phone"',
    '"policyNumber"',
    '"productName"',
    '"clientSections"',
    '"internalSections"',
    '"messages"',
    '"turns"',
    '"transcript"',
    '"requestId"',
    '"error"',
    '"providerCustomerId"',
    '"providerSubscriptionId"',
    '"stripeCustomerId"',
    '"stripeSubscriptionId"',
    '"metadata"',
  ];
  const forbiddenFieldLeaks = forbiddenFieldNames.filter((field) => allBodies.some((body) => body.includes(field)));
  push(
    forbiddenFieldLeaks.length === 0,
    "Platform summary endpoints omit forbidden private field names",
    forbiddenFieldLeaks.length === 0 ? forbiddenFieldNames.join(", ") : forbiddenFieldLeaks.join(", "),
  );

  const leaked = forbidden.filter((value) => allBodies.some((body) => body.includes(value)));
  push(
    leaked.length === 0,
    "Platform summary endpoints do not expose seeded client/policy/report sentinels",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${redact(leaked.slice(0, 4)).join(", ")}`,
  );

  console.log(
    JSON.stringify(
      {
        platformUser: demoPlatformEmail,
        regularUser: demoMemberEmail,
        organization: { id: org.id, slug: org.slug },
        responses: {
          memberSummary: { status: memberSummary.status, error: memberSummary.body?.error },
          organizations: {
            status: organizations.status,
            count: organizations.body?.organizations?.length ?? 0,
            activeOrganizations: organizations.body?.totals?.activeOrganizations ?? 0,
          },
          organizationDetail: {
            status: organizationDetail.status,
            healthKeys: Object.keys(organizationDetail.body?.health ?? {}),
          },
          aiUsage: {
            status: aiUsage.status,
            requests: aiUsage.body?.totals?.requests ?? 0,
            errors: aiUsage.body?.totals?.errorCount ?? 0,
          },
          auditLogs: {
            status: auditLogs.status,
            count: auditLogs.body?.auditLogs?.length ?? 0,
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
    [demoMemberEmail],
  );

  const org = result.rows[0];

  if (!org) {
    throw new Error(`Demo organization not found for ${demoMemberEmail}.`);
  }

  return org;
}

async function ensurePlatformUser(organizationId) {
  const userResult = await db.query(
    `INSERT INTO users (
       id, email, name, status, is_demo, demo_seed_key, demo_scenario, demo_seed_version, created_at, updated_at
     )
     VALUES (
       'demo_user_platform', $1, 'Demo Platform Admin', 'ACTIVE'::"UserStatus", true, 'user:platform', 'quickstart-insurance-advisor', 1, now(), now()
     )
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       status = 'ACTIVE'::"UserStatus",
       is_demo = true,
       demo_seed_key = EXCLUDED.demo_seed_key,
       updated_at = now()
     RETURNING id`,
    [demoPlatformEmail],
  );
  const userId = userResult.rows[0]?.id;

  if (!userId) {
    throw new Error(`Unable to upsert platform demo user ${demoPlatformEmail}.`);
  }

  await db.query(
    `INSERT INTO organization_members (
       id, organization_id, user_id, primary_unit_id, role, status, title, is_default, created_at, updated_at
     )
     VALUES (
       'demo_membership_platform',
       $1,
       $2,
       (SELECT id FROM organization_units WHERE organization_id = $1 AND type = 'HEADQUARTERS' AND is_active = true LIMIT 1),
       'OWNER'::"MemberRole",
       'ACTIVE'::"MembershipStatus",
       'Demo platform access anchor',
       false,
       now(),
       now()
     )
     ON CONFLICT (organization_id, user_id) DO UPDATE SET
       role = 'OWNER'::"MemberRole",
       status = 'ACTIVE'::"MembershipStatus",
       title = EXCLUDED.title,
       updated_at = now()`,
    [organizationId, userId],
  );

  await db.query(
    `INSERT INTO platform_users (
       id, user_id, role, is_active, require_mfa, metadata, created_at, updated_at
     )
     VALUES (
       'demo_platform_user_super_admin',
       $1,
       'SUPER_ADMIN'::"PlatformRole",
       true,
       false,
       '{"source":"demo-platform-read-qa"}'::jsonb,
       now(),
       now()
     )
     ON CONFLICT (user_id, role) DO UPDATE SET
       is_active = true,
       require_mfa = false,
       updated_at = now()`,
    [userId],
  );
}

async function getForbiddenSentinels(organizationId) {
  const result = await db.query(
    `SELECT c.name, c.email, c.phone, c.occupation, c.company, c.notes,
            p.policy_number, p.product_name,
            r.title, r.client_sections::text, r.internal_sections::text,
            a.error, a.request_id
     FROM clients c
     LEFT JOIN policies p ON p.client_id = c.id
     LEFT JOIN reports r ON r.client_id = c.id
     LEFT JOIN ai_usage_logs a ON a.client_id = c.id
     WHERE c.organization_id = $1
     LIMIT 20`,
    [organizationId],
  );

  return [
    ...new Set(
      result.rows
        .flatMap((row) => Object.values(row))
        .filter((value) => typeof value === "string" && value.length >= 4),
    ),
  ];
}

async function request(method, path, email) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": email,
    },
  });
  const text = await response.text();

  try {
    return { status: response.status, body: text ? JSON.parse(text) : null };
  } catch {
    return { status: response.status, body: { raw: text } };
  }
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function redact(values) {
  return values.map((value) => `${String(value).slice(0, 3)}…${String(value).slice(-2)}`);
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
