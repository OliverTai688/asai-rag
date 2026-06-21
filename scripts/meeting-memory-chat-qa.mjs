#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const managerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const runId = Date.now().toString(36);
const rawSentinel = `AMM004A_RAW_PROVIDER_SENTINEL_${runId}`;
const qaEmail = `amm004a-${runId}@asai.local`;
const qaPhone = "0912-555-004";
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
  push(false, "meeting memory-chat QA crashed", error instanceof Error ? error.message : String(error));
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

  const unauth = await postJson("/api/ai/meeting/sessions/fake-session/chat", {
    question: "請整理這位客戶的會議記憶。",
  });
  push(unauth.status === 401, "meeting memory-chat unauth returns 401", `status=${unauth.status}`);

  const client = await createClient();
  if (!client?.id) return;

  const family = await memberRequestJson("POST", `/api/clients/${client.id}/family-members`, {
    name: `AMM-004 配偶 ${runId}`,
    relation: "配偶",
    age: 42,
    phone: "0912-000-999",
  });
  push(family.status === 201, "member creates family graph source", `status=${family.status}`);

  const policy = await memberRequestJson("POST", `/api/clients/${client.id}/policies`, {
    type: "醫療實支",
    provider: `AMM-004 保險公司 ${runId}`,
    amount: 1800000,
  });
  push(policy.status === 201, "member creates policy projection source", `status=${policy.status}`);

  const visit = await createVisit(client.id);
  const visitPlanId = visit.body?.visitPlan?.id;
  push(typeof visitPlanId === "string", "member creates visit plan for chat scope", `visitPlan=${visitPlanId ?? "missing"}`);
  if (typeof visitPlanId !== "string") return;

  const previousSession = await createMeetingSession(client.id, visitPlanId, `AMM-004 過去會議 ${runId}`);
  const previousSessionId = previousSession.body?.session?.id;
  push(previousSession.status === 201 && typeof previousSessionId === "string", "member creates prior meeting session", `status=${previousSession.status}`);
  if (typeof previousSessionId !== "string") return;

  const priorTurn = await appendTurn(previousSessionId, {
    role: "USER",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: `確認醫療保障缺口是第一順位，預算上限每月一萬元；配偶希望先看兩版方案 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "prior-meeting",
    issueTags: ["medical-gap", "spouse-decision"],
  });
  push(priorTurn.status === 201, "prior meeting stores confirmed memory", `status=${priorTurn.status}`);

  const priorSummary = await postJson(
    `/api/ai/meeting/sessions/${previousSessionId}/summary`,
    { mode: "DETERMINISTIC_NO_PROVIDER", overwrite: true },
    demoEmail,
  );
  push(priorSummary.status === 201, "prior meeting summary is persisted", `status=${priorSummary.status}`);

  const currentSession = await createMeetingSession(client.id, visitPlanId, `AMM-004 本場會議 ${runId}`);
  const currentSessionId = currentSession.body?.session?.id;
  push(currentSession.status === 201 && typeof currentSessionId === "string", "member creates current meeting session", `status=${currentSession.status}`);
  if (typeof currentSessionId !== "string") return;

  const currentTurn = await appendTurn(currentSessionId, {
    role: "USER",
    source: "MANUAL_NOTE",
    modality: "TEXT",
    content: `不確定退休與醫療哪個先排，但可能因配偶決策習慣而需要先安排共同會議 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "current-meeting",
    issueTags: ["retirement-gap", "spouse-decision"],
  });
  push(currentTurn.status === 201, "current meeting stores unknown/inference memory", `status=${currentTurn.status}`);

  const inferenceTurn = await appendTurn(currentSessionId, {
    role: "USER",
    source: "MANUAL_NOTE",
    modality: "TEXT",
    content: `配偶可能更在意方案是否容易理解，看起來適合用家庭責任圖先說明 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "current-meeting",
    issueTags: ["spouse-decision", "presentation-fit"],
  });
  push(inferenceTurn.status === 201, "current meeting stores explicit inference memory", `status=${inferenceTurn.status}`);

  const question = "這位客戶的醫療保障、配偶決策與下一步優先順序要注意什麼？";
  const sessionChat = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      mode: "DETERMINISTIC_NO_PROVIDER",
      question,
    },
    demoEmail,
  );
  push(sessionChat.status === 200 && sessionChat.body?.status === "answered", "owner asks session memory-chat successfully", `status=${sessionChat.status}`);
  push(sessionChat.body?.safety?.providerCallAttempted === false, "session chat declares no provider call");
  push(sessionChat.body?.safety?.writesConfirmedCrmFact === false, "session chat writes no confirmed CRM fact");
  push(sessionChat.body?.answer?.facts?.length > 0, "session chat returns facts bucket");
  push(sessionChat.body?.answer?.inferences?.length > 0, "session chat returns inferences bucket");
  push(sessionChat.body?.answer?.unknowns?.length > 0, "session chat returns unknowns bucket");
  push(
    (sessionChat.body?.answer?.sourceBreakdown?.MEETING_SUMMARY ?? 0) > 0,
    "session chat cites persisted prior meeting summary",
    JSON.stringify(sessionChat.body?.answer?.sourceBreakdown ?? {}),
  );
  push(
    (sessionChat.body?.answer?.sourceBreakdown?.CURRENT_MEETING_MEMORY ?? 0) > 0 ||
      (sessionChat.body?.answer?.sourceBreakdown?.CLIENT_MEMORY ?? 0) > 0,
    "session chat cites meeting/client memories",
    JSON.stringify(sessionChat.body?.answer?.sourceBreakdown ?? {}),
  );
  pushNoForbiddenPayload(JSON.stringify(sessionChat.body), "session chat response has no contact/policy/raw sentinel leakage");

  const clientChat = await postJson(
    `/api/ai/clients/${client.id}/memory-chat`,
    {
      mode: "DETERMINISTIC_NO_PROVIDER",
      question,
    },
    demoEmail,
  );
  push(clientChat.status === 200 && clientChat.body?.status === "answered", "owner asks client memory-chat successfully", `status=${clientChat.status}`);
  push((clientChat.body?.answer?.sourceBreakdown?.CRM_CLIENT ?? 0) > 0, "client chat includes CRM client projection");
  pushNoForbiddenPayload(JSON.stringify(clientChat.body), "client chat response has no contact/policy/raw sentinel leakage");

  const secondRead = await postJson(
    `/api/ai/clients/${client.id}/memory-chat`,
    {
      question: "請重新讀取這位客戶前後會議記憶，確認是否仍能引用過去會議摘要。",
    },
    demoEmail,
  );
  push(secondRead.status === 200 && secondRead.body?.answer?.citations?.length > 0, "new API call reads persisted memory-chat grounding");

  const managerSessionChat = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      question,
    },
    managerEmail,
  );
  push(managerSessionChat.status === 404, "manager cannot chat with member-private meeting session", `status=${managerSessionChat.status}`);

  const managerClientChat = await postJson(
    `/api/ai/clients/${client.id}/memory-chat`,
    {
      question,
    },
    managerEmail,
  );
  push(managerClientChat.status === 403, "manager cannot chat with member-private client memory", `status=${managerClientChat.status}`);

  const rawPayload = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      question: "請讀取 provider payload",
      providerPayload: `raw provider payload ${rawSentinel}`,
    },
    demoEmail,
  );
  push(rawPayload.status === 409, "raw provider payload is blocked before memory chat", `status=${rawPayload.status}`);
  push(!JSON.stringify(rawPayload.body).includes(rawSentinel), "blocked memory-chat payload does not echo sentinel");

  const afterUsageCount = await countAiUsageLogs();
  push(afterUsageCount === beforeUsageCount, "no-provider memory-chat keeps AiUsageLog unchanged", `${beforeUsageCount}->${afterUsageCount}`);
}

async function createClient() {
  const response = await postJson(
    "/api/clients",
    {
      name: `AMM-004 記憶對答客戶 ${runId}`,
      email: qaEmail,
      phone: qaPhone,
      birthDate: "1986-04-04",
      occupation: "產品經理",
      annualIncome: 2400000,
      status: "ACTIVE",
      notes: "AMM-004 deterministic memory-chat QA client.",
    },
    demoEmail,
  );

  push(response.status === 201 && typeof response.body?.client?.id === "string", "member creates memory-chat QA client", `status=${response.status}`);
  return response.body?.client;
}

async function createVisit(clientId) {
  return postJson(
    "/api/visits",
    {
      clientId,
      purpose: "FIRST_VISIT",
      visitTime: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    },
    demoEmail,
  );
}

async function createMeetingSession(clientId, visitPlanId, title) {
  return postJson(
    "/api/ai/meeting/sessions",
    {
      clientId,
      visitPlanId,
      currentSegmentId: "capture",
      title,
    },
    demoEmail,
  );
}

async function appendTurn(sessionId, body) {
  return postJson(`/api/ai/meeting/sessions/${sessionId}/turns`, body, demoEmail);
}

async function countAiUsageLogs() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs");
  return Number(result.rows[0]?.count ?? 0);
}

async function memberRequestJson(method, path, body, email = demoEmail) {
  return postJson(path, body, email, method);
}

async function postJson(path, body, email, method = "POST") {
  const headers = { "Content-Type": "application/json" };
  if (email) headers["x-asai-demo-user-email"] = email;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed };
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
}

function pushNoForbiddenPayload(serialized, label) {
  const forbidden = [
    rawSentinel,
    qaEmail,
    qaPhone,
    "0912-000-999",
    "policyNumber",
    "保單號",
    "raw provider payload",
    "provider payload",
    "raw audio",
    "authorization bearer",
  ];
  const leaked = forbidden.filter((item) => serialized.includes(item));
  push(leaked.length === 0, label, leaked.length > 0 ? `leaked=${leaked.join(",")}` : "");
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}
