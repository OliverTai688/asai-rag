#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { Client as PgClient } from "pg";

const root = process.cwd();

loadEnvFile(".env.local");
loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://127.0.0.1:3043";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
const demoSupportEmail = process.env.DEMO_PLATFORM_SUPPORT_QA_EMAIL ?? "demo.platform.support@asai.local";
const qaStamp = `BFF-304 Platform QA ${new Date().toISOString()}`;
const spawned = [];
const checks = [];

let db;
let createdReportId = "";
let clientPortalToken = "";

function pass(name, detail = "") {
  checks.push({ ok: true, name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail = "") {
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
    throw new Error(`${filePath} missing BFF-304 fragments`);
  }
  pass(filePath, `verified ${fragments.length} BFF-304 fragments`);
}

function verifyStaticBoundaries() {
  assertFileContains("src/lib/auth/current-workspace.ts", [
    "requirePlatformUser",
    "getPlatformSession",
    "PLATFORM_REQUIRED",
  ]);

  assertFileContains("src/lib/platform/platform-read-repository.ts", [
    "metadataKeys",
    "listPlatformAuditLogs",
    "getPlatformAiUsage",
  ]);

  assertFileContains("src/lib/platform/platform-impersonation-repository.ts", [
    "id: audit.id",
    "IMPERSONATED_READ",
    "impersonationSessionId",
  ]);

  assertFileContains("src/lib/platform/platform-break-glass-repository.ts", [
    "riskAccepted",
    "rawPayloadReturned: false",
    "BREAK_GLASS",
  ]);

  assertFileContains("src/lib/platform/platform-release-readiness-repository.ts", [
    "bffSurfaceGates",
    "bff_surface_gates",
    "pnpm bff:platform-qa",
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
  console.log(`Starting dev server for BFF-304 QA at ${baseUrl}`);

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

function resolveDatabaseUrl() {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? null;
}

async function connectDb() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL for BFF-304 DB proof.");
  }

  db = new PgClient({ connectionString: databaseUrl });
  await db.connect();
  return db;
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body, headers: response.headers, text };
}

async function request(method, pathname, { email, token, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (email) headers["x-asai-demo-user-email"] = email;
  if (token) headers["x-asai-client-token"] = token;

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });

  return parseResponse(response);
}

async function get(pathname, options) {
  return request("GET", pathname, options);
}

async function post(pathname, body, options = {}) {
  return request("POST", pathname, { ...options, body });
}

async function patch(pathname, body, options = {}) {
  return request("PATCH", pathname, { ...options, body });
}

function serialize(value) {
  return JSON.stringify(value ?? {});
}

function assertStatus(name, response, expectedStatuses) {
  if (expectedStatuses.includes(response.status)) pass(name, `status=${response.status}`);
  else fail(name, `status=${response.status}, body=${serialize(response.body).slice(0, 240)}`);
}

function assertNoPlatformPrivateLeak(label, text, forbiddenSentinels = []) {
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
    '"requestId"',
    '"error"',
    '"providerCustomerId"',
    '"providerSubscriptionId"',
    '"stripeCustomerId"',
    '"stripeSubscriptionId"',
    '"metadata"',
    '"rawPayload"',
    '"providerPayload"',
    '"authorization"',
    '"cookie"',
    '"secret"',
    '"otp"',
    '"paymentData"',
  ];
  const leakedFields = forbiddenFieldNames.filter((value) => text.includes(value));
  const leakedSentinels = forbiddenSentinels.filter((value) => text.includes(value));

  if (leakedFields.length === 0 && leakedSentinels.length === 0) {
    pass(label, `${forbiddenFieldNames.length} fields and ${forbiddenSentinels.length} sentinels checked`);
  } else {
    fail(label, `fields=${leakedFields.join(", ") || "none"} sentinels=${redact(leakedSentinels).join(", ") || "none"}`);
  }
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
    [user.userId, user.email, user.name, `user:platform:bff304:${user.role.toLowerCase()}`],
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
    [user.membershipId, organizationId, userId, `BFF-304 ${user.role} platform access anchor`],
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
       '{"source":"bff-platform-qa"}'::jsonb,
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

