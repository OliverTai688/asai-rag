#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const demoOwnerEmail = process.env.DEMO_OWNER_QA_EMAIL ?? "demo.owner@asai.local";
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
  await ensureDemoOwner(org.id);

  const forbidden = await getForbiddenOrgDetailSentinels(org.id);
  const managerGet = await request("GET", "/api/org/settings", demoManagerEmail);
  const managerText = JSON.stringify(managerGet.body);

  push(managerGet.status === 200, "Manager GET /api/org/settings returns 200", `status=${managerGet.status}`);
  push(managerGet.body?.scope?.role === "MANAGER", "Org settings scope is MANAGER", managerGet.body?.scope?.role ?? "missing");
  push(managerGet.body?.permissions?.canWrite === false, "Manager receives read-only org settings permission");
  push(Boolean(managerGet.body?.settings?.clientPortal), "Org settings returns client portal policy");
  push(Boolean(managerGet.body?.settings?.complianceDefaults), "Org settings returns compliance defaults");
  push(Boolean(managerGet.body?.planPolicy), "Org settings returns plan policy");

  const managerPatch = await request("PATCH", "/api/org/settings", demoManagerEmail, settingsPatchPayload());
  push(managerPatch.status === 403, "Manager PATCH /api/org/settings is forbidden", `status=${managerPatch.status}`);
  push(managerPatch.body?.error === "ORG_SETTINGS_WRITE_FORBIDDEN", "Manager PATCH returns org settings write guard", managerPatch.body?.error ?? "missing");

  const beforeAuditCount = await countOrgSettingsAudit(org.id);
  const ownerPatch = await request("PATCH", "/api/org/settings", demoOwnerEmail, settingsPatchPayload());
  const afterAuditCount = await countOrgSettingsAudit(org.id);

  push(ownerPatch.status === 200, "Owner PATCH /api/org/settings returns 200", `status=${ownerPatch.status}`);
  push(ownerPatch.body?.permissions?.canWrite === true, "Owner response confirms write permission");
  push(
    ownerPatch.body?.settings?.clientPortal?.defaultCtaLabel === "補充資料",
    "Owner PATCH persists safe client portal CTA label",
    ownerPatch.body?.settings?.clientPortal?.defaultCtaLabel ?? "missing",
  );
  push(afterAuditCount > beforeAuditCount, "Owner PATCH writes AuditLog", `${beforeAuditCount}->${afterAuditCount}`);

  const ownerText = JSON.stringify(ownerPatch.body);
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
    '"notes"',
    '"familyMembers"',
    '"providerCustomerId"',
    '"providerSubscriptionId"',
    '"stripeCustomerId"',
    '"stripeSubscriptionId"',
  ];
  const forbiddenFieldLeaks = forbiddenFieldNames.filter((field) => managerText.includes(field) || ownerText.includes(field));
  push(
    forbiddenFieldLeaks.length === 0,
    "Org settings endpoint omits forbidden private field names",
    forbiddenFieldLeaks.length === 0 ? forbiddenFieldNames.join(", ") : forbiddenFieldLeaks.join(", "),
  );

  const leaked = forbidden.filter((value) => managerText.includes(value) || ownerText.includes(value));
  push(
    leaked.length === 0,
    "Org settings endpoint does not expose seeded client/policy/report sentinels",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${redact(leaked.slice(0, 4)).join(", ")}`,
  );

  console.log(
    JSON.stringify(
      {
        manager: demoManagerEmail,
        owner: demoOwnerEmail,
        organization: { id: org.id, slug: org.slug },
        responses: {
          managerGet: {
            status: managerGet.status,
            role: managerGet.body?.scope?.role,
            canWrite: managerGet.body?.permissions?.canWrite,
            plan: managerGet.body?.organization?.plan,
          },
          managerPatch: { status: managerPatch.status, error: managerPatch.body?.error },
          ownerPatch: {
            status: ownerPatch.status,
            canWrite: ownerPatch.body?.permissions?.canWrite,
            defaultCtaLabel: ownerPatch.body?.settings?.clientPortal?.defaultCtaLabel,
          },
        },
        forbiddenSentinelsChecked: forbidden.length,
        auditCount: { before: beforeAuditCount, after: afterAuditCount },
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

function settingsPatchPayload() {
  return {
    clientPortal: {
      enabled: true,
      shareBrandingEnabled: true,
      defaultCtaLabel: "補充資料",
      defaultCtaUrl: "",
    },
    complianceDefaults: {
      requireKycBeforeReport: true,
      requireSuitabilityCheck: true,
      defaultReviewLevel: "BASIC",
    },
    aiQuota: {
      warningThresholdPercent: 80,
    },
    reason: "qa org settings audit proof",
  };
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
    [demoManagerEmail],
  );

  const org = result.rows[0];

  if (!org) {
    throw new Error(`Demo organization not found for ${demoManagerEmail}.`);
  }

  return org;
}

async function ensureDemoOwner(organizationId) {
  const userResult = await db.query(
    `INSERT INTO users (
       id, email, name, status, is_demo, demo_seed_key, demo_scenario, demo_seed_version, created_at, updated_at
     )
     VALUES (
       'demo_user_owner', $1, 'Demo Owner', 'ACTIVE'::"UserStatus", true, 'user:owner', 'quickstart-insurance-advisor', 1, now(), now()
     )
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       status = 'ACTIVE'::"UserStatus",
       is_demo = true,
       demo_seed_key = EXCLUDED.demo_seed_key,
       updated_at = now()
     RETURNING id`,
    [demoOwnerEmail],
  );
  const ownerUserId = userResult.rows[0]?.id;

  if (!ownerUserId) {
    throw new Error(`Unable to upsert demo owner ${demoOwnerEmail}.`);
  }

  await db.query(
    `INSERT INTO organization_members (
       id, organization_id, user_id, primary_unit_id, role, status, title, is_default, created_at, updated_at
     )
     VALUES (
       'demo_membership_owner',
       $1,
       $2,
       (SELECT id FROM organization_units WHERE organization_id = $1 AND type = 'HEADQUARTERS' AND is_active = true LIMIT 1),
       'OWNER'::"MemberRole",
       'ACTIVE'::"MembershipStatus",
       'Demo owner',
       false,
       now(),
       now()
     )
     ON CONFLICT (organization_id, user_id) DO UPDATE SET
       role = 'OWNER'::"MemberRole",
       status = 'ACTIVE'::"MembershipStatus",
       title = EXCLUDED.title,
       updated_at = now()`,
    [organizationId, ownerUserId],
  );
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

async function countOrgSettingsAudit(organizationId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM audit_logs
     WHERE organization_id = $1 AND resource_type = 'ORG_SETTINGS'`,
    [organizationId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function request(method, path, email, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": email,
    },
    body: body ? JSON.stringify(body) : undefined,
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
