#!/usr/bin/env node
// RES-022 TAU-004 — three-AI per-turn usage QA.
// Drives one turn through each of 問誠問 AI (chat), AI 顧問陪談 (interview) and
// AI 劇場演練 (theater + score) as a demo member, then verifies that every new
// AiUsageLog row carries trace linkage and that a platform user can read the
// per-turn usage view. Requires a dev server with ALLOW_DEV_AUTH_HEADER=true.
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoPlatformEmail = process.env.DEMO_PLATFORM_QA_EMAIL ?? "demo.platform@asai.local";
const demoClientId = process.env.DEMO_QA_CLIENT_ID ?? "c_wang";
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
  await ensurePlatformUser(org.id);
  const theaterSessionId = await getSeededTheaterSessionId(org.id);

  const before = await countByModule(org.id);

  // --- 問誠問 AI (chat) ---------------------------------------------------
  const conversationKey = `qa-turn-usage-conv-${Date.now()}`;
  const chat = await postStream(
    "/api/ai/chat",
    {
      messages: [{ role: "user", content: "請用一句話帶我了解客戶管理頁面。" }],
      context: { route: "/dashboard", conversationId: conversationKey },
    },
    demoMemberEmail,
  );
  check(chat.status === 200, "chat turn succeeds for demo member", `status=${chat.status}`);
  check(
    Boolean(chat.headers.get("x-assistant-conversation-id")),
    "chat returns X-Assistant-Conversation-Id header",
  );

  // --- AI 顧問陪談 (interview) --------------------------------------------
  const sessionRes = await postJson(
    "/api/ai/interview/sessions",
    {
      clientId: demoClientId,
      interviewKind: "ADVISOR_COMPANION",
      outlineId: "advisor-companion-v1",
      currentSegmentId: "focus-client",
      title: `TAU-004 turn usage ${new Date().toISOString()}`,
    },
    demoMemberEmail,
  );
  check(sessionRes.status === 201, "interview DB session created", `status=${sessionRes.status}`);
  const interviewSessionId = sessionRes.body?.session?.id;
  check(typeof interviewSessionId === "string", "interview session returns DB id");

  const interview = await postStream(
    "/api/ai/interview",
    {
      clientId: demoClientId,
      sessionId: interviewSessionId,
      currentSegmentId: "focus-client",
      messages: [{ role: "user", content: "這位客戶最近最在意的是孩子的教育金。" }],
      knownMaterials: [],
    },
    demoMemberEmail,
  );
  check(interview.status === 200, "interview turn succeeds for demo member", `status=${interview.status}`);

  // --- AI 劇場演練 (theater + score) --------------------------------------
  const theaterHistory = [{ role: "agent", content: "您好，想跟您聊聊家庭的保障規劃。" }];
  const theater = await postStream(
    "/api/ai/theater",
    {
      sessionId: theaterSessionId ?? "local-demo-theater",
      clientId: demoClientId,
      personaType: "SKEPTICAL",
      difficulty: "MEDIUM",
      tension: 30,
      history: theaterHistory,
    },
    demoMemberEmail,
  );
  check(theater.status === 200, "theater turn succeeds for demo member", `status=${theater.status}`);

  const score = await postJson(
    "/api/ai/theater/score",
    {
      sessionId: theaterSessionId ?? "local-demo-theater",
      clientId: demoClientId,
      personaType: "SKEPTICAL",
      history: [...theaterHistory, { role: "client", content: "保險不是都很貴又用不到嗎？" }],
    },
    demoMemberEmail,
  );
  check(score.status === 200, "theater score succeeds for demo member", `status=${score.status}`);

  // --- Usage log increments ----------------------------------------------
  const after = await countByModule(org.id);
  check(after.CHAT >= before.CHAT + 1, "CHAT AiUsageLog increased", `${before.CHAT}->${after.CHAT}`);
  check(
    after.INTERVIEW >= before.INTERVIEW + 1,
    "INTERVIEW AiUsageLog increased",
    `${before.INTERVIEW}->${after.INTERVIEW}`,
  );
  check(
    after.THEATER >= before.THEATER + 2,
    "THEATER AiUsageLog increased for character + score",
    `${before.THEATER}->${after.THEATER}`,
  );

  // --- Trace presence on the rows just written ---------------------------
  const traced = await db.query(
    `SELECT module::text AS module, trace_source,
            assistant_conversation_id, assistant_message_id,
            interview_session_id, interview_turn_id,
            theater_session_id, interaction_event_id
       FROM ai_usage_logs
      WHERE organization_id = $1 AND error IS NULL
        AND created_at >= now() - interval '10 minutes'
      ORDER BY created_at DESC
      LIMIT 12`,
    [org.id],
  );

  const chatRow = traced.rows.find((row) => row.module === "CHAT");
  check(
    Boolean(chatRow?.trace_source === "assistant" && chatRow.assistant_conversation_id && chatRow.assistant_message_id),
    "CHAT usage row traces to conversation + message",
    chatRow ? `source=${chatRow.trace_source}` : "no chat row",
  );

  const interviewRow = traced.rows.find((row) => row.module === "INTERVIEW");
  check(
    Boolean(interviewRow?.trace_source === "interview" && interviewRow.interview_session_id && interviewRow.interview_turn_id),
    "INTERVIEW usage row traces to session + turn",
    interviewRow ? `session=${interviewRow.interview_session_id ?? "null"}` : "no interview row",
  );
  check(
    interviewRow?.interview_session_id === interviewSessionId,
    "INTERVIEW usage row links the DB session created above",
  );

  const theaterRows = traced.rows.filter((row) => row.module === "THEATER");
  check(
    theaterRows.length >= 2 && theaterRows.every((row) => Boolean(row.trace_source && row.interaction_event_id)),
    "THEATER usage rows carry trace source + interaction event id",
    `theaterRows=${theaterRows.length}`,
  );
  if (theaterSessionId) {
    check(
      theaterRows.some((row) => row.theater_session_id === theaterSessionId),
      "THEATER usage row links seeded DB theater session",
    );
  }

  // --- Platform turn usage view ------------------------------------------
  const memberDenied = await getJson("/api/platform/ai-usage/turns", demoMemberEmail);
  check(memberDenied.status === 403, "member app session cannot read platform turn usage", `status=${memberDenied.status}`);

  const turns = await getJson("/api/platform/ai-usage/turns?limit=50", demoPlatformEmail);
  check(turns.status === 200, "platform user reads turn usage view", `status=${turns.status}`);
  check(Array.isArray(turns.body?.turns), "turn usage returns turns array");
  check(Boolean(turns.body?.counts), "turn usage returns counts summary");

  const turnList = turns.body?.turns ?? [];
  const hasModules = ["CHAT", "INTERVIEW", "THEATER"].every((module) =>
    turnList.some((turn) => turn.module === module),
  );
  check(hasModules, "turn usage view shows all three AI modules this month");
  check(
    turnList.every((turn) => "trace" in turn && turn.trace && "source" in turn.trace),
    "every turn row exposes a trace object",
  );
  check(
    turnList.every((turn) => turn.client === null || turn.client?.name === null),
    "turn usage redacts client name (id only)",
  );
  check(
    turnList.some((turn) => turn.requestId) || turnList.length === 0,
    "turn usage exposes requestId for cost auditing",
  );

  // Privacy: the turn view should never carry conversation content / transcripts.
  const bodyText = JSON.stringify(turns.body);
  const contentLeaks = ['"messages"', '"history"', '"assistantContent"', '"transcript"', '"content"'].filter((field) =>
    bodyText.includes(field),
  );
  check(contentLeaks.length === 0, "turn usage view omits raw conversation content", contentLeaks.join(", "));

  printChecks();
  if (checks.some((item) => item.status === "fail")) {
    process.exitCode = 1;
  }
} finally {
  await db.end();
}

