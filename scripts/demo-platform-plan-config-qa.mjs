#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
const demoFinanceEmail = process.env.DEMO_PLATFORM_FINANCE_QA_EMAIL ?? "demo.platform.finance@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const plan = "STARTER";
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

  const original = await getPlanConfig(plan);
  const beforeAuditCount = await countPlanUpdateAudit(plan);
  const patchValue = original.monthly_ai_quota + 1;

  const financePatch = await request("PATCH", `/api/platform/plan-configs/${plan}`, demoFinanceEmail, {
    monthlyAiQuota: patchValue,
    reason: "qa finance should not update plan config",
    riskAccepted: true,
  });
  push(
    financePatch.status === 403,
    "FINANCE platform user cannot PATCH plan config",
    `status=${financePatch.status}, error=${financePatch.body?.error ?? "missing"}`,
  );

  const invalidPatch = await request("PATCH", `/api/platform/plan-configs/${plan}`, demoPlatformEmail, {
    monthlyAiQuota: patchValue,
    riskAccepted: true,
  });
  push(
    invalidPatch.status === 400,
    "SUPER_ADMIN PATCH without reason is rejected",
    `status=${invalidPatch.status}, error=${invalidPatch.body?.error ?? "missing"}`,
  );

  const updatePatch = await request("PATCH", `/api/platform/plan-configs/${plan}`, demoPlatformEmail, {
    monthlyAiQuota: patchValue,
    reason: "qa temporary plan config update proof",
    riskAccepted: true,
  });
  const afterUpdate = await getPlanConfig(plan);
  const afterUpdateAuditCount = await countPlanUpdateAudit(plan);

  push(updatePatch.status === 200, "SUPER_ADMIN PATCH /api/platform/plan-configs/[plan] returns 200");
  push(
    updatePatch.body?.planConfig?.monthlyAiQuota === patchValue,
    "Plan config response returns updated monthly AI quota",
    `${updatePatch.body?.planConfig?.monthlyAiQuota ?? "missing"}`,
  );
  push(afterUpdate.monthly_ai_quota === patchValue, "Plan config DB row was updated", `${afterUpdate.monthly_ai_quota}`);
  push(
    afterUpdateAuditCount > beforeAuditCount,
    "Plan config PATCH writes PLAN_UPDATE AuditLog",
    `${beforeAuditCount}->${afterUpdateAuditCount}`,
  );

  const restorePatch = await request("PATCH", `/api/platform/plan-configs/${plan}`, demoPlatformEmail, {
    monthlyAiQuota: original.monthly_ai_quota,
    reason: "qa restore plan config monthly quota",
    riskAccepted: true,
  });
  const restored = await getPlanConfig(plan);
  const afterRestoreAuditCount = await countPlanUpdateAudit(plan);

  push(restorePatch.status === 200, "SUPER_ADMIN restore PATCH returns 200", `status=${restorePatch.status}`);
  push(restored.monthly_ai_quota === original.monthly_ai_quota, "Plan config quota restored", `${restored.monthly_ai_quota}`);
  push(
    afterRestoreAuditCount > afterUpdateAuditCount,
    "Restore PATCH writes a second PLAN_UPDATE AuditLog",
    `${afterUpdateAuditCount}->${afterRestoreAuditCount}`,
  );

  const auditLogs = await request(
    "GET",
    `/api/platform/audit-logs?action=PLAN_UPDATE&sensitivity=HIGH`,
    demoPlatformEmail,
  );
  const auditText = JSON.stringify(auditLogs.body);
  push(auditLogs.status === 200, "Platform audit log query can filter PLAN_UPDATE/HIGH");
  push(
    auditLogs.body?.auditLogs?.some((item) => item.resourceType === "PLAN_CONFIG" && item.resourceId === plan),
    "Audit log query includes PLAN_CONFIG entry",
  );
  push(
    !auditText.includes('"metadata"') && auditText.includes('"metadataKeys"'),
    "Audit log query exposes metadataKeys instead of raw metadata",
  );

  console.log(
    JSON.stringify(
      {
        plan,
        platformUser: demoPlatformEmail,
        financeUser: demoFinanceEmail,
        organization: { id: org.id, slug: org.slug },
        responses: {
          financePatch: { status: financePatch.status, error: financePatch.body?.error },
          invalidPatch: { status: invalidPatch.status, error: invalidPatch.body?.error },
          updatePatch: {
            status: updatePatch.status,
            monthlyAiQuota: updatePatch.body?.planConfig?.monthlyAiQuota,
            changedFields: updatePatch.body?.audit?.changedFields,
          },
          restorePatch: {
            status: restorePatch.status,
            monthlyAiQuota: restorePatch.body?.planConfig?.monthlyAiQuota,
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
       '{"source":"demo-platform-plan-config-qa"}'::jsonb,
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

async function getPlanConfig(targetPlan) {
  const result = await db.query(
    `SELECT plan, display_name, max_members, max_collaborators, max_units, monthly_ai_quota,
            share_branding_enabled, client_portal_enabled, impersonation_allowed, is_active
     FROM plan_configs
     WHERE plan = $1::"OrganizationPlan"
     LIMIT 1`,
    [targetPlan],
  );

  const config = result.rows[0];

  if (!config) {
    throw new Error(`Plan config not found for ${targetPlan}.`);
  }

  return config;
}

async function countPlanUpdateAudit(targetPlan) {
  const result = await db.query(
    `SELECT count(*)::int AS count
     FROM audit_logs
     WHERE action = 'PLAN_UPDATE'::"AuditAction"
       AND resource_type = 'PLAN_CONFIG'
       AND resource_id = $1`,
    [targetPlan],
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
