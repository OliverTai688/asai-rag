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
  push(false, "interview quick-capture BFF QA crashed", error instanceof Error ? error.message : String(error));
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
  const beforePersistenceCount = await countQuickCapturePersistenceRows();
  const unique = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

  const unauth = await postJson("/api/ai/interview/quick-captures", {
    content: "我確認客戶想先釐清退休金缺口。",
    assignment: "PRIVATE_DRAFT",
  });
  push(unauth.status === 401, "quick-capture unauth returns 401", `status=${unauth.status}`);

  const client = await createClient(`PIM-011 快捕客戶 ${unique}`, `pim011-${unique}@asai.local`);
  if (!client?.id) return;

  await db.query(`UPDATE clients SET sensitivity = 'HIGHLY_SENSITIVE' WHERE id = $1`, [client.id]);

  const blocked = await postJson(
    "/api/ai/interview/quick-captures",
    {
      content: "我確認客戶希望退休金缺口先用現金流表說明。",
      origin: "POST_VISIT_NOTE",
      assignment: "CLIENT",
      clientId: client.id,
    },
    demoEmail,
  );
  const afterBlockedPersistenceCount = await countQuickCapturePersistenceRows();
  push(blocked.status === 409, "high-sensitive client quick-capture is blocked without approval", `status=${blocked.status}`);
  push(
    blocked.body?.status === "BLOCKED" && blocked.body?.safety?.clientSensitivity === "HIGHLY_SENSITIVE",
    "blocked response exposes gate status without provider",
    `status=${blocked.body?.status ?? "missing"}`,
  );
  push(
    afterBlockedPersistenceCount === beforePersistenceCount,
    "blocked high-sensitive quick-capture creates no session/turn/memory rows",
    `before=${beforePersistenceCount} after=${afterBlockedPersistenceCount}`,
  );

  const approved = await postJson(
    "/api/ai/interview/quick-captures",
    {
      content: "我確認客戶希望退休金缺口先用現金流表說明。",
      origin: "POST_VISIT_NOTE",
      assignment: "CLIENT",
      clientId: client.id,
      clientProvidedScope: {
        organizationId: "rogue-org",
        memberId: "rogue-member",
        clientId: "rogue-client",
      },
      approval: {
        reason: "PIM-011 QA 僅建立顧問私有記憶與待確認交接，不寫入 CRM confirmed fact。",
        riskAccepted: true,
      },
    },
    demoEmail,
  );
  const approvedText = JSON.stringify(approved.body);
  const sessionId = approved.body?.capture?.sessionId;
  const turnId = approved.body?.capture?.turnId;
  const memoryId = approved.body?.memoryCandidates?.[0]?.id;
  push(approved.status === 201 && approved.body?.status === "READY", "approved quick-capture returns READY 201", `status=${approved.status}`);
  push(typeof sessionId === "string" && typeof turnId === "string", "approved response returns session and turn ids", `session=${sessionId ?? "missing"}`);
  push(typeof memoryId === "string", "approved response returns memory id", `memory=${memoryId ?? "missing"}`);
  push(
    approved.body?.safety?.clientProvidedScopeIgnored === true &&
      approved.body?.capture?.clientId === client.id &&
      approvedText.includes("rogue-org") === false,
    "server session scope overrides clientProvidedScope",
    `client=${approved.body?.capture?.clientId ?? "missing"}`,
  );
  push(
    approved.body?.safety?.providerCallAttempted === false &&
      approved.body?.safety?.aiUsageLogRequired === false &&
      approved.body?.safety?.rawAudioStored === false &&
      approved.body?.safety?.rawPrivateTranscriptStored === false,
    "approved quick-capture is explicit no-provider/no-raw-audio posture",
  );
  push(
    approved.body?.memoryCandidates?.[0]?.dataClass === "CONFIRMED" &&
      approved.body?.memoryCandidates?.[0]?.supportingEvidence?.sourceLabel === "post_visit_note:client",
    "approved quick-capture returns confirmed memory candidate evidence",
    `dataClass=${approved.body?.memoryCandidates?.[0]?.dataClass ?? "missing"}`,
  );
  pushNoPrivateSentinel(approvedText, "approved quick-capture response has no private sentinel");
  push(
    !approvedText.includes("退休金缺口") && !approvedText.includes("現金流表"),
    "approved response does not echo raw quick-capture note text",
  );

  const snapshot = await getJson(`/api/ai/interview/sessions/${sessionId}`, demoEmail);
  push(snapshot.status === 200, "owner can read quick-capture session snapshot", `status=${snapshot.status}`);
  push(
    snapshot.body?.memories?.some((memory) => memory.id === memoryId && memory.text.includes("退休金缺口")),
    "refresh/new-context snapshot reads persisted memory text",
    `memories=${snapshot.body?.memories?.length ?? 0}`,
  );
  push(
    snapshot.body?.turns?.some((turn) => turn.id === turnId && String(turn.content).startsWith("quick-capture anchor:")),
    "persisted quick-capture turn is an anchor, not raw note echo",
    `turns=${snapshot.body?.turns?.length ?? 0}`,
  );

  const managerRead = await getJson(`/api/ai/interview/sessions/${sessionId}`, managerEmail);
  push(managerRead.status === 404, "manager cannot read member-owned quick-capture session", `status=${managerRead.status}`);

  const managerWrite = await postJson(
    "/api/ai/interview/quick-captures",
    {
      content: "我確認客戶希望退休金缺口先用現金流表說明。",
      origin: "POST_VISIT_NOTE",
      assignment: "CLIENT",
      clientId: client.id,
      approval: {
        reason: "PIM-011 manager denial proof.",
        riskAccepted: true,
      },
    },
    managerEmail,
  );
  push(managerWrite.status === 404, "manager cannot write quick-capture to member-owned client", `status=${managerWrite.status}`);

  const unknown = await postJson(
    "/api/ai/interview/quick-captures",
    {
      content: "不確定哪位家人會一起參與下一次決策？",
      origin: "POST_VISIT_NOTE",
      assignment: "CLIENT",
      clientId: client.id,
      approval: {
        reason: "PIM-011 QA 只建立 narrator question 與 state proposal。",
        riskAccepted: true,
      },
    },
    demoEmail,
  );
  push(unknown.status === 201, "unknown quick-capture returns 201", `status=${unknown.status}`);
  push(
    unknown.body?.memoryCandidates?.[0]?.dataClass === "UNKNOWN" &&
      unknown.body?.narratorQuestions?.length === 1 &&
      unknown.body?.theaterStateProposals?.length === 1,
    "unknown quick-capture creates narrator question and theater state proposal",
    `questions=${unknown.body?.narratorQuestions?.length ?? 0}`,
  );
  pushNoPrivateSentinel(JSON.stringify(unknown.body), "unknown quick-capture response has no private sentinel");

  const inference = await postJson(
    "/api/ai/interview/quick-captures",
    {
      content: "客戶可能擔心配偶不同意保費預算。",
      origin: "POST_VISIT_NOTE",
      assignment: "CLIENT",
      clientId: client.id,
      approval: {
        reason: "PIM-011 QA 只建立推論交接，不寫 CRM confirmed fact。",
        riskAccepted: true,
      },
    },
    demoEmail,
  );
  push(inference.status === 201, "inference quick-capture returns 201", `status=${inference.status}`);
  push(
    inference.body?.memoryCandidates?.[0]?.dataClass === "INFERENCE" &&
      inference.body?.theaterStateProposals?.length === 1 &&
      inference.body?.crmWritebackCandidates?.length === 0,
    "inference quick-capture creates state proposal but no CRM confirmed candidate",
    `crmCandidates=${inference.body?.crmWritebackCandidates?.length ?? 0}`,
  );

  const beforeSecretPersistenceCount = await countQuickCapturePersistenceRows();
  const secret = await postJson(
    "/api/ai/interview/quick-captures",
    {
      content: "raw provider payload authorization bearer token should be blocked",
      assignment: "PRIVATE_DRAFT",
    },
    demoEmail,
  );
  const afterSecretPersistenceCount = await countQuickCapturePersistenceRows();
  push(secret.status === 409, "secret/raw payload quick-capture is blocked", `status=${secret.status}`);
  push(
    beforeSecretPersistenceCount === afterSecretPersistenceCount,
    "secret/raw payload quick-capture creates no persistence rows",
    `before=${beforeSecretPersistenceCount} after=${afterSecretPersistenceCount}`,
  );

  const dbProof = await getDbProof(sessionId, turnId, memoryId, client.id);
  push(dbProof.sessionCount === 1, "DB proof has one owner-scoped quick-capture session", JSON.stringify(dbProof));
  push(dbProof.turnAnchorCount === 1, "DB proof stores quick-capture turn anchor", JSON.stringify(dbProof));
  push(dbProof.memoryCount === 1, "DB proof stores one memory for approved turn", JSON.stringify(dbProof));
  push(dbProof.clientMemoryCount >= 1, "DB proof links memory to owner client", JSON.stringify(dbProof));

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
      occupation: "PIM-011 QA",
      annualIncome: 1200000,
      status: "PROSPECT",
    },
    demoEmail,
  );

  push(response.status === 201 && typeof response.body?.client?.id === "string", "member creates QA client", `status=${response.status}`);
  return response.body?.client;
}

