#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const readinessSourcePath = "src/lib/platform/platform-release-readiness-repository.ts";
const runbookPath = "docs/08_acceptance-and-qa/ACC-009_release-monitoring-setup-runbook.md";
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

  const memberReadiness = await request("GET", "/api/platform/release-readiness", demoMemberEmail);
  push(
    memberReadiness.status === 403,
    "Regular app session cannot read platform release readiness",
    `status=${memberReadiness.status}, error=${memberReadiness.body?.error ?? "missing"}`,
  );

  const platformReadiness = await request("GET", "/api/platform/release-readiness", demoPlatformEmail);
  const controls = platformReadiness.body?.readiness?.productionControls?.controls ?? [];
  const monitoring = controls.find((control) => control.key === "monitoring");
  const monitoringText = JSON.stringify(monitoring ?? {});

  push(platformReadiness.status === 200, "Platform user GET /api/platform/release-readiness returns 200");
  push(Boolean(monitoring), "Release readiness includes monitoring control");
  push(
    monitoring?.label === "Error monitoring configured",
    "Monitoring control label matches release gate contract",
    monitoring?.label ?? "missing",
  );
  push(
    ["blocked", "pass"].includes(monitoring?.status),
    "Live monitoring gate returns a valid release status",
    monitoring?.status ?? "missing",
  );
  push(
    !monitoringText.includes("SENTRY_DSN") && !monitoringText.includes("NEXT_PUBLIC_SENTRY_DSN"),
    "Monitoring readiness response does not expose env var names or DSN values",
  );

  if (monitoring?.status === "blocked") {
    push(
      monitoring?.detail?.includes("DSN") === true,
      "Blocked monitoring gate explains required DSN without exposing a value",
      monitoring?.detail ?? "missing",
    );
  }

  const source = readRequiredFile(readinessSourcePath);
  push(source.includes("SENTRY_DSN"), "Release readiness source checks server Sentry DSN");
  push(source.includes("NEXT_PUBLIC_SENTRY_DSN"), "Release readiness source checks public Sentry DSN");
  push(source.includes('"monitoring"'), "Release readiness source defines monitoring gate");
  push(
    source.includes("SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN"),
    "Monitoring gate source uses the documented DSN OR contract",
  );

  const runbook = readRequiredFile(runbookPath);
  const requiredRunbookTerms = [
    "SENTRY_DSN",
    "NEXT_PUBLIC_SENTRY_DSN",
    "Operator Checklist",
    "cookie",
    "authorization header",
    "AI prompt/response",
    "pnpm monitoring:readiness-qa",
  ];
  const missingTerms = requiredRunbookTerms.filter((term) => !runbook.includes(term));
  push(missingTerms.length === 0, "Monitoring runbook documents env contract and privacy controls", missingTerms.join(", "));

  const dryRunStatuses = {
    withoutDsn: simulateMonitoringGate({}),
    withServerDsn: simulateMonitoringGate({ SENTRY_DSN: "https://redacted.invalid/1" }),
    withPublicDsn: simulateMonitoringGate({ NEXT_PUBLIC_SENTRY_DSN: "https://redacted.invalid/1" }),
  };
  push(dryRunStatuses.withoutDsn === "blocked", "Dry-run monitoring gate blocks when no DSN is configured");
  push(dryRunStatuses.withServerDsn === "pass", "Dry-run monitoring gate passes with server DSN configured");
  push(dryRunStatuses.withPublicDsn === "pass", "Dry-run monitoring gate passes with public DSN configured");

  console.log(
    JSON.stringify(
      {
        platformUser: demoPlatformEmail,
        regularUser: demoMemberEmail,
        organization: { id: org.id, slug: org.slug },
        liveMonitoring: {
          status: monitoring?.status ?? "missing",
          dsnValuePrinted: false,
        },
        dryRunStatuses,
        documents: {
          source: readinessSourcePath,
          runbook: runbookPath,
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

function simulateMonitoringGate(env) {
  return env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN ? "pass" : "blocked";
}

function readRequiredFile(path) {
  push(existsSync(path), `${path} exists`);

  if (!existsSync(path)) {
    return "";
  }

  return readFileSync(path, "utf8");
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
       '{"source":"monitoring-readiness-qa"}'::jsonb,
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

async function request(method, path, userEmail) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": userEmail,
    },
  });
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { text };
  }

  return { status: response.status, body };
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}
