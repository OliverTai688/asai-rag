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
  const createdMeetingGrounding = created.body?.scene?.sourceGrounding?.meetingRelationshipSignals;
  push(createdMeetingGrounding?.cardCount === 1, "created session returns meeting signal source grounding");
  push(createdMeetingGrounding?.cards?.[0]?.stageCardId === "route_b_meeting_signal_1", "created session source grounding omits raw meeting/person ids");
  push(createdMeetingGrounding?.boundary?.browserSuppliedSessionId === false, "created session source grounding rejects browser-supplied meeting session id");
  push(createdMeetingGrounding?.boundary?.writesRelationshipGraph === false, "created session source grounding writes no relationship graph");
  push(createdMeetingGrounding?.boundary?.writesVisitPlan === false, "created session source grounding writes no VisitPlan");
  push(createdMeetingGrounding?.boundary?.writesConfirmedCrmFact === false, "created session source grounding writes no confirmed CRM fact");
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
  const readBackMeetingGrounding = readBack.body?.scene?.sourceGrounding?.meetingRelationshipSignals;
  push(readBackMeetingGrounding?.cardCount === 1, "read-back keeps meeting signal source grounding");
  push(readBackMeetingGrounding?.boundary?.providerCallAttempted === false, "read-back meeting signal grounding remains no-provider");
  push(readBack.body?.visibilityProof?.ownerOnlyRead === true, "read-back declares owner-only read boundary");
  push(readBack.body?.visibilityProof?.thirdPartyVisibleForDirectMessage === false, "read-back keeps private/direct-message proof false");
  pushNoPrivateSentinel(readBackText, "persisted session read response has no private sentinel");

  const managerRead = await managerGet(`/api/theater/route-b/sessions/${createdSessionId}`);
  push(managerRead.status === 404, "manager cannot read member-owned Route B session", `status=${managerRead.status}`);

  const updatedAt = new Date().toISOString();
  const redLineRecords = [
    {
      ruleId: "SIGNATURE_SUBSTITUTION",
      state: "EVIDENCE_NEEDED",
      advisorReasonCode: "EVIDENCE_PENDING",
      updatedAt,
    },
    {
      ruleId: "PREMIUM_ADVANCE",
      state: "NOT_APPLICABLE",
      advisorReasonCode: "FALSE_POSITIVE_CONTEXT",
      updatedAt,
    },
    {
      ruleId: "GUARANTEED_RETURN",
      state: "ESCALATE",
      advisorReasonCode: "ESCALATION_REQUESTED",
      updatedAt,
    },
  ];
  const redLineWrite = await memberPostJson(`/api/theater/route-b/sessions/${createdSessionId}/red-line-actions`, {
    records: redLineRecords,
  });
  push(redLineWrite.status === 201, "owner can persist Route B red-line action state", `status=${redLineWrite.status}`);
  push(redLineWrite.body?.actionId === "route-b-severe-red-line-action-persistence", "red-line action persistence returns action id");
  push(redLineWrite.body?.recordCount === 5, "red-line action persistence normalizes all five severe records");
  push(redLineWrite.body?.persistenceEnvelope?.ownerScopedSessionOnly === true, "red-line action persistence declares owner scope");
  push(redLineWrite.body?.providerBoundary?.providerCallAttempted === false, "red-line action persistence does not call provider");
  push(redLineWrite.body?.providerBoundary?.aiUsageLogWritten === false, "red-line action persistence does not fake usage log");
  push(redLineWrite.body?.persistenceEnvelope?.writesConfirmedCrmFact === false, "red-line action persistence writes no confirmed CRM fact");
  pushNoPrivateSentinel(JSON.stringify(redLineWrite.body), "red-line action write response has no private sentinel");

  const redLineRead = await memberGet(`/api/theater/route-b/sessions/${createdSessionId}/red-line-actions`);
  push(redLineRead.status === 200, "owner can refresh Route B red-line action state", `status=${redLineRead.status}`);
  push(redLineRead.body?.records?.some((record) => record.ruleId === "GUARANTEED_RETURN" && record.state === "ESCALATE"), "refresh keeps escalation state");
  push(redLineRead.body?.records?.some((record) => record.ruleId === "PREMIUM_ADVANCE" && record.advisorReasonCode === "FALSE_POSITIVE_CONTEXT"), "refresh keeps not-applicable reason code");

  const managerRedLineRead = await managerGet(`/api/theater/route-b/sessions/${createdSessionId}/red-line-actions`);
  push(managerRedLineRead.status === 404, "manager cannot read member-owned red-line action state", `status=${managerRedLineRead.status}`);

  const redLineDbProof = await getRedLineActionDbProof(createdSessionId);
  push(redLineDbProof.actionId === "route-b-severe-red-line-action-persistence", "DB proof stores red-line action state under scene_state", JSON.stringify(redLineDbProof));
  push(redLineDbProof.recordCount === 5, "DB proof stores normalized five red-line action records", JSON.stringify(redLineDbProof));
  push(redLineDbProof.escalateCount === 1, "DB proof stores one escalation action state", JSON.stringify(redLineDbProof));
  push(redLineDbProof.allowedFieldOnly === true, "DB proof keeps red-line records on allowed fields only", JSON.stringify(redLineDbProof));

  const dbProof = await getPersistedCounts(createdSessionId);
  push(dbProof.sessionCount === 1, "DB proof has one theater_session row", JSON.stringify(dbProof));
  push(dbProof.characterCount === 3, "DB proof has three theater_character rows", JSON.stringify(dbProof));
  push(dbProof.openingTurnCount === 1, "DB proof has one director-only opening turn", JSON.stringify(dbProof));
  push(dbProof.dbCharacterIdsAreSessionScoped === true, "DB character ids are session-scoped and repeatable");
  const meetingGroundingDbProof = await getMeetingGroundingDbProof(createdSessionId);
  push(meetingGroundingDbProof.cardCount === 1, "DB proof stores meeting signal grounding under scene_state", JSON.stringify(meetingGroundingDbProof));
  push(meetingGroundingDbProof.providerCallAttempted === false, "DB proof keeps meeting signal grounding no-provider", JSON.stringify(meetingGroundingDbProof));
  push(meetingGroundingDbProof.writesRelationshipGraph === false, "DB proof keeps meeting signal grounding graph-write disabled", JSON.stringify(meetingGroundingDbProof));
  push(meetingGroundingDbProof.writesVisitPlan === false, "DB proof keeps meeting signal grounding VisitPlan-write disabled", JSON.stringify(meetingGroundingDbProof));
  push(meetingGroundingDbProof.writesConfirmedCrmFact === false, "DB proof keeps meeting signal grounding CRM fact-write disabled", JSON.stringify(meetingGroundingDbProof));

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

