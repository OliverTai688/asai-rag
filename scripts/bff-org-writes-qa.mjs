#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { Client as PgClient } from "pg";

const root = process.cwd();

loadEnvFile(".env.local");
loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://127.0.0.1:3041";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const demoOwnerEmail = process.env.DEMO_OWNER_QA_EMAIL ?? "demo.owner@asai.local";
const invitedEmail = "demo.bff302-collab@asai.local";
const overflowEmail = "demo.bff302-overflow@asai.local";
const spawned = [];
const checks = [];

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

function loadEnvFile(fileName) {
  const envPath = path.join(root, fileName);
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function readSource(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function assertFileContains(filePath, fragments) {
  const source = readSource(filePath);
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  if (missing.length > 0) {
    fail(filePath, `missing ${missing.join(", ")}`);
    throw new Error(`${filePath} missing BFF-302 fragments`);
  }
  pass(filePath, `verified ${fragments.length} BFF-302 fragments`);
}

function assertFileOmits(filePath, fragments) {
  const source = readSource(filePath);
  const found = fragments.filter((fragment) => source.includes(fragment));
  if (found.length > 0) {
    fail(filePath, `forbidden ${found.join(", ")}`);
    throw new Error(`${filePath} contains forbidden BFF-302 fragments`);
  }
  pass(filePath, `omits ${fragments.length} forbidden private fragments`);
}

function verifyStaticBoundaries() {
  assertFileContains("src/app/api/org/members/route.ts", [
    "requireOrgAdmin",
    "canReadOrgAggregate",
    "scopedToManagedUnits",
    "primaryUnit",
    "managedUnitScopes",
  ]);
  assertFileOmits("src/app/api/org/members/route.ts", ["email: true", "phone: true", "policyNumber"]);

  assertFileContains("src/app/api/org/invites/route.ts", [
    "checkInviteLimit",
    "maxMembers: session.planCapability.maxMembers",
    "maxCollaborators: session.planCapability.maxCollaborators",
    "tx.auditLog.create",
    'resourceType: "ORG_INVITE"',
    "emailHash",
    "emailMasked",
    "REAL_INVITE_EMAIL_DISABLED",
  ]);

  assertFileContains("src/app/api/org/units/route.ts", [
    "canWriteOrgUnits",
    "getPlanUsage",
    "MAX_UNITS_REACHED",
    "validateParentUnit",
    "REGION_PARENT_MUST_BE_HEADQUARTERS",
    "BRANCH_PARENT_MUST_BE_HEADQUARTERS_OR_REGION",
    "tx.auditLog.create",
    'resourceType: "ORG_UNIT"',
    "planUsageBeforeCreate",
  ]);

  assertFileContains("src/lib/org-settings/org-settings-repository.ts", [
    "canWriteOrgSettings",
    "enforceOrgPolicy",
    "tx.auditLog.create",
    'resourceType: "ORG_SETTINGS"',
    "changedSections",
    "clientPortalEnabled",
    "shareBrandingEnabled",
  ]);

  assertFileContains("src/lib/navigation/workspace-sidebar.ts", [
    "canManageWorkspaceOrgSettings",
    "/api/org/settings",
    "/api/org/units",
    "/api/org/invites",
    "isOrgSettingsWriteRoute",
  ]);
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDevServer() {
  if (await fetchOk(baseUrl)) {
    pass("dev-server", `reachable at ${baseUrl}`);
    return;
  }

  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3000";
  console.log(`Starting dev server for BFF-302 QA at ${baseUrl}`);

  const child = spawn("pnpm", ["dev", "--hostname", host, "--port", port], {
    cwd: root,
    env: {
      ...process.env,
      ALLOW_DEV_AUTH_HEADER: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  spawned.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let i = 0; i < 90; i += 1) {
    if (await fetchOk(baseUrl)) {
      pass("dev-server", `started at ${baseUrl}`);
      return;
    }
    await wait(1_000);
  }

  throw new Error(`Dev server did not become reachable at ${baseUrl}`);
}

async function runPnpmScript(scriptName) {
  console.log(`\n--- pnpm ${scriptName} ---`);
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", [scriptName], {
      cwd: root,
      env: {
        ...process.env,
        ALLOW_DEV_AUTH_HEADER: "true",
        DEMO_QA_BASE_URL: baseUrl,
        DEMO_MANAGER_QA_EMAIL: demoManagerEmail,
        DEMO_OWNER_QA_EMAIL: demoOwnerEmail,
      },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        pass(`pnpm ${scriptName}`);
        resolve();
      } else {
        reject(new Error(`pnpm ${scriptName} exited with ${code}`));
      }
    });
  });
}

