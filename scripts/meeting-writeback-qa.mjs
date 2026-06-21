#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client as PgClient } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const managerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const runId = Date.now().toString(36);
const rawSentinel = `AMM006A_RAW_PROVIDER_SENTINEL_${runId}`;
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
  push(false, "meeting writeback QA crashed", error instanceof Error ? error.message : String(error));
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

  const unauth = await postJson("/api/ai/meeting/sessions/fake-session/writebacks", {
    candidateIds: ["decision-1"],
  });
  push(unauth.status === 401, "meeting writeback unauth returns 401", `status=${unauth.status}`);

  const client = await createClient();
  if (!client?.id) return;

  const visit = await createVisit(client.id);
  const visitPlanId = visit.body?.visitPlan?.id;
  push(typeof visitPlanId === "string", "member creates visit plan for writeback scope", `visitPlan=${visitPlanId ?? "missing"}`);
  if (typeof visitPlanId !== "string") return;

  const session = await createMeetingSession(client.id, visitPlanId, `AMM-006 寫回會議 ${runId}`);
  const sessionId = session.body?.session?.id;
  push(session.status === 201 && typeof sessionId === "string", "member creates writeback source meeting session", `status=${session.status}`);
  if (typeof sessionId !== "string") return;

  const preSummary = await getJson(`/api/ai/meeting/sessions/${sessionId}/writebacks`, demoEmail);
  push(preSummary.status === 200 && preSummary.body?.status === "summary_required", "preview requires summary before writeback", `status=${preSummary.status}`);

  const blockedBeforeSummary = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/writebacks`,
    { candidateIds: ["decision-decision-1"] },
    demoEmail,
  );
  push(blockedBeforeSummary.status === 409 && blockedBeforeSummary.body?.error === "MEETING_SUMMARY_REQUIRED", "POST blocks writeback until summary exists", `status=${blockedBeforeSummary.status}`);

  const firstTurn = await appendTurn(sessionId, {
    role: "USER",
    source: "TEXT_INPUT",
    modality: "TEXT",
    content: `確認客戶醫療保障缺口是第一順位，預算上限每月八千元 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "capture",
    issueTags: ["medical-gap"],
  });
  const secondTurn = await appendTurn(sessionId, {
    role: "USER",
    source: "MANUAL_NOTE",
    modality: "TEXT",
    content: `他可能擔心配偶是否理解方案，先請顧問下次準備家庭責任圖 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "follow-up",
    issueTags: ["spouse-decision"],
  });
  const thirdTurn = await appendTurn(sessionId, {
    role: "USER",
    source: "MANUAL_NOTE",
    modality: "TEXT",
    content: `不確定既有長照險是否仍有效，需要下次補問 ${runId}`,
    transcriptFinal: true,
    outlineSegmentId: "unknown",
    issueTags: ["ltc-unknown"],
  });
  push(firstTurn.status === 201, "member appends confirmed decision source turn", `status=${firstTurn.status}`);
  push(secondTurn.status === 201, "member appends action/inference source turn", `status=${secondTurn.status}`);
  push(thirdTurn.status === 201, "member appends unknown source turn", `status=${thirdTurn.status}`);

  const summary = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/summary`,
    { mode: "DETERMINISTIC_NO_PROVIDER", overwrite: true },
    demoEmail,
  );
  push(summary.status === 201, "member creates deterministic meeting summary before writeback", `status=${summary.status}`);

  const rawPayloadBefore = await countMeetingWritebackEvents(sessionId);
  const rawPayload = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/writebacks`,
    {
      candidateIds: ["decision-decision-1"],
      providerPayload: `raw provider payload ${rawSentinel}`,
    },
    demoEmail,
  );
  const rawPayloadAfter = await countMeetingWritebackEvents(sessionId);
  push(rawPayload.status === 409, "raw provider-like writeback payload is blocked", `status=${rawPayload.status}`);
  push(rawPayloadBefore === rawPayloadAfter, "blocked writeback payload creates no interaction events", `${rawPayloadBefore}->${rawPayloadAfter}`);
  push(!JSON.stringify(rawPayload.body).includes(rawSentinel), "blocked writeback response does not echo raw sentinel");

  const preview = await getJson(`/api/ai/meeting/sessions/${sessionId}/writebacks`, demoEmail);
  const candidates = Array.isArray(preview.body?.candidates) ? preview.body.candidates : [];
  const confirmed = candidates.find((item) => item.kind === "CONFIRMED_FACT" && item.target === "CRM_CANDIDATE");
  const inference = candidates.find((item) => item.kind === "INFERENCE" && item.target === "INTERVIEW_INSIGHT");
  const action =
    candidates.find((item) => item.kind === "ACTION_ITEM" && item.target === "FOLLOW_UP_TASK" && item.requiresReason === false) ??
    candidates.find((item) => item.kind === "ACTION_ITEM" && item.target === "FOLLOW_UP_TASK");
  const unknown = candidates.find((item) => item.kind === "UNKNOWN" && item.target === "FOLLOW_UP_TASK");

  push(preview.status === 200 && preview.body?.status === "ready", "writeback preview returns ready candidates", `status=${preview.status}`);
  push(Boolean(confirmed?.id), "confirmed meeting decision becomes CRM candidate");
  push(Boolean(inference?.id), "meeting inference becomes insight, not CRM fact");
  push(Boolean(action?.id), "meeting action item becomes follow-up task");
  push(Boolean(unknown?.id), "meeting open question becomes follow-up task");
  push(confirmed?.requiresReason === true, "high-sensitivity confirmed decision requires approval");
  push(preview.body?.safety?.providerCallAttempted === false, "preview declares no provider call");
  push(preview.body?.safety?.writesConfirmedCrmFact === false, "preview declares no confirmed CRM fact write");

  if (!confirmed?.id || !inference?.id || !action?.id || !unknown?.id) return;

  const blocked = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/writebacks`,
    {
      candidateIds: [confirmed.id],
      approvals: [{ candidateId: confirmed.id }],
    },
    demoEmail,
  );
  push(blocked.status === 201, "high-sensitivity meeting writeback returns boundary result", `status=${blocked.status}`);
  push(
    blocked.body?.createdEvents?.length === 0 &&
      blocked.body?.blocked?.some?.((item) => item.candidateId === confirmed.id),
    "high-sensitivity meeting confirmed fact is blocked without reason or risk acceptance",
  );

  const nonCrm = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/writebacks`,
    {
      candidateIds: [inference.id, action.id, unknown.id],
    },
    demoEmail,
  );
  push(nonCrm.status === 201, "inference/action/unknown save as non-CRM meeting events", `status=${nonCrm.status}`);
  push(
    nonCrm.body?.createdEvents?.some?.((event) => event.candidateId === inference.id && event.target === "INTERVIEW_INSIGHT"),
    "meeting inference checked creates insight event only",
  );
  push(
    nonCrm.body?.createdEvents?.some?.((event) => event.candidateId === action.id && event.target === "FOLLOW_UP_TASK"),
    "meeting action checked creates task event",
  );
  push(
    nonCrm.body?.createdEvents?.some?.((event) => event.candidateId === unknown.id && event.target === "FOLLOW_UP_TASK"),
    "meeting unknown checked creates follow-up task event",
  );

  const approved = await postJson(
    `/api/ai/meeting/sessions/${sessionId}/writebacks`,
    {
      candidateIds: [confirmed.id],
      approvals: [
        {
          candidateId: confirmed.id,
          reason: "顧問確認此醫療保障資訊可作為下次拜訪前的 CRM 候選，不直接寫成正式事實。",
          riskAccepted: true,
        },
      ],
    },
    demoEmail,
  );
  push(approved.status === 201, "approved meeting confirmed fact saves CRM candidate event", `status=${approved.status}`);
  push(
    approved.body?.createdEvents?.some?.((event) => event.candidateId === confirmed.id && event.target === "CRM_CANDIDATE"),
    "approved meeting confirmed decision creates CRM candidate event",
  );

  const managerPreview = await getJson(`/api/ai/meeting/sessions/${sessionId}/writebacks`, managerEmail);
  push(managerPreview.status === 404, "manager cannot preview member-private meeting writebacks", `status=${managerPreview.status}`);

  const dbProof = await getEventProof(client.id, sessionId);
  push(dbProof.crmCandidates >= 1, "DB has meeting CRM candidate interaction event", `count=${dbProof.crmCandidates}`);
  push(dbProof.inferenceCrmFacts === 0, "DB proof: meeting inference never persisted as CRM fact", `count=${dbProof.inferenceCrmFacts}`);
  push(dbProof.actionTasks >= 1, "DB has task event for meeting action item", `count=${dbProof.actionTasks}`);
  push(dbProof.unknownTasks >= 1, "DB has task event for meeting unknown/open question", `count=${dbProof.unknownTasks}`);
  push(dbProof.confirmedCrmFactWrites === 0, "DB metadata keeps writesConfirmedCrmFact=false", `count=${dbProof.confirmedCrmFactWrites}`);

  const afterUsageCount = await countAiUsageLogs();
  push(afterUsageCount === beforeUsageCount, "no-provider meeting writeback keeps AiUsageLog unchanged", `${beforeUsageCount}->${afterUsageCount}`);
}

async function createClient() {
  const response = await postJson(
    "/api/clients",
    {
      name: `AMM-006 寫回客戶 ${runId}`,
      email: `amm006a-${runId}@asai.local`,
      phone: "0912-345-678",
      birthDate: "1988-08-08",
      occupation: "AMM-006 QA",
      annualIncome: 1600000,
      status: "PROSPECT",
    },
    demoEmail,
  );

  push(response.status === 201 && typeof response.body?.client?.id === "string", "member creates writeback QA client", `status=${response.status}`);
  return response.body?.client;
}

async function createVisit(clientId) {
  return postJson(
    "/api/visits",
    {
      clientId,
      purpose: "FIRST_VISIT",
      visitTime: new Date(Date.now() + 4 * 86_400_000).toISOString(),
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

async function countMeetingWritebackEvents(sessionId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM interaction_events
     WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
       AND metadata->>'sessionId' = $1`,
    [sessionId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function getEventProof(clientId, sessionId) {
  const result = await db.query(
    `SELECT
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'target' = 'CRM_CANDIDATE'
          AND metadata->>'crmWritebackCandidate' = 'true'
      )::int AS crm_candidates,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'candidateKind' = 'INFERENCE'
          AND metadata->>'crmWritebackCandidate' = 'true'
      )::int AS inference_crm_facts,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'candidateKind' = 'ACTION_ITEM'
          AND metadata->>'target' = 'FOLLOW_UP_TASK'
      )::int AS action_tasks,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'candidateKind' = 'UNKNOWN'
          AND metadata->>'target' = 'FOLLOW_UP_TASK'
      )::int AS unknown_tasks,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'meeting_writeback_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'writesConfirmedCrmFact' != 'false'
      )::int AS confirmed_crm_fact_writes
     FROM interaction_events
     WHERE client_id = $1`,
    [clientId, sessionId],
  );

  const row = result.rows[0] ?? {};
  return {
    crmCandidates: Number(row.crm_candidates ?? 0),
    inferenceCrmFacts: Number(row.inference_crm_facts ?? 0),
    actionTasks: Number(row.action_tasks ?? 0),
    unknownTasks: Number(row.unknown_tasks ?? 0),
    confirmedCrmFactWrites: Number(row.confirmed_crm_fact_writes ?? 0),
  };
}

async function countAiUsageLogs() {
  const result = await db.query("SELECT COUNT(*)::int AS count FROM ai_usage_logs");
  return Number(result.rows[0]?.count ?? 0);
}

async function getJson(path, email) {
  return requestJson(path, { method: "GET", email });
}

async function postJson(path, body, email) {
  return requestJson(path, { method: "POST", body, email });
}

async function requestJson(path, options) {
  const headers = { "Content-Type": "application/json" };
  if (options.email) headers["x-asai-demo-user-email"] = options.email;
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed, text };
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
