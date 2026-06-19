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

  const [dbPlanUsage, forbidden] = await Promise.all([getDbPlanUsage(org.id), getForbiddenOrgDetailSentinels(org.id)]);
  const units = await request("GET", "/api/org/units", demoManagerEmail);
  const unitsText = JSON.stringify(units.body);

  push(units.status === 200, "GET /api/org/units returns 200 for demo manager", `status=${units.status}`);
  push(units.body?.scope?.role === "MANAGER", "Units endpoint is scoped to MANAGER role", units.body?.scope?.role ?? "missing");
  push(Array.isArray(units.body?.units), "Units endpoint returns units array");
  push((units.body?.units?.length ?? 0) > 0, "Units endpoint returns at least one unit");
  push(Number.isInteger(units.body?.planUsage?.activeUnits), "Units endpoint returns active unit count");
  push(Number.isInteger(units.body?.planUsage?.maxUnits), "Units endpoint returns maxUnits plan limit");
  push(
    units.body?.planUsage?.activeUnits === dbPlanUsage.activeUnits,
    "Units endpoint activeUnits matches DB",
    `${units.body?.planUsage?.activeUnits ?? "missing"}/${dbPlanUsage.activeUnits}`,
  );
  push(
    units.body?.planUsage?.maxUnits === dbPlanUsage.maxUnits,
    "Units endpoint maxUnits matches DB PlanConfig",
    `${units.body?.planUsage?.maxUnits ?? "missing"}/${dbPlanUsage.maxUnits}`,
  );
  push(units.body?.permissions?.canManageUnits === false, "Manager cannot manage org units");

  const forbiddenFieldNames = [
    '"email"',
    '"phone"',
    '"clientName"',
    '"policyNumber"',
    '"productName"',
    '"clientSections"',
    '"internalSections"',
    '"messages"',
    '"turns"',
    '"notes"',
    '"policies"',
    '"familyMembers"',
  ];
  const forbiddenFieldLeaks = forbiddenFieldNames.filter((field) => unitsText.includes(field));
  push(
    forbiddenFieldLeaks.length === 0,
    "Units endpoint omits forbidden client/private field names",
    forbiddenFieldLeaks.length === 0 ? forbiddenFieldNames.join(", ") : forbiddenFieldLeaks.join(", "),
  );

  const leaked = forbidden.filter((value) => unitsText.includes(value));
  push(
    leaked.length === 0,
    "Units endpoint does not expose seeded client/policy/report sentinels",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${redact(leaked.slice(0, 4)).join(", ")}`,
  );

  const managerPost = await request("POST", "/api/org/units", demoManagerEmail, {
    type: "BRANCH",
    name: "Demo QA Manager Forbidden Branch",
    parentId: org.headquartersId,
    slug: "demo-qa-manager-forbidden-branch",
    reason: "qa manager should not create units",
  });
  push(managerPost.status === 403, "Manager POST /api/org/units is forbidden", `status=${managerPost.status}`);
  push(managerPost.body?.error === "ORG_UNITS_WRITE_FORBIDDEN", "Manager POST returns role guard error", managerPost.body?.error ?? "missing");

  const beforeOwnerPostCount = await countUnits(org.id);
  const ownerPost = await request("POST", "/api/org/units", demoOwnerEmail, {
    type: "BRANCH",
    name: "Demo QA Max Units Branch",
    parentId: org.headquartersId,
    slug: "demo-qa-max-units-branch",
    reason: "qa maxUnits guard proof",
  });
  const afterOwnerPostCount = await countUnits(org.id);

  if (dbPlanUsage.activeUnits >= dbPlanUsage.maxUnits) {
    push(ownerPost.status === 403, "Owner POST /api/org/units respects maxUnits", `status=${ownerPost.status}`);
    push(ownerPost.body?.error === "MAX_UNITS_REACHED", "Owner POST returns maxUnits guard error", ownerPost.body?.error ?? "missing");
    push(afterOwnerPostCount === beforeOwnerPostCount, "Blocked owner POST does not create a unit", `${beforeOwnerPostCount}->${afterOwnerPostCount}`);
  } else {
    push(ownerPost.status === 201, "Owner POST /api/org/units creates a unit when below maxUnits", `status=${ownerPost.status}`);
    push(afterOwnerPostCount === beforeOwnerPostCount + 1, "Owner POST increments unit count when allowed", `${beforeOwnerPostCount}->${afterOwnerPostCount}`);
  }

  console.log(
    JSON.stringify(
      {
        manager: demoManagerEmail,
        owner: demoOwnerEmail,
        organization: {
          id: org.id,
          slug: org.slug,
          plan: org.plan,
        },
        response: {
          scope: units.body?.scope,
          planUsage: units.body?.planUsage,
          permissions: units.body?.permissions,
          unitCount: units.body?.units?.length ?? 0,
          managerPost: { status: managerPost.status, error: managerPost.body?.error },
          ownerPost: { status: ownerPost.status, error: ownerPost.body?.error ?? null },
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
    `SELECT o.id, o.slug, o.plan, h.id AS headquarters_id
     FROM users u
     JOIN organization_members m ON m.user_id = u.id
     JOIN organizations o ON o.id = m.organization_id
     LEFT JOIN organization_units h ON h.organization_id = o.id AND h.type = 'HEADQUARTERS' AND h.is_active = true
     WHERE u.email = $1 AND u.status = 'ACTIVE' AND m.status = 'ACTIVE'
     ORDER BY m.is_default DESC, m.created_at ASC
     LIMIT 1`,
    [demoManagerEmail],
  );

  const org = result.rows[0];

  if (!org) {
    throw new Error(`Demo organization not found for ${demoManagerEmail}.`);
  }

  if (!org.headquarters_id) {
    throw new Error(`Demo headquarters unit not found for ${org.slug}.`);
  }

  return {
    id: org.id,
    slug: org.slug,
    plan: org.plan,
    headquartersId: org.headquarters_id,
  };
}

async function ensureDemoOwner(organizationId) {
  const userId = "demo_user_owner";
  const membershipId = "demo_membership_owner";
  const seedKey = "user:owner";

  const userResult = await db.query(
    `INSERT INTO users (
       id, email, name, status, is_demo, demo_seed_key, demo_scenario, demo_seed_version, created_at, updated_at
     )
     VALUES (
       $1, $2, 'Demo Owner', 'ACTIVE'::"UserStatus", true, $3, 'quickstart-insurance-advisor', 1, now(), now()
     )
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       status = 'ACTIVE'::"UserStatus",
       is_demo = true,
       demo_seed_key = EXCLUDED.demo_seed_key,
       updated_at = now()
     RETURNING id`,
    [userId, demoOwnerEmail, seedKey],
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
       $1,
       $2,
       $3,
       (SELECT id FROM organization_units WHERE organization_id = $2 AND type = 'HEADQUARTERS' AND is_active = true LIMIT 1),
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
    [membershipId, organizationId, ownerUserId],
  );
}

async function getDbPlanUsage(organizationId) {
  const result = await db.query(
    `SELECT o.plan, pc.max_units, COUNT(u.id)::int AS active_units
     FROM organizations o
     JOIN plan_configs pc ON pc.plan = o.plan AND pc.is_active = true
     LEFT JOIN organization_units u ON u.organization_id = o.id AND u.is_active = true
     WHERE o.id = $1
     GROUP BY o.plan, pc.max_units`,
    [organizationId],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error(`Plan usage not found for ${organizationId}.`);
  }

  return {
    plan: row.plan,
    maxUnits: Number(row.max_units),
    activeUnits: Number(row.active_units),
  };
}

async function countUnits(organizationId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM organization_units
     WHERE organization_id = $1 AND is_active = true`,
    [organizationId],
  );

  return Number(result.rows[0]?.count ?? 0);
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