function memberPostJson(path, body) {
  return postJson(path, body, {
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

async function getRedLineActionDbProof(sessionId) {
  const result = await db.query(
    `
      SELECT
        scene_state #>> '{redLineActionState,actionId}' AS action_id,
        jsonb_array_length(COALESCE(scene_state #> '{redLineActionState,records}', '[]'::jsonb))::int AS record_count,
        (
          SELECT COUNT(*)::int
          FROM jsonb_array_elements(COALESCE(scene_state #> '{redLineActionState,records}', '[]'::jsonb)) AS record
          WHERE record->>'state' = 'ESCALATE'
        ) AS escalate_count,
        (
          SELECT bool_and(
            (
              SELECT array_agg(key ORDER BY key)
              FROM jsonb_object_keys(record) AS key
            ) = ARRAY['advisorReasonCode', 'ruleId', 'state', 'updatedAt']
          )
          FROM jsonb_array_elements(COALESCE(scene_state #> '{redLineActionState,records}', '[]'::jsonb)) AS record
        ) AS allowed_field_only
      FROM theater_sessions
      WHERE id = $1
    `,
    [sessionId],
  );
  const row = result.rows[0] ?? {};

  return {
    actionId: row.action_id ?? "",
    recordCount: Number(row.record_count ?? 0),
    escalateCount: Number(row.escalate_count ?? 0),
    allowedFieldOnly: row.allowed_field_only === true,
  };
}

async function getMeetingGroundingDbProof(sessionId) {
  const result = await db.query(
    `
      SELECT
        COALESCE((scene_state #>> '{sourceGrounding,meetingRelationshipSignals,cardCount}')::int, 0) AS card_count,
        COALESCE((scene_state #>> '{sourceGrounding,meetingRelationshipSignals,boundary,providerCallAttempted}')::boolean, true) AS provider_call_attempted,
        COALESCE((scene_state #>> '{sourceGrounding,meetingRelationshipSignals,boundary,writesRelationshipGraph}')::boolean, true) AS writes_relationship_graph,
        COALESCE((scene_state #>> '{sourceGrounding,meetingRelationshipSignals,boundary,writesVisitPlan}')::boolean, true) AS writes_visit_plan,
        COALESCE((scene_state #>> '{sourceGrounding,meetingRelationshipSignals,boundary,writesConfirmedCrmFact}')::boolean, true) AS writes_confirmed_crm_fact
      FROM theater_sessions
      WHERE id = $1
    `,
    [sessionId],
  );
  const row = result.rows[0] ?? {};

  return {
    cardCount: Number(row.card_count ?? 0),
    providerCallAttempted: row.provider_call_attempted === true,
    writesRelationshipGraph: row.writes_relationship_graph === true,
    writesVisitPlan: row.writes_visit_plan === true,
    writesConfirmedCrmFact: row.writes_confirmed_crm_fact === true,
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
