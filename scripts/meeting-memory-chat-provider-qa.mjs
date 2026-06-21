#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const managerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const runId = Date.now().toString(36);
const rawSentinel = `AMM004B_RAW_PROVIDER_SENTINEL_${runId}`;
const qaEmail = `amm004b-${runId}@asai.local`;
const qaPhone = "0912-555-404";
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY for live provider meeting memory-chat QA.");
  process.exit(1);
}

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runProviderMemoryChatProof();
} catch (error) {
  push(false, "provider meeting memory-chat QA crashed", error instanceof Error ? error.message : String(error));
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

async function runProviderMemoryChatProof() {
  const beforeUsage = await countMeetingAiUsageLogs();

  const unauth = await postJson("/api/ai/meeting/sessions/fake-session/chat", {
    mode: "PROVIDER_JSON",
    question: "請整理這位客戶的跨會議記憶。",
  });
  push(unauth.status === 401, "provider memory-chat unauth returns 401", `status=${unauth.status}`);

  const client = await createClient();
  if (!client?.id) return;

  const family = await memberRequestJson("POST", `/api/clients/${client.id}/family-members`, {
    name: `AMM-004b 配偶 ${runId}`,
    relation: "配偶",
    age: 41,
    phone: "0912-000-404",
  });
  push(family.status === 201, "member creates provider memory family source", `status=${family.status}`);

  const policy = await memberRequestJson("POST", `/api/clients/${client.id}/policies`, {
    type: "醫療實支",
    provider: `AMM-004b 保險公司 ${runId}`,
    amount: 1800000,
  });
  push(policy.status === 201, "member creates provider memory policy projection", `status=${policy.status}`);

  const visit = await createVisit(client.id);
  const visitPlanId = visit.body?.visitPlan?.id;
  push(typeof visitPlanId === "string", "member creates visit plan for provider memory scope", `visitPlan=${visitPlanId ?? "missing"}`);
  if (typeof visitPlanId !== "string") return;

  const previousSession = await createMeetingSession(client.id, visitPlanId, `AMM-004b 過去會議 ${runId}`);
  const previousSessionId = previousSession.body?.session?.id;
  push(previousSession.status === 201 && typeof previousSessionId === "string", "member creates prior provider memory session", `status=${previousSession.status}`);
  if (typeof previousSessionId !== "string") return;

  const priorTurn = await appendTurn(previousSessionId, {
    role: "USER",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: `已確認醫療保障缺口是第一順位，預算上限每月一萬元；配偶希望先看兩版方案 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "prior-meeting",
    issueTags: ["medical-gap", "spouse-decision"],
  });
  push(priorTurn.status === 201, "prior meeting stores provider memory fact", `status=${priorTurn.status}`);

  const priorSummary = await postJson(
    `/api/ai/meeting/sessions/${previousSessionId}/summary`,
    { mode: "DETERMINISTIC_NO_PROVIDER", overwrite: true },
    demoEmail,
  );
  push(priorSummary.status === 201, "prior deterministic summary is persisted for provider memory grounding", `status=${priorSummary.status}`);

  const currentSession = await createMeetingSession(client.id, visitPlanId, `AMM-004b 本場會議 ${runId}`);
  const currentSessionId = currentSession.body?.session?.id;
  push(currentSession.status === 201 && typeof currentSessionId === "string", "member creates current provider memory session", `status=${currentSession.status}`);
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
  push(currentTurn.status === 201, "current meeting stores provider memory unknown", `status=${currentTurn.status}`);

  const inferenceTurn = await appendTurn(currentSessionId, {
    role: "USER",
    source: "MANUAL_NOTE",
    modality: "TEXT",
    content: `配偶可能更在意方案是否容易理解，看起來適合用家庭責任圖先說明 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "current-meeting",
    issueTags: ["spouse-decision", "presentation-fit"],
  });
  push(inferenceTurn.status === 201, "current meeting stores provider memory inference", `status=${inferenceTurn.status}`);

  const question = "請依據目前與過去會議，整理醫療保障、配偶決策與下一步優先順序。";

  const rawPayload = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question: "請讀取 provider payload",
      providerPayload: `raw provider payload ${rawSentinel}`,
    },
    demoEmail,
  );
  push(rawPayload.status === 409 && rawPayload.body?.error === "MEETING_MEMORY_CHAT_PAYLOAD_BLOCKED", "raw provider-like memory-chat payload is blocked", `status=${rawPayload.status}`);
  push(!JSON.stringify(rawPayload.body).includes(rawSentinel), "blocked provider memory-chat payload does not echo sentinel");

  const providerDisabled = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-provider-disabled": "true" },
  );
  push(providerDisabled.status === 503 && providerDisabled.body?.error === "MEETING_MEMORY_CHAT_PROVIDER_DISABLED", "provider disabled guard returns 503 before memory-chat provider", `status=${providerDisabled.status}`);
  push(providerDisabled.body?.safety?.providerCallAttempted === false, "provider disabled guard declares provider not attempted");

  const quota = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-quota-exceeded": "true" },
  );
  push(quota.status === 429 && quota.body?.error === "QUOTA_EXCEEDED", "provider memory-chat quota guard blocks before provider", `status=${quota.status}`);
  push(quota.body?.safety?.quotaBlocked === true && quota.body?.safety?.providerCallAttempted === false, "quota guard declares no provider call and no fake usage log");

  const afterGuards = await countMeetingAiUsageLogs();
  push(afterGuards.total === beforeUsage.total, "401/409/429/503 guards write no fake MEETING AiUsageLog", `before=${beforeUsage.total} after=${afterGuards.total}`);

  const providerError = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-provider-error": "true" },
  );
  push(providerError.status === 502 && providerError.body?.error === "MEETING_MEMORY_CHAT_PROVIDER_FAILED", "provider memory-chat error path returns sanitized 502", `status=${providerError.status}`);
  pushNoForbiddenPayload(JSON.stringify(providerError.body), "provider memory-chat error omits raw provider/private payload");

  const afterError = await countMeetingAiUsageLogs();
  push(afterError.error >= afterGuards.error + 1, "provider memory-chat error writes MEETING AiUsageLog", `${afterGuards.error}->${afterError.error}`);

  const sessionChat = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question,
    },
    demoEmail,
  );
  push(sessionChat.status === 200 && sessionChat.body?.status === "answered", "provider session memory-chat succeeds", `status=${sessionChat.status}`);
  push(sessionChat.body?.provider === "OPENAI" && typeof sessionChat.body?.model === "string", "provider session memory-chat records provider/model");
  push(typeof sessionChat.body?.usageLogId === "string", "provider session memory-chat returns usageLogId");
  push(
    sessionChat.body?.safety?.providerCallAttempted === true &&
      sessionChat.body?.safety?.aiUsageLogRequired === true &&
      sessionChat.body?.safety?.aiUsageLogWritten === true &&
      sessionChat.body?.safety?.writesConfirmedCrmFact === false,
    "provider session memory-chat safety declares provider usage and no CRM fact write",
  );
  push(providerAnswerHasCitations(sessionChat.body?.answer), "provider session memory-chat keeps cited facts/inferences/unknowns");
  push((sessionChat.body?.answer?.sourceBreakdown?.MEETING_SUMMARY ?? 0) > 0, "provider session memory-chat cites prior meeting summary", JSON.stringify(sessionChat.body?.answer?.sourceBreakdown ?? {}));
  pushNoForbiddenPayload(JSON.stringify(sessionChat.body), "provider session memory-chat response has no contact/policy/raw provider leakage");

  const clientChat = await postJson(
    `/api/ai/clients/${client.id}/memory-chat`,
    {
      mode: "PROVIDER_JSON",
      question,
    },
    demoEmail,
  );
  push(clientChat.status === 200 && clientChat.body?.status === "answered", "provider client memory-chat succeeds", `status=${clientChat.status}`);
  push(clientChat.body?.provider === "OPENAI" && typeof clientChat.body?.usageLogId === "string", "provider client memory-chat returns provider usageLogId");
  push((clientChat.body?.answer?.sourceBreakdown?.CRM_CLIENT ?? 0) > 0, "provider client memory-chat includes CRM projection");
  pushNoForbiddenPayload(JSON.stringify(clientChat.body), "provider client memory-chat response has no contact/policy/raw provider leakage");

  const afterSuccess = await countMeetingAiUsageLogs();
  push(afterSuccess.success >= afterError.success + 2, "session and client provider memory-chat successes write AiUsageLog", `${afterError.success}->${afterSuccess.success}`);

  const dbProof = await getUsageLogProof(sessionChat.body?.usageLogId, clientChat.body?.usageLogId, currentSessionId, client.id);
  push(dbProof.total === 2, "DB proof finds both provider memory-chat usage logs", JSON.stringify(dbProof));
  push(dbProof.openAiMeetingSuccess === 2, "DB proof records OPENAI/MEETING successful provider logs", JSON.stringify(dbProof));
  push(dbProof.sessionTraceCount >= 1, "DB proof links session memory-chat usage to interview session", JSON.stringify(dbProof));
  push(dbProof.clientScopeCount === 2, "DB proof links provider memory-chat usage to client scope", JSON.stringify(dbProof));

  const managerSessionChat = await postJson(
    `/api/ai/meeting/sessions/${currentSessionId}/chat`,
    {
      mode: "PROVIDER_JSON",
      question,
    },
    managerEmail,
  );
  push(managerSessionChat.status === 404, "manager cannot run provider chat on member-private meeting", `status=${managerSessionChat.status}`);

  const managerClientChat = await postJson(
    `/api/ai/clients/${client.id}/memory-chat`,
    {
      mode: "PROVIDER_JSON",
      question,
    },
    managerEmail,
  );
  push(managerClientChat.status === 403, "manager cannot run provider client memory-chat on member-private client", `status=${managerClientChat.status}`);

  const afterManager = await countMeetingAiUsageLogs();
  push(afterManager.total === afterSuccess.total, "manager-private denials write no provider AiUsageLog", `${afterSuccess.total}->${afterManager.total}`);
}