async function postStream(path, body, email) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-asai-demo-user-email": email },
    body: JSON.stringify(body),
  });
  // Drain the response so the server-side persist (which runs after the stream
  // closes) completes before we count usage rows.
  const text = await response.text();
  return { status: response.status, headers: response.headers, text };
}

async function postJson(path, body, email) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-asai-demo-user-email": email },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function getJson(path, email) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: { "content-type": "application/json", "x-asai-demo-user-email": email },
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, body, text };
}

async function countByModule(organizationId) {
  const { rows } = await db.query(
    `SELECT module::text AS module, count(*)::int AS total
       FROM ai_usage_logs
      WHERE organization_id = $1 AND module IN ('CHAT', 'INTERVIEW', 'THEATER')
      GROUP BY module`,
    [organizationId],
  );
  const result = { CHAT: 0, INTERVIEW: 0, THEATER: 0 };
  for (const row of rows) {
    if (row.module in result) {
      result[row.module] = row.total;
    }
  }
  return result;
}

async function getSeededTheaterSessionId(organizationId) {
  const { rows } = await db.query(
    `SELECT id FROM theater_sessions WHERE organization_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [organizationId],
  );
  return rows[0]?.id ?? null;
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
       'demo_user_platform', $1, 'Demo Platform Admin', 'ACTIVE'::"UserStatus", true, 'user:platform', 'quickstart-insurance-advisor', 1, now(), now()
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
       'demo_membership_platform', $1, $2,
       (SELECT id FROM organization_units WHERE organization_id = $1 AND type = 'HEADQUARTERS' AND is_active = true LIMIT 1),
       'OWNER'::"MemberRole", 'ACTIVE'::"MembershipStatus", 'Demo platform access anchor', false, now(), now()
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
       'demo_platform_user_super_admin', $1, 'SUPER_ADMIN'::"PlatformRole", true, false,
       '{"source":"three-ai-turn-usage-qa"}'::jsonb, now(), now()
     )
     ON CONFLICT (user_id, role) DO UPDATE SET
       is_active = true,
       require_mfa = false,
       updated_at = now()`,
    [userId],
  );
}

function check(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function printChecks() {
  for (const item of checks) {
    const prefix = item.status === "pass" ? "PASS" : "FAIL";
    console.log(`${prefix} ${item.label}${item.detail ? ` — ${item.detail}` : ""}`);
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
