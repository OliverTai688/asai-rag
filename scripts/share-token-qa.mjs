#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.SHARE_QA_BASE_URL ?? process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const token = process.env.SHARE_QA_TOKEN ?? "demo-share-wang";
const expiredToken = process.env.SHARE_QA_EXPIRED_TOKEN ?? "demo-share-wang-expired";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new Client({ connectionString: dbUrl });
await db.connect();

try {
  await ensureExpiredShare(token, expiredToken);

  const before = await getShareCounts(token);
  const shared = await get(`/api/share/${token}`);
  const sharedText = JSON.stringify(shared.body);

  push(shared.status === 200, "GET /api/share/[token] returns authorized report", `status=${shared.status}`);
  push(shared.body?.share?.token === token, "Share DTO includes matching token", shared.body?.share?.token ?? "missing");
  push(shared.body?.report?.clientName === "王大明", "Share DTO includes client display name only", shared.body?.report?.clientName ?? "missing");
  push(Array.isArray(shared.body?.report?.sections), "Share DTO includes client sections array");
  push(shared.body?.report?.sections?.length > 0, "Share DTO includes at least one client section");

  const forbidden = [
    "內部摘要",
    "演練回饋",
    "performance",
    "internalSections",
    "policy_number",
    "insured_amount",
    "annualIncome",
    "phone",
    "email",
  ];
  const leaked = forbidden.filter((value) => sharedText.includes(value));
  push(
    leaked.length === 0,
    "Share DTO omits internal/client-private fields",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${leaked.join(", ")}`,
  );

  const event = await post(`/api/share/${token}/events`, {
    type: "OPEN",
    payload: {
      source: "share-token-qa",
      section: "recommendation",
      unsafeRawPrivatePayload: "must-not-persist",
    },
  });
  push(event.status === 200, "POST /api/share/[token]/events records OPEN", `status=${event.status}`);

  const invalid = await get("/api/share/not-a-real-share-token");
  push(invalid.status === 404, "Invalid share token returns 404", `status=${invalid.status}`);

  const expiredBefore = await getShareCounts(expiredToken);
  const expired = await get(`/api/share/${expiredToken}`);
  push(expired.status === 404, "Expired share token returns 404", `status=${expired.status}`);

  const expiredEvent = await post(`/api/share/${expiredToken}/events`, {
    type: "OPEN",
    payload: { source: "share-token-qa-expired" },
  });
  push(expiredEvent.status === 404, "Expired share token cannot record events", `status=${expiredEvent.status}`);

  const after = await getShareCounts(token);
  const expiredAfter = await getShareCounts(expiredToken);
  push(after.access_count > before.access_count, "ReportShare access_count increments on OPEN", `${before.access_count}->${after.access_count}`);
  push(after.share_events > before.share_events, "ShareEvent count increments on OPEN", `${before.share_events}->${after.share_events}`);
  push(after.private_payload_events === 0, "ShareEvent payload does not persist unsafe private keys", `count=${after.private_payload_events}`);
  push(
    expiredAfter.access_count === expiredBefore.access_count,
    "Expired share access_count does not increment",
    `${expiredBefore.access_count}->${expiredAfter.access_count}`,
  );
  push(
    expiredAfter.share_events === expiredBefore.share_events,
    "Expired share does not create ShareEvent",
    `${expiredBefore.share_events}->${expiredAfter.share_events}`,
  );

  console.log(
    JSON.stringify(
      {
        token,
        expiredToken,
        before,
        after,
        expired: {
          before: expiredBefore,
          after: expiredAfter,
        },
        report: {
          id: shared.body?.report?.id,
          sections: shared.body?.report?.sections?.length ?? 0,
          branding: shared.body?.share?.branding,
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

async function getShareCounts(shareToken) {
  const result = await db.query(
    `SELECT
       rs.access_count,
       (SELECT COUNT(*)::int FROM share_events WHERE share_id = rs.id) AS share_events,
       (
         SELECT COUNT(*)::int
         FROM share_events
         WHERE share_id = rs.id
           AND payload ? 'unsafeRawPrivatePayload'
       ) AS private_payload_events
     FROM report_shares rs
     WHERE rs.token = $1
     LIMIT 1`,
    [shareToken],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error(`Share token not found: ${shareToken}. Run pnpm demo:seed:reset first.`);
  }

  return row;
}

async function ensureExpiredShare(validToken, targetToken) {
  const result = await db.query(
    `INSERT INTO report_shares (
       id,
       organization_id,
       unit_id,
       report_id,
       token,
       expires_at,
       access_count,
       cta_config,
       is_demo,
       demo_seed_key,
       demo_scenario,
       demo_seed_version,
       created_at,
       updated_at
     )
     SELECT
       'demo_expired_share_wang',
       organization_id,
       unit_id,
       report_id,
       $2,
       now() - interval '1 day',
       0,
       cta_config,
       true,
       'quickstart-insurance-advisor:share:wang:expired:v1',
       'quickstart-insurance-advisor',
       1,
       now(),
       now()
     FROM report_shares
     WHERE token = $1
     LIMIT 1
     ON CONFLICT (demo_seed_key) DO UPDATE SET
       token = EXCLUDED.token,
       report_id = EXCLUDED.report_id,
       unit_id = EXCLUDED.unit_id,
       expires_at = EXCLUDED.expires_at,
       cta_config = EXCLUDED.cta_config,
       is_demo = true,
       updated_at = now()
     RETURNING token`,
    [validToken, targetToken],
  );

  if (!result.rows[0]) {
    throw new Error(`Valid share token not found: ${validToken}. Run pnpm demo:seed:reset first.`);
  }
}

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return parseResponse(response);
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "share-token-qa" },
    body: JSON.stringify(body),
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
