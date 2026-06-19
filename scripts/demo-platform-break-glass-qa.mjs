#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
const demoSupportEmail = process.env.DEMO_PLATFORM_SUPPORT_QA_EMAIL ?? "demo.platform.support@asai.local";
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
  const target = await getDemoTarget();
  await ensurePlatformUser(target.organizationId, {
    userId: "demo_user_platform",
    membershipId: "demo_membership_platform",
    platformUserId: "demo_platform_user_super_admin",
    email: demoPlatformEmail,
    name: "Demo Platform Admin",
    role: "SUPER_ADMIN",
  });
  await ensurePlatformUser(target.organizationId, {
    userId: "demo_user_platform_support",
    membershipId: "demo_membership_platform_support",
    platformUserId: "demo_platform_user_support",
    email: demoSupportEmail,
    name: "Demo Platform Support",
    role: "SUPPORT",
  });
  await ensurePlatformUser(target.organizationId, {
    userId: "demo_user_platform_finance",
    membershipId: "demo_membership_platform_finance",
    platformUserId: "demo_platform_user_finance",
    email: demoFinanceEmail,
    name: "Demo Platform Finance",
    role: "FINANCE",
  });

  const beforeBreakGlassAudit = await countAudit("BREAK_GLASS", target.organizationId);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const missingReason = await request("POST", "/api/platform/break-glass", demoPlatformEmail, {
    targetOrgId: target.organizationId,
    scope: ["SENSITIVE_CLIENT_READ"],
    expiresAt,
    riskAccepted: true,
  });
  push(
    missingReason.status === 400,
    "Break-glass without reason is rejected",
    `status=${missingReason.status}, error=${missingReason.body?.error ?? "missing"}`,
  );

  const missingRisk = await request("POST", "/api/platform/break-glass", demoPlatformEmail, {
    targetOrgId: target.organizationId,
    reason: "qa break glass missing explicit risk acceptance",
    scope: ["SENSITIVE_CLIENT_READ"],
    expiresAt,
  });
  push(
    missingRisk.status === 400,
    "Break-glass without riskAccepted=true is rejected",
    `status=${missingRisk.status}, error=${missingRisk.body?.error ?? "missing"}`,
  );

  const tooLong = await request("POST", "/api/platform/break-glass", demoPlatformEmail, {
    targetOrgId: target.organizationId,
    targetUserId: target.userId,
    reason: "qa break glass expiry too long should be rejected",
    scope: ["SENSITIVE_CLIENT_READ"],
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    riskAccepted: true,
  });
  push(
    tooLong.status === 403,
    "Break-glass over max expiry is rejected",
    `status=${tooLong.status}, error=${tooLong.body?.error ?? "missing"}`,
  );

  const finance = await request("POST", "/api/platform/break-glass", demoFinanceEmail, {
    targetOrgId: target.organizationId,
    targetUserId: target.userId,
    reason: "qa finance cannot perform sensitive break glass",
    scope: ["SENSITIVE_CLIENT_READ"],
    expiresAt,
    riskAccepted: true,
  });
  push(
    finance.status === 403,
    "FINANCE platform user cannot perform break-glass",
    `status=${finance.status}, error=${finance.body?.error ?? "missing"}`,
  );

  const support = await request("POST", "/api/platform/break-glass", demoSupportEmail, {
    targetOrgId: target.organizationId,
    targetUserId: target.userId,
    reason: "qa support break glass sensitive counts proof",
    scope: ["SENSITIVE_CLIENT_READ", "SENSITIVE_REPORT_READ"],
    expiresAt,
    riskAccepted: true,
  });
  const afterBreakGlassAudit = await countAudit("BREAK_GLASS", target.organizationId);
  const supportText = JSON.stringify(support.body);
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
    '"metadata"',
  ];
  const forbiddenFields = forbiddenFieldNames.filter((field) => supportText.includes(field));

  push(support.status === 201, "SUPPORT platform user performs break-glass proof", `status=${support.status}`);
  push(support.body?.audit?.action === "BREAK_GLASS", "Break-glass response includes BREAK_GLASS audit action");
  push(support.body?.breakGlass?.rawPayloadReturned === false, "Break-glass response declares no raw payload");
  push(support.body?.proof?.clients?.rawPayloadReturned === false, "Client sensitive proof is counts-only");
  push(support.body?.proof?.reports?.rawPayloadReturned === false, "Report sensitive proof is counts-only");
  push(
    afterBreakGlassAudit > beforeBreakGlassAudit,
    "Break-glass writes BREAK_GLASS AuditLog",
    `${beforeBreakGlassAudit}->${afterBreakGlassAudit}`,
  );
  push(
    forbiddenFields.length === 0,
    "Break-glass response omits private raw field names",
    forbiddenFields.length === 0 ? forbiddenFieldNames.join(", ") : forbiddenFields.join(", "),
  );

  const auditLogs = await request(
    "GET",
    `/api/platform/audit-logs?organizationId=${encodeURIComponent(target.organizationId)}&action=BREAK_GLASS&sensitivity=BREAK_GLASS`,
    demoPlatformEmail,
  );
  push(auditLogs.status === 200, "Audit query can filter BREAK_GLASS action and sensitivity");
  push(
    auditLogs.body?.auditLogs?.some((item) => item.id === support.body?.audit?.id),
    "Audit query includes the break-glass audit id",
  );

  console.log(
    JSON.stringify(
      {
        organization: { id: target.organizationId, slug: target.organizationSlug },
        targetUser: { id: target.userId, displayName: target.userName },
        platformUsers: {
          superAdmin: demoPlatformEmail,
          support: demoSupportEmail,
          finance: demoFinanceEmail,
        },
        responses: {
          missingReason: { status: missingReason.status, error: missingReason.body?.error },
          missingRisk: { status: missingRisk.status, error: missingRisk.body?.error },
          tooLong: { status: tooLong.status, error: tooLong.body?.error },
          finance: { status: finance.status, error: finance.body?.error },
          support: {
            status: support.status,
            auditId: support.body?.audit?.id,
            rawPayloadReturned: support.body?.breakGlass?.rawPayloadReturned,
            clientTotal: support.body?.proof?.clients?.total,
            reportTotal: support.body?.proof?.reports?.total,
          },
          auditLogs: { status: auditLogs.status, count: auditLogs.body?.auditLogs?.length ?? 0 },
        },
        auditCount: {
          breakGlassBefore: beforeBreakGlassAudit,
          breakGlassAfter: afterBreakGlassAudit,
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

async function getDemoTarget() {
  const result = await db.query(
    `SELECT u.id AS user_id, u.name AS user_name, o.id AS organization_id, o.slug AS organization_slug
     FROM users u
     JOIN organization_members m ON m.user_id = u.id
     JOIN organizations o ON o.id = m.organization_id
     WHERE u.email = $1 AND u.status = 'ACTIVE' AND m.status = 'ACTIVE'
     ORDER BY m.is_default DESC, m.created_at ASC
     LIMIT 1`,
    [demoMemberEmail],
  );

  const target = result.rows[0];

  if (!target) {
    throw new Error(`Demo target not found for ${demoMemberEmail}.`);
  }

  return {
    userId: target.user_id,
    userName: target.user_name,
    organizationId: target.organization_id,
    organizationSlug: target.organization_slug,
  };
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
       '{"source":"demo-platform-break-glass-qa"}'::jsonb,
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

async function countAudit(action, organizationId) {
  const result = await db.query(
    `SELECT count(*)::int AS count
     FROM audit_logs
     WHERE action = $1::"AuditAction"
       AND organization_id = $2`,
    [action, organizationId],
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