async function getDbProof(sessionId, turnId, memoryId, clientId) {
  const result = await db.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM interview_sessions WHERE id = $1 AND owner_id IS NOT NULL) AS session_count,
        (SELECT COUNT(*)::int FROM interview_turns WHERE id = $2 AND content LIKE 'quick-capture anchor:%') AS turn_anchor_count,
        (SELECT COUNT(*)::int FROM interview_memories WHERE id = $3 AND session_id = $1 AND turn_id = $2) AS memory_count,
        (SELECT COUNT(*)::int FROM interview_memories WHERE client_id = $4 AND text LIKE '%退休金缺口%') AS client_memory_count
    `,
    [sessionId || "missing", turnId || "missing", memoryId || "missing", clientId || "missing"],
  );
  const row = result.rows[0] ?? {};

  return {
    sessionCount: Number(row.session_count ?? 0),
    turnAnchorCount: Number(row.turn_anchor_count ?? 0),
    memoryCount: Number(row.memory_count ?? 0),
    clientMemoryCount: Number(row.client_memory_count ?? 0),
  };
}

async function countQuickCapturePersistenceRows() {
  const result = await db.query(
    `
      SELECT
        (
          (SELECT COUNT(*)::int FROM interview_sessions WHERE metadata->>'source' = 'quick_capture_bridge') +
          (SELECT COUNT(*)::int FROM interview_turns WHERE metadata->>'source' = 'quick_capture_bridge') +
          (SELECT COUNT(*)::int FROM interview_memories WHERE evidence_text LIKE 'post_visit_note:%' OR evidence_text LIKE 'global_quick_capture:%' OR evidence_text LIKE 'meeting_note:%' OR evidence_text LIKE 'voice_transcript_final:%')
        ) AS count
    `,
  );
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
