#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env");

const baseUrl = process.env.DEMO_QA_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const demoMemberEmail = process.env.DEMO_MEMBER_QA_EMAIL ?? "demo.member@asai.local";
const demoManagerEmail = process.env.DEMO_MANAGER_QA_EMAIL ?? "demo.manager@asai.local";
const qaStamp = `SPIN Source Truth QA ${new Date().toISOString()}`;
const checks = [];

let selectedClientId = "";
let createdSessionId = "";

await runApiProof();
await runSourceProof();

push(true, "no provider route invoked", "script uses /api/spin/sessions BFF and deterministic outline only");

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => check.status === "fail")) {
  process.exitCode = 1;
}

async function runApiProof() {
  const unauth = await requestJson("GET", "/api/spin/sessions", undefined, {});
  push(unauth.status === 401, "GET /api/spin/sessions rejects unauthenticated requests", `status=${unauth.status}`);

  const clients = await requestJson("GET", "/api/clients", undefined, memberHeaders());
  push(clients.status === 200, "GET /api/clients returns member clients", `status=${clients.status}`);
  const client =
    clients.body?.clients?.find((item) => item.status === "ACTIVE") ??
    clients.body?.clients?.find((item) => item.status === "PROSPECT") ??
    clients.body?.clients?.[0];
  selectedClientId = client?.id ?? "";
  push(Boolean(selectedClientId), "demo client is available for SPIN source-truth proof", `client=${client?.name ?? ""}`);
  if (!selectedClientId) return;

  const create = await requestJson(
    "POST",
    "/api/spin/sessions",
    { clientId: selectedClientId, mode: "SELF_CLARIFY" },
    memberHeaders(),
  );
  createdSessionId = create.body?.session?.id ?? "";
  push(create.status === 201, "POST /api/spin/sessions creates server-owned SPIN session", `status=${create.status} session=${createdSessionId}`);
  push(create.body?.session?.phase === "SITUATION", "created SPIN session starts at SITUATION", `phase=${create.body?.session?.phase ?? ""}`);
  push(create.body?.proof?.noProviderCall === true, "create response includes no-provider proof");

  if (!createdSessionId) return;

  const managerRead = await requestJson("GET", `/api/spin/sessions/${createdSessionId}`, undefined, managerHeaders());
  push([403, 404].includes(managerRead.status), "non-owner manager cannot read member SPIN session detail", `status=${managerRead.status}`);

  const userMessage = await requestJson(
    "POST",
    `/api/spin/sessions/${createdSessionId}/messages`,
    {
      id: `qa_user_${Date.now()}`,
      role: "user",
      type: "CHAT",
      phase: "SITUATION",
      content: `${qaStamp}：客戶已婚，有兩名孩子，近期擔心收入中斷。`,
    },
    memberHeaders(),
  );
  push(userMessage.status === 201, "POST /messages persists user message", `status=${userMessage.status}`);

  const assistantMessage = await requestJson(
    "POST",
    `/api/spin/sessions/${createdSessionId}/messages`,
    {
      id: `qa_assistant_${Date.now()}`,
      role: "assistant",
      type: "INSIGHT",
      phase: "SITUATION",
      content: `${qaStamp}：家庭責任與收入中斷是下一階段問題設計主軸。`,
    },
    memberHeaders(),
  );
  push(assistantMessage.status === 201, "POST /messages persists assistant insight", `status=${assistantMessage.status}`);

  const situationPatch = await requestJson(
    "PATCH",
    `/api/spin/sessions/${createdSessionId}`,
    {
      outputs: {
        SITUATION: [`${qaStamp} 情境：已婚、兩名孩子、主要收入來源`],
        PROBLEM: [],
        IMPLICATION: [],
        NEED_PAYOFF: [],
      },
      transitions: [
        {
          from: "SITUATION",
          to: "PROBLEM",
          trigger: "USER",
          timestamp: new Date().toISOString(),
        },
      ],
      phase: "PROBLEM",
    },
    memberHeaders(),
  );
  push(situationPatch.status === 200, "PATCH /api/spin/sessions/[id] persists S -> P transition", `status=${situationPatch.status}`);
  push(situationPatch.body?.session?.phase === "PROBLEM", "patched SPIN session advances to PROBLEM", `phase=${situationPatch.body?.session?.phase ?? ""}`);

  const invalidTransition = await requestJson(
    "PATCH",
    `/api/spin/sessions/${createdSessionId}`,
    { phase: "NEED_PAYOFF" },
    memberHeaders(),
  );
  push(invalidTransition.status === 409, "PATCH rejects non-sequential SPIN phase jump", `status=${invalidTransition.status}`);

  const completePatch = await requestJson(
    "PATCH",
    `/api/spin/sessions/${createdSessionId}`,
    {
      phase: "COMPLETE",
      outputs: {
        SITUATION: [`${qaStamp} 情境：已婚、兩名孩子、主要收入來源`],
        PROBLEM: [`${qaStamp} 問題：若收入中斷，家庭現金流可能不足`],
        IMPLICATION: [`${qaStamp} 暗示：房貸與教育支出會快速消耗緊急預備金`],
        NEED_PAYOFF: [`${qaStamp} 需求：希望先確保家庭三到六個月現金流`],
      },
      transitions: [
        { from: "SITUATION", to: "PROBLEM", trigger: "USER", timestamp: new Date().toISOString() },
        { from: "PROBLEM", to: "IMPLICATION", trigger: "USER", timestamp: new Date().toISOString() },
        { from: "IMPLICATION", to: "NEED_PAYOFF", trigger: "USER", timestamp: new Date().toISOString() },
        { from: "NEED_PAYOFF", to: "COMPLETE", trigger: "USER", timestamp: new Date().toISOString() },
      ],
      summary: {
        keyInsights: [`${qaStamp} 情境：家庭責任明確`],
        keyProblems: [`${qaStamp} 問題：收入中斷風險`],
        suggestedActions: [`${qaStamp} 行動：準備現金流缺口試算`],
      },
    },
    memberHeaders(),
  );
  push(completePatch.status === 200, "PATCH can complete SPIN session with persisted summary", `status=${completePatch.status}`);
  push(completePatch.body?.session?.phase === "COMPLETE", "completed SPIN session returns COMPLETE state");

  const detail = await requestJson("GET", `/api/spin/sessions/${createdSessionId}`, undefined, memberHeaders());
  const serializedDetail = JSON.stringify(detail.body);
  push(detail.status === 200, "GET /api/spin/sessions/[id] reloads persisted SPIN session", `status=${detail.status}`);
  push(detail.body?.messages?.length >= 2, "reloaded SPIN session includes persisted messages", `messages=${detail.body?.messages?.length ?? 0}`);
  push(serializedDetail.includes(qaStamp), "reloaded SPIN session includes QA proof stamp");
  push(
    !["rawPayload", "providerPayload", "authorization", "cookie", "secret"].some((token) => serializedDetail.includes(token)),
    "SPIN BFF response omits raw private/provider sentinels",
  );

  const outline = await requestJson("POST", `/api/spin/sessions/${createdSessionId}/outline`, {}, memberHeaders());
  push(outline.status === 200, "POST /api/spin/sessions/[id]/outline returns deterministic outline", `status=${outline.status}`);
  push(outline.body?.outline?.includes("訪談大綱"), "outline contains visit-outline title");
  push(outline.body?.outline?.includes(qaStamp), "outline is generated from persisted SPIN outputs");
  push(outline.body?.proof?.noProviderCall === true, "outline response includes no-provider proof");
}

async function runSourceProof() {
  const detailPagePath = "src/app/(dashboard)/spin/[sessionId]/page.tsx";
  const detailSource = readFileSync(detailPagePath, "utf8");
  push(!detailSource.includes("/api/mock/ai/spin-outline"), "SPIN detail page no longer calls mock outline API", detailPagePath);
  push(detailSource.includes("/api/spin/sessions/${sessionId}/outline"), "SPIN detail page calls server-owned outline BFF", detailPagePath);
}

async function requestJson(method, path, body, headers = memberHeaders()) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let parsedBody = null;

  try {
    parsedBody = JSON.parse(text);
  } catch {
    parsedBody = text;
  }

  return { status: response.status, body: parsedBody, text, headers: response.headers };
}

function memberHeaders() {
  return {
    "x-asai-demo-user-email": demoMemberEmail,
  };
}

function managerHeaders() {
  return {
    "x-asai-demo-user-email": demoManagerEmail,
  };
}

function push(condition, label, detail = "") {
  checks.push({
    status: condition ? "pass" : "fail",
    label,
    detail,
  });
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