async function getForbiddenSentinels(organizationId) {
  const result = await db.query(
    `SELECT c.name, c.email, c.phone, c.occupation, c.company, c.notes,
            p.policy_number, p.product_name,
            r.title, r.client_sections::text, r.internal_sections::text,
            a.error, a.request_id
     FROM clients c
     LEFT JOIN policies p ON p.client_id = c.id
     LEFT JOIN reports r ON r.client_id = c.id
     LEFT JOIN ai_usage_logs a ON a.client_id = c.id
     WHERE c.organization_id = $1
     LIMIT 20`,
    [organizationId],
  );

  return [
    ...new Set(
      result.rows
        .flatMap((row) => Object.values(row))
        .filter((value) => typeof value === "string" && value.length >= 4),
    ),
  ];
}

async function countAiUsageLogs() {
  const result = await db.query(`SELECT COUNT(*)::int AS count FROM ai_usage_logs`);
  return result.rows[0]?.count ?? 0;
}

async function countAudit(action, organizationId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM audit_logs
     WHERE action = $1::"AuditAction" AND organization_id = $2`,
    [action, organizationId],
  );
  return result.rows[0]?.count ?? 0;
}

async function ensureClientPortalToken() {
  const clients = await get("/api/clients", { email: demoMemberEmail });
  const selectedClient =
    clients.body?.clients?.find((client) => client.name === "王大明") ??
    clients.body?.clients?.find((client) => client.status === "ACTIVE") ??
    clients.body?.clients?.[0];

  if (clients.status !== 200 || !selectedClient?.id) {
    fail("member-client-selected", `status=${clients.status}`);
    return "";
  }
  pass("member-client-selected", selectedClient.name ?? selectedClient.id);

  const createReport = await post(
    "/api/reports",
    {
      clientId: selectedClient.id,
      purpose: "proposal",
      title: `${qaStamp} ${selectedClient.name ?? "client"} client-token isolation report`,
      sections: [
        {
          id: "bff304-client-summary",
          type: "summary",
          title: "客戶入口摘要",
          content: `${qaStamp}：client token isolation proof.`,
        },
        {
          id: "bff304-internal",
          type: "performance",
          title: "Internal platform boundary note",
          content: "This internal section must never appear in client portal proof.",
        },
      ],
    },
    { email: demoMemberEmail },
  );
  createdReportId = createReport.body?.report?.id ?? "";

  if (createReport.status === 201 && createdReportId) pass("member-report-created", createdReportId);
  else {
    fail("member-report-created", `status=${createReport.status}`);
    return "";
  }

  const share = await post(
    `/api/reports/${createdReportId}/share`,
    {
      action: "ensure",
      source: "bff_platform_qa_client_token_isolation",
      expiresInDays: 7,
    },
    { email: demoMemberEmail },
  );
  const token = share.body?.report?.share?.token ?? "";

  if (share.status === 200 && token) pass("member-share-created", redact([token])[0]);
  else fail("member-share-created", `status=${share.status}`);

  return token;
}

async function runApiProof(target, forbiddenSentinels) {
  const beforeAiUsage = await countAiUsageLogs();
  const beforeImpersonatedReadAudit = await countAudit("IMPERSONATED_READ", target.organizationId);
  const beforeBreakGlassAudit = await countAudit("BREAK_GLASS", target.organizationId);

  clientPortalToken = await ensureClientPortalToken();

  const unauthPlatform = await get("/api/platform/organizations");
  const memberPlatform = await get("/api/platform/organizations", { email: demoMemberEmail });
  const managerPlatform = await get("/api/platform/organizations", { email: demoManagerEmail });
  const clientPlatform = await get("/api/platform/organizations", { token: clientPortalToken });

  assertStatus("platform-unauth-rejected", unauthPlatform, [401, 403]);
  assertStatus("platform-member-session-rejected", memberPlatform, [401, 403]);
  assertStatus("platform-manager-session-rejected", managerPlatform, [401, 403]);
  assertStatus("platform-client-token-rejected", clientPlatform, [401, 403]);

  const organizations = await get("/api/platform/organizations", { email: demoPlatformEmail });
  const organizationDetail = await get(`/api/platform/organizations/${target.organizationId}`, {
    email: demoPlatformEmail,
  });
  const aiUsage = await get("/api/platform/ai-usage", { email: demoPlatformEmail });
  const auditLogs = await get(
    `/api/platform/audit-logs?organizationId=${encodeURIComponent(target.organizationId)}`,
    { email: demoPlatformEmail },
  );
  const releaseReadiness = await get("/api/platform/release-readiness", { email: demoPlatformEmail });

  assertStatus("platform-organizations-success", organizations, [200]);
  if (Array.isArray(organizations.body?.organizations)) pass("platform-organizations-list", `${organizations.body.organizations.length} org(s)`);
  else fail("platform-organizations-list", "missing organizations[]");
  if (organizations.body?.totals) pass("platform-organizations-totals", Object.keys(organizations.body.totals).join(", "));
  else fail("platform-organizations-totals", "missing totals");

  assertStatus("platform-organization-detail-success", organizationDetail, [200]);
  if (organizationDetail.body?.health && Array.isArray(organizationDetail.body?.units)) {
    pass("platform-organization-detail-metadata", "health + units summary");
  } else {
    fail("platform-organization-detail-metadata", "missing health/units");
  }

  assertStatus("platform-ai-usage-success", aiUsage, [200]);
  if (aiUsage.body?.totals && Array.isArray(aiUsage.body?.byOrganization)) pass("platform-ai-usage-aggregate", "totals + byOrganization");
  else fail("platform-ai-usage-aggregate", "missing aggregate");

  assertStatus("platform-audit-logs-success", auditLogs, [200]);
  if (Array.isArray(auditLogs.body?.auditLogs)) pass("platform-audit-logs-list", `${auditLogs.body.auditLogs.length} log(s)`);
  else fail("platform-audit-logs-list", "missing auditLogs[]");

  assertStatus("platform-release-readiness-success", releaseReadiness, [200]);
  const readiness = releaseReadiness.body?.readiness;
  const controlKeys = readiness?.productionControls?.controls?.map((control) => control.key) ?? [];
  const bffGates = readiness?.bffGates?.gates ?? [];
  if (controlKeys.includes("bff_surface_gates")) pass("release-readiness-bff-control", "bff_surface_gates");
  else fail("release-readiness-bff-control", controlKeys.join(", "));
  if (bffGates.some((gate) => gate.key === "platform_bff" && gate.status === "pass")) {
    pass("release-readiness-platform-bff-gate", "platform_bff pass");
  } else {
    fail("release-readiness-platform-bff-gate", JSON.stringify(bffGates));
  }
  if (bffGates.some((gate) => gate.key === "billing_bff" && gate.status === "blocked")) {
    pass("release-readiness-does-not-overclaim-billing-bff", "billing_bff blocked");
  } else {
    fail("release-readiness-does-not-overclaim-billing-bff", JSON.stringify(bffGates));
  }

  const platformReadText = [
    organizations.body,
    organizationDetail.body,
    aiUsage.body,
    auditLogs.body,
    releaseReadiness.body,
  ]
    .map((body) => serialize(body))
    .join("\n");
  assertNoPlatformPrivateLeak("platform-default-metadata-private-leak", platformReadText, forbiddenSentinels);

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const impersonationMissingReason = await post(
    "/api/platform/impersonation",
    {
      targetOrgId: target.organizationId,
      targetUserId: target.userId,
      scope: ["ORG_SUMMARY"],
      expiresAt,
    },
    { email: demoPlatformEmail },
  );
  assertStatus("impersonation-missing-reason-rejected", impersonationMissingReason, [400]);

  const impersonationTooLong = await post(
    "/api/platform/impersonation",
    {
      targetOrgId: target.organizationId,
      targetUserId: target.userId,
      reason: "BFF-304 QA expiry too long should fail",
      scope: ["ORG_SUMMARY"],
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    },
    { email: demoPlatformEmail },
  );
  assertStatus("impersonation-expiry-too-long-rejected", impersonationTooLong, [403]);

  const impersonationStart = await post(
    "/api/platform/impersonation",
    {
      targetOrgId: target.organizationId,
      targetUserId: target.userId,
      reason: "BFF-304 QA scoped tenant summary read proof",
      scope: ["ORG_SUMMARY"],
      expiresAt,
    },
    { email: demoPlatformEmail },
  );
  const impersonationSessionId = impersonationStart.body?.impersonationSession?.id ?? "";
  assertStatus("impersonation-start-success", impersonationStart, [201]);
  if (impersonationSessionId) pass("impersonation-start-session-id", impersonationSessionId);
  else fail("impersonation-start-session-id", "missing");
  if (impersonationStart.body?.impersonationSession?.actor?.id && impersonationStart.body?.impersonationSession?.targetOrg?.id) {
    pass("impersonation-start-actor-target-visible", "actor + targetOrg");
  } else {
    fail("impersonation-start-actor-target-visible", serialize(impersonationStart.body));
  }

  const readProof = await post(
    `/api/platform/impersonation/${impersonationSessionId}/read-proof`,
    {
      reason: "BFF-304 QA sensitive read audit id proof",
      scope: "ORG_SUMMARY",
    },
    { email: demoPlatformEmail },
  );
  const afterImpersonatedReadAudit = await countAudit("IMPERSONATED_READ", target.organizationId);
  assertStatus("impersonated-read-proof-success", readProof, [200]);
  if (readProof.body?.audit?.id) pass("impersonated-read-proof-audit-id", readProof.body.audit.id);
  else fail("impersonated-read-proof-audit-id", serialize(readProof.body));
  if (afterImpersonatedReadAudit > beforeImpersonatedReadAudit) {
    pass("impersonated-read-proof-audit-log-created", `${beforeImpersonatedReadAudit}->${afterImpersonatedReadAudit}`);
  } else {
    fail("impersonated-read-proof-audit-log-created", `${beforeImpersonatedReadAudit}->${afterImpersonatedReadAudit}`);
  }
  assertNoPlatformPrivateLeak("impersonated-read-proof-private-leak", serialize(readProof.body), forbiddenSentinels);

  const endImpersonation = await patch(
    `/api/platform/impersonation/${impersonationSessionId}`,
    {
      action: "END",
      reason: "BFF-304 QA end scoped impersonation proof",
    },
    { email: demoPlatformEmail },
  );
  assertStatus("impersonation-end-success", endImpersonation, [200]);

  const missingBreakGlassReason = await post(
    "/api/platform/break-glass",
    {
      targetOrgId: target.organizationId,
      targetUserId: target.userId,
      scope: ["SENSITIVE_CLIENT_READ"],
      expiresAt,
      riskAccepted: true,
    },
    { email: demoSupportEmail },
  );
  assertStatus("break-glass-missing-reason-rejected", missingBreakGlassReason, [400]);

  const missingBreakGlassRisk = await post(
    "/api/platform/break-glass",
    {
      targetOrgId: target.organizationId,
      targetUserId: target.userId,
      reason: "BFF-304 QA missing explicit risk acceptance",
      scope: ["SENSITIVE_CLIENT_READ"],
      expiresAt,
    },
    { email: demoSupportEmail },
  );
  assertStatus("break-glass-missing-risk-rejected", missingBreakGlassRisk, [400]);

  const breakGlassTooLong = await post(
    "/api/platform/break-glass",
    {
      targetOrgId: target.organizationId,
      targetUserId: target.userId,
      reason: "BFF-304 QA break-glass expiry too long should fail",
      scope: ["SENSITIVE_CLIENT_READ"],
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      riskAccepted: true,
    },
    { email: demoSupportEmail },
  );
  assertStatus("break-glass-expiry-too-long-rejected", breakGlassTooLong, [403]);

  const breakGlass = await post(
    "/api/platform/break-glass",
    {
      targetOrgId: target.organizationId,
      targetUserId: target.userId,
      reason: "BFF-304 QA support sensitive counts proof",
      scope: ["SENSITIVE_CLIENT_READ", "SENSITIVE_REPORT_READ"],
      expiresAt,
      riskAccepted: true,
    },
    { email: demoSupportEmail },
  );
  const afterBreakGlassAudit = await countAudit("BREAK_GLASS", target.organizationId);
  assertStatus("break-glass-success", breakGlass, [201]);
  if (breakGlass.body?.audit?.id) pass("break-glass-audit-id", breakGlass.body.audit.id);
  else fail("break-glass-audit-id", serialize(breakGlass.body));
  if (breakGlass.body?.breakGlass?.rawPayloadReturned === false) pass("break-glass-raw-payload-false", "false");
  else fail("break-glass-raw-payload-false", serialize(breakGlass.body?.breakGlass));
  if (breakGlass.body?.proof?.clients?.rawPayloadReturned === false && breakGlass.body?.proof?.reports?.rawPayloadReturned === false) {
    pass("break-glass-counts-only-proof", "clients/reports rawPayloadReturned=false");
  } else {
    fail("break-glass-counts-only-proof", serialize(breakGlass.body?.proof));
  }
  if (afterBreakGlassAudit > beforeBreakGlassAudit) {
    pass("break-glass-audit-log-created", `${beforeBreakGlassAudit}->${afterBreakGlassAudit}`);
  } else {
    fail("break-glass-audit-log-created", `${beforeBreakGlassAudit}->${afterBreakGlassAudit}`);
  }
  assertNoPlatformPrivateLeak("break-glass-private-leak", serialize(breakGlass.body), forbiddenSentinels);

  const filteredBreakGlassAudit = await get(
    `/api/platform/audit-logs?organizationId=${encodeURIComponent(target.organizationId)}&action=BREAK_GLASS&sensitivity=BREAK_GLASS`,
    { email: demoPlatformEmail },
  );
  assertStatus("break-glass-audit-filter-success", filteredBreakGlassAudit, [200]);
  if (filteredBreakGlassAudit.body?.auditLogs?.some((item) => item.id === breakGlass.body?.audit?.id)) {
    pass("break-glass-audit-filter-includes-proof-id", breakGlass.body.audit.id);
  } else {
    fail("break-glass-audit-filter-includes-proof-id", serialize(filteredBreakGlassAudit.body));
  }

  const afterAiUsage = await countAiUsageLogs();
  if (afterAiUsage === beforeAiUsage) pass("no-provider-ai-usage-unchanged", `${beforeAiUsage}->${afterAiUsage}`);
  else fail("no-provider-ai-usage-unchanged", `${beforeAiUsage}->${afterAiUsage}`);

  console.log(
    JSON.stringify(
      {
        organization: { id: target.organizationId, slug: target.organizationSlug },
        platformUsers: { superAdmin: demoPlatformEmail, support: demoSupportEmail },
        clientPortalToken: redact([clientPortalToken])[0],
        createdReportId,
        releaseReadiness: {
          overall: readiness?.overall,
          bffControl: readiness?.productionControls?.controls?.find((control) => control.key === "bff_surface_gates"),
          bffGates,
        },
        proofs: {
          impersonatedReadAuditId: readProof.body?.audit?.id,
          breakGlassAuditId: breakGlass.body?.audit?.id,
        },
        aiUsage: { before: beforeAiUsage, after: afterAiUsage },
      },
      null,
      2,
    ),
  );
}

function redact(values) {
  return values.map((value) => {
    if (!value || String(value).length < 8) return String(value ?? "");
    const text = String(value);
    return `${text.slice(0, 4)}...${text.slice(-4)}`;
  });
}

async function main() {
  try {
    verifyStaticBoundaries();
    await ensureDevServer();
    await connectDb();

    const target = await getDemoTarget();
    await ensurePlatformUser(target.organizationId, {
      userId: "demo_user_platform_bff304",
      membershipId: "demo_membership_platform_bff304",
      platformUserId: "demo_platform_user_bff304_super_admin",
      email: demoPlatformEmail,
      name: "Demo Platform BFF Admin",
      role: "SUPER_ADMIN",
    });
    await ensurePlatformUser(target.organizationId, {
      userId: "demo_user_platform_support_bff304",
      membershipId: "demo_membership_platform_support_bff304",
      platformUserId: "demo_platform_user_bff304_support",
      email: demoSupportEmail,
      name: "Demo Platform BFF Support",
      role: "SUPPORT",
    });

    const forbiddenSentinels = await getForbiddenSentinels(target.organizationId);
    await runApiProof(target, forbiddenSentinels);
  } finally {
    if (db) await db.end();
    for (const child of spawned) {
      child.kill("SIGTERM");
    }
  }

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  for (const child of spawned) {
    child.kill("SIGTERM");
  }
  process.exit(1);
});
