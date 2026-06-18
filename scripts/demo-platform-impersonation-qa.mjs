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
    userId: "demo_user_platform_finance",
    membershipId: "demo_membership_platform_finance",
    platformUserId: "demo_platform_user_finance",
    email: demoFinanceEmail,
    name: "Demo Platform Finance",
    role: "FINANCE",
  });

  const beforeStartAudit = await countAudit("IMPERSONATION_START", target.organizationId);
  const beforeEndAudit = await countAudit("IMPERSONATION_END", target.organizationId);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const financeStart = await request("POST", "/api/platform/impersonation", demoFinanceEmail, {
    targetOrgId: target.organizationId,
    targetUserId: target.userId,
    reason: "qa finance cannot impersonate users",
    scope: ["SUPPORT_DIAGNOSTICS"],
    expiresAt,
  });
  push(
    financeStart.status === 403,
    "FINANCE platform user cannot start impersonation",
    `status=${financeStart.status}, error=${financeStart.body?.error ?? "missing"}`,
  );

  const missingReason = await request("POST", "/api/platform/impersonation", demoPlatformEmail, {
    targetOrgId: target.organizationId,
    targetUserId: target.userId,
    scope: ["SUPPORT_DIAGNOSTICS"],
    expiresAt,
  });
  push(
    missingReason.status === 400,
    "Impersonation start without reason is rejected",
    `status=${missingReason.status}, error=${missingReason.body?.error ?? "missing"}`,
  );

  const tooLong = await request("POST", "/api/platform/impersonation", demoPlatformEmail, {
    targetOrgId: target.organizationId,
    targetUserId: target.userId,
    reason: "qa expiry too long should be rejected",
    scope: ["SUPPORT_DIAGNOSTICS"],
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  });
  push(
    tooLong.status === 403,
    "Impersonation start over max expiry is rejected",
    `status=${tooLong.status}, error=${tooLong.body?.error ?? "missing"}`,
  );

  const start = await request("POST", "/api/platform/impersonation", demoPlatformEmail, {
    targetOrgId: target.organizationId,
    targetUserId: target.userId,
    reason: "qa scoped support diagnostics impersonation",
    scope: ["SUPPORT_DIAGNOSTICS", "MEMBER_PROFILE"],
    expiresAt,
  });
  const startSessionId = start.body?.impersonationSession?.id;
  const activeSession = startSessionId ? await getImpersonationSession(startSessionId) : null;
  const afterStartAudit = await countAudit("IMPERSONATION_START", target.organizationId);

  push(start.status === 201, "SUPER_ADMIN starts impersonation session", `status=${start.status}`);
  push(Boolean(startSessionId), "Impersonation start returns session id");
  push(activeSession?.status === "ACTIVE", "Impersonation session is ACTIVE in DB", activeSession?.status ?? "missing");
  push(afterStartAudit > beforeStartAudit, "Start writes IMPERSONATION_START AuditLog", `${beforeStartAudit}->${afterStartAudit}`);

  const end = await request("PATCH", `/api/platform/impersonation/${startSessionId}`, demoPlatformEmail, {
    action: "END",
    reason: "qa normal end of impersonation session",
  });
  const endedSession = startSessionId ? await getImpersonationSession(startSessionId) : null;
  const afterEndAudit = await countAudit("IMPERSONATION_END", target.organizationId);

  push(end.status === 200, "SUPER_ADMIN ends impersonation session", `status=${end.status}`);
  push(endedSession?.status === "ENDED", "Impersonation session is ENDED in DB", endedSession?.status ?? "missing");
  push(afterEndAudit > beforeEndAudit, "End writes IMPERSONATION_END AuditLog", `${beforeEndAudit}->${afterEndAudit}`);

  const secondStart = await request("POST", "/api/platform/impersonation", demoPlatformEmail, {
    targetOrgId: target.organizationId,
    targetUserId: target.userId,
    reason: "qa scoped support diagnostics revoke proof",
    scope: ["SUPPORT_DIAGNOSTICS"],
    expiresAt,
  });
  const revokeSessionId = secondStart.body?.impersonationSession?.id;
  const revoke = await request("PATCH", `/api/platform/impersonation/${revokeSessionId}`, demoPlatformEmail, {
    action: "REVOKE",
    reason: "qa revoke impersonation session proof",
  });
  const revokedSession = revokeSessionId ? await getImpersonationSession(revokeSessionId) : null;
  const afterRevokeAudit = await countAudit("IMPERSONATION_END", target.organizationId);

  push(secondStart.status === 201, "SUPER_ADMIN starts second impersonation session for revoke proof");
  push(revoke.status === 200, "SUPER_ADMIN revokes impersonation session", `status=${revoke.status}`);
  push(revokedSession?.status === "REVOKED", "Impersonation session is REVOKED in DB", revokedSession?.status ?? "missing");
  push(afterRevokeAudit > afterEndAudit, "Revoke writes IMPERSONATION_END AuditLog", `${afterEndAudit}->${afterRevokeAudit}`);

  const auditLogs = await request(
    "GET",
    `/api/platform/audit-logs?organizationId=${encodeURIComponent(target.organizationId)}&sensitivity=BREAK_GLASS`,
    demoPlatformEmail,
  );
  const auditText = JSON.stringify(auditLogs.body);
  push(auditLogs.status === 200, "Audit log query can filter BREAK_GLASS impersonation entries");
  push(
    auditLogs.body?.auditLogs?.some((item) => item.impersonationSessionId === startSessionId),
    "Audit log query includes started impersonation session id",
  );
  push(
    !auditText.includes('"metadata"') && auditText.includes('"metadataKeys"'),
    "Audit query exposes metadataKeys instead of raw impersonation metadata",
  );

  console.log(
    JSON.stringify(
      {
        organization: { id: target.organizationId, slug: target.organizationSlug },
        targetUser: { id: target.userId, displayName: target.userName },
        platformUser: demoPlatformEmail,
        financeUser: demoFinanceEmail,
        responses: {
          financeStart: { status: financeStart.status, error: financeStart.body?.error },
          missingReason: { status: missingReason.status, error: missingReason.body?.error },
          tooLong: { status: tooLong.status, error: tooLong.body?.error },
          start: { status: start.status, id: startSessionId },
          end: { status: end.status, statusValue: end.body?.impersonationSession?.status },
          secondStart: { status: secondStart.status, id: revokeSessionId },
          revoke: { status: revoke.status, statusValue: revoke.body?.impersonationSession?.status },
          auditLogs: { status: auditLogs.status, count: auditLogs.body?.auditLogs?.length ?? 0 },
        },
        auditCount: {
          startBefore: beforeStartAudit,
          startAfter: afterStartAudit,
          endBefore: beforeEndAudit,
          endAfter: afterEndAudit,
          revokeAfter: afterRevokeAudit,
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
       '{"source":"demo-platform-impersonation-qa"}'::jsonb,
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

async function getImpersonationSession(id) {
  const result = await db.query(
    `SELECT id, status, target_org_id, target_user_id, ended_reason
     FROM impersonation_sessions
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
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
