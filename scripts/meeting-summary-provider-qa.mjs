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

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY for live provider meeting summary QA.");
  process.exit(1);
}

const db = new PgClient({ connectionString: dbUrl });
await db.connect();

try {
  await runProviderProof();
} catch (error) {
  push(false, "provider meeting summary QA crashed", error instanceof Error ? error.message : String(error));
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

async function runProviderProof() {
  const beforeUsage = await countMeetingAiUsageLogs();
  const unique = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

  const unauth = await postJson("/api/ai/meeting/sessions/fake-session/summary", {
    mode: "PROVIDER_JSON",
    overwrite: true,
  });
  push(unauth.status === 401, "provider summary unauth returns 401", `status=${unauth.status}`);

  const client = await createClient(`AMM-003b Provider 客戶 ${unique}`, `amm003b-${unique}@asai.local`);
  if (!client?.id) return;

  const visit = await createVisitPlan(client.id, unique);
  const visitPlanId = visit?.visitPlan?.id;
  push(typeof visitPlanId === "string", "member creates visit plan for provider summary scope", `visitPlan=${visitPlanId ?? "missing"}`);
  if (typeof visitPlanId !== "string") return;

  const create = await createMeetingSession(client.id, visitPlanId, `AMM-003b Provider 摘要會議 ${unique}`);
  const sessionId = create.body?.session?.id;
  push(create.status === 201 && typeof sessionId === "string", "member creates provider summary source session", `status=${create.status}`);
  if (typeof sessionId !== "string") return;

  const firstTurn = await appendTurn(sessionId, {
    role: "USER",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: "已確認客戶希望優先補強醫療實支缺口，預算上限暫抓每月六千元。",
    transcriptFinal: true,
    outlineSegmentId: "capture",
    issueTags: ["medical-gap"],
  });
  const secondTurn = await appendTurn(sessionId, {
    role: "USER",
    source: "MANUAL_NOTE",
    modality: "TEXT",
    content: "客戶提到配偶可能參與下一次會議，但是否共同決策仍待確認。",
    transcriptFinal: true,
    outlineSegmentId: "manual-note",
    issueTags: ["spouse-decision"],
  });
  const thirdTurn = await appendTurn(sessionId, {
    role: "ASSISTANT",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: "請顧問下次會議前整理兩版保障缺口摘要，並補上家庭責任圖。",
    transcriptFinal: true,
    outlineSegmentId: "follow-up",
    issueTags: ["follow-up"],
  });
  const knownTurnIds = [firstTurn.body?.turn?.id, secondTurn.body?.turn?.id, thirdTurn.body?.turn?.id].filter(Boolean);
  push(knownTurnIds.length === 3, "member appends three provider source turns", `turns=${knownTurnIds.length}`);

  const rawPayloadBefore = await countMeetingSummaries(sessionId);
  const rawPayload = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "PROVIDER_JSON",
      providerPayload: { raw: "raw provider payload authorization bearer token should be blocked" },
    },
    demoEmail,
  );
  const rawPayloadAfter = await countMeetingSummaries(sessionId);
  push(rawPayload.status === 409 && rawPayload.body?.error === "MEETING_PAYLOAD_BLOCKED", "raw provider-like provider summary payload is blocked", `status=${rawPayload.status}`);
  push(rawPayloadBefore === rawPayloadAfter, "blocked provider summary payload creates no summary rows", `before=${rawPayloadBefore} after=${rawPayloadAfter}`);

  const providerDisabled = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "PROVIDER_JSON",
      overwrite: true,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-provider-disabled": "true" },
  );
  push(providerDisabled.status === 503 && providerDisabled.body?.error === "MEETING_SUMMARY_PROVIDER_DISABLED", "provider disabled guard returns 503 before provider", `status=${providerDisabled.status}`);
  push(providerDisabled.body?.safety?.providerCallAttempted === false, "provider disabled guard declares provider not attempted");

  const quota = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "PROVIDER_JSON",
      overwrite: true,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-quota-exceeded": "true" },
  );
  push(quota.status === 429 && quota.body?.error === "QUOTA_EXCEEDED", "provider summary quota guard blocks before provider", `status=${quota.status}`);
  push(quota.body?.safety?.quotaBlocked === true && quota.body?.safety?.providerCallAttempted === false, "quota guard declares no provider call and no fake usage log");

  const afterGuards = await countMeetingAiUsageLogs();
  push(afterGuards.total === beforeUsage.total, "401/409/429/503 guards write no fake MEETING AiUsageLog", `before=${beforeUsage.total} after=${afterGuards.total}`);

  const providerError = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "PROVIDER_JSON",
      overwrite: true,
      dryRun: true,
    },
    demoEmail,
    { "x-asai-qa-force-provider-error": "true" },
  );
  push(providerError.status === 502, "provider summary error path returns 502", `status=${providerError.status}`);
  push(providerError.body?.error === "MEETING_SUMMARY_PROVIDER_FAILED", "provider summary error response is sanitized");
  pushNoForbiddenPayload(JSON.stringify(providerError.body), "provider summary error omits raw provider payload");

  const afterError = await countMeetingAiUsageLogs();
  push(afterError.error >= afterGuards.error + 1, "provider summary error writes MEETING AiUsageLog", `${afterGuards.error}->${afterError.error}`);
  push((await countMeetingSummaries(sessionId)) === 0, "provider error creates no summary row", `session=${sessionId}`);

  const summary = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "PROVIDER_JSON",
      overwrite: true,
    },
    demoEmail,
  );
  push(summary.status === 201, "provider summary generation succeeds for demo member", `status=${summary.status}`);
  push(summary.body?.status === "created", "provider summary route reports created status", `status=${summary.body?.status ?? "missing"}`);
  push(summary.body?.summary?.schemaVersion === "asai.meeting.summary.v1", "provider summary schema version is stable");
  push(summary.body?.summary?.generatedBy === "provider-json", "provider summary records provider-json generator");
  push(summary.body?.summary?.provider === "OPENAI" && typeof summary.body?.summary?.model === "string", "provider summary records provider/model");
  push(typeof summary.body?.summary?.usageLogId === "string", "provider summary stores usageLogId");
  push(
    summary.body?.safety?.providerCallAttempted === true &&
      summary.body?.safety?.aiUsageLogRequired === true &&
      summary.body?.safety?.aiUsageLogWritten === true &&
      summary.body?.safety?.dbWriteAttempted === true,
    "provider summary safety declares provider usage log and DB write",
  );
  push(
    citationsOnlyUseKnownTurns(summary.body?.summary?.citations, knownTurnIds),
    "provider summary citations only use stored source turns",
  );
  push(
    providerItemsHaveCitations(summary.body?.summary),
    "provider summary decisions/actions/questions retain citations",
  );
  pushNoForbiddenPayload(JSON.stringify(summary.body), "provider summary response has no raw provider/audio payload");

  const afterSuccess = await countMeetingAiUsageLogs();
  push(afterSuccess.success >= afterError.success + 1, "provider summary success writes MEETING AiUsageLog", `${afterError.success}->${afterSuccess.success}`);

  const noOverwrite = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "PROVIDER_JSON",
      overwrite: false,
    },
    demoEmail,
  );
  push(noOverwrite.status === 409 && noOverwrite.body?.error === "MEETING_SUMMARY_ALREADY_EXISTS", "provider overwrite=false protects existing summary before provider", `status=${noOverwrite.status}`);
  const afterNoOverwrite = await countMeetingAiUsageLogs();
  push(afterNoOverwrite.total === afterSuccess.total, "provider overwrite=false writes no new AiUsageLog", `${afterSuccess.total}->${afterNoOverwrite.total}`);

  const fourthTurn = await appendTurn(sessionId, {
    role: "USER",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: "新增提醒：下次會議前希望看到癌症一次金與失能扶助的差異比較。",
    transcriptFinal: true,
    outlineSegmentId: "follow-up",
    issueTags: ["comparison"],
  });
  const fourthTurnId = fourthTurn.body?.turn?.id;
  push(fourthTurn.status === 201 && typeof fourthTurnId === "string", "member appends provider overwrite source turn", `status=${fourthTurn.status}`);

  const overwrite = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "PROVIDER_JSON",
      overwrite: true,
    },
    demoEmail,
  );
  push(overwrite.status === 200 && overwrite.body?.status === "updated", "provider summary overwrite regenerates existing row", `status=${overwrite.status}`);
  push(overwrite.body?.summary?.generatedBy === "provider-json", "provider overwrite keeps provider-json generator");
  push(typeof overwrite.body?.summary?.usageLogId === "string", "provider overwrite stores fresh usageLogId");
  push(
    citationsOnlyUseKnownTurns(overwrite.body?.summary?.citations, [...knownTurnIds, fourthTurnId]),
    "updated provider summary citations only use stored source turns",
  );

  const afterOverwrite = await countMeetingAiUsageLogs();
  push(afterOverwrite.success >= afterSuccess.success + 1, "provider overwrite writes another success AiUsageLog", `${afterSuccess.success}->${afterOverwrite.success}`);

  const managerSummary = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "PROVIDER_JSON",
      overwrite: true,
    },
    managerEmail,
  );
  push(managerSummary.status === 404, "manager cannot run provider summary on member-private meeting", `status=${managerSummary.status}`);
  const afterManager = await countMeetingAiUsageLogs();
  push(afterManager.total === afterOverwrite.total, "manager-private 404 writes no provider AiUsageLog", `${afterOverwrite.total}->${afterManager.total}`);

  const dbProof = await getDbProof(sessionId);
  push(dbProof.summaryCount === 1, "DB proof has one provider summary row for session", JSON.stringify(dbProof));
  push(dbProof.providerOpenAiCount === 1, "DB proof records OPENAI provider/model/usageLogId", JSON.stringify(dbProof));
  push(dbProof.generatedByCount === 1, "DB proof records provider-json generator", JSON.stringify(dbProof));
  push(dbProof.citationCount >= 3, "DB proof stores provider summary citations", JSON.stringify(dbProof));
  push(dbProof.sourceTurnIdCount >= 3, "DB proof stores cited provider source turn ids", JSON.stringify(dbProof));
  push(dbProof.guardProviderTrueCount === 1, "DB proof guardEvidence providerCallAttempted=true", JSON.stringify(dbProof));
  push(dbProof.rawProviderPayloadAbsentCount === 1, "DB proof guardEvidence keeps raw provider payload absent/false", JSON.stringify(dbProof));
  push(dbProof.confirmedCrmWriteFalseCount === 1, "DB proof guardEvidence writesConfirmedCrmFact=false", JSON.stringify(dbProof));
}