function resolveDatabaseUrl() {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? null;
}

async function connectDb() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL for BFF-302 DB proof.");
  }

  const db = new PgClient({ connectionString: databaseUrl });
  await db.connect();
  return db;
}

async function request(method, requestPath, email, body) {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": email,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsedBody = null;

  try {
    parsedBody = JSON.parse(text);
  } catch {
    parsedBody = text;
  }

  return { status: response.status, body: parsedBody, text };
}

async function getDemoOrg(db) {
  const result = await db.query(
    `SELECT o.id, o.slug, o.plan, h.id AS headquarters_id, b.id AS branch_id
     FROM users u
     JOIN organization_members m ON m.user_id = u.id
     JOIN organizations o ON o.id = m.organization_id
     LEFT JOIN organization_units h ON h.organization_id = o.id AND h.type = 'HEADQUARTERS' AND h.is_active = true
     LEFT JOIN organization_units b ON b.organization_id = o.id AND b.type = 'BRANCH' AND b.is_active = true
     WHERE u.email = $1 AND u.status = 'ACTIVE' AND m.status = 'ACTIVE'
     ORDER BY m.is_default DESC, m.created_at ASC
     LIMIT 1`,
    [demoManagerEmail],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error(`Demo organization not found for ${demoManagerEmail}.`);
  }
  if (!row.headquarters_id) {
    throw new Error(`Demo headquarters unit not found for ${row.slug}.`);
  }

  return {
    id: row.id,
    slug: row.slug,
    plan: row.plan,
    headquartersId: row.headquarters_id,
    branchId: row.branch_id ?? row.headquarters_id,
  };
}

