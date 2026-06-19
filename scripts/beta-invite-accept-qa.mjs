#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const runId = Date.now().toString(36);
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new Client({ connectionString: dbUrl });
await db.connect();

try {
  const org = await getDemoOrg();
  const validEmail = `beta.invite.${runId}@asai.local`;
  const expiredEmail = `beta.invite.expired.${runId}@asai.local`;
  const validInvite = await createInvite({
    organizationId: org.id,
    unitId: org.branchId,
    email: validEmail,
    name: `Beta Invite ${runId}`,
    invitedAt: new Date(),
  });
  const expiredInvite = await createInvite({
    organizationId: org.id,
    unitId: org.branchId,
    email: expiredEmail,
    name: `Expired Beta Invite ${runId}`,
    invitedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
  });

  const missing = await acceptInvite("missing_invite_token", validEmail);
  push(missing.status === 404, "Invalid invite token returns 404", `status=${missing.status}`);

  const wrongEmail = await acceptInvite(validInvite.membershipId, `wrong.${validEmail}`);
  push(wrongEmail.status === 403, "Wrong invite email returns 403", `status=${wrongEmail.status}`);
  push(wrongEmail.body?.error === "INVITE_EMAIL_MISMATCH", "Wrong email has explicit mismatch error", wrongEmail.body?.error ?? "missing");

  const accepted = await acceptInvite(validInvite.membershipId, validEmail, "Accepted Beta Member");
  push(accepted.status === 200, "Valid invite token accepts membership", `status=${accepted.status}`);
  push(accepted.body?.invite?.status === "ACTIVE", "Accepted response returns ACTIVE status", accepted.body?.invite?.status ?? "missing");
  push(!JSON.stringify(accepted.body).includes(validEmail), "Accepted response masks raw invited email");

  const activeMembership = await getMembership(validInvite.membershipId);
  push(activeMembership?.status === "ACTIVE", "DB membership status is ACTIVE after accept", activeMembership?.status ?? "missing");
  push(Boolean(activeMembership?.accepted_at), "DB membership has accepted_at timestamp");

  const replay = await acceptInvite(validInvite.membershipId, validEmail);
  push(replay.status === 409, "Replayed invite returns 409", `status=${replay.status}`);
  push(replay.body?.error === "INVITE_ALREADY_ACCEPTED", "Replayed invite has already accepted error", replay.body?.error ?? "missing");

  const expired = await acceptInvite(expiredInvite.membershipId, expiredEmail);
  push(expired.status === 410, "Expired invite returns 410", `status=${expired.status}`);
  push(expired.body?.error === "INVITE_EXPIRED", "Expired invite has explicit expired error", expired.body?.error ?? "missing");

  const auditCount = await countAcceptAudit(validInvite.membershipId);
  push(auditCount > 0, "Accepted invite writes AuditLog", `auditCount=${auditCount}`);

  console.log(
    JSON.stringify(
      {
        organization: { id: org.id, slug: org.slug },
        validInvite: {
          membershipId: validInvite.membershipId,
          emailMasked: accepted.body?.invite?.emailMasked,
          acceptedStatus: accepted.body?.invite?.status,
        },
        expiredInvite: {
          membershipId: expiredInvite.membershipId,
          status: expired.status,
          error: expired.body?.error,
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
  console.log(`${icon} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function getDemoOrg() {
  const result = await db.query(
    `SELECT o.id, o.slug, b.id AS branch_id
     FROM users u
     JOIN organization_members m ON m.user_id = u.id
     JOIN organizations o ON o.id = m.organization_id
     LEFT JOIN organization_units b ON b.organization_id = o.id AND b.type = 'BRANCH' AND b.is_active = true
     WHERE u.email = $1 AND u.status = 'ACTIVE' AND m.status = 'ACTIVE'
     ORDER BY m.is_default DESC, m.created_at ASC
     LIMIT 1`,
    [demoManagerEmail],
  );
  const org = result.rows[0];

  if (!org?.branch_id) {
    throw new Error(`Demo organization/branch not found for ${demoManagerEmail}.`);
  }

  return { id: org.id, slug: org.slug, branchId: org.branch_id };
}

async function createInvite({ organizationId, unitId, email, name, invitedAt }) {
  const userId = `beta_invite_user_${runId}_${email.includes("expired") ? "expired" : "valid"}`;
  const membershipId = `beta_invite_membership_${runId}_${email.includes("expired") ? "expired" : "valid"}`;

  await db.query(
    `INSERT INTO users (id, email, name, status, is_demo, demo_scenario, demo_seed_version, created_at, updated_at)
     VALUES ($1, $2, $3, 'INVITED'::"UserStatus", true, 'beta-invite-accept-qa', 1, now(), now())`,
    [userId, email, name],
  );
  await db.query(
    `INSERT INTO organization_members (
       id, organization_id, user_id, primary_unit_id, role, status, title, is_default, invited_at, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, 'MEMBER'::"MemberRole", 'INVITED'::"MembershipStatus", 'Beta invite QA', false, $5, now(), now()
     )`,
    [membershipId, organizationId, userId, unitId, invitedAt],
  );

  return { userId, membershipId, email };
}

async function acceptInvite(token, email, name = "Beta Invite Accepted") {
  const response = await fetch(`${baseUrl}/api/invite/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, name }),
  });
  return parseResponse(response);
}

async function getMembership(membershipId) {
  const result = await db.query(
    `SELECT status, accepted_at
     FROM organization_members
     WHERE id = $1
     LIMIT 1`,
    [membershipId],
  );

  return result.rows[0] ?? null;
}

async function countAcceptAudit(membershipId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM audit_logs
     WHERE resource_type = 'ORG_INVITE_ACCEPT' AND resource_id = $1`,
    [membershipId],
  );

  return Number(result.rows[0]?.count ?? 0);
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
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}