async function createClient(name, email) {
  const response = await postJson(
    "/api/clients",
    {
      name,
      email,
      phone: "0912-345-678",
      birthDate: "1988-08-08",
      occupation: "AMM-003b QA",
      annualIncome: 1200000,
      status: "PROSPECT",
    },
    demoEmail,
  );

  push(response.status === 201 && typeof response.body?.client?.id === "string", "member creates provider QA client", `status=${response.status}`);
  return response.body?.client;
}

async function createVisitPlan(clientId, unique) {
  const response = await postJson(
    "/api/visits",
    {
      clientId,
      purpose: "FIRST_VISIT",
      visitTime: `2026-07-03T10:${String(Number(unique.slice(-2)) % 60).padStart(2, "0")}:00.000Z`,
    },
    demoEmail,
  );

  push(response.status === 201, "member creates provider QA visit plan", `status=${response.status}`);
  return response.body;
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

async function getDbProof(sessionId) {
  const result = await db.query(
    `
      SELECT
        COUNT(*)::int AS summary_count,
        COUNT(*) FILTER (
          WHERE provider = 'OPENAI'
            AND model IS NOT NULL
            AND usage_log_id IS NOT NULL
        )::int AS provider_openai_count,
        COUNT(*) FILTER (
          WHERE generated_by = 'provider-json'
            AND schema_version = 'asai.meeting.summary.v1'
        )::int AS generated_by_count,
        COALESCE(MAX(jsonb_array_length(citations::jsonb)), 0)::int AS citation_count,
        COALESCE(MAX(cardinality(source_turn_ids)), 0)::int AS source_turn_id_count,
        COUNT(*) FILTER (
          WHERE guard_evidence::jsonb->>'providerCallAttempted' = 'true'
        )::int AS guard_provider_true_count,
        COUNT(*) FILTER (
          WHERE COALESCE(guard_evidence::jsonb->>'storesRawProviderPayload', 'false') = 'false'
        )::int AS raw_provider_payload_absent_count,
        COUNT(*) FILTER (
          WHERE guard_evidence::jsonb->>'writesConfirmedCrmFact' = 'false'
        )::int AS confirmed_crm_write_false_count
      FROM interview_meeting_summaries
      WHERE session_id = $1
    `,
    [sessionId || "missing"],
  );
  const row = result.rows[0] ?? {};

  return {
    summaryCount: Number(row.summary_count ?? 0),
    providerOpenAiCount: Number(row.provider_openai_count ?? 0),
    generatedByCount: Number(row.generated_by_count ?? 0),
    citationCount: Number(row.citation_count ?? 0),
    sourceTurnIdCount: Number(row.source_turn_id_count ?? 0),
    guardProviderTrueCount: Number(row.guard_provider_true_count ?? 0),
    rawProviderPayloadAbsentCount: Number(row.raw_provider_payload_absent_count ?? 0),
    confirmedCrmWriteFalseCount: Number(row.confirmed_crm_write_false_count ?? 0),
  };
}

async function countMeetingSummaries(sessionId) {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM interview_meeting_summaries WHERE session_id = $1", [
    sessionId || "missing",
  ]);
  return Number(result.rows[0]?.count ?? 0);
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

async function postJson(path, body, userEmail, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userEmail ? { "x-asai-demo-user-email": userEmail } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
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

function citationsOnlyUseKnownTurns(citations, knownTurnIds) {
  const known = new Set(knownTurnIds.filter(Boolean));
  return Array.isArray(citations) && citations.length > 0 && citations.every((citation) => known.has(citation.turnId));
}

function providerItemsHaveCitations(summary) {
  if (!summary) return false;

  const items = [
    ...(Array.isArray(summary.decisions) ? summary.decisions : []),
    ...(Array.isArray(summary.actionItems) ? summary.actionItems : []),
    ...(Array.isArray(summary.openQuestions) ? summary.openQuestions : []),
  ];

  return items.length > 0 && items.every((item) => Array.isArray(item.citations) && item.citations.length > 0);
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
