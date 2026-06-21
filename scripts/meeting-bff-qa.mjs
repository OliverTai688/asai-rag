#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const managerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runApiProof();
} catch (error) {
  push(false, "meeting BFF QA crashed", error instanceof Error ? error.message : String(error));
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

async function runApiProof() {
  const beforeUsageCount = await countAiUsageLogs();
  const unique = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

  const unauth = await postJson("/api/ai/meeting/sessions", {
    title: "AMM-002 unauth proof",
  });
  push(unauth.status === 401, "meeting create unauth returns 401", `status=${unauth.status}`);

  const client = await createClient(`AMM-002 會議客戶 ${unique}`, `amm002-${unique}@asai.local`);
  if (!client?.id) return;

  const visit = await createVisitPlan(client.id, unique);
  const visitPlanId = visit?.visitPlan?.id;
  push(typeof visitPlanId === "string", "member creates visit plan for meeting scope", `visitPlan=${visitPlanId ?? "missing"}`);
  if (typeof visitPlanId !== "string") return;

  const create = await postJson(
    "/api/ai/meeting/sessions",
    {
      clientId: client.id,
      visitPlanId,
      currentSegmentId: "capture",
      title: `AMM-002 會議 ${unique}`,
    },
    demoEmail,
  );
  const sessionId = create.body?.session?.id;
  push(create.status === 201 && typeof sessionId === "string", "member creates CLIENT_MEETING session", `status=${create.status}`);
  push(create.body?.session?.interviewKind === "CLIENT_MEETING", "created session uses CLIENT_MEETING kind");
  push(create.body?.session?.clientId === client.id, "created session is linked to owner client", `client=${create.body?.session?.clientId ?? "missing"}`);
  push(create.body?.memoryRail?.total === 0, "new meeting snapshot starts with empty memory rail");
  pushNoForbiddenPayload(JSON.stringify(create.body), "meeting create response has no raw provider/audio payload");

  if (typeof sessionId !== "string") return;

  const textTurn = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/turns`,
    {
      role: "USER",
      source: "TEXT_INPUT",
      modality: "TEXT",
      content: "我確認客戶希望先釐清醫療保障缺口，並請配偶一起參與下一次決策。",
      transcriptFinal: true,
      outlineSegmentId: "capture",
      issueTags: ["medical-gap", "spouse-decision"],
      pqQuestionIds: ["pq-meeting-medical-gap"],
    },
    demoEmail,
  );
  push(textTurn.status === 201 && typeof textTurn.body?.turn?.id === "string", "member appends text meeting turn", `status=${textTurn.status}`);
  push(textTurn.body?.turn?.modality === "TEXT", "text meeting turn keeps TEXT modality");
  push(textTurn.body?.memoryRail?.total >= 1, "text meeting turn creates meeting memory candidates", `total=${textTurn.body?.memoryRail?.total ?? 0}`);
  pushNoForbiddenPayload(JSON.stringify(textTurn.body), "text turn response has no raw provider/audio payload");

  const voiceTurn = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/turns`,
    {
      role: "USER",
      source: "VOICE_FINAL_TRANSCRIPT",
      modality: "VOICE_REALTIME",
      content: "語音轉寫確認：教育金目標要等太太提供預算後再估算。",
      transcriptFinal: true,
      outlineSegmentId: "capture",
      issueTags: ["education-fund"],
    },
    demoEmail,
  );
  push(voiceTurn.status === 201 && typeof voiceTurn.body?.turn?.id === "string", "member appends final voice transcript turn", `status=${voiceTurn.status}`);
  push(
    voiceTurn.body?.turn?.modality === "VOICE_TRANSCRIPT_FALLBACK",
    "voice final transcript is persisted as fallback transcript, not raw audio",
    `modality=${voiceTurn.body?.turn?.modality ?? "missing"}`,
  );

  const beforeBlockedTurnCount = await countMeetingTurns(sessionId);
  const rawPayload = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/turns`,
    {
      role: "USER",
      source: "VOICE_FINAL_TRANSCRIPT",
      content: "raw provider payload authorization bearer token should be blocked",
      transcriptFinal: true,
      audioBase64: "AAAA",
    },
    demoEmail,
  );
  const afterBlockedTurnCount = await countMeetingTurns(sessionId);
  push(rawPayload.status === 409, "raw audio/provider-like meeting payload is blocked", `status=${rawPayload.status}`);
  push(
    beforeBlockedTurnCount === afterBlockedTurnCount,
    "blocked meeting payload creates no turn rows",
    `before=${beforeBlockedTurnCount} after=${afterBlockedTurnCount}`,
  );

  const snapshot = await getJson(`/api/ai/meeting/sessions/${sessionId}`, demoEmail);
  push(snapshot.status === 200, "owner reads meeting snapshot after stateless API roundtrip", `status=${snapshot.status}`);
  push(snapshot.body?.turns?.length >= 2, "snapshot readback returns persisted meeting turns", `turns=${snapshot.body?.turns?.length ?? 0}`);
  push(snapshot.body?.memories?.length >= 1, "snapshot readback returns persisted meeting memories", `memories=${snapshot.body?.memories?.length ?? 0}`);
  push(
    snapshot.body?.safety?.providerCallAttempted === false &&
      snapshot.body?.safety?.aiUsageLogRequired === false &&
      snapshot.body?.safety?.rawAudioStored === false,
    "snapshot declares no-provider/no-raw-audio safety posture",
  );
  pushNoForbiddenPayload(JSON.stringify(snapshot.body), "snapshot response has no raw provider/audio payload");

  const managerSnapshot = await getJson(`/api/ai/meeting/sessions/${sessionId}`, managerEmail);
  push(managerSnapshot.status === 404, "manager cannot read member-private meeting snapshot", `status=${managerSnapshot.status}`);

  const dbProof = await getDbProof(sessionId, client.id, visitPlanId);
  push(dbProof.sessionCount === 1, "DB proof has one owner-scoped CLIENT_MEETING session", JSON.stringify(dbProof));
  push(dbProof.visitPlanMetadataCount === 1, "DB proof records visitPlanId in meeting metadata", JSON.stringify(dbProof));
  push(dbProof.turnCount >= 2, "DB proof stores meeting turns", JSON.stringify(dbProof));
  push(dbProof.memoryCount >= 1, "DB proof stores CLIENT_MEETING memories", JSON.stringify(dbProof));
  push(dbProof.rawPayloadMarkerCount === 0, "DB proof stores no raw audio/provider payload markers", JSON.stringify(dbProof));

  const afterUsageCount = await countAiUsageLogs();
  push(afterUsageCount === beforeUsageCount, "no-provider proof: AiUsageLog count unchanged", `before=${beforeUsageCount} after=${afterUsageCount}`);
}

async function createClient(name, email) {
  const response = await postJson(
    "/api/clients",
    {
      name,
      email,
      phone: "0912-345-678",
      birthDate: "1988-08-08",
      occupation: "AMM-002 QA",
      annualIncome: 1200000,
      status: "PROSPECT",
    },
    demoEmail,
  );

  push(response.status === 201 && typeof response.body?.client?.id === "string", "member creates QA client", `status=${response.status}`);
  return response.body?.client;
}

async function createVisitPlan(clientId, unique) {
  const response = await postJson(
    "/api/visits",
    {
      clientId,
      purpose: "FIRST_VISIT",
      visitTime: `2026-07-01T10:${String(Number(unique.slice(-2)) % 60).padStart(2, "0")}:00.000Z`,
    },
    demoEmail,
  );

  push(response.status === 201, "member creates QA visit plan", `status=${response.status}`);
  return response.body;
}

async function getDbProof(sessionId, clientId, visitPlanId) {
  const result = await db.query(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM interview_sessions
          WHERE id = $1
            AND client_id = $2
            AND interview_kind::text = 'CLIENT_MEETING'
            AND owner_id IS NOT NULL
        ) AS session_count,
        (
          SELECT COUNT(*)::int
          FROM interview_sessions
          WHERE id = $1
            AND metadata->>'source' = 'meeting_capture_bff'
            AND metadata->>'visitPlanId' = $3
            AND metadata->>'rawAudioStored' = 'false'
        ) AS visit_plan_metadata_count,
        (
          SELECT COUNT(*)::int
          FROM interview_turns
          WHERE session_id = $1
            AND transcript_final = true
            AND provider_event_id IS NULL
        ) AS turn_count,
        (
          SELECT COUNT(*)::int
          FROM interview_memories
          WHERE session_id = $1
            AND client_id = $2
            AND interview_kind::text = 'CLIENT_MEETING'
        ) AS memory_count,
        (
          SELECT COUNT(*)::int
          FROM interview_turns
          WHERE session_id = $1
            AND (
              content ILIKE '%audioBase64%' OR
              content ILIKE '%provider payload%' OR
              content ILIKE '%authorization bearer%' OR
              content ILIKE '%raw audio%'
            )
        ) AS raw_payload_marker_count
    `,
    [sessionId || "missing", clientId || "missing", visitPlanId || "missing"],
  );
  const row = result.rows[0] ?? {};

  return {
    sessionCount: Number(row.session_count ?? 0),
    visitPlanMetadataCount: Number(row.visit_plan_metadata_count ?? 0),
    turnCount: Number(row.turn_count ?? 0),
    memoryCount: Number(row.memory_count ?? 0),
    rawPayloadMarkerCount: Number(row.raw_payload_marker_count ?? 0),
  };
}

async function countMeetingTurns(sessionId) {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM interview_turns WHERE session_id = $1", [sessionId || "missing"]);
  return Number(result.rows[0]?.count ?? 0);
}

async function countAiUsageLogs() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs");
  return Number(result.rows[0]?.count ?? 0);
}

async function postJson(path, body, userEmail) {
  return requestJson(path, {
    method: "POST",
    body,
    userEmail,
  });
}

async function getJson(path, userEmail) {
  return requestJson(path, {
    method: "GET",
    userEmail,
  });
}

async function requestJson(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...(options.userEmail ? { "x-asai-demo-user-email": options.userEmail } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }

  return {
    status: response.status,
    body,
    text,
  };
}

function pushNoForbiddenPayload(text, label) {
  const forbiddenPayloadPatterns = [
    /audioBase64/i,
    /"providerPayload"\s*:/i,
    /"rawProviderPayload"\s*:/i,
    /authorization\s*[:=]?\s*bearer/i,
    /"cookie"\s*:/i,
    /"secret"\s*:/i,
    /"otp"\s*:/i,
    /"payment"\s*:/i,
  ];

  push(
    !forbiddenPayloadPatterns.some((pattern) => pattern.test(text)),
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
