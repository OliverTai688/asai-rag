#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? "http://localhost:3000";
const demoEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const checks = [];

if (!dbUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const db = new Client({ connectionString: dbUrl });
await db.connect();

try {
  await main();
} catch (error) {
  push(false, "interview writeback QA crashed", error instanceof Error ? error.message : String(error));
} finally {
  await db.end();
  printChecks();
}

if (checks.some((item) => item.status === "fail")) {
  process.exitCode = 1;
}

async function main() {
  const unauth = await postJson("/api/ai/interview/sessions/not-found/writebacks", {
    candidateIds: ["confirmed-0"],
  });
  push(unauth.status === 401, "writeback route unauth returns 401", `status=${unauth.status}`);

  const unique = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const createdClient = await postJson(
    "/api/clients",
    {
      name: `PIM-008 確認卡客戶 ${unique}`,
      email: `pim008-${unique}@asai.local`,
      phone: "0912-345-678",
      birthDate: "1988-08-08",
      occupation: "確認卡驗證",
      annualIncome: 1200000,
      status: "PROSPECT",
    },
    demoEmail,
  );
  const clientId = createdClient.body?.client?.id;
  push(createdClient.status === 201 && typeof clientId === "string", "member creates CRM client for writeback QA", `status=${createdClient.status}`);

  if (typeof clientId !== "string") return;

  const session = await postJson(
    "/api/ai/interview/sessions",
    {
      clientId,
      interviewKind: "ADVISOR_COMPANION",
      outlineId: "advisor-companion-v1",
      currentSegmentId: "current-situation",
      title: `PIM-008 QA ${unique}`,
    },
    demoEmail,
  );
  const sessionId = session.body?.session?.id;
  push(session.status === 201 && typeof sessionId === "string", "member creates client-bound interview session", `status=${session.status}`);

  if (typeof sessionId !== "string") return;

  await appendTurn(sessionId, "我確認客戶醫療保障缺口需要在下次會議先釐清。");
  await appendTurn(sessionId, "他可能擔心保費預算，但這只是我目前的推測。");
  await appendTurn(sessionId, "我不確定客戶既有長照險是否仍有效。");

  const reflection = await postJson(
    `/api/ai/interview/sessions/${sessionId}/reflections/generate`,
    { currentSegmentId: "current-situation" },
    demoEmail,
  );
  push(reflection.status === 201, "member generates reflection before writeback", `status=${reflection.status}`);

  const preview = await getJson(`/api/ai/interview/sessions/${sessionId}/writebacks`, demoEmail);
  const candidates = Array.isArray(preview.body?.candidates) ? preview.body.candidates : [];
  const confirmed = candidates.find((item) => item.kind === "CONFIRMED_FACT");
  const inference = candidates.find((item) => item.kind === "INFERENCE");
  const unknown = candidates.find((item) => item.kind === "UNKNOWN");

  push(preview.status === 200, "writeback preview returns 200", `status=${preview.status}`);
  push(Boolean(confirmed?.id && confirmed.target === "CRM_CANDIDATE"), "confirmed fact becomes CRM candidate only");
  push(Boolean(inference?.id && inference.target === "INTERVIEW_INSIGHT"), "inference becomes interview insight, not CRM fact");
  push(Boolean(unknown?.id && unknown.target === "FOLLOW_UP_TASK"), "unknown becomes follow-up task");
  push(confirmed?.requiresReason === true, "highly sensitive confirmed fact requires explicit approval");

  if (!confirmed?.id || !inference?.id || !unknown?.id) return;

  const blocked = await postJson(
    `/api/ai/interview/sessions/${sessionId}/writebacks`,
    {
      candidateIds: [confirmed.id],
      approvals: [{ candidateId: confirmed.id }],
    },
    demoEmail,
  );
  push(blocked.status === 201, "high-sensitivity writeback request returns boundary result", `status=${blocked.status}`);
  push(
    blocked.body?.createdEvents?.length === 0 &&
      blocked.body?.blocked?.some?.((item) => item.candidateId === confirmed.id),
    "high-sensitivity confirmed fact is blocked without reason or risk acceptance",
  );

  const insight = await postJson(
    `/api/ai/interview/sessions/${sessionId}/writebacks`,
    {
      candidateIds: [inference.id, unknown.id],
    },
    demoEmail,
  );
  push(insight.status === 201, "inference and unknown save as non-CRM events", `status=${insight.status}`);
  push(
    insight.body?.createdEvents?.some?.((event) => event.candidateId === inference.id && event.target === "INTERVIEW_INSIGHT"),
    "inference checked creates interview insight event only",
  );
  push(
    insight.body?.createdEvents?.some?.((event) => event.candidateId === unknown.id && event.target === "FOLLOW_UP_TASK"),
    "unknown checked creates follow-up task event",
  );

  const approved = await postJson(
    `/api/ai/interview/sessions/${sessionId}/writebacks`,
    {
      candidateIds: [confirmed.id],
      approvals: [
        {
          candidateId: confirmed.id,
          reason: "業務員明確確認此醫療保障資訊可作為下次會議準備候選。",
          riskAccepted: true,
        },
      ],
    },
    demoEmail,
  );
  push(approved.status === 201, "approved confirmed fact saves writeback candidate", `status=${approved.status}`);
  push(
    approved.body?.createdEvents?.some?.((event) => event.candidateId === confirmed.id && event.target === "CRM_CANDIDATE"),
    "confirmed checked with approval creates CRM candidate event",
  );

  const dbProof = await getEventProof(clientId, sessionId);
  push(dbProof.crmCandidates >= 1, "DB has CRM candidate interaction event", `count=${dbProof.crmCandidates}`);
  push(dbProof.inferenceCrmFacts === 0, "DB proof: inference never persisted as CRM fact", `count=${dbProof.inferenceCrmFacts}`);
  push(dbProof.followUpTasks >= 1, "DB has follow-up task for unknown", `count=${dbProof.followUpTasks}`);
}

async function appendTurn(sessionId, content) {
  const response = await postJson(
    `/api/ai/interview/sessions/${sessionId}/turns`,
    {
      role: "USER",
      modality: "TEXT",
      content,
      transcriptFinal: true,
      outlineSegmentId: "current-situation",
    },
    demoEmail,
  );

  push(response.status === 201, `append writeback QA turn: ${content.slice(0, 18)}`, `status=${response.status}`);
}

async function getEventProof(clientId, sessionId) {
  const result = await db.query(
    `SELECT
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'interview_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'target' = 'CRM_CANDIDATE'
          AND metadata->>'crmWritebackCandidate' = 'true'
      )::int AS crm_candidates,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'interview_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'candidateKind' = 'INFERENCE'
          AND metadata->>'crmWritebackCandidate' = 'true'
      )::int AS inference_crm_facts,
      COUNT(*) FILTER (
        WHERE metadata->>'source' = 'interview_confirmation_card'
          AND metadata->>'sessionId' = $2
          AND metadata->>'target' = 'FOLLOW_UP_TASK'
      )::int AS follow_up_tasks
     FROM interaction_events
     WHERE client_id = $1`,
    [clientId, sessionId],
  );

  const row = result.rows[0] ?? {};
  return {
    crmCandidates: row.crm_candidates ?? 0,
    inferenceCrmFacts: row.inference_crm_facts ?? 0,
    followUpTasks: row.follow_up_tasks ?? 0,
  };
}

async function postJson(path, body, userEmail) {
  return requestJson(path, {
    method: "POST",
    userEmail,
    body,
  });
}

async function getJson(path, userEmail) {
  return requestJson(path, {
    method: "GET",
    userEmail,
  });
}

async function requestJson(path, options) {
  try {
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
  } catch (error) {
    push("warn", "API route proof skipped", error instanceof Error ? error.message : String(error));
    return {
      status: 0,
      body: undefined,
      text: "",
    };
  }
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition === "warn" ? "warn" : condition ? "pass" : "fail",
    label,
    detail,
  });
}

function printChecks() {
  for (const item of checks) {
    const prefix = item.status === "pass" ? "PASS" : item.status === "warn" ? "WARN" : "FAIL";
    console.log(`${prefix} ${item.label}${item.detail ? ` - ${item.detail}` : ""}`);
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

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