async function ensureDemoOwner(db, organizationId) {
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

async function getForbiddenOrgDetailSentinels(db, organizationId) {
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

function assertNoPrivateSentinel(label, text, forbiddenSentinels) {
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
  const forbiddenFieldLeaks = forbiddenFieldNames.filter((field) => text.includes(field));
  if (forbiddenFieldLeaks.length === 0) {
    pass(`${label}-private-field-names`, `${forbiddenFieldNames.length} field sentinels checked`);
  } else {
    fail(`${label}-private-field-names`, `leaked ${forbiddenFieldLeaks.join(", ")}`);
  }

  const leaked = forbiddenSentinels.filter((value) => text.includes(value));
  if (leaked.length === 0) {
    pass(`${label}-private-sentinels`, `${forbiddenSentinels.length} DB sentinels checked`);
  } else {
    fail(`${label}-private-sentinels`, `leaked ${leaked.slice(0, 4).map(redact).join(", ")}`);
  }
}

function redact(value) {
  return `${value.slice(0, 2)}...${value.slice(-2)}`;
}

async function getPlanUsage(db, organizationId) {
  const result = await db.query(
    `SELECT o.plan, pc.max_units, pc.max_members, pc.max_collaborators,
            (COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true))::int AS active_units,
            (COUNT(DISTINCT m.id) FILTER (
              WHERE m.role <> 'COLLABORATOR'::"MemberRole" AND m.status IN ('ACTIVE'::"MembershipStatus", 'INVITED'::"MembershipStatus")
            ))::int AS active_members,
            (COUNT(DISTINCT m.id) FILTER (
              WHERE m.role = 'COLLABORATOR'::"MemberRole" AND m.status IN ('ACTIVE'::"MembershipStatus", 'INVITED'::"MembershipStatus")
            ))::int AS active_collaborators
     FROM organizations o
     JOIN plan_configs pc ON pc.plan = o.plan AND pc.is_active = true
     LEFT JOIN organization_units u ON u.organization_id = o.id
     LEFT JOIN organization_members m ON m.organization_id = o.id
     WHERE o.id = $1
     GROUP BY o.plan, pc.max_units, pc.max_members, pc.max_collaborators`,
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
    maxMembers: Number(row.max_members),
    activeMembers: Number(row.active_members),
    maxCollaborators: Number(row.max_collaborators),
    activeCollaborators: Number(row.active_collaborators),
  };
}

async function countUnits(db, organizationId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM organization_units
     WHERE organization_id = $1 AND is_active = true`,
    [organizationId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function countAudit(db, organizationId, resourceType) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM audit_logs
     WHERE organization_id = $1 AND resource_type = $2`,
    [organizationId, resourceType],
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function getMembership(db, organizationId, email) {
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

async function verifyOrgWriteApiProof() {
  const db = await connectDb();
  try {
    const org = await getDemoOrg(db);
    await ensureDemoOwner(db, org.id);
    const forbiddenSentinels = await getForbiddenOrgDetailSentinels(db, org.id);

    const ownerMembers = await request("GET", "/api/org/members", demoOwnerEmail);
    pass("owner-members-status", `status=${ownerMembers.status}`);
    if (ownerMembers.status !== 200) {
      throw new Error(`Owner GET /api/org/members expected 200, got ${ownerMembers.status}`);
    }
    if (Array.isArray(ownerMembers.body?.members)) pass("owner-members-array", `${ownerMembers.body.members.length} members`);
    else fail("owner-members-array", "members missing");
    assertNoPrivateSentinel("owner-members", ownerMembers.text, forbiddenSentinels);

    const managerMembers = await request("GET", "/api/org/members", demoManagerEmail);
    if (managerMembers.status === 403) {
      pass("manager-members-policy", "unscoped manager denied by role-aware org-admin policy");
    } else if (managerMembers.status === 200) {
      pass("manager-members-policy", "scoped manager read-only aggregate allowed");
      assertNoPrivateSentinel("manager-members", managerMembers.text, forbiddenSentinels);
    } else {
      fail("manager-members-policy", `unexpected status=${managerMembers.status}`);
    }

    const ownerUnits = await request("GET", "/api/org/units", demoOwnerEmail);
    pass("owner-units-status", `status=${ownerUnits.status}`);
    if (ownerUnits.status !== 200) {
      throw new Error(`Owner GET /api/org/units expected 200, got ${ownerUnits.status}`);
    }
    assertNoPrivateSentinel("owner-units", ownerUnits.text, forbiddenSentinels);

    const managerUnitPost = await request("POST", "/api/org/units", demoManagerEmail, {
      type: "BRANCH",
      name: "Demo BFF-302 Manager Forbidden Branch",
      parentId: org.headquartersId,
      slug: "demo-bff-302-manager-forbidden-branch",
      reason: "qa manager cannot create org units",
    });
    if (managerUnitPost.status === 403) pass("manager-unit-post-forbidden", managerUnitPost.body?.error ?? "forbidden");
    else fail("manager-unit-post-forbidden", `status=${managerUnitPost.status}`);

    const unitUsage = await getPlanUsage(db, org.id);
    const unitCountBefore = await countUnits(db, org.id);
    const unitAuditBefore = await countAudit(db, org.id, "ORG_UNIT");
    const uniqueUnitSlug = `demo-bff-302-unit-${Date.now().toString(36)}`;
    const ownerUnitPost = await request("POST", "/api/org/units", demoOwnerEmail, {
      type: "BRANCH",
      name: "Demo BFF-302 Audited Branch",
      parentId: org.headquartersId,
      slug: uniqueUnitSlug,
      reason: "qa org unit audit proof",
    });
    const unitCountAfter = await countUnits(db, org.id);
    const unitAuditAfter = await countAudit(db, org.id, "ORG_UNIT");

    if (unitUsage.activeUnits >= unitUsage.maxUnits) {
      if (ownerUnitPost.status === 403 && ownerUnitPost.body?.error === "MAX_UNITS_REACHED") {
        pass("owner-unit-max-units", `${unitUsage.activeUnits}/${unitUsage.maxUnits}`);
      } else {
        fail("owner-unit-max-units", `status=${ownerUnitPost.status}, error=${ownerUnitPost.body?.error ?? "missing"}`);
      }
      if (unitCountAfter === unitCountBefore) pass("blocked-unit-no-create", `${unitCountBefore}->${unitCountAfter}`);
      else fail("blocked-unit-no-create", `${unitCountBefore}->${unitCountAfter}`);
    } else {
      if (ownerUnitPost.status === 201) pass("owner-unit-create", `status=${ownerUnitPost.status}`);
      else fail("owner-unit-create", `status=${ownerUnitPost.status}`);
      if (unitCountAfter === unitCountBefore + 1) pass("owner-unit-count-increment", `${unitCountBefore}->${unitCountAfter}`);
      else fail("owner-unit-count-increment", `${unitCountBefore}->${unitCountAfter}`);
      if (unitAuditAfter > unitAuditBefore) pass("owner-unit-audit", `${unitAuditBefore}->${unitAuditAfter}`);
      else fail("owner-unit-audit", `${unitAuditBefore}->${unitAuditAfter}`);
    }

    const managerSettingsGet = await request("GET", "/api/org/settings", demoManagerEmail);
    if (managerSettingsGet.status === 403) pass("manager-settings-read-policy", "owner/admin-only settings surface");
    else if (managerSettingsGet.status === 200) pass("manager-settings-read-policy", "read-only settings policy allowed");
    else fail("manager-settings-read-policy", `status=${managerSettingsGet.status}`);

    const managerSettingsPatch = await request("PATCH", "/api/org/settings", demoManagerEmail, settingsPatchPayload());
    if (managerSettingsPatch.status === 403) pass("manager-settings-patch-forbidden", managerSettingsPatch.body?.error ?? "forbidden");
    else fail("manager-settings-patch-forbidden", `status=${managerSettingsPatch.status}`);

    const settingsAuditBefore = await countAudit(db, org.id, "ORG_SETTINGS");
    const ownerSettingsPatch = await request("PATCH", "/api/org/settings", demoOwnerEmail, settingsPatchPayload());
    const settingsAuditAfter = await countAudit(db, org.id, "ORG_SETTINGS");
    if (ownerSettingsPatch.status === 200) pass("owner-settings-patch", `status=${ownerSettingsPatch.status}`);
    else fail("owner-settings-patch", `status=${ownerSettingsPatch.status}`);
    if (settingsAuditAfter > settingsAuditBefore) pass("owner-settings-audit", `${settingsAuditBefore}->${settingsAuditAfter}`);
    else fail("owner-settings-audit", `${settingsAuditBefore}->${settingsAuditAfter}`);
    assertNoPrivateSentinel("owner-settings", ownerSettingsPatch.text, forbiddenSentinels);

    const managerInvitePost = await request("POST", "/api/org/invites", demoManagerEmail, invitePayload(invitedEmail, org.branchId));
    if (managerInvitePost.status === 403) pass("manager-invite-post-forbidden", managerInvitePost.body?.error ?? "forbidden");
    else fail("manager-invite-post-forbidden", `status=${managerInvitePost.status}`);

    const inviteAuditBefore = await countAudit(db, org.id, "ORG_INVITE");
    const ownerInvitePost = await request("POST", "/api/org/invites", demoOwnerEmail, invitePayload(invitedEmail, org.branchId));
    const invitedMembership = await getMembership(db, org.id, invitedEmail);
    const inviteAuditAfter = await countAudit(db, org.id, "ORG_INVITE");
    if (ownerInvitePost.status === 201 || ownerInvitePost.status === 200) pass("owner-invite-post", `status=${ownerInvitePost.status}`);
    else fail("owner-invite-post", `status=${ownerInvitePost.status}`);
    if (invitedMembership?.status === "INVITED") pass("owner-invite-membership", invitedMembership.status);
    else fail("owner-invite-membership", invitedMembership?.status ?? "missing");
    if (inviteAuditAfter > inviteAuditBefore) pass("owner-invite-audit", `${inviteAuditBefore}->${inviteAuditAfter}`);
    else fail("owner-invite-audit", `${inviteAuditBefore}->${inviteAuditAfter}`);
    if (!ownerInvitePost.text.includes(invitedEmail)) pass("owner-invite-redacted-email", "raw invite email omitted");
    else fail("owner-invite-redacted-email", "raw invite email leaked");

    const usageAfterInvite = await getPlanUsage(db, org.id);
    const membershipsBeforeOverflow = usageAfterInvite.activeMembers + usageAfterInvite.activeCollaborators;
    const overflowPost = await request("POST", "/api/org/invites", demoOwnerEmail, invitePayload(overflowEmail, org.branchId));
    const usageAfterOverflow = await getPlanUsage(db, org.id);
    const membershipsAfterOverflow = usageAfterOverflow.activeMembers + usageAfterOverflow.activeCollaborators;

    if (usageAfterInvite.activeCollaborators >= usageAfterInvite.maxCollaborators) {
      if (overflowPost.status === 403 && overflowPost.body?.error === "MAX_COLLABORATORS_REACHED") {
        pass("owner-invite-max-collaborators", `${usageAfterInvite.activeCollaborators}/${usageAfterInvite.maxCollaborators}`);
      } else {
        fail("owner-invite-max-collaborators", `status=${overflowPost.status}, error=${overflowPost.body?.error ?? "missing"}`);
      }
      if (membershipsAfterOverflow === membershipsBeforeOverflow) {
        pass("blocked-invite-no-membership", `${membershipsBeforeOverflow}->${membershipsAfterOverflow}`);
      } else {
        fail("blocked-invite-no-membership", `${membershipsBeforeOverflow}->${membershipsAfterOverflow}`);
      }
    } else {
      pass(
        "owner-invite-capacity-note",
        `capacity remains ${usageAfterInvite.activeCollaborators}/${usageAfterInvite.maxCollaborators}; overflow proof not forced`,
      );
    }

    console.log(
      JSON.stringify(
        {
          manager: demoManagerEmail,
          owner: demoOwnerEmail,
          organization: { id: org.id, slug: org.slug, plan: org.plan },
          unitUsage,
          inviteUsageAfter: usageAfterInvite,
          auditCounts: {
            orgUnit: { before: unitAuditBefore, after: unitAuditAfter },
            orgSettings: { before: settingsAuditBefore, after: settingsAuditAfter },
            orgInvite: { before: inviteAuditBefore, after: inviteAuditAfter },
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await db.end();
  }
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

function invitePayload(email, primaryUnitId) {
  return {
    email,
    name: "Demo BFF-302 Invited Collaborator",
    role: "COLLABORATOR",
    primaryUnitId,
    title: "Demo collaborator",
    region: "Taipei",
    reason: "qa collaborator invite limit proof",
    riskAccepted: true,
  };
}

async function shutdown() {
  for (const child of spawned) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(143);
});

async function main() {
  console.log("BFF-302 org writes audit and capability QA");
  console.log(`baseUrl=${baseUrl}`);

  verifyStaticBoundaries();
  await ensureDevServer();
  await verifyOrgWriteApiProof();

  await runPnpmScript("nav:route-guard-qa");

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} BFF-302 checks failed`);
  }

  console.log("\nBFF-302 org writes audit and capability QA PASS");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(shutdown);
