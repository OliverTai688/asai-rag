#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { Client } from "pg";

const require = createRequire(`${process.cwd()}/node_modules/playwright-core/`);
const { chromium } = require("playwright-core");

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const screenshotPath =
  "docs/06_audits-and-reports/screenshots/launch-readiness/lch-009/release-readiness-super-admin.png";
const privacyScreenshotPath =
  "docs/06_audits-and-reports/screenshots/launch-readiness/lch-009/privacy-page.png";
const termsScreenshotPath =
  "docs/06_audits-and-reports/screenshots/launch-readiness/lch-009/terms-page.png";
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
  const forbidden = await getForbiddenSentinels(org.id);

  const memberReadiness = await request("GET", "/api/platform/release-readiness", demoMemberEmail);
  push(
    memberReadiness.status === 403,
    "Regular app session cannot read platform release readiness",
    `status=${memberReadiness.status}, error=${memberReadiness.body?.error ?? "missing"}`,
  );

  const platformReadiness = await request("GET", "/api/platform/release-readiness", demoPlatformEmail);
  const readiness = platformReadiness.body?.readiness;
  const controlKeys = readiness?.productionControls?.controls?.map((control) => control.key) ?? [];
  const controlStatus = Object.fromEntries(
    readiness?.productionControls?.controls?.map((control) => [control.key, control.status]) ?? [],
  );
  const requiredControls = [
    "ai_quota",
    "mock_api",
    "production_email",
    "production_notifications",
    "billing_checkout",
    "auth_secret",
    "runtime_database",
    "monitoring",
    "legal_pages",
    "backup_restore",
    "ecpay_checklist",
  ];
  const missingControls = requiredControls.filter((key) => !controlKeys.includes(key));

  push(platformReadiness.status === 200, "Platform user GET /api/platform/release-readiness returns 200");
  push(Boolean(readiness?.overall?.status), "Release readiness returns overall status");
  push(Array.isArray(readiness?.productionControls?.controls), "Release readiness returns production controls");
  push(Boolean(readiness?.quota), "Release readiness returns AI quota guard summary");
  push(Boolean(readiness?.aiUsage), "Release readiness returns AI usage cost summary");
  push(missingControls.length === 0, "Release readiness includes all required control gates", missingControls.join(", "));
  push(controlStatus.legal_pages === "pass", "Legal pages release gate is pass", `${controlStatus.legal_pages ?? "missing"}`);
  push(controlStatus.backup_restore === "pass", "Backup/restore runbook release gate is pass", `${controlStatus.backup_restore ?? "missing"}`);
  push(controlStatus.ecpay_checklist === "pass", "ECPay checklist release gate is pass", `${controlStatus.ecpay_checklist ?? "missing"}`);

  const readinessText = JSON.stringify(platformReadiness.body);
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
    '"providerCustomerId"',
    '"providerSubscriptionId"',
    '"stripeCustomerId"',
    '"stripeSubscriptionId"',
    '"metadata"',
  ];
  const forbiddenFieldLeaks = forbiddenFieldNames.filter((field) => readinessText.includes(field));
  const leaked = forbidden.filter((value) => readinessText.includes(value));

  push(
    forbiddenFieldLeaks.length === 0,
    "Release readiness omits private field names and raw provider identifiers",
    forbiddenFieldLeaks.length === 0 ? forbiddenFieldNames.join(", ") : forbiddenFieldLeaks.join(", "),
  );
  push(
    leaked.length === 0,
    "Release readiness does not expose seeded client/policy/report sentinels",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${redact(leaked.slice(0, 4)).join(", ")}`,
  );

  const browserResult = await runBrowserProof();
  const privacyPage = await requestPublic("/privacy");
  const termsPage = await requestPublic("/terms");

  push(browserResult.pageLoaded, "Super admin page renders with platform dev header");
  push(browserResult.hasReleaseReadiness, "Super admin page shows release readiness panel");
  push(browserResult.hasAiQuotaWarning, "Super admin page shows AI quota warning panel");
  push(browserResult.hasPrivacyDisclaimer, "Privacy page browser proof shows AI usage disclaimer section");
  push(browserResult.hasTermsDisclaimer, "Terms page browser proof shows AI disclaimer section");
  push(browserResult.consoleErrors === 0, "Release browser proof has no console errors", `${browserResult.consoleErrors}`);
  push(!browserResult.horizontalOverflow, "Release browser proof has no horizontal overflow");
  push(privacyPage.status === 200, "Public privacy page returns 200", `status=${privacyPage.status}`);
  push(privacyPage.text.includes("AI 使用與責任邊界"), "Privacy page includes AI usage disclaimer section");
  push(termsPage.status === 200, "Public terms page returns 200", `status=${termsPage.status}`);
  push(termsPage.text.includes("AI disclaimer"), "Terms page includes AI disclaimer section");

  console.log(
    JSON.stringify(
      {
        platformUser: demoPlatformEmail,
        regularUser: demoMemberEmail,
        organization: { id: org.id, slug: org.slug },
        responses: {
          memberReadiness: { status: memberReadiness.status, error: memberReadiness.body?.error },
          platformReadiness: {
            status: platformReadiness.status,
            overall: readiness?.overall,
            controls: controlStatus,
            aiRequests: readiness?.aiUsage?.requests,
            quotaWarnings: readiness?.quota?.organizationsAtWarning,
          },
          publicPages: {
            privacy: { status: privacyPage.status },
            terms: { status: termsPage.status },
          },
        },
        forbiddenSentinelsChecked: forbidden.length,
        screenshots: {
          superAdmin: screenshotPath,
          privacy: privacyScreenshotPath,
          terms: termsScreenshotPath,
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

async function runBrowserProof() {
  const browser = await chromium.launch({ channel: "msedge" });
  const consoleErrors = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      extraHTTPHeaders: { "x-asai-demo-user-email": demoPlatformEmail },
    });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    const response = await page.goto(`${baseUrl}/super-admin`, { waitUntil: "networkidle" });
    const hasReleaseReadiness = await page.getByText("Release readiness").first().isVisible().catch(() => false);
    const hasAiQuotaWarning = await page.getByText("AI quota warning").first().isVisible().catch(() => false);
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );

    mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.goto(`${baseUrl}/privacy`, { waitUntil: "networkidle" });
    const hasPrivacyDisclaimer = await page.getByText("AI 使用與責任邊界").first().isVisible().catch(() => false);
    const privacyOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    await page.screenshot({ path: privacyScreenshotPath, fullPage: true });

    await page.goto(`${baseUrl}/terms`, { waitUntil: "networkidle" });
    const hasTermsDisclaimer = await page.getByText("AI disclaimer").first().isVisible().catch(() => false);
    const termsOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    await page.screenshot({ path: termsScreenshotPath, fullPage: true });

    await context.close();

    return {
      pageLoaded: Boolean(response?.ok()),
      hasReleaseReadiness,
      hasAiQuotaWarning,
      hasPrivacyDisclaimer,
      hasTermsDisclaimer,
      consoleErrors: consoleErrors.length,
      horizontalOverflow: horizontalOverflow || privacyOverflow || termsOverflow,
    };
  } finally {
    await browser.close();
  }
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
       'demo_user_platform_release',
       $1,
       'Demo Platform Release Admin',
       'ACTIVE'::"UserStatus",
       true,
       'user:platform:release-readiness',
       'quickstart-insurance-advisor',
       1,
       now(),
       now()
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
       'demo_membership_platform_release',
       $1,
       $2,
       (SELECT id FROM organization_units WHERE organization_id = $1 AND type = 'HEADQUARTERS' AND is_active = true LIMIT 1),
       'OWNER'::"MemberRole",
       'ACTIVE'::"MembershipStatus",
       'Demo platform release readiness access anchor',
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
       'demo_platform_user_release',
       $1,
       'SUPER_ADMIN'::"PlatformRole",
       true,
       false,
       '{"source":"demo-release-readiness-qa"}'::jsonb,
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

async function getForbiddenSentinels(organizationId) {
  const result = await db.query(
    `SELECT c.name, c.email, c.phone, c.occupation, c.company, c.notes,
            p.policy_number, p.product_name,
            r.title, r.client_sections::text, r.internal_sections::text,
            a.request_id
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

async function request(method, path, email) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-asai-demo-user-email": email,
    },
  });
  const text = await response.text();

  try {
    return { status: response.status, body: text ? JSON.parse(text) : null };
  } catch {
    return { status: response.status, body: { raw: text } };
  }
}

async function requestPublic(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, text: await response.text() };
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function redact(values) {
  return values.map((value) => `${String(value).slice(0, 3)}...${String(value).slice(-2)}`);
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
