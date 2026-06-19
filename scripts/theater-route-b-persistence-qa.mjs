#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client as PgClient } from "pg";
import { buildRouteBHandoffFixture } from "./fixtures/route-b-handoff-fixture.mjs";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const handoff = buildRouteBHandoffFixture("route_b_persistence_qa");
const checks = [];
let createdSessionId = null;

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runProof();
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

async function runProof() {
  const beforeUsageCount = await countTheaterUsageLogs();

  const unauth = await postJson("/api/theater/route-b/sessions", { handoff });
  push(unauth.status === 401, "Route B persisted session unauth returns 401", `status=${unauth.status}`);

  const invalid = await memberPost({ handoff: { id: "broken" } });
  push(invalid.status === 400, "Route B persisted session invalid handoff returns 400", `status=${invalid.status}`);

  const created = await memberPost({ handoff, isDemo: true });
  const createdText = JSON.stringify(created.body);
  createdSessionId = created.body?.session?.id ?? null;
  push(created.status === 201 && Boolean(createdSessionId), "Route B persisted session creates DB-backed session", `status=${created.status} session=${createdSessionId ?? ""}`);
  push(created.body?.session?.routeBEnabled === true, "persisted Route B session is routeBEnabled");
  push(created.body?.characters?.length === 3, "persisted Route B session returns focus and NPC characters");
  push(created.body?.turns?.length === 1, "persisted Route B session returns opening director turn");
  push(created.body?.turns?.[0]?.visibilityScope === "DIRECTOR_ONLY", "opening turn is director-only");
  push(created.body?.session?.provider?.callAttempted === false, "persisted session creation does not call provider");
  push(created.body?.session?.provider?.usageLogWritten === false, "persisted session creation does not fake usage log");
  push(
    created.body?.session?.provider?.usageLogRequiredFor?.join(",") === "DIRECTOR,CHARACTER,FEEDBACK",
    "persisted session carries future usage-log requirement",
  );
  pushNoPrivateSentinel(createdText, "persisted session create response has no private sentinel");

  if (!createdSessionId) return;

  const readBack = await memberGet(`/api/theater/route-b/sessions/${createdSessionId}`);
  const readBackText = JSON.stringify(readBack.body);
  push(readBack.status === 200, "Route B persisted session can be read by owner", `status=${readBack.status}`);
  push(readBack.body?.session?.id === createdSessionId, "read-back session id matches created session");
  push(readBack.body?.characters?.some((character) => character.routeBCharacterId === "character_focus_lin"), "read-back keeps routeB logical character id");
  push(readBack.body?.visibilityProof?.ownerOnlyRead === true, "read-back declares owner-only read boundary");
  push(readBack.body?.visibilityProof?.thirdPartyVisibleForDirectMessage === false, "read-back keeps private/direct-message proof false");
  pushNoPrivateSentinel(readBackText, "persisted session read response has no private sentinel");

  const managerRead = await managerGet(`/api/theater/route-b/sessions/${createdSessionId}`);
  push(managerRead.status === 404, "manager cannot read member-owned Route B session", `status=${managerRead.status}`);

  const dbProof = await getPersistedCounts(createdSessionId);
  push(dbProof.sessionCount === 1, "DB proof has one theater_session row", JSON.stringify(dbProof));
  push(dbProof.characterCount === 3, "DB proof has three theater_character rows", JSON.stringify(dbProof));
  push(dbProof.openingTurnCount === 1, "DB proof has one director-only opening turn", JSON.stringify(dbProof));
  push(dbProof.dbCharacterIdsAreSessionScoped === true, "DB character ids are session-scoped and repeatable");

  const afterUsageCount = await countTheaterUsageLogs();
  push(afterUsageCount === beforeUsageCount, "Route B persistence writes no fake AiUsageLog", `before=${beforeUsageCount} after=${afterUsageCount}`);
}

async function postJson(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

async function getJson(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers,
  });

  return {
    status: response.status,
    body: await readJson(response),
  };
}

function memberPost(body) {
  return postJson("/api/theater/route-b/sessions", body, {
    "x-asai-demo-user-email": demoMemberEmail,
  });
}

function memberGet(path) {
  return getJson(path, {
    "x-asai-demo-user-email": demoMemberEmail,
  });
}

function managerGet(path) {
  return getJson(path, {
    "x-asai-demo-user-email": demoManagerEmail,
  });
}

async function getPersistedCounts(sessionId) {
  const result = await db.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM theater_sessions WHERE id = $1 AND route_b_enabled = true) AS session_count,
        (SELECT COUNT(*)::int FROM theater_characters WHERE session_id = $1) AS character_count,
        (SELECT COUNT(*)::int FROM theater_turns WHERE session_id = $1 AND "visibilityScope" = 'DIRECTOR_ONLY') AS opening_turn_count,
        (
          SELECT bool_and(id <> route_b_character_id)
          FROM theater_characters
          WHERE session_id = $1
        ) AS db_character_ids_are_session_scoped
    `,
    [sessionId],
  );
  const row = result.rows[0] ?? {};

  return {
    sessionCount: Number(row.session_count ?? 0),
    characterCount: Number(row.character_count ?? 0),
    openingTurnCount: Number(row.opening_turn_count ?? 0),
    dbCharacterIdsAreSessionScoped: row.db_character_ids_are_session_scoped === true,
  };
}

async function countTheaterUsageLogs() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs WHERE module = 'THEATER'");
  return Number(result.rows[0]?.count ?? 0);
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function pushNoPrivateSentinel(text, label) {
  push(
    !text.includes("@") &&
      !/09\d{2}/.test(text) &&
      !["rawPayload", "providerPayload", "authorization", "cookie", "secret", "token", "otp", "payment"].some((key) =>
        text.toLowerCase().includes(key.toLowerCase()),
      ),
    label,
  );
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
