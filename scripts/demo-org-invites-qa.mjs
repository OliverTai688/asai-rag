#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const demoOwnerEmail = process.env.DEMO_OWNER_QA_EMAIL ?? "demo.owner@asai.local";
const invitedEmail = "demo.invited-collab@asai.local";
const overflowEmail = "demo.invited-collab-overflow@asai.local";
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

  const beforeUsage = await getSeatUsage(org.id);
  const managerPost = await request("POST", "/api/org/invites", demoManagerEmail, invitePayload(invitedEmail, org.branchId));
  push(managerPost.status === 403, "Manager POST /api/org/invites is forbidden", `status=${managerPost.status}`);
  push(managerPost.body?.error === "ORG_INVITES_WRITE_FORBIDDEN", "Manager invite returns role guard error", managerPost.body?.error ?? "missing");

  const invite = await request("POST", "/api/org/invites", demoOwnerEmail, invitePayload(invitedEmail, org.branchId));
  const inviteStatusAllowed = invite.status === 201 || invite.status === 200;
  push(inviteStatusAllowed, "Owner POST /api/org/invites creates or refreshes collaborator invite", `status=${invite.status}`);
  push(invite.body?.invite?.status === "INVITED", "Invite response returns pending membership status", invite.body?.invite?.status ?? "missing");
  push(invite.body?.invite?.role === "COLLABORATOR", "Invite response returns collaborator role", invite.body?.invite?.role ?? "missing");
  push(invite.body?.invite?.delivery === "not_sent", "Invite response records email delivery as not sent", invite.body?.invite?.delivery ?? "missing");
  push(!JSON.stringify(invite.body).includes(invitedEmail), "Invite response does not expose raw invited email");

  const invitedMembership = await getMembership(org.id, invitedEmail);
  push(Boolean(invitedMembership), "Invited collaborator membership exists in DB");
  push(invitedMembership?.status === "INVITED", "Invited collaborator DB status is INVITED", invitedMembership?.status ?? "missing");
  push(invitedMembership?.role === "COLLABORATOR", "Invited collaborator DB role is COLLABORATOR", invitedMembership?.role ?? "missing");

  const auditCount = invitedMembership ? await countInviteAudit(invitedMembership.id) : 0;
  push(auditCount > 0, "Invite writes an AuditLog entry", `auditCount=${auditCount}`);

  const afterUsage = await getSeatUsage(org.id);
  push(
    afterUsage.collaborators >= Math.min(beforeUsage.collaborators + 1, afterUsage.maxCollaborators),
    "Collaborator usage reflects pending invite",
    `${beforeUsage.collaborators}->${afterUsage.collaborators}/${afterUsage.maxCollaborators}`,
  );

  const overflowBeforeCount = await countMemberships(org.id);
  const overflow = await request("POST", "/api/org/invites", demoOwnerEmail, invitePayload(overflowEmail, org.branchId));
  const overflowAfterCount = await countMemberships(org.id);

  push(overflow.status === 403, "Owner POST /api/org/invites respects maxCollaborators", `status=${overflow.status}`);
  push(overflow.body?.error === "MAX_COLLABORATORS_REACHED", "Overflow invite returns collaborator limit error", overflow.body?.error ?? "missing");
  push(overflowAfterCount === overflowBeforeCount, "Blocked overflow invite does not create membership", `${overflowBeforeCount}->${overflowAfterCount}`);
  push(!JSON.stringify(overflow.body).includes(overflowEmail), "Overflow response does not expose raw invited email");

  console.log(
    JSON.stringify(
      {
        manager: demoManagerEmail,
        owner: demoOwnerEmail,
        organization: { id: org.id, slug: org.slug, plan: org.plan },
        beforeUsage,
        afterUsage,
        responses: {
          managerPost: { status: managerPost.status, error: managerPost.body?.error },
          invite: {
            status: invite.status,
            role: invite.body?.invite?.role,
            membershipStatus: invite.body?.invite?.status,
            delivery: invite.body?.invite?.delivery,
          },
          overflow: { status: overflow.status, error: overflow.body?.error },
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

function invitePayload(email, primaryUnitId) {
  return {
    email,
    name: "Demo Invited Collaborator",
    role: "COLLABORATOR",
    primaryUnitId,
    title: "Demo collaborator",
    region: "Taipei",
    reason: "qa collaborator invite limit proof",
    riskAccepted: true,
  };
}

async function getDemoOrg() {
  const result = await db.query(
    `SELECT o.id, o.slug, o.plan, b.id AS branch_id
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

  if (!org) {
    throw new Error(`Demo organization not found for ${demoManagerEmail}.`);
  }

  if (!org.branch_id) {
    throw new Error(`Demo branch unit not found for ${org.slug}.`);
  }

  return {
    id: org.id,
    slug: org.slug,
    plan: org.plan,
    branchId: org.branch_id,
  };
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

async function getSeatUsage(organizationId) {
  const result = await db.query(
    `SELECT
       pc.max_members,
       pc.max_collaborators,
       COUNT(m.id) FILTER (
         WHERE m.role <> 'COLLABORATOR'::"MemberRole" AND m.status IN ('ACTIVE'::"MembershipStatus", 'INVITED'::"MembershipStatus")
       )::int AS members,
       COUNT(m.id) FILTER (
         WHERE m.role = 'COLLABORATOR'::"MemberRole" AND m.status IN ('ACTIVE'::"MembershipStatus", 'INVITED'::"MembershipStatus")
       )::int AS collaborators
     FROM organizations o
     JOIN plan_configs pc ON pc.plan = o.plan AND pc.is_active = true
     LEFT JOIN organization_members m ON m.organization_id = o.id
     WHERE o.id = $1
     GROUP BY pc.max_members, pc.max_collaborators`,
    [organizationId],
  );
  const row = result.rows[0];

  return {
    members: Number(row?.members ?? 0),
    collaborators: Number(row?.collaborators ?? 0),
    maxMembers: Number(row?.max_members ?? 0),
    maxCollaborators: Number(row?.max_collaborators ?? 0),
  };
}

async function getMembership(organizationId, email) {
  const result = await db.query(
    `SELECT m.id, m.role, m.status
     FROM users u
     JOIN organization_members m ON m.user_id = u.id
     WHERE u.email = $1 AND m.organization_id = $2
     LIMIT 1`,
    [email, organizationId],
  );

  return result.rows[0] ?? null;
}

async function countInviteAudit(membershipId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM audit_logs
     WHERE resource_type = 'ORG_INVITE' AND resource_id = $1`,
    [membershipId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function countMemberships(organizationId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM organization_members
     WHERE organization_id = $1`,
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
  checks.push({ status: condition ? "pass" : "fail", label, detail });
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