async function createClient() {
  const response = await postJson(
    "/api/clients",
    {
      name: `AMM-004b Provider 記憶客戶 ${runId}`,
      email: qaEmail,
      phone: qaPhone,
      birthDate: "1986-04-04",
      occupation: "產品經理",
      annualIncome: 2400000,
      status: "ACTIVE",
      notes: "AMM-004b provider memory-chat QA client.",
    },
    demoEmail,
  );

  push(response.status === 201 && typeof response.body?.client?.id === "string", "member creates provider memory-chat QA client", `status=${response.status}`);
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

async function memberRequestJson(method, path, body, email = demoEmail) {
  return postJson(path, body, email, method);
}

async function countMeetingAiUsageLogs() {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE error IS NULL)::int AS success,
       COUNT(*) FILTER (WHERE error IS NOT NULL)::int AS error
     FROM ai_usage_logs
     WHERE module = 'MEETING'
       AND provider = 'OPENAI'`,
  );
  const row = result.rows[0] ?? {};

  return {
    total: Number(row.total ?? 0),
    success: Number(row.success ?? 0),
    error: Number(row.error ?? 0),
  };
}

async function getUsageLogProof(sessionUsageLogId, clientUsageLogId, sessionId, clientId) {
  const result = await db.query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE provider = 'OPENAI'
            AND module = 'MEETING'
            AND error IS NULL
            AND model IS NOT NULL
        )::int AS open_ai_meeting_success,
        COUNT(*) FILTER (
          WHERE trace_source = 'interview'
            AND interview_session_id = $3
        )::int AS session_trace_count,
        COUNT(*) FILTER (
          WHERE client_id = $4
        )::int AS client_scope_count
      FROM ai_usage_logs
      WHERE id = ANY($1::text[])
        OR id = ANY($2::text[])
    `,
    [[sessionUsageLogId].filter(Boolean), [clientUsageLogId].filter(Boolean), sessionId || "missing", clientId || "missing"],
  );
  const row = result.rows[0] ?? {};

  return {
    total: Number(row.total ?? 0),
    openAiMeetingSuccess: Number(row.open_ai_meeting_success ?? 0),
    sessionTraceCount: Number(row.session_trace_count ?? 0),
    clientScopeCount: Number(row.client_scope_count ?? 0),
  };
}

