#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
const demoFinanceEmail = process.env.DEMO_PLATFORM_FINANCE_QA_EMAIL ?? "demo.platform.finance@asai.local";
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
  await ensurePlatformUser(org.id, {
    userId: "demo_user_platform",
    membershipId: "demo_membership_platform",
    platformUserId: "demo_platform_user_super_admin",
    email: demoPlatformEmail,
    name: "Demo Platform Admin",
    role: "SUPER_ADMIN",
  });
  await ensurePlatformUser(org.id, {
    userId: "demo_user_platform_finance",
    membershipId: "demo_membership_platform_finance",
    platformUserId: "demo_platform_user_finance",
    email: demoFinanceEmail,
    name: "Demo Platform Finance",
    role: "FINANCE",
  });

  const financeGet = await request("GET", "/api/platform/settings", demoFinanceEmail);
  push(financeGet.status === 200, "FINANCE platform user can read platform settings", `status=${financeGet.status}`);
  push(financeGet.body?.settings?.id === "default", "GET /api/platform/settings returns default settings row");

  const original = financeGet.body?.settings;
  const beforeAuditCount = await countSettingsAudit();
  const nextTrialDays = Number(original?.trialDays ?? 14) + 1;
  const nextClientPortalEnabled = !Boolean(original?.featureFlags?.clientPortalEnabled);

  const financePatch = await request("PATCH", "/api/platform/settings", demoFinanceEmail, {
    trialDays: nextTrialDays,
    reason: "qa finance should not update platform settings",
    riskAccepted: true,
  });
  push(
    financePatch.status === 403,
    "FINANCE platform user cannot PATCH platform settings",
    `status=${financePatch.status}, error=${financePatch.body?.error ?? "missing"}`,
  );

  const invalidPatch = await request("PATCH", "/api/platform/settings", demoPlatformEmail, {
    trialDays: nextTrialDays,
    riskAccepted: true,
  });
  push(
    invalidPatch.status === 400,
    "SUPER_ADMIN PATCH without reason is rejected",
    `status=${invalidPatch.status}, error=${invalidPatch.body?.error ?? "missing"}`,
  );

  const updatePatch = await request("PATCH", "/api/platform/settings", demoPlatformEmail, {
    trialDays: nextTrialDays,
    featureFlags: {
      clientPortalEnabled: nextClientPortalEnabled,
    },
    reason: "qa temporary platform settings update proof",
    riskAccepted: true,
  });
  const afterUpdateRow = await getSettingsRow();
  const afterUpdateAuditCount = await countSettingsAudit();

  push(updatePatch.status === 200, "SUPER_ADMIN PATCH /api/platform/settings returns 200");
  push(
    updatePatch.body?.settings?.trialDays === nextTrialDays,
    "Platform settings response returns updated trial days",
    `${updatePatch.body?.settings?.trialDays ?? "missing"}`,
  );
  push(afterUpdateRow.trial_days === nextTrialDays, "Platform settings DB row was updated", `${afterUpdateRow.trial_days}`);
  push(
    afterUpdateAuditCount > beforeAuditCount,
    "Platform settings PATCH writes SUPPORT_NOTE/HIGH AuditLog",
    `${beforeAuditCount}->${afterUpdateAuditCount}`,
  );

  const restorePatch = await request("PATCH", "/api/platform/settings", demoPlatformEmail, {
    trialDays: original.trialDays,
    featureFlags: original.featureFlags,
    providerPolicy: original.providerPolicy,
    supportPolicy: original.supportPolicy,
    reason: "qa restore platform settings to original values",
    riskAccepted: true,
  });
  const restored = await getSettingsRow();
  const afterRestoreAuditCount = await countSettingsAudit();

  push(restorePatch.status === 200, "SUPER_ADMIN restore PATCH returns 200", `status=${restorePatch.status}`);
  push(restored.trial_days === original.trialDays, "Platform settings trial days restored", `${restored.trial_days}`);
  push(
    afterRestoreAuditCount > afterUpdateAuditCount,
    "Restore PATCH writes a second SUPPORT_NOTE/HIGH AuditLog",
    `${afterUpdateAuditCount}->${afterRestoreAuditCount}`,
  );

  const auditLogs = await request("GET", "/api/platform/audit-logs?action=SUPPORT_NOTE&sensitivity=HIGH", demoPlatformEmail);
  const auditText = JSON.stringify(auditLogs.body);
  push(auditLogs.status === 200, "Platform audit log query can filter SUPPORT_NOTE/HIGH");
  push(
    auditLogs.body?.auditLogs?.some((item) => item.resourceType === "PLATFORM_SETTINGS" && item.resourceId === "default"),
    "Audit log query includes PLATFORM_SETTINGS entry",
  );
  push(
    !auditText.includes('"metadata"') && auditText.includes('"metadataKeys"'),
    "Audit log query exposes metadataKeys instead of raw metadata",
  );

  console.log(
    JSON.stringify(
      {
        platformUser: demoPlatformEmail,
        financeUser: demoFinanceEmail,
        organization: { id: org.id, slug: org.slug },
        responses: {
          financeGet: { status: financeGet.status },
          financePatch: { status: financePatch.status, error: financePatch.body?.error },
          invalidPatch: { status: invalidPatch.status, error: invalidPatch.body?.error },
          updatePatch: {
            status: updatePatch.status,
            trialDays: updatePatch.body?.settings?.trialDays,
            changedFields: updatePatch.body?.audit?.changedFields,
          },
          restorePatch: {
            status: restorePatch.status,
            trialDays: restorePatch.body?.settings?.trialDays,
          },
          auditLogs: {
            status: auditLogs.status,
            count: auditLogs.body?.auditLogs?.length ?? 0,
          },
        },
        auditCount: {
          before: beforeAuditCount,
          afterUpdate: afterUpdateAuditCount,
          afterRestore: afterRestoreAuditCount,
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

async function ensurePlatformUser(organizationId, user) {
  const userResult = await db.query(
    `INSERT INTO users (
       id, email, name, status, is_demo, demo_seed_key, demo_scenario, demo_seed_version, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, 'ACTIVE'::"UserStatus", true, $4, 'quickstart-insurance-advisor', 1, now(), now()
     )
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       status = 'ACTIVE'::"UserStatus",
       is_demo = true,
       demo_seed_key = EXCLUDED.demo_seed_key,
       updated_at = now()
     RETURNING id`,
    [user.userId, user.email, user.name, `user:platform:${user.role.toLowerCase()}`],
  );
  const userId = userResult.rows[0]?.id;

  if (!userId) {
    throw new Error(`Unable to upsert platform demo user ${user.email}.`);
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
       $4,
       false,
       now(),
       now()
     )
     ON CONFLICT (organization_id, user_id) DO UPDATE SET
       role = 'OWNER'::"MemberRole",
       status = 'ACTIVE'::"MembershipStatus",
       title = EXCLUDED.title,
       updated_at = now()`,
    [user.membershipId, organizationId, userId, `Demo platform ${user.role.toLowerCase()} access anchor`],
  );

  await db.query(
    `INSERT INTO platform_users (
       id, user_id, role, is_active, require_mfa, metadata, created_at, updated_at
     )
     VALUES (
       $1,
       $2,
       $3::"PlatformRole",
       true,
       false,
       '{"source":"demo-platform-settings-qa"}'::jsonb,
       now(),
       now()
     )
     ON CONFLICT (user_id, role) DO UPDATE SET
       is_active = true,
       require_mfa = false,
       updated_at = now()`,
    [user.platformUserId, userId, user.role],
  );
}

async function getSettingsRow() {
  const result = await db.query(
    `SELECT trial_days, feature_flags, provider_policy, support_policy
     FROM system_settings
     WHERE id = 'default'
     LIMIT 1`,
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("System settings row was not created.");
  }

  return row;
}

async function countSettingsAudit() {
  const result = await db.query(
    `SELECT count(*)::int AS count
     FROM audit_logs
     WHERE action = 'SUPPORT_NOTE'::"AuditAction"
       AND sensitivity = 'HIGH'::"AuditSensitivity"
       AND resource_type = 'PLATFORM_SETTINGS'
       AND resource_id = 'default'`,
  );

  return result.rows[0]?.count ?? 0;
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
