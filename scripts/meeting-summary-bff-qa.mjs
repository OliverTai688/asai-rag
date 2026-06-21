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
  push(false, "meeting summary BFF QA crashed", error instanceof Error ? error.message : String(error));
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

  const unauth = await postJson("/api/ai/meeting/sessions/fake-session/summary", {});
  push(unauth.status === 401, "meeting summary unauth returns 401", `status=${unauth.status}`);

  const client = await createClient(`AMM-003 摘要客戶 ${unique}`, `amm003-${unique}@asai.local`);
  if (!client?.id) return;

  const visit = await createVisitPlan(client.id, unique);
  const visitPlanId = visit?.visitPlan?.id;
  push(typeof visitPlanId === "string", "member creates visit plan for summary scope", `visitPlan=${visitPlanId ?? "missing"}`);
  if (typeof visitPlanId !== "string") return;

  const emptySession = await createMeetingSession(client.id, visitPlanId, `AMM-003 空來源會議 ${unique}`);
  const emptySessionId = emptySession.body?.session?.id;
  const emptySummary = await postJson(
    `/api/ai/meeting/sessions/${emptySessionId ?? "missing"}/summary`,
    {},
    demoEmail,
  );
  push(emptySummary.status === 409 && emptySummary.body?.error === "MEETING_SUMMARY_SOURCE_EMPTY", "empty meeting summary is blocked", `status=${emptySummary.status}`);

  const create = await createMeetingSession(client.id, visitPlanId, `AMM-003 摘要會議 ${unique}`);
  const sessionId = create.body?.session?.id;
  push(create.status === 201 && typeof sessionId === "string", "member creates summary source meeting session", `status=${create.status}`);
  if (typeof sessionId !== "string") return;

  const firstTurn = await appendTurn(sessionId, {
    role: "USER",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: "確認客戶希望先釐清醫療實支保障缺口，預算上限暫抓每月六千元。",
    transcriptFinal: true,
    outlineSegmentId: "capture",
    issueTags: ["medical-gap"],
  });
  const secondTurn = await appendTurn(sessionId, {
    role: "USER",
    source: "MANUAL_NOTE",
    modality: "TEXT",
    content: "不確定是否要邀請配偶參與下一次決策，待確認家庭溝通偏好。",
    transcriptFinal: true,
    outlineSegmentId: "manual-note",
    issueTags: ["spouse-decision"],
  });
  const firstTurnId = firstTurn.body?.turn?.id;
  const secondTurnId = secondTurn.body?.turn?.id;
  push(firstTurn.status === 201 && typeof firstTurnId === "string", "member appends decision source turn", `status=${firstTurn.status}`);
  push(secondTurn.status === 201 && typeof secondTurnId === "string", "member appends manual-note unknown source turn", `status=${secondTurn.status}`);

  const rawPayloadBefore = await countMeetingSummaries(sessionId);
  const rawPayload = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      providerPayload: { raw: "raw provider payload authorization bearer token should be blocked" },
    },
    demoEmail,
  );
  const rawPayloadAfter = await countMeetingSummaries(sessionId);
  push(rawPayload.status === 409, "raw provider-like summary payload is blocked", `status=${rawPayload.status}`);
  push(rawPayloadBefore === rawPayloadAfter, "blocked summary payload creates no summary rows", `before=${rawPayloadBefore} after=${rawPayloadAfter}`);

  const summary = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      mode: "DETERMINISTIC_NO_PROVIDER",
      overwrite: true,
    },
    demoEmail,
  );
  push(summary.status === 201, "member creates deterministic meeting summary", `status=${summary.status}`);
  push(summary.body?.status === "created", "summary route reports created status", `status=${summary.body?.status ?? "missing"}`);
  push(summary.body?.summary?.schemaVersion === "asai.meeting.summary.v1", "summary schema version is stable");
  push(Array.isArray(summary.body?.summary?.citations) && summary.body.summary.citations.length >= 2, "summary contains citations", `citations=${summary.body?.summary?.citations?.length ?? 0}`);
  push(
    summary.body?.summary?.provider === null &&
      summary.body?.summary?.model === null &&
      summary.body?.summary?.usageLogId === null,
    "deterministic summary has no provider/model/usageLogId",
  );
  push(
    summary.body?.safety?.providerCallAttempted === false &&
      summary.body?.safety?.aiUsageLogRequired === false &&
      summary.body?.safety?.dbWriteAttempted === true &&
      summary.body?.safety?.writesConfirmedCrmFact === false,
    "summary safety declares db persistence with no provider/no CRM fact write",
  );
  push(
    citationsOnlyUseKnownTurns(summary.body?.summary?.citations, [firstTurnId, secondTurnId]),
    "summary citations only use stored source turns",
  );
  pushNoForbiddenPayload(JSON.stringify(summary.body), "summary response has no raw provider/audio payload");

  const noOverwrite = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      overwrite: false,
    },
    demoEmail,
  );
  push(noOverwrite.status === 409 && noOverwrite.body?.error === "MEETING_SUMMARY_ALREADY_EXISTS", "overwrite=false protects existing summary", `status=${noOverwrite.status}`);

  const thirdTurn = await appendTurn(sessionId, {
    role: "ASSISTANT",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: "請顧問下次會議前整理兩版保障缺口摘要，並補上家庭責任圖。",
    transcriptFinal: true,
    outlineSegmentId: "follow-up",
    issueTags: ["follow-up"],
  });
  const thirdTurnId = thirdTurn.body?.turn?.id;
  push(thirdTurn.status === 201 && typeof thirdTurnId === "string", "member appends overwrite source turn", `status=${thirdTurn.status}`);

  const overwrite = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {
      overwrite: true,
    },
    demoEmail,
  );
  push(overwrite.status === 200 && overwrite.body?.status === "updated", "summary overwrite regenerates existing row", `status=${overwrite.status}`);
  push(
    citationsOnlyUseKnownTurns(overwrite.body?.summary?.citations, [firstTurnId, secondTurnId, thirdTurnId]),
    "updated summary citations only use stored source turns",
  );

  const managerSummary = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    {},
    managerEmail,
  );
  push(managerSummary.status === 404, "manager cannot summarize member-private meeting", `status=${managerSummary.status}`);

  const dbProof = await getDbProof(sessionId);
  push(dbProof.summaryCount === 1, "DB proof has one summary row for session", JSON.stringify(dbProof));
  push(dbProof.providerNullCount === 1, "DB proof has no provider/model/usageLogId", JSON.stringify(dbProof));
  push(dbProof.generatedByCount === 1, "DB proof records deterministic generator", JSON.stringify(dbProof));
  push(dbProof.citationCount >= 3, "DB proof stores summary citations", JSON.stringify(dbProof));
  push(dbProof.sourceTurnIdCount >= 3, "DB proof stores cited source turn ids", JSON.stringify(dbProof));
  push(dbProof.guardProviderFalseCount === 1, "DB proof guardEvidence providerCallAttempted=false", JSON.stringify(dbProof));
  push(dbProof.confirmedCrmWriteFalseCount === 1, "DB proof guardEvidence writesConfirmedCrmFact=false", JSON.stringify(dbProof));

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
      occupation: "AMM-003 QA",
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
      visitTime: `2026-07-02T10:${String(Number(unique.slice(-2)) % 60).padStart(2, "0")}:00.000Z`,
    },
    demoEmail,
  );

  push(response.status === 201, "member creates QA visit plan", `status=${response.status}`);
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
          WHERE provider IS NULL AND model IS NULL AND usage_log_id IS NULL
        )::int AS provider_null_count,
        COUNT(*) FILTER (
          WHERE generated_by = 'deterministic-skeleton'
            AND schema_version = 'asai.meeting.summary.v1'
        )::int AS generated_by_count,
        COALESCE(MAX(jsonb_array_length(citations::jsonb)), 0)::int AS citation_count,
        COALESCE(MAX(cardinality(source_turn_ids)), 0)::int AS source_turn_id_count,
        COUNT(*) FILTER (
          WHERE guard_evidence::jsonb->>'providerCallAttempted' = 'false'
        )::int AS guard_provider_false_count,
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
    providerNullCount: Number(row.provider_null_count ?? 0),
    generatedByCount: Number(row.generated_by_count ?? 0),
    citationCount: Number(row.citation_count ?? 0),
    sourceTurnIdCount: Number(row.source_turn_id_count ?? 0),
    guardProviderFalseCount: Number(row.guard_provider_false_count ?? 0),
    confirmedCrmWriteFalseCount: Number(row.confirmed_crm_write_false_count ?? 0),
  };
}

async function countMeetingSummaries(sessionId) {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM interview_meeting_summaries WHERE session_id = $1", [
    sessionId || "missing",
  ]);
  return Number(result.rows[0]?.count ?? 0);
}

async function countAiUsageLogs() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs");
  return Number(result.rows[0]?.count ?? 0);
}

async function postJson(path, body, userEmail) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userEmail ? { "x-asai-demo-user-email": userEmail } : {}),
    },
    body: JSON.stringify(body),
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