async function postJson(path, body, userEmail, extraHeadersOrMethod = {}, maybeHeaders = {}) {
  const method = typeof extraHeadersOrMethod === "string" ? extraHeadersOrMethod : "POST";
  const extraHeaders = typeof extraHeadersOrMethod === "string" ? maybeHeaders : extraHeadersOrMethod;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userEmail ? { "x-asai-demo-user-email": userEmail } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await response.text();
  let parsedBody;

  try {
    parsedBody = JSON.parse(text);
  } catch {
    parsedBody = undefined;
  }

  return {
    status: response.status,
    body: parsedBody,
    text,
  };
}

function providerAnswerHasCitations(answer) {
  if (!answer) return false;

  const buckets = [
    ...(Array.isArray(answer.facts) ? answer.facts : []),
    ...(Array.isArray(answer.inferences) ? answer.inferences : []),
    ...(Array.isArray(answer.unknowns) ? answer.unknowns : []),
  ];
  const citationIds = new Set((Array.isArray(answer.citations) ? answer.citations : []).map((citation) => citation.id));

  return (
    buckets.length >= 3 &&
    buckets.every((item) => Array.isArray(item.citationIds) && item.citationIds.length > 0 && item.citationIds.every((id) => citationIds.has(id)))
  );
}

function pushNoForbiddenPayload(serialized, label) {
  const forbidden = [
    rawSentinel,
    qaEmail,
    qaPhone,
    "0912-000-404",
    "policyNumber",
    "保單號",
    "raw provider payload",
    "provider payload",
    "raw audio",
    "authorization bearer",
    '"providerPayload":',
    '"rawProviderPayload":',
  ];
  const leaked = forbidden.filter((item) => serialized.includes(item));
  push(leaked.length === 0, label, leaked.length > 0 ? `leaked=${leaked.join(",")}` : "");
}

function push(condition, label, detail = "") {
  checks.push({ status: condition ? "pass" : "fail", label, detail });
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
