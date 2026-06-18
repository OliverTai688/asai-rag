#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.CLIENT_PORTAL_QA_BASE_URL ?? process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const token = process.env.CLIENT_PORTAL_QA_TOKEN ?? "demo-share-wang";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new Client({ connectionString: dbUrl });
await db.connect();

try {
  const before = await getResponseCounts(token);
  const unauthorized = await get("/api/client-portal/bootstrap");
  push(unauthorized.status === 401, "Client portal bootstrap rejects missing client session", `status=${unauthorized.status}`);

  const workspace = await get("/api/workspace/bootstrap", { "x-asai-client-token": token });
  push(workspace.status === 401, "Client token cannot enter member/org workspace bootstrap", `status=${workspace.status}`);

  const bootstrap = await get("/api/client-portal/bootstrap", { "x-asai-client-token": token });
  const bootstrapText = JSON.stringify(bootstrap.body);
  push(bootstrap.status === 200, "GET /api/client-portal/bootstrap returns authorized scope", `status=${bootstrap.status}`);
  push(bootstrap.body?.session?.type === "client", "Bootstrap uses client session type", bootstrap.body?.session?.type ?? "missing");
  push(bootstrap.body?.client?.displayName === "王大明", "Bootstrap returns client display name only", bootstrap.body?.client?.displayName ?? "missing");
  push(Array.isArray(bootstrap.body?.report?.sections), "Bootstrap returns authorized report sections");
  push((bootstrap.body?.report?.sections?.length ?? 0) > 0, "Bootstrap includes at least one client-safe section");

  const forbidden = [
    "internalSections",
    "內部摘要",
    "演練回饋",
    "performance",
    "policy_number",
    "insured_amount",
    "annualIncome",
    "phone",
    "email",
    "actorUserId",
    "ownerId",
  ];
  const leaked = forbidden.filter((value) => bootstrapText.includes(value));
  push(
    leaked.length === 0,
    "Bootstrap omits internal/client-private fields",
    leaked.length === 0 ? `${forbidden.length} sentinels checked` : `leaked=${leaked.join(", ")}`,
  );

  const response = await post(
    "/api/client-portal/responses",
    {
      type: "BOOKING_INTENT",
      message: "我想約下週二下午確認醫療險缺口，請顧問聯絡我。",
      payload: {
        preferredTime: "next Tuesday afternoon",
        contactMethod: "phone",
        topic: "medical coverage gap",
        unsafeRawPrivatePayload: "must-not-persist",
      },
    },
    { "x-asai-client-token": token },
  );
  push(response.status === 201, "POST /api/client-portal/responses stores client response", `status=${response.status}`);
  push(Boolean(response.body?.response?.id), "Client response returns event id", response.body?.response?.id ?? "missing");

  const invalid = await post(
    "/api/client-portal/responses",
    { type: "UNSAFE", message: "bad" },
    { "x-asai-client-token": token },
  );
  push(invalid.status === 400, "Client response validates type contract", `status=${invalid.status}`);

  const after = await getResponseCounts(token);
  push(after.response_events > before.response_events, "InteractionEvent count increments for client response", `${before.response_events}->${after.response_events}`);
  push(after.private_payload_events === 0, "Client response metadata does not persist unsafe private keys", `count=${after.private_payload_events}`);

  console.log(
    JSON.stringify(
      {
        token,
        before,
        after,
        bootstrap: {
          client: bootstrap.body?.client,
          reportId: bootstrap.body?.report?.id,
          sections: bootstrap.body?.report?.sections?.length ?? 0,
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

async function getResponseCounts(shareToken) {
  const result = await db.query(
    `SELECT
       rs.id AS share_id,
       r.id AS report_id,
       r.client_id,
       (
         SELECT COUNT(*)::int
         FROM interaction_events ie
         WHERE ie.organization_id = rs.organization_id
           AND ie.client_id = r.client_id
           AND ie.metadata->>'source' = 'client_portal'
           AND ie.metadata->>'shareId' = rs.id
       ) AS response_events,
       (
         SELECT COUNT(*)::int
         FROM interaction_events ie
         WHERE ie.organization_id = rs.organization_id
           AND ie.client_id = r.client_id
           AND ie.metadata ? 'unsafeRawPrivatePayload'
       ) AS private_payload_events
     FROM report_shares rs
     JOIN reports r ON r.id = rs.report_id
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

async function get(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return parseResponse(response);
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
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
